# TELUS Integration Readiness

This document is the readiness package for opening a real TELUS Health eClaims conversation. It is not a claim that Tenio is already integrated.

## Objective

Validate whether TELUS Health eClaims can become Tenio's first durable Canadian retrieval rail for dental and benefits follow-up, replacing brittle portal-first behavior where possible.

## Why TELUS Matters

TELUS is strategically important because:

- it is a recognized Canadian claims rail
- it is more durable than browser automation if access is permitted
- a permitted rail changes Tenio's Canadian story from “workflow plus scraping” to “workflow plus approved data path”

## Decision Questions

The integration should only move forward if TELUS can answer these clearly:

1. Does the program permit claim-status retrieval for Tenio's use case?
2. Is there sandbox access?
3. What auth model is required?
4. What identifiers are required to query status?
5. Does the response cover the statuses Tenio needs for operator workflow?
6. Are there commercial, reseller, or minimum-volume constraints?
7. Are there contractual restrictions on storing or displaying returned data?

## Technical Readiness

Tenio should enter the conversation with these materials ready:

- current product summary: workflow OS for claim-status follow-up
- narrow first use case: dental / benefits follow-up for one Canadian workflow
- sample internal canonical status shape
- required fields list:
  - claim identifier
  - payer identifier
  - patient/subscriber identifier
  - service date
  - billed amount
  - paid amount
  - status code / label
  - review reason or rejection reason
  - timestamp of payer response
- traceability story:
  - request ID
  - retrieval job ID
  - agent run ID
  - evidence attachment model

## Contract And Risk Questions

Ask TELUS directly:

- permitted use under their program terms
- whether Tenio can act as a hosted workflow layer for provider customers
- whether there are reseller or partner prerequisites
- whether secondary storage of returned data is allowed
- whether screenshots or transformed evidence derived from the rail are restricted
- expected rate limits and operational support path

Do not build against assumptions here.

## Internal Prerequisites Before A Real Build

- one named Canadian design partner
- one confirmed Canadian workflow
- one named Tenio owner for partnership follow-up
- one written integration memo capturing answers from TELUS

## Proposed Build Sequence If TELUS Is Real

1. confirm sandbox and legal/commercial fit
2. build a fixture-backed connector contract in the worker
3. validate canonical payload mapping in the AI/service layer
4. run one pilot with explicit feature flagging
5. only then position TELUS as production connector coverage

## What Exists Today

As of April 7, 2026:

- the product has Canada-aware workflow metadata
- the onboarding flow has an importer shell for Canadian dental discovery
- payer configuration includes a TELUS placeholder profile
- there is no live TELUS connector in the repo

## Outreach Packet

The first outreach should include:

- who Tenio serves
- the exact workflow problem
- why a permitted status rail matters
- which data fields are needed
- whether Tenio is asking for partner, developer, or integration-program access

## Exit Criteria

Treat TELUS as validated only when Tenio has:

- written confirmation that the use case is allowed
- a technical path with sandbox or test credentials
- clear commercial terms
- enough response coverage to drive operator workflow

Until then, TELUS remains a strategic target, not an implemented moat.
