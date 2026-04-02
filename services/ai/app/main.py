import os
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import ValidationError

from .schemas import (
    AetnaClaimStatusApiPayload,
    AiClaimStatusAnalysisRequest,
    AiClaimStatusAnalysisResponse,
    EvidenceArtifact,
    ExecutionCandidate,
)

app = FastAPI(
    title="Tenio AI Service",
    version="0.1.0",
    description="Python service for claim status analysis and confidence scoring.",
)

AI_SERVICE_TOKEN = os.getenv("TENIO_AI_SERVICE_TOKEN", "tenio-local-ai-service-token")
AETNA_MODEL = "connector-aware-aetna-v1"
GENERIC_MODEL = "generic-portal-interpretation-v1"


def build_supporting_evidence(
    payload: AiClaimStatusAnalysisRequest, now: str
) -> list[EvidenceArtifact]:
    if payload.screenshot_urls:
        return [
            EvidenceArtifact(
                id=f"artifact_{payload.claim_id}_analysis_context",
                kind="screenshot",
                label=f"{payload.payer_name} connector evidence",
                url=payload.screenshot_urls[0],
                createdAt=now,
            )
        ]

    return [
        EvidenceArtifact(
            id=f"artifact_{payload.claim_id}_analysis_note",
            kind="note",
            label=f"{payload.payer_name} analysis context",
            url=f"capture://{payload.claim_id}/ai-analysis.txt",
            createdAt=now,
        )
    ]


def build_execution(
    payload: AiClaimStatusAnalysisRequest, now: str, recommended_action: str
) -> dict[str, object]:
    return {
        "connectorId": payload.connector_id or "generic-portal-interpretation",
        "connectorName": payload.connector_name or "Generic Portal Interpretation",
        "executionMode": payload.execution_mode or "browser",
        "observedAt": now,
        "durationMs": 180 if payload.connector_id == "aetna-claim-status-api" else 250,
        "attempt": 1,
        "maxAttempts": 1,
        "outcome": (
            "retry_scheduled"
            if recommended_action == "retry"
            else "review_required"
            if recommended_action == "review"
            else "succeeded"
        ),
        "retryable": recommended_action == "retry",
        "failureCategory": None,
    }


def build_candidate(
    payload: AiClaimStatusAnalysisRequest,
    now: str,
    trace_id: str,
    *,
    normalized_status_text: str,
    confidence: float,
    recommended_action: str,
    raw_notes: str,
    rationale: str,
    route_reason: str,
) -> ExecutionCandidate:
    return ExecutionCandidate(
        claimId=payload.claim_id,
        normalizedStatusText=normalized_status_text,
        confidence=confidence,
        evidence=build_supporting_evidence(payload, now),
        recommendedAction=recommended_action,
        rawNotes=raw_notes,
        rationale=rationale,
        routeReason=route_reason,
        agentTraceId=trace_id,
        execution=build_execution(payload, now, recommended_action),
    )


def parse_aetna_payload(payload: AiClaimStatusAnalysisRequest) -> AetnaClaimStatusApiPayload | None:
    if payload.connector_id != "aetna-claim-status-api" or not payload.connector_payload_json:
        return None

    try:
        return AetnaClaimStatusApiPayload.model_validate_json(payload.connector_payload_json)
    except (ValidationError, ValueError):
        return None


def analyze_aetna_payload(
    payload: AiClaimStatusAnalysisRequest,
    connector_payload: AetnaClaimStatusApiPayload,
    now: str,
    trace_id: str,
) -> ExecutionCandidate:
    raw_notes = (
        f"Aetna structured connector returned {connector_payload.status_label} "
        f"for claim {connector_payload.claim_number} using reference "
        f"{connector_payload.external_reference_number}."
    )

    if (
        connector_payload.status_code == "ADDITIONAL_INFO_REQUIRED"
        or not connector_payload.data_complete
    ):
        return build_candidate(
            payload,
            now,
            trace_id,
            normalized_status_text="Awaiting supplemental payer data",
            confidence=0.42,
            recommended_action="retry",
            raw_notes=raw_notes,
            rationale=(
                "The Aetna connector reported that the claim record is incomplete and "
                "does not yet contain a final adjudication."
            ),
            route_reason=(
                "Structured connector output was incomplete, so Tenio should schedule "
                "another retrieval attempt instead of trusting a final status."
            ),
        )

    if connector_payload.status_code == "PENDING_MEDICAL_REVIEW":
        return build_candidate(
            payload,
            now,
            trace_id,
            normalized_status_text="Pending medical review",
            confidence=0.83,
            recommended_action="review",
            raw_notes=raw_notes,
            rationale=(
                "Aetna explicitly returned a pending medical review state with no final "
                "adjudication fields populated."
            ),
            route_reason=(
                "Structured review language from the payer requires governed operator review."
            ),
        )

    if connector_payload.status_code == "DENIED":
        denial_detail = connector_payload.denial_description or "No denial description returned."
        return build_candidate(
            payload,
            now,
            trace_id,
            normalized_status_text="Denied",
            confidence=0.67,
            recommended_action="review",
            raw_notes=f"{raw_notes} Denial detail: {denial_detail}",
            rationale=(
                "Aetna returned a denial code and adjudicated zero payment, which should "
                "be reviewed before Tenio resolves or exports the outcome."
            ),
            route_reason=(
                "Denied claims remain in governed review so operators can verify denial handling."
            ),
        )

    paid_in_full = (
        connector_payload.status_code == "PAID_IN_FULL"
        and connector_payload.adjudicated_at is not None
        and connector_payload.allowed_amount_cents is not None
        and connector_payload.paid_amount_cents is not None
        and connector_payload.allowed_amount_cents == connector_payload.paid_amount_cents
    )

    if paid_in_full:
        return build_candidate(
            payload,
            now,
            trace_id,
            normalized_status_text="Paid in full",
            confidence=0.97,
            recommended_action="resolve",
            raw_notes=raw_notes,
            rationale=(
                "The structured Aetna payload shows a complete adjudication with matching "
                "allowed and paid amounts."
            ),
            route_reason=(
                "Structured paid-in-full data is strong enough for workflow policy evaluation."
            ),
        )

    return build_candidate(
        payload,
        now,
        trace_id,
        normalized_status_text=connector_payload.status_label,
        confidence=0.58,
        recommended_action="review",
        raw_notes=raw_notes,
        rationale=(
            "The structured connector returned an unexpected but valid status that should be "
            "reviewed conservatively."
        ),
        route_reason="Unhandled structured status defaulted into governed review.",
    )


def analyze_invalid_aetna_payload(
    payload: AiClaimStatusAnalysisRequest, now: str, trace_id: str
) -> ExecutionCandidate:
    return build_candidate(
        payload,
        now,
        trace_id,
        normalized_status_text="Awaiting connector retry",
        confidence=0.28,
        recommended_action="retry",
        raw_notes=(
            "The Aetna connector context was missing or malformed, so the AI layer refused "
            "to treat the payload as a trusted final status."
        ),
        rationale=(
            "Structured connector validation failed, which is safer to retry than to "
            "downgrade into a text-only interpretation."
        ),
        route_reason=(
            "Tenio should re-run the trusted connector path because the structured payload "
            "was not usable."
        ),
    )


def analyze_generic_payload(
    payload: AiClaimStatusAnalysisRequest, now: str, trace_id: str
) -> ExecutionCandidate:
    portal_text = payload.portal_text.lower()

    if any(signal in portal_text for signal in ["additional info", "supplemental", "retry"]):
        return build_candidate(
            payload,
            now,
            trace_id,
            normalized_status_text="Awaiting payer data",
            confidence=0.49,
            recommended_action="retry",
            raw_notes=(
                "Generic interpretation saw incomplete payer language and returned a retry "
                "recommendation."
            ),
            rationale=(
                "Portal text indicates the payer record is incomplete, so the workflow layer "
                "should schedule another attempt."
            ),
            route_reason="Generic text fallback could not support a final result yet.",
        )

    if "denied" in portal_text:
        return build_candidate(
            payload,
            now,
            trace_id,
            normalized_status_text="Denied",
            confidence=0.66,
            recommended_action="review",
            raw_notes="Generic interpretation detected denial-oriented payer language.",
            rationale="Denied outcomes remain reviewable when only text-based context is available.",
            route_reason="Text-only denial language requires governed review.",
        )

    if any(signal in portal_text for signal in ["pending", "review", "in process"]):
        return build_candidate(
            payload,
            now,
            trace_id,
            normalized_status_text="Pending payer review",
            confidence=0.72,
            recommended_action="review",
            raw_notes="Generic interpretation detected pending or review-oriented language.",
            rationale="Portal text contains uncertainty or review language.",
            route_reason="Low-certainty payer language requires governed human review.",
        )

    return build_candidate(
        payload,
        now,
        trace_id,
        normalized_status_text="Processed",
        confidence=0.9,
        recommended_action="resolve",
        raw_notes=(
            "Generic interpretation found no conflicting signal in the portal text and "
            "returned a conservative resolve recommendation."
        ),
        rationale="Portal text indicates a processed outcome with no conflicting signal.",
        route_reason="Signal is strong enough for workflow policy to consider resolution.",
    )


def analyze_request(
    payload: AiClaimStatusAnalysisRequest, now: str, trace_id: str
) -> tuple[ExecutionCandidate, str]:
    if payload.connector_id == "aetna-claim-status-api":
        connector_payload = parse_aetna_payload(payload)
        if connector_payload is None:
            return analyze_invalid_aetna_payload(payload, now, trace_id), AETNA_MODEL
        return analyze_aetna_payload(payload, connector_payload, now, trace_id), AETNA_MODEL

    return analyze_generic_payload(payload, now, trace_id), GENERIC_MODEL


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "service": "ai",
        "owns": ["model-inference", "confidence-scoring", "evidence-summarization"],
        "does_not_own": ["workflow-state", "routing", "queue-state"],
    }


@app.post("/v1/analyze-claim-status", response_model=AiClaimStatusAnalysisResponse)
def analyze_claim_status(
    payload: AiClaimStatusAnalysisRequest,
    response: Response,
    x_tenio_ai_token: str | None = Header(default=None),
    x_request_id: str | None = Header(default=None),
) -> AiClaimStatusAnalysisResponse:
    if x_tenio_ai_token != AI_SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

    now = datetime.now(timezone.utc).isoformat()
    trace_id = str(uuid4())
    response.headers["x-request-id"] = x_request_id or trace_id
    candidate, model = analyze_request(payload, now, trace_id)

    return AiClaimStatusAnalysisResponse(
        candidate=candidate,
        model=model,
        traceId=trace_id,
    )
