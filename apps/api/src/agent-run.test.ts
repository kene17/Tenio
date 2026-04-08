import assert from "node:assert/strict";
import test from "node:test";

import type { AgentRunRecord } from "./domain/prod-state.js";
import { assertRunLease } from "./domain/store.js";

function buildRun(overrides: Partial<AgentRunRecord> = {}): AgentRunRecord {
  return {
    id: "run_test",
    organizationId: "org_demo",
    retrievalJobId: "job_test",
    claimId: "CLM-10001",
    status: "running",
    protocolVersion: 1,
    leaseOwner: "worker-1",
    leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    heartbeatAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: null,
    modelProvider: null,
    modelName: null,
    modelCallsUsed: 0,
    inputTokensUsed: 0,
    outputTokensUsed: 0,
    totalTokensUsed: 0,
    connectorSwitchCount: 0,
    terminalReason: null,
    finalCandidate: null,
    budget: {
      maxToolSteps: 5,
      maxModelCalls: 6,
      maxWallTimeMs: 90_000,
      maxTotalTokens: 25_000,
      maxConnectorSwitches: 1
    },
    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

test("assertRunLease rejects expired leases even for the current worker", () => {
  const run = buildRun({
    leaseExpiresAt: new Date(Date.now() - 1_000).toISOString()
  });

  assert.throws(
    () => assertRunLease(run, "worker-1"),
    /lease has expired/i
  );
});

test("assertRunLease accepts active unexpired leases for the current worker", () => {
  const run = buildRun();

  assert.doesNotThrow(() => assertRunLease(run, "worker-1"));
});
