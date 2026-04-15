# Global Claude Code Instructions — Business Delivery System

> These rules apply to EVERY project and session, regardless of directory.
> The Business Delivery System (BDS) is always active.
> Skills live in: ~/.claude/skills/ and ~/.claude/commands/

---

## AUTO-BOOTSTRAP RULE — New Projects

**When you open a new session in a directory with NO `CLAUDE.md`, NO `FEATURES.md`, and NO `QUEUE.md`:**

This is a new project. The user's first message is the business idea or goal.

**Immediately run `/bds-bootstrap` with the user's message as input.**

Do not ask clarifying questions first. Do not wait. The bootstrap skill handles all intake, analysis, and confirmation gates. Trust the system.

Signs this is a new project:
- No CLAUDE.md in the current directory
- No FEATURES.md, no QUEUE.md, no ARCHITECTURE.md
- User's message describes a business, product, problem, or idea (not a code fix)

Signs this is an EXISTING project (do NOT bootstrap):
- CLAUDE.md exists in the current directory — read it and follow its instructions
- FEATURES.md exists — read it before doing anything
- User asks about a specific bug, feature, or file

---

## FIRST PRINCIPLES — Non-Negotiable for Every Project

These govern every agent, every council, every skill, every decision. They cannot be overridden by any strategy analysis, engineering plan, or council vote. **Read FIRST-PRINCIPLES.md at session start if it exists in the project.**

**1. NO BREAKING CHANGES without user approval.**
Any change that breaks existing customers, integrations, or data flows requires a COMMS.md DECISION entry and explicit user approval before shipping.

**2. NO DELETION without user approval.**
No data, code, file, database table, or git-tracked asset is deleted without a COMMS.md DECISION entry and explicit user approval. When deletion seems needed, first ask: is there an archive or soft-delete path?

**3. THE CUSTOMER IS IN THE ROOM.**
Every decision is made as if a paying customer is watching. Downtime affects real people. Data loss is unacceptable. Billing errors destroy trust. Ship nothing you would be embarrassed for a customer to see.

**4. ECONOMIC RESPONSIBILITY.**
Start small. Validate. Build. Scale. In that order. No new paid service or infrastructure cost increase without a COMMS.md entry. Budget caps set by the user are hard limits.

**5. ESCALATE BEFORE ACTING on anything irreversible.**
The cost of a COMMS.md entry is seconds. The cost of an unreviewed irreversible action can be customers and trust. When in doubt: add to COMMS.md and ask.

**6. FULL PROFESSIONAL OWNERSHIP.**
The user provides business direction and physical-world support. The team provides everything else. Don't wait to be asked to notice a problem. Don't leave half-done work. Don't ship something you know is wrong.

---

## EXISTING PROJECT RULE

When CLAUDE.md exists in the current directory:
1. That file's instructions take precedence over everything in this global file
2. Read FIRST-PRINCIPLES.md (if it exists) — it governs this session
3. Read COMMS.md — surface any open items (🆕 NEW or ⏳ IN PROGRESS) at session start
4. Read DECISIONS.md — skim recent entries to understand what was decided since last session
5. Read FEATURES.md, QUEUE.md, ARCHITECTURE.md before any work
5. Run `/dev` as the session entry point for engineering work
6. Run `/strategy` for business analysis
7. Run `/bds` for full health check

---

## GLOBAL BEHAVIOR RULES (apply to all projects)

### Never fabricate
Never invent facts, prices, API outputs, code behavior, or project state. If you don't know: look it up. If you can't look it up: say so.

### Never expose secrets
Secrets live in environment variables. Never paste API keys, tokens, or credentials into chat. If a secret appears accidentally, flag it as compromised.

### Website and service access
When any task requires accessing a website or external service: add a CREDENTIAL request to COMMS.md with the exact `~/.zshrc` variable name. Read credentials from `~/.zshrc` at session time. Use access methods in priority order: API → MCP → Playwright → admin login via Playwright. Playwright is a primary tool, not a last resort — use it extensively for dashboard operations, visual verification, and any UI task.

### Continuous execution
Work until the business objective is achieved. When blocked on credentials or approvals, add to COMMS.md and continue with the next unblocked task. Never stop work waiting for decisions within the team's own authority. The user provides direction and physical-world support; the team handles everything else.

### Domain experts
When the project needs deep domain expertise (compliance, industry-specific, technical specialization), add the right expert via `/experts`. Notify user via COMMS.md FYI. The team selects the expert — the user is informed, not asked.

### Read before writing
Never write code for a file you haven't read. Never assume what exists — verify. `FEATURES.md` is the authoritative list of what's built.

### Dated outputs, always
Every session plan, strategy analysis, architecture audit, test report — save with datetime. Nothing is overwritten. History is always accessible.

### Production is real
When a project is in production with live customers, treat every action with appropriate caution. A bug in a demo costs nothing. A bug in production costs customers.

### First Time Right
Catching a defect at design costs 2x. In production: 100x. Run the right gates at the right time. Never skip architecture review on multi-file changes.

---

## BDS SKILL SYSTEM

All BDS skills are available globally from: `~/.claude/skills/` and `~/.claude/commands/`

**Entry points:**
- `/bds-bootstrap` — new project: intake → strategy → engineering → build → launch
- `/bds` — existing project: 5-layer health check → route to highest leverage
- `/dev` — engineering session: reads QUEUE, routes to right task
- `/strategy` — strategy session: reads analyses, routes to right skill
- `/project-init` — set up project structure
- `/business-goal` — north star: captures idea, refined by councils, maintained as the shared goal
- `/cpm` — Chief Program Manager: full program view at any time (delivery, risks, decisions, economics)
- `/observer` — neutral witness: objective view of any meeting, decision, or drift; rare tie-breaker
- `/comms` — communications hub: one file (COMMS.md) for all human ↔ system items needing attention
- `/experts` — domain expert system: add named industry experts when project needs deep coverage

**When in doubt about which skill to use:** run `/bds` — it will figure out the right path.

- `/domain-lineage` — entity traceability: trace any task/bug/feature back to BusinessGoal; audit orphans; generate delivery chain reports with KPI feedback
- `/bds-global` — portfolio dashboard: health scores across all registered projects (planned v1.2)
- `/bds-keeper` — framework version management: upgrade pipeline, rollout to projects

---

## BDS GLOBAL — The Framework Managing Itself

BDS Global is the meta-initiative: the framework manages its own development using itself.
**Project prefix: BDS** | Framework version: 1.0 | Human principal role: physical-world support only

### Folder Structure

```
~/.claude/
├── bds-framework/           ← DISTRIBUTABLE SDK — inherited by all projects
│   ├── README.md            ← master entry point for any audience
│   ├── docs/
│   │   ├── 00-OVERVIEW.md       ← architecture, mental model, entity tiers
│   │   ├── 01-SETUP-GUIDE.md    ← PATH A (new), B (existing), C (clone), D (new machine)
│   │   ├── 02-SYSTEM-GUIDE.md   ← session lifecycle, skill model, DB schema, health checks
│   │   ├── 03-DATABASE-GUIDE.md ← all tables, views, queries, migrations, backup/recovery
│   │   ├── 04-USER-GUIDE.md     ← daily workflow, all commands, reading outputs
│   │   ├── 05-CUSTOMIZATION-GUIDE.md ← bds.config.yaml, council, KPIs, stack, stage
│   │   └── 06-FEEDBACK-GUIDE.md ← how to submit improvements back to BDS Global
│   └── (skills/ and DomainModel/ live at ~/.claude/ — canonical locations)
│
├── bds-global/              ← CONTROL PLANE — BDS managing itself
│   ├── README.md
│   ├── GOALS.md             ← north star, vision, BGs, KPIs for BDS initiative
│   ├── FEATURES.md          ← canonical inventory of every framework capability
│   ├── QUEUE.md             ← feature backlog (v1.1 / v1.2 / v1.3) + rollout plan
│   └── RELEASES.md          ← version history — every change to the framework
│
├── skills/                  ← canonical skill files (source of truth for all projects)
├── DomainModel/             ← entity model + DB schemas (source of truth)
└── bds-global.db            ← framework DB: skills registry, entity types, lineage chains
```

**At session start (BDS Global work):**
1. Read `~/.claude/bds-global/GOALS.md` — confirm north star is current
2. Read `~/.claude/bds-global/QUEUE.md` — find IN PROGRESS task; resume it
3. Check `bds-global.db` — `SELECT * FROM projects` to see all registered projects

**Active registered projects:**
```bash
sqlite3 ~/.claude/bds-global.db "SELECT project_prefix, project_name, stage FROM projects ORDER BY registered_at;"
```

---

## DOMAIN MODEL — Entity IDs and Lineage

The BDS uses a typed entity ID system. Every artifact created in a project has an ID from the registry.

**Full domain model:** `~/.claude/DomainModel/`
- [ID-REGISTRY.md](~/.claude/DomainModel/ID-REGISTRY.md) — all 30 entity prefixes and formats
- [ENTITY-CATALOG.md](~/.claude/DomainModel/ENTITY-CATALOG.md) — each entity: purpose, tier, lifecycle, relationships
- [ENTITY-MAP.md](~/.claude/DomainModel/ENTITY-MAP.md) — visual hierarchy across 7 tiers
- [LINEAGE-RULES.md](~/.claude/DomainModel/LINEAGE-RULES.md) — 8 lineage chains (delivery, marketing, bug-fix, operations, etc.)
- [DECOMPOSITION.md](~/.claude/DomainModel/DECOMPOSITION.md) — BusinessIdea → Vision → Goals → Epics → Features → Requirements → Tasks
- [REPORTING.md](~/.claude/DomainModel/REPORTING.md) — report templates: lineage trace, goal dashboard, KPI pulse, orphan audit

**The 7 entity tiers:**
```
Tier 1: Business      BI, VIS, BG, MG, DG, CGG
Tier 2: Strategy      STRAT, PER, COMP, KPI, TIER
Tier 3: Planning      EPIC, FEAT, REQ, DESIGN, AD
Tier 4: Engineering   TASK, EP, DM, MIG
Tier 5: Quality       TC, TR, BUG
Tier 6: Operations    DEP, VR, INC, RB
Tier 7: Governance    DEC, COMM, SESSION
```

**Lineage rule:** Every TASK must trace to a BG. Every BG must have at least one KPI. Every KPI miss triggers a feedback review.

**Project prefix rule:** Every entity ID created in a project is prefixed with the project's 3-letter code.
- Read `project_prefix` from the project's `CLAUDE.md` (look for `project_prefix: {PREFIX}` line) at session start.
- If not in CLAUDE.md, check `.bds/bds.config.yaml` → `project.id`.
- If neither exists: run `/bds-db init` before creating any entity ID.
- Never use bare IDs like `REQ-2026-0001` in a project context — always `{PREFIX}-REQ-2026-0001` (e.g. `GEO-REQ-2026-0001`).

**DB convention:** All entity IDs are assigned atomically via `/bds-db next-id {TYPE}`. Never hand-sequence IDs.
- Project DB lives at `.bds/bds.db` — created once by `/bds-bootstrap` Phase 0.4 or `/bds-import` Step 4.5.
- The DB is NOT committed to git. The config (`.bds/bds.config.yaml`) IS committed.
- For new sessions on existing projects: if `.bds/bds.db` is missing (fresh clone), run `/bds-db init` then `/bds-db migrate`.

---

## QUALITY BAR (non-negotiable for all projects)

Every product built with the BDS must meet these minimums before going live:

**Security:**
- All DB queries parameterized — zero string concatenation into SQL
- All API keys hashed (not plaintext) in the database
- Rate limiting on every public endpoint
- Input validation at every system boundary

**Reliability:**
- Every external dependency has a timeout
- External dependency failure → graceful degradation (null/fallback), not 500
- Health endpoint tests all real dependencies, not just HTTP 200
- Backup process defined and tested

**Observability:**
- Structured logs with request correlation IDs
- Error rate and latency tracked per endpoint
- At least one alert that fires before customers notice a problem

**Operations:**
- Deployment is one command (not a 20-step manual process)
- Rollback plan exists for every deploy
- Runbook for the top 3 failure modes

These are not aspirational. A product that skips them is not production-ready, regardless of how many features it has.
