UPDATE users
SET role = 'owner'
WHERE role = 'admin';

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('owner', 'manager', 'operator', 'viewer'));

CREATE UNIQUE INDEX IF NOT EXISTS users_one_active_owner_per_org_idx
  ON users (organization_id)
  WHERE role = 'owner' AND is_active = TRUE;
