import Link from "next/link";

const supportEmail = process.env.NEXT_PUBLIC_PILOT_SUPPORT_EMAIL ?? "pilot-support@example.com";

export default function PilotGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Workflow OS Pilot Guide</h1>
          <p className="mt-2 text-sm text-gray-600">
            Use this checklist to get a pilot user into the workspace, run one bounded
            workflow, and confirm evidence plus audit visibility.
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">User Checklist</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div>1. Open the workspace and sign in with a seeded or pilot user account.</div>
            <div>2. Start in `/app/queue` and confirm live claims plus ownership signals are visible.</div>
            <div>3. Open one claim detail page and review evidence, workflow state, and recent audit activity.</div>
            <div>4. Trigger `Request Re-check` on a claim that needs updated status.</div>
            <div>5. Refresh the claim and confirm the status, confidence, and evidence updated.</div>
            <div>6. Add a note or assignment change and verify `/app/audit-log` reflects the full trace.</div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Success Metrics</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div>1. Claims processed through the queue during the pilot window.</div>
            <div>2. Percentage of claims with evidence attached after retrieval.</div>
            <div>3. Average time from retrieval to reviewer decision.</div>
            <div>4. Manager confidence in backlog, SLA risk, and audit visibility.</div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Support Path</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div>
              Pilot support email:{" "}
              <a className="text-blue-600 hover:text-blue-700" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            </div>
            <div>Escalate blocked claims from the claim detail page and include the evidence reference.</div>
            <div>
              Operator runbook:{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">docs/pilot-runbook.md</code>
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign In
          </Link>
          <Link
            href="/app/queue"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Queue
          </Link>
        </div>
      </div>
    </div>
  );
}
