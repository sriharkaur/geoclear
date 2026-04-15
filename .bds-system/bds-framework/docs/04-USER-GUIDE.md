# BDS Framework — User Guide
> Audience: Anyone using BDS day-to-day — human principal, living agents, project leads
> Covers: daily workflow, all entry points, reading outputs, task creation, health monitoring

---

## The 3-Command Mental Model

Almost everything routes through three commands:

```
/dev         → I want to build or fix something
/strategy    → I want to make a business decision
/bds         → I don't know where to start / health check
```

These are meta-orchestrators. They read all project state and route you to the right skill. Start here. Let the system route you.

---

## Daily Workflow

### Starting a Session

1. Open Claude Code in the project directory
2. The system auto-reads `CLAUDE.md`, `COMMS.md`, `DECISIONS.md` at session start
3. Any 🆕 NEW or ⏳ IN PROGRESS COMMS items are surfaced immediately
   - **Physical-world tasks** are shown first (these need your action)
   - Then BLOCKED items (agents waiting on something)
   - Then DECISION items (need your approval)
   - Then FYI items (informational)
4. Say `start session` or `what's next` → `/dev` runs automatically

### Continuing Interrupted Work

```
/dev
```
`/dev` reads `QUEUE.md` and finds the first ⏳ IN PROGRESS item. It resumes from exactly where the last session stopped. You don't need to remember where you were.

### Starting New Engineering Work

```
I want to add [feature description]
```
`/dev` routes to `/dev-requirements`. This starts the 10-gate pipeline: REQ → DESIGN → PLAN → BUILD → TEST → DOCS → COMMIT → DEPLOY → VERIFY.

---

## Key Commands Reference

### Session Entry Points

| Command | When to use | What it does |
|---------|-------------|-------------|
| `/dev` | Engineering work | Reads QUEUE, routes to highest-leverage gate |
| `/strategy` | Business decisions | Reads strategy state, routes to right analysis |
| `/bds` | Health check / lost | 5-layer score, routes to highest leverage |
| `/comms` | Check inbox | Shows all open COMM items needing attention |
| `/business-goal` | North star check | Current goals, objectives, KPIs |
| `/cpm` | Program status | Full view: delivery, risks, decisions, economics |

### Engineering Pipeline

```
Gate 1:  /dev-requirements   — write and review the requirement
Gate 2:  /dev-design         — design document with 9-dim architecture review
Gate 3:  /dev-plan           — break into tasks; write QUEUE.md entries
Gate 4:  /dev-arch-audit     — PRISM-10 architecture review
Gate 5:  /dev-build          — execute tasks from QUEUE.md prompts
Gate 6:  /dev-test           — test cases, test results, bug tracking
Gate 7:  /dev-docs           — update API docs, runbooks, ADRs
Gate 8:  /dev-commit         — commit with docs in the same commit
Gate 9:  /dev-deploy         — deploy to environment
Gate 10: /dev-verify         — smoke test, verification report
```

Never skip gates for multi-file features. Single-file fixes can go directly to build.

### Strategy Skills

| Command | Produces |
|---------|---------|
| `/strategy-swot` | SWOT analysis (STRAT entity) |
| `/strategy-value-prop` | Value proposition + differentiation |
| `/strategy-personas` | 2–3 customer personas (PER entities) |
| `/strategy-competitors` | Competitor analysis |
| `/strategy-pricing` | Pricing tiers (TIER entities) |
| `/strategy-breakeven` | Break-even analysis |
| `/strategy-gtm` | Go-to-market plan |
| `/strategy-kpis` | KPI dashboard (KPI entities) |
| `/strategy-90day` | 30-60-90 day execution plan |
| `/strategy-pivot` | Evidence-based pivot analysis |

### BDS Management

| Command | When to use |
|---------|-------------|
| `/bds` | Every 2 weeks (health check cadence) |
| `/bds-import` | Onboarding an existing project |
| `/bds-keeper` | Framework version check / upgrade |
| `/bds-ops` | Cost tracking, agent run metrics |
| `/domain-lineage audit` | Find orphaned entities |
| `/domain-lineage trace {ID}` | Full ancestry of any entity |
| `/domain-lineage kpi {KPI-ID}` | Which features are supposed to move this KPI |

---

## Reading COMMS.md

`COMMS.md` is the agent ↔ human communication channel. Every item has:
- **Category**: DECISION (needs approval) | BLOCKED (agent waiting) | REVIEW (human review needed) | FYI (informational) | PHYSICAL (human physical action) | GAP (missing framework element) | FEEDBACK (improvement suggestion)
- **Status**: 🆕 NEW | ⏳ IN PROGRESS | ✅ DONE | 🚫 CANCELLED
- **ID**: `{PREFIX}-COMM-{NNNN}`

**How to respond:**
- DECISION items → say "approved" or "rejected: [reason]"; agent resumes
- BLOCKED items → resolve the blocker; tell the agent what changed
- PHYSICAL items → take the action; mark DONE in COMMS.md
- REVIEW items → read the linked artifact; say "looks good" or provide corrections

**The physical-world queue** (PHYSICAL category items) is your primary touch point with the autonomous system. These are the only things that require your presence. Target: resolve within 24 hours.

---

## Reading QUEUE.md

`QUEUE.md` tracks all task execution state. Format:

```markdown
### Feature Name  [REQ-{ID}] [DESIGN-{ID}] [FEAT-{ID}] [BG-{ID}]

🔲 GEO-TASK-2026-0001  [code]  Build the endpoint
  > TASK PROMPT — everything the agent needs to execute this correctly

⏳ GEO-TASK-2026-0002  [test]  Write integration tests
  > TASK PROMPT ...

✅ GEO-TASK-2026-0003  [docs]  Update API docs
```

Status codes:
- 🔲 not started
- ⏳ in progress
- ✅ done
- 🚫 blocked (see COMMS.md for blocker)

The `[BG-{ID}]` tag in the header is the lineage link — this section of work traces to that business goal.

---

## Understanding Health Scores

When `/bds` runs, it shows:

```
=== BDS HEALTH CHECK ===
Date: 2026-04-15 14:30

SCORE: 87/100  🟡 AT RISK

Layer 1: Foundations    24/25   ✅
Layer 2: Engineering    20/25   ✅
Layer 3: Operations     18/20   ✅
Layer 4: Business       15/20   ⚠️  2 KPIs not measured in 30 days
Layer 5: Scale           8/10   ✅

RECOMMENDED ACTION (highest leverage):
  Measure KPIs: GEO-KPI-2026-0002 (API error rate), GEO-KPI-2026-0003 (p95 latency)
  Run: /strategy-kpis to update measurements
  Expected score after fix: 93/100 ✅ HEALTHY
```

The system always tells you the single highest-leverage action. Do that first.

---

## Creating Requirements the Right Way

```
I need to build: [description]
```

`/dev-requirements` runs. Before writing any requirement, it:
1. Checks if this already exists in `FEATURES.md`
2. Assigns the next `{PREFIX}-REQ-{YYYY}-{NNNN}` via `/bds-db next-id REQ`
3. **Requires lineage linkage** — asks which Feature, Epic, and Business Goal this serves
4. If the parent entities don't exist, creates them first
5. Shows you the lineage tag: `[LINEAGE] GEO-BG-2026-0001 › GEO-DG-2026-0001 › GEO-EPIC-2026-0002 › GEO-FEAT-2026-0008 › GEO-REQ-2026-0015 (new)`
6. Runs Principal PM review (10 questions about user pain, measurability, scope)
7. Runs Distinguished PM counter-review
8. Waits for your approval before writing the REQ file

**Never write a requirement without a business goal link.** An orphaned REQ is technical debt before the code is written.

---

## Tracking KPIs

```
/strategy-kpis
```

To add a new KPI measurement:
```
/strategy-kpis measure GEO-KPI-2026-0001 value=4200 period=weekly
```

The system:
1. Inserts into `kpi_measurements` table
2. Computes health: ON_TRACK (≥ 80% of target) | AT_RISK (50–79%) | MISS (< 50%)
3. If MISS: automatically creates a COMM item with L8 lineage chain (KPI feedback loop)
4. If AT_RISK: creates a COMM item recommending review

The KPI feedback loop (L8) is automatic. You don't need to manually trigger it.

---

## Reviewing Architecture

```
/dev-arch-audit
```

Runs all 10 PRISM-10 dimensions:
1. Security — OWASP, auth, encryption, secrets
2. Reliability — timeouts, fallbacks, health checks
3. Performance — latency, throughput, bottlenecks
4. Cost — infrastructure spend, optimization opportunities
5. Operations Excellence — deployment, rollback, runbooks
6. Data Architecture — schema, migrations, data quality
7. Application Design — modularity, dependencies, patterns
8. Frontend Architecture — if applicable
9. Agentic AI — if applicable
10. Sustainability — tech debt, maintainability

Each dimension produces a score (0–100) and a prioritized action list. Gaps ≥ CRITICAL block deployment.

---

## Shorthand Commands

| You say | System does |
|---------|------------|
| `start session` / `what's next` | `/dev` — reads all state, decides next action |
| `what needs my attention` | `/comms` — all open COMMS items |
| `where are we` / `program status` | `/cpm` — full program view |
| `north star` / `what are we building` | `/business-goal` |
| `health check` | `/bds` |
| `architecture audit` | `/dev-arch-audit` |
| `strategy session` | `/strategy` |
| `add endpoint for X` | `/dev-requirements` pre-filled |
| `check stripe` / `check keys` | reads relevant source files |
| `deploy` | walks through QUEUE.md deployment steps |
| `smoke test` | runs health check curl |
