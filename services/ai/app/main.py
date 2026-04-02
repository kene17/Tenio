from datetime import datetime, timezone
from uuid import uuid4

import os

from fastapi import FastAPI, Header, HTTPException

from .schemas import (
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
    x_tenio_ai_token: str | None = Header(default=None),
) -> AiClaimStatusAnalysisResponse:
    if x_tenio_ai_token != AI_SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

    needs_review = "pending" in payload.portal_text.lower() or "review" in payload.portal_text.lower()
    now = datetime.now(timezone.utc).isoformat()

    trace_id = str(uuid4())

    candidate = ExecutionCandidate(
        claimId=payload.claim_id,
        normalizedStatusText="Pending payer review" if needs_review else "Processed",
        confidence=0.72 if needs_review else 0.94,
        evidence=[
            EvidenceArtifact(
                id=f"artifact_{payload.claim_id}",
                kind="screenshot",
                label=f"{payload.payer_name} evidence bundle",
                url=payload.screenshot_urls[0] if payload.screenshot_urls else "s3://tenio-demo/placeholder.png",
                createdAt=now,
            )
        ],
        recommendedAction="review" if needs_review else "resolve",
        rawNotes=(
            "Python AI service classified the portal snapshot and returned a candidate result. "
            "The workflow API remains responsible for official state transitions."
        ),
        rationale=(
            "Portal text contains pending or review-oriented language."
            if needs_review
            else "Portal text indicates a clean processed outcome with no conflicting signal."
        ),
        routeReason=(
            "Low-certainty payer language requires governed human review."
            if needs_review
            else "Signal is strong enough for workflow policy to consider resolution."
        ),
        agentTraceId=trace_id,
        execution={
            "connectorId": "ai-analysis",
            "connectorName": "AI Interpretation Service",
            "executionMode": "api",
            "observedAt": now,
            "durationMs": 250,
            "attempt": 1,
            "maxAttempts": 1,
            "outcome": "review_required" if needs_review else "succeeded",
            "retryable": False,
            "failureCategory": None,
        },
    )

    return AiClaimStatusAnalysisResponse(
        candidate=candidate,
        model="rule-backed-demo-model",
        traceId=trace_id,
    )
