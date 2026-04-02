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
  priority: prioritySchema.default("normal"),
  owner: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().min(1).nullable().optional(),
  slaAt: z.string().datetime().nullable().optional(),
  sourceStatus: z.string().trim().min(1).nullable().optional()
});

export type ClaimStatus = z.infer<typeof claimStatusSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type ClaimSummary = z.infer<typeof claimSummarySchema>;
export type ClaimDetail = z.infer<typeof claimDetailSchema>;
export type QueueItem = z.infer<typeof queueItemSchema>;
export type IntakeClaim = z.infer<typeof intakeClaimSchema>;
