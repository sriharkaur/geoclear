# /bds-db — BDS Database Operations

> Manages the project-local BDS operational database at {project}/.bds/bds.db
> The DB is a project-specific operational backbone — fully independent of the global BDS framework.
> Global BDS DB at ~/.claude/bds-global.db is READ-ONLY reference; this project DB is WRITE.
>
> ALL entity creation in BDS MUST write to the project DB AND to the markdown file.
> Markdown = authoritative (human-readable, git-trackable)
> DB = operational index (queryable, fast, aggregatable)

---

## Database Architecture

```
~/.claude/
  bds-global.db              ← GLOBAL (read-only reference)
                               Schema: ~/.claude/DomainModel/BDS-GLOBAL-SCHEMA.sql
                               Contents: skill registry, entity type definitions,
                               lineage chain rules, quality gates, BDS version

{project-root}/
  .bds/
    bds.db                   ← PROJECT DB (fully independent)
                               Schema: ~/.claude/DomainModel/BDS-PROJECT-SCHEMA.sql
                               Contents: all entities, lineage, metrics, agent runs,
                               audit log, health checks, comms for THIS project only
    bds.config.yaml          ← Project BDS configuration (committed to git)
```

**Key design rule:** No FK links or sync between global and project DB.
The global DB is a FRAMEWORK REFERENCE. The project DB IS the project.

---

## Invocation Variants

```
/bds-db init                  — initialize project DB + config (called by bds-bootstrap or bds-import)
/bds-db prefix                — assign or show the project prefix
/bds-db status                — show DB health, row counts, last activity
/bds-db entity insert {id}    — insert or upsert an entity from its markdown file
/bds-db entity update {id}    — update entity status/metadata from markdown
/bds-db lineage rebuild       — rebuild all lineage_chains from entity parent links
/bds-db lineage trace {id}    — trace entity backward to BI (SQL query)
/bds-db kpi record {id} {val} — record a KPI measurement
/bds-db health                — compute and store a health check snapshot
/bds-db migrate               — scan existing markdown files → populate DB (for existing projects)
/bds-db upgrade               — apply schema migrations when BDS framework version bumps
/bds-db query "{sql}"         — run arbitrary SELECT query for reporting
/bds-db export                — export current state as JSON for backup
/bds-db next-id {TYPE}        — return next available entity ID for a given type
```

---

## Step 1 — Read config

Before any operation: read `.bds/bds.config.yaml` to get `project.id` (the prefix) and `db.path`.

```bash
cat .bds/bds.config.yaml
```

If `.bds/bds.config.yaml` does not exist: run `/bds-db init` first.

---

## `/bds-db init` — Initialize the project DB

Called by: `/bds-bootstrap` Phase 0.4 (new projects) or `/bds-import` Step 2.5 (existing projects).

**Step init.1 — Assign project prefix**

Auto-suggest the prefix from the project name:
- Strategy: take first 3 consonants of the project name, uppercase
- Alternatives: acronym of significant words, or first 3 chars if unique enough
- Examples: GeoClear → GEO, FinanceTracker → FIN, HealthMonitor → HLM, AIAssistant → AIA
- Rule: must be unique globally (check `~/.claude/bds-global.db` projects table if it exists)
- Must be exactly 3 uppercase letters: `[A-Z]{3}`

Show the suggested prefix. If user wants to override, they can specify it.

```bash
# Check for collision in global registry (if global DB exists)
sqlite3 ~/.claude/bds-global.db \
  "SELECT project_id, name FROM projects WHERE project_id = '{SUGGESTED_PREFIX}'" 2>/dev/null || true
```

Confirm with user or proceed with suggestion.

**Step init.2 — Create .bds/ directory and config**

```bash
mkdir -p .bds
# .bds/bds.db goes in .gitignore; .bds/bds.config.yaml does NOT
```

Check `.gitignore` and add `.bds/bds.db` if not present:
```bash
grep -q '\.bds/bds\.db' .gitignore 2>/dev/null || echo '.bds/bds.db' >> .gitignore
grep -q '\.bds/\*\.db' .gitignore 2>/dev/null || echo '.bds/*.db' >> .gitignore
```

Copy and fill the config template:
```bash
cp ~/.claude/DomainModel/bds.config.yaml.template .bds/bds.config.yaml
```

Replace placeholders in `.bds/bds.config.yaml`:
- `{PREFIX}` → confirmed prefix (e.g., GEO)
- `{Project Name}` → actual project name
- `{YYYY-MM-DD}` → today's date
- `stage` → from CLAUDE.md or user input
- `stack.*` → from package.json/pyproject.toml/Cargo.toml detection

**Step init.3 — Create the project DB**

```bash
# Apply the project schema
sqlite3 .bds/bds.db < ~/.claude/DomainModel/BDS-PROJECT-SCHEMA.sql
```

Insert project_info singleton:
```sql
INSERT INTO project_info(
  project_id, name, path, description, stage, bds_framework_version
) VALUES(
  '{PREFIX}',
  '{Project Name}',
  '{absolute path}',
  '{description}',
  '{stage}',
  '1.0'
);
```

**Step init.4 — Register in global DB (if it exists)**

The global DB tracks which projects exist. This is advisory — not required.

```bash
# Check if global DB exists
if [ -f ~/.claude/bds-global.db ]; then
  sqlite3 ~/.claude/bds-global.db "
    INSERT OR IGNORE INTO projects(project_id, name, path, description, stage, created_at)
    VALUES('{PREFIX}', '{Name}', '{path}', '{desc}', '{stage}', datetime('now'));
  "
fi
```

**Step init.5 — Report**

```
=== BDS DB INITIALIZED ===
Project prefix:   {PREFIX}
Config:           {project}/.bds/bds.config.yaml ✅
Project DB:       {project}/.bds/bds.db ✅
Schema version:   1.0
Global registry:  {updated | skipped — global DB not found}

Next:
  All entity IDs in this project use prefix: {PREFIX}-{TYPE}-{YYYY}-{NNNN}
  Example: {PREFIX}-REQ-2026-0001, {PREFIX}-TASK-2026-0001
  Run /bds-db migrate to import existing entities from markdown files.
```

---

## `/bds-db next-id {TYPE}` — Get next entity ID

**Purpose:** Atomically increment the sequence and return the next valid ID. Called before creating any entity.

```sql
-- For year-scoped types (REQ, TASK, DESIGN, BG, etc.)
INSERT INTO entity_sequences(entity_type, year, last_seq)
VALUES('{TYPE}', {YYYY}, 1)
ON CONFLICT(entity_type, year) DO UPDATE
SET last_seq = last_seq + 1;

SELECT printf('%s-%s-%d-%04d',
  (SELECT project_id FROM project_info LIMIT 1),
  '{TYPE}',
  {YYYY},
  last_seq
) AS next_id
FROM entity_sequences
WHERE entity_type = '{TYPE}' AND year = {YYYY};
```

For project-scoped types (AD, DEC, COMM — no year):
```sql
UPDATE project_counters
SET counter_value = counter_value + 1,
    updated_at = datetime('now')
WHERE counter_key = '{TYPE}';

SELECT printf('%s-%s-%04d',
  (SELECT project_id FROM project_info LIMIT 1),
  '{TYPE}',
  counter_value
) AS next_id
FROM project_counters
WHERE counter_key = '{TYPE}';
```

For timestamp types (TR, VR, SESSION):
```bash
# Format: {PREFIX}-{TYPE}-$(date +%Y-%m-%d-%H-%M-%S)
echo "{PREFIX}-{TYPE}-$(date +%Y-%m-%d-%H-%M-%S)"
```

---

## `/bds-db entity insert {entity-id}` — Insert entity into DB

Called after writing the markdown file for a new entity.

**Read the markdown file frontmatter** (the entity_id, type, status, parent links, metadata).

**Insert into entities table:**
```sql
INSERT INTO entities(
  entity_id, entity_type, tier, title, status, parent_id,
  file_path, bg_id, dg_id, epic_id, feat_id, req_id,
  metadata, created_by
) VALUES(
  '{entity_id}', '{type}', {tier}, '{title}', '{status}',
  '{parent_id}',  '{file_path}',
  '{bg_id}', '{dg_id}', '{epic_id}', '{feat_id}', '{req_id}',
  '{metadata_json}', '{skill_name}'
);
```

**Upsert lineage_chains row:**
```sql
INSERT INTO lineage_chains(
  leaf_entity_id, leaf_type, bi_id, vis_id, bg_id, dg_id,
  epic_id, feat_id, req_id, design_id, task_id,
  chain_string, chain_depth, has_orphan
)
VALUES(...)
ON CONFLICT(leaf_entity_id) DO UPDATE SET
  bg_id = excluded.bg_id,
  feat_id = excluded.feat_id,
  -- ... etc
  updated_at = datetime('now');
```

**Update parent's relationship:**
```sql
INSERT OR IGNORE INTO entity_relationships(source_id, target_id, rel_type)
VALUES('{parent_id}', '{entity_id}', 'PARENT_OF');
```

---

## `/bds-db migrate` — Scan existing markdown files → populate DB

For existing projects that have markdown files but no DB yet.

**Scan order (must follow lineage hierarchy):**
1. BUSINESS-GOAL.md → extract BI, VIS, BG entities
2. strategy/GOALS-DEV.md → DG entities
3. strategy/GOALS-MARKETING.md → MG entities
4. strategy/GOALS-CUSTOMER.md → CGG entities
5. strategy/KPIS.md → KPI entities
6. planning/EPICS.md → EPIC entities
7. FEATURES.md → FEAT entities
8. requirements/REQUIREMENTS-INDEX.md → REQ entities
9. design/DESIGN-INDEX.md → DESIGN entities
10. QUEUE.md → TASK entities
11. tests/BUG-REGISTRY.md → BUG entities
12. RELEASES.md → DEP entities
13. COMMS.md → COMM items
14. DECISIONS.md → DEC entities

For each entity found: call `/bds-db entity insert` logic.

After scan: rebuild lineage with `/bds-db lineage rebuild`.

**Output:**
```
=== MIGRATION COMPLETE ===
Entities imported:
  BG:     {N}
  DG:     {N}
  EPIC:   {N}
  FEAT:   {N}
  REQ:    {N}
  DESIGN: {N}
  TASK:   {N}
  BUG:    {N}
  COMM:   {N}
  Total:  {N}

Lineage chains built:  {N}
  Complete chains:     {N}  ({X}%)
  Orphaned:            {N}  ({Y}%)

Run /bds-db health to see the full health snapshot.
```

---

## `/bds-db health` — Compute and store health snapshot

Runs these SQL queries and stores the result in `health_checks`:

```sql
-- Orphan check
SELECT
  COUNT(*) AS total_tasks,
  SUM(CASE WHEN has_orphan = 1 OR bg_id IS NULL THEN 1 ELSE 0 END) AS orphan_tasks
FROM lineage_chains
WHERE leaf_type = 'TASK';

-- KPI status
SELECT
  COUNT(*) AS total_kpis,
  SUM(CASE WHEN status IN ('ON_TRACK','ACHIEVED') THEN 1 ELSE 0 END) AS on_track
FROM v_latest_kpi;

-- Open bugs by priority
SELECT
  SUM(CASE WHEN json_extract(metadata,'$.priority')='P1' THEN 1 ELSE 0 END) AS p1,
  SUM(CASE WHEN json_extract(metadata,'$.priority')='P2' THEN 1 ELSE 0 END) AS p2
FROM entities
WHERE entity_type='BUG' AND status IN ('OPEN','TRIAGED','IN_PROGRESS');
```

Store in `health_checks`. Output the health snapshot in BDS Layer format.

---

## `/bds-db status` — Show DB operational status

```bash
sqlite3 .bds/bds.db "
SELECT 'project'       AS type, project_id || ' — ' || name AS value FROM project_info
UNION ALL
SELECT 'stage',        stage FROM project_info
UNION ALL
SELECT 'schema_ver',   bds_schema_version FROM project_info
UNION ALL
SELECT 'db_size',      (SELECT page_count * page_size || ' bytes' FROM pragma_page_count(), pragma_page_size())
UNION ALL
SELECT 'entities',     COUNT(*) || ' total, ' || SUM(CASE WHEN is_deleted=0 THEN 1 ELSE 0 END) || ' active'
FROM entities
UNION ALL
SELECT entity_type, COUNT(*) FROM entities WHERE is_deleted=0 GROUP BY entity_type ORDER BY tier, entity_type
UNION ALL
SELECT 'agent_runs',   COUNT(*) || ' total, ' || SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END) || ' completed'
FROM agent_runs
UNION ALL
SELECT 'open_comms',   COUNT(*) FROM comms_items WHERE status IN ('NEW','IN_PROGRESS')
UNION ALL
SELECT 'last_run',     MAX(started_at) FROM agent_runs;
"
```

---

## `/bds-db query "{sql}"` — Direct SQL query

Only SELECT queries allowed. Used for custom reporting.

Example useful queries:

```sql
-- All active BGs with delivery progress
SELECT bg.entity_id, bg.title, d.pct_done, d.done, d.total_tasks
FROM v_active_bgs bg
JOIN v_bg_delivery d ON d.bg_id = bg.entity_id;

-- KPI dashboard
SELECT kpi_name, value, target, pct_of_target, status, measured_at
FROM v_latest_kpi ORDER BY pct_of_target ASC;

-- Recent agent runs
SELECT skill_name, status, duration_ms, started_at
FROM agent_runs ORDER BY started_at DESC LIMIT 20;

-- Open blockers with age
SELECT * FROM v_open_comms WHERE category = 'BLOCKER';

-- Orphaned tasks
SELECT entity_id, title, created_at FROM v_orphaned_tasks;
```

---

## Dual-Write Protocol (for all BDS skills)

**Every skill that creates or updates an entity MUST:**

1. Get the next ID: `/bds-db next-id {TYPE}` → `{PREFIX}-{TYPE}-{YYYY}-{NNNN}`
2. Write the markdown file with the ID in frontmatter
3. Insert into DB: `/bds-db entity insert {entity-id}`
4. Update parent entity's `linked_*` fields if applicable

**Pattern in skill instructions:**

```
DUAL-WRITE RULE: After writing the markdown file for {entity_id}:
  sqlite3 .bds/bds.db "
    INSERT INTO entities(entity_id, entity_type, tier, title, status,
      parent_id, file_path, bg_id, feat_id, req_id, metadata, created_by)
    VALUES('{id}', '{type}', {tier}, '{title}', '{status}',
      '{parent}', '{path}', '{bg_id}', '{feat_id}', '{req_id}',
      '{json}', '{skill}');
  "
  Then rebuild the lineage row for this entity.
```

Skills with DUAL-WRITE responsibility:
- `dev-requirements` → entities (REQ)
- `dev-design` → entities (DESIGN, AD)
- `dev-plan` → entities (TASK × N)
- `dev-test` → entities (TC, TR, BUG)
- `dev-deploy` → entities (DEP), deployments table
- `dev-verify` → entities (VR, INC)
- `business-goal` → entities (BG, VIS)
- `strategy-kpis` → entities (KPI), kpi_measurements
- `bds-bootstrap` → entities (BI, VIS, BG, MG, DG, CGG, KPI, EPIC, FEAT)
- `bds` → health_checks
- `comms` → comms_items

---

## Prefix Convention

Once assigned during init, the prefix is used in ALL entity IDs for this project:

```
{PREFIX} = GEO (for GeoClear)

GEO-BI-2026-0001      ← BusinessIdea
GEO-VIS-2026-0001     ← Vision
GEO-BG-2026-0001      ← BusinessGoal Q2 2026
GEO-DG-2026-0001      ← DevGoal
GEO-EPIC-2026-0001    ← Epic
GEO-FEAT-2026-0001    ← Feature
GEO-REQ-2026-0001     ← Requirement
GEO-DESIGN-2026-0001  ← Design document
GEO-AD-0001           ← Architecture Decision
GEO-TASK-2026-0001    ← Task
GEO-TC-2026-0001      ← Test Case
GEO-TR-2026-04-15-14-30-00  ← Test Result
GEO-BUG-2026-0001     ← Bug
GEO-DEP-2026-0001     ← Deployment
GEO-VR-2026-04-15-14-45-00  ← Verification Report
GEO-COMM-0001         ← COMMS item
GEO-DEC-0001          ← Decision
```

The prefix is stored in:
- `.bds/bds.config.yaml` → `project.id: GEO`
- `CLAUDE.md` → `project_prefix: GEO`
- `.bds/bds.db` → `project_info.project_id = 'GEO'`
- All entity IDs in all markdown files

---

## Upgrade Protocol

When the BDS framework version bumps (new entity types, schema changes):

```bash
/bds-db upgrade
```

This reads the current `bds_schema_version` from `project_info` and applies incremental migration SQL. Schema migration files live at:
```
~/.claude/DomainModel/BDS-MIGRATIONS/
  v1.0-to-v1.1.sql
  v1.1-to-v1.2.sql
```

After migration: update `bds.config.yaml` `bds.schema_version` and `project_info.bds_schema_version`.
