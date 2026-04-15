# BDS Framework — Feedback Guide
> Audience: Any living agent in any BDS project
> Covers: how to submit improvement ideas back to BDS Global, the feedback format, lineage, review process

---

## Why Feedback Matters

BDS is a living framework. Every project that runs on BDS discovers edge cases, missing capabilities, and better patterns. That knowledge should flow back to improve the framework for all projects.

The feedback mechanism is the upward channel: local project → BDS Global. It is structured so that:
- Every suggestion is traceable (which project, which agent, what triggered it, when)
- Every suggestion has business context (how it benefits this project and others)
- Every suggestion can be reviewed, prioritized, and built using the same BDS process
- Nothing gets lost: feedback is a first-class entity in the BDS Global queue

---

## When to Submit Feedback

Submit feedback when you encounter any of these:

| Trigger | Example |
|---------|---------|
| A skill is missing a capability you needed | "I needed to track A/B tests but no entity type exists" |
| A skill's behavior caused a problem | "/bds-import Case B didn't handle circular references in lineage" |
| You found a better pattern | "Using `/bds-db next-id` inline is faster than the current 2-step process" |
| A threshold is wrong for your project type | "strategy_stale_days: 60 is too long for a fast-moving startup" |
| Documentation was unclear or wrong | "SETUP-GUIDE.md Step B.3 says X but the actual behavior is Y" |
| A new entity type would benefit multiple projects | "A CAMPAIGN entity type would help any project doing paid acquisition" |
| A quality gate is blocking work unnecessarily | "QG-DESIGN-02 requires all 9 dimensions but 2 are N/A for static sites" |

**Do not submit feedback for**:
- Project-specific customization that belongs in `bds.config.yaml`
- Bugs that are specific to one project's setup
- Items already in `BDS-GLOBAL-QUEUE.md` (check first)

---

## The Feedback Entity

Feedback is a special COMM item (`category: FEEDBACK`) with extended metadata. It creates a lineage trace from the project artifact that triggered it all the way to the BDS Global queue.

### Step 1: Create the feedback COMM item

Add to your project's `COMMS.md`:

```yaml
---
id: {PREFIX}-COMM-{NNNN}          # use /bds-db next-id COMM
category: FEEDBACK
title: "{concise title of the improvement}"
status: NEW
date: {YYYY-MM-DD}
reported_by: "{agent name/role that found this}"
---

## Improvement Request

### What is missing or wrong?
{Clear description of the gap, bug, or better pattern}

### What triggered this?
{Specific situation that surfaced the need — task ID, skill invoked, error encountered}
Triggered by: {PREFIX}-{TYPE}-{YYYY}-{NNNN}  ← entity that triggered the feedback

### How would this benefit this project?
{Specific, measurable benefit — e.g. "reduces time to create REQ from 15 min to 5 min"}

### How would this benefit other projects?
{Why this is general, not project-specific — e.g. "any project doing paid acquisition needs this"}

### Proposed solution (optional)
{If you have a specific implementation idea, describe it here. Leave blank if not.}

### Priority assessment
impact:    HIGH | MEDIUM | LOW       ← impact if built
effort:    HIGH | MEDIUM | LOW       ← estimated effort to build
type:      NEW_SKILL | NEW_ENTITY_TYPE | SKILL_FIX | SCHEMA_CHANGE | DOCS | CONFIG

### Lineage
project:   {PREFIX} — {Project Name}
project_stage: {stage}
product_type: {product_type}
triggered_by_entity: {PREFIX}-{TYPE}-{YYYY}-{NNNN}
reported_at: {YYYY-MM-DD HH:MM}
```

### Step 2: Assign a feedback ID

```bash
sqlite3 .bds/bds.db "
  INSERT INTO project_counters (counter_name, last_value) VALUES ('COMM', 0)
  ON CONFLICT(counter_name) DO UPDATE SET last_value = last_value + 1
  RETURNING printf('%s-COMM-%04d', (SELECT project_prefix FROM project_info), last_value);
"
```

Use that ID as the COMM item ID.

### Step 3: Insert into DB

```sql
INSERT INTO comms_items (comm_id, category, title, body, status, created_at)
VALUES ('{PREFIX}-COMM-{NNNN}', 'FEEDBACK', '{title}', '{body}', 'NEW', datetime('now'));
```

### Step 4: Surface to BDS Global (at session end)

When you have FEEDBACK items in `COMMS.md`, they are automatically included in the session summary report. BDS Global agents review these at the start of any BDS framework improvement session.

You can also escalate directly: add a note at the top of the FEEDBACK item:
```
escalate: true    ← BDS Global agents will prioritize reviewing this
```

---

## What BDS Global Does With Your Feedback

BDS Global agents review all FEEDBACK COMM items from registered projects and:

1. **Evaluate**: Does this benefit multiple projects? Is it in scope for the framework?
2. **Classify**: New skill | New entity type | Bug fix | Config enhancement | Docs
3. **Prioritize**: Impact × effort matrix; how many projects would benefit
4. **Create a BDS task**: If approved, a `BDS-TASK-{YYYY}-{NNNN}` is created in `BDS-GLOBAL-QUEUE.md` with full lineage back to your feedback item

The lineage chain for approved feedback:
```
{PREFIX}-COMM-{NNNN} (feedback)
  └── BDS-TASK-{YYYY}-{NNNN} (global task)
        └── BDS-FEAT-{YYYY}-{NNNN} (new framework feature)
              └── BDS-REQ-{YYYY}-{NNNN} (requirement)
                    └── BDS-DESIGN-{YYYY}-{NNNN} (design)
                          └── (skill file change / schema migration / doc update)
```

You can track the status of your feedback in `~/.claude/bds-global/QUEUE.md` — it will have a reference back to your original COMM item.

---

## Feedback Review SLA

| Priority | Review within | Decision within |
|----------|--------------|----------------|
| HIGH impact, LOW effort | 3 days | 7 days |
| HIGH impact, HIGH effort | 7 days | 14 days |
| MEDIUM impact | 14 days | 30 days |
| LOW impact | 30 days | Quarterly review |

If you have not seen a status update after these windows, escalate by adding `escalate: true` to the COMM item.

---

## Feedback That Gets Fast-Tracked

The following types of feedback skip the normal review queue and go directly into the next release:

1. **Security vulnerabilities in a skill** — any skill that could cause data leakage, injection, or authorization bypass
2. **Incorrect ID generation** — bugs in `/bds-db next-id` that could create duplicate IDs
3. **DB corruption** — bugs that could cause data loss in `.bds/bds.db`
4. **Bootstrap failures** — Phase 0 or Phase 2.5 failures that prevent new projects from starting

For these: mark the COMM item with `category: FEEDBACK` AND `priority: CRITICAL`.

---

## Example: A Complete Feedback Item

```yaml
---
id: GEO-COMM-0089
category: FEEDBACK
title: "Add A/B test entity type (ABTEST) to the domain model"
status: NEW
date: 2026-05-12
reported_by: "Growth Agent (GeoClear)"
escalate: false
---

## Improvement Request

### What is missing or wrong?
BDS has no entity type for A/B tests. When running experiments on the landing page,
there was no standard way to track hypothesis, variant, metric, and outcome in the
entity model. I created ad-hoc fields in a FEAT entity, which is the wrong type.

### What triggered this?
Triggered by: GEO-FEAT-2026-0031 (pricing page A/B test)
During planning (/dev-plan), no entity type existed for experiment tracking.
The REQ for the A/B test has no clean parent entity — FEAT is not semantically correct.

### How would this benefit this project?
Enables proper tracking of 3 planned A/B tests in Q3 (GEO-BG-2026-0003).
Lineage would flow: BG → CGG → ABTEST → FEAT → REQ → TASK.
Orphan rate would drop from current 8% to ~3%.

### How would this benefit other projects?
Any project in EARLY or GROWTH stage with a user-facing product runs A/B tests.
This is universal. SAAS_WEB_APP, CONSUMER_APP, MARKETPLACE — all need this.

### Proposed solution
New entity type: ABTEST
  - Tier: Strategy (Tier 2) — it's a hypothesis about user behavior
  - ID format: {PREFIX}-ABTEST-{YYYY}-{NNNN}
  - Parent: CGG or MG
  - Children: FEAT
  - Lifecycle: DRAFT → RUNNING → CONCLUDED
  - Required fields: hypothesis, control_variant, test_variant, metric, sample_size_target

### Priority assessment
impact:  HIGH   (every growth-stage project needs this)
effort:  MEDIUM (new entity type, schema addition, ID-REGISTRY update)
type:    NEW_ENTITY_TYPE

### Lineage
project:               GEO — GeoClear
project_stage:         EARLY
product_type:          API_SERVICE
triggered_by_entity:   GEO-FEAT-2026-0031
reported_at:           2026-05-12 09:45
```

This feedback would appear in `BDS-GLOBAL-QUEUE.md` as:

```markdown
🔲 BDS-TASK-2026-0055 — Add ABTEST entity type to domain model
  > Source: GEO-COMM-0089 (GeoClear, 2026-05-12)
  > Impact: HIGH | Effort: MEDIUM | Type: NEW_ENTITY_TYPE
  > Benefits: all growth-stage projects with user-facing products
```
