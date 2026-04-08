# Production MVP Runbook

## Services

- `apps/web`: authenticated product UI
- `apps/api`: workflow API, auth, queue ownership, audit
- `apps/worker`: async autonomous retrieval worker
- `services/ai`: AI planning and interpretation service
- `postgres`: primary system of record on host port `5433`

## Required Environment Variables

### API

- `TENIO_API_KEY`
- `TENIO_WEB_SERVICE_TOKEN`
- `TENIO_WORKER_SERVICE_TOKEN`
- `TENIO_AI_SERVICE_TOKEN`
- `AI_SERVICE_URL`
- `DATABASE_URL`
- `TENIO_EVIDENCE_STORAGE_BACKEND` (optional; currently `filesystem`)
- `TENIO_EVIDENCE_STORAGE_DIR` (optional; defaults to repo-local `.data/evidence`)
- `TENIO_EVIDENCE_RETENTION_DAYS` (optional; defaults to `30`)
- `TENIO_EVIDENCE_S3_BUCKET` (required when backend is `s3`)
- `TENIO_EVIDENCE_S3_REGION` (required when backend is `s3`)
- `TENIO_EVIDENCE_S3_ACCESS_KEY_ID` (required when backend is `s3`)
- `TENIO_EVIDENCE_S3_SECRET_ACCESS_KEY` (required when backend is `s3`)
- `TENIO_EVIDENCE_S3_ENDPOINT` (optional; for S3-compatible stores such as MinIO or R2)
- `TENIO_EVIDENCE_S3_SESSION_TOKEN` (optional)
- `TENIO_EVIDENCE_S3_PREFIX` (optional)
- `TENIO_EVIDENCE_S3_FORCE_PATH_STYLE` (optional; defaults to `true`)

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
- `TENIO_AETNA_API_BASE_URL` (required for the live Aetna connector; unset to use local fixture mode)
- `TENIO_AETNA_API_TOKEN` (required for the live Aetna connector)

### AI

- `TENIO_AI_SERVICE_TOKEN`
- `OPENAI_API_KEY` (required when `TENIO_AGENT_PROVIDER=openai`; used automatically in `auto` mode when present)
- `TENIO_AGENT_PROVIDER` (optional; `auto`, `openai`, or `heuristic`; defaults to `auto`)
- `TENIO_AGENT_MODEL` (optional; defaults to `gpt-5-mini`)

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

## Trusted Connector Mode

- The worker now runs a single-claim autonomous retrieval loop with durable `agent_run` / `agent_step` state in the workflow database.
- Planner output is limited to retrieval-and-recovery directives plus a final `ExecutionCandidate`; workflow remains authoritative for official claim state.
- In local development, `services/ai` loads `.env`, `apps/api/.env`, `services/ai/.env`, and `apps/web/.env.local` as fallback env sources so a local `OPENAI_API_KEY` can be picked up without manual export.
- `payer_aetna` now uses the structured `aetna-claim-status-api` connector path.
- When `TENIO_AETNA_API_BASE_URL` and `TENIO_AETNA_API_TOKEN` are both set, the worker calls the live upstream API.
- When either variable is unset, the worker stays in local fixture mode for deterministic development and smoke tests.
- Local fixture triggers:
  - claim number containing `204938` or `review`: pending medical review
  - claim number containing `204821` or `denied`: denied
  - claim number containing `missing` or `retry`: incomplete payload that schedules retry
  - any other Aetna claim number: paid in full

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
4. For Aetna smoke tests, use a claim number that matches the fixture triggers above.
5. Confirm the worker picks up the job and the claim status changes.
6. Add a note or assignment change and verify the audit log updates.
7. Open Performance and Configuration to confirm they load live data.

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
