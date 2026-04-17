# Design-Partner Go / No-Go

This is the internal gate document for handing Tenio to a real Canadian design partner.

It assumes:

- first partner is an Ontario clinic or billing team in a support-led pilot
- launch motion is support-led, not self-serve
- real patient-adjacent data must not enter the system until legal and hosting prerequisites are complete

## Summary

Tenio is app-close for a support-led pilot.

That does **not** mean it is automatically go-live ready.

Do not hand the product to a real design partner until all six gates below are true.

## Required Gates

### 1. Customer fit and payer mix are qualified

Before calling an Ontario clinic or billing team a real pilot candidate, confirm:

- the customer accepts a support-led rollout
- there is one named ops champion
- the team has enough claim-follow-up volume to measure value
- the team can export a bounded claim inventory, ideally from Jane
- the real payer mix is known and the workflow is not being inferred from geography
- connector priority is derived from the customer’s actual payer mix, not an Ottawa-specific assumption
- OHIP-heavy or provincial-only workflows are treated as a weak fit unless the follow-up workflow still matches Tenio’s queue, evidence, and structured follow-up model

For Toronto-area prospects or any larger Ontario organization, also confirm:

- the IT or security approver is identified early
- whether they require MSA before technical review
- whether they require PHIPA or ISA review before data sharing
- whether they require a vendor security questionnaire
- whether procurement approval extends beyond the ops champion
- expected pilot approval lead time

Default screening rule:

- if the prospect is unlikely to clear the required approval path within **30–45 days**, deprioritize it for the first pilot unless it is strategically exceptional

### 2. Tenio provisions the initial accounts

The first pilot is support-led.

That means:

- Tenio creates the initial owner, manager, and operator accounts
- the clinic is not expected to invite or manage users in-app on day one
- user-management APIs may exist, but they are not the customer handoff story

### 3. One real Jane export has been validated end to end

Treat the importer as unproven until a real customer file passes:

- preview
- commit
- queue rendering
- claim detail rendering
- Canadian paramedical field preservation

Do not treat fixture CSVs or hand-made samples as equivalent to a real clinic export.

### 4. Cold-user Tuesday-morning walkthrough passes

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

### 5. PHIPA information-sharing agreement is signed before real data enters

Before any patient-adjacent production data is uploaded:

- a clinic owner signs the information-sharing agreement
- the signed copy is stored with the deployment packet
- the support contact path and incident path are documented

This is mandatory even for a support-led pilot.

### 6. Hosted environment is in AWS `ca-central-1` before go-live

No real Canadian pilot data should be handled in:

- US production regions
- local developer environments
- informal shared environments

Minimum expectation before go-live:

- web, API, worker, storage, and database hosting decisions are recorded
- PHI-touching systems are in `ca-central-1`
- backup and evidence storage locations are confirmed
- hosted secrets are environment-specific, including `TENIO_WEB_SESSION_SECRET`
- no demo/default org names, support emails, seeded credentials, or fake evidence paths appear in the hosted environment

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
- payer status checks will be manual at pilot start unless a supported connector is truly live for that customer on day one
- operators will log those outcomes in Tenio while supported retrieval paths are enabled during the pilot
- automation priority will follow the customer’s actual payer mix, not a city-based assumption

Recommended wording:

> At pilot start, your team will do status checks through your payer portals and record the outcome in Tenio. Tenio is already the workflow system for queue ownership, evidence, and follow-up. We will prioritize automation based on your actual payer mix and enable supported retrieval paths during the pilot.
