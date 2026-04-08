import assert from "node:assert/strict";
import test from "node:test";

import {
  applyClaimWorkflowAction,
  buildPerformanceMetrics,
  createSeedPayerConfigurations,
  findMissingSeedPayerConfigurations
} from "./domain/prod-state.js";
import { createSeedState } from "./domain/pilot-state.js";

test("applyClaimWorkflowAction resolves a claim and clears the queue", () => {
  const seed = createSeedState();
  const claim = seed.claims[0];
  const queueItem = seed.queue.find((item) => item.claimId === claim.id);
  const result = seed.results.find((item) => item.claimId === claim.id);

  const mutation = applyClaimWorkflowAction({
    claim,
    queueItem,
    existingResult: result,
    action: "resolve_claim",
    actor: {
      id: "user_manager",
      organizationId: claim.organizationId,
      name: "Sarah Chen",
      role: "manager",
      type: "human"
    },
    note: "Verified with matching evidence."
  });

  assert.equal(mutation.claim.status, "resolved");
  assert.equal(mutation.queueItem, null);
  assert.equal(mutation.result?.verifiedStatus, "Verified");
  assert.match(mutation.auditEvent.summary, /Sarah Chen/);
});

test("applyClaimWorkflowAction can mark a claim as requiring a phone call", () => {
  const seed = createSeedState();
  const claim = seed.claims[2];
  const queueItem = seed.queue.find((item) => item.claimId === claim.id);
  const result = seed.results.find((item) => item.claimId === claim.id);

  const mutation = applyClaimWorkflowAction({
    claim,
    queueItem,
    existingResult: result,
    action: "mark_call_required",
    actor: {
      id: "user_operator",
      organizationId: claim.organizationId,
      name: "Marcus Williams",
      role: "operator",
      type: "human"
    },
    note: "Portal returned no actionable status. Call payer support."
  });

  assert.equal(mutation.claim.requiresPhoneCall, true);
  assert.equal(mutation.claim.status, "blocked");
  assert.equal(mutation.claim.nextAction, "Call Payer");
  assert.equal(mutation.queueItem?.reason, "Manual payer phone call required");
  assert.equal(mutation.auditEvent.action, "Phone Call Required");
});

test("buildPerformanceMetrics returns live-ready summary values", () => {
  const seed = createSeedState();

  const metrics = buildPerformanceMetrics({
    claims: seed.claims,
    queue: seed.queue,
    results: seed.results,
    jobs: [
      {
        id: "job_1",
        organizationId: "org_demo",
        claimId: "CLM-204938",
        status: "retrying",
        priority: "high",
        attempts: 1,
        maxAttempts: 3,
        queuedBy: "user_admin",
        reservedBy: "retrieval-worker-1",
        availableAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: null,
        lastAttemptedAt: new Date().toISOString(),
        lastError: "Portal timed out",
        failureCategory: "network",
        retryable: true,
        connectorId: "portal-browser-fallback",
        connectorName: "Portal Browser Fallback",
        executionMode: "browser",
        agentTraceId: "trace_1",
        reviewReason: "Network failure requires retry",
        attemptHistory: [
          {
            attempt: 1,
            connectorId: "portal-browser-fallback",
            connectorName: "Portal Browser Fallback",
            executionMode: "browser",
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            status: "retrying",
            summary: "Portal timed out",
            traceId: "trace_1",
            failureCategory: "network"
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  });

  assert.ok(metrics.summary.claimsWorkedToday >= 0);
  assert.equal(metrics.summary.claimsRequiringCall, 2);
  assert.equal(metrics.summary.phoneCallRate, "40%");
  assert.equal(metrics.summary.avgTouchesPerClaim, "2.8");
  assert.equal(metrics.queueVolume.length, 4);
  assert.ok(metrics.alerts.length >= 1);
  assert.equal(metrics.agentOverview.retryQueue, 1);
  assert.equal(metrics.connectorHealth.length, 1);
  assert.equal(metrics.payerPerformance.some((payer) => payer.phoneCallRate !== undefined), true);
});

test("findMissingSeedPayerConfigurations only returns payer profiles absent by id and payerId", () => {
  const seedConfigs = createSeedPayerConfigurations("org_demo");
  const existingConfigs = [
    { id: "cfg_aetna", payerId: "payer_aetna" },
    { id: "legacy_sun_life_profile", payerId: "payer_sun_life" }
  ];

  const missing = findMissingSeedPayerConfigurations(existingConfigs, seedConfigs);

  assert.equal(missing.some((config) => config.payerId === "payer_aetna"), false);
  assert.equal(missing.some((config) => config.payerId === "payer_sun_life"), false);
  assert.equal(missing.some((config) => config.payerId === "payer_telus_health"), true);
  assert.equal(missing.some((config) => config.payerId === "payer_cigna"), true);
  assert.equal(missing.some((config) => config.payerId === "payer_uhc"), true);
});
