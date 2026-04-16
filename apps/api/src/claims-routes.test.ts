import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "./app.js";
import { appConfig } from "./config.js";

const serviceHeaders = {
  "x-tenio-service-token": appConfig.webServiceToken
};

function authHeaders(session: { id: string; userId: string }) {
  return {
    ...serviceHeaders,
    "x-tenio-session-id": session.id,
    "x-tenio-user-id": session.userId
  };
}

async function login(email: string, password: string) {
  const app = await buildApp();
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
  const session = JSON.parse(response.body).session as { id: string; userId: string };
  return { app, session };
}

test("GET /claims and GET /claims?view=list return item arrays", async () => {
  const { app, session } = await login(
    appConfig.seedOperatorEmail,
    appConfig.seedOperatorPassword
  );

  try {
    const full = await app.inject({
      method: "GET",
      url: "/claims",
      headers: authHeaders(session)
    });
    assert.equal(full.statusCode, 200);
    const fullBody = JSON.parse(full.body) as { items: unknown[] };
    assert.ok(Array.isArray(fullBody.items));

    const listed = await app.inject({
      method: "GET",
      url: "/claims?view=list",
      headers: authHeaders(session)
    });
    assert.equal(listed.statusCode, 200);
    const listBody = JSON.parse(listed.body) as { items: unknown[] };
    assert.ok(Array.isArray(listBody.items));
  } finally {
    await app.close();
  }
});

test("GET /payers returns payer stubs for import-capable roles", async () => {
  const { app, session } = await login(
    appConfig.seedOperatorEmail,
    appConfig.seedOperatorPassword
  );

  try {
    const res = await app.inject({
      method: "GET",
      url: "/payers",
      headers: authHeaders(session)
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as {
      items: Array<{ payerId: string; payerName: string }>;
    };
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.length > 0);
    assert.ok(typeof body.items[0].payerId === "string");
    assert.ok(typeof body.items[0].payerName === "string");
  } finally {
    await app.close();
  }
});

test("GET /payers without a user session is forbidden", async () => {
  const app = await buildApp();

  try {
    const res = await app.inject({
      method: "GET",
      url: "/payers",
      headers: serviceHeaders
    });
    assert.equal(res.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("POST /claims/:id/status updates claim status (resource-shaped route)", async () => {
  const { app, session } = await login(appConfig.seedOwnerEmail, appConfig.seedOwnerPassword);
  const suffix = `rt-${Date.now()}`;

  try {
    const create = await app.inject({
      method: "POST",
      url: "/claims",
      headers: { ...authHeaders(session), "content-type": "application/json" },
      payload: {
        organizationId: appConfig.seedOrgId,
        payerId: "payer_sun_life",
        claimNumber: `CLM-RT-${suffix}`,
        patientName: "Route Test Patient",
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
    assert.equal(create.statusCode, 200);
    const created = JSON.parse(create.body) as { item: { item: { id: string } } };
    const claimId = created.item.item.id;
    assert.ok(claimId.length > 0);

    const statusRes = await app.inject({
      method: "POST",
      url: `/claims/${claimId}/status`,
      headers: { ...authHeaders(session), "content-type": "application/json" },
      payload: { action: "escalate_claim", note: "claims-routes contract test" }
    });
    assert.equal(statusRes.statusCode, 200);
    const after = JSON.parse(statusRes.body) as { item: { item: { id: string }; statusLabel: string } };
    assert.equal(after.item.item.id, claimId);
    assert.equal(after.item.statusLabel, "Escalated");
  } finally {
    await app.close();
  }
});
