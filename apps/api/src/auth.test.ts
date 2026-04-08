import assert from "node:assert/strict";
import test from "node:test";

import {
  canExportResults,
  canImportClaims,
  canManagePayerConfiguration,
  canMutateClaims
} from "./auth.js";

test("canManagePayerConfiguration only allows admins and managers", () => {
  assert.equal(canManagePayerConfiguration("admin"), true);
  assert.equal(canManagePayerConfiguration("manager"), true);
  assert.equal(canManagePayerConfiguration("operator"), false);
  assert.equal(canManagePayerConfiguration("viewer"), false);
});

test("claim mutation and import permissions exclude viewers", () => {
  assert.equal(canMutateClaims("admin"), true);
  assert.equal(canMutateClaims("manager"), true);
  assert.equal(canMutateClaims("operator"), true);
  assert.equal(canMutateClaims("viewer"), false);

  assert.equal(canImportClaims("admin"), true);
  assert.equal(canImportClaims("manager"), true);
  assert.equal(canImportClaims("operator"), true);
  assert.equal(canImportClaims("viewer"), false);
});

test("result export only allows managers and admins", () => {
  assert.equal(canExportResults("admin"), true);
  assert.equal(canExportResults("manager"), true);
  assert.equal(canExportResults("operator"), false);
  assert.equal(canExportResults("viewer"), false);
});
