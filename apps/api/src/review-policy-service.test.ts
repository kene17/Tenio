import assert from "node:assert/strict";
import test from "node:test";

import type { ExecutionCandidate } from "@tenio/contracts";

import { ReviewPolicyService } from "./services/review-policy-service.js";

function buildCandidate(confidence: number): ExecutionCandidate {
  return {
    claimId: "CLM-204938",
    normalizedStatusText: "Pending payer review",
    confidence,
    evidence: [],
    recommendedAction: "resolve",
    rawNotes: null,
    rationale: "Test candidate",
    routeReason: "Testing threshold handling",
    agentTraceId: "trace_test",
    execution: {
      connectorId: "portal-browser-fallback",
      connectorName: "Portal Browser Fallback",
      executionMode: "browser",
      observedAt: new Date().toISOString(),
      durationMs: 1250,
      attempt: 1,
      maxAttempts: 3,
      outcome: "succeeded",
      retryable: false,
      failureCategory: null
    }
  };
}

test("ReviewPolicyService uses payer thresholds for review and escalation", () => {
  const service = new ReviewPolicyService();

  const escalated = service.decide(buildCandidate(0.51), {
    payerName: "Aetna",
    reviewThreshold: 0.86,
    escalationThreshold: 0.55
  });
  assert.equal(escalated.nextStatus, "blocked");

  const needsReview = service.decide(buildCandidate(0.82), {
    payerName: "Aetna",
    reviewThreshold: 0.86,
    escalationThreshold: 0.55
  });
  assert.equal(needsReview.nextStatus, "needs_review");

  const resolved = service.decide(buildCandidate(0.82), {
    payerName: "UnitedHealthcare",
    reviewThreshold: 0.8,
    escalationThreshold: 0.5
  });
  assert.equal(resolved.nextStatus, "resolved");
});
