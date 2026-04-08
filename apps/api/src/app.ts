import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import type { ExecutionCandidate } from "@tenio/contracts";

import { canManagePayerConfiguration } from "./auth.js";
import { checkDatabaseHealth } from "./database.js";
import { initializeStore } from "./domain/store.js";
import { appConfig, getEvidenceStorageHealthMetadata } from "./config.js";
import type { ImportProfileId, RawImportRow } from "./import/pms/index.js";
import { ReviewPolicyService } from "./services/review-policy-service.js";
import { WorkflowService } from "./services/workflow-service.js";

export async function buildApp() {
  await initializeStore();
  const app = Fastify({
    logger: true,
    genReqId(request) {
      return String(request.headers["x-request-id"] ?? randomUUID());
    }
  });
  const workflow = new WorkflowService();
  const reviewPolicy = new ReviewPolicyService();

  async function getSessionActor(request: {
    headers: Record<string, string | string[] | undefined>;
  }) {
    const sessionId = String(request.headers["x-tenio-session-id"] ?? "");
    const userId = String(request.headers["x-tenio-user-id"] ?? "");

    if (!sessionId || !userId) {
      return null;
    }

    const session = await workflow.getValidatedSession(sessionId);

    if (!session || session.userId !== userId) {
      return null;
    }

    return {
      id: session.userId,
      organizationId: session.organizationId,
      name: session.fullName,
      role: session.role,
      email: session.email,
      type: session.role === "admin" ? "admin" : "human"
    } as const;
  }

  function getRequestAuth(request: {
    headers: Record<string, string | string[] | undefined>;
  }) {
    const apiKey = request.headers["x-tenio-api-key"];
    const serviceToken = request.headers["x-tenio-service-token"];

    if (serviceToken === appConfig.webServiceToken) {
      return { kind: "web-service" as const };
    }

    if (serviceToken === appConfig.workerServiceToken) {
      return { kind: "worker-service" as const };
    }

    if (apiKey === appConfig.apiKey) {
      return { kind: "api-key" as const };
    }

    return null;
  }

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);

    if (request.url === "/health" || request.url === "/ready") {
      return;
    }

    if (!getRequestAuth(request)) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  });

  app.get("/health", async () => {
    const database = await checkDatabaseHealth();

    return {
      ok: true,
      service: "api",
      database,
      evidenceStorage: getEvidenceStorageHealthMetadata(),
      architecture: {
        apiLanguage: "TypeScript",
        productStateOwner: "workflow-layer",
        executionBoundary: "candidate-results-only"
      },
      security: {
        authMode: "service-token-and-session",
        failClosed: true
      }
    };
  });

  app.get("/ready", async (_request, reply) => {
    const database = await checkDatabaseHealth();

    if (!database.ok) {
      return reply.code(503).send({
        ok: false,
        service: "api",
        database
      });
    }

    return {
      ok: true,
      service: "api",
      database,
      evidenceStorage: getEvidenceStorageHealthMetadata()
    };
  });

  app.post("/auth/login", async (request, reply) => {
    const auth = getRequestAuth(request);

    if (auth?.kind !== "web-service") {
      return reply.code(403).send({ message: "Web service token required" });
    }

    const body = request.body as { email?: string; password?: string } | null;
    const email = body?.email?.trim() ?? "";
    const password = body?.password ?? "";

    if (!email || !password) {
      return reply.code(400).send({ message: "Email and password are required" });
    }

    const session = await workflow.authenticateUser(email, password);

    if (!session) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    return {
      session
    };
  });

  app.get("/claims", async () => ({ items: await workflow.getClaims() }));

  app.get("/claims-list", async () => ({ items: await workflow.getClaimsList() }));

  app.get("/queue", async () => ({ items: await workflow.getPilotQueue() }));

  app.get("/claims/:claimId", async (request, reply) => {
    const { claimId } = request.params as { claimId: string };
    const claim = await workflow.getPilotClaimDetail(claimId);

    if (!claim) {
      return reply.code(404).send({ message: "Claim not found" });
    }

    return { item: claim };
  });

  app.get("/results", async () => ({
    items: await workflow.getResults()
  }));

  app.post("/results/export", async (request, reply) => {
    const auth = getRequestAuth(request);
    const actor = await getSessionActor(request);

    if (auth?.kind !== "web-service" || !actor) {
      return reply.code(403).send({ message: "Authenticated user required" });
    }

    const exportBatch = await workflow.exportResults(actor);
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", `attachment; filename="${exportBatch.fileName}"`);
    return reply.send(exportBatch.body);
  });

  app.get("/results/:resultId", async (request, reply) => {
    const { resultId } = request.params as { resultId: string };
    const result = await workflow.getResultDetail(resultId);

    if (!result) {
      return reply.code(404).send({ message: "Result not found" });
    }

    return { item: result };
  });

  app.get("/evidence/:artifactId", async (request, reply) => {
    const auth = getRequestAuth(request);
    const actor = await getSessionActor(request);

    if (auth?.kind !== "web-service" || !actor) {
      return reply.code(403).send({ message: "Authenticated user required" });
    }

    const { artifactId } = request.params as { artifactId: string };
    const artifact = await workflow.getEvidenceArtifactContent(
      artifactId,
      actor.organizationId
    );

    if (!artifact) {
      return reply.code(404).send({ message: "Evidence artifact not found" });
    }

    reply.header("content-type", artifact.mimeType);
    return reply.send(artifact.body);
  });

  app.get("/audit-log", async () => ({
    items: await workflow.getAuditLog()
  }));

  app.get("/performance", async () => ({
    item: await workflow.getPerformanceMetrics()
  }));

  app.get("/configuration/payers", async (request, reply) => {
    const auth = getRequestAuth(request);

    if (auth?.kind !== "web-service") {
      return reply.code(403).send({ message: "Web service token required" });
    }

    const actor = await getSessionActor(request);

    return {
      items: await workflow.getPayerConfigurations(actor?.organizationId)
    };
  });

  app.post("/configuration/payers/:payerId/policy", async (request, reply) => {
    const auth = getRequestAuth(request);
    const actor = await getSessionActor(request);

    if (auth?.kind !== "web-service" || !actor) {
      return reply.code(403).send({ message: "Authenticated user required" });
    }

    if (!canManagePayerConfiguration(actor.role)) {
      return reply.code(403).send({ message: "Manager or admin role required" });
    }

    const { payerId } = request.params as { payerId: string };
    const body = request.body as {
      owner?: string;
      reviewThreshold: number;
      escalationThreshold: number;
      defaultSlaHours: number;
      autoAssignOwner: boolean;
    };

    try {
      return {
        item: await workflow.updatePayerConfigurationPolicy(payerId, body, actor)
      };
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : "Policy update failed"
      });
    }
  });

  app.post("/claims/import/preview", async (request, reply) => {
    const auth = getRequestAuth(request);
    const actor = await getSessionActor(request);

    if (auth?.kind !== "web-service" || !actor) {
      return reply.code(403).send({ message: "Authenticated user required" });
    }

    const body = request.body as {
      rows?: RawImportRow[];
      importProfile?: ImportProfileId;
    } | null;

    return {
      item: await workflow.previewClaimImport(
        body?.rows ?? [],
        actor,
        body?.importProfile
      )
    };
  });

  app.post("/claims/import/commit", async (request, reply) => {
    const auth = getRequestAuth(request);
    const actor = await getSessionActor(request);

    if (auth?.kind !== "web-service" || !actor) {
      return reply.code(403).send({ message: "Authenticated user required" });
    }

    const body = request.body as {
      rows?: RawImportRow[];
      importProfile?: ImportProfileId;
    } | null;

    return {
      item: await workflow.commitClaimImport(
        body?.rows ?? [],
        actor,
        body?.importProfile
      )
    };
  });

  app.post("/claims/intake", async (request, reply) => {
    const auth = getRequestAuth(request);
    const actor = await getSessionActor(request);

    if (auth?.kind !== "web-service" || !actor) {
      return reply.code(403).send({ message: "Authenticated user required" });
    }

    const body = request.body as {
      organizationId: string;
      payerId: string;
      claimNumber: string;
      patientName: string;
      jurisdiction?: "us" | "ca";
      countryCode?: "US" | "CA";
      provinceOfService?: string | null;
      claimType?: string | null;
      priority: "low" | "normal" | "high" | "urgent";
      owner?: string | null;
      notes?: string | null;
      slaAt?: string | null;
      sourceStatus?: string | null;
    };
    const claim = await workflow.createClaim(body, actor);

    return {
      item: claim
    };
  });

  app.post("/claims/:claimId/workflow-action", async (request, reply) => {
    const auth = getRequestAuth(request);
    const actor = await getSessionActor(request);

    if (auth?.kind !== "web-service" || !actor) {
      return reply.code(403).send({ message: "Authenticated user required" });
    }

    const { claimId } = request.params as { claimId: string };
    const body = request.body as {
      action:
        | "assign_owner"
        | "add_note"
        | "approve_review"
        | "resolve_claim"
        | "escalate_claim"
        | "reopen_claim"
        | "mark_call_required";
      assignee?: string;
      note?: string;
    };

    try {
      const item = await workflow.applyClaimAction(claimId, body.action, actor, {
        assignee: body.assignee,
        note: body.note
      });

      return { item };
    } catch (error) {
      return reply.code(404).send({
        message: error instanceof Error ? error.message : "Claim action failed"
      });
    }
  });

  app.post("/claims/:claimId/retrieve", async (request, reply) => {
    const auth = getRequestAuth(request);
    const actor = await getSessionActor(request);

    if (auth?.kind !== "web-service" || !actor) {
      return reply.code(403).send({ message: "Authenticated user required" });
    }

    const { claimId } = request.params as { claimId: string };
    const job = await workflow.enqueueRetrievalJob(claimId, actor);

    if (!job) {
      return reply.code(404).send({ message: "Claim not found" });
    }

    return {
      claimId,
      job,
      workflowState: "queued",
      note: "Retrieval was queued for asynchronous worker execution."
    };
  });

  app.post("/internal/retrieval-jobs/claim", async (request, reply) => {
    const auth = getRequestAuth(request);

    if (auth?.kind !== "worker-service") {
      return reply.code(403).send({ message: "Worker service token required" });
    }

    const body = (request.body as { workerName?: string } | null) ?? {};
    const item = await workflow.claimNextRetrievalJob(body.workerName ?? "worker-1");

    return {
      item
    };
  });

  app.post("/internal/agent-runs/:runId/heartbeat", async (request, reply) => {
    const auth = getRequestAuth(request);

    if (auth?.kind !== "worker-service") {
      return reply.code(403).send({ message: "Worker service token required" });
    }

    const { runId } = request.params as { runId: string };
    const body = (request.body as { workerName?: string } | null) ?? {};

    try {
      return {
        item: await workflow.heartbeatAgentRun(runId, body.workerName ?? "worker-1")
      };
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : "Agent heartbeat failed"
      });
    }
  });

  app.post("/internal/agent-runs/:runId/steps/start", async (request, reply) => {
    const auth = getRequestAuth(request);

    if (auth?.kind !== "worker-service") {
      return reply.code(403).send({ message: "Worker service token required" });
    }

    const { runId } = request.params as { runId: string };
    const body = request.body as {
      workerName?: string;
      stepNumber: number;
      toolName: "execute_connector";
      toolArgs: {
        connectorId: string;
        mode: "browser" | "api";
        attemptLabel: string;
      };
      publicReason: string;
      idempotencyKey: string;
      plannerUsage: {
        provider: string;
        model: string;
        inputTokens: number;
        outputTokens: number;
      };
    };

    try {
      return {
        item: await workflow.startAgentToolStep(
          runId,
          {
            stepNumber: body.stepNumber,
            toolName: body.toolName,
            toolArgs: body.toolArgs,
            publicReason: body.publicReason,
            idempotencyKey: body.idempotencyKey,
            plannerUsage: body.plannerUsage
          },
          body.workerName ?? "worker-1"
        )
      };
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : "Agent step start failed"
      });
    }
  });

  app.post("/internal/agent-runs/:runId/steps/:stepNumber/complete", async (request, reply) => {
    const auth = getRequestAuth(request);

    if (auth?.kind !== "worker-service") {
      return reply.code(403).send({ message: "Worker service token required" });
    }

    const { runId, stepNumber } = request.params as { runId: string; stepNumber: string };
    const body = request.body as {
      workerName?: string;
      result: {
        observation?: {
          observationVersion: 1;
          connectorId: string;
          connectorName: string;
          connectorVersion?: string | null;
          executionMode: "browser" | "api";
          observedAt: string;
          durationMs: number;
          success: boolean;
          retryable: boolean;
          failureCategory: ExecutionCandidate["execution"]["failureCategory"];
          summary: string;
          portalTextSnippet?: string | null;
          screenshotUrls?: string[];
          evidenceArtifactIds?: string[];
          evidenceArtifacts?: ExecutionCandidate["evidence"];
          connectorPayloadJson?: string | null;
        } | null;
        summary: string;
        evidenceArtifactIds?: string[];
        retryable?: boolean;
        failureCategory?: ExecutionCandidate["execution"]["failureCategory"];
        finalCandidate?: ExecutionCandidate | null;
        retryAfterSeconds?: number | null;
        terminalReason?:
          | "resolved_candidate"
          | "review_required"
          | "retry_scheduled"
          | "budget_exhausted_incomplete"
          | "budget_exhausted_conflict"
          | "provider_unavailable_retry"
          | "provider_unavailable_review"
          | "fallback_policy_review"
          | null;
      };
    };

    try {
      return {
        item: await workflow.completeAgentToolStep(
          runId,
          Number(stepNumber),
          {
            ...body.result,
            evidenceArtifactIds: body.result.evidenceArtifactIds ?? [],
            observation: body.result.observation
                ? {
                    ...body.result.observation,
                    failureCategory: body.result.observation.failureCategory ?? null,
                    screenshotUrls: body.result.observation.screenshotUrls ?? [],
                    evidenceArtifactIds: body.result.observation.evidenceArtifactIds ?? [],
                    evidenceArtifacts: body.result.observation.evidenceArtifacts ?? []
                  }
              : body.result.observation
          },
          body.workerName ?? "worker-1"
        )
      };
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : "Agent step completion failed"
      });
    }
  });

  app.post("/internal/agent-runs/:runId/steps/terminal", async (request, reply) => {
    const auth = getRequestAuth(request);

    if (auth?.kind !== "worker-service") {
      return reply.code(403).send({ message: "Worker service token required" });
    }

    const { runId } = request.params as { runId: string };
    const body = request.body as {
      workerName?: string;
      stepNumber: number;
      directiveKind: "final" | "retry";
      publicReason: string;
      idempotencyKey: string;
      plannerUsage: {
        provider: string;
        model: string;
        inputTokens: number;
        outputTokens: number;
      };
      summary: string;
      terminalReason:
        | "resolved_candidate"
        | "review_required"
        | "retry_scheduled"
        | "budget_exhausted_incomplete"
        | "budget_exhausted_conflict"
        | "provider_unavailable_retry"
        | "provider_unavailable_review"
        | "fallback_policy_review";
      finalCandidate?: ExecutionCandidate | null;
      retryAfterSeconds?: number | null;
    };

    try {
      return {
        item: await workflow.recordAgentTerminalStep(
          runId,
          body,
          body.workerName ?? "worker-1"
        )
      };
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : "Agent terminal step failed"
      });
    }
  });

  app.post("/internal/retrieval-jobs/:jobId/complete", async (request, reply) => {
    const auth = getRequestAuth(request);

    if (auth?.kind !== "worker-service") {
      return reply.code(403).send({ message: "Worker service token required" });
    }

    const { jobId } = request.params as { jobId: string };
    const body = request.body as {
      claimId: string;
      candidate: ExecutionCandidate;
    };
    const policy = await workflow.getReviewPolicyForClaim(body.claimId);
    const decision = reviewPolicy.decide(body.candidate, policy);
    const item = await workflow.applyRetrievalOutcome(
      body.claimId,
      body.candidate,
      decision,
      jobId
    );

    return {
      item,
      decision
    };
  });

  app.post("/internal/retrieval-jobs/:jobId/fail", async (request, reply) => {
    const auth = getRequestAuth(request);

    if (auth?.kind !== "worker-service") {
      return reply.code(403).send({ message: "Worker service token required" });
    }

    const { jobId } = request.params as { jobId: string };
    const body = request.body as {
      error?: string;
      failureCategory?: ExecutionCandidate["execution"]["failureCategory"];
      retryable?: boolean;
      retryAfterSeconds?: number;
      connectorId?: string;
      connectorName?: string;
      executionMode?: "browser" | "api";
      observedAt?: string;
      durationMs?: number;
      terminalReason?:
        | "resolved_candidate"
        | "review_required"
        | "retry_scheduled"
        | "budget_exhausted_incomplete"
        | "budget_exhausted_conflict"
        | "provider_unavailable_retry"
        | "provider_unavailable_review"
        | "fallback_policy_review";
    } | null;
    const item = await workflow.failRetrievalJob(jobId, {
      error: body?.error ?? "Worker reported an unknown failure.",
      failureCategory: body?.failureCategory ?? undefined,
      retryable: body?.retryable ?? undefined,
      retryAfterSeconds: body?.retryAfterSeconds ?? undefined,
      connectorId: body?.connectorId ?? undefined,
      connectorName: body?.connectorName ?? undefined,
      executionMode: body?.executionMode ?? undefined,
      observedAt: body?.observedAt ?? undefined,
      durationMs: body?.durationMs ?? undefined,
      terminalReason: body?.terminalReason ?? undefined
    });

    return {
      item
    };
  });

  return app;
}
