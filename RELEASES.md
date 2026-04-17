# GeoClear — Release Notes
> Append-only. Each release gets a section. Newest at top.
> Versioning: MAJOR.MINOR.PATCH (semver)
>   MAJOR — breaking API changes
>   MINOR — new features, new endpoints
>   PATCH — bug fixes, internal changes

---

## Unreleased
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
