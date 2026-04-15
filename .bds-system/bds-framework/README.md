# Business Delivery System (BDS) — Framework Reference
> Version: 1.0 | Released: 2026-04-15
> The autonomous business operating system. Built once, inherited by every project.

---

## What Is BDS?

BDS is a complete operating system for building profitable, self-running businesses. It provides:
- A **skill system** (30+ AI agent skills covering strategy → engineering → operations)
- A **domain model** (30 entity types with full lineage from idea to delivery)
- A **database backbone** (per-project SQLite DB for entity tracking, KPIs, audit, health)
- A **governance layer** (councils, observers, communications hub, feedback loop)
- An **autonomous operation model** (agents handle everything; human handles physical world only)

Every project that inherits BDS gets the full system. The framework is customized per project, not rebuilt per project.

---

## Documentation Index

| Guide | Audience | Start here if... |
|-------|----------|-----------------|
| [SETUP-GUIDE.md](docs/SETUP-GUIDE.md) | Any — new project, existing project | Setting up BDS for the first time |
| [SYSTEM-GUIDE.md](docs/SYSTEM-GUIDE.md) | Living agents, system admins | Understanding how BDS works end-to-end |
| [DATABASE-GUIDE.md](docs/DATABASE-GUIDE.md) | DB admins, agents writing to DB | Working with `.bds/bds.db` or `bds-global.db` |
| [USER-GUIDE.md](docs/USER-GUIDE.md) | Anyone using BDS daily | Day-to-day commands, workflows, health checks |
| [CUSTOMIZATION-GUIDE.md](docs/CUSTOMIZATION-GUIDE.md) | Project agents, system admins | Adapting BDS config and thresholds for your project |
| [FEEDBACK-GUIDE.md](docs/FEEDBACK-GUIDE.md) | Any living agent | Submitting improvements back to BDS Global |

---

## Framework Components

```
~/.claude/
├── bds-framework/              ← YOU ARE HERE — inherited by all projects
│   ├── README.md               ← this file
│   ├── docs/                   ← all documentation guides
│   ├── skills/ → ~/.claude/skills/     ← all 30+ skills
│   └── DomainModel/ → ~/.claude/DomainModel/  ← entity model + DB schemas
│
├── bds-global/                 ← BDS managing itself (see bds-global/README.md)
│
├── skills/                     ← canonical skill files (source of truth)
└── DomainModel/                ← domain model + DB schemas (source of truth)
```

---

## Quick Start

**New project** (no existing code):
```
/bds-bootstrap "Your business idea here"
```

**Existing project** (has code, no BDS):
```
/bds-import
```
Then follow Case B steps B.1–B.8 in the setup guide.

**Already have BDS, starting a session**:
```
/dev          ← for engineering work
/strategy     ← for business decisions
/bds          ← for health check / don't know where to start
```

---

## The 7-Tier Entity Model (at a glance)

```
Tier 1: Business      BI → VIS → BG → MG / DG / CGG
Tier 2: Strategy      STRAT, PER, COMP, KPI, TIER
Tier 3: Planning      EPIC → FEAT → REQ → DESIGN, AD
Tier 4: Engineering   TASK, EP, DM, MIG
Tier 5: Quality       TC → TR, BUG
Tier 6: Operations    DEP, VR, INC, RB
Tier 7: Governance    DEC, COMM, SESSION
```

Every entity has a prefixed ID: `{PROJECT-PREFIX}-{TYPE}-{YYYY}-{NNNN}`
Example: `GEO-REQ-2026-0001` (GeoClear, Requirement, 2026, sequence 1)

Every task traces back to a business goal. No orphans allowed.

---

## The Human Principal Contract

Agents handle: strategy, engineering, testing, deployment, monitoring, communications, course correction.

**Human handles only:**
- Signing legal/financial documents
- Providing payment instruments
- Physical hardware or infrastructure procurement
- Final approval on irreversible decisions (surfaced via COMMS.md DECISION items)

Everything else is agent territory.
