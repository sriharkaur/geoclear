# BDS Framework — Customization Guide
> Audience: Project system admins, Chief Architect agents
> Covers: bds.config.yaml, feature toggles, thresholds, entity types, council configuration, stack settings

---

## The Configuration Contract

`.bds/bds.config.yaml` is the single file that controls how BDS behaves for your project. It is:
- **Committed to git** — it's part of the project contract
- **Human-readable** — every field is documented
- **Framework-versioned** — when BDS upgrades, this file may gain new fields

The DB (`.bds/bds.db`) is never committed. The config is the durable record of project customization.

---

## Full Configuration Reference

```yaml
project:
  id: "GEO"               # 3-letter uppercase prefix — NEVER change after first commit
  name: "GeoClear"        # Human-readable project name
  description: "US Address Intelligence API"
  product_type: "API_SERVICE"
    # Options: API_SERVICE | SAAS_WEB_APP | CONSUMER_APP | DATA_PRODUCT
    #          MARKETPLACE | DEVELOPER_TOOL | AI_AGENT_PRODUCT | CONTENT_PLATFORM
  stage: "EARLY"
    # Options: PRE_LAUNCH | EARLY | GROWTH | SCALE | ENTERPRISE
    # Update this when the business advances to the next stage
  prod_url: "https://geoclear.io"   # fill when deployed
  north_star: "The most accurate address intelligence API, $100K MRR in 12 months"

bds:
  framework_version: "1.0"   # BDS version this project uses — updated by /bds-keeper upgrade
  schema_version: "1.0"      # DB schema version — updated by migrations
  inherited_at: "2026-04-15" # When this project was first initialized

db:
  path: ".bds/bds.db"        # relative to project root — do not change
  wal_mode: true              # WAL journal mode (recommended — enables concurrent reads)
  foreign_keys: true          # enforce FK constraints

features:
  lineage_tracking: true      # Track entity lineage chains
  kpi_measurement: true       # Store KPI time series
  agent_run_tracking: true    # Log every skill invocation
  audit_log: true             # Immutable entity change history
  health_checks: true         # /bds layer scores over time
  project_metrics: true       # MRR, latency, customer counts
  deployment_tracking: true   # DEP + VR pairs for every deploy
  comms_sync: true            # Sync COMMS.md items to DB

  # Set to false for projects where these aren't relevant:
  # lineage_tracking: false   → disables lineage queries; orphan check skipped
  # kpi_measurement: false    → KPI dashboard skips; /strategy-kpis is no-op
  # audit_log: false          → no change history (not recommended for production)

thresholds:
  orphan_task_warn_pct: 5      # ⚠️ AT RISK when orphan_tasks / total > 5%
  orphan_task_critical_pct: 10 # ❌ CRITICAL when > 10%
  kpi_at_risk_pct: 80          # ⚠️ AT RISK when KPI < 80% of target
  kpi_miss_pct: 50             # ❌ MISS when KPI < 50% of target
  strategy_stale_days: 60      # STALE flag when strategy analyses > 60 days old
  goal_stale_days: 30          # STALE flag when BGs not updated > 30 days
  health_check_interval_days: 14  # How often /bds should run

entity_types:
  enabled:
    - BI
    - VIS
    - BG
    - MG
    - DG
    - CGG
    - STRAT
    - PER
    - KPI
    - TIER
    - EPIC
    - FEAT
    - REQ
    - DESIGN
    - AD
    - TASK
    - TC
    - TR
    - BUG
    - DEP
    - VR
    - INC
    - RB
    - DEC
    - COMM
    - SESSION
  disabled:
    # - COMP    # if competitor tracking is external
    # - DM      # if schema tracking is not needed
    # - MIG     # if migrations tracked separately

kpi:
  default_period: weekly        # default measurement_period for new KPIs
  auto_remind: true             # create COMM item when KPI goes AT_RISK
  reminder_threshold_pct: 80   # trigger when KPI < 80% of target

custom_metrics:
  # Add project-specific metrics to project_metrics table:
  - name: api_calls_per_day
    unit: count
    source: api_logs
  - name: avg_response_time_ms
    unit: ms
    source: api_logs
  # Add more as needed

stack:
  language: "node"        # node | python | go | rust | typescript
  framework: "express"    # express | fastapi | gin | nextjs | django | etc.
  database: "sqlite"      # sqlite | postgres | mysql | mongodb | etc.
  deployment: "render"    # render | railway | vercel | aws | gcp | fly
  port: 4001
  test_command: "npm test"
  start_command: "node web-server.js"
  health_check_url: "http://localhost:4001/api/health"
```

---

## Customizing the Council

The agent council is configured in `CLAUDE.md` under a `## Active Agents` section. The `bds.config.yaml` drives which agents are included at bootstrap; manual customization can be done directly in `CLAUDE.md`.

### Default council by product type

**API_SERVICE:**
```
Principal PM, Principal Architect, Principal TPM, Chief Architect, Security Agent
```

**SAAS_WEB_APP:**
```
Principal PM, Principal Architect, Principal TPM, Chief Architect, Frontend Architect, Security Agent
```

**DATA_PRODUCT:**
```
Principal PM, Principal Architect, Principal TPM, Chief Architect, Data Architect
```

**AI_AGENT_PRODUCT:**
```
Principal PM, Principal Architect, Principal TPM, Chief Architect, Agentic Architect, Security Agent
```

### Adding domain experts

When your project needs deep industry expertise that isn't in the default council:

```
/experts add {expert-role}
```

Examples:
```
/experts add "Healthcare Compliance Expert (HIPAA, HL7)"
/experts add "Fintech Regulatory Expert (PCI DSS, SOC 2)"
/experts add "E-commerce Growth Expert (LTV, CAC, cohort analysis)"
```

The expert is registered in `CLAUDE.md` and invoked by relevant skills. All expert additions create a COMM FYI item notifying you.

### Adjusting agent thresholds

In `bds.config.yaml`, thresholds control when agents escalate vs. act autonomously:

```yaml
thresholds:
  orphan_task_warn_pct: 5    # lower = more sensitive orphan detection
  kpi_at_risk_pct: 80        # higher = earlier warning on KPI decline
  strategy_stale_days: 30    # lower = more frequent strategy refresh prompts
  goal_stale_days: 14        # lower = tighter goal review cadence
```

For early-stage projects (PRE_LAUNCH, EARLY): use default thresholds.
For high-stakes production (SCALE, ENTERPRISE): tighten orphan and KPI thresholds.

---

## Customizing Entity Types

### Disabling unused types

If your project doesn't use certain entity types (e.g. COMP because competitor tracking is external), disable them:

```yaml
entity_types:
  disabled:
    - COMP
    - DM
```

This:
- Removes the type from orphan checks
- Skips those sections in `/bds` health check
- Suppresses ID allocation for those types

### Custom entity types (advanced)

Not recommended for most projects. If you need a type that doesn't exist in the global registry, add it to `bds.config.yaml`:

```yaml
entity_types:
  custom:
    - type: CAMPAIGN
      display_name: Marketing Campaign
      id_scope: year
      parent_types: [MG]
      child_types: [FEAT]
```

This creates a project-local entity type. It won't appear in the global framework — file a feedback item to request it be added globally (see [FEEDBACK-GUIDE.md](06-FEEDBACK-GUIDE.md)).

---

## Customizing KPIs

KPIs are stored as entities (`{PREFIX}-KPI-{YYYY}-{NNNN}`) and measured via `kpi_measurements`.

### Add a new KPI

```
/strategy-kpis add
```
The skill asks: name, metric, target, measurement period, linked business goal. Then creates the KPI entity and inserts into DB.

### Project-specific metrics

Add to `bds.config.yaml` under `custom_metrics`. These flow into the `project_metrics` table:

```yaml
custom_metrics:
  - name: stripe_mrr_usd
    unit: usd
    source: stripe_api
  - name: churn_rate_pct
    unit: percent
    source: stripe_api
  - name: p95_latency_ms
    unit: ms
    source: datadog
```

The BDS operations skill (`/bds-ops`) reads these and includes them in health reports.

---

## Customizing the Build Stack

When the stack changes (e.g. migrating from SQLite to Postgres, or from Render to AWS):

1. Update `bds.config.yaml` → `stack` section
2. Update `CLAUDE.md` → stack section (keep in sync)
3. Update `ARCHITECTURE.md` → stack table
4. Run `/dev-arch-audit` — the new stack triggers relevant architecture reviews
5. Commit all three files together

---

## Stage Advancement

When the business advances to a new stage, update `bds.config.yaml`:

```yaml
project:
  stage: "GROWTH"   # was EARLY
```

This triggers:
- `/bds` recalibrates health check scoring for GROWTH-stage expectations
- Council expands: CPM agent added, Observer periodic runs scheduled
- Thresholds tighten: health_check_interval_days reduced, kpi_at_risk_pct raised
- Strategy refresh recommended: `/strategy-90day` for new quarterly plan

**Stage milestones (typical):**
- PRE_LAUNCH → EARLY: first paying customer
- EARLY → GROWTH: $10K MRR
- GROWTH → SCALE: $100K MRR
- SCALE → ENTERPRISE: $1M MRR or enterprise contract signed

---

## Version Management

When a new BDS framework version is released:

```
/bds-keeper upgrade
```

The upgrade process:
1. Compares `bds.config.yaml` `framework_version` to global DB version
2. Shows what changed (new skills, schema migrations, config additions)
3. Gets your approval for breaking changes
4. Copies new skill files to `.claude/skills/`
5. Applies DB migrations if any
6. Updates `bds.config.yaml` `framework_version`
7. Commits `bds.config.yaml` with message: `chore: upgrade BDS framework to v{N}`

Upgrades are always logged in the project audit trail and in `DECISIONS.md`.
