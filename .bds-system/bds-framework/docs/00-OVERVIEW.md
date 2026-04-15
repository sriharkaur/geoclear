# BDS Framework — Architecture Overview
> Audience: Living agents, system admins, project leads, human principal
> Read this before any other guide. It establishes the mental model everything else builds on.

---

## The Problem BDS Solves

Building a profitable business requires coordinating strategy, engineering, operations, and governance simultaneously. Without a system, this coordination collapses into chaos: orphaned features, missed KPIs, no lineage from code to business goal, agents rebuilding what already exists.

BDS is the coordination system. Every artifact has a typed ID. Every ID traces to a business goal. Every action is audited. Every health check is computable.

---

## Two Layers, One System

```
┌─────────────────────────────────────────────────────────────────┐
│  BDS GLOBAL (~/.claude/bds-global/)                             │
│  The control plane. Manages the framework itself.               │
│  Knows about all registered projects.                            │
│  Governs versioning, rollouts, and framework evolution.          │
│  Uses BDS to manage BDS. (dogfooding)                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ inherits / upgrades
┌──────────────────────────▼──────────────────────────────────────┐
│  BDS FRAMEWORK (~/.claude/bds-framework/)                       │
│  The SDK. Inherited by every project.                            │
│  Contains: all skills, domain model, DB schemas, config template │
│  Read-only to projects — projects copy FROM here, never write TO │
└──────────────────────────┬──────────────────────────────────────┘
                           │ /bds-import (Case B) or /bds-bootstrap (Phase 0)
┌──────────────────────────▼──────────────────────────────────────┐
│  PROJECT BDS ({project-root}/.bds/)                             │
│  The project instance. Fully independent of the framework.       │
│  Contains: bds.db (operational), bds.config.yaml (committed)    │
│  Skills live in {project-root}/.claude/skills/ (copied once)     │
│  The project NEVER connects back to the framework at runtime.    │
└─────────────────────────────────────────────────────────────────┘
```

**Critical design rule**: At runtime, a project is fully self-contained. There are no live dependencies on `~/.claude/`. The project copies skills and schemas once at bootstrap. Upgrades are explicit, not automatic.

---

## The 5 Subsystems

### 1. Skill System (30+ skills)
Agent skills are markdown files that Claude Code reads as instructions. Each skill is a named capability: `/dev-requirements`, `/bds`, `/strategy-swot`, etc. Skills invoke each other. Skills read and write to the project DB and markdown files.

```
Skills live at:  ~/.claude/skills/ (canonical)
                 {project}/.claude/skills/ (project copy — what runs)
                 {project}/.claude/commands/ (aliases — what you invoke)
```

### 2. Domain Model (30 entity types, 7 tiers)
Every artifact in a project — from a business idea to a bug fix — is a typed entity with a prefixed ID. The 7-tier hierarchy: Business → Strategy → Planning → Engineering → Quality → Operations → Governance.

Entity IDs are atomic: always assigned via `/bds-db next-id {TYPE}`. Never hand-sequenced. Never reused.

### 3. Database Backbone (2 SQLite databases)

| DB | Location | Owner | Purpose |
|----|----------|-------|---------|
| Global | `~/.claude/bds-global.db` | BDS Global | Framework registry: skills, entity types, lineage chains, quality gates, registered projects |
| Project | `{project}/.bds/bds.db` | Project | Operational: all entities, KPIs, lineage, audit log, health checks, COMM items |

The two DBs have no runtime connection. The global DB is read for framework reference. The project DB is where all live operational data lives.

### 4. Lineage Engine (8 chains)
Every engineering artifact traces back to a business goal. The 8 lineage chains define the valid paths:
- L1: Primary Delivery (BI→VIS→BG→DG→EPIC→FEAT→REQ→DESIGN→TASK→code→TC→TR)
- L2: Marketing Execution (BG→MG→STRAT→FEAT→REQ→TASK)
- L3: Customer Growth (BG→CGG→PER→FEAT→REQ→TASK)
- L4: Bug Fix (BUG→REQ→TASK→TR)
- L5: Deployment/Operations (TASK→DEP→VR→INC→RB)
- L6: Architecture Decision (REQ→AD→DEC)
- L7: Strategy-to-Requirements (STRAT→BG→DG→EPIC→REQ)
- L8: KPI Feedback (KPI miss → COMM → BG review → new REQ)

Orphan = entity with no parent link. Orphan rate > 5% = AT RISK. > 10% = CRITICAL.

### 5. Council System (agent roles)
Each project has a council of named agents. Agent roles are not AI models — they are _perspectives_ that Claude Code adopts when running a skill. The council is configured in `.bds/bds.config.yaml` and reflected in `CLAUDE.md`.

| Always active | Stage-gated | Type-gated |
|---------------|-------------|------------|
| Principal PM | Strategy Council (PRE_LAUNCH) | Security Agent (API_SERVICE) |
| Principal Architect | Growth Agent (EARLY+) | Data Architect (DATA_PRODUCT) |
| Principal TPM | CPM (GROWTH+) | Frontend Architect (SAAS_WEB_APP) |
| Chief Architect | Observer (SCALE+) | Agentic Architect (AI_AGENT_PRODUCT) |

---

## Lifecycle of a Business (BDS view)

```
User provides: business idea (text)
       ↓
/bds-bootstrap Phase 0   → Skills imported, prefix assigned, DB initialized
/bds-bootstrap Phase 1   → BusinessIdea entity (BI) created, intake analysis
/bds-bootstrap Phase 2   → Strategy Brief (6 analyses run by council)
/bds-bootstrap Phase 2.5 → Goal decomposition: VIS, BG, MG, DG, CGG, KPI, EPIC
/bds-bootstrap Phase 3   → Engineering plan: ARCH, stack, first features
/bds-bootstrap Phase 4   → Build loop: REQ → DESIGN → PLAN → BUILD → TEST → DEPLOY
/bds-bootstrap Phase 5   → Launch verification, smoke tests, VR entities
       ↓
Ongoing: /dev (engineering) | /strategy (business) | /bds (health check every 2 weeks)
       ↓
KPI feedback: miss → COMM → council review → new REQ or revised BG → L8 lineage chain
       ↓
Scale: /bds-keeper upgrade (get new framework version) | /bds scale (scale readiness check)
```

---

## Entity ID Convention

```
Format:  {PREFIX}-{TYPE}-{YYYY}-{NNNN}
Example: GEO-REQ-2026-0042

PREFIX  = 3-letter project code (GEO, FIN, MED, ...)
TYPE    = entity type (BI, VIS, BG, REQ, TASK, BUG, ...)
YYYY    = year (year-scoped types) or empty (project-scoped types)
NNNN    = zero-padded 4-digit sequence

Project-scoped (no year): COMM, DEC, AD
  Example: GEO-COMM-0001

Timestamp-scoped (quality + ops): TR, DEP, VR, INC, SESSION
  Example: GEO-TR-2026-04-15-14-30-00
```

**How to get the next ID**:
```bash
sqlite3 .bds/bds.db "
  INSERT INTO entity_sequences (entity_type, year, last_seq)
  VALUES ('REQ', strftime('%Y','now'), 0)
  ON CONFLICT(entity_type, year) DO UPDATE SET last_seq = last_seq + 1
  RETURNING printf('%s-REQ-%s-%04d',
    (SELECT project_prefix FROM project_info), strftime('%Y','now'), last_seq);
"
```

Never hand-sequence. Never reuse a retired ID.

---

## File Ownership Map

| File/Dir | Committed to git? | Modified by | Notes |
|----------|------------------|-------------|-------|
| `.bds/bds.config.yaml` | YES | `/bds-db init`, manual | Framework contract |
| `.bds/bds.db` | NO | All BDS skills | Operational DB, rebuilt from markdown on fresh clone |
| `.claude/skills/*.md` | YES (project copy) | `/bds-import update` | Copied once; updated by `/bds-keeper upgrade` |
| `CLAUDE.md` | YES | `/bds-bootstrap`, user | Project rules + BDS routing |
| `BUSINESS-GOAL.md` | YES | `/business-goal`, `/bds-bootstrap` | North star |
| `COMMS.md` | YES | All skills | Human ↔ agent communications |
| `QUEUE.md` | YES | `/dev-plan` | Task execution state |
| `FEATURES.md` | YES | `/dev-feature`, `/dev-build` | Canonical feature inventory |
| `strategy/GOALS-*.md` | YES | `/bds-bootstrap` Phase 2.5 | Goal decomposition outputs |
| `planning/EPICS.md` | YES | `/bds-bootstrap` Phase 2.5 | Epic inventory |
| `~/.claude/skills/*.md` | global only | BDS Global | Canonical skill source (not in project git) |
| `~/.claude/bds-global.db` | global only | BDS agents | Framework registry |
