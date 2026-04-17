/**
 * Sun Life PSHCP integration smoke test.
 *
 * Required env vars (all must be set — test is skipped otherwise so CI never fails):
 *   SUN_LIFE_TEST_USERNAME      — provider portal username
 *   SUN_LIFE_TEST_PASSWORD      — provider portal password
 *   SUN_LIFE_TEST_CLAIM_NUMBER  — a real claim number to look up
 *   SUN_LIFE_TEST_ORG_ID        — org_id that has credentials in connector_credentials
 *   DATABASE_URL                — postgres connection string (for credential lookup)
 *   TENIO_CREDENTIAL_ENCRYPTION_KEY — 32-byte hex encryption key
 *
 * Run with:
 *   SUN_LIFE_TEST_USERNAME=xxx SUN_LIFE_TEST_PASSWORD=yyy \
 *   SUN_LIFE_TEST_CLAIM_NUMBER=zzz SUN_LIFE_TEST_ORG_ID=aaa \
 *   DATABASE_URL=postgres://... TENIO_CREDENTIAL_ENCRYPTION_KEY=... \
 *   node --test src/sun-life.test.ts
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { executeSunLifePshcp } from "./sun-life.js";

const REQUIRED_VARS = [
  "SUN_LIFE_TEST_USERNAME",
  "SUN_LIFE_TEST_PASSWORD",
  "SUN_LIFE_TEST_CLAIM_NUMBER",
  "SUN_LIFE_TEST_ORG_ID",
  "DATABASE_URL",
  "TENIO_CREDENTIAL_ENCRYPTION_KEY"
] as const;

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
const skip = missing.length > 0;

if (skip) {
  console.log(
    `[sun-life.test] Skipping — missing env vars: ${missing.join(", ")}`
  );
}

describe("executeSunLifePshcp smoke test", { skip }, () => {
  let claimNumber: string;
  let orgId: string;

  before(() => {
    claimNumber = process.env["SUN_LIFE_TEST_CLAIM_NUMBER"]!;
    orgId = process.env["SUN_LIFE_TEST_ORG_ID"]!;
  });

  it("returns a well-formed AgentObservation (success or handled failure)", async () => {
    const observation = await executeSunLifePshcp({
      connectorId: "sun-life-pshcp-browser",
      mode: "browser",
      orgId,
      claimContext: {
        claimId: "test-claim-id",
        claimNumber,
        orgId,
        payerId: "payer_sun_life"
      }
    });

    // Always must have observationVersion = 1
    assert.equal(observation.observationVersion, 1);

    // Always must have a non-empty summary
    assert.ok(
      typeof observation.summary === "string" && observation.summary.length > 0,
      "summary must be a non-empty string"
    );

    // Always must have a valid ISO timestamp
    assert.ok(
      !isNaN(Date.parse(observation.observedAt)),
      "observedAt must be a valid ISO timestamp"
    );

    // durationMs must be a non-negative number
    assert.ok(
      typeof observation.durationMs === "number" && observation.durationMs >= 0,
      "durationMs must be >= 0"
    );

    // connectorId must match
    assert.equal(observation.connectorId, "sun-life-pshcp-browser");

    // executionMode must be "browser"
    assert.equal(observation.executionMode, "browser");

    if (observation.success) {
      // Success path: connectorPayloadJson must be valid JSON with required fields
      assert.ok(
        typeof observation.connectorPayloadJson === "string",
        "connectorPayloadJson must be a string on success"
      );

      const payload = JSON.parse(observation.connectorPayloadJson) as Record<
        string,
        unknown
      >;
      assert.equal(
        payload["connectorId"],
        "sun-life-pshcp-browser",
        "payload.connectorId must match"
      );
      assert.equal(
        payload["claimNumber"],
        claimNumber,
        "payload.claimNumber must match input"
      );
      assert.ok(
        typeof payload["statusText"] === "string" &&
          (payload["statusText"] as string).length > 0,
        "payload.statusText must be a non-empty string"
      );

      // portalTextSnippet must be present and capped at 800 chars
      assert.ok(
        typeof observation.portalTextSnippet === "string",
        "portalTextSnippet must be a string on success"
      );
      assert.ok(
        (observation.portalTextSnippet as string).length <= 800,
        "portalTextSnippet must not exceed 800 chars"
      );

      // retryable must be false on success
      assert.equal(observation.retryable, false);
      assert.equal(observation.failureCategory, null);
    } else {
      // Failure path: failureCategory must be one of the valid values
      const validCategories = [
        "authentication",
        "data_missing",
        "network",
        "portal_changed"
      ];
      assert.ok(
        validCategories.includes(observation.failureCategory as string),
        `failureCategory must be one of ${validCategories.join(", ")}, got: ${String(observation.failureCategory)}`
      );

      // retryable must be consistent with category
      if (
        observation.failureCategory === "authentication" ||
        observation.failureCategory === "data_missing"
      ) {
        assert.equal(
          observation.retryable,
          false,
          `${observation.failureCategory} failures must not be retryable`
        );
      }
      if (observation.failureCategory === "network") {
        assert.equal(
          observation.retryable,
          true,
          "network failures must be retryable"
        );
      }
    }
  });

  it("returns authentication failure when credentials are wrong", async () => {
    const observation = await executeSunLifePshcp({
      connectorId: "sun-life-pshcp-browser",
      mode: "browser",
      orgId: "non-existent-org-id-for-testing",
      claimContext: {
        claimId: "test-claim-id",
        claimNumber,
        orgId: "non-existent-org-id-for-testing",
        payerId: "payer_sun_life"
      }
    });

    assert.equal(observation.observationVersion, 1);
    assert.equal(observation.success, false);
    assert.equal(observation.failureCategory, "authentication");
    assert.equal(observation.retryable, false);
    assert.ok(
      observation.summary.length > 0,
      "summary must explain the auth failure"
    );
  });
});
