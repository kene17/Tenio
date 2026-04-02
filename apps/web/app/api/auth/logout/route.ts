import { NextResponse } from "next/server";

import { PILOT_SESSION_COOKIE } from "../../../../lib/pilot-auth";

export async function POST(request: Request) {
  const redirectUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.set(PILOT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
