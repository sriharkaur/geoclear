# BDS Framework — Setup Guide
> Audience: Any agent or human setting up BDS for the first time
> Covers: new project bootstrap, existing project onboarding, fresh-clone recovery, verification

---

## Prerequisites

Before any setup:
1. Claude Code CLI installed and authenticated
2. `~/.claude/skills/` populated with BDS skills (if not, see Step 0 below)
3. `~/.claude/DomainModel/` exists with schema files
4. `sqlite3` available: `which sqlite3` → must return a path

**Check prerequisites:**
```bash
ls ~/.claude/skills/bds*.md | wc -l          # must be ≥ 7
ls ~/.claude/DomainModel/BDS-*-SCHEMA.sql    # must show both schemas
which sqlite3                                  # must return a path
```

---

## PATH A: New Project (no existing code)

Use this when: you have a business idea and no existing codebase.

**Step 1**: Open Claude Code in an empty directory.

**Step 2**: Your first message is the business idea. Nothing else needed.

BDS auto-detects a new project (no `CLAUDE.md`, no `FEATURES.md`) and triggers `/bds-bootstrap` automatically.

**What happens next** (fully autonomous):
```
Phase 0    Import skills, assign prefix, init DB         ~2 min, no input needed
Phase 1    Intake analysis, create BusinessIdea entity   ~2 min, no input needed
Phase 2    Strategy brief (6 analyses)                   ~5 min, no input needed
           ↓ GATE 1: Review strategy brief — say "proceed" or correct it
Phase 2.5  Goal decomposition (VIS, BG, DG, MG, CGG, KPI, EPIC)  ~3 min
Phase 3    Engineering plan (stack, architecture, first feature)    ~5 min
           ↓ GATE 2: Review engineering plan — say "proceed" or correct it
Phase 4    Build loop begins (autonomous)
Phase 5    Launch and verify
```

Two human gates. Everything else is autonomous.

**After bootstrap completes**, verify:
```bash
sqlite3 .bds/bds.db "SELECT project_name, project_prefix, initialized_at FROM project_info;"
ls .bds/bds.config.yaml          # must exist
cat CLAUDE.md | grep project_prefix  # must show {PREFIX}: value
```

---

## PATH B: Existing Project (has code, no BDS)

Use this when: you have an existing codebase, possibly with some BDS docs already, but no `.bds/bds.db`.

**Step 1**: Open Claude Code in the project directory.

**Step 2**: Run `/bds-import`

**Step 3**: The skill detects Case B and runs 8 sub-steps:

### B.1 — Prefix Assignment
The skill reads `CLAUDE.md` for an existing `project_prefix:` line. If not found, it derives one from the directory name and asks for confirmation.

**What you see:**
```
Proposed prefix: GEO  (from directory: geoclear)
Collision check: no conflicts in bds-global.db
Writing to CLAUDE.md: project_prefix: GEO
```

**If you need to override**: say "use XXX instead" before confirming.

### B.2 — DB Initialization
Creates `.bds/bds.db` from the project schema and populates `bds.config.yaml` from existing `CLAUDE.md` content.

**What gets auto-populated:**
- `project.id` ← your PREFIX
- `project.name` ← from CLAUDE.md header
- `project.product_type` ← inferred from ARCHITECTURE.md or FEATURES.md
- `project.stage` ← inferred from whether prod_url exists and MRR > 0
- `stack.*` ← from package.json, pyproject.toml, or CLAUDE.md stack section

**Review and correct** `bds.config.yaml` after this step if any fields are wrong.

### B.3 — Entity Discovery
Scans 18 file types. For each entity found:
- Already has prefixed ID → inserted as-is
- Has bare ID (e.g. `REQ-2026-0001`) → assigned `{PREFIX}-REQ-2026-0001`
- Has no ID (e.g. a FEATURES.md bullet) → assigned next available ID

**Output:**
```
Entity discovery complete:
  BI: 1   VIS: 1   BG: 4   DG: 3   MG: 2   CGG: 2
  EPIC: 8  FEAT: 24  REQ: 12  DESIGN: 5  TASK: 31
  TC: 0   TR: 0   BUG: 2   KPI: 5   COMM: 0   DEC: 3
  STRAT: 6  SESSION: 0
  TOTAL: 109 entities catalogued
```

### B.4 — Lineage Reconstruction
Builds `lineage_chains` from parent references in REQ frontmatter (`business_goal:`, `feature:`, `epic:`). Entities with no parent link are flagged as orphans.

### B.5 — Gap Analysis
Checks 14 framework layers. For each gap, a COMM item is created in `.bds/bds.db`.

**Common gaps on first import:**
- No `BUSINESS-GOAL.md` → create it with `/business-goal capture`
- No `planning/EPICS.md` → run `/bds-bootstrap Phase 2.5` or create manually
- FEATURES.md exists but no FEAT entities with IDs → B.3 handles this automatically

### B.6 — Council Setup
Based on `product_type` + `stage`, the appropriate agent council is configured and written to `CLAUDE.md`.

### B.7 — ID Backfill List
Files with bare IDs (pre-prefix) are listed. **Do not auto-rename them** — review the list and confirm before bulk update. The skill creates a single COMM item with the full list.

### B.8 — Onboarding Report
Full summary printed. Example:
```
=== BDS ONBOARDING COMPLETE ===
Project:  GeoClear
Prefix:   GEO
Stage:    EARLY
Entities: 109 catalogued | Lineage chains: 31 | Orphans: 3 (2.7%) ✅ HEALTHY
Gaps:     2 detected (see COMMS.md)
Council:  6 agents configured
Next:     /dev — 2 tasks IN PROGRESS in QUEUE.md
```

---

## PATH C: Fresh Clone (project has BDS config but DB is missing)

Use this when: you cloned a BDS project repo but `.bds/bds.db` doesn't exist (it's gitignored).

**Step 1**: Verify the config is present:
```bash
cat .bds/bds.config.yaml | head -5   # must show project.id and project name
```

**Step 2**: Rebuild the DB:
```bash
sqlite3 .bds/bds.db < ~/.claude/DomainModel/BDS-PROJECT-SCHEMA.sql
```

**Step 3**: Migrate existing markdown into DB:
```
/bds-db migrate
```

This re-scans all markdown files and rebuilds the entity graph. Takes ~1 minute for a typical project.

**Step 4**: Verify:
```bash
sqlite3 .bds/bds.db "SELECT entity_type, COUNT(*) FROM entities GROUP BY entity_type;"
```

---

## PATH D: Global Framework Setup (new machine)

Use this when: setting up `~/.claude/` on a new machine or after a clean install.

**Step 1**: Clone or copy the BDS framework:
```bash
# If you have a backup in a git repo:
git clone {bds-backup-repo} ~/.claude

# Or copy from another machine:
rsync -av user@other-machine:~/.claude/ ~/.claude/
```

**Step 2**: Initialize the global DB:
```bash
sqlite3 ~/.claude/bds-global.db < ~/.claude/DomainModel/BDS-GLOBAL-SCHEMA.sql
```

Expected output: `wal` (journal mode confirmation). Verify:
```bash
sqlite3 ~/.claude/bds-global.db "SELECT version FROM bds_framework WHERE id=1;"
# Expected: 1.0
```

**Step 3**: Register existing projects:
For each project you work on, run in the project directory:
```
/bds-import
```
Case C (DB missing on fresh clone) applies.

---

## Setup Verification Checklist

Run after any setup path:

```bash
# 1. Global framework DB healthy
sqlite3 ~/.claude/bds-global.db "
  SELECT 'skills: ' || COUNT(*) FROM skills_registry
  UNION ALL SELECT 'entity_types: ' || COUNT(*) FROM entity_type_definitions
  UNION ALL SELECT 'lineage_chains: ' || COUNT(*) FROM lineage_chain_definitions;
"
# Expected: skills: 27, entity_types: 30, lineage_chains: 8

# 2. Project DB initialized (run in project directory)
sqlite3 .bds/bds.db "SELECT project_name, project_prefix, initialized_at FROM project_info;"

# 3. Config committed
git status .bds/bds.config.yaml    # must be clean or staged

# 4. DB gitignored
cat .gitignore | grep '.bds/\*.db'  # must show the pattern

# 5. Skills present
ls .claude/skills/bds*.md | wc -l  # must be ≥ 7

# 6. Prefix in CLAUDE.md
grep 'project_prefix:' CLAUDE.md   # must return a value
```

All 6 must pass. If any fail, consult [SYSTEM-GUIDE.md](02-SYSTEM-GUIDE.md) → Troubleshooting section.

---

## Common Setup Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `FOREIGN KEY constraint failed` on DB init | `BDS-GLOBAL-SCHEMA.sql` had `file_path NOT NULL` without default | Fixed in v1.0 — pull latest schema |
| `no such table: project_info` | Project DB not initialized | Run: `sqlite3 .bds/bds.db < ~/.claude/DomainModel/BDS-PROJECT-SCHEMA.sql` |
| Entity discovery finds 0 entities | No frontmatter `id:` fields in existing files | Run `/bds-db migrate` — it also scans for pattern-matched IDs in body text |
| prefix collision in global DB | Two projects tried to use same prefix | The skill proposes alternatives — pick one |
| `bds-global.db` missing | First run on this machine | Run: `sqlite3 ~/.claude/bds-global.db < ~/.claude/DomainModel/BDS-GLOBAL-SCHEMA.sql` |
| Skills not triggering | `.claude/commands/` missing | Run: `cp ~/.claude/skills/*.md .claude/commands/` |
