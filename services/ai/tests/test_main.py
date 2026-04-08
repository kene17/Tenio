import json
import unittest
from unittest.mock import patch

import services.ai.app.main as ai_main
from services.ai.app.main import (
    AETNA_MODEL,
    GENERIC_MODEL,
    SUN_LIFE_MODEL,
    analyze_request,
    plan_agent_step,
)
from services.ai.app.schemas import (
    AgentRunContext,
    AiClaimStatusAnalysisRequest,
    OpenAiPlannerDirectiveEnvelope,
    PlannerDirectiveEnvelope,
)


def build_request(**overrides: object) -> AiClaimStatusAnalysisRequest:
    payload = {
        "claimId": "CLM-10001",
        "payerId": "payer_aetna",
        "payerName": "Aetna",
        "portalText": "Aetna claim status API payload",
        "screenshotUrls": ["capture://CLM-10001/aetna-status.svg"],
        "connectorId": "aetna-claim-status-api",
        "connectorName": "Aetna Claim Status API",
        "executionMode": "api",
        "connectorPayloadJson": json.dumps(
            {
                "connectorId": "aetna-claim-status-api",
                "connectorVersion": "2026-04-connector-v1",
                "claimId": "CLM-10001",
                "claimNumber": "10001",
                "patientName": "Jane Example",
                "payerName": "Aetna",
                "externalReferenceNumber": "AET-REF-552918443",
                "statusCode": "PAID_IN_FULL",
                "statusLabel": "Paid in full",
                "billedAmountCents": 227750,
                "allowedAmountCents": 227750,
                "paidAmountCents": 227750,
                "patientResponsibilityCents": 0,
                "adjudicatedAt": "2026-04-02T12:00:00+00:00",
                "lastUpdatedAt": "2026-04-02T12:00:00+00:00",
                "reviewReason": None,
                "denialCode": None,
                "denialDescription": None,
                "followUpHint": "Eligible for downstream export.",
                "dataComplete": True,
            }
        ),
        "metadata": {"requestId": "req-test"},
    }
    payload.update(overrides)
    return AiClaimStatusAnalysisRequest.model_validate(payload)


def build_sun_life_request(**overrides: object) -> AiClaimStatusAnalysisRequest:
    payload = {
        "claimId": "CLM-SUN-10001",
        "payerId": "payer_sun_life",
        "payerName": "Sun Life / PSHCP",
        "jurisdiction": "ca",
        "countryCode": "CA",
        "provinceOfService": "ON",
        "claimType": "dental",
        "portalText": "Sun Life PSHCP browser workflow payload",
        "screenshotUrls": ["capture://CLM-SUN-10001/sun-life-status.svg"],
        "connectorId": "sun-life-pshcp-browser",
        "connectorName": "Sun Life PSHCP Browser Workflow",
        "executionMode": "browser",
        "connectorPayloadJson": json.dumps(
            {
                "connectorId": "sun-life-pshcp-browser",
                "connectorVersion": "2026-04-connector-v1",
                "claimId": "CLM-SUN-10001",
                "claimNumber": "SUN-10001",
                "patientName": "Marie Tremblay",
                "payerName": "Sun Life / PSHCP",
                "planNumber": "55555",
                "memberCertificate": "PSHCP-123456",
                "statusCode": "PAID",
                "statusLabel": "Paid",
                "billedAmountCents": 16400,
                "paidAmountCents": 16400,
                "serviceDate": "2026-04-01",
                "processedAt": "2026-04-02T12:00:00+00:00",
                "federalPlan": True,
                "cobRequired": False,
                "reviewReason": None,
                "followUpHint": "Eligible for downstream confirmation and export.",
                "dataComplete": True,
            }
        ),
        "metadata": {"requestId": "req-sun-life"},
    }
    payload.update(overrides)
    return AiClaimStatusAnalysisRequest.model_validate(payload)


class AnalyzeRequestTests(unittest.TestCase):
    def test_aetna_paid_in_full_resolves(self) -> None:
        candidate, model = analyze_request(
            build_request(),
            "2026-04-02T12:30:00+00:00",
            "trace-paid",
        )

        self.assertEqual(model, AETNA_MODEL)
        self.assertEqual(candidate.normalized_status_text, "Paid in full")
        self.assertEqual(candidate.recommended_action, "resolve")
        self.assertGreater(candidate.confidence, 0.95)

    def test_aetna_incomplete_payload_retries(self) -> None:
        payload = json.loads(build_request().connector_payload_json)
        payload["statusCode"] = "ADDITIONAL_INFO_REQUIRED"
        payload["statusLabel"] = "Awaiting supplemental data"
        payload["dataComplete"] = False
        payload["adjudicatedAt"] = None
        payload["allowedAmountCents"] = None
        payload["paidAmountCents"] = None

        candidate, model = analyze_request(
            build_request(connectorPayloadJson=json.dumps(payload)),
            "2026-04-02T12:30:00+00:00",
            "trace-retry",
        )

        self.assertEqual(model, AETNA_MODEL)
        self.assertEqual(candidate.recommended_action, "retry")
        self.assertEqual(candidate.normalized_status_text, "Awaiting supplemental payer data")
        self.assertLess(candidate.confidence, 0.5)

    def test_generic_text_fallback_reviews_pending_language(self) -> None:
        candidate, model = analyze_request(
            build_request(
                payerId="payer_uhc",
                payerName="UnitedHealthcare",
                connectorId=None,
                connectorName=None,
                executionMode="browser",
                connectorPayloadJson=None,
                portalText="Claim remains pending medical review with no final adjudication.",
            ),
            "2026-04-02T12:30:00+00:00",
            "trace-generic",
        )

        self.assertEqual(model, GENERIC_MODEL)
        self.assertEqual(candidate.recommended_action, "review")
        self.assertEqual(candidate.normalized_status_text, "Pending payer review")

    def test_invalid_aetna_payload_stays_on_trusted_retry_path(self) -> None:
        candidate, model = analyze_request(
            build_request(connectorPayloadJson="{not-json}"),
            "2026-04-02T12:30:00+00:00",
            "trace-invalid",
        )

        self.assertEqual(model, AETNA_MODEL)
        self.assertEqual(candidate.recommended_action, "retry")
        self.assertEqual(candidate.normalized_status_text, "Awaiting connector retry")

    def test_sun_life_paid_resolves(self) -> None:
        candidate, model = analyze_request(
            build_sun_life_request(),
            "2026-04-02T12:30:00+00:00",
            "trace-sun-life-paid",
        )

        self.assertEqual(model, SUN_LIFE_MODEL)
        self.assertEqual(candidate.normalized_status_text, "Paid")
        self.assertEqual(candidate.recommended_action, "resolve")
        self.assertGreater(candidate.confidence, 0.9)

    def test_sun_life_cob_routes_to_review(self) -> None:
        payload = json.loads(build_sun_life_request().connector_payload_json)
        payload["statusCode"] = "COB_REQUIRED"
        payload["statusLabel"] = "Coordination of benefits required"
        payload["paidAmountCents"] = None
        payload["cobRequired"] = True
        payload["reviewReason"] = (
            "Sun Life requires the primary payer explanation of benefits before secondary payment."
        )

        candidate, model = analyze_request(
            build_sun_life_request(connectorPayloadJson=json.dumps(payload)),
            "2026-04-02T12:30:00+00:00",
            "trace-sun-life-cob",
        )

        self.assertEqual(model, SUN_LIFE_MODEL)
        self.assertEqual(candidate.normalized_status_text, "Coordination of benefits required")
        self.assertEqual(candidate.recommended_action, "review")

    def test_sun_life_incomplete_payload_retries(self) -> None:
        payload = json.loads(build_sun_life_request().connector_payload_json)
        payload["statusCode"] = "PORTAL_INCOMPLETE"
        payload["statusLabel"] = "Portal response incomplete"
        payload["processedAt"] = None
        payload["paidAmountCents"] = None
        payload["dataComplete"] = False

        candidate, model = analyze_request(
            build_sun_life_request(connectorPayloadJson=json.dumps(payload)),
            "2026-04-02T12:30:00+00:00",
            "trace-sun-life-retry",
        )

        self.assertEqual(model, SUN_LIFE_MODEL)
        self.assertEqual(candidate.recommended_action, "retry")
        self.assertEqual(candidate.normalized_status_text, "Awaiting Sun Life retry")


def build_agent_context(
    *,
    steps: list[dict] | None = None,
    payer_id: str = "payer_aetna",
    payer_name: str = "Aetna",
    claim_number: str = "10001",
    patient_name: str = "Jane Example",
    jurisdiction: str | None = "us",
    country_code: str | None = "US",
    province_of_service: str | None = None,
    claim_type: str | None = None,
) -> AgentRunContext:
    return AgentRunContext.model_validate(
        {
            "protocolVersion": 1,
            "runId": "run-test",
            "claimId": "CLM-10001",
            "retrievalJobId": "job-10001",
            "payerId": payer_id,
            "payerName": payer_name,
            "claimNumber": claim_number,
            "patientName": patient_name,
            "jurisdiction": jurisdiction,
            "countryCode": country_code,
            "provinceOfService": province_of_service,
            "claimType": claim_type,
            "currentAttempt": 1,
            "maxAttempts": 3,
            "startedAt": "2026-04-02T12:00:00+00:00",
            "elapsedMs": 5_000,
            "leaseExpiresAt": "2026-04-02T12:02:00+00:00",
            "modelCallsUsed": 0,
            "totalTokensUsed": 0,
            "connectorSwitchCount": 0,
            "budget": {
                "maxToolSteps": 5,
                "maxModelCalls": 6,
                "maxWallTimeMs": 90_000,
                "maxTotalTokens": 25_000,
                "maxConnectorSwitches": 1,
            },
            "availableTools": ["execute_connector"],
            "steps": steps or [],
        }
    )


def build_completed_step(
    *,
    step_number: int = 1,
    connector_id: str = "aetna-claim-status-api",
    mode: str = "api",
    success: bool = True,
    failure_category: str | None = None,
    retryable: bool = False,
    summary: str = "Structured connector observation",
    portal_text: str = "Aetna claim status API payload",
    connector_payload_json: str | None = None,
) -> dict:
    return {
        "stepNumber": step_number,
        "directiveKind": "tool_call",
        "toolName": "execute_connector",
        "status": "completed",
        "idempotencyKey": f"step-{step_number}",
        "publicReason": "Planner requested a connector run.",
        "toolArgs": {
            "connectorId": connector_id,
            "mode": mode,
            "attemptLabel": f"step-{step_number}",
        },
        "plannerUsage": {
            "provider": "tenio-heuristic",
            "model": "heuristic-claim-agent-v1",
            "inputTokens": 0,
            "outputTokens": 0,
        },
        "result": {
                "observation": {
                "observationVersion": 1,
                "connectorId": connector_id,
                "connectorName": (
                    "Aetna Claim Status API"
                    if connector_id == "aetna-claim-status-api"
                    else "Sun Life PSHCP Browser Workflow"
                    if connector_id == "sun-life-pshcp-browser"
                    else "Portal Browser Fallback"
                ),
                "connectorVersion": "2026-04-connector-v1"
                if connector_id == "aetna-claim-status-api"
                else None,
                "executionMode": mode,
                "observedAt": "2026-04-02T12:01:00+00:00",
                "durationMs": 180,
                "success": success,
                "retryable": retryable,
                "failureCategory": failure_category,
                "summary": summary,
                "portalTextSnippet": portal_text,
                "screenshotUrls": ["capture://CLM-10001/status.svg"],
                "evidenceArtifactIds": ["artifact_status"],
                "evidenceArtifacts": [
                    {
                        "id": "artifact_status",
                        "kind": "screenshot",
                        "label": "Status snapshot",
                        "url": "capture://CLM-10001/status.svg",
                        "createdAt": "2026-04-02T12:01:00+00:00",
                    }
                ],
                "connectorPayloadJson": connector_payload_json,
            },
            "summary": summary,
            "evidenceArtifactIds": ["artifact_status"],
            "retryable": retryable,
            "failureCategory": failure_category,
        },
        "startedAt": "2026-04-02T12:01:00+00:00",
        "completedAt": "2026-04-02T12:01:01+00:00",
    }


class PlannerTests(unittest.TestCase):
    def test_planner_starts_aetna_on_api_connector(self) -> None:
        with patch.object(ai_main, "AGENT_PROVIDER_MODE", "heuristic"):
            directive = plan_agent_step(build_agent_context(), "trace-agent-start")

        self.assertEqual(directive.type, "tool_call")
        self.assertEqual(directive.tool_call.args.connector_id, "aetna-claim-status-api")
        self.assertEqual(directive.tool_call.args.mode, "api")

    def test_planner_starts_sun_life_on_structured_browser_connector(self) -> None:
        with patch.object(ai_main, "AGENT_PROVIDER_MODE", "heuristic"):
            directive = plan_agent_step(
                build_agent_context(
                    payer_id="payer_sun_life",
                    payer_name="Sun Life / PSHCP",
                    claim_number="SUN-10001",
                    patient_name="Marie Tremblay",
                    jurisdiction="ca",
                    country_code="CA",
                    province_of_service="ON",
                    claim_type="dental",
                ),
                "trace-sun-life-start",
            )

        self.assertEqual(directive.type, "tool_call")
        self.assertEqual(directive.tool_call.args.connector_id, "sun-life-pshcp-browser")
        self.assertEqual(directive.tool_call.args.mode, "browser")

    def test_planner_switches_incomplete_aetna_api_to_browser_fallback(self) -> None:
        payload = json.loads(build_request().connector_payload_json)
        payload["statusCode"] = "ADDITIONAL_INFO_REQUIRED"
        payload["statusLabel"] = "Awaiting supplemental data"
        payload["dataComplete"] = False
        payload["adjudicatedAt"] = None
        payload["allowedAmountCents"] = None
        payload["paidAmountCents"] = None

        with patch.object(ai_main, "AGENT_PROVIDER_MODE", "heuristic"):
            directive = plan_agent_step(
                build_agent_context(
                    steps=[
                        build_completed_step(
                            connector_payload_json=json.dumps(payload),
                        )
                    ]
                ),
                "trace-incomplete-fallback",
            )

        self.assertEqual(directive.type, "tool_call")
        self.assertEqual(directive.tool_call.args.connector_id, "portal-browser-fallback")
        self.assertEqual(directive.tool_call.args.mode, "browser")

    def test_planner_rate_limit_schedules_retry_without_browser_fallback(self) -> None:
        with patch.object(ai_main, "AGENT_PROVIDER_MODE", "heuristic"):
            directive = plan_agent_step(
                build_agent_context(
                    steps=[
                        build_completed_step(
                            success=False,
                            retryable=True,
                            failure_category="rate_limited",
                            summary="Aetna connector was rate limited.",
                            connector_payload_json=None,
                        )
                    ]
                ),
                "trace-rate-limited",
            )

        self.assertEqual(directive.type, "retry")
        self.assertEqual(directive.retry_after_seconds, 300)
        self.assertEqual(directive.completion_reason, "retry_scheduled")

    def test_planner_auth_failure_routes_into_review(self) -> None:
        with patch.object(ai_main, "AGENT_PROVIDER_MODE", "heuristic"):
            directive = plan_agent_step(
                build_agent_context(
                    steps=[
                        build_completed_step(
                            success=False,
                            retryable=False,
                            failure_category="authentication",
                            summary="Aetna connector authentication failed.",
                            connector_payload_json=None,
                        )
                    ]
                ),
                "trace-auth-review",
            )

        self.assertEqual(directive.type, "final")
        self.assertEqual(directive.completion_reason, "fallback_policy_review")
        self.assertEqual(directive.candidate.recommended_action, "review")

    def test_openai_planner_directive_is_used_in_auto_mode(self) -> None:
        class FakeResponse:
            def __init__(self) -> None:
                self.output_parsed = OpenAiPlannerDirectiveEnvelope.model_validate(
                    {
                        "directive": {
                            "type": "tool_call",
                            "publicReason": "Switch to browser fallback based on planner output.",
                            "toolCall": {
                                "toolName": "execute_connector",
                                "args": {
                                    "connectorId": "portal-browser-fallback",
                                    "mode": "browser",
                                    "attemptLabel": "openai-browser-fallback",
                                },
                            },
                        }
                    }
                )
                self.usage = type(
                    "Usage",
                    (),
                    {"input_tokens": 321, "output_tokens": 45},
                )()

        class FakeResponses:
            def __init__(self) -> None:
                self.calls: list[dict] = []

            def parse(self, **kwargs: object) -> FakeResponse:
                self.calls.append(kwargs)
                return FakeResponse()

        class FakeClient:
            def __init__(self) -> None:
                self.responses = FakeResponses()

        fake_client = FakeClient()

        with (
            patch.object(ai_main, "AGENT_PROVIDER_MODE", "auto"),
            patch.object(ai_main, "get_openai_client", return_value=fake_client),
        ):
            directive = ai_main.plan_agent_step(build_agent_context(), "trace-openai")

        self.assertEqual(directive.type, "tool_call")
        self.assertEqual(directive.tool_call.args.connector_id, "portal-browser-fallback")
        self.assertEqual(directive.tool_call.args.mode, "browser")
        self.assertEqual(directive.planner_usage.provider, "openai")
        self.assertEqual(directive.planner_usage.model, ai_main.OPENAI_AGENT_MODEL)
        self.assertEqual(directive.planner_usage.input_tokens, 321)
        self.assertEqual(directive.planner_usage.output_tokens, 45)
        self.assertEqual(fake_client.responses.calls[0]["model"], ai_main.OPENAI_AGENT_MODEL)

    def test_openai_auto_mode_falls_back_to_heuristic_when_unavailable(self) -> None:
        with (
            patch.object(ai_main, "AGENT_PROVIDER_MODE", "auto"),
            patch.object(ai_main, "try_openai_plan_agent_step", return_value=None),
        ):
            directive = ai_main.plan_agent_step(build_agent_context(), "trace-openai-fallback")

        self.assertEqual(directive.type, "tool_call")
        self.assertEqual(directive.tool_call.args.connector_id, "aetna-claim-status-api")
        self.assertEqual(directive.tool_call.args.mode, "api")
        self.assertEqual(directive.planner_usage.provider, "tenio-heuristic")

    def test_openai_only_mode_raises_when_planner_is_unavailable(self) -> None:
        with (
            patch.object(ai_main, "AGENT_PROVIDER_MODE", "openai"),
            patch.object(ai_main, "try_openai_plan_agent_step", return_value=None),
        ):
            with self.assertRaisesRegex(RuntimeError, "OpenAI planner is unavailable"):
                ai_main.plan_agent_step(build_agent_context(), "trace-openai-required")


if __name__ == "__main__":
    unittest.main()
