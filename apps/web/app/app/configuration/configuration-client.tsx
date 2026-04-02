"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Circle,
  FileSearch,
  Send,
  Settings
} from "lucide-react";

import { cn } from "../../../lib/cn";
import type { AuditEventView, PayerConfigurationView } from "../../../lib/pilot-api";

function statusBadge(status: PayerConfigurationView["status"]) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" />
        Active
      </span>
    );
  }

  if (status === "needs_attention") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        Needs Attention
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
      <Circle className="h-3 w-3" />
      Inactive
    </span>
  );
}

export function ConfigurationClient({
  payers,
  auditEvents
}: {
  payers: PayerConfigurationView[];
  auditEvents: AuditEventView[];
}) {
  const [selectedPayer, setSelectedPayer] = useState(payers[0]?.payerId ?? "");
  const currentPayer = payers.find((payer) => payer.payerId === selectedPayer) ?? payers[0];
  const configurationEvents = useMemo(
    () => auditEvents.filter((event) => event.category === "Config Change").slice(0, 5),
    [auditEvents]
  );

  if (!currentPayer) {
    return null;
  }

  return (
    <div className="flex h-full">
      <div className="w-80 shrink-0 overflow-auto border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Payer Profiles</h2>
          <p className="text-xs text-gray-600">Live payer configuration and rule ownership.</p>
        </div>
        <div className="p-2">
          {payers.map((payer) => (
            <button
              key={payer.payerId}
              onClick={() => setSelectedPayer(payer.payerId)}
              className={cn(
                "mb-2 w-full rounded-lg border p-3 text-left transition-colors",
                selectedPayer === payer.payerId
                  ? "border-blue-200 bg-blue-50"
                  : "border-transparent hover:bg-gray-50"
              )}
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="text-sm font-medium text-gray-900">{payer.payerName}</span>
                {payer.issues.length > 0 ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-700">
                    {payer.issues.length}
                  </span>
                ) : null}
              </div>
              <div className="mb-2">{statusBadge(payer.status)}</div>
              <div className="text-xs text-gray-600">
                {payer.enabledWorkflows.length} workflows •{" "}
                {new Date(payer.lastVerifiedAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{currentPayer.payerName}</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Configure payer-specific review thresholds, mappings, and downstream delivery.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(currentPayer.status)}
                <span className="text-sm text-gray-600">Owner: {currentPayer.owner}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>Last verified: {new Date(currentPayer.lastVerifiedAt).toLocaleString()}</span>
              <span>Threshold: {Math.round(currentPayer.reviewThreshold * 100)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-medium text-gray-900">Status Mapping Rules</h3>
              <div className="space-y-2">
                {currentPayer.statusRules.map((rule) => (
                  <div key={rule} className="flex items-center justify-between rounded border border-gray-200 p-3">
                    <div className="text-sm text-gray-900">{rule}</div>
                    <Settings className="h-4 w-4 text-gray-500" />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-medium text-gray-900">Review Rules</h3>
              <div className="space-y-2">
                {currentPayer.reviewRules.map((rule) => (
                  <div key={rule} className="rounded border border-gray-200 p-3 text-sm text-gray-900">
                    {rule}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-medium text-gray-900">Destinations</h3>
              <div className="space-y-2">
                {currentPayer.destinations.map((destination) => (
                  <div key={destination.id} className="flex items-center justify-between rounded border border-gray-200 p-3">
                    <div className="flex items-center gap-3">
                      <Send className="h-4 w-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{destination.label}</div>
                        <div className="mt-1 text-xs text-gray-600">
                          {destination.kind} • {destination.status}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-medium text-gray-900">Open Issues</h3>
              <div className="space-y-2">
                {currentPayer.issues.length > 0 ? (
                  currentPayer.issues.map((issue) => (
                    <div key={issue} className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {issue}
                    </div>
                  ))
                ) : (
                  <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    No configuration issues detected.
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-sm font-medium text-gray-900">Configuration Audit Trail</h3>
              <p className="mt-1 text-xs text-gray-600">Recent configuration changes from the audit log.</p>
            </div>
            <div className="divide-y divide-gray-100">
              {configurationEvents.map((event) => (
                <div key={event.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <FileSearch className="mt-0.5 h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.action}</div>
                      <div className="mt-1 text-xs text-gray-600">{event.summary}</div>
                      <div className="mt-2 text-xs text-gray-500">
                        {event.actor.name} • {event.date} {event.time}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
