# Security Architecture

## Identity

- Web sessions are signed with `TENIO_WEB_SESSION_SECRET`.
- Users authenticate against the workflow API and receive a session record plus a signed cookie.
- Roles currently supported: `admin`, `manager`, `operator`, `viewer`.

## Service Authentication

- Web to API calls use `TENIO_WEB_SERVICE_TOKEN`.
- Worker to API calls use `TENIO_WORKER_SERVICE_TOKEN`.
- API to AI calls use `TENIO_AI_SERVICE_TOKEN`.
- The API fails closed for all non-health routes.

## Data Boundaries

- Product state lives in Postgres.
- Retrieval execution runs asynchronously through `retrieval_jobs`.
- Evidence metadata is stored in Postgres via `evidence_artifacts`.
- Audit records are written for sign-in, intake, workflow actions, retrieval queueing, and retrieval outcomes.

## Operational Controls

- `/health` and `/ready` are the only unauthenticated endpoints.
- Database health output redacts credentials.
- CI runs typecheck, tests, and builds on every push and pull request.

## Production Follow-Ups

- Replace demo credentials before any shared environment.
- Store all tokens and secrets in a managed secret store.
- Terminate TLS in front of every service.
- Add database backups and restore drills before customer onboarding.
- Move evidence storage from demo URLs to managed object storage with signed access.
