import { cookies } from "next/headers";

import { decodeSession, PILOT_SESSION_COOKIE } from "./pilot-auth";

export async function getServerSession() {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(PILOT_SESSION_COOKIE)?.value);
}

export async function getApiRouteHeaders(contentType = true) {
  const session = await getServerSession();
  const headers = new Headers();
  headers.set(
    "x-tenio-service-token",
    process.env.TENIO_WEB_SERVICE_TOKEN ?? "tenio-local-web-service-token"
  );

  if (contentType) {
    headers.set("content-type", "application/json");
  }

  if (session) {
    headers.set("x-tenio-session-id", session.sessionId);
    headers.set("x-tenio-user-id", session.userId);
    headers.set("x-tenio-org-id", session.organizationId);
    headers.set("x-tenio-user-role", session.role);
    headers.set("x-tenio-user-name", session.fullName);
    headers.set("x-tenio-user-email", session.email);
  }

  return headers;
}
