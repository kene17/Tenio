"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { hasPermission, roleLabel, type UserRole } from "@tenio/domain";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CheckSquare,
  ChevronDown,
  FileSearch,
  FileText,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  Upload,
  X
} from "lucide-react";

import { cn } from "../lib/cn";
import type { Locale, TenioMessages } from "../lib/locale";
import { SentryUserBootstrap } from "./sentry-user-bootstrap";

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
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ locale: nextLocale })
      });
      router.refresh();
    });
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SentryUserBootstrap
        userId={userId}
        userEmail={userEmail}
        orgId={organizationId}
        role={currentRole}
      />
      <div className="hidden w-60 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            <div className="font-semibold text-gray-900">Tenio</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {[...navigation, ...secondaryNavigation].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform duration-300 lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            <div className="font-semibold text-gray-900">Tenio</div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 overflow-y-auto px-3 py-4">
          {[...navigation, ...secondaryNavigation].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
          <form action="/api/auth/logout" method="post" className="pt-3">
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
              <LogOut className="h-5 w-5" />
              {messages.signOut}
            </button>
          </form>
        </nav>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <div className="flex flex-1 items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button className="hidden items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 sm:flex">
              <Building2 className="h-4 w-4 text-gray-600" />
              <span className="hidden text-sm text-gray-700 md:inline">{organizationName}</span>
              <span className="text-sm text-gray-700 md:hidden">{organizationName.split(" ")[0]}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="hidden items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 md:flex">
              <span className="px-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {messages.languageLabel}
              </span>
              {(["en", "fr"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => switchLocale(option)}
                  disabled={isPending || option === locale}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors",
                    option === locale
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-100",
                    isPending ? "opacity-70" : ""
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="hidden items-center gap-2 rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 md:flex">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {messages.protected}
            </div>
            <button className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-50">
              <Bell className="h-5 w-5" />
            </button>
            <form action="/api/auth/logout" method="post" className="hidden sm:block">
              <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <LogOut className="h-4 w-4" />
                {messages.signOut}
              </button>
            </form>
            <div className="hidden cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50 md:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                {currentUserInitials}
              </div>
              <span className="text-sm text-gray-700">{currentUserName}</span>
              <span className="rounded border border-gray-200 px-2 py-0.5 text-xs uppercase tracking-wide text-gray-500">
                {roleLabel(currentRole)}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
