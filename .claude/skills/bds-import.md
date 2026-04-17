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

## Step 5 — Detect project state

Determine which entry point to recommend:

**New project** (no CLAUDE.md, no FEATURES.md, no QUEUE.md):
→ Recommend `/bds-bootstrap` — full new project pipeline

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
