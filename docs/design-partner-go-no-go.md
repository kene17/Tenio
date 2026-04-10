# Design-Partner Go / No-Go

This is the internal gate document for handing Tenio to a real Canadian design partner.

It assumes:

- first partner is an Ottawa paramedical clinic
- launch motion is support-led, not self-serve
- real patient-adjacent data must not enter the system until legal and hosting prerequisites are complete

## Summary

Tenio is app-close for a support-led pilot.

That does **not** mean it is automatically go-live ready.

Do not hand the product to a real design partner until all five gates below are true.

## Required Gates

### 1. Tenio provisions the initial accounts

The first pilot is support-led.

That means:

- Tenio creates the initial owner, manager, and operator accounts
- the clinic is not expected to invite or manage users in-app on day one
- user-management APIs may exist, but they are not the customer handoff story

### 2. One real Jane export has been validated end to end

Treat the importer as unproven until a real customer file passes:

- preview
- commit
- queue rendering
- claim detail rendering
- Canadian paramedical field preservation

Do not treat fixture CSVs or hand-made samples as equivalent to a real clinic export.

### 3. Cold-user Tuesday-morning walkthrough passes

This is the real usability gate.

A person who did **not** build the feature must be able to:

1. log in
2. import a Jane export
3. open the queue
4. open a claim
5. log a structured follow-up
6. inspect evidence
7. return to the queue

No live guidance.

If they get stuck, treat it as a product bug or UX gap before partner handoff.

### 4. PHIPA information-sharing agreement is signed before real data enters

Before any patient-adjacent production data is uploaded:

- a clinic owner signs the information-sharing agreement
- the signed copy is stored with the deployment packet
- the support contact path and incident path are documented

This is mandatory even for a support-led pilot.

### 5. Hosted environment is in AWS `ca-central-1` before go-live

No real Canadian pilot data should be handled in:

- US production regions
- local developer environments
- informal shared environments

Minimum expectation before go-live:

- web, API, worker, storage, and database hosting decisions are recorded
- PHI-touching systems are in `ca-central-1`
- backup and evidence storage locations are confirmed

## Product Reality

### Strong enough for a support-led pilot

- login and RBAC
- import workflow
- queue
- claim detail
- evidence and structured follow-up
- onboarding checklist and queue walkthrough
- audit and status/support surfaces

### Missing in-app, but acceptable for v1

- no self-serve team-management UI
- no real self-serve account/settings UI
- no live Canadian retrieval rail at pilot start

### Still a real limitation

- importer is not proven until it passes a real clinic export
- usability is not proven until the cold-user walkthrough passes
- automated Canadian retrieval is not yet live

## Design-Partner Positioning

State this clearly on the first call:

- Tenio will onboard the initial team and support rollout directly
- the clinic will import active claims into Tenio and work the queue there
- payer status checks may still be manual at pilot start
- operators will log those outcomes in Tenio while automated retrieval is being built in parallel
- TELUS eClaims automation is on the roadmap during the pilot, not already live

Recommended wording:

> At pilot start, your team will do status checks through your payer portals and record the outcome in Tenio. Tenio is already the workflow system for queue ownership, evidence, and follow-up. We’re building automated retrieval for TELUS eClaims and expect to enable that during the pilot.
