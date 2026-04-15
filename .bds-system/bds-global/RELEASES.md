# BDS Global — Release History
> Version history for the BDS framework itself.
> Versioning: MAJOR.MINOR.PATCH
>   MAJOR — breaking changes to skills API, DB schema, or entity model
>   MINOR — new skills, new entities, new features (backwards compatible)
>   PATCH — bug fixes, doc corrections, config updates
>
> Each release: update bds-global.db `bds_framework.version`, update all registered projects via /bds-keeper upgrade.

---

## Unreleased (targeting v1.1)

### Added
- `projects` table in BDS-GLOBAL-SCHEMA.sql — global project registry (BDS-TASK-2026-0001)
- Project self-registration in `/bds-db init` (BDS-TASK-2026-0003)
- `/bds-db migrate` — live `bds-global.db` migration tooling (BDS-TASK-2026-0002)
- GeoClear onboarded as first reference project (BDS-TASK-2026-0004)

---

## v1.0 — 2026-04-15

**The Foundation Release.** First complete version of the BDS framework. Everything needed to bootstrap, run, and track a business from idea to revenue.

### Domain Model
- Created `~/.claude/DomainModel/` directory with 6 canonical documents
- 30 entity types across 7 tiers (Business → Strategy → Planning → Engineering → Quality → Operations → Governance)
- Entity ID format: `{PREFIX}-{TYPE}-{YYYY}-{NNNN}` — globally unique, project-scoped
- 8 lineage chains (L1: Primary Delivery through L8: KPI Feedback Loop)
- 5 report templates (Lineage Trace, Goal Dashboard, Delivery Chain, KPI Pulse, Orphan Audit)
- Decomposition model: BusinessIdea → Vision → BG → DG/MG/CGG → KPI → Epic → Feature → REQ → Design → Task → Delivery → Feedback

### Database Backbone
- `BDS-GLOBAL-SCHEMA.sql` — framework reference DB (skills registry, entity types, lineage chains, quality gates)
- `BDS-PROJECT-SCHEMA.sql` — project operational DB (entities, relationships, lineage, KPIs, audit, health, comms)
- `bds.config.yaml.template` — project configuration committed to git
- `~/.claude/bds-global.db` initialized: 27 skills, 30 entity types, 8 lineage chains, 11 quality gates
- All entity sequences atomic via `entity_sequences` table — no hand-sequencing

### Skills — New / Updated
- `/bds-bootstrap` — Added Phase 0.4 (3-letter prefix assignment + DB initialization + gitignore)
- `/bds-bootstrap` — Added Phase 2.5 (Goal Decomposition: BI→VIS→BG→MG/DG/CGG→KPI→EPIC)
- `/bds-import` — Added Step 4.5 with full Case B onboarding (8-step entity discovery, gap analysis, council setup, onboarding report)
- `/bds-db` — New skill: init, next-id, entity insert, migrate, health, query, status
- `/domain-lineage` — New skill: trace, chain, status, audit, fix, report, kpi
- `/dev-requirements` — Added lineage linkage (Step 2.5); REQ ID now uses `/bds-db next-id REQ`; prefixed IDs
- `/dev-plan` — Task section headers now include `[FEAT-{ID}] [BG-{ID}]`; TASK ID uses `/bds-db next-id TASK`; prefixed IDs
- `/bds` — Added lineage health layer (orphan rate thresholds: 5% = AT RISK, 10% = CRITICAL)
- `/project-init` — Added `.bds/`, `planning/`, `strategy/GOALS-*.md` to canonical directory structure; gitignore rules for `.bds/*.db`

### Global CLAUDE.md
- Added `DOMAIN MODEL` section with 7-tier entity summary and all DomainModel links
- Added `project_prefix` reading convention — all entity IDs must be prefixed at session start
- Added DB convention — `/bds-db next-id` is the only way to assign entity IDs

### BDS Global Documents (new — this framework managing itself)
- `BDS-GLOBAL-GOALS.md` — north star, vision, business goals, KPIs for BDS Global
- `BDS-GLOBAL-FEATURES.md` — canonical inventory of everything built in the framework
- `BDS-GLOBAL-QUEUE.md` — feature backlog with v1.1 / v1.2 / v1.3 release targets + rollout plan
- `BDS-GLOBAL-RELEASES.md` — this file

### Breaking Changes
None. This is the first release.

### Known Gaps (tracked in BDS-GLOBAL-QUEUE.md)
- `projects` table missing from bds-global.db (planned v1.1)
- `/bds-global` skill (cross-project dashboard) not yet built (planned v1.2)
- Physical-world task queue not yet built (planned v1.2)
- `/bds-keeper upgrade` rollout pipeline not yet built (planned v1.3)

---

## Pre-v1.0 Capabilities (carried forward, not tracked in releases)

The following skills existed before the formal versioning system was established:

**Strategy skills (11):** `/strategy`, `/strategy-swot`, `/strategy-value-prop`, `/strategy-personas`, `/strategy-competitors`, `/strategy-pricing`, `/strategy-breakeven`, `/strategy-gtm`, `/strategy-kpis`, `/strategy-90day`, `/strategy-pivot`

**Engineering skills (12):** `/dev`, `/dev-feature`, `/dev-requirements`, `/dev-design`, `/dev-plan`, `/dev-build`, `/dev-test`, `/dev-docs`, `/dev-commit`, `/dev-deploy`, `/dev-verify`, `/dev-status`

**Architecture skills (11):** `/dev-arch`, `/dev-arch-security`, `/dev-arch-reliability`, `/dev-arch-performance`, `/dev-arch-cost`, `/dev-arch-ops-excellence`, `/dev-arch-data`, `/dev-arch-application`, `/dev-arch-frontend`, `/dev-arch-agentic`, `/dev-arch-sustainability`

**Governance skills (8):** `/business-goal`, `/cpm`, `/observer`, `/comms`, `/experts`, `/project-init`, `/first-principles`, `/dev-secrets`

**BDS skills (5):** `/bds`, `/bds-bootstrap`, `/bds-import`, `/bds-customize`, `/bds-ops`, `/bds-keeper`

All of these are now versioned under BDS v1.0 going forward.
