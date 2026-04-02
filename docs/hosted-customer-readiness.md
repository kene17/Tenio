# Hosted Customer Readiness

This document defines the first supported hosted model for Tenio.

The goal is not full certification on day one. The goal is a credible, secure, repeatable operating model for design partners and early customer deployments.

## Supported Topology

The first hosted environment should run:

- `apps/web` as the authenticated customer-facing application
- `apps/api` as the workflow system of record
- `apps/worker` as async retrieval workers
- `services/ai` as the interpretation service
- managed Postgres as the primary database
- managed object storage for evidence artifacts

## Deployment Model

Use one environment per customer-facing stage:

- development
- staging
- production

For the first hosted release:

- deploy `apps/web` and `apps/api` as separately managed services
- deploy `apps/worker` as a scalable background worker service
- deploy `services/ai` behind internal service access only
- keep Postgres and object storage managed rather than self-hosted

## Network And Access Model

- terminate TLS in front of every externally reachable service
- keep worker and AI traffic private to the hosted environment
- restrict direct database access to operators only
- require managed secrets for service tokens and session secrets
- avoid shared demo credentials in any hosted environment

## Data And Storage Model

Product state:

- Postgres remains the source of truth for claims, queue state, users, sessions, audit records, retrieval jobs, and evidence metadata

Evidence:

- store evidence files in managed object storage
- store only metadata and signed access references in Postgres
- enforce least-privilege access and expiration on evidence links

Backups:

- enable automated Postgres backups
- version and retain evidence storage alongside database retention
- document restore ownership and restore order

## Security Controls

Minimum controls for hosted customer environments:

- managed secret storage
- signed web sessions
- service-to-service token auth
- role-based access control
- redacted health output
- audited sign-in, workflow, and retrieval events
- periodic secret rotation procedure

Near-term additions:

- stronger tenant administration boundaries
- SSO direction and requirements
- environment-level access logging

## Observability And Alerts

Minimum observability:

- centralized logs for web, API, worker, and AI
- request correlation IDs across API and worker flows
- metrics for queue depth, retrieval failures, review load, and SLA risk
- alerts for worker failure, connector failure spikes, and database health issues

## Incident And Restore Readiness

Before customer go-live, Tenio should have:

- an incident severity model
- an on-call owner for each service
- documented rollback steps per service
- tested database restore procedures
- tested evidence artifact access after restore

## Release Gate

Treat a hosted environment as ready when all of the following are true:

- deployment is repeatable from documented steps
- secrets are not manually copied between services
- backups are enabled and restore has been tested
- evidence storage uses managed object storage
- core service alerts are configured
- runbooks cover deploy, rollback, incident response, and restore

## First Implementation Decisions

The first hosted release should assume:

- one managed Postgres instance per environment
- one managed object storage bucket family per environment
- web/API public access behind TLS
- worker/AI private access only
- customer rollout begins with design partners before broader self-serve or multi-tenant expansion
