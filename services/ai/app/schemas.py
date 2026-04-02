from typing import Literal

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
