# BDS Entity Lineage Rules
> Every entity in BDS is traceable to a BusinessIdea.
> Every delivery outcome is traceable to a BusinessGoal.
> Lineage is the evidence that engineering is building the right thing.
> Last updated: 2026-04-15 | Version: 1.0

---

## What is Lineage?

Lineage is the ability to answer two questions at any point in the system:
1. **Forward:** "Given this BusinessGoal, what is its delivery status — what's built, what's in progress, what's blocked?"
2. **Backward:** "Given this Task (or Bug, or Deployment), which BusinessGoal does it serve?"

Without lineage, engineering can be busy and productive while the business stands still. With lineage, every engineer can answer "does this task move the north star?"

---

## Lineage Chain Definitions

### L1 — Primary Delivery Chain
The main stem from business intent to working software.

```
BI → VIS → BG → DG → EPIC → FEAT → REQ → DESIGN → TASK → (code) → TC → TR(PASS)
```

**Link fields (each entity holds a reference to its parent):**
- VIS: `business_idea: BI-YYYY-NNNN`
- BG: `vision: VIS-YYYY-NNNN`
- DG: `business_goal: BG-YYYY-NNNN`
- EPIC: `dev_goal: DG-YYYY-NNNN, business_goal: BG-YYYY-NNNN`
- FEAT: `epic: EPIC-YYYY-NNNN, dev_goal: DG-YYYY-NNNN`
- REQ: `feature: FEAT-YYYY-NNNN, epic: EPIC-YYYY-NNNN, dev_goal: DG-YYYY-NNNN, business_goal: BG-YYYY-NNNN`
- DESIGN: `requirements: [REQ-YYYY-NNNN, ...]`
- TASK: `design: DESIGN-YYYY-NNNN, requirement: REQ-YYYY-NNNN, feature: FEAT-YYYY-NNNN, business_goal: BG-YYYY-NNNN`
- TC: `task: TASK-YYYY-NNNN, requirement_ac_ref: "AC-{N}"`
- TR: references TC; PASS closes the requirement AC, FAIL opens BUG

**Lineage broken when:** Any entity in the chain is missing a parent reference. This indicates a planning gap.

**Trace example (backward from Task):**
```
TASK-2026-0047 "Add flood zone to /v1/address response"
  → DESIGN-2026-0012 "Enrichment API v2 — flood zone field"
  → REQ-2026-0008 "Return flood zone in address response"
  → FEAT-2026-0003 "Flood zone enrichment"
  → EPIC-2026-0001 "Address enrichment suite"
  → DG-2026-0002 "Deliver 5 new enrichment fields by end of Q2"
  → BG-2026-0001 "Reach $10K MRR by June 30 2026"
  → VIS-2026-0001 "Become the default address intelligence API for US developers"
  → BI-2026-0001 "Developer-facing US address enrichment API"
```

---

### L2 — Marketing Execution Chain
From business goal to marketing activities to KPI measurement.

```
BG → MG → STRAT(GTM) → PER → Channel → KPI → Measurement
```

**Link fields:**
- MG: `business_goal: BG-YYYY-NNNN`
- STRAT (GTM type): `marketing_goal: MG-YYYY-NNNN, business_goal: BG-YYYY-NNNN`
- PER: `linked_mg: [MG-YYYY-NNNN]`, `primary_channel`
- KPI: `marketing_goal: MG-YYYY-NNNN, business_goal: BG-YYYY-NNNN`

**Purpose:** Ensures marketing activity is measurable and tied to a goal. "Publish 3 blog posts" is not a MG. "Generate 200 inbound trial signups from content by June" is.

---

### L3 — Customer Growth Chain
From business goal to AARRR metric to KPI feedback.

```
BG → CGG → KPI → Measurement → [if miss] → gap analysis → new REQ or BG revision
```

**Link fields:**
- CGG: `business_goal: BG-YYYY-NNNN, aarrr_category`
- KPI: `customer_growth_goal: CGG-YYYY-NNNN`

**Feedback trigger:** When `KPI.current_value < KPI.target × 0.80`:
1. Create `COMM-{N}` item: "KPI-{ID} missing target — review needed"
2. Root cause: which FEAT or EPIC failed to move the metric?
3. Either create new REQ to address the gap, or revise the CGG target.

---

### L4 — Bug/Fix Loop Chain
Defect lifecycle from test failure back to resolution.

```
TC → TR(FAIL) → BUG → TASK(fix) → TC → TR(PASS) → BUG closed
```

**Link fields:**
- TR: `test_cases: [TC-YYYY-NNNN]`, `commit_sha`
- BUG: `test_result: TR-datetime, requirement: REQ-YYYY-NNNN` (what spec was violated?)
- TASK(fix): `bug: BUG-YYYY-NNNN, type: code`
- On TR(PASS) for the fix: update `BUG.status = VERIFIED`

**Key rule:** A Bug must always reference the REQ it violates. If no REQ exists, the test was testing undocumented behavior — create the REQ retroactively.

---

### L5 — Deployment/Operations Chain
From engineering completion to verified production.

```
TASK(✅) → DEP → VR → [if PASS] → Feature shipped
                    → [if FAIL] → INC → BUG → L4 (fix loop)
```

**Link fields:**
- DEP: `tasks_included: [TASK-YYYY-NNNN]`, `commit_sha`, `environment`
- VR: `deployment: DEP-YYYY-NNNN`
- INC: `verification_report: VR-datetime`
- BUG (from INC): `incident: INC-YYYY-NNNN`

**Key rule:** Every production deployment creates a DEP + VR pair. No deployment is "done" without a VR.

---

### L6 — Architecture Decision Chain
From requirement to design decision to implementation.

```
REQ → [design review raises question] → AD → DESIGN (reflects AD) → TASK
```

**Link fields:**
- AD: `requirement: REQ-YYYY-NNNN, design: DESIGN-YYYY-NNNN`
- DESIGN: `arch_decisions: [AD-NNNN]`

**Key rule:** Every AD must reference at least one REQ or DESIGN. An AD without context is just an opinion.

---

### L7 — Strategy-to-Requirement Chain
How strategy analyses translate to engineering deliverables.

```
STRAT → [council session] → DEC → BG → DG → EPIC → FEAT → REQ
```

**Link fields:**
- DEC: `strategy_analysis: STRAT-YYYY-NNNN`
- BG: `decision: DEC-NNNN` (the decision that created this goal)
- DG: `business_goal: BG-YYYY-NNNN`

**Key rule:** Every BG should trace to at least one DEC. Goals without a decision record are informal and easy to override.

---

### L8 — KPI Feedback Loop
The mechanism that closes the loop from delivery back to business goals.

```
BG → KPI (target set) → periodic measurement → compare actual vs target
  → [if on track] → continue
  → [if miss by >20%] → root cause trace → new REQ or revised BG
  → [if achieved] → close BG, create next BG or escalate VIS
```

**Implementation in COMMS.md:**
When a KPI misses target: auto-create COMM item with lineage trace showing which FEATs/EPICs were meant to move this KPI and which did/didn't ship.

---

## Lineage Tag Format

Every entity that creates a COMM item MUST include a lineage trace in this format:

```
[LINEAGE] BI-2026-0001 › VIS-2026-0001 › BG-2026-0001 › DG-2026-0002 › EPIC-2026-0001 › FEAT-2026-0003 › REQ-2026-0008 › DESIGN-2026-0012 › TASK-2026-0047 ⏳
```

The lineage tag:
- Shows the full chain from root to current entity
- Uses `›` as separator
- Shows current entity status at the end: `□` (queued), `⏳` (in progress), `✅` (done), `❌` (blocked)
- Goes in the `linked_entities` field of the COMM item and in the COMM body

---

## Lineage Health Rules

| Rule | Check | Action if violated |
|------|-------|-------------------|
| Every TASK must trace to a BG | `TASK.business_goal` is populated | Flag task as "orphaned" in QUEUE.md |
| Every REQ must trace to a FEAT | `REQ.feature` is populated | Flag as planning gap; create FEAT |
| Every BUG must reference a REQ | `BUG.requirement` is populated | Document the req retroactively |
| Every deployed FEAT must have a TR(PASS) | VR links to TR | Block deploy without green tests |
| Every KPI must link to a BG | `KPI.business_goal` is populated | KPI is unmeasured business intent |
| Every DESIGN must have an approved REQ | `REQ.status = APPROVED` | Cannot approve design for unapproved REQ |

---

## Orphaned Entity Protocol

An entity is "orphaned" if it has no parent link. Orphaned entities represent waste — engineering effort not connected to business intent.

**Detection:** Run `/domain-lineage audit` to find all orphaned entities.
**Resolution:**
- Orphaned TASK: trace back through QUEUE.md — which feature does this serve? Add `feature` and `business_goal` fields.
- Orphaned BUG: which REQ did it violate? If none, write the REQ retroactively.
- Orphaned FEAT: which EPIC does this belong to? If no EPIC exists, does a DG exist? Create the missing parent.
