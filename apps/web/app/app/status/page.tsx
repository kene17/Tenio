import { hasPermission } from "@tenio/domain";

import { PilotErrorState } from "../../../components/pilot-error-state";
import { getCurrentSession, getStatus } from "../../../lib/pilot-api";

export const dynamic = "force-dynamic";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

export default async function StatusPage() {
  const session = await getCurrentSession();

  if (!session || !hasPermission(session.role, "status:read")) {
    return (
      <PilotErrorState
        title="Status unavailable"
        body="Only owner and manager roles can view workspace status."
      />
    );
  }

  try {
    const { item } = await getStatus();

    return (
      <div className="h-full overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Status</h1>
            <p className="mt-1 text-sm text-gray-600">
              Quick operational checks for imports, queue activity, and recent failures.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Last Import
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {formatTimestamp(item.lastImportAt)}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Outcome: {item.lastImportOutcome ?? "none"}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Import Row Count
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {item.lastImportRowCount ?? 0}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Rows processed in the latest import commit.
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Last Queue Sync
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {formatTimestamp(item.lastQueueSyncAt)}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Latest queue update across active claims.
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Failed Actions (24h)
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {item.failedActionsLast24h}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Audit events recorded with a failure outcome.
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Open Claims
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {item.openClaimsCount}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Claims not yet resolved in the current workspace.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <PilotErrorState
        title="Status unavailable"
        body="The status view could not load from the API. Confirm the API and database are healthy, then refresh."
      />
    );
  }
}
