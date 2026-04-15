# BDS Framework — System Guide
> Audience: Living agents, system admins
> Covers: how every subsystem works, data flow, agent lifecycle, session model, failure modes

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  GLOBAL LAYER  (~/.claude/)                                               │
│                                                                            │
│  bds-global.db ──────── framework registry (skills, entity types, chains)│
│  bds-framework/ ───────  distributable SDK + documentation                │
│  bds-global/ ──────────  control plane (goals, queue, releases)           │
│  skills/ ──────────────  canonical skill files (source of truth)          │
│  DomainModel/ ─────────  schemas + entity model (source of truth)         │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │  /bds-import or /bds-bootstrap
                                 │  copies skills, schema → project
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  PROJECT LAYER  ({project-root}/)                                         │
│                                                                            │
│  .bds/bds.db ──────────  operational DB (entities, KPIs, lineage, audit) │
│  .bds/bds.config.yaml ─  framework contract (committed to git)            │
│  .claude/skills/ ──────  project copy of skills (what Claude Code runs)   │
│  .claude/commands/ ────  aliases for slash command invocation             │
│  CLAUDE.md ────────────  master orchestrator + project rules              │
│  COMMS.md ─────────────  human ↔ agent communication queue               │
│  QUEUE.md ─────────────  task execution state                             │
│  FEATURES.md ──────────  canonical feature inventory                      │
│  BUSINESS-GOAL.md ─────  north star                                       │
│  strategy/GOALS-*.md ──  goal decomposition outputs                       │
│  planning/EPICS.md ────  epic inventory                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Data flow rule**: Information flows DOWN (global → project) at setup time. Information flows UP (project → global) only via the feedback mechanism (COMM items to BDS-GLOBAL-QUEUE.md). There is no runtime upward data flow.

---

## Session Lifecycle

Every Claude Code session follows this sequence:

```
Session Start
    │
    ├── Read CLAUDE.md (project rules, prefix, routing)
    ├── Read FIRST-PRINCIPLES.md (the constitution — non-negotiable rules)
    ├── Read COMMS.md (surface 🆕 NEW and ⏳ IN PROGRESS items)
    │       ↑ Physical-world tasks surfaced FIRST, above all other items
    ├── Read DECISIONS.md (understand what was decided since last session)
    └── Determine entry point:
            /dev   → engineering work
            /strategy → business analysis
            /bds   → health check / unknown start point
            (or specific skill invoked directly)
    │
Work Phase
    │
    ├── Read files before writing (never assume structure)
    ├── Assign entity IDs via /bds-db next-id {TYPE}
    ├── Dual-write: markdown file first, then DB
    ├── Update QUEUE.md (mark IN PROGRESS → DONE)
    ├── Update FEATURES.md + ARCHITECTURE.md + RELEASES.md in same commit
    └── Commit: code + all doc files together, never split
    │
Session End
    │
    ├── All started tasks are either DONE or marked ⏳ IN PROGRESS in QUEUE.md
    ├── No half-done state without a COMM item noting where it stopped
    └── COMMS.md updated with any new items (BLOCKED, DECISION needed, FYI)
```

---

## The Skill Execution Model

Skills are markdown instruction files. When a skill is invoked (e.g. `/dev`), Claude Code reads the file and follows the instructions as the current agent persona.

**Skill anatomy:**
```markdown
# /skill-name — Title
> Audience and trigger conditions

## When this skill runs

## Step 1 — {Step name}
Acting as: {agent persona}
Instructions...

## Step N — ...
```

**Key conventions:**
- Skills `read` state (markdown files, DB) before acting on it
- Skills `write` via dual-write: markdown first, then DB insert
- Skills call other skills (e.g. `/bds` calls `/domain-lineage audit`)
- Skills check prerequisites and fail explicitly if not met
- Every skill output includes entity IDs so results are traceable

**Agent personas** (not separate AI instances — perspectives Claude Code adopts):
- Principal PM: product depth, user pain, measurability
- Principal Architect: technical feasibility, patterns, risks
- Principal TPM: sequencing, dependencies, parallelism
- Chief Architect: systemic design, cross-cutting concerns
- Strategy Council: market, positioning, economics
- Distinguished PM: cross-product systemic thinking
- CPM: program-level view, risks, decisions, economics
- Observer: neutral, evidence-based, no advocacy

---

## The Dual-Write Protocol

Every entity creation follows this sequence — in this order, no exceptions:

```
1. Write to markdown file (human-readable, git-trackable, source of truth)
2. Insert into .bds/bds.db entities table
3. Insert or update lineage_chains table
4. Insert into entity_relationships table (parent-child links)
5. Record in audit_log
```

If a session ends between steps 1 and 2, the markdown is the ground truth. Run `/bds-db migrate` to re-sync the DB from markdown.

**Which skills write which entities:**

| Skill | Creates |
|-------|---------|
| `/bds-bootstrap` Phase 1 | BI |
| `/bds-bootstrap` Phase 2.5 | VIS, BG, MG, DG, CGG, KPI, EPIC |
| `/business-goal` | VIS, BG |
| `/strategy-swot`, `/strategy-*` | STRAT |
| `/strategy-personas` | PER |
| `/strategy-pricing` | TIER |
| `/dev-requirements` | REQ |
| `/dev-design` | DESIGN, AD |
| `/dev-plan` | TASK |
| `/dev-test` | TC, TR, BUG |
| `/dev-deploy` | DEP |
| `/dev-verify` | VR |
| `/dev-docs` | RB |
| `/comms` | COMM |
| Any DECISION item | DEC |
| Any session start | SESSION |

---

## The DB Schema (Project)

Core tables and their purpose:

| Table | Purpose | Key columns |
|-------|---------|------------|
| `project_info` | Singleton — project identity | `project_prefix`, `project_name`, `stage` |
| `entities` | All entities in this project | `entity_id`, `entity_type`, `title`, `status`, `source_file` |
| `entity_relationships` | Parent-child links | `parent_id`, `child_id`, `relationship_type` |
| `lineage_chains` | Denormalized full ancestry | `bi_id`, `bg_id`, `dg_id`, `epic_id`, `feat_id`, `req_id`, `task_id` |
| `kpi_measurements` | KPI time series | `kpi_id`, `measured_at`, `value`, `target`, `period` |
| `agent_runs` | Every skill invocation | `skill_name`, `started_at`, `status`, `entity_ids_created` |
| `audit_log` | Immutable change history | `entity_id`, `changed_field`, `old_value`, `new_value`, `changed_at` |
| `health_checks` | Health scores over time | `layer`, `score`, `orphan_count`, `open_bugs`, `checked_at` |
| `comms_items` | COMM entities | `comm_id`, `category`, `title`, `status` |
| `deployments` | DEP entities | `dep_id`, `version`, `environment`, `deployed_at`, `status` |
| `entity_sequences` | Atomic ID counters | `entity_type`, `year`, `last_seq` |
| `project_counters` | Project-scoped sequences (no year) | `counter_name`, `last_value` |

**Views** (pre-built queries):
- `v_active_bgs` — all ACTIVE BusinessGoals
- `v_task_pipeline` — all tasks with status, linked REQ and FEAT
- `v_orphaned_tasks` — tasks with no BG link
- `v_latest_kpi` — most recent measurement per KPI
- `v_open_comms` — all NEW/IN_PROGRESS COMM items
- `v_bg_delivery` — per-BG: epics, features, tasks done/total
- `v_open_bugs` — all open bugs with priority and linked entities
- `v_health_trend` — health scores over last 30 days
- `v_skill_performance` — agent_runs by skill with success rate

---

## Health Check System

`/bds` runs a 5-layer health check and produces a numeric score (0–100):

```
Layer 1: Foundations (25 pts)
  - CLAUDE.md exists and has project_prefix
  - FIRST-PRINCIPLES.md exists
  - BUSINESS-GOAL.md has active BGs
  - lineage_chains: orphan rate < 5%
  - .bds/bds.db exists and is queryable

Layer 2: Engineering (25 pts)
  - FEATURES.md has entries
  - QUEUE.md has tasks
  - No open P0/P1 bugs
  - All IN PROGRESS tasks have task prompts
  - Test coverage: TR(PASS) exists for recent TASKs

Layer 3: Operations (20 pts)
  - Latest DEP < 30 days ago
  - VR (verification report) for latest DEP
  - No open INC older than 48 hours
  - health_check_url returns 200

Layer 4: Business (20 pts)
  - All KPIs have measurements in last 30 days
  - No KPI AT RISK (< 80% of target)
  - COMMS.md has no BLOCKED items > 24 hours
  - strategy/ has analyses < 60 days old

Layer 5: Scale (10 pts)
  - /dev-arch-audit ran < 90 days ago
  - No CRITICAL architecture gaps
  - DECISIONS.md has entries for major changes
  - All agents in council are configured
```

Score thresholds:
- 90–100: ✅ HEALTHY
- 75–89: 🟡 AT RISK — action recommended
- 50–74: 🟠 DEGRADED — action required
- < 50: ❌ CRITICAL — stop, fix foundations first

---

## The Lineage Engine

Lineage is the audit trail from every engineering artifact back to the root business idea. It answers: "Why does this code exist?"

**How lineage chains are built:**

When a REQ is created:
```
REQ frontmatter has: feature: FEAT-ID, epic: EPIC-ID, dev_goal: DG-ID, business_goal: BG-ID
                          ↓
/bds-db entity insert → inserts into entity_relationships + upserts lineage_chains
```

When `/domain-lineage trace GEO-TASK-2026-0001` runs:
```sql
SELECT lc.*, e_bi.title as bi_title, e_bg.title as bg_title, ...
FROM lineage_chains lc
JOIN entities e_bi ON lc.bi_id = e_bi.entity_id
JOIN entities e_bg ON lc.bg_id = e_bg.entity_id
...
WHERE lc.task_id = 'GEO-TASK-2026-0001'
```

**Orphan detection:**
```sql
SELECT e.entity_id, e.entity_type, e.title
FROM entities e
LEFT JOIN entity_relationships er ON e.entity_id = er.child_id
WHERE er.child_id IS NULL
  AND e.entity_type IN ('TASK','REQ','DESIGN','FEAT','BUG')
```

Any entity in that result set is an orphan. Orphans count against Layer 1 health score.

---

## Failure Modes and Recovery

| Failure | Detection | Recovery |
|---------|-----------|---------|
| DB missing (fresh clone) | `sqlite3 .bds/bds.db` fails | Run `/bds-db init` then `/bds-db migrate` |
| DB corrupt | `SQLITE_NOTADB` or `SQLITE_CORRUPT` | Delete DB, run `/bds-db init`, `/bds-db migrate` — markdown is ground truth |
| High orphan rate | `/bds` Layer 1 score drops | Run `/domain-lineage audit`, then `/domain-lineage fix` for each orphan |
| Missing skills | `/dev` skill not found | Run `/bds-import update` to pull latest from global |
| Framework version behind | `bds.config.yaml` version < global | Run `/bds-keeper upgrade` |
| COMM items stale | Items > 7 days with no action | Surface in `/comms`; escalate BLOCKED to human |
| KPI miss > 20% | KPI status = MISS | L8 lineage: create COMM → council review → new REQ |
| No BG linked to task | Orphan TASK | Refuse to proceed; create parent entities first |

---

## The Autonomous Operation Contract

BDS is designed so that agents can run a business without day-to-day human involvement. This contract defines the boundary:

**Agents act autonomously when:**
- Writing and shipping code (within approved scope)
- Running health checks and surfacing issues
- Creating new REQ/DESIGN/TASK entities for approved goals
- Sending customer communications from approved templates
- Monitoring deployments and triggering rollbacks
- Updating documentation

**Agents STOP and create a COMMS DECISION item when:**
- Any action is irreversible (deletes, drops, force pushes)
- Cost would increase beyond approved budget
- A new paid service would be added
- Customer data would be affected
- A breaking API change is needed
- Any action requires legal or physical-world execution

**The SLA**: Human principal resolves BLOCKED and DECISION items within 24 hours. Agents do not sit idle — they work on unblocked items while waiting.
