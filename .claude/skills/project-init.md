# /project-init — Project Structure Initialization

> Creates the standard industry-grade project directory structure used at Google, Meta, and Anthropic.
> Idempotent: safe to run on existing projects — only creates what is missing, never overwrites existing files.
> Output: directory tree created + `PROJECT-STRUCTURE.md` saved with datetime + CLAUDE.md routing table updated.

---

## What this does

Sets up the canonical directory structure for a software project. Covers:
- Source code organization
- Test structure (10 layers, mirroring `/dev-test`)
- Documentation hierarchy
- Design + requirements (mirroring the dev framework IDs)
- Architecture + ADR storage
- Reports (test runs, performance, security, verification)
- Data (raw, processed, exports — gitignored)
- Session logs for `/dev` and `/strategy` outputs
- CI/CD configuration hooks
- Observability and runbook storage

This is the structure that makes every other skill work correctly. Run once at project start.

---

## Step 1 — Read existing project state

Read: `CLAUDE.md` (if it exists), `package.json` / `pyproject.toml` / `go.mod` / `Cargo.toml` (detect language), `.git/` (detect git root).

Determine:
- **Project type**: `api` | `fullstack` | `data-pipeline` | `cli` | `library` | `ai-agent` | `mobile`
- **Language/runtime**: Node.js | Python | Go | Rust | TypeScript | mixed
- **Current state**: fresh project | existing project with partial structure

If type cannot be determined from files: ask the user one question — "Is this a web API, full-stack app, data pipeline, CLI tool, library, or AI agent project?" — then proceed.

---

## Step 2 — Define the canonical structure

### Universal directories (every project type)

```
{project-root}/
│
├── src/                          ← all production source code
│   └── {module}/                 ← one subdirectory per logical module/domain
│
├── tests/                        ← all test code, mirrors src/ structure
│   ├── unit/                     ← TC-UNIT-* (isolated, no I/O)
│   ├── integration/              ← TC-INT-* (real DB, real services)
│   ├── system/                   ← TC-SYS-* (full service under test)
│   ├── api/                      ← TC-API-* (HTTP contract tests)
│   ├── e2e/                      ← TC-E2E-* (user journey tests)
│   ├── visual/                   ← TC-VIS-* (screenshot regression)
│   ├── performance/              ← TC-PERF-* (load, latency)
│   ├── security/                 ← TC-SEC-* (auth, injection, OWASP)
│   ├── data/                     ← TC-DATA-* (schema, quality, migration)
│   ├── pipeline/                 ← TC-PIPE-* (end-to-end data flows)
│   └── fixtures/                 ← shared test data and mocks
│       ├── data/
│       └── mocks/
│
├── docs/                         ← all human-readable documentation
│   ├── api/                      ← API reference (OpenAPI, endpoint docs)
│   ├── guides/                   ← user guide, developer guide, onboarding
│   ├── runbooks/                 ← one file per alert/failure mode
│   │   └── RUNBOOK-{FEATURE}.md
│   ├── adr/                      ← Architecture Decision Records
│   │   └── ADR-{NNNN}-{slug}.md
│   └── architecture/             ← architecture diagrams, C4 models
│
├── requirements/                 ← REQ-{YYYY}-{NNNN} files (from /dev-requirements)
│   └── REQUIREMENTS-INDEX.md
│
├── design/                       ← DESIGN-{YYYY}-{NNNN} files (from /dev-design)
│   └── DESIGN-INDEX.md
│
├── architecture/                 ← ARCH-AUDIT-{YYYY-MM-DD} files (from /dev-arch-audit)
│   └── ARCH-AUDIT-INDEX.md
│
├── migrations/                   ← numbered DB migration files
│   └── NNNN-{description}.sql    ← e.g. 0001-create-users.sql
│
├── scripts/                      ← utility scripts (dev, ops, data)
│   ├── dev/                      ← local dev helpers
│   ├── ops/                      ← deployment, infra scripts
│   └── data/                     ← data import/export/transform scripts
│
├── config/                       ← configuration files (no secrets)
│   ├── default.{json|yaml}       ← base config
│   ├── production.{json|yaml}    ← production overrides
│   └── test.{json|yaml}          ← test overrides
│
├── reports/                      ← all generated reports (gitignored or kept per policy)
│   ├── tests/                    ← TR-{YYYYMMDD-HHMMSS}.md (from /dev-test)
│   ├── performance/              ← perf test outputs, flame graphs
│   ├── security/                 ← security scan outputs, SAST results
│   └── verify/                   ← VR-{YYYYMMDD-HHMMSS}.md (from /dev-verify)
│
├── sessions/                     ← DEV-SESSION-{datetime}.md (from /dev)
│
├── strategy/                     ← STRATEGY-SESSION-{datetime}.md (from /strategy)
│   └── STRATEGY-INDEX.md         ← index of all strategy analyses
│
├── data/                         ← local data files (ALWAYS gitignored)
│   ├── raw/                      ← source data, never modified
│   ├── processed/                ← transformed/cleaned data
│   ├── exports/                  ← data exports for analysis
│   └── dev/                      ← dev database, sample data
│
├── .claude/                      ← Claude Code configuration
│   ├── skills/                   ← project-local skill files
│   └── commands/                 ← project-local command aliases
│
├── .github/                      ← CI/CD (GitHub Actions)
│   └── workflows/
│       ├── ci.yml                ← run tests on PR
│       ├── deploy.yml            ← deploy on merge to main
│       └── security.yml          ← scheduled security scans
│
├── CLAUDE.md                     ← master orchestrator (project rules + routing map)
├── FEATURES.md                   ← canonical inventory of what is built
├── ARCHITECTURE.md               ← tech stack, endpoints, data model
├── QUEUE.md                      ← TASK-NNNN execution state
├── RELEASES.md                   ← version history
└── DEV-FRAMEWORK.md              ← skill reference
```

### Additional directories by project type

**fullstack** (add to src/):
```
src/
  api/        ← backend API handlers
  web/        ← frontend application
    components/
    pages/
    hooks/
    styles/
  shared/     ← types, utils shared between api and web
```

**data-pipeline** (add):
```
src/
  ingest/     ← data source connectors
  transform/  ← transformation logic (Bronze→Silver, Silver→Gold)
  serve/      ← serving layer (API, exports)
pipelines/    ← pipeline definitions (Airflow DAGs, dbt models, etc.)
notebooks/    ← exploratory analysis (gitignored outputs)
```

**ai-agent** (add):
```
src/
  agents/     ← agent definitions
  tools/      ← tool implementations (one file per tool)
  prompts/    ← prompt templates (versioned)
evals/        ← evaluation datasets and harness
  datasets/   ← eval inputs + expected outputs
  results/    ← eval run results (gitignored)
```

**library** (add):
```
examples/     ← usage examples (runnable)
benchmarks/   ← performance benchmarks
```

---

## Step 3 — Create the structure

For each directory in the canonical structure:
- Check if it already exists — if yes, skip (do not overwrite)
- If no, create it with a `.gitkeep` file inside (so empty dirs are tracked)

For each index/registry file that should exist but doesn't, create it with the standard header:
- `requirements/REQUIREMENTS-INDEX.md` — standard header from /dev-requirements
- `design/DESIGN-INDEX.md` — standard header from /dev-design
- `architecture/ARCH-AUDIT-INDEX.md` — standard header from /dev-arch-audit
- `tests/TC-REGISTRY.md` — standard header from /dev-test
- `tests/BUG-REGISTRY.md` — standard header from /dev-test
- `strategy/STRATEGY-INDEX.md` — strategy analyses index

---

## Step 4 — Create or update .gitignore

Add (if not already present):

```gitignore
# Data — never in git (may contain PII, large files, live keys)
data/
*.db
*.db-shm
*.db-wal

# Reports — generated, can be reproduced
reports/
sessions/

# Eval results — large, reproducible
evals/results/
notebooks/*.ipynb outputs (clear outputs before commit)

# Environment
.env
.env.*
!.env.example

# OS
.DS_Store
Thumbs.db

# Dependencies
node_modules/
__pycache__/
*.pyc
.venv/
dist/
build/
```

**Exception**: `strategy/` is NOT gitignored by default — strategy analyses are valuable artifacts worth versioning. User can override.

---

## Step 5 — Update CLAUDE.md routing table

If CLAUDE.md exists, add or update the project structure section.
If CLAUDE.md does not exist, create a minimal one with the routing table.

Add this section to CLAUDE.md:

```markdown
## Project Structure

| What you need | Where it lives |
|--------------|----------------|
| Source code | `src/` |
| All tests | `tests/{unit,integration,api,e2e,...}/` |
| API docs | `docs/api/` |
| Runbooks | `docs/runbooks/RUNBOOK-{FEATURE}.md` |
| ADRs | `docs/adr/ADR-{NNNN}-{slug}.md` |
| Requirements | `requirements/REQ-{YYYY}-{NNNN}-{slug}.md` |
| Designs | `design/DESIGN-{YYYY}-{NNNN}-{slug}.md` |
| Architecture audits | `architecture/ARCH-AUDIT-{YYYY-MM-DD}.md` |
| DB migrations | `migrations/NNNN-{description}.sql` |
| Test reports | `reports/tests/TR-{datetime}.md` |
| Verification reports | `reports/verify/VR-{datetime}.md` |
| Dev session logs | `sessions/DEV-SESSION-{datetime}.md` |
| Strategy analyses | `strategy/STRATEGY-SESSION-{datetime}.md` |
| Local data (not in git) | `data/` |
| Dev scripts | `scripts/dev/` |
| Config (no secrets) | `config/` |
```

---

## Step 6 — Save project structure report

Save to:
```
sessions/DEV-SESSION-{YYYY-MM-DD-HH-MM-SS}-project-init.md
```

Content:

```markdown
---
date: {YYYY-MM-DD HH:MM:SS}
skill: /project-init
project: {name}
project_type: {api | fullstack | data-pipeline | cli | library | ai-agent}
language: {Node.js | Python | Go | ...}
---

## Directories Created
{list of new directories created}

## Directories Already Existed (skipped)
{list of directories that were already in place}

## Files Created
{list of new index/registry files created}

## .gitignore Entries Added
{list of new entries added}

## CLAUDE.md Updated
{yes | no — what was added}

## Project Structure
{full ASCII tree of the final structure}
```

---

## Step 7 — Report to user

```
=== PROJECT STRUCTURE INITIALIZED ===
Date:    {YYYY-MM-DD HH:MM}
Project: {name}
Type:    {project type}

CREATED
  {N} directories
  {N} index/registry files
  .gitignore updated

ALREADY IN PLACE (not touched)
  {list}

ROUTING MAP
  Added to CLAUDE.md → Project Structure section

REPORT
  sessions/DEV-SESSION-{datetime}-project-init.md

Next: run /dev to get a full project state analysis and decide what to build first.
```

---

## Idempotency guarantee

Running `/project-init` multiple times is always safe:
- Existing directories are detected and skipped
- Existing files are never overwritten
- .gitignore entries are checked for duplicates before adding
- CLAUDE.md is updated (not replaced) — only the Project Structure section is touched

---

## Invocation variants

```
/project-init             — auto-detect project type, create full structure
/project-init api         — force project type: api
/project-init fullstack   — force project type: fullstack
/project-init data        — force project type: data-pipeline
/project-init agent       — force project type: ai-agent
/project-init check       — report what's missing without creating anything
```
