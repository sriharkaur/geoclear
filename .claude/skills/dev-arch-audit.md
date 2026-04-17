# /dev-arch-audit — Architecture Audit (Full Analysis)

## Model Dispatch — Opus Required

**This skill must run on Claude Opus.** The audit output drives the architectural debt backlog and feeds DECISIONS.md.

**If you are the Sonnet orchestrator:** Spawn an Opus sub-agent for the full audit:
```
Agent(
  model="opus",
  subagent_type="general-purpose",
  description="PRISM-10 architecture audit",
  prompt="[Full audit prompt with all relevant project files read, the current implementation state, and the full audit protocol from this skill file.]"
)
```
Write the output to `architecture/ARCH-AUDIT-{YYYY-MM-DD}.md`, add action items to QUEUE.md, then continue.

**If you are already running as an Opus sub-agent:** Proceed directly with the audit below.

---

> The SWOT equivalent for architecture. Run against an existing implementation to find gaps, technical debt, and improvement opportunities across all 9 architecture dimensions.
> Output: written audit report + prioritized action items → QUEUE.md.
>
> This is the REACTIVE mode. For the PROACTIVE mode (applied during design), see `/dev-design` which embeds these checks as the design is created.

---

## When to run

- Session start: understand the current architectural state before planning new features
- After a significant incident: understand what architectural gap caused it
- Quarterly: as a standing review to track architectural health over time
- Before a major new feature: understand the baseline before adding complexity
- After rapid development sprints: check for accumulated technical debt

---

## Step 1 — Load all context

Read every relevant file before analyzing:
```
CLAUDE.md           — project rules, stack, architecture decisions
FEATURES.md         — what is built
ARCHITECTURE.md     — documented architecture
QUEUE.md            — existing backlog (avoid duplicating known items)
RELEASES.md         — recent changes (what was just shipped)
design/DESIGN-INDEX.md     — if exists
requirements/REQUIREMENTS-INDEX.md  — if exists
```

Then read the actual code files (not just documentation) to verify that documentation matches reality:
- Entry point (web-server.js, main.py, app.ts)
- Business logic modules (enrich.js, query.js, etc.)
- Infrastructure layer (DB access, external API calls)
- Config and startup

**Documentation ≠ reality. Read the code.**

---

## Step 2 — Run all 9 architecture dimension reviews

For each dimension, apply the relevant sub-skill's checklist against what is ACTUALLY IMPLEMENTED (not what is documented or intended).

Rate each dimension:
```
✅ STRONG     — best practices followed, no significant gaps
⚠️ ADEQUATE   — functional, some gaps, improvement opportunities
❌ WEAK       — significant gaps that create risk or technical debt
— N/A         — not applicable to this project type
```

### Dimension 1: Operational Excellence
From `/dev-arch-ops-excellence`:
- Observability: are logs structured with correlation IDs? Does the health check test real dependencies?
- Deployment safety: is every deploy reversible? Is rollback tested?
- Runbooks: does every alert have a runbook?
- Toil: what manual operations exist? Which are candidates for automation?

### Dimension 2: Security
From `/dev-arch-security`:
- Are all queries parameterized? (read the actual query code, not the docs)
- Are secrets only in env vars? (grep for hardcoded keys)
- Is input validated at the boundary?
- Is rate limiting per-key and per-IP?
- Threat model: what are the top 3 attack vectors and are they mitigated?

### Dimension 3: Reliability
From `/dev-arch-reliability`:
- Is there a defined SLO? Is it monitored?
- What happens when each external dependency is unavailable? (test each failure mode)
- Are timeouts set on all external calls? (grep for external API calls without timeout)
- Is the backup strategy tested?
- Is there 30%+ headroom on disk, memory, and compute?

### Dimension 4: Performance Efficiency
From `/dev-arch-performance`:
- Run `EXPLAIN QUERY PLAN` on the 3 most-called DB queries — are they using indexes?
- Are there any N+1 patterns? (DB calls inside loops)
- Are hot path results cached? Is the caching strategy designed (key/TTL/invalidation)?
- Are there any synchronous blocking I/O operations on an async runtime?

### Dimension 5: Cost Optimization
From `/dev-arch-cost`:
- What is the estimated cost per 1000 API calls?
- Is any compute over-provisioned by > 50%?
- Are any external API calls made without caching?
- Are there unused resources (services, indexes, stored data) that can be cleaned up?

### Dimension 6: Sustainability
From `/dev-arch-sustainability`:
- Is there a retention policy for every data type?
- Are raw import files cleaned up after processing?
- Is data stored in efficient formats for its access pattern?
- Are there any always-on polling patterns that could be event-driven?

### Dimension 7: Frontend Architecture
From `/dev-arch-frontend`:
- Is the rendering strategy correct for each page type?
- Are Core Web Vitals measured and within budget?
- Is the bundle size measured and appropriate?
- Is there graceful degradation on API failure?

Skip (N/A) if the project is API-only.

### Dimension 8: Data Architecture
From `/dev-arch-data`:
- Is there a documented entity map with ownership?
- Is the medallion architecture (Bronze/Silver/Gold) applied to pipelines?
- Is data lineage tracked at the field level?
- Are data quality rules automated?
- Is there a retention policy for every data type?

### Dimension 9: Application Architecture
From `/dev-arch-application`:
- Are business logic and infrastructure clearly separated? (test: can domain logic be unit-tested without a DB?)
- Are there circular dependencies? (run `npx madge --circular src/`)
- Is the API contract versioned and stable?
- Is error handling complete for all paths?
- Is configuration validated at startup?

---

## Step 3 — Gap Analysis

For each dimension, document:

```
Dimension: <name>
Rating: ✅ STRONG | ⚠️ ADEQUATE | ❌ WEAK | — N/A

What is implemented well:
  - <specific thing that follows best practice>
  - <...>

What is missing or needs improvement:
  - <specific gap> — Risk: <High | Medium | Low> — Effort: <High | Medium | Low>
  - <...>

Root cause of gaps:
  <why did these gaps accumulate? — e.g. "rapid development without architecture review", "no test infrastructure", "single developer with no review">
```

---

## Step 4 — Generate prioritized action items

For each gap, create an action item:

**Priority classification:**
```
P1 — CRITICAL:  Active risk to security, reliability, or correctness. Fix now.
                Examples: unparameterized SQL query, no timeout on external calls, secrets in code
P2 — HIGH:      Significant technical debt or reliability risk. Fix within 2 sprints.
                Examples: no backup tested, SLO not defined, N+1 query on hot path
P3 — MEDIUM:    Improvement that reduces future risk or cost. Fix within 1 quarter.
                Examples: no structured logging, no retention policy, missing documentation
P4 — LOW:       Nice-to-have improvements. Add to backlog, address when opportunistic.
                Examples: sustainability improvements, minor performance optimizations
```

**Action item format:**
```
ARCH-{YYYY}-{SEQ:04d}: <imperative title>
  Dimension:   <which pillar>
  Priority:    P1 | P2 | P3 | P4
  Risk if not fixed: <what could go wrong>
  Effort:      <1 session | 2-3 sessions | major work>
  Done when:   <specific measurable criterion>
  References:  <which sub-skill section explains the best practice>
```

---

## Step 5 — Write audit report

Save to `architecture/ARCH-AUDIT-{YYYY-MM-DD}.md`:

```markdown
# Architecture Audit — {YYYY-MM-DD}

## Executive Summary
<3 sentences: overall health, top 3 risks, top 3 strengths>

## Dimension Scores

| Dimension | Rating | Top gap |
|-----------|--------|---------|
| Operational Excellence | ✅/⚠️/❌ | <one line> |
| Security | ✅/⚠️/❌ | <one line> |
| Reliability | ✅/⚠️/❌ | <one line> |
| Performance | ✅/⚠️/❌ | <one line> |
| Cost | ✅/⚠️/❌ | <one line> |
| Sustainability | ✅/⚠️/❌ | <one line> |
| Frontend | ✅/⚠️/❌/N/A | <one line> |
| Data Architecture | ✅/⚠️/❌ | <one line> |
| Application Architecture | ✅/⚠️/❌ | <one line> |

## Overall Architecture Health Score
<count of ✅> / <total applicable dimensions> = <X>%

## Detailed Findings
<full gap analysis per dimension — one section per dimension>

## Prioritized Action Items

### P1 — Critical (fix now)
- ARCH-{ID}: <title> — <risk>

### P2 — High (fix within 2 sprints)
- ARCH-{ID}: <title> — <risk>

### P3 — Medium (fix within quarter)
- ARCH-{ID}: <title>

### P4 — Low (backlog)
- ARCH-{ID}: <title>

## What is working well
<architecture strengths — important for maintaining, not just fixing>
```

---

## Step 6 — Add to QUEUE.md

Add P1 and P2 action items to QUEUE.md under an `## Architecture Debt` section:

```markdown
## Architecture Debt  [from ARCH-AUDIT-{YYYY-MM-DD}]

### P1 — Critical
- [ ] ARCH-{ID}: <title> *(arch-debt: security)* — done when: <criterion>

### P2 — High
- [ ] ARCH-{ID}: <title> *(arch-debt: reliability)* — done when: <criterion>

### P3 — Medium (roadmap)
- [ ] ARCH-{ID}: <title> *(arch-debt: performance)*
```

P3 and P4 are documented in the audit report but not added to QUEUE unless explicitly promoted.

---

## Step 7 — Report

```
=== ARCHITECTURE AUDIT COMPLETE ===
Date:    {YYYY-MM-DD}
Project: <name>

DIMENSION SCORES
  Operational Excellence:  ✅/⚠️/❌
  Security:                ✅/⚠️/❌
  Reliability:             ✅/⚠️/❌
  Performance:             ✅/⚠️/❌
  Cost:                    ✅/⚠️/❌
  Sustainability:          ✅/⚠️/❌
  Frontend:                ✅/⚠️/❌/N/A
  Data Architecture:       ✅/⚠️/❌
  Application Architecture: ✅/⚠️/❌

OVERALL HEALTH: <X>/9 dimensions strong

ACTION ITEMS GENERATED
  P1 Critical: <N> items (added to QUEUE immediately)
  P2 High:     <N> items (added to QUEUE)
  P3 Medium:   <N> items (in audit report)
  P4 Low:      <N> items (in audit report)
  Total:       <N> action items

AUDIT REPORT: architecture/ARCH-AUDIT-{YYYY-MM-DD}.md
QUEUE UPDATED: <N> items added under Architecture Debt

TOP 3 RISKS:
  1. [<dimension>] <risk and why it matters>
  2. [<dimension>] <risk>
  3. [<dimension>] <risk>

TOP 3 STRENGTHS:
  1. [<dimension>] <what's working well>
  2. <...>
  3. <...>
```

---

## Update ARCHITECTURE.md with findings

After the audit, update `ARCHITECTURE.md`:
- Add/update the "Architecture Health" section with current scores
- Update any sections that were inaccurate (reality vs documentation)
- Add the ADRs that explain why current gaps exist (historical context)
