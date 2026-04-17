"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  CheckSquare,
  Phone,
  RotateCcw,
  ShieldAlert,
  UserCheck
} from "lucide-react";

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
  "log_follow_up"
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

// ── Shared input styles ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  fontSize: 13,
  lineHeight: 1.5,
  color: "#0f172a",
  background: "#fff",
  border: "1px solid rgba(15,23,42,0.12)",
  borderRadius: 8,
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
  boxSizing: "border-box"
};

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(37,99,235,0.45)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)";
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}

function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, resize: "vertical", minHeight: 80 } as React.CSSProperties}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(37,99,235,0.45)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)";
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}

function FieldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(37,99,235,0.45)";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)";
        e.currentTarget.style.boxShadow = "none";
        props.onBlur?.(e);
      }}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "#64748b",
        marginBottom: 5
      }}
    >
      {children}
    </div>
  );
}

// ── Action button variants ────────────────────────────────────────────────────

type ActionButtonVariant = "primary" | "success" | "warning" | "danger" | "ghost";

function ActionButton({
  variant,
  icon,
  label,
  sublabel,
  onClick,
  disabled
}: {
  variant: ActionButtonVariant;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const styles: Record<ActionButtonVariant, { bg: string; border: string; color: string; iconColor: string; hoverBg: string }> = {
    primary: {
      bg: "#2563eb",
      border: "transparent",
      color: "#fff",
      iconColor: "rgba(255,255,255,0.85)",
      hoverBg: "#1d4ed8"
    },
    success: {
      bg: "#f0fdf4",
      border: "rgba(22,163,74,0.25)",
      color: "#15803d",
      iconColor: "#16a34a",
      hoverBg: "#dcfce7"
    },
    warning: {
      bg: "#fffbeb",
      border: "rgba(217,119,6,0.25)",
      color: "#b45309",
      iconColor: "#d97706",
      hoverBg: "#fef3c7"
    },
    danger: {
      bg: "#fff5f5",
      border: "rgba(220,38,38,0.20)",
      color: "#b91c1c",
      iconColor: "#dc2626",
      hoverBg: "#fee2e2"
    },
    ghost: {
      bg: "transparent",
      border: "rgba(15,23,42,0.10)",
      color: "#475569",
      iconColor: "#94a3b8",
      hoverBg: "rgba(15,23,42,0.04)"
    }
  };

  const s = styles[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 14px",
        background: disabled ? "#f8fafc" : s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "background 0.13s, transform 0.1s",
        textAlign: "left"
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = s.hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = s.bg;
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.985)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: 7,
          background: variant === "primary" ? "rgba(255,255,255,0.15)" : `${s.iconColor}18`,
          color: s.iconColor,
          flexShrink: 0
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: disabled ? "#94a3b8" : s.color, lineHeight: 1.3 }}>
          {label}
        </div>
        {sublabel ? (
          <div style={{ fontSize: 11, color: disabled ? "#94a3b8" : variant === "primary" ? "rgba(255,255,255,0.75)" : `${s.color}99`, marginTop: 1, lineHeight: 1.3 }}>
            {sublabel}
          </div>
        ) : null}
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
      if (resetNote) setNote("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Limited access banner */}
      {!canWorkClaims ? (
        <div
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            background: "#fffbeb",
            border: "1px solid rgba(217,119,6,0.20)",
            fontSize: 12,
            color: "#92400e",
            lineHeight: 1.5
          }}
        >
          {followUpMessages.limitedAccess}
        </div>
      ) : null}

      {/* Owner assignment */}
      {showOwnerAssignment ? (
        <div>
          <FieldLabel>{followUpMessages.ownerLabel}</FieldLabel>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <FieldInput
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder={followUpMessages.ownerPlaceholder}
                disabled={!canWorkClaims}
              />
            </div>
            <button
              type="button"
              disabled={isSubmitting || owner.trim().length === 0 || !canWorkClaims}
              onClick={() => handleAction({ action: "assign_owner", assignee: owner.trim() })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 600,
                color: owner.trim() && canWorkClaims ? "#2563eb" : "#94a3b8",
                background: owner.trim() && canWorkClaims ? "rgba(37,99,235,0.07)" : "rgba(15,23,42,0.04)",
                border: "1px solid",
                borderColor: owner.trim() && canWorkClaims ? "rgba(37,99,235,0.20)" : "rgba(15,23,42,0.08)",
                borderRadius: 8,
                cursor: owner.trim() && canWorkClaims ? "pointer" : "not-allowed",
                flexShrink: 0,
                height: 34,
                transition: "background 0.12s, border-color 0.12s"
              }}
              onMouseEnter={(e) => {
                if (owner.trim() && canWorkClaims) e.currentTarget.style.background = "rgba(37,99,235,0.12)";
              }}
              onMouseLeave={(e) => {
                if (owner.trim() && canWorkClaims) e.currentTarget.style.background = "rgba(37,99,235,0.07)";
              }}
            >
              <UserCheck style={{ width: 12, height: 12 }} />
              {followUpMessages.assignButton}
            </button>
          </div>
        </div>
      ) : null}

      {/* Review note */}
      {showReviewNote ? (
        <div>
          <FieldLabel>{followUpMessages.reviewNoteLabel}</FieldLabel>
          <FieldTextarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={followUpMessages.reviewNotePlaceholder}
            disabled={!canWorkClaims}
          />
          <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              disabled={isSubmitting || note.trim().length === 0 || !canWorkClaims}
              onClick={() => handleAction({ action: "add_note", note: note.trim() }, true)}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: note.trim() && canWorkClaims ? "#2563eb" : "#94a3b8",
                background: "none",
                border: "1px solid",
                borderColor: note.trim() && canWorkClaims ? "rgba(37,99,235,0.25)" : "rgba(15,23,42,0.08)",
                borderRadius: 7,
                cursor: note.trim() && canWorkClaims ? "pointer" : "not-allowed",
                transition: "background 0.12s, border-color 0.12s"
              }}
              onMouseEnter={(e) => {
                if (note.trim() && canWorkClaims) e.currentTarget.style.background = "rgba(37,99,235,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              {followUpMessages.saveNoteButton}
            </button>
          </div>
        </div>
      ) : null}

      {/* Structured follow-up */}
      {showStructuredFollowUp ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: "#f8faff",
            border: "1px solid rgba(37,99,235,0.12)"
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#2563eb" }}>
              {followUpMessages.structuredHeading}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
              {followUpMessages.structuredBody}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <FieldLabel>{followUpMessages.outcomeLabel}</FieldLabel>
              <FieldSelect
                value={followUpOutcome}
                onChange={(e) => setFollowUpOutcome(e.target.value as FollowUpOutcomeValue)}
                disabled={!canWorkClaims}
              >
                {outcomeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </FieldSelect>
            </div>
            <div>
              <FieldLabel>{followUpMessages.nextActionLabel}</FieldLabel>
              <FieldInput
                value={followUpNextAction}
                onChange={(e) => setFollowUpNextAction(e.target.value)}
                placeholder={followUpMessages.nextActionPlaceholder}
                disabled={!canWorkClaims}
              />
            </div>
            <div>
              <FieldLabel>{followUpMessages.noteLabel}</FieldLabel>
              <FieldTextarea
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                rows={3}
                placeholder={followUpMessages.notePlaceholder}
                disabled={!canWorkClaims}
              />
            </div>
            <div>
              <FieldLabel>{followUpMessages.followUpByLabel}</FieldLabel>
              <FieldInput
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                disabled={!canWorkClaims}
              />
            </div>
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
              style={{
                width: "100%",
                padding: "9px 14px",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: "#2563eb",
                border: "none",
                borderRadius: 9,
                cursor: "pointer",
                opacity:
                  isSubmitting ||
                  followUpNote.trim().length === 0 ||
                  followUpNextAction.trim().length === 0 ||
                  !canWorkClaims
                    ? 0.5
                    : 1,
                transition: "background 0.12s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1d4ed8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#2563eb"; }}
            >
              {followUpMessages.saveButton}
            </button>
          </div>
        </div>
      ) : null}

      {/* Divider before action buttons */}
      <div style={{ height: 1, background: "rgba(15,23,42,0.06)", margin: "2px 0" }} />

      {/* Action buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <ActionButton
          variant="primary"
          icon={<CheckSquare style={{ width: 14, height: 14 }} />}
          label={followUpMessages.actions.markReviewed}
          sublabel="Confirm the claim has been reviewed"
          disabled={isSubmitting}
          onClick={() => handleAction({ action: "approve_review", note: note.trim() || undefined })}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <ActionButton
            variant="warning"
            icon={<ShieldAlert style={{ width: 14, height: 14 }} />}
            label={followUpMessages.actions.escalate}
            disabled={isSubmitting || !canWorkClaims}
            onClick={() => handleAction({ action: "escalate_claim", note: note.trim() || undefined })}
          />
          <ActionButton
            variant="danger"
            icon={<Phone style={{ width: 14, height: 14 }} />}
            label={followUpMessages.actions.markCallRequired}
            disabled={isSubmitting || !canWorkClaims}
            onClick={() => handleAction({ action: "mark_call_required", note: note.trim() || undefined })}
          />
        </div>
        <ActionButton
          variant="success"
          icon={<CheckCircle2 style={{ width: 14, height: 14 }} />}
          label={followUpMessages.actions.markResolved}
          sublabel="Close the claim as resolved"
          disabled={isSubmitting || !canWorkClaims}
          onClick={() => handleAction({ action: "resolve_claim", note: note.trim() || undefined })}
        />
        <ActionButton
          variant="ghost"
          icon={<RotateCcw style={{ width: 13, height: 13 }} />}
          label={followUpMessages.actions.reopen}
          disabled={isSubmitting || currentStatus === "Needs Review" || !canWorkClaims}
          onClick={() => handleAction({ action: "reopen_claim", note: note.trim() || undefined })}
        />
      </div>
    </div>
  );
}
