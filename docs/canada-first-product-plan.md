# Canada-First Product Plan

This document defines how Tenio can use Canada as a beachhead without turning into a Canada-only dead end.

It is a strategy and execution document. It does not change the current product truth in [`docs/customer-readiness-packet.md`](./customer-readiness-packet.md): the current supported production path is still narrow and Aetna-shaped.

## Core Decision

Canada-first can make sense because the founding team is local, can sell in person, and can support a first customer more tightly.

That does **not** mean:

- rewrite the whole product around Canadian claims immediately
- abandon the current US-shaped workflow and connector work
- build a second company by accident

The right move is:

- use Canada as the first customer geography if it shortens time to revenue
- keep the core workflow model generic
- add Canadian support **additively**
- prioritize permitted data rails over browser automation
- preserve the option to expand beyond Canada later

## What Is True Today

Tenio today is best described as:

- workflow OS for claim-status follow-up
- with evidence, audit, review, routing, and export
- powered by automation underneath the workflow layer

The current codebase and customer-facing scope are still oriented around a narrow US commercial payer path:

- current first-customer scope in [`docs/customer-readiness-packet.md`](./customer-readiness-packet.md)
- current product framing in [`docs/app-what-it-is.md`](./app-what-it-is.md)
- current wedge and ICP in [`docs/icp-wedge-strategy.md`](./icp-wedge-strategy.md)
- current Ottawa prospecting caveats in [`docs/ottawa-pilot-prospecting.md`](./ottawa-pilot-prospecting.md)

This matters because a Canada plan should extend the product, not pretend those documents are already obsolete.

## Why Canada Can Be The Beachhead

Canada can be the first market if it gives Tenio these advantages:

- faster access to real customers through local trust and in-person selling
- easier support and implementation during the first deployment
- a clearer local wedge in Ottawa through dental, paramedical, and billing-service workflows
- a chance to win with a narrow, operationally painful workflow before going broader

Canada is **not** automatically the best long-term market just because the team is local.

The test is:

- can we get a paid customer faster?
- can we get a durable data path?
- can we show hard outcome improvement?

If the answer is yes, Canada is a good beachhead.

## The Two Strategic Risks

### 1. Becoming Canada-trapped

This happens if Tenio hardcodes the product around Canadian-specific fields, portals, and sales motion so deeply that later expansion becomes a rewrite.

Avoid this by:

- keeping the workflow and evidence model generic
- adding jurisdiction-aware fields rather than replacing the core model
- storing payer capabilities in configuration rather than baking them into every workflow type

### 2. Becoming a scraper maintenance company

This happens if Canada expansion means building Sun Life, Green Shield, and other portal automations as the core product.

Avoid this by:

- treating permitted rails as the highest-priority connector path
- using browser automation only as fallback or bridge coverage
- making manual call-required handling a first-class workflow outcome

## Product Guardrails

These rules should stay true even if Tenio goes Canada-first.

### 1. Workflow remains the product

Tenio is still:

- queue
- ownership
- evidence
- audit
- review
- SLA visibility
- reporting

Automation remains underneath the workflow layer.

### 2. Canada support is additive, not destructive

Do not replace the current product model with a Canada-only one.

Instead:

- add jurisdiction support
- add Canadian payer support
- add Canadian claim-type support where needed
- preserve current US-compatible paths

### 3. Permitted rails beat portals

If there is a durable rail such as TELUS Health eClaims or another permitted partner path, prioritize that over browser automation.

Browser automation should be:

- fallback coverage
- temporary bridge coverage
- never the whole company story

### 4. One ICP first

Do not target all Canadian healthcare admin at once.

Pick one:

- Ottawa dental group practices
- Ottawa billing services / outsourced RCM firms
- Ottawa paramedical clinic chains

The default recommendation is:

- start with Ottawa dental or dental-adjacent billing services
- only if they have enough claim follow-up volume to prove labor savings

Ottawa-specific note:

- if the target office or billing firm serves a meaningful federal employee population, treat **Sun Life / PSHCP** as the highest-priority payer workflow to validate in Phase 0 because Ottawa's public-servant concentration makes it the strongest local demand signal

## The Engineering Principle

Build a **jurisdiction-aware workflow core**, not a Canada fork.

The practical model is:

- shared workflow core
- shared evidence and audit model
- shared agent/runtime model
- jurisdiction-specific payer configs, connectors, imports, and compliance toggles

This lets Canada be a new operating mode for the same product.

## Recommended Execution Sequence

### Phase 0: Customer And Data-Rail Validation

Do this before large code changes.

Objectives:

- identify one real Canadian design partner
- validate payer mix and follow-up pain
- validate that a permitted rail exists for the first wedge

Required outputs:

- 10 to 15 discovery calls with Ottawa offices or billing firms
- one named target ICP
- confirmed first-customer workflow
- confirmed connector priority list
- direct validation of whether TELUS or another rail actually supports the needed status retrieval path

Do not build a TELUS connector from assumptions. Confirm:

- integration program availability
- sandbox availability
- auth pattern
- status query capability
- commercial and legal terms

### Phase 1: Minimal Canada Foundation

Make the current product capable of supporting Canada without breaking existing flows.

#### Data model

Touchpoints:

- [`packages/domain/src/index.ts`](../packages/domain/src/index.ts)
- [`packages/contracts/src/index.ts`](../packages/contracts/src/index.ts)

Changes:

- add `jurisdiction`
- add optional `country`
- add optional `provinceOfService`
- add optional Canadian claim-type metadata
- add payer metadata that can distinguish Canadian payers without removing current fields

Important:

- do **not** remove US-centric fields yet
- do **not** hardcode every Canadian payer as a deep enum dependency if configuration will do

#### Configuration and workflow state

Touchpoints:

- [`apps/api/src/domain/store.ts`](../apps/api/src/domain/store.ts)
- [`apps/api/src/domain/prod-state.ts`](../apps/api/src/domain/prod-state.ts)
- [`apps/api/src/app.ts`](../apps/api/src/app.ts)

Changes:

- allow payer configuration to represent Canadian payers and Canadian workflow rules
- keep queue, SLA, evidence, and audit semantics shared
- add country/jurisdiction-aware validation only where it matters

### Phase 2: Narrow Canada UX Support

Touchpoints:

- [`apps/web/app/app/claims/claims-client.tsx`](../apps/web/app/app/claims/claims-client.tsx)
- [`apps/web/app/app/queue/queue-client.tsx`](../apps/web/app/app/queue/queue-client.tsx)
- [`apps/web/app/app/onboarding/onboarding-client.tsx`](../apps/web/app/app/onboarding/onboarding-client.tsx)
- [`apps/web/components/dashboard-shell.tsx`](../apps/web/components/dashboard-shell.tsx)

Changes:

- add basic jurisdiction-aware display fields
- make onboarding and queue UI able to show Canadian payer names and claim types
- if bilingual support is required, start with a lightweight i18n scaffold on high-visibility product surfaces only

Important:

- do not hold the whole product hostage to full French completion before there is a real buyer forcing that requirement

### Phase 3: One Permitted Connector Path

Touchpoints:

- [`apps/worker/src/payer-runner.ts`](../apps/worker/src/payer-runner.ts)
- [`apps/worker/src/agent-runtime.ts`](../apps/worker/src/agent-runtime.ts)
- [`services/ai/app/main.py`](../services/ai/app/main.py)

Changes:

- implement exactly one Canadian connector path first
- prefer a permitted rail such as TELUS if it is real and commercially available
- keep browser automation out of the critical path unless there is no better bridge option

Success criterion:

- one Canadian claim-status retrieval path that is stable enough to support a paid pilot

Current implementation note:

- the repo now includes a **validation-only Sun Life / PSHCP browser connector fixture** for Ottawa discovery, workflow shaping, and demo coverage
- it is not a live payer partnership or a production-cleared Sun Life integration
- a permitted rail or approved live-access plan is still required before claiming durable Canadian connector coverage

### Phase 4: One Customer-Specific Import Path

Touchpoints:

- [`apps/api/src/domain/imports.ts`](../apps/api/src/domain/imports.ts)
- [`apps/web/app/app/onboarding/onboarding-client.tsx`](../apps/web/app/app/onboarding/onboarding-client.tsx)

Changes:

- implement one importer only after getting sample exports from a real customer or design partner
- prefer the most common practice-management export in the chosen ICP

Do not build multiple dental PMS importers speculatively.

### Phase 5: Canadian Trust Pack

This is the minimum trust layer for a first Canadian customer, not a full compliance theater exercise.

Add:

- documented Canadian hosting/data residency choice
- documented retention and deletion posture
- documented subprocessor list
- documented support and incident path
- documented PHI access model

This may involve code, but much of it is documentation and operating discipline.

Supporting docs:

- [`docs/canadian-trust-pack.md`](./canadian-trust-pack.md)
- [`docs/telus-integration-readiness.md`](./telus-integration-readiness.md)

## What To Build First If Canada Is Confirmed

If a real Canadian customer path is confirmed, the first implementation slice should be:

1. jurisdiction-aware core fields
2. Canadian payer configuration support
3. minimal Canada-friendly onboarding fields
4. one permitted connector path
5. customer-specific import

Not:

1. three portal scrapers
2. full Canada workflow taxonomy
3. broad bilingual rewrite
4. speculative compliance tables with no operating process behind them

## What Not To Do

- do not delete or replace the current US-oriented workflow model
- do not claim Canada support before a real connector path exists
- do not build a Canada-only fork of the product
- do not make browser automation the Canadian moat
- do not target dental, physio, chiro, drugs, travel, WSIB, and federal benefits all at once
- do not start with a full national strategy before winning one Ottawa customer

## Decision Gates

Tenio should only commit to a full Canada-first build if these are true:

- one paid or clearly commit-able Canadian design partner
- one durable data rail or connector plan
- one measurable operational KPI the buyer cares about
- one narrow workflow where Tenio can become the place work gets done

If those are not true yet, keep Canada as a discovery and pilot market, not a rewrite mandate.

## Success Metrics

The first Canada deployment should still be judged by the same operational outcomes:

- fewer touches per claim
- lower phone-call-required rate
- faster follow-up cycle time
- better SLA compliance
- stronger evidence and auditability

If Tenio cannot prove those in Canada, local geography alone does not make the market attractive.

## Bottom Line

Canada-first is a valid path.

Canada-first should mean:

- local sales advantage
- narrow first-customer focus
- additive product expansion
- one durable retrieval rail

It should **not** mean:

- rewriting Tenio around Canada before customer proof
- replacing workflow strategy with connector sprawl
- building a second product accidentally


npm run db:up
npm run setup:ai
npm run dev:api
npm run dev:ai
npm run dev:worker
npm run dev:web
