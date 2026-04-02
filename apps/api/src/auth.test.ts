import assert from "node:assert/strict";
import test from "node:test";

import { canManagePayerConfiguration } from "./auth.js";

test("canManagePayerConfiguration only allows admins and managers", () => {
  assert.equal(canManagePayerConfiguration("admin"), true);
  assert.equal(canManagePayerConfiguration("manager"), true);
  assert.equal(canManagePayerConfiguration("operator"), false);
  assert.equal(canManagePayerConfiguration("viewer"), false);
});
