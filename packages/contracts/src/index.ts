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
  jurisdiction: z.enum(["us", "ca"]).optional(),
  countryCode: z.enum(["US", "CA"]).optional(),
  portalText: z.string(),
  screenshotUrls: z.array(z.string()),
  provinceOfService: z.string().trim().min(2).max(3).nullable().optional(),
  claimType: z.string().trim().min(1).nullable().optional(),
  serviceProviderType: z
    .enum([
      "physiotherapist",
      "chiropractor",
      "massage_therapist",
      "psychotherapist",
      "other"
    ])
    .nullable()
    .optional(),
  serviceCode: z.string().trim().min(1).nullable().optional(),
  planNumber: z.string().trim().min(1).nullable().optional(),
  memberCertificate: z.string().trim().min(1).nullable().optional(),
  serviceDate: z.string().trim().min(1).nullable().optional(),
  billedAmountCents: z.number().int().nullable().optional(),
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

export const agentToolNameSchema = z.enum(["execute_connector"]);

export const connectorModeSchema = z.enum(["browser", "api"]);

export const agentStepStatusSchema = z.enum(["started", "completed"]);

export const agentDirectiveKindSchema = z.enum(["tool_call", "final", "retry"]);

export const agentRunTerminalReasonSchema = z.enum([
  "resolved_candidate",
  "review_required",
  "retry_scheduled",
  "budget_exhausted_incomplete",
  "budget_exhausted_conflict",
  "provider_unavailable_retry",
  "provider_unavailable_review",
  "fallback_policy_review"
]);

export const agentObservationSchema = z.object({
  observationVersion: z.literal(1),
  connectorId: z.string(),
  connectorName: z.string(),
  connectorVersion: z.string().nullable().optional(),
  executionMode: connectorModeSchema,
  observedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  success: z.boolean(),
  retryable: z.boolean(),
  failureCategory: executionFailureCategorySchema.nullable(),
  summary: z.string(),
  portalTextSnippet: z.string().nullable().optional(),
  screenshotUrls: z.array(z.string()).default([]),
  evidenceArtifactIds: z.array(z.string()).default([]),
  evidenceArtifacts: z.array(evidenceArtifactSchema).default([]),
  connectorPayloadJson: z.string().nullable().optional()
});

export const agentPlannerUsageSchema = z.object({
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative()
});

export const executeConnectorArgsSchema = z.object({
  connectorId: z.string(),
  mode: connectorModeSchema,
  attemptLabel: z.string()
});

export const agentToolCallSchema = z.object({
  toolName: agentToolNameSchema,
  args: executeConnectorArgsSchema
});

export const agentStepResultSchema = z.object({
  observation: agentObservationSchema.nullable().optional(),
  summary: z.string(),
  evidenceArtifactIds: z.array(z.string()).default([]),
  retryable: z.boolean().optional(),
  failureCategory: executionFailureCategorySchema.nullable().optional(),
  finalCandidate: executionCandidateSchema.nullable().optional(),
  retryAfterSeconds: z.number().int().positive().nullable().optional(),
  terminalReason: agentRunTerminalReasonSchema.nullable().optional()
});

export const agentStepHistoryItemSchema = z.object({
  stepNumber: z.number().int().positive(),
  directiveKind: agentDirectiveKindSchema,
  toolName: agentToolNameSchema.nullable().optional(),
  status: agentStepStatusSchema,
  idempotencyKey: z.string(),
  publicReason: z.string(),
  toolArgs: executeConnectorArgsSchema.nullable().optional(),
  plannerUsage: agentPlannerUsageSchema.nullable().optional(),
  result: agentStepResultSchema.nullable().optional(),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional()
});

export const agentRunBudgetSchema = z.object({
  maxToolSteps: z.number().int().positive(),
  maxModelCalls: z.number().int().positive(),
  maxWallTimeMs: z.number().int().positive(),
  maxTotalTokens: z.number().int().positive(),
  maxConnectorSwitches: z.number().int().nonnegative()
});

export const agentRunContextSchema = z.object({
  protocolVersion: z.literal(1),
  runId: z.string(),
  claimId: z.string(),
  retrievalJobId: z.string(),
  payerId: z.string(),
  payerName: z.string(),
  claimNumber: z.string(),
  patientName: z.string(),
  jurisdiction: z.enum(["us", "ca"]).optional(),
  countryCode: z.enum(["US", "CA"]).optional(),
  provinceOfService: z.string().trim().min(2).max(3).nullable().optional(),
  claimType: z.string().trim().min(1).nullable().optional(),
  serviceProviderType: z
    .enum([
      "physiotherapist",
      "chiropractor",
      "massage_therapist",
      "psychotherapist",
      "other"
    ])
    .nullable()
    .optional(),
  serviceCode: z.string().trim().min(1).nullable().optional(),
  planNumber: z.string().trim().min(1).nullable().optional(),
  memberCertificate: z.string().trim().min(1).nullable().optional(),
  serviceDate: z.string().trim().min(1).nullable().optional(),
  billedAmountCents: z.number().int().nullable().optional(),
  currentAttempt: z.number().int().positive(),
  maxAttempts: z.number().int().positive(),
  startedAt: z.string(),
  elapsedMs: z.number().int().nonnegative(),
  leaseExpiresAt: z.string().nullable(),
  modelCallsUsed: z.number().int().nonnegative(),
  totalTokensUsed: z.number().int().nonnegative(),
  connectorSwitchCount: z.number().int().nonnegative(),
  budget: agentRunBudgetSchema,
  availableTools: z.array(agentToolNameSchema),
  steps: z.array(agentStepHistoryItemSchema)
});

export const agentDirectiveSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tool_call"),
    publicReason: z.string(),
    plannerUsage: agentPlannerUsageSchema,
    toolCall: agentToolCallSchema
  }),
  z.object({
    type: z.literal("final"),
    publicReason: z.string(),
    plannerUsage: agentPlannerUsageSchema,
    completionReason: agentRunTerminalReasonSchema,
    candidate: executionCandidateSchema
  }),
  z.object({
    type: z.literal("retry"),
    publicReason: z.string(),
    plannerUsage: agentPlannerUsageSchema,
    completionReason: agentRunTerminalReasonSchema,
    retryAfterSeconds: z.number().int().positive()
  })
]);

export const agentStepRequestSchema = z.object({
  context: agentRunContextSchema
});

export const agentStepResponseSchema = z.object({
  directive: agentDirectiveSchema,
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
export type AgentToolName = z.infer<typeof agentToolNameSchema>;
export type ConnectorMode = z.infer<typeof connectorModeSchema>;
export type AgentStepStatus = z.infer<typeof agentStepStatusSchema>;
export type AgentDirectiveKind = z.infer<typeof agentDirectiveKindSchema>;
export type AgentRunTerminalReason = z.infer<typeof agentRunTerminalReasonSchema>;
export type AgentObservation = z.infer<typeof agentObservationSchema>;
export type AgentPlannerUsage = z.infer<typeof agentPlannerUsageSchema>;
export type ExecuteConnectorArgs = z.infer<typeof executeConnectorArgsSchema>;
export type AgentToolCall = z.infer<typeof agentToolCallSchema>;
export type AgentStepResult = z.infer<typeof agentStepResultSchema>;
export type AgentStepHistoryItem = z.infer<typeof agentStepHistoryItemSchema>;
export type AgentRunBudget = z.infer<typeof agentRunBudgetSchema>;
export type AgentRunContext = z.infer<typeof agentRunContextSchema>;
export type AgentDirective = z.infer<typeof agentDirectiveSchema>;
export type AgentStepRequest = z.infer<typeof agentStepRequestSchema>;
export type AgentStepResponse = z.infer<typeof agentStepResponseSchema>;
