# Pilot Runbook

## Required Environment

- `TENIO_API_BASE_URL`: base URL for the API, for example `http://127.0.0.1:4000`
- `TENIO_WEB_SERVICE_TOKEN`: shared secret for web-to-API requests
- `TENIO_WEB_SESSION_SECRET`: secret used to sign web sessions
- `TENIO_WORKER_SERVICE_TOKEN`: shared secret for worker-to-API requests
- `TENIO_AI_SERVICE_TOKEN`: shared secret for API-to-AI and worker-to-AI requests
- `AI_SERVICE_URL`: base URL for the AI service, for example `http://127.0.0.1:8000`
- `NEXT_PUBLIC_PILOT_SUPPORT_EMAIL`: optional support inbox shown in the pilot guide
- `DATABASE_URL`: required for the API, using the Docker-mapped port `5433`, for example `postgres://postgres:postgres@127.0.0.1:5433/tenio`

## Start Services

From the repo root:

```bash
npm install
npm run db:up
npm run setup:ai
npm run dev:ai
npm run dev:api
npm run dev:worker
npm run dev:web
```

The repo includes a `docker-compose.yml` that starts Postgres as `tenio-postgres` on host port `5433`.

Equivalent direct Docker command:

```bash
docker run --name tenio-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tenio \
  -p 5433:5432 \
  -d postgres:16
```

Useful helpers:

```bash
npm run db:up
npm run db:down
npm run db:logs
```

## Smoke Test

1. Open `/login` and sign in with a seeded pilot user.
2. Confirm `/app/queue` loads live claims.
3. Open any claim detail page.
4. Click `Request Re-check`.
5. Confirm queue, claim detail, results, and audit log all reflect the new retrieval.
6. Add a note or assignment change and confirm the audit trail updates.

## Operator Checks

- If the queue is empty, verify the API is running and returning `/queue`.
- If the API fails to start, confirm the `tenio` database exists inside `tenio-postgres`.
- If retrieval fails, confirm the worker can claim jobs and the AI service is reachable.
- If the web app shows unauthorized API errors, verify `TENIO_WEB_SERVICE_TOKEN` matches in web and API.
- If a pilot user cannot sign in, confirm the seeded user credentials match the API environment and `TENIO_WEB_SESSION_SECRET` is set.
- Verify `DATABASE_URL` points at `127.0.0.1:5433` for local Docker Postgres.

## Pilot Support Flow

1. Ask the user for the claim ID and what they expected to see.
2. Open the claim detail page and audit log entry for the same claim.
3. Capture the evidence reference and request ID from the audit event.
4. Re-run retrieval if the status is stale.
5. Escalate any blocked or contradictory claims to the pilot lead with the claim ID, request ID, and evidence reference.
