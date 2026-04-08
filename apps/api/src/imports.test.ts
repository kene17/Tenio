import assert from "node:assert/strict";
import test from "node:test";

import { adaptImportRows } from "./import/pms/index.js";
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

test("previewClaimImportRows preserves Canada metadata and derives jurisdiction defaults from payer configuration", () => {
  const payerConfigurations = [
    {
      ...createSeedPayerConfigurations("org_demo")[0]!,
      payerId: "payer_sun_life",
      payerName: "Sun Life",
      jurisdiction: "ca" as const,
      countryCode: "CA" as const
    }
  ];

  const preview = previewClaimImportRows({
    rows: [
      {
        claimNumber: "CLM-CA-1001",
        patientName: "Marie Tremblay",
        payerId: "payer_sun_life",
        provinceOfService: "on",
        claimType: "Dental",
        priority: "high"
      }
    ],
    existingClaims: [],
    payerConfigurations
  });

  assert.equal(preview.summary.createCount, 1);
  assert.equal(preview.rows[0]?.action, "create");
  assert.equal(preview.rows[0]?.jurisdiction, "ca");
  assert.equal(preview.rows[0]?.countryCode, "CA");
  assert.equal(preview.rows[0]?.provinceOfService, "ON");
  assert.equal(preview.rows[0]?.claimType, "dental");
});

test("adaptImportRows maps the Dentrix shell headers into Tenio import rows", () => {
  const [row] = adaptImportRows(
    [
      {
        "Claim #": "DENT-1001",
        "Patient Name": "Julie Bouchard",
        Carrier: "Sun Life / PSHCP",
        Province: "on",
        "Assigned To": "Ottawa Pilot",
        Status: "Pending coordination review",
        Notes: "Federal employee dental claim",
      }
    ],
    "dentrix_csv_shell"
  );

  assert.equal(row?.claimNumber, "DENT-1001");
  assert.equal(row?.patientName, "Julie Bouchard");
  assert.equal(row?.payerName, "Sun Life / PSHCP");
  assert.equal(row?.provinceOfService, "on");
  assert.equal(row?.claimType, "dental");
  assert.equal(row?.owner, "Ottawa Pilot");
  assert.equal(row?.sourceStatus, "Pending coordination review");
});
