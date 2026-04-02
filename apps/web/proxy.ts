import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { decodeSession, PILOT_SESSION_COOKIE } from "./lib/pilot-auth";

export function proxy(request: NextRequest) {
  const session = decodeSession(request.cookies.get(PILOT_SESSION_COOKIE)?.value);

  if (session) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*"]
};
