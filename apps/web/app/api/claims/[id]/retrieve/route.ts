import { NextResponse } from "next/server";

import { getApiRouteHeaders } from "../../../../../lib/server-session";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const apiBaseUrl = process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000";
  const response = await fetch(`${apiBaseUrl}/claims/${id}/retrieve`, {
    method: "POST",
    cache: "no-store",
    headers: await getApiRouteHeaders(false)
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: `Failed to trigger retrieval: ${response.status}` },
      { status: response.status }
    );
  }

  const payload = await response.json();

  return NextResponse.json(payload);
}
