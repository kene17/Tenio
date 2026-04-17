"use client";

import { useState } from "react";
import { CheckCircle, Globe, Zap } from "lucide-react";

import type { PayerCredentialView } from "../../../lib/pilot-api";

// ── Types ─────────────────────────────────────────────────────────────────────

type CredentialField = {
  name: string;
  label: string;
  type: "text" | "password";
  required: boolean;
};

type PayerConfig = {
  payerId: string;
  payerName: string;
  description: string;
  connectorId: string;
  connectorMode: "api" | "browser";
  credentialFields: CredentialField[];
  credentials: PayerCredentialView;
};

// ── Style constants ───────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: 10,
  boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
  overflow: "hidden"
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid rgba(15,23,42,0.15)",
  borderRadius: 8,
  fontSize: 13,
  color: "#0f172a",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box"
};

const labelCaption: React.CSSProperties = {
  display: "block",
  marginBottom: 5,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#64748b"
};

const primaryBtn: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 9999,
  fontSize: 13,
  fontWeight: 600,
  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  border: "none",
  color: "#fff",
  cursor: "pointer"
};

const ghostBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 9999,
  fontSize: 13,
  fontWeight: 500,
  background: "none",
  border: "1px solid rgba(15,23,42,0.12)",
  color: "#64748b",
  cursor: "pointer"
};

// ── Connected / not-connected badges ─────────────────────────────────────────

function ConnectedBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 6,
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
        fontSize: 11,
        fontWeight: 600,
        color: "#166534"
      }}
    >
      <CheckCircle style={{ width: 10, height: 10 }} />
      Connected
    </span>
  );
}

function NotConnectedBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 6,
        border: "1px solid rgba(15,23,42,0.1)",
        background: "#f8fafc",
        fontSize: 11,
        fontWeight: 600,
        color: "#64748b"
      }}
    >
      Not Connected
    </span>
  );
}

// ── Connector mode badge ──────────────────────────────────────────────────────

function ConnectorModeBadge({ mode }: { mode: "api" | "browser" }) {
  const isApi = mode === "api";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 7px",
        borderRadius: 5,
        border: isApi
          ? "1px solid rgba(37,99,235,0.18)"
          : "1px solid rgba(124,58,237,0.18)",
        background: isApi ? "rgba(37,99,235,0.05)" : "rgba(124,58,237,0.05)",
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: isApi ? "#1d4ed8" : "#6d28d9"
      }}
    >
      {isApi ? (
        <Zap style={{ width: 9, height: 9 }} />
      ) : (
        <Globe style={{ width: 9, height: 9 }} />
      )}
      {isApi ? "REST API" : "Browser"}
    </span>
  );
}

// ── Individual payer card ─────────────────────────────────────────────────────

function PayerCard({
  payer,
  canWrite
}: {
  payer: PayerConfig;
  canWrite: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(payer.credentials.connected);
  const [lastVerifiedAt, setLastVerifiedAt] = useState(
    payer.credentials.lastVerifiedAt
  );

  function openForm() {
    setFields({});
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setError(null);
    setFields({});
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/payers/${encodeURIComponent(payer.payerId)}/credentials`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(fields)
        }
      );
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Failed to save credentials. Please try again.");
        return;
      }
      setConnected(true);
      setLastVerifiedAt(null);
      closeForm();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${payer.payerName}? Automated retrieval will stop until reconnected.`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await fetch(
        `/api/payers/${encodeURIComponent(payer.payerId)}/credentials`,
        { method: "DELETE" }
      );
      setConnected(false);
      setLastVerifiedAt(null);
    } catch {
      setError("Failed to disconnect. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={card}>
      {/* ── Card header ── */}
      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 6
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
              {payer.payerName}
            </span>
            {connected ? <ConnectedBadge /> : <NotConnectedBadge />}
            <ConnectorModeBadge mode={payer.connectorMode} />
          </div>

          <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
            {payer.description}
          </p>

          {connected && lastVerifiedAt && (
            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                margin: "6px 0 0"
              }}
            >
              Last verified{" "}
              {new Date(lastVerifiedAt).toLocaleDateString("en-CA", {
                year: "numeric",
                month: "short",
                day: "numeric"
              })}
            </p>
          )}

          {error && !formOpen && (
            <div
              style={{
                marginTop: 10,
                padding: "7px 12px",
                background: "rgba(220,38,38,0.05)",
                border: "1px solid rgba(220,38,38,0.18)",
                borderRadius: 7,
                fontSize: 13,
                color: "#dc2626"
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        {canWrite && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexShrink: 0,
              alignItems: "center"
            }}
          >
            {connected && (
              <button
                onClick={() => void handleDisconnect()}
                disabled={saving}
                style={{
                  padding: "7px 14px",
                  borderRadius: 9999,
                  fontSize: 13,
                  fontWeight: 600,
                  border: "1px solid rgba(220,38,38,0.2)",
                  background: "rgba(220,38,38,0.04)",
                  color: "#dc2626",
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.6 : 1
                }}
              >
                Disconnect
              </button>
            )}
            <button
              onClick={formOpen ? closeForm : openForm}
              disabled={saving}
              style={{
                padding: "7px 18px",
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                background: formOpen
                  ? "rgba(15,23,42,0.06)"
                  : connected
                  ? "rgba(15,23,42,0.06)"
                  : "linear-gradient(135deg,#2563eb,#1d4ed8)",
                color: formOpen || connected ? "#0f172a" : "#fff",
                cursor: saving ? "wait" : "pointer"
              }}
            >
              {formOpen ? "Cancel" : connected ? "Update credentials" : "Connect"}
            </button>
          </div>
        )}
      </div>

      {/* ── Inline credential form ── */}
      {formOpen && (
        <div
          style={{
            borderTop: "1px solid rgba(15,23,42,0.06)",
            background: "#f8fafc",
            padding: "20px 24px"
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              margin: "0 0 16px",
              lineHeight: 1.5
            }}
          >
            {connected
              ? "Enter new credentials to replace the existing ones."
              : `Enter your ${payer.payerName} credentials to enable automated retrieval.`}
          </p>

          <form onSubmit={(e) => void handleSave(e)}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14
              }}
            >
              {payer.credentialFields.map((field) => (
                <label key={field.name} style={{ display: "block" }}>
                  <span style={labelCaption}>
                    {field.label}
                    {!field.required && (
                      <span
                        style={{
                          fontWeight: 400,
                          textTransform: "none",
                          letterSpacing: 0,
                          color: "#94a3b8",
                          marginLeft: 4
                        }}
                      >
                        (optional)
                      </span>
                    )}
                  </span>
                  <input
                    type={field.type}
                    required={field.required}
                    autoComplete={
                      field.type === "password" ? "new-password" : "off"
                    }
                    value={fields[field.name] ?? ""}
                    onChange={(e) =>
                      setFields((prev) => ({
                        ...prev,
                        [field.name]: e.target.value
                      }))
                    }
                    placeholder={
                      field.type === "password"
                        ? "••••••••"
                        : `Enter ${field.label.toLowerCase()}`
                    }
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: "8px 12px",
                  background: "rgba(220,38,38,0.05)",
                  border: "1px solid rgba(220,38,38,0.18)",
                  borderRadius: 7,
                  fontSize: 13,
                  color: "#dc2626"
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button
                type="submit"
                disabled={saving}
                style={{ ...primaryBtn, opacity: saving ? 0.7 : 1, cursor: saving ? "wait" : "pointer" }}
              >
                {saving ? "Saving…" : "Save credentials"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                style={ghostBtn}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ConnectionsClient({
  payers,
  canWrite
}: {
  payers: PayerConfig[];
  canWrite: boolean;
}) {
  return (
    <div
      style={{ height: "100%", overflowY: "auto", background: "#f8fafc" }}
    >
      <div
        style={{ padding: "24px 28px", maxWidth: 960, margin: "0 auto" }}
      >
        {/* Page heading */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#94a3b8",
              marginBottom: 4
            }}
          >
            Configuration
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#0f172a",
              letterSpacing: "-0.015em",
              lineHeight: 1.2,
              margin: 0
            }}
          >
            Payer Connections
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
            Connect your payer credentials to enable automated claims
            retrieval.
          </p>
        </div>

        {/* Permission notice for non-owners */}
        {!canWrite && (
          <div
            style={{
              marginBottom: 20,
              padding: "10px 14px",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 8,
              fontSize: 13,
              color: "#92400e"
            }}
          >
            You have read-only access to payer connections. Contact your
            account owner to manage credentials.
          </div>
        )}

        {/* Payer cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {payers.map((payer) => (
            <PayerCard key={payer.payerId} payer={payer} canWrite={canWrite} />
          ))}
        </div>

        {/* Info footer */}
        <p
          style={{
            marginTop: 24,
            fontSize: 12,
            color: "#94a3b8",
            lineHeight: 1.6
          }}
        >
          Credentials are encrypted at rest using XSalsa20-Poly1305 (libsodium
          secretbox). They are never logged or returned via the API.
        </p>
      </div>
    </div>
  );
}
