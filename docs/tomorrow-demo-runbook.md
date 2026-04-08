# Tomorrow Demo Runbook

Use this runbook for the first paying-customer conversation.

## Positioning

Lead with this boundary:

- Tenio is the workflow OS for claim-status work.
- Automation performs retrieval and recovery under workflow control.
- Workflow remains authoritative for routing, review, ownership, and audit.

## Demo Scope

Keep the demo narrow:

- one hosted environment
- one payer path: Aetna
- one operating motion: claim-status retrieval, evidence capture, and review

Do not broaden the story to all payers, self-serve deployment, or autonomous claim decisioning.

## Demo Sequence

1. Sign in with a manager or operator account.
2. Open Queue and show live work ownership plus SLA context.
3. Open Onboarding and show CSV template, preview, validation, and commit flow.
4. Open a claim and show:
   - current workflow state
   - agent rationale and route reason
   - evidence access
   - traceability IDs
5. Trigger `Request Re-check`.
6. Show Aetna outcomes:
   - paid path
   - review path
   - retry path
7. Open Audit Log and show request ID visibility.
8. Open Results and show explicit export behavior.
9. Open Configuration and show that payer workflow policy is manager-controlled.

## Suggested Aetna Demo Inputs

In fixture mode:

- claim number containing `204938` or `review`: pending medical review
- claim number containing `204821` or `denied`: denied
- claim number containing `missing` or `retry`: incomplete payload and retry path
- any other Aetna claim number: paid in full

## Questions To Answer Clearly

If asked about readiness, say:

- the current supported scope is a dedicated hosted deployment for one customer and one trusted payer path
- evidence is stored durably and served through authenticated app access
- workflow decisions remain governed and auditable
- onboarding starts with active inventory, not a risky historical migration

If asked about what is not yet claimed, say:

- no claim of broad all-payer coverage
- no claim of SOC 2 certification today
- no claim of generic multi-tenant self-serve readiness
- no claim of fully autonomous claim decisioning

## Tonight Checklist

- confirm hosted URLs and logins
- confirm manager-only policy edit path
- confirm export flow
- confirm evidence opens
- confirm audit log request IDs are visible
- confirm Aetna paid, review, and retry paths all work in the hosted environment
- capture screenshots for queue, claim detail, evidence, audit log, and results export
