import { NextResponse } from "next/server";

import { getApiRouteHeaders } from "../../../../../../lib/server-session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ payerId: string }> }
) {
  const body = await request.json();
  const { payerId } = await params;
  const apiBaseUrl = process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000";
  const response = await fetch(`${apiBaseUrl}/configuration/payers/${payerId}/policy`, {
    method: "POST",
    cache: "no-store",
    headers: await getApiRouteHeaders(),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: `Failed to update payer policy: ${response.status}` },
      { status: response.status }
    );
  }

  return NextResponse.json(await response.json());
}
