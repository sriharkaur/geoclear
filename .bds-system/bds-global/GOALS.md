# BDS Global — North Star & Goals
> Business Delivery System — The Autonomous Business Operating System
> Project prefix: **BDS** | Initialized: 2026-04-15 | Stage: EARLY
> This document governs the BDS framework itself. The framework eats its own dog food.

---

## THE MISSION

Build the world's first autonomous business operating system that creates, operates, and scales profitable companies — requiring only physical-world interventions from a human principal.

**The human principal's role is limited to:**
- Signing legal and financial documents
- Providing payment instruments (credit cards, bank accounts)
- Physical-world logistics (shipping, hardware, infrastructure procurement)
- Final approval on irreversible decisions above defined thresholds

**Everything else is handled by the system:**
- Strategy, roadmap, prioritization
- Engineering, testing, deployment, monitoring
- Customer communications, onboarding, support escalation
- KPI tracking, business health monitoring, course correction
- Hiring (agents), task allocation, quality assurance

This is not an experiment. It is the operating model.

---

## BDS-BI-2026-0001 — Business Idea

```yaml
id: BDS-BI-2026-0001
raw_idea: >
  Build a global framework (BDS) that acts as an autonomous business operating
  system. It can bootstrap, run, and scale tens of thousands of profitable
  businesses, each managed by living AI agents. The human principal provides
  physical-world support only. The framework manages itself using itself.
date: 2026-04-15
status: ACTIVE
```

---

## BDS-VIS-2026-0001 — Vision

```yaml
id: BDS-VIS-2026-0001
statement: >
  By 2029, BDS Global operates 1,000 profitable, self-running businesses across
  diverse industries. Each business runs autonomously on BDS agents, generates
  positive unit economics, and requires fewer than 2 hours/week of human
  physical-world intervention per business. The human principal's portfolio
  generates $10M+ ARR from businesses they never have to manage day-to-day.
horizon_years: 3
business_idea: BDS-BI-2026-0001
approved_by: Founder
date: 2026-04-15
version: 1.0
```

---

## Business Goals (Q1–Q2 2026)

| ID | Goal | Metric | Target | Deadline | Status |
|----|------|--------|--------|----------|--------|
| BDS-BG-2026-0001 | Framework v1.0 fully operational | All 30 skills deployed, DB backbone live, all entities tracked | 100% skill coverage | 2026-05-01 | 🔲 |
| BDS-BG-2026-0002 | 5 projects onboarded and operating through BDS | 5 projects with .bds/bds.db, active entity tracking, and weekly /bds health checks | 5 projects | 2026-06-30 | 🔲 |
| BDS-BG-2026-0003 | First fully autonomous business generating revenue | 1 project at EARLY stage, >$1K MRR, with zero day-to-day human intervention in daily operations | $1K MRR autonomous | 2026-09-30 | 🔲 |
| BDS-BG-2026-0004 | BDS framework self-manages its own development | All BDS feature development tracked in BDS-GLOBAL-QUEUE.md, managed by BDS agents, closed-loop delivery | Framework v1.1 shipped via self-management | 2026-07-01 | 🔲 |

---

## Development Goals (Engineering — BDS Framework Itself)

```yaml
BDS-DG-2026-0001:
  title: Complete the entity + DB backbone
  business_goal: BDS-BG-2026-0001
  engineering_outcome: >
    All 30 entity types tracked atomically in project DBs with full lineage.
    /bds-db init, migrate, next-id, health all operational.
  success_metric: sqlite3 .bds/bds.db returns correct entity counts for any onboarded project
  target_date: 2026-05-01
  status: IN PROGRESS — 80% complete (2026-04-15)
  linked_epics: [BDS-EPIC-2026-0001]

BDS-DG-2026-0002:
  title: Agent-to-agent communication layer
  business_goal: BDS-BG-2026-0004
  engineering_outcome: >
    Agents can delegate tasks to each other via COMMS.md and the DB.
    A /cpm skill can read all projects' COMMS.md items in one unified view.
    Blocking items surface automatically without manual polling.
  success_metric: /cpm shows unified cross-project view with 0 missed blocking items
  target_date: 2026-06-01
  status: BACKLOG
  linked_epics: [BDS-EPIC-2026-0002]

BDS-DG-2026-0003:
  title: Physical-world task queue
  business_goal: BDS-BG-2026-0003
  engineering_outcome: >
    A dedicated queue for tasks only a human can complete (sign document,
    provide payment, purchase hardware). Displayed prominently at session
    start. Tracks completion. Blocks agents from proceeding until resolved.
  success_metric: Physical-world tasks never block agent work for >24h undetected
  target_date: 2026-06-15
  status: BACKLOG
  linked_epics: [BDS-EPIC-2026-0003]

BDS-DG-2026-0004:
  title: Multi-project health dashboard
  business_goal: BDS-BG-2026-0002
  engineering_outcome: >
    /bds-global command shows health scores for all registered projects,
    flags any project AT RISK or CRITICAL, and routes to the highest-leverage
    intervention. One command = full portfolio view.
  success_metric: All 5 onboarded projects' health visible in a single /bds-global run
  target_date: 2026-07-01
  status: BACKLOG
  linked_epics: [BDS-EPIC-2026-0004]

BDS-DG-2026-0005:
  title: Framework rollout pipeline
  business_goal: BDS-BG-2026-0004
  engineering_outcome: >
    When BDS framework version increments, all onboarded projects can run
    /bds-keeper upgrade to pull new skills, schema migrations, and config changes.
    Rollout is zero-downtime and reversible.
  success_metric: v1.0 → v1.1 upgrade completes on all 5 projects in <10 minutes each
  target_date: 2026-07-15
  status: BACKLOG
  linked_epics: [BDS-EPIC-2026-0005]
```

---

## Marketing / Adoption Goals

```yaml
BDS-MG-2026-0001:
  title: BDS onboarding time under 30 minutes
  business_goal: BDS-BG-2026-0002
  channel: direct (user-initiated onboarding)
  metric: time from /bds-import to first /bds health check passing
  target: <30 minutes for any new project
  timeline: 2026-06-01

BDS-MG-2026-0002:
  title: Zero-friction new project bootstrap
  business_goal: BDS-BG-2026-0002
  channel: auto-trigger on new directory
  metric: /bds-bootstrap completes with PHASE 0 through PHASE 2.5 without error
  target: 100% success rate on first run
  timeline: 2026-05-15
```

---

## Customer Growth Goals (Project Adoption)

```yaml
BDS-CGG-2026-0001:
  title: 5 projects actively using BDS by Q2 2026
  business_goal: BDS-BG-2026-0002
  aarrr_stage: ACTIVATION
  metric: projects with .bds/bds.db AND ≥1 /bds health check in last 14 days
  target: 5 active projects
  timeline: 2026-06-30

BDS-CGG-2026-0002:
  title: Each active project runs /bds every 2 weeks (cadence compliance)
  business_goal: BDS-BG-2026-0002
  aarrr_stage: RETENTION
  metric: days since last health_check per project (avg across portfolio)
  target: avg ≤14 days
  timeline: ongoing from 2026-07-01
```

---

## KPIs

| ID | KPI | Target | Period | Current | Status |
|----|-----|--------|--------|---------|--------|
| BDS-KPI-2026-0001 | Framework skill coverage | 100% skills deployed and tested | Monthly | 90% | 🟡 AT RISK |
| BDS-KPI-2026-0002 | Active projects on BDS | ≥5 by 2026-06-30 | Quarterly | 1 (GeoClear) | 🔲 |
| BDS-KPI-2026-0003 | Portfolio orphan rate | <5% entities without BG link | Weekly | TBD (first /bds-db migrate pending) | 🔲 |
| BDS-KPI-2026-0004 | Physical-world queue depth | <5 open items per project | Weekly | Unknown | 🔲 |
| BDS-KPI-2026-0005 | Time-to-first-revenue (new projects) | <90 days from bootstrap to first paying customer | Per project | GeoClear: 0 days (already live) | ✅ |
| BDS-KPI-2026-0006 | Framework upgrade adoption | 100% of projects on latest BDS version within 30 days of release | Per release | N/A — v1.0 just initialized | 🔲 |
| BDS-KPI-2026-0007 | Human intervention rate | <2 hrs/week/project for physical-world tasks | Weekly | Unknown — tracking not yet built | 🔲 |

---

## The Autonomous Operation Model

### How businesses run without daily human input

```
STRATEGY LAYER (runs quarterly)
  /strategy → council reviews KPIs → adjusts BG/DG if needed → updates COMMS.md
  Human: approves strategy shifts only (DECISION items in COMMS.md)

PLANNING LAYER (runs per sprint/2 weeks)
  /dev → reads QUEUE → resumes highest-priority task → builds → tests → deploys
  Human: approves any breaking change or deletion (DECISION items in COMMS.md)

OPERATIONS LAYER (runs continuously)
  /bds → health check → flags AT RISK or CRITICAL items → creates COMM items
  Human: any physical-world item in the COMM queue

ESCALATION PROTOCOL
  Agent cannot proceed → creates COMM item with BLOCKED status
  Human sees BLOCKED items at session start (surfaced by /comms)
  Human resolves physical-world blocker → agent resumes
  SLA: BLOCKED items resolved within 24 hours (human availability window)
```

### What "physical world" means

Tasks that require human presence or legal identity:
- Stripe KYC / identity verification
- Domain registration (credit card required)
- Render / AWS / GCP account creation (credit card required)
- Legal entity formation (LLC, contracts)
- Physical hardware procurement or setup
- Phone verification for accounts
- Any action requiring a wet signature

Tasks that are NOT physical world (agents handle these autonomously):
- Code writing, testing, deploying
- Customer email responses (from approved templates)
- Content creation, SEO
- Monitoring, alerting, incident response
- Strategy analysis, roadmap updates
- Database operations, data imports
- API integrations (once credentials are provided)

---

## Epics

| ID | Epic | Status | Parent DG |
|----|------|--------|-----------|
| BDS-EPIC-2026-0001 | DB Backbone & Entity Tracking | IN PROGRESS | BDS-DG-2026-0001 |
| BDS-EPIC-2026-0002 | Agent Communication Layer | BACKLOG | BDS-DG-2026-0002 |
| BDS-EPIC-2026-0003 | Physical-World Task Queue | BACKLOG | BDS-DG-2026-0003 |
| BDS-EPIC-2026-0004 | Multi-Project Dashboard | BACKLOG | BDS-DG-2026-0004 |
| BDS-EPIC-2026-0005 | Framework Upgrade Pipeline | BACKLOG | BDS-DG-2026-0005 |
| BDS-EPIC-2026-0006 | Autonomous Operation Hardening | BACKLOG | BDS-DG-2026-0003 |

---

## Open Items for Human Principal

Items requiring physical-world action (updated by agents, resolved by human):

| # | Item | Blocking | Priority |
|---|------|---------|----------|
| — | None currently — first onboarding in progress | — | — |

---

## Session History

| Date | What happened |
|------|--------------|
| 2026-04-15 | BDS Global initialized. DomainModel built (30 entity types, 8 lineage chains, 7-tier hierarchy). DB schemas (global + project) created. bds-global.db initialized (27 skills, 30 entity types). All pending tasks from previous session completed. BDS-GLOBAL-GOALS.md created (this document). |
