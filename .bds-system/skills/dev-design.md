# /dev-design — Design Document & Review

> No code is written until the design is approved.
> Architecture is not reviewed after the design — it is PART OF the design. Every design section is written with the 9 architecture dimensions (6 WAF pillars + Frontend + Data + Application) as active guardrails.
> This is the PROACTIVE mode of the architecture framework: First Time Right is enforced during design, not discovered post-facto.
> A design written with architecture guardrails active takes 30% longer to write. It takes 80% less time to implement correctly.

---

## DESIGN ID Format

```
DESIGN-{YYYY}-{SEQ:04d}
Example: DESIGN-2026-0001

Storage: design/DESIGN-{YYYY}-{SEQ:04d}-{slug}.md
Index:   design/DESIGN-INDEX.md
```

---

## Step 1 — Load context

Read:
- `requirements/REQ-{ID}.md` — the approved requirement(s) this design addresses
- `ARCHITECTURE.md` — current system architecture, existing patterns
- `FEATURES.md` — what's already built (avoid reinventing)
- `CLAUDE.md` — project rules, tech stack, deployment constraints
- `design/DESIGN-INDEX.md` — existing designs (don't duplicate patterns)

Confirm the requirement status is APPROVED before writing any design. If it is Draft or Rejected, stop.

---

## Step 2 — Create the design document (Principal Architect draft)

**Acting as Principal Architect** — deep expertise in the project's stack, patterns, and existing system:

Write a complete design document. Every section is required. Write "N/A — because <reason>" if truly not applicable.

```markdown
---
id: DESIGN-{YYYY}-{SEQ:04d}
title: <short descriptive title>
status: Draft
requirements: REQ-{ID}, REQ-{ID2} (all requirements this design satisfies)
date: {YYYY-MM-DD}
author: Principal Architect
---

## 1. Problem Statement
<1 paragraph: what system behavior needs to change and why>

## 2. Non-Goals
<explicit list of what this design does NOT address — prevents scope creep during review>

## 3. High-Level Design

### System context
<How this feature fits into the existing system. Which modules are touched.>

### Architecture diagram (text/ASCII)
<Component diagram showing data flow — even a simple one prevents misunderstandings>

Example:
  Client → [API Auth Middleware] → [/v1/address route] → [enrich.js]
                                                              ↓
                                                     [FEMA lookup]
                                                     [Census lookup]
                                                     [Timezone lookup]
                                                              ↓
                                                     [Response builder]

## 4. API Contract (for new/changed endpoints)

### Endpoint: METHOD /path

Request:
  Headers: X-Api-Key: <key>
  Params:  street, city, state (required), zip (optional)

Response 200:
  {
    "address": "...",
    "flood_zone": "AE" | null,      // null = no data, not locked
    "flood_zone_preview": true,     // present when tier can't access full value
    ...
  }

Response 401:  { "error": "Invalid API key" }
Response 429:  { "error": "Rate limit exceeded", "reset_at": "..." }
Response 500:  { "error": "Internal error" }  // no stack trace

## 5. Data Model Changes

### Schema changes (if any)
<Exact ALTER TABLE or CREATE TABLE statements — not approximate>

### Migration plan
<Migration file name, staging-first verification steps, rollback SQL>

### Data volume impact
<Row count change, storage impact, index implications>

## 6. Detailed Logic

### <Component 1> changes
<Step-by-step: what the function does before vs. after>

### <Component 2> changes
<...>

## 7. Sequence Diagram (for multi-component flows)

Client          API Server        DB           External
  |                |               |               |
  |--GET /v1/addr→|               |               |
  |                |--validateKey→|               |
  |                |←key valid----|               |
  |                |--lookupAddr→-|               |
  |                |←address------|               |
  |                |------------------------------------→ FEMA lookup
  |                |←-----------------------------------flood zone
  |                |--buildResponse                |
  |←─200 + body---|               |               |

## 8. Error Handling

| Error condition | Response code | Body | Logged? |
|----------------|--------------|------|---------|
| Key not found   | 401 | {"error":"Invalid API key"} | No (avoid log spam) |
| DB unavailable  | 503 | {"error":"Service unavailable"} | Yes — critical |
| FEMA API down   | 200 | flood_zone: null | Yes — warning |

No internal errors or stack traces in response bodies. Ever.

## 9. Security Considerations

- [ ] All inputs parameterized (no string concat into SQL)
- [ ] New endpoint behind existing auth middleware — not a new auth path
- [ ] No new PII fields exposed without tier check
- [ ] Rate limiting applies to new endpoint
- [ ] CORS policy unchanged (or documented change with reason)

## 10. Observability Plan

Logs: <what structured log event this feature emits — field names and values>
Health check impact: <does /api/health need updating?>
Error tracking: <which error conditions increment which counters>
Alerting: <what metric signals this feature is broken? what is the on-call trigger?>

## 11. Performance Characteristics

Estimated p50 latency added by this feature: <Xms>
Slowest new DB query: <query + EXPLAIN QUERY PLAN result>
Caching opportunity: <yes/no — what and where>
Memory impact per request: <negligible | <Xkb | measured>

## 12. Rollout Plan

Phase 1: <staging deploy + verification>
Phase 2: <prod deploy>
Phase 3: <verify + monitor for Nh>
Rollback: <exact steps — git revert or feature flag disable>
Migration reversibility: <yes — rollback SQL above | no — and why it's safe>

## 13. Open Questions
<List anything not yet decided — must be resolved before review sign-off>
```

---

## Step 3 — Proactive Architecture Review (9 dimensions, applied DURING design)

This is not an after-the-fact check. Each dimension is applied as the design is being written. If a dimension reveals a problem, the design is revised before moving to the next dimension. This is what "First Time Right" means for architecture.

**Run all applicable dimensions. Mark N/A with reason if not applicable.**

### 3A — WAF: Operational Excellence
Is the design observable, operable, and deployable safely?
- Logging: what structured log entry does this feature produce? Field names, values?
- Metrics: what counters or gauges does this feature emit?
- Health check: does `/api/health` need updating for new dependencies?
- Deployment safety: is this deploy reversible without data loss? Can old and new code coexist?
- Runbook: what would an on-call engineer do if this feature broke at 3am?

### 3B — WAF: Security
Is every trust boundary explicitly validated?
- New auth surface: does this add any new endpoint, new auth path, or new data exposure?
- Input validation: are ALL queries parameterized? Are all inputs bounded by type + length?
- Secrets: are credentials only accessed via env vars?
- Threat model: what is the top attack vector against this feature? How is it mitigated?

### 3C — WAF: Reliability
Does failure in any dependency lead to graceful degradation, not outage?
- For each external dependency: what does the feature return when it's down? (null? 503? cached?)
- Timeouts: are all external calls bounded?
- SLO impact: does this feature change the system's availability SLO? In which direction?

### 3D — WAF: Performance Efficiency
Is every query bounded, indexed, and N+1-free?
- DB queries: run `EXPLAIN QUERY PLAN` mentally for each new query. Does it use an index?
- N+1: count DB calls per request — does it scale with input size?
- Caching: is caching needed? If yes: key, TTL, invalidation strategy defined NOW.
- Hot path: is there any synchronous blocking I/O added to the hot path?

### 3E — WAF: Cost Optimization
Does this feature pay for itself?
- External API calls: cost per call × expected volume = monthly cost?
- Storage growth: what does this add per month? Is it on the right storage tier?
- Caching opportunity: what % of external calls can be eliminated with caching?

### 3F — WAF: Sustainability
Is this feature as efficient as it needs to be?
- Polling vs events: is there any new polling pattern that could be event-driven?
- Data retention: does this feature produce data? What is its retention policy?
- Format: is data stored in the most efficient format for its access pattern?

### 3G — Frontend Architecture (if feature has UI)
Is the rendering strategy correct? Are CWV budgets maintained?
- Rendering: which strategy (SSR/ISR/CSR/Edge)? Why is it correct for this page type?
- CWV impact: does this feature change LCP, CLS, or INP? In which direction?
- Bundle impact: does this add to the JS bundle? Does it need code splitting?
- Error handling: what does the UI show if this API call fails? (not blank screen)
Skip if API-only feature.

### 3H — Data Architecture (if feature involves significant data)
Is data treated with ownership, contracts, and governance?
- Entity ownership: which domain owns the data this feature produces?
- Lineage: can we trace where each output field came from?
- Quality: are there automated quality checks for data this feature writes?
- Retention: retention policy defined for new data?
Skip if no new data storage or pipelines.

### 3I — Application Architecture
Are layers clean? Is the code testable without infrastructure?
- Layer separation: does business logic call the DB directly, or through an interface?
- Testability: can this feature's core logic be unit-tested without a running DB?
- Dependency direction: does this add any wrong-direction or circular dependency?
- Error handling: are all error paths handled? No unhandled promise rejections possible?

### 3J — Agentic AI (if feature uses LLMs, agents, or tool-calling)
Is the agent design safe, bounded, and cost-governed?
- Justify: is a simpler alternative (single LLM call, RAG, deterministic code) sufficient? If not, why?
- Pattern: which agent pattern is used? Is it the simplest correct choice for this task?
- Bounds: MAX_ITERATIONS + timeout + exit condition + fallback defined?
- Security: are all tool outputs treated as untrusted? Is blast radius (token budget, write count, cost cap) bounded?
- Model selection: Haiku for routing/classification, Sonnet for reasoning, Opus only for complex multi-step — justified?
- Observability: is each run traced (run_id, tool_calls, iterations, tokens, cost, exit_reason)?
- Testability: can tools be unit-tested independent of the LLM?
Skip if no LLM or agent component.

---

**Architecture Review Output (integrated into design document):**

Add Section 14 to the design document:

```markdown
## 14. Architecture Review — 9 Dimensions

| Dimension | Applicable | Status | Key finding |
|-----------|-----------|--------|-------------|
| Operational Excellence | YES/NO | ✅/⚠️/❌ | <one line> |
| Security | YES | ✅/⚠️/❌ | <one line> |
| Reliability | YES | ✅/⚠️/❌ | <one line> |
| Performance | YES | ✅/⚠️/❌ | <one line> |
| Cost | YES | ✅/⚠️/❌ | <one line> |
| Sustainability | YES | ✅/⚠️/❌ | <one line> |
| Frontend | YES/N/A | ✅/⚠️/❌/N/A | <one line> |
| Data | YES/N/A | ✅/⚠️/❌/N/A | <one line> |
| Application | YES | ✅/⚠️/❌ | <one line> |
| Agentic AI | YES/N/A | ✅/⚠️/❌/N/A | <one line> |

Must-fix items (❌ blocks approval):
  - [Dimension] <specific item>

Non-blocking items (⚠️ tracked as arch-debt in QUEUE):
  - [Dimension] <item>
```

If any dimension is ❌: revise the relevant design section before proceeding. The design is not approved with open ❌ items.

---

## Step 4 — Chief Architect of Google Review

**Acting as Google's Chief Architect** (Jeff Dean / Urs Hölzle mental model):

Review the full design + architecture section (Step 3) for holistic correctness.

**Scalability & Correctness:**
1. Does this design work correctly at 10x current load? At 100x? Where does it break first?
2. Are there any race conditions or consistency issues?
3. Is every DB query bounded and indexed? (verify EXPLAIN QUERY PLAN results in Section 14D)
4. Is pagination on any list endpoint that could grow?

**Operational Excellence:**
5. Is the observability plan (Section 3A) sufficient to diagnose any failure without SSH access?
6. Is there a new single point of failure? Is the graceful degradation path defined?
7. Can old and new code versions coexist during a rolling deploy?

**Simplicity:**
8. Is this the simplest correct solution? Could 30% of complexity be removed?
9. Will an engineer understand this code in 6 months without the design doc?

**Architecture integrity:**
10. Are the 9 dimensions in Section 14 all ✅ or ⚠️? No ❌ items remain?
11. Are ADRs written for any significant choices?

**Chief Architect Verdict:**
```
Scalability:          ✅ PASS | ⚠️ CONCERN: <issue> | ❌ FAIL: <must change>
Operations:           ✅ PASS | ⚠️ CONCERN | ❌ FAIL
Simplicity:           ✅ PASS | ⚠️ CONCERN | ❌ FAIL
Architecture (9 dim): ✅ ALL PASS/ATTENTION | ❌ OPEN BLOCKERS: <list>

Must-fix before approval:
  - <item>

Status: APPROVED | REWORK REQUIRED
```

If REWORK REQUIRED: revise the design and re-run the relevant dimension review. Do not proceed with open must-fix items.

---

## Step 4 — Chief Scientist Review (when applicable)

**Acting as Chief Scientist at Meta or Anthropic** — data quality, ML, research rigor.

Run this review ONLY if the feature involves:
- ML models or inference
- Data pipelines, transformations, or enrichment algorithms
- Statistical calculations or scoring
- Probabilistic or approximate results

If none of the above apply: mark as N/A and skip.

**Questions:**
1. Is the data used by this feature of known quality and provenance? What are the known gaps?
2. Is the algorithm deterministic? If probabilistic: is the error rate acceptable for this use case?
3. Are there known biases in the training data or lookup tables that could produce unfair or incorrect results for certain users?
4. Is the model/algorithm versioned and reproducible?
5. What is the plan when the underlying data source is updated? (quarterly NAD release, FEMA flood zone updates)

**Chief Scientist Verdict:**
```
Data quality:    ✅ ACCEPTABLE | ⚠️ CONCERN: <issue> | N/A
Algorithm:       ✅ CORRECT | ⚠️ CONCERN | N/A
Bias/fairness:   ✅ REVIEWED | ⚠️ CONCERN | N/A

Status: APPROVED | REWORK REQUIRED | N/A
```

---

## Step 5 — Design sign-off

Chief Architect (Step 4) and Chief Scientist (Step 4, if applicable) must reach APPROVED.
All 9 architecture dimensions must be ✅ or ⚠️ (no ❌).
All must-fix items must be resolved.

Update the design document status to APPROVED and add review history:

```markdown
## Review History

| Reviewer | Role | Date | Status | Key Notes |
|----------|------|------|--------|-----------|
| — | Principal Architect | {date} | Drafted | Initial design |
| — | Architecture Review (9 dim) | {date} | ALL PASS | <open ⚠️ items tracked in QUEUE> |
| — | Chief Architect (Google) | {date} | APPROVED | <key notes / resolved items> |
| — | Chief Scientist | {date} | APPROVED / N/A | <notes if ML/data applicable> |
| — | Chief Architect (Meta) | {date} | APPROVED / N/A | <for application arch if applicable> |
| — | Principal FE Architect | {date} | APPROVED / N/A | <for frontend if applicable> |
| — | Chief Data Architect | {date} | APPROVED / N/A | <for data arch if applicable> |

## Status: APPROVED
## Approved: {YYYY-MM-DD}
```

Update `requirements/REQ-{ID}.md` → `linked_design: DESIGN-{YYYY}-{SEQ:04d}`

---

## Step 6 — Update DESIGN-INDEX.md

Add a row to `design/DESIGN-INDEX.md`:

```markdown
# Design Index

| DESIGN ID | Title | Status | Requirements | Approved | Tasks |
|-----------|-------|--------|-------------|---------|-------|
| DESIGN-2026-0001 | Enrichment gate — soft-block free tier | Approved | REQ-2026-0001 | 2026-04-15 | TASK-2026-0001..0004 |
```

Create `design/DESIGN-INDEX.md` if it does not exist.

---

## Step 7 — Report

```
=== DESIGN APPROVED ===
DESIGN ID:  DESIGN-{ID}
Title:      <title>
Covers:     REQ-{IDs}

Chief Architect:  ✅ APPROVED  (<date>)
Chief Scientist:  ✅ APPROVED | — N/A

File: design/DESIGN-{ID}-{slug}.md

Next: /dev-plan — Principal TPM will create TASK-NNNN breakdown from this design
```
