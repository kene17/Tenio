CREATE TABLE connector_credentials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payer_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  encrypted_payload BYTEA NOT NULL,
  session_cache JSONB,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, connector_id)
);

CREATE INDEX ON connector_credentials(org_id, payer_id);
