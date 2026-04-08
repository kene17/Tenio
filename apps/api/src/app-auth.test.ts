import assert from "node:assert/strict";
import test from "node:test";
import type { FastifyInstance } from "fastify";
import type { UserRole } from "@tenio/domain";

import { buildApp } from "./app.js";
import { hashPassword } from "./auth.js";
import { appConfig } from "./config.js";
import { getPool } from "./database.js";
import { persistEvidenceArtifact } from "./evidence-storage.js";

type SessionPayload = {
  id: string;
  userId: string;
  organizationId: string;
  organizationName?: string;
  role: UserRole;
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
      payload: { email, password }
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
  role: UserRole;
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

async function insertFailureAuditEvent(organizationId: string) {
  const eventId = `AUD-failure-${Date.now()}`;
  await getPool().query(
    `
      INSERT INTO audit_events (id, organization_id, occurred_at, payload)
      VALUES ($1, $2, NOW(), $3::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        occurred_at = EXCLUDED.occurred_at,
        payload = EXCLUDED.payload
    `,
    [
      eventId,
      organizationId,
      JSON.stringify({
        id: eventId,
        at: new Date().toISOString(),
        organizationId,
        actor: { name: "System", type: "system", avatar: "SYS" },
        eventType: "test.failure",
        action: "Failed Test Action",
        object: "Claim",
        objectId: "CLM-203657",
        source: "System",
        payer: "Aetna",
        summary: "Injected failure event for status-page testing.",
        sensitivity: "normal",
        category: "Testing",
        outcome: "failure",
        detail: { reason: "test" },
        claimId: "CLM-203657"
      })
    ]
  );
}

async function insertAuditEvent(params: {
  organizationId: string;
  eventType: string;
  object?: string;
  objectId?: string;
  claimId?: string;
  outcome?: "success" | "failure";
  detail?: Record<string, unknown>;
}) {
  const eventId = `AUD-${params.eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await getPool().query(
    `
      INSERT INTO audit_events (id, organization_id, claim_id, occurred_at, payload)
      VALUES ($1, $2, $3, NOW(), $4::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        claim_id = EXCLUDED.claim_id,
        occurred_at = EXCLUDED.occurred_at,
        payload = EXCLUDED.payload
    `,
    [
      eventId,
      params.organizationId,
      params.claimId ?? null,
      JSON.stringify({
        id: eventId,
        at: new Date().toISOString(),
        organizationId: params.organizationId,
        actor: { name: "System", type: "system", avatar: "SYS" },
        eventType: params.eventType,
        action: params.eventType,
        object: params.object ?? "Configuration",
        objectId: params.objectId ?? eventId,
        source: "System",
        payer: "Mixed",
        summary: `${params.eventType} inserted for testing.`,
        sensitivity: "normal",
        category: "Testing",
        outcome: params.outcome ?? "success",
        detail: params.detail ?? {},
        claimId: params.claimId ?? undefined
      })
    ]
  );
}

function getStepStatus(
  steps: Array<{ id: string; status: string }>,
  stepId: string
) {
  return steps.find((step) => step.id === stepId)?.status ?? null;
}

async function captureStdout<T>(run: () => Promise<T>) {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const lines: string[] = [];
  const capture = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
    lines.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    const callback = rest.find((value) => typeof value === "function") as
      | ((error?: Error | null) => void)
      | undefined;
    callback?.();

    return true;
  }) as typeof process.stdout.write;

  process.stdout.write = capture;
  process.stderr.write = capture as typeof process.stderr.write;

  try {
    const result = await run();
    return { result, lines };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
}

test("protected routes return 403 without an authenticated session", async () => {
  const app = await buildApp();

  try {
    const commonHeaders = {
      ...serviceHeaders,
      "content-type": "application/json"
    };

    const responses = await Promise.all([
      app.inject({ method: "GET", url: "/claims", headers: serviceHeaders }),
      app.inject({ method: "GET", url: "/queue", headers: serviceHeaders }),
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
      app.inject({ method: "POST", url: "/claims/CLM-203657/retrieve", headers: serviceHeaders }),
      app.inject({ method: "POST", url: "/results/export", headers: serviceHeaders }),
      app.inject({ method: "GET", url: "/configuration/payers", headers: serviceHeaders }),
      app.inject({ method: "GET", url: "/audit-log", headers: serviceHeaders }),
      app.inject({ method: "GET", url: "/performance", headers: serviceHeaders }),
      app.inject({ method: "GET", url: "/onboarding/state", headers: serviceHeaders }),
      app.inject({
        method: "POST",
        url: "/onboarding/state",
        headers: commonHeaders,
        payload: { action: "dismiss_welcome" }
      }),
      app.inject({ method: "GET", url: "/users", headers: serviceHeaders }),
      app.inject({ method: "GET", url: "/account", headers: serviceHeaders }),
      app.inject({ method: "GET", url: "/status", headers: serviceHeaders })
    ]);

    for (const response of responses) {
      assert.equal(response.statusCode, 403);
    }
  } finally {
    await app.close();
  }
});

test("operator can work claims but cannot read payer policy, export, audit, status, or owner surfaces", async () => {
  const operatorSession = await login(appConfig.seedOperatorEmail, appConfig.seedOperatorPassword);
  const app = await buildApp();

  try {
    const commonHeaders = {
      ...authHeaders(operatorSession),
      "content-type": "application/json"
    };

    const allowed = await Promise.all([
      app.inject({
        method: "POST",
        url: "/claims/import/preview",
        headers: commonHeaders,
        payload: {
          rows: [{ claimNumber: "AUTH-OP-1001", patientName: "Operator Preview", payerId: "payer_aetna" }]
        }
      }),
      app.inject({
        method: "POST",
        url: "/claims/intake",
        headers: commonHeaders,
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
      }),
      app.inject({
        method: "POST",
        url: "/claims/CLM-203657/workflow-action",
        headers: commonHeaders,
        payload: {
          action: "log_follow_up",
          outcome: "pending_payer",
          note: "Checked the portal and documented the pending state.",
          nextAction: "Check again tomorrow"
        }
      }),
      app.inject({
        method: "POST",
        url: "/claims/CLM-203657/retrieve",
        headers: authHeaders(operatorSession)
      })
    ]);

    for (const response of allowed) {
      assert.equal(response.statusCode, 200);
    }

    const denied = await Promise.all([
      app.inject({ method: "GET", url: "/configuration/payers", headers: authHeaders(operatorSession) }),
      app.inject({
        method: "POST",
        url: "/configuration/payers/payer_aetna/policy",
        headers: commonHeaders,
        payload: {
          owner: "Sarah Chen",
          reviewThreshold: 0.85,
          escalationThreshold: 0.6,
          defaultSlaHours: 24,
          autoAssignOwner: true
        }
      }),
      app.inject({ method: "GET", url: "/audit-log", headers: authHeaders(operatorSession) }),
      app.inject({ method: "GET", url: "/performance", headers: authHeaders(operatorSession) }),
      app.inject({ method: "GET", url: "/onboarding/state", headers: authHeaders(operatorSession) }),
      app.inject({
        method: "POST",
        url: "/onboarding/state",
        headers: commonHeaders,
        payload: { action: "dismiss_welcome" }
      }),
      app.inject({ method: "GET", url: "/status", headers: authHeaders(operatorSession) }),
      app.inject({ method: "POST", url: "/results/export", headers: authHeaders(operatorSession) }),
      app.inject({ method: "GET", url: "/users", headers: authHeaders(operatorSession) }),
      app.inject({ method: "GET", url: "/account", headers: authHeaders(operatorSession) })
    ]);

    for (const response of denied) {
      assert.equal(response.statusCode, 403);
    }
  } finally {
    await app.close();
  }
});

test("viewer is read-only and cannot download evidence", async () => {
  const viewerSession = await upsertTestSession({
    userId: "user_viewer_test",
    organizationId: appConfig.seedOrgId,
    organizationName: appConfig.seedOrgName,
    email: "viewer.one@acme-rcm.test",
    fullName: "Taylor Viewer",
    role: "viewer",
    sessionId: "session_viewer_test"
  });
  const artifactId = await seedStoredEvidenceArtifact();
  const app = await buildApp();

  try {
    const readable = await Promise.all([
      app.inject({ method: "GET", url: "/claims", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: "/queue", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: "/claims/CLM-203657", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: "/results", headers: authHeaders(viewerSession) })
    ]);

    for (const response of readable) {
      assert.equal(response.statusCode, 200);
    }

    const denied = await Promise.all([
      app.inject({
        method: "POST",
        url: "/claims/import/preview",
        headers: {
          ...authHeaders(viewerSession),
          "content-type": "application/json"
        },
        payload: { rows: [] }
      }),
      app.inject({
        method: "POST",
        url: "/claims/intake",
        headers: {
          ...authHeaders(viewerSession),
          "content-type": "application/json"
        },
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
        headers: {
          ...authHeaders(viewerSession),
          "content-type": "application/json"
        },
        payload: { action: "add_note", note: "viewer note" }
      }),
      app.inject({ method: "POST", url: "/claims/CLM-203657/retrieve", headers: authHeaders(viewerSession) }),
      app.inject({ method: "POST", url: "/results/export", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: "/configuration/payers", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: "/audit-log", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: "/performance", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: "/onboarding/state", headers: authHeaders(viewerSession) }),
      app.inject({
        method: "POST",
        url: "/onboarding/state",
        headers: {
          ...authHeaders(viewerSession),
          "content-type": "application/json"
        },
        payload: { action: "complete_queue_tour" }
      }),
      app.inject({ method: "GET", url: "/status", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: "/users", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: "/account", headers: authHeaders(viewerSession) }),
      app.inject({ method: "GET", url: `/evidence/${artifactId}`, headers: authHeaders(viewerSession) })
    ]);

    for (const response of denied) {
      assert.equal(response.statusCode, 403);
    }
  } finally {
    await app.close();
  }
});

test("manager can read payer config, users, audit, and status but cannot change owner surfaces", async () => {
  const managerSession = await login(appConfig.seedManagerEmail, appConfig.seedManagerPassword);
  const app = await buildApp();

  try {
    const readable = await Promise.all([
      app.inject({ method: "GET", url: "/configuration/payers", headers: authHeaders(managerSession) }),
      app.inject({ method: "GET", url: "/users", headers: authHeaders(managerSession) }),
      app.inject({ method: "GET", url: "/audit-log", headers: authHeaders(managerSession) }),
      app.inject({ method: "GET", url: "/performance", headers: authHeaders(managerSession) }),
      app.inject({ method: "GET", url: "/onboarding/state", headers: authHeaders(managerSession) }),
      app.inject({
        method: "POST",
        url: "/onboarding/state",
        headers: {
          ...authHeaders(managerSession),
          "content-type": "application/json"
        },
        payload: { action: "complete_queue_tour" }
      }),
      app.inject({ method: "GET", url: "/status", headers: authHeaders(managerSession) }),
      app.inject({ method: "POST", url: "/results/export", headers: authHeaders(managerSession) })
    ]);

    for (const response of readable) {
      assert.equal(response.statusCode, 200);
    }

    const denied = await Promise.all([
      app.inject({
        method: "POST",
        url: "/configuration/payers/payer_aetna/policy",
        headers: {
          ...authHeaders(managerSession),
          "content-type": "application/json"
        },
        payload: {
          owner: "Sarah Chen",
          reviewThreshold: 0.85,
          escalationThreshold: 0.6,
          defaultSlaHours: 24,
          autoAssignOwner: true
        }
      }),
      app.inject({
        method: "POST",
        url: "/users/invite",
        headers: {
          ...authHeaders(managerSession),
          "content-type": "application/json"
        },
        payload: {
          email: "new.user@example.com",
          fullName: "New User",
          role: "operator"
        }
      }),
      app.inject({ method: "DELETE", url: "/users/user_operator", headers: authHeaders(managerSession) }),
      app.inject({ method: "GET", url: "/account", headers: authHeaders(managerSession) }),
      app.inject({
        method: "PUT",
        url: "/account",
        headers: {
          ...authHeaders(managerSession),
          "content-type": "application/json"
        },
        payload: {}
      })
    ]);

    for (const response of denied) {
      assert.equal(response.statusCode, 403);
    }
  } finally {
    await app.close();
  }
});

test("owner can invite/remove users and access pilot-managed account surface", async () => {
  const ownerSession = await login(appConfig.seedOwnerEmail, appConfig.seedOwnerPassword);
  const app = await buildApp();

  try {
    const invited = await app.inject({
      method: "POST",
      url: "/users/invite",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: {
        email: "fresh.operator@acme-rcm.test",
        fullName: "Fresh Operator",
        role: "operator"
      }
    });
    assert.equal(invited.statusCode, 200);
    const invitedPayload = JSON.parse(invited.body) as {
      item: { user: { id: string; role: UserRole }; temporaryPassword: string };
    };
    assert.equal(invitedPayload.item.user.role, "operator");
    assert.ok(invitedPayload.item.temporaryPassword.length > 0);

    const account = await app.inject({
      method: "GET",
      url: "/account",
      headers: authHeaders(ownerSession)
    });
    assert.equal(account.statusCode, 200);

    const accountWrite = await app.inject({
      method: "PUT",
      url: "/account",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: {}
    });
    assert.equal(accountWrite.statusCode, 501);

    const removed = await app.inject({
      method: "DELETE",
      url: `/users/${invitedPayload.item.user.id}`,
      headers: authHeaders(ownerSession)
    });
    assert.equal(removed.statusCode, 200);
  } finally {
    await app.close();
  }
});

test("login returns organization name for the authenticated workspace", async () => {
  const session = await login(appConfig.seedOwnerEmail, appConfig.seedOwnerPassword);

  assert.equal(session.organizationName, appConfig.seedOrgName);
});

test("onboarding state derives setup progress from org activity and queue tour completion", async () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const organizationId = `org_onboarding_${suffix}`;
  const ownerSession = await upsertTestSession({
    userId: `user_onboarding_owner_${suffix}`,
    organizationId,
    organizationName: `Onboarding Clinic ${suffix}`,
    email: `owner.${suffix}@clinic.test`,
    fullName: "Olivia Owner",
    role: "owner",
    sessionId: `session_onboarding_owner_${suffix}`
  });
  const app = await buildApp();

  try {
    const intake = await app.inject({
      method: "POST",
      url: "/claims/intake",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: {
        organizationId,
        payerId: "payer_sun_life",
        claimNumber: "CLM-ONB-BASE-1001",
        patientName: "Baseline Claim",
        jurisdiction: "ca",
        countryCode: "CA",
        provinceOfService: "ON",
        claimType: "paramedical",
        serviceProviderType: "physiotherapist",
        serviceCode: "97110",
        serviceDate: "2026-04-08",
        billedAmountCents: 12500,
        priority: "normal"
      }
    });
    assert.equal(intake.statusCode, 200);

    const initial = await app.inject({
      method: "GET",
      url: "/onboarding/state",
      headers: authHeaders(ownerSession)
    });
    assert.equal(initial.statusCode, 200);
    const initialPayload = JSON.parse(initial.body) as {
      item: {
        steps: Array<{ id: string; status: string }>;
        welcome: { dismissible: boolean };
      };
    };
    assert.equal(getStepStatus(initialPayload.item.steps, "team_members"), "current");
    assert.notEqual(getStepStatus(initialPayload.item.steps, "first_import"), "complete");
    assert.equal(initialPayload.item.welcome.dismissible, false);

    const earlyDismiss = await app.inject({
      method: "POST",
      url: "/onboarding/state",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: { action: "dismiss_welcome" }
    });
    assert.equal(earlyDismiss.statusCode, 400);

    const invite = await app.inject({
      method: "POST",
      url: "/users/invite",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: {
        email: `operator.${suffix}@clinic.test`,
        fullName: "Nina Operator",
        role: "operator"
      }
    });
    assert.equal(invite.statusCode, 200);

    const importCommit = await app.inject({
      method: "POST",
      url: "/claims/import/commit",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: {
        importProfile: "generic_template",
        rows: [
          {
            claimNumber: "CLM-ONB-IM-1001",
            patientName: "Imported Claim",
            payerId: "payer_sun_life",
            jurisdiction: "ca",
            countryCode: "CA",
            provinceOfService: "ON",
            claimType: "paramedical",
            serviceProviderType: "physiotherapist",
            serviceCode: "97110",
            serviceDate: "2026-04-08",
            billedAmountCents: "8900",
            priority: "high"
          }
        ]
      }
    });
    assert.equal(importCommit.statusCode, 200);

    await insertAuditEvent({
      organizationId,
      eventType: "payer.policy_updated",
      detail: {
        payerId: "payer_sun_life",
        rowsImported: 1
      }
    });

    const postImport = await app.inject({
      method: "GET",
      url: "/onboarding/state",
      headers: authHeaders(ownerSession)
    });
    assert.equal(postImport.statusCode, 200);
    const postImportPayload = JSON.parse(postImport.body) as {
      item: {
        steps: Array<{ id: string; status: string }>;
        welcome: { shouldShow: boolean; dismissible: boolean };
        queueTour: { shouldShow: boolean };
      };
    };
    assert.equal(getStepStatus(postImportPayload.item.steps, "team_members"), "complete");
    assert.equal(getStepStatus(postImportPayload.item.steps, "first_import"), "complete");
    assert.equal(getStepStatus(postImportPayload.item.steps, "configure_payers"), "complete");
    assert.equal(getStepStatus(postImportPayload.item.steps, "review_first_queue"), "current");
    assert.equal(postImportPayload.item.welcome.dismissible, true);
    assert.equal(postImportPayload.item.welcome.shouldShow, true);
    assert.equal(postImportPayload.item.queueTour.shouldShow, false);

    const dismiss = await app.inject({
      method: "POST",
      url: "/onboarding/state",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: { action: "dismiss_welcome" }
    });
    assert.equal(dismiss.statusCode, 200);
    const dismissPayload = JSON.parse(dismiss.body) as {
      item: {
        welcome: { shouldShow: boolean };
        queueTour: { shouldShow: boolean };
      };
    };
    assert.equal(dismissPayload.item.welcome.shouldShow, false);
    assert.equal(dismissPayload.item.queueTour.shouldShow, true);

    const completeTour = await app.inject({
      method: "POST",
      url: "/onboarding/state",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: { action: "complete_queue_tour" }
    });
    assert.equal(completeTour.statusCode, 200);
    const completeTourPayload = JSON.parse(completeTour.body) as {
      item: {
        steps: Array<{ id: string; status: string }>;
        progress: { completedCount: number };
        queueTour: { shouldShow: boolean };
      };
    };
    assert.equal(getStepStatus(completeTourPayload.item.steps, "review_first_queue"), "complete");
    assert.equal(completeTourPayload.item.progress.completedCount, 4);
    assert.equal(completeTourPayload.item.queueTour.shouldShow, false);
  } finally {
    await app.close();
  }
});

test("opening a claim detail marks the first queue review step complete", async () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const organizationId = `org_claim_open_${suffix}`;
  const ownerSession = await upsertTestSession({
    userId: `user_claim_open_owner_${suffix}`,
    organizationId,
    organizationName: `Claim Open Clinic ${suffix}`,
    email: `claim-open.${suffix}@clinic.test`,
    fullName: "Morgan Manager",
    role: "manager",
    sessionId: `session_claim_open_owner_${suffix}`
  });
  const app = await buildApp();

  try {
    const initial = await app.inject({
      method: "GET",
      url: "/onboarding/state",
      headers: authHeaders(ownerSession)
    });
    assert.equal(initial.statusCode, 200);

    const importCommit = await app.inject({
      method: "POST",
      url: "/claims/import/commit",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: {
        importProfile: "generic_template",
        rows: [
          {
            claimNumber: "ONB-OPEN-IMPORT-1001",
            patientName: "Imported Queue Patient",
            payerId: "payer_sun_life",
            jurisdiction: "ca",
            countryCode: "CA",
            provinceOfService: "ON",
            claimType: "paramedical",
            serviceProviderType: "physiotherapist",
            serviceCode: "97110",
            serviceDate: "2026-04-08",
            billedAmountCents: "14500",
            priority: "high"
          }
        ]
      }
    });
    assert.equal(importCommit.statusCode, 200);

    const intake = await app.inject({
      method: "POST",
      url: "/claims/intake",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: {
        organizationId,
        payerId: "payer_sun_life",
        claimNumber: "CLM-ONB-OPEN-1001",
        patientName: "Claim Open Patient",
        jurisdiction: "ca",
        countryCode: "CA",
        provinceOfService: "ON",
        claimType: "paramedical",
        serviceProviderType: "physiotherapist",
        serviceCode: "97110",
        serviceDate: "2026-04-08",
        billedAmountCents: 14500,
        priority: "high"
      }
    });
    assert.equal(intake.statusCode, 200);

    const claimDetail = await app.inject({
      method: "GET",
      url: "/claims/CLM-ONB-OPEN-1001",
      headers: authHeaders(ownerSession)
    });
    assert.equal(claimDetail.statusCode, 200);

    const updatedState = await app.inject({
      method: "GET",
      url: "/onboarding/state",
      headers: authHeaders(ownerSession)
    });
    assert.equal(updatedState.statusCode, 200);
    const updatedPayload = JSON.parse(updatedState.body) as {
      item: {
        steps: Array<{ id: string; status: string }>;
        queueTour: {
          shouldShow: boolean;
          firstClaimDetailOpenedAt: string | null;
        };
      };
    };
    assert.equal(getStepStatus(updatedPayload.item.steps, "review_first_queue"), "complete");
    assert.equal(updatedPayload.item.queueTour.shouldShow, false);
    assert.ok(updatedPayload.item.queueTour.firstClaimDetailOpenedAt);
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
    assert.equal(denied.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("import preview, import commit, follow-up, and status emit the expected audit signals", async () => {
  const ownerSession = await login(appConfig.seedOwnerEmail, appConfig.seedOwnerPassword);
  const app = await buildApp();

  try {
    const importRows = [
      {
        claimNumber: "AUTH-STATUS-1001",
        patientName: "Status Test Patient",
        payerId: "payer_sun_life",
        jurisdiction: "ca",
        countryCode: "CA",
        provinceOfService: "ON",
        claimType: "paramedical",
        serviceProviderType: "physiotherapist",
        serviceCode: "97110",
        serviceDate: "2026-04-08",
        billedAmountCents: "12500",
        priority: "high"
      }
    ];

    const preview = await app.inject({
      method: "POST",
      url: "/claims/import/preview",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: { rows: importRows, importProfile: "jane_app_csv" }
    });
    assert.equal(preview.statusCode, 200);

    const commit = await app.inject({
      method: "POST",
      url: "/claims/import/commit",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: { rows: importRows, importProfile: "jane_app_csv" }
    });
    assert.equal(commit.statusCode, 200);

    const followUp = await app.inject({
      method: "POST",
      url: "/claims/CLM-203657/workflow-action",
      headers: {
        ...authHeaders(ownerSession),
        "content-type": "application/json"
      },
      payload: {
        action: "log_follow_up",
        outcome: "resolved",
        note: "Validated and resolved during status test.",
        nextAction: "No action required"
      }
    });
    assert.equal(followUp.statusCode, 200);

    await insertFailureAuditEvent(appConfig.seedOrgId);

    const statusResponse = await app.inject({
      method: "GET",
      url: "/status",
      headers: authHeaders(ownerSession)
    });
    assert.equal(statusResponse.statusCode, 200);
    const statusPayload = JSON.parse(statusResponse.body) as {
      item: {
        lastImportAt: string | null;
        lastImportOutcome: "success" | "failure" | null;
        lastImportRowCount: number | null;
        failedActionsLast24h: number;
      };
    };
    assert.ok(statusPayload.item.lastImportAt);
    assert.equal(statusPayload.item.lastImportOutcome, "success");
    assert.equal(statusPayload.item.lastImportRowCount, 1);
    assert.ok(statusPayload.item.failedActionsLast24h >= 1);

    const auditResult = await getPool().query<{ payload: { eventType?: string } }>(
      `
        SELECT payload
        FROM audit_events
        WHERE organization_id = $1
        ORDER BY occurred_at DESC
      `,
      [appConfig.seedOrgId]
    );
    const eventTypes = auditResult.rows.map((row) => row.payload.eventType);

    assert.ok(eventTypes.includes("import.preview"));
    assert.ok(eventTypes.includes("import.commit"));
    assert.ok(eventTypes.includes("claim.imported"));
    assert.ok(eventTypes.includes("followup.logged"));
    assert.ok(eventTypes.includes("claim.status_updated"));
  } finally {
    await app.close();
  }
});

test("structured request logs include org context, status code, duration, and error", async () => {
  const operatorSession = await login(appConfig.seedOperatorEmail, appConfig.seedOperatorPassword);
  let app: FastifyInstance | null = null;

  try {
    const { result, lines } = await captureStdout(async () =>
      ((app = await buildApp()), app.inject({
        method: "GET",
        url: "/configuration/payers",
        headers: authHeaders(operatorSession)
      }))
    );

    assert.equal(result.statusCode, 403);

    const requestLog = lines
      .flatMap((line) => line.split("\n"))
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .find(
        (entry) =>
          entry &&
          entry.route === "/configuration/payers" &&
          entry.statusCode === 403
      );

    assert.ok(requestLog);
    assert.equal(requestLog?.orgId, appConfig.seedOrgId);
    assert.equal(requestLog?.userId, operatorSession.userId);
    assert.equal(requestLog?.role, "operator");
    assert.equal(requestLog?.statusCode, 403);
    assert.equal(typeof requestLog?.durationMs, "number");
    assert.equal(requestLog?.error, "Forbidden");
  } finally {
    const appToClose = app as FastifyInstance | null;

    if (appToClose) {
      await appToClose.close();
    }
  }
});
