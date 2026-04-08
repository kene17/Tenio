import type { ClaimImportRowInput } from "../../domain/imports.js";

export type RawImportRow = Record<string, string | null | undefined>;

const claimNumberHeaders = [
  "claimNumber",
  "Claim Number",
  "Claim #",
  "Insurance Claim Number",
  "Invoice Number"
];
const patientNameHeaders = [
  "patientName",
  "Patient Name",
  "Patient",
  "Client Name",
  "Full Name"
];
const payerIdHeaders = ["payerId", "Payer ID"];
const payerNameHeaders = [
  "payerName",
  "Payer Name",
  "Insurer",
  "Insurer Name",
  "Insurance Company",
  "Insurance Policy Company"
];
const provinceHeaders = [
  "provinceOfService",
  "Province of Service",
  "Province",
  "Prov",
  "Clinic Province"
];
const ownerHeaders = ["owner", "Assigned To", "Coordinator", "Claim Owner"];
const notesHeaders = ["notes", "Notes", "Comment", "Comments"];
const sourceStatusHeaders = [
  "sourceStatus",
  "Claim Status",
  "Status",
  "Insurance Status",
  "Payment Status"
];
const serviceProviderTypeHeaders = [
  "serviceProviderType",
  "Service Provider Type",
  "Discipline",
  "Provider Discipline",
  "Appointment Discipline"
];
const serviceCodeHeaders = [
  "serviceCode",
  "Service Code",
  "Treatment Code",
  "Appointment Type Code",
  "Billing Code"
];
const planNumberHeaders = [
  "planNumber",
  "Plan Number",
  "Policy Number",
  "Policy #",
  "Insurance Plan Number"
];
const memberCertificateHeaders = [
  "memberCertificate",
  "Member Certificate",
  "Certificate Number",
  "Member ID",
  "Certificate #"
];
const serviceDateHeaders = [
  "serviceDate",
  "Service Date",
  "Appointment Date",
  "Treatment Date",
  "Visit Date"
];
const billedAmountHeaders = [
  "billedAmountCents",
  "Billed Amount",
  "Amount Billed",
  "Insurance Amount",
  "Total"
];

function pickValue(row: RawImportRow, headers: string[]) {
  for (const header of headers) {
    const value = row[header];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function adaptJaneAppImportRow(row: RawImportRow): ClaimImportRowInput {
  return {
    claimNumber: pickValue(row, claimNumberHeaders),
    patientName: pickValue(row, patientNameHeaders),
    payerId: pickValue(row, payerIdHeaders),
    payerName: pickValue(row, payerNameHeaders),
    jurisdiction: "ca",
    countryCode: "CA",
    provinceOfService: pickValue(row, provinceHeaders),
    claimType: "paramedical",
    serviceProviderType: pickValue(row, serviceProviderTypeHeaders),
    serviceCode: pickValue(row, serviceCodeHeaders),
    planNumber: pickValue(row, planNumberHeaders),
    memberCertificate: pickValue(row, memberCertificateHeaders),
    serviceDate: pickValue(row, serviceDateHeaders),
    billedAmountCents: pickValue(row, billedAmountHeaders),
    owner: pickValue(row, ownerHeaders),
    notes: pickValue(row, notesHeaders),
    sourceStatus: pickValue(row, sourceStatusHeaders)
  };
}
