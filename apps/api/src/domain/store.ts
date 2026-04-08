import type {
  AgentDirectiveKind,
  AgentRunBudget,
  AgentRunTerminalReason,
  AgentStepHistoryItem,
  AgentStepResult,
  AgentToolName,
  ConnectorMode,
  EvidenceArtifact,
  ExecutionCandidate,
  ExecutionFailureCategory
} from "@tenio/contracts";
import {
  hasPermission,
  normalizeUserRole,
  type ClaimDetail,
  type ClaimSummary,
  type CountryCode,
  type IntakeClaim,
  type Jurisdiction,
  type Priority,
  type QueueItem,
  type UserRole
} from "@tenio/domain";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import type { PoolClient } from "pg";

import { appConfig } from "../config.js";
import { getPool, withTransaction } from "../database.js";
import {
  InvalidEvidenceStoragePathError,
  persistEvidenceArtifact,
  readStoredEvidence
} from "../evidence-storage.js";
import {
  hashPassword,
  type UserSession,
  verifyPassword
} from "../auth.js";
import { runMigrations } from "../migrations.js";
import type { WorkflowDecision } from "../services/review-policy-service.js";
import {
  applyClaimWorkflowAction,
  buildClaimsList,
  buildPerformanceMetrics,
  createSeedPayerConfigurations,
  findMissingSeedPayerConfigurations,
  derivePayerConfigurationIssues,
  derivePayerConfigurationStatus,
  type AppUserRecord,
  type AgentRunRecord,
  type AgentRunStatus,
  type AgentStepRecord,
  type ClaimsListItemView,
  type PayerConfigurationRecord,
  type PerformanceMetricsView,
  type RetrievalJobRecord,
  type WorkflowActor
} from "./prod-state.js";
import {
  buildAuditLog,
  buildPilotClaimDetail,
  buildPilotQueueItems,
  buildResultDetail,
  buildResultSummaries,
  computeRetrievalOutcome,
  createSeedState,
  type AuditEventRecord,
  type AuditEventView,
  type ClaimRecord,
  type PilotClaimDetail,
  type PilotQueueItem,
  type ResultDetailView,
  type ResultRecord,
  type ResultSummaryView,
  statusLabel,
  toClaimDetail,
  toClaimSummary
} from "./pilot-state.js";
import {
  previewClaimImportRows,
  type ClaimImportPreviewResult
} from "./imports.js";
import { adaptImportRows, type ImportProfileId, type RawImportRow } from "../import/pms/index.js";

let initialized = false;
type DbExecutor = PoolClient | ReturnType<typeof getPool>;

export type AgentRunView = {
  id: string;
  status: AgentRunStatus;
  protocolVersion: 1;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  heartbeatAt: string | null;
  startedAt: string;
  completedAt: string | null;
  modelProvider: string | null;
  modelName: string | null;
  modelCallsUsed: number;
  inputTokensUsed: number;
  outputTokensUsed: number;
  totalTokensUsed: number;
  connectorSwitchCount: number;
  budget: AgentRunBudget;
  terminalReason: AgentRunTerminalReason | null;
  lastError: string | null;
  steps: AgentStepHistoryItem[];
};

export type UserSummaryView = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

export type InvitedUserView = {
  user: UserSummaryView;
  temporaryPassword: string;
};

export type AccountSummaryView = {
  organizationId: string;
  organizationName: string;
  billingMode: "pilot_managed";
};

export type StatusSummaryView = {
  lastImportAt: string | null;
  lastImportOutcome: "success" | "failure" | null;
  lastImportRowCount: number | null;
  lastQueueSyncAt: string | null;
  failedActionsLast24h: number;
  openClaimsCount: number;
};

function parsePayloadRow<T>(row: { payload: T }) {
  return row.payload;
}

function getDbExecutor(client?: PoolClient): DbExecutor {
  return client ?? getPool();
}

function normalizeResultRecord(result: ResultRecord): ResultRecord {
  return {
    ...result,
    agentTraceId: result.agentTraceId ?? null,
    routeReason:
      result.routeReason ??
      "Workflow policy evaluated the candidate result and decided whether to resolve or review.",
    rationale:
      result.rationale ??
      "The agentic layer summarized the payer response and returned a candidate output.",
    connectorId: result.connectorId ?? "legacy-runtime",
    connectorName: result.connectorName ?? "Legacy Runtime",
    executionMode: result.executionMode ?? "browser",
    executionObservedAt: result.executionObservedAt ?? result.lastVerifiedAt,
    executionDurationMs: result.executionDurationMs ?? 0
  };
}

function normalizeClaimRecord(claim: ClaimRecord): ClaimRecord {
  return {
    ...claim,
    serviceDate: claim.serviceDate ?? new Date().toISOString().slice(0, 10),
    claimType: claim.claimType ?? "Professional",
    serviceProviderType: claim.serviceProviderType ?? null,
    serviceCode: claim.serviceCode ?? null,
    planNumber: claim.planNumber ?? null,
    memberCertificate: claim.memberCertificate ?? null,
    jurisdiction: claim.jurisdiction ?? "us",
    countryCode: claim.countryCode ?? (claim.jurisdiction === "ca" ? "CA" : "US"),
    provinceOfService: claim.provinceOfService ?? null,
    requiresPhoneCall: claim.requiresPhoneCall ?? false,
    phoneCallRequiredAt: claim.phoneCallRequiredAt ?? null
  };
}

function normalizeRetrievalJob(job: RetrievalJobRecord): RetrievalJobRecord {
  return {
    ...job,
    lastAttemptedAt: job.lastAttemptedAt ?? null,
    failureCategory: job.failureCategory ?? null,
    retryable: job.retryable ?? false,
    connectorId: job.connectorId ?? null,
    connectorName: job.connectorName ?? null,
    executionMode: job.executionMode ?? null,
    agentTraceId: job.agentTraceId ?? null,
    reviewReason: job.reviewReason ?? null,
    attemptHistory: job.attemptHistory ?? []
  };
}

const agentRunBudgetDefaults: AgentRunBudget = {
  maxToolSteps: 5,
  maxModelCalls: 6,
  maxWallTimeMs: 90_000,
  maxTotalTokens: 25_000,
  maxConnectorSwitches: 1
};
const agentRunLeaseDurationMs = 120_000;

function normalizeAgentRun(run: AgentRunRecord): AgentRunRecord {
  return {
    ...run,
    leaseOwner: run.leaseOwner ?? null,
    leaseExpiresAt: run.leaseExpiresAt ?? null,
    heartbeatAt: run.heartbeatAt ?? null,
    completedAt: run.completedAt ?? null,
    modelProvider: run.modelProvider ?? null,
    modelName: run.modelName ?? null,
    modelCallsUsed: run.modelCallsUsed ?? 0,
    inputTokensUsed: run.inputTokensUsed ?? 0,
    outputTokensUsed: run.outputTokensUsed ?? 0,
    totalTokensUsed: run.totalTokensUsed ?? 0,
    connectorSwitchCount: run.connectorSwitchCount ?? 0,
    terminalReason: run.terminalReason ?? null,
    finalCandidate: run.finalCandidate ?? null,
    lastError: run.lastError ?? null,
    budget: run.budget ?? agentRunBudgetDefaults
  };
}

function normalizeAgentStep(step: AgentStepRecord): AgentStepRecord {
  return {
    ...step,
    toolName: step.toolName ?? null,
    toolArgs: step.toolArgs ?? null,
    plannerProvider: step.plannerProvider ?? null,
    plannerModel: step.plannerModel ?? null,
    plannerInputTokens: step.plannerInputTokens ?? 0,
    plannerOutputTokens: step.plannerOutputTokens ?? 0,
    result: step.result ?? null,
    completedAt: step.completedAt ?? null
  };
}

function normalizePayerConfigurationRecord(
  config: PayerConfigurationRecord
): PayerConfigurationRecord {
  const hydrated: PayerConfigurationRecord = {
    ...config,
    jurisdiction: config.jurisdiction ?? "us",
    countryCode: config.countryCode ?? (config.jurisdiction === "ca" ? "CA" : "US"),
    escalationThreshold:
      config.escalationThreshold ?? Math.max(0.5, (config.reviewThreshold ?? 0.85) - 0.25),
    defaultSlaHours: config.defaultSlaHours ?? 24,
    autoAssignOwner: config.autoAssignOwner ?? false,
    issues: config.issues ?? []
  };

  if (
    config.escalationThreshold === undefined ||
    config.defaultSlaHours === undefined ||
    config.autoAssignOwner === undefined
  ) {
    hydrated.issues = hydrated.issues.length > 0 ? hydrated.issues : derivePayerConfigurationIssues(hydrated);
    hydrated.status = derivePayerConfigurationStatus(hydrated);
  }

  return hydrated;
}

function toAgentStepHistoryItem(step: AgentStepRecord): AgentStepHistoryItem {
  return {
    stepNumber: step.stepNumber,
    directiveKind: step.directiveKind,
    toolName: step.toolName,
    status: step.status,
    idempotencyKey: step.idempotencyKey,
    publicReason: step.publicReason,
    toolArgs: step.toolArgs,
    plannerUsage:
      step.plannerProvider && step.plannerModel
        ? {
            provider: step.plannerProvider,
            model: step.plannerModel,
            inputTokens: step.plannerInputTokens,
            outputTokens: step.plannerOutputTokens
          }
        : null,
    result: step.result,
    startedAt: step.startedAt,
    completedAt: step.completedAt
  };
}

function buildAgentRunView(run: AgentRunRecord, steps: AgentStepRecord[]): AgentRunView {
  return {
    id: run.id,
    status: run.status,
    protocolVersion: run.protocolVersion,
    leaseOwner: run.leaseOwner,
    leaseExpiresAt: run.leaseExpiresAt,
    heartbeatAt: run.heartbeatAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    modelProvider: run.modelProvider,
    modelName: run.modelName,
    modelCallsUsed: run.modelCallsUsed,
    inputTokensUsed: run.inputTokensUsed,
    outputTokensUsed: run.outputTokensUsed,
    totalTokensUsed: run.totalTokensUsed,
    connectorSwitchCount: run.connectorSwitchCount,
    budget: run.budget,
    terminalReason: run.terminalReason,
    lastError: run.lastError,
    steps: steps.map(toAgentStepHistoryItem)
  };
}

function buildNewAgentRun(job: RetrievalJobRecord, workerName: string): AgentRunRecord {
  const nowIso = new Date().toISOString();

  return {
    id: `run_${job.id}_${randomUUID().slice(0, 8)}`,
    organizationId: job.organizationId,
    retrievalJobId: job.id,
    claimId: job.claimId,
    status: "running",
    protocolVersion: 1,
    leaseOwner: workerName,
    leaseExpiresAt: new Date(Date.now() + agentRunLeaseDurationMs).toISOString(),
    heartbeatAt: nowIso,
    startedAt: nowIso,
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
    budget: agentRunBudgetDefaults,
    lastError: null,
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function auditActorType(role: UserRole): WorkflowActor["type"] {
  return role === "owner" ? "owner" : "human";
}

function auditSourceForRole(role: UserRole) {
  return role === "owner" ? "Owner" : "Human";
}

function generateTemporaryPassword() {
  return randomBytes(12).toString("base64url");
}

async function upsertOrganization(client: PoolClient, id: string, name: string) {
  await client.query(
    `
      INSERT INTO organizations (id, name, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW()
    `,
    [id, name]
  );
}

async function upsertUser(client: PoolClient, user: AppUserRecord) {
  await client.query(
    `
      INSERT INTO users (
        id,
        organization_id,
        email,
        full_name,
        role,
        password_hash,
        is_active,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `,
    [
      user.id,
      user.organizationId,
      user.email,
      user.fullName,
      user.role,
      user.passwordHash,
      user.isActive
    ]
  );
}

async function upsertClaim(client: PoolClient, claim: ClaimRecord) {
  await client.query(
    `
      INSERT INTO claims (
        id,
        organization_id,
        claim_number,
        payer_id,
        updated_at,
        payload
      ) VALUES ($1, $2, $3, $4, NOW(), $5::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        claim_number = EXCLUDED.claim_number,
        payer_id = EXCLUDED.payer_id,
        updated_at = NOW(),
        payload = EXCLUDED.payload
    `,
    [
      claim.id,
      claim.organizationId,
      claim.claimNumber,
      claim.payerId,
      JSON.stringify(claim)
    ]
  );
}

async function upsertQueueItem(client: PoolClient, item: QueueItem) {
  await client.query(
    `
      INSERT INTO queue_items (claim_id, updated_at, payload)
      VALUES ($1, NOW(), $2::jsonb)
      ON CONFLICT (claim_id)
      DO UPDATE SET
        updated_at = NOW(),
        payload = EXCLUDED.payload
    `,
    [item.claimId, JSON.stringify(item)]
  );
}

async function upsertResult(client: PoolClient, result: ResultRecord) {
  await client.query(
    `
      INSERT INTO results (id, claim_id, updated_at, payload)
      VALUES ($1, $2, NOW(), $3::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET
        claim_id = EXCLUDED.claim_id,
        updated_at = NOW(),
        payload = EXCLUDED.payload
    `,
    [result.id, result.claimId, JSON.stringify(result)]
  );
}

async function insertAuditEvent(client: PoolClient, event: AuditEventRecord) {
  await client.query(
    `
      INSERT INTO audit_events (
        id,
        organization_id,
        claim_id,
        result_id,
        occurred_at,
        payload
      )
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6::jsonb)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      event.id,
      event.organizationId ?? (event.claimId ? appConfig.seedOrgId : null),
      event.claimId ?? null,
      event.resultId ?? null,
      event.at,
      JSON.stringify(event)
    ]
  );
}

async function upsertPayerConfiguration(
  client: PoolClient,
  config: PayerConfigurationRecord
) {
  await client.query(
    `
      INSERT INTO payer_configurations (
        id,
        organization_id,
        payer_id,
        updated_at,
        payload
      )
      VALUES ($1, $2, $3, NOW(), $4::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        payer_id = EXCLUDED.payer_id,
        updated_at = NOW(),
        payload = EXCLUDED.payload
    `,
    [config.id, config.organizationId, config.payerId, JSON.stringify(config)]
  );
}

async function upsertRetrievalJob(client: PoolClient, job: RetrievalJobRecord) {
  await client.query(
    `
      INSERT INTO retrieval_jobs (
        id,
        organization_id,
        claim_id,
        status,
        priority,
        attempts,
        max_attempts,
        queued_by,
        reserved_by,
        available_at,
        started_at,
        completed_at,
        last_error,
        created_at,
        updated_at,
        payload
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz,
        $11::timestamptz, $12::timestamptz, $13, $14::timestamptz, $15::timestamptz, $16::jsonb
      )
      ON CONFLICT (id)
      DO UPDATE SET
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        attempts = EXCLUDED.attempts,
        max_attempts = EXCLUDED.max_attempts,
        queued_by = EXCLUDED.queued_by,
        reserved_by = EXCLUDED.reserved_by,
        available_at = EXCLUDED.available_at,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at,
        last_error = EXCLUDED.last_error,
        updated_at = EXCLUDED.updated_at,
        payload = EXCLUDED.payload
    `,
    [
      job.id,
      job.organizationId,
      job.claimId,
      job.status,
      job.priority,
      job.attempts,
      job.maxAttempts,
      job.queuedBy,
      job.reservedBy,
      job.availableAt,
      job.startedAt,
      job.completedAt,
      job.lastError,
      job.createdAt,
      job.updatedAt,
      JSON.stringify(job)
    ]
  );
}

async function upsertAgentRun(client: PoolClient, run: AgentRunRecord) {
  await client.query(
    `
      INSERT INTO agent_runs (
        id,
        organization_id,
        retrieval_job_id,
        claim_id,
        status,
        lease_owner,
        lease_expires_at,
        heartbeat_at,
        started_at,
        completed_at,
        updated_at,
        payload
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz,
        $9::timestamptz, $10::timestamptz, $11::timestamptz, $12::jsonb
      )
      ON CONFLICT (id)
      DO UPDATE SET
        status = EXCLUDED.status,
        lease_owner = EXCLUDED.lease_owner,
        lease_expires_at = EXCLUDED.lease_expires_at,
        heartbeat_at = EXCLUDED.heartbeat_at,
        completed_at = EXCLUDED.completed_at,
        updated_at = EXCLUDED.updated_at,
        payload = EXCLUDED.payload
    `,
    [
      run.id,
      run.organizationId,
      run.retrievalJobId,
      run.claimId,
      run.status,
      run.leaseOwner,
      run.leaseExpiresAt,
      run.heartbeatAt,
      run.startedAt,
      run.completedAt,
      run.updatedAt,
      JSON.stringify(run)
    ]
  );
}

async function upsertAgentStep(client: PoolClient, step: AgentStepRecord) {
  await client.query(
    `
      INSERT INTO agent_steps (
        id,
        agent_run_id,
        step_number,
        directive_kind,
        tool_name,
        status,
        idempotency_key,
        started_at,
        completed_at,
        payload
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10::jsonb
      )
      ON CONFLICT (id)
      DO UPDATE SET
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        payload = EXCLUDED.payload
    `,
    [
      step.id,
      step.agentRunId,
      step.stepNumber,
      step.directiveKind,
      step.toolName,
      step.status,
      step.idempotencyKey,
      step.startedAt,
      step.completedAt,
      JSON.stringify(step)
    ]
  );
}

async function syncEvidenceArtifacts(
  client: PoolClient,
  claim: ClaimRecord,
  resultId: string | null
) {
  await client.query("DELETE FROM evidence_artifacts WHERE claim_id = $1", [claim.id]);

  for (const artifact of claim.evidence) {
    const storageKey = artifact.url.replace(/^s3:\/\//, "");

    await client.query(
      `
        INSERT INTO evidence_artifacts (
          id,
          organization_id,
          claim_id,
          result_id,
          kind,
          label,
          storage_key,
          external_url,
          created_at,
          payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::jsonb)
        ON CONFLICT (id)
        DO UPDATE SET
          result_id = EXCLUDED.result_id,
          kind = EXCLUDED.kind,
          label = EXCLUDED.label,
          storage_key = EXCLUDED.storage_key,
          external_url = EXCLUDED.external_url,
          created_at = EXCLUDED.created_at,
          payload = EXCLUDED.payload
      `,
      [
        artifact.id,
        claim.organizationId,
        claim.id,
        resultId,
        artifact.kind,
        artifact.label,
        artifact.storageKey ?? storageKey,
        artifact.url,
        artifact.createdAt,
        JSON.stringify(artifact)
      ]
    );
  }
}

async function persistEvidenceArtifacts(claimId: string, artifacts: EvidenceArtifact[]) {
  const storedArtifacts: EvidenceArtifact[] = [];

  for (const artifact of artifacts) {
    storedArtifacts.push(await persistEvidenceArtifact(claimId, artifact));
  }

  return storedArtifacts;
}

async function createSession(
  client: PoolClient,
  session: UserSession
) {
  await client.query(
    `
      INSERT INTO user_sessions (id, user_id, organization_id, expires_at)
      VALUES ($1, $2, $3, $4::timestamptz)
    `,
    [session.id, session.userId, session.organizationId, session.expiresAt]
  );
}

function createSeedUsers() {
  return [
    {
      id: "user_owner",
      organizationId: appConfig.seedOrgId,
      email: appConfig.seedOwnerEmail,
      fullName: appConfig.seedOwnerName,
      role: "owner",
      passwordHash: "",
      isActive: true
    },
    {
      id: "user_manager",
      organizationId: appConfig.seedOrgId,
      email: appConfig.seedManagerEmail,
      fullName: appConfig.seedManagerName,
      role: "manager",
      passwordHash: "",
      isActive: true
    },
    {
      id: "user_operator",
      organizationId: appConfig.seedOrgId,
      email: appConfig.seedOperatorEmail,
      fullName: appConfig.seedOperatorName,
      role: "operator",
      passwordHash: "",
      isActive: true
    }
  ] satisfies Array<Omit<AppUserRecord, "passwordHash"> & { passwordHash: string }>;
}

function passwordForSeedRole(role: UserRole) {
  if (role === "owner") {
    return appConfig.seedOwnerPassword;
  }

  if (role === "manager") {
    return appConfig.seedManagerPassword;
  }

  return appConfig.seedOperatorPassword;
}

async function loadClaims() {
  await initializeStore();
  const result = await getPool().query<{ payload: ClaimRecord }>(
    "SELECT payload FROM claims ORDER BY claim_number"
  );

  return result.rows.map(parsePayloadRow).map(normalizeClaimRecord);
}

async function loadQueue() {
  await initializeStore();
  const result = await getPool().query<{ payload: QueueItem }>(
    "SELECT payload FROM queue_items ORDER BY claim_id"
  );

  return result.rows.map(parsePayloadRow);
}

async function loadResults() {
  await initializeStore();
  const result = await getPool().query<{ payload: ResultRecord }>(
    "SELECT payload FROM results ORDER BY id"
  );

  return result.rows.map(parsePayloadRow).map(normalizeResultRecord);
}

async function loadAuditEvents() {
  await initializeStore();
  const result = await getPool().query<{ payload: AuditEventRecord }>(
    "SELECT payload FROM audit_events ORDER BY occurred_at DESC"
  );

  return result.rows.map(parsePayloadRow);
}

async function loadEvidenceArtifactById(artifactId: string, organizationId: string) {
  await initializeStore();
  const result = await getPool().query<{
    id: string;
    organization_id: string;
    claim_id: string;
    storage_key: string;
    external_url: string;
    payload: EvidenceArtifact;
  }>(
    `
      SELECT id, organization_id, claim_id, storage_key, external_url, payload
      FROM evidence_artifacts
      WHERE id = $1
        AND organization_id = $2
    `,
    [artifactId, organizationId]
  );

  return result.rows[0] ?? null;
}

async function loadClaimById(claimId: string) {
  await initializeStore();
  const result = await getPool().query<{ payload: ClaimRecord }>(
    "SELECT payload FROM claims WHERE id = $1",
    [claimId]
  );

  return result.rows[0]?.payload ? normalizeClaimRecord(result.rows[0].payload) : undefined;
}

async function loadClaimByIdForOrganization(claimId: string, organizationId: string) {
  await initializeStore();
  const result = await getPool().query<{ payload: ClaimRecord }>(
    `
      SELECT payload
      FROM claims
      WHERE id = $1
        AND organization_id = $2
      LIMIT 1
    `,
    [claimId, organizationId]
  );

  return result.rows[0]?.payload ? normalizeClaimRecord(result.rows[0].payload) : undefined;
}

async function loadClaimByOrganizationAndClaimNumber(
  organizationId: string,
  claimNumber: string,
  client?: PoolClient
) {
  await initializeStore();
  const result = await getDbExecutor(client).query<{ payload: ClaimRecord }>(
    `
      SELECT payload
      FROM claims
      WHERE organization_id = $1
        AND claim_number = $2
      LIMIT 1
    `,
    [organizationId, claimNumber]
  );

  return result.rows[0]?.payload ? normalizeClaimRecord(result.rows[0].payload) : undefined;
}

async function loadQueueByClaimId(claimId: string, client?: PoolClient) {
  const result = await getDbExecutor(client).query<{ payload: QueueItem }>(
    "SELECT payload FROM queue_items WHERE claim_id = $1",
    [claimId]
  );

  return result.rows[0]?.payload;
}

async function loadResultByClaimId(claimId: string) {
  const result = await getPool().query<{ payload: ResultRecord }>(
    "SELECT payload FROM results WHERE claim_id = $1",
    [claimId]
  );

  return result.rows[0]?.payload;
}

type UserRow = {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: string;
  password_hash: string;
  is_active: boolean;
};

function toUserRecord(row: UserRow): AppUserRecord | null {
  const role = normalizeUserRole(row.role);

  if (!role) {
    return null;
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    fullName: row.full_name,
    role,
    passwordHash: row.password_hash,
    isActive: row.is_active
  };
}

async function loadUsersInternal(client?: PoolClient) {
  const result = await getDbExecutor(client).query<UserRow>(
    `
      SELECT id, organization_id, email, full_name, role, password_hash, is_active
      FROM users
      ORDER BY full_name
    `
  );

  return result.rows.flatMap((row) => {
    const user = toUserRecord(row);
    return user ? [user] : [];
  });
}

async function loadUsers() {
  await initializeStore();
  return loadUsersInternal();
}

async function loadOrganizationById(organizationId: string) {
  await initializeStore();
  const result = await getPool().query<{ id: string; name: string }>(
    "SELECT id, name FROM organizations WHERE id = $1 LIMIT 1",
    [organizationId]
  );

  return result.rows[0] ?? null;
}

async function loadUsersByOrganizationInternal(organizationId: string, client?: PoolClient) {
  const result = await getDbExecutor(client).query<UserRow>(
    `
      SELECT id, organization_id, email, full_name, role, password_hash, is_active
      FROM users
      WHERE organization_id = $1
      ORDER BY full_name
    `,
    [organizationId]
  );

  return result.rows.flatMap((row) => {
    const user = toUserRecord(row);
    return user ? [user] : [];
  });
}

async function loadUsersByOrganization(organizationId: string) {
  await initializeStore();
  return loadUsersByOrganizationInternal(organizationId);
}

async function loadUserById(userId: string, client?: PoolClient) {
  await initializeStore();
  const result = await getDbExecutor(client).query<{
    id: string;
    organization_id: string;
    email: string;
    full_name: string;
    role: string;
    password_hash: string;
    is_active: boolean;
  }>(
    `
      SELECT id, organization_id, email, full_name, role, password_hash, is_active
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const role = normalizeUserRole(row.role);

  if (!role) {
    return null;
  }

  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    fullName: row.full_name,
    role,
    passwordHash: row.password_hash,
    isActive: row.is_active
  } satisfies AppUserRecord;
}

async function loadAuditEventsByOrganization(organizationId: string) {
  await initializeStore();
  const result = await getPool().query<{ payload: AuditEventRecord }>(
    `
      SELECT payload
      FROM audit_events
      WHERE organization_id = $1
      ORDER BY occurred_at DESC
    `,
    [organizationId]
  );

  return result.rows.map(parsePayloadRow);
}

async function revokeSessionsByUserId(userId: string, client: PoolClient) {
  await client.query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    [userId]
  );
}

async function loadSessionById(sessionId: string) {
  await initializeStore();
  const result = await getPool().query<{
    id: string;
    user_id: string;
    organization_id: string;
    expires_at: string;
    revoked_at: string | null;
  }>(
    `
      SELECT id, user_id, organization_id, expires_at::text, revoked_at::text
      FROM user_sessions
      WHERE id = $1
    `,
    [sessionId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at
  };
}

async function loadPayerConfigurations() {
  await initializeStore();
  const result = await getPool().query<{ payload: PayerConfigurationRecord }>(
    "SELECT payload FROM payer_configurations ORDER BY payer_id"
  );

  return result.rows.map(parsePayloadRow).map(normalizePayerConfigurationRecord);
}

function toUserSummary(user: AppUserRecord): UserSummaryView {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  };
}

async function loadLatestQueueSyncAt(organizationId: string) {
  await initializeStore();
  const queueResult = await getPool().query<{ updated_at: string | null }>(
    `
      SELECT MAX(queue_items.updated_at)::text AS updated_at
      FROM queue_items
      INNER JOIN claims ON claims.id = queue_items.claim_id
      WHERE claims.organization_id = $1
    `,
    [organizationId]
  );

  if (queueResult.rows[0]?.updated_at) {
    return queueResult.rows[0].updated_at;
  }

  const claimResult = await getPool().query<{ updated_at: string | null }>(
    `
      SELECT MAX(updated_at)::text AS updated_at
      FROM claims
      WHERE organization_id = $1
    `,
    [organizationId]
  );

  return claimResult.rows[0]?.updated_at ?? null;
}

async function loadPayerConfigurationsByOrganizationInternal(
  organizationId: string,
  client?: PoolClient
) {
  const result = await getDbExecutor(client).query<{ payload: PayerConfigurationRecord }>(
    `
      SELECT payload
      FROM payer_configurations
      WHERE organization_id = $1
      ORDER BY payer_id
    `,
    [organizationId]
  );

  return result.rows.map(parsePayloadRow).map(normalizePayerConfigurationRecord);
}

async function loadClaimsByOrganization(organizationId: string, client?: PoolClient) {
  await initializeStore();
  const result = await getDbExecutor(client).query<{ payload: ClaimRecord }>(
    `
      SELECT payload
      FROM claims
      WHERE organization_id = $1
      ORDER BY claim_number
    `,
    [organizationId]
  );

  return result.rows.map(parsePayloadRow).map(normalizeClaimRecord);
}

async function loadPayerConfigurationsByOrganization(organizationId: string, client?: PoolClient) {
  await initializeStore();
  return loadPayerConfigurationsByOrganizationInternal(organizationId, client);
}

async function loadPayerConfigurationByOrganizationAndPayerId(
  organizationId: string,
  payerId: string,
  client?: PoolClient
) {
  await initializeStore();
  const result = await getDbExecutor(client).query<{ payload: PayerConfigurationRecord }>(
    `
      SELECT payload
      FROM payer_configurations
      WHERE organization_id = $1
        AND payer_id = $2
      LIMIT 1
    `,
    [organizationId, payerId]
  );

  return result.rows[0]?.payload ? normalizePayerConfigurationRecord(result.rows[0].payload) : null;
}

async function loadRetrievalJobs() {
  await initializeStore();
  const result = await getPool().query<{ payload: RetrievalJobRecord }>(
    "SELECT payload FROM retrieval_jobs ORDER BY created_at DESC"
  );

  return result.rows.map(parsePayloadRow).map(normalizeRetrievalJob);
}

async function loadAgentStepsByRunId(agentRunId: string, client?: PoolClient) {
  await initializeStore();
  const result = await getDbExecutor(client).query<{ payload: AgentStepRecord }>(
    `
      SELECT payload
      FROM agent_steps
      WHERE agent_run_id = $1
      ORDER BY step_number ASC
    `,
    [agentRunId]
  );

  return result.rows.map(parsePayloadRow).map(normalizeAgentStep);
}

async function loadLatestActiveAgentRunByJobId(
  retrievalJobId: string,
  client?: PoolClient
) {
  await initializeStore();
  const result = await getDbExecutor(client).query<{ payload: AgentRunRecord }>(
    `
      SELECT payload
      FROM agent_runs
      WHERE retrieval_job_id = $1
        AND status = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [retrievalJobId]
  );

  return result.rows[0]?.payload ? normalizeAgentRun(result.rows[0].payload) : null;
}

async function loadLatestAgentRunByJobId(
  retrievalJobId: string,
  client?: PoolClient
) {
  await initializeStore();
  const result = await getDbExecutor(client).query<{ payload: AgentRunRecord }>(
    `
      SELECT payload
      FROM agent_runs
      WHERE retrieval_job_id = $1
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [retrievalJobId]
  );

  return result.rows[0]?.payload ? normalizeAgentRun(result.rows[0].payload) : null;
}

async function loadAgentRunById(runId: string, client?: PoolClient) {
  await initializeStore();
  const result = await getDbExecutor(client).query<{ payload: AgentRunRecord }>(
    "SELECT payload FROM agent_runs WHERE id = $1 LIMIT 1",
    [runId]
  );

  return result.rows[0]?.payload ? normalizeAgentRun(result.rows[0].payload) : null;
}

function ensureActor(actor: WorkflowActor) {
  return {
    ...actor,
    type: actor.role === "owner" ? "owner" : actor.type
  };
}

export async function initializeStore() {
  if (initialized) {
    return;
  }

  await runMigrations(appConfig.migrationTable);

  const pool = getPool();
  const existingClaims = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM claims"
  );
  const existingUsers = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM users"
  );
  const existingConfigs = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM payer_configurations"
  );

  if (
    existingClaims.rows[0]?.count === "0" ||
    existingUsers.rows[0]?.count === "0" ||
    existingConfigs.rows[0]?.count === "0"
  ) {
    const seed = createSeedState();
    const seedUsers = createSeedUsers().map((user) => ({
      ...user,
      passwordHash: hashPassword(passwordForSeedRole(user.role))
    }));
    const payerConfigurations = createSeedPayerConfigurations(appConfig.seedOrgId);

    await withTransaction(async (client) => {
      await upsertOrganization(client, appConfig.seedOrgId, appConfig.seedOrgName);

      if (existingUsers.rows[0]?.count === "0") {
        for (const user of seedUsers) {
          await upsertUser(client, user);
        }
      }

      if (existingClaims.rows[0]?.count === "0") {
        for (const claim of seed.claims) {
          await upsertClaim(client, claim);
        }

        for (const item of seed.queue) {
          await upsertQueueItem(client, item);
        }

        for (const result of seed.results) {
          await upsertResult(client, result);
        }

        for (const claim of seed.claims) {
          const existingResult = seed.results.find((result) => result.claimId === claim.id);
          await syncEvidenceArtifacts(client, claim, existingResult?.id ?? null);
        }

        for (const event of seed.auditEvents) {
          await insertAuditEvent(client, event);
        }
      }

      if (existingConfigs.rows[0]?.count === "0") {
        for (const config of payerConfigurations) {
          await upsertPayerConfiguration(client, config);
        }
      }
    });
  }

  await withTransaction(async (client) => {
    const seedOrganization = await client.query<{ id: string }>(
      "SELECT id FROM organizations WHERE id = $1 LIMIT 1",
      [appConfig.seedOrgId]
    );

    if (seedOrganization.rowCount === 0) {
      return;
    }

    const desiredSeedUsers = createSeedUsers().map((user) => ({
      ...user,
      passwordHash: hashPassword(passwordForSeedRole(user.role))
    }));
    const existingSeedUsers = await loadUsersByOrganizationInternal(
      appConfig.seedOrgId,
      client
    );
    const seedConfigs = createSeedPayerConfigurations(appConfig.seedOrgId);
    const existingSeedConfigs = await loadPayerConfigurationsByOrganizationInternal(
      appConfig.seedOrgId,
      client
    );
    const missingSeedConfigs = findMissingSeedPayerConfigurations(
      existingSeedConfigs,
      seedConfigs
    );

    for (const config of missingSeedConfigs) {
      await upsertPayerConfiguration(client, config);
    }

    const activeOwner =
      existingSeedUsers.find((user) => user.isActive && user.role === "owner") ?? null;
    const ownerSeed = desiredSeedUsers.find((user) => user.role === "owner");

    if (ownerSeed) {
      if (activeOwner) {
        await upsertUser(client, {
          ...activeOwner,
          email: ownerSeed.email,
          fullName: ownerSeed.fullName,
          passwordHash: ownerSeed.passwordHash,
          isActive: true
        });
      } else {
        await upsertUser(client, ownerSeed);
      }
    }

    for (const seedUser of desiredSeedUsers.filter((user) => user.role !== "owner")) {
      const existingUser =
        existingSeedUsers.find((user) => user.id === seedUser.id) ??
        existingSeedUsers.find(
          (user) => user.email.toLowerCase() === seedUser.email.toLowerCase()
        );

      if (existingUser) {
        await upsertUser(client, {
          ...existingUser,
          email: seedUser.email,
          fullName: seedUser.fullName,
          role: seedUser.role,
          passwordHash: seedUser.passwordHash,
          isActive: true
        });
      } else {
        await upsertUser(client, seedUser);
      }
    }
  });

  initialized = true;
}

export async function listClaims(organizationId?: string): Promise<ClaimSummary[]> {
  const claims = organizationId
    ? await loadClaimsByOrganization(organizationId)
    : await loadClaims();
  return claims.map(toClaimSummary);
}

export async function listClaimsList(
  organizationId?: string
): Promise<ClaimsListItemView[]> {
  const [claims, queue] = await Promise.all([
    organizationId ? loadClaimsByOrganization(organizationId) : loadClaims(),
    loadQueue()
  ]);
  const claimIds = new Set(claims.map((claim) => claim.id));
  return buildClaimsList(
    claims,
    queue.filter((item) => claimIds.has(item.claimId))
  );
}

export async function listQueue(organizationId?: string): Promise<QueueItem[]> {
  const [claims, queue] = await Promise.all([
    organizationId ? loadClaimsByOrganization(organizationId) : loadClaims(),
    loadQueue()
  ]);
  const claimIds = new Set(claims.map((claim) => claim.id));
  return queue.filter((item) => claimIds.has(item.claimId));
}

export async function getClaimDetail(
  claimId: string,
  organizationId?: string
): Promise<ClaimDetail | undefined> {
  const claim = organizationId
    ? await loadClaimByIdForOrganization(claimId, organizationId)
    : await loadClaimById(claimId);
  return claim ? toClaimDetail(claim) : undefined;
}

export async function listPilotQueueItems(
  organizationId?: string
): Promise<PilotQueueItem[]> {
  const [claims, queue] = await Promise.all([
    organizationId ? loadClaimsByOrganization(organizationId) : loadClaims(),
    loadQueue()
  ]);
  const claimIds = new Set(claims.map((claim) => claim.id));
  const visibleQueue = queue.filter((item) => claimIds.has(item.claimId));
  return buildPilotQueueItems(claims, visibleQueue);
}

export async function getPilotClaimDetail(
  claimId: string,
  organizationId?: string
): Promise<PilotClaimDetail | null> {
  const [claims, results, auditEvents, jobs, queue] = await Promise.all([
    organizationId ? loadClaimsByOrganization(organizationId) : loadClaims(),
    loadResults(),
    organizationId ? loadAuditEventsByOrganization(organizationId) : loadAuditEvents(),
    loadRetrievalJobs(),
    loadQueue()
  ]);
  const claimIds = new Set(claims.map((claim) => claim.id));
  const visibleQueue = queue.filter((item) => claimIds.has(item.claimId));
  const visibleResults = results.filter((result) => claimIds.has(result.claimId));
  const visibleJobs = jobs.filter((job) => claimIds.has(job.claimId));

  const detail = buildPilotClaimDetail(
    claimId,
    claims,
    visibleResults,
    auditEvents,
    visibleQueue
  );

  if (!detail) {
    return null;
  }

  const activeJob = visibleJobs.find(
    (job) =>
      job.claimId === claimId &&
      (job.status === "queued" ||
        job.status === "processing" ||
        job.status === "retrying" ||
        job.status === "failed")
  );
  const activeRun = activeJob ? await loadLatestAgentRunByJobId(activeJob.id) : null;

  return {
    ...detail,
    activeRetrievalJob: activeJob
      ? {
          id: activeJob.id,
          agentRunId: activeRun?.id ?? null,
          status: activeJob.status,
          attempts: activeJob.attempts,
          lastError: activeJob.lastError,
          updatedAt: activeJob.updatedAt,
          connectorName: activeJob.connectorName,
          traceId: activeJob.agentTraceId,
          failureCategory: activeJob.failureCategory,
          retryable: activeJob.retryable,
          reviewReason: activeJob.reviewReason,
          nextAttemptAt: activeJob.availableAt,
          history: activeJob.attemptHistory
        }
      : null
  } as PilotClaimDetail;
}

export async function listResultSummaries(
  organizationId?: string
): Promise<ResultSummaryView[]> {
  const [claims, results] = await Promise.all([
    organizationId ? loadClaimsByOrganization(organizationId) : loadClaims(),
    loadResults()
  ]);
  const claimIds = new Set(claims.map((claim) => claim.id));
  return buildResultSummaries(
    claims,
    results.filter((result) => claimIds.has(result.claimId))
  );
}

export async function getResultDetail(
  resultId: string,
  organizationId?: string
): Promise<ResultDetailView | null> {
  const [claims, results] = await Promise.all([
    organizationId ? loadClaimsByOrganization(organizationId) : loadClaims(),
    loadResults()
  ]);
  const claimIds = new Set(claims.map((claim) => claim.id));
  return buildResultDetail(
    resultId,
    claims,
    results.filter((result) => claimIds.has(result.claimId))
  );
}

export async function getEvidenceArtifactContent(
  artifactId: string,
  organizationId: string,
  actor?: WorkflowActor
) {
  const artifact = await loadEvidenceArtifactById(artifactId, organizationId);

  if (!artifact?.storage_key) {
    return null;
  }

  let body: Buffer;

  try {
    body = await readStoredEvidence(artifact.storage_key);
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException | undefined)?.code;

    if (error instanceof InvalidEvidenceStoragePathError || errorCode === "ENOENT") {
      return null;
    }

    throw error;
  }

  if (actor) {
    await withTransaction(async (client) => {
      await insertAuditEvent(client, {
        id: `AUD-${Date.now()}`,
        at: new Date().toISOString(),
        organizationId,
        actor: {
          name: actor.name,
          type: auditActorType(actor.role),
          avatar: initials(actor.name)
        },
        eventType: "evidence.downloaded",
        userId: actor.id,
        action: "Downloaded Evidence",
        object: "Evidence",
        objectId: artifactId,
        source: auditSourceForRole(actor.role),
        payer: "Evidence Artifact",
        summary: `${actor.name} downloaded evidence artifact ${artifact.payload.label}.`,
        sensitivity: "high-risk",
        category: "Evidence Access",
        outcome: "success",
        detail: {
          claimId: artifact.claim_id,
          fileName: path.basename(artifact.storage_key)
        },
        claimId: artifact.claim_id
      });
    });
  }

  return {
    body,
    mimeType:
      artifact.payload.mimeType ??
      (artifact.payload.kind === "raw_html"
        ? "text/html; charset=utf-8"
        : artifact.payload.kind === "screenshot"
          ? "image/svg+xml"
          : "text/plain; charset=utf-8"),
    fileName: path.basename(artifact.storage_key)
  };
}

export async function listAuditEvents(
  organizationId?: string
): Promise<AuditEventView[]> {
  const auditEvents = organizationId
    ? await loadAuditEventsByOrganization(organizationId)
    : await loadAuditEvents();
  return buildAuditLog(auditEvents);
}

export async function listPayerConfigurations(organizationId?: string) {
  if (organizationId) {
    return loadPayerConfigurationsByOrganization(organizationId);
  }

  return loadPayerConfigurations();
}

export async function listUsersByOrganization(
  organizationId: string
): Promise<UserSummaryView[]> {
  const users = await loadUsersByOrganization(organizationId);
  return users.map(toUserSummary);
}

export async function inviteUserToOrganization(
  actor: WorkflowActor,
  input: {
    email: string;
    fullName: string;
    role: UserRole;
    temporaryPassword?: string | null;
  }
): Promise<InvitedUserView> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!email || !fullName) {
    throw new Error("Email and full name are required.");
  }

  if (input.role === "owner") {
    throw new Error("Owner invites are not supported in the pilot workflow.");
  }

  const existingUsers = await loadUsers();
  const existingUser = existingUsers.find(
    (user) => user.email.toLowerCase() === email
  );

  if (existingUser?.organizationId && existingUser.organizationId !== actor.organizationId) {
    throw new Error("That email already belongs to another organization.");
  }

  if (existingUser?.isActive) {
    throw new Error("That user already has workspace access.");
  }

  const temporaryPassword =
    input.temporaryPassword?.trim() || generateTemporaryPassword();
  const user: AppUserRecord = {
    id: existingUser?.id ?? `user_${randomUUID().slice(0, 10)}`,
    organizationId: actor.organizationId,
    email,
    fullName,
    role: input.role,
    passwordHash: hashPassword(temporaryPassword),
    isActive: true
  };
  const nowIso = new Date().toISOString();

  await withTransaction(async (client) => {
    await upsertUser(client, user);
    await revokeSessionsByUserId(user.id, client);
    await insertAuditEvent(client, {
      id: `AUD-${Date.now()}`,
      at: nowIso,
      organizationId: actor.organizationId,
      actor: {
        name: actor.name,
        type: auditActorType(actor.role),
        avatar: initials(actor.name)
      },
      eventType: "user.invited",
      userId: actor.id,
      action: "Invited User",
      object: "User",
      objectId: user.id,
      source: auditSourceForRole(actor.role),
      payer: "All Payers",
      summary: `${actor.name} invited ${user.fullName} as ${user.role}.`,
      sensitivity: "high-risk",
      category: "Access Control",
      outcome: "success",
      detail: {
        invitedRole: user.role,
        invitedEmail: user.email
      },
      reason: "Workspace access granted by owner."
    });
  });

  return {
    user: toUserSummary(user),
    temporaryPassword
  };
}

export async function removeUserFromOrganization(
  actor: WorkflowActor,
  userId: string
): Promise<UserSummaryView> {
  if (actor.id === userId) {
    throw new Error("Owners cannot remove themselves.");
  }

  const existingUser = await loadUserById(userId);

  if (!existingUser || existingUser.organizationId !== actor.organizationId) {
    throw new Error("User not found.");
  }

  const organizationUsers = await loadUsersByOrganization(actor.organizationId);
  const activeOwners = organizationUsers.filter(
    (user) => user.isActive && user.role === "owner"
  );

  if (existingUser.role === "owner" && activeOwners.length <= 1) {
    throw new Error("Each organization must retain one active owner.");
  }

  const deactivatedUser: AppUserRecord = {
    ...existingUser,
    isActive: false
  };
  const nowIso = new Date().toISOString();

  await withTransaction(async (client) => {
    await upsertUser(client, deactivatedUser);
    await revokeSessionsByUserId(existingUser.id, client);
    await insertAuditEvent(client, {
      id: `AUD-${Date.now()}`,
      at: nowIso,
      organizationId: actor.organizationId,
      actor: {
        name: actor.name,
        type: auditActorType(actor.role),
        avatar: initials(actor.name)
      },
      eventType: "user.removed",
      userId: actor.id,
      action: "Removed User",
      object: "User",
      objectId: existingUser.id,
      source: auditSourceForRole(actor.role),
      payer: "All Payers",
      summary: `${actor.name} removed ${existingUser.fullName} from the workspace.`,
      sensitivity: "high-risk",
      category: "Access Control",
      outcome: "success",
      detail: {
        removedRole: existingUser.role,
        removedEmail: existingUser.email
      },
      reason: "Workspace access revoked by owner."
    });
  });

  return toUserSummary(deactivatedUser);
}

export async function getAccountSummary(
  organizationId: string
): Promise<AccountSummaryView | null> {
  const organization = await loadOrganizationById(organizationId);

  if (!organization) {
    return null;
  }

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    billingMode: "pilot_managed"
  };
}

export async function getStatusSummary(
  organizationId: string
): Promise<StatusSummaryView> {
  const [auditEvents, claims, lastQueueSyncAt] = await Promise.all([
    loadAuditEventsByOrganization(organizationId),
    loadClaimsByOrganization(organizationId),
    loadLatestQueueSyncAt(organizationId)
  ]);

  const lastImportEvent = auditEvents.find((event) => event.eventType === "import.commit");
  const failedActionsLast24h = auditEvents.filter((event) => {
    if (event.outcome !== "failure") {
      return false;
    }

    return Date.now() - new Date(event.at).getTime() <= 24 * 60 * 60 * 1000;
  }).length;
  const importRowCount =
    typeof lastImportEvent?.detail?.rowCount === "number"
      ? lastImportEvent.detail.rowCount
      : typeof lastImportEvent?.detail?.rowsCreated === "number"
        ? lastImportEvent.detail.rowsCreated
        : null;

  return {
    lastImportAt: lastImportEvent?.at ?? null,
    lastImportOutcome: lastImportEvent?.outcome ?? null,
    lastImportRowCount: importRowCount,
    lastQueueSyncAt,
    failedActionsLast24h,
    openClaimsCount: claims.filter((claim) => claim.status !== "resolved").length
  };
}

export async function getPerformanceMetrics(
  organizationId?: string
): Promise<PerformanceMetricsView> {
  const [claims, queue, results, jobs] = await Promise.all([
    organizationId ? loadClaimsByOrganization(organizationId) : loadClaims(),
    loadQueue(),
    loadResults(),
    loadRetrievalJobs()
  ]);
  const claimIds = new Set(claims.map((claim) => claim.id));
  return buildPerformanceMetrics({
    claims,
    queue: queue.filter((item) => claimIds.has(item.claimId)),
    results: results.filter((result) => claimIds.has(result.claimId)),
    jobs: jobs.filter((job) => claimIds.has(job.claimId))
  });
}

export async function previewResultsExport(actor: WorkflowActor) {
  const [claims, results] = await Promise.all([
    loadClaimsByOrganization(actor.organizationId),
    loadResults()
  ]);
  const claimMap = new Map(claims.map((claim) => [claim.id, claim] as const));
  const exportableResults = results.filter((result) => claimMap.has(result.claimId));
  const exportedAt = new Date().toISOString();

  return {
    fileName: `tenio-results-export-${exportedAt.slice(0, 10)}.csv`,
    body: buildResultsExportCsv({
      claims,
      results: exportableResults,
      exportState: "Not Exported"
    })
  };
}

export async function exportResults(actor: WorkflowActor) {
  const [claims, results] = await Promise.all([
    loadClaimsByOrganization(actor.organizationId),
    loadResults()
  ]);
  const claimMap = new Map(claims.map((claim) => [claim.id, claim] as const));
  const exportableResults = results.filter((result) => claimMap.has(result.claimId));
  const exportedAt = new Date().toISOString();

  await withTransaction(async (client) => {
    for (const result of exportableResults) {
      await upsertResult(client, {
        ...result,
        exportState: "Exported"
      });
    }

    await insertAuditEvent(client, {
      id: `AUD-${Date.now()}`,
      at: exportedAt,
      organizationId: actor.organizationId,
      actor: {
        name: actor.name,
        type: auditActorType(actor.role),
        avatar: initials(actor.name)
      },
      eventType: "export.requested",
      userId: actor.id,
      action: "Exported",
      object: "Result",
      objectId: `export_${Date.now()}`,
      source: auditSourceForRole(actor.role),
      payer: "Mixed",
      summary: `${actor.name} exported ${exportableResults.length} structured results for downstream delivery.`,
      sensitivity: "normal",
      category: "Result Export",
      outcome: "success",
      detail: {
        rowCount: exportableResults.length,
        exportedAt
      },
      reason: "Batch export requested from the results workspace."
    });
  });

  return {
    fileName: `tenio-results-export-${exportedAt.slice(0, 10)}.csv`,
    body: buildResultsExportCsv({
      claims,
      results: exportableResults,
      exportState: "Exported"
    })
  };
}

export async function authenticateUser(email: string, password: string) {
  await initializeStore();
  const users = await loadUsers();
  const user = users.find(
    (candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.isActive
  );

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }

  const organization = await loadOrganizationById(user.organizationId);

  const session: UserSession = {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: user.id,
    organizationId: user.organizationId,
    organizationName: organization?.name,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    expiresAt: new Date(
      Date.now() + appConfig.sessionTtlHours * 60 * 60 * 1000
    ).toISOString()
  };

  await withTransaction(async (client) => {
    await createSession(client, session);
    await insertAuditEvent(client, {
      id: `AUD-${Date.now()}`,
      at: new Date().toISOString(),
      organizationId: user.organizationId,
      actor: {
        name: user.fullName,
        type: auditActorType(user.role),
        avatar: initials(user.fullName)
      },
      eventType: "session.signed_in",
      userId: user.id,
      action: "Signed In",
      object: "Configuration",
      objectId: session.id,
      source: auditSourceForRole(user.role),
      payer: "All Payers",
      summary: `${user.fullName} signed in to the Tenio workspace.`,
      sensitivity: "high-risk",
      category: "Access Control",
      outcome: "success",
      detail: {
        sessionId: session.id,
        email: user.email
      },
      reason: "Authenticated user session created."
    });
  });

  return session;
}

export async function getValidatedSession(sessionId: string) {
  const [session, users] = await Promise.all([loadSessionById(sessionId), loadUsers()]);

  if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const user = users.find((candidate) => candidate.id === session.userId && candidate.isActive);

  if (!user) {
    return null;
  }

  return {
    id: session.id,
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    expiresAt: session.expiresAt
  } satisfies UserSession;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeIntakePriority(priority: Priority | undefined) {
  return priority ?? "normal";
}

function normalizeIntakeSlaAt(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeIntakeJurisdiction(
  value: Jurisdiction | null | undefined,
  fallback?: Jurisdiction | null
): Jurisdiction {
  return value ?? fallback ?? "us";
}

function deriveCountryCodeFromJurisdiction(jurisdiction: Jurisdiction): CountryCode {
  return jurisdiction === "ca" ? "CA" : "US";
}

function normalizeIntakeCountryCode(
  value: CountryCode | null | undefined,
  jurisdiction: Jurisdiction,
  fallback?: CountryCode | null
): CountryCode {
  const candidate = value ?? fallback;

  if (
    candidate &&
    ((jurisdiction === "ca" && candidate === "CA") ||
      (jurisdiction === "us" && candidate === "US"))
  ) {
    return candidate;
  }

  return deriveCountryCodeFromJurisdiction(jurisdiction);
}

function normalizeProvinceOfService(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value)?.toUpperCase();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 3);
}

function normalizeServiceDate(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function normalizeBilledAmountCents(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number.isFinite(value) ? Math.round(value) : null;
}

function deriveDefaultSlaAt(defaultSlaHours: number | undefined) {
  const safeHours = Math.max(1, Math.round(defaultSlaHours ?? 24));
  return new Date(Date.now() + safeHours * 60 * 60 * 1000).toISOString();
}

function buildClaimId(claimNumber: string) {
  return claimNumber.startsWith("CLM-")
    ? claimNumber
    : `CLM-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function escapeCsvCell(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function buildResultsExportCsv(params: {
  claims: ClaimRecord[];
  results: ResultRecord[];
  exportState: ResultRecord["exportState"];
}) {
  const { claims, results, exportState } = params;
  const claimMap = new Map(claims.map((claim) => [claim.id, claim] as const));

  return [
    [
      "resultId",
      "claimId",
      "claimNumber",
      "payerName",
      "patientName",
      "verifiedStatus",
      "confidence",
      "lastVerifiedAt",
      "exportState",
      "nextAction",
      "connectorName",
      "executionMode",
      "agentTraceId"
    ].join(","),
    ...results.map((result) => {
      const claim = claimMap.get(result.claimId);

      return [
        escapeCsvCell(result.id),
        escapeCsvCell(result.claimId),
        escapeCsvCell(claim?.claimNumber ?? ""),
        escapeCsvCell(claim?.payerName ?? ""),
        escapeCsvCell(claim?.patientName ?? ""),
        escapeCsvCell(result.verifiedStatus),
        escapeCsvCell(claim ? Math.round(claim.confidence * 100) : ""),
        escapeCsvCell(result.lastVerifiedAt),
        escapeCsvCell(exportState),
        escapeCsvCell(result.nextAction),
        escapeCsvCell(result.connectorName),
        escapeCsvCell(result.executionMode),
        escapeCsvCell(result.agentTraceId)
      ].join(",");
    })
  ].join("\n");
}

function assertCanEditPayerConfiguration(actor: WorkflowActor) {
  if (!hasPermission(actor.role, "payer:write")) {
    throw new Error("Only owners can update payer workflow policy.");
  }
}

async function createClaimRecord(
  client: PoolClient,
  input: IntakeClaim,
  actor: WorkflowActor,
  auditContext?: {
    eventType?: string;
    importBatchId?: string | null;
    rowNumber?: number;
    source?: "Human" | "Import";
  }
) {
  if (input.organizationId !== actor.organizationId) {
    throw new Error("Claim intake must stay within the authenticated organization.");
  }

  const nowIso = new Date().toISOString();
  const claimNumber = input.claimNumber.trim();
  const patientName = input.patientName.trim();
  const owner = normalizeOptionalText(input.owner);
  const notes = normalizeOptionalText(input.notes);
  const sourceStatus = normalizeOptionalText(input.sourceStatus);
  const providedSlaAt = normalizeIntakeSlaAt(input.slaAt);
  const payerConfig = await loadPayerConfigurationByOrganizationAndPayerId(
    input.organizationId,
    input.payerId,
    client
  );
  const existingClaim = await loadClaimByOrganizationAndClaimNumber(
    input.organizationId,
    claimNumber,
    client
  );
  const existingQueueItem = existingClaim
    ? await loadQueueByClaimId(existingClaim.id, client)
    : undefined;
  const jurisdiction = normalizeIntakeJurisdiction(input.jurisdiction, payerConfig?.jurisdiction);
  const countryCode = normalizeIntakeCountryCode(
    input.countryCode,
    jurisdiction,
    payerConfig?.countryCode
  );
  const provinceOfService = normalizeProvinceOfService(input.provinceOfService);
  const claimType = normalizeOptionalText(input.claimType);
  const serviceProviderType = normalizeOptionalText(input.serviceProviderType) as
    | ClaimRecord["serviceProviderType"]
    | null;
  const serviceCode = normalizeOptionalText(input.serviceCode);
  const planNumber = normalizeOptionalText(input.planNumber);
  const memberCertificate = normalizeOptionalText(input.memberCertificate);
  const serviceDate = normalizeServiceDate(input.serviceDate);
  const billedAmountCents = normalizeBilledAmountCents(input.billedAmountCents);
  const claimId = existingClaim?.id ?? buildClaimId(claimNumber);
  const claim: ClaimRecord = existingClaim
    ? {
        ...existingClaim,
        payerId: input.payerId,
        payerName: payerConfig?.payerName ?? input.payerId,
        claimNumber,
        patientName,
        jurisdiction,
        countryCode,
        provinceOfService: provinceOfService ?? existingClaim.provinceOfService,
        claimType:
          claimType ??
          existingClaim.claimType ??
          (jurisdiction === "ca" ? "paramedical" : "Professional"),
        serviceProviderType: serviceProviderType ?? existingClaim.serviceProviderType ?? null,
        serviceCode: serviceCode ?? existingClaim.serviceCode ?? null,
        planNumber: planNumber ?? existingClaim.planNumber ?? null,
        memberCertificate: memberCertificate ?? existingClaim.memberCertificate ?? null,
        serviceDate: serviceDate ?? existingClaim.serviceDate,
        owner:
          owner ??
          existingClaim.owner ??
          (payerConfig?.autoAssignOwner ? payerConfig.owner : null),
        priority: normalizeIntakePriority(input.priority),
        slaAt:
          providedSlaAt ??
          existingClaim.slaAt ??
          deriveDefaultSlaAt(payerConfig?.defaultSlaHours),
        normalizedStatusText: sourceStatus ?? existingClaim.normalizedStatusText,
        notes: notes ?? existingClaim.notes,
        amountCents: billedAmountCents ?? existingClaim.amountCents
      }
    : {
        id: claimId,
        organizationId: input.organizationId,
        payerId: input.payerId,
        payerName: payerConfig?.payerName ?? input.payerId,
        claimNumber,
        patientName,
        jurisdiction,
        countryCode,
        provinceOfService,
        status: "pending",
        confidence: 0,
        slaAt: providedSlaAt ?? deriveDefaultSlaAt(payerConfig?.defaultSlaHours),
        owner: owner ?? (payerConfig?.autoAssignOwner ? payerConfig.owner : null),
        priority: normalizeIntakePriority(input.priority),
        lastCheckedAt: null,
        normalizedStatusText: sourceStatus ?? "Pending initial retrieval",
        amountCents: billedAmountCents,
        notes: notes ?? "Claim ingested into the workflow queue.",
        evidence: [],
        reviews: [],
        serviceDate: serviceDate ?? new Date().toISOString().slice(0, 10),
        claimType: claimType ?? (jurisdiction === "ca" ? "paramedical" : "Professional"),
        serviceProviderType,
        serviceCode,
        planNumber,
        memberCertificate,
        allowedAmountCents: null,
        paidAmountCents: null,
        patientResponsibilityCents: null,
        payerReferenceNumber: null,
        currentPayerResponse: null,
        currentQueue: owner ? "Assigned Intake" : "Pending Retrieval",
        nextAction: "Queue Retrieval",
        totalTouches: 0,
        requiresPhoneCall: false,
        phoneCallRequiredAt: null,
        daysSinceLastFollowUp: 0,
        escalationState: "Not escalated",
        ageDays: 0
      };

  const queueItem =
    claim.status === "resolved"
      ? null
      : ({
          id: existingQueueItem?.id ?? `queue_${claimId}`,
          claimId,
          status: claim.status,
          assignedTo: claim.owner,
          reason: existingClaim
            ? "Claim intake details were refreshed."
            : sourceStatus
              ? "Imported active inventory awaiting retrieval"
              : "New intake awaiting retrieval",
          createdAt: existingQueueItem?.createdAt ?? nowIso,
          slaAt: claim.slaAt
        } satisfies QueueItem);

  await upsertClaim(client, claim);

  if (queueItem) {
    await upsertQueueItem(client, queueItem);
  } else {
    await client.query("DELETE FROM queue_items WHERE claim_id = $1", [claim.id]);
  }

  await insertAuditEvent(client, {
    id: `AUD-${Date.now()}`,
    at: nowIso,
    organizationId: claim.organizationId,
    actor: {
      name: actor.name,
      type: auditActorType(actor.role),
      avatar: initials(actor.name)
    },
    eventType: auditContext?.eventType ?? (existingClaim ? "claim.intake_updated" : "claim.intaked"),
    userId: actor.id,
    action: existingClaim ? "Updated Intake" : "Intaked",
    object: "Claim",
    objectId: claim.id,
    source: auditContext?.source ?? auditSourceForRole(actor.role),
    payer: claim.payerName,
    summary: existingClaim
      ? `${actor.name} refreshed intake details for ${claim.claimNumber}.`
      : `${actor.name} added ${claim.claimNumber} to the claim-status queue.`,
    sensitivity: "normal",
    category: "Claim Intake",
    outcome: "success",
    importBatchId: auditContext?.importBatchId ?? null,
    detail: {
      rowNumber: auditContext?.rowNumber ?? null,
      claimNumber: claim.claimNumber,
      patientName: claim.patientName,
      payerId: claim.payerId,
      claimType: claim.claimType,
      serviceProviderType: claim.serviceProviderType,
      serviceCode: claim.serviceCode,
      planNumber: claim.planNumber,
      memberCertificate: claim.memberCertificate,
      serviceDate: claim.serviceDate,
      billedAmountCents: claim.amountCents
    },
    reason: existingClaim
      ? "Existing claim matched on organization and claim number."
      : "Claim submitted through intake workflow.",
    claimId: claim.id
  });

  return claim;
}

export async function createClaim(input: IntakeClaim, actor: WorkflowActor) {
  await initializeStore();

  const claim = await withTransaction((client) => createClaimRecord(client, input, actor));
  return getPilotClaimDetail(claim.id);
}

export async function previewClaimImport(
  rows: RawImportRow[],
  actor: WorkflowActor,
  importProfile: ImportProfileId = "generic_template"
): Promise<ClaimImportPreviewResult> {
  await initializeStore();
  const [existingClaims, payerConfigurations] = await Promise.all([
    loadClaimsByOrganization(actor.organizationId),
    loadPayerConfigurationsByOrganization(actor.organizationId)
  ]);
  const normalizedRows = adaptImportRows(rows, importProfile);
  const preview = previewClaimImportRows({
    rows: normalizedRows,
    existingClaims,
    payerConfigurations
  });

  await withTransaction(async (client) => {
    await insertAuditEvent(client, {
      id: `AUD-${Date.now()}`,
      at: new Date().toISOString(),
      organizationId: actor.organizationId,
      actor: {
        name: actor.name,
        type: auditActorType(actor.role),
        avatar: initials(actor.name)
      },
      eventType: "import.preview",
      userId: actor.id,
      action: "Previewed Import",
      object: "Configuration",
      objectId: `preview_${Date.now()}`,
      source: auditSourceForRole(actor.role),
      payer: "Mixed",
      summary: `${actor.name} previewed ${preview.summary.totalRows} import rows with the ${importProfile} profile.`,
      sensitivity: "normal",
      category: "Claim Intake",
      outcome: "success",
      detail: {
        importProfile,
        rowCount: preview.summary.totalRows,
        createCount: preview.summary.createCount,
        updateCount: preview.summary.updateCount,
        invalidCount: preview.summary.invalidCount,
        duplicateInFileCount: preview.summary.duplicateInFileCount
      },
      reason: "Import preview requested from onboarding."
    });
  });

  return preview;
}

export async function commitClaimImport(
  rows: RawImportRow[],
  actor: WorkflowActor,
  importProfile: ImportProfileId = "generic_template"
) {
  await initializeStore();
  const importBatchId = `import_${Date.now()}`;

  const result = await withTransaction(async (client) => {
    const [existingClaims, payerConfigurations] = await Promise.all([
      loadClaimsByOrganization(actor.organizationId, client),
      loadPayerConfigurationsByOrganization(actor.organizationId, client)
    ]);
    const normalizedRows = adaptImportRows(rows, importProfile);
    const preview = previewClaimImportRows({
      rows: normalizedRows,
      existingClaims,
      payerConfigurations
    });
    const actionableRows = preview.rows.filter(
      (row) => row.action === "create" || row.action === "update"
    );

    for (const row of actionableRows) {
      await createClaimRecord(
        client,
        {
          organizationId: actor.organizationId,
          payerId: row.payerId ?? "",
          claimNumber: row.claimNumber ?? "",
          patientName: row.patientName ?? "",
          jurisdiction: row.jurisdiction ?? undefined,
          countryCode: row.countryCode ?? undefined,
          provinceOfService: row.provinceOfService,
          claimType: row.claimType,
          serviceProviderType: row.serviceProviderType,
          serviceCode: row.serviceCode,
          planNumber: row.planNumber,
          memberCertificate: row.memberCertificate,
          serviceDate: row.serviceDate,
          billedAmountCents: row.billedAmountCents,
          priority: row.priority ?? "normal",
          owner: row.owner,
          notes: row.notes,
          slaAt: row.slaAt,
          sourceStatus: row.sourceStatus
        },
        actor,
        {
          eventType: "claim.imported",
          importBatchId,
          rowNumber: row.rowNumber,
          source: "Import"
        }
      );
    }

    await insertAuditEvent(client, {
      id: `AUD-${Date.now()}_commit`,
      at: new Date().toISOString(),
      organizationId: actor.organizationId,
      actor: {
        name: actor.name,
        type: auditActorType(actor.role),
        avatar: initials(actor.name)
      },
      eventType: "import.commit",
      userId: actor.id,
      action: "Imported",
      object: "Configuration",
      objectId: importBatchId,
      source: auditSourceForRole(actor.role),
      payer: "Mixed",
      summary: `${actor.name} imported ${preview.summary.createCount} new claims and refreshed ${preview.summary.updateCount} existing claims.`,
      sensitivity: "normal",
      category: "Claim Intake",
      outcome: "success",
      importBatchId,
      detail: {
        importProfile,
        rowCount: preview.summary.totalRows,
        rowsCreated: preview.summary.createCount,
        rowsUpdated: preview.summary.updateCount,
        rowsInvalid: preview.summary.invalidCount,
        rowsDuplicateInFile: preview.summary.duplicateInFileCount,
        rowsImported: actionableRows.length
      },
      reason: `${preview.summary.invalidCount} invalid rows and ${preview.summary.duplicateInFileCount} duplicate rows were excluded.`
    });
    return {
      summary: {
        ...preview.summary,
        importedCount: actionableRows.length
      },
      rows: preview.rows
    };
  });

  return result;
}

export type UpdatePayerPolicyInput = {
  owner?: string;
  reviewThreshold: number;
  escalationThreshold: number;
  defaultSlaHours: number;
  autoAssignOwner: boolean;
};

export async function getReviewPolicyForClaim(claimId: string) {
  const claim = await loadClaimById(claimId);

  if (!claim) {
    return null;
  }

  return loadPayerConfigurationByOrganizationAndPayerId(claim.organizationId, claim.payerId);
}

export async function updatePayerConfigurationPolicy(
  payerId: string,
  input: UpdatePayerPolicyInput,
  actor: WorkflowActor
) {
  assertCanEditPayerConfiguration(actor);
  const existing = await loadPayerConfigurationByOrganizationAndPayerId(actor.organizationId, payerId);

  if (!existing) {
    throw new Error("Payer configuration not found");
  }

  const owner = normalizeOptionalText(input.owner) ?? existing.owner;
  const reviewThreshold = Math.min(0.99, Math.max(0.5, input.reviewThreshold));
  const escalationThreshold = Math.min(0.95, Math.max(0.1, input.escalationThreshold));
  const defaultSlaHours = Math.min(168, Math.max(1, Math.round(input.defaultSlaHours)));

  if (escalationThreshold >= reviewThreshold) {
    throw new Error("Escalation threshold must be lower than the review threshold.");
  }

  const updated: PayerConfigurationRecord = {
    ...existing,
    owner,
    reviewThreshold,
    escalationThreshold,
    defaultSlaHours,
    autoAssignOwner: input.autoAssignOwner,
    issues: [],
    status: existing.status
  };
  updated.issues = derivePayerConfigurationIssues(updated);
  updated.status = derivePayerConfigurationStatus(updated);

  await withTransaction(async (client) => {
    await upsertPayerConfiguration(client, updated);
    await insertAuditEvent(client, {
      id: `AUD-${Date.now()}`,
      at: new Date().toISOString(),
      organizationId: actor.organizationId,
      actor: {
        name: actor.name,
        type: auditActorType(actor.role),
        avatar: initials(actor.name)
      },
      eventType: "payer.policy_updated",
      userId: actor.id,
      action: "Policy Updated",
      object: "Configuration",
      objectId: updated.id,
      source: auditSourceForRole(actor.role),
      payer: updated.payerName,
      summary: `${actor.name} updated workflow policy for ${updated.payerName}.`,
      sensitivity: "high-risk",
      category: "Config Change",
      outcome: "success",
      detail: {
        payerId: updated.payerId,
        reviewThreshold: updated.reviewThreshold,
        escalationThreshold: updated.escalationThreshold,
        defaultSlaHours: updated.defaultSlaHours,
        autoAssignOwner: updated.autoAssignOwner,
        owner: updated.owner
      },
      beforeAfter: {
        reviewThreshold: {
          from: `${Math.round(existing.reviewThreshold * 100)}%`,
          to: `${Math.round(updated.reviewThreshold * 100)}%`
        },
        escalationThreshold: {
          from: `${Math.round(existing.escalationThreshold * 100)}%`,
          to: `${Math.round(updated.escalationThreshold * 100)}%`
        },
        defaultSlaHours: {
          from: `${existing.defaultSlaHours}h`,
          to: `${updated.defaultSlaHours}h`
        },
        autoAssignOwner: {
          from: existing.autoAssignOwner ? "Enabled" : "Disabled",
          to: updated.autoAssignOwner ? "Enabled" : "Disabled"
        }
      },
      reason: "Workflow policy settings changed from the configuration workspace."
    });
  });

  return updated;
}

export async function applyClaimAction(
  claimId: string,
  action: Parameters<typeof applyClaimWorkflowAction>[0]["action"],
  actor: WorkflowActor,
  options?: {
    assignee?: string;
    note?: string;
    outcome?: Parameters<typeof applyClaimWorkflowAction>[0]["outcome"];
    nextAction?: string;
    followUpAt?: string | null;
  }
) {
  const ensuredActor = ensureActor(actor);

  await initializeStore();

  await withTransaction(async (client) => {
    const claimResult = await client.query<{ payload: ClaimRecord }>(
      "SELECT payload FROM claims WHERE id = $1 FOR UPDATE",
      [claimId]
    );
    const claim = claimResult.rows[0]?.payload
      ? normalizeClaimRecord(claimResult.rows[0].payload)
      : undefined;

    if (!claim) {
      throw new Error("Claim not found");
    }

    const queueResult = await client.query<{ payload: QueueItem }>(
      "SELECT payload FROM queue_items WHERE claim_id = $1 FOR UPDATE",
      [claimId]
    );
    const queueItem = queueResult.rows[0]?.payload;

    const resultResult = await client.query<{ payload: ResultRecord }>(
      "SELECT payload FROM results WHERE claim_id = $1 FOR UPDATE",
      [claimId]
    );
    const existingResult = resultResult.rows[0]?.payload;

    const mutation = applyClaimWorkflowAction({
      claim,
      queueItem,
      existingResult,
      action,
      actor: ensuredActor,
      assignee: options?.assignee,
      note: options?.note,
      outcome: options?.outcome,
      nextAction: options?.nextAction,
      followUpAt: options?.followUpAt
    });

    await upsertClaim(client, mutation.claim);

    if (mutation.queueItem) {
      await upsertQueueItem(client, mutation.queueItem);
    } else {
      await client.query("DELETE FROM queue_items WHERE claim_id = $1", [claimId]);
    }

    if (mutation.result) {
      await upsertResult(client, mutation.result);
      await syncEvidenceArtifacts(client, mutation.claim, mutation.result.id);
    }

    await insertAuditEvent(client, mutation.auditEvent);

    if (claim.status !== mutation.claim.status) {
      await insertAuditEvent(client, {
        id: `AUD-${Date.now()}_status`,
        at: new Date().toISOString(),
        organizationId: actor.organizationId,
        actor: {
          name: actor.name,
          type: auditActorType(actor.role),
          avatar: initials(actor.name)
        },
        eventType: "claim.status_updated",
        userId: actor.id,
        action: "Status Updated",
        object: "Claim",
        objectId: claim.id,
        source: auditSourceForRole(actor.role),
        payer: claim.payerName,
        summary: `${actor.name} changed ${claim.claimNumber} from ${claim.status} to ${mutation.claim.status}.`,
        sensitivity: "normal",
        category: "Claim Workflow",
        outcome: "success",
        detail: {
          statusFrom: claim.status,
          statusTo: mutation.claim.status,
          normalizedStatusText: mutation.claim.normalizedStatusText
        },
        beforeAfter: {
          status: {
            from: statusLabel(claim.status, claim.normalizedStatusText),
            to: statusLabel(mutation.claim.status, mutation.claim.normalizedStatusText)
          }
        },
        claimId: claim.id,
        resultId: mutation.result?.id
      });
    }
  });

  return getPilotClaimDetail(claimId);
}

export async function enqueueRetrievalJob(claimId: string, actor: WorkflowActor) {
  const claim = await loadClaimById(claimId);

  if (!claim) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const job: RetrievalJobRecord = {
    id: `job_${Date.now()}`,
    organizationId: claim.organizationId,
    claimId,
    status: "queued",
    priority: claim.priority,
    attempts: 0,
    maxAttempts: 3,
    queuedBy: actor.id,
    reservedBy: null,
    availableAt: nowIso,
    startedAt: null,
    completedAt: null,
    lastAttemptedAt: null,
    lastError: null,
    failureCategory: null,
    retryable: false,
    connectorId: null,
    connectorName: null,
    executionMode: null,
    agentTraceId: null,
    reviewReason: null,
    attemptHistory: [],
    createdAt: nowIso,
    updatedAt: nowIso
  };

  await withTransaction(async (client) => {
    await upsertRetrievalJob(client, job);
    await insertAuditEvent(client, {
      id: `AUD-${Date.now()}`,
      at: nowIso,
      organizationId: actor.organizationId,
      actor: {
        name: actor.name,
        type: auditActorType(actor.role),
        avatar: initials(actor.name)
      },
      eventType: "retrieval.queued",
      userId: actor.id,
      action: "Queued Retrieval",
      object: "Claim",
      objectId: claim.id,
      source: auditSourceForRole(actor.role),
      payer: claim.payerName,
      summary: `${actor.name} queued a retrieval job for ${claim.claimNumber}.`,
      sensitivity: "normal",
      category: "Retrieval Queue",
      outcome: "success",
      detail: {
        jobId: job.id,
        claimNumber: claim.claimNumber
      },
      reason: "Manual re-check requested.",
      claimId: claim.id
    });
  });

  return job;
}

export async function claimNextRetrievalJob(workerName: string) {
  await initializeStore();

  return withTransaction(async (client) => {
    const nowIso = new Date().toISOString();
    const nextLeaseExpiresAt = new Date(Date.now() + agentRunLeaseDurationMs).toISOString();
    let job: RetrievalJobRecord | null = null;
    let agentRun: AgentRunRecord | null = null;

    const queuedJobResult = await client.query<{
      id: string;
      payload: RetrievalJobRecord;
    }>(
      `
        SELECT id, payload
        FROM retrieval_jobs
        WHERE status IN ('queued', 'retrying') AND available_at <= NOW()
        ORDER BY available_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `
    );
    const queuedRow = queuedJobResult.rows[0];

    if (queuedRow) {
      job = {
        ...normalizeRetrievalJob(queuedRow.payload),
        status: "processing",
        reservedBy: workerName,
        attempts: queuedRow.payload.attempts + 1,
        startedAt: nowIso,
        lastAttemptedAt: nowIso,
        updatedAt: nowIso
      };
      agentRun = buildNewAgentRun(job, workerName);
      await upsertRetrievalJob(client, job);
      await upsertAgentRun(client, agentRun);
    } else {
      const expiredRunResult = await client.query<{ payload: AgentRunRecord }>(
        `
          SELECT payload
          FROM agent_runs
          WHERE status = 'running'
            AND lease_expires_at <= NOW()
          ORDER BY lease_expires_at ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        `
      );
      const expiredRunRow = expiredRunResult.rows[0];

      if (!expiredRunRow?.payload) {
        return null;
      }

      const existingRun = normalizeAgentRun(expiredRunRow.payload);
      const jobResult = await client.query<{ payload: RetrievalJobRecord }>(
        "SELECT payload FROM retrieval_jobs WHERE id = $1 FOR UPDATE",
        [existingRun.retrievalJobId]
      );
      const existingJob = jobResult.rows[0]?.payload
        ? normalizeRetrievalJob(jobResult.rows[0].payload)
        : null;

      if (!existingJob || existingJob.status !== "processing") {
        return null;
      }

      job = {
        ...existingJob,
        reservedBy: workerName,
        updatedAt: nowIso
      };
      agentRun = {
        ...existingRun,
        leaseOwner: workerName,
        leaseExpiresAt: nextLeaseExpiresAt,
        heartbeatAt: nowIso,
        updatedAt: nowIso
      };

      await upsertRetrievalJob(client, job);
      await upsertAgentRun(client, agentRun);
    }

    const claimResult = await client.query<{ payload: ClaimRecord }>(
      "SELECT payload FROM claims WHERE id = $1",
      [job.claimId]
    );
    const claim = claimResult.rows[0]?.payload
      ? normalizeClaimRecord(claimResult.rows[0].payload)
      : undefined;

    if (!claim) {
      return null;
    }

    const agentSteps = await loadAgentStepsByRunId(agentRun.id, client);

    return {
      job,
      claim: toClaimDetail(claim),
      agentRun: buildAgentRunView(agentRun, agentSteps)
    };
  });
}

export type StartAgentToolStepInput = {
  stepNumber: number;
  toolName: AgentToolName;
  toolArgs: {
    connectorId: string;
    mode: ConnectorMode;
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

export type RecordAgentTerminalStepInput = {
  stepNumber: number;
  directiveKind: Extract<AgentDirectiveKind, "final" | "retry">;
  publicReason: string;
  idempotencyKey: string;
  plannerUsage: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
  summary: string;
  terminalReason: AgentRunTerminalReason;
  finalCandidate?: ExecutionCandidate | null;
  retryAfterSeconds?: number | null;
};

export function assertRunLease(run: AgentRunRecord, workerName: string, now = Date.now()) {
  if (run.status !== "running") {
    throw new Error("Agent run is not active.");
  }

  if (run.leaseOwner !== workerName) {
    throw new Error("Agent run lease is held by another worker.");
  }

  const leaseExpiresAtMs = run.leaseExpiresAt ? new Date(run.leaseExpiresAt).getTime() : NaN;

  if (!run.leaseExpiresAt || Number.isNaN(leaseExpiresAtMs) || leaseExpiresAtMs <= now) {
    throw new Error("Agent run lease has expired.");
  }
}

export async function heartbeatAgentRun(runId: string, workerName: string) {
  await initializeStore();

  return withTransaction(async (client) => {
    const runResult = await client.query<{ payload: AgentRunRecord }>(
      "SELECT payload FROM agent_runs WHERE id = $1 FOR UPDATE",
      [runId]
    );
    const run = runResult.rows[0]?.payload ? normalizeAgentRun(runResult.rows[0].payload) : null;

    if (!run) {
      return null;
    }

    assertRunLease(run, workerName);
    const nowIso = new Date().toISOString();
    const updatedRun: AgentRunRecord = {
      ...run,
      heartbeatAt: nowIso,
      leaseExpiresAt: new Date(Date.now() + agentRunLeaseDurationMs).toISOString(),
      updatedAt: nowIso
    };

    await upsertAgentRun(client, updatedRun);
    const steps = await loadAgentStepsByRunId(runId, client);
    return buildAgentRunView(updatedRun, steps);
  });
}

export async function startAgentToolStep(
  runId: string,
  input: StartAgentToolStepInput,
  workerName: string
) {
  await initializeStore();

  return withTransaction(async (client) => {
    const runResult = await client.query<{ payload: AgentRunRecord }>(
      "SELECT payload FROM agent_runs WHERE id = $1 FOR UPDATE",
      [runId]
    );
    const run = runResult.rows[0]?.payload ? normalizeAgentRun(runResult.rows[0].payload) : null;

    if (!run) {
      return null;
    }

    assertRunLease(run, workerName);

    const stepResult = await client.query<{ payload: AgentStepRecord }>(
      "SELECT payload FROM agent_steps WHERE agent_run_id = $1 AND step_number = $2 FOR UPDATE",
      [runId, input.stepNumber]
    );
    const existingStep = stepResult.rows[0]?.payload
      ? normalizeAgentStep(stepResult.rows[0].payload)
      : null;

    if (existingStep) {
      if (
        existingStep.idempotencyKey !== input.idempotencyKey ||
        existingStep.toolName !== input.toolName
      ) {
        throw new Error("Agent step already exists with different identity.");
      }

      return {
        run: buildAgentRunView(run, await loadAgentStepsByRunId(runId, client)),
        step: toAgentStepHistoryItem(existingStep)
      };
    }

    const nowIso = new Date().toISOString();
    const step: AgentStepRecord = {
      id: `${runId}_step_${input.stepNumber}`,
      agentRunId: runId,
      stepNumber: input.stepNumber,
      directiveKind: "tool_call",
      toolName: input.toolName,
      status: "started",
      idempotencyKey: input.idempotencyKey,
      publicReason: input.publicReason,
      toolArgs: input.toolArgs,
      plannerProvider: input.plannerUsage.provider,
      plannerModel: input.plannerUsage.model,
      plannerInputTokens: input.plannerUsage.inputTokens,
      plannerOutputTokens: input.plannerUsage.outputTokens,
      result: null,
      startedAt: nowIso,
      completedAt: null
    };
    const updatedRun: AgentRunRecord = {
      ...run,
      modelProvider: input.plannerUsage.provider,
      modelName: input.plannerUsage.model,
      modelCallsUsed: run.modelCallsUsed + 1,
      inputTokensUsed: run.inputTokensUsed + input.plannerUsage.inputTokens,
      outputTokensUsed: run.outputTokensUsed + input.plannerUsage.outputTokens,
      totalTokensUsed:
        run.totalTokensUsed + input.plannerUsage.inputTokens + input.plannerUsage.outputTokens,
      heartbeatAt: nowIso,
      leaseExpiresAt: new Date(Date.now() + agentRunLeaseDurationMs).toISOString(),
      updatedAt: nowIso
    };

    await upsertAgentStep(client, step);
    await upsertAgentRun(client, updatedRun);

    return {
      run: buildAgentRunView(updatedRun, [...(await loadAgentStepsByRunId(runId, client))]),
      step: toAgentStepHistoryItem(step)
    };
  });
}

export async function completeAgentToolStep(
  runId: string,
  stepNumber: number,
  result: AgentStepResult,
  workerName: string
) {
  await initializeStore();

  return withTransaction(async (client) => {
    const runResult = await client.query<{ payload: AgentRunRecord }>(
      "SELECT payload FROM agent_runs WHERE id = $1 FOR UPDATE",
      [runId]
    );
    const run = runResult.rows[0]?.payload ? normalizeAgentRun(runResult.rows[0].payload) : null;

    if (!run) {
      return null;
    }

    assertRunLease(run, workerName);

    const stepResult = await client.query<{ payload: AgentStepRecord }>(
      "SELECT payload FROM agent_steps WHERE agent_run_id = $1 AND step_number = $2 FOR UPDATE",
      [runId, stepNumber]
    );
    const existingStep = stepResult.rows[0]?.payload
      ? normalizeAgentStep(stepResult.rows[0].payload)
      : null;

    if (!existingStep) {
      throw new Error("Agent step not found.");
    }

    if (existingStep.status === "completed") {
      return {
        run: buildAgentRunView(run, await loadAgentStepsByRunId(runId, client)),
        step: toAgentStepHistoryItem(existingStep)
      };
    }

    const nowIso = new Date().toISOString();
    const stepsBefore = await loadAgentStepsByRunId(runId, client);
    const previousObservation = [...stepsBefore]
      .filter((step) => step.stepNumber < stepNumber && step.result?.observation)
      .map((step) => step.result?.observation ?? null)
      .filter((step): step is NonNullable<AgentStepResult["observation"]> => Boolean(step))
      .at(-1);
    const currentObservation = result.observation ?? null;
    const connectorSwitchIncrement =
      currentObservation &&
      previousObservation &&
      (currentObservation.executionMode !== previousObservation.executionMode ||
        currentObservation.connectorId !== previousObservation.connectorId)
        ? 1
        : 0;
    const completedStep: AgentStepRecord = {
      ...existingStep,
      status: "completed",
      result,
      completedAt: nowIso
    };
    const updatedRun: AgentRunRecord = {
      ...run,
      connectorSwitchCount: run.connectorSwitchCount + connectorSwitchIncrement,
      heartbeatAt: nowIso,
      leaseExpiresAt: new Date(Date.now() + agentRunLeaseDurationMs).toISOString(),
      updatedAt: nowIso,
      lastError:
        result.failureCategory && result.summary
          ? result.summary
          : run.lastError
    };

    await upsertAgentStep(client, completedStep);
    await upsertAgentRun(client, updatedRun);

    return {
      run: buildAgentRunView(updatedRun, await loadAgentStepsByRunId(runId, client)),
      step: toAgentStepHistoryItem(completedStep)
    };
  });
}

export async function recordAgentTerminalStep(
  runId: string,
  input: RecordAgentTerminalStepInput,
  workerName: string
) {
  await initializeStore();

  return withTransaction(async (client) => {
    const runResult = await client.query<{ payload: AgentRunRecord }>(
      "SELECT payload FROM agent_runs WHERE id = $1 FOR UPDATE",
      [runId]
    );
    const run = runResult.rows[0]?.payload ? normalizeAgentRun(runResult.rows[0].payload) : null;

    if (!run) {
      return null;
    }

    assertRunLease(run, workerName);

    const stepResult = await client.query<{ payload: AgentStepRecord }>(
      "SELECT payload FROM agent_steps WHERE agent_run_id = $1 AND step_number = $2 FOR UPDATE",
      [runId, input.stepNumber]
    );
    const existingStep = stepResult.rows[0]?.payload
      ? normalizeAgentStep(stepResult.rows[0].payload)
      : null;

    if (existingStep) {
      if (existingStep.idempotencyKey !== input.idempotencyKey) {
        throw new Error("Terminal agent step already exists with different identity.");
      }

      return {
        run: buildAgentRunView(run, await loadAgentStepsByRunId(runId, client)),
        step: toAgentStepHistoryItem(existingStep)
      };
    }

    const nowIso = new Date().toISOString();
    const step: AgentStepRecord = {
      id: `${runId}_step_${input.stepNumber}`,
      agentRunId: runId,
      stepNumber: input.stepNumber,
      directiveKind: input.directiveKind,
      toolName: null,
      status: "completed",
      idempotencyKey: input.idempotencyKey,
      publicReason: input.publicReason,
      toolArgs: null,
      plannerProvider: input.plannerUsage.provider,
      plannerModel: input.plannerUsage.model,
      plannerInputTokens: input.plannerUsage.inputTokens,
      plannerOutputTokens: input.plannerUsage.outputTokens,
      result: {
        summary: input.summary,
        evidenceArtifactIds: input.finalCandidate?.evidence.map((artifact) => artifact.id) ?? [],
        failureCategory: null,
        finalCandidate: input.finalCandidate ?? null,
        retryAfterSeconds: input.retryAfterSeconds ?? null,
        terminalReason: input.terminalReason
      },
      startedAt: nowIso,
      completedAt: nowIso
    };
    const updatedRun: AgentRunRecord = {
      ...run,
      modelProvider: input.plannerUsage.provider,
      modelName: input.plannerUsage.model,
      modelCallsUsed: run.modelCallsUsed + 1,
      inputTokensUsed: run.inputTokensUsed + input.plannerUsage.inputTokens,
      outputTokensUsed: run.outputTokensUsed + input.plannerUsage.outputTokens,
      totalTokensUsed:
        run.totalTokensUsed + input.plannerUsage.inputTokens + input.plannerUsage.outputTokens,
      heartbeatAt: nowIso,
      leaseExpiresAt: new Date(Date.now() + agentRunLeaseDurationMs).toISOString(),
      updatedAt: nowIso
    };

    await upsertAgentStep(client, step);
    await upsertAgentRun(client, updatedRun);

    return {
      run: buildAgentRunView(updatedRun, await loadAgentStepsByRunId(runId, client)),
      step: toAgentStepHistoryItem(step)
    };
  });
}

async function finalizeAgentRunForJob(
  client: PoolClient,
  retrievalJobId: string,
  params: {
    status: AgentRunStatus;
    terminalReason: AgentRunTerminalReason | null;
    finalCandidate?: ExecutionCandidate | null;
    lastError?: string | null;
  }
) {
  const existingRun = await loadLatestActiveAgentRunByJobId(retrievalJobId, client);

  if (!existingRun) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const updatedRun: AgentRunRecord = {
    ...existingRun,
    status: params.status,
    terminalReason: params.terminalReason ?? existingRun.terminalReason,
    finalCandidate: params.finalCandidate ?? existingRun.finalCandidate,
    lastError: params.lastError ?? existingRun.lastError,
    leaseOwner: null,
    leaseExpiresAt: null,
    heartbeatAt: nowIso,
    completedAt: nowIso,
    updatedAt: nowIso
  };

  await upsertAgentRun(client, updatedRun);
  return updatedRun;
}

export async function failRetrievalJob(
  jobId: string,
  failure: {
    error: string;
    failureCategory?: RetrievalJobRecord["failureCategory"];
    retryable?: boolean;
    retryAfterSeconds?: number;
    connectorId?: string;
    connectorName?: string;
    executionMode?: RetrievalJobRecord["executionMode"];
    observedAt?: string;
    durationMs?: number;
    terminalReason?: AgentRunTerminalReason;
  }
) {
  await initializeStore();

  return withTransaction(async (client) => {
    const jobResult = await client.query<{ payload: RetrievalJobRecord }>(
      "SELECT payload FROM retrieval_jobs WHERE id = $1 FOR UPDATE",
      [jobId]
    );
    const job = jobResult.rows[0]?.payload
      ? normalizeRetrievalJob(jobResult.rows[0].payload)
      : undefined;

    if (!job) {
      return null;
    }

    const exhausted = job.attempts >= job.maxAttempts || failure.retryable === false;
    const observedAt = failure.observedAt ?? new Date().toISOString();
    const updatedJob: RetrievalJobRecord = {
      ...job,
      status: exhausted ? "failed" : "retrying",
      availableAt: exhausted
        ? new Date().toISOString()
        : new Date(Date.now() + Math.max(1, failure.retryAfterSeconds ?? 60) * 1000).toISOString(),
      lastError: failure.error,
      failureCategory: failure.failureCategory ?? null,
      retryable: failure.retryable ?? !exhausted,
      connectorId: failure.connectorId ?? job.connectorId,
      connectorName: failure.connectorName ?? job.connectorName,
      executionMode: failure.executionMode ?? job.executionMode,
      lastAttemptedAt: observedAt,
      updatedAt: new Date().toISOString(),
      attemptHistory: [
        {
          attempt: job.attempts,
          connectorId: failure.connectorId ?? job.connectorId,
          connectorName: failure.connectorName ?? job.connectorName,
          executionMode: failure.executionMode ?? job.executionMode,
          startedAt: job.startedAt ?? observedAt,
          finishedAt: observedAt,
          status: exhausted ? "failed" : "retrying",
          summary: failure.error,
          traceId: job.agentTraceId,
          failureCategory: failure.failureCategory ?? null
        },
        ...job.attemptHistory
      ]
    };

    await upsertRetrievalJob(client, updatedJob);
    await finalizeAgentRunForJob(client, job.id, {
      status: exhausted ? "failed" : "retry_scheduled",
      terminalReason:
        failure.terminalReason ??
        (exhausted ? "fallback_policy_review" : "retry_scheduled"),
      lastError: failure.error
    });

    const claimResult = await client.query<{ payload: ClaimRecord }>(
      "SELECT payload FROM claims WHERE id = $1",
      [job.claimId]
    );
    const claim = claimResult.rows[0]?.payload
      ? normalizeClaimRecord(claimResult.rows[0].payload)
      : undefined;

    if (claim) {
      await insertAuditEvent(client, {
        id: `AUD-${Date.now()}`,
        at: observedAt,
        organizationId: claim.organizationId,
        actor: { name: "System", type: "system", avatar: "SYS" },
        eventType: exhausted ? "retrieval.failed" : "retrieval.retry_scheduled",
        action: exhausted ? "Agent Failed" : "Agent Retry Scheduled",
        object: "Claim",
        objectId: claim.id,
        source: "System",
        payer: claim.payerName,
        summary: exhausted
          ? `${failure.connectorName ?? "Agent runtime"} failed and the claim now needs attention.`
          : `${failure.connectorName ?? "Agent runtime"} scheduled another retrieval attempt.`,
        sensitivity: "normal",
        category: "Retrieval Queue",
        outcome: exhausted ? "failure" : "success",
        detail: {
          connectorId: failure.connectorId ?? null,
          connectorName: failure.connectorName ?? null,
          failureCategory: failure.failureCategory ?? null,
          retryable: failure.retryable ?? !exhausted
        },
        reason: failure.error,
        claimId: claim.id
      });
    }

    return updatedJob;
  });
}

export async function applyRetrievalOutcome(
  claimId: string,
  candidate: ExecutionCandidate,
  decision: WorkflowDecision,
  jobId?: string
) {
  await initializeStore();

  const updatedResult = await withTransaction(async (client) => {
    const claimResult = await client.query<{ payload: ClaimRecord }>(
      "SELECT payload FROM claims WHERE id = $1 FOR UPDATE",
      [claimId]
    );
    const claim = claimResult.rows[0]?.payload
      ? normalizeClaimRecord(claimResult.rows[0].payload)
      : undefined;

    if (!claim) {
      return null;
    }

    const queueResult = await client.query<{ payload: QueueItem }>(
      "SELECT payload FROM queue_items WHERE claim_id = $1 FOR UPDATE",
      [claimId]
    );
    const existingQueueItem = queueResult.rows[0]?.payload;

    const resultResult = await client.query<{ payload: ResultRecord }>(
      "SELECT payload FROM results WHERE claim_id = $1 FOR UPDATE",
      [claimId]
    );
    const existingResult = resultResult.rows[0]?.payload;

    const storedEvidence = await persistEvidenceArtifacts(claim.id, candidate.evidence);
    const storedCandidate: ExecutionCandidate = {
      ...candidate,
      evidence: storedEvidence
    };

    const mutation = computeRetrievalOutcome({
      claim,
      queueItem: existingQueueItem,
      existingResult,
      candidate: storedCandidate,
      decision
    });

    await upsertClaim(client, mutation.claim);

    if (mutation.queueItem) {
      await upsertQueueItem(client, mutation.queueItem);
    } else {
      await client.query("DELETE FROM queue_items WHERE claim_id = $1", [claimId]);
    }

    await upsertResult(client, mutation.result);
    await syncEvidenceArtifacts(client, mutation.claim, mutation.result.id);

    for (const artifact of storedEvidence) {
      await insertAuditEvent(client, {
        id: `AUD-${Date.now()}_${artifact.id}`,
        at: artifact.createdAt,
        organizationId: mutation.claim.organizationId,
        actor: { name: "System", type: "system", avatar: "SYS" },
        eventType: "evidence.uploaded",
        action: "Stored Evidence",
        object: "Evidence",
        objectId: artifact.id,
        source: "System",
        payer: mutation.claim.payerName,
        summary: `Stored evidence artifact ${artifact.label} for ${mutation.claim.claimNumber}.`,
        sensitivity: "normal",
        category: "Evidence Capture",
        outcome: "success",
        detail: {
          claimId: mutation.claim.id,
          sizeBytes: artifact.sizeBytes ?? null,
          kind: artifact.kind
        },
        claimId: mutation.claim.id,
        resultId: mutation.result.id
      });
    }

    for (const event of mutation.auditEvents) {
      await insertAuditEvent(client, event);
    }

    if (jobId) {
      const jobResult = await client.query<{ payload: RetrievalJobRecord }>(
        "SELECT payload FROM retrieval_jobs WHERE id = $1 FOR UPDATE",
        [jobId]
      );
      const job = jobResult.rows[0]?.payload
        ? normalizeRetrievalJob(jobResult.rows[0].payload)
        : undefined;

      if (job) {
        await upsertRetrievalJob(client, {
          ...job,
          status: "completed",
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastError: null,
          failureCategory: null,
          retryable: false,
          connectorId: candidate.execution.connectorId,
          connectorName: candidate.execution.connectorName,
          executionMode: candidate.execution.executionMode,
          agentTraceId: candidate.agentTraceId ?? null,
          reviewReason: candidate.routeReason,
          lastAttemptedAt: storedCandidate.execution.observedAt,
          attemptHistory: [
            {
              attempt: storedCandidate.execution.attempt,
              connectorId: storedCandidate.execution.connectorId,
              connectorName: storedCandidate.execution.connectorName,
              executionMode: storedCandidate.execution.executionMode,
              startedAt: job.startedAt ?? storedCandidate.execution.observedAt,
              finishedAt: storedCandidate.execution.observedAt,
              status: "completed",
              summary: storedCandidate.rationale,
              traceId: storedCandidate.agentTraceId ?? null,
              failureCategory: null
            },
            ...job.attemptHistory
          ]
        });
        await finalizeAgentRunForJob(client, job.id, {
          status: decision.nextStatus === "resolved" ? "completed" : "review_required",
          terminalReason:
            decision.nextStatus === "resolved" ? "resolved_candidate" : "review_required",
          finalCandidate: storedCandidate,
          lastError: null
        });
      }
    }

    return mutation.result.id;
  });

  if (!updatedResult) {
    return null;
  }

  const [claim, result, queue, auditEvents] = await Promise.all([
    getPilotClaimDetail(claimId),
    getResultDetail(updatedResult),
    listPilotQueueItems(),
    loadAuditEvents()
  ]);

  return {
    claim,
    result,
    auditEvents: buildAuditLog(
      auditEvents.filter((event: AuditEventRecord) => event.claimId === claimId)
    ),
    queue
  };
}
