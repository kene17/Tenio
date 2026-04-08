"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  RotateCw,
  UserPlus
} from "lucide-react";

import { ClaimRetrieveButton } from "../../../../components/claim-retrieve-button";
import { ClaimWorkflowActions } from "../../../../components/claim-workflow-actions";
import { ConfidenceBadge } from "../../../../components/confidence-badge";
import { StatusPill } from "../../../../components/status-pill";
import type { ClaimDetailView } from "../../../../lib/pilot-api";

type ClaimTab = "overview" | "evidence" | "timeline";

type ClaimDetailTabsProps = {
  claim: ClaimDetailView;
  canDownloadEvidence: boolean;
  canWorkClaims: boolean;
  canQueueWork: boolean;
  labels: {
    overview: string;
    evidence: string;
    timeline: string;
  };
};

function formatMoney(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  return `$${(value / 100).toFixed(2)}`;
}

function formatServiceProviderType(value: ClaimDetailView["serviceProviderType"]) {
  return value ? value.replaceAll("_", " ") : "—";
}

function timelineStyle(action: string) {
  if (action === "Retrieved") {
    return {
      Icon: CheckCircle2,
      bg: "bg-green-100",
      color: "text-green-700"
    };
  }

  if (action === "Routed") {
    return {
      Icon: AlertTriangle,
      bg: "bg-amber-100",
      color: "text-amber-700"
    };
  }

  if (action === "Reassigned") {
    return {
      Icon: UserPlus,
      bg: "bg-blue-100",
      color: "text-blue-700"
    };
  }

  return {
    Icon: FileText,
    bg: "bg-gray-100",
    color: "text-gray-700"
  };
}

export function ClaimDetailTabs({
  claim,
  canDownloadEvidence,
  canWorkClaims,
  canQueueWork,
  labels
}: ClaimDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<ClaimTab>("overview");

  const tabs: Array<{ id: ClaimTab; label: string }> = [
    { id: "overview", label: labels.overview },
    { id: "evidence", label: labels.evidence },
    { id: "timeline", label: labels.timeline }
  ];

  const claimOverview = [
    ["Service Date", claim.serviceDate],
    ["Claim Type", claim.claimType],
    ["Service Discipline", formatServiceProviderType(claim.serviceProviderType)],
    ["Service Code", claim.serviceCode ?? "—"],
    ["Jurisdiction", `${claim.countryCode} / ${claim.jurisdiction.toUpperCase()}`],
    ["Province / State", claim.provinceOfService ?? "—"],
    ["Plan Number", claim.planNumber ?? "—"],
    ["Member Certificate", claim.memberCertificate ?? "—"],
    ["Billed Amount", formatMoney(claim.item.amountCents)],
    ["Allowed Amount", formatMoney(claim.allowedAmountCents)],
    ["Paid Amount", formatMoney(claim.paidAmountCents)],
    ["Patient Responsibility", formatMoney(claim.patientResponsibilityCents)],
    ["Payer Reference Number", claim.payerReferenceNumber ?? "—"],
    ["Current Payer Response", claim.currentPayerResponse ?? "No response captured"]
  ] as const;

  const operationalSummary = [
    ["Current Queue", claim.currentQueue],
    ["Next Recommended Action", claim.nextAction],
    ["Last Touched", claim.lastUpdatedLabel],
    ["Assigned Owner", claim.item.owner ?? "Unassigned"],
    ["Total Touches", String(claim.totalTouches)],
    ["Phone Call Required", claim.requiresPhoneCall ? "Yes" : "No"],
    ["Days Since Last Follow-up", String(claim.daysSinceLastFollowUp)],
    ["Review State", claim.item.reviews[0]?.status ?? "No review required"],
    ["Escalation State", claim.escalationState]
  ] as const;

  const sortedReviews = [...claim.item.reviews].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "border-b-2 border-blue-600 px-1 py-3 text-sm font-medium text-blue-600"
                  : "border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-700"
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "overview" ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 xl:col-span-8">
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">Claim Overview</h2>
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 px-5 py-4 md:grid-cols-2">
                {claimOverview.map(([label, value]) => (
                  <div key={label} className={label.length > 20 ? "md:col-span-2" : ""}>
                    <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
                    <div
                      className={`text-sm ${
                        label === "Paid Amount"
                          ? "font-semibold text-green-700"
                          : label.includes("Amount")
                            ? "font-semibold text-gray-900"
                            : "text-gray-900"
                      }`}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Operational Summary
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 px-5 py-4 md:grid-cols-2">
                {operationalSummary.map(([label, value]) => (
                  <div key={label}>
                    <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
                    {label === "Review State" ? (
                      <StatusPill variant="warning">{value}</StatusPill>
                    ) : (
                      <div
                        className={`text-sm ${
                          label === "Next Recommended Action"
                            ? "font-medium text-blue-700"
                            : "text-gray-900"
                        }`}
                      >
                        {value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="col-span-12 space-y-6 xl:col-span-4">
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">Agent Interpretation</h2>
                <p className="mt-1 text-xs text-gray-600">
                  Candidate output from the agentic retrieval layer
                </p>
              </div>
              <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-gray-900">
                <p>{claim.machineSummary}</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Agent Rationale
                  </div>
                  <p className="text-sm text-gray-700">{claim.agentInsights.rationale}</p>
                </div>
                <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800">
                  <strong>Why it was routed this way:</strong> {claim.agentInsights.routeReason}
                </div>
                <p>
                  <strong>Payment details:</strong> {formatMoney(claim.paidAmountCents)} paid out of{" "}
                  {formatMoney(claim.item.amountCents)} billed.
                </p>
                <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  <strong>Recommended action:</strong> {claim.nextAction}.
                </p>
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 sm:grid-cols-2">
                  <div>
                    <div className="font-medium text-gray-900">Connector</div>
                    <div>{claim.agentInsights.connectorName}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Execution Mode</div>
                    <div className="capitalize">{claim.agentInsights.executionMode}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Last Observed</div>
                    <div>{new Date(claim.agentInsights.lastObservedAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Runtime</div>
                    <div>{claim.agentInsights.executionDurationLabel}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="font-medium text-gray-900">Trace ID</div>
                    <div className="font-mono text-[11px] text-gray-700">
                      {claim.agentInsights.traceId ?? "Not captured"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">Actions</h2>
              </div>
              <div className="space-y-3 px-5 py-4">
                {claim.activeRetrievalJob ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-800">
                    <div className="font-medium">
                      Retrieval job {claim.activeRetrievalJob.status}. Attempt{" "}
                      {claim.activeRetrievalJob.attempts}
                    </div>
                    <div className="mt-1 text-xs text-blue-700">
                      {claim.activeRetrievalJob.connectorName ?? "Agent runtime"}
                      {claim.activeRetrievalJob.nextAttemptAt
                        ? ` · next attempt ${new Date(claim.activeRetrievalJob.nextAttemptAt).toLocaleString()}`
                        : ""}
                    </div>
                    {claim.activeRetrievalJob.reviewReason ? (
                      <div className="mt-2 text-xs text-blue-700">
                        Workflow reason: {claim.activeRetrievalJob.reviewReason}
                      </div>
                    ) : null}
                    {claim.activeRetrievalJob.lastError ? (
                      <div className="mt-2 text-xs text-blue-700">
                        {claim.activeRetrievalJob.failureCategory
                          ? `${claim.activeRetrievalJob.failureCategory}: `
                          : ""}
                        {claim.activeRetrievalJob.lastError}
                      </div>
                    ) : null}
                    <div className="mt-3 space-y-1 rounded border border-blue-200 bg-white/70 px-3 py-2 font-mono text-[11px] text-blue-900">
                      <div>Retrieval Job ID: {claim.activeRetrievalJob.id}</div>
                      <div>Agent Run ID: {claim.activeRetrievalJob.agentRunId ?? "Pending"}</div>
                      <div>Trace ID: {claim.activeRetrievalJob.traceId ?? "Not captured"}</div>
                    </div>
                  </div>
                ) : null}
                {canQueueWork ? (
                  <ClaimRetrieveButton
                    claimId={claim.item.id}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
                  >
                    <span className="inline-flex items-center gap-2">
                      <RotateCw className="h-4 w-4" />
                      Request Re-check
                    </span>
                  </ClaimRetrieveButton>
                ) : null}
                {canWorkClaims ? (
                  <ClaimWorkflowActions
                    claimId={claim.item.id}
                    currentOwner={claim.item.owner}
                    currentStatus={claim.statusLabel}
                    canWorkClaims
                    showStructuredFollowUp={false}
                  />
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                    This role can review the claim but cannot change workflow state.
                  </div>
                )}
                {claim.activeRetrievalJob?.history?.length ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Retry History
                    </div>
                    <div className="space-y-2">
                      {claim.activeRetrievalJob.history.slice(0, 3).map((attempt) => (
                        <div
                          key={`${attempt.attempt}-${attempt.startedAt}`}
                          className="rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-gray-900">
                              Attempt {attempt.attempt} · {attempt.status}
                            </span>
                            <span>
                              {attempt.connectorName ?? "Agent runtime"}
                              {attempt.executionMode ? ` · ${attempt.executionMode}` : ""}
                            </span>
                          </div>
                          <div className="mt-1">
                            {new Date(attempt.startedAt).toLocaleString()}
                            {attempt.failureCategory ? ` · ${attempt.failureCategory}` : ""}
                          </div>
                          <div className="mt-1">{attempt.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === "evidence" ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 xl:col-span-8">
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Evidence & Provenance
                </h2>
                <p className="mt-1 text-xs text-gray-600">
                  Screenshots, extracts, and source links used to support the claim state
                </p>
              </div>
              <div className="space-y-3 px-5 py-4">
                {claim.item.evidence.length > 0 ? (
                  claim.item.evidence.map((artifact, index) => (
                    <div
                      key={artifact.id}
                      className={
                        index === 0
                          ? "rounded-lg border border-gray-200 p-3"
                          : "rounded-lg border-2 border-amber-300 bg-amber-50 p-3"
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-gray-100">
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-900">
                            {artifact.label}
                            {index > 0 ? (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            ) : null}
                          </div>
                          <div className="mb-2 text-xs text-gray-600">
                            {claim.item.payerName} portal · Captured{" "}
                            {new Date(artifact.createdAt).toLocaleString()}
                          </div>
                          <div className="mb-2 flex items-center gap-2">
                            <ConfidenceBadge
                              confidence={
                                index === 0 ? 92 : Math.round(claim.item.confidence * 100)
                              }
                              size="sm"
                            />
                            {canDownloadEvidence ? (
                              <a
                                href={`/api/evidence/${encodeURIComponent(artifact.id)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                Open artifact
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-xs text-gray-500">
                                Evidence download is limited to owner, manager, and operator roles.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    No evidence artifacts have been captured for this claim yet.
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Field Provenance
                  </div>
                  <div className="space-y-2 text-xs">
                    {[
                      ["Claim Status", claim.item.evidence[0]?.label ?? "Primary artifact"],
                      ["Paid Amount", claim.item.evidence[1]?.label ?? "Secondary artifact"],
                      ["Payer Reference", claim.item.evidence[0]?.label ?? "Primary artifact"],
                      ["Process Date", claim.item.evidence[0]?.label ?? "Primary artifact"]
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-3">
                        <span className="text-gray-600">{label}:</span>
                        <span
                          className={`text-right font-medium ${
                            label === "Paid Amount" ? "text-amber-700" : "text-gray-900"
                          }`}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="col-span-12 space-y-6 xl:col-span-4">
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Latest Structured Note
                </h2>
              </div>
              <div className="space-y-3 px-5 py-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-medium text-gray-600">Latest note</div>
                  <div className="text-sm text-gray-900">
                    {claim.item.notes ?? "No notes captured"}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-medium text-gray-600">Next action</div>
                  <div className="text-sm font-medium text-blue-700">{claim.nextAction}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-medium text-gray-600">Last touched</div>
                  <div className="text-sm text-gray-900">{claim.lastUpdatedLabel}</div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Structured Follow-up
                </h2>
              </div>
              <div className="px-5 py-4">
                {canWorkClaims ? (
                  <ClaimWorkflowActions
                    claimId={claim.item.id}
                    currentOwner={claim.item.owner}
                    currentStatus={claim.statusLabel}
                    canWorkClaims
                    showOwnerAssignment={false}
                    showReviewNote={false}
                  />
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                    Structured follow-up is limited to owner, manager, and operator roles.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === "timeline" ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 xl:col-span-8">
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">Activity Timeline</h2>
              </div>
              <div className="space-y-4 px-5 py-4">
                {claim.activityTimeline.map((event, index) => {
                  const { Icon, bg, color } = timelineStyle(event.action);

                  return (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${bg}`}
                        >
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        {index < claim.activityTimeline.length - 1 ? (
                          <div className="mt-2 w-px flex-1 bg-gray-200" />
                        ) : null}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="mb-1 text-sm font-medium text-gray-900">
                          {event.action}
                        </div>
                        <div className="mb-2 text-xs text-gray-600">
                          {event.time} · {event.actor.name}
                        </div>
                        {event.summary ? (
                          <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                            {event.summary}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Notes & Review Comments
                </h2>
              </div>
              <div className="space-y-4 px-5 py-4">
                {sortedReviews.length > 0 ? (
                  sortedReviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                          {(review.reviewer ?? "SY")
                            .split(" ")
                            .map((part) => part[0])
                            .join("")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-900">
                              {review.reviewer ?? "System"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-sm text-gray-900">{review.reason}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                    No review comments recorded yet.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="col-span-12 space-y-6 xl:col-span-4">
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">Audit Trail</h2>
              </div>
              <div className="space-y-3 px-5 py-4 text-xs">
                {claim.auditTrail.map((entry) => (
                  <div key={entry.label} className="flex items-start justify-between gap-3">
                    <span className="text-gray-600">{entry.label}</span>
                    <span className="text-right text-gray-900">
                      {entry.value}
                      <br />
                      <span className="text-gray-500">{entry.subtext}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {claim.item.evidence.length > 0 && canDownloadEvidence ? (
              <section className="rounded-lg border border-gray-200 bg-white p-5">
                <h2 className="mb-4 text-base font-semibold text-gray-900">Quick Links</h2>
                <div className="space-y-2">
                  <a
                    href={`/api/evidence/${encodeURIComponent(claim.item.evidence[0]?.id ?? "")}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    Export Evidence
                  </a>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
