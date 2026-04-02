import type { ExecutionFailureCategory } from "@tenio/contracts";
import type { QueueItem } from "@tenio/domain";

import type { AppRole } from "../auth.js";
import type { WorkflowDecision } from "../services/review-policy-service.js";
import {
  formatRelativeTime,
  statusLabel,
  type AuditEventRecord,
  type ClaimRecord,
  type ResultRecord
} from "./pilot-state.js";

export type WorkflowActor = {
  id: string;
  name: string;
  role: AppRole;
  organizationId: string;
  email?: string;
  type: "human" | "system" | "admin";
};

export type AppUserRecord = {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: AppRole;
  passwordHash: string;
  isActive: boolean;
};

export type SessionRecord = {
  id: string;
  userId: string;
  organizationId: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type RetrievalJobStatus =
  | "queued"
  | "processing"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled";

export type RetrievalAttemptRecord = {
  attempt: number;
  connectorId: string | null;
  connectorName: string | null;
  executionMode: "browser" | "api" | null;
  startedAt: string;
  finishedAt: string | null;
  status: "completed" | "retrying" | "failed";
  summary: string;
  traceId: string | null;
  failureCategory: ExecutionFailureCategory | null;
};

export type RetrievalJobRecord = {
  id: string;
  organizationId: string;
  claimId: string;
  status: RetrievalJobStatus;
  priority: ClaimRecord["priority"];
  attempts: number;
  maxAttempts: number;
  queuedBy: string | null;
  reservedBy: string | null;
  availableAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastAttemptedAt: string | null;
  lastError: string | null;
  failureCategory: ExecutionFailureCategory | null;
  retryable: boolean;
  connectorId: string | null;
  connectorName: string | null;
  executionMode: "browser" | "api" | null;
  agentTraceId: string | null;
  reviewReason: string | null;
  attemptHistory: RetrievalAttemptRecord[];
  createdAt: string;
  updatedAt: string;
};

export type PayerConfigurationRecord = {
  id: string;
  organizationId: string;
  payerId: string;
  payerName: string;
  status: "active" | "needs_attention" | "inactive";
  owner: string;
  lastVerifiedAt: string;
  enabledWorkflows: string[];
  reviewThreshold: number;
  statusRules: string[];
  reviewRules: string[];
  destinations: Array<{
    id: string;
    label: string;
    kind: "webhook" | "sftp";
    status: "active" | "inactive";
  }>;
  issues: string[];
};

export type ClaimsListItemView = {
  id: string;
  claimId: string;
  claimNumber: string;
  payerName: string;
  patientName: string;
  serviceDate: string;
  currentStatus: string;
  owner: string | null;
  lastUpdated: string;
  resolutionState: string;
  evidenceCount: number;
  followUpReason: string;
  priority: ClaimRecord["priority"];
};

export type PerformanceMetricsView = {
  summary: {
    claimsWorkedToday: number;
    avgResolutionTimeDays: string;
    slaCompliance: string;
    needsReview: number;
    claimsResolved: number;
    touchesRemoved: number;
  };
  agentOverview: {
    automationCoverage: string;
    reviewRate: string;
    retryQueue: number;
    failedRuns: number;
    lowConfidenceRate: string;
  };
  resolutionTrend: Array<{ date: string; resolved: number; unresolved: number }>;
  queueVolume: Array<{ status: string; count: number }>;
  agingBuckets: Array<{ name: string; value: number; color: string }>;
  payerPerformance: Array<{
    payer: string;
    openClaims: number;
    avgResolutionTime: string;
    risk: "Low" | "Medium" | "High";
    reviewRate: string;
    lastDelay: string;
  }>;
  teamPerformance: Array<{
    owner: string;
    activeClaims: number;
    resolvedThisWeek: number;
    avgTouches: string;
    slaCompliance: string;
    escalationRate: string;
  }>;
  connectorHealth: Array<{
    connector: string;
    mode: "browser" | "api";
    completed: number;
    retried: number;
    failed: number;
    successRate: string;
    lastActivity: string;
    lastError: string;
  }>;
  alerts: Array<{
    title: string;
    body: string;
    severity: "good" | "warning" | "critical";
    time: string;
  }>;
};

export function createSeedPayerConfigurations(
  organizationId: string
): PayerConfigurationRecord[] {
  const now = Date.now();

  return [
    {
      id: "cfg_aetna",
      organizationId,
      payerId: "payer_aetna",
      payerName: "Aetna",
      status: "active",
      owner: "Sarah Chen",
      lastVerifiedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      enabledWorkflows: ["Claim Status"],
      reviewThreshold: 0.85,
      statusRules: [
        'Portal text "In process" -> In Review',
        'Portal text "Pending review" -> Needs Review'
      ],
      reviewRules: ["Low confidence threshold", "Conflicting payment fields"],
      destinations: [
        {
          id: "dest_aetna_primary",
          label: "Practice Management System API",
          kind: "webhook",
          status: "active"
        }
      ],
      issues: []
    },
    {
      id: "cfg_uhc",
      organizationId,
      payerId: "payer_uhc",
      payerName: "UnitedHealthcare",
      status: "needs_attention",
      owner: "Marcus Williams",
      lastVerifiedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      enabledWorkflows: ["Claim Status"],
      reviewThreshold: 0.8,
      statusRules: ['Portal text "Denied" -> Blocked'],
      reviewRules: ["Conflicting status information", "Escalation required"],
      destinations: [
        {
          id: "dest_uhc_primary",
          label: "Practice Management System API",
          kind: "webhook",
          status: "active"
        }
      ],
      issues: ["Portal verification overdue", "Escalation rate above threshold"]
    },
    {
      id: "cfg_cigna",
      organizationId,
      payerId: "payer_cigna",
      payerName: "Cigna",
      status: "active",
      owner: "David Park",
      lastVerifiedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      enabledWorkflows: ["Claim Status"],
      reviewThreshold: 0.82,
      statusRules: ['Portal text "Processed" -> Resolved'],
      reviewRules: ["Low confidence threshold"],
      destinations: [
        {
          id: "dest_cigna_primary",
          label: "Practice Management System API",
          kind: "webhook",
          status: "active"
        }
      ],
      issues: []
    }
  ];
}

export function buildClaimsList(claims: ClaimRecord[]): ClaimsListItemView[] {
  const priorityRank: Record<ClaimRecord["priority"], number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3
  };

  const statusRank: Record<ClaimRecord["status"], number> = {
    blocked: 0,
    needs_review: 1,
    pending: 2,
    in_review: 3,
    resolved: 4
  };

  return [...claims]
    .sort((left, right) => {
      const statusDelta = statusRank[left.status] - statusRank[right.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }

      const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const leftSla = new Date(left.slaAt).getTime();
      const rightSla = new Date(right.slaAt).getTime();
      if (leftSla !== rightSla) {
        return leftSla - rightSla;
      }

      const leftUpdated = new Date(left.lastCheckedAt ?? left.slaAt).getTime();
      const rightUpdated = new Date(right.lastCheckedAt ?? right.slaAt).getTime();
      if (leftUpdated !== rightUpdated) {
        return rightUpdated - leftUpdated;
      }

      return left.claimNumber.localeCompare(right.claimNumber);
    })
    .map((claim) => ({
      id: claim.id,
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      payerName: claim.payerName,
      patientName: claim.patientName,
      serviceDate: claim.serviceDate,
      currentStatus: statusLabel(claim.status, claim.normalizedStatusText),
      owner: claim.owner,
      lastUpdated: formatRelativeTime(claim.lastCheckedAt ?? claim.slaAt),
      resolutionState:
        claim.status === "resolved"
          ? "Resolved"
          : claim.status === "blocked"
            ? "Escalated"
            : "In Progress",
      evidenceCount: claim.evidence.length,
      followUpReason: claim.notes ?? claim.nextAction,
      priority: claim.priority
    }));
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function buildPerformanceMetrics(params: {
  claims: ClaimRecord[];
  queue: QueueItem[];
  results: ResultRecord[];
  jobs: RetrievalJobRecord[];
}) {
  const { claims, queue, results, jobs } = params;
  const now = Date.now();
  const claimsWorkedToday = claims.filter((claim) => {
    const lastChecked = claim.lastCheckedAt ? new Date(claim.lastCheckedAt).getTime() : 0;
    return now - lastChecked < 24 * 60 * 60 * 1000;
  }).length;
  const resolvedClaims = claims.filter((claim) => claim.status === "resolved").length;
  const atRiskCount = queue.filter((item) => new Date(item.slaAt).getTime() > now).length;
  const slaCompliance = queue.length === 0 ? 1 : atRiskCount / queue.length;
  const totalTouches = claims.reduce((sum, claim) => sum + claim.totalTouches, 0);
  const avgAge =
    claims.length === 0 ? 0 : claims.reduce((sum, claim) => sum + claim.ageDays, 0) / claims.length;
  const reviewedClaims = claims.filter(
    (claim) => claim.status === "needs_review" || claim.status === "blocked"
  ).length;
  const lowConfidenceClaims = claims.filter((claim) => claim.confidence < 0.85).length;

  const byPayer = new Map<
    string,
    { openClaims: number; reviewClaims: number; totalAge: number; lastCheckedAt: string[] }
  >();
  const byOwner = new Map<
    string,
    { activeClaims: number; resolved: number; touches: number; escalated: number; compliant: number }
  >();
  const byConnector = new Map<
    string,
    {
      connector: string;
      mode: "browser" | "api";
      completed: number;
      retried: number;
      failed: number;
      lastActivity: string | null;
      lastError: string | null;
    }
  >();

  for (const claim of claims) {
    const payerEntry = byPayer.get(claim.payerName) ?? {
      openClaims: 0,
      reviewClaims: 0,
      totalAge: 0,
      lastCheckedAt: []
    };
    payerEntry.openClaims += claim.status === "resolved" ? 0 : 1;
    payerEntry.reviewClaims += claim.status === "needs_review" ? 1 : 0;
    payerEntry.totalAge += claim.ageDays;
    if (claim.lastCheckedAt) {
      payerEntry.lastCheckedAt.push(claim.lastCheckedAt);
    }
    byPayer.set(claim.payerName, payerEntry);

    if (claim.owner) {
      const ownerEntry = byOwner.get(claim.owner) ?? {
        activeClaims: 0,
        resolved: 0,
        touches: 0,
        escalated: 0,
        compliant: 0
      };
      ownerEntry.activeClaims += claim.status === "resolved" ? 0 : 1;
      ownerEntry.resolved += claim.status === "resolved" ? 1 : 0;
      ownerEntry.touches += claim.totalTouches;
      ownerEntry.escalated += claim.status === "blocked" ? 1 : 0;
      ownerEntry.compliant += new Date(claim.slaAt).getTime() > now ? 1 : 0;
      byOwner.set(claim.owner, ownerEntry);
    }
  }

  for (const job of jobs) {
    const connectorKey = job.connectorId ?? "unassigned";
    const connectorEntry = byConnector.get(connectorKey) ?? {
      connector: job.connectorName ?? "Connector pending",
      mode: job.executionMode ?? "browser",
      completed: 0,
      retried: 0,
      failed: 0,
      lastActivity: null,
      lastError: null
    };

    if (job.status === "completed") {
      connectorEntry.completed += 1;
    } else if (job.status === "retrying") {
      connectorEntry.retried += 1;
    } else if (job.status === "failed") {
      connectorEntry.failed += 1;
      connectorEntry.lastError = job.lastError;
    }

    const activityAt = job.completedAt ?? job.lastAttemptedAt ?? job.updatedAt;
    if (!connectorEntry.lastActivity || new Date(activityAt).getTime() > new Date(connectorEntry.lastActivity).getTime()) {
      connectorEntry.lastActivity = activityAt;
    }

    byConnector.set(connectorKey, connectorEntry);
  }

  const payerPerformance = [...byPayer.entries()].map(([payer, value]) => {
    const avgResolutionDays = value.openClaims + value.reviewClaims === 0
      ? 0
      : value.totalAge / Math.max(value.openClaims + value.reviewClaims, 1);
    const reviewRate = value.openClaims === 0 ? 0 : value.reviewClaims / value.openClaims;
    const latestCheck = value.lastCheckedAt
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      payer,
      openClaims: value.openClaims,
      avgResolutionTime: `${avgResolutionDays.toFixed(1)}d`,
      risk: reviewRate > 0.4 ? "High" : reviewRate > 0.2 ? "Medium" : "Low",
      reviewRate: pct(reviewRate),
      lastDelay: latestCheck ? formatRelativeTime(latestCheck) : "No runs yet"
    } as const;
  });

  const teamPerformance = [...byOwner.entries()].map(([owner, value]) => ({
    owner,
    activeClaims: value.activeClaims,
    resolvedThisWeek: value.resolved,
    avgTouches:
      value.activeClaims + value.resolved === 0
        ? "0.0"
        : (value.touches / (value.activeClaims + value.resolved)).toFixed(1),
    slaCompliance:
      value.activeClaims === 0 ? "100%" : pct(value.compliant / value.activeClaims),
    escalationRate:
      value.activeClaims === 0 ? "0%" : pct(value.escalated / value.activeClaims)
  }));

  const connectorHealth = [...byConnector.values()].map((connector) => {
    const totalRuns = connector.completed + connector.retried + connector.failed;
    const successRate = totalRuns === 0 ? "0%" : pct(connector.completed / totalRuns);

    return {
      connector: connector.connector,
      mode: connector.mode,
      completed: connector.completed,
      retried: connector.retried,
      failed: connector.failed,
      successRate,
      lastActivity: connector.lastActivity
        ? formatRelativeTime(connector.lastActivity)
        : "No recent runs",
      lastError: connector.lastError ?? "None"
    };
  });

  const alerts: PerformanceMetricsView["alerts"] = [];

  const highRiskPayer = payerPerformance.find((payer) => payer.risk === "High");
  if (highRiskPayer) {
    alerts.push({
      title: `${highRiskPayer.payer} review queue building`,
      body: `${highRiskPayer.reviewRate} of open claims need review. Consider assigning additional capacity.`,
      severity: "warning" as const,
      time: "Current"
    });
  }

  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  const retryingJobs = jobs.filter((job) => job.status === "retrying").length;
  if (failedJobs > 0) {
    alerts.push({
      title: "Failed retrieval jobs need attention",
      body: `${failedJobs} retrieval job${failedJobs === 1 ? "" : "s"} failed and should be retried or escalated.`,
      severity: "critical" as const,
      time: "Current"
    });
  }

  if (retryingJobs > 0) {
    alerts.push({
      title: "Agent retries are active",
      body: `${retryingJobs} retrieval job${retryingJobs === 1 ? "" : "s"} are waiting for another execution attempt.`,
      severity: "warning" as const,
      time: "Current"
    });
  }

  alerts.push({
    title: "SLA compliance snapshot",
    body: `${pct(slaCompliance)} of active queue items are still within SLA.`,
    severity: slaCompliance > 0.9 ? "good" : "warning",
    time: "Current"
  });

  const unresolved = claims.length - resolvedClaims;

  return {
    summary: {
      claimsWorkedToday,
      avgResolutionTimeDays: `${avgAge.toFixed(1)}d`,
      slaCompliance: pct(slaCompliance),
      needsReview: claims.filter((claim) => claim.status === "needs_review").length,
      claimsResolved: resolvedClaims,
      touchesRemoved: Math.max(0, resolvedClaims * 2 - totalTouches)
    },
    agentOverview: {
      automationCoverage: claims.length === 0 ? "0%" : pct(results.length / claims.length),
      reviewRate: results.length === 0 ? "0%" : pct(reviewedClaims / results.length),
      retryQueue: retryingJobs,
      failedRuns: failedJobs,
      lowConfidenceRate: claims.length === 0 ? "0%" : pct(lowConfidenceClaims / claims.length)
    },
    resolutionTrend: [
      {
        date: "Open",
        resolved: resolvedClaims,
        unresolved
      }
    ],
    queueVolume: [
      {
        status: "In Review",
        count: claims.filter((claim) => claim.status === "in_review").length
      },
      {
        status: "Needs Review",
        count: claims.filter((claim) => claim.status === "needs_review").length
      },
      {
        status: "Escalated",
        count: claims.filter((claim) => claim.status === "blocked").length
      },
      {
        status: "Resolved",
        count: resolvedClaims
      }
    ],
    agingBuckets: [
      {
        name: "0-5 days",
        value: claims.filter((claim) => claim.ageDays <= 5).length,
        color: "#10b981"
      },
      {
        name: "6-10 days",
        value: claims.filter((claim) => claim.ageDays > 5 && claim.ageDays <= 10).length,
        color: "#3b82f6"
      },
      {
        name: "11-15 days",
        value: claims.filter((claim) => claim.ageDays > 10 && claim.ageDays <= 15).length,
        color: "#f59e0b"
      },
      {
        name: "16+ days",
        value: claims.filter((claim) => claim.ageDays > 15).length,
        color: "#ef4444"
      }
    ],
    payerPerformance,
    teamPerformance,
    connectorHealth,
    alerts
  } satisfies PerformanceMetricsView;
}

export function applyClaimWorkflowAction(params: {
  claim: ClaimRecord;
  queueItem: QueueItem | undefined;
  existingResult: ResultRecord | undefined;
  action:
    | "assign_owner"
    | "add_note"
    | "approve_review"
    | "resolve_claim"
    | "escalate_claim"
    | "reopen_claim";
  actor: WorkflowActor;
  assignee?: string;
  note?: string;
}) {
  const { claim, queueItem, existingResult, action, actor, assignee, note } = params;
  const nowIso = new Date().toISOString();
  let nextStatus = claim.status;
  let nextAction = claim.nextAction;
  let reviewReason = note ?? claim.notes ?? "Manual workflow update";
  let queueReason = queueItem?.reason ?? reviewReason;

  if (action === "assign_owner") {
    queueReason = `Assigned to ${assignee ?? "new owner"}`;
  } else if (action === "approve_review") {
    nextStatus = "in_review";
    nextAction = "Monitor payer response";
    queueReason = "Approved for active monitoring";
    reviewReason = note ?? "Review approved by operator.";
  } else if (action === "resolve_claim") {
    nextStatus = "resolved";
    nextAction = "Export Result";
    queueReason = "Resolved by reviewer";
    reviewReason = note ?? "Claim resolved by reviewer.";
  } else if (action === "escalate_claim") {
    nextStatus = "blocked";
    nextAction = "Escalate to Specialist";
    queueReason = "Escalated for specialist handling";
    reviewReason = note ?? "Escalated by reviewer.";
  } else if (action === "reopen_claim") {
    nextStatus = "needs_review";
    nextAction = "Review Evidence";
    queueReason = "Reopened for manual review";
    reviewReason = note ?? "Claim reopened.";
  }

  const updatedClaim: ClaimRecord = {
    ...claim,
    owner: action === "assign_owner" ? assignee ?? claim.owner : claim.owner,
    status: nextStatus,
    lastCheckedAt: nowIso,
    notes:
      action === "add_note"
        ? [note?.trim(), claim.notes].filter(Boolean).join("\n\n")
        : reviewReason,
    nextAction,
    currentQueue:
      nextStatus === "resolved"
        ? "Resolved"
        : nextStatus === "blocked"
          ? "Escalation Required"
          : nextStatus === "in_review"
            ? "In Review"
            : "Needs Review",
    reviews:
      action === "add_note" || action === "assign_owner"
        ? claim.reviews
        : [
            {
              id: `review_${claim.id}_${Date.now()}`,
              status:
                action === "approve_review"
                  ? "approved"
                  : action === "escalate_claim"
                    ? "escalated"
                    : action === "reopen_claim"
                      ? "corrected"
                      : "approved",
              reason: reviewReason,
              reviewer: actor.name,
              createdAt: nowIso
            },
            ...claim.reviews
          ]
  };

  const updatedQueueItem =
    nextStatus === "resolved"
      ? null
      : {
          id: `queue_${claim.id}`,
          claimId: claim.id,
          status: nextStatus,
          assignedTo: updatedClaim.owner,
          reason: queueReason,
          createdAt: queueItem?.createdAt ?? nowIso,
          slaAt: updatedClaim.slaAt
        } satisfies QueueItem;

  const updatedResult = existingResult
    ? {
        ...existingResult,
        nextAction: updatedClaim.nextAction,
        verifiedStatus:
          nextStatus === "resolved"
            ? "Verified"
            : nextStatus === "blocked"
              ? "Needs Human Follow-up"
              : "Verified with Review",
        lastVerifiedAt: nowIso
      }
    : undefined;

  const auditEvent: AuditEventRecord = {
    id: `AUD-${Date.now()}`,
    at: nowIso,
    actor: {
      name: actor.name,
      type: actor.type === "admin" ? "admin" : actor.type,
      avatar: actor.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    },
    action:
      action === "assign_owner"
        ? "Assigned"
        : action === "add_note"
          ? "Commented"
          : action === "approve_review"
            ? "Approved"
            : action === "resolve_claim"
              ? "Resolved"
              : action === "escalate_claim"
                ? "Escalated"
                : "Reopened",
    object: "Claim",
    objectId: claim.id,
    source: "Human",
    payer: claim.payerName,
    summary:
      action === "assign_owner"
        ? `${actor.name} assigned ${claim.claimNumber} to ${assignee ?? claim.owner ?? "the current owner"}.`
        : `${actor.name} updated ${claim.claimNumber}: ${reviewReason}`,
    sensitivity: "normal",
    category:
      action === "add_note" ? "Comment" : action === "assign_owner" ? "Assignment" : "Claim Workflow",
    beforeAfter:
      action === "assign_owner"
        ? {
            owner: {
              from: claim.owner ?? "Unassigned",
              to: assignee ?? claim.owner ?? "Unassigned"
            }
          }
        : action === "add_note"
          ? undefined
          : {
              status: {
                from: statusLabel(claim.status, claim.normalizedStatusText),
                to: statusLabel(updatedClaim.status, updatedClaim.normalizedStatusText)
              }
            },
    reason: reviewReason,
    claimId: claim.id,
    resultId: updatedResult?.id
  };

  return {
    claim: updatedClaim,
    queueItem: updatedQueueItem,
    result: updatedResult,
    auditEvent
  };
}

export function buildWorkerDecision(candidateConfidence: number): WorkflowDecision {
  if (candidateConfidence >= 0.9) {
    return {
      nextStatus: "resolved",
      reason: "High-confidence retrieval result qualifies for automatic resolution."
    };
  }

  if (candidateConfidence < 0.6) {
    return {
      nextStatus: "blocked",
      reason: "Low-confidence retrieval result requires specialist follow-up."
    };
  }

  return {
    nextStatus: "needs_review",
    reason: "Operator review required before the result can be finalized."
  };
}
