# Design Partner Support Runbook

Use this workflow when an Ottawa design partner reports an issue in the live pilot.

## Intake

Ask for exactly:

- approximate time of the issue
- what they were doing
- any message they saw
- claim number or import batch if known

Use the partner's `orgId` as the primary filter key in logs.

## Triage Order

1. Check API request logs for the partner org and reported time window.
2. Check Sentry for matching API or web exceptions.
3. Check the audit log for the claim, import batch, or user action involved.
4. Check the `/app/status` page values for import freshness and recent failures.

## CloudWatch Logs Insights Query

```text
fields timestamp, userId, route, statusCode, durationMs, error
| filter orgId = "<PARTNER_ORG_ID>"
| filter statusCode >= 400
| sort timestamp desc
| limit 50
```

Replace `<PARTNER_ORG_ID>` during onboarding and save the query.

## Communication Pattern

- Use a shared Slack or Discord channel with the partner's main contact.
- Acknowledge the issue with the time window you are investigating.
- Report back with one of:
  - reproduced and fixed
  - reproduced and mitigation in place
  - not reproduced, requesting a narrower timestamp or claim reference

## What To Look For

- `import.preview` and `import.commit` audit events for onboarding issues
- `claim.imported` events for row-level import questions
- `followup.logged` and `claim.status_updated` for workflow disputes
- `evidence.downloaded` for evidence access questions
- worker terminal logs for connector/runtime failures
- Sentry events tagged with `orgId`, `role`, and `requestId`
