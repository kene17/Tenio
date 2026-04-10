"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { hasPermission, type UserRole } from "@tenio/domain";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  MoreHorizontal,
  Search,
  X
} from "lucide-react";

import { ClaimRetrieveButton } from "../../../components/claim-retrieve-button";
import { ConfidenceBadge } from "../../../components/confidence-badge";
import { KPICard } from "../../../components/kpi-card";
import { PageRoleBanner } from "../../../components/page-role-banner";
import { StatusPill, statusVariantFromText } from "../../../components/status-pill";
import { cn } from "../../../lib/cn";
import type {
  OnboardingStateView,
  OnboardingStepId,
  QueueItemView
} from "../../../lib/pilot-api";
import type { TenioMessages } from "../../../lib/locale";
import fallbackMessages from "../../../messages/en.json";

type QueueClientProps = {
  items: QueueItemView[];
  hasAnyClaims: boolean;
  currentRole: UserRole;
  queueMessages: TenioMessages["queue"];
  retrieveMessages: TenioMessages["retrieve"];
  roleHelpTitle: string;
  onboardingMessages: TenioMessages["onboarding"];
  onboardingState: OnboardingStateView | null;
};

function getPriorityIcon(priority: QueueItemView["priority"]) {
  if (priority === "urgent") return <AlertCircle className="h-4 w-4 text-red-600" />;
  if (priority === "high") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <Clock className="h-4 w-4 text-gray-400" />;
}

function getSLABadge(
  risk: QueueItemView["slaRisk"],
  messages: TenioMessages["queue"]["sla"]
) {
  if (risk === "breached") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertCircle className="h-3 w-3" />
        {messages.overdue}
      </span>
    );
  }

  if (risk === "at-risk") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        {messages.atRisk}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle className="h-3 w-3" />
      {messages.onTrack}
    </span>
  );
}

function ownerInitials(owner: string | null) {
  if (!owner) {
    return "NA";
  }

  return owner
    .split(" ")
    .map((name) => name[0])
    .join("");
}

function serviceSummary(claim: QueueItemView) {
  return [claim.serviceProviderType?.replaceAll("_", " "), claim.serviceCode]
    .filter(Boolean)
    .join(" · ");
}

function sortQueueItems(items: QueueItemView[]) {
  const priorityRank: Record<QueueItemView["priority"], number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3
  };
  const slaRank: Record<QueueItemView["slaRisk"], number> = {
    breached: 0,
    "at-risk": 1,
    healthy: 2
  };

  return [...items].sort((left, right) => {
    const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const slaDelta = slaRank[left.slaRisk] - slaRank[right.slaRisk];
    if (slaDelta !== 0) {
      return slaDelta;
    }

    return new Date(left.lastTouchedAt).getTime() - new Date(right.lastTouchedAt).getTime();
  });
}

const queueTourTargets = ["priority", "claim", "sla"] as const;

function setupStatusBadge(
  status: OnboardingStateView["steps"][number]["status"],
  messages: TenioMessages["onboarding"]
) {
  if (status === "complete") {
    return (
      <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        {messages.setup.statusComplete}
      </span>
    );
  }

  if (status === "current") {
    return (
      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        {messages.setup.statusCurrent}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
      {messages.setup.statusPending}
    </span>
  );
}

export function QueueClient({
  items,
  hasAnyClaims,
  currentRole,
  queueMessages,
  retrieveMessages,
  roleHelpTitle,
  onboardingMessages,
  onboardingState
}: QueueClientProps) {
  const queueOnboardingMessages = onboardingMessages ?? fallbackMessages.onboarding;
  const messages = queueMessages ?? fallbackMessages.queue;
  const setupMessages = queueOnboardingMessages.setup;
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(items[0]?.claimId ?? null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [setupState, setSetupState] = useState<OnboardingStateView | null>(onboardingState);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const matchingItems = items.filter((item) => {
      const matchesSearch =
        searchTerm.length === 0 ||
        [
          item.claimNumber,
          item.patientName,
          item.payerName,
          item.claimType ?? "",
          item.serviceProviderType ?? "",
          item.serviceCode ?? "",
          item.provinceOfService ?? "",
          item.countryCode ?? "",
          item.owner ?? "",
          item.queueReason
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesFilter =
        activeFilters.length === 0 ||
        (activeFilters.includes("SLA: At Risk") &&
          (item.slaRisk === "at-risk" || item.slaRisk === "breached"));

      return matchesSearch && matchesFilter;
    });

    return sortQueueItems(matchingItems);
  }, [activeFilters, items, searchTerm]);

  const selectedClaim =
    selectedClaimId === null
      ? null
      : filteredItems.find((item) => item.claimId === selectedClaimId) ?? null;

  const openClaims = items.length;
  const needsReview = items.filter((item) => item.claimStatus.includes("Review")).length;
  const atRisk = items.filter(
    (item) => item.slaRisk === "at-risk" || item.slaRisk === "breached"
  ).length;
  const avgConfidence =
    items.length > 0
      ? `${Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / items.length)}%`
      : "0%";
  const shouldShowWelcome = setupState?.welcome.shouldShow ?? false;
  const shouldShowTour =
    Boolean(setupState?.queueTour.shouldShow) && !shouldShowWelcome && isDesktopLayout;
  const activeTourTarget = shouldShowTour ? queueTourTargets[tourStepIndex] : null;
  const canRequestStatus = hasPermission(currentRole, "queue:work");
  const roleHelpBody =
    currentRole === "owner" ? null : messages.roleHelp[currentRole] ?? null;
  const isFiltering = searchTerm.trim().length > 0 || activeFilters.length > 0;

  useEffect(() => {
    setSetupState(onboardingState);
  }, [onboardingState]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncLayout = () => setIsDesktopLayout(mediaQuery.matches);
    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);
    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    if (!shouldShowTour) {
      setTourStepIndex(0);
      return;
    }

    const selector = activeTourTarget ? `[data-tour="${activeTourTarget}"]` : null;
    const target = selector ? document.querySelector<HTMLElement>(selector) : null;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeTourTarget, shouldShowTour]);

  async function updateOnboarding(action: "dismiss_welcome" | "complete_queue_tour") {
    const response = await fetch("/api/onboarding/state", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ action })
    });

    if (!response.ok) {
      throw new Error(setupMessages.updateError);
    }

    const payload = (await response.json()) as { item: OnboardingStateView };
    setSetupState(payload.item);
    setSetupError(null);
  }

  function stepCopy(stepId: OnboardingStepId) {
    return setupMessages.steps[stepId];
  }

  function completeTour() {
    startTransition(async () => {
      try {
        await updateOnboarding("complete_queue_tour");
      } catch (error) {
        setSetupError(error instanceof Error ? error.message : setupMessages.updateError);
      }
    });
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {shouldShowWelcome ? (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/40 px-6">
              <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                <div className="mb-5 flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                    {setupMessages.welcomeEyebrow}
                  </span>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {setupMessages.welcomeTitle}
                  </h2>
                  <p className="text-sm text-gray-600">{setupMessages.welcomeBody}</p>
                </div>
                <div className="space-y-3">
                  {setupState?.steps.map((step) => {
                    const copy = stepCopy(step.id);
                    return (
                      <div
                        key={step.id}
                        className="flex flex-col gap-2 rounded-lg border border-gray-200 px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {setupStatusBadge(step.status, queueOnboardingMessages)}
                          <div className="text-sm font-semibold text-gray-900">{copy.title}</div>
                        </div>
                        <p className="text-sm text-gray-600">{copy.description}</p>
                      </div>
                    );
                  })}
                </div>
                {setupError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {setupError}
                  </div>
                ) : null}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href="/app/onboarding"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {setupMessages.openSetupChecklist}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <div className="space-y-2 text-right">
                    <button
                      type="button"
                      disabled={!setupState?.welcome.dismissible || isPending}
                      onClick={() =>
                        startTransition(async () => {
                          try {
                            await updateOnboarding("dismiss_welcome");
                          } catch (error) {
                            setSetupError(
                              error instanceof Error
                                ? error.message
                                : setupMessages.updateError
                            );
                          }
                        })
                      }
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {setupMessages.skipForNow}
                    </button>
                    {!setupState?.welcome.dismissible ? (
                      <div className="text-xs text-gray-500">
                        {setupMessages.skipLockedMessage}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {shouldShowTour ? (
            <div className="fixed right-6 bottom-6 z-30 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                {setupMessages.tourEyebrow} {tourStepIndex + 1} /{" "}
                {queueTourTargets.length}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {activeTourTarget
                  ? setupMessages.tour[activeTourTarget].title
                  : setupMessages.tour.priority.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {activeTourTarget
                  ? setupMessages.tour[activeTourTarget].body
                  : setupMessages.tour.priority.body}
              </p>
              {setupError ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {setupError}
                </div>
              ) : null}
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={completeTour}
                  disabled={isPending}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {setupMessages.skipTour}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (tourStepIndex === queueTourTargets.length - 1) {
                      completeTour();
                      return;
                    }

                    setTourStepIndex((current) => current + 1);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {tourStepIndex === queueTourTargets.length - 1
                    ? setupMessages.finishTour
                    : setupMessages.nextTourStep}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}

          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">{messages.heading}</h1>
            <p className="mt-1 text-sm text-gray-600">{messages.subheading}</p>
          </div>

          {roleHelpBody ? <PageRoleBanner title={roleHelpTitle} body={roleHelpBody} /> : null}

          <div className="mb-3 text-sm font-medium text-gray-700">{messages.overviewLabel}</div>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KPICard label={messages.kpis.openClaims} value={String(openClaims)} />
            <KPICard
              label={messages.kpis.needsReview}
              value={String(needsReview)}
              variant="warning"
            />
            <KPICard label={messages.kpis.atRisk} value={String(atRisk)} variant="warning" />
            <KPICard
              label={messages.kpis.evidenceAttached}
              value={String(items.filter((item) => item.evidenceCount > 0).length)}
              variant="success"
            />
            <KPICard label={messages.kpis.avgConfidence} value={avgConfidence} />
            <KPICard
              label={messages.kpis.workspace}
              value="1"
              variant="success"
            />
          </div>

          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={messages.filterPlaceholder}
                  className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                <Filter className="h-4 w-4" />
                {messages.filtersButton}
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {activeFilters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-600">{messages.activeFiltersLabel}</span>
                {activeFilters.map((filter) => (
                  <span
                    key={filter}
                    className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700"
                  >
                    {filter}
                    <button
                      onClick={() =>
                        setActiveFilters((current) =>
                          current.filter((item) => item !== filter)
                        )
                      }
                      className="rounded hover:bg-blue-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setActiveFilters([])}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  {messages.clearAllFilters}
                </button>
              </div>
            ) : null}
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8">
              <div className="mx-auto max-w-xl text-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {isFiltering
                    ? messages.empty.noMatchesTitle
                    : hasAnyClaims
                      ? messages.empty.noAttentionTitle
                      : messages.empty.noClaimsTitle}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {isFiltering
                    ? messages.empty.noMatchesBody
                    : hasAnyClaims
                      ? messages.empty.noAttentionBody
                      : messages.empty.noClaimsBody}
                </p>
                {!isFiltering ? (
                  <div className="mt-6">
                    <Link
                      href="/app/onboarding"
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      {hasAnyClaims
                        ? messages.empty.noAttentionCta
                        : messages.empty.noClaimsCta}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      messages.columns.priority,
                      messages.columns.claimId,
                      messages.columns.patient,
                      messages.columns.payer,
                      messages.columns.status,
                      messages.columns.nextAction,
                      messages.columns.queueReason,
                      messages.columns.owner,
                      messages.columns.lastTouched,
                      messages.columns.sla,
                      messages.columns.confidence,
                      messages.columns.evidence,
                      messages.columns.actions
                    ].map((header) => {
                      const target =
                        header === messages.columns.priority
                          ? "priority"
                          : header === messages.columns.claimId
                            ? "claim"
                            : header === messages.columns.sla
                              ? "sla"
                              : null;

                      return (
                      <th
                        key={header}
                        data-tour={target ?? undefined}
                          className={cn(
                            "px-4 py-3 text-left text-xs font-medium text-gray-600",
                            activeTourTarget !== null &&
                              activeTourTarget === target &&
                              "relative z-20 rounded-md bg-blue-50 ring-2 ring-blue-500 ring-offset-2"
                          )}
                        >
                          {header}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((claim) => (
                    <tr
                      key={claim.claimId}
                      onClick={() => setSelectedClaimId(claim.claimId)}
                      className={cn(
                        "cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50",
                        selectedClaimId === claim.claimId && "bg-blue-50 hover:bg-blue-50"
                      )}
                    >
                      <td className="px-4 py-3">{getPriorityIcon(claim.priority)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/claim/${claim.claimId}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {claim.claimNumber}
                        </Link>
                        <div className="mt-1 text-xs text-gray-500">
                          {claim.claimType ?? messages.common.unspecified}
                          {serviceSummary(claim) ? ` · ${serviceSummary(claim)}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{claim.patientName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>{claim.payerName}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {claim.countryCode ?? "CA"} / {claim.jurisdiction?.toUpperCase() ?? "CA"}
                          {claim.provinceOfService ? ` · ${claim.provinceOfService}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill variant={statusVariantFromText(claim.claimStatus)}>
                          {claim.claimStatus}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{claim.nextAction}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{claim.queueReason}</td>
                      <td className="px-4 py-3">
                        {claim.owner ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                              {ownerInitials(claim.owner)}
                            </div>
                            <span className="text-sm text-gray-700">{claim.owner}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">{messages.common.unassigned}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{claim.lastUpdate}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-900">{claim.age}</span>
                          {getSLABadge(claim.slaRisk, messages.sla)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge confidence={claim.confidence} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{claim.evidenceCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="rounded p-1 hover:bg-gray-100">
                          <MoreHorizontal className="h-4 w-4 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-200 lg:hidden">
              {filteredItems.map((claim) => (
                <div
                  key={claim.claimId}
                  onClick={() => setSelectedClaimId(claim.claimId)}
                  className={cn(
                    "cursor-pointer p-4 transition-colors hover:bg-gray-50",
                    selectedClaimId === claim.claimId && "bg-blue-50"
                  )}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(claim.priority)}
                      <div>
                        <Link
                          href={`/app/claim/${claim.claimId}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {claim.claimNumber}
                        </Link>
                        <div className="mt-1 text-xs text-gray-500">
                          {claim.claimType ?? messages.common.unspecified}
                          {serviceSummary(claim) ? ` · ${serviceSummary(claim)}` : ""}
                        </div>
                      </div>
                    </div>
                    <button className="rounded p-1 hover:bg-gray-100">
                      <MoreHorizontal className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="mb-3 space-y-2">
                    <div className="text-sm text-gray-700">{claim.patientName}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{claim.payerName}</span>
                      <StatusPill variant={statusVariantFromText(claim.claimStatus)}>
                        {claim.claimStatus}
                      </StatusPill>
                    </div>
                    <div className="text-xs text-gray-500">
                      {claim.countryCode ?? "CA"} / {claim.jurisdiction?.toUpperCase() ?? "CA"}
                      {claim.provinceOfService ? ` · ${claim.provinceOfService}` : ""}
                    </div>
                    <div className="text-sm text-gray-700">{claim.nextAction}</div>
                    {serviceSummary(claim) ? (
                      <div className="text-xs text-gray-500">{serviceSummary(claim)}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-gray-600">
                      {claim.owner ?? messages.common.unassigned} · {claim.lastUpdate}
                    </div>
                    <div className="flex items-center gap-2">
                      <ConfidenceBadge confidence={claim.confidence} />
                      {getSLABadge(claim.slaRisk, messages.sla)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          <div className="mt-4">
            <Link href="/app/claims" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              {messages.searchAllClaimsCta}
            </Link>
          </div>
        </div>
      </div>

      {selectedClaim ? (
        <div className="hidden w-96 shrink-0 overflow-auto border-l border-gray-200 bg-white lg:block">
          <div className="p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedClaim.claimNumber}</h2>
                <p className="mt-1 text-sm text-gray-600">{selectedClaim.patientName}</p>
              </div>
              <button
                onClick={() => setSelectedClaimId(null)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="mb-6">
              <div className="mb-2 text-xs font-medium text-gray-600">
                {messages.currentStatusLabel}
              </div>
              <StatusPill variant={statusVariantFromText(selectedClaim.claimStatus)} size="md">
                {selectedClaim.claimStatus}
              </StatusPill>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-600">{messages.columns.confidence}:</span>
                <ConfidenceBadge confidence={selectedClaim.confidence} />
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-sm font-medium text-blue-900">{selectedClaim.nextAction}</div>
                  <div className="mt-1 text-xs text-blue-700">{selectedClaim.queueReason}</div>
                </div>
              </div>
            </div>

            <div className="mb-6 space-y-3 text-sm text-gray-700">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">{messages.labels.payer}</div>
                <div>{selectedClaim.payerName}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">{messages.labels.service}</div>
                <div>{serviceSummary(selectedClaim) || messages.common.serviceNotCaptured}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">
                  {messages.labels.assignedOwner}
                </div>
                <div>{selectedClaim.owner ?? messages.common.unassigned}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">
                  {messages.labels.lastTouched}
                </div>
                <div>{selectedClaim.lastUpdate}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">{messages.labels.evidence}</div>
                <div>
                  {selectedClaim.evidenceCount} {messages.common.evidenceArtifacts}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href={`/app/claim/${selectedClaim.claimId}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {messages.viewFullClaim}
                <ChevronRight className="h-4 w-4" />
              </Link>
              {canRequestStatus ? (
                <ClaimRetrieveButton
                  claimId={selectedClaim.claimId}
                  title={retrieveMessages.tooltip}
                  loadingText={retrieveMessages.loading}
                  successText={retrieveMessages.completed}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
                >
                  {retrieveMessages.label}
                </ClaimRetrieveButton>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
