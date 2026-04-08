CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  retrieval_job_id TEXT NOT NULL REFERENCES retrieval_jobs(id) ON DELETE CASCADE,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  lease_owner TEXT NULL,
  lease_expires_at TIMESTAMPTZ NULL,
  heartbeat_at TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS agent_runs_claim_status_idx
  ON agent_runs (claim_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS agent_runs_job_status_idx
  ON agent_runs (retrieval_job_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS agent_steps (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  directive_kind TEXT NOT NULL,
  tool_name TEXT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  payload JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_steps_run_step_idx
  ON agent_steps (agent_run_id, step_number);

CREATE UNIQUE INDEX IF NOT EXISTS agent_steps_run_idempotency_idx
  ON agent_steps (agent_run_id, idempotency_key);
