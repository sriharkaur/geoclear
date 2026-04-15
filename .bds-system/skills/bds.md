# /bds — Business Delivery System Orchestrator

> The top-level entry point for the entire Business Delivery System.
> Assesses business health across all 5 layers (Foundations, Engineering, Operations, Business, Scale).
> Shows what's strong, what's at risk, and what to do next — with transparent reasoning.
> Output: Business Health Score + action plan + saved to `sessions/BDS-SESSION-{datetime}.md`

---

## What this does

`/bds` is the CEO-level view of the product. It reads everything — code state, strategy state, production health, unit economics — and surfaces the single most important action to take right now. It never guesses. It reads actual files.

`/dev` asks: "Are we building it correctly?"
`/strategy` asks: "Are we building the right thing?"
`/bds` asks: "Are we building a real, profitable, scalable business?"

---

## Step 1 — Read full business state

Read ALL of the following. Do not skip any:

```
CLAUDE.md                           — business model, north star, production status, stack
FEATURES.md                         — what is built
ARCHITECTURE.md                     — tech stack, endpoints, current architecture
QUEUE.md                            — what's in progress, what's queued, what's done
RELEASES.md                         — last release date and what shipped
BUSINESS-GOAL.md                    — vision, BGs, north star metrics
requirements/REQUIREMENTS-INDEX.md  — open requirements
design/DESIGN-INDEX.md              — approved designs waiting for execution
tests/BUG-REGISTRY.md               — open bugs
architecture/ARCH-AUDIT-INDEX.md    — P1/P2 architectural debt
strategy/STRATEGY-INDEX.md          — strategy analyses and their dates
strategy/GOALS-DEV.md               — DG entities (if exists)
strategy/KPIS.md                    — KPI entities and current values (if exists)
planning/EPICS.md                   — EPIC entities (if exists)
sessions/                           — list most recent 3 session files
```

Then check:
- `git log --oneline -10` — recent commit history
- `git status --short` — uncommitted work
- Run `curl {prod_url}/api/health` if production URL is in CLAUDE.md

---

## Step 2 — Score all 5 layers

Rate each layer: ✅ STRONG | ⚠️ AT RISK | ❌ CRITICAL | — N/A

### Layer 1 — Foundations
- Does a standard project structure exist? (requirements/, design/, sessions/, strategy/, planning/)
- Is CLAUDE.md complete with framework routing, stack, rules?
- Are FEATURES.md and ARCHITECTURE.md up to date?
- Is QUEUE.md current with all in-progress work tracked?
- **Lineage health:** Does BUSINESS-GOAL.md exist with active BGs? Do TASKs in QUEUE.md have `business_goal` links? Run mental orphan check: are any tasks obviously unconnected to a BG? If orphan rate appears > 10%, flag as ❌ CRITICAL; 5–10% = ⚠️ AT RISK. (Run `/domain-lineage audit` for precise count.)
- **Decomposition coverage:** Do DGs exist in `strategy/GOALS-DEV.md`? Do EPICs exist in `planning/EPICS.md`? If these files are absent and the project has >20 tasks, the lineage chain is broken.

Score: ✅ STRONG | ⚠️ AT RISK | ❌ CRITICAL

### Layer 2 — Engineering
- Is there in-progress work with no test coverage?
- Are there open P1 or P2 architecture debt items (from ARCH-AUDIT-INDEX)?
- Are there open bugs (from BUG-REGISTRY)?
- Is the test suite covering the most critical paths (API, E2E, security)?
- Are all endpoints behind auth? Any known security gaps?

Score: ✅ STRONG | ⚠️ AT RISK | ❌ CRITICAL

### Layer 3 — Operations
- Is there a health check endpoint that tests real dependencies?
- Are there runbooks for the top failure modes?
- Is there a deployment process that is a single command?
- Is there monitoring with alerts (not just logs)?
- Is there a tested backup and restore process?

Score: ✅ STRONG | ⚠️ AT RISK | ❌ CRITICAL

### Layer 4 — Business
- Does a SWOT analysis exist and is it < 60 days old?
- Is there a pricing strategy with defined unit economics (CAC, LTV, gross margin)?
- Is there a GTM plan with active customer acquisition channels?
- Are KPIs defined and being tracked?
- Is there a 90-day plan that is current?

Score: ✅ STRONG | ⚠️ AT RISK | ❌ CRITICAL

### Layer 5 — Scale
- Does the current architecture work at 10x current load? (check ARCHITECTURE.md for known limits)
- Are there any unbounded queries, missing indexes, or N+1 patterns in hot paths?
- Is there a data growth projection? Is disk headroom > 30%?
- Is cost per unit (per API call, per user) calculated and acceptable at 10x volume?
- Are there any single points of failure with no failover plan?

Score: ✅ STRONG | ⚠️ AT RISK | ❌ CRITICAL

---

## Step 3 — Determine business stage

Classify the current stage from CLAUDE.md:

```
PRE-LAUNCH    — no live customers, not in production
EARLY         — live, 1–10 paying customers, <$1K MRR
GROWTH        — 10–100 customers, $1K–$10K MRR
SCALE         — 100–1000 customers, $10K–$100K MRR
ENTERPRISE    — 1000+ customers, $100K+ MRR
```

Stage determines which layer gaps are most urgent:
- PRE-LAUNCH: Layer 1 and 2 are blocking; Layer 4 is highest leverage
- EARLY: Layer 3 is critical (production reliability); Layer 4 validates economics
- GROWTH: Layer 4 and 5 are the primary constraints
- SCALE: Layer 5 determines whether growth continues or stalls

---

## Step 4 — Apply priority rules

Work through these rules in priority order. The first rule that fires is the primary recommendation.

**Rule 1 — Critical security or reliability gap**
If Layer 2 or 3 has a ❌ (open P1 security item, no health check, no backup):
→ This is blocking everything. Fix before any other work.
→ Route to: `/dev-arch-security` or `/dev-arch-reliability`
Reasoning: a breach or outage at this stage destroys customer trust; it is the existential risk.

**Rule 2 — Production is broken**
If health check fails or recent commits show P0/P1 bugs:
→ Route to: `/dev-verify` then `/dev-build` for the fix
Reasoning: every minute customers can't use the product is revenue and trust lost.

**Rule 3 — No business strategy foundation**
If Layer 4 is ❌ (no SWOT, no pricing, no GTM):
→ Route to: `/strategy`
Reasoning: engineering a product without a validated business model is building toward an unknown destination.

**Rule 4 — Architecture debt blocking scale**
If Layer 5 has ❌ (missing indexes on hot queries, N+1 pattern, no headroom):
→ Route to: `/dev-arch-performance` or `/dev-arch-reliability`
Reasoning: architectural debt at scale is not technical debt — it is business risk. A system that falls over at 2x current load cannot grow.

**Rule 5 — In-progress engineering work**
If QUEUE.md has ⏳ IN PROGRESS tasks:
→ Route to: `/dev` (resumes in-progress work)
Reasoning: half-done work is waste. Complete it before starting anything new.

**Rule 6 — Strategy analyses are stale (> 60 days)**
If SWOT, pricing, or GTM are > 60 days old and the business is live:
→ Route to: `/strategy`
Reasoning: a strategy based on 3-month-old data at an early-stage company is a different company.

**Rule 7 — Open requirements or approved designs not yet executed**
If approved REQs or DESIGNs have no tasks in QUEUE:
→ Route to: `/dev-plan` for the first approved DESIGN
Reasoning: approved design is ready to execute; it represents a commitment to customers.

**Rule 8 — No operational runbooks**
If Layer 3 is ⚠️ (no runbooks, manual deployment, no monitoring):
→ Route to: `/dev-docs` to write runbooks + `/dev-arch-ops-excellence`
Reasoning: you will be paged at 3am. The question is whether you have instructions for yourself.

**Rule 9 — Unit economics not defined**
If no `/strategy-breakeven` and no `/strategy-kpis` have been run:
→ Route to: `/strategy-breakeven` then `/strategy-kpis`
Reasoning: growth without understanding unit economics is burning cash on an unknown outcome.

**Rule 10 — All layers healthy**
→ Route to: `/strategy-90day` (update execution plan) or ask user for the next priority
Reasoning: when the system is healthy, the highest leverage is planning the next growth sprint.

---

## Step 5 — Produce Business Health Report

```
=== BUSINESS DELIVERY SYSTEM — HEALTH REPORT ===
Date:    {YYYY-MM-DD HH:MM}
Project: {project name}
Stage:   {PRE-LAUNCH | EARLY | GROWTH | SCALE | ENTERPRISE}
North Star: {metric and current status}

LAYER SCORES
  Layer 1 — Foundations:  ✅/⚠️/❌  {one-line finding}
  Layer 2 — Engineering:  ✅/⚠️/❌  {one-line finding}
  Layer 3 — Operations:   ✅/⚠️/❌  {one-line finding}
  Layer 4 — Business:     ✅/⚠️/❌  {one-line finding}
  Layer 5 — Scale:        ✅/⚠️/❌  {one-line finding}

BUSINESS HEALTH SCORE:   {N}/5 layers strong

CRITICAL ISSUES (❌ — fix before anything else):
  - [Layer N] {specific issue and risk if not fixed}

AT RISK (⚠️ — schedule soon):
  - [Layer N] {specific issue}
  - [Layer N] {specific issue}

STRENGTHS (✅ — maintain these):
  - [Layer N] {what's working well}

STAGE ASSESSMENT
  Current stage: {stage}
  The constraint at this stage is: {the single most limiting factor}
  At {stage}, the highest-leverage action is always: {category of work}

DECISION
  [Rule {N}] Primary recommendation: {action + why}
  [Rule {N}] Secondary: {action}
  [Rule {N}] Tertiary: {action}

SEQUENCE
  Step 1: {skill + what it delivers}
  Step 2: {skill + what it delivers}
  Step 3: {depends on Step 1–2 outcome}

INVOKING: {first skill}
```

Show this report to the user BEFORE invoking anything.

---

## Step 6 — Save session

Save to: `sessions/BDS-SESSION-{YYYY-MM-DD-HH-MM-SS}.md`

```markdown
---
date: {YYYY-MM-DD HH:MM:SS}
triggered_by: /bds
stage: {stage}
north_star: {goal and current status}
---

## Layer Scores
{full scoring block}

## Decision Log
{decisions with Rule citations}

## Session Outcome
{what was invoked, what completed, what is now in progress}

## Business Health Trend
{compare to previous BDS session if one exists in sessions/}

## Next BDS Review
{recommended date for next /bds run — typically 2–4 weeks}
```

---

## Invocation variants

```
/bds                — full health check + route to highest-priority action
/bds plan-only      — health check + show plan, no invocation
/bds launch         — launch readiness: run all launch gates (see BDS.md)
/bds scale          — scale readiness: assess 10x/100x/1000x architecture gaps
/bds economics      — unit economics only: CAC, LTV, gross margin, payback
/bds <layer>        — single layer: foundations | engineering | operations | business | scale
```

### `/bds launch`
Runs through every launch gate in BDS.md (technical + business + operational).
Produces: LAUNCH-READINESS-{date}.md in sessions/.
Output: READY TO LAUNCH | NOT READY — {blocking items}.

### `/bds scale`
Reads ARCHITECTURE.md and current load data. Assesses whether architecture supports 10x, 100x, 1000x.
Identifies: scale ceiling (where it breaks first), cost projections, architectural changes needed.
Routes to: `/dev-arch-performance`, `/dev-arch-reliability`, or `/dev-arch-data` as needed.

### `/bds economics`
Reads pricing (from strategy/), usage data (from ARCHITECTURE.md or logs), and Stripe data (from CLAUDE.md).
Calculates: gross margin, CAC, LTV, payback period, burn multiple.
Compares to stage-appropriate benchmarks.
Routes to: `/strategy-pricing` or `/strategy-breakeven` if numbers are not healthy.

---

## Relationship to /dev and /strategy

```
/bds             ← business health across all layers (runs /dev and /strategy as sub-tasks)
  /dev           ← engineering + operations (Layers 1–3)
  /strategy      ← business (Layer 4)
```

`/bds` is not a replacement for `/dev` or `/strategy` — it is the context that makes them meaningful. Running `/dev` without `/bds` context may deliver technically correct code that solves the wrong problem. Running `/strategy` without `/bds` context may produce analyses that don't connect to what's actually being built.

The recommended cadence:
- Every session: `/dev` or `/strategy` (whichever is appropriate)
- Every 2 weeks: `/bds` (business health check, adjust priorities)
- Every quarter: `/bds scale` + `/strategy-90day` (90-day plan refresh)
