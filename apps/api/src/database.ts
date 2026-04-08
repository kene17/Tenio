import { Pool, type PoolClient } from "pg";

import { appConfig, getDatabaseHealthMetadata } from "./config.js";

let pool: Pool | null = null;

export function getDatabaseUrl() {
  return appConfig.databaseUrl;
}

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      allowExitOnIdle: true
    });
  }

  return pool;
}

export async function checkDatabaseHealth() {
  try {
    const result = await getPool().query<{ now: string }>("SELECT NOW()::text AS now");

    return {
      ok: true,
      ...getDatabaseHealthMetadata(),
      checkedAt: result.rows[0]?.now ?? new Date().toISOString()
    };
  } catch (error) {
    return {
      ok: false,
      ...getDatabaseHealthMetadata(),
      error: error instanceof Error ? error.message : "Unknown database error"
    };
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
