import type { Priority } from "@tenio/domain";

import type { ClaimRecord } from "./pilot-state.js";
import type { PayerConfigurationRecord } from "./prod-state.js";

export type ClaimImportRowInput = {
  claimNumber?: string | null;
  patientName?: string | null;
  payerId?: string | null;
  payerName?: string | null;
  jurisdiction?: string | null;
  countryCode?: string | null;
  provinceOfService?: string | null;
  claimType?: string | null;
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
  jurisdiction: "us" | "ca";
  countryCode: "US" | "CA";
  provinceOfService: string | null;
  claimType: string | null;
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
  jurisdiction: "us" | "ca" | null;
  countryCode: "US" | "CA" | null;
  provinceOfService: string | null;
  claimType: string | null;
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

function normalizeJurisdiction(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return { jurisdiction: null, error: null };
  }

  if (["us", "usa", "united_states", "united states"].includes(normalized)) {
    return { jurisdiction: "us" as const, error: null };
  }

  if (["ca", "can", "canada"].includes(normalized)) {
    return { jurisdiction: "ca" as const, error: null };
  }

  return {
    jurisdiction: null,
    error: `Jurisdiction "${value}" must be US or CA.`
  };
}

function normalizeCountryCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) {
    return { countryCode: null, error: null };
  }

  if (normalized === "US" || normalized === "CA") {
    return { countryCode: normalized as "US" | "CA", error: null };
  }

  return {
    countryCode: null,
    error: `Country code "${value}" must be US or CA.`
  };
}

function deriveCountryCode(jurisdiction: "us" | "ca") {
  return jurisdiction === "ca" ? ("CA" as const) : ("US" as const);
}

function normalizeProvinceOfService(value: string | null | undefined) {
  const normalized = normalizeText(value)?.toUpperCase();

  if (!normalized) {
    return { provinceOfService: null, error: null };
  }

  if (normalized.length < 2 || normalized.length > 3) {
    return {
      provinceOfService: null,
      error: `Province of service "${value}" must be a 2-3 character code.`
    };
  }

  return {
    provinceOfService: normalized,
    error: null
  };
}

function normalizeClaimType(value: string | null | undefined) {
  const normalized = normalizeText(value)?.toLowerCase();
  return normalized ? normalized : null;
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
    const { jurisdiction: inputJurisdiction, error: jurisdictionError } =
      normalizeJurisdiction(row.jurisdiction);
    const { countryCode: inputCountryCode, error: countryCodeError } =
      normalizeCountryCode(row.countryCode);
    const { provinceOfService, error: provinceError } = normalizeProvinceOfService(
      row.provinceOfService
    );
    const claimType = normalizeClaimType(row.claimType);
    const { slaAt, error: slaAtError } = normalizeSlaAt(row.slaAt);
    const payer = resolvePayerConfiguration(row, payerConfigurations);
    const jurisdiction = inputJurisdiction ?? payer?.jurisdiction ?? "us";
    const countryCode = inputCountryCode ?? payer?.countryCode ?? deriveCountryCode(jurisdiction);

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

    if (jurisdictionError) {
      messages.push(jurisdictionError);
    }

    if (countryCodeError) {
      messages.push(countryCodeError);
    }

    if (
      !countryCodeError &&
      inputCountryCode &&
      inputCountryCode !== deriveCountryCode(jurisdiction)
    ) {
      messages.push("Country code must match the selected jurisdiction.");
    }

    if (provinceError) {
      messages.push(provinceError);
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
      jurisdiction,
      countryCode,
      provinceOfService,
      claimType,
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
