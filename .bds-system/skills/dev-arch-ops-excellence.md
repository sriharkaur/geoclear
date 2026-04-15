# /dev-arch-ops-excellence — Operational Excellence Pillar

## Model Dispatch — Opus Required

**This skill must run on Claude Opus.** Every finding at the dimension level feeds DECISIONS.md and the architectural debt backlog — quality here determines build quality downstream.

**If you are the Sonnet orchestrator:** Spawn an Opus sub-agent for this dimension review:
```
Agent(
  model="opus",
  subagent_type="general-purpose",
  description="PRISM-10 Operational Excellence review",
  prompt="[Full Operational Excellence review prompt with project context, all relevant files read, and the complete content of this skill file.]"
)
```
Write the sub-agent output to `architecture/ARCH-DEV_ARCH_OPS_EXCELLENCE-{{YYYY-MM-DD}}.md`, log any decisions to DECISIONS.md, then continue.

**If you are already running as an Opus sub-agent:** Proceed directly with the review below.

---

> WAF Pillar 1: Run and monitor systems to deliver business value and to continually improve supporting processes and procedures.
> Applied as Google SRE Chief Architect — not AWS-specific. Principles apply to any stack, any cloud, any language.
>
> Core philosophy: Operations is an engineering discipline, not a reaction to problems. If humans are doing it manually and repeatedly, it is a defect in the system.

---

## Acting as: VP of Engineering (SRE) at Google

You have designed Site Reliability Engineering at scale. You believe that every manual operational task is a bug to be fixed. You apply error budgets, SLOs, and toil budgets with the same rigor as production code quality. You write post-mortems for every significant incident and treat them as gifts — free lessons that prevent the next incident.

---

## Design Question Set

Answer every question. "Not applicable" requires a written justification.

### 1. Observability — Can you see what the system is doing?

**Structured Logging:**
- [ ] Are all log statements structured (JSON or key=value), not free-text strings?
- [ ] Does every log entry include: timestamp, severity, request_id (for correlation), service name, and the relevant business entity (key, address, user_id)?
- [ ] Are log levels used correctly: DEBUG (dev only), INFO (operational events), WARN (recoverable unexpected state), ERROR (requires attention), CRITICAL (requires immediate action)?
- [ ] Are there log entries for: every external API call (with latency), every DB write, every billing event, every auth decision?
- [ ] Are sensitive fields (API keys, PII) explicitly excluded from logs?

**Metrics:**
- [ ] Is there a metric (counter or gauge) for: requests/sec, error rate, p50/p95/p99 latency for every endpoint?
- [ ] Is there a metric for every external dependency's health (FEMA API available: yes/no, DB connected: yes/no)?
- [ ] Are business metrics tracked: active keys, tier distribution, monthly lookup count, revenue signals?
- [ ] Are resource metrics tracked: disk usage %, memory %, CPU %?

**Distributed Tracing (if multi-service):**
- [ ] Is a trace ID propagated through every request from entry to exit?
- [ ] Are slow spans identifiable without reading logs line by line?

**Health Check:**
- [ ] Does `/api/health` (or equivalent) check ALL critical dependencies — not just "process is alive"?
- [ ] Does it return structured data: `{ "status": "ok", "db": "connected", "disk_pct": 42, "version": "1.2.3" }`?
- [ ] Is the health check callable without authentication (for load balancer probes)?
- [ ] Does it fail fast (< 500ms) so it doesn't mask slow degradation as a timeout?

### 2. Deployment Safety — Can you deploy without customer impact?

- [ ] Is every deployment reversible? (git revert + re-deploy, or feature flag disable)
- [ ] Does the deployment have a smoke test that runs automatically and blocks if it fails?
- [ ] Can new code and old code versions coexist during a rolling deploy without breaking?
- [ ] Is there a documented rollback procedure with exact commands, and has it been tested?
- [ ] Are database schema changes backward compatible? (never remove a column that old code reads; add before remove)
- [ ] Are config changes (env vars, feature flags) testable before they affect production traffic?

**Deployment pipeline checks:**
- [ ] Does CI run before deploy? (tests, lint, security scan)
- [ ] Is there a staging environment where every deploy goes before production?
- [ ] Is there a post-deploy smoke test that automatically runs on production?
- [ ] If the smoke test fails, does the pipeline alert before engineers declare it live?

### 3. Runbooks — Can anyone operate this system at 3am?

For every alert and every known failure mode, there must be a runbook:

- [ ] Is there a runbook for: service is down, DB is unavailable, disk is full, deploy failed, Stripe webhook failure, API key validation broken?
- [ ] Is each runbook: step-by-step, specific (includes actual commands), and testable?
- [ ] Does each runbook include: how to detect the problem, how to diagnose, how to mitigate, how to fix root cause, who to escalate to?
- [ ] Are runbooks stored in `docs/runbooks/` and linked from alert definitions?

### 4. Incident Management — Can you learn from failure?

- [ ] Is there a defined incident severity taxonomy (P0/P1/P2/P3 or equivalent)?
- [ ] Is there a defined escalation path for each severity?
- [ ] Is there a post-mortem process? (blameless, action items assigned, 5-why root cause analysis)
- [ ] Are post-mortem action items tracked to completion?
- [ ] Does each significant incident produce a test case that would have caught it earlier?

### 5. Toil Tracking — Are manual tasks getting automated?

> Toil = manual, repetitive, automatable operational work that scales with traffic. Google SRE principle: keep toil below 50% of each engineer's time.

- [ ] List the top 3 manual operational tasks currently required for this feature
- [ ] For each: is it automatable? What would it take?
- [ ] Are there any manual steps in the deployment process that should be automated?
- [ ] Are there any recurring manual data operations that should be scheduled and monitored automatically?

### 6. Configuration Management — Is configuration auditable and testable?

- [ ] Are all configuration values externalized (env vars, config files) — no hardcoded values in production paths?
- [ ] Is there a single canonical list of all required environment variables? (CLAUDE.md or a `.env.example`)
- [ ] Is configuration validated at startup (fail fast on missing required vars, not fail at runtime)?
- [ ] Are configuration changes tracked? (git for files, documented for platform env vars)

---

## Anti-Patterns to Reject

| Anti-pattern | Impact | Correct approach |
|-------------|--------|-----------------|
| `console.log("something happened")` | Unqueryable, unsearchable | `logger.info({ event: "address_lookup", addr_id: id, duration_ms: 42 })` |
| Health check that only returns `{ "status": "ok" }` | Masks DB/disk failures | Check every dependency, return real state |
| Manual deploy steps in a README | Human error, inconsistency | Automated pipeline, smoke test blocks bad deploy |
| No rollback plan | Incident recovery measured in hours | Git revert + re-deploy in < 5 min, tested |
| Alerts without runbooks | 3am panic, wrong actions taken | Every alert links to a runbook |
| Logs with API keys or PII | Security incident | Explicit exclusion list in logger config |

---

## Findings Format

```
=== OPERATIONAL EXCELLENCE REVIEW ===
Feature: <name>

Observability:
  Structured logging:  ✅ PASS | ⚠️ GAP: <what's missing> | ❌ FAIL: <critical gap>
  Metrics coverage:    ✅ PASS | ⚠️ GAP | ❌ FAIL
  Health check:        ✅ PASS | ⚠️ GAP | ❌ FAIL
  Tracing:             ✅ PASS | — SKIP (single service)

Deployment safety:
  Reversibility:       ✅ PASS | ❌ FAIL: <reason>
  Rollback tested:     ✅ PASS | ⚠️ NOT TESTED | ❌ NO PLAN
  Schema compatibility: ✅ PASS | ❌ FAIL

Runbooks:             <N> runbooks needed, <M> exist | ❌ NONE

Toil:
  Top manual tasks: <list>
  Automation plan: <yes/deferred/N/A>

Must-fix items:
  - <specific actionable item>

Status: APPROVED | REQUIRES ATTENTION (non-blocking) | REWORK REQUIRED (blocking)
```
