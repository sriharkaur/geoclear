# GeoClear — Master Queue
**Single source of truth for all work. Check items off as done.**
_Last updated: 2026-04-17 (session 26 — Climate Risk Score demo live and stable: AbortController wall-clock timeouts, res.on('error') crash fix, address number parsing to avoid full-table-scan, FEMA race cap. No more crash loops. Demo endpoint returns in <4s cached.)_

> **North Star:** $100K MRR in 12 months
> **Next milestone:** $500 MRR by Day 30 → $2,500 by Day 60 → $5,000 by Day 90
> **Rule:** No new strategy sessions until Day 60. No new product features until first paying customer.
> **Strategy files:** [STRATEGY-INDEX.md](strategy/STRATEGY-INDEX.md) — all 9 analyses with conclusions

---

## 🔴 URGENT — Fix Now (production data issue)

- ✅ **Q-001 · FK relink on prod** — DONE 2026-04-17. MI/NJ/NV/NH/FL/CA now show correct counts (FL: 41.7M, CA: 15M, MI: 9.5M, NJ: 10M, NV: 2.3M, NH: 870K). Fixed via `POST /v1/admin/refresh-counts` after adding `refresh-counts-worker.js`.

---

## PHASE 1 — Days 1–30: Ship the 7 GTM Assets
> Every item here is a prerequisite for the first paying customer. Do in sequence. No detours.

### Week 1 — Foundation (Days 1–7)

- [x] **Q-002 · RapidAPI listing** ✅ 2026-04-17 — GeoClear live at `rapidapi.com/auduuai/api/geoclear`. OpenAPI spec imported, all endpoints (Address/Enrichment/Geography/Account/Status), base URL `https://geoclear.io`, X-Api-Key auth, Category: Data, visibility: Public.
- [x] **Q-003 · `/compliance` landing page** ✅ 2026-04-17 — `public/compliance.html` (678 lines) + `/compliance` route in `web-server.js`. H1: "Flood zone + census tract for every US address. NFIP-ready." Body: FEMA NFHL as primary source (auditable for legal), HMDA census tract, self-serve $249/mo, no sales call. Show live JSON response with `flood_zone`, `flood_sfha`, `census_tract`. CTA: "Start free." *Destination for all compliance outreach emails — zero Claire conversions without this.*
- [x] **Q-004 · Google Search Console setup** ✅ 2026-04-17 — geoclear.io Domain property verified via Cloudflare DNS TXT integration (automated, no manual DNS entry needed). Sitemap submitted: `https://geoclear.io/sitemap.xml` (7 URLs). `public/sitemap.xml` created and deployed. GSC will index once Render deploy propagates.
- [ ] **Q-005 · Build compliance outreach list — 15 targets** — LinkedIn: "VP Product" OR "Head of Engineering" + "mortgage" OR "insurance" OR "proptech". Targets: Encompass, BytePro, Maxwell, Blend, Qualia, Snapdocs, Hippo Insurance, Kin Insurance, Better.com, Morty, Neptune Flood, Openly, Lemonade. Add name + direct email to `AddressAPIBusinessGTM.md`.
- [ ] **Q-006 · Send compliance outreach batch 1 (15 emails)** — plain text, < 150 words. Subject: `"Flood zone determination API — NFIP-ready, self-serve, $249/mo"`. Body: NFIP compliance framing → live API JSON showing `flood_zone: "AE"`, `flood_sfha: true`, `census_tract` → link to `/compliance`. *Do not send until /compliance page is live.*

### Week 2 — Launch (Days 8–14)

- [ ] **Q-007 · Post "Show HN: GeoClear"** — title: `"Show HN: GeoClear – US address API with FEMA flood zone + census tract in one call"`. Post Tuesday or Wednesday 9am PT. First comment: data pipeline (NAD + Overture + FEMA NFHL + Census Bureau), enrichment fields, free tier limits, link to /docs. *Post after RapidAPI listing is live.*
- [ ] **Q-008 · Write `/docs/vs-smartystreets` comparison page** — capability table (flood zone ✅ vs ❌, census tract, pricing, free tier), migration guide. SEO target: "SmartyStreets alternative", "address API with flood zone". File: `public/docs/vs-smartystreets.html`.
- [ ] **Q-009 · Write `/docs/flood-zone-api` SEO page** — "What is FEMA flood zone data?", FEMA zone codes (AE, X, VE), how to get it via API, curl example. SEO target: "FEMA flood zone API", "NFIP flood determination API". Submit both new pages to GSC.
- [ ] **Q-010 · Follow up compliance outreach batch 1** — Day 5 after send (~Day 10–12). One sentence: "Did you get a chance to see the flood zone response? Happy to do a 15-min call." Max 2 touchpoints total.
- [ ] **Q-011 · LinkedIn founder post — FEMA anchor** — "Manual flood zone determination costs $3–$15 per address. We built an API that returns it for free (up to 1K/day)." Screenshot of API response showing `flood_zone`. Tag PropTech + mortgage tech communities.

### Week 3 — Messaging + Instrumentation (Days 15–21)

- [x] **Q-012 · Rewrite landing page H1/H2/CTA** ✅ 2026-04-17 — H1: `"US address intelligence. One call. Everything included."` H2: `"Validate, geocode, and enrich US addresses with census tract, FEMA flood zone, and timezone — from a free API key."` CTA: `"Get your free key"`. File: `public/landing.html`
- [x] **Q-013 · Add FEMA anchor copy to pricing section** ✅ 2026-04-17 — Banner above pricing grid: `"Manual flood zone determination costs $3–$15 per address. GeoClear Pro includes unlimited flood zone lookups for $249/mo."` File: `public/landing.html`
- [x] **Q-014 · Rename tiers on pricing page + portal** ✅ 2026-04-17 — Starter→Builder, Growth→Professional (display names only; internal Stripe keys unchanged). Updated landing.html, portal.html, JS volSteps, calc default.
- [x] **Q-015 · Set "Most Popular" badge on Professional tier** ✅ 2026-04-17 — `featured` class + "Most Popular" badge moved from Builder ($49) to Professional ($249). Slider defaults to Professional on page load. File: `public/landing.html`
- [x] **Q-016 · Add Enterprise "Starting at $2,000/mo"** ✅ 2026-04-17 — Styled Enterprise banner below pricing grid with "$2,000/mo", feature list, and "Contact us →" mailto CTA. File: `public/landing.html`
- [x] **Q-017 · Add data provenance section to landing page** ✅ 2026-04-17 — 4-card section before CTA: USDOT NAD r22, Overture Maps, FEMA NFHL API, US Census Bureau Geocoder. Each with source label + one-liner. File: `public/landing.html`
- [x] **Q-018 · Add competitive comparison table to landing page** ✅ 2026-04-17 — GeoClear vs SmartyStreets vs Lob vs Melissa. 7-row table. Key row: FEMA flood zone (✅ free vs ❌ vs ❌ vs ❌). File: `public/landing.html`
- [x] **Q-019 · Add `first_call_at` timestamp to `api_keys` table** ✅ 2026-04-17 — Migration in keys.js. Set via `COALESCE(first_call_at, datetime('now'))` in recordUsage UPDATE. Files: `schema.sql`, `web-server.js`
- [x] **Q-020 · Add `latency_ms` + `tier` columns to `usage_log`** ✅ 2026-04-17 — Migrations in keys.js. Latency captured via `process.hrtime.bigint()` in auth middleware. Tier passed from `info.tier`. Files: `schema.sql`, `web-server.js`

### Week 4 — Convert + Retain (Days 22–30)

- [x] **Q-021 · Build `GET /v1/admin/analytics` endpoint** ✅ 2026-04-17 — Returns: requests_by_day, top_keys_by_volume, tier_breakdown, error_rate, new_signups_by_day, avg_latency_by_endpoint. `?days=N` param (default 30). File: `web-server.js`
- [x] **Q-022 · Build welcome email drip (3 emails, SendGrid)** ✅ 2026-04-17 — Day 1: existing keyEmail on signup. Day 3: sent if first_call_at set (shows enrichment curl example). Day 7: upgrade prompt for free/starter, feature roundup for paid. Daily cron at 01:00 UTC. `drip_sent` column tracks state. Manual trigger: `POST /v1/admin/drip/run`.
- [x] **Q-023 · Product Hunt listing** ✅ 2026-04-17 — Draft saved at `producthunt.com/products/geoclear-address-intelligence-api`. Name: "GeoClear — Address Intelligence API", tagline: "Address API with FEMA flood zone + census tract. Free." (54 chars). Ready to schedule launch date.
- [ ] **Q-024 · Compliance outreach batch 2 (15 new targets)** — apply learnings from batch 1. If flood zone subject got replies: keep. If not: test `"Quick question about your flood zone workflow"` or `"HMDA census tract API — $249/mo, no sales call"`.
- [x] **Q-025 · Set up KPI cadence** ✅ 2026-04-17 — `sessions/KPI-WEEKLY-LOG.md` with bookmarks (daily pulse, analytics, Stripe, SendGrid, uptime) + weekly metrics template. Stripe MRR notifications checklist included.
- [x] **Q-026 · Set calendar reminders** ✅ 2026-04-17 — Google Calendar events created: Month 3 (2026-07-16, red), Month 5 investment trigger (2026-09-16, orange), Month 6 strategic review (2026-10-16, blue). Each with full assessment checklist.

### Day 30 Checkpoint

- [ ] **Q-027 · [Day 30] $500 MRR check** — if yes: identify winning channel, double down in Phase 2. If no: email every free signup personally ("what were you trying to build?") before adding any new channels. Offer founding-customer pricing ($149/mo, locked 12 months) to first 5 customers.

### War Room Triggers

- [ ] **Q-028 · [Day 7] Outreach reply rate** — if 0 replies after 15 emails: check spam first; if fine, rewrite body to question-first opener.
- [ ] **Q-029 · [HN day] < 10 upvotes** — do not repost. Immediately cross-post to dev.to + r/webdev + r/programming.

---

## PHASE 2 — Days 30–60: Scale What Worked
> Don't add new channels. Scale the one that produced the first customer.

- [x] **Q-030 · Create Pro Compliance tier at $499 in Stripe** ✅ 2026-04-17 — `pro_compliance` in TIERS (keys.js) + STRIPE_PRICES (web-server.js), portal.html card added, SLA document at `public/geoclear-compliance-sla.html` (printable, signable), linked from /compliance page. **Pending**: create $499 price in Stripe dashboard, set `STRIPE_PRICE_PRO_COMPLIANCE` env var in Render.
- [x] **Q-031 · Add "Why GeoClear vs SmartyStreets" section to `/docs`** ✅ 2026-04-17 — 6-row table + migration guide added to docs.html; sidebar nav link added.
- [x] **Q-032 · Add tagline to `/docs` page header** ✅ 2026-04-17 — "198M US addresses. Census tract, FEMA flood zone, and timezone — one API call." added to docs intro section.
- [x] **Q-033 · Add 500 enrichment calls/mo to Builder tier** ✅ 2026-04-17 — `enrichment_monthly_limit: 500` in TIERS, `checkEnrichmentQuota()` method in KeyStore, quota check wired into `/api/enrich`. Files: `keys.js`, `web-server.js`.
- [x] **Q-034 · Fix activation funnel** ✅ 2026-04-17 — 30-second curl added to Day 1 welcome email (`keyEmail()`); 80% daily quota warning header (`X-Quota-Warning`) in auth middleware. Files: `web-server.js`.
- [ ] **Q-035 · Scale winning channel** — if outreach: batch 3 (30 targets) + testimonial request from first customer. If RapidAPI/HN: 2 more SEO pages + submit to developer newsletters (TLDR, Bytes.dev).
- [ ] **Q-036 · LinkedIn founder post — "one call" developer angle** — curl example returning `flood_zone` + `census_tract` + `timezone` + `residential`. "Free tier. No credit card." Cross-post to dev.to + r/webdev.
- [ ] **Q-037 · "Why GeoClear" SEO content plan** — 10 target keywords from GSC data; map to pages/posts; schedule 1 post/week for 8 weeks.

### Day 60 Checkpoint

- [ ] **Q-038 · [Day 60] $2,500 MRR check + first monthly strategic review** — MRR, NRR, ECPC (North Star), CAC by channel, activation rate, cohort retention. Schedule breakeven review. Next strategy session at this point.

---

## PHASE 3 — Days 60–90: Execute to PMF Signal
> Target: $5,000 MRR, NRR > 100%, ECPC growing week-over-week.

- [x] **Q-039 · Create Bulk Credits Pack in Stripe** ✅ 2026-04-17 — `prod_ULmPbW3DgGenEh` (1M/$199) + `prod_ULmPjIOpbCdElY` (5M/$799). `POST /v1/checkout/bulk` endpoint. `buyBulk()` wired in bulk.html. `STRIPE_PRICE_BULK_1M` + `STRIPE_PRICE_BULK_5M` env vars added to Render.
- [x] **Q-040 · Build `/bulk` landing page** ✅ 2026-04-17 — `public/bulk.html` + `/bulk` route. Drag-drop CSV upload zone, 3-step how-it-works, input/output column table, pricing grid (free/$199 1M/$799 5M), FAQ, signup modal. Wired to `POST /api/address/csv`. Bulk credits `buyBulk()` stub ready — needs Stripe price IDs from dashboard.
- [ ] **Q-041 · Compliance outreach batch 3 (30 targets)** — apply learnings from batches 1 + 2.
- [ ] **Q-042 · G2 listing** — Category: "Address Verification Software". Content in `AddressAPIBusinessGTM.md`. Keywords: "bulk address validation", "CRM data quality".
- [ ] **Q-043 · Capterra listing** — same content as G2. Category: "Address Verification".
- [ ] **Q-044 · Begin CASS certification research** — USPS application requirements, engineering estimate, timeline. Add to T3 with start date. The 3–6 month process means starting late is costly.
- [ ] **Q-045 · Set Crunchbase + Google alerts** — Crunchbase: "address verification" + "geocoding" + "property data" funding rounds. Google alerts: "Lob address enrichment", "Google Maps census tract", "SmartyStreets flood zone".
- [ ] **Q-046 · Monthly check: SmartyStreets pricing page** — watch for flood zone or census tract appearing at any tier. If yes: reassess Pro tier pricing and GTM messaging immediately.

### Day 90 Checkpoint

- [ ] **Q-047 · [Day 90] Full assessment** — (1) $5K MRR? (2) ECPC growing week-over-week? (3) Which ICP converted most reliably? (4) Anyone churn — if yes, exit interview. (5) NRR > 100%? Schedule next 90-day plan.

---

## PRODUCT BACKLOG — Revenue-Blocking (do after first paying customer)

- [x] **Q-048 · CSV upload → enriched CSV download** ✅ 2026-04-17 — `POST /api/address/csv` (text/csv, max 5K rows, 10MB). Auto-detects columns. Returns: geo_verified, nad_uuid, confidence, residential, fips, timezone, coverage, match_type. RFC 4180 inline. **Pending**: portal drag-drop UI + pro-tier external enrichment (flood_zone, census_tract).
- [x] **Q-049 · Add metered cost calculator to pricing slider** ✅ 2026-04-17 — Shows "Pay-as-you-go equivalent: $X/mo — saves Y%" for Builder/Professional/Scale positions. File: `public/landing.html`
- [x] **Q-050 · Usage dashboard for customers** ✅ 2026-04-17 — `GET /v1/me` returns `usage_history` (per-day counts, 30d default). Portal renders 30-day sparkline bar chart. Files: `keys.js`, `web-server.js`, `public/portal.html`
- [ ] **Q-051 · FCC broadband tier by address** — $42B BEAD program demand. Enrichment field addition.
- [ ] **Q-052 · Address standardization** — normalize to USPS format.
- [ ] **Q-053 · Bulk async + webhooks** — for 10M+ record jobs (current bulk is sync, max 1K).

---

## ENGINEERING INFRASTRUCTURE

- [ ] **Q-054 · Comprehensive Testing Framework** — BDS `/dev-test` (10-layer). No test runner installed yet (`package.json` has no `test` script, no mocha/jest/autocannon). `tests/TC-REGISTRY.md` and `tests/BUG-REGISTRY.md` scaffolded but empty. Full implementation spec below.

  **Framework:** Node.js + Mocha (unit/integration/API/security/data) + Playwright (E2E + visual) + autocannon (performance). All 10 BDS layers applied to GeoClear's actual modules.

  **Install:**
  ```bash
  npm install --save-dev mocha chai supertest autocannon
  npx playwright install chromium
  ```
  Add to `package.json`:
  ```json
  "scripts": {
    "test":      "mocha 'tests/**/*.test.js' --timeout 10000",
    "test:unit": "mocha 'tests/unit/**/*.test.js'",
    "test:api":  "mocha 'tests/api/**/*.test.js' --timeout 15000",
    "test:sec":  "mocha 'tests/security/**/*.test.js'",
    "test:data": "mocha 'tests/data/**/*.test.js'",
    "test:perf": "node tests/perf/run.js",
    "test:e2e":  "npx playwright test"
  }
  ```

  **Layer 1 — Unit (TC-UNIT-XXXX)** | File: `tests/unit/`
  Target modules and functions to test in isolation (no DB, no network, no filesystem):
  - `enrich.js` — `enrich(lat, lon)`: null inputs, non-US coords, timeout simulation, cache hit/miss
  - `keys.js` / `KeyStore` — `generate()`, `validate()`, `recordUsage()`, `checkEnrichmentQuota()`, tier limit enforcement, key hashing round-trip (hash → validate → match), `updateDataSource()` field whitelist
  - `query.js` / `NADQuery` — `parseAddress()` input sanitization, confidence score calculation at each placement tier (Rooftop=100, Parcel=85, Street=70, Interpolation=50, Unknown=30), anomaly flag deduction logic, `displayCity()` post_city vs inc_muni preference
  - `geocode.js` — `enrichPoint()` response shape validation, FEMA flood zone parsing (all 15 zone codes), SFHA derivation logic
  - `risk-data.js` — `RiskData`: county FIPS lookup, WHP class normalization (1–5 → Very Low–Very High), storm score calculation

  **Layer 2 — Integration (TC-INT-XXXX)** | File: `tests/integration/`
  Tests against real `data/dev.db` (572MB, 20K addresses/state). Set `NAD_DB=data/dev.db`.
  - `KeyStore._init()`: table + seed runs idempotently (run `_init()` twice, no duplicate rows, no error)
  - `data_sources` seed: all 9 rows present, `status` correct (calfire_fhsz=blocked, openaddresses=planned, 7 active)
  - `KeyStore.generate()` + `validate()` round-trip: generate key → hash stored → validate raw key → returns correct tier
  - `KeyStore.checkEnrichmentQuota()`: free tier at 0 calls → allowed; free tier at 500 calls → blocked; professional tier → always allowed
  - `NADQuery`: basic address lookup against dev.db returns `nad_uuid`, `confidence` ≥ 0, `state` matches input
  - `address_signals` upsert: first call creates row with `query_count=1`; second call increments to 2; no duplicate rows
  - `updateDataSource()`: updates `last_sourced_at` → verify persisted; reject unknown field → no-op

  **Layer 3 — System (TC-SYS-XXXX)** | File: `tests/api/` (inline with API tests, using supertest)
  Full request path through Express middleware:
  - Auth middleware chain: unauthenticated → 401 before any DB query
  - Rate limit middleware: 60 req/min limit enforced; 61st request → 429
  - Admin auth: missing `X-Admin-Secret` → 401; wrong secret → 401; correct secret → passes
  - Error propagation: DB unavailable → 503, not 500 with stack trace leaked

  **Layer 4 — API Contract (TC-API-XXXX)** | File: `tests/api/`
  Every endpoint, verified with supertest against `NAD_DB=data/dev.db` server:

  | Endpoint | TC IDs | Key assertions |
  |----------|--------|---------------|
  | `GET /api/health` | TC-API-0001–0003 | 200, `{"status":"ok","db":"connected"}`, no X-Api-Key required |
  | `GET /api/address` | TC-API-0010–0025 | valid key+address → 200 + `nad_uuid` + `confidence`; missing street → 400; no key → 401; wrong key → 401; quota exceeded → 429 |
  | `GET /api/suggest` | TC-API-0030–0035 | returns array, each item has `display`, `nad_uuid`; empty query → 400 |
  | `GET /api/near` | TC-API-0040–0045 | valid lat/lon → array with `distance_m`; missing lat → 400; `radius` > 50000 → 400 or clamped |
  | `GET /api/enrich` | TC-API-0050–0060 | Professional key → 200 + `flood_zone` + `census_tract`; free key → 402; missing lat/lon → 400; quota exhaustion → 429 |
  | `GET /v1/risk` | TC-API-0070–0080 | Professional key → 200 + 4 scores (0–1); free key → 402; invalid address → 404 |
  | `GET /v1/me` | TC-API-0090–0092 | valid key → tier + usage + limits; no key → 401 |
  | `GET /v1/admin/keys/stats` | TC-API-0100–0103 | correct secret → 200; no secret → 401 |
  | `GET /v1/admin/analytics` | TC-API-0110–0113 | `?days=30` → `requests_by_day` array length ≤ 30; `?days=0` → 400 or clamped |
  | `GET /v1/admin/data-sources` | TC-API-0120–0124 | 9 sources returned; `?status=blocked` → 1 result (calfire_fhsz); `?status=planned` → 1 result (openaddresses) |
  | `PATCH /v1/admin/data-sources/:id` | TC-API-0125–0128 | valid fields update + returns `updated:true`; unknown source_id → `updated:false`; disallowed field → ignored |
  | `POST /v1/keys` | TC-API-0130–0135 | valid email → key issued + email format correct; missing email → 400 |
  | `GET /api/states` | TC-API-0140–0142 | returns array of states with `code`, `address_count` > 0 |
  | `GET /v1/admin/signals` | TC-API-0150–0152 | returns `total_addresses_tracked`, `total_query_hits`, `top` array |

  **Layer 5 — E2E (TC-E2E-XXXX)** | File: `tests/e2e/` (Playwright)
  Complete user journeys covering critical revenue paths:
  - TC-E2E-0001: Free signup flow — `GET /` → landing page loads → `POST /v1/keys` → email contains API key → `GET /api/address` with key → 200
  - TC-E2E-0002: Quota enforcement — generate free key → exhaust 10K daily limit → next request → 429 → response body contains upgrade CTA
  - TC-E2E-0003: Portal — `GET /portal.html` → key input → submit → tier/usage displays correctly
  - TC-E2E-0004: Compliance page — `GET /compliance` → 200 → live demo widget returns `flood_zone` for test address

  **Layer 6 — Visual Regression (TC-VIS-XXXX)** | File: `tests/e2e/` (Playwright screenshots)
  Baseline screenshots of all public pages at 1280px, 768px, 375px. Run on every UI change:
  - TC-VIS-0001–0003: `landing.html` — desktop/tablet/mobile
  - TC-VIS-0004–0006: `compliance.html` — desktop/tablet/mobile
  - TC-VIS-0007–0009: `docs.html` — desktop/tablet/mobile
  - TC-VIS-0010–0012: `portal.html` — desktop/tablet/mobile
  Setup: `npx playwright test --update-snapshots` once to create baselines. Store in `tests/e2e/snapshots/`.

  **Layer 7 — Performance (TC-PERF-XXXX)** | File: `tests/perf/run.js` (autocannon)
  SLAs (GeoClear-specific — override BDS defaults for enrichment endpoints):

  | Endpoint | p50 | p95 | p99 | throughput |
  |----------|-----|-----|-----|------------|
  | `GET /api/health` | <5ms | <20ms | <50ms | >500 req/s |
  | `GET /api/address` (dev.db) | <50ms | <200ms | <500ms | >50 req/s |
  | `GET /api/enrich` (cached FEMA/Census) | <150ms | <500ms | <1500ms | >20 req/s |
  | `GET /v1/risk` (risk.db cached) | <30ms | <100ms | <300ms | >50 req/s |

  Run: `node tests/perf/run.js` — autocannon 50 connections, 30 seconds, report p50/p95/p99.
  Memory leak check: send 10K requests → `process.memoryUsage()` before vs after < 5% growth.

  **Layer 8 — Security (TC-SEC-XXXX)** | File: `tests/security/`
  ```bash
  # TC-SEC-0001: no key → 401
  # TC-SEC-0002: invalid key → 401 (not 403 or 500)
  # TC-SEC-0003: SQL injection in street param → no DB error leaked, no unexpected rows
  # TC-SEC-0004: XSS in street param → response is JSON, not HTML with script tag
  # TC-SEC-0005: oversized payload (100KB GET param) → 400 or 414, not crash
  # TC-SEC-0006: CORS — Origin: evil.com → no ACAO: * on /v1/* endpoints
  # TC-SEC-0007: admin endpoints without secret → 401
  # TC-SEC-0008: rate limit — 61 req/min → 429 with Retry-After header
  # TC-SEC-0009: Stripe webhook without signature → 400 (not 200)
  # TC-SEC-0010: key in URL param (not header) — should NOT work (keys only via X-Api-Key header)
  # TC-SEC-0011: plaintext key not stored in DB (verify key column = 24-char prefix only)
  # TC-SEC-0012: admin secret via header only — not querystring
  ```

  **Layer 9 — Data Integrity (TC-DATA-XXXX)** | File: `tests/data/`
  Run against `data/dev.db`:
  - TC-DATA-0001: `addresses` table has ≥ 18,000 rows (dev.db has 20K/state × ≥1 state)
  - TC-DATA-0002: All addresses with `placement='Rooftop'` have non-null `latitude` and `longitude`
  - TC-DATA-0003: No addresses where `state IS NULL AND state_id IS NOT NULL`
  - TC-DATA-0004: `api_keys` — `key_hash` IS NOT NULL for all rows (no plaintext keys)
  - TC-DATA-0005: `data_sources` — all 9 seed rows present; `calfire_fhsz` status = 'blocked'
  - TC-DATA-0006: `usage_log` FK integrity — no `key_id` referencing a non-existent `api_keys.id`
  - TC-DATA-0007: All 16 expected indexes present on `addresses` table (`EXPLAIN QUERY PLAN` for address lookup uses index)
  - TC-DATA-0008: `KeyStore._init()` idempotent — run 3× on same DB, no errors, no duplicate rows in `data_sources`

  **Layer 10 — Pipeline (TC-PIPE-XXXX)**
  - TC-PIPE-0001: `curl https://geoclear.io/api/health` → 200, `db:connected`, latency < 2s
  - TC-PIPE-0002: `curl https://geoclear-staging.onrender.com/api/health` → 200 (when staging deployed)
  - TC-PIPE-0003: `git push main` → Render deploy log shows `node web-server.js` started, no crash
  - TC-PIPE-0004: Post-deploy address lookup returns known address (1600 Pennsylvania Ave DC) with `confidence ≥ 85`

  **Directory structure to create:**
  ```
  tests/
  ├── TC-REGISTRY.md          ← exists (empty)
  ├── BUG-REGISTRY.md         ← exists (empty)
  ├── unit/
  │   ├── enrich.test.js
  │   ├── keys.test.js
  │   ├── query.test.js
  │   └── geocode.test.js
  ├── integration/
  │   ├── keystore.test.js
  │   ├── data-sources.test.js
  │   └── address-query.test.js
  ├── api/
  │   ├── address.test.js
  │   ├── enrich.test.js
  │   ├── risk.test.js
  │   ├── admin.test.js
  │   └── auth.test.js
  ├── security/
  │   └── security.test.js
  ├── data/
  │   └── integrity.test.js
  ├── perf/
  │   └── run.js
  └── e2e/
      ├── signup-flow.test.js
      ├── quota-enforcement.test.js
      └── snapshots/         ← Playwright baselines (git-committed)
  ```

  **BDS framework reference:** `/dev-test` skill at `~/.claude/skills/dev-test.md`
  **Owner:** engineering. Run `/dev-test` to execute the full framework on any session.
  **Gate rule:** No feature is complete without all applicable layers green. Security + data integrity layers mandatory on every deploy.

- [x] **Q-055 · Data Catalog** ✅ 2026-04-17 — `docs/DATA-CATALOG.md` created. Comprehensive inventory of all 9 data sources (NAD, Overture, Census, FEMA, USGS, USFS WHP, NOAA Storm, CAL FIRE FHSZ, OpenAddresses). Each entry covers: publisher, license, role, coverage, last sourced, next refresh date, cadence, API endpoint, pipeline, all attributes extracted, use cases powered. Includes refresh calendar (2026-07-15 NAD, 2026-10-01 USFS, 2027-03-01 NOAA). Update this file whenever a source is added or refreshed.

---

## T0 — DATA & CORE STATUS

✅ Complete: NAD r22 (120M), Overture full gap-fill (64.9M), total 198,657,537 addresses, all 16 indexes live (2026-04-16).

✅ FK relink + count refresh complete (2026-04-17):
- 180.3M rows fully linked (state_id → county_id → city_id → zip_code_id)
- 18.3M rows permanently unlinked (Overture rows imported with state=NULL — no state field in source data, cannot relink)
- All major states now show correct counts on /api/states (FL: 41.7M, CA: 15M, MI: 9.5M, NJ: 10M, NV: 2.3M, NH: 870K)
- New endpoints: POST /v1/admin/relink-fks (idempotent), POST /v1/admin/refresh-counts

Open:
- [ ] **Q-056 · Fill remaining state gaps — AL, AK** (not in Overture — need state GIS portals)
- [ ] **Q-057 · NAD r23 quarterly update (~June 2026)** — run on staging, merge to prod

---

## DATA STRATEGY — Additional Sources & Platform Capabilities

> **Context:** These items cover (1) additional data sources that extend GeoClear's addressable use cases and competitive moat, and (2) platform architecture decisions that determine whether GeoClear stays an enrichment API or becomes the authoritative geospatial intelligence layer for American commerce. Think at Sundar/Zuck/Elon scale: Google built Maps as a platform layer everything else runs on. That's the model here — not "more enrichment fields" but "the ground truth that every proptech, insurtech, and fintech must connect to."

### A. Additional Data Sources — Prioritized by Revenue Impact

> Add each to `docs/DATA-CATALOG.md` when imported. Update `data_sources` table in `keys.db` via `PATCH /v1/admin/data-sources/:source_id`.

#### Tier 1 — Ship by $10K MRR (high ROI, all free federal sources)

- [ ] **Q-058 · Census ACS Vacancy + Demographics by tract** — US Census American Community Survey. Vacancy rate, median income, population density, age distribution by census tract. Free. Import: `census-acs-import.js`. Unlocks: vacancy dimension of `/v1/risk` (currently placeholder), lending redlining detection, real estate demand signals. Already have the census tract from TIGER — this is the payload that makes it valuable. Source: `data.census.gov` (B25002 Occupancy Status, B19013 Median Income, B01003 Population). ~74,000 tracts. Cadence: annual (5-year ACS).
- [ ] **Q-059 · EPA EJScreen — Environmental Justice Screening** — EPA's environmental justice index by census block group. 11 environmental indicators: air toxics, proximity to Superfund sites, RMP facilities, wastewater discharge, lead paint, traffic, ozone, PM2.5, diesel PM, underground storage tanks, proximity to hazardous waste. Free. Source: `https://ejscreen.epa.gov/mapper/ejscreenRESTbroker.aspx`. Live API (lat/lon → block group → EJ scores). Unlocks: environmental risk dimension on `/v1/risk`, ESG/impact investing use case, environmental due diligence for lenders. Target customer: climate-focused lenders, ESG funds, insurance underwriters.
- [ ] **Q-060 · USPS No-Stat / Delivery Statistics (CASS-adjacent)** — USPS publishes No-Stat address counts by ZIP+carrier route. No-Stat = addresses that don't receive regular delivery (vacant, seasonal, under construction). Free public data. Source: USPS Address Management System public release. Unlocks: vacancy dimension in `/v1/risk` with real data instead of heuristic. Note: full CASS certification (3–6 months, $$$) needed for `/v1/address` to return CASS-standardized output — track separately.
- [ ] **Q-061 · USGS National Hydrography Dataset (NHD)** — Rivers, streams, lakes, reservoirs, coastline. Distance to nearest waterbody by lat/lon. Free. Source: `https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer`. Unlocks: flood risk context (proximity to water + FEMA zone = much stronger flood signal), waterfront property premium detection. 1M+ features.
- [ ] **Q-062 · HUD Fair Market Rents + Housing Choice Voucher zones** — HUD publishes FMR by ZIP and metro area annually. Also: Opportunity Zones (QCT + DDA designations) by census tract. Free. Source: `https://www.huduser.gov/portal/datasets/fmr.html`. Unlocks: rental market intelligence, affordable housing compliance, LIHTC eligibility for lenders.
- [ ] **Q-063 · Overture Maps Places (POIs)** — Same Overture data source we already use for addresses, but the `places` theme. 59M+ global POIs (restaurants, banks, hospitals, schools, stores) with name, category, brand, hours, website. Free (CDLA 2.0). Source: `s3://overturemaps-us-west-2/release/.../theme=places`. Unlocks: commercial density score per address, neighborhood character detection, retail accessibility index. The Overture S3 pipeline is already built — this is a schema extension, not a new pipeline.
- [ ] **Q-064 · FEMA Disaster Declarations** — FEMA declares major disasters by county. Historical record going back to 1953. Free. Source: `https://www.fema.gov/api/open/v2/disasterDeclarations`. Import to `risk.db`. Unlocks: long-term disaster frequency per county beyond NOAA storm events — includes earthquakes, droughts, ice storms, etc. that NOAA misses.

**[Cat 5 — Satellite & Sensor]**
- [ ] **Q-065 · USGS 3DEP — 3D Elevation Program** — USGS lidar-derived elevation above sea level per lat/lon. 1m resolution where lidar exists; 10m national baseline. Free. Source: `https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer` (ArcGIS REST, live). Live API call — no import needed; cache results keyed by lat/lon bounding box. Unlocks: elevation-adjusted flood depth estimation (elevation + FEMA zone = much stronger flood signal than zone alone), terrain classification, hillshade + slope derived products. Directly improves disaster score accuracy in `/v1/risk`. Coverage: CONUS + AK + HI + PR. Cadence: continuous as new lidar surveys complete.
- [ ] **Q-066 · NLCD — National Land Cover Database** — USGS/MRLC 30m raster covering 20+ land cover classes (developed open/low/medium/high intensity, forest, cropland, wetland, barren, water). Free (public domain). Source: `https://www.mrlc.gov/data` download + WCS service. Pipeline: staging shell → download annual GeoTIFF → aggregate to census tract (dominant class + impervious surface %) → import to `risk.db`. Unlocks: land use classification per address (urban/suburban/rural/agricultural), impervious surface % (flood runoff proxy), wildfire-urban interface (WUI) detection. Complements NLCS wildfire data already in `risk.db`. Updated annually (NLCD 2021 current; 2022 expected mid-2026).

**[Cat 6 — Specialized / Domain-Specific]**
- [ ] **Q-067 · USGS GNIS — Geographic Names Information System** — Official US place name gazetteer. 2M+ named features with official names, variant names, and historical spellings. Free (public domain). Source: `https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer` (live ArcGIS REST, JSON/GeoJSON). Unlocks: place name disambiguation for `/api/address` and `/api/suggest` (post_city vs inc_muni vs common name conflicts), authoritative neighborhood name enrichment, "is this a real place?" validation layer. Query by name or coordinates; cache results. Continuously updated by the Board on Geographic Names.
- [ ] **Q-068 · NCES School District Boundaries** — National Center for Education Statistics official K-12 district boundaries, updated annually. Free (public domain). Source: `https://nces.ed.gov/programs/edge/Geographic/DistrictBoundaries` (ArcGIS REST + shapefile). Point-in-polygon lookup against district polygons → return `school_district` field on `/api/address` + `/api/enrich`. Build spatial index on staging; store district LEAID + name per census tract. Unlocks: top homebuyer signal (school district is the #1 question for residential real estate ICPs). Fields: LEAID, district name, district type (unified/elementary/secondary), state FIPS.

#### Tier 2 — Ship by $50K MRR (require more pipeline work or cost/legal review)

- [ ] **Q-069 · County Parcel / Cadastral Data (REGRID or county GIS portals)** — Property boundaries, ownership, assessed value, land use code, year built, building sq ft, lot size, zoning. This is the **single highest-value dataset GeoClear doesn't have**. Makes every address a financial and physical asset record. Sources: (a) free from county GIS portals (~3,100 counties — painful); (b) REGRID ($$$, covers 98% of US parcels, API); (c) Microsoft USBuildingFootprints partially overlaps. Unlocks: property intelligence endpoint `/v1/property`, lending AVM input, real estate comp analysis, insurance replacement cost estimation. Note: REGRID likely $20K+/year — evaluate after $25K MRR.
- [ ] **Q-070 · First Street Foundation — Climate Risk (Foundation API)** — Parcel-level flood, fire, heat, drought, wind risk with 30-year projections. The only source with climate-forward risk (FEMA NFHL is historical, First Street is predictive). Commercial API ($$$). Unlocks: climate risk score addition to `/v1/risk`, forward-looking insurance underwriting. Evaluate after $25K MRR. Direct competitor to our disaster score but ~10× more granular.
- [ ] **Q-071 · ATTOM / CoreLogic Property Data** — Commercial data provider. Ownership history, sales history, deed transfers, liens, foreclosures, MLS history. Expensive ($25K–$100K+/year). Unlocks: complete property intelligence layer. Evaluate after $50K MRR or enterprise contract.
- [ ] **Q-072 · FCC Broadband Coverage Map** — FCC published new fabric-based broadband map in 2023 (545M locations). Free. Source: `broadbandmap.fcc.gov`. Unlocks: broadband tier by address (BEAD program demand, $42B addressable). ISP-level coverage data.
- [ ] **Q-073 · Bureau of Transportation Statistics (BTS) — National Transit Map** — Transit stops, routes, frequency by lat/lon. Free. Source: NTD + GTFS feeds. Unlocks: walkability/transit accessibility score, urban vs suburban classification refinement.
- [ ] **Q-074 · USGS Earthquake Hazard (NSHM)** — National Seismic Hazard Model. Peak ground acceleration (PGA) probability by lat/lon. Free. Source: `https://earthquake.usgs.gov/hazards/hazmaps/`. Unlocks: seismic risk dimension on `/v1/risk`. Especially valuable for CA, WA, OR, AK, NM — states with significant quake exposure.
- [ ] **Q-075 · OpenStreetMap Buildings + Land Use** — Building outlines, roof types, land use (residential/commercial/industrial/park). Free (ODbL — same license issue as OpenAddresses, needs legal review). 70M+ US building outlines. Unlocks: building density per block, land use classification, green space proximity. Better coverage than Microsoft footprints in dense urban areas.

**[Cat 5 — Satellite & Sensor]**
- [ ] **Q-076 · Copernicus Land Cover (Sentinel-2 derived)** — EU Copernicus programme 10m global land cover raster, 11 classes. Free and open (Copernicus open data licence). Source: `https://download.dataspace.copernicus.eu/odata/v1/` (OData API) or Sentinel Hub. Primarily relevant for international expansion (Canada, UK) — for US, NLCD (Q-066) is superior. Import only when Canada/UK expansion begins (see T3 Moat international entries). No action until international is on the roadmap.

**[Cat 6 — Specialized / Domain-Specific]**
- [ ] **Q-077 · Walk Score API** — Walkability, transit, and bike scores per address. Commercial freemium (Walk Score LLC). Free tier for low volume; production pricing requires sales contact (estimated $0.01–0.05/lookup). Source: `https://api.walkscore.com/score` (live REST, lat/lon → scores + nearby amenities). No import needed — live API call per address. Unlocks: lifestyle/amenity scoring on `/api/enrich`, strong signal for residential real estate ICPs. Evaluate pricing against customer value at $10K MRR before enabling.
- [ ] **Q-078 · Congressional District Boundaries (TIGER/Census)** — Official US House district boundaries, all 435 districts. Free (public domain). Source: `https://www.census.gov/geographies/mapping-files/2023/geo/tiger-line-file.html` (shapefile + GeoJSON). Download → build spatial index → point-in-polygon per address → return `congressional_district` field on `/api/address`. Also: state legislative upper/lower chamber districts (same TIGER source). Update cadence: decennial (next after 2030 census); interim redistricting files issued as needed. Low pipeline complexity — spatial join only.
- [ ] **Q-079 · StreetLight Data — Mobility Intelligence** — GPS and cellular-derived traffic volumes, origin-destination flows, and vehicle counts by road segment. Commercial (StreetLight Data Inc.); no public pricing — requires sales engagement; estimated $20K+/yr. Coverage: 5M+ miles of North American roadway, 25M+ road segments. Source: proprietary API + bulk file delivery. Unlocks: commercial viability signals per address (foot traffic to nearby businesses), trip origin-destination for logistics customers, vehicle classification by segment. Evaluate after $50K MRR.

#### Tier 3 — Platform Scale (after $100K MRR or strategic partnership)

- [ ] **Q-080 · NASA/NOAA Climate Projections (CMIP6)** — 30-year temperature, precipitation, sea level projections by grid cell. Free. Source: NASA SEDAC. Unlocks: long-horizon climate risk for insurance/lending. Requires building a raster lookup layer.
- [ ] **Q-081 · Zoning Data (aggregated)** — Municipal zoning codes: residential, commercial, industrial, agricultural, mixed-use. No national source exists — requires aggregating ~20,000 municipalities. Options: (a) build scraper; (b) ZoningPoint ($$$); (c) Regrid includes some zoning data. Unlocks: development potential, land use compliance, ADU eligibility detection. Enormous real estate value.
- [ ] **Q-082 · SafeGraph / Foursquare Places (mobility + POI)** — Foot traffic, visit patterns, POI data. Commercial. Unlocks: economic activity signals per address, retail viability scoring. Expensive but creates unique behavioral layer.
- [ ] **Q-083 · GreatSchools Ratings API** — Commercial school quality ratings (1–10) per district and individual school. Source: `greatschools.org/gsr/api/`. Requires license agreement. Complements NCES free boundaries (Q-068) with the quality signal homebuyers actually want. Evaluate after $25K MRR.

**[Cat 5 — Satellite & Sensor]**
- [ ] **Q-084 · Landsat / NASA Earth Observations (historical change detection)** — USGS Landsat archive via AWS Open Data (`s3://usgs-landsat/`). 30m multispectral imagery, 40+ years of history. Free. Source: `https://earthexplorer.usgs.gov/` or AWS S3. Not a per-address live API — requires raster processing pipeline. Relevant only if GeoClear adds temporal enrichment ("how has land use at this address changed over 20 years?"). Defer until temporal enrichment is on roadmap. Combined with NLCD (Q-066), Landsat is the raw source from which NLCD is derived — NLCD is the correct choice for current needs.

**[Cat 6 — Specialized / Domain-Specific: Gap Items]**
- [ ] **Q-085 · NGA GeoNames Server (GNS)** — National Geospatial-Intelligence Agency global place name gazetteer. 8M+ features, 13M+ names across 195 countries, updated daily. Free (public domain). Source: `https://geonames.nga.mil/geonames/GNSData/` (bulk download by country, tab-delimited). For US coverage, USGS GNIS (Q-067) is superior. GNS becomes relevant at international expansion (Canada, UK) — activate when T3 Moat international items are prioritised.
- [ ] **Q-086 · Carrier / Telecom GPS Mobility (aggregated behavioral data)** — Carrier-derived location signals via data brokers: Veraset (`veraset.com`), Outlogic/X-Mode (subject to FTC settlement Jan 2024 — restricted sensitive location use), or direct telecom partnerships. Behavioral dwell time, visit frequency, origin-destination patterns per address. Commercial ($50K+/yr); requires enterprise agreement and legal review. Unlocks: strongest behavioral ground truth for fraud scoring — real foot traffic patterns vs. claimed address residency; anomaly detection (address claimed as residential but shows zero dwell time). Legal review required before any integration: CPRA, TCPA, FCC data broker rules (2025 effective). Evaluate only after $100K MRR and with legal counsel.

---

### B. Platform Capability Decisions

> These are architectural choices that determine whether GeoClear becomes a data platform or stays an enrichment endpoint. Decide each explicitly — not deciding is deciding.

- [ ] **Q-087 · [DECISION NEEDED] GeoServer / OGC Standards layer** — GeoServer exposes data via WFS, WMS, WCS (OGC standards). Enterprise GIS customers (government, utilities, large insurers) expect OGC-compliant APIs — they often can't integrate REST JSON-only APIs into their ArcGIS/QGIS workflows. **Recommendation:** Yes, but after $50K MRR. Adds significant integration surface area. File a DECISIONS.md entry when this decision is made. Reference: `geoserver.org`.
- [ ] **Q-088 · [DECISION NEEDED] GeoPlatform.gov integration** — Federal data gateway providing programmatic access to authoritative US geospatial datasets via standards-based APIs. High-value for federal contracts and government customers. **Recommendation:** Yes — integrate as a data source aggregator (replace some of our individual agency API calls with GeoPlatform endpoints). Low risk, no cost. Review `geoapi.geoplatform.gov` API when building Tier 1 sources above. Adopt FAIR principles (Findable, Accessible, Interoperable, Reusable) as design constraints on `/v1/enrich` response schema.
- [ ] **Q-089 · [SKIP] STAC (SpatioTemporal Asset Catalog)** — Standard for discovering satellite imagery and temporal raster datasets. Not applicable to address intelligence in current form. Only relevant if we add historical/temporal address data. **Decision: skip until temporal enrichment is on roadmap.** Revisit at $100K MRR.
- [ ] **Q-090 · [SKIP] Tiling / Tilegarden** — Serverless map tile rendering. Only needed if we build a map visualization product. We are an API; our customers build maps. **Decision: skip entirely.** If customers need tiles, recommend MapTiler or Mapbox as complementary tools.
- [ ] **Q-091 · [DECISION NEEDED] Knowledge Graph / RDF layer** — Representing addresses as semantic nodes linked to risk factors, census data, zoning, parcel ownership via RDF triples and SPARQL queries. This is the "Google Knowledge Graph for addresses" play. High complexity, high moat. **Recommendation:** Design for it — use `nad_uuid` as a stable URI for every address now, which makes a future RDF layer trivially buildable. Actual RDF exposure: defer until $100K MRR. Reference: `kb.geoplatform.gov/knowledge-graphs/rdf-data.html`.
- [ ] **Q-092 · [ACTION] Adopt `nad_uuid` as canonical address URI** — Currently `nad_uuid` is used internally. Expose it as a stable, permanent address identifier in all API responses (`"id": "NAD:us-{nad_uuid}"`). This is the foundation for: (a) knowledge graph, (b) OGC feature IDs, (c) customer-side stable references across API calls. No data change — just schema/response change. File as a feature ticket.

---

### C. Competitive Intelligence Watch List

- [ ] **Q-093 · Monthly: check if SmartyStreets adds flood zone or census tract** — If yes: reassess Pro tier pricing and GTM messaging immediately.
- [ ] **Q-094 · Quarterly: review Overture Maps new themes** — Overture is adding buildings, transportation, base maps. Any new theme that overlaps our roadmap: evaluate import.
- [ ] **Q-095 · Quarterly: check Google Maps Platform pricing** — Google has census tract in Places API. If they bundle it into a cheaper tier, our compliance moat narrows. Watch closely.
- [ ] **Q-096 · Crunchbase alerts** — "address verification" + "property data" + "climate risk" funding rounds. Funded competitors = new entrants with resources.

---

## T2 — DIFFERENTIATION (after $10K MRR)

### Strategic Intelligence Layer
> Outcome: GeoClear becomes the ground-truth layer of American commerce, not just an address lookup.

> ⚠️ **STAGING-FIRST RULE — applies to every data import below.**
> All heavy data processing runs on Render staging (`srv-d7f6rh58nd3s73cve8dg`, 100GB disk), never locally and never directly on prod.
> Pipeline for every import: **Staging Render Shell → verify row counts on staging → `POST /v1/admin/upload-chunk` (chunked) → `POST /v1/admin/merge` on prod → verify via `GET /api/stats`.**
> Never rsync directly to prod. Never run large downloads on your Mac. See CLAUDE.md § Staging-First for the full rule.

- [x] **Q-097 · Ground-Truth Graph (internal)** ✅ 2026-04-17 — `address_signals` table in `keys.db` (NOT nad.db — zero migration on 91GB table). Schema: `nad_uuid PK, query_count, last_queried_at, fraud_signal_count`. Fire-and-forget upsert via `setImmediate` after every `/api/address` hit. `recordAddressQuery()` + `recordFraudSignal()` + `getTopQueriedAddresses()` in KeyStore. Admin endpoint: `GET /v1/admin/signals`. Starts compounding behavioral data immediately.
- [x] **Q-098 · Risk Score v1 — `/v1/risk` endpoint** ✅ 2026-04-17 — `GET /v1/risk` (Professional+). Resolves address by nad_uuid / street+city+state / lat+lon. Returns 4 scores (0–1): deliverability (confidence+placement+query_count), fraud (fraud_signal_count+velocity), disaster (live FEMA NFHL), vacancy (zero-query+addr_class). `data_coverage` flags show which dimensions have real data vs pending imports. File: `web-server.js`.
- [x] **Q-099 · Import USFS Wildfire Risk data** ✅ 2026-04-17 — `wildfire-import.js` rewritten to use USFS/Esri "USA Wildfire Hazard Potential" FeatureServer (layer 2 = county). 3,108 counties with WHP class (Very Low–Very High) + MEAN score. Source: `services.arcgis.com/jIL9msH9OI208GCb/.../USA_Wildfire_Hazard_Potential/FeatureServer/2`. Uploaded to prod risk.db. `/v1/risk` returns `data_coverage.wildfire: true`.
- [x] **Q-100 · Import NOAA severe weather history** ✅ 2026-04-17 — Storm data imported locally (NOAA NCEI CSV files). 3,257 counties, 338,864 storm events, 10-year window (2017–2026). Uploaded to prod `/data/risk.db` (316KB). `/v1/risk` now returns `data_coverage.storm: true` with real county storm counts. Script: `storm-import.js`.
- [x] **Q-101 · CAL FIRE FHSZ live lookup** ✅ 2026-04-17 — `cal_fire_fhsz` field on `/api/enrich`. Live polygon lookup via `egis.fire.ca.gov/arcgis/rest/services/FRAP/HHZ_ref_FHSZ/MapServer/0` (CAL FIRE's own ArcGIS server). CA only, null for non-CA. High+Very High zones: SRA_High, SRA_VeryHigh, LRA_High, LRA_VeryHigh, FRA_High, FRA_VeryHigh. No import to risk.db needed — live API call like FEMA NFHL. Requires ±100m Web Mercator envelope (service rejects point geometry).
- [ ] **Q-102 · Import Microsoft Building Footprints** — 130M US building polygons, free MIT license. **Run on staging Render Shell → verify → upload-chunk → merge to prod.** Enables: open yard area calculation (parcel - building = landing zone), roof type, building size. *Prerequisite for drone-deliverable flag. Also improves address confidence scoring.*
- [ ] **Q-103 · Integrate FAA LAANC API** — real-time airspace class + altitude ceiling per lat/lon. Free FAA DroneZone API. Response time < 100ms. *Live API call at query time — no staging data pipeline needed.*
- [ ] **Q-104 · Drone-deliverable flag — `/v1/enrich` extension** — add `drone` object to enrichment response: `{ deliverable: bool, airspace_class: "G"|"B"|"C"|"D", legal_altitude_ft: 400, estimated_open_sqm: 180, property_type: "single_family"|"multi_family"|"commercial", no_fly_zone: bool, confidence: "high"|"medium"|"low" }`. Data: FAA LAANC API + Microsoft Building Footprints + Overture parcel geometry (already have). *Target customers: Wing, Zipline, Starship, Amazon Prime Air, last-mile 3PLs. Pricing: $0.005/call add-on.*
- [ ] **Q-105 · Pricing reframe — floor to $199** — grandfather all current $49/Starter customers at their rate (contractual, never raise). All new signups: floor is $199. Update Stripe product, pricing page, portal. *Elon framing: $49 attracts hobbyists and support load. Value is in avoided loss, not per-row cost.*

### Distribution
- [ ] Q-106 · Node.js SDK (`npm install geoclear`)
- [ ] Q-107 · Python SDK (`pip install geoclear`)
- [ ] Q-108 · Zapier integration ("Verify US address" action)
- [ ] Q-109 · Shopify App
- [ ] Q-110 · WordPress / WooCommerce plugin
- [ ] Q-111 · Salesforce AppExchange listing

### Enterprise
- [ ] Q-112 · SOC 2 Type II audit — start process (takes 6–12 months); begin at $10K MRR
- [ ] Q-113 · NCOA integration (address change detection — 40M Americans move/year)
- [ ] Q-114 · Mortgage compliance bundle (HMDA + CRA + census tract + FIPS + flood in 1 call)
- [ ] Q-115 · White-label / OEM API option
- [ ] Q-116 · Data licensing tier (flat file download, $10K–$100K/yr)
- [ ] Q-117 · Render autoscaling / standby instance — only when first enterprise customer signs SLA

### Address Intelligence
- [ ] Q-118 · Address history / change log
- [ ] Q-119 · Neighborhood character score (urban/suburban/rural)

---

## T3 — MOAT (months 3–6)

- [ ] **Q-120 · Parcel boundary polygons** — county assessor data for all 3,000+ US counties. Expensive to aggregate (commercial vendors: Regrid ~$15K/yr, PreciselyData). Unlocks high-confidence drone landing zone detection and parcel-level fraud scoring. *Required for Risk Score confidence: "high" tier. Worth it after first drone company customer.*
- [ ] Q-121 · USPS CASS certification — required for $10B direct mail market; 3–6 month process; begin research Phase 3
- [ ] Q-122 · DPV — Delivery Point Validation (bundled with CASS)
- [ ] Q-123 · Automated quarterly NAD update pipeline (cron → detect → download → re-import)
- [ ] Q-124 · Address change webhook service
- [ ] Q-125 · International: Canada (Overture has CA data, 15M addresses)
- [ ] Q-126 · International: UK (Ordnance Survey open data, 32M addresses)
- [ ] Q-127 · Parcel ID / property tax linkage
- [ ] Q-128 · Mobile SDK (iOS + Android)

---

## T4 — BIG SWINGS (6–18 months)

- [x] **Q-129 · GeoClear Risk Score v2** ✅ 2026-04-17 — `POST /v1/outcomes` endpoint; `address_outcomes` table in `keys.db`; score_version v1→v2 auto-upgrade at ≥3 delivery or ≥2 fraud outcomes; inline key auth on `/v1/risk` and `/v1/outcomes`; `GET /v1/admin/outcomes`; drone delivery use case ground-truthing deliverability. Moat: no competitor can buy this dataset — earned from live traffic.
- [x] **Q-130 · Compliance page — interactive demo + FEMA legend + cost calculator** ✅ 2026-04-17 — Hero-right: live input (number/street/city/state) → real `/api/demo/enrich` response shows `flood_zone`, `flood_sfha`, `census_tract`, `county_fips`. FEMA zone legend (expandable: AE/VE/A/X/D with SFHA status). Cost calculator (slider: N lookups/mo → manual $3–15/ea vs GeoClear $249/mo + % savings). Auth bypass: `req.path.startsWith('/demo')` in API gateway. File: `public/compliance.html`, `web-server.js`.
- [x] **Q-131 · Landing page compliance callout section** ✅ 2026-04-17 — Prominent section between verticals and pricing: "HMDA, NFIP, and CRA fields. One API call. Auditable source." → links to `/compliance`. Three trust bullets + "See compliance features →" CTA. File: `public/landing.html`.
- ⏳ **Q-132 · Climate Risk Score per address** IN PROGRESS (session 26) — Phase 1 ✅: earthquake + drought in risk.db (3,221 counties each). `/api/demo/risk` live and stable (no crash loops). Landing page shows 5th Climate Risk score card. Pending: wildfire + storm tables missing from prod risk.db (only eq+drought uploaded). Need to run `wildfire-import.js` + `storm-import.js` locally against `/tmp/full-risk.db` and re-upload. Phase 2 (FEMA NRI, heat, SLR) not yet started.
- [ ] Q-133 · Physical World Graph API — address nodes connected to businesses, schools, flood zones
- [ ] Q-134 · National 911 Address Layer — partner with NENA ($10B NG911 funding)
- [ ] Q-135 · Autonomous Address Deduplication-as-a-Service (AI agent for CRM cleanup)
- [ ] Q-136 · Address Intelligence for AI Training Data licensing

---

## INFRA & DOMAIN STATUS

| Item | Status |
|------|--------|
| geoclear.io DNS | ✅ Cloudflare proxy (orange cloud), Full (strict) SSL |
| Render prod | ✅ `srv-d7ep7bfavr4c73d46gng` — auto-deploys on push |
| Render staging | ✅ `srv-d7f6rh58nd3s73cve8dg` — 100GB disk, autoDeploy OFF |
| GitHub | ✅ `sriharkaur/geoclear` |
| Cloudflare cache | ✅ `/api/stats`, `/api/states`, `/api/health` — 5min TTL |
| auduu.com | ✅ Transfer to Cloudflare initiated |
| auduu.ai | 🔒 GoDaddy, auto-renew OFF, expires 2027-02-25 |
| axiomprotocol.ai | 🔒 GoDaddy, auto-renew OFF, expires 2028-01-13 |

---

## PRICING (updated 2026-04-16)

| Tier | Display name | Price | Lookups/day | Enrichment | Notes |
|------|-------------|-------|-------------|-----------|-------|
| `free` | Free | $0 | 1,000 | No (nulled) | No credit card |
| `starter` | Builder | $49/mo | 50,000 | 500 calls/mo taste | Bridges to Professional |
| `pro` | Professional | $249/mo | 500,000 | Unlimited | Most Popular |
| `pro_compliance` | Pro Compliance | $499/mo | 500,000 | Unlimited + SLA | Claire persona |
| `scale` | Scale | $999/mo | 5,000,000 | Unlimited | Volume anchor |
| `enterprise` | Enterprise | $2,000+/mo | Unlimited | Unlimited + custom | Contact us |
| `metered` | Pay-as-you-go | per lookup | Unlimited | No | Ops Owen one-time |
| — | Bulk Credits | $199/$799 one-time | — | No | 1M / 5M credits |

> **Financial facts:** Break-even = 1 Professional customer. Gross margin ~98%. LTV Professional $4,980 / Pro Compliance $16,633.

**North Star:** $100K MRR in 12 months

---

_Reference: `FEATURES.md` (built), `RELEASES.md` (history), `AddressAPIBusinessGTM.md` (GTM playbook), `strategy/` (9 analyses)_
