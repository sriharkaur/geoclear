-- ============================================================
-- BDS PROJECT DATABASE SCHEMA
-- Location: {project-root}/.bds/bds.db
-- Purpose: Operational backbone for ONE project.
--          FULLY INDEPENDENT of the global BDS DB.
--          Created by copying this schema + running bds-db init.
--          No foreign keys, no sync, no live link to ~/.claude/bds-global.db
--
-- Inheritance model:
--   Global framework (read-only reference at ~/.claude/)
--     → /bds-import or /bds-bootstrap copies skills + schema
--     → /bds-db init creates {project}/.bds/bds.db from this schema
--     → Project customizes via {project}/.bds/bds.config.yaml
--     → All subsequent operations are fully project-local
--
-- Design principles:
--   1. One DB per project — project_info is a singleton (one row)
--   2. Markdown files are AUTHORITATIVE — DB is the queryable index
--   3. Dual-write: entity creation writes markdown AND inserts here
--   4. All entity IDs are prefixed: {3-LETTER-PREFIX}-{TYPE}-...
--   5. Audit log is immutable — append-only
--   6. Schema version tracked — /bds-db upgrade handles migrations
--
-- Version: 1.0 | Created: 2026-04-15
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;

-- ============================================================
-- PROJECT INFO (singleton — exactly one row per DB)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_info (
  id                  INTEGER PRIMARY KEY DEFAULT 1,   -- always 1
  project_id          TEXT NOT NULL UNIQUE,             -- 3-letter prefix: GEO, FIN, etc.
  name                TEXT NOT NULL,
  path                TEXT NOT NULL,                    -- absolute filesystem path
  description         TEXT,
  stage               TEXT NOT NULL DEFAULT 'PRE_LAUNCH'
                      CHECK(stage IN ('PRE_LAUNCH','EARLY','GROWTH','SCALE','ENTERPRISE')),
  product_type        TEXT,                             -- API_SERVICE | SAAS_WEB_APP | etc.
  stack               TEXT,                             -- JSON: {language, framework, db, deploy, port}
  prod_url            TEXT,
  north_star          TEXT,
  bds_schema_version  TEXT NOT NULL DEFAULT '1.0',
  bds_framework_version TEXT NOT NULL DEFAULT '1.0',   -- which global framework was inherited
  inherited_at        TEXT NOT NULL DEFAULT (datetime('now')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ENTITIES (master table — all entity types for this project)
-- ============================================================

CREATE TABLE IF NOT EXISTS entities (
  entity_id           TEXT PRIMARY KEY,
  -- Format: {PREFIX}-{TYPE}-{YYYY}-{NNNN} or {PREFIX}-{TYPE}-{YYYY-MM-DD-HH-MM-SS}
  entity_type         TEXT NOT NULL
                      CHECK(entity_type IN (
                        'BI','VIS','BG','MG','DG','CGG',
                        'STRAT','PER','COMP','KPI','TIER',
                        'EPIC','FEAT','REQ','DESIGN','AD',
                        'TASK','EP','DM','MIG',
                        'TC','TR','BUG',
                        'DEP','VR','INC','RB',
                        'DEC','COMM','SESSION'
                      )),
  tier                INTEGER NOT NULL CHECK(tier BETWEEN 1 AND 7),
  title               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'ACTIVE',
  parent_id           TEXT REFERENCES entities(entity_id),
  file_path           TEXT,
  version             TEXT DEFAULT '1.0',
  -- Denormalized lineage (fast BG lookup for any entity)
  bg_id               TEXT,
  dg_id               TEXT,
  epic_id             TEXT,
  feat_id             TEXT,
  req_id              TEXT,
  -- Type-specific metadata as JSON
  metadata            TEXT,
  -- Audit
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  created_by          TEXT,
  is_deleted          INTEGER DEFAULT 0 CHECK(is_deleted IN (0,1))
);

CREATE INDEX IF NOT EXISTS idx_entities_type       ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_parent     ON entities(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_status     ON entities(status);
CREATE INDEX IF NOT EXISTS idx_entities_bg         ON entities(bg_id) WHERE bg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_feat       ON entities(feat_id) WHERE feat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_created    ON entities(created_at);

-- ============================================================
-- ENTITY RELATIONSHIPS (N:M peer associations)
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_relationships (
  rel_id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id           TEXT NOT NULL REFERENCES entities(entity_id),
  target_id           TEXT NOT NULL REFERENCES entities(entity_id),
  rel_type            TEXT NOT NULL
                      CHECK(rel_type IN (
                        'PARENT_OF','LINKED_TO','DEPENDS_ON','BLOCKS',
                        'TESTS','FIXES','TRIGGERS','IMPLEMENTS',
                        'SATISFIES','MEASURED_BY','GENERATED_BY',
                        'SUPERSEDES','DEPLOYED_IN'
                      )),
  metadata            TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_id, target_id, rel_type)
);

CREATE INDEX IF NOT EXISTS idx_rel_source  ON entity_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_rel_target  ON entity_relationships(target_id);

-- ============================================================
-- LINEAGE CHAINS (denormalized — one row per leaf entity)
-- ============================================================

CREATE TABLE IF NOT EXISTS lineage_chains (
  chain_id            INTEGER PRIMARY KEY AUTOINCREMENT,
  leaf_entity_id      TEXT NOT NULL REFERENCES entities(entity_id),
  leaf_type           TEXT NOT NULL,
  bi_id               TEXT,
  vis_id              TEXT,
  bg_id               TEXT,
  dg_id               TEXT,
  mg_id               TEXT,
  cgg_id              TEXT,
  epic_id             TEXT,
  feat_id             TEXT,
  req_id              TEXT,
  design_id           TEXT,
  task_id             TEXT,
  tc_id               TEXT,
  chain_string        TEXT,
  chain_depth         INTEGER DEFAULT 0,
  is_complete         INTEGER DEFAULT 0 CHECK(is_complete IN (0,1)),
  has_orphan          INTEGER DEFAULT 0 CHECK(has_orphan IN (0,1)),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(leaf_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_lc_bg      ON lineage_chains(bg_id)   WHERE bg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lc_feat    ON lineage_chains(feat_id) WHERE feat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lc_task    ON lineage_chains(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lc_orphan  ON lineage_chains(has_orphan);

-- ============================================================
-- KPI MEASUREMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS kpi_measurements (
  measurement_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  kpi_id              TEXT NOT NULL REFERENCES entities(entity_id),
  measured_at         TEXT NOT NULL DEFAULT (datetime('now')),
  value               REAL NOT NULL,
  target              REAL NOT NULL,
  baseline            REAL,
  pct_of_target       REAL,
  status              TEXT NOT NULL
                      CHECK(status IN ('ON_TRACK','AT_RISK','MISS','ACHIEVED')),
  source              TEXT,
  measurement_period  TEXT,
  notes               TEXT,
  triggered_review    INTEGER DEFAULT 0 CHECK(triggered_review IN (0,1)),
  comm_id             TEXT
);

CREATE INDEX IF NOT EXISTS idx_kpi_entity  ON kpi_measurements(kpi_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_kpi_status  ON kpi_measurements(status, measured_at);

-- ============================================================
-- AGENT / SKILL RUNS
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_runs (
  run_id              TEXT PRIMARY KEY,
  skill_name          TEXT NOT NULL,
  invocation          TEXT,
  phase               TEXT,
  started_at          TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at        TEXT,
  duration_ms         INTEGER,
  status              TEXT NOT NULL DEFAULT 'RUNNING'
                      CHECK(status IN ('RUNNING','COMPLETED','FAILED','BLOCKED','CANCELLED')),
  entities_created    TEXT,
  entities_updated    TEXT,
  decisions_made      TEXT,
  comms_created       TEXT,
  error_message       TEXT,
  blocked_reason      TEXT,
  model_used          TEXT,
  tokens_used         INTEGER,
  session_entity_id   TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_skill   ON agent_runs(skill_name, status);
CREATE INDEX IF NOT EXISTS idx_runs_time    ON agent_runs(started_at);

-- ============================================================
-- AUDIT LOG (immutable append-only)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id           TEXT,
  entity_type         TEXT,
  action              TEXT NOT NULL
                      CHECK(action IN (
                        'CREATE','UPDATE','DELETE','STATE_CHANGE',
                        'LINK','UNLINK','APPROVE','REJECT',
                        'DEPLOY','VERIFY_PASS','VERIFY_FAIL',
                        'TEST_RUN','KPI_MEASURED',
                        'BLOCKER_ADDED','BLOCKER_RESOLVED',
                        'COMMENT','PROJECT_INIT','DB_MIGRATED'
                      )),
  field_changed       TEXT,
  old_value           TEXT,
  new_value           TEXT,
  performed_by        TEXT,
  run_id              TEXT,
  performed_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_log(entity_id, performed_at) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_log(action, performed_at);

-- ============================================================
-- HEALTH CHECKS
-- ============================================================

CREATE TABLE IF NOT EXISTS health_checks (
  check_id            INTEGER PRIMARY KEY AUTOINCREMENT,
  checked_at          TEXT NOT NULL DEFAULT (datetime('now')),
  stage               TEXT,
  layer_1_score       TEXT CHECK(layer_1_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  layer_2_score       TEXT CHECK(layer_2_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  layer_3_score       TEXT CHECK(layer_3_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  layer_4_score       TEXT CHECK(layer_4_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  layer_5_score       TEXT CHECK(layer_5_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  overall_score       INTEGER CHECK(overall_score BETWEEN 0 AND 5),
  total_tasks         INTEGER DEFAULT 0,
  orphan_task_count   INTEGER DEFAULT 0,
  orphan_task_pct     REAL DEFAULT 0,
  total_reqs          INTEGER DEFAULT 0,
  orphan_req_pct      REAL DEFAULT 0,
  total_kpis          INTEGER DEFAULT 0,
  kpi_on_track_pct    REAL DEFAULT 0,
  open_p1_bugs        INTEGER DEFAULT 0,
  open_p2_bugs        INTEGER DEFAULT 0,
  findings            TEXT,
  recommendations     TEXT,
  run_id              TEXT
);

CREATE INDEX IF NOT EXISTS idx_health_time ON health_checks(checked_at);

-- ============================================================
-- PROJECT METRICS (operational time series)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_metrics (
  metric_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_type         TEXT NOT NULL,
  value               REAL NOT NULL,
  unit                TEXT,
  measured_at         TEXT NOT NULL DEFAULT (datetime('now')),
  period              TEXT,
  source              TEXT,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_metrics_type  ON project_metrics(metric_type, measured_at);

-- ============================================================
-- COMMS ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS comms_items (
  comm_id             TEXT PRIMARY KEY,
  category            TEXT NOT NULL
                      CHECK(category IN ('BLOCKER','REVIEW','FYI','CREDENTIAL','DECISION')),
  title               TEXT NOT NULL,
  description         TEXT,
  action_required     TEXT,
  lineage_chain       TEXT,
  linked_entities     TEXT,
  priority            INTEGER DEFAULT 3 CHECK(priority BETWEEN 1 AND 5),
  status              TEXT NOT NULL DEFAULT 'NEW'
                      CHECK(status IN ('NEW','IN_PROGRESS','DONE','REJECTED')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at         TEXT,
  resolved_by         TEXT,
  run_id              TEXT
);

CREATE INDEX IF NOT EXISTS idx_comms_status  ON comms_items(status);
CREATE INDEX IF NOT EXISTS idx_comms_open    ON comms_items(category, status)
                                             WHERE status IN ('NEW','IN_PROGRESS');

-- ============================================================
-- DEPLOYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS deployments (
  dep_entity_id       TEXT PRIMARY KEY REFERENCES entities(entity_id),
  environment         TEXT NOT NULL CHECK(environment IN ('local','staging','prod')),
  commit_sha          TEXT,
  branch              TEXT,
  service_id          TEXT,
  deployed_at         TEXT NOT NULL DEFAULT (datetime('now')),
  status              TEXT NOT NULL DEFAULT 'TRIGGERED'
                      CHECK(status IN ('TRIGGERED','DEPLOYING','LIVE','FAILED','ROLLED_BACK')),
  tasks_included      TEXT,
  vr_entity_id        TEXT,
  rollback_commit     TEXT,
  deploy_duration_s   INTEGER,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_dep_env   ON deployments(environment, status);
CREATE INDEX IF NOT EXISTS idx_dep_time  ON deployments(deployed_at);

-- ============================================================
-- ENTITY ID SEQUENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_sequences (
  entity_type         TEXT NOT NULL,
  year                INTEGER NOT NULL,
  last_seq            INTEGER NOT NULL DEFAULT 0,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (entity_type, year)
);

CREATE TABLE IF NOT EXISTS project_counters (
  counter_key         TEXT PRIMARY KEY,   -- entity_type for project-scoped (AD, DEC, COMM)
  counter_value       INTEGER NOT NULL DEFAULT 0,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed project-scoped counters
INSERT OR IGNORE INTO project_counters(counter_key, counter_value) VALUES
  ('AD',   0),
  ('DEC',  0),
  ('COMM', 0);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW IF NOT EXISTS v_active_bgs AS
SELECT
  e.entity_id, e.title, e.status,
  json_extract(e.metadata, '$.success_metric') AS success_metric,
  json_extract(e.metadata, '$.target_date')    AS target_date,
  json_extract(e.metadata, '$.owner')          AS owner
FROM entities e
WHERE e.entity_type = 'BG' AND e.status = 'ACTIVE' AND e.is_deleted = 0;

CREATE VIEW IF NOT EXISTS v_task_pipeline AS
SELECT
  e.entity_id, e.title, e.status,
  e.bg_id, e.feat_id, e.req_id,
  json_extract(e.metadata, '$.type')      AS task_type,
  json_extract(e.metadata, '$.done_when') AS done_when,
  json_extract(e.metadata, '$.risk')      AS risk,
  e.created_at
FROM entities e
WHERE e.entity_type = 'TASK' AND e.is_deleted = 0;

CREATE VIEW IF NOT EXISTS v_orphaned_tasks AS
SELECT
  e.entity_id, e.title, e.status, e.created_at
FROM entities e
LEFT JOIN lineage_chains lc ON lc.leaf_entity_id = e.entity_id
WHERE e.entity_type = 'TASK'
  AND e.is_deleted = 0
  AND (lc.chain_id IS NULL OR lc.bg_id IS NULL);

CREATE VIEW IF NOT EXISTS v_latest_kpi AS
SELECT
  m.kpi_id, e.title AS kpi_name,
  json_extract(e.metadata, '$.business_goal') AS business_goal,
  m.value, m.target, m.pct_of_target, m.status, m.measured_at
FROM kpi_measurements m
JOIN entities e ON e.entity_id = m.kpi_id
WHERE m.measurement_id IN (
  SELECT MAX(measurement_id) FROM kpi_measurements GROUP BY kpi_id
);

CREATE VIEW IF NOT EXISTS v_open_comms AS
SELECT comm_id, category, priority, title, action_required, lineage_chain,
       created_at,
       ROUND(julianday('now') - julianday(created_at), 1) AS age_days
FROM comms_items
WHERE status IN ('NEW','IN_PROGRESS')
ORDER BY priority ASC, created_at ASC;

CREATE VIEW IF NOT EXISTS v_bg_delivery AS
SELECT
  lc.bg_id,
  COUNT(DISTINCT lc.task_id)                                               AS total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'DONE'        THEN lc.task_id END)  AS done,
  COUNT(DISTINCT CASE WHEN t.status = 'IN_PROGRESS' THEN lc.task_id END)  AS active,
  COUNT(DISTINCT CASE WHEN t.status = 'BLOCKED'     THEN lc.task_id END)  AS blocked,
  COUNT(DISTINCT CASE WHEN t.status = 'QUEUED'      THEN lc.task_id END)  AS queued,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN t.status='DONE' THEN lc.task_id END)
        / NULLIF(COUNT(DISTINCT lc.task_id),0), 1)                         AS pct_done
FROM lineage_chains lc
JOIN entities t ON t.entity_id = lc.task_id AND t.is_deleted = 0
WHERE lc.bg_id IS NOT NULL
GROUP BY lc.bg_id;

CREATE VIEW IF NOT EXISTS v_open_bugs AS
SELECT
  e.entity_id, e.title,
  json_extract(e.metadata, '$.priority')   AS priority,
  json_extract(e.metadata, '$.linked_req') AS linked_req,
  e.bg_id, e.feat_id, e.created_at
FROM entities e
WHERE e.entity_type = 'BUG'
  AND e.status IN ('OPEN','TRIAGED','IN_PROGRESS')
  AND e.is_deleted = 0;

CREATE VIEW IF NOT EXISTS v_health_trend AS
SELECT
  checked_at, overall_score,
  layer_1_score, layer_2_score, layer_3_score, layer_4_score, layer_5_score,
  orphan_task_pct, kpi_on_track_pct, open_p1_bugs,
  ROW_NUMBER() OVER (ORDER BY checked_at DESC) AS recency_rank
FROM health_checks;

CREATE VIEW IF NOT EXISTS v_skill_performance AS
SELECT
  skill_name,
  COUNT(*)                                                    AS run_count,
  SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END)        AS success_count,
  SUM(CASE WHEN status='FAILED'    THEN 1 ELSE 0 END)        AS failure_count,
  SUM(CASE WHEN status='BLOCKED'   THEN 1 ELSE 0 END)        AS blocked_count,
  ROUND(100.0 * SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*),0), 1)                              AS success_rate_pct,
  ROUND(AVG(duration_ms)/1000.0, 1)                          AS avg_duration_s,
  MAX(started_at)                                             AS last_run
FROM agent_runs
WHERE status != 'RUNNING'
GROUP BY skill_name;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER IF NOT EXISTS trg_entities_updated_at
AFTER UPDATE ON entities
BEGIN
  UPDATE entities SET updated_at = datetime('now')
  WHERE entity_id = NEW.entity_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_entities_audit_status
AFTER UPDATE OF status ON entities
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO audit_log(entity_id, entity_type, action, field_changed, old_value, new_value, performed_at)
  VALUES(NEW.entity_id, NEW.entity_type, 'STATE_CHANGE', 'status',
         json_object('status', OLD.status), json_object('status', NEW.status), datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS trg_entities_audit_create
AFTER INSERT ON entities
BEGIN
  INSERT INTO audit_log(entity_id, entity_type, action, new_value, performed_by, performed_at)
  VALUES(NEW.entity_id, NEW.entity_type, 'CREATE',
         json_object('title', NEW.title, 'status', NEW.status, 'parent_id', NEW.parent_id),
         NEW.created_by, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS trg_kpi_audit
AFTER INSERT ON kpi_measurements
BEGIN
  INSERT INTO audit_log(entity_id, entity_type, action, new_value, performed_at)
  VALUES(NEW.kpi_id, 'KPI', 'KPI_MEASURED',
         json_object('value', NEW.value, 'target', NEW.target,
                     'pct_of_target', NEW.pct_of_target, 'status', NEW.status),
         datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS trg_comms_audit
AFTER UPDATE OF status ON comms_items
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO audit_log(entity_id, entity_type, action, field_changed,
                         old_value, new_value, performed_by, performed_at)
  VALUES(NEW.comm_id, 'COMM', 'STATE_CHANGE', 'status',
         json_object('status', OLD.status), json_object('status', NEW.status),
         NEW.resolved_by, datetime('now'));
END;

CREATE TRIGGER IF NOT EXISTS trg_seq_updated_at
AFTER UPDATE ON entity_sequences
BEGIN
  UPDATE entity_sequences SET updated_at = datetime('now')
  WHERE entity_type = NEW.entity_type AND year = NEW.year;
END;

-- ============================================================
-- SEED: project_info is populated by /bds-db init
-- DO NOT INSERT HERE — init script handles it with project-specific values
-- ============================================================
