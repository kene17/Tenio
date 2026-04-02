# What Tenio Is

## One-Line Summary

Tenio is a **workflow OS for claim-status work powered by automation**.

More specifically:

Tenio is the operating system revenue cycle teams use to run claim-status follow-up work, and it automates payer portal retrieval plus first-pass interpretation so humans can focus on exceptions.

## The Hierarchy

This is the most important framing rule:

- Tenio is primarily **workflow software**
- automation exists to power the workflow

Not the other way around.

We should not position Tenio as a 50/50 mix of workflow tool and automation tool.

The clean hierarchy is:

- **What Tenio is:** the operating system for claim-status work
- **What Tenio does:** automates retrieval and first-pass interpretation

## What Tenio Is

Tenio is the system where claim-status work gets done.

That means it owns:

- the queue
- ownership
- routing
- review states
- escalation
- evidence
- audit trail
- SLA visibility
- operational reporting

It should become the operational system of record for claim-status follow-up work.

## What Tenio Does

Tenio automates the messy work around payer status retrieval.

That means it:

- retrieves claim status from payer portals or payer-connected channels
- captures evidence at the time of retrieval
- interprets messy payer responses
- normalizes output into a canonical claim-status model
- scores confidence
- routes uncertain cases into human review
- retries or escalates when retrieval is unreliable

The purpose of automation is not to replace the workflow layer.

The purpose of automation is to reduce manual portal work while feeding a governed workflow system.

## The Core Rule

Automation never decides official claim state by itself.

Automation should:

- retrieve
- interpret
- attach evidence
- propose a candidate result

The workflow layer should:

- decide the official state
- route the work
- assign ownership
- trigger review
- log the audit trail

This is critical for trust, governance, and enterprise readiness.

## Who Uses Tenio

The primary users are revenue cycle operators and managers handling claim-status follow-up.

That usually includes:

- claim status representatives
- AR follow-up specialists
- denial and escalation specialists
- team leads
- operations managers

The daily operator uses the queue and claim detail pages.

The manager uses Tenio to monitor:

- backlog
- SLA risk
- throughput
- review load
- escalation patterns
- payer-specific bottlenecks

## Who Buys Tenio

The likely buyer is an operations leader, not just the end user.

Typical buyers include:

- head of revenue cycle
- AR manager
- RCM operations leader
- outsourced RCM or BPO leader
- healthcare operations executive responsible for follow-up productivity

They are not buying "automation for its own sake."

They are buying:

- control
- visibility
- throughput
- auditability
- operational reliability

## How This Work Is Done Today

Today, claim-status work is usually fragmented and manual.

Teams often work across:

- payer portals
- PM or RCM systems
- spreadsheets
- email or chat handoffs
- generic work queues
- human memory

The common process looks like this:

- a rep logs into a payer portal
- checks a claim manually
- interprets whatever the portal says
- copies the result into another system or spreadsheet
- decides whether someone else needs to look at it
- re-checks it later if it is unresolved

That creates predictable problems:

- duplicated work
- inconsistent status interpretation
- poor ownership tracking
- weak auditability
- missed SLAs
- slow escalations
- poor manager visibility

## What Tenio Replaces

Tenio does not just replace a person clicking around a portal.

It replaces the fragmented coordination layer around claim-status work:

- manual portal checks
- scattered notes
- spreadsheet tracking
- ad hoc routing
- unclear ownership
- inconsistent exception handling
- manual reconstruction of evidence and history

## Why Customers Would Want Tenio

Customers would want Tenio because it gives them a better way to run claim-status operations.

The value is:

- less repetitive portal work
- clearer ownership for each claim
- faster routing of exceptions
- evidence captured automatically
- more consistent interpretation across payers
- better SLA control
- cleaner auditability
- better visibility into team performance and backlog

In plain language:

- without Tenio, claim-status work happens across disconnected tools
- with Tenio, claim-status work happens in one operating system

## Why “Workflow OS Powered By Automation” Is A Moat

If Tenio only did automation:

- it would feel like a feature
- it would be easier to copy
- it would be brittle when portals change
- it would be harder to trust in enterprise workflows

If Tenio only did workflow software:

- humans still do too much portal work
- ROI is slower to prove
- it risks becoming just another queue

If Tenio does both, in the right hierarchy:

- automation improves unit economics
- workflow software creates trust and governance
- evidence and auditability make it enterprise-safe
- the workflow layer creates stickiness and operational lock-in

That combination is the leverage.

## What Our Leverage Is

Tenio's leverage comes from combining a governed workflow layer with automation that feeds it.

The leverage is:

- one normalized system of record instead of fragmented tools
- one queue instead of disconnected follow-up lists
- evidence attached at retrieval time
- first-pass interpretation handled by automation
- review and routing handled consistently by workflow rules
- audit history created automatically
- manager visibility across the full operation

This matters because the value compounds:

- every retrieval becomes structured data
- every structured result can drive routing
- every routed claim improves queue visibility
- every reviewed claim improves trust
- every action improves the audit trail
- every claim worked improves operational reporting

## Why Customers Would Move Data Into Tenio

Customers move data into Tenio if Tenio becomes the place where the work actually happens.

They do not need to move data just because Tenio is new.

They move data because Tenio gives them:

- a better queue
- a better claim record
- better ownership and routing
- better evidence capture
- better auditability
- better operational visibility

If Tenio is the operational system for the work, then the active work needs to exist in Tenio.

## What Data Needs To Move

Most customers do not need a giant day-one historical migration.

Usually the important data is:

- active claims that still need follow-up
- claim identifiers
- payer identifiers
- patient or encounter references needed for lookup
- current owner or queue assignment
- active notes or follow-up context
- SLA or aging information

The key is not "all history immediately."

The key is "enough active work to operate in Tenio."

## How Customers Would Move Data Into Tenio

There are four realistic onboarding paths:

### 1. CSV Or Spreadsheet Import

Best for early rollout or pilot.

Typical flow:

- export active claims from a spreadsheet, PM system, or internal queue
- map fields to Tenio's claim intake model
- import active work into Tenio

### 2. API Intake

Best for more mature implementations.

Typical flow:

- customer system sends claims into Tenio through an API
- new or updated claims enter Tenio automatically
- Tenio becomes the workflow layer while the source system remains in place

### 3. Batch Sync

Best when real-time integration is not available yet.

Typical flow:

- scheduled exports from PM, RCM, or internal systems
- recurring loads into Tenio
- incremental updates for newly opened or newly assigned claims

### 4. Active-Inventory-First Rollout

Usually the best adoption path.

Typical flow:

- move only active claims first
- keep historical data in the old system at first
- use Tenio as the system of action for current work
- expand the scope once value is proven

## What Makes Adoption Easier

Customers are more likely to adopt Tenio if:

- they do not need a full historical migration
- they can start with active inventory only
- field mapping is simple
- imported claims can be validated before go-live
- they can keep existing source systems during rollout
- Tenio can export data back out when needed

The less "rip and replace" pressure, the easier the adoption.

## What Tenio Does Today

Today, the app operates like a production-style MVP for the core workflow.

It currently supports:

- authenticated users and sessions
- claim intake
- a live claims workspace
- a live claim queue
- claim detail as the source of truth for one claim
- asynchronous retrieval job queueing
- worker-driven retrieval processing
- AI-assisted first-pass interpretation
- workflow-controlled review and state transitions
- notes, assignment, resolve, reopen, and escalate actions
- results and audit log views
- live-backed performance and payer configuration views

## What Tenio Should Do Next

The full product should go beyond the current local MVP and become enterprise-operational.

That means:

- hosted deployment environments
- stronger auth and enterprise access controls
- real payer connectors
- durable object storage for evidence
- stronger observability and alerting
- backup and restore operations
- exports and downstream delivery
- stronger compliance and operational controls

## What Tenio Is Not

Tenio is not:

- a generic AI agent company
- a browser automation company sold as the headline
- a healthcare chatbot
- a simple claim-status scraper

The company story should remain:

- workflow OS for claim-status work
- powered by automation
- governed by evidence, review, and auditability

## Short Version

Tenio is the operating system for claim-status work.

It automates payer retrieval and first-pass interpretation, but its real value comes from owning the workflow layer: queue, ownership, routing, review, evidence, auditability, and SLA control.
