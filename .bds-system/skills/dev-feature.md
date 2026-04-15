# /dev-feature — Full Feature Pipeline (Orchestrator)

> Complete lifecycle from raw requirement to verified production deployment.
> Each phase is a quality gate. Failure at any gate stops the pipeline and reports exactly what failed.
> First Time Right: a defect caught at Gate N is always cheaper than one caught at Gate N+1.

---

## Modes

```
/dev-feature                 — full pipeline from requirements, with confirmation at each review gate
/dev-feature auto            — full pipeline, no confirmation pauses (autonomous, use with care)
/dev-feature <gate>          — resume or run a single gate by name
/dev-feature status          — run /dev-status to show current project state
```

Gate names: `requirements`, `design`, `arch`, `plan`, `build`, `test`, `docs`, `commit`, `deploy`, `verify`

---

## Step 0 — Load project context

Read before anything else:
- `CLAUDE.md` — project rules, stack, deployment, commit format, branch strategy, orchestrator routing map
- `QUEUE.md` — what's pending, in progress
- `FEATURES.md` — what's already built (never rebuild)
- `ARCHITECTURE.md` — existing patterns, endpoints, data model
- `requirements/REQUIREMENTS-INDEX.md` — approved requirements (if exists)
- `design/DESIGN-INDEX.md` — approved designs (if exists)

Detect and record:
- **Project type** (API / full-stack / monorepo)
- **Test framework** (pytest / mocha / none / curl-only)
- **CI platform** (GitHub Actions / none)
- **Deploy platform** (Render / Vercel / other) and whether auto-deploys on push
- **Branch strategy** (direct-to-main / feature branches / worktrees)
- **Staging environment** (exists / does not exist)
- **Feature lifecycle state**: does this feature already have an approved REQ? DESIGN? Is it in QUEUE?

Route based on lifecycle state:
- No REQ exists → start at Gate 1 (Requirements)
- REQ exists, no DESIGN → start at Gate 2 (Design)
- DESIGN approved, no TASK breakdown → start at Gate 3 (Plan)
- TASK breakdown exists, not built → start at Gate 4 (Arch check) → Gate 5 (Build)
- Built, not tested → start at Gate 6 (Test)
- Tested, not deployed → start at Gate 7 (Docs) → Gate 8 (Commit) → Gate 9 (Deploy)
- Deployed, not verified → start at Gate 10 (Verify)

---

## GATE 1 — Requirements

Run `/dev-requirements` logic:

1. Capture the raw requirement from the user — assign `REQ-{YYYY}-{SEQ:04d}`
2. Check `FEATURES.md` and `REQUIREMENTS-INDEX.md` — if already exists, surface it and ask for clarification
3. **Principal PM Review**: challenge problem/user/metric/scope/acceptance criteria/out-of-scope
4. **Distinguished PM Counter-Review**: strategic fit, systemic impact, simplicity, ROI
5. **Chief Architect Feasibility Review**: feasibility, NFR flags, hidden complexity, security surface
6. Write `requirements/REQ-{ID}-{slug}.md` with all review verdicts
7. Update `requirements/REQUIREMENTS-INDEX.md`

**GATE PASS**: Distinguished PM = APPROVE + Chief Architect = FEASIBLE. Written to file.
**GATE FAIL**: REJECT or NOT FEASIBLE — document reason, do not proceed. Revise and re-run if conditions are met.
**CONFIRMATION PAUSE** (unless `/dev-feature auto`): Show requirement doc, get user sign-off.

---

## GATE 2 — Design

Run `/dev-design` logic:

1. Read the approved `REQ-{ID}` document
2. **Principal Architect drafts** the full design: problem statement, non-goals, architecture diagram, API contract, data model, sequence diagram, error handling, observability, rollout plan
3. **Chief Architect of Google Review**: scalability, operational excellence, simplicity, security — produces must-fix list
4. **Chief Scientist Review** (if ML/data involved): data quality, algorithm correctness, bias
5. Revise design until all must-fix items resolved
6. Write `design/DESIGN-{ID}-{slug}.md` with approved status and review history
7. Update `design/DESIGN-INDEX.md`
8. Update `REQ-{ID}.md` → `linked_design`

**GATE PASS**: Chief Architect = APPROVED. All must-fix items resolved. Written to file.
**GATE FAIL**: Open must-fix items — revise design, re-run review. Do not proceed.
**CONFIRMATION PAUSE** (unless auto): Show design summary, get user sign-off.

---

## GATE 3 — Plan

Run `/dev-plan` logic:

1. **Principal TPM**: decompose approved design into `TASK-{YYYY}-{SEQ:04d}` items — each completable in one session with a clear done-criterion
2. **Principal Architect validates**: coverage (every design section has a task), sequencing (dependency order correct), test tasks included, migration tasks separate, docs task included
3. Determine branch strategy: single-file → main, multi-file → `feat/<name>`, data → no branch
4. Create branch if multi-file: `git checkout -b feat/<name>`
5. Write tasks to `QUEUE.md` under feature section with REQ and DESIGN cross-references
6. Update `REQ-{ID}.md` and `DESIGN-{ID}.md` → `linked_tasks`

**GATE PASS**: Task list validated by Principal Architect. Written to QUEUE.md. Branch created.
**GATE FAIL**: Coverage gaps or sequencing violations — fix task list before proceeding.
**CONFIRMATION PAUSE** (unless auto): Show task list and order, get user sign-off.

---

## GATE 4 — Architecture Check

Run `/dev-arch` logic for non-trivial changes:

Skip Gate 4 only for: single-file bug fixes, doc updates, config value changes.

1. Assess NFRs: performance, availability, scalability, security, data, cost, operability
2. Write ADR for any architectural decision not already captured in the design doc
3. Fill capacity plan if data or compute is involved
4. Map new external dependencies and failure modes
5. Complete deployment architecture checklist
6. Produce sign-off block

**GATE PASS**: All checklist items checked. Sign-off block produced.
**GATE FAIL**: Unresolved NFR, missing migration plan, unanswered failure mode.

---

## GATE 5 — Build

Run `/dev-build` logic:

1. Read every file that will be modified before writing a single line
2. Follow the project's architectural patterns exactly (from CLAUDE.md and ARCHITECTURE.md)
3. Implement against the approved design: API contract, data model, error handling, observability
4. Never bypass auth, no hardcoded secrets, no speculative abstractions, no error handling for impossible scenarios
5. Manual smoke test immediately after build:
   - Run the smoke test command from the Plan
   - Show actual response — do not declare success without verified output
6. Mark `TASK-{ID}` as ✅ in QUEUE.md as each task completes

**GATE PASS**: Feature works as specified per approved design. Verified by actual output.
**GATE FAIL**: Smoke test fails — diagnose against design spec before retrying.

---

## GATE 6 — Test

Run `/dev-test` logic — all applicable layers:

| Layer | TC prefix | What |
|-------|-----------|------|
| UNIT | TC-UNIT | Functions in isolation |
| INT | TC-INT | DB, cache, internal calls |
| SYS | TC-SYS | Full request path + middleware |
| API | TC-API | HTTP contract: status, shape, auth, rate limits |
| E2E | TC-E2E | Complete user journeys |
| VIS | TC-VIS | Playwright visual regression (if UI) |
| PERF | TC-PERF | p50/p95/p99 latency, throughput, memory |
| SEC | TC-SEC | Auth bypass, injection, CORS, oversized payload |
| DATA | TC-DATA | Schema correctness, migration, row counts |
| PIPE | TC-PIPE | Build gates, CI, post-deploy health |

Auto-fix loop: run → read failure → diagnose root cause → fix code → re-run. Max 5 iterations. Escalate if still failing.
New bugs found: add to `tests/BUG-REGISTRY.md` + create regression TC.

**GATE PASS**: ALL applicable layers: 0 failures. Test report generated.
**GATE FAIL**: Any failing TC after auto-fix loop. Stop. Escalate to user.

---

## GATE 7 — Docs

Run `/dev-docs` logic — all files in the same operation:

1. **FEATURES.md** — add feature with endpoint, params, behavior, notes. Remove from "Not yet built."
2. **ARCHITECTURE.md** — add endpoints to correct table, data model changes, "Last updated" header
3. **RELEASES.md** → `## Unreleased`: one bullet `- feat: <what> — <why it matters>`
4. **QUEUE.md** — check off all completed TASK-{IDs} with ✅
5. **REQUIREMENTS-INDEX.md** — update status to match implementation state
6. **DESIGN-INDEX.md** — update status to implemented
7. **CLAUDE.md** — update only if new critical rule, shorthand, env var, or pattern
8. **Memory** — write if new architectural decision, pricing tier, or infra pattern

**GATE PASS**: All files updated. Re-read each to verify.
**GATE FAIL**: Any file missing the entry. A commit without docs does not leave this gate.

---

## GATE 8 — Commit

Run `/dev-commit` logic:

1. `git status` — confirm only expected files; nothing sensitive
2. `git diff --staged` — verify diff matches feature + docs
3. Stage: code files + all doc files (FEATURES, ARCHITECTURE, RELEASES, QUEUE + requirements/ and design/ files changed)
4. Commit message:
   ```
   feat: <description>  [REQ-{ID}]

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   ```
5. Never `--no-verify`, `--amend` on pushed, `--force`
6. Feature branch: commit local, do not push until complete + smoke-tested. Merge to main when ready.
7. On main: `git push origin main`

**GATE PASS**: Clean commit, SHA recorded, push succeeded.
**GATE FAIL**: Pre-commit hook failure → fix underlying issue, do not bypass.

---

## GATE 9 — Deploy

Run `/dev-deploy` logic:

**Standard (Render auto-deploy):** triggered by `git push main`. Poll until `status: live`.
**Large files (>100MB):** SSH pipe with seek-offset resume — never git, never full rsync.
**DB migrations:** staging-first → verify row counts → apply to prod. DROP INDEX before bulk inserts.
**Data ops (>5GB):** staging shell → TSV export → upload-chunk → merge → verify.

Monitor: poll every 30s, timeout 10 min. On failure: read Render deploy logs, diagnose, report.

**GATE PASS**: `status: live` from Render API (or CI = success + deploy = live).
**GATE FAIL**: Deploy failed → read logs, diagnose, report. Rollback requires user approval.

---

## GATE 10 — Verify

Run `/dev-verify` logic:

1. Health check: `curl <prod-url>/api/health` — must return HTTP 200 before continuing
2. Feature smoke test: actual response body, HTTP status, key fields confirmed against design spec
3. Regression check: 2-3 adjacent endpoints, each marked ✅ or ❌
4. Visual/E2E: Playwright, Ritara 11-gate, OptionFlow pytest e2e (per project)
5. CDN verification: `CF-Ray:` header present, `CF-Cache-Status: HIT` after second request

Final report:
```
=== VERIFICATION REPORT ===
Feature:     <name>  [REQ-{ID}] [DESIGN-{ID}]
Deployed to: <prod-url>
Date:        <YYYY-MM-DD HH:MM>

Health check:       ✅ PASS  (HTTP 200)
Feature test:       ✅ PASS  (HTTP <status> — <key field confirmed>)
Regression check:   ✅ PASS  (<N> endpoints checked)
Visual / E2E:       ✅ PASS  |  — SKIP (not configured)
CDN edge:           ✅ PASS  |  — SKIP (DNS-only)

REQ-{ID} acceptance criteria:
  [AC-1] Given... When... Then... → ✅ VERIFIED
  [AC-2] Given... When... Then... → ✅ VERIFIED

OVERALL: ✅ LIVE AND WORKING
Feature complete. Update QUEUE.md final items, confirm branch merged.
```

**GATE PASS**: Health + feature + regression all ✅, all acceptance criteria from REQ verified.
**GATE FAIL**: Report exactly what failed with actual response. Do not declare success.

---

## Pipeline summary

```
GATE 1   Requirements  → REQ-NNNN captured, PM + Distinguished PM + Chief Arch reviewed, APPROVED
GATE 2   Design        → DESIGN-NNNN written, Chief Arch + Chief Scientist reviewed, APPROVED
GATE 3   Plan          → TASK-NNNN breakdown, Principal TPM + Principal Arch validated, in QUEUE
GATE 4   Arch check    → NFRs, ADRs, capacity plan, deployment checklist (non-trivial only)
GATE 5   Build         → Smoke test passes, tasks marked ✅ as completed
GATE 6   Test          → All 10 layers green, test report generated, BUG-REGISTRY updated
GATE 7   Docs          → FEATURES + ARCHITECTURE + RELEASES + QUEUE + requirements/ + design/
GATE 8   Commit        → Clean commit with REQ ref, push triggers deploy
GATE 9   Deploy        → Live on prod (Render/CI), migrations applied, data verified
GATE 10  Verify        → Prod health + acceptance criteria verified + formal report
```

**Cost of defects by gate:**
- Found at Gate 1 (Requirements): 1x cost — a conversation
- Found at Gate 2 (Design): 2x cost — revise design doc
- Found at Gate 3 (Plan): 3x cost — re-sequence tasks
- Found at Gate 5 (Build): 10x cost — rewrite code
- Found at Gate 6 (Test): 20x cost — debug, fix, re-test
- Found at Gate 10 (Verify/Prod): 100x cost — customer impact, rollback, incident
