# Project Guide — Structure & Organization

> Standard project structure used at Google, Meta, and Anthropic.
> Every file has a home. Every output is dated and retrievable. Nothing gets lost between sessions.

---

## What is this?

`/project-init` creates the standard directory structure for any software project. It sets up where source code lives, where tests go, where docs belong, and where every framework output (test reports, strategy sessions, architecture audits) is saved.

Run it once at the start of a project. It is **idempotent** — safe to run on an existing project; it only creates what is missing and never overwrites existing files.

---

## Quick Start

```
/project-init             ← auto-detects project type, creates full structure
/project-init check       ← see what's missing without creating anything
/project-init api         ← force type: api
/project-init fullstack   ← force type: fullstack
/project-init data        ← force type: data-pipeline
/project-init agent       ← force type: ai-agent
```

---

## The Standard Structure

```
project-root/
│
├── src/                    ← ALL production source code lives here
│   └── {module}/           ← one subdirectory per logical domain/module
│
├── tests/                  ← ALL test code (mirrors the 10-layer /dev-test framework)
│   ├── unit/               ← fast, isolated, no I/O (TC-UNIT-*)
│   ├── integration/        ← real DB, real services (TC-INT-*)
│   ├── system/             ← full service under test (TC-SYS-*)
│   ├── api/                ← HTTP contract tests (TC-API-*)
│   ├── e2e/                ← user journey tests (TC-E2E-*)
│   ├── visual/             ← screenshot regression (TC-VIS-*)
│   ├── performance/        ← load and latency tests (TC-PERF-*)
│   ├── security/           ← auth, injection, OWASP (TC-SEC-*)
│   ├── data/               ← schema, quality, migration (TC-DATA-*)
│   ├── pipeline/           ← end-to-end data flows (TC-PIPE-*)
│   └── fixtures/           ← shared test data and mocks
│
├── docs/                   ← all human-readable documentation
│   ├── api/                ← API reference (OpenAPI specs, endpoint docs)
│   ├── guides/             ← user guide, developer guide, onboarding
│   ├── runbooks/           ← one file per alert or failure mode
│   │   └── RUNBOOK-{FEATURE}.md
│   ├── adr/                ← Architecture Decision Records
│   │   └── ADR-{NNNN}-{slug}.md
│   └── architecture/       ← architecture diagrams, C4 models
│
├── requirements/           ← REQ-{YYYY}-{NNNN} files (from /dev-requirements)
│   └── REQUIREMENTS-INDEX.md
│
├── design/                 ← DESIGN-{YYYY}-{NNNN} files (from /dev-design)
│   └── DESIGN-INDEX.md
│
├── architecture/           ← ARCH-AUDIT-{YYYY-MM-DD} files (from /dev-arch-audit)
│   └── ARCH-AUDIT-INDEX.md
│
├── migrations/             ← numbered DB migration files (schema changes)
│   └── NNNN-{description}.sql    ← e.g. 0001-create-users.sql
│
├── scripts/                ← utility scripts
│   ├── dev/                ← local dev helpers (start server, seed DB)
│   ├── ops/                ← deployment, infrastructure scripts
│   └── data/               ← data import/export/transform scripts
│
├── config/                 ← configuration (no secrets ever go here)
│   ├── default.json        ← base config
│   ├── production.json     ← production overrides
│   └── test.json           ← test environment overrides
│
├── reports/                ← all generated reports
│   ├── tests/              ← TR-{datetime}.md (from /dev-test)
│   ├── verify/             ← VR-{datetime}.md (from /dev-verify)
│   ├── performance/        ← perf test outputs, flame graphs
│   └── security/           ← security scan results
│
├── sessions/               ← DEV-SESSION-{datetime}.md (from /dev)
│
├── strategy/               ← STRATEGY-SESSION-{datetime}.md (from /strategy)
│   └── STRATEGY-INDEX.md
│
├── data/                   ← local data files — ALWAYS gitignored
│   ├── raw/                ← source data, never modified
│   ├── processed/          ← transformed/cleaned data
│   ├── exports/            ← data exports for external use
│   └── dev/                ← development database and sample data
│
├── .claude/                ← Claude Code configuration
│   ├── skills/             ← project-local skill files
│   └── commands/           ← project-local command shortcuts
│
├── CLAUDE.md               ← master orchestrator — rules, routing, stack
├── FEATURES.md             ← what is built (authoritative inventory)
├── ARCHITECTURE.md         ← tech stack, all endpoints, data model
├── QUEUE.md                ← task execution state (TASK-NNNN items)
├── RELEASES.md             ← version history
├── FRAMEWORK.md            ← ← master index for all frameworks (start here)
├── DEV-FRAMEWORK.md        ← dev framework user guide
├── STRATEGY-FRAMEWORK.md   ← strategy framework user guide
└── PROJECT-GUIDE.md        ← this file
```

---

## Additional Directories by Project Type

**Full-stack web app** — add inside `src/`:
```
src/
  api/          ← backend handlers and routes
  web/          ← frontend (components, pages, hooks, styles)
  shared/       ← types and utilities shared between api and web
```

**Data pipeline** — add:
```
src/
  ingest/       ← data source connectors
  transform/    ← Bronze→Silver→Gold transformation logic
  serve/        ← serving layer (API or export)
pipelines/      ← pipeline definitions (DAGs, dbt models)
notebooks/      ← exploratory analysis (outputs gitignored)
```

**AI agent** — add:
```
src/
  agents/       ← agent definitions and orchestration
  tools/        ← tool implementations (one file per tool)
  prompts/      ← prompt templates (versioned like code)
evals/          ← evaluation datasets and test harness
  datasets/     ← eval inputs + expected outputs
  results/      ← eval run results (gitignored)
```

**Library / SDK** — add:
```
examples/       ← working usage examples
benchmarks/     ← performance benchmarks
```

---

## The .gitignore Rules

`/project-init` adds these automatically. Understand why each is there:

| Pattern | Why |
|---------|-----|
| `data/` | May contain PII, large files (>100MB), or live database files. Never in git. |
| `*.db`, `*.db-shm`, `*.db-wal` | SQLite databases. Live data, large files. |
| `reports/` | Generated output. Can always be reproduced. |
| `sessions/` | Dev session logs. Ephemeral. |
| `evals/results/` | Large eval outputs. Reproducible. |
| `.env`, `.env.*` | Secrets. `!.env.example` is allowed (shows required vars without values). |
| `node_modules/`, `.venv/` | Dependencies. Installed from package manifest. |

**`strategy/` is NOT gitignored** — strategy analyses are valuable business artifacts worth versioning.

---

## Where Every Output Goes

This is the master reference. If a skill produces output, it goes here:

| Output type | Directory | Naming |
|-------------|-----------|--------|
| Dev session plans (`/dev`) | `sessions/` | `DEV-SESSION-{YYYY-MM-DD-HH-MM-SS}.md` |
| Strategy sessions (`/strategy`) | `strategy/` | `STRATEGY-SESSION-{YYYY-MM-DD-HH-MM-SS}.md` |
| Project init report | `sessions/` | `DEV-SESSION-{datetime}-project-init.md` |
| Requirements (`/dev-requirements`) | `requirements/` | `REQ-{YYYY}-{NNNN}-{slug}.md` |
| Designs (`/dev-design`) | `design/` | `DESIGN-{YYYY}-{NNNN}-{slug}.md` |
| Architecture audits (`/dev-arch-audit`) | `architecture/` | `ARCH-AUDIT-{YYYY-MM-DD}.md` |
| Test reports (`/dev-test`) | `reports/tests/` | `TR-{YYYYMMDD-HHMMSS}.md` |
| Verification reports (`/dev-verify`) | `reports/verify/` | `VR-{YYYYMMDD-HHMMSS}.md` |
| ADRs (`/dev-arch`) | `docs/adr/` | `ADR-{NNNN}-{slug}.md` |
| Runbooks | `docs/runbooks/` | `RUNBOOK-{FEATURE}.md` |
| DB migrations | `migrations/` | `NNNN-{description}.sql` |

---

## How CLAUDE.md Uses This Structure

After `/project-init`, CLAUDE.md gets a **Project Structure** section added automatically. This is the routing table Claude Code uses to know where to find and save everything without asking.

Example routing table in CLAUDE.md:
```
| What you need          | Where it lives                              |
|------------------------|---------------------------------------------|
| Source code            | src/                                        |
| API tests              | tests/api/                                  |
| API reference docs     | docs/api/                                   |
| Runbook for X          | docs/runbooks/RUNBOOK-X.md                  |
| Architecture decisions | docs/adr/ADR-NNNN-slug.md                   |
| Requirements           | requirements/REQ-YYYY-NNNN-slug.md          |
| Designs                | design/DESIGN-YYYY-NNNN-slug.md             |
| Architecture audits    | architecture/ARCH-AUDIT-YYYY-MM-DD.md       |
| DB migrations          | migrations/NNNN-description.sql             |
| Test reports           | reports/tests/TR-datetime.md                |
| Dev session logs       | sessions/DEV-SESSION-datetime.md            |
| Strategy analyses      | strategy/STRATEGY-SESSION-datetime.md       |
```

---

## FAQ

**Q: Can I rename these directories?**
Yes, but update CLAUDE.md's routing table too. Skills read CLAUDE.md to know where things live.

**Q: What if my project already has a `src/` structure that differs?**
Run `/project-init check` first to see what would be created. Then run `/project-init` — it won't touch existing directories.

**Q: Do I need all these directories for a small project?**
No. The essential ones are: `src/`, `tests/`, `docs/`, `sessions/`, `strategy/`. The rest get created as you need them.

**Q: Where do secrets go?**
Never in the project. Secrets go in environment variables (`.env` locally, platform dashboard in prod). `.env.example` shows what variables are needed without values.
