"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCcw,
  Upload
} from "lucide-react";

import { KPICard } from "../../../components/kpi-card";
import type { Locale, TenioMessages } from "../../../lib/locale";
import { parseCsvText } from "../../../lib/csv";

type ClaimImportAction = "create" | "update" | "invalid" | "duplicate_in_file";
type RawImportRow = Record<string, string>;
type ImportProfileId = "generic_template" | "dentrix_csv_shell";

type ClaimImportPreviewRow = {
  rowNumber: number;
  action: ClaimImportAction;
  messages: string[];
  claimNumber: string | null;
  patientName: string | null;
  payerId: string | null;
  payerName: string | null;
  jurisdiction: "us" | "ca" | null;
  countryCode: "US" | "CA" | null;
  provinceOfService: string | null;
  claimType: string | null;
  priority: "low" | "normal" | "high" | "urgent" | null;
  owner: string | null;
  notes: string | null;
  slaAt: string | null;
  sourceStatus: string | null;
  existingClaimId: string | null;
};

type ClaimImportPreview = {
  summary: {
    totalRows: number;
    createCount: number;
    updateCount: number;
    invalidCount: number;
    duplicateInFileCount: number;
    importedCount?: number;
  };
  rows: ClaimImportPreviewRow[];
};

const templateHeaders = [
  "claimNumber",
  "patientName",
  "payerId",
  "payerName",
  "jurisdiction",
  "countryCode",
  "provinceOfService",
  "claimType",
  "priority",
  "owner",
  "notes",
  "slaAt",
  "sourceStatus"
];

const templateExample = [
  "CLM-300001",
  "Ava Johnson",
  "payer_aetna",
  "",
  "us",
  "US",
  "",
  "medical",
  "high",
  "Sarah Chen",
  "Imported from April active inventory extract",
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  "Pending payer review"
];

function actionBadge(
  action: ClaimImportAction,
  messages: TenioMessages["onboarding"]
) {
  if (action === "create") {
    return (
      <span className="inline-flex rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        {messages.actionCreate}
      </span>
    );
  }

  if (action === "update") {
    return (
      <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        {messages.actionUpdate}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      {messages.actionSkip}
    </span>
  );
}

function downloadTemplate() {
  const csv = `${templateHeaders.join(",")}\n${templateExample
    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
    .join(",")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tenio-claim-import-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function OnboardingClient({
  locale,
  messages,
  payers
}: {
  locale: Locale;
  messages: TenioMessages["onboarding"];
  payers: Array<{
    payerId: string;
    payerName: string;
    jurisdiction: "us" | "ca";
    countryCode: "US" | "CA";
  }>;
}) {
  const router = useRouter();
  const [rawRows, setRawRows] = useState<RawImportRow[]>([]);
  const [importProfile, setImportProfile] = useState<ImportProfileId>("generic_template");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClaimImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const importProfiles = useMemo(
    () => [
      {
        id: "generic_template" as const,
        label: messages.profileGeneric,
        description: messages.profileGenericDescription
      },
      {
        id: "dentrix_csv_shell" as const,
        label: messages.profileDentrix,
        description: messages.profileDentrixDescription
      }
    ],
    [messages]
  );

  const readyRows = useMemo(
    () =>
      preview?.rows.filter((row) => row.action === "create" || row.action === "update").length ??
      0,
    [preview]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    const parsedRows = parseCsvText(text);

    setRawRows(parsedRows);
    setFileName(file.name);
    setPreview(null);
    setError(null);
    setNotice(null);
  }

  function handlePreview() {
    startTransition(async () => {
      setError(null);
      setNotice(null);

      if (rawRows.length === 0) {
        setError(messages.uploadRequiredError);
        return;
      }

      const response = await fetch("/api/claims/import/preview", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ rows: rawRows, importProfile })
      });

      if (!response.ok) {
        setError(messages.previewFailedError);
        return;
      }

      const payload = (await response.json()) as { item: ClaimImportPreview };
      setPreview(payload.item);
      setNotice(messages.previewGeneratedNotice);
    });
  }

  function handleCommit() {
    startTransition(async () => {
      setError(null);
      setNotice(null);

      if (!preview || readyRows === 0) {
        setError(messages.previewRequiredError);
        return;
      }

      const response = await fetch("/api/claims/import/commit", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ rows: rawRows, importProfile })
      });

      if (!response.ok) {
        setError(messages.commitFailedError);
        return;
      }

      const payload = (await response.json()) as { item: ClaimImportPreview };
      setPreview(payload.item);
      const committedCount = payload.item.summary.importedCount ?? readyRows;
      setNotice(
        locale === "fr"
          ? `${committedCount} ${messages.commitNoticeSuffix}`
          : `${messages.commitNoticePrefix} ${committedCount} ${messages.commitNoticeSuffix}`
      );
      router.refresh();
    });
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{messages.title}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {messages.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              {messages.downloadTemplate}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Upload className="h-4 w-4" />
              {messages.uploadCsv}
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard label={messages.configuredPayers} value={String(payers.length)} />
          <KPICard label={messages.rowsLoaded} value={String(rawRows.length)} />
          <KPICard label={messages.readyToCommit} value={String(readyRows)} variant="success" />
          <KPICard
            label={messages.skippedRows}
            value={String(
              (preview?.summary.invalidCount ?? 0) + (preview?.summary.duplicateInFileCount ?? 0)
            )}
            variant="warning"
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <h2 className="text-sm font-medium text-gray-900">
                  {messages.importInstructionsTitle}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {messages.importInstructionsBody}
                </p>
              </div>
            </div>
            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
              <label className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
                {messages.templateProfileLabel}
              </label>
              <select
                value={importProfile}
                onChange={(event) => {
                  setImportProfile(event.target.value as ImportProfileId);
                  setPreview(null);
                  setNotice(null);
                  setError(null);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {importProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">{messages.templateProfileHelp}</p>
              <div className="mt-3 text-xs text-gray-600">
                {
                  importProfiles.find((profile) => profile.id === importProfile)?.description
                }
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                {messages.expectedHeaders}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {templateHeaders.map((header) => (
                  <span
                    key={header}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700"
                  >
                    {header}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-500">
                {messages.uploadedFile}:{" "}
                <span className="font-medium text-gray-700">{fileName ?? messages.none}</span>
              </div>
            </div>
            {notice ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice}</span>
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                {messages.previewImport}
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={isPending || readyRows === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {messages.commitReadyRows}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-medium text-gray-900">{messages.configuredPayersTitle}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {messages.configuredPayersBody}
            </p>
            <div className="mt-4 space-y-2">
              {payers.map((payer) => (
                <div
                  key={payer.payerId}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <div className="font-medium text-gray-900">{payer.payerName}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {payer.payerId} · {payer.countryCode} / {payer.jurisdiction.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {preview ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-medium text-gray-900">{messages.previewResultsTitle}</h2>
              <p className="mt-1 text-xs text-gray-600">
                {messages.previewResultsBody}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 md:grid-cols-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  {messages.summaryTotal}
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {preview.summary.totalRows}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  {messages.summaryCreate}
                </div>
                <div className="mt-1 text-lg font-semibold text-green-700">
                  {preview.summary.createCount}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  {messages.summaryUpdate}
                </div>
                <div className="mt-1 text-lg font-semibold text-blue-700">
                  {preview.summary.updateCount}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  {messages.summaryInvalid}
                </div>
                <div className="mt-1 text-lg font-semibold text-red-700">
                  {preview.summary.invalidCount}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">
                  {messages.summaryDuplicate}
                </div>
                <div className="mt-1 text-lg font-semibold text-red-700">
                  {preview.summary.duplicateInFileCount}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {[
                      messages.columnRow,
                      messages.columnAction,
                      messages.columnClaim,
                      messages.columnPatient,
                      messages.columnPayer,
                      messages.columnJurisdiction,
                      messages.columnClaimType,
                      messages.columnPriority,
                      messages.columnMessages
                    ].map(
                      (header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-600"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-gray-100 align-top">
                      <td className="px-4 py-3 text-sm text-gray-700">{row.rowNumber}</td>
                      <td className="px-4 py-3">{actionBadge(row.action, messages)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.claimNumber ?? messages.missing}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.patientName ?? messages.missing}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.payerName ?? row.payerId ?? messages.missing}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.countryCode ?? row.jurisdiction?.toUpperCase() ?? "—"}
                        {row.provinceOfService ? ` · ${row.provinceOfService}` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.claimType ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.priority ?? messages.invalid}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.messages.join(" ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
