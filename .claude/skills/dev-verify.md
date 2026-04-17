# /dev-verify — Verification Phase

Confirm the deployed feature works on production. Show actual evidence. Never declare success without verified output.

---

## Step 1 — Load context

Read `CLAUDE.md` for:
- Production URL
- Health check endpoint
- Any Playwright / E2E test configuration
- Auth method for protected endpoints (API key location)

Retrieve test API key or credentials from `~/.zshrc` or CLAUDE.md if needed.

---

## Step 2 — Health check

```bash
curl -s <prod-url>/api/health
```

Expected: HTTP 200, DB connected, expected response shape.

If health check fails: the deploy itself failed or the service is still starting. Wait 30s and retry once. If still failing, report and stop — do not continue to feature verification with a broken health check.

---

## Step 3 — Feature smoke test

Run the exact test for the feature that was just deployed. Use the same command from the plan's "Smoke test" field.

Show the **actual response** — do not summarize. Include:
- HTTP status code
- Response body (truncated if >50 lines, but show enough to confirm correctness)
- Response headers if relevant (e.g. Cache-Control, CF-Ray for CDN verification)

**Pass criteria:**
- Correct HTTP status
- Response shape matches specification
- Key fields present with correct types/values
- No error fields in response

---

## Step 4 — Regression check

Run 2–3 adjacent endpoint checks to confirm nothing broke nearby:

- If added an endpoint → test the endpoints in the same route group
- If changed enrichment → test a basic address lookup still returns base fields
- If changed billing → test health + key validation still works
- If changed auth → test that an invalid key still returns 401

Show actual responses. Mark each ✅ PASS or ❌ FAIL.

---

## Step 5 — Visual / E2E tests (if configured)

**Playwright (if `playwright.config.js` exists):**
```bash
npx playwright test --grep <feature-name>    # targeted
npx playwright test                           # full suite (if time permits)
```

**Ritara 11-gate build validation:**
Read `npm run build` output — all 11 gates must show PASS.

**OptionFlow E2E:**
```bash
pytest tests/e2e/ -v -k "<feature>"
```

If visual tests fail: screenshot the failure, report what diverged from expected.

---

## Step 6 — CDN / Edge verification (if Cloudflare proxied)

If the service uses Cloudflare proxy (orange cloud):
```bash
curl -sI <prod-url>/api/health | grep -i "cf-ray\|cf-cache-status\|server"
```
Confirm `CF-Ray:` header is present — confirms traffic is flowing through Cloudflare edge.

For cached endpoints, confirm `CF-Cache-Status: HIT` after second request.

---

## Step 7 — Final report

Output exactly this block:

```
=== VERIFICATION REPORT ===
Feature:     <name>
Deployed to: <prod-url>
Date:        <YYYY-MM-DD HH:MM>

Health check:       ✅ PASS  (HTTP 200)
Feature test:       ✅ PASS  (HTTP <status> — <key field confirmed>)
Regression check:   ✅ PASS  (<N> endpoints checked)
Visual / E2E:       ✅ PASS  |  — SKIP (not configured)  |  ❌ FAIL (details below)
CDN edge:           ✅ PASS  |  — SKIP (DNS-only)

OVERALL: ✅ LIVE AND WORKING
```

If any check fails: replace ✅ with ❌ and include the actual failure output below the report block. Do not mark OVERALL as PASS with any failing check.

---

## Step 8 — Post-verification (automatic)

After a successful full pipeline verification:
1. Confirm QUEUE.md item is ✅ (should already be done from `/dev-docs`, but double-check)
2. If on a feature branch: confirm it was merged and deleted
3. If memory updates are needed based on what just shipped: write them now
