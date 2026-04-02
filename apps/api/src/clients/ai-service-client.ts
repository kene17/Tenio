import {
  aiClaimStatusAnalysisResponseSchema,
  type AiClaimStatusAnalysisRequest,
  type AiClaimStatusAnalysisResponse
} from "@tenio/contracts";

import { appConfig } from "../config.js";

export class AiServiceClient {
  constructor(private readonly baseUrl = appConfig.aiServiceUrl) {}

  async analyzeClaimStatus(
    payload: AiClaimStatusAnalysisRequest
  ): Promise<AiClaimStatusAnalysisResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/analyze-claim-status`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-tenio-ai-token": appConfig.aiServiceToken
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return null;
      }

      const json = await response.json();
      return aiClaimStatusAnalysisResponseSchema.parse(json);
    } catch {
      return null;
    }
  }
}
