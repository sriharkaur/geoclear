# /bds-bootstrap — New Project Bootstrap

> Triggered automatically when a new project is started and the user provides a business idea.
> Runs the full BDS pipeline: strategy analysis → engineering analysis → project initialization → autonomous build.
> Two approval gates (after strategy, after engineering). After that: autonomous execution until the business objective is achieved.
>
> Acting as: Principal Founder CTO at a Google/Meta/Anthropic-caliber team.
> Standard: production-grade, profitable, scalable, reliable, secure from day one.

---

## How this is triggered

Automatically: when the global CLAUDE.md detects a new project (no CLAUDE.md, FEATURES.md, or QUEUE.md) and the user's first message is a business idea.

Manually: `/bds-bootstrap "I want to build..."` or `/bds-bootstrap` (reads the user's prior message).

The user's message = the business idea. Treat it as the seed for everything that follows.

---

## PHASE 0 — Import, Verify, and GitHub Setup

**Step 0.1 — Verify BDS skill system**

Check: do files exist in `~/.claude/skills/` for each required skill?
```
Required: bds, bds-customize, dev-secrets, dev, strategy, project-init,
          dev-requirements, dev-design, dev-plan, dev-arch, dev-build,
          dev-test, dev-docs, dev-commit, dev-deploy, dev-verify,
          strategy-swot, strategy-value-prop, strategy-personas,
          strategy-competitors, strategy-pricing, strategy-gtm,
          strategy-kpis, strategy-90day, strategy-breakeven
```
If any are missing: run `/bds-import` first to pull from global, then continue.

Copy all skills to project: `mkdir -p .claude/skills .claude/commands && cp ~/.claude/skills/*.md .claude/skills/ .claude/commands/`

**Step 0.2 — Check current directory**
- Is this a new project (no CLAUDE.md, no FEATURES.md)?
- What files exist? (package.json, pyproject.toml, go.mod — detect existing codebase)

**Step 0.3 — GitHub repository setup**

Read GitHub token from environment:
```bash
source ~/.zshrc 2>/dev/null
# Look for: GITHUB_TOKEN, GH_TOKEN
# If gh CLI is installed: gh auth status
```

If GitHub token found:
1. Generate project slug from business idea (lowercase, hyphenated, max 40 chars)
2. Check if `gh` CLI is available: `which gh`

   **If gh CLI available (preferred):**
   ```bash
   gh repo create {project-slug} \
     --private \
     --description "{one-line business description}" \
     --clone=false
   ```

   **If gh CLI not available, use API:**
   ```bash
   curl -s -X POST https://api.github.com/user/repos \
     -H "Authorization: Bearer ${GITHUB_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{"name":"{project-slug}","private":true,"description":"{description}","auto_init":false}'
   ```

3. Get the authenticated username:
   ```bash
   gh api user --jq .login   # or: curl -s -H "Authorization: Bearer ${GITHUB_TOKEN}" https://api.github.com/user | jq -r .login
   ```

4. Store for later (Phase 4 will do the first push):
   ```
   GITHUB_REMOTE: git@github.com:{username}/{project-slug}.git
   GITHUB_REPO_URL: https://github.com/{username}/{project-slug}
   ```

If NO GitHub token: note it, continue without GitHub setup. User can set up manually later.

---

## PHASE 0.4 — BDS Database Initialization

**Step 0.4.1 — Assign project prefix**

Derive a 3-letter uppercase prefix from the project name or slug:
- Take the first meaningful word (skip articles: "a", "the", "an")
- Use first 3 consonants or first 3 characters — whichever reads more clearly
- Examples: "GeoAddress API" → GEO, "FinancePulse" → FIN, "MedTrack" → MED, "DevOps Dashboard" → DEV

Check for collision: read `~/.claude/bds-global.db` projects table (if DB exists):
```sql
SELECT project_prefix FROM projects WHERE project_prefix = '{PREFIX}';
```
If collision found: try next logical variant (e.g., GEO → GEA → GAD). Show the chosen prefix.

Append to project `CLAUDE.md` (create it if this is the first write):
```markdown
## BDS Project Prefix
project_prefix: {PREFIX}
```

**Step 0.4.2 — Initialize project BDS database**

Run `/bds-db init` with the chosen prefix:
```bash
# Create .bds/ directory
mkdir -p .bds

# Initialize project DB from global schema
sqlite3 .bds/bds.db < ~/.claude/DomainModel/BDS-PROJECT-SCHEMA.sql

# Create bds.config.yaml from template
cp ~/.claude/DomainModel/bds.config.yaml.template .bds/bds.config.yaml
```

Populate `bds.config.yaml` with project-specific values:
```yaml
project:
  id: "{PREFIX}"
  name: "{project name from intake}"
  description: "{one-line from business idea}"
  product_type: "{classified in Phase 1}"
  stage: PRE_LAUNCH

bds:
  inherited_at: "{YYYY-MM-DD}"
```

**Step 0.4.3 — Seed project_info in DB**

```sql
INSERT INTO project_info (
  project_name, project_prefix, product_type, stage,
  framework_version, schema_version, initialized_at
) VALUES (
  '{project_name}', '{PREFIX}', '{product_type}', 'PRE_LAUNCH',
  '1.0', '1.0', datetime('now')
);
```

**Step 0.4.4 — Register BI entity in DB**

The BusinessIdea will be assigned in Phase 1 (`BI-{YYYY}-0001`). After Phase 1 creates it, also run:
```sql
INSERT INTO entities (entity_id, entity_type, title, status, created_at)
VALUES ('{PREFIX}-BI-{YYYY}-0001', 'BI', '{business_idea_title}', 'ACTIVE', datetime('now'));

INSERT INTO entity_sequences (entity_type, year, last_seq)
VALUES ('BI', {YYYY}, 1)
ON CONFLICT(entity_type, year) DO UPDATE SET last_seq = 1;
```

**Step 0.4.5 — Update .gitignore**

Add to project `.gitignore`:
```
# BDS operational database (project-specific, not committed)
.bds/*.db
.bds/*.db-wal
.bds/*.db-shm
```

Commit `.bds/bds.config.yaml` to git (the config IS tracked; the DB is NOT).

**Show Phase 0 summary** (no approval needed — continue immediately):
```
=== PHASE 0 COMPLETE ===
BDS skills:     {N} imported ✅
Project prefix: {PREFIX}
Project DB:     .bds/bds.db initialized ✅
Config:         .bds/bds.config.yaml ✅ (committed to git)
GitHub repo:    {created at github.com/{user}/{slug} | not configured — GITHUB_TOKEN not found}
```

---

## PHASE 1 — Intake Analysis (no user input needed, ~2 minutes)

**Assign BusinessIdea ID:** This is the root entity — `BI-{YYYY}-0001`.
Create or append to `strategy/BUSINESS-IDEAS.md`:
```yaml
id: BI-{YYYY}-0001
raw_idea: "{verbatim user input — do not paraphrase}"
date: {YYYY-MM-DD}
status: CAPTURED
```
All entities created in this project trace back to `BI-{YYYY}-0001`.

Parse the business idea from the user's input. Extract:

```
BUSINESS_IDEA:        {one sentence — what the product does}
PROBLEM_BEING_SOLVED: {the pain point being addressed}
TARGET_USER:          {who experiences this problem}
BUSINESS_MODEL:       {how it makes money — subscription, usage, marketplace, one-time, etc.}
STATED_CONSTRAINTS:   {anything the user mentioned: budget, timeline, tech stack preference}
SIMILAR_PRODUCTS:     {any comparable products mentioned or implied}
AMBIGUITY_LEVEL:      {clear / needs refinement / very vague}
```

If AMBIGUITY_LEVEL is "very vague": ask ONE clarifying question to resolve the most critical ambiguity (e.g., "Is this B2B or B2C?"). Then proceed without further questions.

**Classify the product type:**
```
API_SERVICE        — developer-facing API (usage-based or subscription)
SAAS_WEB_APP       — subscription web application for businesses
CONSUMER_APP       — web or mobile app for consumers
DATA_PRODUCT       — data pipeline, analytics, intelligence service
MARKETPLACE        — connects buyers and sellers
DEVELOPER_TOOL     — CLI, SDK, or IDE plugin
AI_AGENT_PRODUCT   — LLM-powered automation or assistant
CONTENT_PLATFORM   — media, education, community
```

**Determine initial tech stack hypothesis** based on product type:
```
API_SERVICE:        Node.js/Express or Python/FastAPI, SQLite→Postgres, Stripe
SAAS_WEB_APP:       Next.js + API layer, Postgres, Stripe, Auth (Clerk/Auth0)
CONSUMER_APP:       React/Next.js, lightweight backend, optional auth
DATA_PRODUCT:       Python, SQLite/DuckDB/Postgres, data pipeline tooling
AI_AGENT_PRODUCT:   Node.js or Python, Anthropic SDK, vector DB if RAG needed
MARKETPLACE:        Next.js + API, Postgres, Stripe Connect, auth
```

Show the intake summary to the user.

**Step 1.5 — Create the North Star**

Immediately after the intake summary, run `/business-goal capture` with the intake analysis as input.

This creates `BUSINESS-GOAL.md` — the project's north star. Every subsequent skill (strategy, engineering, CPM, Observer) reads this file. It is the single answer to "what are we actually trying to build, for whom, and what does winning look like?"

Show the North Star sentence from BUSINESS-GOAL.md to the user, clearly labeled:

```
NORTH STAR: {one sentence}
```

Do not wait for confirmation — continue immediately to Phase 2.

---

## PHASE 2 — Strategy Analysis (runs autonomously, shows consolidated output)

**Acting as McKinsey Senior Partner with deep domain expertise in the product's industry.**

Run all applicable strategy analyses. Each skill reads the business idea as its context. Do not pause between skills.

Run in this order:
1. `/strategy-swot` — adapted for a business idea (not existing product)
2. `/strategy-value-prop` — the core promise and differentiation
3. `/strategy-personas` — 2–3 hypothesis customer segments
4. `/strategy-competitors` — who else solves this; how to differentiate
5. `/strategy-pricing` — recommended model and price points with rationale
6. `/strategy-breakeven` — how many customers to reach profitability

After all six complete, produce a **STRATEGY BRIEF** — a consolidated, actionable summary:

```
=== STRATEGY BRIEF ===
Business: {name hypothesis or description}
Category: {product type}
Stage: PRE-LAUNCH

THE OPPORTUNITY
{2–3 sentences: the problem, why now, why this approach wins}

TARGET CUSTOMER (Primary Persona)
{Name, role/description, top pain point, why they pay}

DIFFERENTIATION
{What makes this defensibly different from alternatives — not features, but position}

BUSINESS MODEL
  Model:          {subscription / usage-based / marketplace / one-time}
  Entry price:    {$ amount and what it includes}
  Target ARPU:    {$ per customer per month}
  Path to $10K MRR: {N customers at entry price, or mix}
  Gross margin target: {X%}

COMPETITIVE POSITION
  Key competitors: {top 2–3}
  Our advantage:   {specific, defensible reason we win}
  Risk:            {biggest threat from competitors}

MARKET TIMING
{Why now? What's changed that makes this the right time?}

TOP 3 STRATEGIC RISKS
  1. {risk} — mitigation: {how to address}
  2. {risk} — mitigation: {how to address}
  3. {risk} — mitigation: {how to address}

RECOMMENDED FIRST 90 DAYS
  Month 1: {build X, validate with Y customers}
  Month 2: {launch to Z, target $W MRR}
  Month 3: {scale channel, target $V MRR}

Strategy analyses saved to: strategy/
```

**Show this to the user. Also add to COMMS.md:**

```
/comms add
Item: Strategy Brief ready for your review — Approval Gate 1
Category: REVIEW
Recommendation: Review the strategy brief above. If it captures your vision, say "proceed".
  If anything needs adjusting, tell me what's wrong. This is the last human gate before
  the engineering plan runs.
Link: strategy/ (all analyses saved here)
```

> "Does this strategy capture your vision? If anything is wrong or you want to adjust direction, tell me now. Otherwise say 'proceed' and I'll move to the engineering plan."
> _(This item is also logged in [COMMS.md](COMMS.md) for reference.)_

**Wait for user response before proceeding to Phase 2.5.**

If user says "proceed" or equivalent: mark the COMMS.md item ✅ DONE, then continue.
If user corrects something: update the strategy brief and confirm changes, update COMMS.md item with what changed, then continue.

---

## PHASE 2.5 — Goal Decomposition (runs after strategy approval, before engineering)

**Guided by: `~/.claude/DomainModel/DECOMPOSITION.md`**

After the strategy brief is approved, run the full goal decomposition. This is the bridge from business intent to engineering work.

**Step 2.5.1 — Assign Vision ID and formalize**

From the strategy brief Vision section, create `VIS-{YYYY}-0001`:
```yaml
id: VIS-{YYYY}-0001
statement: "{3-year horizon — specific, measurable}"
horizon_years: 3
business_idea: BI-{YYYY}-0001
approved_by: Strategy Council
date: {YYYY-MM-DD}
version: 1.0
```
Write to `BUSINESS-GOAL.md` Vision section.

**Step 2.5.2 — Decompose Vision → Business Goals**

Create 3–5 `BG-{YYYY}-NNNN` entities for Q1 of the business lifecycle.
Rules: each BG must be SMART (one metric, one deadline, one owner).

Write to `BUSINESS-GOAL.md` Current Objectives table with IDs:
```
| BG-{YYYY}-0001 | {title} | {metric ≥ threshold by date} | Founder | 🔲 |
```

**Step 2.5.3 — Decompose Business Goals → 3 Streams**

For each BG, derive goal children and write to:

`strategy/GOALS-MARKETING.md` — MarketingGoals (MG):
```yaml
id: MG-{YYYY}-0001
title: "{acquisition/conversion/retention target}"
business_goal: BG-{YYYY}-0001
channel: "{SEO | paid | referral | outbound | community}"
metric: "{what moves}"
target: "{threshold}"
timeline: "{date}"
linked_kpis: []
```

`strategy/GOALS-DEV.md` — DevGoals (DG):
```yaml
id: DG-{YYYY}-0001
title: "{what engineering must ship}"
business_goal: BG-{YYYY}-0001
engineering_outcome: "{specific observable result}"
success_metric: "{done criteria}"
target_date: {YYYY-MM-DD}
linked_epics: []
```

`strategy/GOALS-CUSTOMER.md` — CustomerGrowthGoals (CGG):
```yaml
id: CGG-{YYYY}-0001
title: "{AARRR metric target}"
business_goal: BG-{YYYY}-0001
aarrr_category: Acquisition | Activation | Revenue | Referral | Retention
metric: "{what moves}"
baseline: "{current value}"
target: "{threshold}"
linked_kpis: []
```

**Step 2.5.4 — Create KPIs**

For each BG, MG, DG, and CGG, create at least one KPI in `strategy/KPIS.md`:
```yaml
id: KPI-{YYYY}-0001
name: "{metric name}"
metric_definition: "{precise definition}"
baseline: "{current value at launch}"
target: "{threshold}"
measurement_period: weekly | monthly
data_source: "{Stripe | server logs | API analytics | manual}"
business_goal: BG-{YYYY}-0001
status: DEFINED
```

**Step 2.5.5 — Decompose DevGoals → Epics**

For each DG, create 1–3 Epics in `planning/EPICS.md`:
```yaml
id: EPIC-{YYYY}-0001
title: "{capability theme}"
dev_goal: DG-{YYYY}-0001
business_goal: BG-{YYYY}-0001
description: "{what this delivers at a customer level}"
target_quarter: Q1-{YYYY}
status: PLANNED
features: []
```

**Step 2.5.6 — Show Goal Decomposition Summary**

```
=== GOAL DECOMPOSITION ===
Vision (VIS-{YYYY}-0001): {statement}

Business Goals ({N} for this quarter):
  BG-{YYYY}-0001: {title} → metric: {target by date}
  BG-{YYYY}-0002: {title} → metric: {target by date}
  ...

Dev Goals ({N} total):
  DG-{YYYY}-0001 → BG-{YYYY}-0001 → target: {date}
  DG-{YYYY}-0002 → BG-{YYYY}-0001 → target: {date}
  ...

Marketing Goals ({N}): MG-{YYYY}-0001..{N}
Customer Growth Goals ({N}): CGG-{YYYY}-0001..{N}
KPIs created: {N}
Epics created: {N}

Lineage chain: BI-{YYYY}-0001 › VIS-{YYYY}-0001 › BG-{YYYY}-0001 › DG-{YYYY}-0001 › EPIC-{YYYY}-0001 (planned)

Files written:
  strategy/BUSINESS-IDEAS.md ✅
  strategy/GOALS-DEV.md ✅
  strategy/GOALS-MARKETING.md ✅
  strategy/GOALS-CUSTOMER.md ✅
  strategy/KPIS.md ✅
  planning/EPICS.md ✅
```

Do not wait for user input — proceed directly to Phase 3.

---

## PHASE 3 — Engineering Analysis (runs autonomously, shows consolidated output)

**Acting as Principal Architect at Google + Distinguished Engineer at Meta.**

Based on the approved strategy, design the full technical architecture:

**Step 3.1 — Define requirements from strategy**

For each major product capability identified in the strategy, write a REQ:

```
REQ-{YYYY}-0001: {core value delivery feature}
REQ-{YYYY}-0002: {authentication and user management}
REQ-{YYYY}-0003: {billing and subscription management}
REQ-{YYYY}-0004: {core data model and storage}
REQ-{YYYY}-0005: {API or primary interface}
REQ-{YYYY}-0006: {observability and operations}
```

At minimum 6 REQs. Each goes through the `/dev-requirements` 3-layer review (Principal PM + Distinguished PM + Chief Architect) — but run this internally, not as separate prompts.

**Step 3.2 — Architecture decision**

Run PRISM-10 architecture review for the full system design:

Determine:
- Primary data store + scale path (SQLite → Postgres → distributed)
- API design (REST vs GraphQL, versioning strategy)
- Auth approach (API key, JWT, OAuth, third-party)
- Payment integration (Stripe, usage metering design)
- Deployment target (Render / Railway / Vercel / AWS / GCP)
- Caching layer (needed at launch? Yes/no + rationale)
- Background jobs (needed at launch? Yes/no + use cases)
- Security boundaries (what data is sensitive, how protected)
- Scale ceiling of initial architecture (when does it break, at what load)

Apply PRISM-10:
- Performance: EXPLAIN QUERY PLAN on every planned query. Any hot path risks?
- Security: threat model for this product type. Top 3 attack vectors?
- Reliability: what fails when the DB is down? When Stripe is down? When the primary API is down?
- Cost: estimated monthly infra cost at launch, at 100 customers, at 1000 customers
- Scale: what architecture change is needed at 10x? Can it be deferred until then?

**Step 3.3 — Initial DESIGN documents**

Create a DESIGN document for each REQ. Each design includes:
- Architecture diagram
- API contract
- Data model changes
- Sequence diagram
- Error handling table
- Section 14: PRISM-10 architecture review (all 10 dimensions)

**Step 3.4 — Task breakdown with First Time Right prompts**

For each DESIGN, run `/dev-plan` to create TASK-NNNNs in QUEUE.md. Each task gets a full task prompt (context, what to build, safeguards, acceptance criteria, definition of done).

After all tasks are planned, produce an **ENGINEERING BRIEF**:

```
=== ENGINEERING BRIEF ===
Product type: {type}
Stack: {language, framework, DB, auth, payments, deployment}

ARCHITECTURE
  {ASCII diagram of the system}

CRITICAL DECISIONS
  Data store: {choice} — rationale: {why}
  Auth: {choice} — rationale: {why}
  Deployment: {choice} — rationale: {why}
  Scale ceiling: {at what load does this break, and what's the upgrade path}

SECURITY POSTURE
  Threat model: {top 3 risks and mitigations}
  Data sensitivity: {what PII/sensitive data is handled}
  Compliance: {any regulatory requirements: GDPR, HIPAA, SOC2}

PRISM-10 SUMMARY
  {table of all 10 dimensions with ✅/⚠️/❌ and one-line finding}

REQUIREMENTS CAPTURED: {N} REQs
DESIGNS CREATED:       {N} DESIGNs
TASKS PLANNED:         {N} TASKs (estimated {X} sessions to complete)

ESTIMATED PATH TO LAUNCH
  Phase 1 (core): {N tasks, builds the minimum shippable product}
  Phase 2 (launch): {N tasks, makes it production-ready}
  Phase 3 (grow): {N tasks, adds growth features}

First task: TASK-{ID}: {title}
```

**Show this to the user. Also add to COMMS.md:**

```
/comms add
Item: Engineering Brief ready for your review — Approval Gate 2
Category: REVIEW
Recommendation: Review the engineering brief above. If the architecture, stack, and task
  plan look right, say "proceed". This is the last human gate — after this the system
  builds autonomously until the business objective is achieved.
Link: requirements/ and design/ (REQs and DESIGNs saved here)
```

> "Does this engineering approach match your expectations? If anything needs to change, tell me now. Otherwise say 'proceed' and I'll initialize the project and start building."
> _(This item is also logged in [COMMS.md](COMMS.md) for reference.)_

**Wait for user response before proceeding to Phase 4.**

---

## PHASE 3.5 — BDS Council Customization (autonomous, runs after engineering approval)

> **Model Dispatch — Opus Required for this phase.**
> Phase 3.5 convenes the councils. Council quality is the whole point. Spawn an Opus sub-agent:
> ```
> Agent(model="opus", subagent_type="general-purpose",
>   description="BDS Council — strategy + engineering for {project name}",
>   prompt="[Run /bds-customize with full project context: business idea, approved engineering brief, stack decisions. Include all persona profiles from bds-customize.md.]")
> ```
> The Sonnet orchestrator writes the council output to DECISION-LOG.md and DECISIONS.md, then continues to Phase 4.

After the user approves the engineering approach, immediately run `/bds-customize` (as an Opus sub-agent per above) before writing a single file or line of code.

This step convenes two councils that deliberate, debate, and log every consequential decision before the build begins.

**Strategy Council** (Musk · Zuckerberg · Pichai · CMO · CFO) decides:
- Business model: is this the right monetization structure for this market?
- Pricing: what tiers, what anchor, what freemium boundary?
- Customer segmentation: who is customer 1–10, who is customer 10–1000?
- Competitive positioning: where is the defensible moat?

**Engineering Council** (Hölzle · Amodei · Cherny + domain consultants) decides:
- Architecture: which stack decisions are load-bearing vs reversible?
- Domain non-negotiables: FINTECH → PCI/idempotency; HEALTHTECH → HIPAA/PHI; GDPR → deletion/export; AI → blast radius/prompt injection
- PRISM-10 priority matrix: which of the 10 dimensions is critical vs baseline for this business?
- Scale path: current → 10x → 100x → 1000x — where does each component break first?
- Red lines: decisions that cannot be reversed without customer impact or compliance risk

**Protocol:** 3 rounds per council (Initial positions → Cross-examination → Convergence). Every decision logged in `architecture/DECISION-LOG.md` with D-{N} ID, the exchange that turned the debate, dissent preserved, confidence level, revisit trigger.

**Output:** `architecture/PROJECT-CHARTER-{date}.md` — the authoritative source of truth for why the project is built the way it is.

Show the charter summary to the user alongside the project initialization output.

**Universal constants enforced regardless of business type:**
- All DB queries parameterized — zero string concatenation into SQL
- All external calls have timeouts — no hanging operations
- All API keys hashed (never stored plaintext)
- Rate limiting on every public endpoint
- Structured logging with correlation IDs
- Health endpoint tests all real dependencies
- Graceful degradation: external dependency down → null/fallback, not 500
- Secrets: only in env vars, never in git, never in chat
- Idempotency: all operations that can be retried must be safe to retry
- Cost awareness: unit economics calculated before scaling spend

Show the charter summary to the user alongside the project initialization output.

---

## PHASE 4 — Project Initialization (autonomous, ~5 minutes)

No user input needed. Run all of the following:

**Step 4.1 — Create project structure**
Run `/project-init {type}` to create the full directory structure.

**Step 4.1a — Create DECISIONS.md**
Create `DECISIONS.md` at the project root with the header and empty Decision Index table. This is the master log for every decision made throughout the project's life — pre-populated with any decisions already made during the bootstrap strategy and engineering phases (pricing model chosen, stack selected, etc.).

**Step 4.1b — Create FIRST-PRINCIPLES.md**
Copy `~/.claude/skills/first-principles.md` to the project root and customize for this project:
- Update "The Situation" section with the actual project name, stack, and production status
- Add any domain-specific non-negotiables identified by the Engineering Council (HIPAA, PCI, GDPR, etc.)
- Add any business-specific red lines from the Strategy Council
- Set the initial budget governance section with any stated constraints

This document is the team's operating agreement. It is read at the start of every session.

**Step 4.1c — Create COMMS.md**
Run `/comms init` to create the project's communication hub.

COMMS.md is the single file where all human ↔ system communication is tracked. It includes the BDS quick start guide, this project's business idea, and the numbered communications log. Every agent adds items here when human input is needed. The user updates status and adds their input directly in the file.

**Step 4.2 — Create project CLAUDE.md**
Write a complete `CLAUDE.md` for this project. It must include:
- Project description (name, what it does, stack, port, production URL when known)
- North star metric (from strategy brief)
- Current status (PRE-LAUNCH)
- FRAMEWORK ROUTING section (BDS entry points)
- Project structure table (from /project-init)
- Stack details (every file and its responsibility)
- Commands (start server, run tests, health check)
- Critical rules (the non-negotiables from the quality bar)
- Environment variables (list all that will be needed)
- Deployment target and commands
- Pricing tiers (from strategy brief)
- Shorthand commands

**Step 4.3 — Write all REQs to requirements/**
Save each REQ as `requirements/REQ-{YYYY}-{NNNN}-{slug}.md` with full 3-layer review.
Update `requirements/REQUIREMENTS-INDEX.md`.

**Step 4.4 — Write all DESIGNs to design/**
Save each DESIGN as `design/DESIGN-{YYYY}-{NNNN}-{slug}.md` with full PRISM-10 review.
Update `design/DESIGN-INDEX.md`.

**Step 4.5 — Write QUEUE.md with all tasks**
All TASK-NNNNs with First Time Right prompts, dependency order, and status □.
Mark TASK-0001 as ⏳ IN PROGRESS.

**Step 4.6 — Create stub project files**
- `FEATURES.md` — with the planned features listed under "Not yet built"
- `ARCHITECTURE.md` — current architecture (stack, planned endpoints, data model)
- `RELEASES.md` — with `## Unreleased` section ready
- `BDS.md` — copy from global, customize for this project's stage and metrics
- `FRAMEWORK.md` — project-specific master index
- `DEV-FRAMEWORK.md`, `STRATEGY-FRAMEWORK.md`, `PROJECT-GUIDE.md` — from global

**Step 4.7 — Secrets setup**
Run `/dev-secrets init` to create:
- `.env` (gitignored) with all required vars and placeholder values
- `.env.example` (committed) with var names and no values
- `config/secrets-manifest.yaml` with all secrets documented

**Step 4.8 — Initial git commit and GitHub push**
```bash
git init
git add CLAUDE.md FEATURES.md ARCHITECTURE.md QUEUE.md RELEASES.md BDS.md FRAMEWORK.md \
  DEV-FRAMEWORK.md STRATEGY-FRAMEWORK.md PROJECT-GUIDE.md requirements/ design/ \
  architecture/ config/secrets-manifest.yaml .env.example .gitignore \
  .claude/skills/ .claude/commands/
git commit -m "feat: initialize project with BDS framework

Business: {business description}
North star: {metric}
Stack: {stack}
REQs: {N} requirements captured
DESIGNs: {N} technical designs
Tasks: {N} tasks planned
Charter: architecture/PROJECT-CHARTER-{date}.md

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

If GitHub remote was configured in Phase 0:
```bash
git remote add origin {GITHUB_REMOTE}
git branch -M main
git push -u origin main
```

Show: `✅ Pushed to {GITHUB_REPO_URL}`

Show the user a brief initialization summary:
```
=== PROJECT INITIALIZED ===
{N} directories created
{N} REQs written
{N} DESIGNs written
{N} tasks planned with First Time Right prompts
Git initialized with first commit

Starting TASK-{ID}: {title}
```

---

## PHASE 5 — Autonomous Execution

**This phase runs without user approval until the business objective is achieved.**

The business objective (defined from the strategy brief): `{first milestone — e.g., "working MVP with payment integration, deployed to production"}`

**The execution loop:**

```
WHILE business_objective_not_met AND tasks_remain:

  1. Read QUEUE.md — find the first ⏳ IN PROGRESS or □ queued task
     (respecting dependency order: never start a task whose dependency is not ✅)

  2. Read the task's TASK PROMPT — full context block
     Read all files listed in "Read first" section

  3. Execute the task:
     - /dev-build for code tasks
     - /dev-test after every code task
     - /dev-docs for documentation tasks
     - /dev-commit after each task or logical group
     - /dev-deploy when deploy tasks are reached
     - /dev-verify after each deploy

  4. If task passes all acceptance criteria:
     - Mark ✅ in QUEUE.md
     - Update FEATURES.md if new capability added
     - Continue to next task

  5. If task FAILS after 3 attempts:
     → PAUSE and report to user (see "When to pause" below)

  6. After every 5 tasks OR after each deploy:
     → Show PROGRESS REPORT (see format below)

  7. After all Phase 1 (core) tasks complete:
     → Run /bds launch to check launch readiness
     → If READY: deploy and run /dev-verify
     → If NOT READY: add blocking items to QUEUE as new tasks, continue loop

END WHILE

If business_objective_met:
  → Run /bds (full health check)
  → Show COMPLETION REPORT
```

**Progress Report format (shown every 5 tasks):**
```
=== PROGRESS REPORT ===
Tasks: {completed}/{total} ({X}% done)
Phase: {core | launch | grow}

Completed since last report:
  ✅ TASK-{ID}: {title}
  ✅ TASK-{ID}: {title}

Currently working on: TASK-{ID}: {title}

Business objective: {objective}
Status: {X% toward objective — based on which REQs are satisfied}

Estimated tasks until first deploy: {N}
```

**After each commit in Phase 5 (if GitHub remote is configured):**
```bash
git push origin main    # or feature branch
```
If push fails (merge conflict, rejected): PAUSE and show BLOCKED — git conflict resolution requires human decision.

**When to pause and ask the user:**

STOP and show a clear BLOCKED message when:
- A secret/credential needed is not in the environment — check `.env` first, then `~/.zshrc`. If genuinely absent: BLOCKED
- A new secret is needed that wasn't in the original secrets-manifest — BLOCKED: run `/dev-secrets add {NAME}` and provide the value
- A domain non-negotiable from the Project Charter cannot be satisfied with the current design (e.g., PHI encryption required but schema wasn't designed for it) — BLOCKED: needs architecture revision
- A design decision wasn't covered and has significant architectural implications
- A task fails after 3 attempts with 3 different approaches (genuine implementation blocker)
- A deploy requires manual DNS changes or platform-level configuration
- A required external service needs to be set up (Stripe account, domain purchase, OAuth app registration)
- The database schema change cannot be reversed and affects live data
- A red line from the Project Charter is about to be crossed (e.g., "never store raw card numbers") — BLOCKED: redesign required

BLOCKED message format:
```
=== BLOCKED: HUMAN ACTION NEEDED ===
Task: TASK-{ID}: {title}
Reason: {specific thing needed}
Action required: {exact step for the user to take}

Once done, say "continue" and I'll resume from here.
```

When BLOCKED: also add to COMMS.md immediately:
```
/comms add
Item: BLOCKED — {task title}: {one-line reason}
Category: BLOCKER
Recommendation: {exact action the user must take to unblock}
Link: {relevant file if applicable}
```

This ensures the blocker is in COMMS.md even if the user returns to the project in a new session.

Do NOT pause for:
- Normal implementation decisions covered by the design
- Choosing between equivalent libraries or approaches
- Writing tests or documentation
- Refactoring within the task scope
- Linting or formatting issues

---

## PHASE 6 — Completion

When all Phase 1 and Phase 2 tasks are complete and the product is deployed and verified:

Run `/bds` for the full health report.

Then show the **COMPLETION REPORT**:

```
=== BDS BOOTSTRAP COMPLETE ===
Date: {date}
Sessions: {N}
Duration: {if trackable}

WHAT WAS BUILT
  Features: {N} capabilities delivered
  Endpoints: {list}
  Integrations: {Stripe, auth, etc.}
  Tests: {N} test cases, all passing

BUSINESS READINESS
  Stage: {EARLY — ready for first customers}
  North star: {metric} — current: {value}
  Pricing: live at {tiers and prices}
  Payments: Stripe {live | test} mode

TECHNICAL HEALTH (/bds score)
  Layer 1 — Foundations:  ✅
  Layer 2 — Engineering:  ✅
  Layer 3 — Operations:   ✅/⚠️
  Layer 4 — Business:     ✅
  Layer 5 — Scale:        ✅/⚠️

PRODUCTION
  URL: {live URL}
  Health: {status from /api/health}
  Monitoring: {what's being monitored}

OPEN ITEMS
  {any ⚠️ items from BDS health check — tracked in QUEUE as arch-debt}

NEXT STEPS (to reach first 10 customers)
  1. {specific action from GTM strategy}
  2. {specific action}
  3. Run /strategy-gtm to build acquisition plan

The product is live. Time to get customers.
```

---

## Bootstrap session saved to

`sessions/BDS-SESSION-{YYYY-MM-DD-HH-MM-SS}-bootstrap.md`

Contains:
- Business idea (original)
- Strategy brief (approved)
- Engineering brief (approved)
- All decisions made and rationale
- Full task list with completion status
- Completion report
