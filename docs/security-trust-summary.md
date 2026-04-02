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

## Data Boundaries

- product state lives in Postgres
- retrieval execution runs asynchronously
- evidence metadata is tracked separately from workflow state
- health output redacts credentials

## Early Hosted Commitments

For hosted customer environments, Tenio should operate with:

- managed secrets
- TLS on every externally reachable service
- managed database backups
- managed object storage for evidence
- restore drills before customer go-live
- centralized observability and operational alerts

## Why This Matters

Customers do not just need automation.

They need a workflow system they can trust for review, evidence, auditability, and operational control.
