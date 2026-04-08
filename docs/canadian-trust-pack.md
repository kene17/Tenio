# Canadian Trust Pack

This document is the internal operating packet for a first Canadian customer deployment. It is not a legal opinion. It defines the minimum trust posture Tenio should be able to explain and operate.

## Scope

This packet applies to:

- Canadian hosted environments
- customer data that may include PHI or claims-adjacent personal information
- Ottawa-first pilots in dental, benefits follow-up, or billing-service workflows

## Hosting And Data Residency

Default Canadian posture:

- host production workloads in Canada
- keep PHI-touching services and storage in `ca-central-1`
- keep evidence artifacts in Canadian object storage
- keep backups for PHI-touching systems in Canada unless contractually agreed otherwise

Minimum services to document per environment:

- web hosting
- API hosting
- worker hosting
- AI service hosting
- database
- object storage
- logging and backup providers

## Data Categories

Tenio may store:

- claim identifiers
- patient and subscriber names
- payer identifiers
- workflow state
- queue ownership and SLA data
- retrieval observations
- evidence artifacts
- audit events
- user/session records

Tenio should not store more PHI than required for claim-status follow-up.

## Access Model

Current access model to explain to a Canadian buyer:

- authenticated user sessions for human access
- service-to-service tokens for web, worker, and AI internal calls
- organization-scoped claim, result, and evidence access
- manager/admin gating for payer-configuration changes
- app-mediated evidence download only

Operational rule:

- any access to PHI-sensitive evidence or claim detail must remain attributable to a user, service token, or worker identity

## Retention And Deletion

Default operating posture for a first Canadian deployment:

- evidence retention is configured per environment and documented before go-live
- workflow and audit retention follow the hosted database backup policy
- customer deletion requests and retention overrides are handled as Tenio-operated support actions until self-serve controls exist

Before go-live, document:

- default evidence retention window
- backup retention window
- deletion process owner
- customer offboarding export/delete process

## Incident And Breach Handling

Tenio should be able to state, before contracting:

- named support contact path
- named incident owner on the Tenio team
- where alerts route
- how a customer is notified of a confirmed incident
- who owns rollback and restore

Internal minimum for a Canadian pilot:

- preserve request IDs, retrieval job IDs, and agent run IDs for tracing
- keep an evidence access trail
- maintain a written incident log
- document the customer notification path for security incidents

## Subprocessors

Maintain an explicit subprocessor list per environment:

- infrastructure host
- database provider
- object storage provider
- logging provider
- backup provider
- AI provider

Do not present “Canadian trust” without this list being current.

## Customer-Facing Claims Tenio Can Make

Safe claims:

- workflow remains authoritative
- evidence is served through authenticated app access
- Canadian deployments can be hosted in Canada
- access is role-scoped and traceable
- automation does not silently finalize official claim state

Claims to avoid unless separately proven:

- PHIPA certification
- blanket PIPEDA/PHIPA compliance guarantees
- SOC 2 equivalence
- production readiness for all Canadian payers
- 24/7 response coverage

## Pre-Go-Live Checklist

- Canadian region chosen and recorded
- subprocessor list completed
- retention/delete defaults documented
- support path documented
- incident path documented
- backup/restore owner named
- evidence storage location confirmed
- environment-specific secrets separated from US/demo environments

## Gaps Still Open In Repo

As of April 7, 2026:

- this repo now has Canada-aware workflow fields and a validation-only Sun Life / PSHCP path
- it does not yet prove a live Canadian payer integration
- it does not yet include a customer-specific DPA/privacy packet
- it does not yet enforce or verify Canadian hosting in code

That means this trust pack is an operating baseline, not a completed compliance program.
