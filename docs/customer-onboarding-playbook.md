# Customer Onboarding Playbook

This playbook turns the migration ideas in `docs/app-what-it-is.md` into an operational onboarding path.

## Onboarding Goal

Get meaningful claim-status work into Tenio quickly without forcing a risky all-at-once migration.

The core onboarding rule is:

- move enough data for work to happen in Tenio
- do not block go-live on a perfect historical migration

## Minimum Data Needed For Go-Live

A customer can start operating in Tenio when the following data is available:

- claim identifier
- patient or account reference
- payer
- claim amount or financial priority signal
- current status or last known status
- owner or queue assignment if available
- due date or SLA signal if available
- notes or latest work context if available

Optional but valuable:

- prior touch history
- denial or escalation flags
- evidence references
- external system identifiers

## Supported Onboarding Paths

### 1. CSV Or Spreadsheet Import

Best for:

- first design partners
- teams currently managing work in exports or spreadsheets

Needs:

- import template
- required-field validation
- duplicate detection
- import preview
- reconciliation report

### 2. API Intake

Best for:

- customers with an existing work generator
- customers who want to feed new claims continuously

Needs:

- documented intake contract
- authentication and rate-limit expectations
- idempotency rules
- error reporting

### 3. Batch Sync

Best for:

- scheduled daily or hourly inventory updates
- customers with stable export jobs

Needs:

- recurring import job definition
- mapping configuration
- update versus create behavior
- sync reconciliation summary

### 4. Active-Inventory-First Migration

Best for:

- teams that do not need full historical migration
- faster go-live with lower risk

Needs:

- active queue scope definition
- historical backfill plan for later phases
- explicit cut line between pre-Tenio and in-Tenio work

## Recommended First Rollout Path

Start with:

1. CSV import for current active inventory
2. API intake for new work
3. batch sync later if the customer needs recurring reconciliation

This keeps the first implementation simple while still creating a real operating workflow.

## Mapping Workflow

For every customer import:

1. collect a sample file or payload
2. map customer fields to Tenio fields
3. identify missing required fields
4. define transformation rules
5. validate duplicates and ownership rules
6. run a preview
7. approve cutover

## Validation Checklist

Before import:

- required fields present
- payer naming normalized
- claim identifiers deduplicated
- owner and queue mapping rules confirmed
- invalid rows isolated

After import:

- imported claim count matches expectation
- failed rows are explained
- sample claims are reviewed in the UI
- ownership, status, and priority look correct
- audit log reflects import activity

## Cutover Checklist

Use this for design partners and early customers:

1. freeze the active inventory extract
2. run a final validation pass
3. import the active set into Tenio
4. spot-check claims with operators and managers
5. begin working new claim-status tasks in Tenio
6. monitor duplicate or missing-work reports for the first days

## Migration Risks To Manage

Watch for:

- mismatched payer naming
- duplicate claims across source exports
- missing ownership data
- stale statuses from old extracts
- unclear responsibility for work created during cutover

## Product Requirements For Onboarding

The product should support:

- import template generation
- import preview and row-level validation
- duplicate handling
- reconciliation summary
- migration audit trail
- import exception queue for bad records

## Definition Of A Successful Onboarding

Onboarding is successful when:

- operators can work real claims in Tenio
- managers trust the imported backlog
- new work can enter Tenio continuously
- the customer does not need custom one-off migration work to stay live
