import { z } from "zod";

import {
  greenShieldPayloadSchema,
  type AgentObservation,
  type GreenShieldPayload
} from "@tenio/contracts";

import { decryptCredential } from "./crypto.js";
import { getConnectorCredentialRow } from "./db.js";

const CONNECTOR_ID = "green-shield-provider-browser";
const CONNECTOR_NAME = "Green Shield Canada";

// TODO: Confirm production URL with Green Shield integration guide
const PORTAL_BASE_URL =
  process.env.GREEN_SHIELD_PORTAL_URL ?? "https://provider.greenshield.ca";

// ── Input schemas ─────────────────────────────────────────────────────────────

const claimContextSchema = z.object({
  claimId: z.string().min(1),
  claimNumber: z.string().min(1),
  orgId: z.string().min(1),
  payerId: z.string().min(1),
  serviceDate: z.string().min(1).nullable().optional(),
  billedAmountCents: z.number().int().nullable().optional(),
  planNumber: z.string().min(1).nullable().optional(),
  memberCertificate: z.string().min(1).nullable().optional(),
  provinceOfService: z.string().min(2).max(3).nullable().optional(),
  serviceCode: z.string().min(1).nullable().optional()
});

export const greenShieldExecuteRequestSchema = z.object({
  connectorId: z.literal(CONNECTOR_ID),
  mode: z.literal("browser"),
  orgId: z.string().min(1),
  claimContext: claimContextSchema
});

export type GreenShieldExecuteRequest = z.infer<typeof greenShieldExecuteRequestSchema>;

// ── Stored credential shape ───────────────────────────────────────────────────

const storedCredentialSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

// ── Portal-specific error class ───────────────────────────────────────────────

type PortalFailureCategory =
  | "authentication"
  | "data_missing"
  | "network"
  | "portal_changed";

class PortalError extends Error {
  constructor(
    public readonly category: PortalFailureCategory,
    message: string
  ) {
    super(message);
    this.name = "PortalError";
  }
}

// ── Portal automation ─────────────────────────────────────────────────────────

type PortalResult = {
  statusText: string;
  paidAmountCents: number | null;
  denialReason: string | null;
  rawHtml: string;
};

async function runPortalAutomation(
  claimNumber: string,
  username: string,
  password: string,
  stepTimeoutMs = 10_000
): Promise<PortalResult> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    });
    const page = await context.newPage();

    // ── 1. Navigate to login ──────────────────────────────────────────────────
    // TODO: Verify login URL path against Green Shield Canada provider portal
    await page.goto(`${PORTAL_BASE_URL}/login`, {
      timeout: stepTimeoutMs,
      waitUntil: "domcontentloaded"
    });

    // ── 2. Fill login form ────────────────────────────────────────────────────
    // TODO: Verify username input selector against Green Shield Canada portal
    await page.waitForSelector(
      "#username, input[name='username'], input[type='email'], #providerId",
      { timeout: stepTimeoutMs }
    );
    await page.fill(
      "#username, input[name='username'], input[type='email'], #providerId",
      username
    );
    // TODO: Verify password input selector against Green Shield Canada portal
    await page.fill(
      "#password, input[name='password'], input[type='password']",
      password
    );

    // TODO: Verify submit button selector against Green Shield Canada portal
    await page.click(
      "button[type='submit'], input[type='submit'], .btn-login, #loginBtn"
    );

    // ── 3. Detect login failure ───────────────────────────────────────────────
    await Promise.race([
      page
        .waitForSelector(
          ".error-message, .alert-danger, [data-testid='login-error'], .auth-error",
          { timeout: 4_000 }
        )
        .then(() => "error"),
      page
        .waitForURL(/dashboard|home|provider|claims|secure/, {
          timeout: stepTimeoutMs
        })
        .then(() => "success")
    ]).catch(() => undefined);

    // TODO: Verify login error selector against Green Shield Canada portal
    const loginErrorEl = await page.$(
      ".error-message, .alert-danger, [data-testid='login-error'], .auth-error"
    );
    if (loginErrorEl) {
      const errorText = await loginErrorEl.textContent();
      throw new PortalError(
        "authentication",
        `Login failed: ${errorText?.trim() ?? "invalid credentials"}`
      );
    }

    // ── 4. Navigate to claims section ─────────────────────────────────────────
    // TODO: Verify claims navigation selector against Green Shield Canada portal
    await page.waitForSelector(
      "[data-nav='claims'], a[href*='claim'], a[href*='adjudication'], nav a",
      { timeout: stepTimeoutMs }
    );
    await page.click(
      "a[href*='claim-status'], a[href*='claims'], [data-nav='claims'], a[href*='adjudication']"
    );

    // ── 5. Search by claim number ─────────────────────────────────────────────
    // TODO: Verify claim number input selector against Green Shield Canada portal
    await page.waitForSelector(
      "[name='claimNumber'], input[placeholder*='claim'], .claim-search input, #claimNumber",
      { timeout: stepTimeoutMs }
    );
    await page.fill(
      "[name='claimNumber'], input[placeholder*='claim'], .claim-search input, #claimNumber",
      claimNumber
    );
    // TODO: Verify search submit button selector against Green Shield Canada portal
    await page.click(
      ".claim-search button[type='submit'], .search-claims-btn, button.search, #searchClaims"
    );

    // ── 6. Wait for results ───────────────────────────────────────────────────
    // TODO: Verify results container selector against Green Shield Canada portal
    const resultsEl = await page
      .waitForSelector(
        ".claim-results, table.claims-table, [data-testid='claim-results'], .results-container, #claimResults",
        { timeout: stepTimeoutMs }
      )
      .catch(() => null);

    if (!resultsEl) {
      // TODO: Verify not-found message selector against Green Shield Canada portal
      const notFoundEl = await page.$(
        ".no-results, .claim-not-found, [data-testid='no-results'], .empty-results"
      );
      if (notFoundEl) {
        throw new PortalError(
          "data_missing",
          `Claim ${claimNumber} not found in Green Shield Canada portal`
        );
      }
      throw new PortalError(
        "portal_changed",
        "Could not find results container — Green Shield Canada portal layout may have changed"
      );
    }

    // ── 7. Extract claim status ───────────────────────────────────────────────
    // TODO: Verify status cell selector against Green Shield Canada portal
    const statusEl = await page.$(
      ".claim-status, [data-claim-status], td.status, .status-cell, [data-testid='claim-status']"
    );
    if (!statusEl) {
      throw new PortalError(
        "portal_changed",
        "Could not find claim status element — Green Shield Canada portal layout may have changed"
      );
    }
    const statusText = await statusEl.textContent();
    if (!statusText?.trim()) {
      throw new PortalError(
        "portal_changed",
        "Claim status element was empty — Green Shield Canada portal layout may have changed"
      );
    }

    // ── 8. Extract paid amount ────────────────────────────────────────────────
    // TODO: Verify paid amount selector against Green Shield Canada portal
    let paidAmountCents: number | null = null;
    const amountEl = await page.$(
      ".paid-amount, [data-paid-amount], td.amount, .payment-amount, [data-testid='paid-amount']"
    );
    if (amountEl) {
      const amountText = await amountEl.textContent();
      if (amountText) {
        const parsed = parseFloat(amountText.replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed) && parsed > 0) {
          paidAmountCents = Math.round(parsed * 100);
        }
      }
    }

    // ── 9. Extract denial reason ──────────────────────────────────────────────
    // TODO: Verify denial reason selector against Green Shield Canada portal
    let denialReason: string | null = null;
    const denialEl = await page.$(
      ".denial-reason, [data-denial-reason], .rejection-reason, td.reason, [data-testid='denial-reason']"
    );
    if (denialEl) {
      denialReason = (await denialEl.textContent())?.trim() ?? null;
    }

    // ── 10. Capture raw HTML ──────────────────────────────────────────────────
    const rawHtml = (await page.content()).slice(0, 50_000);

    return { statusText: statusText.trim(), paidAmountCents, denialReason, rawHtml };
  } finally {
    await browser.close();
  }
}

// ── Observation helpers ───────────────────────────────────────────────────────

function buildSummary(payload: GreenShieldPayload): string {
  const base = `Green Shield Canada: claim ${payload.claimNumber ?? "unknown"}`;
  if (!payload.statusText) return base;
  const status = payload.statusText;
  if (payload.paidAmountCents != null) {
    const dollars = (payload.paidAmountCents / 100).toFixed(2);
    return `${base} — ${status} ($${dollars} paid)`;
  }
  if (payload.denialReason) {
    return `${base} — ${status} (${payload.denialReason})`;
  }
  return `${base} — ${status}`;
}

function buildFailureObservation(
  category: PortalFailureCategory,
  retryable: boolean,
  summary: string,
  durationMs: number
): AgentObservation {
  return {
    observationVersion: 1,
    connectorId: CONNECTOR_ID,
    connectorName: CONNECTOR_NAME,
    connectorVersion: null,
    executionMode: "browser",
    observedAt: new Date().toISOString(),
    durationMs,
    success: false,
    retryable,
    failureCategory: category,
    summary,
    portalTextSnippet: null,
    screenshotUrls: [],
    evidenceArtifactIds: [],
    evidenceArtifacts: [],
    connectorPayloadJson: null
  };
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function executeGreenShield(
  request: GreenShieldExecuteRequest
): Promise<AgentObservation> {
  const startMs = Date.now();
  const encryptionKey = process.env.TENIO_CREDENTIAL_ENCRYPTION_KEY ?? "";

  const row = await getConnectorCredentialRow(request.orgId, CONNECTOR_ID);
  if (!row) {
    return buildFailureObservation(
      "authentication",
      false,
      `No Green Shield Canada credentials configured for org ${request.orgId}`,
      Date.now() - startMs
    );
  }

  let creds: z.infer<typeof storedCredentialSchema>;
  try {
    const plaintext = await decryptCredential(row.encrypted_payload, encryptionKey);
    creds = storedCredentialSchema.parse(JSON.parse(plaintext) as unknown);
  } catch (err) {
    console.error(
      JSON.stringify({
        service: "connectors",
        connector: CONNECTOR_ID,
        orgId: request.orgId,
        error: "credential_decrypt_failed",
        message: err instanceof Error ? err.message : String(err)
      })
    );
    return buildFailureObservation(
      "authentication",
      false,
      "Failed to decrypt Green Shield credentials",
      Date.now() - startMs
    );
  }

  try {
    const result = await runPortalAutomation(
      request.claimContext.claimNumber,
      creds.username,
      creds.password
    );
    const durationMs = Date.now() - startMs;

    const parsed = greenShieldPayloadSchema.safeParse({
      connectorId: CONNECTOR_ID,
      claimNumber: request.claimContext.claimNumber,
      statusText: result.statusText,
      paidAmountCents: result.paidAmountCents,
      denialReason: result.denialReason,
      rawHtml: result.rawHtml
    });

    const payload: GreenShieldPayload = parsed.success
      ? parsed.data
      : {
          connectorId: CONNECTOR_ID,
          claimNumber: request.claimContext.claimNumber,
          statusText: result.statusText,
          paidAmountCents: result.paidAmountCents,
          denialReason: result.denialReason,
          rawHtml: result.rawHtml
        };

    return {
      observationVersion: 1,
      connectorId: CONNECTOR_ID,
      connectorName: CONNECTOR_NAME,
      connectorVersion: null,
      executionMode: "browser",
      observedAt: new Date().toISOString(),
      durationMs,
      success: true,
      retryable: false,
      failureCategory: null,
      summary: buildSummary(payload),
      portalTextSnippet: result.statusText.slice(0, 800),
      screenshotUrls: [],
      evidenceArtifactIds: [],
      evidenceArtifacts: [],
      connectorPayloadJson: JSON.stringify(payload)
    };
  } catch (err) {
    const durationMs = Date.now() - startMs;

    if (err instanceof PortalError) {
      const retryable =
        err.category === "network";
      console.error(
        JSON.stringify({
          service: "connectors",
          connector: CONNECTOR_ID,
          orgId: request.orgId,
          claimNumber: request.claimContext.claimNumber,
          error: err.category,
          message: err.message
        })
      );
      return buildFailureObservation(err.category, retryable, err.message, durationMs);
    }

    const isTimeout =
      err instanceof Error &&
      (err.message.includes("timeout") ||
        err.message.includes("Timeout") ||
        err.message.includes("net::"));

    const summary = isTimeout
      ? "Green Shield Canada portal timed out"
      : `Green Shield automation failed: ${err instanceof Error ? err.message : "unknown error"}`;

    console.error(
      JSON.stringify({
        service: "connectors",
        connector: CONNECTOR_ID,
        orgId: request.orgId,
        claimNumber: request.claimContext.claimNumber,
        error: isTimeout ? "timeout" : "unhandled",
        message: err instanceof Error ? err.message : String(err)
      })
    );

    return buildFailureObservation("network", true, summary, durationMs);
  }
}
