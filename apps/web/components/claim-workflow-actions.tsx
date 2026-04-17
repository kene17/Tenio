"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getFollowUpOutcomeOptions, type FollowUpOutcomeValue } from "../lib/display-labels";
import type { TenioMessages } from "../lib/locale";
import fallbackMessages from "../messages/en.json";

type ClaimWorkflowActionsProps = {
  claimId: string;
  currentOwner: string | null;
  currentStatus: string;
  canWorkClaims?: boolean;
  showOwnerAssignment?: boolean;
  showReviewNote?: boolean;
  showStructuredFollowUp?: boolean;
  messages?: TenioMessages["followUp"];
};

type FollowUpPayload = {
  action: "assign_owner" | "add_note" | "mark_call_required" | "log_follow_up";
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
};

type StatusPayload = {
  action: "approve_review" | "resolve_claim" | "escalate_claim" | "reopen_claim";
  note?: string;
};

type ActionPayload = FollowUpPayload | StatusPayload;

const FOLLOW_UP_ACTIONS = new Set([
  "assign_owner",
  "add_note",
  "mark_call_required",
  "log_follow_up",
]);

async function postAction(claimId: string, payload: ActionPayload) {
  const endpoint = FOLLOW_UP_ACTIONS.has(payload.action)
    ? `/api/claims/${claimId}/follow-ups`
    : `/api/claims/${claimId}/status`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
  showStructuredFollowUp = true,
  messages
}: ClaimWorkflowActionsProps) {
  const router = useRouter();
  const followUpMessages = messages ?? fallbackMessages.followUp;
  const outcomeOptions = getFollowUpOutcomeOptions(followUpMessages);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [owner, setOwner] = useState(currentOwner ?? "");
  const [note, setNote] = useState("");
  const [followUpOutcome, setFollowUpOutcome] = useState<FollowUpOutcomeValue>("status_checked");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpNextAction, setFollowUpNextAction] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");

  async function handleAction(payload: ActionPayload, resetNote = false) {
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
          {followUpMessages.limitedAccess}
        </div>
      ) : null}
      {showOwnerAssignment ? (
        <div className="rounded-lg border border-gray-200 p-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {followUpMessages.ownerLabel}
          </label>
          <div className="flex gap-2">
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder={followUpMessages.ownerPlaceholder}
              disabled={!canWorkClaims}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={isSubmitting || owner.trim().length === 0 || !canWorkClaims}
              onClick={() => handleAction({ action: "assign_owner", assignee: owner.trim() })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {followUpMessages.assignButton}
            </button>
          </div>
        </div>
      ) : null}

      {showReviewNote ? (
        <div className="rounded-lg border border-gray-200 p-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            {followUpMessages.reviewNoteLabel}
          </label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder={followUpMessages.reviewNotePlaceholder}
            disabled={!canWorkClaims}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={isSubmitting || note.trim().length === 0 || !canWorkClaims}
            onClick={() => handleAction({ action: "add_note", note: note.trim() }, true)}
            className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {followUpMessages.saveNoteButton}
          </button>
        </div>
      ) : null}

      {showStructuredFollowUp ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3">
          <div className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              {followUpMessages.structuredHeading}
            </div>
            <div className="mt-1 text-xs text-blue-900">
              {followUpMessages.structuredBody}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                {followUpMessages.outcomeLabel}
              </span>
              <select
                value={followUpOutcome}
                onChange={(event) =>
                  setFollowUpOutcome(event.target.value as FollowUpOutcomeValue)
                }
                disabled={!canWorkClaims}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {outcomeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                {followUpMessages.nextActionLabel}
              </span>
              <input
                value={followUpNextAction}
                onChange={(event) => setFollowUpNextAction(event.target.value)}
                placeholder={followUpMessages.nextActionPlaceholder}
                disabled={!canWorkClaims}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                {followUpMessages.noteLabel}
              </span>
              <textarea
                value={followUpNote}
                onChange={(event) => setFollowUpNote(event.target.value)}
                rows={3}
                placeholder={followUpMessages.notePlaceholder}
                disabled={!canWorkClaims}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">
                {followUpMessages.followUpByLabel}
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
              {followUpMessages.saveButton}
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
          {followUpMessages.actions.markReviewed}
        </button>
        <button
          type="button"
          disabled={isSubmitting || !canWorkClaims}
          onClick={() => handleAction({ action: "escalate_claim", note: note.trim() || undefined })}
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
        >
          {followUpMessages.actions.escalate}
        </button>
        <button
          type="button"
          disabled={isSubmitting || !canWorkClaims}
          onClick={() =>
            handleAction({ action: "mark_call_required", note: note.trim() || undefined })
          }
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          {followUpMessages.actions.markCallRequired}
        </button>
        <button
          type="button"
          disabled={isSubmitting || !canWorkClaims}
          onClick={() => handleAction({ action: "resolve_claim", note: note.trim() || undefined })}
          className="rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
        >
          {followUpMessages.actions.markResolved}
        </button>
        <button
          type="button"
          disabled={isSubmitting || currentStatus === "Needs Review" || !canWorkClaims}
          onClick={() => handleAction({ action: "reopen_claim", note: note.trim() || undefined })}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {followUpMessages.actions.reopen}
        </button>
      </div>
    </div>
  );
}
