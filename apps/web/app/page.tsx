"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ComponentType, ReactNode, RefObject } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  Globe,
  Lock,
  Menu,
  Shield,
  Users,
  X
} from "lucide-react";

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(
      ".reveal,.reveal-scale,.reveal-left,.reveal-right,.reveal-count"
    );
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("in-view");
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useCursorSpotlight() {
  useEffect(() => {
    document.body.classList.add("cursor-spotlight");
    const onMove = (e: MouseEvent) => {
      document.body.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.body.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.body.classList.remove("cursor-spotlight");
      document.body.style.removeProperty("--mouse-x");
      document.body.style.removeProperty("--mouse-y");
    };
  }, []);
}

function useStickyStep(ref: RefObject<HTMLElement | null>, numSteps: number) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const handler = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrolled = -rect.top;
      const total = rect.height - window.innerHeight;
      const progress = Math.max(0, Math.min(1, total > 0 ? scrolled / total : 0));
      setStep(Math.min(numSteps - 1, Math.floor(progress * numSteps)));
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [ref, numSteps]);
  return step;
}

function BrowserFrame({ children, url = "tenio.app" }: { children: ReactNode; url?: string }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15,23,42,0.09)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px rgba(15,23,42,0.04) inset, 0 32px 80px rgba(15,23,42,0.13), 0 8px 24px rgba(15,23,42,0.06)"
      }}
    >
      <div
        style={{
          background: "#f1f5f9",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <div
              key={c}
              style={{ height: 11, width: 11, borderRadius: "50%", background: c }}
            />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.10)",
              borderRadius: 6,
              padding: "3px 14px",
              fontSize: 11,
              color: "rgba(15,23,42,0.40)",
              minWidth: 200,
              textAlign: "center",
              fontFamily: "var(--font-inter, ui-monospace)",
              letterSpacing: "0.01em"
            }}
          >
            {url}
          </div>
        </div>
        <div style={{ width: 52 }} />
      </div>
      {children}
    </div>
  );
}

const M = {
  bg: "#ffffff",
  surface: "#f8fafc",
  raised: "#eef3ff",
  border: "rgba(15,23,42,0.07)",
  text: "#0f172a",
  sub: "#475569",
  muted: "#94a3b8"
};

function SLABadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    overdue: { bg: "rgba(220,38,38,0.09)", color: "#dc2626", label: "OVERDUE" },
    risk: { bg: "rgba(217,119,6,0.09)", color: "#b45309", label: "AT RISK" },
    ok: { bg: "rgba(5,150,105,0.09)", color: "#059669", label: "ON TRACK" }
  };
  const s = map[status] ?? map.ok;
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: 99,
        whiteSpace: "nowrap"
      }}
    >
      {s.label}
    </span>
  );
}

function ImportScreen() {
  return (
    <div style={{ background: M.bg, padding: "22px 24px" }}>
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: M.muted,
          margin: "0 0 4px"
        }}
      >
        IMPORT
      </p>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: M.text, margin: "0 0 16px" }}>
        Import Claims from Jane App
      </h3>

      <div
        style={{
          border: "1.5px dashed rgba(37,99,235,0.38)",
          borderRadius: 12,
          padding: "26px 24px",
          textAlign: "center",
          background: "rgba(37,99,235,0.04)",
          marginBottom: 14
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(37,99,235,0.14)",
            margin: "0 auto 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18
          }}
        >
          📄
        </div>
        <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 600, color: M.text }}>
          claims_export_2024-11-05.csv
        </p>
        <p style={{ margin: 0, fontSize: 11, color: M.muted }}>47 rows detected · 6 columns mapped</p>
      </div>

      <div
        style={{ borderRadius: 8, border: `1px solid ${M.border}`, overflow: "hidden", marginBottom: 14 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            padding: "7px 12px",
            background: M.surface,
            borderBottom: `1px solid ${M.border}`,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: M.muted
          }}
        >
          <span>Jane column</span>
          <span>Tenio field</span>
          <span />
        </div>
        {(
          [
            ["claim_id", "Claim ID"],
            ["patient_last", "Patient name"],
            ["insurer_name", "Payer"],
            ["service_date", "Service date"],
            ["billed_amount", "Amount"]
          ] as const
        ).map(([j, t]) => (
          <div
            key={j}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              padding: "7px 12px",
              borderBottom: `1px solid ${M.border}`,
              alignItems: "center",
              fontSize: 12
            }}
          >
            <span style={{ color: M.sub, fontFamily: "ui-monospace, monospace" }}>{j}</span>
            <span style={{ color: M.text }}>{t}</span>
            <span style={{ color: "#059669", fontSize: 13 }}>✓</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            flex: 1,
            background: "#2563EB",
            borderRadius: 8,
            padding: "9px 16px",
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Import 47 claims
        </div>
        <div
          style={{
            background: M.surface,
            border: `1px solid ${M.border}`,
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 13,
            color: M.sub,
            cursor: "pointer"
          }}
        >
          Preview
        </div>
      </div>
    </div>
  );
}

const QUEUE_ROWS = [
  { name: "Tremblay, M.", payer: "Sun Life", service: "Physiotherapy", status: "overdue", amount: "$240" },
  { name: "Okonkwo, A.", payer: "Manulife", service: "Chiropractic", status: "risk", amount: "$165" },
  { name: "Chen, L.", payer: "Green Shield", service: "Massage", status: "ok", amount: "$90" },
  { name: "Lefebvre, P.", payer: "Canada Life", service: "Physiotherapy", status: "ok", amount: "$310" },
  { name: "Singh, R.", payer: "Desjardins", service: "Naturopath", status: "risk", amount: "$120" }
];

const QUEUE_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.15fr) auto minmax(52px,64px)",
  columnGap: 10,
  alignItems: "center"
};

function QueueScreen() {
  return (
    <div style={{ background: M.bg }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          borderBottom: `1px solid ${M.border}`
        }}
      >
        {(
          [
            ["Open claims", "47"],
            ["Overdue", "3"],
            ["SLA compliance", "89%"]
          ] as const
        ).map(([label, val], i) => (
          <div
            key={label}
            style={{
              padding: "12px 16px",
              borderRight: i < 2 ? `1px solid ${M.border}` : "none"
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: M.muted,
                marginBottom: 2,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontWeight: 700
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: val === "3" ? "#dc2626" : M.text }}>{val}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          ...QUEUE_GRID,
          padding: "8px 16px",
          background: M.surface,
          borderBottom: `1px solid ${M.border}`,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: M.muted
        }}
      >
        <span>Patient</span>
        <span>Payer</span>
        <span>Service</span>
        <span>SLA</span>
        <span style={{ textAlign: "right" }}>Amt</span>
      </div>
      {QUEUE_ROWS.map((row, i) => (
        <div
          key={row.name}
          style={{
            ...QUEUE_GRID,
            padding: "10px 16px",
            fontSize: 12,
            background: i === 0 ? "rgba(220,38,38,0.05)" : "transparent",
            borderBottom: i < QUEUE_ROWS.length - 1 ? `1px solid ${M.border}` : "none"
          }}
        >
          <span
            style={{
              color: M.text,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {row.name}
          </span>
          <span
            style={{ color: M.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {row.payer}
          </span>
          <span
            style={{ color: M.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {row.service}
          </span>
          <SLABadge status={row.status} />
          <span style={{ color: M.sub, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {row.amount}
          </span>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "9px 16px",
          borderTop: `1px solid ${M.border}`,
          fontSize: 11,
          color: M.muted
        }}
      >
        <span>47 claims · sorted by SLA risk</span>
        <span style={{ color: "#3B82F6", cursor: "pointer" }}>View all →</span>
      </div>
    </div>
  );
}

function ClaimDetailScreen() {
  return (
    <div style={{ background: M.bg, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: M.muted, cursor: "pointer" }}>← Queue</span>
        <span style={{ color: M.muted, fontSize: 11 }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: M.text }}>Tremblay, M.</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <span
            style={{
              background: "rgba(220,38,38,0.09)",
              color: "#dc2626",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 99,
              letterSpacing: "0.07em",
              textTransform: "uppercase"
            }}
          >
            Overdue
          </span>
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${M.border}`, marginBottom: 16 }}>
        {["Overview", "Evidence", "Timeline"].map((tab, i) => (
          <div
            key={tab}
            style={{
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: i === 0 ? 600 : 400,
              cursor: "pointer",
              color: i === 0 ? "#3B82F6" : M.muted,
              borderBottom: i === 0 ? "2px solid #3B82F6" : "2px solid transparent",
              marginBottom: -1
            }}
          >
            {tab}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {(
          [
            ["Payer", "Sun Life PSHCP"],
            ["Service", "Physiotherapy"],
            ["Amount", "$240.00"],
            ["Service date", "Oct 28, 2024"],
            ["Submitted", "Nov 1, 2024"],
            ["SLA due", "Today"]
          ] as const
        ).map(([label, val]) => (
          <div
            key={label}
            style={{
              background: M.surface,
              border: `1px solid ${M.border}`,
              borderRadius: 8,
              padding: "9px 12px"
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: M.muted,
                marginBottom: 3,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                fontWeight: 700
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: label === "SLA due" ? "#F87171" : M.text
              }}
            >
              {val}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: "rgba(37,99,235,0.05)",
          border: "1px solid rgba(37,99,235,0.16)",
          borderRadius: 10,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1D4ED8", marginBottom: 2 }}>
            Request status check
          </div>
          <div style={{ fontSize: 11, color: M.muted }}>Fetch latest status from Sun Life portal</div>
        </div>
        <div
          style={{
            background: "#2563EB",
            borderRadius: 7,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            marginLeft: 12
          }}
        >
          Check now →
        </div>
      </div>
    </div>
  );
}

function EvidenceScreen() {
  return (
    <div style={{ background: M.bg, padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: M.muted, cursor: "pointer" }}>← Tremblay, M.</span>
        <div style={{ marginLeft: "auto" }}>
          <span
            style={{
              background: "rgba(5,150,105,0.09)",
              color: "#059669",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 99,
              letterSpacing: "0.07em",
              textTransform: "uppercase"
            }}
          >
            Resolved
          </span>
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: `1px solid ${M.border}`, marginBottom: 16 }}>
        {["Overview", "Evidence", "Timeline"].map((tab, i) => (
          <div
            key={tab}
            style={{
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: i === 1 ? 600 : 400,
              cursor: "pointer",
              color: i === 1 ? "#3B82F6" : M.muted,
              borderBottom: i === 1 ? "2px solid #3B82F6" : "2px solid transparent",
              marginBottom: -1
            }}
          >
            {tab}
          </div>
        ))}
      </div>
      <div
        style={{
          background: M.surface,
          border: `1px solid ${M.border}`,
          borderRadius: 12,
          padding: "16px",
          marginBottom: 12
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: M.text, marginBottom: 2 }}>
              Sun Life Financial
            </div>
            <div style={{ fontSize: 11, color: M.muted }}>Claim #TRE-2024-0847 · Physiotherapy</div>
          </div>
          <span
            style={{
              background: "rgba(5,150,105,0.09)",
              color: "#059669",
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 99,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              marginLeft: 10,
              flexShrink: 0
            }}
          >
            Approved
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          {(
            [
              ["Benefit paid", "$216.00"],
              ["Patient owes", "$24.00"],
              ["Coverage", "90%"]
            ] as const
          ).map(([l, v]) => (
            <div key={l}>
              <div
                style={{
                  fontSize: 10,
                  color: M.muted,
                  marginBottom: 3,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  fontWeight: 700
                }}
              >
                {l}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: M.text }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 10, borderTop: `1px solid ${M.border}`, fontSize: 11, color: M.muted }}>
          Retrieved by Tenio · 2 minutes ago
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(5,150,105,0.09)",
            flexShrink: 0,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#059669"
          }}
        >
          ✓
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: M.text, marginBottom: 2 }}>
            Status checked — claim resolved
          </div>
          <div style={{ fontSize: 11, color: M.muted }}>A. Osei · Nov 5, 2024 at 9:42 AM</div>
        </div>
      </div>
    </div>
  );
}

type ShowcaseItem = {
  n: string;
  url: string;
  title: string;
  desc: string;
  Screen: ComponentType;
};

const SHOWCASE: ShowcaseItem[] = [
  {
    n: "01",
    url: "tenio.app/import",
    title: "Import in seconds.",
    desc: "Export from Jane App and drop the file in. Tenio maps every column automatically, validates all 47 rows, and shows you a preview before a single record saves.",
    Screen: ImportScreen
  },
  {
    n: "02",
    url: "tenio.app/queue",
    title: "Work your priority queue.",
    desc: "Every claim ranked by real SLA risk — not just age. Red is overdue, orange is at risk. Your team starts at the top and works down. No triage, no spreadsheet.",
    Screen: QueueScreen
  },
  {
    n: "03",
    url: "tenio.app/claims/TRE-847",
    title: "Request status in one click.",
    desc: 'Open a claim, hit "Check now." The payer response lands in the evidence panel automatically — no portal log-in, no copy-paste.',
    Screen: ClaimDetailScreen
  },
  {
    n: "04",
    url: "tenio.app/claims/TRE-847/evidence",
    title: "Evidence captured. Claim closed.",
    desc: "Follow-up logged, outcome recorded, full audit trail attached. Every claim decision documented with provenance. Ready for billing audit.",
    Screen: EvidenceScreen
  }
];

const PAYERS = [
  "Sun Life PSHCP",
  "Manulife",
  "Green Shield Canada",
  "Canada Life",
  "Desjardins",
  "TELUS eClaims",
  "Blue Cross Ontario",
  "GWL",
  "Medavie"
];

const TRUST = [
  { Icon: Globe, label: "Canadian data residency", sub: "AWS ca-central-1 — PHI never leaves Canada" },
  { Icon: Lock, label: "PHIPA-aligned controls", sub: "Audit log, access control, encryption at rest" },
  { Icon: Users, label: "Role-based access", sub: "Owner · Manager · Operator · Viewer" },
  { Icon: Shield, label: "End-to-end encryption", sub: "TLS in transit, AES-256 at rest" }
];

const NAV_LINKS = ["Product", "How It Works", "Security"] as const;

function navHref(label: (typeof NAV_LINKS)[number]) {
  if (label === "How It Works") return "#how-it-works";
  if (label === "Security") return "#security";
  return "#product";
}

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const showcaseRef = useRef<HTMLElement | null>(null);
  const activeStep = useStickyStep(showcaseRef, SHOWCASE.length);

  useScrollReveal();
  useCursorSpotlight();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f8faff" }}>
      {/* ── Floating pill nav ─────────────────────────────────────── */}
      <nav className="fixed top-0 right-0 left-0 z-50 flex items-start justify-between px-5 pt-4 md:justify-center">

        {/* ── Desktop: centered floating island ── */}
        <div
          className="hidden md:flex items-center transition-all duration-300"
          style={{
            background: scrolled ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.72)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(15,23,42,0.09)",
            borderRadius: 9999,
            boxShadow: scrolled
              ? "0 4px 32px rgba(15,23,42,0.10), 0 1px 0 rgba(255,255,255,0.8) inset"
              : "0 2px 16px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.8) inset",
            padding: "6px 6px 6px 20px",
            gap: 2,
          }}
        >
          {/* Wordmark */}
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: "none", marginRight: 8 }}>
            <span style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontWeight: 700,
              fontSize: 20,
              color: "#0f172a",
              letterSpacing: "-0.03em",
              fontVariationSettings: '"opsz" 72',
              lineHeight: 1,
            }}>Tenio</span>
            <span style={{
              display: "inline-block", width: 5, height: 5, borderRadius: "50%",
              background: "linear-gradient(135deg, #2563EB, #4f46e5)",
              flexShrink: 0, marginBottom: 0,
            }} />
          </a>

          {/* Divider */}
          <span style={{ width: 1, height: 16, background: "rgba(15,23,42,0.10)", marginRight: 8, marginLeft: 6, flexShrink: 0 }} />

          {/* Nav links */}
          {NAV_LINKS.map((item) => (
            <a
              key={item}
              href={navHref(item)}
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: "#475569",
                textDecoration: "none",
                padding: "7px 14px",
                borderRadius: 9999,
                transition: "color 0.15s, background 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#0f172a";
                e.currentTarget.style.background = "rgba(15,23,42,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#475569";
                e.currentTarget.style.background = "transparent";
              }}
            >
              {item}
            </a>
          ))}

          {/* Sign in — ghost pill so it reads as a button */}
          <Link
            href="/login"
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: "#0f172a",
              textDecoration: "none",
              padding: "7px 16px",
              borderRadius: 9999,
              border: "1px solid rgba(15,23,42,0.15)",
              background: "rgba(255,255,255,0.6)",
              transition: "color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s",
              whiteSpace: "nowrap",
              marginLeft: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "rgba(15,23,42,0.22)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(15,23,42,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.6)";
              e.currentTarget.style.borderColor = "rgba(15,23,42,0.15)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Sign in
          </Link>

          {/* CTA pill — sits flush inside the island */}
          <Link
            href="/pilot-guide"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 13.5,
              fontWeight: 600,
              color: "#fff",
              textDecoration: "none",
              padding: "8px 16px",
              borderRadius: 9999,
              background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
              boxShadow: "0 2px 10px rgba(37,99,235,0.28), 0 1px 0 rgba(255,255,255,0.18) inset",
              transition: "transform 0.15s, box-shadow 0.15s",
              whiteSpace: "nowrap",
              marginLeft: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.40), 0 1px 0 rgba(255,255,255,0.18) inset";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(37,99,235,0.28), 0 1px 0 rgba(255,255,255,0.18) inset";
            }}
          >
            Get Pilot Access <ArrowRight style={{ width: 13, height: 13, strokeWidth: 2.5 }} />
          </Link>
        </div>

        {/* ── Mobile: minimal logo + hamburger ── */}
        <div
          className="flex md:hidden w-full items-center justify-between"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(15,23,42,0.09)",
            borderRadius: 14,
            padding: "10px 14px",
            boxShadow: "0 2px 16px rgba(15,23,42,0.07)"
          }}
        >
          <a href="#" style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
            <span style={{
              fontFamily: "var(--font-fraunces, Georgia, serif)",
              fontWeight: 700, fontSize: 19, color: "#0f172a",
              letterSpacing: "-0.03em", fontVariationSettings: '"opsz" 72', lineHeight: 1
            }}>Tenio</span>
            <span style={{
              display: "inline-block", width: 5, height: 5, borderRadius: "50%",
              background: "linear-gradient(135deg, #2563EB, #4f46e5)", flexShrink: 0,
            }} />
          </a>
          <button
            type="button"
            style={{ color: "#475569", background: "none", border: "none", cursor: "pointer", padding: 4 }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen ? (
          <div
            className="md:hidden absolute top-16 left-5 right-5"
            style={{
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(15,23,42,0.09)",
              borderRadius: 14,
              padding: "12px 8px",
              boxShadow: "0 8px 32px rgba(15,23,42,0.12)"
            }}
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item}
                href={navHref(item)}
                style={{
                  display: "block", padding: "10px 14px", fontSize: 14, fontWeight: 500,
                  color: "#475569", textDecoration: "none", borderRadius: 9,
                }}
                onClick={() => setMobileOpen(false)}
              >
                {item}
              </a>
            ))}
            <div style={{ height: 1, background: "rgba(15,23,42,0.06)", margin: "8px 14px" }} />
            <Link
              href="/login"
              style={{
                display: "block", margin: "4px 6px 2px", padding: "11px 14px",
                fontSize: 14, fontWeight: 600, color: "#0f172a", textDecoration: "none",
                borderRadius: 9999, textAlign: "center",
                border: "1px solid rgba(15,23,42,0.15)",
                background: "rgba(255,255,255,0.6)",
              }}
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </Link>
            <div style={{ height: 6 }} />
            <Link
              href="/pilot-guide"
              style={{
                display: "block", margin: "4px 6px 2px", padding: "11px 14px",
                fontSize: 14, fontWeight: 600, color: "#fff", textDecoration: "none",
                borderRadius: 9999, textAlign: "center",
                background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
                boxShadow: "0 2px 10px rgba(37,99,235,0.28)",
              }}
              onClick={() => setMobileOpen(false)}
            >
              Get Pilot Access
            </Link>
          </div>
        ) : null}
      </nav>

      <section className="hero-bg relative overflow-hidden" style={{ paddingTop: 128, paddingBottom: 0 }}>
        {/* Layered ambient orbs — depth without imagery */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* Large indigo orb — top right */}
          <div style={{
            position: "absolute", top: -140, right: -120,
            width: 600, height: 600,
            background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 68%)",
            filter: "blur(48px)"
          }} />
          {/* Blue orb — top left */}
          <div style={{
            position: "absolute", top: -80, left: -80,
            width: 480, height: 480,
            background: "radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 68%)",
            filter: "blur(48px)"
          }} />
          {/* Violet orb — center bottom, behind screenshot */}
          <div style={{
            position: "absolute", bottom: -60, left: "50%", transform: "translateX(-50%)",
            width: 700, height: 320,
            background: "radial-gradient(ellipse, rgba(139,92,246,0.10) 0%, transparent 68%)",
            filter: "blur(56px)"
          }} />
          {/* Sky-blue accent — mid left */}
          <div style={{
            position: "absolute", top: "30%", left: -60,
            width: 280, height: 280,
            background: "radial-gradient(circle, rgba(56,189,248,0.10) 0%, transparent 68%)",
            filter: "blur(40px)"
          }} />
        </div>
        {/* Subtle pulsing top glow */}
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: 1000, height: 500,
              background: "radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 72%)"
            }}
          />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          {/* Announcement pill */}
          <div className="reveal mb-10 flex justify-center">
            <div
              className="text-micro inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold tracking-widest uppercase"
              style={{
                background: "rgba(37,99,235,0.06)",
                border: "1px solid rgba(37,99,235,0.16)",
                color: "#2563EB"
              }}
            >
              <div className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#2563EB" }} />
              Ottawa Paramedical · Design Partner Program
            </div>
          </div>

          {/* Hero headline */}
          <h1 className="text-hero gradient-text hero-reveal hero-reveal-d1" style={{ marginBottom: "1.5rem" }}>
            Stop chasing payers.
            <br />
            <span className="gradient-text-blue">Start closing claims.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-body hero-reveal hero-reveal-d2 mx-auto mb-12" style={{ maxWidth: 520, color: "#475569", fontSize: 17 }}>
            Tenio replaces your billing team&apos;s portal spreadsheet with a governed, auditable claim-status
            workflow. Built for Canadian paramedical clinics.
          </p>

          {/* CTAs — full pill shape */}
          <div className="hero-reveal hero-reveal-d3 mb-24 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/pilot-guide"
              className="text-small flex items-center gap-2 px-8 py-3.5 font-semibold transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
                color: "#fff",
                borderRadius: 9999,
                boxShadow: "0 4px 20px rgba(37,99,235,0.35), 0 1px 3px rgba(37,99,235,0.2)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 14px 40px rgba(37,99,235,0.45), 0 4px 12px rgba(37,99,235,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,0.35), 0 1px 3px rgba(37,99,235,0.2)";
              }}
            >
              Request pilot access <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#product"
              className="text-small flex items-center gap-2 px-8 py-3.5 font-medium transition-all duration-200"
              style={{
                background: "#fff",
                border: "1px solid rgba(15,23,42,0.12)",
                color: "#475569",
                borderRadius: 9999,
                boxShadow: "0 1px 4px rgba(15,23,42,0.06)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(37,99,235,0.3)";
                e.currentTarget.style.color = "#1D4ED8";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(15,23,42,0.12)";
                e.currentTarget.style.color = "#475569";
                e.currentTarget.style.boxShadow = "0 1px 4px rgba(15,23,42,0.06)";
              }}
            >
              See the product <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Floating product screenshot */}
          <div className="hero-reveal hero-reveal-d4 relative mx-auto" style={{ maxWidth: 900 }}>
            {/* Glow halo behind the screenshot */}
            <div
              className="pointer-events-none absolute -inset-4 -z-10"
              style={{
                background: "radial-gradient(ellipse 80% 60% at 50% 80%, rgba(37,99,235,0.14) 0%, rgba(99,102,241,0.07) 50%, transparent 75%)",
                filter: "blur(20px)"
              }}
            />
            <BrowserFrame url="tenio.app/queue">
              <QueueScreen />
            </BrowserFrame>
          </div>
        </div>
      </section>

      {/* Payer proof strip — borderless, subtle */}
      <div className="overflow-hidden py-5" style={{ background: "#fff" }}>
        <div className="flex items-center">
          <div className="scroll-track flex w-max items-center gap-12 px-6">
            {[...PAYERS, ...PAYERS].map((p, i) => (
              <span key={`${p}-${i}`} className="text-small font-medium whitespace-nowrap" style={{ color: "#cbd5e1", letterSpacing: "0.02em" }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI stats — display-scale editorial treatment */}
      <section id="product" style={{ background: "#f5f7ff", borderTop: "1px solid rgba(15,23,42,0.05)", borderBottom: "1px solid rgba(15,23,42,0.05)" }}>
        <div className="mx-auto max-w-6xl px-6" style={{ paddingTop: 88, paddingBottom: 88 }}>
          {/* Section label */}
          <div className="reveal mb-16 text-center">
            <span style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#2563eb",
              background: "rgba(37,99,235,0.08)",
              borderRadius: 999,
              padding: "5px 14px",
              marginBottom: 16
            }}>By the numbers</span>
            <p style={{ color: "#64748b", fontSize: 16, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
              What clinics see after their first 90 days on Tenio
            </p>
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {(
              [
                { n: "40%", label: "Fewer manual touches", sub: "Automated retrieval eliminates most portal log-ins" },
                { n: "3 hr", label: "Saved per coordinator / day", sub: "Time back from chasing payer portals" },
                { n: "89%", label: "SLA compliance at go-live", sub: "Queue prioritization keeps nothing hidden" }
              ] as const
            ).map(({ n, label, sub }, i) => (
              <div
                key={label}
                className="reveal-count reveal"
                style={{
                  padding: "0 40px",
                  textAlign: "center",
                  borderLeft: i > 0 ? "1px solid rgba(15,23,42,0.08)" : undefined
                }}
              >
                {/* Giant number */}
                <div className="stat-num gradient-text-blue" style={{ marginBottom: 12 }}>{n}</div>

                {/* Rule */}
                <div style={{
                  width: 32,
                  height: 2,
                  background: "linear-gradient(90deg, #2563eb, #4f46e5)",
                  borderRadius: 99,
                  margin: "0 auto 14px"
                }} />

                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 15, marginBottom: 6, lineHeight: 1.4 }}>
                  {label}
                </div>
                <div style={{ color: "#64748b", fontSize: 13.5, lineHeight: 1.55 }}>
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        ref={showcaseRef}
        style={{ height: `${SHOWCASE.length * 100}vh` }}
      >
        <div className="showcase-sticky">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-[360px_1fr] lg:gap-20">
            <div>
              <p className="text-micro mb-8 font-bold tracking-widest uppercase" style={{ color: "#2563EB" }}>
                How it works
              </p>
              {SHOWCASE.map((f, i) => (
                <div key={f.n} className={`feature-step ${activeStep === i ? "active" : ""}`}>
                  <div className="mb-1.5 flex items-center gap-3">
                    <span
                      className="text-micro font-bold transition-colors duration-300"
                      style={{ color: activeStep === i ? "#2563EB" : "#CBD5E1" }}
                    >
                      {f.n}
                    </span>
                    <div
                      className="h-px flex-1 transition-colors duration-300"
                      style={{
                        background: activeStep === i ? "rgba(37,99,235,0.18)" : "rgba(15,23,42,0.06)"
                      }}
                    />
                  </div>
                  <h3
                    className="text-heading mb-1 font-semibold transition-colors duration-300"
                    style={{ color: activeStep === i ? "#0f172a" : "#CBD5E1" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-small step-desc">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="relative" style={{ height: 520 }}>
              {SHOWCASE.map((f, i) => {
                const Screen = f.Screen;
                return (
                  <div key={f.n} className={`mock-screen ${activeStep === i ? "active" : ""}`}>
                    <div className="w-full">
                      <BrowserFrame url={f.url}>
                        <Screen />
                      </BrowserFrame>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="section-alt py-36">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-20 max-w-xl text-center">
            <p className="text-micro reveal mb-5 font-bold tracking-widest uppercase" style={{ color: "#2563EB" }}>
              Security & compliance
            </p>
            <h2 className="text-title gradient-text reveal reveal-d1">Patient data stays in Canada.</h2>
            <p className="text-body reveal reveal-d2 mt-5" style={{ color: "#475569" }}>
              PHIPA-aligned. Every claim record, evidence file, and audit event stays on Canadian soil and never
              leaves without your permission.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map(({ Icon, label, sub }, i) => (
              <div
                key={label}
                className={`surface surface-hover reveal-scale reveal rounded-2xl p-7 text-center reveal-d${i + 1}`}
              >
                <div
                  className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(37,99,235,0.07)" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "#2563EB" }} />
                </div>
                <div className="mb-1.5 font-semibold" style={{ color: "#0f172a", fontSize: 15 }}>
                  {label}
                </div>
                <div className="text-small" style={{ color: "#64748b" }}>
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — no border, clean gradient bg, pill button */}
      <section className="relative overflow-hidden py-36" style={{ background: "#edf2ff" }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 70% 80% at 50% 110%, rgba(37,99,235,0.13), transparent)"
          }}
        />
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-title gradient-text reveal">Ready to cut follow-up time in half?</h2>
          <p className="text-body reveal reveal-d1 mt-6 mb-12" style={{ color: "#475569" }}>
            We&apos;re accepting design partners in Ottawa now. Bring your Jane App export. You&apos;ll be live in
            under an hour.
          </p>
          <div className="reveal reveal-d2 flex justify-center">
            <Link
              href="/pilot-guide"
              className="text-small flex items-center gap-2 px-9 py-4 font-semibold transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
                color: "#fff",
                borderRadius: 9999,
                boxShadow: "0 4px 20px rgba(37,99,235,0.35), 0 1px 3px rgba(37,99,235,0.2)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 14px 40px rgba(37,99,235,0.45), 0 4px 12px rgba(37,99,235,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,0.35), 0 1px 3px rgba(37,99,235,0.2)";
              }}
            >
              Apply for pilot access <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="text-small reveal reveal-d3 mt-6" style={{ color: "#94A3B8" }}>
            No commitment. Design partners get 90 days free.
          </p>
        </div>
      </section>

      <footer className="py-10" style={{ background: "#fff", borderTop: "1px solid rgba(15,23,42,0.06)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span
              style={{
                fontFamily: "var(--font-fraunces, Georgia, serif)",
                fontWeight: 700,
                fontSize: 18,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                fontVariationSettings: '"opsz" 72',
                lineHeight: 1
              }}
            >
              Tenio
            </span>
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2563EB, #4f46e5)",
                flexShrink: 0
              }}
            />
            <span className="text-small" style={{ color: "#94A3B8" }}>
              Ottawa, Canada
            </span>
          </div>
          <div className="flex items-center gap-6">
            {(["Privacy", "Terms", "Security", "Contact"] as const).map((item) => (
              <a
                key={item}
                href="#"
                className="text-small transition-colors duration-200"
                style={{ color: "#94A3B8" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#1D4ED8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#94A3B8";
                }}
              >
                {item}
              </a>
            ))}
          </div>
          <p className="text-small" style={{ color: "#94A3B8" }}>
            © {new Date().getFullYear()} Tenio Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
