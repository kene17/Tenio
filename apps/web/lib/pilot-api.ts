"use server";

import { cookies } from "next/headers";
import type { ClaimDetail } from "@tenio/domain";

import { decodeSession, PILOT_SESSION_COOKIE, type AppSession } from "./pilot-auth";

export type QueueItemView = {
  id: string;
  claimId: string;
  claimNumber: string;
  patientName: string;
  payerName: string;
  jurisdiction?: "us" | "ca";
  countryCode?: "US" | "CA";
  provinceOfService?: string | null;
  claimType?: string | null;
  serviceProviderType?:
    | "physiotherapist"
    | "chiropractor"
    | "massage_therapist"
    | "psychotherapist"
    | "other"
    | null;
  serviceCode?: string | null;
  claimStatus: string;
  nextAction: string;
  queueReason: string;
  owner: string | null;
  lastTouchedAt: string;
  lastUpdate: string;
  age: string;
  slaRisk: "healthy" | "at-risk" | "breached";
  confidence: number;
  evidenceCount: number;
  priority: "low" | "normal" | "high" | "urgent";
};

export type ClaimDetailView = {
  item: ClaimDetail;
  serviceDate: string;
  claimType: string;
  serviceProviderType?:
    | "physiotherapist"
    | "chiropractor"
    | "massage_therapist"
    | "psychotherapist"
    | "other"
    | null;
  serviceCode?: string | null;
  planNumber?: string | null;
  memberCertificate?: string | null;
  jurisdiction: "us" | "ca";
  countryCode: "US" | "CA";
  provinceOfService: string | null;
  lastTouchedAt: string;
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
  activeRetrievalJob?: {
    id: string;
    agentRunId: string | null;
    status: string;
    attempts: number;
    lastError: string | null;
    updatedAt: string;
    connectorName?: string | null;
    traceId?: string | null;
    failureCategory?: string | null;
    retryable?: boolean;
    reviewReason?: string | null;
    nextAttemptAt?: string;
    history?: Array<{
      attempt: number;
      connectorId: string | null;
      connectorName: string | null;
      executionMode: "browser" | "api" | null;
      startedAt: string;
      finishedAt: string | null;
      status: "completed" | "retrying" | "failed";
      summary: string;
      traceId: string | null;
      failureCategory: string | null;
    }>;
  } | null;
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

export type AuditEventView = {
  id: string;
  time: string;
  date: string;
  actor: { name: string; type: "human" | "system" | "owner"; avatar: string };
  eventType?: string;
  userId?: string | null;
  action: string;
  object: string;
  objectId: string;
  source: string;
  payer: string;
  summary: string;
  sensitivity: "normal" | "sensitive" | "high-risk";
  category: string;
  outcome?: "success" | "failure";
  importBatchId?: string | null;
  detail?: Record<string, unknown>;
  beforeAfter?: Record<string, { from: string; to: string }>;
  reason?: string;
  requestId?: string;
};

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
  serviceProviderType?:
    | "physiotherapist"
    | "chiropractor"
    | "massage_therapist"
    | "psychotherapist"
    | "other"
    | null;
  serviceCode?: string | null;
  serviceDate: string;
  currentStatus: string;
  owner: string | null;
  lastTouchedAt: string;
  lastUpdated: string;
  resolutionState: string;
  evidenceCount: number;
  followUpReason: string;
  priority: "low" | "normal" | "high" | "urgent";
};

export type PayerConfigurationView = {
  id: string;
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

export type PerformanceView = {
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

export type StatusView = {
  lastImportAt: string | null;
  lastImportOutcome: "success" | "failure" | null;
  lastImportRowCount: number | null;
  lastQueueSyncAt: string | null;
  failedActionsLast24h: number;
  openClaimsCount: number;
};

export type OnboardingStepId =
  | "team_members"
  | "first_import"
  | "configure_payers"
  | "review_first_queue";

export type OnboardingStepStatus = "complete" | "current" | "pending";

export type OnboardingStateView = {
  startedAt: string;
  steps: Array<{
    id: OnboardingStepId;
    status: OnboardingStepStatus;
  }>;
  welcome: {
    shouldShow: boolean;
    dismissible: boolean;
    dismissedAt: string | null;
  };
  queueTour: {
    shouldShow: boolean;
    completedAt: string | null;
    firstClaimDetailOpenedAt: string | null;
  };
  progress: {
    completedCount: number;
    totalSteps: number;
    nextStepId: OnboardingStepId | null;
  };
};

function getApiBaseUrl() {
  return process.env.TENIO_API_BASE_URL ?? "http://127.0.0.1:4000";
}

function getApiHeaders() {
  const headers = new Headers();
  headers.set(
    "x-tenio-service-token",
    process.env.TENIO_WEB_SERVICE_TOKEN ?? "tenio-local-web-service-token"
  );

  const apiKey = process.env.TENIO_API_KEY;

  if (apiKey) {
    headers.set("x-tenio-api-key", apiKey);
  }

  return headers;
}

export async function getCurrentSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(PILOT_SESSION_COOKIE)?.value);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await getCurrentSession();
  const headers = new Headers({
    ...Object.fromEntries(getApiHeaders().entries()),
    ...init?.headers
  });

  if (session) {
    headers.set("x-tenio-session-id", session.sessionId);
    headers.set("x-tenio-user-id", session.userId);
    headers.set("x-tenio-org-id", session.organizationId);
    headers.set("x-tenio-user-role", session.role);
    headers.set("x-tenio-user-name", session.fullName);
    headers.set("x-tenio-user-email", session.email);
  }

  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getQueue() {
  return apiFetch<{ items: QueueItemView[] }>("/queue");
}

export async function getClaimDetail(claimId: string) {
  return apiFetch<{ item: ClaimDetailView }>(`/claims/${claimId}`);
}

export async function getClaimsList() {
  return apiFetch<{ items: ClaimsListItemView[] }>("/claims-list");
}

export async function getResults() {
  return apiFetch<{ items: ResultSummaryView[] }>("/results");
}

export async function getResultDetail(resultId: string) {
  return apiFetch<{ item: ResultDetailView }>(`/results/${resultId}`);
}

export async function getAuditLog() {
  return apiFetch<{ items: AuditEventView[] }>("/audit-log");
}

export async function getPerformance() {
  return apiFetch<{ item: PerformanceView }>("/performance");
}

export async function getPayerConfigurations() {
  return apiFetch<{ items: PayerConfigurationView[] }>("/configuration/payers");
}

export async function getClaimIntakeOptions() {
  return apiFetch<{
    items: Array<{
      payerId: string;
      payerName: string;
      jurisdiction: "us" | "ca";
      countryCode: "US" | "CA";
    }>;
  }>("/claim-intake-options");
}

export async function getStatus() {
  return apiFetch<{ item: StatusView }>("/status");
}

export async function getOnboardingState() {
  return apiFetch<{ item: OnboardingStateView }>("/onboarding/state");
}

export async function createClaimIntake(input: {
  organizationId: string;
  payerId: string;
  claimNumber: string;
  patientName: string;
  jurisdiction?: "us" | "ca";
  countryCode?: "US" | "CA";
  provinceOfService?: string | null;
  claimType?: string | null;
  serviceProviderType?:
    | "physiotherapist"
    | "chiropractor"
    | "massage_therapist"
    | "psychotherapist"
    | "other"
    | null;
  serviceCode?: string | null;
  planNumber?: string | null;
  memberCertificate?: string | null;
  serviceDate?: string | null;
  billedAmountCents?: number | null;
  priority: "low" | "normal" | "high" | "urgent";
  owner?: string | null;
  notes?: string | null;
  slaAt?: string | null;
  sourceStatus?: string | null;
}) {
  return apiFetch<{ item: ClaimDetailView | null }>("/claims/intake", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function submitClaimWorkflowAction(
  claimId: string,
  payload: {
    action:
      | "assign_owner"
      | "add_note"
      | "approve_review"
      | "resolve_claim"
      | "escalate_claim"
      | "reopen_claim"
      | "mark_call_required"
      | "log_follow_up";
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
  }
) {
  return apiFetch<{ item: ClaimDetailView | null }>(`/claims/${claimId}/workflow-action`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function triggerClaimRetrieval(claimId: string) {
  return apiFetch<{
    claimId: string;
    workflowState: string;
    job: { id: string; status: string };
  }>(`/claims/${claimId}/retrieve`, {
    method: "POST"
  });
}
