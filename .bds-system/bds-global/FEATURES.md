# BDS Global — Feature Inventory
> Canonical list of everything built in the BDS framework.
> Last updated: 2026-04-15 | Framework version: 1.0
> This is the authoritative record. Before building anything new, check here first.

---

## TIER 1: STRATEGY SKILLS (11 skills)

| Skill | Entry Point | Status | Notes |
|-------|-------------|--------|-------|
| Strategy Meta-Orchestrator | `/strategy` | ✅ LIVE | Routes to right skill based on project state |
| SWOT Analysis | `/strategy-swot` | ✅ LIVE | Adapted for new idea or existing product |
| Value Proposition | `/strategy-value-prop` | ✅ LIVE | Core promise + differentiation matrix |
| Customer Personas | `/strategy-personas` | ✅ LIVE | 2–3 hypothesis segments with JTBD |
| Competitor Analysis | `/strategy-competitors` | ✅ LIVE | Moat, position, threat assessment |
| Pricing Strategy | `/strategy-pricing` | ✅ LIVE | Model + tiers + unit economics |
| Break-Even Analysis | `/strategy-breakeven` | ✅ LIVE | Path to profitability with runway |
| Go-to-Market Plan | `/strategy-gtm` | ✅ LIVE | Channel strategy + launch sequence |
| KPI Dashboard | `/strategy-kpis` | ✅ LIVE | KPI registry + measurement cadence |
| 90-Day Execution Plan | `/strategy-90day` | ✅ LIVE | Monthly milestones + resource plan |
| Pivot Analysis | `/strategy-pivot` | ✅ LIVE | When and how to pivot, evidence-based |

---

## TIER 2: ENGINEERING SKILLS — 10-Gate Pipeline (12 skills)

| Gate | Skill | Entry Point | Status | Notes |
|------|-------|-------------|--------|-------|
| — | Engineering Meta-Orchestrator | `/dev` | ✅ LIVE | Reads all state; routes to highest-leverage gate |
| — | Full Feature Pipeline | `/dev-feature` | ✅ LIVE | End-to-end REQ→DESIGN→PLAN→BUILD→TEST→DOCS→COMMIT→DEPLOY→VERIFY |
| Gate 1 | Requirements Engineering | `/dev-requirements` | ✅ LIVE | Principal PM + Distinguished PM review; lineage linkage; `/bds-db next-id REQ` |
| Gate 2 | Design Document | `/dev-design` | ✅ LIVE | 9-dimension review; Chief Architect approval |
| Gate 3 | Task Planning | `/dev-plan` | ✅ LIVE | Principal TPM + Architect; First Time Right prompts; `/bds-db next-id TASK` |
| Gate 4 | Architecture Audit | `/dev-arch-audit` | ✅ LIVE | PRISM-10 orchestrator (10 dimensions) |
| Gate 5 | Build Phase | `/dev-build` | ✅ LIVE | First Time Right execution from QUEUE task prompts |
| Gate 6 | Testing | `/dev-test` | ✅ LIVE | 10 test layers; TC/TR/BUG entity management |
| Gate 7 | Documentation | `/dev-docs` | ✅ LIVE | API docs, runbooks, ADRs |
| Gate 8 | Commit | `/dev-commit` | ✅ LIVE | Conventional commits + doc-in-same-commit enforcement |
| Gate 9 | Deploy | `/dev-deploy` | ✅ LIVE | Render/Railway/Vercel/AWS patterns |
| Gate 10 | Verify | `/dev-verify` | ✅ LIVE | Smoke test + VR entity creation |
| — | Project Status | `/dev-status` | ✅ LIVE | Master project state reader |
| — | Secrets Management | `/dev-secrets` | ✅ LIVE | API key discovery, rotation, audit |

---

## TIER 3: PRISM-10 ARCHITECTURE DIMENSIONS (11 skills)

| Dimension | Entry Point | Status |
|-----------|-------------|--------|
| Architecture Orchestrator | `/dev-arch` | ✅ LIVE |
| Security | `/dev-arch-security` | ✅ LIVE |
| Reliability | `/dev-arch-reliability` | ✅ LIVE |
| Performance | `/dev-arch-performance` | ✅ LIVE |
| Cost Optimization | `/dev-arch-cost` | ✅ LIVE |
| Operations Excellence | `/dev-arch-ops-excellence` | ✅ LIVE |
| Enterprise Data | `/dev-arch-data` | ✅ LIVE |
| Application Architecture | `/dev-arch-application` | ✅ LIVE |
| Frontend Architecture | `/dev-arch-frontend` | ✅ LIVE |
| Agentic AI Architecture | `/dev-arch-agentic` | ✅ LIVE |
| Sustainability | `/dev-arch-sustainability` | ✅ LIVE |

---

## TIER 4: BDS ORCHESTRATION SKILLS (7 skills)

| Skill | Entry Point | Status | Notes |
|-------|-------------|--------|-------|
| Business Health Check | `/bds` | ✅ LIVE | 5-layer score; lineage orphan check; routes to highest leverage |
| New Project Bootstrap | `/bds-bootstrap` | ✅ LIVE | Phases 0–5; Phase 0.4 (DB + prefix); Phase 2.5 (Goal Decomposition) |
| BDS Import | `/bds-import` | ✅ LIVE | Skill copy + Case B full onboarding (entity discovery, gap analysis, council setup, onboarding report) |
| BDS Customize | `/bds-customize` | ✅ LIVE | Chief Architect council customization for existing projects |
| BDS Database | `/bds-db` | ✅ LIVE | init, next-id, entity insert, migrate, health, query, status |
| BDS Operations | `/bds-ops` | ✅ LIVE | Cost tracking, agent run metrics, operational health |
| BDS Keeper | `/bds-keeper` | ✅ LIVE | Framework version management; upgrade pipeline (rollout to all projects) |

---

## TIER 5: GOVERNANCE SKILLS (10 skills)

| Skill | Entry Point | Status | Notes |
|-------|-------------|--------|-------|
| North Star / Business Goal | `/business-goal` | ✅ LIVE | Captures and maintains north star; weekly staleness check |
| Chief Program Manager | `/cpm` | ✅ LIVE | Full program view: delivery, risks, decisions, economics |
| Observer | `/observer` | ✅ LIVE | Neutral witness; evidence-based drift detection |
| Communications Hub | `/comms` | ✅ LIVE | COMMS.md manager; surfaces open items at session start |
| Domain Lineage | `/domain-lineage` | ✅ LIVE | Entity traceability; orphan audit; 8 lineage chains |
| Experts System | `/experts` | ✅ LIVE | Adds named domain experts to any project |
| Project Init | `/project-init` | ✅ LIVE | Directory structure incl. `.bds/`, `planning/`, `strategy/GOALS-*.md` |
| First Principles | `/first-principles` | ✅ LIVE | Team constitution template (6 non-negotiable rules) |
| Project Manager | `/cpm` | ✅ LIVE | — |

---

## TIER 6: DOMAIN MODEL (built 2026-04-15)

| Artifact | Location | Status |
|----------|----------|--------|
| Entity ID Registry — 30 types, format rules, sequence rules | `~/.claude/DomainModel/ID-REGISTRY.md` | ✅ LIVE |
| Entity Catalog — purpose, lifecycle, relationships per entity | `~/.claude/DomainModel/ENTITY-CATALOG.md` | ✅ LIVE |
| Entity Hierarchy Map — 7-tier ASCII + relationship matrix | `~/.claude/DomainModel/ENTITY-MAP.md` | ✅ LIVE |
| Lineage Rules — 8 chains (L1–L8) with full entity sequences | `~/.claude/DomainModel/LINEAGE-RULES.md` | ✅ LIVE |
| Decomposition Model — BI→VIS→BG→Goals→Epics→Features→REQ→TASK | `~/.claude/DomainModel/DECOMPOSITION.md` | ✅ LIVE |
| Reporting Templates — 5 reports (Lineage, Dashboard, Pulse, Orphan, Chain) | `~/.claude/DomainModel/REPORTING.md` | ✅ LIVE |
| BDS Global Schema — framework reference DB (skills, entity types, lineage, gates) | `~/.claude/DomainModel/BDS-GLOBAL-SCHEMA.sql` | ✅ LIVE |
| BDS Project Schema — project operational DB (entities, KPIs, audit, health) | `~/.claude/DomainModel/BDS-PROJECT-SCHEMA.sql` | ✅ LIVE |
| Project Config Template — `bds.config.yaml` (committed to git per project) | `~/.claude/DomainModel/bds.config.yaml.template` | ✅ LIVE |

---

## TIER 7: GLOBAL BDS DATABASE (`~/.claude/bds-global.db`)

| Component | Status | Rows |
|-----------|--------|------|
| Framework version table (`bds_framework`) | ✅ seeded | 1 (v1.0) |
| Skills registry (`skills_registry`) | ✅ seeded | 27 skills |
| Entity type definitions (`entity_type_definitions`) | ✅ seeded | 30 types |
| Lineage chain definitions (`lineage_chain_definitions`) | ✅ seeded | 8 chains |
| Quality gate definitions (`quality_gates`) | ✅ seeded | 11 gates |
| Projects registry (`projects`) | ⚠️ NOT YET BUILT | — |

---

## ACTIVE PROJECTS

| Prefix | Project | Stage | DB | Notes |
|--------|---------|-------|----|-------|
| GEO | GeoClear — US Address Intelligence API | EARLY (LIVE) | Pending `/bds-db init` | First reference project |

---

## NOT YET BUILT

| Feature | Epic | Priority | Description |
|---------|------|----------|-------------|
| Projects registry in global DB | BDS-EPIC-2026-0001 | P1 | `projects` table in bds-global.db so `/bds-global` can enumerate all projects |
| Agent-to-agent communication | BDS-EPIC-2026-0002 | P1 | Cross-project COMM view; task delegation between agents; unified blocking-item surface |
| Physical-world task queue | BDS-EPIC-2026-0003 | P1 | Dedicated section in COMMS.md + DB for human-only tasks; SLA tracking |
| `/bds-global` — portfolio dashboard | BDS-EPIC-2026-0004 | P2 | Health scores for all registered projects; AT RISK / CRITICAL flags across portfolio |
| `/bds-keeper upgrade` — rollout pipeline | BDS-EPIC-2026-0005 | P2 | Pull new skills + schema migrations to all projects; zero-downtime; reversible |
| Autonomous operation hardening | BDS-EPIC-2026-0006 | P3 | Scheduled /bds runs via cron; automated COMM surfacing; self-healing agents |
| Lineage visualization | BDS-EPIC-2026-0007 | P3 | ASCII or Mermaid diagram of full BI→TASK chain on demand |
