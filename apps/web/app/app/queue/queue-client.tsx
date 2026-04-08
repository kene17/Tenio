"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { StatusPill, statusVariantFromText } from "../../../components/status-pill";
import { cn } from "../../../lib/cn";
import type { QueueItemView } from "../../../lib/pilot-api";

type QueueClientProps = {
  items: QueueItemView[];
};

function getPriorityIcon(priority: QueueItemView["priority"]) {
  if (priority === "urgent") return <AlertCircle className="h-4 w-4 text-red-600" />;
  if (priority === "high") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <Clock className="h-4 w-4 text-gray-400" />;
}

function getSLABadge(risk: QueueItemView["slaRisk"]) {
  if (risk === "breached") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertCircle className="h-3 w-3" />
        Breached
      </span>
    );
  }

  if (risk === "at-risk") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        At Risk
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      <CheckCircle className="h-3 w-3" />
      Healthy
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

export function QueueClient({ items }: QueueClientProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(items[0]?.claimId ?? null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Claims Work Queue</h1>
            <p className="mt-1 text-sm text-gray-600">
              Live pilot queue backed by the workflow API and evidence-aware claim state.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KPICard label="Open Claims" value={String(openClaims)} />
            <KPICard
              label="Needs Review"
              value={String(needsReview)}
              variant="warning"
            />
            <KPICard label="At-Risk SLA" value={String(atRisk)} variant="warning" />
            <KPICard
              label="Evidence Attached"
              value={String(items.filter((item) => item.evidenceCount > 0).length)}
              variant="success"
            />
            <KPICard label="Avg Confidence" value={avgConfidence} />
            <KPICard
              label="Pilot Org"
              value="1"
              subtext="protected workspace"
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
                  placeholder="Search by claim ID, patient, payer, owner, or note..."
                  className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                <Filter className="h-4 w-4" />
                Filters
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {activeFilters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-600">Active filters:</span>
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
                  Clear all
                </button>
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      "Priority",
                      "Claim ID",
                      "Patient",
                      "Payer",
                      "Claim Status",
                      "Next Action",
                      "Queue / Reason",
                      "Owner",
                      "Last Touched",
                      "Age / SLA",
                      "Confidence",
                      "Evidence",
                      "Actions"
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-600"
                      >
                        {header}
                      </th>
                    ))}
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
                          {claim.claimType ?? "Unspecified"}
                          {serviceSummary(claim) ? ` · ${serviceSummary(claim)}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{claim.patientName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>{claim.payerName}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {claim.countryCode ?? "US"} / {claim.jurisdiction?.toUpperCase() ?? "US"}
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
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{claim.lastUpdate}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-gray-900">{claim.age}</span>
                          {getSLABadge(claim.slaRisk)}
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
                          {claim.claimType ?? "Unspecified"}
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
                      {claim.countryCode ?? "US"} / {claim.jurisdiction?.toUpperCase() ?? "US"}
                      {claim.provinceOfService ? ` · ${claim.provinceOfService}` : ""}
                    </div>
                    <div className="text-sm text-gray-700">{claim.nextAction}</div>
                    {serviceSummary(claim) ? (
                      <div className="text-xs text-gray-500">{serviceSummary(claim)}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-gray-600">
                      {claim.owner ?? "Unassigned"} · {claim.lastUpdate}
                    </div>
                    <div className="flex items-center gap-2">
                      <ConfidenceBadge confidence={claim.confidence} />
                      {getSLABadge(claim.slaRisk)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              <div className="mb-2 text-xs font-medium text-gray-600">Current Status</div>
              <StatusPill variant={statusVariantFromText(selectedClaim.claimStatus)} size="md">
                {selectedClaim.claimStatus}
              </StatusPill>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-600">Confidence:</span>
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
                <div className="mb-1 text-xs font-medium text-gray-600">Payer</div>
                <div>{selectedClaim.payerName}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">Service</div>
                <div>{serviceSummary(selectedClaim) || "Not captured"}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">Assigned Owner</div>
                <div>{selectedClaim.owner ?? "Unassigned"}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">Last Touched</div>
                <div>{selectedClaim.lastUpdate}</div>
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-gray-600">Evidence</div>
                <div>{selectedClaim.evidenceCount} artifact(s) attached</div>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href={`/app/claim/${selectedClaim.claimId}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                View Full Claim Detail
                <ChevronRight className="h-4 w-4" />
              </Link>
              <ClaimRetrieveButton
                claimId={selectedClaim.claimId}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70"
              >
                Request Re-check
              </ClaimRetrieveButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
