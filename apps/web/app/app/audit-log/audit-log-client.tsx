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
import { cn } from "../../../lib/cn";
import type { AuditEventView } from "../../../lib/pilot-api";

type AuditLogClientProps = {
  events: AuditEventView[];
};

const AUDIT_EXPORT_ENABLED = false;

export function AuditLogClient({ events }: AuditLogClientProps) {
  const [selectedEvent, setSelectedEvent] = useState(events[0]);
  const [showFilters, setShowFilters] = useState(true);

  if (!selectedEvent) {
    return (
      <div className="p-6 text-sm text-gray-600">No audit events are available for the pilot yet.</div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-3.5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
            <p className="mt-0.5 text-xs text-gray-600">
              Live event history for claim routing, retrieval, review, and configuration changes.
            </p>
          </div>
          {AUDIT_EXPORT_ENABLED ? (
            <div className="flex flex-wrap items-center gap-2">
              <button className="flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                <Star className="h-3.5 w-3.5" />
                Saved Views
              </button>
              <button className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                <Download className="h-3.5 w-3.5" />
                Export Log
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KPICard title="Events Today" value={String(events.length)} subtitle="live records" />
            <KPICard
              title="Human Actions"
              value={String(events.filter((event) => event.actor.type === "human").length)}
              subtitle="manual interactions"
            />
            <KPICard
              title="System Actions"
              value={String(events.filter((event) => event.actor.type === "system").length)}
              subtitle="automated decisions"
            />
            <KPICard
              title="Sensitive Changes"
              value={String(events.filter((event) => event.sensitivity === "high-risk").length)}
              subtitle="requires attention"
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search claim ID, actor, note, or action"
                    className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowFilters((current) => !current)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap",
                    showFilters
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>

              {showFilters ? (
                <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                  {["Date Range", "Actor", "Action Type", "Object Type"].map((label) => (
                    <div key={label}>
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">
                        {label}
                      </label>
                      <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                        <option>All</option>
                      </select>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white lg:col-span-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      {["Time", "Actor", "Action", "Object", "Summary", "Sensitivity"].map(
                        (header, index) => (
                          <th key={header} className="px-4 py-3 text-left">
                            {index === 0 ? (
                              <button className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900">
                                {header}
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-gray-700">{header}</span>
                            )}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedEvent.id === event.id ? "bg-blue-50" : "hover:bg-gray-50"
                        )}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-900">{event.time}</div>
                          <div className="text-xs text-gray-500">{event.date}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                                event.actor.type === "human"
                                  ? "bg-blue-100 text-blue-700"
                                  : event.actor.type === "owner"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-700"
                              )}
                            >
                              {event.actor.avatar}
                            </div>
                            <div>
                              <div className="text-xs font-medium text-gray-900">
                                {event.actor.name}
                              </div>
                              <div className="text-xs text-gray-500">{event.source}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
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
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs font-medium text-gray-900">{event.object}</div>
                          <div className="text-xs text-gray-500">{event.objectId}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs truncate text-xs text-gray-900">
                            {event.summary}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {event.sensitivity === "high-risk" ? (
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                              <span className="text-xs font-medium text-red-700">High Risk</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white lg:col-span-4">
              <div className="flex-1 overflow-y-auto">
                <div className="border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white px-5 py-4">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">
                        {selectedEvent.action}
                      </h3>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-gray-500">Event ID:</span>
                        <span className="font-mono text-xs text-gray-700">{selectedEvent.id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="mb-1 text-gray-500">Time</div>
                      <div className="font-medium text-gray-900">{selectedEvent.time}</div>
                      <div className="text-gray-600">{selectedEvent.date}</div>
                    </div>
                    <div>
                      <div className="mb-1 text-gray-500">Actor</div>
                      <div className="font-medium text-gray-900">{selectedEvent.actor.name}</div>
                      <div className="text-gray-600">{selectedEvent.source}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="mb-1 text-gray-500">Object</div>
                      <div className="font-medium text-gray-900">
                        {selectedEvent.object} · {selectedEvent.objectId}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-200 px-5 py-4">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Summary
                  </h4>
                  <p className="text-sm leading-relaxed text-gray-900">{selectedEvent.summary}</p>
                </div>

                {selectedEvent.beforeAfter ? (
                  <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      Changes
                    </h4>
                    <div className="space-y-4">
                      {Object.entries(selectedEvent.beforeAfter).map(([key, value]) => {
                        const change = value as { from: string; to: string };

                        return <div key={key}>
                          <div className="mb-2 text-xs font-medium capitalize text-gray-600">
                            {key}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-red-200 bg-white p-3">
                              <div className="mb-2 text-xs font-semibold text-red-700">Before</div>
                              <div className="text-sm font-medium text-gray-900">{change.from}</div>
                            </div>
                            <div className="rounded-lg border border-green-200 bg-white p-3">
                              <div className="mb-2 text-xs font-semibold text-green-700">After</div>
                              <div className="text-sm font-medium text-gray-900">{change.to}</div>
                            </div>
                          </div>
                        </div>;
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="bg-gray-50 px-5 py-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-700">
                    Metadata
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    {[
                      ["Event ID", selectedEvent.id],
                      ["Request ID", selectedEvent.requestId ?? "—"],
                      ["Category", selectedEvent.category],
                      ["Organization", "Pilot org"],
                      ["Payer", selectedEvent.payer]
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between py-1.5">
                        <span className="text-gray-600">{label}</span>
                        <span className="text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-200 bg-white px-5 py-4">
                <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                  <ExternalLink className="h-4 w-4" />
                  View {selectedEvent.object}
                </button>
                <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <FileText className="h-4 w-4" />
                  Export Event
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
