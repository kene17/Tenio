import type { AuditEventView, QueueItemView } from "./pilot-api";

export type NotificationKind =
  | "sla_breached"
  | "sla_at_risk"
  | "phone_required"
  | "escalated"
  | "retrieval_complete"
  | "retrieval_failed";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  claimId: string;
  claimNumber: string;
  summary: string;
  at: string;
  read: boolean;
};

const AUDIT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isRecentAuditEvent(event: AuditEventView, nowMs: number): boolean {
  const eventMs = new Date(event.time).getTime();
  return !Number.isNaN(eventMs) && nowMs - eventMs < AUDIT_MAX_AGE_MS;
}

/**
 * Derive notification items from the current queue snapshot and recent audit
 * events. Both sources are already fetched by the app; this function is pure
 * and side-effect-free.
 *
 * Queue-derived notifications are keyed by `claimId + kind` so they are
 * stable across polls. Audit-derived notifications use the audit event `id`.
 */
export function buildNotifications(
  queue: QueueItemView[],
  auditEvents: AuditEventView[],
  nowMs: number = Date.now()
): NotificationItem[] {
  const items: NotificationItem[] = [];

  // ── Queue-derived ──────────────────────────────────────────────────────────
  for (const q of queue) {
    if (q.slaRisk === "breached") {
      items.push({
        id: `${q.claimId}:sla_breached`,
        kind: "sla_breached",
        claimId: q.claimId,
        claimNumber: q.claimNumber,
        summary: `SLA breached for ${q.claimNumber} (${q.patientName})`,
        at: q.lastTouchedAt,
        read: false
      });
    } else if (q.slaRisk === "at-risk") {
      items.push({
        id: `${q.claimId}:sla_at_risk`,
        kind: "sla_at_risk",
        claimId: q.claimId,
        claimNumber: q.claimNumber,
        summary: `SLA at risk for ${q.claimNumber} (${q.patientName})`,
        at: q.lastTouchedAt,
        read: false
      });
    }

    if (q.requiresPhoneCall === true) {
      items.push({
        id: `${q.claimId}:phone_required`,
        kind: "phone_required",
        claimId: q.claimId,
        claimNumber: q.claimNumber,
        summary: `Phone call required for ${q.claimNumber} (${q.patientName})`,
        at: q.lastTouchedAt,
        read: false
      });
    }

    if (q.claimStatus === "Escalated") {
      items.push({
        id: `${q.claimId}:escalated`,
        kind: "escalated",
        claimId: q.claimId,
        claimNumber: q.claimNumber,
        summary: `${q.claimNumber} has been escalated`,
        at: q.lastTouchedAt,
        read: false
      });
    }
  }

  // ── Audit-derived ──────────────────────────────────────────────────────────
  for (const event of auditEvents) {
    if (!event.objectId || !isRecentAuditEvent(event, nowMs)) continue;

    const claimNumber = (event.detail as Record<string, unknown> | undefined)
      ?.claimNumber as string | undefined ?? event.objectId;

    if (event.eventType === "retrieval.failed") {
      items.push({
        id: event.id,
        kind: "retrieval_failed",
        claimId: event.objectId,
        claimNumber,
        summary: event.summary || `Retrieval failed for ${claimNumber}`,
        at: event.time,
        read: false
      });
      continue;
    }

    const isPhoneRequired =
      event.action === "Phone Call Required" ||
      (event.detail as Record<string, unknown> | undefined)?.phoneCallRequired === true;

    if (isPhoneRequired && event.objectId) {
      items.push({
        id: event.id,
        kind: "phone_required",
        claimId: event.objectId,
        claimNumber,
        summary: event.summary || `Phone call required for ${claimNumber}`,
        at: event.time,
        read: false
      });
      continue;
    }

    const isRetrievalComplete =
      (event.eventType?.startsWith("retrieval.") &&
        event.eventType !== "retrieval.failed" &&
        event.eventType !== "retrieval.queued" &&
        event.eventType !== "retrieval.retry_scheduled") ||
      (event.action === "Retrieved" && event.category === "Retrieval Action");

    if (isRetrievalComplete) {
      items.push({
        id: event.id,
        kind: "retrieval_complete",
        claimId: event.objectId,
        claimNumber,
        summary: event.summary || `Retrieval completed for ${claimNumber}`,
        at: event.time,
        read: false
      });
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return items;
}
