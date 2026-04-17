/// <reference types="jest" />

/**
 * Thorough unit tests for buildNotifications().
 *
 * Organisation:
 *  1. Fixtures & helpers
 *  2. Queue-derived notifications (sla_breached, sla_at_risk, phone_required, escalated)
 *  3. Audit-derived notifications (retrieval_failed, retrieval_complete, phone_required)
 *  4. Field shape — every emitted notification must be structurally complete
 *  5. Timestamp / staleness boundary conditions
 *  6. Priority and ordering among multiple kinds
 *  7. Edge cases and empty inputs
 *  8. Sort order
 */

import { buildNotifications, type NotificationItem } from "../lib/notifications";
import type { AuditEventView, QueueItemView } from "../lib/pilot-api";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date("2026-04-16T12:00:00.000Z").getTime();

/** Six hours before NOW — well within the 24 h recency window. */
const RECENT = new Date("2026-04-16T06:00:00.000Z").toISOString();

/** Exactly 24 h before NOW — on the exclusive boundary (should be excluded). */
const EXACTLY_24H = new Date(NOW - 24 * 60 * 60 * 1000).toISOString();

/** 1 ms inside the 24 h window (23 h 59 m 59.999 s ago — should be included). */
const JUST_INSIDE_24H = new Date(NOW - 24 * 60 * 60 * 1000 + 1).toISOString();

/** 26 hours before NOW — stale, must be excluded. */
const STALE = new Date(NOW - 26 * 60 * 60 * 1000).toISOString();

function makeQueue(overrides: Partial<QueueItemView> = {}): QueueItemView {
  return {
    id: "q1",
    claimId: "CLM-001",
    claimNumber: "CLM-001",
    patientName: "Jane Smith",
    payerName: "Aetna",
    claimStatus: "In Review",
    nextAction: "Review",
    queueReason: "Low confidence",
    owner: null,
    lastTouchedAt: RECENT,
    lastUpdate: "6h ago",
    age: "3 days",
    slaRisk: "healthy",
    confidence: 80,
    evidenceCount: 2,
    priority: "normal",
    ...overrides
  };
}

function makeAudit(overrides: Partial<AuditEventView> = {}): AuditEventView {
  return {
    id: "AUD-001",
    time: RECENT,
    date: "Apr 16",
    actor: { name: "System", type: "system", avatar: "S" },
    action: "Retrieved",
    object: "Result",
    objectId: "CLM-001",
    source: "worker",
    payer: "Aetna",
    summary: "Retrieval completed for CLM-001",
    sensitivity: "normal",
    category: "Retrieval Action",
    claimId: "CLM-001",
    ...overrides
  };
}

/** Assert that every required field exists and has the right type. */
function assertShape(n: NotificationItem, context: string) {
  expect(typeof n.id).toBe("string");
  expect(n.id.length).toBeGreaterThan(0);
  expect(typeof n.kind).toBe("string");
  expect(typeof n.claimId).toBe("string");
  expect(n.claimId.length).toBeGreaterThan(0);
  expect(typeof n.claimNumber).toBe("string");
  expect(n.claimNumber.length).toBeGreaterThan(0);
  expect(typeof n.summary).toBe("string");
  expect(n.summary.length).toBeGreaterThan(0);
  expect(typeof n.at).toBe("string");
  expect(typeof n.read).toBe("boolean");
  expect(n.read).toBe(false); // always starts unread
  if (!n.id) fail(`${context}: id is empty`);
}

// ── 1. Queue-derived: sla_breached ───────────────────────────────────────────

describe("queue-derived › sla_breached", () => {
  it("is emitted when slaRisk === 'breached'", () => {
    const items = buildNotifications([makeQueue({ slaRisk: "breached" })], [], NOW);
    expect(items.filter((n) => n.kind === "sla_breached")).toHaveLength(1);
  });

  it("has the stable id claimId:sla_breached", () => {
    const items = buildNotifications([makeQueue({ claimId: "X-99", slaRisk: "breached" })], [], NOW);
    expect(items.find((n) => n.kind === "sla_breached")?.id).toBe("X-99:sla_breached");
  });

  it("carries the correct claimId and claimNumber", () => {
    const items = buildNotifications(
      [makeQueue({ claimId: "CLM-777", claimNumber: "CLM-777", slaRisk: "breached" })],
      [],
      NOW
    );
    const n = items.find((n) => n.kind === "sla_breached")!;
    expect(n.claimId).toBe("CLM-777");
    expect(n.claimNumber).toBe("CLM-777");
  });

  it("includes patient name in the summary", () => {
    const items = buildNotifications(
      [makeQueue({ slaRisk: "breached", patientName: "Alice Brown" })],
      [],
      NOW
    );
    expect(items.find((n) => n.kind === "sla_breached")?.summary).toContain("Alice Brown");
  });

  it("uses lastTouchedAt as the 'at' timestamp", () => {
    const ts = "2026-04-16T09:00:00.000Z";
    const items = buildNotifications([makeQueue({ slaRisk: "breached", lastTouchedAt: ts })], [], NOW);
    expect(items.find((n) => n.kind === "sla_breached")?.at).toBe(ts);
  });

  it("passes the full shape invariant", () => {
    const items = buildNotifications([makeQueue({ slaRisk: "breached" })], [], NOW);
    assertShape(items.find((n) => n.kind === "sla_breached")!, "sla_breached");
  });

  it("is NOT emitted when slaRisk is healthy", () => {
    const items = buildNotifications([makeQueue({ slaRisk: "healthy" })], [], NOW);
    expect(items.filter((n) => n.kind === "sla_breached")).toHaveLength(0);
  });

  it("is NOT emitted when slaRisk is at-risk (only one SLA notification per claim)", () => {
    const items = buildNotifications([makeQueue({ slaRisk: "at-risk" })], [], NOW);
    expect(items.filter((n) => n.kind === "sla_breached")).toHaveLength(0);
  });
});

// ── 2. Queue-derived: sla_at_risk ────────────────────────────────────────────

describe("queue-derived › sla_at_risk", () => {
  it("is emitted when slaRisk === 'at-risk'", () => {
    const items = buildNotifications([makeQueue({ slaRisk: "at-risk" })], [], NOW);
    expect(items.filter((n) => n.kind === "sla_at_risk")).toHaveLength(1);
  });

  it("has stable id claimId:sla_at_risk", () => {
    const items = buildNotifications([makeQueue({ claimId: "C-5", slaRisk: "at-risk" })], [], NOW);
    expect(items.find((n) => n.kind === "sla_at_risk")?.id).toBe("C-5:sla_at_risk");
  });

  it("includes patient name in the summary", () => {
    const items = buildNotifications(
      [makeQueue({ slaRisk: "at-risk", patientName: "Bob Jones" })],
      [],
      NOW
    );
    expect(items.find((n) => n.kind === "sla_at_risk")?.summary).toContain("Bob Jones");
  });

  it("is mutually exclusive with sla_breached on the same claim", () => {
    const items = buildNotifications([makeQueue({ slaRisk: "at-risk" })], [], NOW);
    expect(items.filter((n) => n.kind === "sla_breached")).toHaveLength(0);
  });

  it("is NOT emitted when slaRisk is healthy", () => {
    expect(
      buildNotifications([makeQueue({ slaRisk: "healthy" })], [], NOW).filter(
        (n) => n.kind === "sla_at_risk"
      )
    ).toHaveLength(0);
  });
});

// ── 3. Queue-derived: phone_required ─────────────────────────────────────────

describe("queue-derived › phone_required", () => {
  it("is emitted when requiresPhoneCall is true", () => {
    const items = buildNotifications(
      [makeQueue({ requiresPhoneCall: true })],
      [],
      NOW
    );
    expect(items.filter((n) => n.kind === "phone_required")).toHaveLength(1);
  });

  it("has stable id claimId:phone_required", () => {
    const items = buildNotifications(
      [makeQueue({ claimId: "P-1", requiresPhoneCall: true })],
      [],
      NOW
    );
    expect(items.find((n) => n.kind === "phone_required")?.id).toBe("P-1:phone_required");
  });

  it("includes patient name in the summary", () => {
    const items = buildNotifications(
      [makeQueue({ requiresPhoneCall: true, patientName: "Carol Davis" })],
      [],
      NOW
    );
    expect(items.find((n) => n.kind === "phone_required")?.summary).toContain("Carol Davis");
  });

  it("is NOT emitted when requiresPhoneCall is false", () => {
    const items = buildNotifications([makeQueue({ requiresPhoneCall: false })], [], NOW);
    expect(items.filter((n) => n.kind === "phone_required")).toHaveLength(0);
  });

  it("is NOT emitted when requiresPhoneCall is absent", () => {
    const items = buildNotifications([makeQueue()], [], NOW);
    expect(items.filter((n) => n.kind === "phone_required")).toHaveLength(0);
  });

  it("can coexist with sla_breached on the same claim", () => {
    const items = buildNotifications(
      [makeQueue({ slaRisk: "breached", requiresPhoneCall: true })],
      [],
      NOW
    );
    expect(items.filter((n) => n.kind === "sla_breached")).toHaveLength(1);
    expect(items.filter((n) => n.kind === "phone_required")).toHaveLength(1);
  });
});

// ── 4. Queue-derived: escalated ──────────────────────────────────────────────

describe("queue-derived › escalated", () => {
  it("is emitted when claimStatus is 'Escalated'", () => {
    const items = buildNotifications([makeQueue({ claimStatus: "Escalated" })], [], NOW);
    expect(items.filter((n) => n.kind === "escalated")).toHaveLength(1);
  });

  it("has stable id claimId:escalated", () => {
    const items = buildNotifications(
      [makeQueue({ claimId: "E-2", claimStatus: "Escalated" })],
      [],
      NOW
    );
    expect(items.find((n) => n.kind === "escalated")?.id).toBe("E-2:escalated");
  });

  it("includes claimNumber in the summary", () => {
    const items = buildNotifications(
      [makeQueue({ claimStatus: "Escalated", claimNumber: "CLM-555" })],
      [],
      NOW
    );
    expect(items.find((n) => n.kind === "escalated")?.summary).toContain("CLM-555");
  });

  it("is NOT emitted for non-Escalated statuses", () => {
    for (const status of ["In Review", "Resolved", "Pending", "Needs Review"]) {
      const items = buildNotifications([makeQueue({ claimStatus: status })], [], NOW);
      expect(items.filter((n) => n.kind === "escalated")).toHaveLength(0);
    }
  });

  it("can coexist with sla_breached on the same claim", () => {
    const items = buildNotifications(
      [makeQueue({ slaRisk: "breached", claimStatus: "Escalated" })],
      [],
      NOW
    );
    expect(items.filter((n) => n.kind === "sla_breached")).toHaveLength(1);
    expect(items.filter((n) => n.kind === "escalated")).toHaveLength(1);
  });

  it("can coexist with sla_at_risk on the same claim", () => {
    const items = buildNotifications(
      [makeQueue({ slaRisk: "at-risk", claimStatus: "Escalated" })],
      [],
      NOW
    );
    expect(items.filter((n) => n.kind === "sla_at_risk")).toHaveLength(1);
    expect(items.filter((n) => n.kind === "escalated")).toHaveLength(1);
  });

  it("a single claim can produce up to 3 queue notifications (breached + phone + escalated)", () => {
    const items = buildNotifications(
      [makeQueue({ slaRisk: "breached", requiresPhoneCall: true, claimStatus: "Escalated" })],
      [],
      NOW
    );
    expect(items).toHaveLength(3);
    expect(items.map((n) => n.kind).sort()).toEqual(
      ["escalated", "phone_required", "sla_breached"].sort()
    );
  });
});

// ── 5. Multiple queue items ───────────────────────────────────────────────────

describe("queue-derived › multiple items", () => {
  it("processes each queue item independently", () => {
    const queue = [
      makeQueue({ claimId: "A", claimNumber: "A", slaRisk: "breached" }),
      makeQueue({ claimId: "B", claimNumber: "B", slaRisk: "at-risk" }),
      makeQueue({ claimId: "C", claimNumber: "C", slaRisk: "healthy" })
    ];
    const items = buildNotifications(queue, [], NOW);
    expect(items.filter((n) => n.kind === "sla_breached").map((n) => n.claimId)).toEqual(["A"]);
    expect(items.filter((n) => n.kind === "sla_at_risk").map((n) => n.claimId)).toEqual(["B"]);
    expect(items.filter((n) => n.kind === "sla_breached" || n.kind === "sla_at_risk")).toHaveLength(2);
  });

  it("produces one sla notification per claim, never both breached and at-risk", () => {
    const items = buildNotifications(
      [
        makeQueue({ claimId: "B1", slaRisk: "breached" }),
        makeQueue({ claimId: "B2", slaRisk: "at-risk" })
      ],
      [],
      NOW
    );
    const b1 = items.filter((n) => n.claimId === "B1");
    const b2 = items.filter((n) => n.claimId === "B2");
    expect(b1.filter((n) => n.kind === "sla_breached")).toHaveLength(1);
    expect(b1.filter((n) => n.kind === "sla_at_risk")).toHaveLength(0);
    expect(b2.filter((n) => n.kind === "sla_at_risk")).toHaveLength(1);
    expect(b2.filter((n) => n.kind === "sla_breached")).toHaveLength(0);
  });
});

// ── 6. Audit-derived: retrieval_failed ───────────────────────────────────────

describe("audit-derived › retrieval_failed", () => {
  it("is emitted for eventType retrieval.failed", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ id: "AUD-F", eventType: "retrieval.failed", action: "Failed" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "retrieval_failed")).toHaveLength(1);
  });

  it("uses the audit event id as the notification id", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ id: "FAIL-99", eventType: "retrieval.failed" })],
      NOW
    );
    expect(items.find((n) => n.kind === "retrieval_failed")?.id).toBe("FAIL-99");
  });

  it("uses the event summary when present", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ eventType: "retrieval.failed", summary: "Custom failure message" })],
      NOW
    );
    expect(items.find((n) => n.kind === "retrieval_failed")?.summary).toBe("Custom failure message");
  });

  it("falls back to a generated summary when event.summary is empty", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ eventType: "retrieval.failed", summary: "", claimId: "CLM-X", claimNumber: "CLM-X" })],
      NOW
    );
    const s = items.find((n) => n.kind === "retrieval_failed")?.summary ?? "";
    expect(s.length).toBeGreaterThan(0);
  });

  it("uses claimNumber from detail when present", () => {
    const items = buildNotifications(
      [],
      [
        makeAudit({
          eventType: "retrieval.failed",
          claimId: "CLM-X",
          detail: { claimNumber: "CLM-DETAIL-789" }
        })
      ],
      NOW
    );
    expect(items.find((n) => n.kind === "retrieval_failed")?.claimNumber).toBe("CLM-DETAIL-789");
  });

  it("falls back to claimId as claimNumber when detail is absent", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ eventType: "retrieval.failed", claimId: "CLM-FB", detail: undefined })],
      NOW
    );
    expect(items.find((n) => n.kind === "retrieval_failed")?.claimNumber).toBe("CLM-FB");
  });

  it("takes priority: a retrieval.failed event is never also classified as retrieval_complete", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ eventType: "retrieval.failed" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "retrieval_complete")).toHaveLength(0);
    expect(items.filter((n) => n.kind === "retrieval_failed")).toHaveLength(1);
  });

  it("passes the full shape invariant", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ id: "F1", eventType: "retrieval.failed", summary: "Failed" })],
      NOW
    );
    assertShape(items.find((n) => n.kind === "retrieval_failed")!, "retrieval_failed");
  });
});

// ── 7. Audit-derived: retrieval_complete ─────────────────────────────────────

describe("audit-derived › retrieval_complete", () => {
  it("is emitted for action=Retrieved and category=Retrieval Action", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ action: "Retrieved", category: "Retrieval Action" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "retrieval_complete")).toHaveLength(1);
  });

  it("is emitted for eventType retrieval.completed", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ eventType: "retrieval.completed", action: "Completed" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "retrieval_complete")).toHaveLength(1);
  });

  it("is emitted for eventType retrieval.succeeded", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ eventType: "retrieval.succeeded", action: "Succeeded" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "retrieval_complete")).toHaveLength(1);
  });

  it("uses the audit event id as the notification id", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ id: "DONE-55", action: "Retrieved", category: "Retrieval Action" })],
      NOW
    );
    expect(items.find((n) => n.kind === "retrieval_complete")?.id).toBe("DONE-55");
  });

  it("is NOT emitted for retrieval.failed", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ eventType: "retrieval.failed", action: "Failed" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "retrieval_complete")).toHaveLength(0);
  });

  it("is NOT emitted for retrieval.queued", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ id: "Q1", eventType: "retrieval.queued", action: "Queued", category: "Other" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "retrieval_complete")).toHaveLength(0);
  });

  it("is NOT emitted for retrieval.retry_scheduled", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ id: "R1", eventType: "retrieval.retry_scheduled", action: "Retry Scheduled", category: "Other" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "retrieval_complete")).toHaveLength(0);
  });

  it("passes the full shape invariant", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ action: "Retrieved", category: "Retrieval Action" })],
      NOW
    );
    assertShape(items.find((n) => n.kind === "retrieval_complete")!, "retrieval_complete");
  });
});

// ── 8. Audit-derived: phone_required ─────────────────────────────────────────

describe("audit-derived › phone_required", () => {
  it("is emitted when action is 'Phone Call Required'", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ id: "PH-1", action: "Phone Call Required", category: "Claim Workflow" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "phone_required")).toHaveLength(1);
  });

  it("is emitted when detail.phoneCallRequired is true", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ id: "PH-2", action: "Status Update", detail: { phoneCallRequired: true } })],
      NOW
    );
    expect(items.filter((n) => n.kind === "phone_required")).toHaveLength(1);
  });

  it("uses audit event id as the notification id", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ id: "PH-ID", action: "Phone Call Required", category: "Claim Workflow" })],
      NOW
    );
    expect(items.find((n) => n.kind === "phone_required")?.id).toBe("PH-ID");
  });

  it("uses event summary when present", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ action: "Phone Call Required", summary: "Patient unreachable, call back needed" })],
      NOW
    );
    expect(items.find((n) => n.kind === "phone_required")?.summary).toBe(
      "Patient unreachable, call back needed"
    );
  });

  it("takes priority over retrieval_complete: phone_required event is not also retrieval_complete", () => {
    const items = buildNotifications(
      [],
      [
        makeAudit({
          id: "PH-3",
          action: "Phone Call Required",
          eventType: "retrieval.completed",
          category: "Retrieval Action"
        })
      ],
      NOW
    );
    expect(items.filter((n) => n.kind === "phone_required")).toHaveLength(1);
    expect(items.filter((n) => n.kind === "retrieval_complete")).toHaveLength(0);
  });
});

// ── 9. Timestamp / staleness boundary conditions ──────────────────────────────

describe("audit staleness filter", () => {
  it("includes events within the last 24 h", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ time: RECENT, eventType: "retrieval.failed" })],
      NOW
    );
    expect(items).toHaveLength(1);
  });

  it("includes an event that is 1 ms inside the 24 h window", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ time: JUST_INSIDE_24H, eventType: "retrieval.failed" })],
      NOW
    );
    expect(items).toHaveLength(1);
  });

  it("excludes an event exactly 24 h old (exclusive upper boundary)", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ time: EXACTLY_24H, eventType: "retrieval.failed" })],
      NOW
    );
    expect(items).toHaveLength(0);
  });

  it("excludes an event older than 24 h", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ time: STALE, eventType: "retrieval.failed" })],
      NOW
    );
    expect(items).toHaveLength(0);
  });

  it("excludes an event with an invalid ISO timestamp", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ time: "not-a-date", eventType: "retrieval.failed" })],
      NOW
    );
    expect(items).toHaveLength(0);
  });

  it("stale events are excluded even when they match a high-priority kind", () => {
    // retrieval_failed is highest-priority but still filtered out if stale
    const items = buildNotifications(
      [],
      [makeAudit({ time: STALE, eventType: "retrieval.failed" })],
      NOW
    );
    expect(items).toHaveLength(0);
  });

  it("queue items are NOT filtered by timestamp (no age gate on queue)", () => {
    // Queue items are always included regardless of lastTouchedAt
    const items = buildNotifications(
      [makeQueue({ slaRisk: "breached", lastTouchedAt: STALE })],
      [],
      NOW
    );
    expect(items.filter((n) => n.kind === "sla_breached")).toHaveLength(1);
  });
});

// ── 10. claimId guard ─────────────────────────────────────────────────────────

describe("audit claimId guard", () => {
  it("excludes events with no claimId field", () => {
    const { claimId: _, ...noClaimId } = makeAudit({ eventType: "retrieval.failed" });
    const items = buildNotifications([], [noClaimId as AuditEventView], NOW);
    expect(items).toHaveLength(0);
  });

  it("excludes events with an empty string claimId", () => {
    const items = buildNotifications(
      [],
      [makeAudit({ claimId: "", eventType: "retrieval.failed" })],
      NOW
    );
    expect(items).toHaveLength(0);
  });
});

// ── 11. Mixed queue + audit — combined behaviour ──────────────────────────────

describe("combined queue and audit", () => {
  it("produces notifications from both sources in the same call", () => {
    const items = buildNotifications(
      [makeQueue({ slaRisk: "breached" })],
      [makeAudit({ eventType: "retrieval.failed" })],
      NOW
    );
    expect(items.filter((n) => n.kind === "sla_breached")).toHaveLength(1);
    expect(items.filter((n) => n.kind === "retrieval_failed")).toHaveLength(1);
    expect(items).toHaveLength(2);
  });

  it("handles many mixed notifications correctly", () => {
    const queue = [
      makeQueue({ claimId: "A", claimNumber: "A", slaRisk: "breached" }),
      makeQueue({ claimId: "B", claimNumber: "B", slaRisk: "at-risk", claimStatus: "Escalated" }),
      makeQueue({ claimId: "C", claimNumber: "C", requiresPhoneCall: true })
    ];
    const audits = [
      makeAudit({ id: "AU1", claimId: "D", claimNumber: "D", eventType: "retrieval.failed" }),
      makeAudit({ id: "AU2", claimId: "E", claimNumber: "E", action: "Retrieved", category: "Retrieval Action" })
    ];
    const items = buildNotifications(queue, audits, NOW);
    const kinds = items.map((n) => n.kind);
    expect(kinds).toContain("sla_breached");
    expect(kinds).toContain("sla_at_risk");
    expect(kinds).toContain("escalated");
    expect(kinds).toContain("phone_required");
    expect(kinds).toContain("retrieval_failed");
    expect(kinds).toContain("retrieval_complete");
    expect(items).toHaveLength(6);
  });
});

// ── 12. Sort order ────────────────────────────────────────────────────────────

describe("sort order", () => {
  it("sorts notifications newest first by 'at' timestamp", () => {
    const queue = [
      makeQueue({ claimId: "OLD", claimNumber: "OLD", slaRisk: "breached", lastTouchedAt: "2026-04-16T04:00:00.000Z" }),
      makeQueue({ claimId: "NEW", claimNumber: "NEW", slaRisk: "breached", lastTouchedAt: "2026-04-16T10:00:00.000Z" })
    ];
    const items = buildNotifications(queue, [], NOW);
    const sla = items.filter((n) => n.kind === "sla_breached");
    expect(sla[0].claimId).toBe("NEW");
    expect(sla[1].claimId).toBe("OLD");
  });

  it("interleaves queue and audit notifications by timestamp", () => {
    const queueItem = makeQueue({
      claimId: "Q1",
      claimNumber: "Q1",
      slaRisk: "breached",
      lastTouchedAt: "2026-04-16T08:00:00.000Z"
    });
    const auditNewer = makeAudit({
      id: "AU-NEWER",
      claimId: "AU1",
      time: "2026-04-16T10:00:00.000Z",
      eventType: "retrieval.failed"
    });
    const auditOlder = makeAudit({
      id: "AU-OLDER",
      claimId: "AU2",
      time: "2026-04-16T05:00:00.000Z",
      eventType: "retrieval.failed"
    });
    const items = buildNotifications([queueItem], [auditNewer, auditOlder], NOW);
    expect(items[0].id).toBe("AU-NEWER");   // 10:00
    expect(items[1].id).toBe("Q1:sla_breached"); // 08:00
    expect(items[2].id).toBe("AU-OLDER");   // 05:00
  });
});

// ── 13. Empty inputs ──────────────────────────────────────────────────────────

describe("empty inputs", () => {
  it("returns an empty array when both queue and audit events are empty", () => {
    expect(buildNotifications([], [], NOW)).toEqual([]);
  });

  it("returns an empty array from a healthy queue with no audit events", () => {
    expect(buildNotifications([makeQueue({ slaRisk: "healthy" })], [], NOW)).toHaveLength(0);
  });
});

// ── 14. All-fields invariant across every kind ────────────────────────────────

describe("field shape invariant — all kinds", () => {
  const queue = [
    makeQueue({ slaRisk: "breached", claimId: "SB", claimNumber: "SB", requiresPhoneCall: true, claimStatus: "Escalated" }),
    makeQueue({ slaRisk: "at-risk", claimId: "SAR", claimNumber: "SAR" })
  ];
  const audits = [
    makeAudit({ id: "RF", claimId: "RF", eventType: "retrieval.failed", summary: "Failed" }),
    makeAudit({ id: "RC", claimId: "RC", action: "Retrieved", category: "Retrieval Action" }),
    makeAudit({ id: "PR", claimId: "PR", action: "Phone Call Required", category: "Claim Workflow" })
  ];

  it("every notification from a full mixed payload has all required fields", () => {
    const items = buildNotifications(queue, audits, NOW);
    expect(items.length).toBeGreaterThan(0);
    for (const n of items) {
      assertShape(n, n.kind);
    }
  });

  it("every notification kind is represented at least once", () => {
    const items = buildNotifications(queue, audits, NOW);
    const kinds = new Set(items.map((n) => n.kind));
    const allKinds = [
      "sla_breached", "sla_at_risk", "phone_required",
      "escalated", "retrieval_failed", "retrieval_complete"
    ] as const;
    for (const k of allKinds) {
      expect(kinds.has(k)).toBe(true);
    }
  });
});
