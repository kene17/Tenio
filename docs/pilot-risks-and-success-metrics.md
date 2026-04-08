# Pilot Risks and Success Metrics (Internal)

This note captures **risks to watch** and **how to aim for a strong pilot outcome**, aligned with Tenio’s workflow-first positioning.

---

## Risks to watch

### 1. Payer anti-scraping and portal churn

Large US payers **change portals, flows, and bot defenses** often. Browser-style automation is **inherently brittle** compared to **contracted APIs**, feeds, or clearinghouse integrations.

**Implication for Tenio:**

- Prefer **structured, supported paths** (e.g. trusted API-style connectors) where possible—they are more **stable** and easier to govern.
- Where browser or portal automation exists, plan for **ongoing maintenance**, monitoring, and customer communication when flows break.
- Position honestly: **resilience is an operational commitment**, not a one-time integration ticket.

### 2. The “human” bottleneck (phone-only status)

Some statuses **still require a phone call** (IVR, rep, hold times). Software that only automates **web** steps **does not remove** that wall—teams still hit the same bottleneck.

**Implication:**

- In discovery and pilots, ask **what share** of status is **web/portal vs phone vs paper**.
- Product narrative should not promise **“zero calls”** unless that is explicitly in scope later (e.g. dialer integrations, playbooks, not magic).
- Tenio can still win on **queue, evidence, ownership, and audit** for **everything that is digital**—and on **routing** what must go to a human—including calls.

---

## How to get to a strong pilot outcome

### Measure “clicks-to-resolution” (or a close cousin)

A practical pilot metric:

- **Time or effort per claim** from “I need status” → **documented next action** (resolved path, review, or scheduled retry).
- Example framing for a manager: movement from **~15 minutes per claim** to **~3 minutes** for the **same class of work** (define the class: e.g. portal-eligible follow-up).

**Rules for a credible number:**

- Same **cohort** of claims or equivalent difficulty.
- Same **users** or role-matched users (junior vs senior changes throughput).
- **Before/after** or **parallel lane** (Tenio lane vs status quo)—avoid cherry-picking only easy claims.

### What “10/10” looks like for a buyer

Not “AI wow”—operational proof:

- Fewer **touches** per claim to reach a decision.
- Faster **time-to-known-status** for a defined backlog slice.
- **Evidence** available when a claim is questioned weeks later.
- Managers see **queue health** and **who owns what**.

---

## How this maps to Tenio today

- **Workflow layer** (queue, review, audit) helps even when **automation** is partial—especially when **phone** or **policy** still dominates.
- **Automation layer** should be described as **reducing** portal grunt work and **standardizing** capture—not eliminating every human step on day one.

---

## One paragraph for a pilot one-pager

> We will measure **[metric name]**—effort and time from **status request** to **documented resolution path**—on a **bounded set** of claims and users. We acknowledge that **portal changes** and **phone-dependent** statuses cap how much can be automated; Tenio’s value in this pilot is **[fewer portal minutes + clearer ownership + evidence]**, with expansion as connectors mature.

---

*Internal planning only. Does not replace customer-specific agreements or SLAs.*
