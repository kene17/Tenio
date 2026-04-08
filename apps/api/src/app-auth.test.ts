import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "./app.js";
import { hashPassword } from "./auth.js";
import { appConfig } from "./config.js";
import { getPool } from "./database.js";
import { persistEvidenceArtifact } from "./evidence-storage.js";

type SessionPayload = {
  id: string;
  userId: string;
  organizationId: string;
  role: "admin" | "manager" | "operator" | "viewer";
  fullName: string;
  email: string;
  expiresAt: string;
};

const serviceHeaders = {
  "x-tenio-service-token": appConfig.webServiceToken
};

function authHeaders(session: SessionPayload) {
  return {
    ...serviceHeaders,
    "x-tenio-session-id": session.id,
    "x-tenio-user-id": session.userId
  };
}

async function login(email: string, password: string) {
  const app = await buildApp();

  try {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: {
        ...serviceHeaders,
        "content-type": "application/json"
      },
      payload: {
        email,
        password
      }
    });

    assert.equal(response.statusCode, 200);
    return JSON.parse(response.body).session as SessionPayload;
  } finally {
    await app.close();
  }
}

async function upsertTestSession(params: {
  userId: string;
  organizationId: string;
  organizationName: string;
  email: string;
  fullName: string;
  role: "viewer" | "operator";
  sessionId: string;
}) {
  const pool = getPool();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await pool.query(
    `
      INSERT INTO organizations (id, name, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW()
    `,
    [params.organizationId, params.organizationName]
  );

  await pool.query(
    `
      INSERT INTO users (id, organization_id, email, full_name, role, password_hash, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
      ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        password_hash = EXCLUDED.password_hash,
        is_active = TRUE,
        updated_at = NOW()
    `,
    [
      params.userId,
      params.organizationId,
      params.email,
      params.fullName,
      params.role,
      hashPassword("test-password")
    ]
  );

  await pool.query(
    `
      INSERT INTO user_sessions (id, user_id, organization_id, expires_at, revoked_at)
      VALUES ($1, $2, $3, $4::timestamptz, NULL)
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        organization_id = EXCLUDED.organization_id,
        expires_at = EXCLUDED.expires_at,
        revoked_at = NULL
    `,
    [params.sessionId, params.userId, params.organizationId, expiresAt]
  );

  return {
    id: params.sessionId,
    userId: params.userId,
    organizationId: params.organizationId,
    role: params.role,
    fullName: params.fullName,
    email: params.email,
    expiresAt
  } satisfies SessionPayload;
}

async function seedStoredEvidenceArtifact() {
  const storedArtifact = await persistEvidenceArtifact("CLM-204938", {
    id: "artifact_auth_scoped_test",
    kind: "note",
    label: "Scoped auth test artifact",
    url: "inline://artifact_auth_scoped_test",
    createdAt: new Date().toISOString(),
    inlineContentBase64: Buffer.from("scoped evidence").toString("base64")
  });

  await getPool().query(
    `
      INSERT INTO evidence_artifacts (
        id,
        organization_id,
        claim_id,
        result_id,
        kind,
        label,
        storage_key,
        external_url,
        created_at,
        payload
      )
      VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8::timestamptz, $9::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        claim_id = EXCLUDED.claim_id,
        kind = EXCLUDED.kind,
        label = EXCLUDED.label,
        storage_key = EXCLUDED.storage_key,
        external_url = EXCLUDED.external_url,
        created_at = EXCLUDED.created_at,
        payload = EXCLUDED.payload
    `,
    [
      storedArtifact.id,
      appConfig.seedOrgId,
      "CLM-204938",
      storedArtifact.kind,
      storedArtifact.label,
      storedArtifact.storageKey,
      storedArtifact.url,
      storedArtifact.createdAt,
      JSON.stringify(storedArtifact)
    ]
  );

  return storedArtifact.id;
}

test("sensitive routes reject unauthenticated web-service requests", async () => {
  const app = await buildApp();

  try {
    const commonHeaders = {
      ...serviceHeaders,
      "content-type": "application/json"
    };

    const [preview, intake, workflowAction, retrieve, exportResults] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/claims/import/preview",
        headers: commonHeaders,
        payload: { rows: [] }
      }),
      app.inject({
        method: "POST",
        url: "/claims/intake",
        headers: commonHeaders,
        payload: {
          organizationId: appConfig.seedOrgId,
          payerId: "payer_aetna",
          claimNumber: "AUTH-1001",
          patientName: "Unauthenticated User",
          priority: "normal"
        }
      }),
      app.inject({
        method: "POST",
        url: "/claims/CLM-203657/workflow-action",
        headers: commonHeaders,
        payload: { action: "add_note", note: "test" }
      }),
      app.inject({
        method: "POST",
        url: "/claims/CLM-203657/retrieve",
        headers: serviceHeaders
      }),
      app.inject({
        method: "POST",
        url: "/results/export",
        headers: serviceHeaders
      })
    ]);

    assert.equal(preview.statusCode, 403);
    assert.equal(intake.statusCode, 403);
    assert.equal(workflowAction.statusCode, 403);
    assert.equal(retrieve.statusCode, 403);
    assert.equal(exportResults.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("operator can work claims but cannot export results or change payer policy", async () => {
  const operatorSession = await login(appConfig.seedOperatorEmail, appConfig.seedOperatorPassword);
  const app = await buildApp();

  try {
    const preview = await app.inject({
      method: "POST",
      url: "/claims/import/preview",
      headers: {
        ...authHeaders(operatorSession),
        "content-type": "application/json"
      },
      payload: {
        rows: [
          {
            claimNumber: "AUTH-OP-1001",
            patientName: "Operator Preview",
            payerId: "payer_aetna"
          }
        ]
      }
    });
    assert.equal(preview.statusCode, 200);

    const intake = await app.inject({
      method: "POST",
      url: "/claims/intake",
      headers: {
        ...authHeaders(operatorSession),
        "content-type": "application/json"
      },
      payload: {
        organizationId: appConfig.seedOrgId,
        payerId: "payer_sun_life",
        claimNumber: "AUTH-OP-1002",
        patientName: "Operator Intake",
        jurisdiction: "ca",
        countryCode: "CA",
        provinceOfService: "ON",
        claimType: "paramedical",
        serviceProviderType: "physiotherapist",
        serviceCode: "97110",
        serviceDate: "2026-04-07",
        billedAmountCents: 12500,
        priority: "high"
      }
    });
    assert.equal(intake.statusCode, 200);

    const followUp = await app.inject({
      method: "POST",
      url: "/claims/CLM-203657/workflow-action",
      headers: {
        ...authHeaders(operatorSession),
        "content-type": "application/json"
      },
      payload: {
        action: "log_follow_up",
        outcome: "pending_payer",
        note: "Checked the portal and documented the pending state.",
        nextAction: "Check again tomorrow"
      }
    });
    assert.equal(followUp.statusCode, 200);

    const retrieve = await app.inject({
      method: "POST",
      url: "/claims/CLM-203657/retrieve",
      headers: authHeaders(operatorSession)
    });
    assert.equal(retrieve.statusCode, 200);

    const exportResults = await app.inject({
      method: "POST",
      url: "/results/export",
      headers: authHeaders(operatorSession)
    });
    assert.equal(exportResults.statusCode, 403);

    const updatePolicy = await app.inject({
      method: "POST",
      url: "/configuration/payers/payer_aetna/policy",
      headers: {
        ...authHeaders(operatorSession),
        "content-type": "application/json"
      },
      payload: {
        owner: "Sarah Chen",
        reviewThreshold: 0.85,
        escalationThreshold: 0.6,
        defaultSlaHours: 24,
        autoAssignOwner: true
      }
    });
    assert.equal(updatePolicy.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("viewer cannot import or mutate claims", async () => {
  const viewerSession = await upsertTestSession({
    userId: "user_viewer_test",
    organizationId: appConfig.seedOrgId,
    organizationName: appConfig.seedOrgName,
    email: "viewer.one@acme-rcm.test",
    fullName: "Taylor Viewer",
    role: "viewer",
    sessionId: "session_viewer_test"
  });
  const app = await buildApp();

  try {
    const commonHeaders = {
      ...authHeaders(viewerSession),
      "content-type": "application/json"
    };

    const [preview, intake, workflowAction, retrieve] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/claims/import/preview",
        headers: commonHeaders,
        payload: { rows: [] }
      }),
      app.inject({
        method: "POST",
        url: "/claims/intake",
        headers: commonHeaders,
        payload: {
          organizationId: appConfig.seedOrgId,
          payerId: "payer_aetna",
          claimNumber: "AUTH-VIEW-1001",
          patientName: "Viewer Intake",
          priority: "normal"
        }
      }),
      app.inject({
        method: "POST",
        url: "/claims/CLM-203657/workflow-action",
        headers: commonHeaders,
        payload: { action: "add_note", note: "viewer note" }
      }),
      app.inject({
        method: "POST",
        url: "/claims/CLM-203657/retrieve",
        headers: authHeaders(viewerSession)
      })
    ]);

    assert.equal(preview.statusCode, 403);
    assert.equal(intake.statusCode, 403);
    assert.equal(workflowAction.statusCode, 403);
    assert.equal(retrieve.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("evidence download stays organization-scoped", async () => {
  const operatorSession = await login(appConfig.seedOperatorEmail, appConfig.seedOperatorPassword);
  const outsiderSession = await upsertTestSession({
    userId: "user_outsider_test",
    organizationId: "org_outsider_test",
    organizationName: "Outside Clinic",
    email: "outsider@outside.test",
    fullName: "Outside User",
    role: "operator",
    sessionId: "session_outsider_test"
  });
  const artifactId = await seedStoredEvidenceArtifact();
  const app = await buildApp();

  try {
    const allowed = await app.inject({
      method: "GET",
      url: `/evidence/${artifactId}`,
      headers: authHeaders(operatorSession)
    });
    assert.equal(allowed.statusCode, 200);

    const denied = await app.inject({
      method: "GET",
      url: `/evidence/${artifactId}`,
      headers: authHeaders(outsiderSession)
    });
    assert.equal(denied.statusCode, 404);
  } finally {
    await app.close();
  }
});
