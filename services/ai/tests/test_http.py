"""HTTP surface tests for the FastAPI app (auth, headers, JSON contracts)."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import services.ai.app.main as ai_main
from services.ai.app.schemas import AgentStepRequest
from services.ai.tests.test_main import build_agent_context, build_request


class AiServiceHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._token = ai_main.AI_SERVICE_TOKEN
        cls.client = TestClient(ai_main.app)

    def test_health_ok(self) -> None:
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body.get("ok"))
        self.assertEqual(body.get("service"), "ai")
        self.assertIn("planner", body)
        self.assertIn("supported_payers", body)

    def test_analyze_missing_token_401(self) -> None:
        payload = build_request().model_dump(mode="json", by_alias=True)
        res = self.client.post("/v1/analyze-claim-status", json=payload)
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.json().get("detail"), "Unauthorized")

    def test_analyze_bad_token_401(self) -> None:
        payload = build_request().model_dump(mode="json", by_alias=True)
        res = self.client.post(
            "/v1/analyze-claim-status",
            json=payload,
            headers={"x-tenio-ai-token": "not-the-token"},
        )
        self.assertEqual(res.status_code, 401)

    def test_analyze_happy_path_sets_request_id_and_returns_candidate(self) -> None:
        payload = build_request().model_dump(mode="json", by_alias=True)
        custom_rid = "req-from-test-client"
        res = self.client.post(
            "/v1/analyze-claim-status",
            json=payload,
            headers={
                "x-tenio-ai-token": self._token,
                "x-request-id": custom_rid,
            },
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.headers.get("x-request-id"), custom_rid)
        body = res.json()
        self.assertIn("candidate", body)
        self.assertIn("model", body)
        self.assertIn("traceId", body)
        self.assertEqual(body["candidate"]["recommendedAction"], "resolve")

    def test_agent_step_missing_token_401(self) -> None:
        req = AgentStepRequest(context=build_agent_context())
        res = self.client.post(
            "/v1/claim-agent/step",
            json=req.model_dump(mode="json", by_alias=True),
        )
        self.assertEqual(res.status_code, 401)

    def test_agent_step_happy_path_heuristic(self) -> None:
        req = AgentStepRequest(context=build_agent_context())
        with patch.object(ai_main, "AGENT_PROVIDER_MODE", "heuristic"):
            res = self.client.post(
                "/v1/claim-agent/step",
                json=req.model_dump(mode="json", by_alias=True),
                headers={"x-tenio-ai-token": self._token},
            )
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertIn("directive", body)
        self.assertIn("traceId", body)
        self.assertEqual(body["directive"]["type"], "tool_call")

    def test_agent_step_claude_only_unavailable_503(self) -> None:
        req = AgentStepRequest(context=build_agent_context())
        with (
            patch.object(ai_main, "AGENT_PROVIDER_MODE", "claude"),
            patch.object(ai_main, "try_claude_plan_agent_step", return_value=None),
        ):
            res = self.client.post(
                "/v1/claim-agent/step",
                json=req.model_dump(mode="json", by_alias=True),
                headers={"x-tenio-ai-token": self._token},
            )
        self.assertEqual(res.status_code, 503)
        self.assertIn("detail", res.json())

    def test_analyze_invalid_json_body_422(self) -> None:
        res = self.client.post(
            "/v1/analyze-claim-status",
            content="{not-json",
            headers={
                "x-tenio-ai-token": self._token,
                "content-type": "application/json",
            },
        )
        self.assertEqual(res.status_code, 422)


if __name__ == "__main__":
    unittest.main()
