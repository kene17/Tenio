"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { hasPermission, type UserRole } from "@tenio/domain";
import { ChevronDown, Download, Plus, Search, X } from "lucide-react";

import { IntakeClaimForm } from "../../../components/intake-claim-form";
import { KPICard } from "../../../components/kpi-card";
import { PageRoleBanner } from "../../../components/page-role-banner";
import { StatusPill, statusVariantFromText } from "../../../components/status-pill";
import { getClaimStatusLabel } from "../../../lib/display-labels";
import type { TenioMessages } from "../../../lib/locale";
import type { ClaimsListItemView } from "../../../lib/pilot-api";
import fallbackMessages from "../../../messages/en.json";

type ClaimsClientProps = {
  items: ClaimsListItemView[];
  organizationId: string;
  currentRole: UserRole;
  messages: TenioMessages["claims"];
  roleHelpTitle: string;
  payerOptions: Array<{
    id: string;
    label: string;
    jurisdiction: "us" | "ca";
    countryCode: "US" | "CA";
  }>;
};

type SortOption =
  | "ops_default"
  | "claim_asc"
  | "claim_desc"
  | "payer_asc"
  | "service_date_desc"
  | "updated_desc"
  | "priority_desc";

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "ops_default", label: "Ops priority" },
  { value: "claim_asc", label: "Claim ID A-Z" },
  { value: "claim_desc", label: "Claim ID Z-A" },
  { value: "payer_asc", label: "Payer A-Z" },
  { value: "service_date_desc", label: "Newest service date" },
  { value: "updated_desc", label: "Recently updated" },
  { value: "priority_desc", label: "Highest priority" }
];

const TH: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#94a3b8",
  background: "#f8faff",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: "#374151",
  verticalAlign: "middle",
};

function sortItems(items: ClaimsListItemView[], sortBy: SortOption) {
  const priorityRank: Record<ClaimsListItemView["priority"], number> = {
    urgent: 0, high: 1, normal: 2, low: 3
  };
  return [...items].sort((a, b) => {
    if (sortBy === "claim_asc") return a.claimNumber.localeCompare(b.claimNumber);
    if (sortBy === "claim_desc") return b.claimNumber.localeCompare(a.claimNumber);
    if (sortBy === "payer_asc") return a.payerName.localeCompare(b.payerName);
    if (sortBy === "service_date_desc") return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
    if (sortBy === "updated_desc") return new Date(b.lastTouchedAt).getTime() - new Date(a.lastTouchedAt).getTime();
    if (sortBy === "priority_desc") return priorityRank[a.priority] - priorityRank[b.priority];
    const resRank = (v: ClaimsListItemView["resolutionState"]) =>
      v === "Escalated" ? 0 : v === "In Progress" ? 1 : 2;
    const rd = resRank(a.resolutionState) - resRank(b.resolutionState);
    if (rd !== 0) return rd;
    const pd = priorityRank[a.priority] - priorityRank[b.priority];
    if (pd !== 0) return pd;
    return a.claimNumber.localeCompare(b.claimNumber);
  });
}

export function ClaimsClient({
  items,
  organizationId,
  currentRole,
  messages,
  roleHelpTitle,
  payerOptions
}: ClaimsClientProps) {
  const claimsMessages = messages ?? fallbackMessages.claims;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("ops_default");
  const [intakeOpen, setIntakeOpen] = useState(false);
  const canExport = hasPermission(currentRole, "claims:export");
  const canMutate = hasPermission(currentRole, "claims:write");
  const roleHelpBody = currentRole === "owner" ? null : claimsMessages.roleHelp[currentRole] ?? null;

  const filteredItems = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    const searched = s.length === 0 ? items : items.filter((item) =>
      [item.claimNumber, item.payerName, item.patientName, item.claimType ?? "",
       item.serviceProviderType ?? "", item.serviceCode ?? "", item.provinceOfService ?? "",
       item.countryCode, item.owner ?? "", item.followUpReason, item.serviceDate]
        .join(" ").toLowerCase().includes(s)
    );
    return sortItems(searched, sortBy);
  }, [items, searchTerm, sortBy]);

  const resolved = items.filter((i) => i.resolutionState === "Resolved").length;
  const active = items.length - resolved;

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>

      {/* ── Intake modal (Fix 2) ── */}
      {intakeOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px",
        }}>
          <div style={{
            width: "100%", maxWidth: 580, background: "#fff", borderRadius: 16,
            border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 24px 80px rgba(15,23,42,0.16)", overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 24px", borderBottom: "1px solid rgba(15,23,42,0.07)",
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.015em" }}>
                  {claimsMessages.intakeLabel}
                </h2>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{claimsMessages.intakeBody}</p>
              </div>
              <button onClick={() => setIntakeOpen(false)} style={{
                background: "rgba(15,23,42,0.05)", border: "none", cursor: "pointer",
                padding: 7, borderRadius: 8, color: "#64748b",
              }}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
            <div style={{ padding: "20px 24px 24px" }}>
              <IntakeClaimForm organizationId={organizationId} payerOptions={payerOptions} />
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "32px 28px 40px" }}>

        {/* ── Heading (Fix 1 + Fix 4) ── */}
        <div style={{ marginBottom: 28 }}>
          {/* Fix 1: Clear distinction from Queue */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12,
            padding: "5px 12px", borderRadius: 9999,
            background: "rgba(15,23,42,0.04)", border: "1px solid rgba(15,23,42,0.07)",
            fontSize: 12, color: "#64748b",
          }}>
            <span>Looking for today's prioritised worklist?</span>
            <Link href="/app/queue" style={{ fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
              Go to Queue →
            </Link>
          </div>
          <h1 style={{
            fontFamily: "var(--font-inter, system-ui, sans-serif)",
            fontWeight: 700, fontSize: 22, color: "#0f172a",
            letterSpacing: "-0.025em", lineHeight: 1.25, marginBottom: 4,
          }}>
            {claimsMessages.heading}
          </h1>
          <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.55 }}>{claimsMessages.subheading}</p>
        </div>

        {roleHelpBody ? <PageRoleBanner title={roleHelpTitle} body={roleHelpBody} /> : null}

        {/* ── KPI strip ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12,
          overflow: "hidden", background: "#fff",
          boxShadow: "0 1px 6px rgba(15,23,42,0.04)", marginBottom: 24,
        }}>
          <KPICard strip isFirst label={claimsMessages.kpis.total} value={String(items.length)} />
          <KPICard strip label={claimsMessages.kpis.active} value={String(active)} variant="warning" />
          <KPICard strip label={claimsMessages.kpis.resolved} value={String(resolved)} variant="success" />
          <KPICard strip label={claimsMessages.kpis.visible} value={String(filteredItems.length)} />
        </div>

        {/* ── Table card ── */}
        <div style={{
          border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12,
          overflow: "hidden", background: "#fff",
          boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
        }}>
          {/* Toolbar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", borderBottom: "1px solid rgba(15,23,42,0.06)",
          }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search style={{
                position: "absolute", top: "50%", left: 10,
                transform: "translateY(-50%)", width: 14, height: 14,
                color: "#94a3b8", pointerEvents: "none",
              }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={claimsMessages.searchPlaceholder}
                style={{
                  width: "100%", paddingLeft: 32, paddingRight: 12,
                  paddingTop: 7, paddingBottom: 7, borderRadius: 8,
                  border: "1px solid rgba(15,23,42,0.10)",
                  fontSize: 13, color: "#0f172a", background: "#f8faff",
                  outline: "none", boxSizing: "border-box",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(37,99,235,0.35)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(15,23,42,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <div style={{ position: "relative", flexShrink: 0 }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{
                  appearance: "none", padding: "7px 32px 7px 12px",
                  borderRadius: 8, border: "1px solid rgba(15,23,42,0.10)",
                  fontSize: 13, fontWeight: 500, color: "#374151",
                  background: "#fff", cursor: "pointer", outline: "none",
                }}
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{claimsMessages.sortOptions[o.value]}</option>
                ))}
              </select>
              <ChevronDown style={{
                position: "absolute", top: "50%", right: 10,
                transform: "translateY(-50%)", width: 13, height: 13,
                color: "#94a3b8", pointerEvents: "none",
              }} />
            </div>

            {canMutate && (
              <button
                onClick={() => setIntakeOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 8, flexShrink: 0,
                  background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
                  color: "#fff", fontSize: 13, fontWeight: 600,
                  border: "none", cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(37,99,235,0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(37,99,235,0.25)"; }}
              >
                <Plus style={{ width: 14, height: 14 }} />
                Add Claim
              </button>
            )}

            {canExport && (
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, flexShrink: 0,
                border: "1px solid rgba(15,23,42,0.10)", background: "#fff",
                fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer",
              }}>
                <Download style={{ width: 13, height: 13 }} />
                {claimsMessages.exportButton}
              </button>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div style={{ padding: "56px 24px", textAlign: "center" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                {items.length === 0 ? claimsMessages.empty.title : claimsMessages.noSearch.title}
              </h2>
              <p style={{ fontSize: 13.5, color: "#64748b", maxWidth: 360, margin: "0 auto 20px", lineHeight: 1.55 }}>
                {items.length === 0 ? claimsMessages.empty.body : claimsMessages.noSearch.body}
              </p>
              {items.length === 0 ? (
                <Link href="/app/onboarding" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "9px 18px", borderRadius: 9999,
                  background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
                  color: "#fff", fontSize: 13.5, fontWeight: 600, textDecoration: "none",
                  boxShadow: "0 2px 10px rgba(37,99,235,0.28)",
                }}>
                  {claimsMessages.empty.cta}
                </Link>
              ) : (
                <button onClick={() => setSearchTerm("")} style={{
                  padding: "9px 18px", borderRadius: 9999,
                  border: "1px solid rgba(15,23,42,0.13)", background: "#fff",
                  fontSize: 13.5, fontWeight: 500, color: "#374151", cursor: "pointer",
                }}>
                  {claimsMessages.clearFilters}
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
                      {[
                        claimsMessages.headers.claim,
                        claimsMessages.headers.payer,
                        claimsMessages.headers.service,
                        claimsMessages.headers.status,
                        claimsMessages.headers.owner,
                        claimsMessages.headers.resolution,
                        claimsMessages.headers.nextAction,
                        claimsMessages.headers.actions,
                      ].map((h) => <th key={h} style={TH}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: idx < filteredItems.length - 1 ? "1px solid rgba(15,23,42,0.05)" : "none",
                          cursor: "pointer", transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(15,23,42,0.02)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                      >
                        <td style={TD}>
                          <Link
                            href={`/app/claim/${item.claimId}`}
                            style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}
                            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                          >
                            {item.claimNumber}
                          </Link>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {item.claimType ?? claimsMessages.common.unspecified}
                            {item.serviceProviderType ? ` · ${item.serviceProviderType.replaceAll("_", " ")}` : ""}
                            {item.provinceOfService ? ` · ${item.provinceOfService}` : ""}
                          </div>
                        </td>
                        <td style={TD}>
                          <div style={{ fontWeight: 500, color: "#0f172a" }}>{item.payerName}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {item.countryCode} / {item.jurisdiction.toUpperCase()}
                          </div>
                        </td>
                        <td style={{ ...TD, color: "#64748b" }}>
                          <div>{item.serviceDate}</div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {item.serviceCode ?? claimsMessages.common.noServiceCode}
                          </div>
                        </td>
                        <td style={TD}>
                          <StatusPill variant={statusVariantFromText(item.currentStatus)}>
                            {getClaimStatusLabel(item.currentStatus, claimsMessages.status)}
                          </StatusPill>
                        </td>
                        <td style={{ ...TD, color: item.owner ? "#374151" : "#cbd5e1" }}>
                          {item.owner ?? claimsMessages.common.unassigned}
                        </td>
                        <td style={TD}>
                          <span style={{
                            display: "inline-flex", padding: "2px 7px", borderRadius: 4,
                            fontSize: 11, fontWeight: 600,
                            ...(item.resolutionState === "Resolved"
                              ? { background: "rgba(5,150,105,0.07)", color: "#059669", border: "1px solid rgba(5,150,105,0.15)" }
                              : item.resolutionState === "Escalated"
                              ? { background: "rgba(220,38,38,0.07)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.15)" }
                              : { background: "rgba(37,99,235,0.07)", color: "#2563eb", border: "1px solid rgba(37,99,235,0.15)" })
                          }}>
                            {item.resolutionState}
                          </span>
                        </td>
                        <td style={{ ...TD, fontSize: 12, color: "#64748b", maxWidth: 160 }}>
                          {item.followUpReason}
                        </td>
                        <td style={{ ...TD, textAlign: "right" }}>
                          <Link
                            href={`/app/claim/${item.claimId}`}
                            style={{ fontSize: 12.5, fontWeight: 500, color: "#2563eb", textDecoration: "none" }}
                            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                          >
                            {claimsMessages.common.view}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", borderTop: "1px solid rgba(15,23,42,0.06)",
                fontSize: 12.5, color: "#94a3b8",
              }}>
                <span>{claimsMessages.common.visibleSummary}: <span style={{ fontWeight: 600, color: "#374151" }}>{filteredItems.length}</span></span>
                <span>{claimsMessages.common.sortedBySelection}</span>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <Link href="/app/queue" style={{ fontSize: 13, fontWeight: 500, color: "#2563eb", textDecoration: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
          >
            {claimsMessages.goToQueueCta} →
          </Link>
        </div>
      </div>
    </div>
  );
}
