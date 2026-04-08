import Link from "next/link";

const supportEmail = process.env.NEXT_PUBLIC_PILOT_SUPPORT_EMAIL ?? "pilot-support@example.com";

export default function PilotGuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Hosted Customer Readiness Guide</h1>
          <p className="mt-2 text-sm text-gray-600">
            Use this guide to frame Tenio as a dedicated hosted workflow product for
            claim-status operations, confirm supported scope, and walk support and
            traceability details live in the product.
          </p>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Supported Scope</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div>1. Dedicated hosted environment for one customer team.</div>
            <div>2. Current trusted retrieval path: Aetna claim-status workflow.</div>
            <div>3. Onboarding starts with active inventory import, not full historical migration.</div>
            <div>4. Workflow remains authoritative for routing, review, ownership, and audit.</div>
            <div>5. Evidence is stored durably and served through authenticated app access.</div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Suggested Demo Flow</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div>1. Start in `/app/queue` and show ownership, SLA context, and live work.</div>
            <div>2. Open `/app/onboarding` and show template download, preview validation, and commit.</div>
            <div>3. Open one claim detail page and review workflow state, evidence, rationale, and traceability.</div>
            <div>4. Trigger `Request Re-check` and confirm the retrieval outcome updates the claim.</div>
            <div>5. Open `/app/audit-log` and show request ID visibility plus event history.</div>
            <div>6. Open `/app/results` and show explicit export behavior.</div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Access And Support Model</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div>Supported roles: owner, manager, operator, viewer.</div>
            <div>Role matrix: owner can manage payer policy, user access, and pilot-managed account settings; manager can export results and read status/audit surfaces; operator can import, intake, retrieve, and log follow-up; viewer is read-only.</div>
            <div>Evidence access requires an authenticated user session plus organization scope.</div>
            <div>Hosted pilot environments should use environment-specific non-demo accounts. Seeded demo credentials are for local development only.</div>
            <div>
              Customer support email:{" "}
              <a className="text-blue-600 hover:text-blue-700" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            </div>
            <div>
              Internal support docs:{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">docs/customer-readiness-packet.md</code>
              {" "}and{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">docs/support-traceability-sheet.md</code>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Traceability In The Product</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div>Claim detail shows the current connector, execution mode, and trace ID.</div>
            <div>Active retrieval cards surface retrieval job ID and agent run ID for support follow-up.</div>
            <div>Audit log details expose request IDs for workflow and configuration actions.</div>
            <div>Result detail metadata shows the trace ID tied to the exported result.</div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Partner Handoff Acceptance</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <div>Tuesday-morning walkthrough: log in, upload a CSV, open the queue, open one claim, log a structured follow-up, confirm evidence and timeline, then return to the queue.</div>
            <div>Cold-user criterion: someone who did not build the feature must complete that flow with no live guidance before a design partner gets access.</div>
            <div>If that user gets stuck, treat it as a product bug or UX gap, not a training issue.</div>
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
