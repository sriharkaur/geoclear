# /dev-arch — Architecture Planning (Orchestrator)

## Model Dispatch — Opus Required

**This skill must run on Claude Opus.** Architecture decisions feed directly into DECISIONS.md and drive the build backlog.

**If you are the Sonnet orchestrator:** Spawn an Opus sub-agent for the full architecture review:
```
Agent(
  model="opus",
  subagent_type="general-purpose",
  description="PRISM-10 architecture review",
  prompt="[Full PRISM-10 review prompt with project context, the relevant files read, and the dimension(s) to review. Include the complete relevant sections of this skill file.]"
)
```
Write the sub-agent output to the appropriate architecture file, then continue.

**If you are already running as an Opus sub-agent:** Proceed directly with the PRISM-10 review below.

---

> Two modes: PROACTIVE (embedded in design — FTR from the start) and REACTIVE (audit of what exists).
> Applies the PRISM-10 Architecture Framework — AWS Well-Architected 6 pillars + 4 domain dimensions = 10 total.
> PRISM-10: Performance, Reliability, Intelligence/Agentic, Security, Maintainability — 10 dimensions.
> Principles apply regardless of cloud provider, stack, or language.
>
> Acting as: Chief Architect at Google — systems thinking at scale, FTR discipline, radical simplicity.

---

## Two Modes

### Mode 1 — PROACTIVE (default, embedded in /dev-design)
Applied DURING design creation. Architecture guardrails are part of the design process, not an after-the-fact check. The design is not approved until all applicable dimensions pass.
- When to use: every non-trivial feature design (Gate 2 of /dev-feature)
- Invoked automatically by /dev-design
- Output: architecture sign-off block embedded in the design document

### Mode 2 — REACTIVE (audit, like strategy-swot)
Audits an EXISTING implementation. Produces a gap analysis, prioritized action items (P1-P4), and updates QUEUE.md with architectural debt.
- When to use: session start, post-incident review, quarterly health check, before major new feature
- Invoke: `/dev-arch-audit`
- Output: `architecture/ARCH-AUDIT-{YYYY-MM-DD}.md` + action items in QUEUE.md

---

## How to invoke

```
/dev-arch                    — full proactive review: all applicable dimensions (used in /dev-design)
/dev-arch quick              — lightweight 4-question check for simple changes
/dev-arch audit              — reactive: full audit of existing implementation → action items → QUEUE
/dev-arch <dimension>        — single dimension: ops | security | reliability | performance | cost
                               sustainability | frontend | data | application | agentic
```

**When to run full proactive review:** New service/module, new endpoint with non-trivial NFRs, schema change affecting >1M rows, data pipeline, any change with performance/security/availability implications.

**When to run quick:** Single-file bug fix, config change, doc update, adding a field to an existing response.

---

## Step 0 — Load context

Read: `CLAUDE.md`, `FEATURES.md`, `ARCHITECTURE.md`, `QUEUE.md`

Identify:
- Current production load, DB size, active keys
- Existing tech stack and constraints
- Current SLAs (stated or implied by tier pricing)
- Known failure modes (from CLAUDE.md or memory)
- Whether this change involves significant data components

---

## Step 1 — Scope the review

Determine which pillars are relevant to this specific change:

| Change type | Pillars to run |
|-------------|---------------|
| New endpoint | Security + Performance + Reliability + Ops |
| New external dependency | Reliability + Security + Cost |
| Schema / DB change | Reliability + Performance + Sustainability + Data |
| Data pipeline / import | All 6 pillars + Data Architecture |
| Billing / auth change | Security + Reliability |
| UI / frontend | Security + Performance + Sustainability + Frontend |
| Cost spike | Cost + Performance |
| Full new service | All 6 pillars + Data if data-intensive |
| AI agent / LLM feature | Agentic AI + Security + Reliability + Cost |

---

## Step 2 — Run all 10 Architecture Dimension Reviews

Each dimension produces a findings block. Run all applicable dimensions. 10 total across 3 groups.

### Group A — AWS Well-Architected Framework (6 pillars, stack-agnostic)

### Pillar 1 — Operational Excellence (`/dev-arch-ops-excellence`)

**Focus**: Can you see, operate, and improve the system?

Key questions:
- Observability: structured logs with correlation IDs, metrics for every endpoint, health check tests all dependencies
- Deployment safety: every deploy is reversible, rollback tested, smoke test runs automatically post-deploy
- Runbooks: every alert has a runbook; every known failure mode has a documented response
- Toil: identify top 3 manual operations; flag for automation
- Configuration: all config externalized, validated at startup, changes auditable

### Pillar 2 — Security (`/dev-arch-security`)

**Focus**: Is every trust boundary explicitly validated?

Key questions:
- Authentication: every sensitive endpoint behind auth; consistent auth mechanism
- Authorization: per-tier access control verified at every code path; admin endpoints separated
- Input validation: ALL queries parameterized; max length; type; format; oversized payload rejected
- Data protection: secrets in env vars only; keys hashed not plaintext; PII classified and minimized
- Threat model: document attack vectors, mitigations, residual risk for each new surface
- Supply chain: deps pinned; `npm audit` / `pip audit` clean

### Pillar 3 — Reliability (`/dev-arch-reliability`)

**Focus**: Does failure result in graceful degradation or cascading outage?

Key questions:
- SLO defined: 99% / 99.9% / 99.99% — chosen deliberately
- Graceful degradation: external API down → null fields returned, not 500
- Timeouts: every external call has a timeout; every DB query has an implicit bound
- Circuit breakers: for each external dependency
- Recovery: RPO + RTO defined; backup tested by restore
- Capacity: 30%+ headroom; disk, memory, query latency growth projected to 12 months

### Pillar 4 — Performance Efficiency (`/dev-arch-performance`)

**Focus**: Does every query use an index? Is there any N+1? Are hot paths bounded?

Key questions:
- Query analysis: `EXPLAIN QUERY PLAN` on every new query; zero full-table scans on hot path
- N+1 detection: count DB queries per request — must not scale with input size
- Caching design: key/TTL/invalidation defined for each cacheable item
- Async: identify work that can be deferred out of the request path
- Bounded results: no endpoint returns unbounded arrays; pagination designed
- Sync I/O: no blocking I/O on async event loop (Node.js: `worker_threads` for CPU work)

### Pillar 5 — Cost Optimization (`/dev-arch-cost`)

**Focus**: Is every resource paying for itself?

Key questions:
- Unit economics: cost per API call, cost per user calculated
- Compute: right-sized based on measured utilization, not assumed headroom
- External APIs: calls per day × cost per call; caching reduces effective cost
- Storage tiers: hot/warm/cold — data on the right tier
- Egress: compression enabled; response payloads minimized
- Waste: unused services, uncached API calls, redundant data copies

### Pillar 6 — Sustainability (`/dev-arch-sustainability`)

**Focus**: Are we running only what is necessary, as efficiently as possible?

Key questions:
- Compute efficiency: no always-on polling; background jobs event-driven or on-demand
- Data minimization: retention policy for every data type; raw files deleted after verified import
- Format efficiency: columnar (Parquet/SQLite-indexed) for analytics; compressed for logs
- Algorithm efficiency: no O(n²) on production paths; index lookups over linear scans
- Infrastructure lifecycle: dev/test environments stopped when not in use; dev.db not nad.db locally

---

### Group B — Domain Architecture (3 dimensions)

### Dimension 7 — Frontend Architecture (`/dev-arch-frontend`)

**Focus**: Is the rendering strategy correct? Are Core Web Vitals budgeted? Is the UI resilient?

Run when: the project has a web UI, browser-callable APIs, or real-time UI requirements.
Skip (N/A) when: API-only project with no browser-facing surface.

Key questions:
- Rendering strategy: per-route selection (SSR/ISR/CSR/Edge) based on content type + SEO requirements
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms — measured, not assumed
- BFF pattern: does the frontend call APIs designed for its specific data shape, or over-fetches and filters client-side?
- Real-time: WebSocket (bidirectional) vs SSE (server-to-client) chosen correctly; graceful fallback
- Graceful degradation: API failure → error state, not blank screen; JS failure → semantic HTML baseline
- Bundle: code-split at routes; < 170KB initial JS compressed; assets content-hashed on CDN
- State management: server state in cache layer (React Query/SWR); URL state in URL params; no derived state stored
- Micro-frontends: only if multi-team; Strangler Pattern for migration; not a single-team solution

**Chief Architect of Google must approve** rendering strategy and CWV budget.

### Dimension 8 — Data Architecture (`/dev-arch-data`)

**Focus**: Is data treated as a product with ownership, contracts, quality rules, and lineage?

Run when: the change involves new data sources, pipelines, schema changes at scale, analytics, governance.

Key questions (7 sections): Principles → Logical architecture → Storage strategy (medallion) → Pipeline design (idempotency/checkpointing) → Master data management → Governance (catalog/lineage/quality/retention) → Analytics architecture

**Chief Data Architect (Google + Databricks) must approve** data architecture.

### Dimension 9 — Application Architecture (`/dev-arch-application`)

**Focus**: Are business rules isolated from infrastructure? Is the code testable, layered, and evolvable?

Key questions:
- Layers: Presentation → Application → Domain → Infrastructure; domain has zero infra dependencies
- Testability: domain logic unit-testable without DB, HTTP, or filesystem
- Dependency direction: no circular imports (`npx madge --circular`); no domain→infra imports
- API design: versioned, consistent error shapes, no over-fetching, stable contracts
- Error handling: every error path handled; unhandled promise rejections impossible; no stack traces in responses
- Configuration: validated at startup with fail-fast; full env var list documented

**Chief Architect of Google and Meta must approve** application architecture.

### Dimension 10 — Agentic AI Architecture (`/dev-arch-agentic`)

**Focus**: Is the agent design correct, safe, and cost-governed? Are failure modes bounded?

Run when: the feature uses LLMs, AI agents, tool-calling, multi-agent orchestration, or RAG.
Skip (N/A) when: no LLM or agent component exists in the feature.

Key questions:
- Is a simpler alternative (single LLM call, RAG, traditional code) sufficient? Justify agent complexity.
- Pattern selection: which of the 11 patterns is used? Is it the simplest correct choice?
- Infinite loop prevention: MAX_ITERATIONS + timeout + explicit exit condition + fallback defined?
- Prompt injection defense: are all tool outputs treated as untrusted data?
- Tool authorization: least-privilege — each tool has only the permissions it needs?
- Blast radius control: max token budget per run, max writes per session, max cost per invocation defined?
- Model tier selection: Haiku for classification/routing, Sonnet for reasoning, Opus only for complex multi-step?
- Observability: is each agent run traced with run_id, tool_calls, iterations, tokens, cost, exit_reason?
- Testability: are tools unit-testable independent of the LLM? Are behavioral tests defined?
- Context engineering: is context structured (instruction/memory/history/tools/output/thinking)?

**Principal Agentic AI Architect at Anthropic must approve** all agentic features.

---

## Step 3 — Extended Domain Reviews (when applicable)

### Agentic AI Review (when applicable)

Run `/dev-arch-agentic` when the change involves:
- LLM calls, AI agents, tool-calling
- Multi-agent orchestration (coordinator, swarm, hierarchical)
- RAG pipelines or vector search
- Any feature that loops or iterates with an LLM

Covers: decision framework (build vs simpler alternative), pattern selection, system prompt design, tool design, security (prompt injection, blast radius), reliability (loop bounds, failure modes), performance (token budget, model selection), observability, testing strategy.

### Enterprise Data Architecture Review (when applicable)

Run `/dev-arch-data` when the change involves:
- New data sources or data pipelines
- Schema changes with significant data volume implications
- Analytics, reporting, or BI components
- Master data or reference data
- Data governance or lineage requirements

Covers 7 sections:
1. **Data Architecture Principles** — data as product, single source of truth, data contracts
2. **Logical Data Architecture** — entity map, domain ownership, golden records
3. **Data Storage and Platform Strategy** — medallion architecture (Bronze/Silver/Gold), hot/warm/cold tiers, format selection
4. **Data Integration and Pipelines** — idempotency, exactly-once semantics, checkpointing, schema evolution
5. **Master Data Management** — master entities, survivorship rules, reference data
6. **Data Governance** — catalog, lineage (field-level), quality framework, access control, retention/deletion
7. **Analytics and Reporting Architecture** — operational vs analytical tiers, semantic layer, BI access

---

## Step 4 — Architecture Decision Records (ADRs)

For each significant architectural choice that emerges from the pillar reviews, write an ADR:

```markdown
## ADR-{NNNN}: <title>
Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded

### Context
<What situation forces this decision?>

### Options considered
1. <Option A>
2. <Option B>

### Decision
<Which option and why — specific trade-off accepted>

### Consequences
- Positive: <what this enables>
- Negative: <what this costs or constrains>
- Risks: <what could go wrong; how detected>
```

---

## Step 5 — Architecture Sign-off

After all applicable dimension reviews are complete, produce:

```
=== PRISM-10 ARCHITECTURE REVIEW ===
Feature:   <name>
Date:      <YYYY-MM-DD>

WAF PILLARS (Group A — 6 pillars)
  Operational Excellence:  ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK
  Security:                ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK
  Reliability:             ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK
  Performance Efficiency:  ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK
  Cost Optimization:       ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK
  Sustainability:          ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK

DOMAIN ARCHITECTURE (Group B — 4 dimensions)
  Frontend Architecture:   ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK | — N/A
  Data Architecture:       ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK | — N/A
  Application Architecture: ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK
  Agentic AI Architecture: ✅ APPROVED | ⚠️ ATTENTION | ❌ REWORK | — N/A

ADRs written:              <N>
Must-fix items across all dimensions:
  - [Security] <item>
  - [Application] <item>
  - ...

Architecture: APPROVED — proceed to /dev-plan
            | CONDITIONAL APPROVAL — proceed with ⚠️ items tracked in QUEUE as arch-debt
            | REWORK REQUIRED — ❌ items must be resolved before proceeding
```

⚠️ ATTENTION items are non-blocking but must be added to QUEUE.md as architectural debt.
❌ REWORK REQUIRED items block the pipeline. Resolve and re-run the failing dimension review.

---

## Quick Review (for simple changes)

For `/dev-arch quick`, answer only these:

```
1. Does this change any security surface? (new endpoint, new data exposed, new auth path)
2. Does this change any DB query? (run EXPLAIN QUERY PLAN)
3. Does this change anything that could affect availability? (new dependency, new failure mode)
4. Does this change storage or data volume significantly?

If all NO → proceed to /dev-plan
If any YES → run full pillar review for the affected pillars only
```
