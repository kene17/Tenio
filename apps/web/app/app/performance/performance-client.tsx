"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

import { KPICard } from "../../../components/kpi-card";
import type { TenioMessages } from "../../../lib/locale";
import type { PerformanceView } from "../../../lib/pilot-api";

function riskBadge(risk: string, labels: TenioMessages["performance"]["riskLevel"]) {
  const key = risk.trim().toLowerCase();
  const cls =
    key === "high"
      ? "border-red-200 bg-red-50 text-red-700"
      : key === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-green-200 bg-green-50 text-green-700";
  const text = key === "high" ? labels.high : key === "medium" ? labels.medium : labels.low;
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {text}
    </span>
  );
}

export function PerformanceClient({
  data,
  messages
}: {
  data: PerformanceView;
  messages: TenioMessages["performance"];
}) {
  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">{messages.heading}</h1>
          <p className="mt-1 text-sm text-gray-600">{messages.subheading}</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KPICard label={messages.kpis.claimsWorkedToday} value={String(data.summary.claimsWorkedToday)} />
          <KPICard
            label={messages.kpis.avgResolutionTime}
            value={data.summary.avgResolutionTimeDays}
            variant="success"
          />
          <KPICard
            label={messages.kpis.slaCompliance}
            value={data.summary.slaCompliance}
            variant="success"
          />
          <KPICard
            label={messages.kpis.needsReview}
            value={String(data.summary.needsReview)}
            variant="warning"
          />
          <KPICard
            label={messages.kpis.claimsResolved}
            value={String(data.summary.claimsResolved)}
            variant="success"
          />
          <KPICard label={messages.kpis.avgTouchesPerClaim} value={data.summary.avgTouchesPerClaim} />
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <KPICard label={messages.kpis.automationCoverage} value={data.agentOverview.automationCoverage} />
          <KPICard label={messages.kpis.reviewRate} value={data.agentOverview.reviewRate} variant="warning" />
          <KPICard label={messages.kpis.retryQueue} value={String(data.agentOverview.retryQueue)} variant="warning" />
          <KPICard label={messages.kpis.failedRuns} value={String(data.agentOverview.failedRuns)} variant="warning" />
          <KPICard label={messages.kpis.lowConfidenceRate} value={data.agentOverview.lowConfidenceRate} />
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <KPICard label={messages.kpis.touchesRemoved} value={String(data.summary.touchesRemoved)} />
          <KPICard
            label={messages.kpis.claimsRequiringCall}
            value={String(data.summary.claimsRequiringCall)}
            variant="warning"
          />
          <KPICard label={messages.kpis.callRequiredRate} value={data.summary.phoneCallRate} variant="warning" />
          <KPICard
            label={messages.kpis.primaryConnectorSuccess}
            value={data.connectorHealth[0]?.successRate ?? "0%"}
            variant="success"
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{messages.sections.resolutionSnapshotTitle}</h3>
                <p className="mt-1 text-xs text-gray-600">{messages.sections.resolutionSnapshotBody}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.resolutionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="unresolved" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{messages.sections.queueVolumeTitle}</h3>
                <p className="mt-1 text-xs text-gray-600">{messages.sections.queueVolumeBody}</p>
              </div>
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.queueVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900">{messages.sections.agingDistributionTitle}</h3>
              <p className="mt-1 text-xs text-gray-600">{messages.sections.agingDistributionBody}</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data.agingBuckets} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {data.agingBuckets.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">{messages.sections.operationalInsightsTitle}</h3>
                <p className="mt-1 text-xs text-gray-600">{messages.sections.operationalInsightsBody}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="space-y-3">
              {data.alerts.map((alert) => (
                <div
                  key={alert.title}
                  className={`flex items-start gap-3 rounded border p-3 ${
                    alert.severity === "critical"
                      ? "border-red-200 bg-red-50"
                      : alert.severity === "good"
                        ? "border-green-200 bg-green-50"
                        : "border-amber-200 bg-amber-50"
                  }`}
                >
                  {alert.severity === "good" ? (
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <AlertTriangle
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        alert.severity === "critical" ? "text-red-600" : "text-amber-600"
                      }`}
                    />
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                    <div className="mt-1 text-xs text-gray-700">{alert.body}</div>
                    <div className="mt-2 text-xs text-gray-500">{alert.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-medium text-gray-900">{messages.sections.payerPerformanceTitle}</h3>
            <p className="mt-1 text-xs text-gray-600">{messages.sections.payerPerformanceBody}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                    messages.tables.payerPerformance.payer,
                    messages.tables.payerPerformance.openClaims,
                    messages.tables.payerPerformance.avgResolutionTime,
                    messages.tables.payerPerformance.slaRisk,
                    messages.tables.payerPerformance.needsReview,
                    messages.tables.payerPerformance.callRequired,
                    messages.tables.payerPerformance.lastDelay
                  ].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.payerPerformance.map((item) => (
                  <tr key={item.payer} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.payer}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.openClaims}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.avgResolutionTime}</td>
                    <td className="px-4 py-3">{riskBadge(item.risk, messages.riskLevel)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.reviewRate}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.phoneCallRate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.lastDelay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-medium text-gray-900">{messages.sections.teamPerformanceTitle}</h3>
            <p className="mt-1 text-xs text-gray-600">{messages.sections.teamPerformanceBody}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                    messages.tables.teamPerformance.owner,
                    messages.tables.teamPerformance.activeClaims,
                    messages.tables.teamPerformance.resolved,
                    messages.tables.teamPerformance.avgTouches,
                    messages.tables.teamPerformance.slaCompliance,
                    messages.tables.teamPerformance.escalationRate
                  ].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.teamPerformance.map((item) => (
                  <tr key={item.owner} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.owner}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.activeClaims}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.resolvedThisWeek}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.avgTouches}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.slaCompliance}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.escalationRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-medium text-gray-900">{messages.sections.connectorHealthTitle}</h3>
            <p className="mt-1 text-xs text-gray-600">{messages.sections.connectorHealthBody}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                    messages.tables.connectorHealth.connector,
                    messages.tables.connectorHealth.mode,
                    messages.tables.connectorHealth.completed,
                    messages.tables.connectorHealth.retried,
                    messages.tables.connectorHealth.failed,
                    messages.tables.connectorHealth.successRate,
                    messages.tables.connectorHealth.lastActivity,
                    messages.tables.connectorHealth.lastError
                  ].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.connectorHealth.length > 0 ? data.connectorHealth.map((item) => (
                  <tr key={`${item.connector}-${item.mode}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.connector}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{item.mode}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.completed}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.retried}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.failed}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.successRate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.lastActivity}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.lastError}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-sm text-gray-600">
                      {messages.noConnectorActivity}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
