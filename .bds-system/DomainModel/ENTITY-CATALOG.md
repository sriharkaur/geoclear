# BDS Domain Entity Catalog
> Complete listing of all entities in the Business Delivery System domain.
> Each entity: purpose, tier, ID format, key relationships, file home, lifecycle states.
> Last updated: 2026-04-15 | Version: 1.0

---

## Tier 1 — Business

### BusinessIdea `BI-{YYYY}-{NNNN}`
**Purpose:** The raw founding insight — what product, for whom, solving what problem. Created once at project start. The DNA of everything else. Every other entity is ultimately traceable to a BI.

**Created when:** User provides initial idea during `/bds-bootstrap` intake.
**Lifecycle:** `CAPTURED → REFINED → ACTIVE → PIVOTED | ARCHIVED`
**Parent:** none (root entity)
**Children:** Vision (VIS)
**File:** `strategy/BUSINESS-IDEAS.md`
**Key fields:** `id`, `raw_idea` (verbatim founder words), `problem`, `target_user`, `business_model`, `product_type`, `date`, `status`

---

### Vision `VIS-{YYYY}-{NNNN}`
**Purpose:** Where the company is in 3 years — the specific, measurable destination. Informs every business goal. Evolves with stage (PRE-LAUNCH → SCALE) but must stay consistent enough to provide direction.

**Created when:** `/business-goal capture` or `/bds-bootstrap` Phase 1.
**Lifecycle:** `DRAFT → COUNCIL_APPROVED → ACTIVE → REVISED | ACHIEVED`
**Parent:** BusinessIdea (BI)
**Children:** BusinessGoal (BG)
**File:** `BUSINESS-GOAL.md` (Vision section)
**Key fields:** `id`, `statement`, `horizon_years: 3`, `stage`, `approved_by`, `version`

---

### BusinessGoal `BG-{YYYY}-{NNNN}`
**Purpose:** A SMART (Specific, Measurable, Achievable, Relevant, Time-bound) objective for the current quarter. The primary unit of business intent that engineering, marketing, and customer success all work toward. Reset quarterly.

**Created when:** `/business-goal capture`, `/business-goal refine`, or `/strategy-90day` sets new objectives.
**Lifecycle:** `DRAFT → APPROVED → ACTIVE → ACHIEVED | MISSED | PIVOTED`
**Parent:** Vision (VIS)
**Children:** MarketingGoal (MG), DevGoal (DG), CustomerGrowthGoal (CGG), KPI (KPI)
**File:** `BUSINESS-GOAL.md` (Current Objectives table)
**Key fields:** `id`, `title`, `success_metric`, `target_date`, `owner`, `status`, `kpis: []`, `linked_vis`

---

### MarketingGoal `MG-{YYYY}-{NNNN}`
**Purpose:** A measurable marketing objective derived from a BusinessGoal. Covers demand generation, brand awareness, conversion, retention marketing. Owned by the CMO function. Translates the business goal into marketing-specific outcomes.

**Created when:** Strategy Council sets the GTM plan or `/strategy-gtm` runs.
**Lifecycle:** `DRAFT → ACTIVE → ACHIEVED | MISSED`
**Parent:** BusinessGoal (BG)
**Children:** KPI (KPI), GTM Activities
**File:** `strategy/GOALS-MARKETING.md`
**Key fields:** `id`, `title`, `channel`, `metric`, `baseline`, `target`, `timeline`, `linked_bg`, `linked_kpis: []`

**Examples:** "Achieve 500 signups from content marketing in Q2" | "Reduce paid CAC below $150 by end of month 3"

---

### DevGoal `DG-{YYYY}-{NNNN}`
**Purpose:** An engineering objective derived from a BusinessGoal. Defines what the engineering team must deliver to move the business goal forward. The bridge between business intent and the planning tier (Epics, Features, Requirements).

**Created when:** Engineering Council analysis during `/bds-bootstrap` Phase 3 or `/strategy-90day`.
**Lifecycle:** `DRAFT → ACTIVE → ACHIEVED | MISSED`
**Parent:** BusinessGoal (BG)
**Children:** Epic (EPIC)
**File:** `strategy/GOALS-DEV.md`
**Key fields:** `id`, `title`, `engineering_outcome`, `success_metric`, `target_date`, `linked_bg`, `linked_epics: []`

**Examples:** "Ship enrichment API v2 with 5 new data fields by end of Q2" | "Achieve p99 < 200ms on /v1/address by Apr 30"

---

### CustomerGrowthGoal `CGG-{YYYY}-{NNNN}`
**Purpose:** A customer growth objective (AARRR framework: Acquisition, Activation, Revenue, Referral, Retention) derived from a BusinessGoal. Drives product decisions around user journey and monetization.

**Created when:** `/strategy-kpis` or `/strategy-gtm` or Strategy Council.
**Lifecycle:** `DRAFT → ACTIVE → ACHIEVED | MISSED`
**Parent:** BusinessGoal (BG)
**Children:** KPI (KPI)
**File:** `strategy/GOALS-CUSTOMER.md`
**Key fields:** `id`, `title`, `aarrr_category` (Acquisition|Activation|Revenue|Referral|Retention), `metric`, `baseline`, `target`, `linked_bg`, `linked_kpis: []`

**Examples:** "Activate 80% of free signups within 24 hours" | "Achieve net revenue retention > 105%"

---

## Tier 2 — Strategy

### StrategyAnalysis `STRAT-{YYYY}-{NNNN}`
**Purpose:** A time-stamped strategy analysis (SWOT, value prop, competitors, pricing, GTM, breakeven, 90-day plan, personas, KPIs, pivot). Not a goal — an analysis that INFORMS goals and decisions. Must be re-run when stale.

**Created when:** `/strategy-*` skills are invoked.
**Lifecycle:** `COMPLETED → CURRENT (<60 days) → STALE (>60 days) → SUPERSEDED`
**Parent:** BusinessGoal (BG) or ad-hoc
**File:** `strategy/STRATEGY-SESSION-{datetime}.md`
**Key fields:** `id`, `type` (swot|value-prop|personas|competitors|pricing|gtm|kpis|90day|breakeven|pivot), `date`, `status`, `decisions_generated: []`

---

### Persona `PER-{YYYY}-{NNNN}`
**Purpose:** A named, hypothesized or validated customer segment. The anchor for feature prioritization, pricing, and GTM. Must be linked to at least one BG or MG.

**Created when:** `/strategy-personas` runs.
**Lifecycle:** `HYPOTHESIS → VALIDATED → PRIMARY | SECONDARY | RETIRED`
**Parent:** StrategyAnalysis (STRAT), linked to BusinessGoal (BG)
**File:** `strategy/PERSONAS.md`
**Key fields:** `id`, `name`, `role`, `pain_point`, `willingness_to_pay`, `acquisition_channel`, `status`

---

### KeyPerformanceIndicator `KPI-{YYYY}-{NNNN}`
**Purpose:** A specific, measurable metric with a target and a measurement method. The feedback mechanism between business outcomes and goals. KPIs are the connective tissue of the feedback loop.

**Created when:** `/strategy-kpis` runs or when a BG/DG/CGG is created with a measurable target.
**Lifecycle:** `DEFINED → TRACKING → ACHIEVED | MISSED | REVISED | RETIRED`
**Parent:** BusinessGoal (BG), MarketingGoal (MG), or CustomerGrowthGoal (CGG)
**File:** `strategy/KPIS.md`
**Key fields:** `id`, `name`, `metric_definition`, `baseline`, `target`, `measurement_period`, `data_source`, `current_value`, `status`, `linked_bg`, `linked_goal`
**Feedback trigger:** When `current_value` misses `target` by >20%, create a COMM item for review.

---

### PricingTier `TIER-{YYYY}-{NNNN}`
**Purpose:** A defined pricing band with specific entitlements. Connects business model to engineering limits (rate limiting, feature gating). Anchors the monetization strategy.

**Created when:** `/strategy-pricing` runs.
**Lifecycle:** `DRAFT → LIVE → REVISED | RETIRED`
**Parent:** StrategyAnalysis (STRAT)
**File:** `ARCHITECTURE.md` (Pricing table), `CLAUDE.md`
**Key fields:** `id`, `name`, `price_monthly`, `entitlements`, `rate_limits`, `stripe_price_id`, `status`

---

## Tier 3 — Planning

### Epic `EPIC-{YYYY}-{NNNN}`
**Purpose:** A large, multi-feature capability theme that takes 1-3 months to deliver. The intermediate layer between DevGoal and Feature — makes the goal concrete without going to requirement level. Enables progress tracking at the goal level.

**Created when:** `/dev-plan` decomposes a DevGoal, or manually during 90-day planning.
**Lifecycle:** `PLANNED → IN_PROGRESS → COMPLETE | CANCELLED`
**Parent:** DevGoal (DG)
**Children:** Feature (FEAT)
**File:** `planning/EPICS.md`
**Key fields:** `id`, `title`, `description`, `linked_dg`, `linked_bg`, `features: []`, `status`, `target_quarter`

---

### Feature `FEAT-{YYYY}-{NNNN}`
**Purpose:** A shippable product capability that delivers direct user value. A Feature maps to one or more Requirements. The unit of business delivery — what goes in FEATURES.md when done. Directly observable by customers.

**Created when:** Epics are broken down in planning, or when a capability is identified during requirements.
**Lifecycle:** `PLANNED → IN_PROGRESS → SHIPPED | DEPRECATED`
**Parent:** Epic (EPIC)
**Children:** Requirement (REQ)
**File:** `FEATURES.md`
**Key fields:** `id`, `title`, `epic`, `status`, `shipped_date`, `linked_reqs: []`

---

### Requirement `REQ-{YYYY}-{NNNN}`
**Purpose:** A precisely specified, reviewed, and approved description of what a feature must do — with acceptance criteria, out-of-scope definition, and edge cases. Must pass 3-layer review (Principal PM + Distinguished PM + Chief Architect) before any design work begins.

**Created when:** `/dev-requirements` is invoked.
**Lifecycle:** `DRAFT → APPROVED → LINKED_TO_DESIGN → IN_PROGRESS → DONE | REJECTED | SUPERSEDED`
**Parent:** Feature (FEAT)
**Children:** DesignDocument (DESIGN)
**File:** `requirements/REQ-{YYYY}-{NNNN}-{slug}.md`
**Key fields:** `id`, `title`, `status`, `feature`, `epic`, `business_goal`, `dev_goal`, `linked_design`, `linked_tasks: []`, `acceptance_criteria`, `out_of_scope`, `review_history`

---

### DesignDocument `DESIGN-{YYYY}-{NNNN}`
**Purpose:** The complete technical specification for implementing a requirement — API contract, data model, sequence diagram, error handling table, and full 9-dimension architecture review. No code is written until DESIGN is APPROVED.

**Created when:** `/dev-design REQ-{ID}` is invoked.
**Lifecycle:** `DRAFT → UNDER_REVIEW → APPROVED | REWORK_REQUIRED | SUPERSEDED`
**Parent:** Requirement (REQ)
**Children:** Task (TASK), ArchitectureDecision (AD)
**File:** `design/DESIGN-{YYYY}-{NNNN}-{slug}.md`
**Key fields:** `id`, `title`, `status`, `requirements: []`, `linked_tasks: []`, `arch_decisions: []`, `api_contract`, `data_model_changes`, `arch_review_9dim`

---

### ArchitectureDecision `AD-{NNNN}`
**Purpose:** A formal record of a significant architectural decision — what was decided, why, what alternatives were rejected, dissent preserved, and what would trigger revisiting. Prevents re-litigating settled decisions.

**Created when:** Engineering Council (`/bds-customize`) or during design review when a decision has architectural implications.
**Lifecycle:** `ACTIVE → SUPERSEDED | REVISIT_TRIGGERED`
**Parent:** DesignDocument (DESIGN) or standalone
**File:** `architecture/DECISION-LOG.md`
**Key fields:** `id`, `title`, `decision`, `rationale`, `alternatives_rejected`, `dissent`, `confidence`, `revisit_trigger`, `linked_design`, `linked_req`

---

## Tier 4 — Engineering

### Task `TASK-{YYYY}-{NNNN}`
**Purpose:** The smallest independently executable unit of engineering work — completable in one session, with a specific done-criterion. Contains a full task prompt (context, what to build, safeguards, acceptance criteria) so it can be executed by anyone without additional context.

**Created when:** `/dev-plan` decomposes a DesignDocument.
**Lifecycle:** `□ QUEUED → ⏳ IN_PROGRESS → ✅ DONE | ❌ BLOCKED | 🔁 NEEDS_REWORK`
**Parent:** DesignDocument (DESIGN)
**Children:** TestCase (TC), APIEndpoint (EP), DataModel (DM)
**File:** `QUEUE.md`
**Key fields:** `id`, `title`, `type` (code|schema|data|config|test|docs|infra), `design`, `requirement`, `feature`, `epic`, `business_goal`, `depends_on: []`, `blocks: []`, `done_when`, `risk`, `task_prompt`

---

### APIEndpoint `EP-{YYYY}-{NNNN}`
**Purpose:** A specific HTTP endpoint with its method, path, auth requirements, request/response contract, rate limits, and tier access rules. The atomic unit of API surface — referenced by tasks, designs, and the architecture doc.

**Created when:** A new endpoint is designed and implemented.
**Lifecycle:** `DESIGNED → IMPLEMENTED → LIVE | DEPRECATED`
**Parent:** Task (TASK), DesignDocument (DESIGN)
**File:** `ARCHITECTURE.md`
**Key fields:** `id`, `method`, `path`, `auth_required`, `tier_access`, `rate_limit`, `linked_design`, `linked_task`

---

### DataModel `DM-{YYYY}-{NNNN}`
**Purpose:** A specific database table or schema entity — its columns, constraints, indexes, and the query patterns it serves. The formal record of the data layer that links back to the design and requirement that necessitated it.

**Created when:** A design introduces a new table or significant schema change.
**Lifecycle:** `DESIGNED → MIGRATED → LIVE | DEPRECATED`
**Parent:** DesignDocument (DESIGN)
**File:** `schema.sql`, referenced in design docs
**Key fields:** `id`, `table_name`, `columns`, `indexes`, `linked_migration`, `linked_design`

---

### Migration `MIG-{YYYY}-{NNNN}`
**Purpose:** A versioned, reversible database schema change script. Applied to staging first, verified, then applied to prod. Includes forward and rollback SQL.

**Created when:** A DataModel change requires an ALTER TABLE or structural modification.
**Lifecycle:** `WRITTEN → APPLIED_STAGING → VERIFIED → APPLIED_PROD | ROLLED_BACK`
**Parent:** DataModel (DM), Task (TASK)
**File:** `migrations/MIG-{YYYY}-{NNNN}-{slug}.sql`
**Key fields:** `id`, `description`, `forward_sql`, `rollback_sql`, `staging_verified_at`, `prod_applied_at`

---

## Tier 5 — Quality

### TestCase `TC-{YYYY}-{NNNN}`
**Purpose:** A single verifiable test — Given/When/Then — that corresponds to one acceptance criterion in a Requirement. Not a test file; a logical test scenario. Links the quality signal to the business intent that originated it.

**Created when:** `/dev-test` or task of type `test` is executed. One TC per acceptance criterion in the REQ.
**Lifecycle:** `WRITTEN → PASSING | FAILING | SKIPPED | DEPRECATED`
**Parent:** Requirement (REQ), Task (TASK)
**Children:** TestResult (TR)
**File:** `tests/` (the file containing the test), indexed in test reports
**Key fields:** `id`, `title`, `type` (unit|integration|api|e2e|performance|security), `requirement_ac_ref`, `linked_req`, `linked_design`, `linked_task`, `status`

---

### TestResult `TR-{YYYY-MM-DD-HH-MM-SS}`
**Purpose:** The outcome of running a test suite at a specific point in time. Links the test execution to the commit, the deployment, and (on failure) the bugs it generates. The evidence that a requirement has been verified.

**Created when:** Tests are run (CI, manual, pre-deploy).
**Lifecycle:** `RUNNING → PASS | FAIL → (if FAIL) → BUG_CREATED`
**Parent:** TestCase (TC)
**File:** `reports/tests/TR-{datetime}.md`
**Key fields:** `id`, `timestamp`, `commit_sha`, `test_cases_run`, `passed`, `failed`, `skipped`, `duration_ms`, `triggered_by`, `linked_bugs: []`

---

### Bug `BUG-{YYYY}-{NNNN}`
**Purpose:** A defect — a gap between specified behavior (from REQ) and observed behavior (from TR). Must be linked to the failing TestResult and the Requirement it violates. Priority P0–P3 determines urgency.

**Created when:** A TestResult fails or a production incident reveals incorrect behavior.
**Lifecycle:** `OPEN → TRIAGED → IN_PROGRESS → FIXED → VERIFIED | WONTFIX | DUPLICATE`
**Parent:** TestResult (TR) or Incident (INC)
**Children:** Task (TASK) — the fix task
**File:** `tests/BUG-REGISTRY.md`
**Key fields:** `id`, `title`, `priority` (P0|P1|P2|P3), `description`, `steps_to_reproduce`, `expected_behavior`, `actual_behavior`, `linked_tr`, `linked_req`, `linked_inc`, `fix_task`

---

## Tier 6 — Operations

### VerificationReport `VR-{YYYY-MM-DD-HH-MM-SS}`
**Purpose:** Post-deploy verification of production health — smoke tests, health check results, key metric checks. The evidence that a deployment succeeded. Failure creates an Incident.

**Created when:** After every deployment, `/dev-verify` runs.
**Lifecycle:** `RUNNING → PASS | FAIL → (if FAIL) → INCIDENT_CREATED`
**Parent:** Deployment (DEP)
**File:** `reports/verify/VR-{datetime}.md`
**Key fields:** `id`, `timestamp`, `deployment`, `health_check_status`, `smoke_tests_passed`, `smoke_tests_failed`, `linked_incident`

---

### Deployment `DEP-{YYYY}-{NNNN}`
**Purpose:** A production or staging release event — the code commit, the deploy trigger, the service, and its outcome. Links the engineering work (Tasks) to the operational outcome (VerificationReport).

**Created when:** `/dev-deploy` is executed.
**Lifecycle:** `TRIGGERED → DEPLOYING → LIVE | FAILED | ROLLED_BACK`
**Parent:** Task(s) included in the deploy
**Children:** VerificationReport (VR)
**File:** `RELEASES.md`
**Key fields:** `id`, `timestamp`, `environment` (staging|prod), `commit_sha`, `tasks_included: []`, `service`, `status`, `linked_vr`

---

### Incident `INC-{YYYY}-{NNNN}`
**Purpose:** A production issue that affects customer experience or data integrity. Created by a failed VerificationReport or customer report. Drives root cause analysis and bug creation. Closed only when the fix is deployed and verified.

**Created when:** A VR fails in production or a customer reports a P0/P1 issue.
**Lifecycle:** `OPEN → INVESTIGATING → MITIGATED → ROOT_CAUSE_IDENTIFIED → FIXED | POSTMORTEM_DONE`
**Parent:** VerificationReport (VR) or external report
**Children:** Bug (BUG)
**File:** `docs/runbooks/INCIDENTS.md`
**Key fields:** `id`, `title`, `severity` (P0|P1|P2), `start_time`, `resolution_time`, `impact`, `root_cause`, `linked_vr`, `linked_bugs: []`, `postmortem_done`

---

### Runbook `RB-{YYYY}-{NNNN}`
**Purpose:** Step-by-step operational instructions for a specific scenario — data import, recovery, common failures. Written before an incident, not during. Linked to the feature or system component it covers.

**Created when:** `/dev-docs` runbook section or after any incident where a runbook was missing.
**Lifecycle:** `DRAFT → REVIEWED → CURRENT → STALE | SUPERSEDED`
**File:** `docs/runbooks/RUNBOOK-{slug}.md`
**Key fields:** `id`, `title`, `scenario`, `steps`, `rollback`, `linked_feature`, `linked_ep`, `last_tested`

---

## Tier 7 — Governance

### Decision `DEC-{NNNN}`
**Purpose:** A record of any consequential decision — product, technical, business — with the reasoning, alternatives, and the person/council who made it. Prevents re-opening settled issues. Every decision that could affect customers requires a DECISIONS.md entry.

**Created when:** A significant decision is made during any session, council, or user approval.
**Lifecycle:** `RECORDED → ACTIVE → SUPERSEDED | REVISITED`
**File:** `DECISIONS.md`
**Key fields:** `id`, `date`, `title`, `decision`, `rationale`, `alternatives_rejected`, `made_by`, `linked_entities: []`

---

### CommunicationItem `COMM-{NNNN}`
**Purpose:** Any item that requires human attention — a blocker, a review gate, an FYI, a credential request. The single channel between the autonomous system and the human. Every blocker, every approval, every question goes through COMM. Closed only when the human acts.

**Created when:** The system needs human input, approval, or notification.
**Lifecycle:** `🆕 NEW → ⏳ IN_PROGRESS → ✅ DONE | ❌ REJECTED`
**File:** `COMMS.md`
**Key fields:** `id`, `category` (BLOCKER|REVIEW|FYI|CREDENTIAL|DECISION), `title`, `description`, `action_required`, `linked_entities: []`, `lineage` (chain from BI to this item), `status`

---

### SessionLog `SESSION-{YYYY-MM-DD-HH-MM-SS}`
**Purpose:** A full record of what happened in a BDS session — what was decided, what was built, what was deployed, what remains. Enables any future session to pick up exactly where this one left off.

**Created when:** Any skill that saves session output (`/bds`, `/dev`, `/strategy`, etc.).
**Lifecycle:** `RECORDED` (immutable after creation)
**File:** `sessions/{skill}-SESSION-{datetime}.md`
**Key fields:** `id`, `date`, `skill`, `stage`, `tasks_completed: []`, `decisions_made: []`, `next_actions: []`
