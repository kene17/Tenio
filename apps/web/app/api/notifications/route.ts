import { NextResponse } from "next/server";

import { buildNotifications } from "../../../lib/notifications";
import { getApiRouteHeaders } from "../../../lib/server-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiBase = process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000";
  const headers = await getApiRouteHeaders(false);

  const [queueRes, auditRes] = await Promise.all([
    fetch(`${apiBase}/queue`, { cache: "no-store", headers }),
    fetch(`${apiBase}/audit-log`, { cache: "no-store", headers })
  ]);

  if (!queueRes.ok || !auditRes.ok) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const [{ items: queue }, { items: auditEvents }] = await Promise.all([
    queueRes.json() as Promise<{ items: unknown[] }>,
    auditRes.json() as Promise<{ items: unknown[] }>
  ]);

  const notifications = buildNotifications(
    queue as Parameters<typeof buildNotifications>[0],
    auditEvents as Parameters<typeof buildNotifications>[1]
  );

  return NextResponse.json({ items: notifications });
}
