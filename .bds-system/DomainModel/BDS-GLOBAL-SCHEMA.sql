-- ============================================================
-- BDS GLOBAL FRAMEWORK DATABASE SCHEMA
-- Location: ~/.claude/bds-global.db
-- Purpose: Framework metadata — READ-ONLY reference for all projects.
--          Projects NEVER write to this DB. They inherit FROM it.
--          Contains: skill registry, entity type definitions, lineage
--          chain rules, quality gates, BDS framework versioning.
--
-- Design principles:
--   1. This DB is the FRAMEWORK REFERENCE — definitions, not data
--   2. Projects copy the project schema (BDS-PROJECT-SCHEMA.sql) on init
--   3. Zero FK or live links FROM project DBs TO this DB
--   4. Upgrading this DB: bump bds_version; project DBs run /bds-db upgrade
--
-- Version: 1.0 | Created: 2026-04-15
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================
-- BDS FRAMEWORK VERSION
-- ============================================================

CREATE TABLE IF NOT EXISTS bds_framework (
  id                  INTEGER PRIMARY KEY DEFAULT 1,    -- singleton
  version             TEXT NOT NULL DEFAULT '1.0',
  released_at         TEXT NOT NULL DEFAULT (datetime('now')),
  changelog           TEXT,                             -- JSON array of change notes
  min_schema_version  TEXT DEFAULT '1.0',               -- min project schema version compatible
  skills_count        INTEGER DEFAULT 0,
  entity_types_count  INTEGER DEFAULT 28
);

INSERT OR IGNORE INTO bds_framework(id, version) VALUES(1, '1.0');

-- ============================================================
-- SKILL REGISTRY
-- ============================================================

CREATE TABLE IF NOT EXISTS skills_registry (
  skill_id            TEXT PRIMARY KEY,    -- e.g. 'dev-requirements', 'bds-bootstrap'
  display_name        TEXT NOT NULL,
  description         TEXT,
  file_path           TEXT NOT NULL DEFAULT '',  -- relative to ~/.claude/skills/
  tier                TEXT,                -- 'dev' | 'strategy' | 'bds' | 'domain' | 'ops'
  entry_point         TEXT,               -- invocation command: '/dev-requirements'
  version             TEXT DEFAULT '1.0',
  model_preference    TEXT DEFAULT 'sonnet',  -- 'sonnet' | 'opus' | 'haiku'
  requires_opus       INTEGER DEFAULT 0,       -- 1 if Opus is required (councils, etc.)
  is_orchestrator     INTEGER DEFAULT 0,       -- 1 if this skill invokes other skills
  reads_entities      TEXT,               -- JSON array: entity types this skill reads
  creates_entities    TEXT,               -- JSON array: entity types this skill creates
  updates_entities    TEXT,               -- JSON array: entity types this skill updates
  added_in_version    TEXT DEFAULT '1.0',
  is_active           INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO skills_registry(skill_id, display_name, tier, entry_point, is_orchestrator, creates_entities) VALUES
  ('bds-bootstrap',      'New Project Bootstrap',        'bds',      '/bds-bootstrap',      1, '["BI","VIS","BG","MG","DG","CGG","KPI","EPIC","FEAT","REQ","DESIGN","TASK","COMM","SESSION"]'),
  ('bds',                'Business Health Check',        'bds',      '/bds',                1, '["SESSION"]'),
  ('bds-customize',      'BDS Council Customization',    'bds',      '/bds-customize',      1, '["AD","DEC"]'),
  ('bds-import',         'BDS Framework Import',         'bds',      '/bds-import',         0, NULL),
  ('bds-db',             'BDS Database Operations',      'bds',      '/bds-db',             0, NULL),
  ('domain-lineage',     'Entity Lineage & Traceability','domain',   '/domain-lineage',     0, NULL),
  ('dev',                'Engineering Meta-Orchestrator','dev',       '/dev',               1, '["SESSION"]'),
  ('dev-requirements',   'Requirements Engineering',     'dev',       '/dev-requirements',  0, '["REQ"]'),
  ('dev-design',         'Design Document & Review',     'dev',       '/dev-design',        0, '["DESIGN","AD"]'),
  ('dev-plan',           'Task Planning',                'dev',       '/dev-plan',          0, '["TASK"]'),
  ('dev-build',          'Build Phase',                  'dev',       '/dev-build',         0, NULL),
  ('dev-test',           'Test Phase',                   'dev',       '/dev-test',          0, '["TC","TR","BUG"]'),
  ('dev-deploy',         'Deploy Phase',                 'dev',       '/dev-deploy',        0, '["DEP"]'),
  ('dev-verify',         'Verification Phase',           'dev',       '/dev-verify',        0, '["VR","INC"]'),
  ('dev-docs',           'Documentation Phase',          'dev',       '/dev-docs',          0, '["RB"]'),
  ('dev-commit',         'Commit Phase',                 'dev',       '/dev-commit',        0, NULL),
  ('strategy',           'Strategy Meta-Orchestrator',   'strategy',  '/strategy',          1, '["SESSION"]'),
  ('strategy-swot',      'SWOT Analysis',                'strategy',  '/strategy-swot',     0, '["STRAT"]'),
  ('strategy-personas',  'Customer Personas',            'strategy',  '/strategy-personas', 0, '["PER","STRAT"]'),
  ('strategy-pricing',   'Pricing Strategy',             'strategy',  '/strategy-pricing',  0, '["TIER","STRAT"]'),
  ('strategy-gtm',       'Go-to-Market Plan',            'strategy',  '/strategy-gtm',      0, '["MG","STRAT"]'),
  ('strategy-kpis',      'KPI Dashboard',                'strategy',  '/strategy-kpis',     0, '["KPI","STRAT"]'),
  ('strategy-90day',     '90-Day Execution Plan',        'strategy',  '/strategy-90day',    0, '["BG","DG","CGG","STRAT"]'),
  ('business-goal',      'North Star Goal Management',   'bds',       '/business-goal',     0, '["VIS","BG"]'),
  ('cpm',                'Chief Program Manager',        'bds',       '/cpm',               0, '["SESSION"]'),
  ('project-init',       'Project Structure Init',       'bds',       '/project-init',      0, NULL),
  ('comms',              'Communications Hub',           'bds',       '/comms',             0, '["COMM"]');

-- ============================================================
-- ENTITY TYPE DEFINITIONS (the 28 entity types)
-- ============================================================

CREATE TABLE IF NOT EXISTS entity_type_definitions (
  entity_type         TEXT PRIMARY KEY,
  display_name        TEXT NOT NULL,
  tier                INTEGER NOT NULL CHECK(tier BETWEEN 1 AND 7),
  tier_name           TEXT NOT NULL,
  id_format           TEXT NOT NULL,       -- e.g. '{PREFIX}-REQ-{YYYY}-{NNNN}'
  id_scope            TEXT NOT NULL,       -- 'year' | 'project' | 'timestamp'
  description         TEXT NOT NULL,
  created_by_skill    TEXT,               -- which skill typically creates this
  file_location       TEXT,               -- relative path pattern
  primary_parent_type TEXT,               -- entity_type of natural parent
  lifecycle_states    TEXT NOT NULL,       -- JSON array of valid states
  required_fields     TEXT,               -- JSON array of required metadata fields
  is_core             INTEGER DEFAULT 1    -- 0 = optional/advanced
);

INSERT OR IGNORE INTO entity_type_definitions VALUES
-- Tier 1: Business
('BI',      'BusinessIdea',         1, 'Business',    '{PFX}-BI-{YYYY}-{NNNN}',     'year',      'Root entity: the raw founding idea',                           'bds-bootstrap',   'strategy/BUSINESS-IDEAS.md',      NULL,       '["CAPTURED","REFINED","ACTIVE","PIVOTED","ARCHIVED"]',          '["raw_idea","problem","target_user","business_model"]', 1),
('VIS',     'Vision',               1, 'Business',    '{PFX}-VIS-{YYYY}-{NNNN}',    'year',      '3-year horizon: specific and measurable destination',           'business-goal',   'BUSINESS-GOAL.md',                'BI',       '["DRAFT","COUNCIL_APPROVED","ACTIVE","REVISED","ACHIEVED"]',    '["statement","horizon_years"]',    1),
('BG',      'BusinessGoal',         1, 'Business',    '{PFX}-BG-{YYYY}-{NNNN}',     'year',      'SMART quarterly objective — one metric, one deadline',          'business-goal',   'BUSINESS-GOAL.md',                'VIS',      '["DRAFT","APPROVED","ACTIVE","ACHIEVED","MISSED","PIVOTED"]',   '["success_metric","target_date","owner"]', 1),
('MG',      'MarketingGoal',        1, 'Business',    '{PFX}-MG-{YYYY}-{NNNN}',     'year',      'Marketing objective derived from a BusinessGoal',              'strategy-gtm',    'strategy/GOALS-MARKETING.md',     'BG',       '["DRAFT","ACTIVE","ACHIEVED","MISSED"]',                        '["channel","metric","target","timeline"]', 1),
('DG',      'DevGoal',              1, 'Business',    '{PFX}-DG-{YYYY}-{NNNN}',     'year',      'Engineering objective derived from a BusinessGoal',            'strategy-90day',  'strategy/GOALS-DEV.md',           'BG',       '["DRAFT","ACTIVE","ACHIEVED","MISSED"]',                        '["engineering_outcome","success_metric","target_date"]', 1),
('CGG',     'CustomerGrowthGoal',   1, 'Business',    '{PFX}-CGG-{YYYY}-{NNNN}',    'year',      'AARRR customer growth objective derived from a BusinessGoal',  'strategy-kpis',   'strategy/GOALS-CUSTOMER.md',      'BG',       '["DRAFT","ACTIVE","ACHIEVED","MISSED"]',                        '["aarrr_category","metric","target"]', 1),
-- Tier 2: Strategy
('STRAT',   'StrategyAnalysis',     2, 'Strategy',    '{PFX}-STRAT-{YYYY}-{NNNN}',  'year',      'A timestamped strategy analysis (SWOT, pricing, GTM, etc.)',   'strategy',        'strategy/',                       'BG',       '["COMPLETED","CURRENT","STALE","SUPERSEDED"]',                  '["type","date"]', 1),
('PER',     'Persona',              2, 'Strategy',    '{PFX}-PER-{YYYY}-{NNNN}',    'year',      'Named customer segment — hypothesis or validated',             'strategy-personas','strategy/PERSONAS.md',           'STRAT',    '["HYPOTHESIS","VALIDATED","PRIMARY","SECONDARY","RETIRED"]',    '["role","pain_point","willingness_to_pay"]', 1),
('COMP',    'Competitor',           2, 'Strategy',    '{PFX}-COMP-{YYYY}-{NNNN}',   'year',      'A competing product or company',                               'strategy-competitors','strategy/COMPETITORS.md',     'STRAT',    '["ACTIVE","MONITORING","RETIRED"]',                             '["name","positioning","differentiator"]', 0),
('KPI',     'KeyPerformanceIndicator', 2, 'Strategy', '{PFX}-KPI-{YYYY}-{NNNN}',   'year',      'Measurable metric with target, baseline, measurement period',  'strategy-kpis',   'strategy/KPIS.md',                'BG',       '["DEFINED","TRACKING","ACHIEVED","MISSED","REVISED","RETIRED"]','["metric_definition","baseline","target","measurement_period"]', 1),
('TIER',    'PricingTier',          2, 'Strategy',    '{PFX}-TIER-{YYYY}-{NNNN}',   'year',      'A pricing band with entitlements and rate limits',             'strategy-pricing','ARCHITECTURE.md',                 'STRAT',    '["DRAFT","LIVE","REVISED","RETIRED"]',                          '["name","price_monthly","entitlements"]', 1),
-- Tier 3: Planning
('EPIC',    'Epic',                 3, 'Planning',    '{PFX}-EPIC-{YYYY}-{NNNN}',   'year',      '1-3 month capability theme linking DG to Features',            'dev-plan',        'planning/EPICS.md',               'DG',       '["PLANNED","IN_PROGRESS","COMPLETE","CANCELLED"]',              '["title","target_quarter"]', 1),
('FEAT',    'Feature',              3, 'Planning',    '{PFX}-FEAT-{YYYY}-{NNNN}',   'year',      'Shippable customer-visible capability — 1-3 week scope',       'dev-plan',        'FEATURES.md',                     'EPIC',     '["PLANNED","IN_PROGRESS","SHIPPED","DEPRECATED"]',              '["title","epic"]', 1),
('REQ',     'Requirement',          3, 'Planning',    '{PFX}-REQ-{YYYY}-{NNNN}',    'year',      'Specified, reviewed, approved feature requirement with AC',     'dev-requirements','requirements/',                   'FEAT',     '["DRAFT","APPROVED","REJECTED","SUPERSEDED","DONE"]',           '["acceptance_criteria","feature","business_goal"]', 1),
('DESIGN',  'DesignDocument',       3, 'Planning',    '{PFX}-DESIGN-{YYYY}-{NNNN}', 'year',      'Full technical spec: API contract, data model, arch review',   'dev-design',      'design/',                         'REQ',      '["DRAFT","UNDER_REVIEW","APPROVED","REWORK_REQUIRED","SUPERSEDED"]','["api_contract","arch_review_9dim"]', 1),
('AD',      'ArchitectureDecision', 3, 'Planning',    '{PFX}-AD-{NNNN}',            'project',   'Formal record of architectural decision with rationale',       'bds-customize',   'architecture/DECISION-LOG.md',    'DESIGN',   '["ACTIVE","SUPERSEDED","REVISIT_TRIGGERED"]',                   '["decision","rationale","alternatives_rejected"]', 1),
-- Tier 4: Engineering
('TASK',    'Task',                 4, 'Engineering', '{PFX}-TASK-{YYYY}-{NNNN}',   'year',      '1-session implementation unit with full task prompt',          'dev-plan',        'QUEUE.md',                        'DESIGN',   '["QUEUED","IN_PROGRESS","DONE","BLOCKED","NEEDS_REWORK"]',      '["type","done_when","business_goal"]', 1),
('EP',      'APIEndpoint',          4, 'Engineering', '{PFX}-EP-{YYYY}-{NNNN}',     'year',      'HTTP endpoint with method, path, auth, and tier access rules', 'dev-build',       'ARCHITECTURE.md',                 'TASK',     '["DESIGNED","IMPLEMENTED","LIVE","DEPRECATED"]',                '["method","path","auth_required"]', 1),
('DM',      'DataModel',            4, 'Engineering', '{PFX}-DM-{YYYY}-{NNNN}',     'year',      'Database table with columns, indexes, query patterns',         'dev-build',       'schema.sql',                      'DESIGN',   '["DESIGNED","MIGRATED","LIVE","DEPRECATED"]',                   '["table_name","columns"]', 0),
('MIG',     'Migration',            4, 'Engineering', '{PFX}-MIG-{YYYY}-{NNNN}',    'year',      'Versioned reversible DB schema change with rollback SQL',      'dev-build',       'migrations/',                     'DM',       '["WRITTEN","APPLIED_STAGING","VERIFIED","APPLIED_PROD","ROLLED_BACK"]','["forward_sql","rollback_sql"]', 0),
-- Tier 5: Quality
('TC',      'TestCase',             5, 'Quality',     '{PFX}-TC-{YYYY}-{NNNN}',     'year',      'Single verifiable test (Given/When/Then per acceptance criterion)','dev-test',    'tests/',                          'REQ',      '["WRITTEN","PASSING","FAILING","SKIPPED","DEPRECATED"]',        '["type","requirement_ac_ref","linked_req"]', 1),
('TR',      'TestResult',           5, 'Quality',     '{PFX}-TR-{datetime}',         'timestamp', 'Test suite run outcome: which TCs passed/failed at a commit',  'dev-test',        'reports/tests/',                  'TC',       '["RUNNING","PASS","FAIL"]',                                     '["commit_sha","passed","failed"]', 1),
('BUG',     'Bug',                  5, 'Quality',     '{PFX}-BUG-{YYYY}-{NNNN}',    'year',      'Defect: gap between REQ spec and actual behavior',             'dev-test',        'tests/BUG-REGISTRY.md',           'TR',       '["OPEN","TRIAGED","IN_PROGRESS","FIXED","VERIFIED","WONTFIX","DUPLICATE"]','["priority","linked_req","linked_tr"]', 1),
-- Tier 6: Operations
('DEP',     'Deployment',           6, 'Operations',  '{PFX}-DEP-{YYYY}-{NNNN}',    'year',      'Production or staging release event with outcome',             'dev-deploy',      'RELEASES.md',                     'TASK',     '["TRIGGERED","DEPLOYING","LIVE","FAILED","ROLLED_BACK"]',       '["environment","commit_sha"]', 1),
('VR',      'VerificationReport',   6, 'Operations',  '{PFX}-VR-{datetime}',         'timestamp', 'Post-deploy smoke test result',                                'dev-verify',      'reports/verify/',                 'DEP',      '["RUNNING","PASS","FAIL"]',                                     '["deployment","smoke_tests_passed"]', 1),
('INC',     'Incident',             6, 'Operations',  '{PFX}-INC-{YYYY}-{NNNN}',    'year',      'Production issue affecting customer experience',               'dev-verify',      'docs/runbooks/INCIDENTS.md',      'VR',       '["OPEN","INVESTIGATING","MITIGATED","FIXED","POSTMORTEM_DONE"]', '["severity","impact"]', 1),
('RB',      'Runbook',              6, 'Operations',  '{PFX}-RB-{YYYY}-{NNNN}',     'year',      'Step-by-step operational instructions for a specific scenario', 'dev-docs',       'docs/runbooks/',                  NULL,       '["DRAFT","REVIEWED","CURRENT","STALE","SUPERSEDED"]',           '["scenario","steps","rollback"]', 1),
-- Tier 7: Governance
('DEC',     'Decision',             7, 'Governance',  '{PFX}-DEC-{NNNN}',            'project',   'Record of any consequential decision with reasoning',          'bds-customize',   'DECISIONS.md',                    NULL,       '["RECORDED","ACTIVE","SUPERSEDED","REVISITED"]',                '["decision","rationale","made_by"]', 1),
('COMM',    'CommunicationItem',    7, 'Governance',  '{PFX}-COMM-{NNNN}',           'project',   'Item requiring human attention: blocker, review, FYI',        'comms',           'COMMS.md',                        NULL,       '["NEW","IN_PROGRESS","DONE","REJECTED"]',                       '["category","action_required"]', 1),
('SESSION', 'SessionLog',           7, 'Governance',  '{PFX}-SESSION-{datetime}',    'timestamp', 'Complete record of what happened in a BDS session',           'dev',             'sessions/',                       NULL,       '["RECORDED"]',                                                  '["skill","stage"]', 1);

-- ============================================================
-- LINEAGE CHAIN DEFINITIONS (the 8 named chains)
-- ============================================================

CREATE TABLE IF NOT EXISTS lineage_chain_definitions (
  chain_id            TEXT PRIMARY KEY,    -- 'L1', 'L2', ..., 'L8'
  name                TEXT NOT NULL,
  description         TEXT NOT NULL,
  entities_in_order   TEXT NOT NULL,       -- JSON array: ["BI","VIS","BG","DG","EPIC",...]
  link_field          TEXT,                -- field name that links entities
  is_primary          INTEGER DEFAULT 0,   -- L1 is the primary delivery chain
  feedback_trigger    TEXT                 -- what triggers the feedback loop
);

INSERT OR IGNORE INTO lineage_chain_definitions VALUES
('L1', 'Primary Delivery Chain',
 'Business idea → working software. The main value delivery stem.',
 '["BI","VIS","BG","DG","EPIC","FEAT","REQ","DESIGN","TASK","TC","TR"]',
 'business_goal / parent chain', 1, NULL),
('L2', 'Marketing Execution Chain',
 'Business goal → marketing goals → GTM → persona → KPI measurement.',
 '["BG","MG","STRAT","PER","KPI"]',
 'business_goal', 0, 'KPI miss → new GTM strategy'),
('L3', 'Customer Growth Chain',
 'Business goal → AARRR metric → KPI → feedback to goals.',
 '["BG","CGG","KPI"]',
 'business_goal', 0, 'KPI miss < 80% → root cause → new REQ or revised BG'),
('L4', 'Bug Fix Loop Chain',
 'Test failure → bug → fix task → re-test. Closes quality gaps.',
 '["TC","TR","BUG","TASK","TC","TR"]',
 'linked_tr / linked_req', 0, 'TR(FAIL) creates BUG'),
('L5', 'Deployment Operations Chain',
 'Completed task → deploy → verify → incident if fail.',
 '["TASK","DEP","VR","INC","BUG"]',
 'tasks_included / linked_dep', 0, 'VR(FAIL) creates INC'),
('L6', 'Architecture Decision Chain',
 'Requirement → design review raises question → architecture decision → design.',
 '["REQ","AD","DESIGN","TASK"]',
 'linked_design / arch_decisions', 0, NULL),
('L7', 'Strategy to Requirements Chain',
 'Strategy analysis → council decision → business goal → dev goal → epic → feature → REQ.',
 '["STRAT","DEC","BG","DG","EPIC","FEAT","REQ"]',
 'decision / business_goal', 0, NULL),
('L8', 'KPI Feedback Loop',
 'Goal → KPI target → measurement → gap analysis → new REQ or BG revision.',
 '["BG","KPI","measurement","REQ"]',
 'business_goal / triggered_by_kpi', 0, 'KPI miss → COMM item → root cause → new REQ');

-- ============================================================
-- QUALITY GATE DEFINITIONS (per skill, what must pass)
-- ============================================================

CREATE TABLE IF NOT EXISTS quality_gates (
  gate_id             TEXT PRIMARY KEY,
  skill_id            TEXT NOT NULL REFERENCES skills_registry(skill_id),
  gate_number         INTEGER NOT NULL,
  gate_name           TEXT NOT NULL,
  description         TEXT NOT NULL,
  blocking            INTEGER DEFAULT 1,   -- 1 = must pass; 0 = advisory
  check_sql           TEXT                 -- optional SQLite check for /bds-db health
);

INSERT OR IGNORE INTO quality_gates VALUES
('QG-REQ-01',    'dev-requirements', 1, 'Lineage link',        'REQ must have feature, epic, dev_goal, business_goal',       1, NULL),
('QG-REQ-02',    'dev-requirements', 2, 'Acceptance criteria',  'REQ must have ≥1 Given/When/Then block',                     1, NULL),
('QG-REQ-03',    'dev-requirements', 3, 'PM approved',          'Principal PM must have APPROVE verdict',                     1, NULL),
('QG-REQ-04',    'dev-requirements', 4, 'Arch feasible',        'Chief Architect must have FEASIBLE verdict',                 1, NULL),
('QG-DESIGN-01', 'dev-design',       1, 'REQ approved',         'Linked REQ must be APPROVED before design begins',           1, NULL),
('QG-DESIGN-02', 'dev-design',       2, '9-dim review',         'All 9 architecture dimensions reviewed, no ❌ items',        1, NULL),
('QG-DESIGN-03', 'dev-design',       3, 'Chief Architect',      'Chief Architect must APPROVE the design',                    1, NULL),
('QG-TASK-01',   'dev-plan',         1, 'BG link',              'Every TASK must have business_goal field populated',         1, NULL),
('QG-TASK-02',   'dev-plan',         2, 'Done criterion',       'Every TASK must have specific verifiable done_when',         1, NULL),
('QG-DEPLOY-01', 'dev-deploy',       1, 'Tests pass',           'TR(PASS) must exist for all TCs linked to deployed TASKs',  1, NULL),
('QG-DEPLOY-02', 'dev-deploy',       2, 'No open P1 bugs',      'No open P1 BUGs linked to deployed features',               1, NULL);
