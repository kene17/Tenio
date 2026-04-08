# Customer Readiness Packet

This packet is the customer-facing summary for Tenio's first dedicated hosted deployment.

## What Tenio Is

Tenio is the workflow OS for claim-status work powered by automation.

The workflow layer is the system of record. It owns:

- queue state
- ownership
- review and routing
- SLA visibility
- evidence access
- audit history

Automation runs underneath that workflow. It can:

- retrieve payer status
- recover from connector failures
- attach evidence
- interpret payer output
- recommend `resolve`, `review`, or `retry`

Automation does not independently commit official claim state.

## Supported Production Scope

The current supported first-customer scope is:

- one dedicated hosted environment
- one primary payer path: Aetna claim-status retrieval
- one operating motion: claim-status follow-up and review
- active-inventory-first onboarding through CSV import
- app-mediated evidence access

Tenio is designed to expand beyond that scope, but tomorrow's supported deployment story is intentionally narrow.

## Hosted Deployment Model

The first hosted deployment uses:

- `apps/web` as the authenticated user-facing workspace
- `apps/api` as the workflow system of record
- `apps/worker` as the asynchronous retrieval runtime
- `services/ai` as the planning and interpretation service
- managed Postgres for product state
- managed object storage for evidence artifacts

Externally reachable services should be fronted by TLS. Worker and AI traffic stays private to the hosted environment.

## Access Model

Tenio currently supports four product roles:

| Role | Primary use |
| --- | --- |
| `owner` | practice or environment oversight, user management, billing/account visibility |
| `manager` | queue ownership, review oversight, reporting, export |
| `operator` | daily claim follow-up work |
| `viewer` | read-oriented access for observation and support workflows |

Verified sensitive access control in the current product:

- payer workflow policy updates require `owner`
- result export requires `owner` or `manager`
- claim import, claim intake, retrieval requests, and workflow actions require `owner`, `manager`, or `operator`
- evidence download requires an authenticated user session plus organization scope

Seeded demo credentials should be treated as local-development-only. Hosted partner environments should use environment-specific named accounts.

## Security And Data Handling

Tenio currently operates with:

- signed web sessions
- service-to-service tokens between web, API, worker, and AI services
- fail-closed API access outside `/health` and `/ready`
- request correlation IDs across API, worker, and AI flows
- audit events for sign-in, intake, workflow actions, retrieval queueing, and retrieval outcomes

Data stored by Tenio includes:

- claims and queue state
- sessions and user roles
- retrieval jobs and agent runs
- result records and audit history
- evidence metadata and evidence artifacts

Evidence artifacts are stored separately from workflow state and are served through authenticated app access.

Default operational expectations for the first hosted release:

- evidence retention defaults to `30` days unless the customer environment is configured differently
- workflow data retention follows the hosted database backup and restore policy
- deletion and retention changes should be agreed per customer environment before go-live

Environment-specific deployment packets should name the actual infrastructure providers used for:

- application hosting
- Postgres
- object storage
- backups
- AI provider access

The current AI provider path is OpenAI-backed when configured. The workflow boundary does not change when that provider is enabled.

## Onboarding And Operations

The recommended first rollout path is:

1. import a bounded active inventory through CSV preview + commit
2. start new claim-status work in Tenio
3. run the supported Aetna retrieval path
4. review exceptions inside Tenio
5. export validated results when needed

Support and operations rely on:

- health and readiness checks
- audit trail visibility
- trace IDs and request IDs
- retrieval job and agent run tracing
- documented rollback and restore steps

Pre-handoff usability bar for a design partner:

- a non-builder must be able to log in, import a file, open the queue, open a claim, record a structured follow-up, inspect evidence, and return to the queue without live guidance
- if that user gets stuck, treat it as a product bug or UX gap before partner handoff

## Support Model

For the first hosted customer deployment, Tenio should operate with:

- one named support contact path
- incident communication owned by the Tenio team
- rollback ownership on the Tenio team
- database backup and restore ownership on the Tenio team
- replay and retrieval incident handling through the workflow API plus worker runbook

## Current Limits

Tenio should not currently be positioned as:

- a broad all-payer platform
- a generic self-serve multi-tenant product
- a fully autonomous claim-decision engine
- a SOC 2-certified environment
- a 24/7 support organization

The right current offer is a dedicated hosted first-customer deployment for one supported workflow, with explicit expansion steps after go-live.
