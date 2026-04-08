# Support Traceability Sheet

Use this sheet during pilot support, incident response, and customer status reviews.

## Core Identifiers

| Identifier | What it represents | Where to find it |
| --- | --- | --- |
| Claim ID / Claim Number | the workflow record for one claim | claim detail header, results detail, queue, claims list |
| Retrieval Job ID | the active or last retrieval queue item for that claim | claim detail action panel when a retrieval is active |
| Agent Run ID | the autonomous retrieval runtime record for that retrieval job | claim detail action panel when a retrieval is active |
| Trace ID | the execution trace for retrieval and interpretation | claim detail agent interpretation panel, result detail metadata, retry history |
| Request ID | the API request correlation ID for audited actions | audit log detail panel and service logs |

## Support Flow

1. Start with the claim number and confirm the payer, owner, and current workflow state.
2. Open claim detail and capture the traceability identifiers above.
3. Check audit log for the related request ID and workflow event history.
4. If retrieval is active or failed, inspect retrieval job status, failure category, connector name, and execution mode.
5. If evidence is contradictory or missing, route the claim into governed review instead of manually overriding audit history.

## What To Send In An Escalation

Include:

- claim number
- payer
- retrieval job ID
- agent run ID
- trace ID
- request ID
- current queue state
- failure category or review reason

## Notes

- Trace IDs connect runtime activity across API, worker, and AI services.
- Request IDs connect user-facing actions and API logs.
- Retrieval job IDs and agent run IDs are the fastest way to isolate connector or runtime issues during live support.
