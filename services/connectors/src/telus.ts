import { z } from "zod";
import {
  telusEclaimsPayloadSchema,
  type AgentObservation,
  type TelusEclaimsPayload
} from "@tenio/contracts";

import { decryptCredential } from "./crypto.js";
import { getConnectorCredentialRow } from "./db.js";

const CONNECTOR_ID = "telus-eclaims-api";
const CONNECTOR_NAME = "TELUS eClaims API";

const TELUS_BASE_URL =
  process.env.TELUS_ECLAIMS_BASE_URL ?? "https://claimsapi.telus.com";

// ── Input validation ──────────────────────────────────────────────────────────

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

export const telusExecuteRequestSchema = z.object({
  connectorId: z.literal(CONNECTOR_ID),
  mode: z.literal("api"),
  orgId: z.string().min(1),
  claimContext: claimContextSchema
});

export type TelusExecuteRequest = z.infer<typeof telusExecuteRequestSchema>;

// ── Stored credential shape ───────────────────────────────────────────────────

const storedCredentialSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  planSoftwareId: z.string().optional()
});

// ── TELUS API response schema (permissive — we map into TelusEclaimsPayload) ──

const telusApiResponseSchema = z.object({
  claimNumber: z.string().optional(),
  claimStatus: z.string().optional(),
  paidAmountCents: z.number().int().optional(),
  processedAt: z.string().optional(),
  denialReason: z.string().optional(),
  infoRequired: z.string().optional(),
  insurerReference: z.string().optional()
}).passthrough();

// ── Main execution function ───────────────────────────────────────────────────

type FailureCategory =
  | "authentication"
  | "network"
  | "rate_limited"
  | "data_missing"
  | null;

type ConnectorOutcome =
  | { success: true; payload: TelusEclaimsPayload }
  | {
      success: false;
      failureCategory: FailureCategory;
      retryable: boolean;
      errorMessage: string;
    };

async function callTelusApi(
  claimNumber: string,
  accessToken: string,
  planNumber: string,
  memberCertificate: string,
  provinceOfService: string
): Promise<ConnectorOutcome> {
  const url = `${TELUS_BASE_URL}/claims/${encodeURIComponent(claimNumber)}/status`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Plan-Number": planNumber,
        "X-Member-Certificate": memberCertificate,
        "X-Province": provinceOfService,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(15_000)
    });
  } catch (err) {
    return {
      success: false,
      failureCategory: "network",
      retryable: true,
      errorMessage:
        err instanceof Error ? err.message : "Network error contacting TELUS API"
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      success: false,
      failureCategory: "authentication",
      retryable: false,
      errorMessage: `TELUS API authentication failed (HTTP ${response.status})`
    };
  }

  if (response.status === 404) {
    return {
      success: false,
      failureCategory: "data_missing",
      retryable: false,
      errorMessage: `Claim ${claimNumber} not found in TELUS eClaims (HTTP 404)`
    };
  }

  if (response.status === 429) {
    return {
      success: false,
      failureCategory: "rate_limited",
      retryable: true,
      errorMessage: "TELUS eClaims API rate limit exceeded (HTTP 429)"
    };
  }

  if (response.status >= 500) {
    return {
      success: false,
      failureCategory: "network",
      retryable: true,
      errorMessage: `TELUS eClaims API server error (HTTP ${response.status})`
    };
  }

  if (!response.ok) {
    return {
      success: false,
      failureCategory: "network",
      retryable: true,
      errorMessage: `Unexpected TELUS eClaims API response (HTTP ${response.status})`
    };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    return {
      success: false,
      failureCategory: "network",
      retryable: true,
      errorMessage: "TELUS eClaims API returned non-JSON response"
    };
  }

  const parsed = telusApiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      failureCategory: "network",
      retryable: true,
      errorMessage: "TELUS eClaims API response failed schema validation"
    };
  }

  const data = parsed.data;
  const payload: TelusEclaimsPayload = {
    connectorId: CONNECTOR_ID,
    claimNumber: data.claimNumber ?? claimNumber,
    claimStatus: data.claimStatus ?? null,
    paidAmountCents: data.paidAmountCents ?? null,
    processedAt: data.processedAt ?? null,
    denialReason: data.denialReason ?? null,
    infoRequired: data.infoRequired ?? null,
    insurerReference: data.insurerReference ?? null,
    rawResponse: raw as Record<string, unknown>
  };

  return { success: true, payload };
}

function buildSummary(payload: TelusEclaimsPayload, claimNumber: string): string {
  if (!payload.claimStatus) {
    return `TELUS eClaims: no status returned for claim ${claimNumber}`;
  }
  const status = payload.claimStatus;
  if (payload.paidAmountCents !== null) {
    const dollars = (payload.paidAmountCents / 100).toFixed(2);
    return `TELUS eClaims: claim ${claimNumber} — ${status} ($${dollars} paid)`;
  }
  if (payload.denialReason) {
    return `TELUS eClaims: claim ${claimNumber} — ${status} (${payload.denialReason})`;
  }
  return `TELUS eClaims: claim ${claimNumber} — ${status}`;
}

/**
 * Full execution path for the TELUS eClaims connector:
 * 1. Load and decrypt credentials from the DB
 * 2. Call the TELUS API
 * 3. Return an AgentObservation
 */
export async function executeTelusEclaims(
  request: TelusExecuteRequest
): Promise<AgentObservation> {
  const encryptionKey =
    process.env.TENIO_CREDENTIAL_ENCRYPTION_KEY ?? "";
  const startMs = Date.now();

  // Load credentials
  const row = await getConnectorCredentialRow(
    request.orgId,
    CONNECTOR_ID
  );

  if (!row) {
    const durationMs = Date.now() - startMs;
    return buildFailureObservation(
      "authentication",
      false,
      `No TELUS eClaims credentials found for org ${request.orgId}`,
      durationMs
    );
  }

  let creds: z.infer<typeof storedCredentialSchema>;
  try {
    const plaintext = await decryptCredential(row.encrypted_payload, encryptionKey);
    creds = storedCredentialSchema.parse(JSON.parse(plaintext));
  } catch (err) {
    const durationMs = Date.now() - startMs;
    return buildFailureObservation(
      "authentication",
      false,
      `Failed to decrypt TELUS credentials: ${err instanceof Error ? err.message : "unknown error"}`,
      durationMs
    );
  }

  const { claimNumber, planNumber, memberCertificate, provinceOfService } =
    request.claimContext;

  if (!planNumber || !memberCertificate || !provinceOfService) {
    const durationMs = Date.now() - startMs;
    return buildFailureObservation(
      "data_missing",
      false,
      `TELUS eClaims requires planNumber, memberCertificate, and provinceOfService — one or more are missing for claim ${claimNumber}`,
      durationMs
    );
  }

  const outcome = await callTelusApi(
    claimNumber,
    creds.accessToken,
    planNumber,
    memberCertificate,
    provinceOfService
  );

  const durationMs = Date.now() - startMs;

  if (!outcome.success) {
    return buildFailureObservation(
      outcome.failureCategory,
      outcome.retryable,
      outcome.errorMessage,
      durationMs
    );
  }

  return {
    observationVersion: 1,
    connectorId: CONNECTOR_ID,
    connectorName: CONNECTOR_NAME,
    connectorVersion: null,
    executionMode: "api",
    observedAt: new Date().toISOString(),
    durationMs,
    success: true,
    retryable: false,
    failureCategory: null,
    summary: buildSummary(outcome.payload, claimNumber),
    portalTextSnippet: null,
    screenshotUrls: [],
    evidenceArtifactIds: [],
    evidenceArtifacts: [],
    connectorPayloadJson: JSON.stringify(outcome.payload)
  };
}

function buildFailureObservation(
  failureCategory: FailureCategory,
  retryable: boolean,
  message: string,
  durationMs: number
): AgentObservation {
  return {
    observationVersion: 1,
    connectorId: CONNECTOR_ID,
    connectorName: CONNECTOR_NAME,
    connectorVersion: null,
    executionMode: "api",
    observedAt: new Date().toISOString(),
    durationMs,
    success: false,
    retryable,
    failureCategory,
    summary: message,
    portalTextSnippet: null,
    screenshotUrls: [],
    evidenceArtifactIds: [],
    evidenceArtifacts: [],
    connectorPayloadJson: null
  };
}
