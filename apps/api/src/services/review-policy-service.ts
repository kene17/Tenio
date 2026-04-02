import type { ExecutionCandidate } from "@tenio/contracts";
import type { ClaimStatus } from "@tenio/domain";

export type WorkflowDecision = {
  nextStatus: ClaimStatus;
  reason: string;
};

export class ReviewPolicyService {
  decide(candidate: ExecutionCandidate): WorkflowDecision {
    if (candidate.recommendedAction === "retry") {
      return {
        nextStatus: "pending",
        reason: "Candidate result was uncertain enough to schedule another retrieval attempt."
      };
    }

    if (candidate.recommendedAction === "review" || candidate.confidence < 0.85) {
      return {
        nextStatus: "needs_review",
        reason: "Workflow layer routed the claim into human review after evaluating the candidate output."
      };
    }

    return {
      nextStatus: "resolved",
      reason: "Workflow layer accepted the candidate output and marked the claim resolved."
    };
  }
}
