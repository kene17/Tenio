"use client";

import {
  Bar, BarChart, CartesianGrid, Cell,
  Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

import { KPICard } from "../../../components/kpi-card";
import type { TenioMessages } from "../../../lib/locale";
import type { PerformanceView } from "../../../lib/pilot-api";

const TH: React.CSSProperties = {
  padding: "10px 14px", fontSize: 10.5, fontWeight: 600,
  letterSpacing: "0.07em", textTransform: "uppercase",
  color: "#94a3b8", background: "#f8faff", textAlign: "left", whiteSpace: "nowrap",
};
const TD: React.CSSProperties = {
  padding: "10px 14px", fontSize: 13, color: "#374151", verticalAlign: "middle",
};

function riskBadge(risk: string, labels: TenioMessages["performance"]["riskLevel"]) {
  const key = risk.trim().toLowerCase();
  const styles =
    key === "high"
      ? { background: "rgba(220,38,38,0.07)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }
      : key === "medium"
      ? { background: "rgba(245,158,11,0.07)", color: "#b45309", border: "1px solid rgba(245,158,11,0.18)" }
      : { background: "rgba(5,150,105,0.07)", color: "#059669", border: "1px solid rgba(5,150,105,0.15)" };
  const text = key === "high" ? labels.high : key === "medium" ? labels.medium : labels.low;
  return (
    <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600, ...styles }}>
      {text}
    </span>
  );
}

function SectionCard({ title, subtitle, icon, children }: {
  title: string; subtitle?: string;
  icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{
      border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12,
      background: "#fff", overflow: "hidden",
      boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
    }}>
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "16px 18px", borderBottom: "1px solid rgba(15,23,42,0.06)",
      }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {icon && <div style={{ color: "#94a3b8", flexShrink: 0 }}>{icon}</div>}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

export function PerformanceClient({
  data,
  messages
}: {
  data: PerformanceView;
  messages: TenioMessages["performance"];
}) {
  const criticalAlerts = data.alerts.filter((a) => a.severity === "critical");
  const warnAlerts = data.alerts.filter((a) => a.severity === "warning");
  const goodAlerts = data.alerts.filter((a) => a.severity === "good");

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "32px 28px 48px" }}>

        {/* ── Heading ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "var(--font-inter, system-ui, sans-serif)",
            fontWeight: 700, fontSize: 22, color: "#0f172a",
            letterSpacing: "-0.025em", lineHeight: 1.25, marginBottom: 4,
          }}>
            {messages.heading}
          </h1>
          <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.55 }}>{messages.subheading}</p>
        </div>

        {/* ── Fix 3: Alerts FIRST — most actionable content leads ── */}
        {(criticalAlerts.length > 0 || warnAlerts.length > 0) && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
              Needs attention
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[...criticalAlerts, ...warnAlerts].map((alert) => (
                <div key={alert.title} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "13px 16px", borderRadius: 10,
                  border: alert.severity === "critical"
                    ? "1px solid rgba(220,38,38,0.18)"
                    : "1px solid rgba(245,158,11,0.18)",
                  background: alert.severity === "critical"
                    ? "rgba(220,38,38,0.04)"
                    : "rgba(245,158,11,0.04)",
                }}>
                  <AlertTriangle style={{
                    width: 15, height: 15, flexShrink: 0, marginTop: 1,
                    color: alert.severity === "critical" ? "#dc2626" : "#d97706",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>{alert.title}</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2, lineHeight: 1.5 }}>{alert.body}</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>{alert.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Good signals (collapsed under a lighter treatment) */}
        {goodAlerts.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
              On track
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {goodAlerts.map((alert) => (
                <div key={alert.title} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 8,
                  border: "1px solid rgba(5,150,105,0.15)",
                  background: "rgba(5,150,105,0.04)",
                }}>
                  <CheckCircle style={{ width: 14, height: 14, color: "#059669", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{alert.title}</span>
                  <span style={{ fontSize: 12, color: "#64748b", marginLeft: 4 }}>{alert.body}</span>
                  <span style={{ fontSize: 11.5, color: "#94a3b8", marginLeft: "auto", whiteSpace: "nowrap" }}>{alert.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Primary KPIs ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
            Today's summary
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
            border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12,
            overflow: "hidden", background: "#fff",
            boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
          }}>
            <KPICard strip isFirst label={messages.kpis.claimsWorkedToday} value={String(data.summary.claimsWorkedToday)} />
            <KPICard strip label={messages.kpis.avgResolutionTime} value={data.summary.avgResolutionTimeDays} variant="success" />
            <KPICard strip label={messages.kpis.slaCompliance} value={data.summary.slaCompliance} variant="success" />
            <KPICard strip label={messages.kpis.needsReview} value={String(data.summary.needsReview)} variant="warning" />
            <KPICard strip label={messages.kpis.claimsResolved} value={String(data.summary.claimsResolved)} variant="success" />
            <KPICard strip label={messages.kpis.avgTouchesPerClaim} value={data.summary.avgTouchesPerClaim} />
          </div>
        </div>

        {/* ── Automation KPIs ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
            Automation health
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
            border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12,
            overflow: "hidden", background: "#fff",
            boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
          }}>
            <KPICard strip isFirst label={messages.kpis.automationCoverage} value={data.agentOverview.automationCoverage} />
            <KPICard strip label={messages.kpis.reviewRate} value={data.agentOverview.reviewRate} variant="warning" />
            <KPICard strip label={messages.kpis.retryQueue} value={String(data.agentOverview.retryQueue)} variant="warning" />
            <KPICard strip label={messages.kpis.failedRuns} value={String(data.agentOverview.failedRuns)} variant="warning" />
            <KPICard strip label={messages.kpis.lowConfidenceRate} value={data.agentOverview.lowConfidenceRate} />
          </div>
        </div>

        {/* ── Charts ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <SectionCard
            title={messages.sections.resolutionSnapshotTitle}
            subtitle={messages.sections.resolutionSnapshotBody}
            icon={<TrendingUp style={{ width: 16, height: 16 }} />}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.resolutionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="resolved" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: "#059669" }} />
                <Line type="monotone" dataKey="unresolved" stroke="#dc2626" strokeWidth={2} dot={{ r: 3, fill: "#dc2626" }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard
            title={messages.sections.queueVolumeTitle}
            subtitle={messages.sections.queueVolumeBody}
            icon={<Clock style={{ width: 16, height: 16 }} />}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.queueVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" />
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 24 }}>
          <SectionCard title={messages.sections.agingDistributionTitle} subtitle={messages.sections.agingDistributionBody}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.agingBuckets} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value">
                  {data.agingBuckets.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Ops detail KPIs */}
          <div style={{
            border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12,
            background: "#fff", overflow: "hidden",
            boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
          }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Operations detail</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "none" }}>
              <KPICard strip isFirst label={messages.kpis.touchesRemoved} value={String(data.summary.touchesRemoved)} />
              <KPICard strip label={messages.kpis.claimsRequiringCall} value={String(data.summary.claimsRequiringCall)} variant="warning" />
              <KPICard strip isFirst label={messages.kpis.callRequiredRate} value={data.summary.phoneCallRate} variant="warning" />
              <KPICard strip label={messages.kpis.primaryConnectorSuccess} value={data.connectorHealth[0]?.successRate ?? "0%"} variant="success" />
            </div>
          </div>
        </div>

        {/* ── Payer performance table ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12,
            overflow: "hidden", background: "#fff",
            boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
          }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>{messages.sections.payerPerformanceTitle}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{messages.sections.payerPerformanceBody}</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
                    {[
                      messages.tables.payerPerformance.payer,
                      messages.tables.payerPerformance.openClaims,
                      messages.tables.payerPerformance.avgResolutionTime,
                      messages.tables.payerPerformance.slaRisk,
                      messages.tables.payerPerformance.needsReview,
                      messages.tables.payerPerformance.callRequired,
                      messages.tables.payerPerformance.lastDelay,
                    ].map((h) => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.payerPerformance.map((item, idx) => (
                    <tr key={item.payer} style={{
                      borderBottom: idx < data.payerPerformance.length - 1 ? "1px solid rgba(15,23,42,0.05)" : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(15,23,42,0.02)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={{ ...TD, fontWeight: 500, color: "#0f172a" }}>{item.payer}</td>
                      <td style={TD}>{item.openClaims}</td>
                      <td style={TD}>{item.avgResolutionTime}</td>
                      <td style={TD}>{riskBadge(item.risk, messages.riskLevel)}</td>
                      <td style={TD}>{item.reviewRate}</td>
                      <td style={TD}>{item.phoneCallRate}</td>
                      <td style={{ ...TD, color: "#64748b" }}>{item.lastDelay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Team performance table ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12,
            overflow: "hidden", background: "#fff",
            boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
          }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>{messages.sections.teamPerformanceTitle}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{messages.sections.teamPerformanceBody}</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
                    {[
                      messages.tables.teamPerformance.owner,
                      messages.tables.teamPerformance.activeClaims,
                      messages.tables.teamPerformance.resolved,
                      messages.tables.teamPerformance.avgTouches,
                      messages.tables.teamPerformance.slaCompliance,
                      messages.tables.teamPerformance.escalationRate,
                    ].map((h) => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.teamPerformance.map((item, idx) => (
                    <tr key={item.owner} style={{
                      borderBottom: idx < data.teamPerformance.length - 1 ? "1px solid rgba(15,23,42,0.05)" : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(15,23,42,0.02)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={{ ...TD, fontWeight: 500, color: "#0f172a" }}>{item.owner}</td>
                      <td style={TD}>{item.activeClaims}</td>
                      <td style={TD}>{item.resolvedThisWeek}</td>
                      <td style={TD}>{item.avgTouches}</td>
                      <td style={TD}>{item.slaCompliance}</td>
                      <td style={TD}>{item.escalationRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Connector health table ── */}
        <div style={{
          border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12,
          overflow: "hidden", background: "#fff",
          boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
        }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>{messages.sections.connectorHealthTitle}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{messages.sections.connectorHealthBody}</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
                  {[
                    messages.tables.connectorHealth.connector,
                    messages.tables.connectorHealth.mode,
                    messages.tables.connectorHealth.completed,
                    messages.tables.connectorHealth.retried,
                    messages.tables.connectorHealth.failed,
                    messages.tables.connectorHealth.successRate,
                    messages.tables.connectorHealth.lastActivity,
                    messages.tables.connectorHealth.lastError,
                  ].map((h) => <th key={h} style={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.connectorHealth.length > 0 ? data.connectorHealth.map((item, idx) => (
                  <tr key={`${item.connector}-${item.mode}`} style={{
                    borderBottom: idx < data.connectorHealth.length - 1 ? "1px solid rgba(15,23,42,0.05)" : "none",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(15,23,42,0.02)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    <td style={{ ...TD, fontWeight: 500, color: "#0f172a" }}>{item.connector}</td>
                    <td style={{ ...TD, textTransform: "capitalize" }}>{item.mode}</td>
                    <td style={TD}>{item.completed}</td>
                    <td style={TD}>{item.retried}</td>
                    <td style={TD}>{item.failed}</td>
                    <td style={TD}>{item.successRate}</td>
                    <td style={{ ...TD, color: "#64748b" }}>{item.lastActivity}</td>
                    <td style={{ ...TD, color: "#64748b", fontSize: 12 }}>{item.lastError}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} style={{ padding: "24px 16px", fontSize: 13, color: "#94a3b8", textAlign: "center" }}>
                      {messages.noConnectorActivity}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
