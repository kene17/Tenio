import { z } from "zod";

import { evidenceArtifactSchema } from "@tenio/contracts";

export const claimStatusSchema = z.enum([
  "pending",
  "in_review",
  "resolved",
  "needs_review",
  "blocked"
]);

export const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const jurisdictionSchema = z.enum(["us", "ca"]);
export const countryCodeSchema = z.enum(["US", "CA"]);
export const userRoleSchema = z.enum(["owner", "manager", "operator", "viewer"]);
export const serviceProviderTypeSchema = z.enum([
  "physiotherapist",
  "chiropractor",
  "massage_therapist",
  "psychotherapist",
  "other"
]);

export const PERMISSIONS = {
  "claims:read": ["owner", "manager", "operator", "viewer"],
  "claims:write": ["owner", "manager", "operator"],
  "claims:import": ["owner", "manager", "operator"],
  "claims:export": ["owner", "manager"],
  "performance:read": ["owner", "manager"],
  "queue:read": ["owner", "manager", "operator", "viewer"],
  "queue:work": ["owner", "manager", "operator"],
  "queue:reassign": ["owner", "manager"],
  "evidence:read": ["owner", "manager", "operator", "viewer"],
  "evidence:write": ["owner", "manager", "operator"],
  "evidence:download": ["owner", "manager", "operator"],
  "followup:log": ["owner", "manager", "operator"],
  "payer:read": ["owner", "manager"],
  "payer:write": ["owner"],
  "users:read": ["owner", "manager"],
  "users:invite": ["owner"],
  "users:remove": ["owner"],
  "audit:read": ["owner", "manager"],
  "status:read": ["owner", "manager"],
  "account:read": ["owner"],
  "account:write": ["owner"]
} as const satisfies Record<string, readonly z.infer<typeof userRoleSchema>[]>;

export const permissionSchema = z.enum([
  "claims:read",
  "claims:write",
  "claims:import",
  "claims:export",
  "performance:read",
  "queue:read",
  "queue:work",
  "queue:reassign",
  "evidence:read",
  "evidence:write",
  "evidence:download",
  "followup:log",
  "payer:read",
  "payer:write",
  "users:read",
  "users:invite",
  "users:remove",
  "audit:read",
  "status:read",
  "account:read",
  "account:write"
]);

export const reviewDecisionSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "approved", "corrected", "escalated"]),
  reason: z.string(),
  reviewer: z.string().nullable(),
  createdAt: z.string()
});

export const claimSummarySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  payerId: z.string(),
  claimNumber: z.string(),
  patientName: z.string(),
  jurisdiction: jurisdictionSchema.optional(),
  countryCode: countryCodeSchema.optional(),
  provinceOfService: z.string().trim().min(2).max(3).nullable().optional(),
  claimType: z.string().trim().min(1).nullable().optional(),
  serviceProviderType: serviceProviderTypeSchema.nullable().optional(),
  serviceCode: z.string().trim().min(1).nullable().optional(),
  planNumber: z.string().trim().min(1).nullable().optional(),
  memberCertificate: z.string().trim().min(1).nullable().optional(),
  serviceDate: z.string().trim().min(1).nullable().optional(),
  status: claimStatusSchema,
  confidence: z.number().min(0).max(1),
  slaAt: z.string(),
  owner: z.string().nullable(),
  priority: prioritySchema
});

export const claimDetailSchema = claimSummarySchema.extend({
  payerName: z.string(),
  lastCheckedAt: z.string().nullable(),
  normalizedStatusText: z.string(),
  amountCents: z.number().nullable(),
  billedAmountCents: z.number().nullable().optional(),
  notes: z.string().nullable(),
  evidence: z.array(evidenceArtifactSchema),
  reviews: z.array(reviewDecisionSchema)
});

export const queueItemSchema = z.object({
  id: z.string(),
  claimId: z.string(),
  status: claimStatusSchema,
  assignedTo: z.string().nullable(),
  reason: z.string(),
  createdAt: z.string(),
  slaAt: z.string()
});

export const intakeClaimSchema = z.object({
  organizationId: z.string(),
  payerId: z.string(),
  claimNumber: z.string(),
  patientName: z.string(),
  jurisdiction: jurisdictionSchema.optional(),
  countryCode: countryCodeSchema.optional(),
  provinceOfService: z.string().trim().min(2).max(3).nullable().optional(),
  claimType: z.string().trim().min(1).nullable().optional(),
  serviceProviderType: serviceProviderTypeSchema.nullable().optional(),
  serviceCode: z.string().trim().min(1).nullable().optional(),
  planNumber: z.string().trim().min(1).nullable().optional(),
  memberCertificate: z.string().trim().min(1).nullable().optional(),
  serviceDate: z.string().trim().min(1).nullable().optional(),
  billedAmountCents: z.number().int().nullable().optional(),
  priority: prioritySchema.default("normal"),
  owner: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional(),
  slaAt: z.string().datetime().nullable().optional(),
  sourceStatus: z.string().trim().min(1).nullable().optional()
});

export type ClaimStatus = z.infer<typeof claimStatusSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type Jurisdiction = z.infer<typeof jurisdictionSchema>;
export type CountryCode = z.infer<typeof countryCodeSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type ServiceProviderType = z.infer<typeof serviceProviderTypeSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type ClaimSummary = z.infer<typeof claimSummarySchema>;
export type ClaimDetail = z.infer<typeof claimDetailSchema>;
export type QueueItem = z.infer<typeof queueItemSchema>;
export type IntakeClaim = z.infer<typeof intakeClaimSchema>;

export function normalizeUserRole(
  value: string | null | undefined
): UserRole | null {
  if (value === "admin") {
    return "owner";
  }

  const parsed = userRoleSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function hasPermission(role: UserRole, permission: Permission) {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

export function roleLabel(role: UserRole) {
  if (role === "owner") return "Owner";
  if (role === "manager") return "Manager";
  if (role === "operator") return "Operator";
  return "Viewer";
}
