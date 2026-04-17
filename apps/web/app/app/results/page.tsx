import { hasPermission } from "@tenio/domain";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Search
} from "lucide-react";

import { KPICard } from "../../../components/kpi-card";
import { PageRoleBanner } from "../../../components/page-role-banner";
import { PilotErrorState } from "../../../components/pilot-error-state";
import { getLocaleMessages, getMessagesForLocale, getPilotErrorChrome } from "../../../lib/locale";
import { getCurrentSession, getResults } from "../../../lib/pilot-api";

import tableRowStyles from "./results-table.module.css";

export const dynamic = "force-dynamic";

const TH: React.CSSProperties = {
  padding: "10px 16px",
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
  padding: "12px 16px",
  fontSize: 13,
  color: "#374151",
  borderBottom: "1px solid rgba(15,23,42,0.05)",
};

function StatusBadge({ status, messages }: { status: string; messages: ReturnType<typeof getMessagesForLocale>["results"] }) {
  if (status === "Verified") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 6,
        border: "1px solid #bbf7d0", background: "#f0fdf4",
        fontSize: 11, fontWeight: 600, color: "#166534",
      }}>
        <CheckCircle style={{ width: 11, height: 11 }} />
        {messages.verifiedBadge}
      </span>
    );
  }
  if (status === "Verified with Review") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 6,
        border: "1px solid #bfdbfe", background: "#eff6ff",
        fontSize: 11, fontWeight: 600, color: "#1e40af",
      }}>
        <CheckCircle style={{ width: 11, height: 11 }} />
        {messages.verifiedWithReviewBadge}
      </span>
    );
  }
  if (status === "Needs Human Follow-up") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 6,
        border: "1px solid #fde68a", background: "#fffbeb",
        fontSize: 11, fontWeight: 600, color: "#92400e",
      }}>
        <AlertTriangle style={{ width: 11, height: 11 }} />
        {messages.needsFollowUpBadge}
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 6,
      border: "1px solid rgba(15,23,42,0.12)", background: "#f8fafc",
      fontSize: 11, fontWeight: 600, color: "#64748b",
    }}>
      <AlertCircle style={{ width: 11, height: 11 }} />
      {messages.unresolvedBadge}
    </span>
  );
}

export default async function ResultsPage() {
  try {
    const [{ items }, session, { messages }] = await Promise.all([
      getResults(),
      getCurrentSession(),
      getLocaleMessages()
    ]);
    const fallbackMessages = getMessagesForLocale("en");
    const resultsMessages = messages.results ?? fallbackMessages.results;
    const roleHelpTitle = messages.roleHelp?.title ?? fallbackMessages.roleHelp.title;
    const exportedCount = items.filter((item) => item.exportState === "Exported").length;
    const needsFollowUp = items.filter((item) => item.verifiedStatus.includes("Follow-up")).length;
    const canExport = session ? hasPermission(session.role, "claims:export") : false;
    const roleHelpBody =
      session && session.role !== "owner" ? resultsMessages.roleHelp[session.role] ?? null : null;

    const today = new Date();
    const todayLabel = today.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });

    return (
      <div style={{ height: "100%", overflowY: "auto", background: "#f8fafc" }}>
        <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>

          {/* Page heading */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>
              {todayLabel}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0f172a", letterSpacing: "-0.015em", lineHeight: 1.2, margin: 0 }}>
              {resultsMessages.heading}
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>{resultsMessages.subheading}</p>
          </div>

          {roleHelpBody ? <PageRoleBanner title={roleHelpTitle} body={roleHelpBody} /> : null}

          {/* KPI strip */}
          <div style={{
            display: "flex", background: "#fff",
            border: "1px solid rgba(15,23,42,0.08)", borderRadius: 10,
            boxShadow: "0 1px 4px rgba(15,23,42,0.04)", overflow: "hidden",
            marginBottom: 20,
          }}>
            <KPICard strip isFirst label={resultsMessages.kpis.verifiedResults} value={String(items.length)} variant="success" />
            <KPICard strip label={resultsMessages.kpis.needsFollowUp} value={String(needsFollowUp)} variant={needsFollowUp > 0 ? "warning" : "neutral"} />
            <KPICard strip label={resultsMessages.kpis.exported} value={String(exportedCount)} subtext={`of ${items.length} total`} />
            <KPICard strip label="Export rate" value={items.length > 0 ? `${Math.round((exportedCount / items.length) * 100)}%` : "—"} />
          </div>

          {items.length === 0 ? (
            <div style={{
              background: "#fff", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 10,
              padding: "48px 24px", textAlign: "center",
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>{resultsMessages.empty.title}</h2>
              <p style={{ fontSize: 13, color: "#64748b", maxWidth: 420, margin: "0 auto 20px" }}>{resultsMessages.empty.body}</p>
              <Link
                href="/app/queue"
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "8px 18px", borderRadius: 9999,
                  background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  textDecoration: "none",
                }}
              >
                {resultsMessages.empty.cta}
              </Link>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#fff", border: "1px solid rgba(15,23,42,0.08)",
                borderRadius: 10, padding: "12px 16px",
                boxShadow: "0 1px 4px rgba(15,23,42,0.04)", marginBottom: 12,
              }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder={resultsMessages.searchPlaceholder}
                    style={{
                      width: "100%", padding: "7px 12px 7px 32px",
                      border: "1px solid rgba(15,23,42,0.1)", borderRadius: 8,
                      fontSize: 13, color: "#374151", background: "#f8fafc",
                      outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
                <button style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 8,
                  border: "1px solid rgba(15,23,42,0.1)", background: "#fff",
                  fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer",
                }}>
                  <Filter style={{ width: 13, height: 13 }} />
                  {resultsMessages.filtersButton}
                  <ChevronDown style={{ width: 13, height: 13 }} />
                </button>
                {canExport ? (
                  <form action="/api/results/export" method="post">
                    <button
                      type="submit"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 16px", borderRadius: 9999,
                        background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                        fontSize: 13, fontWeight: 600, color: "#fff",
                        border: "none", cursor: "pointer",
                      }}
                    >
                      <Download style={{ width: 13, height: 13 }} />
                      {resultsMessages.exportButton}
                    </button>
                  </form>
                ) : null}
              </div>

              {/* Table */}
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
                          resultsMessages.headers.resultId,
                          resultsMessages.headers.claimId,
                          resultsMessages.headers.payer,
                          resultsMessages.headers.verifiedStatus,
                          resultsMessages.headers.lastVerified,
                          resultsMessages.headers.evidence,
                          resultsMessages.headers.exportState,
                          resultsMessages.headers.actions,
                        ].map((header) => (
                          <th key={header} style={TH}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.resultId} className={tableRowStyles.row}>
                          <td style={TD}>
                            <Link
                              href={`/app/result/${item.resultId}`}
                              style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}
                            >
                              {item.resultId}
                            </Link>
                          </td>
                          <td style={TD}>
                            <Link
                              href={`/app/claim/${item.claimId}`}
                              style={{ fontSize: 13, color: "#374151", textDecoration: "none" }}
                            >
                              {item.claimNumber}
                            </Link>
                          </td>
                          <td style={{ ...TD, fontWeight: 500, color: "#0f172a" }}>{item.payer}</td>
                          <td style={TD}>
                            <StatusBadge status={item.verifiedStatus} messages={resultsMessages} />
                          </td>
                          <td style={{ ...TD, color: "#64748b" }}>{item.lastVerified}</td>
                          <td style={TD}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <FileText style={{ width: 13, height: 13, color: "#94a3b8" }} />
                              <span style={{ fontSize: 13, color: "#64748b" }}>{item.evidenceCount}</span>
                            </div>
                          </td>
                          <td style={TD}>
                            <span style={{
                              display: "inline-flex", padding: "2px 8px", borderRadius: 6,
                              fontSize: 11, fontWeight: 600,
                              ...(item.exportState === "Exported"
                                ? { border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#166534" }
                                : { border: "1px solid rgba(15,23,42,0.1)", background: "#f8fafc", color: "#64748b" }),
                            }}>
                              {item.exportState}
                            </span>
                          </td>
                          <td style={{ ...TD, textAlign: "right" }}>
                            <Link
                              href={`/app/result/${item.resultId}`}
                              style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}
                            >
                              {resultsMessages.common.view}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 16px", borderTop: "1px solid rgba(15,23,42,0.07)",
                }}>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {resultsMessages.common.visibleSummary}:{" "}
                    <span style={{ fontWeight: 600, color: "#374151" }}>{items.length}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {["Previous", "1", "2", "3", "112", "Next"].map((item, index) => (
                      <button
                        key={item}
                        style={{
                          padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                          ...(index === 1
                            ? { background: "#2563eb", color: "#fff", border: "1px solid #2563eb", fontWeight: 600 }
                            : { background: "#fff", color: "#374151", border: "1px solid rgba(15,23,42,0.1)" }),
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  } catch {
    const { messages } = await getLocaleMessages();
    const err = getPilotErrorChrome(messages);
    return (
      <PilotErrorState
        eyebrow={err.eyebrow}
        openPilotGuide={err.openPilotGuide}
        contactSupport={err.contactSupport}
        title={err.resultsUnavailableTitle}
        body={err.resultsUnavailableBody}
      />
    );
  }
}
