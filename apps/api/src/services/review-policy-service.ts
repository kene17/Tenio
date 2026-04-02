import type { ExecutionCandidate } from "@tenio/contracts";
import type { ClaimStatus } from "@tenio/domain";

export type WorkflowDecision = {
  nextStatus: ClaimStatus;
  reason: string;
};

export type ReviewPolicyContext = {
  payerName?: string;
  reviewThreshold?: number;
  escalationThreshold?: number;
};

export class ReviewPolicyService {
  decide(
    candidate: ExecutionCandidate,
    context?: ReviewPolicyContext | null
  ): WorkflowDecision {
    const reviewThreshold = context?.reviewThreshold ?? 0.85;
    const escalationThreshold = context?.escalationThreshold ?? 0.55;
    const payerLabel = context?.payerName ?? "this payer";

    if (candidate.recommendedAction === "retry") {
      return {
        nextStatus: "pending",
        reason: "Candidate result was uncertain enough to schedule another retrieval attempt."
      };
    }

    if (candidate.confidence < escalationThreshold) {
      return {
        nextStatus: "blocked",
        reason: `Workflow policy escalated the claim because confidence fell below the ${Math.round(
          escalationThreshold * 100
        )}% specialist threshold for ${payerLabel}.`
      };
    }

    if (candidate.recommendedAction === "review" || candidate.confidence < reviewThreshold) {
      return {
        nextStatus: "needs_review",
        reason: `Workflow policy routed the claim into human review because confidence did not clear the ${Math.round(
          reviewThreshold * 100
        )}% threshold for ${payerLabel}.`
      };
    }

    return {
      nextStatus: "resolved",
      reason: "Workflow layer accepted the candidate output and marked the claim resolved."
    };
  }
}
