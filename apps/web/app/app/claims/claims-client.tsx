"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { hasPermission, type UserRole } from "@tenio/domain";
import { ChevronDown, Download, FileText, Search } from "lucide-react";

import { IntakeClaimForm } from "../../../components/intake-claim-form";
import { KPICard } from "../../../components/kpi-card";
import { PageRoleBanner } from "../../../components/page-role-banner";
import { StatusPill, statusVariantFromText } from "../../../components/status-pill";
import { getClaimStatusLabel } from "../../../lib/display-labels";
import type { TenioMessages } from "../../../lib/locale";
import type { ClaimsListItemView } from "../../../lib/pilot-api";
import fallbackMessages from "../../../messages/en.json";

type ClaimsClientProps = {
  items: ClaimsListItemView[];
  organizationId: string;
  currentRole: UserRole;
  messages: TenioMessages["claims"];
  roleHelpTitle: string;
  payerOptions: Array<{
    id: string;
    label: string;
    jurisdiction: "us" | "ca";
    countryCode: "US" | "CA";
  }>;
};

type SortOption =
  | "ops_default"
  | "claim_asc"
  | "claim_desc"
  | "payer_asc"
  | "service_date_desc"
  | "updated_desc"
  | "priority_desc";

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "ops_default", label: "Ops priority" },
  { value: "claim_asc", label: "Claim ID A-Z" },
  { value: "claim_desc", label: "Claim ID Z-A" },
  { value: "payer_asc", label: "Payer A-Z" },
  { value: "service_date_desc", label: "Newest service date" },
  { value: "updated_desc", label: "Recently updated" },
  { value: "priority_desc", label: "Highest priority" }
];

function resolutionBadge(state: string) {
  const cls =
    state === "Resolved"
      ? "border-green-200 bg-green-50 text-green-700"
      : state === "Escalated"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-blue-200 bg-blue-50 text-blue-700";
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {state}
    </span>
  );
}

function sortItems(items: ClaimsListItemView[], sortBy: SortOption) {
  const priorityRank: Record<ClaimsListItemView["priority"], number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3
  };

  return [...items].sort((left, right) => {
    if (sortBy === "claim_asc") {
      return left.claimNumber.localeCompare(right.claimNumber);
    }

    if (sortBy === "claim_desc") {
      return right.claimNumber.localeCompare(left.claimNumber);
    }

    if (sortBy === "payer_asc") {
      return left.payerName.localeCompare(right.payerName);
    }

    if (sortBy === "service_date_desc") {
      return new Date(right.serviceDate).getTime() - new Date(left.serviceDate).getTime();
    }

    if (sortBy === "updated_desc") {
      return new Date(right.lastTouchedAt).getTime() - new Date(left.lastTouchedAt).getTime();
    }

    if (sortBy === "priority_desc") {
      return priorityRank[left.priority] - priorityRank[right.priority];
    }

    const resolutionRank = (value: ClaimsListItemView["resolutionState"]) => {
      if (value === "Escalated") return 0;
      if (value === "In Progress") return 1;
      return 2;
    };

    const resolutionDelta =
      resolutionRank(left.resolutionState) - resolutionRank(right.resolutionState);
    if (resolutionDelta !== 0) {
      return resolutionDelta;
    }

    const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.claimNumber.localeCompare(right.claimNumber);
  });
}

export function ClaimsClient({
  items,
  organizationId,
  currentRole,
  messages,
  roleHelpTitle,
  payerOptions
}: ClaimsClientProps) {
  const claimsMessages = messages ?? fallbackMessages.claims;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("ops_default");
  const canExport = hasPermission(currentRole, "claims:export");
  const canMutate = hasPermission(currentRole, "claims:write");
  const roleHelpBody =
    currentRole === "owner" ? null : claimsMessages.roleHelp[currentRole] ?? null;

  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const searched =
      search.length === 0
        ? items
        : items.filter((item) =>
            [
              item.claimNumber,
              item.payerName,
              item.patientName,
              item.claimType ?? "",
              item.serviceProviderType ?? "",
              item.serviceCode ?? "",
              item.provinceOfService ?? "",
              item.countryCode,
              item.owner ?? "",
              item.followUpReason,
              item.serviceDate
            ]
              .join(" ")
              .toLowerCase()
              .includes(search)
          );

    return sortItems(searched, sortBy);
  }, [items, searchTerm, sortBy]);

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{claimsMessages.heading}</h1>
          <p className="mt-1 text-sm text-gray-600">{claimsMessages.subheading}</p>
        </div>

        {roleHelpBody ? <PageRoleBanner title={roleHelpTitle} body={roleHelpBody} /> : null}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard label={claimsMessages.kpis.total} value={String(items.length)} />
          <KPICard
            label={claimsMessages.kpis.active}
            value={String(items.filter((item) => item.resolutionState !== "Resolved").length)}
          />
          <KPICard
            label={claimsMessages.kpis.resolved}
            value={String(items.filter((item) => item.resolutionState === "Resolved").length)}
            variant="success"
          />
          <KPICard label={claimsMessages.kpis.visible} value={String(filteredItems.length)} />
        </div>

        {canMutate ? (
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-900">{claimsMessages.intakeLabel}</h2>
              <p className="mt-1 text-xs text-gray-600">{claimsMessages.intakeBody}</p>
            </div>
            <IntakeClaimForm organizationId={organizationId} payerOptions={payerOptions} />
          </div>
        ) : null}

        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={claimsMessages.searchPlaceholder}
                className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">
                  {claimsMessages.sortLabel}:
                </span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                    className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-9 text-sm font-medium text-gray-900 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {claimsMessages.sortOptions[option.value]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              {canExport ? (
                <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  <Download className="h-4 w-4" />
                  {claimsMessages.exportButton}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {items.length === 0
                  ? claimsMessages.empty.title
                  : claimsMessages.noSearch.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {items.length === 0
                  ? claimsMessages.empty.body
                  : claimsMessages.noSearch.body}
              </p>
              <div className="mt-6">
                {items.length === 0 ? (
                  <Link
                    href="/app/onboarding"
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {claimsMessages.empty.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {claimsMessages.clearFilters}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                    claimsMessages.headers.claim,
                    claimsMessages.headers.payer,
                    claimsMessages.headers.service,
                    claimsMessages.headers.status,
                    claimsMessages.headers.owner,
                    claimsMessages.headers.lastTouched,
                    claimsMessages.headers.resolution,
                    claimsMessages.headers.evidence,
                    claimsMessages.headers.nextAction,
                    claimsMessages.headers.actions
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
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/claim/${item.claimId}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {item.claimNumber}
                        </Link>
                        <div className="mt-1 text-xs text-gray-500">
                        {item.claimType ?? claimsMessages.common.unspecified}
                        {item.serviceProviderType
                          ? ` · ${item.serviceProviderType.replaceAll("_", " ")}`
                          : ""}
                        {item.serviceCode ? ` · ${item.serviceCode}` : ""}
                        {item.provinceOfService ? ` · ${item.provinceOfService}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>{item.payerName}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {item.countryCode} / {item.jurisdiction.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{item.serviceDate}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {item.serviceCode ?? claimsMessages.common.noServiceCode}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill variant={statusVariantFromText(item.currentStatus)}>
                        {getClaimStatusLabel(item.currentStatus, claimsMessages.status)}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.owner ?? claimsMessages.common.unassigned}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.lastUpdated}</td>
                    <td className="px-4 py-3">{resolutionBadge(item.resolutionState)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{item.evidenceCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{item.followUpReason}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/app/claim/${item.claimId}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {claimsMessages.common.view}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <div className="text-sm text-gray-600">
              {claimsMessages.common.visibleSummary}:{" "}
              <span className="font-medium">{filteredItems.length}</span>
            </div>
            <div className="text-sm text-gray-500">{claimsMessages.common.sortedBySelection}</div>
          </div>
        </div>
        )}

        <div className="mt-4">
          <Link href="/app/queue" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            {claimsMessages.goToQueueCta}
          </Link>
        </div>
      </div>
    </div>
  );
}
