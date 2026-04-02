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
import { PilotErrorState } from "../../../components/pilot-error-state";
import { getResults } from "../../../lib/pilot-api";

export const dynamic = "force-dynamic";

function verifiedBadge(status: string) {
  if (status === "Verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" />
        Verified
      </span>
    );
  }

  if (status === "Verified with Review") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        <CheckCircle className="h-3 w-3" />
        Verified with Review
      </span>
    );
  }

  if (status === "Needs Human Follow-up") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        Needs Follow-up
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
      <AlertCircle className="h-3 w-3" />
      Unresolved
    </span>
  );
}

export default async function ResultsPage() {
  try {
    const { items } = await getResults();
    const exportedCount = items.filter((item) => item.exportState === "Exported").length;

    return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Results</h1>
          <p className="mt-1 text-sm text-gray-600">
            Structured claim-status outputs with evidence, provenance, and export-ready
            formatting.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard label="Verified Results" value={String(items.length)} variant="success" />
          <KPICard
            label="Needs Follow-up"
            value={String(items.filter((item) => item.verifiedStatus.includes("Follow-up")).length)}
            variant="warning"
          />
          <KPICard label="Exported Today" value={String(exportedCount)} />
          <KPICard
            label="Avg Confidence"
            value={`${Math.round(items.reduce((sum, item) => sum + item.confidence, 0) / Math.max(items.length, 1))}%`}
            variant="success"
          />
        </div>

        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by result ID, claim ID, or payer..."
                className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className="h-4 w-4" />
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Download className="h-4 w-4" />
              Export Batch
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Result ID", "Claim ID", "Payer", "Verified Status", "Confidence", "Last Verified", "Evidence", "Export State", "Actions"].map((header) => (
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
                    <td className="px-4 py-3">{verifiedBadge(item.verifiedStatus)}</td>
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
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{items.length}</span> live result
              {items.length === 1 ? "" : "s"}
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
      </div>
    </div>
    );
  } catch {
    return (
      <PilotErrorState
        title="Results unavailable"
        body="The results view could not load from the API. Confirm the API and Postgres container are healthy, then refresh."
      />
    );
  }
}
