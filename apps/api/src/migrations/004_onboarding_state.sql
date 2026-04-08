CREATE TABLE IF NOT EXISTS organization_onboarding_state (
  organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  baseline_active_user_count INTEGER NOT NULL,
  baseline_open_claim_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_onboarding_state (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  welcome_dismissed_at TIMESTAMPTZ NULL,
  queue_tour_completed_at TIMESTAMPTZ NULL,
  first_claim_detail_opened_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS user_onboarding_state_user_idx
  ON user_onboarding_state (user_id);
