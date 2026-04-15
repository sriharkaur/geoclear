# /dev-test — Comprehensive Testing Framework

> Objective: Zero defects to production, first time, every time.
> Claude runs tests → reads failures → diagnoses root cause → fixes code → re-runs → repeats until ALL GREEN → claims feature complete.
> A feature is not complete until every applicable test layer is green. No exceptions.

---

## Test Case ID System

```
Format:  TC-{TYPE}-{SEQ:04d}
Example: TC-API-0001, TC-UNIT-0042, TC-E2E-0003

TYPE codes:
  UNIT  — function/method in isolation (no I/O, no DB, no network)
  INT   — module integration (DB queries, cache, internal service calls)
  SYS   — full system behavior within one service
  API   — HTTP endpoint contract (status, shape, auth, headers, rate limits)
  E2E   — complete user journey across systems/UI
  VIS   — visual/UI regression (Playwright screenshot diff)
  PERF  — throughput, latency, load, memory under scale
  SEC   — auth bypass, injection, CORS, key validation, header security
  DATA  — schema integrity, migration correctness, row counts, constraints
  PIPE  — build pipeline gates, CI steps, deploy health
```

Registry: `tests/TC-REGISTRY.md` in each project. Create if missing.
Bug registry: `tests/BUG-REGISTRY.md` in each project. Create if missing.

---

## Step 1 — Load context

Read: `CLAUDE.md`, `package.json` (scripts), `pyproject.toml` or `pytest.ini` if Python.
Detect test infrastructure:

| Signal | Framework | Commands |
|--------|-----------|----------|
| `package.json` has `"test"` script with mocha | Mocha/Node | `npm test` |
| `package.json` has `"build"` with gate pipeline | 11-gate | `npm run build` |
| `pytest.ini` / `pyproject.toml` / `conftest.py` | pytest | `pytest` |
| `.github/workflows/ci.yml` | GitHub Actions | parse and run same commands |
| None of the above | curl-only | manual curl smoke tests |
| `playwright.config.js` / `playwright.config.ts` | Playwright | `npx playwright test` |

---

## Step 2 — Determine test scope

| Change type | Minimum layers | Escalate to |
|-------------|----------------|-------------|
| Single endpoint added | API + SEC + INT | + UNIT if complex logic |
| New module / service | UNIT + INT + API | + SYS if cross-module |
| Schema / migration change | DATA + INT + API | + full suite |
| Auth / billing change | SEC + API + E2E | full suite mandatory |
| UI component | VIS + E2E | + API if data-driven |
| Data pipeline / import | DATA + PERF + INT | + SYS |
| Any prod-bound change | Run every applicable layer | no exceptions |

Run minimum scope first. If anything fails, escalate to full suite before diagnosing.

---

## Step 3 — TC Registry

Before running tests, check `tests/TC-REGISTRY.md`. If it does not exist, create it:

```markdown
# TC Registry

| TC ID | Layer | Module | Description | Owner | Added |
|-------|-------|--------|-------------|-------|-------|
```

For each new test written this session, add a row. Sequence numbers are monotonically increasing per layer — never reuse a retired TC ID.

---

## Step 4 — Test layers

### 4.1 Unit Tests (TC-UNIT-XXXX)
Tests a single function/method in isolation. No DB, no network, no filesystem.

**What to cover:**
- Every function with business logic (enrichment, scoring, parsing, validation)
- Edge cases: empty input, null, max length, special characters
- Boundary conditions: exactly at limits, one above, one below
- Error paths: function throws correctly, returns expected error shape

**When writing new tests:**
```javascript
// TC-UNIT-0001: enrich() returns null flood zone for non-flood address
test('TC-UNIT-0001', () => { ... })
```

**Command (Node):** `npm test -- --grep "TC-UNIT"`
**Command (Python):** `pytest tests/unit/ -v -k "TC_UNIT"`

---

### 4.2 Integration Tests (TC-INT-XXXX)
Tests a module interacting with its real dependencies (real DB, real cache, real internal APIs).

**What to cover:**
- DB read/write round-trip (insert → query → verify)
- Cache hit/miss behavior
- Internal service calls with real payloads
- Transaction rollback on failure
- Index usage (EXPLAIN QUERY PLAN on critical queries)

**Command:** `npm test -- --grep "TC-INT"` or `pytest tests/integration/ -v`

---

### 4.3 System Tests (TC-SYS-XXXX)
Tests a complete request path through the system — from HTTP request to response, including all middleware.

**What to cover:**
- Happy path: valid input → correct response shape
- Auth middleware: unauthenticated → 401, invalid key → 401, valid key → 200
- Rate limiting: at limit → 200, over limit → 429
- Error propagation: DB unavailable → 503 (not 500 with stack trace)

---

### 4.4 API Tests (TC-API-XXXX)
Contract tests for every HTTP endpoint. These run against a live local server.

**For each endpoint, verify:**
```
✓ Correct HTTP status code (200, 201, 400, 401, 404, 429, 500)
✓ Response body matches declared schema (all required fields present, correct types)
✓ Content-Type header correct
✓ No internal error details leaked in 5xx responses
✓ CORS headers present if applicable
✓ Auth: unauthenticated → 401, wrong key → 401, expired key → 401
✓ Validation: missing required param → 400 with field name in error
✓ Idempotency: repeated identical requests return consistent results
```

**Command (GeoClear pattern):**
```bash
BASE=http://localhost:4001
KEY=$(grep TEST_API_KEY ~/.zshrc | cut -d'"' -f2)

# TC-API-0001: health check
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/health)
echo "TC-API-0001: health → $STATUS"  # expect 200

# TC-API-0002: address lookup with valid key
curl -s "$BASE/v1/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC" \
  -H "X-Api-Key: $KEY"
```

---

### 4.5 End-to-End Tests (TC-E2E-XXXX)
Full user journeys from start to finish. Covers the scenario a real customer would execute.

**For SaaS APIs:**
1. Signup → key issued → lookup → usage incremented → quota enforced
2. Free tier → quota exhausted → 429 returned → upgrade → lookups resume
3. Webhook delivery → key activated → lookup works

**For web apps:**
1. Landing page loads → signup flow → dashboard loads → feature works → logout
2. Error state: invalid input → error message shown → user recovers

**Command:** `npx playwright test` or `pytest tests/e2e/ -v`

---

### 4.6 Visual / UI Tests (TC-VIS-XXXX)
Screenshot-based regression testing. Any UI change must not alter unaffected pages.

**Setup check:** `ls playwright.config.{js,ts}` — if not found, skip this layer.

**What to cover:**
- Landing page renders correctly (no layout shifts, no broken images)
- Key CTAs visible and clickable
- Responsive breakpoints: desktop 1280px, tablet 768px, mobile 375px
- Dark mode if supported
- Error states render correctly (not blank/broken)

**Command:**
```bash
npx playwright test                           # full visual suite
npx playwright test --grep "TC-VIS"          # visual layer only
npx playwright test --update-snapshots       # ONLY when intentionally changing UI
```

**On failure:** Playwright saves diff screenshots to `test-results/`. Read the diff — do not `--update-snapshots` unless the change is intentional and correct.

---

### 4.7 Performance Tests (TC-PERF-XXXX)
Verify the system meets latency and throughput SLAs under realistic load.

**Thresholds (default — override in CLAUDE.md if project defines different SLAs):**
```
p50 response time:  < 100ms  (API endpoints)
p95 response time:  < 500ms
p99 response time:  < 2000ms
Throughput:         > 100 req/s per instance
Error rate at load: < 0.1%
Memory growth:      < 5% per 10K requests (no leak)
```

**Commands:**
```bash
# Quick load test (Node)
npx autocannon -c 10 -d 30 http://localhost:4001/api/health

# Sustained load with latency percentiles
npx autocannon -c 50 -d 60 --json http://localhost:4001/v1/address?...

# Python — locust
locust -f tests/perf/locustfile.py --headless -u 50 -r 10 --run-time 60s
```

**When to run:** Any change touching query paths, enrichment pipeline, or middleware. Always before declaring a data-heavy feature production-ready.

---

### 4.8 Security Tests (TC-SEC-XXXX)
Verify the application cannot be exploited through common attack vectors.

**Mandatory checks for every API service:**
```bash
# TC-SEC-0001: no key → 401
curl -s -o /dev/null -w "%{http_code}" $BASE/v1/address?street=test
# expect 401

# TC-SEC-0002: wrong key → 401  
curl -s -o /dev/null -w "%{http_code}" $BASE/v1/address?street=test \
  -H "X-Api-Key: bad_key_that_doesnt_exist"
# expect 401

# TC-SEC-0003: SQL injection in params
curl -s "$BASE/v1/address?street=1'+OR+'1'%3D'1" -H "X-Api-Key: $KEY"
# expect: no DB error leaked, no unexpected data

# TC-SEC-0004: oversized payload
curl -s -X POST $BASE/v1/address -d "$(python3 -c "print('A'*100000)")" \
  -H "X-Api-Key: $KEY"
# expect: 400 or 413, not crash

# TC-SEC-0005: CORS — cross-origin without allowlist
curl -s -H "Origin: https://evil.com" -I $BASE/api/health | grep -i "access-control"
# expect: no Access-Control-Allow-Origin: * on protected endpoints

# TC-SEC-0006: admin endpoint without admin secret
curl -s -o /dev/null -w "%{http_code}" $BASE/v1/admin/keys/stats
# expect: 401 or 403
```

---

### 4.9 Data Integrity Tests (TC-DATA-XXXX)
Verify database schema correctness, migration safety, and row count expectations.

**After any schema change:**
```bash
# Verify table exists with correct columns
sqlite3 data/dev.db ".schema addresses"

# Verify row counts within expected range
sqlite3 data/dev.db "SELECT COUNT(*) FROM addresses"

# Verify no orphaned records after migration
sqlite3 data/dev.db "SELECT COUNT(*) FROM api_keys WHERE stripe_customer_id IS NULL AND tier != 'free'"

# Verify indexes exist
sqlite3 data/dev.db ".indexes addresses"
```

**Migration safety checklist:**
- [ ] Migration is idempotent (running twice doesn't break)
- [ ] Migration file is numbered (`migrations/NNNN-description.sql`)
- [ ] Staging verified before prod
- [ ] Rollback SQL documented in migration file header
- [ ] Row counts match expected before and after

---

### 4.10 Pipeline / Deployment Tests (TC-PIPE-XXXX)
Verify the build, CI, and deployment pipeline is healthy.

**For Ritara-style 11-gate pipeline:**
```bash
npm run build    # all 11 gates must show PASS
```

**For GitHub Actions:**
```bash
gh run list --limit 1 --json status,conclusion,url
# must show conclusion: success
```

**For all projects:**
```bash
# TC-PIPE-0001: production health check post-deploy
curl -s https://<prod-url>/api/health
# expect: 200 with {"status":"ok","db":"connected"}

# TC-PIPE-0002: staging health (if staging exists)
curl -s https://<staging-url>/api/health
```

---

## Step 5 — Auto-fix loop

```
MAX_ITERATIONS = 5
iteration = 0

WHILE failing_tests > 0 AND iteration < MAX_ITERATIONS:

  1. Parse failure output — extract failing TC IDs, error messages, stack traces
  2. For each failing TC (in order of dependency — unit before integration):
     a. Read the actual error output completely — not just the headline
     b. Identify root cause: is this a code bug or a wrong test?
        - If code bug: fix the implementation, not the test
        - If test is wrong (spec changed, test was incorrect): fix the test AND document why
     c. Apply fix
     d. Re-run only the failing TC to verify the fix
     e. If fixed: proceed to next failing TC
     f. If not fixed after 2 targeted attempts: read deeper, check dependencies
  3. After all individual fixes: run full applicable suite to check for regressions
  4. iteration++

IF still_failing after MAX_ITERATIONS:
  → ESCALATE: show user the failure report, list what was tried, ask for guidance
  → DO NOT proceed to /dev-docs or /dev-commit
```

**Rules:**
- Fix code, not tests (unless the test specification was wrong)
- Never use `--skip`, `--ignore`, `xfail`, or comment out a failing test
- Never proceed to Gate 4 (Docs) with any failing test
- If a test reveals a pre-existing bug (not related to current feature): file it in BUG-REGISTRY.md and create a TC for it, but do not block current feature for it — note it separately

---

## Step 6 — Bug discovery → registry

When any test reveals a new bug (expected pass → actual fail due to a real defect):

1. Assign next BUG ID: `BUG-{YYYY}-{SEQ:04d}`
2. Add to `tests/BUG-REGISTRY.md`:

```markdown
| BUG-2026-0001 | 2026-04-15 | TC-API-0007 | enrich() returns null flood zone for coastal zip codes | root cause: missing FEMA lookup for zone AE | fix: updated fema-lookup.js line 42 | TC-INT-0031 added |
```

3. Create a new TC covering the bug scenario (regression prevention):
   - TC type: whichever layer first caught it
   - Description: exact input that triggered the bug
   - Expected: correct output
   - Add to TC-REGISTRY.md

4. The new regression TC must pass before the bug is considered fixed.

---

## Step 7 — Test report

After every full test run, output this report block. Do not summarize — show actual pass/fail counts.

```
=== TEST REPORT ===
Run ID:   TR-{YYYYMMDD-HHMMSS}
Feature:  <feature name>
Branch:   <branch>

Layer   Suite                   Total  Pass  Fail  Skip  Duration
──────────────────────────────────────────────────────────────────
UNIT    tests/unit/             ??     ??    ??    ??    ??s
INT     tests/integration/      ??     ??    ??    ??    ??s
SYS     (inline)                ??     ??    ??    ??    ??s
API     tests/api/ or curl      ??     ??    ??    ??    ??s
E2E     tests/e2e/              ??     ??    ??    ??    ??s
VIS     playwright/             ??     ??    ??    ??    ??s  — SKIP if not configured
PERF    tests/perf/             ??     ??    ??    ??    ??s  — SKIP if not triggered
SEC     tests/security/         ??     ??    ??    ??    ??s
DATA    (migration checks)      ??     ??    ??    ??    ??s  — SKIP if no schema change
PIPE    (build gates / CI)      ??     ??    ??    ??    ??s
──────────────────────────────────────────────────────────────────
TOTAL                           ??     ??    ??    ??    ??s

Coverage (if measurable): ??%

VERDICT: ✅ ALL GREEN — Proceed to /dev-docs
         ❌ FAILURES: <list TC IDs> — see auto-fix loop above
```

If any layer is SKIP: state why (not configured / not applicable to this change).
If any TC failed after the auto-fix loop: include the full failure output below the table.

---

## Step 8 — Gate pass criteria

**PASS:**
- All applicable layers: 0 failures
- No tests skipped without explicit justification
- TC-REGISTRY.md updated with any new test cases
- BUG-REGISTRY.md updated if any new bugs discovered
- Report block generated and shown

**FAIL — do not proceed to /dev-docs:**
- Any layer has > 0 failures after the auto-fix loop
- Any test was skipped without justification
- Performance thresholds exceeded
- Security check returned unexpected result

---

## Project-specific commands

**GeoClear (Node.js + curl-only):**
```bash
# Start server for testing
NAD_DB=data/dev.db node web-server.js &
sleep 2

# API layer
curl -s http://localhost:4001/api/health
curl -s "http://localhost:4001/v1/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC" \
  -H "X-Api-Key: <test-key>"

# Security layer
curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/v1/address?street=test
# expect 401
```

**OptionFlow (Next.js + FastAPI + pytest):**
```bash
pytest tests/unit/ -v --tb=short           # unit layer
pytest tests/integration/ -v               # integration layer
pytest tests/e2e/ -v -k "TC_E2E"          # e2e layer
pytest -x --tb=short                       # fail-fast full suite
npx playwright test                        # visual layer
```

**Ritara (Node.js + 11-gate pipeline):**
```bash
npm run build    # runs all 11 gates; all must show PASS
npm test         # Mocha 551 tests
npx playwright test  # visual regression
```
