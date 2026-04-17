import assert from "node:assert/strict";
import test from "node:test";

import type { AiClaimStatusAnalysisResponse, ExecutionCandidate } from "@tenio/contracts";
import type { ClaimDetail } from "@tenio/domain";

import { ExecutionService } from "./services/execution-service.js";

function buildClaim(overrides: Partial<ClaimDetail> = {}): ClaimDetail {
  return {
    id: "claim_123",
    organizationId: "org_123",
    payerId: "payer_sun_life",
    payerName: "Sun Life",
    claimNumber: "CLM-123",
    patientName: "Alex Example",
    jurisdiction: "ca",
    countryCode: "CA",
    provinceOfService: "ON",
    claimType: "paramedical",
    serviceProviderType: "physiotherapist",
    serviceCode: "PT100",
    planNumber: "PLAN-1",
    memberCertificate: "MEM-1",
    serviceDate: "2026-04-01",
    status: "pending",
    confidence: 0.4,
    slaAt: new Date(Date.now() + 86_400_000).toISOString(),
    owner: "owner_1",
    priority: "normal",
    lastCheckedAt: null,
    normalizedStatusText: "Pending adjudication",
    amountCents: 12000,
    billedAmountCents: 12000,
    notes: null,
    evidence: [],
    reviews: [],
    ...overrides
  };
}

function buildCandidate(overrides: Partial<ExecutionCandidate> = {}): ExecutionCandidate {
  return {
    claimId: "claim_123",
    normalizedStatusText: "Claim paid",
    confidence: 0.95,
    evidence: [],
    recommendedAction: "resolve",
    rawNotes: null,
    rationale: "Connector returned a paid status.",
    routeReason: "paid",
    agentTraceId: "trace_123",
    execution: {
      connectorId: "test-connector",
      connectorName: "Test Connector",
      executionMode: "api",
      observedAt: new Date().toISOString(),
      durationMs: 25,
      attempt: 1,
      maxAttempts: 1,
      outcome: "succeeded",
      retryable: false,
      failureCategory: null
    },
    ...overrides
  };
}

test("requestClaimStatusRetrieval returns the AI candidate when available", async () => {
  const candidate = buildCandidate();
  const aiClient = {
    async analyzeClaimStatus(): Promise<AiClaimStatusAnalysisResponse | null> {
      return {
        candidate,
        model: "test-model",
        traceId: "trace_123"
      };
    }
  };

  const service = new ExecutionService(aiClient as never);

  const result = await service.requestClaimStatusRetrieval(buildClaim());

  assert.deepEqual(result, candidate);
});

test("requestClaimStatusRetrieval returns a conservative fallback without fabricated evidence when AI is unavailable", async () => {
  const aiClient = {
    async analyzeClaimStatus(): Promise<AiClaimStatusAnalysisResponse | null> {
      return null;
    }
  };

  const service = new ExecutionService(aiClient as never);

  const result = await service.requestClaimStatusRetrieval(buildClaim());

  assert.equal(result.claimId, "claim_123");
  assert.equal(result.recommendedAction, "review");
  assert.deepEqual(result.evidence, []);
  assert.match(result.rawNotes ?? "", /No evidence was synthesized/i);
  assert.match(result.rationale, /without synthesized evidence/i);
  assert.equal(result.execution.connectorId, "execution-service-fallback");
});
