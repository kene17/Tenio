import { NextResponse } from "next/server";

import { encodeSession, PILOT_SESSION_COOKIE } from "../../../../lib/pilot-auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app/queue");
  const redirectUrl = new URL(request.url);

  const response = await fetch(
    `${
      process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000"
    }/auth/login`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenio-service-token":
          process.env.TENIO_WEB_SERVICE_TOKEN ?? "tenio-local-web-service-token"
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "invalid");
    redirectUrl.searchParams.set("next", next);

    return NextResponse.redirect(redirectUrl);
  }

  const payload = (await response.json()) as {
    session: {
      id: string;
      userId: string;
      organizationId: string;
      role: "admin" | "manager" | "operator" | "viewer";
      fullName: string;
      email: string;
      expiresAt: string;
    };
  };

  redirectUrl.pathname = next;
  redirectUrl.search = "";

  const redirectResponse = NextResponse.redirect(redirectUrl);
  redirectResponse.cookies.set(
    PILOT_SESSION_COOKIE,
    encodeSession({
      sessionId: payload.session.id,
      userId: payload.session.userId,
      organizationId: payload.session.organizationId,
      role: payload.session.role,
      fullName: payload.session.fullName,
      email: payload.session.email,
      expiresAt: payload.session.expiresAt
    }),
    {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
    }
  );

  return redirectResponse;
}
