# Claim Status Ops Handoff

Use this doc to start a new chat with the current product direction, positioning, and design context already established.

## One-Line Summary

We are building a **claim status operations platform for revenue cycle teams**.

The product helps RCM teams **retrieve, verify, route, and resolve claim-status work across payer portals** with evidence, human review, and auditability.

## What We Are

- workflow software for healthcare revenue cycle teams
- a system of record for claim-status follow-up work
- a product focused on throughput, visibility, evidence, routing, and operational control

## What We Are Not

- not a generic AI agent company
- not browser automation infrastructure as the company story
- not a horizontal self-healing automation platform
- not a generic healthcare chatbot
- not just a claim-status scraper

## Strategic Positioning

The key decision is to **sell the outcome, not the automation layer**.

Bad framing:

- "AI agent for healthcare systems"
- "browser automation for payer portals"
- "self-healing healthcare automation infrastructure"

Better framing:

- "claim status operations platform for revenue cycle teams"
- "system of record for payer claim-status work"
- "software for retrieving, verifying, routing, and tracking claim-status follow-up across payer portals"

## Core Product Thesis

Customers should not care how the portal work happens under the hood.

They should care that:

- claim status is retrieved reliably
- results are normalized across payers
- evidence is attached
- uncertain cases are routed for review
- teams work from a shared queue
- SLA risk and unresolved work are visible
- follow-up throughput improves

## Comparison To Minicor

Important distinction:

- companies like Minicor are closer to **automation infrastructure**
- we should be closer to **vertical RCM workflow software**

Simple framing:

- Minicor sells the machine that clicks
- we sell the system that gets claim-status work done

That means we should own:

- the claim-status workflow
- the normalized data model
- the claims queue
- evidence-backed results
- exception handling and review
- routing and SLA management
- reporting and throughput visibility

Not the category of raw desktop/browser automation.

## Where Agents Fit

The app can absolutely use agentic AI internally, but that should be **under the hood**, not the primary category.

Agents fit in:

- navigating messy payer workflows
- interpreting inconsistent portal outputs
- deciding next best action when data is incomplete
- retrying and recovering from failures
- extracting structured results from messy UI states
- summarizing evidence
- escalating low-confidence cases to humans

Deterministic software should own:

- system state
- permissions
- audit logs
- workflows and SLAs
- queue state
- routing rules
- APIs
- exports
- reporting

## YC / Fundability View

The company does **not** need to be pitched as "agentic AI" to be fundable.

The stronger framing is:

- painful workflow
- clear vertical wedge
- AI-native internals where needed
- measurable business outcome
- potential to become the operational system of record

The YC-style idea is not "we built an agent."

It is closer to:

"Revenue cycle teams still work claim status manually across payer portals. We use AI and automation to retrieve, verify, route, and resolve that work in one system, with evidence and human review."

## Recommended MVP Wedge

Start narrow:

- claim-status retrieval from payer portals

But do not stop at retrieval alone. Retrieval by itself risks looking like plumbing.

The stronger wedge is:

- retrieve
- verify
- attach evidence
- route exceptions
- support human review
- track ownership and SLA
- report throughput and unresolved work

That makes it a real product, not just a tool.

## Current Product Surface

The current design direction is a 5-page product:

1. Claims Work Queue
2. Claim Detail
3. Result
4. Team Performance
5. Payer Configuration

These pages should tell a workflow-software story, not an infrastructure story.

## Most Important Screens

The two most important screens are:

1. **Claims Work Queue**
2. **Claim Detail**

Why:

- the queue is the operating center
- the claim detail page is the source of truth for one claim

These two screens define the category more than any dashboard or admin page.

## Figma Direction

The Figma should feel like:

- premium enterprise SaaS
- dense but readable
- operational, trustworthy, and audit-ready
- closer to Stripe / Ramp / Linear than legacy healthcare software

The Figma should not feel like:

- a raw automation debug console
- an AI chatbot
- devtools
- infrastructure software

Design emphasis:

- claims queue
- next action
- owner
- SLA risk
- confidence
- evidence
- notes
- routing
- review
- audit trail

Less emphasis:

- automation internals
- step-by-step machine execution as the headline
- self-healing agent language

## Product Identity

If asked "what are we?" the best answer is:

**We are a claim status operations platform for revenue cycle teams.**

Longer version:

**We help revenue cycle teams retrieve, verify, route, and resolve claim-status follow-up work across payer portals, with evidence, review, and auditability.**

## Architecture View

Best mental model:

1. Product layer
2. Workflow layer
3. Agent layer
4. Deterministic systems layer

### Product layer

- claims queue
- claim detail
- results
- team dashboard
- configuration

### Workflow layer

- review states
- routing
- SLAs
- escalation logic
- status normalization

### Agent layer

- payer portal interaction
- extraction
- recovery
- evidence synthesis
- reasoning over ambiguity

### Deterministic systems layer

- database
- APIs
- scheduler / workers
- auth
- logging
- export and delivery

## Practical Rule

**Sell one thing, build two layers.**

Sell:

- claim-status operations software

Build underneath:

- reusable automation and agent infrastructure

Do not try to pitch both the vertical app and the horizontal infra as the same company story right now.

## Suggested Starting Prompt For A New Chat

Use something like this:

> I want to continue from this product direction: we are building a claim status operations platform for healthcare revenue cycle teams, not a generic browser automation company. The product should help teams retrieve, verify, route, and resolve claim-status work across payer portals with evidence, human review, auditability, and throughput reporting. Agentic AI can exist under the hood for messy retrieval and exception handling, but the visible product is workflow software. Please use that framing in your answers. The two most important screens are Claims Work Queue and Claim Detail.

## Open Questions For Future Work

- exact MVP scope for first customer deployment
- who the first buyer should be: BPO, claims ops vendor, or in-house RCM team
- whether to start with one payer/workflow or a small multi-payer claim-status wedge
- how much of the portal interaction layer should be built in-house vs abstracted
- what proof points are required for pilot-to-paid conversion
