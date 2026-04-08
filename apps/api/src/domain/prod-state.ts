import type {
  AgentRunBudget,
  AgentRunTerminalReason,
  AgentStepResult,
  AgentToolName,
  ConnectorMode,
  ExecutionCandidate,
  ExecutionFailureCategory
} from "@tenio/contracts";
import type { QueueItem, UserRole } from "@tenio/domain";

import type { WorkflowDecision } from "../services/review-policy-service.js";
import {
  claimActivityReference,
  formatRelativeTime,
  statusLabel,
  type AuditEventRecord,
  type ClaimRecord,
  type ResultRecord
} from "./pilot-state.js";

export type WorkflowActor = {
  id: string;
  name: string;
  role: UserRole;
  organizationId: string;
  email?: string;
  type: "human" | "system" | "owner";
};

export type AppUserRecord = {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
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

export type AgentRunStatus =
  | "running"
  | "completed"
  | "retry_scheduled"
  | "review_required"
  | "failed";

export type AgentStepDirectiveKind = "tool_call" | "final" | "retry";

export type AgentStepRecord = {
  id: string;
  agentRunId: string;
  stepNumber: number;
  directiveKind: AgentStepDirectiveKind;
  toolName: AgentToolName | null;
  status: "started" | "completed";
  idempotencyKey: string;
  publicReason: string;
  toolArgs: {
    connectorId: string;
    mode: ConnectorMode;
    attemptLabel: string;
  } | null;
  plannerProvider: string | null;
  plannerModel: string | null;
  plannerInputTokens: number;
  plannerOutputTokens: number;
  result: AgentStepResult | null;
  startedAt: string;
  completedAt: string | null;
};

export type AgentRunRecord = {
  id: string;
  organizationId: string;
  retrievalJobId: string;
  claimId: string;
  status: AgentRunStatus;
  protocolVersion: 1;
  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  heartbeatAt: string | null;
  startedAt: string;
  completedAt: string | null;
  modelProvider: string | null;
  modelName: string | null;
  modelCallsUsed: number;
  inputTokensUsed: number;
  outputTokensUsed: number;
  totalTokensUsed: number;
  connectorSwitchCount: number;
  terminalReason: AgentRunTerminalReason | null;
  finalCandidate: ExecutionCandidate | null;
  budget: AgentRunBudget;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayerConfigurationRecord = {
  id: string;
  organizationId: string;
  payerId: string;
  payerName: string;
  jurisdiction: "us" | "ca";
  countryCode: "US" | "CA";
  status: "active" | "needs_attention" | "inactive";
  owner: string;
  lastVerifiedAt: string;
  enabledWorkflows: string[];
  reviewThreshold: number;
  escalationThreshold: number;
  defaultSlaHours: number;
  autoAssignOwner: boolean;
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

export function derivePayerConfigurationIssues(config: Pick<
  PayerConfigurationRecord,
  | "lastVerifiedAt"
  | "destinations"
  | "reviewThreshold"
  | "escalationThreshold"
  | "defaultSlaHours"
  | "autoAssignOwner"
  | "owner"
>) {
  const issues: string[] = [];
  const daysSinceVerification =
    (Date.now() - new Date(config.lastVerifiedAt).getTime()) / (24 * 60 * 60 * 1000);

  if (daysSinceVerification > 4) {
    issues.push("Portal verification overdue");
  }

  if (!config.destinations.some((destination) => destination.status === "active")) {
    issues.push("No active downstream destination");
  }

  if (config.escalationThreshold >= config.reviewThreshold) {
    issues.push("Escalation threshold must stay below review threshold");
  }

  if (config.defaultSlaHours < 12) {
    issues.push("SLA window under 12 hours requires close staffing coverage");
  }

  if (config.autoAssignOwner && !config.owner.trim()) {
    issues.push("Auto-assignment requires a default owner");
  }

  return issues;
}

export function derivePayerConfigurationStatus(
  config: Pick<PayerConfigurationRecord, "enabledWorkflows" | "issues">
) {
  if (config.enabledWorkflows.length === 0) {
    return "inactive" as const;
  }

  return config.issues.length > 0 ? ("needs_attention" as const) : ("active" as const);
}

export type ClaimsListItemView = {
  id: string;
  claimId: string;
  claimNumber: string;
  payerName: string;
  patientName: string;
  jurisdiction: "us" | "ca";
  countryCode: "US" | "CA";
  provinceOfService: string | null;
  claimType: string | null;
  serviceProviderType:
    | "physiotherapist"
    | "chiropractor"
    | "massage_therapist"
    | "psychotherapist"
    | "other"
    | null;
  serviceCode: string | null;
  serviceDate: string;
  currentStatus: string;
  owner: string | null;
  lastTouchedAt: string;
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
    avgTouchesPerClaim: string;
    slaCompliance: string;
    needsReview: number;
    claimsResolved: number;
    touchesRemoved: number;
    claimsRequiringCall: number;
    phoneCallRate: string;
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
    phoneCallRate: string;
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
      jurisdiction: "us",
      countryCode: "US",
      status: "active",
      owner: "Sarah Chen",
      lastVerifiedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      enabledWorkflows: ["Claim Status"],
      reviewThreshold: 0.85,
      escalationThreshold: 0.58,
      defaultSlaHours: 24,
      autoAssignOwner: true,
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
      jurisdiction: "us",
      countryCode: "US",
      status: "needs_attention",
      owner: "Marcus Williams",
      lastVerifiedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      enabledWorkflows: ["Claim Status"],
      reviewThreshold: 0.8,
      escalationThreshold: 0.52,
      defaultSlaHours: 10,
      autoAssignOwner: false,
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
      issues: [
        "Portal verification overdue",
        "SLA window under 12 hours requires close staffing coverage"
      ]
    },
    {
      id: "cfg_cigna",
      organizationId,
      payerId: "payer_cigna",
      payerName: "Cigna",
      jurisdiction: "us",
      countryCode: "US",
      status: "active",
      owner: "David Park",
      lastVerifiedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      enabledWorkflows: ["Claim Status"],
      reviewThreshold: 0.82,
      escalationThreshold: 0.56,
      defaultSlaHours: 36,
      autoAssignOwner: true,
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
    },
    {
      id: "cfg_sun_life_pshcp",
      organizationId,
      payerId: "payer_sun_life",
      payerName: "Sun Life / PSHCP",
      jurisdiction: "ca",
      countryCode: "CA",
      status: "needs_attention",
      owner: "Ottawa Pilot",
      lastVerifiedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      enabledWorkflows: ["Claim Status"],
      reviewThreshold: 0.84,
      escalationThreshold: 0.56,
      defaultSlaHours: 24,
      autoAssignOwner: false,
      statusRules: [
        'Structured status "Paid" -> Resolved',
        'Structured status "Coordination of benefits required" -> Needs Review',
        'Structured status "Not covered under PSHCP" -> Needs Review'
      ],
      reviewRules: [
        "Federal benefits coverage edge case",
        "Coordination of benefits required",
        "Validation connector still needs live payer approval"
      ],
      destinations: [
        {
          id: "dest_sun_life_pshcp_export",
          label: "Federal benefits CSV review export",
          kind: "sftp",
          status: "inactive"
        }
      ],
      issues: [
        "Validation-only Sun Life path; live payer access not enabled",
        "No active downstream destination"
      ]
    },
    {
      id: "cfg_telus_health",
      organizationId,
      payerId: "payer_telus_health",
      payerName: "TELUS Health eClaims",
      jurisdiction: "ca",
      countryCode: "CA",
      status: "inactive",
      owner: "Ottawa Pilot",
      lastVerifiedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      enabledWorkflows: [],
      reviewThreshold: 0.85,
      escalationThreshold: 0.55,
      defaultSlaHours: 24,
      autoAssignOwner: false,
      statusRules: ["Permitted rail validation pending"],
      reviewRules: ["Connector onboarding is not complete"],
      destinations: [
        {
          id: "dest_telus_health_export",
          label: "TELUS onboarding pending",
          kind: "webhook",
          status: "inactive"
        }
      ],
      issues: ["Permitted rail validation pending"]
    }
  ];
}

export function findMissingSeedPayerConfigurations(
  existingConfigs: Pick<PayerConfigurationRecord, "id" | "payerId">[],
  seedConfigs: PayerConfigurationRecord[]
) {
  const existingIds = new Set(existingConfigs.map((config) => config.id));
  const existingPayerIds = new Set(existingConfigs.map((config) => config.payerId));

  return seedConfigs.filter(
    (config) => !existingIds.has(config.id) && !existingPayerIds.has(config.payerId)
  );
}

export function buildClaimsList(claims: ClaimRecord[], queue: QueueItem[]): ClaimsListItemView[] {
  const queueByClaimId = new Map(queue.map((item) => [item.claimId, item] as const));

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

      const leftUpdated = new Date(
        claimActivityReference(left, queueByClaimId.get(left.id))
      ).getTime();
      const rightUpdated = new Date(
        claimActivityReference(right, queueByClaimId.get(right.id))
      ).getTime();
      if (leftUpdated !== rightUpdated) {
        return rightUpdated - leftUpdated;
      }

      return left.claimNumber.localeCompare(right.claimNumber);
    })
    .map((claim) => ({
      lastTouchedAt: claimActivityReference(claim, queueByClaimId.get(claim.id)),
      id: claim.id,
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      payerName: claim.payerName,
      patientName: claim.patientName,
      jurisdiction: claim.jurisdiction,
      countryCode: claim.countryCode,
      provinceOfService: claim.provinceOfService,
      claimType: claim.claimType,
      serviceProviderType: claim.serviceProviderType,
      serviceCode: claim.serviceCode,
      serviceDate: claim.serviceDate,
      currentStatus: statusLabel(claim.status, claim.normalizedStatusText),
      owner: claim.owner,
      lastUpdated: formatRelativeTime(
        claimActivityReference(claim, queueByClaimId.get(claim.id))
      ),
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
  const avgTouchesPerClaim = claims.length === 0 ? 0 : totalTouches / claims.length;
  const claimsRequiringCall = claims.filter((claim) => claim.requiresPhoneCall).length;
  const phoneCallRate = claims.length === 0 ? 0 : claimsRequiringCall / claims.length;
  const avgAge =
    claims.length === 0 ? 0 : claims.reduce((sum, claim) => sum + claim.ageDays, 0) / claims.length;
  const reviewedClaims = claims.filter(
    (claim) => claim.status === "needs_review" || claim.status === "blocked"
  ).length;
  const lowConfidenceClaims = claims.filter((claim) => claim.confidence < 0.85).length;

  const byPayer = new Map<
    string,
    {
      openClaims: number;
      reviewClaims: number;
      phoneCallClaims: number;
      totalAge: number;
      lastCheckedAt: string[];
    }
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
      phoneCallClaims: 0,
      totalAge: 0,
      lastCheckedAt: []
    };
    payerEntry.openClaims += claim.status === "resolved" ? 0 : 1;
    payerEntry.reviewClaims += claim.status === "needs_review" ? 1 : 0;
    payerEntry.phoneCallClaims += claim.requiresPhoneCall ? 1 : 0;
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
    const callRate = value.openClaims === 0 ? 0 : value.phoneCallClaims / value.openClaims;
    const latestCheck = value.lastCheckedAt
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      payer,
      openClaims: value.openClaims,
      avgResolutionTime: `${avgResolutionDays.toFixed(1)}d`,
      risk: reviewRate > 0.4 ? "High" : reviewRate > 0.2 ? "Medium" : "Low",
      reviewRate: pct(reviewRate),
      phoneCallRate: pct(callRate),
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

  if (claimsRequiringCall > 0) {
    alerts.push({
      title: "Manual payer calls are still required",
      body: `${claimsRequiringCall} claim${claimsRequiringCall === 1 ? "" : "s"} require a phone call follow-up. Track this rate during the pilot.`,
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
      avgTouchesPerClaim: avgTouchesPerClaim.toFixed(1),
      slaCompliance: pct(slaCompliance),
      needsReview: claims.filter((claim) => claim.status === "needs_review").length,
      claimsResolved: resolvedClaims,
      touchesRemoved: Math.max(0, resolvedClaims * 2 - totalTouches),
      claimsRequiringCall,
      phoneCallRate: pct(phoneCallRate)
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
    | "reopen_claim"
    | "mark_call_required"
    | "log_follow_up";
  actor: WorkflowActor;
  assignee?: string;
  note?: string;
  outcome?:
    | "status_checked"
    | "pending_payer"
    | "more_info_needed"
    | "needs_review"
    | "phone_call_required"
    | "resolved";
  nextAction?: string;
  followUpAt?: string | null;
}) {
  const {
    claim,
    queueItem,
    existingResult,
    action,
    actor,
    assignee,
    note,
    outcome,
    nextAction: explicitNextAction,
    followUpAt
  } = params;
  const nowIso = new Date().toISOString();
  let nextStatus = claim.status;
  let nextAction = claim.nextAction;
  let reviewReason = note ?? claim.notes ?? "Manual workflow update";
  let queueReason = queueItem?.reason ?? reviewReason;
  let reviewStatus: "pending" | "approved" | "corrected" | "escalated" = "approved";
  let requiresPhoneCall = claim.requiresPhoneCall;
  let phoneCallRequiredAt = claim.phoneCallRequiredAt;
  let totalTouches = claim.totalTouches;
  let nextSlaAt = claim.slaAt;

  if (action === "assign_owner") {
    queueReason = `Assigned to ${assignee ?? "new owner"}`;
  } else if (action === "approve_review") {
    nextStatus = "in_review";
    nextAction = "Monitor payer response";
    queueReason = "Approved for active monitoring";
    reviewReason = note ?? "Review approved by operator.";
    reviewStatus = "approved";
  } else if (action === "resolve_claim") {
    nextStatus = "resolved";
    nextAction = "Export Result";
    queueReason = "Resolved by reviewer";
    reviewReason = note ?? "Claim resolved by reviewer.";
    reviewStatus = "approved";
  } else if (action === "escalate_claim") {
    nextStatus = "blocked";
    nextAction = "Escalate to Specialist";
    queueReason = "Escalated for specialist handling";
    reviewReason = note ?? "Escalated by reviewer.";
    reviewStatus = "escalated";
  } else if (action === "reopen_claim") {
    nextStatus = "needs_review";
    nextAction = "Review Evidence";
    queueReason = "Reopened for manual review";
    reviewReason = note ?? "Claim reopened.";
    reviewStatus = "corrected";
  } else if (action === "mark_call_required") {
    nextStatus = "blocked";
    nextAction = "Call Payer";
    queueReason = "Manual payer phone call required";
    reviewReason = note ?? "Portal retrieval could not resolve status. Manual phone call required.";
    reviewStatus = "escalated";
  } else if (action === "log_follow_up") {
    totalTouches += 1;
    nextAction = explicitNextAction?.trim() || claim.nextAction;
    if (followUpAt) {
      nextSlaAt = followUpAt;
    }
    if (outcome === "status_checked") {
      nextStatus = claim.status === "resolved" ? "resolved" : "in_review";
      queueReason = "Status checked and documented";
      reviewReason = note ?? "Claim status checked and documented.";
      reviewStatus = "approved";
    } else if (outcome === "pending_payer") {
      nextStatus = "in_review";
      queueReason = "Waiting for payer response";
      reviewReason = note ?? "Claim is pending payer response.";
      reviewStatus = "approved";
    } else if (outcome === "more_info_needed") {
      nextStatus = "needs_review";
      queueReason = "Additional information required";
      reviewReason = note ?? "Additional information is required to continue follow-up.";
      reviewStatus = "pending";
    } else if (outcome === "needs_review") {
      nextStatus = "needs_review";
      queueReason = "Needs manual review";
      reviewReason = note ?? "Claim requires manual review.";
      reviewStatus = "pending";
    } else if (outcome === "phone_call_required") {
      nextStatus = "blocked";
      nextAction = explicitNextAction?.trim() || "Call Payer";
      queueReason = "Manual payer phone call required";
      reviewReason = note ?? "Manual payer phone call required.";
      reviewStatus = "escalated";
    } else if (outcome === "resolved") {
      nextStatus = "resolved";
      nextAction = explicitNextAction?.trim() || "Export Result";
      queueReason = "Resolved during follow-up";
      reviewReason = note ?? "Claim resolved during follow-up.";
      reviewStatus = "approved";
    }
    requiresPhoneCall = outcome === "phone_call_required";
    phoneCallRequiredAt = outcome === "phone_call_required" ? nowIso : null;
  }

  const updatedClaim: ClaimRecord = {
    ...claim,
    owner: action === "assign_owner" ? assignee ?? claim.owner : claim.owner,
    status: nextStatus,
    lastCheckedAt: nowIso,
    requiresPhoneCall:
      action === "mark_call_required"
        ? true
        : action === "approve_review" ||
            action === "resolve_claim" ||
            action === "reopen_claim" ||
            action === "log_follow_up"
          ? requiresPhoneCall
          : claim.requiresPhoneCall,
    phoneCallRequiredAt:
      action === "mark_call_required"
        ? nowIso
        : action === "approve_review" || action === "resolve_claim" || action === "reopen_claim"
          ? null
          : action === "log_follow_up"
            ? phoneCallRequiredAt
          : claim.phoneCallRequiredAt,
    notes:
      action === "add_note"
        ? [note?.trim(), claim.notes].filter(Boolean).join("\n\n")
        : action === "log_follow_up"
          ? [
              `Outcome: ${outcome?.replaceAll("_", " ") ?? "follow up"}`,
              reviewReason,
              nextAction ? `Next action: ${nextAction}` : null,
              nextSlaAt ? `Follow up by: ${new Date(nextSlaAt).toLocaleString()}` : null
            ]
              .filter(Boolean)
              .join("\n")
          : reviewReason,
    nextAction,
    slaAt: nextSlaAt,
    currentQueue:
      nextStatus === "resolved"
        ? "Resolved"
        : nextStatus === "blocked"
          ? action === "log_follow_up" && outcome === "phone_call_required"
            ? "Manual Follow-up"
            : "Escalation Required"
          : nextStatus === "in_review"
            ? "In Review"
            : "Needs Review",
    totalTouches,
    daysSinceLastFollowUp: 0,
    reviews:
      action === "add_note" || action === "assign_owner"
        ? claim.reviews
        : [
            {
              id: `review_${claim.id}_${Date.now()}`,
              status: reviewStatus,
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
      type: actor.type === "owner" ? "owner" : actor.type,
      avatar: actor.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    },
    eventType:
      action === "log_follow_up"
        ? "followup.logged"
        : action === "assign_owner"
          ? "claim.assigned"
          : action === "add_note"
            ? "claim.noted"
            : action === "approve_review"
              ? "claim.review_approved"
              : action === "resolve_claim"
                ? "claim.resolved"
                : action === "escalate_claim"
                  ? "claim.escalated"
                  : action === "mark_call_required"
                    ? "claim.phone_call_required"
                    : "claim.reopened",
    userId: actor.id,
    action:
      action === "assign_owner"
        ? "Assigned"
        : action === "add_note"
          ? "Commented"
          : action === "log_follow_up"
            ? "Logged Follow-up"
          : action === "approve_review"
            ? "Approved"
            : action === "resolve_claim"
              ? "Resolved"
              : action === "escalate_claim"
                ? "Escalated"
                : action === "mark_call_required"
                  ? "Phone Call Required"
                  : "Reopened",
    object: "Claim",
    objectId: claim.id,
    source: actor.type === "owner" ? "Owner" : "Human",
    payer: claim.payerName,
    summary:
      action === "assign_owner"
        ? `${actor.name} assigned ${claim.claimNumber} to ${assignee ?? claim.owner ?? "the current owner"}.`
        : action === "log_follow_up"
          ? `${actor.name} logged follow-up on ${claim.claimNumber}: ${reviewReason}${nextAction ? ` Next action: ${nextAction}.` : ""}`
        : `${actor.name} updated ${claim.claimNumber}: ${reviewReason}`,
    sensitivity: "normal",
    category:
      action === "add_note"
        ? "Comment"
        : action === "assign_owner"
          ? "Assignment"
          : action === "log_follow_up"
            ? "Follow-up"
          : action === "mark_call_required"
            ? "Manual Follow-up"
            : "Claim Workflow",
    outcome: "success",
    detail:
      action === "log_follow_up"
        ? {
            outcome,
            note,
            nextAction,
            followUpAt,
            statusFrom: claim.status,
            statusTo: updatedClaim.status
          }
        : {
            action,
            assignee,
            note,
            statusFrom: claim.status,
            statusTo: updatedClaim.status
          },
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
              },
              ...(claim.nextAction !== updatedClaim.nextAction
                ? {
                    nextAction: {
                      from: claim.nextAction,
                      to: updatedClaim.nextAction
                    }
                  }
                : {})
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
