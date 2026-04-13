"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Search,
  Star
} from "lucide-react";

import { KPICard } from "../../../components/kpi-card";
import { StatusPill } from "../../../components/status-pill";
import { getActorTypeLabel } from "../../../lib/display-labels";
import type { TenioMessages } from "../../../lib/locale";
import type { AuditEventView } from "../../../lib/pilot-api";

type AuditLogClientProps = {
  events: AuditEventView[];
  messages: TenioMessages["auditLog"];
};

const AUDIT_EXPORT_ENABLED = false;

const TH: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#94a3b8",
  borderBottom: "1px solid rgba(15,23,42,0.07)",
  whiteSpace: "nowrap",
  background: "#fafafa",
};

const TD: React.CSSProperties = {
  padding: "11px 14px",
  fontSize: 12.5,
  color: "#374151",
  borderBottom: "1px solid rgba(15,23,42,0.05)",
  verticalAlign: "middle",
};

const DETAIL_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#94a3b8",
  marginBottom: 3,
};

const DETAIL_VALUE: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 500,
  color: "#0f172a",
};

export function AuditLogClient({ events, messages }: AuditLogClientProps) {
  const [selectedEvent, setSelectedEvent] = useState(events[0]);
  const [showFilters, setShowFilters] = useState(false);

  if (!selectedEvent) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: "#64748b" }}>{messages.common.noEvents}</div>
    );
  }

  const humanActions = events.filter((e) => e.actor.type === "human").length;
  const systemActions = events.filter((e) => e.actor.type === "system").length;
  const sensitiveChanges = events.filter((e) => e.sensitivity === "high-risk").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f8fafc" }}>

      {/* Page header */}
      <div style={{
        padding: "18px 28px 14px",
        borderBottom: "1px solid rgba(15,23,42,0.08)",
        background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 3 }}>
            Compliance
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em", margin: 0 }}>
            {messages.heading}
          </h1>
          <p style={{ marginTop: 2, fontSize: 12.5, color: "#64748b" }}>{messages.subheading}</p>
        </div>
        {AUDIT_EXPORT_ENABLED ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              border: "1px solid rgba(15,23,42,0.12)", background: "#fff",
              fontSize: 12.5, fontWeight: 500, color: "#374151", cursor: "pointer",
            }}>
              <Star style={{ width: 13, height: 13 }} />
              Saved Views
            </button>
            <button style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 9999,
              background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              fontSize: 12.5, fontWeight: 600, color: "#fff",
              border: "none", cursor: "pointer",
            }}>
              <Download style={{ width: 13, height: 13 }} />
              Export Log
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "20px 28px" }}>

          {/* KPI strip */}
          <div style={{
            display: "flex", background: "#fff",
            border: "1px solid rgba(15,23,42,0.08)", borderRadius: 10,
            boxShadow: "0 1px 4px rgba(15,23,42,0.04)", overflow: "hidden",
            marginBottom: 16,
          }}>
            <KPICard strip isFirst title={messages.kpis.eventsToday} value={String(events.length)} subtext="live records" />
            <KPICard strip title={messages.kpis.humanActions} value={String(humanActions)} subtext="manual interactions" />
            <KPICard strip title={messages.kpis.systemActions} value={String(systemActions)} subtext="automated decisions" />
            <KPICard strip title={messages.kpis.sensitiveChanges} value={String(sensitiveChanges)} subtext="requires attention" variant={sensitiveChanges > 0 ? "warning" : "neutral"} />
          </div>

          {/* Search & filter bar */}
          <div style={{
            background: "#fff", border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 10, padding: "12px 16px",
            boxShadow: "0 1px 4px rgba(15,23,42,0.04)", marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder={messages.searchPlaceholder}
                  style={{
                    width: "100%", padding: "7px 12px 7px 32px",
                    border: "1px solid rgba(15,23,42,0.1)", borderRadius: 8,
                    fontSize: 13, color: "#374151", background: "#f8fafc",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                  fontSize: 13, fontWeight: 500,
                  ...(showFilters
                    ? { border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8" }
                    : { border: "1px solid rgba(15,23,42,0.1)", background: "#fff", color: "#374151" }),
                }}
              >
                <Filter style={{ width: 13, height: 13 }} />
                {messages.filtersButton}
              </button>
            </div>

            {showFilters ? (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
                marginTop: 12, paddingTop: 12,
                borderTop: "1px solid rgba(15,23,42,0.07)",
              }}>
                {[
                  messages.filterLabels.dateRange,
                  messages.filterLabels.actor,
                  messages.filterLabels.actionType,
                  messages.filterLabels.objectType,
                ].map((label) => (
                  <div key={label}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 5 }}>
                      {label}
                    </label>
                    <select style={{
                      width: "100%", padding: "6px 10px",
                      border: "1px solid rgba(15,23,42,0.1)", borderRadius: 7,
                      fontSize: 12.5, color: "#374151", background: "#fff",
                      outline: "none",
                    }}>
                      <option>{messages.filterLabels.all}</option>
                    </select>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* Master/detail layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, alignItems: "start" }}>

            {/* Event table */}
            <div style={{
              background: "#fff", border: "1px solid rgba(15,23,42,0.08)",
              borderRadius: 10, overflow: "hidden",
              boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {[
                        messages.tableHeaders.time,
                        messages.tableHeaders.actor,
                        messages.tableHeaders.action,
                        messages.tableHeaders.object,
                        messages.tableHeaders.summary,
                        messages.tableHeaders.sensitivity,
                      ].map((header, index) => (
                        <th key={header} style={TH}>
                          {index === 0 ? (
                            <button style={{
                              display: "flex", alignItems: "center", gap: 4,
                              background: "none", border: "none", cursor: "pointer",
                              fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em",
                              textTransform: "uppercase", color: "#94a3b8", padding: 0,
                            }}>
                              {header}
                              <ArrowUpDown style={{ width: 11, height: 11 }} />
                            </button>
                          ) : header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const isSelected = selectedEvent.id === event.id;
                      return (
                        <tr
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          style={{
                            cursor: "pointer",
                            background: isSelected ? "#eff6ff" : "transparent",
                            transition: "background 0.1s",
                            borderLeft: isSelected ? "2px solid #2563eb" : "2px solid transparent",
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f8fafc"; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={{ ...TD, whiteSpace: "nowrap" }}>
                            <div style={{ fontSize: 12.5, fontWeight: 500, color: "#0f172a" }}>{event.time}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{event.date}</div>
                          </td>
                          <td style={{ ...TD, whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 700,
                                ...(event.actor.type === "human"
                                  ? { background: "#dbeafe", color: "#1d4ed8" }
                                  : event.actor.type === "owner"
                                    ? { background: "#f3e8ff", color: "#7c3aed" }
                                    : { background: "#f1f5f9", color: "#64748b" }),
                              }}>
                                {event.actor.avatar}
                              </div>
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{event.actor.name}</div>
                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{getActorTypeLabel(event.actor.type, messages.actorTypes)}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...TD, whiteSpace: "nowrap" }}>
                            <StatusPill
                              variant={
                                event.action.includes("Updated")
                                  ? "warning"
                                  : event.action.includes("Routed") || event.action.includes("Retrieved")
                                    ? "info"
                                    : "neutral"
                              }
                            >
                              {event.action}
                            </StatusPill>
                          </td>
                          <td style={{ ...TD, whiteSpace: "nowrap" }}>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0f172a" }}>{event.object}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{event.objectId}</div>
                          </td>
                          <td style={TD}>
                            <div style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, color: "#374151" }}>
                              {event.summary}
                            </div>
                          </td>
                          <td style={{ ...TD, whiteSpace: "nowrap" }}>
                            {event.sensitivity === "high-risk" ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <AlertTriangle style={{ width: 13, height: 13, color: "#dc2626" }} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#dc2626" }}>{messages.common.highRisk}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>{messages.common.normal}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail panel */}
            <div style={{
              background: "#fff", border: "1px solid rgba(15,23,42,0.08)",
              borderRadius: 10, overflow: "hidden",
              boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
              position: "sticky", top: 0,
            }}>
              {/* Detail header */}
              <div style={{
                padding: "16px 18px",
                borderBottom: "1px solid rgba(15,23,42,0.07)",
                background: "linear-gradient(to bottom, #fafafa, #fff)",
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>
                  Event Detail
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
                  {selectedEvent.action}
                </div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10.5, color: "#94a3b8" }}>{messages.detail.eventId}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>
                    {selectedEvent.id}
                  </span>
                </div>
              </div>

              {/* Who + when */}
              <div style={{
                padding: "14px 18px",
                borderBottom: "1px solid rgba(15,23,42,0.07)",
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
              }}>
                <div>
                  <div style={DETAIL_LABEL}>{messages.detail.time}</div>
                  <div style={DETAIL_VALUE}>{selectedEvent.time}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{selectedEvent.date}</div>
                </div>
                <div>
                  <div style={DETAIL_LABEL}>{messages.detail.actor}</div>
                  <div style={DETAIL_VALUE}>{selectedEvent.actor.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{getActorTypeLabel(selectedEvent.actor.type, messages.actorTypes)}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={DETAIL_LABEL}>{messages.detail.object}</div>
                  <div style={DETAIL_VALUE}>{selectedEvent.object} · {selectedEvent.objectId}</div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
                <div style={DETAIL_LABEL}>{messages.detail.summary}</div>
                <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#374151", margin: 0 }}>{selectedEvent.summary}</p>
              </div>

              {/* Before/after */}
              {selectedEvent.beforeAfter ? (
                <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(15,23,42,0.07)", background: "#fafafa" }}>
                  <div style={DETAIL_LABEL}>{messages.detail.changes}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 6 }}>
                    {Object.entries(selectedEvent.beforeAfter).map(([key, value]) => {
                      const change = value as { from: string; to: string };
                      return (
                        <div key={key}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "capitalize", marginBottom: 6 }}>{key}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #fecaca", background: "#fff" }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>{messages.detail.before}</div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: "#0f172a" }}>{change.from}</div>
                            </div>
                            <div style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #bbf7d0", background: "#fff" }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", marginBottom: 4 }}>{messages.detail.after}</div>
                              <div style={{ fontSize: 12, fontWeight: 500, color: "#0f172a" }}>{change.to}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Metadata */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
                <div style={DETAIL_LABEL}>{messages.detail.metadata}</div>
                <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    [messages.detail.requestId, selectedEvent.requestId ?? "—"],
                    [messages.detail.category, selectedEvent.category],
                    [messages.detail.organization, messages.common.pilotOrg],
                    [messages.detail.payer, selectedEvent.payer],
                  ].map(([label, val]) => (
                    <div key={label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "7px 0", borderBottom: "1px solid rgba(15,23,42,0.05)",
                    }}>
                      <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{label}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: "#374151" }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <button style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 9999, width: "100%",
                  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  border: "none", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer",
                }}>
                  <ExternalLink style={{ width: 13, height: 13 }} />
                  {messages.detail.viewObject}
                </button>
                <button style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 9999, width: "100%",
                  background: "#fff", border: "1px solid rgba(15,23,42,0.13)",
                  fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer",
                }}>
                  <FileText style={{ width: 13, height: 13 }} />
                  {messages.detail.exportEvent}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
