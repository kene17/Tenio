"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { hasPermission, type UserRole } from "@tenio/domain";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Search,
  ShieldAlert,
  X
} from "lucide-react";

import { ClaimRetrieveButton } from "../../../components/claim-retrieve-button";
import { ConfidenceBadge } from "../../../components/confidence-badge";
import { KPICard } from "../../../components/kpi-card";
import { PageRoleBanner } from "../../../components/page-role-banner";
import { StatusPill, statusVariantFromText } from "../../../components/status-pill";
import { cn } from "../../../lib/cn";
import type {
  OnboardingStateView,
  OnboardingStepId,
  QueueItemView
} from "../../../lib/pilot-api";
import type { TenioMessages } from "../../../lib/locale";
import fallbackMessages from "../../../messages/en.json";

type QueueClientProps = {
  items: QueueItemView[];
  hasAnyClaims: boolean;
  currentRole: UserRole;
  queueMessages: TenioMessages["queue"];
  retrieveMessages: TenioMessages["retrieve"];
  roleHelpTitle: string;
  onboardingMessages: TenioMessages["onboarding"];
  onboardingState: OnboardingStateView | null;
};

function getPriorityIcon(priority: QueueItemView["priority"]) {
  if (priority === "urgent") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 24, height: 24, borderRadius: "50%",
        background: "rgba(220,38,38,0.08)",
      }}>
        <AlertCircle style={{ width: 13, height: 13, color: "#dc2626" }} />
      </span>
    );
  }
  if (priority === "high") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 24, height: 24, borderRadius: "50%",
        background: "rgba(245,158,11,0.08)",
      }}>
        <AlertTriangle style={{ width: 13, height: 13, color: "#d97706" }} />
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 24, height: 24, borderRadius: "50%",
      background: "rgba(15,23,42,0.04)",
    }}>
      <Clock style={{ width: 13, height: 13, color: "#94a3b8" }} />
    </span>
  );
}

function getSLABadge(risk: QueueItemView["slaRisk"], messages: TenioMessages["queue"]["sla"]) {
  if (risk === "breached") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 7px", borderRadius: 4,
        background: "rgba(220,38,38,0.07)",
        color: "#dc2626", fontSize: 11, fontWeight: 600,
        border: "1px solid rgba(220,38,38,0.15)",
      }}>
        <AlertCircle style={{ width: 10, height: 10 }} />
        {messages.overdue}
      </span>
    );
  }
  if (risk === "at-risk") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 7px", borderRadius: 4,
        background: "rgba(245,158,11,0.07)",
        color: "#b45309", fontSize: 11, fontWeight: 600,
        border: "1px solid rgba(245,158,11,0.18)",
      }}>
        <AlertTriangle style={{ width: 10, height: 10 }} />
        {messages.atRisk}
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 7px", borderRadius: 4,
      background: "rgba(5,150,105,0.07)",
      color: "#059669", fontSize: 11, fontWeight: 600,
      border: "1px solid rgba(5,150,105,0.15)",
    }}>
      <CheckCircle style={{ width: 10, height: 10 }} />
      {messages.onTrack}
    </span>
  );
}

function ownerInitials(owner: string | null) {
  if (!owner) return "—";
  return owner.split(" ").map((n) => n[0]).join("");
}

function serviceSummary(claim: QueueItemView) {
  return [claim.serviceProviderType?.replaceAll("_", " "), claim.serviceCode]
    .filter(Boolean)
    .join(" · ");
}

function sortQueueItems(items: QueueItemView[]) {
  const priorityRank: Record<QueueItemView["priority"], number> = { urgent: 0, high: 1, normal: 2, low: 3 };
  const slaRank: Record<QueueItemView["slaRisk"], number> = { breached: 0, "at-risk": 1, healthy: 2 };

  return [...items].sort((a, b) => {
    const pd = priorityRank[a.priority] - priorityRank[b.priority];
    if (pd !== 0) return pd;
    const sd = slaRank[a.slaRisk] - slaRank[b.slaRisk];
    if (sd !== 0) return sd;
    return new Date(a.lastTouchedAt).getTime() - new Date(b.lastTouchedAt).getTime();
  });
}

const queueTourTargets = ["priority", "claim", "sla"] as const;

function setupStatusBadge(
  status: OnboardingStateView["steps"][number]["status"],
  messages: TenioMessages["onboarding"]
) {
  if (status === "complete") {
    return (
      <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 9999, border: "1px solid rgba(5,150,105,0.2)", background: "rgba(5,150,105,0.06)", fontSize: 11, fontWeight: 600, color: "#059669" }}>
        {messages.setup.statusComplete}
      </span>
    );
  }
  if (status === "current") {
    return (
      <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 9999, border: "1px solid rgba(37,99,235,0.2)", background: "rgba(37,99,235,0.06)", fontSize: 11, fontWeight: 600, color: "#2563eb" }}>
        {messages.setup.statusCurrent}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", padding: "2px 8px", borderRadius: 9999, border: "1px solid rgba(15,23,42,0.1)", background: "rgba(15,23,42,0.03)", fontSize: 11, fontWeight: 600, color: "#64748b" }}>
      {messages.setup.statusPending}
    </span>
  );
}

const COL_STYLE: React.CSSProperties = {
  padding: "10px 14px",
  fontSize: 13,
  color: "#374151",
  verticalAlign: "middle",
};

const TH_STYLE: React.CSSProperties = {
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

export function QueueClient({
  items,
  hasAnyClaims,
  currentRole,
  queueMessages,
  retrieveMessages,
  roleHelpTitle,
  onboardingMessages,
  onboardingState
}: QueueClientProps) {
  const queueOnboardingMessages = onboardingMessages ?? fallbackMessages.onboarding;
  const messages = queueMessages ?? fallbackMessages.queue;
  const setupMessages = queueOnboardingMessages.setup;

  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [setupState, setSetupState] = useState<OnboardingStateView | null>(onboardingState);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredItems = useMemo(() => {
    const matching = items.filter((item) => {
      const matchesSearch =
        searchTerm.length === 0 ||
        [item.claimNumber, item.patientName, item.payerName, item.claimType ?? "",
         item.serviceProviderType ?? "", item.serviceCode ?? "", item.provinceOfService ?? "",
         item.countryCode ?? "", item.owner ?? "", item.queueReason]
          .join(" ").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        activeFilters.length === 0 ||
        (activeFilters.includes("SLA: At Risk") && (item.slaRisk === "at-risk" || item.slaRisk === "breached"));
      return matchesSearch && matchesFilter;
    });
    return sortQueueItems(matching);
  }, [activeFilters, items, searchTerm]);

  const selectedClaim = selectedClaimId === null
    ? null
    : filteredItems.find((item) => item.claimId === selectedClaimId) ?? null;

  const openClaims = items.length;
  const needsReview = items.filter((i) => i.claimStatus.includes("Review")).length;
  const atRisk = items.filter((i) => i.slaRisk === "at-risk" || i.slaRisk === "breached").length;
  const avgConfidence = items.length > 0
    ? `${Math.round(items.reduce((s, i) => s + i.confidence, 0) / items.length)}%`
    : "0%";

  const shouldShowWelcome = setupState?.welcome.shouldShow ?? false;
  const shouldShowTour = Boolean(setupState?.queueTour.shouldShow) && !shouldShowWelcome && isDesktopLayout;
  const activeTourTarget = shouldShowTour ? queueTourTargets[tourStepIndex] : null;
  const canRequestStatus = hasPermission(currentRole, "queue:work");
  const roleHelpBody = currentRole === "owner" ? null : messages.roleHelp[currentRole] ?? null;
  const isFiltering = searchTerm.trim().length > 0 || activeFilters.length > 0;

  const todayLabel = new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  useEffect(() => { setSetupState(onboardingState); }, [onboardingState]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopLayout(mq.matches);
    sync(); mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!shouldShowTour) { setTourStepIndex(0); return; }
    const selector = activeTourTarget ? `[data-tour="${activeTourTarget}"]` : null;
    const target = selector ? document.querySelector<HTMLElement>(selector) : null;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeTourTarget, shouldShowTour]);

  async function updateOnboarding(action: "dismiss_welcome" | "complete_queue_tour") {
    const res = await fetch("/api/onboarding/state", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action })
    });
    if (!res.ok) throw new Error(setupMessages.updateError);
    const payload = (await res.json()) as { item: OnboardingStateView };
    setSetupState(payload.item);
    setSetupError(null);
  }

  function stepCopy(stepId: OnboardingStepId) { return setupMessages.steps[stepId]; }

  function completeTour() {
    startTransition(async () => {
      try { await updateOnboarding("complete_queue_tour"); }
      catch (err) { setSetupError(err instanceof Error ? err.message : setupMessages.updateError); }
    });
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* ── Main scroll area ── */}
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        <div style={{ padding: "32px 28px 40px" }}>

          {/* ── Welcome modal ── */}
          {shouldShowWelcome ? (
            <div style={{
              position: "fixed", inset: 0, zIndex: 40,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px",
              background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)",
            }}>
              <div style={{
                width: "100%", maxWidth: 560,
                background: "#fff", borderRadius: 18,
                border: "1px solid rgba(15,23,42,0.08)",
                boxShadow: "0 24px 80px rgba(15,23,42,0.16)",
                padding: 28,
              }}>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2563eb" }}>
                    {setupMessages.welcomeEyebrow}
                  </span>
                  <h2 style={{ fontFamily: "var(--font-inter, system-ui, sans-serif)", fontWeight: 700, fontSize: 20, color: "#0f172a", letterSpacing: "-0.02em", marginTop: 6, marginBottom: 6 }}>
                    {setupMessages.welcomeTitle}
                  </h2>
                  <p style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.6 }}>{setupMessages.welcomeBody}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {setupState?.steps.map((step) => {
                    const copy = stepCopy(step.id);
                    return (
                      <div key={step.id} style={{
                        display: "flex", flexDirection: "column", gap: 4,
                        border: "1px solid rgba(15,23,42,0.07)", borderRadius: 10,
                        padding: "12px 16px", background: "#f8faff",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {setupStatusBadge(step.status, queueOnboardingMessages)}
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>{copy.title}</span>
                        </div>
                        <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>{copy.description}</p>
                      </div>
                    );
                  })}
                </div>
                {setupError && (
                  <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", fontSize: 13, color: "#dc2626" }}>
                    {setupError}
                  </div>
                )}
                <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <Link
                    href="/app/onboarding"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "9px 18px", borderRadius: 9999,
                      background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
                      color: "#fff", fontSize: 13.5, fontWeight: 600, textDecoration: "none",
                      boxShadow: "0 2px 10px rgba(37,99,235,0.28)",
                    }}
                  >
                    {setupMessages.openSetupChecklist}
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </Link>
                  <div style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      disabled={!setupState?.welcome.dismissible || isPending}
                      onClick={() => startTransition(async () => {
                        try { await updateOnboarding("dismiss_welcome"); }
                        catch (err) { setSetupError(err instanceof Error ? err.message : setupMessages.updateError); }
                      })}
                      style={{
                        padding: "8px 16px", borderRadius: 9999,
                        border: "1px solid rgba(15,23,42,0.13)", background: "#fff",
                        fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer",
                        opacity: (!setupState?.welcome.dismissible || isPending) ? 0.5 : 1,
                      }}
                    >
                      {setupMessages.skipForNow}
                    </button>
                    {!setupState?.welcome.dismissible && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{setupMessages.skipLockedMessage}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Tour tooltip ── */}
          {shouldShowTour ? (
            <div style={{
              position: "fixed", right: 24, bottom: 24, zIndex: 30,
              width: "100%", maxWidth: 340,
              background: "#fff", borderRadius: 16,
              border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 16px 48px rgba(15,23,42,0.14)",
              padding: 20,
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2563eb", marginBottom: 6 }}>
                {setupMessages.tourEyebrow} {tourStepIndex + 1} / {queueTourTargets.length}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                {activeTourTarget ? setupMessages.tour[activeTourTarget].title : setupMessages.tour.priority.title}
              </h3>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.55 }}>
                {activeTourTarget ? setupMessages.tour[activeTourTarget].body : setupMessages.tour.priority.body}
              </p>
              {setupError && (
                <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 7, border: "1px solid rgba(220,38,38,0.2)", background: "rgba(220,38,38,0.06)", fontSize: 12, color: "#dc2626" }}>
                  {setupError}
                </div>
              )}
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <button
                  type="button"
                  onClick={completeTour}
                  disabled={isPending}
                  style={{ padding: "7px 14px", borderRadius: 9999, border: "1px solid rgba(15,23,42,0.13)", background: "#fff", fontSize: 12.5, fontWeight: 500, color: "#374151", cursor: "pointer" }}
                >
                  {setupMessages.skipTour}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (tourStepIndex === queueTourTargets.length - 1) { completeTour(); return; }
                    setTourStepIndex((c) => c + 1);
                  }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 16px", borderRadius: 9999,
                    background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
                    color: "#fff", fontSize: 12.5, fontWeight: 600, border: "none", cursor: "pointer",
                  }}
                >
                  {tourStepIndex === queueTourTargets.length - 1 ? setupMessages.finishTour : setupMessages.nextTourStep}
                  <ChevronRight style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>
          ) : null}

          {/* ── Page heading ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#2563eb", marginBottom: 6 }}>
              {todayLabel}
            </div>
            <h1 style={{
              fontFamily: "var(--font-inter, system-ui, sans-serif)",
              fontWeight: 700, fontSize: 22,
              color: "#0f172a", letterSpacing: "-0.025em",
              lineHeight: 1.25, marginBottom: 4,
            }}>
              {messages.heading}
            </h1>
            <p style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.55 }}>{messages.subheading}</p>
          </div>

          {roleHelpBody ? <PageRoleBanner title={roleHelpTitle} body={roleHelpBody} /> : null}

          {/* ── KPI strip ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
              {messages.overviewLabel}
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              border: "1px solid rgba(15,23,42,0.08)",
              borderRadius: 12,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
            }}>
              <KPICard strip isFirst label={messages.kpis.openClaims} value={String(openClaims)} />
              <KPICard strip label={messages.kpis.needsReview} value={String(needsReview)} variant="warning" />
              <KPICard strip label={messages.kpis.atRisk} value={String(atRisk)} variant="warning" />
              <KPICard strip label={messages.kpis.evidenceAttached} value={String(items.filter((i) => i.evidenceCount > 0).length)} variant="success" />
              <KPICard strip label={messages.kpis.avgConfidence} value={avgConfidence} />
              <KPICard strip label={messages.kpis.workspace} value="1" variant="success" />
            </div>
          </div>

          {/* ── Table card ── */}
          <div style={{
            border: "1px solid rgba(15,23,42,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 1px 6px rgba(15,23,42,0.04)",
          }}>
            {/* Search + filter toolbar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px",
              borderBottom: "1px solid rgba(15,23,42,0.06)",
              background: "#fff",
            }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", width: 14, height: 14, color: "#94a3b8", pointerEvents: "none" }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={messages.filterPlaceholder}
                  style={{
                    width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                    borderRadius: 8, border: "1px solid rgba(15,23,42,0.10)",
                    fontSize: 13, color: "#0f172a", background: "#f8faff", outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(37,99,235,0.35)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(15,23,42,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8,
                border: "1px solid rgba(15,23,42,0.10)", background: "#fff",
                fontSize: 13, fontWeight: 500, color: "#374151", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f8faff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
              >
                <Filter style={{ width: 13, height: 13 }} />
                {messages.filtersButton}
                <ChevronDown style={{ width: 13, height: 13, color: "#94a3b8" }} />
              </button>
            </div>

            {/* Active filter chips */}
            {activeFilters.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "8px 16px", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                <span style={{ fontSize: 11.5, color: "#64748b" }}>{messages.activeFiltersLabel}</span>
                {activeFilters.map((f) => (
                  <span key={f} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 9999,
                    border: "1px solid rgba(37,99,235,0.2)", background: "rgba(37,99,235,0.06)",
                    fontSize: 11.5, color: "#2563eb",
                  }}>
                    {f}
                    <button onClick={() => setActiveFilters((c) => c.filter((x) => x !== f))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#2563eb", display: "flex" }}>
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  </span>
                ))}
                <button onClick={() => setActiveFilters([])} style={{ fontSize: 11.5, color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>
                  {messages.clearAllFilters}
                </button>
              </div>
            )}

            {/* Empty state */}
            {filteredItems.length === 0 ? (
              <div style={{ padding: "56px 24px", textAlign: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(37,99,235,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <ShieldAlert style={{ width: 18, height: 18, color: "#2563eb" }} />
                </div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                  {isFiltering ? messages.empty.noMatchesTitle : hasAnyClaims ? messages.empty.noAttentionTitle : messages.empty.noClaimsTitle}
                </h2>
                <p style={{ fontSize: 13.5, color: "#64748b", maxWidth: 360, margin: "0 auto 20px", lineHeight: 1.55 }}>
                  {isFiltering ? messages.empty.noMatchesBody : hasAnyClaims ? messages.empty.noAttentionBody : messages.empty.noClaimsBody}
                </p>
                {!isFiltering && (
                  <Link href="/app/onboarding" style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "9px 18px", borderRadius: 9999,
                    background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
                    color: "#fff", fontSize: 13.5, fontWeight: 600, textDecoration: "none",
                    boxShadow: "0 2px 10px rgba(37,99,235,0.28)",
                  }}>
                    {hasAnyClaims ? messages.empty.noAttentionCta : messages.empty.noClaimsCta}
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
                        {[
                          { label: messages.columns.priority, tour: "priority" },
                          { label: messages.columns.claimId, tour: "claim" },
                          { label: messages.columns.patient },
                          { label: messages.columns.payer },
                          { label: messages.columns.status },
                          { label: messages.columns.nextAction },
                          { label: messages.columns.owner },
                          { label: messages.columns.sla, tour: "sla" },
                        ].map(({ label, tour }) => (
                          <th
                            key={label}
                            data-tour={tour ?? undefined}
                            style={{
                              ...TH_STYLE,
                              ...(activeTourTarget !== null && activeTourTarget === tour
                                ? { background: "rgba(37,99,235,0.07)", color: "#2563eb", outline: "2px solid #2563eb", outlineOffset: -2, borderRadius: 4 }
                                : {})
                            }}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((claim, idx) => {
                        const isSelected = selectedClaimId === claim.claimId;
                        return (
                          <tr
                            key={claim.claimId}
                            onClick={() => setSelectedClaimId(claim.claimId)}
                            style={{
                              borderBottom: idx < filteredItems.length - 1 ? "1px solid rgba(15,23,42,0.05)" : "none",
                              cursor: "pointer",
                              background: isSelected ? "rgba(37,99,235,0.04)" : "transparent",
                              transition: "background 0.12s",
                              borderLeft: isSelected ? "2px solid #2563eb" : "2px solid transparent",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "rgba(15,23,42,0.02)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                            }}
                          >
                            <td style={COL_STYLE}>{getPriorityIcon(claim.priority)}</td>
                            <td style={COL_STYLE}>
                              <Link
                                href={`/app/claim/${claim.claimId}`}
                                style={{ fontSize: 13, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}
                                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                              >
                                {claim.claimNumber}
                              </Link>
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                                {claim.claimType ?? messages.common.unspecified}
                                {serviceSummary(claim) ? ` · ${serviceSummary(claim)}` : ""}
                              </div>
                            </td>
                            <td style={{ ...COL_STYLE, fontWeight: 500, color: "#0f172a" }}>{claim.patientName}</td>
                            <td style={COL_STYLE}>
                              <div style={{ fontWeight: 500, color: "#0f172a", fontSize: 13 }}>{claim.payerName}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                                {claim.countryCode ?? "CA"} / {claim.jurisdiction?.toUpperCase() ?? "CA"}
                                {claim.provinceOfService ? ` · ${claim.provinceOfService}` : ""}
                              </div>
                            </td>
                            <td style={COL_STYLE}>
                              <StatusPill variant={statusVariantFromText(claim.claimStatus)}>
                                {claim.claimStatus}
                              </StatusPill>
                            </td>
                            <td style={{ ...COL_STYLE, maxWidth: 160 }}>
                              <div style={{ fontSize: 13, color: "#0f172a", lineHeight: 1.4 }}>{claim.nextAction}</div>
                              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, lineHeight: 1.4 }}>{claim.queueReason}</div>
                            </td>
                            <td style={COL_STYLE}>
                              {claim.owner ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                  <span style={{
                                    display: "inline-flex", width: 24, height: 24, borderRadius: "50%",
                                    background: "linear-gradient(135deg, #dbeafe, #ede9fe)",
                                    alignItems: "center", justifyContent: "center",
                                    fontSize: 10, fontWeight: 700, color: "#1d4ed8",
                                  }}>
                                    {ownerInitials(claim.owner)}
                                  </span>
                                  <span style={{ fontSize: 13, color: "#374151" }}>{claim.owner}</span>
                                </div>
                              ) : (
                                <span style={{ fontSize: 12.5, color: "#cbd5e1" }}>{messages.common.unassigned}</span>
                              )}
                            </td>
                            <td style={COL_STYLE}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>{claim.age}</span>
                                {getSLABadge(claim.slaRisk, messages.sla)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="lg:hidden" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
                  {filteredItems.map((claim, idx) => (
                    <div
                      key={claim.claimId}
                      onClick={() => setSelectedClaimId(claim.claimId)}
                      style={{
                        padding: "16px",
                        borderBottom: idx < filteredItems.length - 1 ? "1px solid rgba(15,23,42,0.06)" : "none",
                        cursor: "pointer",
                        background: selectedClaimId === claim.claimId ? "rgba(37,99,235,0.04)" : "transparent",
                        borderLeft: selectedClaimId === claim.claimId ? "2px solid #2563eb" : "2px solid transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {getPriorityIcon(claim.priority)}
                          <div>
                            <Link href={`/app/claim/${claim.claimId}`} style={{ fontSize: 13.5, fontWeight: 600, color: "#2563eb", textDecoration: "none" }}>
                              {claim.claimNumber}
                            </Link>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                              {claim.claimType ?? messages.common.unspecified}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", marginBottom: 4 }}>{claim.patientName}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: "#374151" }}>{claim.payerName}</span>
                        <StatusPill variant={statusVariantFromText(claim.claimStatus)}>{claim.claimStatus}</StatusPill>
                      </div>
                      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>{claim.nextAction}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{claim.owner ?? messages.common.unassigned}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {getSLABadge(claim.slaRisk, messages.sla)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer link */}
          <div style={{ marginTop: 16 }}>
            <Link href="/app/claims" style={{ fontSize: 13, fontWeight: 500, color: "#2563eb", textDecoration: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
            >
              {messages.searchAllClaimsCta} →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selectedClaim ? (
        <div
          className="hidden lg:flex"
          style={{
            width: 340, flexShrink: 0, flexDirection: "column",
            borderLeft: "1px solid rgba(15,23,42,0.07)",
            background: "#fff", overflowY: "auto",
          }}
        >
          <div style={{ padding: "20px 20px 28px" }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <Link
                  href={`/app/claim/${selectedClaim.claimId}`}
                  style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", textDecoration: "none", letterSpacing: "-0.015em", fontFamily: "var(--font-inter, system-ui, sans-serif)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#2563eb"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#0f172a"; }}
                >
                  {selectedClaim.claimNumber}
                </Link>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{selectedClaim.patientName}</p>
              </div>
              <button
                onClick={() => setSelectedClaimId(null)}
                style={{ background: "rgba(15,23,42,0.04)", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: "#64748b", flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.04)"; }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Status + confidence */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 7 }}>
                {messages.currentStatusLabel}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StatusPill variant={statusVariantFromText(selectedClaim.claimStatus)} size="md">
                  {selectedClaim.claimStatus}
                </StatusPill>
                <ConfidenceBadge confidence={selectedClaim.confidence} size="md" />
              </div>
            </div>

            {/* Next action callout */}
            <div style={{
              padding: "12px 14px", borderRadius: 10, marginBottom: 18,
              background: "rgba(37,99,235,0.05)",
              border: "1px solid rgba(37,99,235,0.12)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <ChevronRight style={{ width: 14, height: 14, color: "#2563eb", marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1e3a8a", lineHeight: 1.4 }}>{selectedClaim.nextAction}</div>
                  <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 3, lineHeight: 1.4 }}>{selectedClaim.queueReason}</div>
                </div>
              </div>
            </div>

            {/* Detail rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {[
                { label: messages.labels.payer, value: selectedClaim.payerName },
                { label: messages.labels.service, value: serviceSummary(selectedClaim) || messages.common.serviceNotCaptured },
                { label: messages.labels.assignedOwner, value: selectedClaim.owner ?? messages.common.unassigned },
                { label: messages.labels.lastTouched, value: selectedClaim.lastUpdate },
                { label: messages.labels.evidence, value: `${selectedClaim.evidenceCount} ${messages.common.evidenceArtifacts}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13.5, color: "#0f172a" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(15,23,42,0.06)", marginBottom: 16 }} />

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link
                href={`/app/claim/${selectedClaim.claimId}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px 16px", borderRadius: 9999,
                  background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
                  color: "#fff", fontSize: 13.5, fontWeight: 600, textDecoration: "none",
                  boxShadow: "0 2px 10px rgba(37,99,235,0.25)",
                }}
              >
                {messages.viewFullClaim}
                <ChevronRight style={{ width: 14, height: 14 }} />
              </Link>
              {canRequestStatus ? (
                <ClaimRetrieveButton
                  claimId={selectedClaim.claimId}
                  title={retrieveMessages.tooltip}
                  loadingText={retrieveMessages.loading}
                  successText={retrieveMessages.completed}
                  className="w-full"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "9px 16px", borderRadius: 9999, width: "100%",
                    border: "1px solid rgba(15,23,42,0.13)", background: "#fff",
                    fontSize: 13.5, fontWeight: 600, color: "#374151", cursor: "pointer",
                  }}
                >
                  {retrieveMessages.label}
                </ClaimRetrieveButton>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
