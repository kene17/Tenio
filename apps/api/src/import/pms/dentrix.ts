import type { ClaimImportRowInput } from "../../domain/imports.js";

export type RawImportRow = Record<string, string | null | undefined>;

const claimNumberHeaders = ["claimNumber", "Claim Number", "Claim #", "ClaimNumber"];
const patientNameHeaders = ["patientName", "Patient Name", "Patient", "Subscriber Name"];
const payerIdHeaders = ["payerId", "Payer ID"];
const payerNameHeaders = [
  "payerName",
  "Payer Name",
  "Carrier",
  "Carrier Name",
  "Insurance Company"
];
const jurisdictionHeaders = ["jurisdiction", "Jurisdiction"];
const countryCodeHeaders = ["countryCode", "Country Code", "Country"];
const provinceHeaders = ["provinceOfService", "Province of Service", "Province", "Prov"];
const claimTypeHeaders = ["claimType", "Claim Type", "Service Type", "Plan Type"];
const priorityHeaders = ["priority", "Priority"];
const ownerHeaders = ["owner", "Assigned To", "Claim Owner"];
const notesHeaders = ["notes", "Notes", "Comment", "Comments"];
const slaHeaders = ["slaAt", "SLA At", "Follow Up By", "Follow-up Date"];
const sourceStatusHeaders = ["sourceStatus", "Claim Status", "Status"];

function pickValue(row: RawImportRow, headers: string[]) {
  for (const header of headers) {
    const value = row[header];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function adaptDentrixImportRow(row: RawImportRow): ClaimImportRowInput {
  const provinceOfService = pickValue(row, provinceHeaders);
  const countryCode = pickValue(row, countryCodeHeaders);
  const jurisdiction = pickValue(row, jurisdictionHeaders) ?? (provinceOfService ? "ca" : null);

  return {
    claimNumber: pickValue(row, claimNumberHeaders),
    patientName: pickValue(row, patientNameHeaders),
    payerId: pickValue(row, payerIdHeaders),
    payerName: pickValue(row, payerNameHeaders),
    jurisdiction,
    countryCode: countryCode === "Canada" ? "CA" : countryCode,
    provinceOfService,
    claimType: pickValue(row, claimTypeHeaders) ?? "dental",
    priority: pickValue(row, priorityHeaders),
    owner: pickValue(row, ownerHeaders),
    notes: pickValue(row, notesHeaders),
    slaAt: pickValue(row, slaHeaders),
    sourceStatus: pickValue(row, sourceStatusHeaders)
  };
}
