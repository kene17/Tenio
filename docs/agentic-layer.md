# Agentic Layer

Tenio's agentic layer is the execution engine underneath the workflow OS.

It is responsible for:

- retrieving payer status
- observing portal or payer-connected outputs
- interpreting messy responses
- attaching evidence
- proposing candidate outcomes
- retrying when execution is recoverable

It is not responsible for:

- committing official claim state
- bypassing workflow policy
- bypassing human review when confidence or evidence is weak
- owning queue, routing, SLA, or audit policy

## The Boundary

The clean hierarchy is:

- `workflow layer`: authoritative system of record
- `agentic layer`: retrieval and interpretation engine

The agent can retrieve, interpret, and propose.

The workflow layer decides, routes, assigns, and audits.

## Current Runtime

Today the runtime is made up of:

- `apps/worker` for asynchronous execution
- connector selection and retrieval paths
- `services/ai` for first-pass interpretation
- `ExecutionCandidate` as the contract returned to the workflow layer

## Connector Rollout

Tenio should expand connectors narrowly and intentionally.

The rollout order should be:

1. make one connector path reliable
2. expose retries, failure modes, and evidence clearly
3. add a second connector only after the first path is operationally trusted

Every connector should share the same contract:

- connector identity
- execution mode
- evidence artifacts
- retry semantics
- failure category
- traceable runtime metadata

## Learning Loops

The workflow layer creates the feedback loop for the agentic system.

Tenio should learn from:

- reviewed claims
- overturned agent recommendations
- retry and failure patterns
- connector-specific error rates
- confidence versus final human outcome

That learning should improve:

- connector tuning
- confidence thresholds
- routing thresholds
- interpretation quality

Without changing the core rule that workflow remains authoritative.

## What Makes It Enterprise-Safe

The agentic layer should always produce:

- evidence artifacts
- confidence
- rationale
- route reason
- connector provenance
- traceable execution metadata

Low-confidence, contradictory, or failed runs should become governed workflow events, not hidden automation decisions.

## Product Principle

Do not sell the agent as a separate product.

Sell Tenio as the workflow OS for claim-status work, powered by agentic retrieval and interpretation.
