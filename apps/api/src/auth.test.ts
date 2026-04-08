import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "@tenio/domain";

test("payer read is limited to owner and manager", () => {
  assert.equal(hasPermission("owner", "payer:read"), true);
  assert.equal(hasPermission("manager", "payer:read"), true);
  assert.equal(hasPermission("operator", "payer:read"), false);
  assert.equal(hasPermission("viewer", "payer:read"), false);
});

test("claim import and write exclude viewers", () => {
  assert.equal(hasPermission("owner", "claims:write"), true);
  assert.equal(hasPermission("manager", "claims:write"), true);
  assert.equal(hasPermission("operator", "claims:write"), true);
  assert.equal(hasPermission("viewer", "claims:write"), false);

  assert.equal(hasPermission("owner", "claims:import"), true);
  assert.equal(hasPermission("manager", "claims:import"), true);
  assert.equal(hasPermission("operator", "claims:import"), true);
  assert.equal(hasPermission("viewer", "claims:import"), false);
});

test("claims export is limited to owner and manager", () => {
  assert.equal(hasPermission("owner", "claims:export"), true);
  assert.equal(hasPermission("manager", "claims:export"), true);
  assert.equal(hasPermission("operator", "claims:export"), false);
  assert.equal(hasPermission("viewer", "claims:export"), false);
});
