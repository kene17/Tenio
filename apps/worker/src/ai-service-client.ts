import {
  aiClaimStatusAnalysisResponseSchema,
  type AiClaimStatusAnalysisRequest,
  type AiClaimStatusAnalysisResponse
} from "@tenio/contracts";

export class AiServiceClient {
  constructor(private readonly baseUrl = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000") {}

  async analyzeClaimStatus(
    payload: AiClaimStatusAnalysisRequest
  ): Promise<AiClaimStatusAnalysisResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analyze-claim-status`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenio-ai-token":
            process.env.TENIO_AI_SERVICE_TOKEN ?? "tenio-local-ai-service-token"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return null;
      }

      return aiClaimStatusAnalysisResponseSchema.parse(await response.json());
    } catch {
      return null;
    }
  }
}
