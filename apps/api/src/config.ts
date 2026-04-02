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
  sessionTtlHours: Number(process.env.TENIO_SESSION_TTL_HOURS ?? 12),
  migrationTable: "schema_migrations",
  seedOrgId: readEnv("TENIO_SEED_ORG_ID", "org_demo"),
  seedOrgName: readEnv("TENIO_SEED_ORG_NAME", "Acme Healthcare RCM"),
  seedAdminEmail: readEnv("TENIO_SEED_ADMIN_EMAIL", "ops.admin@acme-rcm.test"),
  seedAdminName: readEnv("TENIO_SEED_ADMIN_NAME", "Jordan Diaz"),
  seedAdminPassword: readEnv("TENIO_SEED_ADMIN_PASSWORD", "tenio-admin-demo"),
  seedManagerEmail: readEnv("TENIO_SEED_MANAGER_EMAIL", "queue.manager@acme-rcm.test"),
  seedManagerName: readEnv("TENIO_SEED_MANAGER_NAME", "Sarah Chen"),
  seedManagerPassword: readEnv("TENIO_SEED_MANAGER_PASSWORD", "tenio-manager-demo"),
  seedOperatorEmail: readEnv("TENIO_SEED_OPERATOR_EMAIL", "operator.one@acme-rcm.test"),
  seedOperatorName: readEnv("TENIO_SEED_OPERATOR_NAME", "Marcus Williams"),
  seedOperatorPassword: readEnv("TENIO_SEED_OPERATOR_PASSWORD", "tenio-operator-demo"),
  supportEmail: readEnv(
    "NEXT_PUBLIC_PILOT_SUPPORT_EMAIL",
    "pilot-support@example.com"
  )
};

export function getDatabaseHealthMetadata() {
  return {
    connection: redactConnectionString(appConfig.databaseUrl)
  };
}

export function hashForDebug(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
