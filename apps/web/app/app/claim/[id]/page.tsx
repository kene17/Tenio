import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
import { PilotErrorState } from "../../../../components/pilot-error-state";
import { StatusPill } from "../../../../components/status-pill";
import { getClaimDetail } from "../../../../lib/pilot-api";

export const dynamic = "force-dynamic";

export default async function ClaimDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let claim;

  try {
    const response = await getClaimDetail(id);
    claim = response.item;
  } catch {
    return (
      <PilotErrorState
        title="Claim detail unavailable"
        body={`The claim detail view for ${id} could not load from the API. Confirm the API and database are healthy, then try again.`}
      />
    );
  }

  const overviewRows = [
    ["Claim ID", claim.item.claimNumber, claim.item.patientName],
    ["Claim Status", claim.statusLabel, ""],
    ["Payer", claim.item.payerName, ""],
    ["Owner", claim.item.owner ?? "Unassigned", ""],
    ["Last Updated", claim.lastUpdatedLabel, ""],
    ["SLA Status", claim.slaLabel, ""]
  ];

  const claimOverview = [
    ["Service Date", claim.serviceDate],
    ["Claim Type", claim.claimType],
    ["Jurisdiction", `${claim.countryCode} / ${claim.jurisdiction.toUpperCase()}`],
    ["Province / State", claim.provinceOfService ?? "—"],
    ["Billed Amount", claim.item.amountCents ? `$${(claim.item.amountCents / 100).toFixed(2)}` : "—"],
    [
      "Allowed Amount",
      claim.allowedAmountCents ? `$${(claim.allowedAmountCents / 100).toFixed(2)}` : "—"
    ],
    ["Paid Amount", claim.paidAmountCents ? `$${(claim.paidAmountCents / 100).toFixed(2)}` : "—"],
    [
      "Patient Responsibility",
      claim.patientResponsibilityCents
        ? `$${(claim.patientResponsibilityCents / 100).toFixed(2)}`
        : "—"
    ],
    ["Payer Reference Number", claim.payerReferenceNumber ?? "—"],
    ["Current Payer Response", claim.currentPayerResponse ?? "No response captured"]
  ];

  const operationalSummary = [
    ["Current Queue", claim.currentQueue],
    ["Next Recommended Action", claim.nextAction],
    ["Assigned Owner", claim.item.owner ?? "Unassigned"],
    ["Total Touches", String(claim.totalTouches)],
    ["Phone Call Required", claim.requiresPhoneCall ? "Yes" : "No"],
    ["Days Since Last Follow-up", String(claim.daysSinceLastFollowUp)],
    ["Review State", claim.item.reviews[0]?.status ?? "No review required"],
    ["Escalation State", claim.escalationState],
    ["Follow-up Reason", claim.item.notes ?? "No notes captured"]
  ];

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/app/queue" className="flex items-center gap-1 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            Claims Work Queue
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-gray-900">{id}</span>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Claim Detail</h1>
            <p className="mt-1 text-sm text-gray-600">
              Complete source-of-truth record for claim-status work and operational
              decisions
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {overviewRows.map(([label, value, sub]) => (
            <div key={label}>
              <div className="mb-1 text-xs text-gray-600">{label}</div>
              <div
                className={`text-sm ${
                  label === "SLA Status" ? "font-semibold text-green-700" : "font-semibold text-gray-900"
                }`}
              >
                {value}
              </div>
              {sub ? <div className="text-xs text-gray-500">{sub}</div> : null}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <div className="text-sm font-semibold text-amber-900">
                {claim.currentQueue}
              </div>
              <div className="mt-0.5 text-sm text-amber-800">
                {claim.item.notes}
              </div>
            </div>
          </div>
          <ConfidenceBadge confidence={Math.round(claim.item.confidence * 100)} size="md" />
        </div>
        {claim.requiresPhoneCall ? (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <div>
              <div className="font-semibold text-red-900">Manual payer phone call required</div>
              <div className="mt-0.5">
                {claim.phoneCallRequiredAt
                  ? `Flagged ${new Date(claim.phoneCallRequiredAt).toLocaleString()}`
                  : "Flagged in workflow"}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-6 py-6">
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
                        <div className={`text-sm ${label === "Next Recommended Action" ? "font-medium text-blue-700" : "text-gray-900"}`}>
                          {value}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-5 py-4">
                  <h2 className="text-base font-semibold text-gray-900">Activity Timeline</h2>
                </div>
                <div className="space-y-4 px-5 py-4">
                  {claim.activityTimeline.map((event, index) => {
                    const timelineStyle =
                      event.action === "Retrieved"
                        ? {
                            Icon: CheckCircle2,
                            bg: "bg-green-100",
                            color: "text-green-700"
                          }
                        : event.action === "Routed"
                          ? {
                              Icon: AlertTriangle,
                              bg: "bg-amber-100",
                              color: "text-amber-700"
                            }
                          : event.action === "Reassigned"
                            ? {
                                Icon: UserPlus,
                                bg: "bg-blue-100",
                                color: "text-blue-700"
                              }
                            : {
                                Icon: FileText,
                                bg: "bg-gray-100",
                                color: "text-gray-700"
                              };

                    const { Icon, bg, color } = timelineStyle;

                    return (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${bg}`}>
                            <Icon className={`h-4 w-4 ${color}`} />
                          </div>
                          {index < claim.activityTimeline.length - 1 ? (
                            <div className="mt-2 w-px flex-1 bg-gray-200" />
                          ) : null}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="mb-1 text-sm font-medium text-gray-900">{event.action}</div>
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
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                  <h2 className="text-base font-semibold text-gray-900">
                    Notes & Review Comments
                  </h2>
                  <button className="rounded-md border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50">
                    Add Note
                  </button>
                </div>
                <div className="space-y-4 px-5 py-4">
                  {claim.item.reviews.length > 0 ? claim.item.reviews.map((review) => (
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
                  )) : (
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
                  <h2 className="text-base font-semibold text-gray-900">Agent Interpretation</h2>
                  <p className="mt-1 text-xs text-gray-600">
                    Candidate output from the agentic retrieval layer
                  </p>
                </div>
                <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-gray-900">
                  <p>
                    {claim.machineSummary}
                  </p>
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
                    <strong>Payment details:</strong>{" "}
                    {claim.paidAmountCents
                      ? `$${(claim.paidAmountCents / 100).toFixed(2)} paid`
                      : "No payment posted yet"}
                    {" "}out of{" "}
                    {claim.item.amountCents
                      ? `$${(claim.item.amountCents / 100).toFixed(2)} billed`
                      : "unknown billed amount"}.
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
                  <h2 className="text-base font-semibold text-gray-900">
                    Evidence & Provenance
                  </h2>
                  <p className="mt-1 text-xs text-gray-600">
                    Screenshots and extracted data
                  </p>
                </div>
                <div className="space-y-3 px-5 py-4">
                  {claim.item.evidence.map((artifact, index) => (
                    <div
                      key={artifact.id}
                      className={
                        index === 0
                          ? "cursor-pointer rounded-lg border border-gray-200 p-3 transition-colors hover:border-blue-400"
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
                            {index > 0 ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : null}
                          </div>
                          <div className="mb-2 text-xs text-gray-600">
                            {claim.item.payerName} portal · Captured{" "}
                            {new Date(artifact.createdAt).toLocaleString()}
                          </div>
                          <div className="mb-2 flex items-center gap-2">
                            <ConfidenceBadge
                              confidence={index === 0 ? 92 : Math.round(claim.item.confidence * 100)}
                              size="sm"
                            />
                            <a
                              href={artifact.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                            >
                              Open artifact
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

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
                        <div key={label} className="flex justify-between">
                          <span className="text-gray-600">{label}:</span>
                          <span className={`font-medium ${label === "Paid Amount" ? "text-amber-700" : "text-gray-900"}`}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-5 py-4">
                  <h2 className="text-base font-semibold text-gray-900">Actions</h2>
                </div>
                <div className="space-y-2 px-5 py-4">
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
                        <div>
                          Retrieval Job ID: {claim.activeRetrievalJob.id}
                        </div>
                        <div>
                          Agent Run ID: {claim.activeRetrievalJob.agentRunId ?? "Pending"}
                        </div>
                        <div>
                          Trace ID: {claim.activeRetrievalJob.traceId ?? "Not captured"}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <ClaimRetrieveButton
                    claimId={claim.item.id}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
                  >
                    <span className="inline-flex items-center gap-2">
                      <RotateCw className="h-4 w-4" />
                      Request Re-check
                    </span>
                  </ClaimRetrieveButton>
                  <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Download className="h-4 w-4" />
                    Export Evidence
                  </button>
                  <ClaimWorkflowActions
                    claimId={claim.item.id}
                    currentOwner={claim.item.owner}
                    currentStatus={claim.statusLabel}
                  />
                  {claim.activeRetrievalJob?.history?.length ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Retry History
                      </div>
                      <div className="space-y-2">
                        {claim.activeRetrievalJob.history.slice(0, 3).map((attempt) => (
                          <div key={`${attempt.attempt}-${attempt.startedAt}`} className="rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
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

              <section className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-5 py-4">
                  <h2 className="text-base font-semibold text-gray-900">Audit Trail</h2>
                </div>
                <div className="space-y-3 px-5 py-4 text-xs">
                  {claim.auditTrail.map((entry) => (
                    <div key={entry.label} className="flex items-start justify-between">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
