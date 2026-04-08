"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ClaimWorkflowActionsProps = {
  claimId: string;
  currentOwner: string | null;
  currentStatus: string;
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
      | "mark_call_required";
    assignee?: string;
    note?: string;
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
  currentStatus
}: ClaimWorkflowActionsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [owner, setOwner] = useState(currentOwner ?? "");
  const [note, setNote] = useState("");

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
      <div className="rounded-lg border border-gray-200 p-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">Owner</label>
        <div className="flex gap-2">
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Assign owner"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={isSubmitting || owner.trim().length === 0}
            onClick={() => handleAction({ action: "assign_owner", assignee: owner.trim() })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Assign
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-3">
        <label className="mb-1 block text-xs font-medium text-gray-600">Review note</label>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          placeholder="Add a note, decision rationale, or escalation detail..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={isSubmitting || note.trim().length === 0}
          onClick={() => handleAction({ action: "add_note", note: note.trim() }, true)}
          className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Save Note
        </button>
      </div>

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
          disabled={isSubmitting}
          onClick={() => handleAction({ action: "escalate_claim", note: note.trim() || undefined })}
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
        >
          Escalate
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() =>
            handleAction({ action: "mark_call_required", note: note.trim() || undefined })
          }
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          Mark Call Required
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => handleAction({ action: "resolve_claim", note: note.trim() || undefined })}
          className="rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
        >
          Mark Resolved
        </button>
        <button
          type="button"
          disabled={isSubmitting || currentStatus === "Needs Review"}
          onClick={() => handleAction({ action: "reopen_claim", note: note.trim() || undefined })}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Reopen
        </button>
      </div>
    </div>
  );
}
