"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  FileText,
  Menu,
  Shield,
  Target,
  Users,
  X
} from "lucide-react";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Customers", href: "#customers" },
  { label: "Security", href: "#security" }
];

const workflowPillars = [
  {
    title: "Queue And Ownership",
    body: "Run claim-status work in one queue with clear assignment, review state, and next-action visibility."
  },
  {
    title: "Routing And SLA Control",
    body: "Move claims through governed review paths with escalation signals, backlog visibility, and manager oversight."
  },
  {
    title: "Evidence And Auditability",
    body: "Attach retrieval evidence, timestamps, and history so every claim decision can be trusted and explained."
  }
];

const proofPoints = [
  {
    icon: Shield,
    title: "Governed workflow",
    body: "Automation proposes candidate outcomes. The workflow layer owns official state, review, and audit trail."
  },
  {
    icon: CheckCircle,
    title: "Evidence on every claim",
    body: "Tenio captures retrieval context and links it to the claim record so operators do not reconstruct history by hand."
  },
  {
    icon: Clock,
    title: "Built for operational trust",
    body: "Managers can see backlog, review load, escalation patterns, and SLA risk without stitching together multiple tools."
  }
];

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supportEmail = process.env.NEXT_PUBLIC_PILOT_SUPPORT_EMAIL ?? "pilot-support@example.com";

  return (
    <div className="bg-white">
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-900">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold text-slate-900">Tenio</span>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-[13px] text-slate-600 hover:text-slate-900">
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-[13px] text-slate-600 hover:text-slate-900 md:block">
              Sign In
            </Link>
            <Link href="/pilot-guide" className="hidden rounded bg-slate-900 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-slate-800 sm:block">
              Pilot Guide
            </Link>
            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded p-2 text-slate-600 hover:bg-slate-50 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen ? (
          <div className="border-t border-gray-200 bg-white md:hidden">
            <div className="space-y-3 px-6 py-4">
              {navItems.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[14px] text-slate-700 hover:text-slate-900">
                  {item.label}
                </a>
              ))}
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[14px] text-slate-700 hover:text-slate-900">
                Sign In
              </Link>
              <Link href="/pilot-guide" className="block w-full rounded bg-slate-900 px-4 py-2 text-center text-[14px] font-medium text-white hover:bg-slate-800">
                Pilot Guide
              </Link>
            </div>
          </div>
        ) : null}
      </nav>

      <section className="border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16">
          <div className="mb-12 max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-700">
              Workflow OS For Claim-Status Work
            </div>
            <h1 className="mb-5 text-[42px] leading-[1.1] font-bold text-slate-900">
              The operating system for claim-status follow-up.
            </h1>
            <p className="mb-8 text-[17px] leading-[1.6] text-slate-600">
              Tenio gives revenue cycle teams one governed workflow for queue ownership,
              routing, review, evidence, and auditability while automation handles payer
              retrieval and first-pass interpretation.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/pilot-guide" className="flex items-center gap-2 rounded bg-slate-900 px-5 py-2.5 text-[14px] font-medium text-white hover:bg-slate-800">
                Pilot Guide
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="rounded border border-slate-300 px-5 py-2.5 text-[14px] font-medium text-slate-700 hover:bg-slate-50">
                Sign In
              </Link>
            </div>
          </div>

          <div className="mb-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="mb-2 text-[12px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                What Tenio Is
              </div>
              <p className="text-[15px] leading-7 text-slate-700">
                The workflow system where claim-status work gets done: queue, ownership,
                routing, review, evidence, SLA visibility, and operational reporting.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <div className="mb-2 text-[12px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                What Tenio Does
              </div>
              <p className="text-[15px] leading-7 text-slate-700">
                Automation retrieves claim status, normalizes messy payer output, scores
                confidence, and sends uncertain cases into human review instead of
                deciding official state on its own.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-slate-900">Claims Work Queue</span>
                <span className="text-[12px] text-slate-500">24 unresolved</span>
              </div>
            </div>
            <div className="p-4">
              <div className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
                {[
                  ["CLM-204938", "Martinez, Rosa", "Aetna", "$2,847", "Pending Review", "At Risk", "S. Chen"],
                  ["CLM-204821", "Johnson, Michael", "UnitedHealthcare", "$1,205", "In Process", "Healthy", "M. Williams"],
                  ["CLM-203657", "Lee, David", "Cigna", "$894", "Needs Follow-up", "At Risk", "D. Park"]
                ].map(([id, patient, payer, amount, status, sla, owner]) => (
                  <div key={id} className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-50">
                    <div className="flex flex-1 items-center gap-6">
                      <div className="w-32">
                        <div className="text-[13px] font-medium text-blue-600">{id}</div>
                        <div className="text-[11px] text-slate-500">{patient}</div>
                      </div>
                      <div className="w-32">
                        <div className="text-[12px] text-slate-900">{payer}</div>
                        <div className="text-[11px] text-slate-500">{amount}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {status}
                        </span>
                        <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${sla === "At Risk" ? "border border-amber-200 bg-amber-50 text-amber-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                          {sla}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[12px] text-slate-600">{owner}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="border-b border-gray-200 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-3xl">
            <h2 className="mb-3 text-[28px] font-bold text-slate-900">Workflow first. Automation underneath it.</h2>
            <p className="text-[15px] leading-7 text-slate-600">
              Tenio is not a generic agent or a simple scraper. It is the governed
              workflow layer revenue cycle teams use to run claim-status operations,
              with automation reducing the manual work around retrieval and interpretation.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {workflowPillars.map((pillar) => (
              <div key={pillar.title} className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-3 text-[15px] font-semibold text-slate-900">{pillar.title}</h3>
                <p className="text-[13px] leading-6 text-slate-600">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-gray-200 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <h2 className="mb-3 text-[28px] font-bold text-slate-900">How it works</h2>
            <p className="text-[15px] text-slate-600">
              A governed loop for retrieving, interpreting, routing, and resolving claim-status work.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {["Retrieve", "Interpret", "Route", "Resolve"].map((step, index) => (
              <div key={step}>
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-[14px] font-semibold text-white">{index + 1}</div>
                <h3 className="mb-2 text-[15px] font-semibold text-slate-900">{step}</h3>
                <p className="text-[13px] leading-relaxed text-slate-600">
                  {step === "Retrieve" && "Collect claim status from payer portals or payer-connected channels with evidence attached."}
                  {step === "Interpret" && "Normalize messy payer responses into candidate results with confidence scoring."}
                  {step === "Route" && "Send uncertain, unresolved, or high-risk claims into governed review and ownership paths."}
                  {step === "Resolve" && "Track ownership, next action, and SLA until claims are resolved."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="customers" className="border-b border-gray-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-2xl">
            <h2 className="mb-3 text-[28px] font-bold text-slate-900">Built for revenue cycle operations</h2>
            <p className="text-[15px] text-slate-600">
              Teams managing claim-status follow-up across multiple payers, large backlogs,
              and operational pressure around ownership, throughput, and SLA risk.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              [BarChart3, "Revenue Cycle Leaders", "Throughput visibility, bottleneck analysis, and SLA performance tracking."],
              [FileText, "Claims Follow-up Teams", "Single queue for unresolved work, clear ownership, and structured review."],
              [Target, "Operations Managers", "Routing logic, SLA management, and team performance monitoring."],
              [Users, "RCM BPO Providers", "Higher claim throughput with audit-ready evidence and structured output."]
            ].map(([Icon, title, body]) => (
              <div key={title as string} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded border border-slate-200 bg-slate-50">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
                <h3 className="mb-2 text-[14px] font-semibold text-slate-900">{title as string}</h3>
                <p className="text-[12px] leading-relaxed text-slate-600">{body as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-3xl">
            <h2 className="mb-4 text-[32px] font-bold text-slate-900">Built for trust, not just automation demos.</h2>
            <p className="text-[15px] leading-7 text-slate-600">
              The core rule in Tenio is simple: automation can retrieve, interpret, and
              propose, but the workflow layer owns official state, review, and auditability.
            </p>
          </div>
          <div className="mb-12 grid gap-5 md:grid-cols-3">
            {proofPoints.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <Icon className="h-5 w-5 text-slate-700" />
                </div>
                <h3 className="mb-2 text-[15px] font-semibold text-slate-900">{title}</h3>
                <p className="text-[13px] leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center">
            <h3 className="mb-3 text-[24px] font-bold text-slate-900">See how claim-status operations should work.</h3>
            <p className="mb-8 text-[15px] text-slate-600">
              One system for queue, ownership, routing, evidence, and resolution, powered by retrieval automation.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/pilot-guide" className="rounded bg-slate-900 px-6 py-3 text-[14px] font-semibold text-white hover:bg-slate-800">
                Pilot Guide
              </Link>
              <a href={`mailto:${supportEmail}`} className="rounded border border-slate-300 px-6 py-3 text-[14px] font-semibold text-slate-700 hover:bg-slate-50">
                Contact Pilot Support
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
