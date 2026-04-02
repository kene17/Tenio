import { NextResponse } from "next/server";

import { getApiRouteHeaders } from "../../../../lib/server-session";

export async function GET(
  _request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> }
) {
  const params = await context.params;
  const artifactId = String(params.artifactId ?? "");
  const apiBaseUrl = process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000";
  const response = await fetch(`${apiBaseUrl}/evidence/${artifactId}`, {
    method: "GET",
    cache: "no-store",
    headers: await getApiRouteHeaders(false)
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: `Failed to load evidence: ${response.status}` },
      { status: response.status }
    );
  }

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/octet-stream"
    }
  });
}
