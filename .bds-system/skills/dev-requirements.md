# /dev-requirements — Requirements Engineering

> Every feature starts here. No code, no design, no tasks until requirements are written, challenged, and approved.
> Industry standard: a requirement that is vague, unmeasurable, or unvalidated will produce a feature that misses the mark — no matter how well it is built.

---

## REQ ID Format

```
{PREFIX}-REQ-{YYYY}-{SEQ:04d}
Example: GEO-REQ-2026-0001, GEO-REQ-2026-0042

Storage: requirements/{PREFIX}-REQ-{YYYY}-{SEQ:04d}-{slug}.md
Index:   requirements/REQUIREMENTS-INDEX.md
```

**Always use `/bds-db next-id REQ` for atomic ID assignment:**
```bash
sqlite3 .bds/bds.db "
  INSERT INTO entity_sequences (entity_type, year, last_seq)
  VALUES ('REQ', strftime('%Y','now'), 0)
  ON CONFLICT(entity_type, year) DO UPDATE SET last_seq = last_seq + 1
  RETURNING printf('%s-REQ-%s-%04d',
    (SELECT project_prefix FROM project_info),
    strftime('%Y','now'),
    last_seq
  );
"
```
This is the only way to get a REQ ID. Never hand-sequence. Never reuse a retired ID.

Read `project_prefix` from CLAUDE.md (`project_prefix: {PREFIX}`) before assigning any ID.

---

## Step 1 — Load context

Read: `CLAUDE.md`, `FEATURES.md`, `requirements/REQUIREMENTS-INDEX.md` (if it exists)

Check: Does this requirement already exist as a built feature (FEATURES.md) or a previous requirement (REQUIREMENTS-INDEX.md)? If yes, surface the existing REQ and ask the user if this is an extension or a new need.

---

## Step 2 — Capture the raw requirement

Transcribe the user's request verbatim. Assign the next REQ ID. Do not interpret or filter yet.

```
REQ ID: REQ-{YYYY}-{SEQ:04d}
Title:  <short descriptive title>
Source: User
Date:   {YYYY-MM-DD}
Raw:    "<verbatim user statement>"
```

If the user provided multiple distinct needs in one message, split them into separate REQs.

---

## Step 2.5 — Lineage Linkage (required before PM review)

**Before any review begins, establish the lineage chain for this requirement.**

Read `~/.claude/DomainModel/LINEAGE-RULES.md` — every REQ must trace to a BusinessGoal.

Ask (or infer from context):
1. **Which Feature does this requirement specify?** (Look in `FEATURES.md` for an existing FEAT-ID)
   - If no Feature exists yet: create a FEAT entry in `FEATURES.md` first, then continue.
2. **Which Epic does that Feature belong to?** (Look in `planning/EPICS.md`)
   - If no Epic exists: check `strategy/GOALS-DEV.md` for a DG that covers this area.
3. **Which Business Goal does this serve?** (Look in `BUSINESS-GOAL.md` current objectives)

If any of these cannot be answered: **do not proceed with the REQ**. A requirement without a business goal link is engineering debt before it is written. Create the missing parent entity first.

Once linkage is confirmed, populate these fields in the REQ frontmatter:
```yaml
business_goal: BG-{YYYY}-{NNNN}
dev_goal: DG-{YYYY}-{NNNN}
epic: EPIC-{YYYY}-{NNNN}
feature: FEAT-{YYYY}-{NNNN}
```

Show the lineage tag to confirm:
```
[LINEAGE] BG-{YYYY}-{NNNN} › DG-{YYYY}-{NNNN} › EPIC-{YYYY}-{NNNN} › FEAT-{YYYY}-{NNNN} › REQ-{YYYY}-{NNNN} (new)
```

---

## Step 3 — Principal PM Review

**Acting as a Principal Product Manager with 15+ years in this specific product domain** (API monetization for a data product, if GeoClear; adapt to project from CLAUDE.md):

Challenge every requirement with these questions. Every question must be answered — "N/A" is only acceptable with a brief reason.

**User and Problem:**
1. What specific user pain does this solve? Is this a hair-on-fire problem or a nice-to-have?
2. Who is the primary user? Who is the secondary user? Are their interests aligned?
3. What does the user try to do today instead? Why is that solution inadequate?
4. Is there evidence this is a real pain? (user feedback, support tickets, churn data, usage data)

**Outcome and Measurability:**
5. What is the measurable outcome if this ships successfully? (metric that moves, threshold that is hit)
6. How will we know in 30 days that this requirement was satisfied correctly?
7. What is the quantified business impact if we do NOT build this? (revenue lost, churn rate, CAC impact)

**Scope and Decomposition:**
8. Can this be broken into 2 or more independently deliverable requirements? If yes, what is the smallest version that delivers value?
9. What is explicitly OUT OF SCOPE for this requirement? Write it down — unwritten out-of-scope becomes implicit in-scope.
10. What are the edge cases and failure scenarios? List the top 3.

**Write the PM-reviewed requirement spec:**

```markdown
## Requirement: REQ-{ID}

### Problem Statement
<1-2 sentences: what user pain, for whom, how often, what they do today>

### Proposed Solution
<what the feature does — behavior, not implementation>

### Primary User
<who benefits most>

### Success Metric
<specific measurable outcome — e.g. "API calls to /v1/address returning flood_zone increase by 30% within 30 days of launch">

### Acceptance Criteria

Given <starting state>
When <user action or system event>
Then <observable outcome>
And <additional observable outcome if needed>

(Add one block per distinct scenario: happy path, error path, edge case)

### Out of Scope
- <explicitly excluded item 1>
- <explicitly excluded item 2>

### Edge Cases
- <edge case 1 and expected behavior>
- <edge case 2 and expected behavior>
```

---

## Step 4 — Distinguished PM Counter-Review

**Acting as a Distinguished Product Manager from Google or Meta** (principal-staff level, cross-product systemic thinking):

Review the PM spec above and challenge these dimensions:

**Strategic fit:**
1. Does this requirement align with the product's north star metric? (Read CLAUDE.md for it.) If not, is there a version that does?
2. Does a competitor already have this? Is we-too building the right answer, or do we need to differentiate?
3. Is there a simpler approach that achieves 80% of the value at 20% of the cost?

**Systemic impact:**
4. Does this requirement create a precedent we need to be comfortable with? (pricing, access control, data exposure)
5. Will this requirement become technical debt in 12 months if we build it as-is?
6. Does this add cognitive load to the existing product surface? Is the UX/API ergonomics net positive?

**ROI:**
7. Estimate the engineering complexity: days of work, teams involved.
8. Is the expected business impact proportional to that investment?

**Distinguished PM Verdict:**
```
Recommendation: APPROVE AS-IS | SCOPE DOWN (see notes) | REJECT (see notes)
Rationale: <1-3 sentences>
Condition for approval (if scoping down): <specific change required>
```

---

## Step 5 — Chief Architect Feasibility Review

**Acting as Chief Architect at Google or Meta** (Urs Hölzle / Jeff Dean level of rigor):

Review from a technical feasibility and systemic risk standpoint — not implementation details yet (that is Design's job):

1. **Feasibility**: Is this requirement implementable within the current architecture without a full rewrite? If not, what is the prerequisite architectural change?
2. **NFR flags**: Does this requirement imply non-trivial NFRs (performance, data volume, security) that the PM spec did not address? Name them explicitly.
3. **Hidden complexity**: What does this look like at 10x user load? At 100x data volume? At 1000 concurrent requests?
4. **Dependency risks**: Does this require a new external dependency? What is the failure mode of that dependency?
5. **Security surface**: Does this expand the attack surface? How?
6. **Simplicity check**: Is the PM spec asking for something with 10x complexity but 2x value? If so, is there a simpler formulation?

**Chief Architect Verdict:**
```
Feasibility:     FEASIBLE | FEASIBLE WITH CONDITIONS | NOT FEASIBLE
NFR flags:       <list any unaddressed NFRs — must be captured in ARCHITECTURE.md>
Conditions:      <what must be true before this can be implemented — if any>
```

---

## Step 6 — Finalize and write requirement document

Only proceed after at least one APPROVE from Distinguished PM and FEASIBLE from Chief Architect.
If SCOPE DOWN: revise the acceptance criteria before proceeding.
If REJECT or NOT FEASIBLE: document why and close the REQ as REJECTED — never delete it.

Write the final document to `requirements/REQ-{YYYY}-{SEQ:04d}-{slug}.md`:

```markdown
---
id: REQ-{YYYY}-{SEQ:04d}
title: <title>
status: Draft | Approved | Rejected | Superseded
date: {YYYY-MM-DD}
feature_area: <enrichment | billing | api | infra | frontend | admin>
# Lineage links — required for traceability (see ~/.claude/DomainModel/LINEAGE-RULES.md)
business_goal: BG-{YYYY}-{NNNN}        # the BG this requirement serves
dev_goal: DG-{YYYY}-{NNNN}             # the DevGoal that produced this REQ
epic: EPIC-{YYYY}-{NNNN}               # the Epic this belongs to
feature: FEAT-{YYYY}-{NNNN}            # the Feature this specifies
linked_design: — (filled when design exists)
linked_tasks: — (filled when tasks are created)
---

## Problem Statement
<from PM review>

## Proposed Solution
<from PM review>

## Primary User
<from PM review>

## Success Metric
<from PM review>

## Acceptance Criteria
<Given/When/Then blocks from PM review>

## Out of Scope
<from PM review>

## Edge Cases
<from PM review>

## NFR Implications
<from Chief Architect review — any performance/security/scale flags>

## Review History

| Role | Verdict | Date | Notes |
|------|---------|------|-------|
| Principal PM | APPROVE | {date} | <key notes> |
| Distinguished PM | APPROVE / SCOPE DOWN | {date} | <rationale> |
| Chief Architect | FEASIBLE | {date} | <conditions if any> |

## Status: APPROVED
```

---

## Step 7 — Update REQUIREMENTS-INDEX.md

Add a row to `requirements/REQUIREMENTS-INDEX.md`:

```markdown
# Requirements Index

| REQ ID | Title | Status | Feature Area | Design | Tasks | Date |
|--------|-------|--------|-------------|--------|-------|------|
| REQ-2026-0001 | Soft-gate enrichment for free tier | Approved | enrichment | DESIGN-2026-0001 | TASK-2026-0001..0004 | 2026-04-15 |
```

Create `requirements/REQUIREMENTS-INDEX.md` if it does not exist.

---

## Step 8 — Checkpoint

Show the user:
```
=== REQUIREMENT CAPTURED ===
REQ ID:  REQ-{ID}
Title:   <title>
Status:  APPROVED

Principal PM:      ✅ APPROVE
Distinguished PM:  ✅ APPROVE  (or SCOPE DOWN — <what changed>)
Chief Architect:   ✅ FEASIBLE

File: requirements/REQ-{ID}-{slug}.md

Next: /dev-design REQ-{ID}
```

If any reviewer said REJECT or NOT FEASIBLE: show that instead and do not proceed to design.
