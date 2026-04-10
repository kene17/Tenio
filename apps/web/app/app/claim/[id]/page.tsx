import { hasPermission } from "@tenio/domain";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { ConfidenceBadge } from "../../../../components/confidence-badge";
import { PilotErrorState } from "../../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../../lib/locale";
import { getClaimDetail, getCurrentSession } from "../../../../lib/pilot-api";
import { ClaimDetailTabs } from "./claim-detail-tabs";

export const dynamic = "force-dynamic";

export default async function ClaimDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let claim;
  const session = await getCurrentSession();
  const { messages } = await getLocaleMessages();
  const fallbackMessages = getMessagesForLocale("en");
  const pilotError = getPilotErrorChrome(messages);
  const claimMessages = messages.claim ?? fallbackMessages.claim;
  const followUpMessages = messages.followUp ?? fallbackMessages.followUp;
  const retrieveMessages = messages.retrieve ?? fallbackMessages.retrieve;
  const canDownloadEvidence = session
    ? hasPermission(session.role, "evidence:download")
    : false;
  const canWorkClaims = session ? hasPermission(session.role, "followup:log") : false;
  const canQueueWork = session ? hasPermission(session.role, "queue:work") : false;

  try {
    const response = await getClaimDetail(id);
    claim = response.item;
  } catch {
    return (
      <PilotErrorState
        eyebrow={pilotError.eyebrow}
        openPilotGuide={pilotError.openPilotGuide}
        contactSupport={pilotError.contactSupport}
        title={pilotError.claimDetailUnavailableTitle}
        body={pilotError.claimDetailUnavailableBody.replace("{claimId}", id)}
      />
    );
  }

  const overviewRows = [
    [claimMessages.summaryLabels.claimId, claim.item.claimNumber, claim.item.patientName],
    [claimMessages.summaryLabels.claimStatus, claim.statusLabel, ""],
    [claimMessages.summaryLabels.payer, claim.item.payerName, ""],
    [
      claimMessages.summaryLabels.owner,
      claim.item.owner ?? claimMessages.common.unassigned,
      ""
    ],
    [claimMessages.summaryLabels.lastUpdated, claim.lastUpdatedLabel, ""],
    [claimMessages.summaryLabels.slaStatus, claim.slaLabel, ""]
  ] as const;

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/app/queue" className="flex items-center gap-1 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            {claimMessages.backToQueue}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-gray-900">{id}</span>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{claimMessages.pageHeading}</h1>
            <p className="mt-1 text-sm text-gray-600">{claimMessages.pageSubheading}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {overviewRows.map(([label, value, sub]) => (
            <div key={label}>
              <div className="mb-1 text-xs text-gray-600">{label}</div>
              <div
                className={`text-sm ${
                  label === claimMessages.summaryLabels.slaStatus
                    ? "font-semibold text-green-700"
                    : "font-semibold text-gray-900"
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
              <div className="mt-0.5 text-sm text-amber-800">{claim.item.notes}</div>
            </div>
          </div>
          <ConfidenceBadge
            confidence={Math.round(claim.item.confidence * 100)}
            size="md"
          />
        </div>
        {claim.requiresPhoneCall ? (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <div>
              <div className="font-semibold text-red-900">
                {claimMessages.phoneCallRequired}
              </div>
              <div className="mt-0.5">
                {claim.phoneCallRequiredAt
                  ? `${claimMessages.phoneCallFlagged} ${new Date(claim.phoneCallRequiredAt).toLocaleString()}`
                  : claimMessages.phoneCallWorkflowFlagged}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-6 py-6">
          <ClaimDetailTabs
            claim={claim}
            canDownloadEvidence={canDownloadEvidence}
            canWorkClaims={canWorkClaims}
            canQueueWork={canQueueWork}
            claimMessages={claimMessages}
            followUpMessages={followUpMessages}
            retrieveMessages={retrieveMessages}
          />
        </div>
      </div>
    </div>
  );
}
