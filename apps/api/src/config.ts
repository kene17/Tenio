import { createHash } from "node:crypto";

function readEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

function readOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readEnvAlias(name: string, alias: string, fallback?: string) {
  const value = process.env[name]?.trim() ?? process.env[alias]?.trim();

  if (value) {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${name} (or ${alias})`);
}

function readBooleanEnv(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return value === "1" || value === "true" || value === "yes";
}

function requireProductionSecret(name: string, fallback: string) {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required production environment variable: ${name}`);
  }

  return fallback;
}

function redactConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);

    if (url.password) {
      url.password = "***";
    }

    return url.toString();
  } catch {
    return "invalid-connection-string";
  }
}

export const appConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: readEnv(
    "DATABASE_URL",
    "postgres://postgres:postgres@127.0.0.1:5433/tenio"
  ),
  apiKey: requireProductionSecret("TENIO_API_KEY", "tenio-local-api-key"),
  webServiceToken: requireProductionSecret(
    "TENIO_WEB_SERVICE_TOKEN",
    "tenio-local-web-service-token"
  ),
  workerServiceToken: requireProductionSecret(
    "TENIO_WORKER_SERVICE_TOKEN",
    "tenio-local-worker-service-token"
  ),
  aiServiceUrl: readEnv("AI_SERVICE_URL", "http://127.0.0.1:8000"),
  aiServiceToken: requireProductionSecret(
    "TENIO_AI_SERVICE_TOKEN",
    "tenio-local-ai-service-token"
  ),
  evidenceStorageBackend: readEnv("TENIO_EVIDENCE_STORAGE_BACKEND", "filesystem"),
  evidenceStorageDir: readOptionalEnv("TENIO_EVIDENCE_STORAGE_DIR"),
  evidenceRetentionDays: Number(process.env.TENIO_EVIDENCE_RETENTION_DAYS ?? 30),
  evidenceS3Bucket: readOptionalEnv("TENIO_EVIDENCE_S3_BUCKET"),
  evidenceS3Region: readOptionalEnv("TENIO_EVIDENCE_S3_REGION"),
  evidenceS3Endpoint: readOptionalEnv("TENIO_EVIDENCE_S3_ENDPOINT"),
  evidenceS3AccessKeyId: readOptionalEnv("TENIO_EVIDENCE_S3_ACCESS_KEY_ID"),
  evidenceS3SecretAccessKey: readOptionalEnv("TENIO_EVIDENCE_S3_SECRET_ACCESS_KEY"),
  evidenceS3SessionToken: readOptionalEnv("TENIO_EVIDENCE_S3_SESSION_TOKEN"),
  evidenceS3Prefix: readOptionalEnv("TENIO_EVIDENCE_S3_PREFIX"),
  evidenceS3ForcePathStyle: readBooleanEnv("TENIO_EVIDENCE_S3_FORCE_PATH_STYLE", true),
  sessionTtlHours: Number(process.env.TENIO_SESSION_TTL_HOURS ?? 12),
  migrationTable: "schema_migrations",
  seedOrgId: readEnv("TENIO_SEED_ORG_ID", "org_demo"),
  seedOrgName: readEnv("TENIO_SEED_ORG_NAME", "Acme Healthcare RCM"),
  seedOwnerEmail: readEnvAlias(
    "TENIO_SEED_OWNER_EMAIL",
    "TENIO_SEED_ADMIN_EMAIL",
    "ops.owner@acme-rcm.test"
  ),
  seedOwnerName: readEnvAlias(
    "TENIO_SEED_OWNER_NAME",
    "TENIO_SEED_ADMIN_NAME",
    "Jordan Diaz"
  ),
  seedOwnerPassword: readEnvAlias(
    "TENIO_SEED_OWNER_PASSWORD",
    "TENIO_SEED_ADMIN_PASSWORD",
    "tenio-owner-demo"
  ),
  seedManagerEmail: readEnv("TENIO_SEED_MANAGER_EMAIL", "queue.manager@acme-rcm.test"),
  seedManagerName: readEnv("TENIO_SEED_MANAGER_NAME", "Sarah Chen"),
  seedManagerPassword: readEnv("TENIO_SEED_MANAGER_PASSWORD", "tenio-manager-demo"),
  seedOperatorEmail: readEnv("TENIO_SEED_OPERATOR_EMAIL", "operator.one@acme-rcm.test"),
  seedOperatorName: readEnv("TENIO_SEED_OPERATOR_NAME", "Marcus Williams"),
  seedOperatorPassword: readEnv("TENIO_SEED_OPERATOR_PASSWORD", "tenio-operator-demo"),
  supportEmail: readEnv("NEXT_PUBLIC_PILOT_SUPPORT_EMAIL", "pilot-support@example.com"),
  sentryDsn: readOptionalEnv("SENTRY_DSN")
};

export function getDatabaseHealthMetadata() {
  return {
    connection: redactConnectionString(appConfig.databaseUrl)
  };
}

export function getEvidenceStorageHealthMetadata() {
  if (appConfig.evidenceStorageBackend === "s3") {
    return {
      backend: appConfig.evidenceStorageBackend,
      retentionDays: appConfig.evidenceRetentionDays,
      bucket: appConfig.evidenceS3Bucket ? hashForDebug(appConfig.evidenceS3Bucket) : "missing",
      endpoint: appConfig.evidenceS3Endpoint
        ? hashForDebug(appConfig.evidenceS3Endpoint)
        : "aws-default",
      pathStyle: appConfig.evidenceS3ForcePathStyle
    };
  }

  return {
    backend: appConfig.evidenceStorageBackend,
    retentionDays: appConfig.evidenceRetentionDays,
    location:
      appConfig.evidenceStorageDir ? hashForDebug(appConfig.evidenceStorageDir) : "default-local"
  };
}

export function getS3EvidenceStorageConfig() {
  if (appConfig.evidenceStorageBackend !== "s3") {
    return null;
  }

  if (
    !appConfig.evidenceS3Bucket ||
    !appConfig.evidenceS3Region ||
    !appConfig.evidenceS3AccessKeyId ||
    !appConfig.evidenceS3SecretAccessKey
  ) {
    throw new Error(
      "TENIO_EVIDENCE_S3_BUCKET, TENIO_EVIDENCE_S3_REGION, TENIO_EVIDENCE_S3_ACCESS_KEY_ID, and TENIO_EVIDENCE_S3_SECRET_ACCESS_KEY are required when TENIO_EVIDENCE_STORAGE_BACKEND=s3"
    );
  }

  return {
    bucket: appConfig.evidenceS3Bucket,
    region: appConfig.evidenceS3Region,
    endpoint: appConfig.evidenceS3Endpoint,
    accessKeyId: appConfig.evidenceS3AccessKeyId,
    secretAccessKey: appConfig.evidenceS3SecretAccessKey,
    sessionToken: appConfig.evidenceS3SessionToken,
    prefix: appConfig.evidenceS3Prefix?.replace(/^\/+|\/+$/g, "") ?? "",
    forcePathStyle: appConfig.evidenceS3ForcePathStyle
  };
}

export function hashForDebug(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
