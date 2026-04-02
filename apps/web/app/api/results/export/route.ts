import { NextResponse } from "next/server";

import { getApiRouteHeaders } from "../../../../lib/server-session";

export async function POST() {
  const apiBaseUrl = process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000";
  const response = await fetch(`${apiBaseUrl}/results/export`, {
    method: "POST",
    cache: "no-store",
    headers: await getApiRouteHeaders(false)
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: `Failed to export results: ${response.status}` },
      { status: response.status }
    );
  }

  const body = await response.text();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "content-disposition":
        response.headers.get("content-disposition") ??
        'attachment; filename="tenio-results-export.csv"'
    }
  });
}
