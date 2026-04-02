import assert from "node:assert/strict";
import test from "node:test";

import { decodeSession, encodeSession } from "./pilot-auth";

test("session cookie round-trips when signed", () => {
  const token = encodeSession({
    sessionId: "sess_123",
    userId: "user_admin",
    organizationId: "org_demo",
    role: "admin",
    fullName: "Jordan Diaz",
    email: "ops.admin@acme-rcm.test",
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  });

  const session = decodeSession(token);

  assert.ok(session);
  assert.equal(session?.userId, "user_admin");
  assert.equal(session?.role, "admin");
});

test("session cookie rejects tampering", () => {
  const token = encodeSession({
    sessionId: "sess_456",
    userId: "user_operator",
    organizationId: "org_demo",
    role: "operator",
    fullName: "Marcus Williams",
    email: "operator.one@acme-rcm.test",
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  });

  const tampered = `${token}tamper`;

  assert.equal(decodeSession(tampered), null);
});
