# Tenio

Tenio is a workflow OS for claim-status work powered by automation.

This repo is intentionally structured as a monorepo:

- `apps/web`: customer-facing product UI
- `apps/api`: TypeScript workflow API and product-state backend
- `apps/worker`: TypeScript execution workers for retrieval and evidence capture
- `services/ai`: Python AI service for model-native inference tasks
- `packages/contracts`: cross-service schemas and execution contracts
- `packages/domain`: product-state models for claims, queue items, and reviews

The architecture follows four layers:

1. Product layer: queue UI, claim detail, results, performance, configuration
2. Workflow layer: state machine, routing, SLA, review, normalization, auditability
3. Execution layer: payer connectors, browser/session work, extraction, retries
4. Systems layer: API, auth, queues, database, storage, and observability

Important design rule:

- product state lives in claims, work items, reviews, and evidence
- job runs are implementation detail, not the product's source of truth
- Python AI services return candidate outputs; the TypeScript workflow layer decides official state transitions

## Local Production MVP Quick Start

1. Start Postgres on Docker port `5433`:

```bash
npm run db:up
```

2. Set up the AI service virtualenv once:

```bash
npm run setup:ai
```

3. Start the AI service:

```bash
npm run dev:ai
```

4. Start the API:

```bash
npm run dev:api
```

5. Start the retrieval worker:

```bash
npm run dev:worker
```

6. Start the web app:

```bash
npm run dev:web
```

7. Check API health and readiness:

```bash
npm run health:api
npm run ready:api
```

8. Open the product:

- Login: `http://127.0.0.1:3000/login`
- Queue: `http://127.0.0.1:3000/app/queue`
- Claims: `http://127.0.0.1:3000/app/claims`
- Performance: `http://127.0.0.1:3000/app/performance`

## Seed Users

- Admin: `ops.admin@acme-rcm.test` / `tenio-admin-demo`
- Manager: `queue.manager@acme-rcm.test` / `tenio-manager-demo`
- Operator: `operator.one@acme-rcm.test` / `tenio-operator-demo`

## Validation

```bash
npm run typecheck
npm run test
npm run build
```

## Docs

- Production runbook: `docs/production-mvp-runbook.md`
- Security architecture: `docs/security-architecture.md`
- System architecture: `docs/architecture.md`
- Product roadmap: `docs/product-roadmap.md`
- Agentic layer: `docs/agentic-layer.md`
- ICP and wedge strategy: `docs/icp-wedge-strategy.md`
- Hosted customer readiness: `docs/hosted-customer-readiness.md`
- Customer onboarding playbook: `docs/customer-onboarding-playbook.md`
- Website messaging: `docs/website-messaging.md`
- Sales one-pager: `docs/sales-one-pager.md`
- Founder pitch: `docs/founder-pitch.md`
- Security and trust summary: `docs/security-trust-summary.md`
- Design partner launch: `docs/design-partner-launch.md`
