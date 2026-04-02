import type { ExecutionCandidate } from "@tenio/contracts";
import { randomUUID } from "node:crypto";

import { AiServiceClient } from "./ai-service-client.js";
import { WorkflowApiClient } from "./api-client.js";
import { ConnectorExecutionError, runPayerRetrieval } from "./payer-runner.js";

const aiClient = new AiServiceClient();
const workflowApi = new WorkflowApiClient();
const workerName = process.env.TENIO_WORKER_NAME ?? "retrieval-worker-1";
const pollIntervalMs = Number(process.env.TENIO_WORKER_POLL_MS ?? 5000);

async function runRetrieval(claim: {
  id: string;
  payerId: string;
  payerName: string;
  claimNumber: string;
  patientName: string;
}, job: {
  attempts: number;
  maxAttempts: number;
}, requestId: string) {
  const portalSnapshot = await runPayerRetrieval({
    claimId: claim.id,
    claimNumber: claim.claimNumber,
    patientName: claim.patientName,
    payerId: claim.payerId,
    payerName: claim.payerName,
    sessionMode: claim.payerId === "payer_aetna" ? "api" : "browser",
    attempt: job.attempts,
    maxAttempts: job.maxAttempts
  }, requestId);

  const aiResponse = await aiClient.analyzeClaimStatus({
    claimId: portalSnapshot.claimId,
    payerId: portalSnapshot.payerId,
    payerName: portalSnapshot.payerName,
    portalText: portalSnapshot.portalText,
    screenshotUrls: portalSnapshot.screenshotUrls,
    connectorId: portalSnapshot.connectorId,
    connectorName: portalSnapshot.connectorName,
    executionMode: portalSnapshot.executionMode,
    connectorPayloadJson: portalSnapshot.connectorPayloadJson,
    metadata: {
      source: "worker",
      claimNumber: claim.claimNumber,
      patientName: claim.patientName,
      requestId
    }
  }, requestId);

  if (aiResponse) {
    return {
      ...aiResponse.candidate,
      evidence: portalSnapshot.evidenceArtifacts,
      agentTraceId: aiResponse.traceId,
      execution: {
        connectorId: portalSnapshot.connectorId,
        connectorName: portalSnapshot.connectorName,
        executionMode: portalSnapshot.executionMode,
        observedAt: portalSnapshot.observedAt,
        durationMs: portalSnapshot.durationMs,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        outcome:
          aiResponse.candidate.recommendedAction === "retry"
            ? "retry_scheduled"
            : aiResponse.candidate.recommendedAction === "review"
              ? "review_required"
              : "succeeded",
        retryable: aiResponse.candidate.recommendedAction === "retry",
        failureCategory: null
      },
      rationale: aiResponse.candidate.rationale || portalSnapshot.narrative,
      routeReason:
        aiResponse.candidate.routeReason ||
        (aiResponse.candidate.recommendedAction === "review"
          ? "Agentic interpretation found enough uncertainty to require governed review."
          : "Agentic interpretation produced a strong result for workflow policy evaluation.")
    } satisfies ExecutionCandidate;
  }

  return {
    claimId: portalSnapshot.claimId,
    normalizedStatusText: "Pending payer review",
    confidence: 0.74,
    evidence: [
      ...portalSnapshot.evidenceArtifacts
    ],
    recommendedAction: "review",
    rawNotes:
      "Execution workers produce candidate results, evidence, and confidence. They do not persist product state.",
    rationale: portalSnapshot.narrative,
    routeReason:
      "AI interpretation was unavailable, so the workflow layer should review the connector evidence directly.",
    agentTraceId: `trace_${portalSnapshot.claimId}_${job.attempts}`,
    execution: {
      connectorId: portalSnapshot.connectorId,
      connectorName: portalSnapshot.connectorName,
      executionMode: portalSnapshot.executionMode,
      observedAt: portalSnapshot.observedAt,
      durationMs: portalSnapshot.durationMs,
      attempt: job.attempts,
      maxAttempts: job.maxAttempts,
      outcome: "review_required",
      retryable: false,
      failureCategory: null
    }
  } satisfies ExecutionCandidate;
}

async function processOneJob() {
  const idleRequestId = `${workerName}:poll:${randomUUID()}`;
  const reservation = await workflowApi.claimNextJob(workerName, idleRequestId);
  const item = reservation.item;

  if (!item) {
    console.log(JSON.stringify({ worker: workerName, status: "idle", requestId: idleRequestId }));
    return;
  }

  const requestId = `${workerName}:${item.job.id}:${randomUUID()}`;

  try {
    const candidate = await runRetrieval(item.claim, item.job, requestId);
    await workflowApi.completeJob(item.job.id, item.claim.id, candidate, requestId);

    console.log(
      JSON.stringify({
        worker: workerName,
        status: "completed",
        jobId: item.job.id,
        claimId: item.claim.id,
        confidence: candidate.confidence,
        requestId
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker failure";
    const failure =
      error instanceof ConnectorExecutionError
        ? {
            error: message,
            failureCategory: error.failureCategory,
            retryable: error.retryable,
            connectorId: error.connectorId,
            connectorName: error.connectorName,
            observedAt: error.observedAt,
            durationMs: error.durationMs
          }
        : {
            error: message
          };

    await workflowApi.failJob(item.job.id, failure, requestId);
    console.error(
      JSON.stringify({
        worker: workerName,
        status: "failed",
        jobId: item.job.id,
        message,
        requestId,
        failureCategory:
          error instanceof ConnectorExecutionError ? error.failureCategory : "unknown"
      })
    );
  }
}

async function main() {
  while (true) {
    await processOneJob();
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
