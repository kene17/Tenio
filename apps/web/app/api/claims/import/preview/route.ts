import { NextResponse } from "next/server";

import { getApiRouteHeaders } from "../../../../../lib/server-session";

export async function POST(request: Request) {
  const body = await request.json();
  const apiBaseUrl = process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000";
  const response = await fetch(`${apiBaseUrl}/claims/import/preview`, {
    method: "POST",
    cache: "no-store",
    headers: await getApiRouteHeaders(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: `Failed to preview import: ${response.status}` },
      { status: response.status }
    );
  }

  return NextResponse.json(await response.json());
}
