import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRetryFailurePayload,
  type WorkerTerminalDirective
} from "./agent-runtime.js";

test("buildRetryFailurePayload preserves execution mode from failed observations", () => {
  const directive: WorkerTerminalDirective = {
    type: "retry",
    publicReason: "Retry after connector failure.",
    completionReason: "retry_scheduled",
    plannerUsage: {
      provider: "tenio-heuristic",
      model: "heuristic-claim-agent-v1",
      inputTokens: 0,
      outputTokens: 0
    },
    summary: "Aetna connector was rate limited.",
    retryAfterSeconds: 300
  };

  const failure = buildRetryFailurePayload(directive, {
    observationVersion: 1,
    connectorId: "aetna-claim-status-api",
    connectorName: "Aetna Claim Status API",
    connectorVersion: "2026-04-connector-v1",
    executionMode: "api",
    observedAt: "2026-04-02T12:00:00.000Z",
    durationMs: 180,
    success: false,
    retryable: true,
    failureCategory: "rate_limited",
    summary: "Aetna connector was rate limited.",
    portalTextSnippet: null,
    screenshotUrls: [],
    evidenceArtifactIds: [],
    evidenceArtifacts: [],
    connectorPayloadJson: null
  });

  assert.equal(failure.executionMode, "api");
  assert.equal(failure.connectorId, "aetna-claim-status-api");
  assert.equal(failure.retryAfterSeconds, 300);
});
