import { z } from "zod";

export const evidenceArtifactSchema = z.object({
  id: z.string(),
  kind: z.enum(["screenshot", "raw_html", "note"]),
  label: z.string(),
  url: z.string(),
  createdAt: z.string(),
  mimeType: z.string().optional(),
  storageKind: z.enum(["external", "inline", "persisted"]).optional(),
  storageKey: z.string().nullable().optional(),
  inlineContentBase64: z.string().nullable().optional(),
  storageBackend: z.string().optional(),
  checksumSha256: z.string().nullable().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  retentionUntil: z.string().nullable().optional()
});

export const executionFailureCategorySchema = z.enum([
  "authentication",
  "network",
  "rate_limited",
  "portal_changed",
  "data_missing",
  "unknown"
]);

export const agentExecutionSchema = z.object({
  connectorId: z.string(),
  connectorName: z.string(),
  executionMode: z.enum(["browser", "api"]),
  observedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  attempt: z.number().int().positive(),
  maxAttempts: z.number().int().positive(),
  outcome: z.enum(["succeeded", "review_required", "retry_scheduled", "failed"]),
  retryable: z.boolean(),
  failureCategory: executionFailureCategorySchema.nullable().optional()
});

export const executionCandidateSchema = z.object({
  claimId: z.string(),
  normalizedStatusText: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(evidenceArtifactSchema),
  recommendedAction: z.enum(["resolve", "review", "retry"]),
  rawNotes: z.string().nullable(),
  rationale: z.string(),
  routeReason: z.string(),
  agentTraceId: z.string().nullable().optional(),
  execution: agentExecutionSchema
});

export const aiClaimStatusAnalysisRequestSchema = z.object({
  claimId: z.string(),
  payerId: z.string(),
  payerName: z.string(),
  portalText: z.string(),
  screenshotUrls: z.array(z.string()),
  connectorId: z.string().optional(),
  connectorName: z.string().optional(),
  executionMode: z.enum(["browser", "api"]).optional(),
  connectorPayloadJson: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.string()).default({})
});

export const aiClaimStatusAnalysisResponseSchema = z.object({
  candidate: executionCandidateSchema,
  model: z.string(),
  traceId: z.string()
});

export type EvidenceArtifact = z.infer<typeof evidenceArtifactSchema>;
export type ExecutionFailureCategory = z.infer<typeof executionFailureCategorySchema>;
export type AgentExecution = z.infer<typeof agentExecutionSchema>;
export type ExecutionCandidate = z.infer<typeof executionCandidateSchema>;
export type AiClaimStatusAnalysisRequest = z.infer<
  typeof aiClaimStatusAnalysisRequestSchema
>;
export type AiClaimStatusAnalysisResponse = z.infer<
  typeof aiClaimStatusAnalysisResponseSchema
>;
