import type { ClaimImportRowInput } from "../../domain/imports.js";
import { adaptDentrixImportRow, type RawImportRow } from "./dentrix.js";
import { adaptJaneAppImportRow } from "./jane-app.js";

export type { RawImportRow } from "./dentrix.js";

export type ImportProfileId = "generic_template" | "dentrix_csv_shell" | "jane_app_csv";

export type ImportProfileDefinition = {
  id: ImportProfileId;
  label: string;
  description: string;
};

export const importProfiles: ImportProfileDefinition[] = [
  {
    id: "generic_template",
    label: "Generic Tenio Template",
    description: "Exact header match for the Tenio CSV template."
  },
  {
    id: "dentrix_csv_shell",
    label: "Dentrix CSV Shell",
    description: "Starter alias mapping for dental-office exports and sample files."
  },
  {
    id: "jane_app_csv",
    label: "Jane App CSV",
    description:
      "Recommended paramedical clinic profile with Jane-oriented header alias mapping and Canadian defaults."
  }
];

function adaptGenericRow(row: RawImportRow): ClaimImportRowInput {
  return {
    claimNumber: row.claimNumber ?? null,
    patientName: row.patientName ?? null,
    payerId: row.payerId ?? null,
    payerName: row.payerName ?? null,
    jurisdiction: row.jurisdiction ?? null,
    countryCode: row.countryCode ?? null,
    provinceOfService: row.provinceOfService ?? null,
    claimType: row.claimType ?? null,
    serviceProviderType: row.serviceProviderType ?? null,
    serviceCode: row.serviceCode ?? null,
    planNumber: row.planNumber ?? null,
    memberCertificate: row.memberCertificate ?? null,
    serviceDate: row.serviceDate ?? null,
    billedAmountCents: row.billedAmountCents ?? null,
    priority: row.priority ?? null,
    owner: row.owner ?? null,
    notes: row.notes ?? null,
    slaAt: row.slaAt ?? null,
    sourceStatus: row.sourceStatus ?? null
  };
}

export function adaptImportRows(
  rows: RawImportRow[],
  profileId: ImportProfileId = "generic_template"
): ClaimImportRowInput[] {
  if (profileId === "jane_app_csv") {
    return rows.map(adaptJaneAppImportRow);
  }

  if (profileId === "dentrix_csv_shell") {
    return rows.map(adaptDentrixImportRow);
  }

  return rows.map(adaptGenericRow);
}
