# /bds-import — Manual BDS System Import

> Use this when the auto-bootstrap did not trigger, or when you need to add the BDS system to an existing project.
> Copies all skills from the global location, creates framework docs, and gets you to the right entry point.

---

## Where the BDS system lives

The source of truth for all skills is: **`~/.claude/skills/`**

```
~/.claude/skills/
  bds.md                    ← /bds — business health orchestrator
  bds-bootstrap.md          ← /bds-bootstrap — new project pipeline
  bds-import.md             ← /bds-import — this file
  bds-customize.md          ← /bds-customize — Chief Architect project customization
  dev.md                    ← /dev — engineering meta-orchestrator
  dev-feature.md            ← /dev-feature — full 10-gate pipeline
  dev-requirements.md       ← Gate 1
  dev-design.md             ← Gate 2
  dev-plan.md               ← Gate 3
  dev-arch.md               ← Gate 4 (PRISM-10 orchestrator)
  dev-build.md              ← Gate 5
  dev-test.md               ← Gate 6
  dev-docs.md               ← Gate 7
  dev-commit.md             ← Gate 8
  dev-deploy.md             ← Gate 9
  dev-verify.md             ← Gate 10
  dev-status.md             ← project state reader
  dev-secrets.md            ← secrets management
  dev-arch-ops-excellence.md
  dev-arch-security.md
  dev-arch-reliability.md
  dev-arch-performance.md
  dev-arch-cost.md
  dev-arch-sustainability.md
  dev-arch-frontend.md
  dev-arch-data.md
  dev-arch-application.md
  dev-arch-agentic.md
  dev-arch-audit.md
  strategy.md               ← /strategy — strategy meta-orchestrator
  strategy-swot.md
  strategy-value-prop.md
  strategy-personas.md
  strategy-competitors.md
  strategy-pricing.md
  strategy-gtm.md
  strategy-kpis.md
  strategy-90day.md
  strategy-breakeven.md
  strategy-pivot.md
  project-init.md           ← /project-init — directory structure
  business-goal.md          ← /business-goal — north star goal management
  cpm.md                    ← /cpm — Chief Program Manager
  observer.md               ← /observer — neutral witness and tie-breaker
  comms.md                  ← /comms — communications hub (COMMS.md manager)
  first-principles.md       ← FIRST-PRINCIPLES.md template — the team constitution
```

All skills are also mirrored to `~/.claude/commands/` so they're available as slash commands globally.

---

## Step 1 — Check what's already present

```bash
# Check global source
ls ~/.claude/skills/dev-*.md ~/.claude/skills/strategy-*.md ~/.claude/skills/bds*.md 2>/dev/null | wc -l

# Check project-local
ls .claude/skills/ 2>/dev/null
ls .claude/commands/ 2>/dev/null
```

Report: `{N} skills available globally | {M} already in this project`

---

## Step 2 — Create project .claude directories if missing

```bash
mkdir -p .claude/skills .claude/commands
```

---

## Step 3 — Copy all BDS skills to project

```bash
cp ~/.claude/skills/bds*.md .claude/skills/
cp ~/.claude/skills/dev*.md .claude/skills/
cp ~/.claude/skills/strategy*.md .claude/skills/
cp ~/.claude/skills/project-init.md .claude/skills/

cp ~/.claude/skills/bds*.md .claude/commands/
cp ~/.claude/skills/dev*.md .claude/commands/
cp ~/.claude/skills/strategy*.md .claude/commands/
cp ~/.claude/skills/project-init.md .claude/commands/
```

Report which files were copied.

---

## Step 4 — Create framework docs if missing

Check for each file. If it does NOT exist in the project root, copy from the geoclear project template (if available) or create a minimal stub:

Files to create if missing:
- `BDS.md` — copy from `~/.claude/skills/../` templates or create minimal
- `FRAMEWORK.md` — master index
- `DEV-FRAMEWORK.md` — dev user guide
- `STRATEGY-FRAMEWORK.md` — strategy user guide
- `PROJECT-GUIDE.md` — project structure guide

If the template files are available at `~/Projects/geoclear/*.md` (the reference project), copy from there and strip geoclear-specific content.

If NOT available, create minimal stubs with a note: "Run /bds-bootstrap or /bds-customize to populate with project-specific content."

---

## Step 4.5 — BDS Database Setup

After copying skills, initialize or register the project's BDS database.

**Check if `.bds/bds.db` already exists:**
```bash
ls .bds/bds.db 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

**Case A — New project (no CLAUDE.md, no .bds/):**
```bash
# Will be handled by /bds-bootstrap Phase 0.4 — skip here, note it
echo "DB will be initialized by /bds-bootstrap"
```

**Case B — Existing project with code + BDS docs, but no DB:**

This is a full onboarding. Run all sub-steps in order. Do not skip.

### B.1 — Prefix assignment

```bash
# Try to read from CLAUDE.md first
grep -m1 'project_prefix:' CLAUDE.md 2>/dev/null | awk '{print $2}'
```

If not found: derive from the project directory name (first 3 meaningful uppercase letters, skip articles). Show the proposed prefix and confirm it is not already registered in `~/.claude/bds-global.db`. Write to `CLAUDE.md`:
```markdown
## BDS Project Prefix
project_prefix: {PREFIX}
```

### B.2 — DB initialization

```bash
mkdir -p .bds
sqlite3 .bds/bds.db < ~/.claude/DomainModel/BDS-PROJECT-SCHEMA.sql
cp ~/.claude/DomainModel/bds.config.yaml.template .bds/bds.config.yaml
```

Populate `bds.config.yaml` from what's already in `CLAUDE.md`:
- `project.id` ← PREFIX
- `project.name` ← from CLAUDE.md header
- `project.description` ← from CLAUDE.md first line
- `project.product_type` ← infer from ARCHITECTURE.md or FEATURES.md (API_SERVICE, SAAS_WEB_APP, etc.)
- `project.stage` ← infer: no live customers → PRE_LAUNCH; live customers, <$10K MRR → EARLY; etc.
- `project.prod_url` ← from CLAUDE.md if present
- `stack.*` ← from CLAUDE.md stack section or package.json / pyproject.toml

Seed `project_info`:
```sql
INSERT INTO project_info (project_name, project_prefix, product_type, stage, framework_version, schema_version, initialized_at)
VALUES ('{name}', '{PREFIX}', '{product_type}', '{stage}', '1.0', '1.0', datetime('now'));
```

### B.3 — Entity discovery (scan all existing markdown)

Read every file in this scan order. Extract any entity that has an `id:` or matches an entity ID pattern (`[A-Z]+-[A-Z]+-\d{4}-\d+`):

| File | Entity types to extract |
|------|------------------------|
| `BUSINESS-GOAL.md` | BI, VIS, BG |
| `strategy/GOALS-MARKETING.md` | MG |
| `strategy/GOALS-DEV.md` | DG |
| `strategy/GOALS-CUSTOMER.md` | CGG |
| `strategy/KPIS.md` | KPI |
| `planning/EPICS.md` | EPIC |
| `FEATURES.md` | FEAT |
| `requirements/*.md` | REQ |
| `design/*.md` | DESIGN, AD |
| `QUEUE.md` | TASK (any `TASK-` or `{PREFIX}-TASK-` lines) |
| `tests/TC-REGISTRY.md` | TC |
| `tests/BUG-REGISTRY.md` | BUG |
| `DECISIONS.md` | DEC |
| `COMMS.md` | COMM |
| `docs/runbooks/*.md` | RB |
| `ARCHITECTURE.md` | DEP, VR (any version/deploy entries) |
| `sessions/*.md` | SESSION |
| `strategy/*.md` | STRAT |
| `RELEASES.md` | VR (version records) |

For each entity found:
1. If it already has a `{PREFIX}-TYPE-YYYY-NNNN` format ID → insert as-is
2. If it has a bare ID (e.g. `REQ-2026-0001` without prefix) → assign `{PREFIX}-REQ-2026-0001`; note that file needs updating
3. If it has no ID (e.g. a feature bullet in FEATURES.md) → assign next ID via the sequence table

Insert each entity into `entities` table:
```sql
INSERT OR IGNORE INTO entities (entity_id, entity_type, title, status, source_file, created_at)
VALUES ('{PREFIX}-{TYPE}-{YYYY}-{NNNN}', '{TYPE}', '{title}', '{status}', '{source_file}', datetime('now'));
```

Update `entity_sequences` with the max seq found per type per year so future `/bds-db next-id` picks up correctly.

### B.4 — Lineage reconstruction

For each entity that has parent references (e.g. REQ has `feature:`, `business_goal:` frontmatter), build the lineage chain:

```sql
INSERT OR REPLACE INTO lineage_chains
  (chain_id, chain_type, bi_id, vis_id, bg_id, dg_id, epic_id, feat_id, req_id, design_id, task_id, status)
SELECT
  '{PREFIX}-CHAIN-' || lower(hex(randomblob(4))),
  'L1',
  (SELECT entity_id FROM entities WHERE entity_type='BI' LIMIT 1),
  NULL, -- fill from BG's parent chain
  '{bg_id}', '{dg_id}', '{epic_id}', '{feat_id}', '{req_id}', '{design_id}', '{task_id}',
  'ACTIVE';
```

For entities with NO parent link → flag as orphan (insert with `is_orphan = 1`).

### B.5 — Gap analysis (what's missing from the framework)

Check each expected layer and report status:

| Layer | Expected | Check |
|-------|----------|-------|
| BusinessIdea | 1 BI entity | `SELECT COUNT(*) FROM entities WHERE entity_type='BI'` |
| Vision | 1 VIS entity | same pattern |
| BusinessGoals | ≥1 BG | — |
| DevGoals | ≥1 DG per BG | — |
| KPIs | ≥1 KPI per BG | — |
| Epics | ≥1 EPIC per DG | — |
| Features | ≥1 FEAT per EPIC | — |
| Requirements | ≥1 REQ per FEAT (for in-progress work) | — |
| COMMS.md | exists | file check |
| DECISIONS.md | exists | file check |
| FIRST-PRINCIPLES.md | exists | file check |
| BUSINESS-GOAL.md | exists | file check |
| ARCHITECTURE.md | exists | file check |
| FEATURES.md | exists | file check |
| QUEUE.md | exists | file check |

For each gap, create a `COMM` item so it appears in the onboarding report:
```sql
INSERT INTO comms_items (comm_id, category, title, body, status, created_at)
VALUES ('{PREFIX}-COMM-{NNNN}', 'GAP', 'Missing: {layer}', '{what to do}', 'NEW', datetime('now'));
```

### B.6 — Council and agent setup

Based on the project's `product_type` and `stage`, determine which councils and agents are needed:

**Always active:**
- Principal PM (strategy + requirements)
- Principal Architect (design + code review)
- Principal TPM (task planning + sequencing)
- Chief Architect (architecture decisions)

**Based on stage:**
- PRE_LAUNCH → add Strategy Council (SWOT, pricing, GTM)
- EARLY → add Growth Agent (KPI tracking, CGG review)
- GROWTH/SCALE → add CPM (full program management), Observer (periodic drift check)

**Based on product_type:**
- API_SERVICE → add Security Agent
- SAAS_WEB_APP → add Frontend Architect
- DATA_PRODUCT → add Data Architect
- AI_AGENT_PRODUCT → add Agentic Architect

Write the agent roster to `CLAUDE.md` under a `## Active Agents` section if it doesn't exist.

Add a COMM item confirming council setup:
```
COMM: Council configured — {N} agents active for {product_type} at {stage} stage
```

### B.7 — File updates (backfill prefixed IDs)

For any entity found in step B.3 that had a bare ID (without prefix), report:
```
FILES NEEDING ID PREFIX UPDATE:
  requirements/REQ-2026-0001-auth.md  →  needs: GEO-REQ-2026-0001
  design/DESIGN-2026-0001-api.md      →  needs: GEO-DESIGN-2026-0001
  ...
```

**Do NOT automatically rewrite these files.** Instead: add a single COMM item listing all files, ask user to confirm before running bulk rename. This prevents breaking any in-flight work.

### B.8 — Onboarding report

Output the full onboarding report:

```
=== BDS ONBOARDING REPORT ===
Project:  {name}
Prefix:   {PREFIX}
Stage:    {stage}
Date:     {YYYY-MM-DD HH:MM}

ENTITY INVENTORY
  BI:      {N}    VIS: {N}    BG: {N}
  MG:      {N}    DG:  {N}    CGG:{N}
  EPIC:    {N}    FEAT:{N}    REQ:{N}
  DESIGN:  {N}    TASK:{N}
  TC:      {N}    TR:  {N}    BUG:{N}
  KPI:     {N}    COMM:{N}    DEC:{N}
  STRAT:   {N}    SESSION:{N}
  TOTAL:   {N} entities catalogued

LINEAGE HEALTH
  Chains built:  {N}
  Orphans:       {K}  ({K/TOTAL * 100:.1f}%) — {HEALTHY | AT RISK | CRITICAL}
  Full chains:   {M} with BI→TASK trace

GAPS DETECTED
  {list of missing layers with recommended actions}

COUNCIL ACTIVE
  {list of agents configured}

ID BACKFILL NEEDED
  {N} files have bare IDs — see COMMS.md for update list

NEXT RECOMMENDED STEP
  {if gaps exist → "Run /bds to see full health + gap resolution priority"}
  {if healthy → "Run /dev to continue engineering work"}
  {if no BG exists → "Run /business-goal capture to establish the north star first"}
```

Add to `.gitignore`:
```
.bds/*.db
.bds/*.db-wal
.bds/*.db-shm
```

Commit `.bds/bds.config.yaml` to git.

**Case C — DB already exists:**
```bash
sqlite3 .bds/bds.db "SELECT project_name, project_prefix, initialized_at FROM project_info;"
```
Run Step B.5 (gap analysis) and B.8 (onboarding report) only — do not reinitialize.

---

## Step 5 — Detect project state

Determine which entry point to recommend:

**New project** (no CLAUDE.md, no FEATURES.md, no QUEUE.md):
→ Recommend `/bds-bootstrap` — full new project pipeline (handles DB init in Phase 0.4)

**Existing project with no BDS framework** (has CLAUDE.md or code, but no BDS docs):
→ Recommend `/bds-customize` — Chief Architect customizes BDS for this existing project
→ Then `/bds` — run health check

**Existing project with partial BDS** (some docs exist):
→ Recommend `/bds` — health check will identify what's missing

---

## Step 6 — Report

```
=== BDS IMPORT COMPLETE ===
Date: {YYYY-MM-DD HH:MM}

Skills imported: {N} skills → .claude/skills/ and .claude/commands/
Framework docs:  {list of files created or already existed}

Project state: {NEW | EXISTING-NO-BDS | EXISTING-PARTIAL-BDS}

NEXT STEP
```

If NEW:
```
  Run: /bds-bootstrap
  OR just describe your business idea — the system will start automatically
```

If EXISTING-NO-BDS:
```
  Run: /bds-customize   ← Chief Architect will customize BDS for this project
  Then: /bds            ← full health check
```

If EXISTING-PARTIAL-BDS:
```
  Run: /bds             ← health check identifies what's missing
```

---

## Manual import (if skill system isn't working)

If slash commands aren't triggering, you can run the import manually in the terminal:

```bash
# From your project directory
mkdir -p .claude/skills .claude/commands

# Copy all BDS skills
cp ~/.claude/skills/bds*.md .claude/skills/ .claude/commands/
cp ~/.claude/skills/dev*.md .claude/skills/ .claude/commands/
cp ~/.claude/skills/strategy*.md .claude/skills/ .claude/commands/
cp ~/.claude/skills/project-init.md .claude/skills/ .claude/commands/

echo "BDS imported. Open Claude Code and run /bds-bootstrap (new project) or /bds (existing)"
```

---

## Updating an existing import

When the global skills are updated (new features added), re-run `/bds-import` to pull the latest versions into the project. It overwrites existing project-local copies with the global source.

To always stay current, add to your session start:
```
/bds-import check    ← shows if any skills are outdated without importing
/bds-import update   ← imports only skills that are newer in global
```
