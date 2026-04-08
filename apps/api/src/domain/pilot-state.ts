import type { ExecutionCandidate } from "@tenio/contracts";
import type {
  ClaimDetail,
  ClaimStatus,
  ClaimSummary,
  QueueItem,
  ReviewDecision
} from "@tenio/domain";

import type { WorkflowDecision } from "../services/review-policy-service.js";

export type ClaimRecord = ClaimDetail & {
  serviceDate: string;
  claimType: string;
  jurisdiction: "us" | "ca";
  countryCode: "US" | "CA";
  provinceOfService: string | null;
  allowedAmountCents: number | null;
  paidAmountCents: number | null;
  patientResponsibilityCents: number | null;
  payerReferenceNumber: string | null;
  currentPayerResponse: string | null;
  currentQueue: string;
  nextAction: string;
  totalTouches: number;
  daysSinceLastFollowUp: number;
  escalationState: string;
  ageDays: number;
  requiresPhoneCall: boolean;
  phoneCallRequiredAt: string | null;
};

export type ResultRecord = {
  id: string;
  claimId: string;
  verifiedStatus: string;
  exportState: "Exported" | "Not Exported";
  lastVerifiedAt: string;
  nextAction: string;
  machineSummary: string;
  recommendedNextSteps: string[];
  agentTraceId: string | null;
  routeReason: string;
  rationale: string;
  connectorId: string;
  connectorName: string;
  executionMode: "browser" | "api";
  executionObservedAt: string;
  executionDurationMs: number;
};

type AuditActorType = "human" | "system" | "admin";

export type AuditEventRecord = {
  id: string;
  at: string;
  organizationId?: string;
  actor: { name: string; type: AuditActorType; avatar: string };
  action: string;
  object: "Claim" | "Result" | "Configuration" | "Evidence";
  objectId: string;
  source: string;
  payer: string;
  summary: string;
  sensitivity: "normal" | "sensitive" | "high-risk";
  category: string;
  beforeAfter?: Record<string, { from: string; to: string }>;
  reason?: string;
  requestId?: string;
  claimId?: string;
  resultId?: string;
};

export type PilotQueueItem = {
  id: string;
  claimId: string;
  claimNumber: string;
  patientName: string;
  payerName: string;
  jurisdiction: "us" | "ca";
  countryCode: "US" | "CA";
  provinceOfService: string | null;
  claimType: string | null;
  claimStatus: string;
  nextAction: string;
  queueReason: string;
  owner: string | null;
  lastUpdate: string;
  age: string;
  slaRisk: "healthy" | "at-risk" | "breached";
  confidence: number;
  evidenceCount: number;
  priority: ClaimRecord["priority"];
};

export type AuditEventView = {
  id: string;
  time: string;
  date: string;
  actor: { name: string; type: AuditActorType; avatar: string };
  action: string;
  object: string;
  objectId: string;
  source: string;
  payer: string;
  summary: string;
  sensitivity: "normal" | "sensitive" | "high-risk";
  category: string;
  beforeAfter?: Record<string, { from: string; to: string }>;
  reason?: string;
  requestId?: string;
};

export type PilotClaimDetail = {
  item: ClaimDetail;
  serviceDate: string;
  claimType: string;
  jurisdiction: "us" | "ca";
  countryCode: "US" | "CA";
  provinceOfService: string | null;
  allowedAmountCents: number | null;
  paidAmountCents: number | null;
  patientResponsibilityCents: number | null;
  payerReferenceNumber: string | null;
  currentPayerResponse: string | null;
  currentQueue: string;
  nextAction: string;
  totalTouches: number;
  requiresPhoneCall: boolean;
  phoneCallRequiredAt: string | null;
  daysSinceLastFollowUp: number;
  escalationState: string;
  statusLabel: string;
  lastUpdatedLabel: string;
  slaLabel: string;
  machineSummary: string;
  recommendedNextSteps: string[];
  agentInsights: {
    connectorName: string;
    executionMode: "browser" | "api";
    traceId: string | null;
    rationale: string;
    routeReason: string;
    lastObservedAt: string;
    executionDurationLabel: string;
  };
  activityTimeline: AuditEventView[];
  auditTrail: Array<{ label: string; value: string; subtext: string }>;
};

export type ResultSummaryView = {
  resultId: string;
  claimId: string;
  claimNumber: string;
  payer: string;
  verifiedStatus: string;
  confidence: number;
  lastVerified: string;
  evidenceCount: number;
  exportState: "Exported" | "Not Exported";
  nextAction: string;
};

export type ResultDetailView = {
  id: string;
  claimId: string;
  claimNumber: string;
  payerName: string;
  patientName: string;
  serviceDate: string;
  billedAmountCents: number | null;
  claimStatus: string;
  confidence: number;
  lastVerified: string;
  nextAction: string;
  verifiedStatus: string;
  machineSummary: string;
  recommendedNextSteps: string[];
  agentTraceId: string | null;
  evidence: ClaimDetail["evidence"];
  portalText: string;
  metadata: string[];
};

const now = Date.now();
const hours = (value: number) => value * 60 * 60 * 1000;
const days = (value: number) => value * 24 * 60 * 60 * 1000;

const reviews: Record<string, ReviewDecision[]> = {
  "CLM-204938": [
    {
      id: "review_CLM-204938_1",
      status: "pending",
      reason: "Confidence below auto-resolve threshold",
      reviewer: null,
      createdAt: new Date(now - hours(2)).toISOString()
    }
  ],
  "CLM-204821": [
    {
      id: "review_CLM-204821_1",
      status: "escalated",
      reason: "Conflicting denial response needs specialist follow-up",
      reviewer: "Marcus Williams",
      createdAt: new Date(now - 10 * 60 * 1000).toISOString()
    }
  ],
  "CLM-204102": [
    {
      id: "review_CLM-204102_1",
      status: "pending",
      reason: "Missing evidence packet for payer follow-up",
      reviewer: null,
      createdAt: new Date(now - hours(1)).toISOString()
    }
  ]
};

export function createSeedState() {
  const claims: ClaimRecord[] = [
    {
      id: "CLM-204938",
      organizationId: "org_demo",
      payerId: "payer_aetna",
      payerName: "Aetna",
      claimNumber: "CLM-204938",
      patientName: "Rosa Martinez",
      jurisdiction: "us",
      countryCode: "US",
      provinceOfService: null,
      status: "needs_review",
      confidence: 0.72,
      slaAt: new Date(now + hours(16)).toISOString(),
      owner: "Sarah Chen",
      priority: "high",
      lastCheckedAt: new Date(now - hours(2)).toISOString(),
      normalizedStatusText: "Pending payer review",
      amountCents: 284700,
      notes:
        "Low-confidence extraction flagged by the workflow layer. Verify evidence before posting the status downstream.",
      evidence: [
        {
          id: "artifact_CLM-204938_1",
          kind: "screenshot",
          label: "Aetna portal overview",
          url: "https://example.com/evidence/CLM-204938/overview.png",
          createdAt: new Date(now - hours(2)).toISOString()
        },
        {
          id: "artifact_CLM-204938_2",
          kind: "raw_html",
          label: "Aetna portal text extraction",
          url: "https://example.com/evidence/CLM-204938/text.html",
          createdAt: new Date(now - hours(2)).toISOString()
        }
      ],
      reviews: reviews["CLM-204938"] ?? [],
      serviceDate: "2026-03-15",
      claimType: "Professional",
      allowedAmountCents: 260000,
      paidAmountCents: 227750,
      patientResponsibilityCents: 32250,
      payerReferenceNumber: "REF-AET-984721034",
      currentPayerResponse:
        "Claim processed. Partial payment issued per contract terms. Adjustment code CO-45 applied.",
      currentQueue: "Low Confidence Verification",
      nextAction: "Review Evidence",
      totalTouches: 3,
      requiresPhoneCall: false,
      phoneCallRequiredAt: null,
      daysSinceLastFollowUp: 0,
      escalationState: "Not escalated",
      ageDays: 12
    },
    {
      id: "CLM-204821",
      organizationId: "org_demo",
      payerId: "payer_uhc",
      payerName: "UnitedHealthcare",
      claimNumber: "CLM-204821",
      patientName: "Michael Johnson",
      jurisdiction: "us",
      countryCode: "US",
      provinceOfService: null,
      status: "blocked",
      confidence: 0.45,
      slaAt: new Date(now - hours(2)).toISOString(),
      owner: "Marcus Williams",
      priority: "urgent",
      lastCheckedAt: new Date(now - 15 * 60 * 1000).toISOString(),
      normalizedStatusText: "Denied pending specialist escalation",
      amountCents: 120500,
      notes: "Escalation required. Portal response conflicts with prior ERA.",
      evidence: [
        {
          id: "artifact_CLM-204821_1",
          kind: "screenshot",
          label: "UHC denial view",
          url: "https://example.com/evidence/CLM-204821/denial.png",
          createdAt: new Date(now - 15 * 60 * 1000).toISOString()
        }
      ],
      reviews: reviews["CLM-204821"] ?? [],
      serviceDate: "2026-03-10",
      claimType: "Facility",
      allowedAmountCents: 100000,
      paidAmountCents: null,
      patientResponsibilityCents: null,
      payerReferenceNumber: "REF-UHC-100204821",
      currentPayerResponse: "Denied. Additional medical review required.",
      currentQueue: "Escalation Required",
      nextAction: "Escalate to Specialist",
      totalTouches: 5,
      requiresPhoneCall: true,
      phoneCallRequiredAt: new Date(now - hours(1)).toISOString(),
      daysSinceLastFollowUp: 2,
      escalationState: "Escalated",
      ageDays: 18
    },
    {
      id: "CLM-203657",
      organizationId: "org_demo",
      payerId: "payer_cigna",
      payerName: "Cigna",
      claimNumber: "CLM-203657",
      patientName: "David Lee",
      jurisdiction: "us",
      countryCode: "US",
      provinceOfService: null,
      status: "in_review",
      confidence: 0.88,
      slaAt: new Date(now + days(2)).toISOString(),
      owner: null,
      priority: "normal",
      lastCheckedAt: new Date(now - hours(3)).toISOString(),
      normalizedStatusText: "In process",
      amountCents: 89400,
      notes: "Awaiting payer response after prior retrieval.",
      evidence: [
        {
          id: "artifact_CLM-203657_1",
          kind: "screenshot",
          label: "Cigna status page",
          url: "https://example.com/evidence/CLM-203657/status.png",
          createdAt: new Date(now - hours(3)).toISOString()
        }
      ],
      reviews: [],
      serviceDate: "2026-03-22",
      claimType: "Professional",
      allowedAmountCents: 76000,
      paidAmountCents: null,
      patientResponsibilityCents: null,
      payerReferenceNumber: "REF-CIG-203657",
      currentPayerResponse: "Claim is still in process with the payer.",
      currentQueue: "Awaiting Payer Response",
      nextAction: "Re-check Status",
      totalTouches: 2,
      requiresPhoneCall: false,
      phoneCallRequiredAt: null,
      daysSinceLastFollowUp: 1,
      escalationState: "Not escalated",
      ageDays: 8
    },
    {
      id: "CLM-204102",
      organizationId: "org_demo",
      payerId: "payer_anthem",
      payerName: "Anthem BCBS",
      claimNumber: "CLM-204102",
      patientName: "Elena Garcia",
      jurisdiction: "us",
      countryCode: "US",
      provinceOfService: null,
      status: "needs_review",
      confidence: 0.65,
      slaAt: new Date(now + hours(6)).toISOString(),
      owner: "David Park",
      priority: "high",
      lastCheckedAt: new Date(now - hours(1)).toISOString(),
      normalizedStatusText: "Additional information required",
      amountCents: 145900,
      notes: "Portal indicates missing records. Manual assignment needed.",
      evidence: [
        {
          id: "artifact_CLM-204102_1",
          kind: "screenshot",
          label: "Anthem missing info prompt",
          url: "https://example.com/evidence/CLM-204102/missing-info.png",
          createdAt: new Date(now - hours(1)).toISOString()
        }
      ],
      reviews: reviews["CLM-204102"] ?? [],
      serviceDate: "2026-03-12",
      claimType: "Professional",
      allowedAmountCents: null,
      paidAmountCents: null,
      patientResponsibilityCents: null,
      payerReferenceNumber: "REF-ANT-204102",
      currentPayerResponse: "Additional records required before adjudication can continue.",
      currentQueue: "Missing Evidence",
      nextAction: "Assign Follow-up",
      totalTouches: 3,
      requiresPhoneCall: true,
      phoneCallRequiredAt: new Date(now - 45 * 60 * 1000).toISOString(),
      daysSinceLastFollowUp: 0,
      escalationState: "Not escalated",
      ageDays: 15
    },
    {
      id: "CLM-203892",
      organizationId: "org_demo",
      payerId: "payer_humana",
      payerName: "Humana",
      claimNumber: "CLM-203892",
      patientName: "Ariana Patel",
      jurisdiction: "us",
      countryCode: "US",
      provinceOfService: null,
      status: "resolved",
      confidence: 0.91,
      slaAt: new Date(now + days(1)).toISOString(),
      owner: "Sarah Chen",
      priority: "normal",
      lastCheckedAt: new Date(now - hours(5)).toISOString(),
      normalizedStatusText: "Paid in full",
      amountCents: 198300,
      notes: "Resolved automatically after verified full payment response.",
      evidence: [
        {
          id: "artifact_CLM-203892_1",
          kind: "screenshot",
          label: "Humana payment confirmation",
          url: "https://example.com/evidence/CLM-203892/payment.png",
          createdAt: new Date(now - hours(5)).toISOString()
        }
      ],
      reviews: [],
      serviceDate: "2026-03-20",
      claimType: "Facility",
      allowedAmountCents: 198300,
      paidAmountCents: 198300,
      patientResponsibilityCents: 0,
      payerReferenceNumber: "REF-HUM-203892",
      currentPayerResponse: "Paid in full. No follow-up required.",
      currentQueue: "Resolved",
      nextAction: "Export Result",
      totalTouches: 1,
      requiresPhoneCall: false,
      phoneCallRequiredAt: null,
      daysSinceLastFollowUp: 0,
      escalationState: "Not escalated",
      ageDays: 6
    }
  ];

  const queue: QueueItem[] = [
    {
      id: "queue_CLM-204938",
      claimId: "CLM-204938",
      status: "needs_review",
      assignedTo: "Sarah Chen",
      reason: "Low confidence on extracted data",
      createdAt: new Date(now - hours(2)).toISOString(),
      slaAt: new Date(now + hours(16)).toISOString()
    },
    {
      id: "queue_CLM-204821",
      claimId: "CLM-204821",
      status: "blocked",
      assignedTo: "Marcus Williams",
      reason: "Escalation required",
      createdAt: new Date(now - days(1)).toISOString(),
      slaAt: new Date(now - hours(2)).toISOString()
    },
    {
      id: "queue_CLM-203657",
      claimId: "CLM-203657",
      status: "in_review",
      assignedTo: null,
      reason: "Awaiting payer response",
      createdAt: new Date(now - days(2)).toISOString(),
      slaAt: new Date(now + days(2)).toISOString()
    },
    {
      id: "queue_CLM-204102",
      claimId: "CLM-204102",
      status: "needs_review",
      assignedTo: "David Park",
      reason: "Missing evidence",
      createdAt: new Date(now - hours(4)).toISOString(),
      slaAt: new Date(now + hours(6)).toISOString()
    }
  ];

  const results: ResultRecord[] = [
    {
      id: "RES-104823",
      claimId: "CLM-204938",
      verifiedStatus: "Verified with Review",
      exportState: "Not Exported",
      lastVerifiedAt: new Date(now - hours(2)).toISOString(),
      nextAction: "Review Evidence",
      machineSummary:
        "Aetna returned a pending payer review state with partial payment indicators. Human verification is still required before the result can be accepted downstream.",
      recommendedNextSteps: [
        "Review the evidence packet",
        "Confirm the payment amount",
        "Approve or correct the result"
      ],
      agentTraceId: "trace_aetna_204938",
      routeReason: "Pending review language and partial payment indicators require governed review.",
      rationale: "The agent found a recoverable payment signal, but not a high-confidence final state.",
      connectorId: "payer-api-feed",
      connectorName: "Payer API Feed",
      executionMode: "api",
      executionObservedAt: new Date(now - hours(2)).toISOString(),
      executionDurationMs: 420
    },
    {
      id: "RES-104721",
      claimId: "CLM-204821",
      verifiedStatus: "Needs Human Follow-up",
      exportState: "Not Exported",
      lastVerifiedAt: new Date(now - 15 * 60 * 1000).toISOString(),
      nextAction: "Escalate to Specialist",
      machineSummary:
        "UnitedHealthcare returned a conflicting denial pattern that should not be auto-resolved.",
      recommendedNextSteps: [
        "Escalate to a specialist",
        "Compare with prior ERA output",
        "Document the escalation reason"
      ],
      agentTraceId: "trace_uhc_204821",
      routeReason: "Conflicting denial information pushed the claim into escalation review.",
      rationale: "The agent detected contradictory payer signals that should not auto-resolve.",
      connectorId: "portal-browser-fallback",
      connectorName: "Portal Browser Fallback",
      executionMode: "browser",
      executionObservedAt: new Date(now - 15 * 60 * 1000).toISOString(),
      executionDurationMs: 1350
    },
    {
      id: "RES-104598",
      claimId: "CLM-203657",
      verifiedStatus: "Verified",
      exportState: "Exported",
      lastVerifiedAt: new Date(now - hours(3)).toISOString(),
      nextAction: "Monitor for update",
      machineSummary:
        "Cigna still shows the claim in process with no conflicting fields detected.",
      recommendedNextSteps: [
        "Wait for payer update",
        "Schedule the next status check"
      ],
      agentTraceId: "trace_cigna_203657",
      routeReason: "The agent found a stable in-process state, so the workflow can continue monitoring.",
      rationale: "No contradictory fields were detected, but final payment has not yet posted.",
      connectorId: "portal-browser-fallback",
      connectorName: "Portal Browser Fallback",
      executionMode: "browser",
      executionObservedAt: new Date(now - hours(3)).toISOString(),
      executionDurationMs: 980
    },
    {
      id: "RES-104542",
      claimId: "CLM-204102",
      verifiedStatus: "Verified with Review",
      exportState: "Not Exported",
      lastVerifiedAt: new Date(now - hours(1)).toISOString(),
      nextAction: "Assign Follow-up",
      machineSummary:
        "Anthem BCBS requires additional information. The result is accurate but still needs human follow-up.",
      recommendedNextSteps: [
        "Collect missing records",
        "Assign an owner",
        "Re-run retrieval after submission"
      ],
      agentTraceId: "trace_anthem_204102",
      routeReason: "Missing-information language requires human follow-up and another governed retrieval.",
      rationale: "The payer response is consistent, but the workflow still needs manual evidence collection.",
      connectorId: "portal-browser-fallback",
      connectorName: "Portal Browser Fallback",
      executionMode: "browser",
      executionObservedAt: new Date(now - hours(1)).toISOString(),
      executionDurationMs: 1110
    },
    {
      id: "RES-104489",
      claimId: "CLM-203892",
      verifiedStatus: "Verified",
      exportState: "Exported",
      lastVerifiedAt: new Date(now - hours(5)).toISOString(),
      nextAction: "Export Result",
      machineSummary:
        "Humana confirmed full payment. The result is ready for downstream delivery.",
      recommendedNextSteps: ["Export result", "Close out the claim activity"],
      agentTraceId: "trace_humana_203892",
      routeReason: "Strong payment confirmation signal allowed workflow policy to accept the result.",
      rationale: "The agent found a clean paid-in-full outcome with no conflicting fields.",
      connectorId: "payer-api-feed",
      connectorName: "Payer API Feed",
      executionMode: "api",
      executionObservedAt: new Date(now - hours(5)).toISOString(),
      executionDurationMs: 390
    }
  ];

  const auditEvents: AuditEventRecord[] = [
    {
      id: "AUD-9284",
      at: new Date(now - hours(1)).toISOString(),
      actor: { name: "Sarah Chen", type: "human", avatar: "SC" },
      action: "Reassigned",
      object: "Claim",
      objectId: "CLM-204938",
      source: "Human",
      payer: "Aetna",
      summary: "Claim reassigned to Sarah Chen for low-confidence verification.",
      sensitivity: "normal",
      category: "Claim Workflow",
      beforeAfter: { owner: { from: "Unassigned", to: "Sarah Chen" } },
      reason: "Claims lead balanced the queue for the afternoon review block.",
      requestId: "REQ-48291",
      claimId: "CLM-204938"
    },
    {
      id: "AUD-9283",
      at: new Date(now - hours(2)).toISOString(),
      actor: { name: "System", type: "system", avatar: "SYS" },
      action: "Routed",
      object: "Claim",
      objectId: "CLM-204938",
      source: "System",
      payer: "Aetna",
      summary: "Claim routed to Needs Review after low-confidence extraction.",
      sensitivity: "normal",
      category: "Routing Decision",
      beforeAfter: {
        queue: { from: "Pending Retrieval", to: "Needs Review" },
        confidence: { from: "—", to: "72%" }
      },
      reason: "Confidence score 72% is below the workflow threshold.",
      requestId: "RUN-82847",
      claimId: "CLM-204938",
      resultId: "RES-104823"
    },
    {
      id: "AUD-9277",
      at: new Date(now - hours(5)).toISOString(),
      actor: { name: "Admin", type: "admin", avatar: "AD" },
      action: "Threshold Updated",
      object: "Configuration",
      objectId: "CFG-AETNA-01",
      source: "Admin",
      payer: "Aetna",
      summary: "Review threshold updated from 80% to 85% for Aetna claims.",
      sensitivity: "high-risk",
      category: "Config Change",
      beforeAfter: {
        confidenceThreshold: { from: "80%", to: "85%" }
      },
      reason: "Lower false positives in the first pilot queue.",
      requestId: "CFG-48275"
    }
  ];

  return { claims, queue, results, auditEvents };
}

export function formatRelativeTime(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (!Number.isFinite(diffMs)) {
    return "—";
  }
  // Future or same-moment references (e.g. mistaking SLA due time for "last activity") —
  // treat as immediate rather than clamping to a bogus "1m ago".
  if (diffMs <= 0) {
    return "just now";
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.floor(diffHours / 24)}d ago`;
}

/** Best-effort "last activity" time for claims still on the queue without a payer check yet. */
export function claimActivityReference(claim: ClaimRecord, queueItem: QueueItem | undefined) {
  return claim.lastCheckedAt ?? queueItem?.createdAt ?? claim.slaAt;
}

function formatDateLabel(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatTimeLabel(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDurationMs(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function getSlaRisk(slaAt: string): "healthy" | "at-risk" | "breached" {
  const diff = new Date(slaAt).getTime() - Date.now();

  if (diff < 0) return "breached";
  if (diff < hours(8)) return "at-risk";
  return "healthy";
}

export function statusLabel(status: ClaimStatus, normalizedStatusText: string) {
  if (status === "resolved") return "Resolved";
  if (status === "blocked") return "Escalated";
  if (status === "needs_review") return "Needs Review";
  if (status === "in_review") return normalizedStatusText || "In Review";
  return normalizedStatusText || "Pending";
}

function getMachineSummary(claim: ClaimRecord, result: ResultRecord | undefined) {
  return (
    result?.machineSummary ??
    `${claim.payerName} returned "${claim.normalizedStatusText}" with ${Math.round(
      claim.confidence * 100
    )}% confidence.`
  );
}

function getRecommendedNextSteps(
  claim: ClaimRecord,
  result: ResultRecord | undefined
) {
  return (
    result?.recommendedNextSteps ?? [
      claim.nextAction,
      "Review the evidence packet",
      "Update the claim owner if manual action is required"
    ]
  );
}

export function serializeAuditEvent(event: AuditEventRecord): AuditEventView {
  return {
    id: event.id,
    time: formatTimeLabel(event.at),
    date: formatDateLabel(event.at),
    actor: event.actor,
    action: event.action,
    object: event.object,
    objectId: event.objectId,
    source: event.source,
    payer: event.payer,
    summary: event.summary,
    sensitivity: event.sensitivity,
    category: event.category,
    beforeAfter: event.beforeAfter,
    reason: event.reason,
    requestId: event.requestId
  };
}

export function toClaimSummary(claim: ClaimRecord): ClaimSummary {
  return {
    id: claim.id,
    organizationId: claim.organizationId,
    payerId: claim.payerId,
    claimNumber: claim.claimNumber,
    patientName: claim.patientName,
    jurisdiction: claim.jurisdiction,
    countryCode: claim.countryCode,
    provinceOfService: claim.provinceOfService,
    claimType: claim.claimType,
    status: claim.status,
    confidence: claim.confidence,
    slaAt: claim.slaAt,
    owner: claim.owner,
    priority: claim.priority
  };
}

export function toClaimDetail(claim: ClaimRecord): ClaimDetail {
  return {
    id: claim.id,
    organizationId: claim.organizationId,
    payerId: claim.payerId,
    payerName: claim.payerName,
    claimNumber: claim.claimNumber,
    patientName: claim.patientName,
    jurisdiction: claim.jurisdiction,
    countryCode: claim.countryCode,
    provinceOfService: claim.provinceOfService,
    claimType: claim.claimType,
    status: claim.status,
    confidence: claim.confidence,
    slaAt: claim.slaAt,
    owner: claim.owner,
    priority: claim.priority,
    lastCheckedAt: claim.lastCheckedAt,
    normalizedStatusText: claim.normalizedStatusText,
    amountCents: claim.amountCents,
    notes: claim.notes,
    evidence: claim.evidence,
    reviews: claim.reviews
  };
}

export function buildPilotQueueItems(
  claims: ClaimRecord[],
  queue: QueueItem[]
): PilotQueueItem[] {
  const claimMap = new Map(claims.map((claim) => [claim.id, claim] as const));

  return queue
    .map((item) => {
      const claim = claimMap.get(item.claimId);
      if (!claim) return null;

      const queueItem: PilotQueueItem = {
        id: claim.id,
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        patientName: claim.patientName,
        payerName: claim.payerName,
        jurisdiction: claim.jurisdiction,
        countryCode: claim.countryCode,
        provinceOfService: claim.provinceOfService,
        claimType: claim.claimType ?? null,
        claimStatus: statusLabel(claim.status, claim.normalizedStatusText),
        nextAction: claim.nextAction,
        queueReason: item.reason,
        owner: claim.owner,
        lastUpdate: formatRelativeTime(claim.lastCheckedAt ?? item.createdAt),
        age: `${claim.ageDays} days`,
        slaRisk: getSlaRisk(item.slaAt),
        confidence: Math.round(claim.confidence * 100),
        evidenceCount: claim.evidence.length,
        priority: claim.priority
      };

      return queueItem;
    })
    .filter((item): item is PilotQueueItem => item !== null);
}

export function buildPilotClaimDetail(
  claimId: string,
  claims: ClaimRecord[],
  results: ResultRecord[],
  auditEvents: AuditEventRecord[],
  queue: QueueItem[]
): PilotClaimDetail | null {
  const claim = claims.find((item) => item.id === claimId);
  if (!claim) return null;

  const queueItem = queue.find((item) => item.claimId === claim.id);
  const activityRef = claimActivityReference(claim, queueItem);

  const result = results.find((item) => item.claimId === claimId);
  const claimAuditEvents = auditEvents
    .filter((event) => event.claimId === claimId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map(serializeAuditEvent);

  return {
    item: toClaimDetail(claim),
    serviceDate: claim.serviceDate,
    claimType: claim.claimType,
    jurisdiction: claim.jurisdiction,
    countryCode: claim.countryCode,
    provinceOfService: claim.provinceOfService,
    allowedAmountCents: claim.allowedAmountCents,
    paidAmountCents: claim.paidAmountCents,
    patientResponsibilityCents: claim.patientResponsibilityCents,
    payerReferenceNumber: claim.payerReferenceNumber,
    currentPayerResponse: claim.currentPayerResponse,
    currentQueue: claim.currentQueue,
    nextAction: claim.nextAction,
    totalTouches: claim.totalTouches,
    requiresPhoneCall: claim.requiresPhoneCall,
    phoneCallRequiredAt: claim.phoneCallRequiredAt,
    daysSinceLastFollowUp: claim.daysSinceLastFollowUp,
    escalationState: claim.escalationState,
    statusLabel: statusLabel(claim.status, claim.normalizedStatusText),
    lastUpdatedLabel: formatRelativeTime(activityRef),
    slaLabel:
      getSlaRisk(claim.slaAt) === "breached"
        ? "Breached"
        : `${Math.max(
            1,
            Math.round((new Date(claim.slaAt).getTime() - Date.now()) / hours(1))
          )}h remaining`,
    machineSummary: getMachineSummary(claim, result),
    recommendedNextSteps: getRecommendedNextSteps(claim, result),
    agentInsights: {
      connectorName: result?.connectorName ?? "Agent runtime",
      executionMode: result?.executionMode ?? "browser",
      traceId: result?.agentTraceId ?? null,
      rationale:
        result?.rationale ??
        "Agentic retrieval observed the payer response and returned a candidate summary for workflow review.",
      routeReason:
        result?.routeReason ??
        "Workflow policy used the candidate signal to decide whether the claim should resolve or remain in review.",
      lastObservedAt: result?.executionObservedAt ?? activityRef,
      executionDurationLabel: formatDurationMs(result?.executionDurationMs ?? 0)
    },
    activityTimeline: claimAuditEvents,
    auditTrail: [
      {
        label: "Created",
        value: `${claim.ageDays} days ago`,
        subtext: "System Import"
      },
      {
        label: "Last Retrieved",
        value: formatRelativeTime(activityRef),
        subtext: "Automated"
      },
      {
        label: "Assigned By",
        value: claim.owner ? formatRelativeTime(activityRef) : "Unassigned",
        subtext: claim.owner ?? "Queue"
      },
      {
        label: "Last Note",
        value: formatRelativeTime(
          claim.reviews[0]?.createdAt ?? activityRef
        ),
        subtext: claim.reviews[0]?.reviewer ?? "System"
      }
    ]
  };
}

export function buildResultSummaries(
  claims: ClaimRecord[],
  results: ResultRecord[]
): ResultSummaryView[] {
  const claimMap = new Map(claims.map((claim) => [claim.id, claim] as const));

  return results
    .map((result) => {
      const claim = claimMap.get(result.claimId);
      if (!claim) return null;

      return {
        resultId: result.id,
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        payer: claim.payerName,
        verifiedStatus: result.verifiedStatus,
        confidence: Math.round(claim.confidence * 100),
        lastVerified: formatRelativeTime(result.lastVerifiedAt),
        evidenceCount: claim.evidence.length,
        exportState: result.exportState,
        nextAction: result.nextAction
      } satisfies ResultSummaryView;
    })
    .filter((item): item is ResultSummaryView => Boolean(item));
}

export function buildResultDetail(
  resultId: string,
  claims: ClaimRecord[],
  results: ResultRecord[]
): ResultDetailView | null {
  const result = results.find((item) => item.id === resultId);
  if (!result) return null;

  const claim = claims.find((item) => item.id === result.claimId);
  if (!claim) return null;

  return {
    id: result.id,
    claimId: claim.id,
    claimNumber: claim.claimNumber,
    payerName: claim.payerName,
    patientName: claim.patientName,
    serviceDate: claim.serviceDate,
    billedAmountCents: claim.amountCents,
    claimStatus: statusLabel(claim.status, claim.normalizedStatusText),
    confidence: Math.round(claim.confidence * 100),
    lastVerified: formatRelativeTime(result.lastVerifiedAt),
    nextAction: result.nextAction,
    verifiedStatus: result.verifiedStatus,
    machineSummary: result.machineSummary,
    recommendedNextSteps: result.recommendedNextSteps,
    agentTraceId: result.agentTraceId,
    evidence: claim.evidence,
    portalText: claim.normalizedStatusText,
    metadata: [
      `Source: ${result.connectorName} (${result.executionMode})`,
      `Retrieved: ${formatDateLabel(result.lastVerifiedAt)} ${formatTimeLabel(
        result.lastVerifiedAt
      )}`,
      `Trace ID: ${result.agentTraceId ?? "Not captured"}`
    ]
  };
}

export function buildAuditLog(auditEvents: AuditEventRecord[]) {
  return [...auditEvents]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map(serializeAuditEvent);
}

export function computeRetrievalOutcome(params: {
  claim: ClaimRecord;
  queueItem: QueueItem | undefined;
  existingResult: ResultRecord | undefined;
  candidate: ExecutionCandidate;
  decision: WorkflowDecision;
}) {
  const { claim, queueItem, existingResult, candidate, decision } = params;
  const previousStatus = claim.status;
  const previousStatusLabel = statusLabel(previousStatus, claim.normalizedStatusText);
  const previousConfidence = claim.confidence;
  const nowIso = new Date().toISOString();
  const resultId =
    existingResult?.id ?? `RES-${claim.id.replace(/\D/g, "").slice(-6)}`;
  const requestId = `RUN-${Date.now()}`;

  const updatedClaim: ClaimRecord = {
    ...claim,
    status: decision.nextStatus,
    confidence: candidate.confidence,
    lastCheckedAt: nowIso,
    requiresPhoneCall: false,
    phoneCallRequiredAt: null,
    normalizedStatusText: candidate.normalizedStatusText,
    notes:
      candidate.rawNotes ??
      "Retrieval completed through the pilot execution path. Workflow state updated from candidate output.",
    evidence: candidate.evidence,
    totalTouches: claim.totalTouches + 1,
    daysSinceLastFollowUp: 0,
    currentQueue:
      decision.nextStatus === "resolved"
        ? "Resolved"
        : decision.nextStatus === "blocked"
          ? "Escalation Required"
          : "Needs Review",
    nextAction:
      candidate.recommendedAction === "resolve"
        ? "Export Result"
        : candidate.recommendedAction === "retry"
          ? "Request Re-check"
          : "Review Evidence",
    reviews:
      decision.nextStatus === "needs_review"
        ? [
            {
              id: `review_${claim.id}_${Date.now()}`,
              status: "pending",
              reason: candidate.routeReason || decision.reason,
              reviewer: null,
              createdAt: nowIso
            },
            ...claim.reviews
          ]
        : claim.reviews
  };

  const updatedQueueItem =
    decision.nextStatus === "resolved"
      ? null
      : {
          id: `queue_${claim.id}`,
          claimId: claim.id,
          status: decision.nextStatus,
          assignedTo: updatedClaim.owner,
          reason: decision.reason,
          createdAt: queueItem?.createdAt ?? nowIso,
          slaAt: updatedClaim.slaAt
        } satisfies QueueItem;

  const updatedResult: ResultRecord = {
    id: resultId,
    claimId: claim.id,
    verifiedStatus:
      decision.nextStatus === "resolved"
        ? "Verified"
        : candidate.confidence < 0.6
          ? "Needs Human Follow-up"
          : "Verified with Review",
    exportState: "Not Exported",
    lastVerifiedAt: nowIso,
    nextAction: updatedClaim.nextAction,
    machineSummary: `${updatedClaim.payerName} returned "${candidate.normalizedStatusText}" with ${Math.round(
      candidate.confidence * 100
    )}% confidence via ${candidate.execution.connectorName}.`,
    recommendedNextSteps:
      decision.nextStatus === "resolved"
        ? ["Export result", "Close the claim activity"]
        : [
            "Review evidence",
            "Confirm the workflow decision",
            "Route the claim to the correct owner"
          ],
    agentTraceId: candidate.agentTraceId ?? null,
    routeReason: candidate.routeReason,
    rationale: candidate.rationale,
    connectorId: candidate.execution.connectorId,
    connectorName: candidate.execution.connectorName,
    executionMode: candidate.execution.executionMode,
    executionObservedAt: candidate.execution.observedAt,
    executionDurationMs: candidate.execution.durationMs
  };

  const retrievalEvents: AuditEventRecord[] = [
    {
      id: `AUD-${Date.now()}`,
      at: nowIso,
      actor: { name: "System", type: "system", avatar: "SYS" },
      action: "Retrieved",
      object: "Result",
      objectId: resultId,
      source: "System",
      payer: updatedClaim.payerName,
      summary: `Claim status retrieved through ${candidate.execution.connectorName} and attached to the evidence bundle.`,
      sensitivity: "normal",
      category: "Retrieval Action",
      beforeAfter: {
        confidence: {
          from: `${Math.round(previousConfidence * 100)}%`,
          to: `${Math.round(candidate.confidence * 100)}%`
        }
      },
      reason:
        candidate.rawNotes ??
        `${candidate.rationale} ${candidate.routeReason}`,
      requestId,
      claimId: claim.id,
      resultId
    },
    {
      id: `AUD-${Date.now() + 1}`,
      at: nowIso,
      actor: { name: "System", type: "system", avatar: "SYS" },
      action: "Routed",
      object: "Claim",
      objectId: claim.id,
      source: "System",
      payer: updatedClaim.payerName,
      summary: `Workflow layer updated the claim from ${previousStatusLabel} to ${statusLabel(
        decision.nextStatus,
        candidate.normalizedStatusText
      )}.`,
      sensitivity: "normal",
      category: "Routing Decision",
      beforeAfter: {
        status: {
          from: previousStatusLabel,
          to: statusLabel(decision.nextStatus, candidate.normalizedStatusText)
        }
      },
      reason: candidate.routeReason || decision.reason,
      requestId,
      claimId: claim.id,
      resultId
    }
  ];

  return {
    claim: updatedClaim,
    queueItem: updatedQueueItem,
    result: updatedResult,
    auditEvents: retrievalEvents
  };
}
