# BDS Framework — Database Guide
> Audience: Database admins, living agents working directly with the DB
> Covers: both DBs, all tables, all views, all triggers, common queries, migrations, backups

---

## Two Databases, Clear Separation

| | Global DB | Project DB |
|-|-----------|------------|
| **Location** | `~/.claude/bds-global.db` | `{project}/.bds/bds.db` |
| **Purpose** | Framework registry (read-only reference for projects) | Operational backbone (all live project data) |
| **Committed to git?** | No (in `~/.claude/`, not a project git repo) | No (gitignored) |
| **Who writes?** | BDS Global agents only | Any BDS skill |
| **Who reads?** | All projects (via `/bds-db init`, upgrade, health) | Only the owning project |
| **Schema file** | `BDS-GLOBAL-SCHEMA.sql` | `BDS-PROJECT-SCHEMA.sql` |
| **Runtime link to each other?** | No | No |

---

## Global Database (`~/.claude/bds-global.db`)

### Tables

**`bds_framework`** — singleton, version tracking
```sql
SELECT * FROM bds_framework WHERE id = 1;
-- version, released_at, changelog, min_schema_version
```

**`skills_registry`** — all 27+ BDS skills
```sql
SELECT skill_id, display_name, tier, entry_point, creates_entities
FROM skills_registry WHERE is_active = 1 ORDER BY tier, skill_id;
```

**`entity_type_definitions`** — all 30 entity types
```sql
SELECT entity_type, display_name, tier, id_format, id_scope, lifecycle_states
FROM entity_type_definitions ORDER BY tier;
```

**`lineage_chain_definitions`** — 8 lineage chains
```sql
SELECT chain_id, chain_name, entity_sequence FROM lineage_chain_definitions;
```

**`quality_gates`** — 11 quality gates across skills
```sql
SELECT qg.gate_id, qg.skill_id, qg.gate_name, qg.blocking
FROM quality_gates qg ORDER BY qg.skill_id, qg.gate_number;
```

**`projects`** — all registered projects (added in v1.1)
```sql
SELECT project_prefix, project_name, stage, last_health_check, health_score
FROM projects ORDER BY registered_at;
```

### Initialize
```bash
sqlite3 ~/.claude/bds-global.db < ~/.claude/DomainModel/BDS-GLOBAL-SCHEMA.sql
```
Idempotent: `CREATE TABLE IF NOT EXISTS` + `INSERT OR IGNORE`.

---

## Project Database (`{project}/.bds/bds.db`)

### Initialize
```bash
cd {project-root}
sqlite3 .bds/bds.db < ~/.claude/DomainModel/BDS-PROJECT-SCHEMA.sql
```

### Tables Reference

#### `project_info` — singleton
```sql
SELECT project_name, project_prefix, product_type, stage,
       framework_version, schema_version, initialized_at
FROM project_info;
```

| Column | Type | Notes |
|--------|------|-------|
| `project_prefix` | TEXT | 3-letter uppercase (GEO, FIN, ...) |
| `product_type` | TEXT | API_SERVICE, SAAS_WEB_APP, ... |
| `stage` | TEXT | PRE_LAUNCH, EARLY, GROWTH, SCALE, ENTERPRISE |
| `framework_version` | TEXT | BDS version this project uses |
| `schema_version` | TEXT | Project DB schema version |

#### `entities` — all project entities
```sql
SELECT entity_id, entity_type, title, status, source_file, created_at
FROM entities WHERE entity_type = 'REQ' AND status != 'ARCHIVED'
ORDER BY created_at DESC;
```

| Column | Type | Notes |
|--------|------|-------|
| `entity_id` | TEXT PK | Full prefixed ID: `GEO-REQ-2026-0001` |
| `entity_type` | TEXT | BI, VIS, BG, REQ, TASK, BUG, ... |
| `title` | TEXT | Short descriptive title |
| `status` | TEXT | ACTIVE, IN_PROGRESS, DONE, ARCHIVED, ... |
| `source_file` | TEXT | Relative path to the markdown file |
| `body_summary` | TEXT | First 500 chars of entity description |
| `metadata_json` | TEXT | JSON blob for type-specific fields |
| `is_orphan` | INTEGER | 1 = no parent link (needs fixing) |

#### `entity_relationships` — parent-child links
```sql
-- Find all children of a BusinessGoal
SELECT child_id, relationship_type
FROM entity_relationships WHERE parent_id = 'GEO-BG-2026-0001';

-- Find all ancestors of a task
SELECT parent_id, relationship_type
FROM entity_relationships WHERE child_id = 'GEO-TASK-2026-0042';
```

#### `lineage_chains` — denormalized ancestry (fast lookup)
```sql
-- Full lineage for a task (single row lookup)
SELECT bi_id, vis_id, bg_id, dg_id, epic_id, feat_id, req_id, design_id, task_id, status
FROM lineage_chains WHERE task_id = 'GEO-TASK-2026-0042';

-- All tasks for a business goal
SELECT task_id, status FROM lineage_chains WHERE bg_id = 'GEO-BG-2026-0001';

-- Orphaned tasks (no lineage entry at all)
SELECT e.entity_id FROM entities e
LEFT JOIN lineage_chains lc ON e.entity_id = lc.task_id
WHERE e.entity_type = 'TASK' AND lc.task_id IS NULL;
```

#### `kpi_measurements` — time series
```sql
-- Latest measurement per KPI
SELECT kpi_id, value, target, period, measured_at,
       CASE WHEN value >= target * 0.8 THEN 'ON_TRACK'
            WHEN value >= target * 0.5 THEN 'AT_RISK'
            ELSE 'MISS' END AS health
FROM kpi_measurements km
WHERE measured_at = (SELECT MAX(measured_at) FROM kpi_measurements WHERE kpi_id = km.kpi_id);

-- KPI trend over time
SELECT kpi_id, value, target, measured_at
FROM kpi_measurements WHERE kpi_id = 'GEO-KPI-2026-0001'
ORDER BY measured_at DESC LIMIT 12;
```

#### `agent_runs` — skill invocation log
```sql
-- Recent skill runs
SELECT skill_name, started_at, completed_at, status, entity_ids_created
FROM agent_runs ORDER BY started_at DESC LIMIT 20;

-- Skills with errors in last 7 days
SELECT skill_name, error_message, started_at
FROM agent_runs WHERE status = 'ERROR'
  AND started_at > datetime('now', '-7 days');
```

#### `audit_log` — immutable entity change history
```sql
-- All changes to a specific entity
SELECT changed_field, old_value, new_value, changed_by, changed_at
FROM audit_log WHERE entity_id = 'GEO-REQ-2026-0001'
ORDER BY changed_at;

-- Recent status changes
SELECT entity_id, old_value, new_value, changed_at
FROM audit_log WHERE changed_field = 'status'
  AND changed_at > datetime('now', '-24 hours');
```

#### `health_checks` — health score history
```sql
-- Latest health check per layer
SELECT layer, score, orphan_count, open_bugs, checked_at
FROM health_checks hc
WHERE checked_at = (SELECT MAX(checked_at) FROM health_checks WHERE layer = hc.layer)
ORDER BY layer;

-- Health trend (last 10 checks)
SELECT layer, score, checked_at FROM health_checks ORDER BY checked_at DESC LIMIT 50;
```

---

## Atomic ID Assignment (the only correct way to get an ID)

### Year-scoped types (BI, VIS, BG, MG, DG, CGG, EPIC, FEAT, REQ, DESIGN, TASK, TC, TR, BUG, KPI, STRAT, PER, COMP, INC, RB, EP, DM, MIG, TIER)

```sql
INSERT INTO entity_sequences (entity_type, year, last_seq)
VALUES ('REQ', strftime('%Y','now'), 0)
ON CONFLICT(entity_type, year) DO UPDATE SET last_seq = last_seq + 1
RETURNING printf('%s-REQ-%s-%04d',
  (SELECT project_prefix FROM project_info),
  strftime('%Y','now'),
  last_seq);
```

### Project-scoped types (AD, DEC, COMM — no year)
```sql
INSERT INTO project_counters (counter_name, last_value)
VALUES ('DEC', 0)
ON CONFLICT(counter_name) DO UPDATE SET last_value = last_value + 1
RETURNING printf('%s-DEC-%04d',
  (SELECT project_prefix FROM project_info),
  last_value);
```

### Timestamp-scoped types (TR, DEP, VR, INC, SESSION)
```sql
-- ID = {PREFIX}-{TYPE}-{YYYY}-{MM}-{DD}-{HH}-{MM}-{SS}
SELECT printf('%s-TR-%s',
  (SELECT project_prefix FROM project_info),
  strftime('%Y-%m-%d-%H-%M-%S', 'now'));
```

---

## Common Operational Queries

```sql
-- Project health snapshot (run by /bds Layer 1)
SELECT
  (SELECT COUNT(*) FROM entities WHERE is_orphan = 1) AS orphan_count,
  (SELECT COUNT(*) FROM entities) AS total_entities,
  ROUND(100.0 * (SELECT COUNT(*) FROM entities WHERE is_orphan = 1)
        / MAX(1, COUNT(*)), 1) || '%' AS orphan_rate,
  (SELECT COUNT(*) FROM entities WHERE entity_type = 'BUG' AND status NOT IN ('CLOSED','WONT_FIX')) AS open_bugs,
  (SELECT COUNT(*) FROM comms_items WHERE status = 'NEW') AS new_comms
FROM entities;

-- Goal delivery progress
SELECT bg.title, bg.entity_id,
  COUNT(DISTINCT lc.task_id) AS total_tasks,
  SUM(CASE WHEN e.status = 'DONE' THEN 1 ELSE 0 END) AS done_tasks
FROM entities bg
JOIN lineage_chains lc ON lc.bg_id = bg.entity_id
JOIN entities e ON e.entity_id = lc.task_id
WHERE bg.entity_type = 'BG'
GROUP BY bg.entity_id;

-- KPI status dashboard
SELECT k.entity_id, k.title,
  km.value, km.target,
  CASE WHEN km.value >= km.target * 0.8 THEN '✅ ON_TRACK'
       WHEN km.value >= km.target * 0.5 THEN '⚠️ AT_RISK'
       ELSE '❌ MISS' END AS health,
  km.measured_at
FROM entities k
JOIN kpi_measurements km ON km.kpi_id = k.entity_id
WHERE k.entity_type = 'KPI'
  AND km.measured_at = (SELECT MAX(measured_at) FROM kpi_measurements WHERE kpi_id = k.entity_id);

-- Open COMM items by category
SELECT category, COUNT(*) as count, GROUP_CONCAT(comm_id) as ids
FROM comms_items WHERE status IN ('NEW', 'IN_PROGRESS')
GROUP BY category ORDER BY count DESC;
```

---

## Migration Guide (schema version upgrades)

When BDS framework version upgrades include schema changes:

**Step 1**: Check current schema version:
```bash
sqlite3 .bds/bds.db "SELECT schema_version FROM project_info;"
```

**Step 2**: Find migration SQL:
```bash
ls ~/.claude/DomainModel/migrations/  # e.g. 0001-add-projects-table.sql
```

**Step 3**: Apply migration (creates backup first):
```bash
cp .bds/bds.db .bds/bds.db.backup-$(date +%Y%m%d)
sqlite3 .bds/bds.db < ~/.claude/DomainModel/migrations/{migration-file}.sql
```

**Step 4**: Update schema version:
```bash
sqlite3 .bds/bds.db "UPDATE project_info SET schema_version = '1.1';"
```

**Step 5**: Verify:
```bash
sqlite3 .bds/bds.db ".schema" | grep "new_table_name"
```

**Rollback**: If migration fails, restore backup:
```bash
cp .bds/bds.db.backup-$(date +%Y%m%d) .bds/bds.db
```

---

## Backup and Recovery

**Backup** (project DB is gitignored, so backup manually):
```bash
cp .bds/bds.db .bds/bds.db.backup-$(date +%Y%m%d-%H%M%S)
```

**Recovery** (DB lost — rebuild from markdown):
```bash
# Delete corrupt or missing DB
rm -f .bds/bds.db

# Recreate schema
sqlite3 .bds/bds.db < ~/.claude/DomainModel/BDS-PROJECT-SCHEMA.sql

# Re-seed project_info from bds.config.yaml
PREFIX=$(grep 'id:' .bds/bds.config.yaml | head -1 | awk '{print $2}' | tr -d '"')
NAME=$(grep 'name:' .bds/bds.config.yaml | head -1 | awk '{print $2}')
sqlite3 .bds/bds.db "
  INSERT INTO project_info (project_name, project_prefix, initialized_at)
  VALUES ('${NAME}', '${PREFIX}', datetime('now'));
"

# Re-migrate all entities from markdown
# (run /bds-db migrate via Claude Code — it scans all 18 file types)
```

The markdown files are always the source of truth. The DB can always be rebuilt from them.
