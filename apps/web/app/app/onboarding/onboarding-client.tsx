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
import { parseCsvText } from "../../../lib/csv";

type ClaimImportAction = "create" | "update" | "invalid" | "duplicate_in_file";

type ClaimImportRowInput = {
  claimNumber?: string | null;
  patientName?: string | null;
  payerId?: string | null;
  payerName?: string | null;
  priority?: string | null;
  owner?: string | null;
  notes?: string | null;
  slaAt?: string | null;
  sourceStatus?: string | null;
};

type ClaimImportPreviewRow = {
  rowNumber: number;
  action: ClaimImportAction;
  messages: string[];
  claimNumber: string | null;
  patientName: string | null;
  payerId: string | null;
  payerName: string | null;
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
  "high",
  "Sarah Chen",
  "Imported from April active inventory extract",
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  "Pending payer review"
];

function actionBadge(action: ClaimImportAction) {
  if (action === "create") {
    return (
      <span className="inline-flex rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        Create
      </span>
    );
  }

  if (action === "update") {
    return (
      <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        Update
      </span>
    );
  }

  return (
    <span className="inline-flex rounded border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      Skip
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
  payers
}: {
  payers: Array<{ payerId: string; payerName: string }>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ClaimImportRowInput[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClaimImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    const parsedRows = parseCsvText(text).map((record) => ({
      claimNumber: record.claimNumber ?? null,
      patientName: record.patientName ?? null,
      payerId: record.payerId ?? null,
      payerName: record.payerName ?? null,
      priority: record.priority ?? null,
      owner: record.owner ?? null,
      notes: record.notes ?? null,
      slaAt: record.slaAt ?? null,
      sourceStatus: record.sourceStatus ?? null
    }));

    setRows(parsedRows);
    setFileName(file.name);
    setPreview(null);
    setError(null);
    setNotice(null);
  }

  function handlePreview() {
    startTransition(async () => {
      setError(null);
      setNotice(null);

      if (rows.length === 0) {
        setError("Upload a CSV file before requesting a preview.");
        return;
      }

      const response = await fetch("/api/claims/import/preview", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ rows })
      });

      if (!response.ok) {
        setError("The import preview failed. Check the CSV format and try again.");
        return;
      }

      const payload = (await response.json()) as { item: ClaimImportPreview };
      setPreview(payload.item);
      setNotice("Preview generated. Review skipped rows before committing.");
    });
  }

  function handleCommit() {
    startTransition(async () => {
      setError(null);
      setNotice(null);

      if (!preview || readyRows === 0) {
        setError("Preview the file first. Tenio only commits rows marked Create or Update.");
        return;
      }

      const response = await fetch("/api/claims/import/commit", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ rows })
      });

      if (!response.ok) {
        setError("The import commit failed. No backlog changes were applied.");
        return;
      }

      const payload = (await response.json()) as { item: ClaimImportPreview };
      setPreview(payload.item);
      setNotice(
        `Committed ${payload.item.summary.importedCount ?? readyRows} rows into the active backlog.`
      );
      router.refresh();
    });
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Onboarding</h1>
            <p className="mt-1 text-sm text-gray-600">
              Import active inventory with preview validation, duplicate detection, and
              reconciliation before go-live.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Upload className="h-4 w-4" />
              Upload CSV
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
          <KPICard label="Configured Payers" value={String(payers.length)} />
          <KPICard label="Rows Loaded" value={String(rows.length)} />
          <KPICard label="Ready To Commit" value={String(readyRows)} variant="success" />
          <KPICard
            label="Skipped Rows"
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
                <h2 className="text-sm font-medium text-gray-900">Import Instructions</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Use the template headers exactly. `payerId` or `payerName` must match one of the
                  configured payer profiles.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Expected Headers
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
                Uploaded file: <span className="font-medium text-gray-700">{fileName ?? "None"}</span>
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
                Preview Import
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={isPending || readyRows === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                Commit Ready Rows
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-medium text-gray-900">Configured Payers</h2>
            <p className="mt-1 text-sm text-gray-600">
              Import rows should match these payer profiles exactly or by payer name.
            </p>
            <div className="mt-4 space-y-2">
              {payers.map((payer) => (
                <div
                  key={payer.payerId}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <div className="font-medium text-gray-900">{payer.payerName}</div>
                  <div className="mt-1 text-xs text-gray-500">{payer.payerId}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {preview ? (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-medium text-gray-900">Preview Results</h2>
              <p className="mt-1 text-xs text-gray-600">
                Tenio will only commit rows marked Create or Update.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 md:grid-cols-5">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Total</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {preview.summary.totalRows}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Create</div>
                <div className="mt-1 text-lg font-semibold text-green-700">
                  {preview.summary.createCount}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Update</div>
                <div className="mt-1 text-lg font-semibold text-blue-700">
                  {preview.summary.updateCount}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Invalid</div>
                <div className="mt-1 text-lg font-semibold text-red-700">
                  {preview.summary.invalidCount}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Duplicate</div>
                <div className="mt-1 text-lg font-semibold text-red-700">
                  {preview.summary.duplicateInFileCount}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {["Row", "Action", "Claim", "Patient", "Payer", "Priority", "Messages"].map(
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
                      <td className="px-4 py-3">{actionBadge(row.action)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.claimNumber ?? "Missing"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.patientName ?? "Missing"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.payerName ?? row.payerId ?? "Missing"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {row.priority ?? "Invalid"}
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
