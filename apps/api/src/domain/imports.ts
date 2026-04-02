import type { Priority } from "@tenio/domain";

import type { ClaimRecord } from "./pilot-state.js";
import type { PayerConfigurationRecord } from "./prod-state.js";

export type ClaimImportRowInput = {
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

export type ClaimImportAction = "create" | "update" | "invalid" | "duplicate_in_file";

export type NormalizedClaimImportRow = {
  rowNumber: number;
  claimNumber: string;
  patientName: string;
  payerId: string;
  payerName: string;
  priority: Priority;
  owner: string | null;
  notes: string | null;
  slaAt: string | null;
  sourceStatus: string | null;
  existingClaimId: string | null;
};

export type ClaimImportPreviewRow = {
  rowNumber: number;
  action: ClaimImportAction;
  messages: string[];
  claimNumber: string | null;
  patientName: string | null;
  payerId: string | null;
  payerName: string | null;
  priority: Priority | null;
  owner: string | null;
  notes: string | null;
  slaAt: string | null;
  sourceStatus: string | null;
  existingClaimId: string | null;
};

export type ClaimImportPreviewResult = {
  summary: {
    totalRows: number;
    createCount: number;
    updateCount: number;
    invalidCount: number;
    duplicateInFileCount: number;
  };
  rows: ClaimImportPreviewRow[];
};

const allowedPriorities: Priority[] = ["low", "normal", "high", "urgent"];

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizePriority(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return { priority: "normal" as const, error: null };
  }

  if (allowedPriorities.includes(normalized as Priority)) {
    return { priority: normalized as Priority, error: null };
  }

  return {
    priority: null,
    error: `Priority "${value}" must be one of ${allowedPriorities.join(", ")}.`
  };
}

function normalizeSlaAt(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return { slaAt: null, error: null };
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return {
      slaAt: null,
      error: `SLA date "${value}" is not a valid date.`
    };
  }

  return {
    slaAt: parsed.toISOString(),
    error: null
  };
}

function resolvePayerConfiguration(
  row: ClaimImportRowInput,
  payers: PayerConfigurationRecord[]
) {
  const payerId = normalizeText(row.payerId);
  const payerName = normalizeText(row.payerName);

  if (payerId) {
    return (
      payers.find((payer) => payer.payerId.toLowerCase() === payerId.toLowerCase()) ?? null
    );
  }

  if (payerName) {
    return (
      payers.find((payer) => payer.payerName.toLowerCase() === payerName.toLowerCase()) ?? null
    );
  }

  return null;
}

export function previewClaimImportRows(params: {
  rows: ClaimImportRowInput[];
  existingClaims: ClaimRecord[];
  payerConfigurations: PayerConfigurationRecord[];
}): ClaimImportPreviewResult {
  const { rows, existingClaims, payerConfigurations } = params;
  const existingClaimsByNumber = new Map(
    existingClaims.map((claim) => [claim.claimNumber.trim().toLowerCase(), claim] as const)
  );
  const seenClaimNumbers = new Set<string>();
  const previewRows: ClaimImportPreviewRow[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const messages: string[] = [];
    const claimNumber = normalizeText(row.claimNumber);
    const patientName = normalizeText(row.patientName);
    const owner = normalizeText(row.owner);
    const notes = normalizeText(row.notes);
    const sourceStatus = normalizeText(row.sourceStatus);
    const { priority, error: priorityError } = normalizePriority(row.priority);
    const { slaAt, error: slaAtError } = normalizeSlaAt(row.slaAt);
    const payer = resolvePayerConfiguration(row, payerConfigurations);

    if (!claimNumber) {
      messages.push("Claim number is required.");
    }

    if (!patientName) {
      messages.push("Patient name is required.");
    }

    if (!payer) {
      messages.push("Payer must match a configured payer ID or payer name.");
    }

    if (priorityError) {
      messages.push(priorityError);
    }

    if (slaAtError) {
      messages.push(slaAtError);
    }

    const claimKey = claimNumber?.toLowerCase() ?? null;
    const baseMessages = [...messages];

    if (claimKey && baseMessages.length === 0) {
      if (seenClaimNumbers.has(claimKey)) {
        messages.push("Claim number appears multiple times in this import.");
      } else {
        seenClaimNumbers.add(claimKey);
      }
    }

    const existingClaim = claimKey ? existingClaimsByNumber.get(claimKey) ?? null : null;
    const action: ClaimImportAction =
      messages.length > 0
        ? messages.includes("Claim number appears multiple times in this import.")
          ? "duplicate_in_file"
          : "invalid"
        : existingClaim
          ? "update"
          : "create";

    previewRows.push({
      rowNumber,
      action,
      messages:
        action === "update"
          ? ["Existing claim will be refreshed during import."]
          : action === "create"
            ? ["Claim will be created in the active queue."]
            : messages,
      claimNumber,
      patientName,
      payerId: payer?.payerId ?? null,
      payerName: payer?.payerName ?? normalizeText(row.payerName),
      priority,
      owner,
      notes,
      slaAt,
      sourceStatus,
      existingClaimId: existingClaim?.id ?? null
    });
  }

  return {
    summary: {
      totalRows: previewRows.length,
      createCount: previewRows.filter((row) => row.action === "create").length,
      updateCount: previewRows.filter((row) => row.action === "update").length,
      invalidCount: previewRows.filter((row) => row.action === "invalid").length,
      duplicateInFileCount: previewRows.filter((row) => row.action === "duplicate_in_file")
        .length
    },
    rows: previewRows
  };
}
