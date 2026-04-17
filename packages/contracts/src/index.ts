import { z } from "zod";

export const PAYER_AETNA = "payer_aetna";
export const PAYER_SUN_LIFE = "payer_sun_life";
export const PAYER_TELUS_ECLAIMS = "payer_telus_eclaims";
export const PAYER_MANULIFE = "payer_manulife";
export const PAYER_CANADA_LIFE = "payer_canada_life";
export const PAYER_GREEN_SHIELD = "payer_green_shield";
export const PAYER_DESJARDINS = "payer_desjardins";
export const PAYER_BLUE_CROSS_ON = "payer_blue_cross_on";

export const CONNECTOR_AETNA_API = "aetna-claim-status-api";
export const CONNECTOR_SUN_LIFE_BROWSER = "sun-life-pshcp-browser";
export const CONNECTOR_TELUS_ECLAIMS = "telus-eclaims-api";
export const CONNECTOR_PORTAL_FALLBACK = "portal-browser-fallback";
export const CONNECTOR_MANULIFE_BROWSER = "manulife-groupbenefits-browser";
export const CONNECTOR_CANADA_LIFE_BROWSER = "canada-life-groupnet-browser";
export const CONNECTOR_GREEN_SHIELD_BROWSER = "green-shield-provider-browser";

export const KNOWN_PAYER_IDS = [
  PAYER_AETNA,
  PAYER_SUN_LIFE,
  PAYER_TELUS_ECLAIMS,
  PAYER_MANULIFE,
  PAYER_CANADA_LIFE,
  PAYER_GREEN_SHIELD,
  PAYER_DESJARDINS,
  PAYER_BLUE_CROSS_ON
] as const;

export const KNOWN_CONNECTOR_IDS = [
  CONNECTOR_AETNA_API,
  CONNECTOR_SUN_LIFE_BROWSER,
  CONNECTOR_TELUS_ECLAIMS,
  CONNECTOR_PORTAL_FALLBACK,
  CONNECTOR_MANULIFE_BROWSER,
  CONNECTOR_CANADA_LIFE_BROWSER,
  CONNECTOR_GREEN_SHIELD_BROWSER
] as const;

export const telusEclaimsPayloadSchema = z.object({
  connectorId: z.literal("telus-eclaims-api"),
  claimNumber: z.string().nullable(),
  claimStatus: z.string().nullable(),
  paidAmountCents: z.number().int().nullable(),
  processedAt: z.string().nullable(),
  denialReason: z.string().nullable(),
  infoRequired: z.string().nullable(),
  insurerReference: z.string().nullable(),
  rawResponse: z.record(z.string(), z.unknown()).nullable()
});
export type TelusEclaimsPayload = z.infer<typeof telusEclaimsPayloadSchema>;

export const sunLifePayloadSchema = z.object({
  connectorId: z.literal("sun-life-pshcp-browser"),
  claimNumber: z.string().nullable(),
  statusText: z.string().nullable(),
  paidAmountCents: z.number().int().nullable(),
  denialReason: z.string().nullable(),
  rawHtml: z.string().nullable()
});
export type SunLifePayload = z.infer<typeof sunLifePayloadSchema>;

export const manulifePayloadSchema = z.object({
  connectorId: z.literal("manulife-groupbenefits-browser"),
  claimNumber: z.string().nullable(),
  statusText: z.string().nullable(),
  paidAmountCents: z.number().int().nullable(),
  denialReason: z.string().nullable(),
  rawHtml: z.string().nullable()
});
export type ManulifePayload = z.infer<typeof manulifePayloadSchema>;

export const canadaLifePayloadSchema = z.object({
  connectorId: z.literal("canada-life-groupnet-browser"),
  claimNumber: z.string().nullable(),
  statusText: z.string().nullable(),
  paidAmountCents: z.number().int().nullable(),
  denialReason: z.string().nullable(),
  rawHtml: z.string().nullable()
});
export type CanadaLifePayload = z.infer<typeof canadaLifePayloadSchema>;

export const greenShieldPayloadSchema = z.object({
  connectorId: z.literal("green-shield-provider-browser"),
  claimNumber: z.string().nullable(),
  statusText: z.string().nullable(),
  paidAmountCents: z.number().int().nullable(),
  denialReason: z.string().nullable(),
  rawHtml: z.string().nullable()
});
export type GreenShieldPayload = z.infer<typeof greenShieldPayloadSchema>;

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
export type KnownPayerId = (typeof KNOWN_PAYER_IDS)[number];
export type KnownConnectorId = (typeof KNOWN_CONNECTOR_IDS)[number];
export type PayerId = KnownPayerId | (string & {});
export type ConnectorId = KnownConnectorId | (string & {});
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
