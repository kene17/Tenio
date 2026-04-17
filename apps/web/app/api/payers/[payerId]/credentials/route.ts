import { type NextRequest, NextResponse } from "next/server";

import { getApiRouteHeaders } from "../../../../../lib/server-session";

export const dynamic = "force-dynamic";

const API_BASE =
  process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000";

type RouteContext = { params: Promise<{ payerId: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const { payerId } = await context.params;
  const headers = await getApiRouteHeaders(false);

  const response = await fetch(
    `${API_BASE}/payers/${encodeURIComponent(payerId)}/credentials`,
    { headers }
  );

  const data: unknown = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const { payerId } = await context.params;
  const headers = await getApiRouteHeaders(true);
  const body: unknown = await request.json();

  const response = await fetch(
    `${API_BASE}/payers/${encodeURIComponent(payerId)}/credentials`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    }
  );

  const data: unknown = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const { payerId } = await context.params;
  const headers = await getApiRouteHeaders(false);

  const response = await fetch(
    `${API_BASE}/payers/${encodeURIComponent(payerId)}/credentials`,
    { method: "DELETE", headers }
  );

  return new NextResponse(null, { status: response.status });
}
