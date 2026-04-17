import { z } from "zod";

import {
  sunLifePayloadSchema,
  type AgentObservation,
  type SunLifePayload
} from "@tenio/contracts";

import { decryptCredential } from "./crypto.js";
import { getConnectorCredentialRow } from "./db.js";

const CONNECTOR_ID = "sun-life-pshcp-browser";
const CONNECTOR_NAME = "Sun Life PSHCP";

/**
 * SELECTOR VERIFICATION CHECKLIST
 * ─────────────────────────────────
 * The portal (https://pshcp.sunlifeconnect.com) requires authenticated access
 * to inspect its DOM. All selectors below are best-guess fallbacks.
 *
 * To verify each one:
 *   1. Open https://pshcp.sunlifeconnect.com in Chrome with DevTools
 *   2. Right-click each element → Inspect
 *   3. Prefer `data-*` attributes > `id` > structural class names
 *   4. Replace the multi-selector fallback with the single confirmed selector
 *   5. Remove this comment block when all selectors are confirmed
 *
 * Items remaining to verify (referenced by step number in runPortalAutomation):
 *   Step 1  — login page URL path (/login? /signin? /provider?)
 *   Step 2  — username input, password input
 *   Step 3  — submit button
 *   Step 3  — post-login URL pattern (waitForURL regex)
 *   Step 3  — login error message element
 *   Step 4  — claims section nav link
 *   Step 5  — claim number input + search submit button
 *   Step 6  — results container
 *   Step 6  — "not found" message element
 *   Step 7  — claim status cell
 *   Step 8  — paid amount cell
 *   Step 9  — denial reason cell
 */

// TODO: Confirm production vs staging URL with Sun Life integration guide
const PORTAL_BASE_URL =
  process.env.SUN_LIFE_PORTAL_URL ?? "https://pshcp.sunlifeconnect.com";

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

export const sunLifeExecuteRequestSchema = z.object({
  connectorId: z.literal(CONNECTOR_ID),
  mode: z.literal("browser"),
  orgId: z.string().min(1),
  claimContext: claimContextSchema
});

export type SunLifeExecuteRequest = z.infer<typeof sunLifeExecuteRequestSchema>;

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
  // Playwright is imported dynamically to defer binary startup cost.
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    });
    const page = await context.newPage();

    // ── 1. Navigate to login ──────────────────────────────────────────────────
    // TODO: Verify the exact login path on the Sun Life PSHCP portal
    await page.goto(`${PORTAL_BASE_URL}/login`, {
      timeout: stepTimeoutMs,
      waitUntil: "domcontentloaded"
    });

    // ── 2. Fill login form ────────────────────────────────────────────────────
    // TODO: Verify input selectors against the actual Sun Life PSHCP portal
    await page.waitForSelector("#loginUsername, input[name='username'], input[type='email']", {
      timeout: stepTimeoutMs
    });
    await page.fill(
      "#loginUsername, input[name='username'], input[type='email']",
      username
    );
    await page.fill(
      "#loginPassword, input[name='password'], input[type='password']",
      password
    );

    // TODO: Verify submit button selector
    await page.click("button[type='submit'], input[type='submit'], .btn-login");

    // ── 3. Detect login failure ───────────────────────────────────────────────
    // Wait briefly for either an error message or the post-login page
    await Promise.race([
      page
        .waitForSelector(
          ".error-message, .alert-danger, [data-testid='login-error'], .login-error",
          { timeout: 4_000 }
        )
        .then(() => "error"),
      page
        .waitForURL(/dashboard|home|portal|provider/, {
          timeout: stepTimeoutMs
        })
        .then(() => "success")
    ]).catch(() => {
      // Neither resolved — check for error element below
    });

    // TODO: Verify error selector against the actual portal
    const loginErrorEl = await page.$(
      ".error-message, .alert-danger, [data-testid='login-error'], .login-error"
    );
    if (loginErrorEl) {
      const errorText = await loginErrorEl.textContent();
      throw new PortalError(
        "authentication",
        `Login failed: ${errorText?.trim() ?? "invalid credentials"}`
      );
    }

    // ── 4. Navigate to claims search ─────────────────────────────────────────
    // TODO: Confirm exact navigation path to claims status section
    await page.waitForSelector("[data-nav='claims'], a[href*='claim'], nav a", {
      timeout: stepTimeoutMs
    });
    await page.click("[data-nav='claims'], a[href*='claim-status'], a[href*='claims']");

    // ── 5. Search by claim number ─────────────────────────────────────────────
    // TODO: Verify claim search form selectors
    await page.waitForSelector(
      "[name='claimNumber'], input[placeholder*='claim'], .claim-search input",
      { timeout: stepTimeoutMs }
    );
    await page.fill(
      "[name='claimNumber'], input[placeholder*='claim'], .claim-search input",
      claimNumber
    );
    await page.click(
      ".claim-search button[type='submit'], .search-claims-btn, button.search"
    );

    // ── 6. Wait for results ───────────────────────────────────────────────────
    // TODO: Verify results container selector
    const resultsEl = await page
      .waitForSelector(
        ".claim-results, table.claims-table, [data-testid='claim-results'], .results-container",
        { timeout: stepTimeoutMs }
      )
      .catch(() => null);

    if (!resultsEl) {
      // Check for "not found" message
      const notFoundEl = await page.$(
        ".no-results, .claim-not-found, [data-testid='no-results']"
      );
      if (notFoundEl) {
        throw new PortalError(
          "data_missing",
          `Claim ${claimNumber} not found in Sun Life PSHCP portal`
        );
      }
      // Could not locate results OR not-found indicator — portal may have changed
      throw new PortalError(
        "portal_changed",
        "Could not find results container — Sun Life portal layout may have changed"
      );
    }

    // ── 7. Extract claim status ───────────────────────────────────────────────
    // TODO: Verify status cell selector in the claims table/results
    const statusEl = await page.$(
      ".claim-status, [data-claim-status], td.status, .status-cell"
    );
    if (!statusEl) {
      throw new PortalError(
        "portal_changed",
        "Could not find claim status element — portal layout may have changed"
      );
    }
    const statusText = await statusEl.textContent();
    if (!statusText?.trim()) {
      throw new PortalError(
        "portal_changed",
        "Claim status element was empty — portal layout may have changed"
      );
    }

    // ── 8. Extract paid amount ────────────────────────────────────────────────
    // TODO: Verify paid amount selector
    let paidAmountCents: number | null = null;
    const amountEl = await page.$(
      ".paid-amount, [data-paid-amount], td.amount, .payment-amount"
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
    // TODO: Verify denial reason selector
    let denialReason: string | null = null;
    const denialEl = await page.$(
      ".denial-reason, [data-denial-reason], .rejection-reason, td.reason"
    );
    if (denialEl) {
      denialReason = (await denialEl.textContent())?.trim() ?? null;
    }

    // ── 10. Capture raw HTML (truncated) ─────────────────────────────────────
    const rawHtml = (await page.content()).slice(0, 50_000);

    return {
      statusText: statusText.trim(),
      paidAmountCents,
      denialReason,
      rawHtml
    };
  } finally {
    await browser.close();
  }
}

// ── Observation helpers ───────────────────────────────────────────────────────

function buildSummary(payload: SunLifePayload): string {
  const base = `Sun Life PSHCP: claim ${payload.claimNumber ?? "unknown"}`;
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

export async function executeSunLifePshcp(
  request: SunLifeExecuteRequest
): Promise<AgentObservation> {
  const startMs = Date.now();
  const encryptionKey = process.env.TENIO_CREDENTIAL_ENCRYPTION_KEY ?? "";

  // ── Load and decrypt credentials ─────────────────────────────────────────
  const row = await getConnectorCredentialRow(request.orgId, CONNECTOR_ID);
  if (!row) {
    return buildFailureObservation(
      "authentication",
      false,
      `No Sun Life PSHCP credentials configured for org ${request.orgId}`,
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
      "Failed to decrypt Sun Life credentials",
      Date.now() - startMs
    );
  }

  // ── Run portal automation ─────────────────────────────────────────────────
  try {
    const result = await runPortalAutomation(
      request.claimContext.claimNumber,
      creds.username,
      creds.password
    );
    const durationMs = Date.now() - startMs;

    const parsed = sunLifePayloadSchema.safeParse({
      connectorId: CONNECTOR_ID,
      claimNumber: request.claimContext.claimNumber,
      statusText: result.statusText,
      paidAmountCents: result.paidAmountCents,
      denialReason: result.denialReason,
      rawHtml: result.rawHtml
    });

    const payload: SunLifePayload = parsed.success
      ? parsed.data
      : {
          connectorId: CONNECTOR_ID,
          claimNumber: request.claimContext.claimNumber,
          statusText: result.statusText,
          paidAmountCents: result.paidAmountCents,
          denialReason: result.denialReason,
          rawHtml: result.rawHtml
        };

    const summary = buildSummary(payload);

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
      summary,
      portalTextSnippet: result.statusText.slice(0, 800),
      screenshotUrls: [],
      evidenceArtifactIds: [],
      evidenceArtifacts: [],
      connectorPayloadJson: JSON.stringify(payload)
    };
  } catch (err) {
    const durationMs = Date.now() - startMs;

    if (err instanceof PortalError) {
      const retryable = err.category === "network";
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
      ? "Sun Life PSHCP portal timed out"
      : `Sun Life PSHCP automation failed: ${err instanceof Error ? err.message : "unknown error"}`;

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
