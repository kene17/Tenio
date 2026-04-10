import type { TenioMessages } from "./locale";

export type FollowUpOutcomeValue =
  | "status_checked"
  | "pending_payer"
  | "more_info_needed"
  | "needs_review"
  | "phone_call_required"
  | "resolved";

export function getFollowUpOutcomeOptions(messages: TenioMessages["followUp"]) {
  return [
    { value: "status_checked", label: messages.outcomes.status_checked },
    { value: "pending_payer", label: messages.outcomes.pending_payer },
    { value: "more_info_needed", label: messages.outcomes.more_info_needed },
    { value: "needs_review", label: messages.outcomes.needs_review },
    { value: "phone_call_required", label: messages.outcomes.phone_call_required },
    { value: "resolved", label: messages.outcomes.resolved }
  ] satisfies Array<{ value: FollowUpOutcomeValue; label: string }>;
}

export function getClaimStatusLabel(
  status: string,
  messages: TenioMessages["claims"]["status"]
) {
  const normalized = status.trim().toLowerCase().replaceAll(" ", "_");

  if (normalized in messages) {
    return messages[normalized as keyof typeof messages];
  }

  return status;
}

export function getActorTypeLabel(
  actorType: "human" | "system" | "owner",
  messages: TenioMessages["auditLog"]["actorTypes"]
) {
  return messages[actorType];
}
