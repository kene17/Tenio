import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { decodeSession, encodeSession } from "./pilot-auth";

test("session cookie round-trips when signed", () => {
  const token = encodeSession({
    sessionId: "sess_123",
    userId: "user_owner",
    organizationId: "org_demo",
    organizationName: "Maple Rehab Clinic",
    role: "owner",
    fullName: "Jordan Diaz",
    email: "ops.owner@acme-rcm.test",
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  });

  const session = decodeSession(token);

  assert.ok(session);
  assert.equal(session?.userId, "user_owner");
  assert.equal(session?.role, "owner");
  assert.equal(session?.organizationName, "Maple Rehab Clinic");
});

test("legacy admin session cookies normalize to owner", () => {
  const payload = Buffer.from(
    JSON.stringify({
      sessionId: "sess_legacy",
      userId: "user_legacy_owner",
      organizationId: "org_demo",
      organizationName: "Legacy Clinic",
      role: "admin",
      fullName: "Jordan Diaz",
      email: "ops.owner@acme-rcm.test",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    }),
    "utf8"
  ).toString("base64url");
  const signature = createHmac(
    "sha256",
    process.env.TENIO_WEB_SESSION_SECRET ?? "tenio-local-web-session-secret"
  )
    .update(payload)
    .digest("base64url");

  const session = decodeSession(`${payload}.${signature}`);

  assert.ok(session);
  assert.equal(session?.role, "owner");
});

test("session cookie rejects tampering", () => {
  const token = encodeSession({
    sessionId: "sess_456",
    userId: "user_operator",
    organizationId: "org_demo",
    organizationName: "Ottawa Physio Partners",
    role: "operator",
    fullName: "Marcus Williams",
    email: "operator.one@acme-rcm.test",
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  });

  const tampered = `${token}tamper`;

  assert.equal(decodeSession(tampered), null);
});
