import { hasPermission } from "@tenio/domain";

import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import { getCurrentSession, getStatus } from "../../../lib/pilot-api";

export const dynamic = "force-dynamic";

function formatTimestamp(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleString();
}

export default async function StatusPage() {
  const session = await getCurrentSession();
  const { messages } = await getLocaleMessages();
  const statusMessages = messages.status ?? getMessagesForLocale("en").status;
  const e = getPilotErrorChrome(messages);

  if (!session || !hasPermission(session.role, "status:read")) {
    return (
      <PilotErrorState
        eyebrow={e.eyebrow}
        openPilotGuide={e.openPilotGuide}
        contactSupport={e.contactSupport}
        title={e.statusForbiddenTitle}
        body={e.statusForbiddenBody}
      />
    );
  }

  try {
    const { item } = await getStatus();

    return (
      <div className="h-full overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">{statusMessages.heading}</h1>
            <p className="mt-1 text-sm text-gray-600">{statusMessages.subheading}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {statusMessages.cards.lastImport}
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {formatTimestamp(item.lastImportAt, statusMessages.notAvailable)}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {statusMessages.outcomePrefix} {item.lastImportOutcome ?? statusMessages.notAvailable}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {statusMessages.cards.claimsImported}
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {item.lastImportRowCount ?? 0}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {statusMessages.cardBodies.claimsImported}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {statusMessages.cards.lastQueueSync}
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {formatTimestamp(item.lastQueueSyncAt, statusMessages.notAvailable)}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {statusMessages.cardBodies.lastQueueSync}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {statusMessages.cards.failedActions}
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {item.failedActionsLast24h}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {statusMessages.cardBodies.failedActions}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {statusMessages.cards.openClaims}
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900">
                {item.openClaimsCount}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {statusMessages.cardBodies.openClaims}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <PilotErrorState
        eyebrow={e.eyebrow}
        openPilotGuide={e.openPilotGuide}
        contactSupport={e.contactSupport}
        title={e.statusLoadTitle}
        body={e.statusLoadBody}
      />
    );
  }
}
