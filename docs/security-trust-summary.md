# Security And Trust Summary

This document is a customer-facing summary of the trust model behind Tenio.

## Product Principle

Automation does not own official claim state by itself.

Automation can:

- retrieve claim status
- interpret messy payer output
- attach evidence
- propose a candidate result

The workflow layer owns:

- official state transitions
- routing and review
- ownership
- audit trail

## Current Security Model

Tenio currently uses:

- signed web sessions
- role-based access control
- service-to-service token authentication
- fail-closed API access outside health endpoints
- audit logging for sign-in, intake, workflow actions, retrieval queueing, and retrieval outcomes

Sensitive workflow controls currently verified in the product:

- payer policy edits require manager or admin access
- evidence downloads require an authenticated user session scoped to the caller's organization
- result export requires an authenticated user session

## Data Boundaries

- product state lives in Postgres
- retrieval execution runs asynchronously
- evidence metadata is tracked separately from workflow state
- health output redacts credentials
- evidence artifacts are served through app-mediated authenticated access

The product currently stores:

- claims and queue state
- user sessions and roles
- retrieval jobs and agent runs
- result records and audit history
- evidence metadata and evidence artifacts

## Early Hosted Commitments

For hosted customer environments, Tenio should operate with:

- managed secrets
- TLS on every externally reachable service
- managed database backups
- managed object storage for evidence
- restore drills before customer go-live
- centralized observability and operational alerts

Hosted customer packets should also explicitly document:

- the actual hosting, database, storage, and backup providers in use
- the active AI provider path when enabled
- retention and deletion expectations for workflow data and evidence artifacts

## Current Supported Scope

The current supported deployment story is intentionally narrow:

- one dedicated hosted customer environment
- one primary trusted payer path: Aetna claim-status retrieval
- active-inventory-first onboarding
- governed workflow review for exceptions

Tenio should not currently be positioned as a broad all-payer platform, a self-serve multi-tenant product, or a fully autonomous claim-decision system.

## Why This Matters

Customers do not just need automation.

They need a workflow system they can trust for review, evidence, auditability, and operational control.
