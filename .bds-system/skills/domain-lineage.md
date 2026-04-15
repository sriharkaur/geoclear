# /domain-lineage — Entity Lineage & Goal Traceability

> Traces any BDS entity to its root BusinessIdea, or traces a BusinessGoal to all its downstream
> delivery status. The answer to: "Does this task serve the north star?" and "What is actually
> blocking my business goal?"
>
> Reads: BUSINESS-GOAL.md, QUEUE.md, FEATURES.md, requirements/, design/, tests/, COMMS.md
> Writes: lineage reports to reports/lineage/ and COMMS items when issues found

---

## Invocation Variants

```
/domain-lineage trace {entity-id}     — full backward trace: task/bug/feat → BI
/domain-lineage chain {BG-ID}         — full forward trace: BG → all delivery status
/domain-lineage status                — dashboard: all BG lineage health at a glance
/domain-lineage audit                 — find all orphaned entities (no parent links)
/domain-lineage fix                   — interactively link orphaned entities to parents
/domain-lineage report                — generate Delivery Chain Report (R3) for current BGs
/domain-lineage kpi                   — KPI Pulse Report (R4) for current KPIs
```

---

## Step 1 — Load context

Read all of the following:
- `BUSINESS-GOAL.md` — current BGs, VIS, north star metrics
- `QUEUE.md` — all tasks and their status
- `FEATURES.md` — what's built and what's planned
- `requirements/REQUIREMENTS-INDEX.md` — REQ list with linked designs and tasks
- `design/DESIGN-INDEX.md` — DESIGN list
- `strategy/GOALS-DEV.md` — DGs (if exists)
- `strategy/GOALS-MARKETING.md` — MGs (if exists)
- `strategy/GOALS-CUSTOMER.md` — CGGs (if exists)
- `planning/EPICS.md` — EPIC list (if exists)
- `tests/BUG-REGISTRY.md` — open bugs
- `COMMS.md` — current open items

---

## `/domain-lineage trace {entity-id}`

**Purpose:** Start at any entity and walk backward to the BusinessIdea. Confirm the entity is linked to a business goal.

**Algorithm:**
1. Identify entity type from ID prefix (TASK, REQ, DESIGN, FEAT, EPIC, BUG, etc.)
2. Read the entity file/entry
3. Walk the parent chain using link fields (see LINEAGE-RULES.md L1)
4. If any link is missing → flag as LINEAGE GAP
5. Produce the R1 Lineage Trace Report (format in REPORTING.md)
6. If entity has no business_goal link → create COMM item: "Orphaned {type}: {id} — no business goal link"

**Output:** Print the R1 report. Save to `reports/lineage/TRACE-{entity-id}-{datetime}.md`.

---

## `/domain-lineage chain {BG-ID}`

**Purpose:** Start at a BusinessGoal and walk forward to show complete delivery status of everything that serves this goal.

**Algorithm:**
1. Read BG from BUSINESS-GOAL.md
2. Find all DGs with `business_goal: {BG-ID}` in `strategy/GOALS-DEV.md`
3. For each DG, find all EPICs with `dev_goal: {DG-ID}` in `planning/EPICS.md`
4. For each EPIC, find all FEATs with `epic: {EPIC-ID}` in FEATURES.md
5. For each FEAT, find all REQs with `feature: {FEAT-ID}` in REQUIREMENTS-INDEX
6. For each REQ, find linked DESIGN and linked TASKs
7. For each TASK, get status from QUEUE.md
8. Compute: % complete, blockers, risks, forecast

**Also trace:**
- MGs with `business_goal: {BG-ID}` → their KPI status
- CGGs with `business_goal: {BG-ID}` → their KPI status
- Any open BUGs linked to tasks in this chain

**Output:** Print the R3 Delivery Chain Report. Save to `reports/lineage/CHAIN-{BG-ID}-{datetime}.md`.

---

## `/domain-lineage status`

**Purpose:** One-screen health view of all active BGs and their delivery chains.

For each active BG:
1. Compute progress: TASKs(DONE) / TASKs(TOTAL) in the chain
2. Compute KPI progress: current / target
3. Flag at-risk BGs (KPI < 80% of target, or > 30% of deadline passed without proportional task completion)
4. Show open blockers

**Output:** Print R2 Goal Status Dashboard (format in REPORTING.md).

---

## `/domain-lineage audit`

**Purpose:** Find all orphaned entities — entities without a parent link — that represent waste.

**Check each entity type:**

```
TASKs: for each task in QUEUE.md → does it have business_goal? feature? design?
REQs:  for each REQ in REQUIREMENTS-INDEX → does it have feature? epic? business_goal?
FEATs: for each FEAT in FEATURES.md → does it have epic? dev_goal?
EPICs: for each EPIC in EPICS.md → does it have dev_goal? business_goal?
KPIs:  for each KPI in KPIS.md → does it have business_goal or linked_goal?
BUGs:  for each BUG in BUG-REGISTRY → does it have a linked requirement?
```

**Output:**
- Print R5 Orphan Audit Report (format in REPORTING.md)
- If orphan rate > 5%: create COMM item with category FYI
- If orphan rate > 10%: create COMM item with category REVIEW — "Lineage health below threshold"

---

## `/domain-lineage fix`

**Purpose:** Interactively assign parent links to orphaned entities.

For each orphan found in audit:
1. Show the entity (id, title, description)
2. Show likely parent candidates (entities in the same feature area / time period)
3. Ask: "Does {TASK-ID} '{title}' belong under {FEAT-ID} '{title}'? (yes/no/other)"
4. On yes: update the entity frontmatter with the parent link
5. On other: prompt for the correct parent ID

After fixing all orphans: re-run audit and confirm orphan rate is 0%.

---

## `/domain-lineage report`

Generates R3 (Delivery Chain Report) for all active BGs. Saves to `reports/lineage/DELIVERY-CHAIN-{datetime}.md`.

Adds a summary entry to COMMS.md:
```
COMM-{N}: [FYI] Delivery Chain Report generated — {YYYY-MM-DD}
  {N} active BGs | {N} FEATs shipped | {N} FEATs in progress | {N} tasks remaining
  Link: reports/lineage/DELIVERY-CHAIN-{datetime}.md
```

---

## `/domain-lineage kpi`

Generates R4 (KPI Pulse Report) for all active KPIs. Saves to `reports/lineage/KPI-PULSE-{datetime}.md`.

For KPIs at risk (< 80% of target):
- Traces back to find which FEATs in the chain haven't shipped yet
- Generates COMM item with full lineage block (format in REPORTING.md)

---

## Lineage Files Created Per Project

These files are created by the lineage system and maintained throughout the project:

```
strategy/
  GOALS-DEV.md            — all DG entities (DG-YYYY-NNNN)
  GOALS-MARKETING.md      — all MG entities
  GOALS-CUSTOMER.md       — all CGG entities
  KPIS.md                 — all KPI entities

planning/
  EPICS.md                — all EPIC entities

reports/lineage/
  TRACE-{entity-id}-{datetime}.md     — individual entity trace reports
  CHAIN-{BG-ID}-{datetime}.md         — delivery chain reports per BG
  DELIVERY-CHAIN-{datetime}.md        — full delivery chain report
  KPI-PULSE-{datetime}.md             — KPI pulse reports
  ORPHAN-AUDIT-{datetime}.md          — orphan audit reports
```

---

## GOALS-DEV.md Template

```markdown
# Dev Goals
> DevGoals link BusinessGoals to engineering Epics. Created by Engineering Council or 90-day planning.

| ID | Title | Business Goal | Status | Target Date | Epics |
|----|-------|--------------|--------|-------------|-------|
| DG-{YYYY}-0001 | {title} | BG-{YYYY}-0001 | ACTIVE | {date} | EPIC-{YYYY}-0001 |

---

## DG-{YYYY}-0001

```yaml
id: DG-{YYYY}-0001
title: "{what engineering must deliver}"
business_goal: BG-{YYYY}-0001
engineering_outcome: "{specific observable result}"
success_metric: "{measurable done criteria}"
target_date: {YYYY-MM-DD}
owner: Engineering
status: ACTIVE
linked_epics:
  - EPIC-{YYYY}-0001
```
```

---

## EPICS.md Template

```markdown
# Epics
> Epics are 1–3 month capability themes. Each links to a DevGoal.

| ID | Title | Dev Goal | Business Goal | Status | Quarter | Features |
|----|-------|---------|--------------|--------|---------|---------|
| EPIC-{YYYY}-0001 | {title} | DG-{YYYY}-0001 | BG-{YYYY}-0001 | IN_PROGRESS | Q2 2026 | FEAT-...|

---

## EPIC-{YYYY}-0001

```yaml
id: EPIC-{YYYY}-0001
title: "{capability theme name}"
dev_goal: DG-{YYYY}-0001
business_goal: BG-{YYYY}-0001
description: "{what this epic delivers at a customer level}"
target_quarter: Q2-{YYYY}
status: PLANNED | IN_PROGRESS | COMPLETE | CANCELLED
features:
  - FEAT-{YYYY}-0001
  - FEAT-{YYYY}-0002
```
```

---

## Integration with `/dev-requirements`

When `/dev-requirements` runs, after capturing the REQ it MUST:
1. Confirm or ask: "Which Feature does this requirement serve? (FEAT-ID or 'new')"
2. If 'new': create a FEAT entry in FEATURES.md before proceeding
3. Confirm or ask: "Which Epic does this feature belong to? (EPIC-ID or 'new')"
4. Populate `feature`, `epic`, `dev_goal`, `business_goal` in the REQ frontmatter

Without these four fields, the REQ is a planning orphan.

## Integration with `/dev-plan`

When `/dev-plan` writes tasks to QUEUE.md, each task header MUST include:
```
### {Feature Name}  [REQ-{ID}] [DESIGN-{ID}] [FEAT-{ID}] [BG-{ID}]
```

And each task MUST have in its metadata:
```
  business_goal: BG-{YYYY}-{NNNN}
  feature: FEAT-{YYYY}-{NNNN}
  epic: EPIC-{YYYY}-{NNNN}
```

This makes every task immediately traceable to the business goal it serves.
