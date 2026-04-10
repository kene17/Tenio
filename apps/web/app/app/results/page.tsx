import { hasPermission } from "@tenio/domain";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Search
} from "lucide-react";

import { ConfidenceBadge } from "../../../components/confidence-badge";
import { KPICard } from "../../../components/kpi-card";
import { PageRoleBanner } from "../../../components/page-role-banner";
import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import { getCurrentSession, getResults } from "../../../lib/pilot-api";

export const dynamic = "force-dynamic";

function verifiedBadge(status: string, messages: ReturnType<typeof getMessagesForLocale>["results"]) {
  if (status === "Verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" />
        {messages.verifiedBadge}
      </span>
    );
  }

  if (status === "Verified with Review") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        <CheckCircle className="h-3 w-3" />
        {messages.verifiedWithReviewBadge}
      </span>
    );
  }

  if (status === "Needs Human Follow-up") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        {messages.needsFollowUpBadge}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
      <AlertCircle className="h-3 w-3" />
      {messages.unresolvedBadge}
    </span>
  );
}

export default async function ResultsPage() {
  try {
    const [{ items }, session, { messages }] = await Promise.all([
      getResults(),
      getCurrentSession(),
      getLocaleMessages()
    ]);
    const fallbackMessages = getMessagesForLocale("en");
    const resultsMessages = messages.results ?? fallbackMessages.results;
    const roleHelpTitle = messages.roleHelp?.title ?? fallbackMessages.roleHelp.title;
    const exportedCount = items.filter((item) => item.exportState === "Exported").length;
    const canExport = session ? hasPermission(session.role, "claims:export") : false;
    const roleHelpBody =
      session && session.role !== "owner" ? resultsMessages.roleHelp[session.role] ?? null : null;

    return (
      <div className="h-full overflow-auto">
        <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{resultsMessages.heading}</h1>
          <p className="mt-1 text-sm text-gray-600">{resultsMessages.subheading}</p>
          <p className="mt-2 text-sm text-gray-500">{resultsMessages.pageNote}</p>
        </div>

        {roleHelpBody ? <PageRoleBanner title={roleHelpTitle} body={roleHelpBody} /> : null}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard label={resultsMessages.kpis.verifiedResults} value={String(items.length)} variant="success" />
          <KPICard
            label={resultsMessages.kpis.needsFollowUp}
            value={String(items.filter((item) => item.verifiedStatus.includes("Follow-up")).length)}
            variant="warning"
          />
          <KPICard label={resultsMessages.kpis.exported} value={String(exportedCount)} />
          <KPICard
            label={resultsMessages.kpis.avgConfidence}
            value={`${Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / Math.max(items.length, 1))}%`}
            variant="success"
          />
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-xl font-semibold text-gray-900">{resultsMessages.empty.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{resultsMessages.empty.body}</p>
              <div className="mt-6">
                <Link
                  href="/app/queue"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {resultsMessages.empty.cta}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={resultsMessages.searchPlaceholder}
                    className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                  <Filter className="h-4 w-4" />
                  {resultsMessages.filtersButton}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {canExport ? (
                  <form action="/api/results/export" method="post">
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4" />
                      {resultsMessages.exportButton}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {[
                        resultsMessages.headers.resultId,
                        resultsMessages.headers.claimId,
                        resultsMessages.headers.payer,
                        resultsMessages.headers.verifiedStatus,
                        resultsMessages.headers.confidence,
                        resultsMessages.headers.lastVerified,
                        resultsMessages.headers.evidence,
                        resultsMessages.headers.exportState,
                        resultsMessages.headers.actions
                      ].map((header) => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.resultId} className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/app/result/${item.resultId}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                            {item.resultId}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/app/claim/${item.claimId}`} className="text-sm text-gray-700 hover:text-blue-600">
                            {item.claimNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.payer}</td>
                        <td className="px-4 py-3">{verifiedBadge(item.verifiedStatus, resultsMessages)}</td>
                        <td className="px-4 py-3">
                          <ConfidenceBadge confidence={item.confidence} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.lastVerified}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{item.evidenceCount}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${item.exportState === "Exported" ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                            {item.exportState}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/app/result/${item.resultId}`} className="text-sm text-blue-600 hover:text-blue-700">
                            {resultsMessages.common.view}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <div className="text-sm text-gray-600">
                  {resultsMessages.common.visibleSummary}: <span className="font-medium">{items.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  {["Previous", "1", "2", "3", "112", "Next"].map((item, index) => (
                    <button
                      key={item}
                      className={`rounded border px-3 py-1 text-sm ${index === 1 ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </div>
    );
  } catch {
    const { messages } = await getLocaleMessages();
    const err = getPilotErrorChrome(messages);
    return (
      <PilotErrorState
        eyebrow={err.eyebrow}
        openPilotGuide={err.openPilotGuide}
        contactSupport={err.contactSupport}
        title={err.resultsUnavailableTitle}
        body={err.resultsUnavailableBody}
      />
    );
  }
}
