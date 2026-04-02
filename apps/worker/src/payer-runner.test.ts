import assert from "node:assert/strict";
import test from "node:test";

import {
  runPayerRetrieval,
  type AetnaClaimStatusApiPayload
} from "./payer-runner.js";

async function withFixtureConnector<T>(callback: () => Promise<T>) {
  const previousBaseUrl = process.env.TENIO_AETNA_API_BASE_URL;
  const previousToken = process.env.TENIO_AETNA_API_TOKEN;
  delete process.env.TENIO_AETNA_API_BASE_URL;
  delete process.env.TENIO_AETNA_API_TOKEN;

  try {
    return await callback();
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.TENIO_AETNA_API_BASE_URL;
    } else {
      process.env.TENIO_AETNA_API_BASE_URL = previousBaseUrl;
    }

    if (previousToken === undefined) {
      delete process.env.TENIO_AETNA_API_TOKEN;
    } else {
      process.env.TENIO_AETNA_API_TOKEN = previousToken;
    }
  }
}

function buildTask(claimNumber: string) {
  return {
    claimId: `CLM-${claimNumber}`,
    claimNumber,
    patientName: "Jane Example",
    payerId: "payer_aetna",
    payerName: "Aetna",
    sessionMode: "api" as const,
    attempt: 1,
    maxAttempts: 3
  };
}

test("runPayerRetrieval uses the structured Aetna connector for paid claims", { concurrency: false }, async () => {
  const snapshot = await withFixtureConnector(() => runPayerRetrieval(buildTask("10001")));

  assert.equal(snapshot.connectorId, "aetna-claim-status-api");
  assert.equal(snapshot.executionMode, "api");
  assert.equal(snapshot.evidenceArtifacts.length, 2);
  assert.ok(snapshot.connectorPayloadJson);

  const payload = JSON.parse(snapshot.connectorPayloadJson) as AetnaClaimStatusApiPayload;
  assert.equal(payload.statusCode, "PAID_IN_FULL");
  assert.equal(payload.dataComplete, true);
  assert.match(snapshot.portalText, /Aetna claim status API payload/);
});

test("runPayerRetrieval fixture returns review and denial scenarios for Aetna", { concurrency: false }, async () => {
  const reviewSnapshot = await withFixtureConnector(() =>
    runPayerRetrieval(buildTask("204938"))
  );
  const deniedSnapshot = await withFixtureConnector(() =>
    runPayerRetrieval(buildTask("204821"))
  );

  const reviewPayload = JSON.parse(
    reviewSnapshot.connectorPayloadJson ?? "null"
  ) as AetnaClaimStatusApiPayload;
  const deniedPayload = JSON.parse(
    deniedSnapshot.connectorPayloadJson ?? "null"
  ) as AetnaClaimStatusApiPayload;

  assert.equal(reviewPayload.statusCode, "PENDING_MEDICAL_REVIEW");
  assert.equal(deniedPayload.statusCode, "DENIED");
  assert.match(deniedSnapshot.portalText, /Denied/);
});

test("runPayerRetrieval fixture returns retryable incomplete Aetna data", { concurrency: false }, async () => {
  const snapshot = await withFixtureConnector(() =>
    runPayerRetrieval(buildTask("missing-claim"))
  );
  const payload = JSON.parse(snapshot.connectorPayloadJson ?? "null") as AetnaClaimStatusApiPayload;

  assert.equal(payload.statusCode, "ADDITIONAL_INFO_REQUIRED");
  assert.equal(payload.dataComplete, false);
  assert.match(snapshot.portalText, /Data Complete: false/);
});

test("runPayerRetrieval falls back to the browser connector for other payers", { concurrency: false }, async () => {
  const snapshot = await runPayerRetrieval({
    claimId: "CLM-UHC-1",
    claimNumber: "UHC-1",
    patientName: "Jane Example",
    payerId: "payer_uhc",
    payerName: "UnitedHealthcare",
    sessionMode: "browser",
    attempt: 1,
    maxAttempts: 3
  });

  assert.equal(snapshot.connectorId, "portal-browser-fallback");
  assert.equal(snapshot.executionMode, "browser");
  assert.equal(snapshot.connectorPayloadJson, null);
  assert.equal(snapshot.evidenceArtifacts.length, 1);
});
