import Fastify from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { hasPermission, type Permission } from "@tenio/domain";
import { CONNECTOR_TELUS_ECLAIMS, type ExecutionCandidate } from "@tenio/contracts";

import { checkDatabaseHealth, getPool } from "./database.js";
import { initializeStore } from "./domain/store.js";
import { appConfig, getEvidenceStorageHealthMetadata } from "./config.js";
import type { ImportProfileId, RawImportRow } from "./import/pms/index.js";
import { encryptCredential } from "./credential-crypto.js";
import { ReviewPolicyService } from "./services/review-policy-service.js";
import { WorkflowService } from "./services/workflow-service.js";
import { Sentry } from "./sentry.js";

type RequestAuth =
  | { kind: "web-service" }
  | { kind: "worker-service" }
  | { kind: "api-key" };

declare module "fastify" {
  interface FastifyRequest {
    tenioAuth: RequestAuth | null;
    tenioActor: {
      id: string;
      organizationId: string;
      name: string;
      role: "owner" | "manager" | "operator" | "viewer";
      email: string;
      type: "owner" | "human";
    } | null;
    tenioStartedAt: number;
    tenioErrorMessage: string | null;
  }
}

function getRequestAuth(request: {
  headers: Record<string, string | string[] | undefined>;
}): RequestAuth | null {
  const apiKey = request.headers["x-tenio-api-key"];
  const serviceToken = request.headers["x-tenio-service-token"];

  if (serviceToken === appConfig.webServiceToken) {
    return { kind: "web-service" };
  }

  if (serviceToken === appConfig.workerServiceToken) {
    return { kind: "worker-service" };
  }

  if (apiKey === appConfig.apiKey) {
    return { kind: "api-key" };
  }

  return null;
}

function routePattern(request: FastifyRequest) {
  return request.routeOptions.url || request.url;
}

function markRequestError(request: FastifyRequest, message: string) {
  request.tenioErrorMessage = message;
}

function sendError(reply: FastifyReply, statusCode: number, message: string) {
  markRequestError(reply.request, message);
  return reply.code(statusCode).send({ message });
}

function requireWorkerService() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.tenioAuth?.kind !== "worker-service") {
      return sendError(reply, 403, "Forbidden");
    }
  };
}

function requireWebService() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.tenioAuth?.kind !== "web-service") {
      return sendError(reply, 403, "Forbidden");
    }
  };
}

function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.tenioAuth?.kind !== "web-service" || !request.tenioActor) {
      return sendError(reply, 403, "Forbidden");
    }

    if (!hasPermission(request.tenioActor.role, permission)) {
      return sendError(reply, 403, "Forbidden");
    }
  };
}

async function getSessionActor(
  workflow: WorkflowService,
  request: {
    headers: Record<string, string | string[] | undefined>;
  }
) {
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
    type: session.role === "owner" ? ("owner" as const) : ("human" as const)
  };
}

export async function buildApp() {
  await initializeStore();
  const app = Fastify({
    logger: true,
    disableRequestLogging: true,
    genReqId(request) {
      return String(request.headers["x-request-id"] ?? randomUUID());
    }
  });
  const workflow = new WorkflowService();
  const reviewPolicy = new ReviewPolicyService();

  app.addHook("onRequest", async (request, reply) => {
    request.tenioStartedAt = Date.now();
    request.tenioErrorMessage = null;
    request.tenioAuth = null;
    request.tenioActor = null;

    reply.header("x-request-id", request.id);

    if (request.url === "/health" || request.url === "/ready") {
      return;
    }

    const auth = getRequestAuth(request);
    request.tenioAuth = auth;

    if (!auth) {
      return sendError(reply, 403, "Forbidden");
    }

    if (auth.kind === "web-service") {
      request.tenioActor = await getSessionActor(workflow, request);
    }
  });

  app.addHook("onResponse", async (request, reply) => {
    const actor = request.tenioActor;
    app.log.info({
      timestamp: new Date().toISOString(),
      requestId: request.id,
      orgId: actor?.organizationId ?? null,
      userId: actor?.id ?? null,
      role: actor?.role ?? null,
      method: request.method,
      route: routePattern(request),
      statusCode: reply.statusCode,
      durationMs: Date.now() - request.tenioStartedAt,
      ...(reply.statusCode >= 400 && request.tenioErrorMessage
        ? { error: request.tenioErrorMessage }
        : {})
    });
  });

  app.setErrorHandler((error, request, reply) => {
    const statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? (error as { statusCode: number }).statusCode
        : 500;
    const message =
      statusCode >= 500
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Request failed";

    markRequestError(request, message);

    if (appConfig.sentryDsn) {
      Sentry.withScope((scope) => {
        if (request.tenioActor) {
          scope.setUser({
            id: request.tenioActor.id,
            email: request.tenioActor.email
          });
          scope.setTag("orgId", request.tenioActor.organizationId);
          scope.setTag("role", request.tenioActor.role);
        }
        scope.setTag("requestId", request.id);
        scope.setTag("route", routePattern(request));
        Sentry.captureException(error);
      });
    }

    reply.code(statusCode).send({ message });
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

  app.post("/auth/login", { preHandler: requireWebService() }, async (request, reply) => {
    const body = request.body as { email?: string; password?: string } | null;
    const email = body?.email?.trim() ?? "";
    const password = body?.password ?? "";

    if (!email || !password) {
      return sendError(reply, 400, "Email and password are required");
    }

    const session = await workflow.authenticateUser(email, password);

    if (!session) {
      return sendError(reply, 401, "Invalid credentials");
    }

    return { session };
  });

  app.get("/claims", { preHandler: requirePermission("claims:read") }, async (request) => {
    const view = (request.query as Record<string, string>)?.view;
    if (view === "list") {
      return { items: await workflow.getClaimsList(request.tenioActor!.organizationId) };
    }
    return { items: await workflow.getClaims(request.tenioActor!.organizationId) };
  });

  app.get("/queue", { preHandler: requirePermission("queue:read") }, async (request) => ({
    items: await workflow.getPilotQueue(request.tenioActor!.organizationId)
  }));

  app.get(
    "/claims/:claimId",
    { preHandler: requirePermission("claims:read") },
    async (request, reply) => {
      const { claimId } = request.params as { claimId: string };
      const claim = await workflow.getPilotClaimDetail(
        claimId,
        request.tenioActor!.organizationId
      );

      if (!claim) {
        return sendError(reply, 404, "Claim not found");
      }

      try {
        await workflow.markClaimDetailOpenedForOnboarding(request.tenioActor!);
      } catch (error) {
        request.log.warn(
          { error: error instanceof Error ? error.message : "Unknown error" },
          "Failed to mark onboarding claim detail open"
        );
      }

      return { item: claim };
    }
  );

  app.get("/results", { preHandler: requirePermission("claims:read") }, async (request) => ({
    items: await workflow.getResults(request.tenioActor!.organizationId)
  }));

  app.post(
    "/results/export",
    { preHandler: requirePermission("claims:export") },
    async (request, reply) => {
      const exportBatch = await workflow.exportResults(request.tenioActor!);
      reply.header("content-type", "text/csv; charset=utf-8");
      reply.header(
        "content-disposition",
        `attachment; filename="${exportBatch.fileName}"`
      );
      return reply.send(exportBatch.body);
    }
  );

  app.get(
    "/results/:resultId",
    { preHandler: requirePermission("claims:read") },
    async (request, reply) => {
      const { resultId } = request.params as { resultId: string };
      const result = await workflow.getResultDetail(
        resultId,
        request.tenioActor!.organizationId
      );

      if (!result) {
        return sendError(reply, 404, "Result not found");
      }

      return { item: result };
    }
  );

  app.get(
    "/evidence/:artifactId",
    { preHandler: requirePermission("evidence:download") },
    async (request, reply) => {
      const { artifactId } = request.params as { artifactId: string };
      const artifact = await workflow.getEvidenceArtifactContent(
        artifactId,
        request.tenioActor!.organizationId,
        request.tenioActor!
      );

      if (!artifact) {
        return sendError(reply, 403, "Forbidden");
      }

      reply.header("content-type", artifact.mimeType);
      reply.header(
        "content-disposition",
        `inline; filename="${artifact.fileName}"`
      );
      return reply.send(artifact.body);
    }
  );

  app.get("/audit-log", { preHandler: requirePermission("audit:read") }, async (request) => ({
    items: await workflow.getAuditLog(request.tenioActor!.organizationId)
  }));

  app.get("/performance", { preHandler: requirePermission("performance:read") }, async (request) => ({
    item: await workflow.getPerformanceMetrics(request.tenioActor!.organizationId)
  }));

  app.get(
    "/configuration/payers",
    { preHandler: requirePermission("payer:read") },
    async (request) => ({
      items: await workflow.getPayerConfigurations(request.tenioActor!.organizationId)
    })
  );

  app.get(
    "/payers",
    { preHandler: requirePermission("claims:import") },
    async (request) => ({
      items: (await workflow.getPayerConfigurations(request.tenioActor!.organizationId)).map(
        (payer) => ({
          payerId: payer.payerId,
          payerName: payer.payerName,
          jurisdiction: payer.jurisdiction,
          countryCode: payer.countryCode
        })
      )
    })
  );

  app.post(
    "/configuration/payers/:payerId/policy",
    { preHandler: requirePermission("payer:write") },
    async (request, reply) => {
      const { payerId } = request.params as { payerId: string };
      const body = request.body as {
        owner?: string;
        reviewThreshold: number;
        escalationThreshold: number;
        defaultSlaHours: number;
        autoAssignOwner: boolean;
        statusRules?: string[];
        reviewRules?: string[];
        destinations?: Array<{ id: string; label: string; kind: "webhook" | "sftp"; status: "active" | "inactive" }>;
      };

      try {
        return {
          item: await workflow.updatePayerConfigurationPolicy(
            payerId,
            body,
            request.tenioActor!
          )
        };
      } catch (error) {
        return sendError(
          reply,
          400,
          error instanceof Error ? error.message : "Policy update failed"
        );
      }
    }
  );

  app.post(
    "/claims/import/preview",
    { preHandler: requirePermission("claims:import") },
    async (request) => {
      const body = request.body as {
        rows?: RawImportRow[];
        importProfile?: ImportProfileId;
      } | null;

      return {
        item: await workflow.previewClaimImport(
          body?.rows ?? [],
          request.tenioActor!,
          body?.importProfile
        )
      };
    }
  );

  app.post(
    "/claims/import/commit",
    { preHandler: requirePermission("claims:import") },
    async (request) => {
      const body = request.body as {
        rows?: RawImportRow[];
        importProfile?: ImportProfileId;
      } | null;

      return {
        item: await workflow.commitClaimImport(
          body?.rows ?? [],
          request.tenioActor!,
          body?.importProfile
        )
      };
    }
  );

  app.post(
    "/claims",
    { preHandler: requirePermission("claims:write") },
    async (request) => {
      const body = request.body as {
        organizationId: string;
        payerId: string;
        claimNumber: string;
        patientName: string;
        jurisdiction?: "us" | "ca";
        countryCode?: "US" | "CA";
        provinceOfService?: string | null;
        claimType?: string | null;
        serviceProviderType?:
          | "physiotherapist"
          | "chiropractor"
          | "massage_therapist"
          | "psychotherapist"
          | "other"
          | null;
        serviceCode?: string | null;
        planNumber?: string | null;
        memberCertificate?: string | null;
        serviceDate?: string | null;
        billedAmountCents?: number | null;
        priority: "low" | "normal" | "high" | "urgent";
        owner?: string | null;
        notes?: string | null;
        slaAt?: string | null;
        sourceStatus?: string | null;
      };

      return {
        item: await workflow.createClaim(body, request.tenioActor!)
      };
    }
  );

  // POST /claims/:claimId/follow-ups — log a follow-up, note, or owner assignment
  app.post(
    "/claims/:claimId/follow-ups",
    { preHandler: requirePermission("followup:log") },
    async (request, reply) => {
      const { claimId } = request.params as { claimId: string };
      const body = request.body as {
        action: "assign_owner" | "add_note" | "mark_call_required" | "log_follow_up";
        assignee?: string;
        note?: string;
        outcome?:
          | "status_checked"
          | "pending_payer"
          | "more_info_needed"
          | "needs_review"
          | "phone_call_required"
          | "resolved";
        nextAction?: string;
        followUpAt?: string | null;
      };

      try {
        return {
          item: await workflow.applyClaimAction(claimId, body.action, request.tenioActor!, {
            assignee: body.assignee,
            note: body.note,
            outcome: body.outcome,
            nextAction: body.nextAction,
            followUpAt: body.followUpAt
          })
        };
      } catch (error) {
        return sendError(reply, 404, error instanceof Error ? error.message : "Claim action failed");
      }
    }
  );

  // POST /claims/:claimId/status — advance claim status (resolve, escalate, reopen, review)
  app.post(
    "/claims/:claimId/status",
    { preHandler: requirePermission("followup:log") },
    async (request, reply) => {
      const { claimId } = request.params as { claimId: string };
      const body = request.body as {
        action: "approve_review" | "resolve_claim" | "escalate_claim" | "reopen_claim";
        note?: string;
      };

      try {
        return {
          item: await workflow.applyClaimAction(claimId, body.action, request.tenioActor!, {
            note: body.note
          })
        };
      } catch (error) {
        return sendError(reply, 404, error instanceof Error ? error.message : "Claim action failed");
      }
    }
  );

  app.post(
    "/claims/:claimId/retrieve",
    { preHandler: requirePermission("queue:work") },
    async (request, reply) => {
      const { claimId } = request.params as { claimId: string };
      const job = await workflow.enqueueRetrievalJob(claimId, request.tenioActor!);

      if (!job) {
        return sendError(reply, 404, "Claim not found");
      }

      return {
        claimId,
        job,
        workflowState: "queued",
        note: "Retrieval was queued for asynchronous worker execution."
      };
    }
  );

  app.get("/users", { preHandler: requirePermission("users:read") }, async (request) => ({
    items: await workflow.getUsers(request.tenioActor!.organizationId)
  }));

  app.post(
    "/users/invite",
    { preHandler: requirePermission("users:invite") },
    async (request, reply) => {
      const body = request.body as {
        email?: string;
        fullName?: string;
        role?: "manager" | "operator" | "viewer";
        temporaryPassword?: string | null;
      } | null;

      if (!body?.email || !body?.fullName || !body?.role) {
        return sendError(reply, 400, "Email, fullName, and role are required");
      }

      try {
        return {
          item: await workflow.inviteUser(request.tenioActor!, {
            email: body.email,
            fullName: body.fullName,
            role: body.role,
            temporaryPassword: body.temporaryPassword
          })
        };
      } catch (error) {
        return sendError(
          reply,
          400,
          error instanceof Error ? error.message : "User invite failed"
        );
      }
    }
  );

  app.delete(
    "/users/:userId",
    { preHandler: requirePermission("users:remove") },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };

      try {
        return {
          item: await workflow.removeUser(request.tenioActor!, userId)
        };
      } catch (error) {
        return sendError(
          reply,
          400,
          error instanceof Error ? error.message : "User removal failed"
        );
      }
    }
  );

  app.get(
    "/account",
    { preHandler: requirePermission("account:read") },
    async (request, reply) => {
      const item = await workflow.getAccount(request.tenioActor!.organizationId);

      if (!item) {
        return sendError(reply, 404, "Account not found");
      }

      return { item };
    }
  );

  app.put(
    "/account",
    { preHandler: requirePermission("account:write") },
    async (_request, reply) =>
      sendError(
        reply,
        501,
        "Pilot-managed billing/account settings are not editable in-app yet"
      )
  );

  app.get("/status", { preHandler: requirePermission("status:read") }, async (request) => ({
    item: await workflow.getStatus(request.tenioActor!.organizationId)
  }));

  app.get(
    "/onboarding/state",
    { preHandler: requirePermission("users:read") },
    async (request) => ({
      item: await workflow.getOnboardingState(request.tenioActor!)
    })
  );

  app.post(
    "/onboarding/state",
    { preHandler: requirePermission("users:read") },
    async (request, reply) => {
      const body = request.body as {
        action?: "dismiss_welcome" | "complete_queue_tour";
      } | null;

      if (
        body?.action !== "dismiss_welcome" &&
        body?.action !== "complete_queue_tour"
      ) {
        return sendError(reply, 400, "Invalid onboarding action");
      }

      try {
        return {
          item: await workflow.updateOnboardingState(request.tenioActor!, body.action)
        };
      } catch (error) {
        return sendError(
          reply,
          400,
          error instanceof Error ? error.message : "Onboarding update failed"
        );
      }
    }
  );

  app.post(
    "/internal/retrieval-jobs/claim",
    { preHandler: requireWorkerService() },
    async (request) => {
      const body = (request.body as { workerName?: string } | null) ?? {};
      return {
        item: await workflow.claimNextRetrievalJob(body.workerName ?? "worker-1")
      };
    }
  );

  app.post(
    "/internal/agent-runs/:runId/heartbeat",
    { preHandler: requireWorkerService() },
    async (request, reply) => {
      const { runId } = request.params as { runId: string };
      const body = (request.body as { workerName?: string } | null) ?? {};

      try {
        return {
          item: await workflow.heartbeatAgentRun(runId, body.workerName ?? "worker-1")
        };
      } catch (error) {
        return sendError(
          reply,
          400,
          error instanceof Error ? error.message : "Agent heartbeat failed"
        );
      }
    }
  );

  app.post(
    "/internal/agent-runs/:runId/steps/start",
    { preHandler: requireWorkerService() },
    async (request, reply) => {
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
        return sendError(
          reply,
          400,
          error instanceof Error ? error.message : "Agent step start failed"
        );
      }
    }
  );

  app.post(
    "/internal/agent-runs/:runId/steps/:stepNumber/complete",
    { preHandler: requireWorkerService() },
    async (request, reply) => {
      const { runId, stepNumber } = request.params as {
        runId: string;
        stepNumber: string;
      };
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
        return sendError(
          reply,
          400,
          error instanceof Error ? error.message : "Agent step completion failed"
        );
      }
    }
  );

  app.post(
    "/internal/agent-runs/:runId/steps/terminal",
    { preHandler: requireWorkerService() },
    async (request, reply) => {
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
        return sendError(
          reply,
          400,
          error instanceof Error ? error.message : "Agent terminal step failed"
        );
      }
    }
  );

  app.post(
    "/internal/retrieval-jobs/:jobId/complete",
    { preHandler: requireWorkerService() },
    async (request) => {
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
    }
  );

  app.post(
    "/internal/retrieval-jobs/:jobId/fail",
    { preHandler: requireWorkerService() },
    async (request) => {
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

      return { item };
    }
  );

  // ── Credential management ──────────────────────────────────────────────────
  // Never returns the encrypted payload or raw credential values.

  app.get(
    "/payers/:payerId/credentials",
    { preHandler: requirePermission("payer:read") },
    async (request, reply) => {
      const { payerId } = request.params as { payerId: string };
      const result = await getPool().query<{
        last_verified_at: string | null;
      }>(
        `SELECT last_verified_at
           FROM connector_credentials
          WHERE org_id = $1
            AND payer_id = $2
          LIMIT 1`,
        [request.tenioActor!.organizationId, payerId]
      );

      if (!result.rows[0]) {
        return { connected: false, lastVerifiedAt: null };
      }

      return {
        connected: true,
        lastVerifiedAt: result.rows[0].last_verified_at ?? null
      };
    }
  );

  app.put(
    "/payers/:payerId/credentials",
    { preHandler: requirePermission("payer:write") },
    async (request, reply) => {
      const { payerId } = request.params as { payerId: string };
      const body = request.body as {
        accessToken?: string;
        refreshToken?: string;
        planSoftwareId?: string;
      } | null;

      if (!body?.accessToken) {
        return sendError(reply, 400, "accessToken is required");
      }

      const credentialPayload = JSON.stringify({
        accessToken: body.accessToken,
        ...(body.refreshToken ? { refreshToken: body.refreshToken } : {}),
        ...(body.planSoftwareId ? { planSoftwareId: body.planSoftwareId } : {})
      });

      let encrypted: Buffer;
      try {
        encrypted = await encryptCredential(
          credentialPayload,
          appConfig.credentialEncryptionKey
        );
      } catch (err) {
        return sendError(
          reply,
          500,
          err instanceof Error ? err.message : "Credential encryption failed"
        );
      }

      await getPool().query(
        `INSERT INTO connector_credentials
           (org_id, payer_id, connector_id, encrypted_payload, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (org_id, connector_id)
         DO UPDATE SET
           payer_id = EXCLUDED.payer_id,
           encrypted_payload = EXCLUDED.encrypted_payload,
           session_cache = NULL,
           updated_at = now()`,
        [
          request.tenioActor!.organizationId,
          payerId,
          CONNECTOR_TELUS_ECLAIMS,
          encrypted
        ]
      );

      return { connected: true };
    }
  );

  app.delete(
    "/payers/:payerId/credentials",
    { preHandler: requirePermission("payer:write") },
    async (request, reply) => {
      const { payerId } = request.params as { payerId: string };

      await getPool().query(
        `DELETE FROM connector_credentials
          WHERE org_id = $1
            AND payer_id = $2`,
        [request.tenioActor!.organizationId, payerId]
      );

      return reply.code(204).send();
    }
  );

  return app;
}
