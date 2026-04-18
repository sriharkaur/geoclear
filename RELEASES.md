# GeoClear — Release Notes
> Append-only. Each release gets a section. Newest at top.
> Versioning: MAJOR.MINOR.PATCH (semver)
>   MAJOR — breaking API changes
>   MINOR — new features, new endpoints
>   PATCH — bug fixes, internal changes

---

## Unreleased

- **MCP HTTP server (Phase 1)** — `POST /mcp`, `GET /mcp`, `DELETE /mcp` using `StreamableHTTPServerTransport`. 4 tools: `verify_address`, `suggest_address`, `reverse_geocode`, `get_coverage`. Auth via `X-Api-Key` header (same keys as REST API). Per-session `McpServer` factory. Connects Claude Desktop, Cursor, and any MCP-compatible agent.
- **`/mcp-docs` marketing page** — explains MCP setup with copy-ready config snippets for Claude Desktop + Cursor. Tab switcher for different clients. Lists all 4 tools. Added to nav + sitemap.
- **Coverage cache pre-warm** — `onListening()` now calls `listStatesCoverage()` via `setImmediate()` on startup when nad.db is ready, so first `/api/coverage` request is instant.
- **Starter tier restored** — $49/mo (50K lookups, 100 req/min) added back to landing.html pricing grid, feature comparison table (6-column), volume calculator, and portal.html. Canonical tier table now: Free / Starter $49 / Growth $199 / Professional $499 / Scale $999.
- **Pricing consistency pass** — Fixed all `$249/mo` references site-wide (docs.html rate-limits table, compliance.html cost calculator, portal.html plan cards, bulk.html FAQ, changelog.html). Renamed portal plans: Builder→Starter, Professional ($249)→Growth ($199), Pro Compliance→Professional ($499). Updated web-server.js Stripe tier comment + error messages.
- **Compliance page credibility fix** — `<5ms median latency` → `<5ms server-side p95` in trust strip (P2).
- **`/coverage` page** — state-by-state address count table with Census 2020 housing unit comparison, coverage %, and coverage level badges. Loads live from `/api/coverage`. Added to nav + sitemap.
- **`/api/coverage` endpoint** — returns per-state address counts, coverage level, and name. Publicly accessible, 6h cache.
- **`coverage` field enriched** — address response `coverage` is now a nested object: `{ state, address_match, staleness_days }`. `address_match` maps query match quality to `rooftop` / `parcel` / `interpolated`. `staleness_days` computed from `date_update`.
- **`growth` tier added to TIERS** — `keys.js` now has canonical tier table: free/starter/growth/pro/scale/metered/enterprise with correct quotas and prices.

- **Q-185 Migration window skeleton** — monorepo structure (`src/api/v1/`, `src/api/v2/`, `src/db/`, `src/dashboard/`, `src/web/`, `scripts/`); pipeline scripts moved from root with updated Worker paths in web-server.js; `render.yaml` three-service skeleton; `src/db/client.ts` pg.Pool singleton + `src/db/schema.ts` placeholder + `drizzle.config.ts`; drizzle-orm + drizzle-kit installed; `.github/workflows/db-backup.yml` (weekly Xata schema backup) + `data-quality.yml` (Soda Core scan) + Soda Core contracts in `scripts/quality/` and `drizzle/quality/`; `docs/roadmap.md` three-phase migration plan.
- **RUNBOOK-ENV-VARS.md** — full env var audit checklist per service (prod + staging): required vars, Node version pin verification, cache-clear deploy procedure, failure mode table. Covers Q-144 + Q-145.
- **risk.db startup logging** — `onListening()` now logs `[startup] risk.db: ✓ ready / ✗ not-found` alongside nad.db.
- **risk_data_unavailable error** — `/v1/risk` and `/api/demo/risk` return `{"ok":false,"error":"risk_data_unavailable"}` (HTTP 503) when risk.db is absent; previously returned silent nulls across all risk fields. Covers Q-146.

- **Climate Risk Score Phase 1** — `earthquake-import.js` (USGS ASCE7-22, 3,221 counties → `earthquake_risk` table) + `drought-import.js` (USDA Drought Monitor 26-week avg, 3,221 counties → `drought_risk` table); `risk-data.js` adds `getEarthquakeRisk()` + `getDroughtRisk()` synchronous DB lookups; `/v1/risk` uses DB-first with live API fallback; `coverage()` now reports earthquake + drought; `risk_score`, `pgam`, `sdc`, `risk_label` per county; `risk_score`, `current_level`, `weeks_sampled` per county. Run imports on staging then upload to prod.
- **Compliance page — live FEMA + census demo** — hero-right interactive widget: type any US address → real `/api/demo/enrich` response shows `flood_zone`, `flood_sfha`, `census_tract`, `county_fips`. FEMA zone legend (expandable AE/VE/A/X/D reference with SFHA status). Cost calculator: input monthly volume → instant manual vs GeoClear savings. Auth bypass for all `/api/demo/*` paths (no key required).
- **Landing page compliance callout** — dedicated section between verticals and pricing targeting mortgage/insurance personas: HMDA, NFIP, and CRA framing with "See compliance features →" CTA.
- **Risk Score v2 — outcome feedback loop** — `POST /v1/outcomes` accepts delivery/fraud/chargeback outcomes per `nad_uuid`; `address_outcomes` table in `keys.db`; inline key auth on `/v1/outcomes` and `/v1/risk`; deliverability + fraud scores auto-upgrade from heuristic (`score_version: v1`) to outcome-backed (`score_version: v2`) at ≥3 delivery or ≥2 fraud outcomes; `outcome_feedback` flag in `data_coverage`; `outcomes` object in signals when present; 10K/day per-key submission limit; `GET /v1/admin/outcomes` summary; `fraud_confirmed` + `chargeback` outcomes side-effect into `fraud_signal_count`. Primary use case: drone delivery companies ground-truthing deliverability per address.
- **Data Catalog** — `docs/DATA-CATALOG.md` — full metadata for all 9 data sources (NAD r22, Overture, Census TIGER, FEMA NFHL, USGS 3DEP, USFS WHP, NOAA Storm, CAL FIRE FHSZ, OpenAddresses); refresh calendar; lineage diagram. `data_sources` table seeded in `keys.db`.
- **`/bulk` landing page** — drag-drop CSV upload zone wired to `POST /api/address/csv`; 3-step how-it-works; input/output column table; pricing grid (free / $199 1M / $799 5M one-time); FAQ accordion; signup modal. Route `/bulk` added to `web-server.js`. File: `public/bulk.html`
- **Bulk Credits Pack in Stripe** — two one-time products: 1M credits $199 (`prod_ULmPbW3DgGenEh`) and 5M credits $799 (`prod_ULmPjIOpbCdElY`). Price IDs: `STRIPE_PRICE_BULK_1M` + `STRIPE_PRICE_BULK_5M`. `POST /v1/checkout/bulk` endpoint (`{ email, pack:"1m"|"5m" }`) → Stripe payment mode checkout. `buyBulk()` in `bulk.html` wired. Success banner shown on `?success=1`.
- **Render Health Check Path** — set to `/api/health` on prod service `srv-d7ep7bfavr4c73d46gng`. Render will auto-restart on health failure.
- **Pricing slider metered comparison** — `updateCalc()` now shows "Pay-as-you-go equivalent: $X/mo — subscription saves Y%" for Builder/Professional/Scale slider positions. Helps conversion at subscription tiers.
- **Usage history on `GET /v1/me`** — `usage_history` array: per-day request counts for last 30 days (capped at 90 via `?history_days=N`). `getUsageHistory(keyId, days)` method in `KeyStore`. Portal renders as a sparkline bar chart.
- **Customer usage dashboard in portal** — `portal.html` renders 30-day sparkline from `usage_history`; CSS bar chart, hover tooltips with date + count, first/last date labels. No external chart library.
- **`/sitemap.xml`** — 8-URL sitemap covering all public pages; `application/xml` content-type; explicit route added before catch-all. Google Search Console: geoclear.io Domain property verified via Cloudflare DNS TXT integration (automatic); sitemap submitted with status Success, 7 URLs discovered.
- **Render auto-deploy fix** — documented manual trigger via `POST /v1/services/srv-d7ep7bfavr4c73d46gng/deploys`; logged in COMMS.md #4 for dashboard investigation.
> Features merged to main but not yet cut into a version.

- **Landing page — full rewrite** — H1/H2/CTA updated; FEMA anchor copy above pricing; tier rename (Starter→Builder, Growth→Professional, Most Popular badge moved to Professional); Enterprise banner ($2,000/mo + Contact us CTA); data provenance section (4 sources); competitive comparison table (GeoClear vs SmartyStreets vs Lob vs Melissa)
- **`/compliance` landing page** — NFIP-framed page with FEMA flood zone live JSON, census tract, $249/mo CTA, auditable source callout
- **DB schema** — `first_call_at` on `api_keys`; `latency_ms` + `tier` on `usage_log`; `drip_sent` on `api_keys` for email drip tracking
- **`GET /v1/admin/analytics`** — 30-day KPI pulse: requests by day, top keys, tier breakdown, error rate, new signups, avg latency by endpoint
- **Welcome email drip** — Day 1 (existing), Day 3 (enrichment demo if ≥1 call made), Day 7 (upgrade prompt). Daily cron at 01:00 UTC. Manual trigger: `POST /v1/admin/drip/run`
- **Latency tracking** — `process.hrtime.bigint()` in auth middleware; logged per request to `usage_log.latency_ms`

- **`GET /v1/risk`** — Risk Score v1 (Professional+); `risk-data.js` module reads `risk.db` (separate from nad.db); `wildfire-import.js` + `storm-import.js` + `calfire-import.js` import scripts ready for staging; disaster score uses all 4 dimensions when data present (FEMA live, wildfire/storm/cal_fire activate automatically when risk.db populated):
- **Risk data import scripts** — `wildfire-import.js` (USFS WHP by county), `storm-import.js` (NOAA Storm Events 10yr aggregate by county), `calfire-import.js` (CAL FIRE FHSZ grid cells 0.001° resolution); all write to `risk.db`; staging-first pipeline
- **`GET /v1/risk`** — deliverability, fraud, disaster, vacancy scores (0–1); live FEMA flood zone; Ground-Truth Graph signals; `data_coverage` flags for pending USFS/NOAA/CAL FIRE dimensions; `version: "1.0-beta"`
- **Ground-Truth Graph** — `address_signals` table in `keys.db`; fire-and-forget upsert on every `/api/address` hit; `GET /v1/admin/signals` for inspection; seeds deliverability + vacancy signals for Risk Score v1
- **`pro_compliance` tier** — $499/mo, same as Professional + `sla: true`; TIERS entry in `keys.js`, STRIPE_PRICES in `web-server.js`, portal card; SLA document at `public/geoclear-compliance-sla.html` (printable, signable); linked from `/compliance`
- **Builder enrichment taste** — 500 enrichment calls/month for Builder ($49) tier; `enrichment_calls_month` + `enrichment_month` columns; `checkEnrichmentQuota()` method; monthly reset logic; quota enforced on `/api/enrich`
- **Docs — tagline + SmartyStreets comparison** — intro tagline "198M US addresses. Census tract, FEMA flood zone, and timezone — one API call."; "Why GeoClear vs SmartyStreets" 6-row comparison table + migration guide + sidebar nav link
- **Activation funnel** — 30-second curl quickstart added to Day 1 welcome email; `X-Quota-Warning` response header at 80% daily limit (non-enterprise)

- **`elevation_ft` added to `/api/enrich`** — USGS 3DEP Elevation Point Query Service (EPQS); ground elevation in feet at 1m lidar resolution; called in parallel with Census + FEMA; no API key; cached in-process; `elevation_ft: null` hint added to `/api/address` tier gate
- **`POST /api/address/csv` — CSV address verification** — accepts `text/csv` (max 5,000 rows, 10MB); auto-detects column headers (number/street/city/state/zip with aliases); returns enriched CSV with appended columns: geo_verified, nad_uuid, confidence, residential, fips, timezone, coverage, match_type; RFC 4180 parser + serializer inline (no deps); raw stream body reading
- **CAL FIRE FHSZ live lookup added to `/api/enrich`** — `cal_fire_fhsz` field; live polygon lookup via `egis.fire.ca.gov/arcgis/rest/services/FRAP/HHZ_ref_FHSZ/MapServer/0`; CA only (null for non-CA addresses); covers High + Very High zones (SRA/LRA/FRA); no import needed — same live-API pattern as FEMA NFHL; web Mercator envelope query (service rejects point geometry)
- **USGS Structures, GNIS + NHD proximity fields added to `/api/enrich`** — USGS Structures MapServer (hospitals layer 14, fire stations layer 16): `nearest_hospital_name/mi`, `nearest_fire_station_name/mi`; USGS GNIS (Populated Places layer 3): `nearest_place_name/type/mi`; NHD+ HR Flowlines (layer 3, named waterways only): `nearest_waterway_name/ftype/mi`; all US federal, no key, bounding box query + Haversine client-side; all six APIs now called in parallel in `enrichPoint()`

- **Wildfire + storm risk data live** — `wildfire-import.js` rewritten to use USFS/Esri WHP FeatureServer (county layer, `services.arcgis.com/jIL9msH9OI208GCb`); 3,108 counties with WHP class + score; `storm-import.js` 3,257 counties 10yr NOAA events; both uploaded to prod `/data/risk.db` (612KB); `/v1/risk` returns `data_coverage.wildfire: true, storm: true`

- **Address disambiguation** — `findAddress()` now scores + re-ranks results by match specificity; adds `match_type: "exact" | "number+street" | "street+location" | "street" | "location"` to each result
- **Coverage declaration** — `GET /api/address` responses include `coverage: "full" | "gap-fill" | "partial"`; `GET /api/state/:code` includes `coverage` + `coverage_source` (NAD r22 vs NAD r22 + Overture Maps)
- **FK relink** — `POST /v1/admin/relink-fks` — background worker that populates `state_id`, `zip_code_id`, `county_id`, `city_id` for the ~64.9M Overture rows merged without hierarchy FK linkage; fixes `/api/states` 0-counts for MI, NJ, NV, NH, FL, CA, etc.
- **OpenAddresses import script** — `openaddresses-import.js` — streams OA gzipped CSVs from their S3 index, deduplicates via `nad_uuid = 'OA:' + HASH`, batch-inserts; `--state`, `--limit`, `--list` flags

- **Overture Maps full merge complete** — nad.db now has 198,657,535 addresses; all 16 indexes rebuilt on prod (completed 01:59 UTC 2026-04-16)
- **Cloudflare proxy enabled** — SSL Full (strict) set, orange cloud active on geoclear.io; CF-Ray header confirmed
- **Cloudflare cache rule live** — "GeoClear read-only API cache": `/api/stats`, `/api/states`, `/api/health` cached 5 min (300s) at edge
- Stripe **live mode** fully wired: `sk_live_...`, `whsec_live_...`, live price IDs for Starter / Growth / Pay-as-you-go
- Metered billing live: `STRIPE_METER_ID` + `STRIPE_PRICE_METERED` set to live Stripe Billing Meter (`mtr_61UVWpc...`, event `geoclear_lookup`)
- Fix: metered tier checkout session omits `quantity` (required by Stripe for metered prices)
- `GET /privacy` and `GET /terms` — Privacy Policy and Terms of Service pages
- **Landing page full redesign** (`public/landing.html`) — dark navy/sky/indigo design: hero with dot grid + live terminal, metrics strip, 3×3 feature grid, how-it-works, 4-tab code examples, live demo widget, enrichment fields, pricing grid, CTA section, signup modal
- **Route change**: `GET /` → `landing.html` (marketing page); `GET /explorer` → `index.html` (address explorer)
- `GET /api/demo` — open demo endpoint, 10 req/hr per IP, max 3 results; powers landing page demo widget without exposing a real API key
- Metered flush **daily cron** — in-process self-rescheduling `setTimeout` fires at midnight UTC; no external cron service needed
- `invoice.payment_failed` webhook → SendGrid dunning email (attempt count + Stripe customer portal link)
- `POST /v1/admin/stream-upload` — stream large files to `/data/<filename>` with no body size limit
- `POST /v1/admin/upload-chunk` — resumable chunked upload to `/data/<filename>` at byte offset (`X-Chunk-Offset` header)
- `POST /v1/admin/merge` — fold addresses from a staging SQLite DB into prod nad.db (Overture promotion path)
- `customer.subscription.updated` — key tier synced on plan change (detects upgrade/downgrade by `price.id`)
- **Landing page design refinements**: SVG pin logo mark, SVG stroke feature icons (replacing emojis), plain-white stats (removed gradient text overuse), outlined step circles, tighter copy
- **Trust layer**: Sri Yantra ghost watermark in hero (5% opacity, screen blend, personal founder mark); data sources strip (USDOT NAD r22, Overture Maps, Census TIGER/Line, FEMA NFHL); Stripe secured badge + cancel-anytime note under pricing; uptime badge linking to `/status`
- `UptimeRobot` monitors live: IDs 802836799 (API Health) + 802836800 (Landing Page), 5-min interval
- `GET /api/status` — server-side UptimeRobot proxy (real uptime ratios + avg response time; key never exposed to browser)
- `/ship` master skill — runs doc sync + commit + deploy + optional release cut in one call

---

## v1.0.0 — 2026-04-14
**Production launch. Service live at geoclear.io.**

### Infrastructure
- Render Web Service deployed (`srv-d7ep7bfavr4c73d46gng`, Virginia region)
- Render persistent disk: 100GB at `/data` — nad.db (91GB, 120M addresses) transferred
- `process.env.PORT` fix — server now reads Render's dynamic `$PORT` env var (was hardcoded 4001)
- Cloudflare DNS: CNAME `geoclear.io → geoclear.onrender.com`, DNS-only (not proxied)
- `www.geoclear.io` CNAME added, also DNS-only
- Custom domain `geoclear.io` registered in Render dashboard, SSL cert auto-issued
- `RUNBOOK-DATA.md` created — documents when and how to rsync nad.db to Render
- Metered flush cron — self-scheduling `setTimeout` at midnight UTC inside the server process; no external cron job needed

### Billing
- Stripe products: Starter ($49/mo), Growth ($249/mo), Scale ($999/mo), Pay-as-you-go (metered)
- Stripe Billing Meter (`geoclear_lookup`) wired to metered flush via `billing.meterEvents.create`
- Stripe webhook registered at `https://geoclear.io/v1/webhook/stripe`
- Handlers: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed` (dunning email)
- Upgrade-in-place — existing key tier updated when same email re-pays
- Downgrade-on-cancel — key drops to `free` on `customer.subscription.deleted`
- SendGrid email delivery of API keys post-signup and post-payment

### API
- `POST /v1/signup` — self-serve free tier key issuance (email only)
- `POST /v1/checkout` — Stripe checkout for starter / pro / metered tiers
- `GET /v1/checkout/session/:id` — poll for key after payment
- `GET /api/address` — address search with `?fuzzy=true` for typo-tolerant matching
- `GET /api/suggest` — autocomplete / typeahead (`?q=&state=&zip=`)
- `POST /api/address/bulk` — up to 1,000 addresses per request
- `GET /api/near` — proximity search (`?lat=&lon=&radius_km=`)
- `GET /api/enrich` — census tract + FEMA flood zone via lat/lon or `nad_uuid`
- `GET /v1/me` — key status, tier, limits, today/total usage
- Rate limiting: per-key per-tier (`req_per_min`) + daily quota (`req_per_day`), both enforced

### Enrichment (on every `/api/address` response)
- FIPS county code (`countyFips()`)
- Confidence score 0–100 (`confidenceScore()`)
- Timezone — IANA string (`timezone()`)
- Residential / commercial flag (`residentialFlag()`)
- Census tract + block group — via Census Bureau Geocoder API (`/api/enrich`)
- FEMA flood zone — via FEMA NFHL API (`/api/enrich`)

### Product
- GeoClear landing page (`public/index.html`) — address demo widget, pricing, signup flow
- Portal page (`public/portal.html`) — key management, upgrade / cancel

### Data
- nad.db: 91GB, 120,160,305 addresses (NAD r22)
- Overture gap-fill: FL, MI, NJ, NV, NH

### Still open
- `customer.subscription.updated` handler (plan-change detection)
- Overture full gap-fill run (all states)

---

## v0.1.0 — 2026-04-13
**First tracked release. Core API + billing foundation.**

### Added
- `POST /v1/signup` — self-serve free tier key issuance (email only, no card)
- `POST /v1/checkout` — Stripe checkout for starter / pro / metered tiers
- `GET /v1/checkout/session/:id` — poll for key after payment
- `POST /v1/webhook/stripe` — handles `checkout.session.completed`, `customer.subscription.deleted`
- Upgrade-in-place — existing key tier updated when same email pays, no duplicate key issued
- Downgrade-on-cancel — key drops to `free` when Stripe subscription is cancelled
- `metered` tier — $0.001/lookup, no daily cap, tracked via `metered_unreported` column
- `POST /v1/admin/metered/flush` — bulk-reports metered usage to Stripe Billing Meters API
- Stripe Billing Meter (`geoclear_lookup` event) — test mode
- Signup rate limiter — 5 attempts / hour / IP
- `keys.findByEmail()`, `keys.upgradeTier()`, `keys.downgradeBySubscription()`
- `keys.getMeteredKeysWithUsage()` / `keys.markMeteredFlushed()`

### Data
- 120M+ addresses (NAD r22)
- Overture gap-fill: FL, MI, NJ, NV, NH
