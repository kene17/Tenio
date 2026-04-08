import type { ExecutionCandidate } from "@tenio/contracts";
import type { ClaimDetail } from "@tenio/domain";

import { AiServiceClient } from "../clients/ai-service-client.js";

export class ExecutionService {
  constructor(private readonly aiClient = new AiServiceClient()) {}

  async requestClaimStatusRetrieval(claim: ClaimDetail): Promise<ExecutionCandidate> {
    const aiResponse = await this.aiClient.analyzeClaimStatus({
      claimId: claim.id,
      payerId: claim.payerId,
      payerName: claim.payerName,
      jurisdiction: claim.jurisdiction,
      countryCode: claim.countryCode,
      portalText: claim.normalizedStatusText,
      screenshotUrls: claim.evidence.map((artifact) => artifact.url),
      metadata: {
        claimNumber: claim.claimNumber,
        patientName: claim.patientName
      }
    });

    if (aiResponse) {
      return aiResponse.candidate;
    }

    return {
      claimId: claim.id,
      normalizedStatusText: "Pending payer review",
      confidence: 0.67,
      evidence: [
        {
          id: `evidence_${claim.id}`,
          kind: "screenshot",
          label: "Portal summary",
          url: `s3://tenio-demo/${claim.id}/portal-summary.png`,
          createdAt: new Date().toISOString()
        }
      ],
      recommendedAction: "review",
      rawNotes:
        "Execution layer falls back to deterministic candidate output when the AI service is unavailable.",
      rationale:
        "No AI interpretation was available, so the execution layer returned a conservative candidate.",
      routeReason:
        "The workflow layer should review the fallback output before treating it as official state.",
      agentTraceId: `fallback_${claim.id}`,
      execution: {
        connectorId: "execution-service-fallback",
        connectorName: "Execution Service Fallback",
        executionMode: "api",
        observedAt: new Date().toISOString(),
        durationMs: 0,
        attempt: 1,
        maxAttempts: 1,
        outcome: "review_required",
        retryable: false,
        failureCategory: null
      }
    };
  }
}
