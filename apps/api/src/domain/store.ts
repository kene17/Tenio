import type { EvidenceArtifact, ExecutionCandidate } from "@tenio/contracts";
import type {
  ClaimDetail,
  ClaimSummary,
  IntakeClaim,
  Priority,
  QueueItem
} from "@tenio/domain";
import { randomUUID } from "node:crypto";
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
  canManagePayerConfiguration,
  type AppRole,
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
  derivePayerConfigurationIssues,
  derivePayerConfigurationStatus,
  type AppUserRecord,
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
  toClaimDetail,
  toClaimSummary
} from "./pilot-state.js";
import {
  previewClaimImportRows,
  type ClaimImportPreviewResult,
  type ClaimImportRowInput
} from "./imports.js";

let initialized = false;
type DbExecutor = PoolClient | ReturnType<typeof getPool>;

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

function normalizePayerConfigurationRecord(
  config: PayerConfigurationRecord
): PayerConfigurationRecord {
  const hydrated: PayerConfigurationRecord = {
    ...config,
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

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
      id: "user_admin",
      organizationId: appConfig.seedOrgId,
      email: appConfig.seedAdminEmail,
      fullName: appConfig.seedAdminName,
      role: "admin",
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

async function loadClaims() {
  await initializeStore();
  const result = await getPool().query<{ payload: ClaimRecord }>(
    "SELECT payload FROM claims ORDER BY claim_number"
  );

  return result.rows.map(parsePayloadRow);
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
    storage_key: string;
    external_url: string;
    payload: EvidenceArtifact;
  }>(
    `
      SELECT id, organization_id, storage_key, external_url, payload
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

  return result.rows[0]?.payload;
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

  return result.rows[0]?.payload;
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

async function loadUsers() {
  await initializeStore();
  const result = await getPool().query<{
    id: string;
    organization_id: string;
    email: string;
    full_name: string;
    role: AppRole;
    password_hash: string;
    is_active: boolean;
  }>(
    `
      SELECT id, organization_id, email, full_name, role, password_hash, is_active
      FROM users
      ORDER BY full_name
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    passwordHash: row.password_hash,
    isActive: row.is_active
  }));
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

  return result.rows.map(parsePayloadRow);
}

async function loadPayerConfigurationsByOrganization(organizationId: string, client?: PoolClient) {
  await initializeStore();
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

function ensureActor(actor: WorkflowActor) {
  return {
    ...actor,
    type: actor.role === "admin" ? "admin" : actor.type
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
    const { hashPassword } = await import("../auth.js");
    const seedUsers = createSeedUsers().map((user) => ({
      ...user,
      passwordHash:
        user.role === "admin"
          ? hashPassword(appConfig.seedAdminPassword)
          : user.role === "manager"
            ? hashPassword(appConfig.seedManagerPassword)
            : hashPassword(appConfig.seedOperatorPassword)
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

  initialized = true;
}

export async function listClaims(): Promise<ClaimSummary[]> {
  const claims = await loadClaims();
  return claims.map(toClaimSummary);
}

export async function listClaimsList(): Promise<ClaimsListItemView[]> {
  const claims = await loadClaims();
  return buildClaimsList(claims);
}

export async function listQueue(): Promise<QueueItem[]> {
  return loadQueue();
}

export async function getClaimDetail(
  claimId: string
): Promise<ClaimDetail | undefined> {
  const claim = await loadClaimById(claimId);
  return claim ? toClaimDetail(claim) : undefined;
}

export async function listPilotQueueItems(): Promise<PilotQueueItem[]> {
  const [claims, queue] = await Promise.all([loadClaims(), loadQueue()]);
  return buildPilotQueueItems(claims, queue);
}

export async function getPilotClaimDetail(
  claimId: string
): Promise<PilotClaimDetail | null> {
  const [claims, results, auditEvents, jobs] = await Promise.all([
    loadClaims(),
    loadResults(),
    loadAuditEvents(),
    loadRetrievalJobs()
  ]);

  const detail = buildPilotClaimDetail(claimId, claims, results, auditEvents);

  if (!detail) {
    return null;
  }

  const activeJob = jobs.find(
    (job) =>
      job.claimId === claimId &&
      (job.status === "queued" ||
        job.status === "processing" ||
        job.status === "retrying" ||
        job.status === "failed")
  );

  return {
    ...detail,
    activeRetrievalJob: activeJob
      ? {
          id: activeJob.id,
          status: activeJob.status,
          attempts: activeJob.attempts,
          lastError: activeJob.lastError,
          updatedAt: activeJob.updatedAt,
          connectorName: activeJob.connectorName,
          failureCategory: activeJob.failureCategory,
          retryable: activeJob.retryable,
          reviewReason: activeJob.reviewReason,
          nextAttemptAt: activeJob.availableAt,
          history: activeJob.attemptHistory
        }
      : null
  } as PilotClaimDetail;
}

export async function listResultSummaries(): Promise<ResultSummaryView[]> {
  const [claims, results] = await Promise.all([loadClaims(), loadResults()]);
  return buildResultSummaries(claims, results);
}

export async function getResultDetail(
  resultId: string
): Promise<ResultDetailView | null> {
  const [claims, results] = await Promise.all([loadClaims(), loadResults()]);
  return buildResultDetail(resultId, claims, results);
}

export async function getEvidenceArtifactContent(
  artifactId: string,
  organizationId: string
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

export async function listAuditEvents(): Promise<AuditEventView[]> {
  const auditEvents = await loadAuditEvents();
  return buildAuditLog(auditEvents);
}

export async function listPayerConfigurations(organizationId?: string) {
  if (organizationId) {
    return loadPayerConfigurationsByOrganization(organizationId);
  }

  return loadPayerConfigurations();
}

export async function getPerformanceMetrics(): Promise<PerformanceMetricsView> {
  const [claims, queue, results, jobs] = await Promise.all([
    loadClaims(),
    loadQueue(),
    loadResults(),
    loadRetrievalJobs()
  ]);
  return buildPerformanceMetrics({ claims, queue, results, jobs });
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
        type: actor.role === "admin" ? "admin" : "human",
        avatar: initials(actor.name)
      },
      action: "Exported",
      object: "Result",
      objectId: `export_${Date.now()}`,
      source: "Human",
      payer: "Mixed",
      summary: `${actor.name} exported ${exportableResults.length} structured results for downstream delivery.`,
      sensitivity: "normal",
      category: "Result Export",
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

  const session: UserSession = {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: user.id,
    organizationId: user.organizationId,
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
        type: user.role === "admin" ? "admin" : "human",
        avatar: initials(user.fullName)
      },
      action: "Signed In",
      object: "Configuration",
      objectId: session.id,
      source: "Human",
      payer: "All Payers",
      summary: `${user.fullName} signed in to the Tenio workspace.`,
      sensitivity: "high-risk",
      category: "Access Control",
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
  if (!canManagePayerConfiguration(actor.role)) {
    throw new Error("Only managers and admins can update payer workflow policy.");
  }
}

async function createClaimRecord(
  client: PoolClient,
  input: IntakeClaim,
  actor: WorkflowActor
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
  const claimId = existingClaim?.id ?? buildClaimId(claimNumber);
  const claim: ClaimRecord = existingClaim
    ? {
        ...existingClaim,
        payerId: input.payerId,
        payerName: payerConfig?.payerName ?? input.payerId,
        claimNumber,
        patientName,
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
        notes: notes ?? existingClaim.notes
      }
    : {
        id: claimId,
        organizationId: input.organizationId,
        payerId: input.payerId,
        payerName: payerConfig?.payerName ?? input.payerId,
        claimNumber,
        patientName,
        status: "pending",
        confidence: 0,
        slaAt: providedSlaAt ?? deriveDefaultSlaAt(payerConfig?.defaultSlaHours),
        owner: owner ?? (payerConfig?.autoAssignOwner ? payerConfig.owner : null),
        priority: normalizeIntakePriority(input.priority),
        lastCheckedAt: null,
        normalizedStatusText: sourceStatus ?? "Pending initial retrieval",
        amountCents: null,
        notes: notes ?? "Claim ingested into the workflow queue.",
        evidence: [],
        reviews: [],
        serviceDate: new Date().toISOString().slice(0, 10),
        claimType: "Professional",
        allowedAmountCents: null,
        paidAmountCents: null,
        patientResponsibilityCents: null,
        payerReferenceNumber: null,
        currentPayerResponse: null,
        currentQueue: owner ? "Assigned Intake" : "Pending Retrieval",
        nextAction: "Queue Retrieval",
        totalTouches: 0,
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
    actor: {
      name: actor.name,
      type: actor.role === "admin" ? "admin" : "human",
      avatar: initials(actor.name)
    },
    action: existingClaim ? "Updated Intake" : "Intaked",
    object: "Claim",
    objectId: claim.id,
    source: "Human",
    payer: claim.payerName,
    summary: existingClaim
      ? `${actor.name} refreshed intake details for ${claim.claimNumber}.`
      : `${actor.name} added ${claim.claimNumber} to the claim-status queue.`,
    sensitivity: "normal",
    category: "Claim Intake",
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
  rows: ClaimImportRowInput[],
  actor: WorkflowActor
): Promise<ClaimImportPreviewResult> {
  const [existingClaims, payerConfigurations] = await Promise.all([
    loadClaimsByOrganization(actor.organizationId),
    loadPayerConfigurationsByOrganization(actor.organizationId)
  ]);

  return previewClaimImportRows({
    rows,
    existingClaims,
    payerConfigurations
  });
}

export async function commitClaimImport(
  rows: ClaimImportRowInput[],
  actor: WorkflowActor
) {
  await initializeStore();

  const result = await withTransaction(async (client) => {
    const [existingClaims, payerConfigurations] = await Promise.all([
      loadClaimsByOrganization(actor.organizationId, client),
      loadPayerConfigurationsByOrganization(actor.organizationId, client)
    ]);
    const preview = previewClaimImportRows({
      rows,
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
          priority: row.priority ?? "normal",
          owner: row.owner,
          notes: row.notes,
          slaAt: row.slaAt,
          sourceStatus: row.sourceStatus
        },
        actor
      );
    }

    await insertAuditEvent(client, {
      id: `AUD-${Date.now()}`,
      at: new Date().toISOString(),
      organizationId: actor.organizationId,
      actor: {
        name: actor.name,
        type: actor.role === "admin" ? "admin" : "human",
        avatar: initials(actor.name)
      },
      action: "Imported",
      object: "Configuration",
      objectId: `import_${Date.now()}`,
      source: "Human",
      payer: "Mixed",
      summary: `${actor.name} imported ${preview.summary.createCount} new claims and refreshed ${preview.summary.updateCount} existing claims.`,
      sensitivity: "normal",
      category: "Claim Intake",
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
        type: actor.role === "admin" ? "admin" : "human",
        avatar: initials(actor.name)
      },
      action: "Policy Updated",
      object: "Configuration",
      objectId: updated.id,
      source: "Human",
      payer: updated.payerName,
      summary: `${actor.name} updated workflow policy for ${updated.payerName}.`,
      sensitivity: "high-risk",
      category: "Config Change",
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
  options?: { assignee?: string; note?: string }
) {
  const ensuredActor = ensureActor(actor);

  await initializeStore();

  await withTransaction(async (client) => {
    const claimResult = await client.query<{ payload: ClaimRecord }>(
      "SELECT payload FROM claims WHERE id = $1 FOR UPDATE",
      [claimId]
    );
    const claim = claimResult.rows[0]?.payload;

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
      note: options?.note
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
      actor: {
        name: actor.name,
        type: actor.role === "admin" ? "admin" : "human",
        avatar: initials(actor.name)
      },
      action: "Queued Retrieval",
      object: "Claim",
      objectId: claim.id,
      source: "Human",
      payer: claim.payerName,
      summary: `${actor.name} queued a retrieval job for ${claim.claimNumber}.`,
      sensitivity: "normal",
      category: "Retrieval Queue",
      reason: "Manual re-check requested.",
      claimId: claim.id
    });
  });

  return job;
}

export async function claimNextRetrievalJob(workerName: string) {
  await initializeStore();

  return withTransaction(async (client) => {
    const jobResult = await client.query<{
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
    const row = jobResult.rows[0];

    if (!row) {
      return null;
    }

    const job: RetrievalJobRecord = {
      ...normalizeRetrievalJob(row.payload),
      status: "processing",
      reservedBy: workerName,
      attempts: row.payload.attempts + 1,
      startedAt: new Date().toISOString(),
      lastAttemptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await upsertRetrievalJob(client, job);

    const claimResult = await client.query<{ payload: ClaimRecord }>(
      "SELECT payload FROM claims WHERE id = $1",
      [job.claimId]
    );
    const claim = claimResult.rows[0]?.payload;

    if (!claim) {
      return null;
    }

    return {
      job,
      claim: toClaimDetail(claim)
    };
  });
}

export async function failRetrievalJob(
  jobId: string,
  failure: {
    error: string;
    failureCategory?: RetrievalJobRecord["failureCategory"];
    retryable?: boolean;
    connectorId?: string;
    connectorName?: string;
    observedAt?: string;
    durationMs?: number;
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
        : new Date(Date.now() + 60 * 1000).toISOString(),
      lastError: failure.error,
      failureCategory: failure.failureCategory ?? null,
      retryable: failure.retryable ?? !exhausted,
      connectorId: failure.connectorId ?? job.connectorId,
      connectorName: failure.connectorName ?? job.connectorName,
      lastAttemptedAt: observedAt,
      updatedAt: new Date().toISOString(),
      attemptHistory: [
        {
          attempt: job.attempts,
          connectorId: failure.connectorId ?? job.connectorId,
          connectorName: failure.connectorName ?? job.connectorName,
          executionMode: job.executionMode,
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

    const claimResult = await client.query<{ payload: ClaimRecord }>(
      "SELECT payload FROM claims WHERE id = $1",
      [job.claimId]
    );
    const claim = claimResult.rows[0]?.payload;

    if (claim) {
      await insertAuditEvent(client, {
        id: `AUD-${Date.now()}`,
        at: observedAt,
        actor: { name: "System", type: "system", avatar: "SYS" },
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
    const claim = claimResult.rows[0]?.payload;

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
