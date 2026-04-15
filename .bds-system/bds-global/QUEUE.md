# BDS Global — Framework Queue
> Execution backlog for the BDS framework itself.
> Framework version: 1.0 | Last updated: 2026-04-15
> Managed by: BDS agents (self-managed, human approves DECISION items only)
>
> **This queue IS the BDS framework's own QUEUE.md.**
> It uses the same BDS conventions it enforces on every project it manages.

---

## Queue Legend

```
✅ DONE         — shipped in a release
⏳ IN PROGRESS  — actively being worked
🔲 BACKLOG      — queued, not started
🚫 BLOCKED      — waiting on dependency or human action
💡 IDEA         — under consideration, not committed
```

---

## Release Target: v1.1 — Onboarding + Project Registry
> Goal: Get 5 projects onboarded. Make the framework self-aware of all its projects.
> Target date: 2026-06-30 | Parent BG: BDS-BG-2026-0002

### Projects Table in Global DB  [BDS-DG-2026-0001] [BDS-EPIC-2026-0001]

🔲 **BDS-TASK-2026-0001** — Add `projects` table to BDS-GLOBAL-SCHEMA.sql

  > **TASK PROMPT**
  >
  > **What**: Add a `projects` table to `~/.claude/DomainModel/BDS-GLOBAL-SCHEMA.sql` so the global DB can enumerate all registered projects.
  > **Why**: `/bds-global` and the rollout pipeline need to know what projects exist. Currently the global DB has no concept of projects.
  > **Files to read first**:
  > 1. `~/.claude/DomainModel/BDS-GLOBAL-SCHEMA.sql` — understand existing schema before adding
  >
  > **Build exactly this**:
  > ```sql
  > CREATE TABLE IF NOT EXISTS projects (
  >   project_prefix    TEXT PRIMARY KEY,
  >   project_name      TEXT NOT NULL,
  >   product_type      TEXT,
  >   stage             TEXT DEFAULT 'PRE_LAUNCH',
  >   prod_url          TEXT,
  >   db_path           TEXT,         -- absolute path to .bds/bds.db
  >   config_path       TEXT,         -- absolute path to .bds/bds.config.yaml
  >   project_dir       TEXT,         -- absolute path to project root
  >   schema_version    TEXT DEFAULT '1.0',
  >   registered_at     TEXT DEFAULT (datetime('now')),
  >   last_health_check TEXT,
  >   last_bds_run      TEXT,
  >   health_score      INTEGER,
  >   is_active         INTEGER DEFAULT 1
  > );
  > ```
  > Also add seed INSERT for BDS itself: `('BDS', 'BDS Global Framework', 'DEVELOPER_TOOL', 'EARLY', '', '~/.claude/bds-global.db', ...)`.
  >
  > **Safeguards**:
  > - [ ] Add to schema file only — do not re-initialize the live DB yet (that's the next task)
  > - [ ] Use `CREATE TABLE IF NOT EXISTS` — idempotent
  >
  > **Done when**: `grep -c 'projects' ~/.claude/DomainModel/BDS-GLOBAL-SCHEMA.sql` returns > 0
  > **Definition of done**:
  > - [ ] Table definition added to BDS-GLOBAL-SCHEMA.sql
  > - [ ] BDS self-registration seed INSERT included
  > - [ ] BDS-GLOBAL-FEATURES.md updated (projects registry line: ✅)

🔲 **BDS-TASK-2026-0002** — Migrate bds-global.db to add projects table

  > **TASK PROMPT**
  >
  > **What**: Apply the `projects` table migration to the live `~/.claude/bds-global.db`.
  > **Why**: The schema was updated in TASK-0001 but the live DB needs the change applied.
  > **Files to read first**: `~/.claude/DomainModel/BDS-GLOBAL-SCHEMA.sql`
  > **Depends on**: BDS-TASK-2026-0001
  >
  > **Build exactly this**:
  > ```bash
  > sqlite3 ~/.claude/bds-global.db "
  >   CREATE TABLE IF NOT EXISTS projects (
  >     project_prefix TEXT PRIMARY KEY,
  >     project_name TEXT NOT NULL,
  >     ...  -- full definition from schema
  >   );
  >   INSERT OR IGNORE INTO projects VALUES ('BDS','BDS Global Framework','DEVELOPER_TOOL','EARLY','','~/.claude/bds-global.db',NULL,'~/.claude','1.0',datetime('now'),NULL,NULL,NULL,1);
  > "
  > ```
  >
  > **Done when**: `sqlite3 ~/.claude/bds-global.db "SELECT project_prefix FROM projects;"` returns `BDS`

🔲 **BDS-TASK-2026-0003** — Add project registration to `/bds-db init`

  > **TASK PROMPT**
  >
  > **What**: When `/bds-db init` runs for a new project, also register that project in `~/.claude/bds-global.db`.
  > **Why**: The global DB is the canonical registry of all projects. Every new project must self-register.
  > **Files to read first**: `~/.claude/skills/bds-db.md`
  > **Depends on**: BDS-TASK-2026-0002
  >
  > **Build exactly this** (add to Step 0.4.3 in `/bds-db init`):
  > ```bash
  > sqlite3 ~/.claude/bds-global.db "
  >   INSERT OR IGNORE INTO projects
  >     (project_prefix, project_name, product_type, stage, project_dir, registered_at)
  >   VALUES
  >     ('{PREFIX}', '{name}', '{product_type}', '{stage}', '$(pwd)', datetime('now'));
  > "
  > ```
  >
  > **Done when**: After any `/bds-db init`, `sqlite3 ~/.claude/bds-global.db "SELECT * FROM projects;"` shows the new project.

---

### Case B Onboarding — GeoClear (Reference Project)  [BDS-DG-2026-0001] [BDS-EPIC-2026-0001]

🔲 **BDS-TASK-2026-0004** — Run `/bds-db init` on GeoClear

  > **What**: Initialize the GeoClear project DB and register it in the global DB.
  > **Why**: GeoClear is the first reference project. Its onboarding validates the entire Case B flow.
  > **Do**: cd ~/Projects/geoclear && run `/bds-import` → follow Case B steps B.1–B.8
  > **Done when**: `sqlite3 ~/Projects/geoclear/.bds/bds.db "SELECT project_name FROM project_info;"` returns `GeoClear`

---

## Release Target: v1.2 — Autonomous Operations Layer
> Goal: Physical-world queue + cross-project comms.
> Target date: 2026-08-31 | Parent BG: BDS-BG-2026-0003, BDS-BG-2026-0004

### Physical-World Task Queue  [BDS-DG-2026-0003] [BDS-EPIC-2026-0003]

🔲 **BDS-TASK-2026-0010** — Design the physical-world task protocol

  > **What**: Define the format, lifecycle, and escalation rules for tasks that only the human principal can complete.
  > **Why**: This is the primary interface between autonomous agents and the human principal. Getting the design right is critical to the autonomous operation model.
  > **Output**: DESIGN document in `~/.claude/design/BDS-DESIGN-2026-0001-physical-world-queue.md`
  > **Run**: `/dev-design` for this requirement
  > **Depends on**: — (none)

🔲 **BDS-TASK-2026-0011** — Add `physical_world_tasks` table to BDS-PROJECT-SCHEMA.sql

  > **What**: A dedicated table in each project DB for human-only tasks with SLA tracking.
  > **Depends on**: BDS-TASK-2026-0010

🔲 **BDS-TASK-2026-0012** — Surface physical-world queue in `/comms`

  > **What**: `/comms` must show physical-world queue prominently at session start — above all other COMM items.
  > **Why**: The human principal sees this first. It is the primary interface for their involvement.
  > **Depends on**: BDS-TASK-2026-0011

### Agent Communication Layer  [BDS-DG-2026-0002] [BDS-EPIC-2026-0002]

🔲 **BDS-TASK-2026-0020** — Design agent-to-agent delegation protocol

  > **What**: How does one agent (e.g. /cpm) delegate a task to another (e.g. /dev)? What is the handoff format?
  > **Output**: DESIGN document + lineage entry in COMMS.md
  > **Note**: This is the most architecturally significant piece of v1.2. Take time on the design.

🔲 **BDS-TASK-2026-0021** — Build `/bds-global` skill (cross-project dashboard)

  > **What**: A skill that reads ALL registered projects from `~/.claude/bds-global.db`, queries each project's `.bds/bds.db`, and shows a unified health dashboard.
  > **Output**: Health score, last run, orphan rate, open P1 bugs, open COMM items — per project, in one view.
  > **Depends on**: BDS-TASK-2026-0003

---

## Release Target: v1.3 — Self-Management
> Goal: BDS manages its own development using BDS.
> Target date: 2026-10-31 | Parent BG: BDS-BG-2026-0004

### Framework Upgrade Pipeline  [BDS-DG-2026-0005] [BDS-EPIC-2026-0005]

🔲 **BDS-TASK-2026-0030** — Design the `/bds-keeper upgrade` rollout flow

  > **What**: When global skills are updated (new file or modified file in `~/.claude/skills/`), how does a project get the update? What are the migration gates (schema changes, skill API changes)?
  > **Output**: DESIGN document covering: version diff detection, pre-flight checks, schema migration, skill file update, post-upgrade validation.

🔲 **BDS-TASK-2026-0031** — Add `bds_version` check to session start in global CLAUDE.md

  > **What**: At every session start, compare the project's `bds.config.yaml` `framework_version` against `bds-global.db` `bds_framework.version`. If behind: surface a COMM item recommending upgrade.

🔲 **BDS-TASK-2026-0032** — Build schema migration framework for project DBs

  > **What**: When `BDS-PROJECT-SCHEMA.sql` changes between versions, projects need a migration path. Build a migrations table in project DBs and a migration runner in `/bds-keeper`.

---

## Backlog (not yet assigned to a release)

🔲 **BDS-TASK-2026-0040** — Lineage visualization (`/domain-lineage viz`)

  > Generate a Mermaid or ASCII diagram of the full BI→VIS→BG→DG→EPIC→FEAT→REQ→DESIGN→TASK chain for any entity.

🔲 **BDS-TASK-2026-0041** — Autonomous scheduling (`/loop`-based health checks)

  > Integrate with the `/loop` or `/schedule` skill to run `/bds` automatically every 14 days per project.

🔲 **BDS-TASK-2026-0042** — Cross-project KPI aggregation

  > A `/bds-global kpi` command that shows KPI status across all projects: which are AT RISK, which are on track, which have missed targets.

🔲 **BDS-TASK-2026-0043** — BDS onboarding time reduction

  > Measure current Case B onboarding time. Target: <30 minutes. Profile bottlenecks and optimize.

🔲 **BDS-TASK-2026-0044** — Multi-tenancy isolation audit

  > When running hundreds of projects, verify that no project DB, agent state, or COMMS item leaks between projects. Audit and harden isolation guarantees.

---

## Rollout Plan for Existing Projects

When a BDS framework version increments (e.g. v1.0 → v1.1):

```
ROLLOUT SEQUENCE
  1. BDS-GLOBAL-RELEASES.md updated with new version + changelog
  2. Global skills updated in ~/.claude/skills/
  3. bds-global.db bds_framework.version incremented
  4. For each registered project (in order of last_health_check, oldest first):
     a. Session start: /bds checks bds.config.yaml framework_version vs global
     b. COMM item created: "BDS v{new} available — run /bds-keeper upgrade"
     c. User or agent runs /bds-keeper upgrade
     d. Skills overwritten with new versions
     e. If schema migration: sqlite3 migration applied to .bds/bds.db
     f. bds.config.yaml framework_version updated
     g. Commit bds.config.yaml with message: "chore: upgrade BDS framework to v{new}"
  5. /bds-global shows all projects on new version

ROLLBACK
  If upgrade fails: revert to previous skill files from ~/.claude/skills/archive/{version}/
  Project DB rollback: restore from pre-migration backup (auto-created before migration)

COMPATIBILITY POLICY
  Minor versions (1.0 → 1.1): backwards compatible. Skills additive. Projects upgrade at their own pace.
  Major versions (1.x → 2.0): breaking changes allowed. All projects must upgrade within 90 days.
  Projects on unsupported version: /bds warns at every session start.
```

---

## Session Log

| Date | Work done | By |
|------|-----------|-----|
| 2026-04-15 | BDS-GLOBAL-QUEUE.md created. v1.1, v1.2, v1.3 release targets defined. Rollout plan established. | BDS agents |
