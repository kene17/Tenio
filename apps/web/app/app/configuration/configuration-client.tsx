"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hasPermission, type UserRole } from "@tenio/domain";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Circle,
  FileSearch,
  Save,
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
  auditEvents,
  currentRole
}: {
  payers: PayerConfigurationView[];
  auditEvents: AuditEventView[];
  currentRole: UserRole;
}) {
  const router = useRouter();
  const canManageConfiguration = hasPermission(currentRole, "payer:write");
  const [payerState, setPayerState] = useState(payers);
  const [selectedPayer, setSelectedPayer] = useState(payers[0]?.payerId ?? "");
  const [owner, setOwner] = useState("");
  const [reviewThreshold, setReviewThreshold] = useState("85");
  const [escalationThreshold, setEscalationThreshold] = useState("55");
  const [defaultSlaHours, setDefaultSlaHours] = useState("24");
  const [autoAssignOwner, setAutoAssignOwner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentPayer = payerState.find((payer) => payer.payerId === selectedPayer) ?? payerState[0];
  const configurationEvents = useMemo(
    () => auditEvents.filter((event) => event.category === "Config Change").slice(0, 5),
    [auditEvents]
  );

  useEffect(() => {
    setPayerState(payers);
  }, [payers]);

  useEffect(() => {
    if (!currentPayer) {
      return;
    }

    setOwner(currentPayer.owner);
    setReviewThreshold(String(Math.round(currentPayer.reviewThreshold * 100)));
    setEscalationThreshold(String(Math.round(currentPayer.escalationThreshold * 100)));
    setDefaultSlaHours(String(currentPayer.defaultSlaHours));
    setAutoAssignOwner(currentPayer.autoAssignOwner);
  }, [currentPayer]);

  if (!currentPayer) {
    return null;
  }

  function handleSave() {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/configuration/payers/${encodeURIComponent(currentPayer.payerId)}/policy`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            owner,
            reviewThreshold: Number(reviewThreshold) / 100,
            escalationThreshold: Number(escalationThreshold) / 100,
            defaultSlaHours: Number(defaultSlaHours),
            autoAssignOwner
          })
        }
      );

      const payload = (await response.json()) as {
        item?: PayerConfigurationView;
        message?: string;
      };

      if (!response.ok || !payload.item) {
        setError(payload.message ?? "Policy update failed.");
        return;
      }

      setPayerState((existing) =>
        existing.map((payer) => (payer.payerId === payload.item?.payerId ? payload.item : payer))
      );
      setMessage("Policy saved. New thresholds will apply to future intake and retrieval runs.");
      router.refresh();
    });
  }

  return (
    <div className="flex h-full">
      <div className="w-80 shrink-0 overflow-auto border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Payer Profiles</h2>
          <p className="text-xs text-gray-600">Live payer configuration and rule ownership.</p>
        </div>
        <div className="p-2">
          {payerState.map((payer) => (
            <button
              key={payer.payerId}
              onClick={() => {
                setSelectedPayer(payer.payerId);
                setMessage(null);
                setError(null);
              }}
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
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                {payer.countryCode} / {payer.jurisdiction}
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
                  Configure payer-specific thresholds, SLA defaults, assignment rules, and
                  downstream delivery.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(currentPayer.status)}
                <span className="text-sm text-gray-600">Owner: {currentPayer.owner}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span>
                Jurisdiction: {currentPayer.countryCode} / {currentPayer.jurisdiction}
              </span>
              <span>Last verified: {new Date(currentPayer.lastVerifiedAt).toLocaleString()}</span>
              <span>Review threshold: {Math.round(currentPayer.reviewThreshold * 100)}%</span>
              <span>Escalation threshold: {Math.round(currentPayer.escalationThreshold * 100)}%</span>
              <span>Default SLA: {currentPayer.defaultSlaHours}h</span>
            </div>
          </div>

          <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Workflow Policy</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Future intake and retrieval decisions use these payer-level controls.
                </p>
              </div>
              {canManageConfiguration ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Save Policy
                </button>
              ) : null}
            </div>

            {message ? (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}
            {!canManageConfiguration ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Configuration edits are limited to owner roles in partner environments.
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Default Owner
                </span>
                <input
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  disabled={!canManageConfiguration}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Default SLA Hours
                </span>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={defaultSlaHours}
                  onChange={(event) => setDefaultSlaHours(event.target.value)}
                  disabled={!canManageConfiguration}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Review Threshold %
                </span>
                <input
                  type="number"
                  min={50}
                  max={99}
                  value={reviewThreshold}
                  onChange={(event) => setReviewThreshold(event.target.value)}
                  disabled={!canManageConfiguration}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Escalation Threshold %
                </span>
                <input
                  type="number"
                  min={10}
                  max={95}
                  value={escalationThreshold}
                  onChange={(event) => setEscalationThreshold(event.target.value)}
                  disabled={!canManageConfiguration}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoAssignOwner}
                onChange={(event) => setAutoAssignOwner(event.target.checked)}
                disabled={!canManageConfiguration}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-assign new intake and imported claims to the payer owner when no owner is supplied.
            </label>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-lg border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-medium text-gray-900">Status Mapping Rules</h3>
              <div className="space-y-2">
                {currentPayer.statusRules.map((rule) => (
                  <div
                    key={rule}
                    className="flex items-center justify-between rounded border border-gray-200 p-3"
                  >
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
                  <div
                    key={destination.id}
                    className="flex items-center justify-between rounded border border-gray-200 p-3"
                  >
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
                    <div
                      key={issue}
                      className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                    >
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
              <p className="mt-1 text-xs text-gray-600">
                Recent configuration changes from the audit log.
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {configurationEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between px-5 py-4 hover:bg-gray-50"
                >
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
