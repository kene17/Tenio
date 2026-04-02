from pydantic import BaseModel, Field


class EvidenceArtifact(BaseModel):
    id: str
    kind: str
    label: str
    url: str
    created_at: str = Field(alias="createdAt")


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
    portal_text: str = Field(alias="portalText")
    screenshot_urls: list[str] = Field(alias="screenshotUrls")
    metadata: dict[str, str] = Field(default_factory=dict)


class AiClaimStatusAnalysisResponse(BaseModel):
    candidate: ExecutionCandidate
    model: str
    trace_id: str = Field(alias="traceId")
