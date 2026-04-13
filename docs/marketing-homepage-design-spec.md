# Marketing homepage — full design & content specification

This document describes the public marketing landing page at the site root (`/`) as implemented today. Use it as a single source of truth for a redesign (including work in external tools such as Claude): **structure, copy, visual language, behavior, and gaps**.

---

## 1. Location & implementation

| Item | Detail |
|------|--------|
| **Route** | `/` (Next.js App Router) |
| **File** | `apps/web/app/page.tsx` |
| **Component type** | `"use client"` — entire page is a client component (mobile menu state). |
| **Parent layout** | `apps/web/app/layout.tsx` wraps all pages. |
| **Related pages** | `/login`, `/pilot-guide` (linked from nav/CTAs). `/app/*` is the authenticated product (separate shell). |

The homepage does **not** use `apps/web/messages/en.json` or `fr.json`; all strings are **hardcoded English** in `page.tsx`.

---

## 2. Global layout & metadata (affects this page)

From `apps/web/app/layout.tsx`:

- **`<html lang>`** — Set from server `getLocale()` (`en` or `fr`), but the **marketing page copy is not translated** to match.
- **Document `<title>`** — `Tenio`
- **Meta description** — `Claim status operations platform for revenue cycle teams.`

From `apps/web/app/globals.css`:

- **Root font size** — `16px` on `html`.
- **Default `body`** (when not overridden by page wrappers):
  - Background: `#f9fafb` (gray-50)
  - Text color: `#111827` (gray-900)
  - Font stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  - **Note:** `Inter` is named in CSS but there is **no `next/font` (or link) loading Inter** in the repo search path — browsers will fall back to system UI fonts unless you add a font load.
- **Links** — In `@layer base`, `a { color: inherit; text-decoration: none; }` so link color comes from Tailwind classes on each `<a>` / `<Link>`.
- **Antialiasing** — Enabled on `html`.

The homepage root wrapper is `<div className="bg-white">`, so the **visible page background is white**, not the global body gray.

---

## 3. Design system used on this page (Tailwind)

### 3.1 Color palette (semantic usage)

| Token / class | Usage on homepage |
|---------------|-------------------|
| `bg-white` | Page shell, nav, many cards, mock queue chrome |
| `bg-slate-50` | Eyebrow badge area, “What Tenio Does” card, mock queue outer area, customers section background, some proof cards |
| `border-slate-200` | Primary border for cards, mock UI, icon wells |
| `border-gray-200` | Nav bottom border, section dividers (`border-b`) |
| `text-slate-900` | Headings, strong labels |
| `text-slate-700` | Body text on light cards |
| `text-slate-600` | Secondary body, nav links hover base |
| `text-slate-500` | Eyebrow labels, meta text in mock table |
| `text-blue-600` | Mock claim IDs (links visually) |
| `amber-200` / `amber-50` / `amber-700` | “At Risk” SLA pill in mock |
| `emerald-200` / `emerald-50` / `emerald-700` | “Healthy” SLA pill in mock |
| `slate-100` | Status chip background in mock |
| `slate-800` / `slate-900` | Primary buttons (bg), logo tile |

**Accent pattern:** Marketing leans **slate + white** with **blue** for interactive-looking mock IDs and **amber/emerald** for SLA chips.

### 3.2 Typography (explicit sizes on homepage)

Sizes are mostly **pixel literals** via arbitrary Tailwind values, not a named type scale:

| Element | Classes / size |
|---------|----------------|
| Nav logo wordmark | `text-[15px] font-semibold text-slate-900` |
| Nav links (desktop) | `text-[13px] text-slate-600 hover:text-slate-900` |
| Nav primary button | `text-[13px] font-medium` |
| Mobile nav links | `text-[14px] text-slate-700` |
| Hero eyebrow | `text-[12px] font-medium text-slate-700` |
| Hero eyebrow container | `uppercase` not used; eyebrow is title case in content |
| Hero **H1** | `text-[42px] leading-[1.1] font-bold text-slate-900` |
| Hero subcopy | `text-[17px] leading-[1.6] text-slate-600` |
| Hero CTAs | `text-[14px] font-medium` |
| Section intros — H2 | Mostly `text-[28px] font-bold`; security headline uses `text-[32px]` |
| Security CTA card H3 | `text-[24px] font-bold` |
| Card kicker (“WHAT TENIO IS”) | `text-[12px] font-semibold tracking-[0.12em] text-slate-500 uppercase` |
| Card body (large) | `text-[15px] leading-7 text-slate-700` |
| Pillar / step titles | `text-[15px] font-semibold text-slate-900` |
| Pillar / step body | `text-[13px] leading-6` or `leading-relaxed text-slate-600` |
| Customer cards | Title `text-[14px] font-semibold`, body `text-[12px] leading-relaxed` |
| Mock queue header | `text-[13px] font-medium` / meta `text-[12px] text-slate-500` |
| Mock row claim id | `text-[13px] font-medium text-blue-600` |
| Mock row secondary | `text-[11px] text-slate-500` |
| Mock pills | `text-[11px] font-medium` |

**Font weight pattern:** `font-bold` for major headings, `font-semibold` for subheads and buttons, `font-medium` for UI chrome.

### 3.3 Layout & spacing

| Pattern | Detail |
|---------|--------|
| **Max content width** | `max-w-6xl` (`72rem` / 1152px) centered with `mx-auto` |
| **Horizontal padding** | `px-6` on main sections |
| **Nav height** | `h-14` (3.5rem) |
| **Section vertical rhythm** | Hero: `pt-20 pb-16`; many sections `py-20`; bordered sections use `border-b border-gray-200` |
| **Grids** | Hero two-up: `md:grid-cols-2`; pillars: `md:grid-cols-3`; how-it-works: `md:grid-cols-4`; customers: `md:grid-cols-2 lg:grid-cols-4` |
| **Sticky nav** | `sticky top-0 z-50` with white background and bottom border |

### 3.4 Radius & elevation

- Cards: `rounded-lg` (8px) typical; final CTA band: `rounded-2xl`.
- Logo mark: `rounded` on `h-7 w-7` square.
- Buttons: `rounded` (4px default in Tailwind).
- **No box shadows** on main marketing sections (flat bordered cards only). Final CTA container is border-only, no shadow.

---

## 4. Navigation

### 4.1 Structure

- **Left:** Logo block — `h-7 w-7` slate-900 rounded square with white `FileText` icon (Lucide, `h-4 w-4`) + wordmark “Tenio”.
- **Center (md+):** Anchor links (same window):
  - Product → `#product`
  - How It Works → `#how-it-works`
  - Customers → `#customers`
  - Security → `#security`
- **Right:**
  - **Sign In** → Next.js `<Link href="/login">` — hidden below `md`, shown `md:block`
  - **Pilot Guide** → `<Link href="/pilot-guide">` — `hidden sm:block` (hidden on extra-small viewports)
  - **Hamburger** — visible `md:hidden`; toggles mobile drawer

### 4.2 Mobile menu

- When open: full-width panel under nav with `border-t`, `px-6 py-4`, `space-y-3`.
- Items: same four anchors + Sign In + full-width primary Pilot Guide button.
- Clicking a link calls `setMobileMenuOpen(false)` on anchors and Sign In.

### 4.3 Missing pieces

- **No footer** on the marketing homepage (page ends after the security section’s CTA band).
- **No “Book demo” / pricing / legal** links.
- **No language switcher** on the public homepage (unlike the app shell).

---

## 5. Section-by-section breakdown

### 5.1 Hero (`<section>` with border-b)

**Eyebrow (pill):**

- Container: `inline-flex`, `rounded-md`, `border border-slate-200 bg-slate-50`, `px-2.5 py-1`, `text-[12px] font-medium text-slate-700`
- Text: `Workflow OS For Claim-Status Work`

**H1:**

- `The operating system for claim-status follow-up.`

**Supporting paragraph:**

- `Tenio gives revenue cycle teams one governed workflow for queue ownership, routing, review, evidence, and auditability while automation handles payer retrieval and first-pass interpretation.`

**Primary CTA row:**

1. **Pilot Guide** — `bg-slate-900` button, white text, `ArrowRight` icon `h-4 w-4`, links to `/pilot-guide`
2. **Sign In** — outline `border-slate-300`, `text-slate-700`, links to `/login`

**Two definition cards (grid `md:grid-cols-2`, gap-4):**

| Card | Background | Kicker | Body |
|------|------------|--------|------|
| What Tenio Is | `bg-white` border | `WHAT TENIO IS` | The workflow system where claim-status work gets done: queue, ownership, routing, review, evidence, SLA visibility, and operational reporting. |
| What Tenio Does | `bg-slate-50` border | `WHAT TENIO DOES` | Automation retrieves claim status, normalizes messy payer output, scores confidence, and sends uncertain cases into human review instead of deciding official state on its own. |

**Product mock (“Claims Work Queue”):**

- Outer: `rounded-lg border border-slate-200 bg-slate-50 overflow-hidden`
- Header bar: `bg-white`, `border-b`, title `Claims Work Queue`, subtitle `24 unresolved` (`text-slate-500`)
- Inner table container: `divide-y divide-slate-100`, white bg, border
- **Three static rows** (not real data):

| Claim ID | Patient | Payer | Amount | Status chip | SLA chip | Owner |
|----------|---------|-------|--------|-------------|----------|-------|
| CLM-204938 | Martinez, Rosa | Aetna | $2,847 | Pending Review | **At Risk** (amber) | S. Chen |
| CLM-204821 | Johnson, Michael | UnitedHealthcare | $1,205 | In Process | **Healthy** (emerald) | M. Williams |
| CLM-203657 | Lee, David | Cigna | $894 | Needs Follow-up | **At Risk** (amber) | D. Park |

- Row hover: `hover:bg-slate-50`, `cursor-pointer`
- Right side: `ArrowRight` `text-slate-400`

---

### 5.2 Product (`id="product"`)

**H2:** `Workflow first. Automation underneath it.`

**Intro:** Tenio is not a generic agent or a simple scraper. It is the governed workflow layer revenue cycle teams use to run claim-status operations, with automation reducing the manual work around retrieval and interpretation.

**Three pillars** (`workflowPillars` array), equal cards `md:grid-cols-3`:

1. **Queue And Ownership** — Run claim-status work in one queue with clear assignment, review state, and next-action visibility.
2. **Routing And SLA Control** — Move claims through governed review paths with escalation signals, backlog visibility, and manager oversight.
3. **Evidence And Auditability** — Attach retrieval evidence, timestamps, and history so every claim decision can be trusted and explained.

Card style: `rounded-lg border border-slate-200 bg-white p-6`.

---

### 5.3 How it works (`id="how-it-works"`)

**H2:** `How it works`

**Intro:** A governed loop for retrieving, interpreting, routing, and resolving claim-status work.

**Four steps** (`md:grid-cols-4`), each:

- Number badge: `h-8 w-8 rounded bg-slate-900 text-white text-[14px] font-semibold` (1–4)
- Step name as H3
- Body paragraph (conditional copy per step):

| Step | Body |
|------|------|
| Retrieve | Collect claim status from payer portals or payer-connected channels with evidence attached. |
| Interpret | Normalize messy payer responses into candidate results with confidence scoring. |
| Route | Send uncertain, unresolved, or high-risk claims into governed review and ownership paths. |
| Resolve | Track ownership, next action, and SLA until claims are resolved. |

---

### 5.4 Customers (`id="customers"`)

- Section background: `bg-slate-50`
- **H2:** `Built for revenue cycle operations`
- **Intro:** Teams managing claim-status follow-up across multiple payers, large backlogs, and operational pressure around ownership, throughput, and SLA risk.

**Four audience cards** (`lg:grid-cols-4`), each with icon in `h-9 w-9` bordered slate well:

| Icon (Lucide) | Title | Body |
|---------------|-------|------|
| BarChart3 | Revenue Cycle Leaders | Throughput visibility, bottleneck analysis, and SLA performance tracking. |
| FileText | Claims Follow-up Teams | Single queue for unresolved work, clear ownership, and structured review. |
| Target | Operations Managers | Routing logic, SLA management, and team performance monitoring. |
| Users | RCM BPO Providers | Higher claim throughput with audit-ready evidence and structured output. |

---

### 5.5 Security & trust (`id="security"`)

**H2:** `Built for trust, not just automation demos.` (`text-[32px]`)

**Intro:** The core rule in Tenio is simple: automation can retrieve, interpret, and propose, but the workflow layer owns official state, review, and auditability.

**Three proof cards** (`proofPoints`, `md:grid-cols-3`), `bg-slate-50` cards with white icon tile:

| Icon | Title | Body |
|------|-------|------|
| Shield | Governed workflow | Automation proposes candidate outcomes. The workflow layer owns official state, review, and audit trail. |
| CheckCircle | Evidence on every claim | Tenio captures retrieval context and links it to the claim record so operators do not reconstruct history by hand. |
| Clock | Built for operational trust | Managers can see backlog, review load, escalation patterns, and SLA risk without stitching together multiple tools. |

**Closing CTA band** (centered, `rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center`):

- **H3:** `See how claim-status operations should work.`
- **Subcopy:** One system for queue, ownership, routing, evidence, and resolution, powered by retrieval automation.
- **Buttons:**
  - **Pilot Guide** → `/pilot-guide` (`bg-slate-900`, `font-semibold`, larger padding `px-6 py-3`)
  - **Contact Pilot Support** → `mailto:${supportEmail}` with same outline style as secondary CTAs

---

## 6. Icons (Lucide React)

Imported in `page.tsx`: `ArrowRight`, `BarChart3`, `CheckCircle`, `Clock`, `FileText`, `Menu`, `Shield`, `Target`, `Users`, `X`.

Usage summary:

- **Logo:** FileText
- **Mobile menu:** Menu / X
- **Hero primary CTA:** ArrowRight
- **Customer tiles:** BarChart3, FileText, Target, Users
- **Security tiles:** Shield, CheckCircle, Clock
- **Mock rows:** ArrowRight

---

## 7. Environment variables

- **`NEXT_PUBLIC_PILOT_SUPPORT_EMAIL`** — Used for the mailto in the final CTA. If unset, fallback string is `pilot-support@example.com`.

---

## 8. Responsive behavior summary

| Breakpoint | Behavior |
|------------|----------|
| `< sm` | Pilot Guide hidden in top nav (only hamburger + logo area); opens in mobile menu |
| `< md` | Desktop nav links + Sign In hidden; hamburger shown |
| `md+` | Full horizontal nav, Sign In visible |
| `sm+` | Pilot Guide visible in header |
| Grids | Stack to multi-column at `md` or `lg` as above |

---

## 9. Content & brand notes (for redesign)

- **Positioning line:** “Workflow OS” / “operating system for claim-status follow-up” — technical, operations-first, not consumer.
- **Differentiation:** Repeated contrast between **workflow authority** vs **automation proposing** — safe for enterprise RCM narrative.
- **Pilots:** CTAs emphasize **Pilot Guide** and **Contact Pilot Support**, not self-serve signup.
- **No social proof:** No logos, metrics, quotes, or case studies on the page today.
- **No video or screenshots** of the real app — only the stylized queue mock.
- **Typography inconsistency with app:** Authenticated app uses extensive `gray-*` tokens and shared messages; marketing uses **`slate-*`** and hardcoded strings.

---

## 10. Checklist for a redesign handoff

When you redesign (in Figma, Claude, etc.), consider explicitly specifying:

1. **IA** — Keep or change section order and anchor IDs (`#product`, etc.).
2. **Nav** — Items, CTAs, mobile behavior, optional footer links.
3. **Type scale** — Replace arbitrary `text-[13px]` with a named scale + loaded font files.
4. **Color** — Align slate vs gray with the product shell or intentionally diverge.
5. **Motion** — None today; add if desired.
6. **Imagery** — Real product screenshots, diagrams, or video.
7. **i18n** — Whether marketing should follow `en`/`fr` like the app.
8. **SEO** — Title/description beyond the single global metadata line.
9. **Accessibility** — Landmarks (`<main>`, `nav` labels), focus order, skip link, contrast audit on slate/gray text.
10. **Legal** — Privacy, terms, security page links if needed.

---

## 11. File reference

| Asset | Path |
|-------|------|
| Homepage | `apps/web/app/page.tsx` |
| Root layout + metadata | `apps/web/app/layout.tsx` |
| Global CSS | `apps/web/app/globals.css` |
| Pilot Guide (linked) | `apps/web/app/pilot-guide/page.tsx` |
| Login (linked) | `apps/web/app/login/page.tsx` |

---

*Generated from the codebase as a redesign reference. Update this doc when the implementation changes.*
