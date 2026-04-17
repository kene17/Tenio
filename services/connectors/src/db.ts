import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@127.0.0.1:5433/tenio",
      allowExitOnIdle: true
    });
  }
  return pool;
}

export type ConnectorCredentialRow = {
  encrypted_payload: Buffer;
  session_cache: Record<string, unknown> | null;
  last_verified_at: string | null;
};

/**
 * Fetches the raw credential row for an org + connector pair.
 * Returns null if no credentials have been stored yet.
 */
export async function getConnectorCredentialRow(
  orgId: string,
  connectorId: string
): Promise<ConnectorCredentialRow | null> {
  const result = await getPool().query<ConnectorCredentialRow>(
    `SELECT encrypted_payload, session_cache, last_verified_at
       FROM connector_credentials
      WHERE org_id = $1
        AND connector_id = $2
      LIMIT 1`,
    [orgId, connectorId]
  );
  return result.rows[0] ?? null;
}
