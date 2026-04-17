"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hasPermission, type UserRole } from "@tenio/domain";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Circle,
  FileSearch,
  Globe,
  Pencil,
  Plus,
  Save,
  Send,
  Settings,
  Trash2,
  X,
  Zap
} from "lucide-react";

import { PageRoleBanner } from "../../../components/page-role-banner";
import { cn } from "../../../lib/cn";
import {
  canonicalPayerIdForCredentials,
  resolvePayerCredentialFromMap
} from "../../../lib/payer-credentials";
import type { TenioMessages } from "../../../lib/locale";
import type { AuditEventView, PayerConfigurationView, PayerCredentialView } from "../../../lib/pilot-api";

// ── Destination type ──────────────────────────────────────────────────────────

type Destination = PayerConfigurationView["destinations"][number];

// ── Status badge ──────────────────────────────────────────────────────────────

function statusBadge(
  status: PayerConfigurationView["status"],
  messages: TenioMessages["configuration"]["status"]
) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" />
        {messages.active}
      </span>
    );
  }

  if (status === "needs_attention") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        {messages.needsAttention}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
      <Circle className="h-3 w-3" />
      {messages.inactive}
    </span>
  );
}

// ── Inline edit helper styles ─────────────────────────────────────────────────

const ghostBtn =
  "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors";

// ── Rules edit section ────────────────────────────────────────────────────────

type EditState = { index: number; value: string } | { index: -1; value: string } | null;

function RulesSection({
  heading,
  rules,
  canEdit,
  isSaving,
  onSave
}: {
  heading: string;
  rules: string[];
  canEdit: boolean;
  isSaving: boolean;
  onSave: (updatedRules: string[]) => Promise<void>;
}) {
  const [localRules, setLocalRules] = useState(rules);
  const [editing, setEditing] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalRules(rules);
    setEditing(null);
  }, [rules]);

  async function commitEdit() {
    if (!editing) return;
    const trimmed = editing.value.trim();
    if (!trimmed) {
      cancelEdit();
      return;
    }
    let next: string[];
    if (editing.index === -1) {
      next = [...localRules, trimmed];
    } else {
      next = localRules.map((r, i) => (i === editing.index ? trimmed : r));
    }
    setSaving(true);
    try {
      await onSave(next);
      setLocalRules(next);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function deleteRule(index: number) {
    const next = localRules.filter((_, i) => i !== index);
    setSaving(true);
    try {
      await onSave(next);
      setLocalRules(next);
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || isSaving;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">{heading}</h3>
        {canEdit ? (
          <button
            type="button"
            disabled={busy || editing !== null}
            onClick={() => setEditing({ index: -1, value: "" })}
            className={cn(ghostBtn, "text-blue-600 hover:bg-blue-50 disabled:opacity-40")}
          >
            <Plus className="h-3 w-3" />
            Add rule
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        {localRules.map((rule, i) => (
          <div key={i}>
            {editing?.index === i ? (
              <div className="rounded border border-blue-300 bg-blue-50/40 p-2">
                <input
                  autoFocus
                  value={editing.value}
                  onChange={(e) => setEditing({ index: i, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void commitEdit()}
                    className={cn(ghostBtn, "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60")}
                  >
                    <Save className="h-3 w-3" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className={cn(ghostBtn, "text-gray-500 hover:bg-gray-100")}
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group flex items-center justify-between rounded border border-gray-200 p-3">
                <div className="text-sm text-gray-900">{rule}</div>
                {canEdit ? (
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={busy || editing !== null}
                      onClick={() => setEditing({ index: i, value: rule })}
                      className={cn(ghostBtn, "text-gray-500 hover:bg-gray-100")}
                      title="Edit rule"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy || editing !== null}
                      onClick={() => void deleteRule(i)}
                      className={cn(ghostBtn, "text-red-500 hover:bg-red-50")}
                      title="Delete rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Settings className="h-4 w-4 text-gray-300" />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add new rule inline form */}
        {editing?.index === -1 ? (
          <div className="rounded border border-blue-300 bg-blue-50/40 p-2">
            <input
              autoFocus
              value={editing.value}
              onChange={(e) => setEditing({ index: -1, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="Enter rule description…"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={busy || !editing.value.trim()}
                onClick={() => void commitEdit()}
                className={cn(ghostBtn, "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60")}
              >
                <Save className="h-3 w-3" />
                Save
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className={cn(ghostBtn, "text-gray-500 hover:bg-gray-100")}
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {localRules.length === 0 && editing === null ? (
          <p className="py-2 text-center text-xs text-gray-400">No rules configured</p>
        ) : null}
      </div>
    </section>
  );
}

// ── Destinations section ──────────────────────────────────────────────────────

function DestinationsSection({
  heading,
  destinations,
  canEdit,
  isSaving,
  onSave
}: {
  heading: string;
  destinations: Destination[];
  canEdit: boolean;
  isSaving: boolean;
  onSave: (updatedDestinations: Destination[]) => Promise<void>;
}) {
  const [localDests, setLocalDests] = useState(destinations);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    setLocalDests(destinations);
  }, [destinations]);

  async function toggleStatus(dest: Destination) {
    if (!canEdit) return;
    const newStatus = dest.status === "active" ? "inactive" : "active";
    const next = localDests.map((d) =>
      d.id === dest.id ? { ...d, status: newStatus as Destination["status"] } : d
    );
    setToggling(dest.id);
    try {
      await onSave(next);
      setLocalDests(next);
    } finally {
      setToggling(null);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-medium text-gray-900">{heading}</h3>
      <div className="space-y-2">
        {localDests.map((dest) => {
          const isExpanded = expanded === dest.id;
          const isToggling = toggling === dest.id || isSaving;
          return (
            <div key={dest.id} className="overflow-hidden rounded border border-gray-200">
              {/* Header row */}
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : dest.id)}
                className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background:
                        dest.status === "active"
                          ? "rgba(22,163,74,0.09)"
                          : "rgba(15,23,42,0.05)",
                      color: dest.status === "active" ? "#16a34a" : "#94a3b8",
                      flexShrink: 0
                    }}
                  >
                    <Send style={{ width: 13, height: 13 }} />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{dest.label}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      <span className="capitalize">{dest.kind}</span>
                      <span>•</span>
                      <span
                        className={
                          dest.status === "active" ? "text-green-600 font-medium" : "text-gray-400"
                        }
                      >
                        {dest.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className="h-4 w-4 text-gray-400 transition-transform duration-200"
                  style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                />
              </button>

              {/* Expanded detail */}
              {isExpanded ? (
                <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                  <div className="mb-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium text-gray-500 uppercase tracking-wide mb-0.5">Type</div>
                      <div className="flex items-center gap-1.5 text-gray-800 font-medium capitalize">
                        <Zap className="h-3 w-3 text-gray-400" />
                        {dest.kind}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-500 uppercase tracking-wide mb-0.5">Status</div>
                      <div>
                        {dest.status === "active" ? (
                          <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-500">
                            <Circle className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-500 uppercase tracking-wide mb-0.5">ID</div>
                      <div className="font-mono text-[11px] text-gray-600">{dest.id}</div>
                    </div>
                  </div>

                  {canEdit ? (
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => void toggleStatus(dest)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 7,
                        border: "1px solid",
                        cursor: isToggling ? "wait" : "pointer",
                        opacity: isToggling ? 0.6 : 1,
                        transition: "background 0.12s",
                        ...(dest.status === "active"
                          ? {
                              background: "rgba(220,38,38,0.05)",
                              borderColor: "rgba(220,38,38,0.20)",
                              color: "#b91c1c"
                            }
                          : {
                              background: "rgba(22,163,74,0.06)",
                              borderColor: "rgba(22,163,74,0.20)",
                              color: "#15803d"
                            })
                      }}
                    >
                      {dest.status === "active" ? (
                        <>
                          <X style={{ width: 12, height: 12 }} />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle style={{ width: 12, height: 12 }} />
                          Activate
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {localDests.length === 0 ? (
          <p className="py-2 text-center text-xs text-gray-400">No destinations configured</p>
        ) : null}
      </div>
    </section>
  );
}

// ── Per-payer connector config ────────────────────────────────────────────────

type CredentialField = { name: string; label: string; type: "text" | "password"; required: boolean };

const PAYER_CONNECTOR_CONFIG: Record<string, {
  connectorId: string;
  connectorMode: "api" | "browser";
  credentialFields: CredentialField[];
}> = {
  payer_telus_eclaims: {
    connectorId: "telus-eclaims-api",
    connectorMode: "api",
    credentialFields: [
      { name: "accessToken", label: "Access Token", type: "password", required: true },
      { name: "refreshToken", label: "Refresh Token", type: "password", required: false },
      { name: "planSoftwareId", label: "Plan Software ID", type: "text", required: false }
    ]
  },
  payer_sun_life: {
    connectorId: "sun-life-pshcp-browser",
    connectorMode: "browser",
    credentialFields: [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true }
    ]
  },
  payer_manulife: {
    connectorId: "manulife-groupbenefits-browser",
    connectorMode: "browser",
    credentialFields: [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true }
    ]
  },
  payer_canada_life: {
    connectorId: "canada-life-groupnet-browser",
    connectorMode: "browser",
    credentialFields: [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true }
    ]
  },
  payer_green_shield: {
    connectorId: "green-shield-provider-browser",
    connectorMode: "browser",
    credentialFields: [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true }
    ]
  }
};

// ── Connection card ───────────────────────────────────────────────────────────

function ConnectionCard({
  payerId,
  payerName,
  initialCredential,
  canWrite
}: {
  payerId: string;
  payerName: string;
  initialCredential: PayerCredentialView;
  canWrite: boolean;
}) {
  const apiPayerId = canonicalPayerIdForCredentials(payerId);
  const config = PAYER_CONNECTOR_CONFIG[apiPayerId];

  const [connected, setConnected] = useState(initialCredential.connected);
  const [lastVerifiedAt, setLastVerifiedAt] = useState(initialCredential.lastVerifiedAt);
  const [formOpen, setFormOpen] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConnected(initialCredential.connected);
    setLastVerifiedAt(initialCredential.lastVerifiedAt);
    setFormOpen(false);
    setFields({});
    setError(null);
  }, [payerId, initialCredential.connected, initialCredential.lastVerifiedAt]);

  if (!config) return null;

  const isApi = config.connectorMode === "api";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/payers/${encodeURIComponent(apiPayerId)}/credentials`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields)
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Failed to save credentials.");
        return;
      }
      setConnected(true);
      setLastVerifiedAt(null);
      setFormOpen(false);
      setFields({});
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${payerName}? Automated retrieval will stop until reconnected.`)) return;
    setSaving(true);
    setError(null);
    try {
      await fetch(`/api/payers/${encodeURIComponent(apiPayerId)}/credentials`, { method: "DELETE" });
      setConnected(false);
      setLastVerifiedAt(null);
    } catch {
      setError("Failed to disconnect. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        marginBottom: 24,
        borderRadius: 10,
        border: "1px solid rgba(15,23,42,0.08)",
        background: "#fff",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(15,23,42,0.04)"
      }}
    >
      {/* Header row */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {/* Mode icon */}
          <span style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: isApi ? "rgba(37,99,235,0.07)" : "rgba(124,58,237,0.07)",
            color: isApi ? "#2563eb" : "#7c3aed"
          }}>
            {isApi
              ? <Zap style={{ width: 15, height: 15 }} />
              : <Globe style={{ width: 15, height: 15 }} />}
          </span>
          <div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Connection</span>
              {/* Connected/not badge */}
              {connected ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "1px 7px", borderRadius: 5,
                  border: "1px solid #bbf7d0", background: "#f0fdf4",
                  fontSize: 11, fontWeight: 600, color: "#166534"
                }}>
                  <CheckCircle style={{ width: 9, height: 9 }} /> Connected
                </span>
              ) : (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "1px 7px", borderRadius: 5,
                  border: "1px solid rgba(15,23,42,0.10)", background: "#f8fafc",
                  fontSize: 11, fontWeight: 600, color: "#64748b"
                }}>
                  Not connected
                </span>
              )}
              {/* Mode badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                padding: "1px 6px", borderRadius: 4,
                border: isApi ? "1px solid rgba(37,99,235,0.18)" : "1px solid rgba(124,58,237,0.18)",
                background: isApi ? "rgba(37,99,235,0.05)" : "rgba(124,58,237,0.05)",
                fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" as const,
                color: isApi ? "#1d4ed8" : "#6d28d9"
              }}>
                {isApi ? "REST API" : "Browser"}
              </span>
            </div>
            {connected && lastVerifiedAt && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                Last verified {new Date(lastVerifiedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            )}
            {!connected && !canWrite && (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Contact your account owner to connect this payer.</span>
            )}
          </div>
        </div>

        {canWrite && (
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            {connected && (
              <button
                onClick={() => void handleDisconnect()}
                disabled={saving}
                style={{
                  padding: "6px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                  border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.04)",
                  color: "#dc2626", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1
                }}
              >
                Disconnect
              </button>
            )}
            <button
              onClick={() => { setFormOpen((v) => !v); setError(null); setFields({}); }}
              disabled={saving}
              style={{
                padding: "6px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                border: "none", cursor: saving ? "wait" : "pointer",
                background: formOpen || connected
                  ? "rgba(15,23,42,0.06)"
                  : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                color: formOpen || connected ? "#0f172a" : "#fff"
              }}
            >
              {formOpen ? "Cancel" : connected ? "Update credentials" : "Connect"}
            </button>
          </div>
        )}
      </div>

      {/* Inline form */}
      {formOpen && (
        <div style={{ borderTop: "1px solid rgba(15,23,42,0.06)", background: "#f8fafc", padding: "16px 20px" }}>
          <form onSubmit={(e) => void handleSave(e)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {config.credentialFields.map((field) => (
                <label key={field.name} style={{ display: "block" }}>
                  <span style={{ display: "block", marginBottom: 4, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "#64748b" }}>
                    {field.label}{!field.required && <span style={{ fontWeight: 400, textTransform: "none" as const, letterSpacing: 0, color: "#94a3b8", marginLeft: 4 }}>(optional)</span>}
                  </span>
                  <input
                    type={field.type}
                    required={field.required}
                    autoComplete={field.type === "password" ? "new-password" : "off"}
                    value={fields[field.name] ?? ""}
                    onChange={(e) => setFields((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.type === "password" ? "••••••••" : `Enter ${field.label.toLowerCase()}`}
                    style={{
                      width: "100%", padding: "8px 11px",
                      border: "1px solid rgba(15,23,42,0.15)", borderRadius: 7,
                      fontSize: 13, color: "#0f172a", background: "#fff",
                      outline: "none", boxSizing: "border-box" as const
                    }}
                  />
                </label>
              ))}
            </div>
            {error && (
              <div style={{ marginTop: 12, padding: "7px 11px", background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.18)", borderRadius: 6, fontSize: 12, color: "#dc2626" }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "7px 18px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                  background: "linear-gradient(135deg,#2563eb,#1d4ed8)", border: "none", color: "#fff",
                  cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? "Saving…" : "Save credentials"}
              </button>
              <button
                type="button"
                onClick={() => { setFormOpen(false); setError(null); setFields({}); }}
                style={{
                  padding: "7px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
                  background: "none", border: "1px solid rgba(15,23,42,0.12)", color: "#64748b", cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ConfigurationClient({
  payers,
  auditEvents,
  currentRole,
  messages,
  roleHelpTitle,
  credentialsByPayerId
}: {
  payers: PayerConfigurationView[];
  auditEvents: AuditEventView[];
  currentRole: UserRole;
  messages: TenioMessages["configuration"];
  roleHelpTitle: string;
  credentialsByPayerId: Record<string, PayerCredentialView>;
}) {
  const router = useRouter();
  const canManageConfiguration = hasPermission(currentRole, "payer:write");
  const roleHelpBody =
    currentRole === "manager" ? messages.roleHelp.manager : null;
  const [payerState, setPayerState] = useState(payers);
  const [selectedPayer, setSelectedPayer] = useState(payers[0]?.payerId ?? "");
  const [owner, setOwner] = useState("");
  const [reviewThreshold, setReviewThreshold] = useState("85");
  const [escalationThreshold, setEscalationThreshold] = useState("55");
  const [defaultSlaHours, setDefaultSlaHours] = useState("24");
  const [autoAssignOwner, setAutoAssignOwner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentPayer = payerState.find((p) => p.payerId === selectedPayer) ?? payerState[0];
  const configurationEvents = useMemo(
    () => auditEvents.filter((e) => e.category === "Config Change").slice(0, 5),
    [auditEvents]
  );

  useEffect(() => {
    setPayerState(payers);
  }, [payers]);

  useEffect(() => {
    if (!currentPayer) return;
    setOwner(currentPayer.owner);
    setReviewThreshold(String(Math.round(currentPayer.reviewThreshold * 100)));
    setEscalationThreshold(String(Math.round(currentPayer.escalationThreshold * 100)));
    setDefaultSlaHours(String(currentPayer.defaultSlaHours));
    setAutoAssignOwner(currentPayer.autoAssignOwner);
  }, [currentPayer]);

  if (!currentPayer) return null;

  // ── Generic policy POST helper used by all three sections ──────────────────

  async function postPolicy(extra: Record<string, unknown> = {}): Promise<PayerConfigurationView | null> {
    const response = await fetch(
      `/api/configuration/payers/${encodeURIComponent(currentPayer.payerId)}/policy`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner,
          reviewThreshold: Number(reviewThreshold) / 100,
          escalationThreshold: Number(escalationThreshold) / 100,
          defaultSlaHours: Number(defaultSlaHours),
          autoAssignOwner,
          ...extra
        })
      }
    );
    const payload = (await response.json()) as { item?: PayerConfigurationView; message?: string };
    if (!response.ok || !payload.item) {
      setError(payload.message ?? messages.errorMessage);
      return null;
    }
    setPayerState((prev) =>
      prev.map((p) => (p.payerId === payload.item?.payerId ? payload.item! : p))
    );
    return payload.item;
  }

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      setError(null);
      const result = await postPolicy();
      if (result) {
        setMessage(messages.savedMessage);
        router.refresh();
      }
    });
  }

  async function handleSaveStatusRules(statusRules: string[]) {
    setMessage(null);
    setError(null);
    const result = await postPolicy({ statusRules });
    if (result) router.refresh();
  }

  async function handleSaveReviewRules(reviewRules: string[]) {
    setMessage(null);
    setError(null);
    const result = await postPolicy({ reviewRules });
    if (result) router.refresh();
  }

  async function handleSaveDestinations(destinations: Destination[]) {
    setMessage(null);
    setError(null);
    const result = await postPolicy({ destinations });
    if (result) router.refresh();
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 shrink-0 overflow-auto border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">{messages.sidebarTitle}</h2>
          <p className="text-xs text-gray-600">{messages.sidebarBody}</p>
        </div>
        <div className="p-2">
          {payerState.map((payer) => (
            <button
              key={payer.payerId}
              onClick={() => {
                setSelectedPayer(payer.payerId);
                setMessage(null);
                setError(null);
              }}
              className={cn(
                "mb-2 w-full rounded-lg border p-3 text-left transition-colors",
                selectedPayer === payer.payerId
                  ? "border-blue-200 bg-blue-50"
                  : "border-transparent hover:bg-gray-50"
              )}
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="text-sm font-medium text-gray-900">{payer.payerName}</span>
                {payer.issues.length > 0 ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-700">
                    {payer.issues.length}
                  </span>
                ) : null}
              </div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {payer.countryCode} / {payer.jurisdiction}
              </div>
              <div className="mb-2">{statusBadge(payer.status, messages.status)}</div>
              <div className="text-xs text-gray-600">
                {payer.enabledWorkflows.length} workflows •{" "}
                {new Date(payer.lastVerifiedAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {roleHelpBody ? <PageRoleBanner title={roleHelpTitle} body={roleHelpBody} /> : null}

          {/* Header */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{currentPayer.payerName}</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {canManageConfiguration ? messages.subheadingOwner : messages.subheadingManager}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(currentPayer.status, messages.status)}
                <span className="text-sm text-gray-600">
                  {messages.summary.owner}: {currentPayer.owner}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span>
                {messages.summary.jurisdiction}: {currentPayer.countryCode} / {currentPayer.jurisdiction}
              </span>
              <span>
                {messages.summary.lastVerified}:{" "}
                {new Date(currentPayer.lastVerifiedAt).toLocaleString()}
              </span>
              <span>
                {messages.summary.reviewThreshold}:{" "}
                {Math.round(currentPayer.reviewThreshold * 100)}%
              </span>
              <span>
                {messages.summary.escalationThreshold}:{" "}
                {Math.round(currentPayer.escalationThreshold * 100)}%
              </span>
              <span>
                {messages.summary.defaultSla}: {currentPayer.defaultSlaHours}h
              </span>
            </div>
          </div>

          {/* Connection card */}
          <ConnectionCard
            payerId={currentPayer.payerId}
            payerName={currentPayer.payerName}
            initialCredential={resolvePayerCredentialFromMap(
              currentPayer.payerId,
              credentialsByPayerId
            )}
            canWrite={canManageConfiguration}
          />

          {/* Workflow policy */}
          <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {messages.workflowPolicyHeading}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{messages.workflowPolicyBody}</p>
              </div>
              {canManageConfiguration ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {messages.saveButton}
                </button>
              ) : null}
            </div>

            {message ? (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}
            {!canManageConfiguration ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {messages.readOnlyHelp}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {messages.fields.defaultOwner}
                </span>
                <input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  disabled={!canManageConfiguration}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {messages.fields.defaultSla}
                </span>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={defaultSlaHours}
                  onChange={(e) => setDefaultSlaHours(e.target.value)}
                  disabled={!canManageConfiguration}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {messages.fields.reviewThreshold}
                </span>
                <input
                  type="number"
                  min={50}
                  max={99}
                  value={reviewThreshold}
                  onChange={(e) => setReviewThreshold(e.target.value)}
                  disabled={!canManageConfiguration}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {messages.fields.escalationThreshold}
                </span>
                <input
                  type="number"
                  min={10}
                  max={95}
                  value={escalationThreshold}
                  onChange={(e) => setEscalationThreshold(e.target.value)}
                  disabled={!canManageConfiguration}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoAssignOwner}
                onChange={(e) => setAutoAssignOwner(e.target.checked)}
                disabled={!canManageConfiguration}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {messages.fields.autoAssignHelp}
            </label>
          </section>

          {/* Four-panel grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <RulesSection
              heading={messages.sections.statusMappingRules}
              rules={currentPayer.statusRules}
              canEdit={canManageConfiguration}
              isSaving={isPending}
              onSave={handleSaveStatusRules}
            />

            <RulesSection
              heading={messages.sections.reviewRules}
              rules={currentPayer.reviewRules}
              canEdit={canManageConfiguration}
              isSaving={isPending}
              onSave={handleSaveReviewRules}
            />

            <DestinationsSection
              heading={messages.sections.destinations}
              destinations={currentPayer.destinations}
              canEdit={canManageConfiguration}
              isSaving={isPending}
              onSave={handleSaveDestinations}
            />

            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-medium text-gray-900">
                {messages.sections.openIssues}
              </h3>
              <div className="space-y-2">
                {currentPayer.issues.length > 0 ? (
                  currentPayer.issues.map((issue) => (
                    <div
                      key={issue}
                      className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                    >
                      {issue}
                    </div>
                  ))
                ) : (
                  <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {messages.sections.noIssues}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Audit trail */}
          <section className="mt-6 rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-sm font-medium text-gray-900">{messages.sections.auditTrail}</h3>
              <p className="mt-1 text-xs text-gray-600">{messages.sections.auditTrailBody}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {configurationEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between px-5 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <FileSearch className="mt-0.5 h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.action}</div>
                      <div className="mt-1 text-xs text-gray-600">{event.summary}</div>
                      <div className="mt-2 text-xs text-gray-500">
                        {event.actor.name} • {event.date} {event.time}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
