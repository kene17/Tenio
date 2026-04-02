# Product Roadmap

This roadmap turns the current production-style MVP into a customer-ready workflow OS for claim-status work.

It is grounded in:

- `docs/app-what-it-is.md`
- `docs/architecture.md`
- `docs/security-architecture.md`
- `docs/production-mvp-runbook.md`

## Current Baseline

Today Tenio already supports:

- authenticated users and sessions
- claim intake
- live queue and claims workspace
- claim detail as the source of truth
- async retrieval job queueing
- worker-driven retrieval processing
- AI-assisted first-pass interpretation
- workflow-controlled review and state transitions
- notes, assignment, resolve, reopen, and escalate actions
- results, audit log, performance, and payer configuration views

## Product Goal

Tenio should become the operational system of record for claim-status follow-up work.

That means the workflow layer must own:

- queue and ownership
- routing and review
- evidence and audit history
- SLA visibility and escalation
- manager reporting

Automation should make that workflow faster and cheaper by retrieving, interpreting, and proposing candidate outcomes.

## Prioritization Principles

Prioritize work that:

1. makes Tenio more trustworthy as the place where work happens
2. reduces customer onboarding friction
3. proves measurable operator and manager value
4. keeps the workflow layer as the system of record

## Priority 1: Evidence And Retrieval Foundations

Why first:

- real evidence is required for trust
- evidence is required for review and auditability
- evidence is required before real connector expansion becomes meaningful

Deliverables:

- durable evidence storage instead of demo URLs
- evidence metadata model with retrieval timestamps, source, and access policy
- evidence viewer links from claim detail and audit surfaces
- connector-friendly retrieval artifact interfaces

Exit criteria:

- every retrieval can attach durable evidence artifacts
- claim reviewers can inspect evidence without leaving Tenio

## Priority 2: Real Connector Framework

Why second:

- the workflow story becomes real only when Tenio connects to actual payer channels
- connector quality determines whether automation is operationally useful

Deliverables:

- connector abstraction for portal or payer-connected retrieval paths
- narrow first connector set for design-partner launch
- retry, timeout, and failure classification standards
- execution observability per connector

Exit criteria:

- Tenio supports at least one real connector path end to end
- failures are visible and actionable instead of opaque

## Priority 3: Routing And SLA Policy Layer

Why third:

- workflow is the moat
- routing and SLA control are what make Tenio more than a retrieval feature

Deliverables:

- configurable queue routing rules
- SLA policy model with deadlines, risk levels, and escalation triggers
- manager-facing views for review load and payer bottlenecks
- clearer ownership transitions and exception handling

Exit criteria:

- claims move through explicit policy-driven workflow paths
- managers can trust Tenio for backlog and SLA oversight

## Priority 4: Bulk Intake And Downstream Delivery

Why fourth:

- customers need practical ways to get work in and results out
- onboarding and expansion stall without import and export tooling

Deliverables:

- CSV import for active inventory
- validated bulk intake API for recurring loads
- export surfaces for downstream systems or reporting
- reconciliation reports for imported and exported work

Exit criteria:

- customers can onboard meaningful work without custom engineering
- Tenio outputs can be consumed outside the product when needed

## Priority 5: Manager Operating Layer

Why fifth:

- once work is flowing through Tenio, manager trust depends on operational visibility

Deliverables:

- richer performance dashboards
- queue aging and SLA heatmaps
- connector health and retrieval outcome reporting
- operational alerts tied to workflow health

Exit criteria:

- leaders can use Tenio to run the operation, not just inspect claims one by one

## Recommended Delivery Sequence

1. evidence storage and retrieval artifacts
2. first real connector framework
3. routing and SLA policy layer
4. bulk intake and export surfaces
5. deeper manager operating views

## What Not To Prioritize Early

Do not prioritize:

- broad connector coverage before one path works well
- generic AI features that do not strengthen workflow trust
- cosmetic UI expansion that does not improve operational control

## Success Measures

The roadmap is working if Tenio shows:

- fewer manual portal touches per claim
- faster movement from retrieval to review to resolution
- clearer claim ownership
- better SLA visibility
- higher manager trust in evidence and audit history
