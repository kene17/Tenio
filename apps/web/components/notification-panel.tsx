"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  PhoneCall,
  ShieldAlert,
  X
} from "lucide-react";

import type { NotificationItem, NotificationKind } from "../lib/notifications";
import { useNotifications } from "../hooks/use-notifications";

// ── Kind metadata ─────────────────────────────────────────────────────────────

type KindMeta = {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
};

function kindMeta(kind: NotificationKind): KindMeta {
  switch (kind) {
    case "sla_breached":
      return {
        label: "SLA Breached",
        icon: <AlertCircle style={{ width: 14, height: 14 }} />,
        color: "#dc2626",
        bg: "rgba(220,38,38,0.08)"
      };
    case "sla_at_risk":
      return {
        label: "SLA At Risk",
        icon: <AlertTriangle style={{ width: 14, height: 14 }} />,
        color: "#d97706",
        bg: "rgba(217,119,6,0.08)"
      };
    case "phone_required":
      return {
        label: "Phone Call Required",
        icon: <PhoneCall style={{ width: 14, height: 14 }} />,
        color: "#7c3aed",
        bg: "rgba(124,58,237,0.08)"
      };
    case "escalated":
      return {
        label: "Claim Escalated",
        icon: <ShieldAlert style={{ width: 14, height: 14 }} />,
        color: "#ea580c",
        bg: "rgba(234,88,12,0.08)"
      };
    case "retrieval_complete":
      return {
        label: "Retrieval Complete",
        icon: <CheckCircle2 style={{ width: 14, height: 14 }} />,
        color: "#16a34a",
        bg: "rgba(22,163,74,0.08)"
      };
    case "retrieval_failed":
      return {
        label: "Retrieval Failed",
        icon: <AlertCircle style={{ width: 14, height: 14 }} />,
        color: "#dc2626",
        bg: "rgba(220,38,38,0.08)"
      };
  }
}

// ── Relative timestamp ────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.round(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.round(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.round(diffHrs / 24)}d ago`;
}

// ── Single notification row ───────────────────────────────────────────────────

function NotificationRow({ item }: { item: NotificationItem }) {
  const meta = kindMeta(item.kind);
  return (
    <Link
      href={`/app/claim/${item.claimId}`}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 14px",
        textDecoration: "none",
        background: item.read ? "transparent" : "rgba(37,99,235,0.03)",
        borderBottom: "1px solid rgba(15,23,42,0.06)",
        transition: "background 0.12s"
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "rgba(15,23,42,0.04)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = item.read
          ? "transparent"
          : "rgba(37,99,235,0.03)";
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: meta.bg,
          color: meta.color,
          flexShrink: 0,
          marginTop: 1
        }}
      >
        {meta.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: meta.color
            }}
          >
            {meta.label}
          </span>
          <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
            {relativeTime(item.at)}
          </span>
        </div>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12,
            color: "#374151",
            lineHeight: 1.45,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
        >
          {item.summary}
        </p>
      </div>
    </Link>
  );
}

// ── Panel dropdown ────────────────────────────────────────────────────────────

function NotificationDropdown({
  items,
  onClose
}: {
  items: NotificationItem[];
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 340,
        maxHeight: 420,
        background: "#fff",
        border: "1px solid rgba(15,23,42,0.09)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(15,23,42,0.12)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        zIndex: 200
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px solid rgba(15,23,42,0.06)",
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
          Notifications
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            color: "#94a3b8",
            display: "flex",
            alignItems: "center"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(15,23,42,0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13
            }}
          >
            No new notifications
          </div>
        ) : (
          items.map((item) => <NotificationRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

// ── Exported bell button ──────────────────────────────────────────────────────

export function NotificationBell() {
  const { items, unreadCount, markAllRead } = useNotifications();
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

  function handleToggle() {
    setOpen((prev) => {
      if (!prev) markAllRead();
      return !prev;
    });
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleToggle}
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: open ? "#0f172a" : "#64748b",
          padding: 8,
          borderRadius: 8,
          transition: "background 0.15s, color 0.15s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(15,23,42,0.05)";
          e.currentTarget.style.color = "#0f172a";
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "#64748b";
          }
        }}
      >
        <Bell style={{ width: 17, height: 17 }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 15,
              height: 15,
              borderRadius: 9999,
              background: "#dc2626",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown items={items} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
