import { hasPermission } from "@tenio/domain";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Download,
  FileText,
  Send
} from "lucide-react";

import { ConfidenceBadge } from "../../../../components/confidence-badge";
import { PilotErrorState } from "../../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../../lib/locale";
import { getCurrentSession, getResultDetail } from "../../../../lib/pilot-api";

export const dynamic = "force-dynamic";
const RESULT_ACTIONS_ENABLED = false;

export default async function ResultDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCurrentSession();
  const { messages } = await getLocaleMessages();
  const fallbackMessages = getMessagesForLocale("en");
  const pilotError = getPilotErrorChrome(messages);
  const resultMessages = messages.resultDetail ?? fallbackMessages.resultDetail;
  const canDownloadEvidence = session
    ? hasPermission(session.role, "evidence:download")
    : false;
  let result;

  try {
    const response = await getResultDetail(id);
    result = response.item;
  } catch {
    return (
      <PilotErrorState
        eyebrow={pilotError.eyebrow}
        openPilotGuide={pilotError.openPilotGuide}
        contactSupport={pilotError.contactSupport}
        title={pilotError.resultDetailUnavailableTitle}
        body={pilotError.resultDetailUnavailableBody.replace("{resultId}", id)}
      />
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          <Link
            href="/app/results"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" />
            {resultMessages.backLink}
          </Link>
        </div>

        <div className="mb-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{result.id}</h1>
              <p className="mt-1 text-sm text-gray-600">{resultMessages.subtitle}</p>
            </div>
            {RESULT_ACTIONS_ENABLED ? (
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                  <Download className="h-4 w-4" />
                  Export PDF
                </button>
                <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  <Send className="h-4 w-4" />
                  Send to Downstream
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <div className="text-base font-medium text-green-900">{resultMessages.verifiedTitle}</div>
              <div className="mt-1 text-sm text-green-700">{resultMessages.verifiedBody}</div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { label: resultMessages.fields.claimStatus, value: result.claimStatus },
            {
              label: resultMessages.fields.confidenceScore,
              value: (
                <div className="flex items-center gap-2">
                  <ConfidenceBadge confidence={result.confidence} />
                  <span className="text-lg font-semibold text-gray-900">{result.confidence}%</span>
                </div>
              )
            },
            { label: resultMessages.fields.lastVerified, value: result.lastVerified },
            { label: resultMessages.fields.sourcePayer, value: result.payerName },
            { label: resultMessages.fields.evidenceCount, value: `${result.evidence.length} items` },
            { label: resultMessages.fields.nextAction, value: result.nextAction },
            { label: resultMessages.fields.traceId, value: result.agentTraceId ?? "Not captured" }
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-1 text-xs text-gray-600">{label}</div>
              <div
                className={`text-lg font-semibold text-gray-900 ${
                  label === "Trace ID" ? "font-mono text-sm" : ""
                }`}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h3 className="text-sm font-medium text-gray-900">{resultMessages.outcomeSummaryHeading}</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                {[
                  {
                    label: resultMessages.fields.claimId,
                    value: (
                      <Link href={`/app/claim/${result.claimId}`} className="font-medium text-blue-600 hover:text-blue-700">
                        {result.claimNumber}
                      </Link>
                    )
                  },
                  { label: resultMessages.fields.payer, value: result.payerName },
                  { label: resultMessages.fields.serviceDate, value: result.serviceDate },
                  {
                    label: resultMessages.fields.billedAmount,
                    value:
                      result.billedAmountCents !== null
                        ? `$${(result.billedAmountCents / 100).toFixed(2)}`
                        : "—"
                  }
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="mb-1 text-xs text-gray-600">{label}</div>
                    <div className="text-sm text-gray-900">{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h3 className="text-sm font-medium text-gray-900">{resultMessages.provenanceHeading}</h3>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between rounded bg-gray-50 p-3">
                  <div>
                    <div className="mb-1 text-xs text-gray-600">{resultMessages.fields.currentStatus}</div>
                    <div className="text-sm font-medium text-gray-900">{result.claimStatus}</div>
                  </div>
                  <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {result.verifiedStatus}
                  </span>
                </div>
                <div className="rounded bg-gray-50 p-3">
                  <div className="mb-1 text-xs text-gray-600">{resultMessages.fields.statusReason}</div>
                  <div className="text-sm text-gray-900">{result.portalText}</div>
                </div>
                <div className="rounded bg-gray-50 p-3">
                  <div className="mb-1 text-xs text-gray-600">{resultMessages.fields.expectedResolution}</div>
                  <div className="text-sm text-gray-900">{result.nextAction}</div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-blue-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium text-blue-900">
                    {resultMessages.whatThisMeansHeading}
                  </h3>
                  <p className="mb-3 text-sm text-blue-800">{result.machineSummary}</p>
                  <div className="mb-1 text-sm font-medium text-blue-900">
                    {resultMessages.recommendedNextSteps}:
                  </div>
                  <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
                    {result.recommendedNextSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h3 className="text-sm font-medium text-gray-900">{resultMessages.supportingEvidenceHeading}</h3>
              </div>
              <div className="space-y-3 p-5">
                {result.evidence.map((artifact) => (
                  <div key={artifact.id} className="rounded border border-gray-200 p-3">
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{artifact.label}</div>
                        <div className="mt-1 text-xs text-gray-600">
                          Captured {new Date(artifact.createdAt).toLocaleString()}
                        </div>
                        {canDownloadEvidence ? (
                          <a
                            href={`/api/evidence/${encodeURIComponent(artifact.id)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            {messages.claim?.openArtifact ?? fallbackMessages.claim.openArtifact}
                          </a>
                        ) : (
                          <div className="mt-2 text-xs text-gray-500">
                            {messages.claim?.downloadRestricted ?? fallbackMessages.claim.downloadRestricted}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded border border-gray-200 p-3">
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{resultMessages.fields.portalMetadata}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {result.metadata.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {RESULT_ACTIONS_ENABLED ? (
              <section className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-medium text-gray-900">Actions</h3>
                <div className="space-y-2">
                  {[
                    "Send to Downstream System",
                    "Export JSON",
                    "Export PDF",
                    "Flag for Review",
                    "Re-check Status"
                  ].map((label, index) => (
                    <button
                      key={label}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                        index === 0
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {index < 3 ? <Download className="h-4 w-4" /> : null}
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
