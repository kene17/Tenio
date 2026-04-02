import assert from "node:assert/strict";
import test from "node:test";

import { previewClaimImportRows } from "./domain/imports.js";
import { createSeedState } from "./domain/pilot-state.js";
import { createSeedPayerConfigurations } from "./domain/prod-state.js";

test("previewClaimImportRows classifies create, update, invalid, and duplicate rows", () => {
  const seed = createSeedState();
  const payerConfigurations = createSeedPayerConfigurations("org_demo");

  const preview = previewClaimImportRows({
    rows: [
      {
        claimNumber: "CLM-900001",
        patientName: "Alex Smith",
        payerId: "payer_aetna",
        priority: "high"
      },
      {
        claimNumber: seed.claims[0]?.claimNumber,
        patientName: "Rosa Martinez",
        payerName: "Aetna",
        priority: "normal"
      },
      {
        claimNumber: "CLM-900001",
        patientName: "Duplicate Row",
        payerId: "payer_aetna"
      },
      {
        claimNumber: "",
        patientName: "",
        payerId: "missing_payer",
        priority: "urgentish"
      }
    ],
    existingClaims: seed.claims,
    payerConfigurations
  });

  assert.equal(preview.summary.createCount, 1);
  assert.equal(preview.summary.updateCount, 1);
  assert.equal(preview.summary.duplicateInFileCount, 1);
  assert.equal(preview.summary.invalidCount, 1);
  assert.equal(preview.rows[0]?.action, "create");
  assert.equal(preview.rows[1]?.action, "update");
  assert.equal(preview.rows[2]?.action, "duplicate_in_file");
  assert.equal(preview.rows[3]?.action, "invalid");
});

test("previewClaimImportRows does not let an invalid earlier row poison a later valid duplicate", () => {
  const seed = createSeedState();
  const payerConfigurations = createSeedPayerConfigurations("org_demo");

  const preview = previewClaimImportRows({
    rows: [
      {
        claimNumber: "CLM-910001",
        patientName: "",
        payerId: "payer_aetna"
      },
      {
        claimNumber: "CLM-910001",
        patientName: "Valid Row",
        payerId: "payer_aetna"
      }
    ],
    existingClaims: seed.claims,
    payerConfigurations
  });

  assert.equal(preview.summary.invalidCount, 1);
  assert.equal(preview.summary.duplicateInFileCount, 0);
  assert.equal(preview.rows[0]?.action, "invalid");
  assert.equal(preview.rows[1]?.action, "create");
});
