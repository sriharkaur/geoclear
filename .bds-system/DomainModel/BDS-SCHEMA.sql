-- ============================================================
-- BDS GLOBAL DATABASE SCHEMA
-- Location: ~/.claude/bds.db
-- Purpose: Operational backbone for the Business Delivery System
--          Stores all entity metadata, relationships, lineage,
--          agent execution, health, metrics, audit, and COMMS.
--
-- Design principles:
--   1. Markdown files are AUTHORITATIVE (human-readable, git-trackable)
--   2. This DB is the OPERATIONAL INDEX (queryable, fast, aggregatable)
--   3. Dual-write: every entity creation writes markdown AND inserts here
--   4. All projects share one DB; project_id (3-letter prefix) scopes everything
--   5. Audit log is immutable — never delete, only append
--
-- Version: 1.0 | Created: 2026-04-15
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456;  -- 256MB mmap for large lineage scans

-- ============================================================
-- TIER 0: PROJECT REGISTRY
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  project_id          TEXT PRIMARY KEY,          -- 3-letter prefix: GEO, FIN, MED, etc.
  name                TEXT NOT NULL,
  path                TEXT NOT NULL UNIQUE,       -- absolute filesystem path
  description         TEXT,
  stage               TEXT NOT NULL DEFAULT 'PRE_LAUNCH'
                      CHECK(stage IN ('PRE_LAUNCH','EARLY','GROWTH','SCALE','ENTERPRISE')),
  status              TEXT NOT NULL DEFAULT 'ACTIVE'
                      CHECK(status IN ('ACTIVE','ARCHIVED','PAUSED')),
  product_type        TEXT,                       -- API_SERVICE | SAAS_WEB_APP | etc.
  stack               TEXT,                       -- JSON: {language, framework, db, deploy, port}
  prod_url            TEXT,
  north_star          TEXT,                       -- one-sentence north star
  bi_entity_id        TEXT,                       -- BI-YYYY-0001 root
  vis_entity_id       TEXT,                       -- VIS-YYYY-0001
  current_mrr         REAL DEFAULT 0,
  paying_customers    INTEGER DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- TIER 1-7: ENTITIES (master table — all 28 entity types)
-- ============================================================

CREATE TABLE IF NOT EXISTS entities (
  entity_id           TEXT PRIMARY KEY,           -- {PREFIX}-{TYPE}-{YYYY}-{NNNN}
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  entity_type         TEXT NOT NULL
                      CHECK(entity_type IN (
                        -- Tier 1: Business
                        'BI','VIS','BG','MG','DG','CGG',
                        -- Tier 2: Strategy
                        'STRAT','PER','COMP','KPI','TIER',
                        -- Tier 3: Planning
                        'EPIC','FEAT','REQ','DESIGN','AD',
                        -- Tier 4: Engineering
                        'TASK','EP','DM','MIG',
                        -- Tier 5: Quality
                        'TC','TR','BUG',
                        -- Tier 6: Operations
                        'DEP','VR','INC','RB',
                        -- Tier 7: Governance
                        'DEC','COMM','SESSION'
                      )),
  tier                INTEGER NOT NULL CHECK(tier BETWEEN 1 AND 7),
  title               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'ACTIVE',
  parent_id           TEXT REFERENCES entities(entity_id),  -- primary parent in hierarchy
  file_path           TEXT,             -- relative path to markdown source file
  version             TEXT DEFAULT '1.0',
  -- Lineage denormalized fields (fast lookup without join)
  bg_id               TEXT,            -- which BG does this entity serve?
  dg_id               TEXT,            -- which DG?
  epic_id             TEXT,            -- which EPIC?
  feat_id             TEXT,            -- which FEAT?
  req_id              TEXT,            -- which REQ?
  -- Metadata (entity-type-specific fields stored as JSON)
  metadata            TEXT,            -- JSON blob
  -- Audit fields
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  created_by          TEXT,            -- skill name: 'dev-requirements', 'bds-bootstrap', etc.
  is_deleted          INTEGER DEFAULT 0 CHECK(is_deleted IN (0,1))
);

CREATE INDEX IF NOT EXISTS idx_entities_project      ON entities(project_id);
CREATE INDEX IF NOT EXISTS idx_entities_type         ON entities(project_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_parent       ON entities(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_status       ON entities(project_id, status);
CREATE INDEX IF NOT EXISTS idx_entities_tier         ON entities(project_id, tier);
CREATE INDEX IF NOT EXISTS idx_entities_bg           ON entities(bg_id) WHERE bg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_feat         ON entities(feat_id) WHERE feat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_created      ON entities(project_id, created_at);

-- ============================================================
-- ENTITY RELATIONSHIPS (N:M — supplements parent_id for complex links)
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_relationships (
  rel_id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  source_id           TEXT NOT NULL REFERENCES entities(entity_id),
  target_id           TEXT NOT NULL REFERENCES entities(entity_id),
  rel_type            TEXT NOT NULL
                      CHECK(rel_type IN (
                        'PARENT_OF',      -- BG → DG, EPIC → FEAT, etc.
                        'LINKED_TO',      -- peer association
                        'DEPENDS_ON',     -- TASK → TASK (blocking dependency)
                        'BLOCKS',         -- TASK blocks another TASK
                        'TESTS',          -- TC tests REQ acceptance criterion
                        'FIXES',          -- TASK fixes BUG
                        'TRIGGERS',       -- KPI miss triggers new REQ
                        'IMPLEMENTS',     -- TASK implements DESIGN section
                        'SATISFIES',      -- DESIGN satisfies REQ
                        'MEASURED_BY',    -- BG/MG/CGG measured by KPI
                        'GENERATED_BY',   -- TR generated by running TC
                        'SUPERSEDES',     -- new entity supersedes old one
                        'DEPLOYED_IN'     -- TASK deployed in DEP
                      )),
  metadata            TEXT,              -- JSON: {description, weight, etc.}
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_id, target_id, rel_type)
);

CREATE INDEX IF NOT EXISTS idx_rel_source    ON entity_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_rel_target    ON entity_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_rel_type      ON entity_relationships(project_id, rel_type);

-- ============================================================
-- LINEAGE CHAINS (denormalized — one row per leaf entity)
-- Fast bidirectional trace without recursive CTE
-- ============================================================

CREATE TABLE IF NOT EXISTS lineage_chains (
  chain_id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  leaf_entity_id      TEXT NOT NULL REFERENCES entities(entity_id),
  leaf_type           TEXT NOT NULL,    -- entity_type of the leaf
  -- Full chain populated as entities are created
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
  -- Computed
  chain_string        TEXT,    -- "GEO-BI-2026-0001 › GEO-VIS-2026-0001 › ..."
  chain_depth         INTEGER DEFAULT 0,
  is_complete         INTEGER DEFAULT 0 CHECK(is_complete IN (0,1)),
  -- is_complete = 1: BI through TASK all populated (full L1 chain)
  has_orphan          INTEGER DEFAULT 0 CHECK(has_orphan IN (0,1)),
  -- has_orphan = 1: any required link is NULL
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(leaf_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_lineage_project   ON lineage_chains(project_id);
CREATE INDEX IF NOT EXISTS idx_lineage_bg        ON lineage_chains(bg_id) WHERE bg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lineage_feat      ON lineage_chains(feat_id) WHERE feat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lineage_task      ON lineage_chains(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lineage_complete  ON lineage_chains(project_id, is_complete);
CREATE INDEX IF NOT EXISTS idx_lineage_orphan    ON lineage_chains(project_id, has_orphan);

-- ============================================================
-- KPI MEASUREMENTS (time series — one row per measurement event)
-- ============================================================

CREATE TABLE IF NOT EXISTS kpi_measurements (
  measurement_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  kpi_id              TEXT NOT NULL REFERENCES entities(entity_id),
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  measured_at         TEXT NOT NULL DEFAULT (datetime('now')),
  value               REAL NOT NULL,
  target              REAL NOT NULL,
  baseline            REAL,
  pct_of_target       REAL,             -- (value/target)*100, computed on insert
  status              TEXT NOT NULL
                      CHECK(status IN ('ON_TRACK','AT_RISK','MISS','ACHIEVED')),
  source              TEXT,             -- 'manual' | 'stripe' | 'api_logs' | 'analytics'
  measurement_period  TEXT,             -- 'daily' | 'weekly' | 'monthly'
  notes               TEXT,
  triggered_review    INTEGER DEFAULT 0 CHECK(triggered_review IN (0,1)),
  comm_id             TEXT             -- COMM item created if triggered_review=1
);

CREATE INDEX IF NOT EXISTS idx_kpi_entity    ON kpi_measurements(kpi_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_kpi_project   ON kpi_measurements(project_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_kpi_status    ON kpi_measurements(project_id, status, measured_at);

-- ============================================================
-- AGENT / SKILL RUNS (execution tracking for every skill invocation)
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_runs (
  run_id              TEXT PRIMARY KEY,           -- UUID or SESSION-datetime
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  skill_name          TEXT NOT NULL,              -- 'dev-requirements', 'bds', etc.
  invocation          TEXT,                       -- full command: '/dev-requirements REQ-...'
  phase               TEXT,                       -- for multi-phase skills: 'Phase 2', etc.
  started_at          TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at        TEXT,
  duration_ms         INTEGER,                    -- filled on completion
  status              TEXT NOT NULL DEFAULT 'RUNNING'
                      CHECK(status IN ('RUNNING','COMPLETED','FAILED','BLOCKED','CANCELLED')),
  entities_created    TEXT,                       -- JSON array: ["GEO-REQ-2026-0001", ...]
  entities_updated    TEXT,                       -- JSON array
  decisions_made      TEXT,                       -- JSON array: ["GEO-DEC-0001", ...]
  comms_created       TEXT,                       -- JSON array: ["GEO-COMM-0001", ...]
  error_message       TEXT,
  blocked_reason      TEXT,
  model_used          TEXT,                       -- 'claude-sonnet-4-6' | 'claude-opus-4-6'
  tokens_used         INTEGER,
  session_entity_id   TEXT                        -- SESSION entity_id if created
);

CREATE INDEX IF NOT EXISTS idx_runs_project  ON agent_runs(project_id, started_at);
CREATE INDEX IF NOT EXISTS idx_runs_skill    ON agent_runs(skill_name, status);
CREATE INDEX IF NOT EXISTS idx_runs_status   ON agent_runs(project_id, status);

-- ============================================================
-- AUDIT LOG (immutable append-only event history)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id          TEXT NOT NULL,
  entity_id           TEXT,                -- NULL for project-level actions
  entity_type         TEXT,
  action              TEXT NOT NULL
                      CHECK(action IN (
                        'CREATE','UPDATE','DELETE','STATE_CHANGE',
                        'LINK','UNLINK','APPROVE','REJECT',
                        'DEPLOY','VERIFY_PASS','VERIFY_FAIL',
                        'TEST_RUN','KPI_MEASURED',
                        'BLOCKER_ADDED','BLOCKER_RESOLVED',
                        'COMMENT','PROJECT_REGISTERED','DB_MIGRATED'
                      )),
  field_changed       TEXT,                -- which field changed
  old_value           TEXT,                -- JSON snapshot
  new_value           TEXT,                -- JSON snapshot
  performed_by        TEXT,                -- skill name or 'user'
  run_id              TEXT,                -- agent_runs.run_id
  performed_at        TEXT NOT NULL DEFAULT (datetime('now'))
  -- NOTE: No FK on entity_id — audit log is intentionally denormalized
  -- so deleted entities still have a history
);

CREATE INDEX IF NOT EXISTS idx_audit_entity   ON audit_log(entity_id, performed_at) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_project  ON audit_log(project_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_log(action, performed_at);

-- ============================================================
-- HEALTH CHECKS (BDS /bds score over time — Layers 1–5)
-- ============================================================

CREATE TABLE IF NOT EXISTS health_checks (
  check_id            INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  checked_at          TEXT NOT NULL DEFAULT (datetime('now')),
  stage               TEXT,
  -- Layer scores
  layer_1_score       TEXT CHECK(layer_1_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  layer_2_score       TEXT CHECK(layer_2_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  layer_3_score       TEXT CHECK(layer_3_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  layer_4_score       TEXT CHECK(layer_4_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  layer_5_score       TEXT CHECK(layer_5_score IN ('STRONG','AT_RISK','CRITICAL','NA')),
  overall_score       INTEGER CHECK(overall_score BETWEEN 0 AND 5),
  -- Lineage metrics (computed at check time)
  total_tasks         INTEGER DEFAULT 0,
  orphan_task_count   INTEGER DEFAULT 0,
  orphan_task_pct     REAL DEFAULT 0,
  total_reqs          INTEGER DEFAULT 0,
  orphan_req_count    INTEGER DEFAULT 0,
  orphan_req_pct      REAL DEFAULT 0,
  total_kpis          INTEGER DEFAULT 0,
  kpi_on_track        INTEGER DEFAULT 0,
  kpi_on_track_pct    REAL DEFAULT 0,
  open_p1_bugs        INTEGER DEFAULT 0,
  open_p2_bugs        INTEGER DEFAULT 0,
  -- Findings and recommendations
  findings            TEXT,            -- JSON: {"layer_1": "finding text", ...}
  recommendations     TEXT,            -- JSON: [{"rule": "R1", "action": "...", "why": "..."}]
  run_id              TEXT
);

CREATE INDEX IF NOT EXISTS idx_health_project ON health_checks(project_id, checked_at);

-- ============================================================
-- PROJECT METRICS (operational time series — MRR, latency, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_metrics (
  metric_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  metric_type         TEXT NOT NULL,   -- 'MRR','CUSTOMERS','CHURN_RATE','LATENCY_P99',
                                       -- 'API_CALLS','ERROR_RATE','CAC','LTV','NRR', etc.
  value               REAL NOT NULL,
  unit                TEXT,            -- 'USD', 'ms', 'count', '%', 'ratio'
  measured_at         TEXT NOT NULL DEFAULT (datetime('now')),
  period              TEXT,            -- 'daily' | 'weekly' | 'monthly'
  source              TEXT,            -- 'stripe' | 'render' | 'manual' | 'api_logs'
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_metrics_type    ON project_metrics(project_id, metric_type, measured_at);
CREATE INDEX IF NOT EXISTS idx_metrics_time    ON project_metrics(project_id, measured_at);

-- ============================================================
-- COMMS ITEMS (mirror of COMMS.md — fast status/query access)
-- ============================================================

CREATE TABLE IF NOT EXISTS comms_items (
  comm_id             TEXT PRIMARY KEY,            -- {PREFIX}-COMM-{NNNN}
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  category            TEXT NOT NULL
                      CHECK(category IN ('BLOCKER','REVIEW','FYI','CREDENTIAL','DECISION')),
  title               TEXT NOT NULL,
  description         TEXT,
  action_required     TEXT,
  lineage_chain       TEXT,                        -- full lineage string for context
  linked_entities     TEXT,                        -- JSON array of entity_ids
  priority            INTEGER DEFAULT 3
                      CHECK(priority BETWEEN 1 AND 5),
  status              TEXT NOT NULL DEFAULT 'NEW'
                      CHECK(status IN ('NEW','IN_PROGRESS','DONE','REJECTED')),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at         TEXT,
  resolved_by         TEXT,
  run_id              TEXT
);

CREATE INDEX IF NOT EXISTS idx_comms_project  ON comms_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_comms_open     ON comms_items(project_id, category, status)
                                              WHERE status IN ('NEW','IN_PROGRESS');

-- ============================================================
-- DEPLOYMENTS (mirror of RELEASES.md entries)
-- ============================================================

CREATE TABLE IF NOT EXISTS deployments (
  dep_entity_id       TEXT PRIMARY KEY REFERENCES entities(entity_id),
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  environment         TEXT NOT NULL CHECK(environment IN ('local','staging','prod')),
  commit_sha          TEXT,
  branch              TEXT,
  service_id          TEXT,            -- Render/Railway/Vercel service ID
  deployed_at         TEXT NOT NULL DEFAULT (datetime('now')),
  status              TEXT NOT NULL DEFAULT 'TRIGGERED'
                      CHECK(status IN ('TRIGGERED','DEPLOYING','LIVE','FAILED','ROLLED_BACK')),
  tasks_included      TEXT,            -- JSON array of TASK-IDs
  vr_entity_id        TEXT REFERENCES entities(entity_id),
  rollback_commit     TEXT,
  deploy_duration_s   INTEGER,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_dep_project  ON deployments(project_id, deployed_at);
CREATE INDEX IF NOT EXISTS idx_dep_env      ON deployments(project_id, environment, status);

-- ============================================================
-- ENTITY ID SEQUENCES (per-project, per-type, per-year counter)
-- Enables next_id() without scanning the entities table
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_sequences (
  project_id          TEXT NOT NULL REFERENCES projects(project_id),
  entity_type         TEXT NOT NULL,
  year                INTEGER NOT NULL,
  last_seq            INTEGER NOT NULL DEFAULT 0,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (project_id, entity_type, year)
);

-- ============================================================
-- GLOBAL COUNTERS (for non-year-scoped sequences: COMM, DEC)
-- ============================================================

CREATE TABLE IF NOT EXISTS global_counters (
  counter_key         TEXT PRIMARY KEY,   -- '{project_id}_{entity_type}'
  counter_value       INTEGER NOT NULL DEFAULT 0,
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- VIEWS — Prebuilt queries for reports and dashboard
-- ============================================================

-- Active business goals with KPI progress
CREATE VIEW IF NOT EXISTS v_bg_status AS
SELECT
  e.entity_id,
  e.project_id,
  e.title,
  e.status,
  json_extract(e.metadata, '$.success_metric')   AS success_metric,
  json_extract(e.metadata, '$.target_date')       AS target_date,
  json_extract(e.metadata, '$.owner')             AS owner,
  (SELECT COUNT(*)
   FROM entity_relationships r
   WHERE r.source_id = e.entity_id AND r.rel_type = 'MEASURED_BY') AS kpi_count,
  (SELECT ROUND(AVG(m.pct_of_target), 1)
   FROM kpi_measurements m
   JOIN entity_relationships r ON r.target_id = m.kpi_id
   WHERE r.source_id = e.entity_id
     AND r.rel_type = 'MEASURED_BY'
     AND m.measurement_id IN (
       SELECT MAX(m2.measurement_id) FROM kpi_measurements m2 GROUP BY m2.kpi_id
     )
  ) AS avg_kpi_pct_of_target,
  (SELECT COUNT(*)
   FROM entity_relationships r
   WHERE r.source_id = e.entity_id AND r.rel_type = 'PARENT_OF'
     AND (SELECT entity_type FROM entities WHERE entity_id = r.target_id) = 'DG'
  ) AS dg_count
FROM entities e
WHERE e.entity_type = 'BG' AND e.is_deleted = 0;

-- Delivery pipeline: task completion per BG
CREATE VIEW IF NOT EXISTS v_bg_delivery AS
SELECT
  lc.bg_id,
  lc.project_id,
  COUNT(DISTINCT lc.task_id)                                          AS total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'DONE'        THEN lc.task_id END) AS done_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'IN_PROGRESS' THEN lc.task_id END) AS active_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'BLOCKED'     THEN lc.task_id END) AS blocked_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'QUEUED'      THEN lc.task_id END) AS queued_tasks,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN t.status = 'DONE' THEN lc.task_id END)
    / NULLIF(COUNT(DISTINCT lc.task_id), 0), 1
  ) AS pct_done,
  COUNT(DISTINCT lc.feat_id)                                          AS total_feats,
  COUNT(DISTINCT CASE WHEN f.status = 'SHIPPED' THEN lc.feat_id END) AS shipped_feats
FROM lineage_chains lc
JOIN entities t ON t.entity_id = lc.task_id AND t.is_deleted = 0
LEFT JOIN entities f ON f.entity_id = lc.feat_id AND f.is_deleted = 0
WHERE lc.bg_id IS NOT NULL AND lc.task_id IS NOT NULL
GROUP BY lc.bg_id, lc.project_id;

-- Orphaned entities (missing BG link in lineage)
CREATE VIEW IF NOT EXISTS v_orphaned_entities AS
SELECT
  e.entity_id,
  e.project_id,
  e.entity_type,
  e.title,
  e.status,
  e.created_at,
  CASE
    WHEN lc.chain_id IS NULL THEN 'NO_LINEAGE_RECORD'
    WHEN lc.bg_id IS NULL    THEN 'MISSING_BG_LINK'
    WHEN lc.feat_id IS NULL AND e.entity_type IN ('REQ','DESIGN','TASK') THEN 'MISSING_FEAT_LINK'
    WHEN lc.req_id IS NULL  AND e.entity_type IN ('DESIGN','TASK','TC')  THEN 'MISSING_REQ_LINK'
    ELSE 'PARTIAL_CHAIN'
  END AS orphan_reason
FROM entities e
LEFT JOIN lineage_chains lc ON lc.leaf_entity_id = e.entity_id
WHERE e.entity_type IN ('TASK','REQ','FEAT','DESIGN','TC','BUG')
  AND e.is_deleted = 0
  AND (lc.chain_id IS NULL OR lc.bg_id IS NULL
       OR (e.entity_type IN ('REQ','DESIGN','TASK') AND lc.feat_id IS NULL));

-- Latest KPI value per KPI entity
CREATE VIEW IF NOT EXISTS v_latest_kpi AS
SELECT
  m.kpi_id,
  e.project_id,
  e.title                                                AS kpi_name,
  json_extract(e.metadata, '$.business_goal')           AS business_goal,
  json_extract(e.metadata, '$.metric_definition')       AS metric_definition,
  json_extract(e.metadata, '$.measurement_period')      AS period,
  m.value,
  m.target,
  m.baseline,
  m.pct_of_target,
  m.status,
  m.measured_at,
  m.source
FROM kpi_measurements m
JOIN entities e ON e.entity_id = m.kpi_id
WHERE m.measurement_id IN (
  SELECT MAX(measurement_id) FROM kpi_measurements GROUP BY kpi_id
);

-- Open COMMS by project and category
CREATE VIEW IF NOT EXISTS v_open_comms AS
SELECT
  ci.comm_id,
  ci.project_id,
  ci.category,
  ci.priority,
  ci.title,
  ci.action_required,
  ci.lineage_chain,
  ci.created_at,
  ROUND(julianday('now') - julianday(ci.created_at), 1) AS age_days
FROM comms_items ci
WHERE ci.status IN ('NEW','IN_PROGRESS')
ORDER BY ci.priority ASC, ci.created_at ASC;

-- Health trend (most recent 10 checks per project)
CREATE VIEW IF NOT EXISTS v_health_trend AS
SELECT
  project_id,
  checked_at,
  overall_score,
  layer_1_score, layer_2_score, layer_3_score, layer_4_score, layer_5_score,
  orphan_task_pct,
  kpi_on_track_pct,
  open_p1_bugs,
  ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY checked_at DESC) AS recency_rank
FROM health_checks;

-- Skill performance (success rate, avg duration)
CREATE VIEW IF NOT EXISTS v_skill_performance AS
SELECT
  project_id,
  skill_name,
  COUNT(*)                                                           AS run_count,
  SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)             AS success_count,
  SUM(CASE WHEN status = 'FAILED'    THEN 1 ELSE 0 END)             AS failure_count,
  SUM(CASE WHEN status = 'BLOCKED'   THEN 1 ELSE 0 END)             AS blocked_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0), 1)                                   AS success_rate_pct,
  ROUND(AVG(duration_ms) / 1000.0, 1)                               AS avg_duration_s,
  MAX(started_at)                                                    AS last_run
FROM agent_runs
WHERE status != 'RUNNING'
GROUP BY project_id, skill_name;

-- Full lineage report for a BG (used by /domain-lineage chain)
CREATE VIEW IF NOT EXISTS v_bg_lineage_full AS
SELECT
  lc.project_id,
  lc.bg_id,
  bg.title     AS bg_title,
  bg.status    AS bg_status,
  lc.dg_id,
  dg.title     AS dg_title,
  lc.epic_id,
  ep.title     AS epic_title,
  lc.feat_id,
  ft.title     AS feat_title,
  ft.status    AS feat_status,
  lc.req_id,
  rq.title     AS req_title,
  rq.status    AS req_status,
  lc.design_id,
  ds.title     AS design_title,
  ds.status    AS design_status,
  lc.task_id,
  tk.title     AS task_title,
  tk.status    AS task_status,
  lc.is_complete,
  lc.has_orphan,
  lc.chain_string
FROM lineage_chains lc
LEFT JOIN entities bg ON bg.entity_id = lc.bg_id
LEFT JOIN entities dg ON dg.entity_id = lc.dg_id
LEFT JOIN entities ep ON ep.entity_id = lc.epic_id
LEFT JOIN entities ft ON ft.entity_id = lc.feat_id
LEFT JOIN entities rq ON rq.entity_id = lc.req_id
LEFT JOIN entities ds ON ds.entity_id = lc.design_id
LEFT JOIN entities tk ON tk.entity_id = lc.task_id
WHERE lc.bg_id IS NOT NULL;

-- ============================================================
-- TRIGGERS — Auto-maintain updated_at, audit log, sequences
-- ============================================================

-- entities: auto updated_at
CREATE TRIGGER IF NOT EXISTS trg_entities_updated_at
AFTER UPDATE ON entities
BEGIN
  UPDATE entities SET updated_at = datetime('now')
  WHERE entity_id = NEW.entity_id;
END;

-- entities: auto audit on status change
CREATE TRIGGER IF NOT EXISTS trg_entities_audit_status
AFTER UPDATE OF status ON entities
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO audit_log(
    project_id, entity_id, entity_type, action,
    field_changed, old_value, new_value, performed_at
  ) VALUES (
    NEW.project_id, NEW.entity_id, NEW.entity_type,
    'STATE_CHANGE', 'status',
    json_object('status', OLD.status),
    json_object('status', NEW.status),
    datetime('now')
  );
END;

-- entities: auto audit on creation
CREATE TRIGGER IF NOT EXISTS trg_entities_audit_create
AFTER INSERT ON entities
BEGIN
  INSERT INTO audit_log(
    project_id, entity_id, entity_type, action, new_value, performed_by, performed_at
  ) VALUES (
    NEW.project_id, NEW.entity_id, NEW.entity_type,
    'CREATE',
    json_object('title', NEW.title, 'status', NEW.status, 'parent_id', NEW.parent_id),
    NEW.created_by,
    datetime('now')
  );
END;

-- projects: auto updated_at
CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
AFTER UPDATE ON projects
BEGIN
  UPDATE projects SET updated_at = datetime('now')
  WHERE project_id = NEW.project_id;
END;

-- kpi_measurements: auto compute pct_of_target
CREATE TRIGGER IF NOT EXISTS trg_kpi_pct_compute
BEFORE INSERT ON kpi_measurements
BEGIN
  SELECT RAISE(ABORT, 'target must be non-zero')
  WHERE NEW.target = 0;
END;

-- entity_sequences: auto updated_at
CREATE TRIGGER IF NOT EXISTS trg_seq_updated_at
AFTER UPDATE ON entity_sequences
BEGIN
  UPDATE entity_sequences SET updated_at = datetime('now')
  WHERE project_id = NEW.project_id
    AND entity_type = NEW.entity_type
    AND year = NEW.year;
END;

-- ============================================================
-- SEED DATA — BDS meta-project (tracks the BDS system itself)
-- ============================================================

INSERT OR IGNORE INTO projects(
  project_id, name, path, description, stage, status, north_star
) VALUES (
  'BDS',
  'Business Delivery System',
  '/Users/' || (SELECT TRIM(SUBSTR(REPLACE(REPLACE(quote(''), '''', ''), '"', ''), 1)) FROM (SELECT '' AS unused)),
  'The BDS global framework — skills, domain model, and operational backbone',
  'SCALE',
  'ACTIVE',
  'Enable any founder to go from business idea to profitable product with Google/Meta-caliber execution'
);

-- ============================================================
-- HELPER: next_entity_id(project_id, entity_type) concept
-- Usage in Claude skills: increment entity_sequences, format ID
-- SQL pattern for getting next ID:
--
--   INSERT INTO entity_sequences(project_id, entity_type, year, last_seq)
--   VALUES('{PFX}', '{TYPE}', {YYYY}, 1)
--   ON CONFLICT(project_id, entity_type, year) DO UPDATE
--   SET last_seq = last_seq + 1;
--
--   SELECT project_id || '-' || entity_type || '-' || year || '-'
--          || printf('%04d', last_seq) AS next_id
--   FROM entity_sequences
--   WHERE project_id = '{PFX}' AND entity_type = '{TYPE}' AND year = {YYYY};
--
-- ============================================================
