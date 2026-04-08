from typing import Annotated, Literal

from pydantic import BaseModel, Field


class EvidenceArtifact(BaseModel):
    id: str
    kind: str
    label: str
    url: str
    created_at: str = Field(alias="createdAt")
    mime_type: str | None = Field(default=None, alias="mimeType")
    storage_kind: str | None = Field(default=None, alias="storageKind")
    storage_key: str | None = Field(default=None, alias="storageKey")
    inline_content_base64: str | None = Field(default=None, alias="inlineContentBase64")
    storage_backend: str | None = Field(default=None, alias="storageBackend")
    checksum_sha256: str | None = Field(default=None, alias="checksumSha256")
    size_bytes: int | None = Field(default=None, alias="sizeBytes")
    retention_until: str | None = Field(default=None, alias="retentionUntil")


class AgentExecution(BaseModel):
    connector_id: str = Field(alias="connectorId")
    connector_name: str = Field(alias="connectorName")
    execution_mode: str = Field(alias="executionMode")
    observed_at: str = Field(alias="observedAt")
    duration_ms: int = Field(alias="durationMs")
    attempt: int
    max_attempts: int = Field(alias="maxAttempts")
    outcome: str
    retryable: bool
    failure_category: str | None = Field(default=None, alias="failureCategory")


class ExecutionCandidate(BaseModel):
    claim_id: str = Field(alias="claimId")
    normalized_status_text: str = Field(alias="normalizedStatusText")
    confidence: float
    evidence: list[EvidenceArtifact]
    recommended_action: str = Field(alias="recommendedAction")
    raw_notes: str | None = Field(alias="rawNotes")
    rationale: str
    route_reason: str = Field(alias="routeReason")
    agent_trace_id: str | None = Field(default=None, alias="agentTraceId")
    execution: AgentExecution


class AiClaimStatusAnalysisRequest(BaseModel):
    claim_id: str = Field(alias="claimId")
    payer_id: str = Field(alias="payerId")
    payer_name: str = Field(alias="payerName")
    jurisdiction: Literal["us", "ca"] | None = None
    country_code: Literal["US", "CA"] | None = Field(default=None, alias="countryCode")
    province_of_service: str | None = Field(default=None, alias="provinceOfService")
    claim_type: str | None = Field(default=None, alias="claimType")
    portal_text: str = Field(alias="portalText")
    screenshot_urls: list[str] = Field(alias="screenshotUrls")
    connector_id: str | None = Field(default=None, alias="connectorId")
    connector_name: str | None = Field(default=None, alias="connectorName")
    execution_mode: str | None = Field(default=None, alias="executionMode")
    connector_payload_json: str | None = Field(default=None, alias="connectorPayloadJson")
    metadata: dict[str, str] = Field(default_factory=dict)


class AiClaimStatusAnalysisResponse(BaseModel):
    candidate: ExecutionCandidate
    model: str
    trace_id: str = Field(alias="traceId")


class AetnaClaimStatusApiPayload(BaseModel):
    connector_id: Literal["aetna-claim-status-api"] = Field(alias="connectorId")
    connector_version: str = Field(alias="connectorVersion")
    claim_id: str = Field(alias="claimId")
    claim_number: str = Field(alias="claimNumber")
    patient_name: str = Field(alias="patientName")
    payer_name: str = Field(alias="payerName")
    external_reference_number: str = Field(alias="externalReferenceNumber")
    status_code: Literal[
        "PAID_IN_FULL",
        "PENDING_MEDICAL_REVIEW",
        "DENIED",
        "ADDITIONAL_INFO_REQUIRED",
    ] = Field(alias="statusCode")
    status_label: str = Field(alias="statusLabel")
    billed_amount_cents: int = Field(alias="billedAmountCents")
    allowed_amount_cents: int | None = Field(default=None, alias="allowedAmountCents")
    paid_amount_cents: int | None = Field(default=None, alias="paidAmountCents")
    patient_responsibility_cents: int | None = Field(
        default=None, alias="patientResponsibilityCents"
    )
    adjudicated_at: str | None = Field(default=None, alias="adjudicatedAt")
    last_updated_at: str = Field(alias="lastUpdatedAt")
    review_reason: str | None = Field(default=None, alias="reviewReason")
    denial_code: str | None = Field(default=None, alias="denialCode")
    denial_description: str | None = Field(default=None, alias="denialDescription")
    follow_up_hint: str | None = Field(default=None, alias="followUpHint")
    data_complete: bool = Field(alias="dataComplete")


class SunLifePshcpBrowserPayload(BaseModel):
    connector_id: Literal["sun-life-pshcp-browser"] = Field(alias="connectorId")
    connector_version: str = Field(alias="connectorVersion")
    claim_id: str = Field(alias="claimId")
    claim_number: str = Field(alias="claimNumber")
    patient_name: str = Field(alias="patientName")
    payer_name: str = Field(alias="payerName")
    plan_number: str = Field(alias="planNumber")
    member_certificate: str = Field(alias="memberCertificate")
    status_code: Literal[
        "PAID",
        "PENDING_ADJUDICATION",
        "COB_REQUIRED",
        "NOT_COVERED_PSHCP",
        "PORTAL_INCOMPLETE",
    ] = Field(alias="statusCode")
    status_label: str = Field(alias="statusLabel")
    billed_amount_cents: int = Field(alias="billedAmountCents")
    paid_amount_cents: int | None = Field(default=None, alias="paidAmountCents")
    service_date: str = Field(alias="serviceDate")
    processed_at: str | None = Field(default=None, alias="processedAt")
    federal_plan: bool = Field(alias="federalPlan")
    cob_required: bool = Field(alias="cobRequired")
    review_reason: str | None = Field(default=None, alias="reviewReason")
    follow_up_hint: str | None = Field(default=None, alias="followUpHint")
    data_complete: bool = Field(alias="dataComplete")


class AgentPlannerUsage(BaseModel):
    provider: str
    model: str
    input_tokens: int = Field(alias="inputTokens")
    output_tokens: int = Field(alias="outputTokens")


class AgentObservation(BaseModel):
    observation_version: Literal[1] = Field(alias="observationVersion")
    connector_id: str = Field(alias="connectorId")
    connector_name: str = Field(alias="connectorName")
    connector_version: str | None = Field(default=None, alias="connectorVersion")
    execution_mode: Literal["browser", "api"] = Field(alias="executionMode")
    observed_at: str = Field(alias="observedAt")
    duration_ms: int = Field(alias="durationMs")
    success: bool
    retryable: bool
    failure_category: str | None = Field(default=None, alias="failureCategory")
    summary: str
    portal_text_snippet: str | None = Field(default=None, alias="portalTextSnippet")
    screenshot_urls: list[str] = Field(default_factory=list, alias="screenshotUrls")
    evidence_artifact_ids: list[str] = Field(default_factory=list, alias="evidenceArtifactIds")
    evidence_artifacts: list[EvidenceArtifact] = Field(
        default_factory=list, alias="evidenceArtifacts"
    )
    connector_payload_json: str | None = Field(default=None, alias="connectorPayloadJson")


class AgentStepResult(BaseModel):
    observation: AgentObservation | None = None
    summary: str
    evidence_artifact_ids: list[str] = Field(default_factory=list, alias="evidenceArtifactIds")
    retryable: bool | None = None
    failure_category: str | None = Field(default=None, alias="failureCategory")
    final_candidate: ExecutionCandidate | None = Field(default=None, alias="finalCandidate")
    retry_after_seconds: int | None = Field(default=None, alias="retryAfterSeconds")
    terminal_reason: str | None = Field(default=None, alias="terminalReason")


class ExecuteConnectorArgs(BaseModel):
    connector_id: str = Field(alias="connectorId")
    mode: Literal["browser", "api"]
    attempt_label: str = Field(alias="attemptLabel")


class AgentStepHistoryItem(BaseModel):
    step_number: int = Field(alias="stepNumber")
    directive_kind: Literal["tool_call", "final", "retry"] = Field(alias="directiveKind")
    tool_name: Literal["execute_connector"] | None = Field(default=None, alias="toolName")
    status: Literal["started", "completed"]
    idempotency_key: str = Field(alias="idempotencyKey")
    public_reason: str = Field(alias="publicReason")
    tool_args: ExecuteConnectorArgs | None = Field(default=None, alias="toolArgs")
    planner_usage: AgentPlannerUsage | None = Field(default=None, alias="plannerUsage")
    result: AgentStepResult | None = None
    started_at: str = Field(alias="startedAt")
    completed_at: str | None = Field(default=None, alias="completedAt")


class AgentRunBudget(BaseModel):
    max_tool_steps: int = Field(alias="maxToolSteps")
    max_model_calls: int = Field(alias="maxModelCalls")
    max_wall_time_ms: int = Field(alias="maxWallTimeMs")
    max_total_tokens: int = Field(alias="maxTotalTokens")
    max_connector_switches: int = Field(alias="maxConnectorSwitches")


class AgentRunContext(BaseModel):
    protocol_version: Literal[1] = Field(alias="protocolVersion")
    run_id: str = Field(alias="runId")
    claim_id: str = Field(alias="claimId")
    retrieval_job_id: str = Field(alias="retrievalJobId")
    payer_id: str = Field(alias="payerId")
    payer_name: str = Field(alias="payerName")
    claim_number: str = Field(alias="claimNumber")
    patient_name: str = Field(alias="patientName")
    jurisdiction: Literal["us", "ca"] | None = None
    country_code: Literal["US", "CA"] | None = Field(default=None, alias="countryCode")
    province_of_service: str | None = Field(default=None, alias="provinceOfService")
    claim_type: str | None = Field(default=None, alias="claimType")
    current_attempt: int = Field(alias="currentAttempt")
    max_attempts: int = Field(alias="maxAttempts")
    started_at: str = Field(alias="startedAt")
    elapsed_ms: int = Field(alias="elapsedMs")
    lease_expires_at: str | None = Field(default=None, alias="leaseExpiresAt")
    model_calls_used: int = Field(alias="modelCallsUsed")
    total_tokens_used: int = Field(alias="totalTokensUsed")
    connector_switch_count: int = Field(alias="connectorSwitchCount")
    budget: AgentRunBudget
    available_tools: list[Literal["execute_connector"]] = Field(alias="availableTools")
    steps: list[AgentStepHistoryItem]


class AgentToolCall(BaseModel):
    tool_name: Literal["execute_connector"] = Field(alias="toolName")
    args: ExecuteConnectorArgs


class AgentDirectiveToolCall(BaseModel):
    type: Literal["tool_call"]
    public_reason: str = Field(alias="publicReason")
    planner_usage: AgentPlannerUsage = Field(alias="plannerUsage")
    tool_call: AgentToolCall = Field(alias="toolCall")


class AgentDirectiveFinal(BaseModel):
    type: Literal["final"]
    public_reason: str = Field(alias="publicReason")
    planner_usage: AgentPlannerUsage = Field(alias="plannerUsage")
    completion_reason: Literal[
        "resolved_candidate",
        "review_required",
        "retry_scheduled",
        "budget_exhausted_incomplete",
        "budget_exhausted_conflict",
        "provider_unavailable_retry",
        "provider_unavailable_review",
        "fallback_policy_review",
    ] = Field(alias="completionReason")
    candidate: ExecutionCandidate


class AgentDirectiveRetry(BaseModel):
    type: Literal["retry"]
    public_reason: str = Field(alias="publicReason")
    planner_usage: AgentPlannerUsage = Field(alias="plannerUsage")
    completion_reason: Literal[
        "resolved_candidate",
        "review_required",
        "retry_scheduled",
        "budget_exhausted_incomplete",
        "budget_exhausted_conflict",
        "provider_unavailable_retry",
        "provider_unavailable_review",
        "fallback_policy_review",
    ] = Field(alias="completionReason")
    retry_after_seconds: int = Field(alias="retryAfterSeconds")


AgentDirective = Annotated[
    AgentDirectiveToolCall | AgentDirectiveFinal | AgentDirectiveRetry,
    Field(discriminator="type"),
]


class PlannerDirectiveToolCall(BaseModel):
    type: Literal["tool_call"]
    public_reason: str = Field(alias="publicReason")
    tool_call: AgentToolCall = Field(alias="toolCall")


class PlannerDirectiveFinal(BaseModel):
    type: Literal["final"]
    public_reason: str = Field(alias="publicReason")
    completion_reason: Literal[
        "resolved_candidate",
        "review_required",
        "retry_scheduled",
        "budget_exhausted_incomplete",
        "budget_exhausted_conflict",
        "provider_unavailable_retry",
        "provider_unavailable_review",
        "fallback_policy_review",
    ] = Field(alias="completionReason")
    candidate: ExecutionCandidate


class PlannerDirectiveRetry(BaseModel):
    type: Literal["retry"]
    public_reason: str = Field(alias="publicReason")
    completion_reason: Literal[
        "resolved_candidate",
        "review_required",
        "retry_scheduled",
        "budget_exhausted_incomplete",
        "budget_exhausted_conflict",
        "provider_unavailable_retry",
        "provider_unavailable_review",
        "fallback_policy_review",
    ] = Field(alias="completionReason")
    retry_after_seconds: int = Field(alias="retryAfterSeconds")


PlannerDirective = Annotated[
    PlannerDirectiveToolCall | PlannerDirectiveFinal | PlannerDirectiveRetry,
    Field(discriminator="type"),
]


class PlannerDirectiveEnvelope(BaseModel):
    directive: PlannerDirective


class OpenAiPlannerDirective(BaseModel):
    type: Literal["tool_call", "final", "retry"]
    public_reason: str = Field(alias="publicReason")
    tool_call: AgentToolCall | None = Field(default=None, alias="toolCall")
    completion_reason: Literal[
        "resolved_candidate",
        "review_required",
        "retry_scheduled",
        "budget_exhausted_incomplete",
        "budget_exhausted_conflict",
        "provider_unavailable_retry",
        "provider_unavailable_review",
        "fallback_policy_review",
    ] | None = Field(default=None, alias="completionReason")
    candidate: ExecutionCandidate | None = None
    retry_after_seconds: int | None = Field(default=None, alias="retryAfterSeconds")


class OpenAiPlannerDirectiveEnvelope(BaseModel):
    directive: OpenAiPlannerDirective


class AgentStepRequest(BaseModel):
    context: AgentRunContext


class AgentStepResponse(BaseModel):
    directive: AgentDirective
    trace_id: str = Field(alias="traceId")
