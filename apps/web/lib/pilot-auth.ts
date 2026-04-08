import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeUserRole, type UserRole } from "@tenio/domain";

export const PILOT_SESSION_COOKIE = "tenio_session";

export type AppSession = {
  sessionId: string;
  userId: string;
  organizationId: string;
  organizationName?: string;
  role: UserRole;
  fullName: string;
  email: string;
  expiresAt: string;
};

function getSessionSecret() {
  return process.env.TENIO_WEB_SESSION_SECRET ?? "tenio-local-web-session-secret";
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function encodeSession(session: AppSession) {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

type StoredSession = Omit<AppSession, "role"> & {
  role: UserRole | "admin";
};

export function decodeSession(cookieValue: string | undefined | null) {
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = signPayload(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as StoredSession;

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return null;
    }

    const role = normalizeUserRole(session.role);

    if (!role) {
      return null;
    }

    return {
      ...session,
      role
    } satisfies AppSession;
  } catch {
    return null;
  }
}
