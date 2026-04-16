import type { ClaimStatus } from "@tenio/domain";

/**
 * Fixed English labels for workflow states; payer-specific copy uses
 * `normalizedStatusText` for in_review and pending.
 */
export function statusLabel(status: ClaimStatus, normalizedStatusText: string): string {
  if (status === "resolved") return "Resolved";
  if (status === "blocked") return "Escalated";
  if (status === "needs_review") return "Needs Review";
  if (status === "in_review") return normalizedStatusText || "In Review";
  return normalizedStatusText || "Pending";
}
