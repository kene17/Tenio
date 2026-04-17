"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { hasPermission, roleLabel, type UserRole } from "@tenio/domain";
import {
  Activity,
  BarChart3,
  Building2,
  CheckSquare,
  ChevronDown,
  FileSearch,
  FileText,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Upload,
  X
} from "lucide-react";

import { cn } from "../lib/cn";
import type { Locale, TenioMessages } from "../lib/locale";
import { NotificationBell } from "./notification-panel";
import { SentryUserBootstrap } from "./sentry-user-bootstrap";

function UserMenu({
  currentUserInitials,
  currentUserName,
  currentRole,
  signOutLabel,
}: {
  currentUserInitials: string;
  currentUserName: string;
  currentRole: UserRole;
  signOutLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={ref} className="hidden md:block" style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 10px 4px 4px",
          borderRadius: 9999,
          border: `1px solid ${open ? "rgba(37,99,235,0.20)" : "rgba(15,23,42,0.09)"}`,
          background: open ? "#f8faff" : "#fff",
          cursor: "pointer",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f8faff";
          e.currentTarget.style.borderColor = "rgba(37,99,235,0.20)";
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.borderColor = "rgba(15,23,42,0.09)";
          }
        }}
      >
        <span
          style={{
            display: "flex",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0,
            letterSpacing: "0.02em",
          }}
        >
          {currentUserInitials}
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", whiteSpace: "nowrap" }}>
          {currentUserName}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "#2563eb",
            background: "rgba(37,99,235,0.08)",
            borderRadius: 4,
            padding: "2px 6px",
          }}
        >
          {roleLabel(currentRole)}
        </span>
        <ChevronDown
          style={{
            width: 13,
            height: 13,
            color: "#94a3b8",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 160,
            background: "#fff",
            border: "1px solid rgba(15,23,42,0.09)",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(15,23,42,0.10)",
            padding: "4px",
            zIndex: 100,
          }}
        >
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "8px 12px",
                borderRadius: 7,
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
                textAlign: "left",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,23,42,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <LogOut style={{ width: 14, height: 14, color: "#94a3b8" }} />
              {signOutLabel}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function DashboardShell({
  children,
  locale,
  messages,
  currentUserName,
  currentUserInitials,
  organizationName,
  currentRole,
  userId,
  userEmail,
  organizationId
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: TenioMessages["shell"];
  currentUserName: string;
  currentUserInitials: string;
  organizationName: string;
  currentRole: UserRole;
  userId: string | null;
  userEmail: string | null;
  organizationId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canImportClaims = hasPermission(currentRole, "claims:import");
  const canReadPerformance = hasPermission(currentRole, "performance:read");
  const canReadPayers = hasPermission(currentRole, "payer:read");
  const canReadAudit = hasPermission(currentRole, "audit:read");
  const canReadStatus = hasPermission(currentRole, "status:read");

  const navigation = [
    { name: messages.navigation.queue, href: "/app/queue", icon: ListChecks },
    { name: messages.navigation.claims, href: "/app/claims", icon: FileText },
    ...(canImportClaims
      ? [{ name: messages.navigation.onboarding, href: "/app/onboarding", icon: Upload }]
      : []),
    { name: messages.navigation.results, href: "/app/results", icon: CheckSquare },
    ...(canReadPerformance
      ? [{ name: messages.navigation.performance, href: "/app/performance", icon: BarChart3 }]
      : []),
    ...(canReadPayers
      ? [{ name: messages.navigation.configuration, href: "/app/configuration", icon: Settings }]
      : [])
  ];

  const secondaryNavigation = [
    ...(canReadAudit
      ? [{ name: messages.navigation.auditLog, href: "/app/audit-log", icon: FileSearch }]
      : []),
    ...(canReadStatus
      ? [{ name: messages.navigation.status, href: "/app/status", icon: Activity }]
      : [])
  ];

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/app/claims" && pathname.startsWith("/app/claim/")) return true;
    if (href === "/app/results" && pathname.startsWith("/app/result/")) return true;
    return false;
  };

  function switchLocale(nextLocale: Locale) {
    startTransition(async () => {
      await fetch("/api/preferences/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale })
      });
      router.refresh();
    });
  }

  const Wordmark = ({ size = 20 }: { size?: number }) => (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          fontFamily: "var(--font-fraunces, Georgia, serif)",
          fontWeight: 700,
          fontSize: size,
          color: "#0f172a",
          letterSpacing: "-0.03em",
          fontVariationSettings: '"opsz" 72',
          lineHeight: 1,
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
          flexShrink: 0,
        }}
      />
    </span>
  );

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <>
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid rgba(15,23,42,0.06)",
          flexShrink: 0,
        }}
      >
        <Wordmark size={20} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
        {[...navigation, ...secondaryNavigation].map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNav}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                color: active ? "#1d4ed8" : "#475569",
                background: active ? "rgba(37,99,235,0.07)" : "transparent",
                textDecoration: "none",
                transition: "background 0.15s, color 0.15s",
                marginBottom: 1,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(15,23,42,0.04)";
                  e.currentTarget.style.color = "#0f172a";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#475569";
                }
              }}
            >
              <item.icon
                style={{
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  color: active ? "#2563eb" : "#94a3b8",
                }}
              />
              {item.name}
            </Link>
          );
        })}

        {/* Divider before sign-out (mobile only) */}
        {onNav && (
          <>
            <div style={{ height: 1, background: "rgba(15,23,42,0.06)", margin: "10px 4px" }} />
            <form action="/api/auth/logout" method="post">
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#475569",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(15,23,42,0.04)";
                  e.currentTarget.style.color = "#0f172a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#475569";
                }}
              >
                <LogOut style={{ width: 16, height: 16, flexShrink: 0, color: "#94a3b8" }} />
                {messages.signOut}
              </button>
            </form>
          </>
        )}
      </nav>
    </>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8faff" }}>
      <SentryUserBootstrap
        userId={userId}
        userEmail={userEmail}
        orgId={organizationId}
        role={currentRole}
      />

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex"
        style={{
          width: 232,
          flexDirection: "column",
          background: "#ffffff",
          borderRight: "1px solid rgba(15,23,42,0.07)",
          flexShrink: 0,
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(15,23,42,0.35)",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className="lg:hidden"
        style={{
          position: "fixed",
          inset: "0 auto 0 0",
          zIndex: 50,
          width: 240,
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          borderRight: "1px solid rgba(15,23,42,0.07)",
          transform: mobileMenuOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(15,23,42,0.05)",
            border: "none",
            borderRadius: 8,
            padding: 6,
            cursor: "pointer",
            color: "#475569",
          }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>
        <SidebarContent onNav={() => setMobileMenuOpen(false)} />
      </aside>

      {/* ── Main area ── */}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", overflow: "hidden" }}>

        {/* ── Header ── */}
        <header
          style={{
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            background: "#ffffff",
            borderBottom: "1px solid rgba(15,23,42,0.07)",
            flexShrink: 0,
            gap: 12,
          }}
        >
          {/* Left — mobile hamburger + org switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <button
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#475569",
                padding: 6,
                borderRadius: 8,
                flexShrink: 0,
              }}
            >
              <Menu style={{ width: 18, height: 18 }} />
            </button>

            {/* Org switcher */}
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 12px 6px 10px",
                borderRadius: 8,
                border: "1px solid rgba(15,23,42,0.10)",
                background: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                color: "#0f172a",
                transition: "background 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
                maxWidth: 240,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8faff";
                e.currentTarget.style.borderColor = "rgba(37,99,235,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "rgba(15,23,42,0.10)";
              }}
            >
              <span
                style={{
                  display: "flex",
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, #eef3ff, #dbeafe)",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Building2 style={{ width: 12, height: 12, color: "#2563eb" }} />
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{organizationName}</span>
              <ChevronDown style={{ width: 13, height: 13, color: "#94a3b8", flexShrink: 0 }} />
            </button>
          </div>

          {/* Right — controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>

            {/* Language toggle */}
            <div
              className="hidden md:flex"
              style={{
                alignItems: "center",
                gap: 2,
                padding: "3px 3px 3px 10px",
                borderRadius: 8,
                border: "1px solid rgba(15,23,42,0.09)",
                background: "#f8faff",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              <span style={{ color: "#94a3b8", textTransform: "uppercase", marginRight: 2 }}>
                {messages.languageLabel}
              </span>
              {(["en", "fr"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => switchLocale(option)}
                  disabled={isPending || option === locale}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 6,
                    border: "none",
                    cursor: option === locale ? "default" : "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: option === locale
                      ? "linear-gradient(135deg, #2563EB 0%, #4f46e5 100%)"
                      : "transparent",
                    color: option === locale ? "#fff" : "#64748b",
                    transition: "background 0.15s, color 0.15s",
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Protected badge */}
            <div
              className="hidden md:flex"
              style={{
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 8,
                border: "1px solid rgba(5,150,105,0.18)",
                background: "rgba(5,150,105,0.06)",
                fontSize: 12,
                fontWeight: 600,
                color: "#059669",
              }}
            >
              <ShieldCheck style={{ width: 13, height: 13 }} />
              {messages.protected}
            </div>

            {/* Bell */}
            <NotificationBell />

            {/* Divider */}
            <span style={{ width: 1, height: 20, background: "rgba(15,23,42,0.08)", flexShrink: 0 }} />

            {/* User chip with sign-out dropdown */}
            <UserMenu
              currentUserInitials={currentUserInitials}
              currentUserName={currentUserName}
              currentRole={currentRole}
              signOutLabel={messages.signOut}
            />
          </div>
        </header>

        <main style={{ flex: 1, overflow: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
