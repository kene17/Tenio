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
import type { PerformanceView } from "../../../lib/pilot-api";

function riskBadge(risk: string) {
  const cls =
    risk === "High"
      ? "border-red-200 bg-red-50 text-red-700"
      : risk === "Medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-green-200 bg-green-50 text-green-700";
  return (
    <span className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {risk}
    </span>
  );
}

export function PerformanceClient({ data }: { data: PerformanceView }) {
  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Performance</h1>
          <p className="mt-1 text-sm text-gray-600">
            Live throughput, SLA health, backlog, and claim-status operations metrics.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KPICard label="Claims Worked Today" value={String(data.summary.claimsWorkedToday)} />
          <KPICard
            label="Avg Resolution Time"
            value={data.summary.avgResolutionTimeDays}
            variant="success"
          />
          <KPICard
            label="SLA Compliance"
            value={data.summary.slaCompliance}
            variant="success"
          />
          <KPICard
            label="Needs Review"
            value={String(data.summary.needsReview)}
            variant="warning"
          />
          <KPICard
            label="Claims Resolved"
            value={String(data.summary.claimsResolved)}
            variant="success"
          />
          <KPICard label="Touches Removed" value={String(data.summary.touchesRemoved)} />
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <KPICard label="Automation Coverage" value={data.agentOverview.automationCoverage} />
          <KPICard label="Agent Review Rate" value={data.agentOverview.reviewRate} variant="warning" />
          <KPICard label="Retry Queue" value={String(data.agentOverview.retryQueue)} variant="warning" />
          <KPICard label="Failed Runs" value={String(data.agentOverview.failedRuns)} variant="warning" />
          <KPICard label="Low Confidence Rate" value={data.agentOverview.lowConfidenceRate} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Resolution Snapshot</h3>
                <p className="mt-1 text-xs text-gray-600">Resolved versus unresolved claims</p>
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
                <h3 className="text-sm font-medium text-gray-900">Queue Volume by Status</h3>
                <p className="mt-1 text-xs text-gray-600">Current distribution of work</p>
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
              <h3 className="text-sm font-medium text-gray-900">Aging Distribution</h3>
              <p className="mt-1 text-xs text-gray-600">Claims by age bucket</p>
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
                <h3 className="text-sm font-medium text-gray-900">Operational Insights</h3>
                <p className="mt-1 text-xs text-gray-600">Live alerts and recommendations</p>
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
            <h3 className="text-sm font-medium text-gray-900">Payer Performance</h3>
            <p className="mt-1 text-xs text-gray-600">Performance metrics by payer</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Payer", "Open Claims", "Avg Resolution Time", "SLA Risk", "Needs Review %", "Last Delay"].map((header) => (
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
                    <td className="px-4 py-3">{riskBadge(item.risk)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{item.reviewRate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.lastDelay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-medium text-gray-900">Team Performance</h3>
            <p className="mt-1 text-xs text-gray-600">Live contributor metrics</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Owner", "Active Claims", "Resolved", "Avg Touches", "SLA Compliance", "Escalation Rate"].map((header) => (
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
            <h3 className="text-sm font-medium text-gray-900">Agent Connector Health</h3>
            <p className="mt-1 text-xs text-gray-600">
              Runtime reliability, retries, and failure visibility by connector
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Connector", "Mode", "Completed", "Retried", "Failed", "Success Rate", "Last Activity", "Last Error"].map((header) => (
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
                      No connector activity has been recorded yet.
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
