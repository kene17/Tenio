"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ClaimWorkflowActionsProps = {
  claimId: string;
  currentOwner: string | null;
  currentStatus: string;
  canWorkClaims?: boolean;
  showOwnerAssignment?: boolean;
  showReviewNote?: boolean;
  showStructuredFollowUp?: boolean;
};

async function postAction(
  claimId: string,
  payload: {
    action:
      | "assign_owner"
      | "add_note"
      | "approve_review"
      | "resolve_claim"
      | "escalate_claim"
      | "reopen_claim"
      | "mark_call_required"
      | "log_follow_up";
    assignee?: string;
    note?: string;
    outcome?:
      | "status_checked"
      | "pending_payer"
      | "more_info_needed"
      | "needs_review"
      | "phone_call_required"
      | "resolved";
    nextAction?: string;
    followUpAt?: string | null;
  }
) {
  const response = await fetch(`/api/claims/${claimId}/workflow-action`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Claim action failed");
  }
}

export function ClaimWorkflowActions({
  claimId,
  currentOwner,
  currentStatus,
  canWorkClaims = true,
  showOwnerAssignment = true,
  showReviewNote = true,
  showStructuredFollowUp = true
}: ClaimWorkflowActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [owner, setOwner] = useState(currentOwner ?? "");
  const [note, setNote] = useState("");
  const [followUpOutcome, setFollowUpOutcome] = useState<
    | "status_checked"
    | "pending_payer"
    | "more_info_needed"
    | "needs_review"
    | "phone_call_required"
    | "resolved"
  >("status_checked");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpNextAction, setFollowUpNextAction] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");

  async function handleAction(
    payload: Parameters<typeof postAction>[1],
    resetNote = false
  ) {
    setIsSubmitting(true);

    try {
      await postAction(claimId, payload);

      if (resetNote) {
        setNote("");
      }

      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {!canWorkClaims ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          Follow-up actions are limited to owner, manager, and operator roles.
        </div>
      ) : null}
      {showOwnerAssignment ? (
        <div className="rounded-lg border border-gray-200 p-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Owner</label>
          <div className="flex gap-2">
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="Assign owner"
              disabled={!canWorkClaims}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={isSubmitting || owner.trim().length === 0 || !canWorkClaims}
              onClick={() => handleAction({ action: "assign_owner", assignee: owner.trim() })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Assign
            </button>
          </div>
        </div>
      ) : null}

      {showReviewNote ? (
        <div className="rounded-lg border border-gray-200 p-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">Review note</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Add a note, decision rationale, or escalation detail..."
            disabled={!canWorkClaims}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={isSubmitting || note.trim().length === 0 || !canWorkClaims}
            onClick={() => handleAction({ action: "add_note", note: note.trim() }, true)}
            className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Save Note
          </button>
        </div>
      ) : null}

      {showStructuredFollowUp ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
          <div className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Structured Follow-up
            </div>
            <div className="mt-1 text-xs text-blue-900">
              Log what happened, define the next action, and set the next touch point.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">Outcome</span>
              <select
                value={followUpOutcome}
                onChange={(event) =>
                  setFollowUpOutcome(
                    event.target.value as
                      | "status_checked"
                      | "pending_payer"
                      | "more_info_needed"
                      | "needs_review"
                      | "phone_call_required"
                      | "resolved"
                  )
                }
                disabled={!canWorkClaims}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="status_checked">Status checked</option>
                <option value="pending_payer">Pending payer</option>
                <option value="more_info_needed">More info needed</option>
                <option value="needs_review">Needs review</option>
                <option value="phone_call_required">Phone call required</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">Next action</span>
              <input
                value={followUpNextAction}
                onChange={(event) => setFollowUpNextAction(event.target.value)}
                placeholder="Example: Wait for payer update, collect clinic note, call payer"
                disabled={!canWorkClaims}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">Follow-up note</span>
              <textarea
                value={followUpNote}
                onChange={(event) => setFollowUpNote(event.target.value)}
                rows={3}
                placeholder="Document what happened and what the coordinator learned."
                disabled={!canWorkClaims}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                Follow-up by
              </span>
              <input
                type="datetime-local"
                value={followUpAt}
                onChange={(event) => setFollowUpAt(event.target.value)}
                disabled={!canWorkClaims}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
            <button
              type="button"
              disabled={
                isSubmitting ||
                followUpNote.trim().length === 0 ||
                followUpNextAction.trim().length === 0 ||
                !canWorkClaims
              }
              onClick={() =>
                handleAction(
                  {
                    action: "log_follow_up",
                    outcome: followUpOutcome,
                    note: followUpNote.trim(),
                    nextAction: followUpNextAction.trim(),
                    followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null
                  },
                  false
                ).then(() => {
                  setFollowUpNote("");
                  setFollowUpNextAction("");
                  setFollowUpAt("");
                  setFollowUpOutcome("status_checked");
                })
              }
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              Log Follow-up
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          
          onClick={() => handleAction({ action: "approve_review", note: note.trim() || undefined })}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          Mark Reviewed
        </button>
        <button
          type="button"
          disabled={isSubmitting || !canWorkClaims}
          onClick={() => handleAction({ action: "escalate_claim", note: note.trim() || undefined })}
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
        >
          Escalate
        </button>
        <button
          type="button"
          disabled={isSubmitting || !canWorkClaims}
          onClick={() =>
            handleAction({ action: "mark_call_required", note: note.trim() || undefined })
          }
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          Mark Call Required
        </button>
        <button
          type="button"
          disabled={isSubmitting || !canWorkClaims}
          onClick={() => handleAction({ action: "resolve_claim", note: note.trim() || undefined })}
          className="rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
        >
          Mark Resolved
        </button>
        <button
          type="button"
          disabled={isSubmitting || currentStatus === "Needs Review" || !canWorkClaims}
          onClick={() => handleAction({ action: "reopen_claim", note: note.trim() || undefined })}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Reopen
        </button>
      </div>
    </div>
  );
}
