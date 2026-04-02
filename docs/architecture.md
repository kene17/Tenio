# Architecture

Tenio uses a layered product architecture rather than a "big agent platform" architecture.

## Repo Shape

This codebase starts as a monorepo:

- `apps/web`: Next.js product UI
- `apps/api`: TypeScript workflow API
- `apps/worker`: TypeScript execution and retrieval workers
- `services/ai`: Python AI service for model-native workloads
- `packages/contracts`: cross-service contracts
- `packages/domain`: workflow and product-state models

This keeps workflow state, queue semantics, and cross-service contracts together while allowing Python AI workloads to scale independently.

## Layering

### 1. Product Layer

Customer-facing software:

- queue UI
- claim detail UI
- results
- performance
- configuration

### 2. Workflow Layer

Business logic and official product state:

- claim state
- queue and routing
- review and escalation
- SLA handling
- normalization
- auditability

### 3. Execution Layer

Messy payer-facing work:

- payer connectors
- browser sessions
- extraction
- retries
- evidence capture
- confidence scoring

This layer may use agentic logic, but it must return candidate results rather than directly mutating product state.

Python is the default runtime for model-native work in this layer.

### 4. Systems Layer

Boring infrastructure:

- REST API
- auth / RBAC
- job queue
- workers
- Postgres
- object storage
- metrics and alerts

Local convention:

- when running Postgres in Docker for development, map it to host port `5433`
- use a connection string like `postgres://postgres:postgres@127.0.0.1:5433/tenio`

## Boundary Rule

Important rule:

- claims, work items, reviews, and evidence are product state
- job runs and raw execution traces are implementation detail

The API/workflow layer owns state transitions.
The worker/execution layer returns candidate status, evidence, and confidence.
The Python AI service performs analysis but never owns queue or claim state.
