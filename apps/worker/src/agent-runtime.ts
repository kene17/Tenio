import { createHash } from "node:crypto";

import type { ClaimDetail } from "@tenio/domain";
import type {
  AgentDirective,
  AgentObservation,
  AgentPlannerUsage,
  AgentRunContext,
  AgentRunTerminalReason,
  AgentStepHistoryItem,
  AgentStepRequest,
  AgentStepResult,
  ConnectorMode,
  ExecutionCandidate,
  ExecutionFailureCategory
} from "@tenio/contracts";

import type { AiServiceClient } from "./ai-service-client.js";
import type { AgentRunState, WorkflowApiClient } from "./api-client.js";
import {
  ConnectorExecutionError,
  runPayerRetrieval,
  type PortalSnapshot
} from "./payer-runner.js";

export const heartbeatIntervalMs = 15_000;
const runtimeRetryDelaySeconds = 60;

type ReservedJob = {
  job: {
    id: string;
    claimId: string;
    attempts: number;
    maxAttempts: number;
    status: string;
  };
  claim: ClaimDetail;
  agentRun: AgentRunState;
};

export type WorkerTerminalDirective = {
  type: "final" | "retry";
  publicReason: string;
  completionReason: AgentRunTerminalReason;
  plannerUsage: AgentPlannerUsage;
  summary: string;
  candidate?: ExecutionCandidate;
  retryAfterSeconds?: number;
};

function stableKey(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function throwIfStopped(getStopReason?: (() => string | null) | undefined) {
  const reason = getStopReason?.();

  if (reason) {
    throw new Error(reason);
  }
}

function nextStepNumber(run: AgentRunState) {
  return run.steps.length + 1;
}

function latestObservation(run: AgentRunState) {
  return [...run.steps]
    .reverse()
    .map((step) => step.result?.observation ?? null)
    .find((observation): observation is NonNullable<AgentStepResult["observation"]> =>
      Boolean(observation)
    ) ?? null;
}

function latestSuccessfulObservation(run: AgentRunState) {
  return [...run.steps]
    .reverse()
    .map((step) => step.result?.observation ?? null)
    .find(
      (
        observation
      ): observation is NonNullable<AgentStepResult["observation"]> =>
        Boolean(observation?.success)
    ) ?? null;
}

function latestFailedObservation(run: AgentRunState) {
  return [...run.steps]
    .reverse()
    .map((step) => step.result?.observation ?? null)
    .find(
      (
        observation
      ): observation is NonNullable<AgentStepResult["observation"]> =>
        Boolean(observation && !observation.success)
    ) ?? null;
}

function latestCompletedTerminalStep(run: AgentRunState) {
  const step = run.steps.at(-1) ?? null;

  if (!step || step.status !== "completed") {
    return null;
  }

  return step.directiveKind === "final" || step.directiveKind === "retry" ? step : null;
}

function latestStartedToolStep(run: AgentRunState) {
  const step = run.steps.at(-1) ?? null;

  if (!step || step.status !== "started" || step.directiveKind !== "tool_call") {
    return null;
  }

  return step.toolName === "execute_connector" && step.toolArgs ? step : null;
}

function buildToolIdempotencyKey(
  runId: string,
  stepNumber: number,
  connectorId: string,
  mode: ConnectorMode,
  attemptLabel: string
) {
  return stableKey(
    "tool",
    JSON.stringify({
      runId,
      stepNumber,
      connectorId,
      mode,
      attemptLabel
    })
  );
}

function buildTerminalIdempotencyKey(
  runId: string,
  stepNumber: number,
  directiveKind: "final" | "retry",
  terminalReason: AgentRunTerminalReason
) {
  return stableKey(
    "terminal",
    JSON.stringify({
      runId,
      stepNumber,
      directiveKind,
      terminalReason
    })
  );
}

function truncatePortalText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 800);
}

function extractConnectorVersion(connectorPayloadJson: string | null) {
  if (!connectorPayloadJson) {
    return null;
  }

  try {
    const payload = JSON.parse(connectorPayloadJson) as { connectorVersion?: unknown };
    return typeof payload.connectorVersion === "string" ? payload.connectorVersion : null;
  } catch {
    return null;
  }
}

function buildObservationFromSnapshot(snapshot: PortalSnapshot): AgentObservation {
  return {
    observationVersion: 1,
    connectorId: snapshot.connectorId,
    connectorName: snapshot.connectorName,
    connectorVersion: extractConnectorVersion(snapshot.connectorPayloadJson),
    executionMode: snapshot.executionMode,
    observedAt: snapshot.observedAt,
    durationMs: snapshot.durationMs,
    success: true,
    retryable: false,
    failureCategory: null,
    summary: snapshot.narrative,
    portalTextSnippet: truncatePortalText(snapshot.portalText),
    screenshotUrls: snapshot.screenshotUrls,
    evidenceArtifactIds: snapshot.evidenceArtifacts.map((artifact) => artifact.id),
    evidenceArtifacts: snapshot.evidenceArtifacts,
    connectorPayloadJson: snapshot.connectorPayloadJson
  };
}

function buildSuccessfulStepResult(snapshot: PortalSnapshot): AgentStepResult {
  return {
    observation: buildObservationFromSnapshot(snapshot),
    summary: snapshot.narrative,
    evidenceArtifactIds: snapshot.evidenceArtifacts.map((artifact) => artifact.id),
    retryable: false,
    failureCategory: null
  };
}

function buildObservationFromError(error: ConnectorExecutionError): AgentObservation {
  return {
    observationVersion: 1,
    connectorId: error.connectorId,
    connectorName: error.connectorName,
    connectorVersion: null,
    executionMode: error.connectorId === "portal-browser-fallback" ? "browser" : "api",
    observedAt: error.observedAt,
    durationMs: error.durationMs,
    success: false,
    retryable: error.retryable,
    failureCategory: error.failureCategory,
    summary: error.message,
    portalTextSnippet: null,
    screenshotUrls: [],
    evidenceArtifactIds: [],
    evidenceArtifacts: [],
    connectorPayloadJson: null
  };
}

function buildFailedStepResult(error: ConnectorExecutionError): AgentStepResult {
  return {
    observation: buildObservationFromError(error),
    summary: error.message,
    evidenceArtifactIds: [],
    retryable: error.retryable,
    failureCategory: error.failureCategory
  };
}

function normalizeConnectorError(
  error: unknown,
  connectorId: string,
  mode: ConnectorMode
) {
  if (error instanceof ConnectorExecutionError) {
    return error;
  }

  const observedAt = new Date().toISOString();
  const message = error instanceof Error ? error.message : "Connector execution failed.";

  return new ConnectorExecutionError(
    message,
    "unknown",
    true,
    connectorId,
    mode === "browser" ? "Portal Browser Fallback" : "Trusted API Connector",
    observedAt,
    0
  );
}

function buildAgentContext(item: ReservedJob, run: AgentRunState): AgentRunContext {
  return {
    protocolVersion: 1,
    runId: run.id,
    claimId: item.claim.id,
    retrievalJobId: item.job.id,
    payerId: item.claim.payerId,
    payerName: item.claim.payerName,
    claimNumber: item.claim.claimNumber,
    patientName: item.claim.patientName,
    jurisdiction: item.claim.jurisdiction,
    countryCode: item.claim.countryCode,
    provinceOfService: item.claim.provinceOfService ?? null,
    claimType: item.claim.claimType ?? null,
    serviceProviderType: item.claim.serviceProviderType ?? null,
    serviceCode: item.claim.serviceCode ?? null,
    planNumber: item.claim.planNumber ?? null,
    memberCertificate: item.claim.memberCertificate ?? null,
    serviceDate: item.claim.serviceDate ?? null,
    billedAmountCents: item.claim.amountCents ?? null,
    currentAttempt: item.job.attempts,
    maxAttempts: item.job.maxAttempts,
    startedAt: run.startedAt,
    elapsedMs: Math.max(0, Date.now() - new Date(run.startedAt).getTime()),
    leaseExpiresAt: run.leaseExpiresAt,
    modelCallsUsed: run.modelCallsUsed,
    totalTokensUsed: run.totalTokensUsed,
    connectorSwitchCount: run.connectorSwitchCount,
    budget: run.budget,
    availableTools: ["execute_connector"],
    steps: run.steps
  };
}

function classifyObservation(observation: AgentObservation) {
  if (observation.connectorPayloadJson) {
    try {
      const payload = JSON.parse(observation.connectorPayloadJson) as { statusCode?: unknown };
      if (payload.statusCode === "PAID_IN_FULL") {
        return "resolved";
      }
      if (payload.statusCode === "DENIED") {
        return "denied";
      }
      if (payload.statusCode === "PENDING_MEDICAL_REVIEW") {
        return "pending";
      }
      if (payload.statusCode === "ADDITIONAL_INFO_REQUIRED") {
        return "incomplete";
      }
    } catch {
      return "unknown";
    }
  }

  const text = `${observation.portalTextSnippet ?? ""} ${observation.summary}`.toLowerCase();
  if (/(additional info|supplemental|retry|incomplete)/.test(text)) {
    return "incomplete";
  }
  if (/denied/.test(text)) {
    return "denied";
  }
  if (/(pending|review|in process)/.test(text)) {
    return "pending";
  }
  if (/(paid|processed|resolved)/.test(text)) {
    return "resolved";
  }
  return "unknown";
}

function hasConflictingSuccessfulObservations(run: AgentRunState) {
  const classifications = new Set(
    run.steps
      .map((step) => step.result?.observation ?? null)
      .filter((observation): observation is AgentObservation => Boolean(observation?.success))
      .map((observation) => classifyObservation(observation))
      .filter((value) => value !== "unknown")
  );

  return classifications.size > 1;
}

function statusTextForObservation(observation: AgentObservation) {
  switch (classifyObservation(observation)) {
    case "resolved":
      return "Processed";
    case "denied":
      return "Denied";
    case "pending":
      return "Pending payer review";
    case "incomplete":
      return "Awaiting payer data";
    default:
      return "Governed review required";
  }
}

function buildReviewCandidate(
  item: ReservedJob,
  observation: AgentObservation,
  requestId: string,
  {
    normalizedStatusText = statusTextForObservation(observation),
    rawNotes,
    rationale,
    routeReason
  }: {
    normalizedStatusText?: string;
    rawNotes: string;
    rationale: string;
    routeReason: string;
  }
): ExecutionCandidate {
  return {
    claimId: item.claim.id,
    normalizedStatusText,
    confidence: 0.34,
    evidence: observation.evidenceArtifacts,
    recommendedAction: "review",
    rawNotes,
    rationale,
    routeReason,
    agentTraceId: requestId,
    execution: {
      connectorId: observation.connectorId,
      connectorName: observation.connectorName,
      executionMode: observation.executionMode,
      observedAt: observation.observedAt,
      durationMs: observation.durationMs,
      attempt: item.job.attempts,
      maxAttempts: item.job.maxAttempts,
      outcome: "review_required",
      retryable: false,
      failureCategory: observation.failureCategory
    }
  };
}

function runtimePlannerUsage(): AgentPlannerUsage {
  return {
    provider: "tenio-runtime",
    model: "worker-fallback-v1",
    inputTokens: 0,
    outputTokens: 0
  };
}

function buildBudgetTerminalDirective(
  item: ReservedJob,
  run: AgentRunState,
  requestId: string
): WorkerTerminalDirective {
  const successfulObservation = latestSuccessfulObservation(run);
  const failedObservation = latestFailedObservation(run);

  if (hasConflictingSuccessfulObservations(run) && successfulObservation) {
    return {
      type: "final",
      publicReason: "Budget exhausted after conflicting successful observations.",
      completionReason: "budget_exhausted_conflict",
      plannerUsage: runtimePlannerUsage(),
      summary: "Conflicting successful observations exhausted the run budget.",
      candidate: buildReviewCandidate(item, successfulObservation, requestId, {
        normalizedStatusText: "Conflicting payer evidence",
        rawNotes:
          "The autonomous runtime gathered conflicting successful observations before exhausting its execution budget.",
        rationale:
          "Contradictory successful observations are safer to route into governed review than to auto-resolve.",
        routeReason:
          "Agent runtime exhausted its budget after observing conflicting evidence."
      })
    };
  }

  if (successfulObservation) {
    const latestClass = classifyObservation(successfulObservation);
    if (latestClass === "incomplete") {
      return {
        type: "retry",
        publicReason:
          "Budget exhausted while the latest successful observation still looked incomplete.",
        completionReason: "budget_exhausted_incomplete",
        plannerUsage: runtimePlannerUsage(),
        summary: "Latest successful observation remained incomplete at budget exhaustion.",
        retryAfterSeconds: runtimeRetryDelaySeconds
      };
    }

    return {
      type: "final",
      publicReason: "Budget exhausted after collecting evidence for governed review.",
      completionReason: "review_required",
      plannerUsage: runtimePlannerUsage(),
      summary: "Budget exhausted with reviewable evidence on hand.",
      candidate: buildReviewCandidate(item, successfulObservation, requestId, {
        rawNotes:
          "The runtime collected evidence but exhausted its budget before recording a final planner decision.",
        rationale:
          "Budget exhaustion with usable evidence defaults into governed review.",
        routeReason:
          "Agent runtime exhausted its budget and routed the latest evidence into review."
      })
    };
  }

  if (failedObservation?.retryable) {
    return {
      type: "retry",
      publicReason:
        "Budget exhausted before a successful observation was captured, and the latest connector failure remained retryable.",
      completionReason: "budget_exhausted_incomplete",
      plannerUsage: runtimePlannerUsage(),
      summary: "Retryable connector failure remained unresolved at budget exhaustion.",
      retryAfterSeconds: runtimeRetryDelaySeconds
    };
  }

  const fallbackObservation = latestObservation(run) ?? buildObservationFromError(
    new ConnectorExecutionError(
      "Agent runtime exhausted its budget before collecting usable evidence.",
      "unknown",
      false,
      "agent-runtime",
      "Agent Runtime",
      new Date().toISOString(),
      0
    )
  );

  return {
    type: "final",
    publicReason: "Budget exhausted without a retryable recovery path.",
    completionReason: "review_required",
    plannerUsage: runtimePlannerUsage(),
    summary: "Budget exhaustion defaulted into governed review.",
    candidate: buildReviewCandidate(item, fallbackObservation, requestId, {
      normalizedStatusText: "Agent budget exhausted",
      rawNotes: "The runtime exhausted its budget before producing a trusted final recommendation.",
      rationale:
        "Tenio routes non-retryable budget exhaustion into governed review.",
      routeReason: "Agent runtime exhausted its budget and defaulted to review."
    })
  };
}

function buildProviderUnavailableTerminalDirective(
  item: ReservedJob,
  run: AgentRunState,
  requestId: string
): WorkerTerminalDirective {
  const successfulObservation = latestSuccessfulObservation(run);
  const failedObservation = latestFailedObservation(run);

  if (!successfulObservation && failedObservation?.retryable) {
    return {
      type: "retry",
      publicReason:
        "Planner was unavailable and the latest connector failure remained retryable.",
      completionReason: "provider_unavailable_retry",
      plannerUsage: runtimePlannerUsage(),
      summary: "Planner unavailable with retryable connector failure.",
      retryAfterSeconds: runtimeRetryDelaySeconds
    };
  }

  if (successfulObservation) {
    return {
      type: "final",
      publicReason:
        "Planner was unavailable, so Tenio is routing the latest successful observation into governed review.",
      completionReason: "provider_unavailable_review",
      plannerUsage: runtimePlannerUsage(),
      summary: "Planner unavailable with usable evidence on hand.",
      candidate: buildReviewCandidate(item, successfulObservation, requestId, {
        rawNotes:
          "The planner was unavailable after the connector captured evidence, so the worker is returning that evidence for human review.",
        rationale:
          "Provider outages should not block review when usable evidence is already available.",
        routeReason:
          "Planner unavailability defaulted the run into governed review."
      })
    };
  }

  const fallbackObservation = failedObservation ?? buildObservationFromError(
    new ConnectorExecutionError(
      "Planner unavailable before a successful observation was captured.",
      "unknown",
      false,
      "agent-runtime",
      "Agent Runtime",
      new Date().toISOString(),
      0
    )
  );

  return {
    type: "final",
    publicReason:
      "Planner was unavailable and no retryable recovery path remained, so the run is escalating into review.",
    completionReason: "provider_unavailable_review",
    plannerUsage: runtimePlannerUsage(),
    summary: "Planner unavailable without retryable recovery path.",
    candidate: buildReviewCandidate(item, fallbackObservation, requestId, {
      normalizedStatusText: "Planner unavailable",
      rawNotes:
        "The autonomous planner could not be reached and the runtime did not have a retryable recovery path left.",
      rationale:
        "When the planner is down and no safe retry path remains, Tenio defaults to review.",
      routeReason:
        "Planner unavailability required governed review."
    })
  };
}

function budgetExceeded(run: AgentRunState) {
  if (run.steps.filter((step) => step.directiveKind === "tool_call").length >= run.budget.maxToolSteps) {
    return true;
  }

  if (run.modelCallsUsed >= run.budget.maxModelCalls) {
    return true;
  }

  if (run.totalTokensUsed >= run.budget.maxTotalTokens) {
    return true;
  }

  return Date.now() - new Date(run.startedAt).getTime() >= run.budget.maxWallTimeMs;
}

function toWorkerTerminalDirective(directive: Exclude<AgentDirective, { type: "tool_call" }>): WorkerTerminalDirective {
  if (directive.type === "final") {
    return {
      type: "final",
      publicReason: directive.publicReason,
      completionReason: directive.completionReason,
      plannerUsage: directive.plannerUsage,
      summary: directive.candidate.routeReason,
      candidate: directive.candidate
    };
  }

  return {
    type: "retry",
    publicReason: directive.publicReason,
    completionReason: directive.completionReason,
    plannerUsage: directive.plannerUsage,
    summary: directive.publicReason,
    retryAfterSeconds: directive.retryAfterSeconds
  };
}

export function buildRetryFailurePayload(
  directive: WorkerTerminalDirective,
  observation: AgentObservation | null
) {
  return {
    error: directive.summary,
    failureCategory: observation?.failureCategory ?? undefined,
    retryable: true,
    retryAfterSeconds: directive.retryAfterSeconds ?? runtimeRetryDelaySeconds,
    connectorId: observation?.connectorId ?? undefined,
    connectorName: observation?.connectorName ?? undefined,
    executionMode: observation?.executionMode ?? undefined,
    observedAt: observation?.observedAt ?? undefined,
    durationMs: observation?.durationMs ?? undefined,
    terminalReason: directive.completionReason
  };
}

async function applyTerminalSideEffect(
  workflowApi: WorkflowApiClient,
  item: ReservedJob,
  run: AgentRunState,
  step: AgentStepHistoryItem,
  requestId: string,
  getStopReason?: () => string | null
) {
  throwIfStopped(getStopReason);

  if (step.directiveKind === "final") {
    const candidate = step.result?.finalCandidate;

    if (!candidate) {
      throw new Error("Terminal final step is missing its execution candidate.");
    }

    await workflowApi.completeJob(item.job.id, item.claim.id, candidate, requestId);
    return;
  }

  const observation = latestObservation(run);
  await workflowApi.failJob(
    item.job.id,
    buildRetryFailurePayload(
      {
        type: "retry",
        publicReason: step.publicReason,
        completionReason:
          step.result?.terminalReason ?? "retry_scheduled",
        plannerUsage:
          step.plannerUsage ?? runtimePlannerUsage(),
        summary: step.result?.summary ?? step.publicReason,
        retryAfterSeconds: step.result?.retryAfterSeconds ?? runtimeRetryDelaySeconds
      },
      observation
    ),
    requestId
  );
}

async function recordAndApplyTerminalDirective(
  workflowApi: WorkflowApiClient,
  item: ReservedJob,
  run: AgentRunState,
  directive: WorkerTerminalDirective,
  workerName: string,
  requestId: string,
  getStopReason?: () => string | null
) {
  throwIfStopped(getStopReason);
  const stepNumber = nextStepNumber(run);
  const response = await workflowApi.recordAgentTerminalStep(
    run.id,
    {
      workerName,
      stepNumber,
      directiveKind: directive.type,
      publicReason: directive.publicReason,
      idempotencyKey: buildTerminalIdempotencyKey(
        run.id,
        stepNumber,
        directive.type,
        directive.completionReason
      ),
      plannerUsage: directive.plannerUsage,
      summary: directive.summary,
      terminalReason: directive.completionReason,
      finalCandidate: directive.candidate ?? null,
      retryAfterSeconds: directive.retryAfterSeconds ?? null
    },
    requestId
  );

  const recorded = response.item;

  if (!recorded) {
    throw new Error("Failed to record terminal agent step.");
  }

  await applyTerminalSideEffect(
    workflowApi,
    item,
    recorded.run,
    recorded.step,
    requestId,
    getStopReason
  );
}

async function executeConnectorStep(
  workflowApi: WorkflowApiClient,
  item: ReservedJob,
  run: AgentRunState,
  workerName: string,
  requestId: string,
  step: {
    stepNumber: number;
    connectorId: string;
    mode: ConnectorMode;
    attemptLabel: string;
    publicReason: string;
    plannerUsage: AgentPlannerUsage;
  },
  options?: { skipStart?: boolean; getStopReason?: () => string | null }
) {
  throwIfStopped(options?.getStopReason);
  if (!options?.skipStart) {
    const started = await workflowApi.startAgentToolStep(
      run.id,
      {
        workerName,
        stepNumber: step.stepNumber,
        toolName: "execute_connector",
        toolArgs: {
          connectorId: step.connectorId,
          mode: step.mode,
          attemptLabel: step.attemptLabel
        },
        publicReason: step.publicReason,
        idempotencyKey: buildToolIdempotencyKey(
          run.id,
          step.stepNumber,
          step.connectorId,
          step.mode,
          step.attemptLabel
        ),
        plannerUsage: step.plannerUsage
      },
      requestId
    );

    if (!started.item) {
      throw new Error("Failed to start agent tool step.");
    }

    if (started.item.step.status === "completed") {
      return started.item.run;
    }
  }

  try {
    throwIfStopped(options?.getStopReason);
    const snapshot = await runPayerRetrieval(
      {
        claimId: item.claim.id,
        claimNumber: item.claim.claimNumber,
        patientName: item.claim.patientName,
        payerId: item.claim.payerId,
        payerName: item.claim.payerName,
        jurisdiction: item.claim.jurisdiction,
        countryCode: item.claim.countryCode,
        provinceOfService: item.claim.provinceOfService ?? null,
        claimType: item.claim.claimType ?? null,
        serviceProviderType: item.claim.serviceProviderType ?? null,
        serviceCode: item.claim.serviceCode ?? null,
        planNumber: item.claim.planNumber ?? null,
        memberCertificate: item.claim.memberCertificate ?? null,
        serviceDate: item.claim.serviceDate ?? null,
        billedAmountCents: item.claim.amountCents ?? null,
        sessionMode: step.mode,
        preferredConnectorId: step.connectorId,
        attempt: item.job.attempts,
        maxAttempts: item.job.maxAttempts
      },
      requestId
    );
    throwIfStopped(options?.getStopReason);
    const completed = await workflowApi.completeAgentToolStep(
      run.id,
      step.stepNumber,
      {
        workerName,
        result: buildSuccessfulStepResult(snapshot)
      },
      requestId
    );

    if (!completed.item) {
      throw new Error("Failed to persist completed agent tool step.");
    }

    return completed.item.run;
  } catch (error) {
    const normalizedError = normalizeConnectorError(error, step.connectorId, step.mode);
    throwIfStopped(options?.getStopReason);
    const completed = await workflowApi.completeAgentToolStep(
      run.id,
      step.stepNumber,
      {
        workerName,
        result: buildFailedStepResult(normalizedError)
      },
      requestId
    );

    if (!completed.item) {
      throw new Error("Failed to persist failed agent tool step.");
    }

    return completed.item.run;
  }
}

export async function processReservedAgentJob(
  item: ReservedJob,
  dependencies: {
    workflowApi: WorkflowApiClient;
    aiClient: AiServiceClient;
    workerName: string;
    requestId: string;
    getStopReason?: () => string | null;
  }
) {
  let run = item.agentRun;

  while (true) {
    throwIfStopped(dependencies.getStopReason);
    const terminalStep = latestCompletedTerminalStep(run);
    if (terminalStep) {
      await applyTerminalSideEffect(
        dependencies.workflowApi,
        item,
        run,
        terminalStep,
        dependencies.requestId,
        dependencies.getStopReason
      );
      return;
    }

    const replayStep = latestStartedToolStep(run);
    if (replayStep?.toolArgs) {
      run = await executeConnectorStep(
        dependencies.workflowApi,
        item,
        run,
        dependencies.workerName,
        dependencies.requestId,
        {
          stepNumber: replayStep.stepNumber,
          connectorId: replayStep.toolArgs.connectorId,
          mode: replayStep.toolArgs.mode,
          attemptLabel: replayStep.toolArgs.attemptLabel,
          publicReason: replayStep.publicReason,
          plannerUsage: replayStep.plannerUsage ?? runtimePlannerUsage()
        },
        { skipStart: true, getStopReason: dependencies.getStopReason }
      );
      continue;
    }

    if (budgetExceeded(run)) {
      await recordAndApplyTerminalDirective(
        dependencies.workflowApi,
        item,
        run,
        buildBudgetTerminalDirective(item, run, dependencies.requestId),
        dependencies.workerName,
        dependencies.requestId,
        dependencies.getStopReason
      );
      return;
    }

    throwIfStopped(dependencies.getStopReason);
    const plannerRequest: AgentStepRequest = {
      context: buildAgentContext(item, run)
    };
    const plannerResponse = await dependencies.aiClient.planAgentStep(
      plannerRequest,
      dependencies.requestId
    );

    if (!plannerResponse) {
      await recordAndApplyTerminalDirective(
        dependencies.workflowApi,
        item,
        run,
        buildProviderUnavailableTerminalDirective(item, run, dependencies.requestId),
        dependencies.workerName,
        dependencies.requestId,
        dependencies.getStopReason
      );
      return;
    }

    const directive = plannerResponse.directive;

    if (directive.type === "tool_call") {
      run = await executeConnectorStep(
        dependencies.workflowApi,
        item,
        run,
        dependencies.workerName,
        dependencies.requestId,
        {
          stepNumber: nextStepNumber(run),
          connectorId: directive.toolCall.args.connectorId,
          mode: directive.toolCall.args.mode,
          attemptLabel: directive.toolCall.args.attemptLabel,
          publicReason: directive.publicReason,
          plannerUsage: directive.plannerUsage
        },
        { getStopReason: dependencies.getStopReason }
      );
      continue;
    }

    await recordAndApplyTerminalDirective(
      dependencies.workflowApi,
      item,
      run,
      toWorkerTerminalDirective(directive),
      dependencies.workerName,
      dependencies.requestId,
      dependencies.getStopReason
    );
    return;
  }
}
