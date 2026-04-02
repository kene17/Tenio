import json
import unittest

from services.ai.app.main import AETNA_MODEL, GENERIC_MODEL, analyze_request
from services.ai.app.schemas import AiClaimStatusAnalysisRequest


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


if __name__ == "__main__":
    unittest.main()
