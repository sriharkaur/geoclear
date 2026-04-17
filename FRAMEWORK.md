# Framework — Master Index

> One file to start from. Everything is connected and linked from here.
> The Business Delivery System (BDS): build real products, acquire real customers, generate real revenue, scale 1000x.
> Three frameworks — Dev, Strategy, Project Organization — unified under one operating system.

---

## Start Here

| I want to... | Run this | Read this |
|-------------|----------|-----------|
| **Full business health check** | `/bds` | [BDS.md](BDS.md) |
| Start a dev/engineering session | `/dev` | [DEV-FRAMEWORK.md](DEV-FRAMEWORK.md) |
| Start a strategy/business session | `/strategy` | [STRATEGY-FRAMEWORK.md](STRATEGY-FRAMEWORK.md) |
| Check launch readiness | `/bds launch` | [BDS.md](BDS.md) |
| Check scale readiness (10x/100x/1000x) | `/bds scale` | [BDS.md](BDS.md) |
| Set up project structure | `/project-init` | [PROJECT-GUIDE.md](PROJECT-GUIDE.md) |
| See all project state (features, pending, health) | `/dev-status` | — |
| Know which skill does what | — | [All Skills](#all-skills) below |

---

## The Business Delivery System

The BDS is the operating system for building a real, profitable, scalable company. It answers five questions continuously:

1. **Are we building the right thing?** — Strategy Framework
2. **Are we building it correctly?** — Dev Framework (engineering)
3. **Can it run without us?** — Dev Framework (operations/PRISM-10)
4. **Is it making money?** — Strategy Framework (unit economics)
5. **Can it grow 1000x?** — Dev Framework (architecture/scale)

**Entry point:** `/bds` — reads all layers, scores health, routes to the right action  
**Full guide:** [BDS.md](BDS.md)

---

## The Three Frameworks

### Dev Framework
> Build software right, the first time.

The Dev Framework covers the full engineering lifecycle: from capturing a raw requirement to verifying it's live and working in production. It enforces 10 gates — each gate must pass before the next starts.

Architecture is embedded as **PRISM-10** (10 dimensions: 6 WAF pillars + Frontend + Data + Application + Agentic AI). It runs proactively during design and reactively as an audit.

Every task includes a **First Time Right prompt** — a self-contained brief that gives Claude everything needed to execute correctly without back-and-forth.

**Entry point:** `/dev` → reads project state → routes to right skill  
**Full guide:** [DEV-FRAMEWORK.md](DEV-FRAMEWORK.md)

---

### Strategy Framework
> Build the business with McKinsey-level rigor.

The Strategy Framework covers business analysis from SWOT foundation through 90-day execution plan. Each skill reads your actual project for context — not generic templates.

All 10 analyses build on each other in a dependency order. The meta-orchestrator identifies what's missing and what's stale, and routes to the right skill.

**Entry point:** `/strategy` → reads strategy state → routes to right skill  
**Full guide:** [STRATEGY-FRAMEWORK.md](STRATEGY-FRAMEWORK.md)

---

### Project Organization
> Every file has a home. Nothing gets lost between sessions.

`/project-init` creates the standard Google/Meta/Anthropic directory structure for any project type. Every framework output (test reports, strategy sessions, architecture audits, designs, requirements) has a specific, dated location.

**Command:** `/project-init`  
**Full guide:** [PROJECT-GUIDE.md](PROJECT-GUIDE.md)

---

## How They Connect

```
                    FRAMEWORK.md  ← you are here
                        |
          ┌─────────────┴─────────────┐
          │                           │
    /dev ─┤ Dev Framework             │ /strategy ─ Strategy Framework
          │ [DEV-FRAMEWORK.md]        │             [STRATEGY-FRAMEWORK.md]
          │                           │
          │  10-gate pipeline:        │  10 analyses:
          │  REQ→DESIGN→PLAN          │  SWOT→value-prop→personas
          │  →ARCH→BUILD→TEST         │  →competitors→pricing
          │  →DOCS→COMMIT             │  →GTM→KPIs→90day
          │  →DEPLOY→VERIFY           │  →breakeven→pivot
          │                           │
          │  PRISM-10 Architecture    │  Saves to: strategy/
          │  (10 dimensions)          │
          │                           │
          └─────────────┬─────────────┘
                        │
               /project-init
               [PROJECT-GUIDE.md]
               Standard structure:
               src/ tests/ docs/ design/
               requirements/ architecture/
               reports/ sessions/ strategy/
```

**Handoffs between frameworks:**
- Strategy identifies new customer segment or pivot → `/dev-requirements` captures the product work
- Dev roadmap grows without strategic clarity → `/strategy` to run SWOT or 90-day plan
- Neither framework calls the other — they are peers that inform each other

---

## All Skills

### BDS Skills

| Skill | What it does |
|-------|-------------|
| `/bds-bootstrap` | **New project**: idea → strategy → engineering → Chief Architect charter → build → launch |
| `/bds-import` | **Manual import**: copies all BDS skills from global → project when auto-trigger didn't fire |
| `/bds-customize` | **The BDS Council**: Strategy Council (Musk/Zuckerberg/Pichai + CMO/CFO) debates business model; Engineering Council (Hölzle/Amodei/Cherny) debates architecture — decisions logged in `architecture/DECISION-LOG.md`, Project Architecture Charter written |
| `/bds` | **Existing project**: 5-layer health score, business stage assessment, routes to highest-priority action |
| `/bds launch` | Launch readiness: all technical + business + operational gates |
| `/bds scale` | Scale readiness: architecture assessed at 10x/100x/1000x load |
| `/bds economics` | Unit economics: CAC, LTV, gross margin, payback, burn multiple |
| `/dev-secrets` | **Secrets management**: .env setup, Render deploy via API, audit for leaks, rotation runbook |
| `/business-goal` | **North Star**: captures raw idea → refined by councils → maintained as the single shared goal for strategy + dev. Lives in `BUSINESS-GOAL.md`. |
| `/cpm` | **Chief Program Manager**: complete program view at any time — delivery, risks, decisions, economics, infra health. Active agent. Ask it anything. |
| `/observer` | **The Observer**: neutral witness — objective view of any meeting, decision, or drift. Rare tie-breaker. |
| `/comms` | **Communications Hub**: one file (`COMMS.md`) — numbered items, clickable links, your input + status. Every human action needed by any agent goes here. |
| `/experts` | **Domain Expert System**: pull in named industry experts (temporary or ongoing) when project needs deep domain coverage. Team decides, user is notified via COMMS.md. |
| `/bds-keeper` | **BDS System Keeper**: project-level BDS upkeep + pattern harvesting + global BDS change proposals (team consensus → COMMS.md → user approval → GitHub sync). |
| `/bds-ops` | **BDS Operations**: cost management, NemoClaw 4-tier model routing (NVIDIA free for all analysis/code, Opus only for councils), living agents on Ollama, cost dashboard. |

### Dev Skills

| Skill | What it does |
|-------|-------------|
| `/dev` | **Meta-Orchestrator** — reads project state, routes to right skill, saves session |
| `/dev-status` | Read-only project snapshot: features built, pending, health |
| `/dev-feature` | Full 10-gate pipeline for one feature (the full pipeline) |
| `/dev-requirements` | Capture user requirement → Principal PM + Distinguished PM + Chief Architect review → REQ-NNNN |
| `/dev-design` | Technical design from approved REQ → 13 sections + PRISM-10 review → DESIGN-NNNN |
| `/dev-plan` | Task breakdown from approved DESIGN → TASK-NNNNs with First Time Right prompts → QUEUE.md |
| `/dev-arch` | PRISM-10 Architecture review (full or single dimension) |
| `/dev-arch-audit` | Reactive architecture audit → gap analysis → ARCH-NNNN action items → QUEUE.md |
| `/dev-build` | Build phase: read-first, implement, smoke test |
| `/dev-test` | Test phase: 10 layers, auto-fix loop, bug registry |
| `/dev-docs` | Docs phase: FEATURES + ARCHITECTURE + RELEASES + QUEUE updated |
| `/dev-commit` | Commit phase: pre-commit checklist, staged files, HEREDOC message |
| `/dev-deploy` | Deploy phase: 3 protocols (standard / large files / DB migrations) |
| `/dev-verify` | Verify phase: health check + acceptance criteria verified + report |

### Architecture Sub-Skills (PRISM-10)

| Skill | Dimension | Key question |
|-------|-----------|-------------|
| `/dev-arch-ops-excellence` | Operational Excellence | Can you see, operate, and improve the system? |
| `/dev-arch-security` | Security | Is every trust boundary validated? |
| `/dev-arch-reliability` | Reliability | Does failure degrade gracefully? |
| `/dev-arch-performance` | Performance | Is every query indexed? No N+1? |
| `/dev-arch-cost` | Cost | Is every resource paying for itself? |
| `/dev-arch-sustainability` | Sustainability | Running only what's necessary? |
| `/dev-arch-frontend` | Frontend | Rendering strategy right? CWV budgeted? |
| `/dev-arch-data` | Data | Is data a product with lineage? |
| `/dev-arch-application` | Application | Business logic isolated from infra? |
| `/dev-arch-agentic` | Agentic AI | Agent bounds, security, cost governed? |

### Strategy Skills

| Skill | Question it answers |
|-------|-------------------|
| `/strategy` | **Meta-Orchestrator** — reads all strategy state, routes to right skill |
| `/strategy-swot` | What are our strengths, weaknesses, opportunities, threats? |
| `/strategy-value-prop` | Why do customers buy this? What's the core promise? |
| `/strategy-personas` | Who are our best customers? |
| `/strategy-competitors` | Who are we competing against? |
| `/strategy-pricing` | What should we charge? |
| `/strategy-gtm` | How do we reach and acquire customers? |
| `/strategy-kpis` | What metrics tell us if the strategy is working? |
| `/strategy-90day` | What are we executing this quarter? |
| `/strategy-breakeven` | How much revenue to break even? |
| `/strategy-pivot` | Is the current strategy still right? |

### Project Skills

| Skill | What it does |
|-------|-------------|
| `/project-init` | Create standard directory structure (idempotent, safe on existing projects) |

---

## Output Locations (all frameworks)

| What | Where | Who creates it |
|------|-------|---------------|
| Dev session plans | `sessions/` | `/dev` |
| Strategy sessions | `strategy/` | `/strategy` |
| Requirements | `requirements/` | `/dev-requirements` |
| Designs | `design/` | `/dev-design` |
| Task plans | `QUEUE.md` | `/dev-plan` |
| Architecture audits | `architecture/` | `/dev-arch-audit` |
| ADRs | `docs/adr/` | `/dev-arch` |
| Runbooks | `docs/runbooks/` | `/dev-docs` |
| Test reports | `reports/tests/` | `/dev-test` |
| Verification reports | `reports/verify/` | `/dev-verify` |
| DB migrations | `migrations/` | `/dev-plan` / `/dev-build` |

---

## Key Documents in This Project

| Document | Purpose |
|----------|---------|
| [FIRST-PRINCIPLES.md](FIRST-PRINCIPLES.md) | **The constitution** — non-negotiable rules for every agent and decision. Read first, every session. |
| [COMMS.md](COMMS.md) | **Communication hub** — numbered items needing human attention. Check at every session start. |
| [DECISIONS.md](DECISIONS.md) | **Master decision index** — every decision from every source, datetime-stamped, linked to original discussion. |
| [BUSINESS-GOAL.md](BUSINESS-GOAL.md) | **North star** — what we're building, for whom, and what winning looks like |
| [BDS.md](BDS.md) | Business Delivery System — the complete operating manual |
| [CLAUDE.md](CLAUDE.md) | Master orchestrator — project rules, stack, routing map |
| [FRAMEWORK.md](FRAMEWORK.md) | This file — master skill index |
| [DEV-FRAMEWORK.md](DEV-FRAMEWORK.md) | Dev framework user guide |
| [STRATEGY-FRAMEWORK.md](STRATEGY-FRAMEWORK.md) | Strategy framework user guide |
| [PROJECT-GUIDE.md](PROJECT-GUIDE.md) | Project structure guide |
| [FEATURES.md](FEATURES.md) | What is built (authoritative inventory) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Tech stack, endpoints, data model |
| [QUEUE.md](QUEUE.md) | Task execution state |
| [RELEASES.md](RELEASES.md) | Version history |
| [requirements/REQUIREMENTS-INDEX.md](requirements/REQUIREMENTS-INDEX.md) | All requirements |
| [design/DESIGN-INDEX.md](design/DESIGN-INDEX.md) | All designs |
| [architecture/ARCH-AUDIT-INDEX.md](architecture/ARCH-AUDIT-INDEX.md) | All architecture audits |
| [strategy/STRATEGY-INDEX.md](strategy/STRATEGY-INDEX.md) | All strategy analyses |

---

## Framework Principles

**Production is the only truth.** Demos, staging, local — none of it counts. A feature isn't done until it's running in production with real customers using it.

**First Time Right.** Catching a defect at requirements costs 1x. In production: 100x. Every gate exists to catch the right issues at the lowest cost.

**Profitability is a system property.** Unit economics (CAC, LTV, gross margin) are not finance department problems. They are product and engineering decisions made from day one.

**Scale must be designed, not retrofitted.** The architecture decisions made at 10 customers determine whether you can reach 10,000. The BDS bakes in 1000x thinking from the start.

**Transparency.** Every meta-orchestrator (`/bds`, `/dev`, `/strategy`) shows its reasoning before acting. You always know why a skill was chosen.

**No guessing.** Skills read actual project files. Context is current, not assumed.

**Dated outputs.** Every report, session, and analysis is saved with a datetime. Nothing is overwritten. History is always accessible.

**Idempotent.** Running any skill twice is safe. Skills detect existing work and don't duplicate it.

**No breaking changes.** Existing customers always keep working. Breaking changes require explicit user approval. See [FIRST-PRINCIPLES.md](FIRST-PRINCIPLES.md).

**No deletion without approval.** Data and code are never deleted unilaterally. Archive and soft-delete before hard delete. See [FIRST-PRINCIPLES.md](FIRST-PRINCIPLES.md).

**Escalate before acting on anything irreversible.** The cost of a COMMS.md entry is seconds. The cost of an unreviewed irreversible action can be customers and trust.
