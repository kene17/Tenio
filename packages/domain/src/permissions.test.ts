import assert from "node:assert/strict";
import test from "node:test";

import {
  hasPermission,
  normalizeUserRole,
  PERMISSIONS,
  type Permission,
  type UserRole
} from "./index.js";

const ALL_ROLES: UserRole[] = ["owner", "manager", "operator", "viewer"];
const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

test("normalizeUserRole: admin legacy maps to owner", () => {
  assert.equal(normalizeUserRole("admin"), "owner");
});

test("normalizeUserRole: null and garbage return null", () => {
  assert.equal(normalizeUserRole(null), null);
  assert.equal(normalizeUserRole(undefined), null);
  assert.equal(normalizeUserRole("superuser"), null);
});

test("normalizeUserRole: valid roles round-trip", () => {
  for (const role of ALL_ROLES) {
    assert.equal(normalizeUserRole(role), role);
  }
});

test("hasPermission: viewer is read-mostly; cannot write claims", () => {
  assert.equal(hasPermission("viewer", "claims:read"), true);
  assert.equal(hasPermission("viewer", "claims:write"), false);
  assert.equal(hasPermission("viewer", "queue:work"), false);
});

test("hasPermission: owner can perform restricted actions", () => {
  assert.equal(hasPermission("owner", "payer:write"), true);
  assert.equal(hasPermission("owner", "users:invite"), true);
  assert.equal(hasPermission("manager", "payer:write"), false);
});

test("PERMISSIONS matrix: each permission is granted to at least one role", () => {
  for (const permission of ALL_PERMISSIONS) {
    const count = ALL_ROLES.filter((role) => hasPermission(role, permission)).length;
    assert.ok(count > 0, `expected at least one role for ${permission}`);
  }
});

test("PERMISSIONS matrix: grant lists only contain known roles", () => {
  for (const permission of ALL_PERMISSIONS) {
    for (const role of PERMISSIONS[permission]) {
      assert.ok(
        ALL_ROLES.includes(role as UserRole),
        `${permission} lists unknown role ${String(role)}`
      );
    }
  }
});
