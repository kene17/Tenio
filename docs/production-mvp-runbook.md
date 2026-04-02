# Production MVP Runbook

## Services

- `apps/web`: authenticated product UI
- `apps/api`: workflow API, auth, queue ownership, audit
- `apps/worker`: async retrieval worker
- `services/ai`: AI classification service
- `postgres`: primary system of record on host port `5433`

## Required Environment Variables

### API

- `TENIO_API_KEY`
- `TENIO_WEB_SERVICE_TOKEN`
- `TENIO_WORKER_SERVICE_TOKEN`
- `TENIO_AI_SERVICE_TOKEN`
- `AI_SERVICE_URL`
- `DATABASE_URL`
- `TENIO_EVIDENCE_STORAGE_DIR` (optional; defaults to repo-local `.data/evidence`)

### Web

- `TENIO_API_BASE_URL`
- `TENIO_WEB_SERVICE_TOKEN`
- `TENIO_WEB_SESSION_SECRET`
- `NEXT_PUBLIC_PILOT_SUPPORT_EMAIL`

### Worker

- `TENIO_API_BASE_URL`
- `TENIO_WORKER_SERVICE_TOKEN`
- `TENIO_AI_SERVICE_TOKEN`
- `AI_SERVICE_URL`

### AI

- `TENIO_AI_SERVICE_TOKEN`

## Local Startup

1. Start Postgres:
   `npm run db:up`
2. Start the AI service:
   `npm run dev:ai`
3. Start the workflow API:
   `npm run dev:api`
4. Start the retrieval worker:
   `npm run dev:worker`
5. Start the web app:
   `npm run dev:web`

## Seed Credentials

- Admin: `ops.admin@acme-rcm.test` / `tenio-admin-demo`
- Manager: `queue.manager@acme-rcm.test` / `tenio-manager-demo`
- Operator: `operator.one@acme-rcm.test` / `tenio-operator-demo`

Override these in `apps/api/.env` for non-demo environments.

## Health Checks

- API health: `npm run health:api`
- API readiness: `npm run ready:api`
- AI health: `GET http://127.0.0.1:8000/health`

## Smoke Test

1. Sign in through `/login` with a seeded user.
2. Create a claim from the Claims page intake form.
3. Queue a retrieval from the queue or claim detail page.
4. Confirm the worker picks up the job and the claim status changes.
5. Add a note or assignment change and verify the audit log updates.
6. Open Performance and Configuration to confirm they load live data.

## Operational Alerts

- Failed retrieval jobs surface in the Performance page alerts.
- Queue and SLA risk are visible in the Queue and Claim Detail pages.
- Access events and configuration changes appear in the Audit Log.

## Rollback Guidance

1. Stop web and worker traffic first.
2. Roll back the API and worker to the previous known-good build.
3. Keep the database schema forward-compatible; do not manually delete records.
4. Re-run the smoke test above before re-opening user access.

## Backup Expectations

- Enable automated Postgres backups in hosted environments.
- Retain evidence object storage and database backups together.
- Test restore procedures before customer go-live.
