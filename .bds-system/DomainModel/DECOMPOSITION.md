# BDS Goal Decomposition Model
> The complete framework for decomposing a Business Idea into Vision, Goals, and executable Tasks.
> With Strategy Council and Engineering Council analysis at every tier.
> Includes the feedback loop from KPI measurement back to goals.
> Last updated: 2026-04-15 | Version: 1.0

---

## The Decomposition Principle

A business idea is not a plan. The gap between "I want to build X" and "TASK-0047 is done" is where most startups fail — not because the idea was bad, but because the decomposition was broken. Goals were vague. Features didn't map to goals. Tasks weren't traceable to why they mattered.

The BDS decomposition model makes this gap explicit, systematic, and measurable.

```
Business Idea (1)
  └─► Vision (1)                          ← "where we're going in 3 years"
        └─► Business Goals (3–5)          ← "what winning this quarter looks like"
              ├─► Marketing Goals (2–4)   ← "how we reach customers"
              ├─► Dev Goals (3–6)         ← "what engineering must ship"
              └─► Customer Growth Goals (3–5) ← "which AARRR metrics move"
                    └─► KPIs (1..N per goal)  ← "the measurable signal"
                    └─► Epics (1..N per DG)  ← "3-month capability themes"
                          └─► Features (2..5 per Epic) ← "shippable units"
                                └─► Requirements (1..N per Feat) ← "what + AC"
                                      └─► Design (1 per REQ) ← "how"
                                            └─► Tasks (3–8 per Design) ← "do it"
```

---

## Phase 1 — Business Idea Intake

**Who:** The user provides the raw idea. The system captures it.
**Output:** `BI-{YYYY}-0001` created in `strategy/BUSINESS-IDEAS.md`

**Capture template:**
```yaml
id: BI-{YYYY}-0001
raw_idea: "{verbatim founder words — never paraphrase}"
problem: "{the specific pain being solved}"
target_user: "{who has this problem}"
business_model: "{how it makes money}"
product_type: "{API_SERVICE | SAAS_WEB_APP | CONSUMER_APP | DATA_PRODUCT | ...}"
stated_constraints: "{budget, stack, timeline if mentioned}"
date: "{YYYY-MM-DD}"
status: CAPTURED
```

**Council trigger:** Phase 1 intake is the trigger for the Strategy Council analysis in Phase 2.

---

## Phase 2 — Strategy Council Analysis → Vision

**Who:** Strategy Council (McKinsey + Musk + Zuckerberg + Pichai + CMO + CFO personas, convened by `/bds-customize` or `/bds-bootstrap` Phase 2).
**Input:** `BI-{YYYY}-0001`
**Output:** `VIS-{YYYY}-0001` in `BUSINESS-GOAL.md`, strategy analyses in `strategy/`

**Council runs (in order):**
1. SWOT analysis → identifies opportunities and risks
2. Value proposition → what is the core promise that customers will pay for?
3. Persona analysis → who are the first 10 customers, who are customers 10–1000?
4. Competitor analysis → what exists, where is the gap, what is the defensible moat?
5. Pricing analysis → what model, what tiers, what anchor point?
6. Breakeven analysis → how many customers to reach profitability?

**Vision formation (from council output):**
```markdown
VIS-{YYYY}-0001:
  statement: "{specific, measurable, 3-year horizon}"
  example: "Become the default address intelligence API for US developers,
            with 10,000 paying customers and $100K MRR by 2029."
  approved_by: Strategy Council
  date: {YYYY-MM-DD}
  version: 1.0
```

**Council output also produces:**
- `DEC-NNNN` entries for every business model, pricing, and positioning decision
- Updates to `BUSINESS-GOAL.md` Vision section

---

## Phase 3 — Vision → Business Goals

**Who:** CPM function + Strategy Council
**Input:** `VIS-{YYYY}-0001`
**Output:** 3–5 `BG-{YYYY}-NNNN` entities for the current quarter

**BusinessGoal rules:**
- SMART: Specific, Measurable, Achievable, Relevant, Time-bound
- Each BG has ONE clear success metric and ONE deadline
- Maximum 5 BGs per quarter — more = dilution, less = too conservative

**Example decomposition from Vision:**
```
VIS-2026-0001: "$100K MRR in 3 years"
  │
  ├─► BG-2026-0001: "Reach $10K MRR by June 30, 2026"
  │     success_metric: MRR ≥ $10,000
  │     deadline: 2026-06-30
  │
  ├─► BG-2026-0002: "Achieve p99 < 200ms on address API by April 30, 2026"
  │     success_metric: p99 latency ≤ 200ms
  │     deadline: 2026-04-30
  │
  └─► BG-2026-0003: "Retain 85% of paying customers through June 2026"
        success_metric: monthly churn < 5%
        deadline: 2026-06-30
```

---

## Phase 4 — Business Goals → Goal Decomposition (3 streams)

Each BG decomposes to three parallel streams:

### Stream A: Marketing Goals (MG)
**Who:** CMO function + `/strategy-gtm`
**Purpose:** Translate the BG into customer-facing acquisition, activation, and retention targets.

**AARRR-aligned decomposition:**
```
BG-2026-0001 "$10K MRR"
  ├─► MG-2026-0001 [Acquisition]:  "Generate 500 trial signups/month via content by May"
  │     metric: trial_signups_from_content
  │     channel: SEO blog, developer newsletter
  │     kpi: KPI-2026-0001
  │
  ├─► MG-2026-0002 [Conversion]:   "Convert 15% of trials to paid within 14 days"
  │     metric: trial_to_paid_conversion_rate
  │     kpi: KPI-2026-0002
  │
  └─► MG-2026-0003 [Retention]:    "Reduce month-1 churn to < 8%"
        metric: month_1_churn_rate
        kpi: KPI-2026-0003
```

### Stream B: Dev Goals (DG)
**Who:** Engineering Council + CPM function
**Purpose:** Translate the BG into specific engineering outcomes — features, reliability, performance.

```
BG-2026-0001 "$10K MRR"
  ├─► DG-2026-0001: "Ship 5 new enrichment fields (flood zone, RDI, census, timezone, FEMA) by May 15"
  │     engineering_outcome: 5 new fields in /v1/address response
  │     success_metric: 5 fields live, each with test coverage
  │
  └─► DG-2026-0002: "Implement tier-gated access for Growth tier by April 30"
        engineering_outcome: Growth tier fields locked behind $249/mo paywall
        success_metric: Stripe webhook correctly gates field access

BG-2026-0002 "p99 < 200ms"
  └─► DG-2026-0003: "Index optimization: eliminate full-scan queries on NAD DB by April 20"
        engineering_outcome: all hot-path queries use indexes
        success_metric: EXPLAIN QUERY PLAN shows no full-table scans
```

### Stream C: Customer Growth Goals (CGG)
**Who:** Product + Strategy Council
**Purpose:** AARRR metric targets that define customer success.

```
BG-2026-0003 "85% retention"
  ├─► CGG-2026-0001 [Activation]:   "80% of new signups make their first API call within 24h"
  ├─► CGG-2026-0002 [Revenue]:      "Average customer value ≥ $75/mo at 3-month mark"
  └─► CGG-2026-0003 [Retention]:    "Monthly customer churn < 5%"
```

---

## Phase 5 — Dev Goals → Epics → Features

**Who:** Principal TPM + Principal Architect
**Input:** `DG-{YYYY}-{NNNN}`
**Output:** EPIC + FEAT entities in `planning/EPICS.md` and `FEATURES.md`

**Epic rules:**
- Scope: 1–3 months of engineering effort
- Self-contained: delivers measurable user value on completion
- Named by capability, not by feature: "Address Enrichment Suite" not "Add flood zone field"

**Feature rules:**
- Scope: 1–3 weeks, shippable independently
- Customer-visible: something a customer can describe as "it does X now"
- Maps to exactly one Epic

```
DG-2026-0001 "5 enrichment fields"
  └─► EPIC-2026-0001: "Address Enrichment Suite"
        target_quarter: Q2 2026
        linked_dg: DG-2026-0001
        │
        ├─► FEAT-2026-0001: "Flood zone enrichment field"
        ├─► FEAT-2026-0002: "Census data integration"
        ├─► FEAT-2026-0003: "FEMA flood map lookup"
        ├─► FEAT-2026-0004: "Timezone enrichment"
        └─► FEAT-2026-0005: "RDI (Rural-Urban) classification"
```

---

## Phase 6 — Features → Requirements → Design → Tasks

This is the existing dev pipeline, now with lineage context:

```
FEAT-2026-0001 "Flood zone enrichment"
  └─► REQ-2026-0008 (via /dev-requirements)
        frontmatter:
          feature: FEAT-2026-0001
          epic: EPIC-2026-0001
          dev_goal: DG-2026-0001
          business_goal: BG-2026-0001
        acceptance_criteria:
          - Given valid US address → flood zone field returned
          - Given free tier → preview flag shown, field null
          - Given FEMA API down → null field returned, no 500
        └─► DESIGN-2026-0012 (via /dev-design)
              └─► TASK-2026-0047: "Add flood_zone to enrich.js"
              └─► TASK-2026-0048: "Add tier gate for flood_zone field"
              └─► TASK-2026-0049: "Test flood_zone: happy path + FEMA-down"
              └─► TASK-2026-0050: "Update FEATURES.md and ARCHITECTURE.md"
```

---

## Phase 7 — Delivery → Verification → KPI Measurement

```
TASK-2026-0047..0050 ✅ complete
  └─► DEP-2026-0015 (production deploy via /dev-deploy)
        └─► VR-2026-04-20-14-30-00 (smoke test via /dev-verify)
              └─► [PASS] FEAT-2026-0001 marked SHIPPED in FEATURES.md
                    └─► KPI-2026-0001 measurement check (weekly):
                          metric: "API calls returning flood_zone > 0"
                          actual: 1,240 calls/day (14 days post-launch)
                          target: 1,000 calls/day
                          status: ✅ ON TRACK → BG-2026-0001 progress: +8%
```

---

## The Feedback Loop

The feedback loop closes the system. Without it, goals are set once and never revisited.

```
KPI Measurement (weekly/monthly) → compare actual vs target
  │
  ├─► [ON TRACK ≥ 80% of target] → Continue. Update BUSINESS-GOAL.md metrics table.
  │
  ├─► [AT RISK 50–80% of target] → Create COMM item:
  │     "KPI-{ID} at {X}% of target. Root cause: which FEATs haven't shipped?"
  │     "Run /business-goal align to find misaligned queue items."
  │
  ├─► [MISS < 50% of target] → Trigger review:
  │     1. Root cause trace: BI → BG → DG → EPIC → FEAT → what didn't ship?
  │     2. Options: new REQ to address gap | revised target | pivoted strategy
  │     3. Create DEC entry for the decision made
  │     4. If strategy pivot: run /business-goal refine → new BG version
  │
  └─► [ACHIEVED] → Close BG:
        1. Mark BG status = ACHIEVED
        2. Run /business-goal update with achievement
        3. Create next BG for the next milestone
        4. If all BGs achieved → review VIS for 3-year progress
```

---

## Decomposition Quality Gates

Before any phase can complete, these gates must pass:

| Gate | Check | Who verifies |
|------|-------|-------------|
| BI captured | verbatim idea recorded, product type classified | Auto (bds-bootstrap) |
| VIS approved | Vision statement is measurable and time-bound | Strategy Council |
| BG is SMART | Has one metric, one deadline, one owner | CPM |
| DG links to BG | Every DG has `business_goal: BG-YYYY-NNNN` | Engineering Council |
| EPIC links to DG | Every EPIC has `dev_goal: DG-YYYY-NNNN` | Principal TPM |
| FEAT links to EPIC | Every FEAT has `epic: EPIC-YYYY-NNNN` | Principal TPM |
| REQ links to FEAT | REQ frontmatter has `feature: FEAT-YYYY-NNNN` | /dev-requirements |
| TASK links to BG | TASK has `business_goal: BG-YYYY-NNNN` | /dev-plan |
| KPI links to goal | KPI has `business_goal` or `dev_goal` | /strategy-kpis |
| TC links to REQ AC | TC references specific acceptance criterion | /dev-test |

**Orphan check:** At every `/bds` health check, scan for entities missing parent links. Flag them in the Layer 1 (Foundations) score as ⚠️ AT RISK if orphans exist.

---

## Decomposition Anti-Patterns

| Anti-pattern | Why it fails | Fix |
|-------------|-------------|-----|
| "Build feature X" (no BG link) | Can't know if X moves the goal | Link X to a FEAT, FEAT to an EPIC, EPIC to a DG, DG to BG |
| BG = "Improve performance" (not measurable) | Can't close the feedback loop | BG must have a specific metric + target + date |
| EPIC = single-feature epic | No leverage; planning overhead without benefit | Combine related FEATs under one theme |
| KPI with no baseline | Can't measure progress | Always capture baseline at KPI creation |
| 10+ BGs in one quarter | Dilution — nothing gets done well | Max 5 BGs per quarter, enforce ruthlessly |
| REQ without acceptance criteria | Untestable — any implementation passes | Every REQ needs Given/When/Then blocks |
| Strategy analyses with no DEC output | Deliberation with no commitment | Every analysis must produce ≥1 DEC |
