# GeoClear — Feature Inventory
> **Single source of truth for everything built.**
> Update this file every time a feature ships. Mirrors RELEASES.md chronologically but organized by feature area for quick lookup.
> Last updated: 2026-04-14 (session 5)

---

## Address Lookup & Search

| Feature | Endpoint / Location | Notes |
|---------|-------------------|-------|
| Address search | `GET /api/address` | `?street=&city=&state=&zip=&number=&limit=` |
| Fuzzy / typo-tolerant search | `GET /api/address?fuzzy=true` | Calls `findAddressFuzzy()` in query.js |
| Autocomplete / typeahead | `GET /api/suggest` | `?q=&state=&zip=&limit=` — 5-min TTL cache |
| Bulk address verify | `POST /api/address/bulk` | Array input, max 1,000 per request, synchronous |
| ZIP code lookup | `GET /api/zip/:zip` | Returns ZIP metadata |
| State summary | `GET /api/state/:code` | Address count + metadata per state |
| All states | `GET /api/states` | Sorted by address count |
| County lookup | `GET /api/county` | `?state=&name=` |
| City search | `GET /api/city` | `?state=&name=&county=&limit=` |
| Neighborhood list | `GET /api/neighborhood` | `?state=&city=&limit=` |
| ZIP codes in area | `GET /api/zips` | `?state=&city=&limit=` |
| Proximity search | `GET /api/near` | `?lat=&lon=&radius_km=&limit=` |

---

## Address Enrichment

Enrichments returned on **every** `/api/address` response (no extra call needed):

| Field | Source | Notes |
|-------|--------|-------|
| `fips` | `countyFips()` in enrich.js | 5-digit county FIPS (state + county) |
| `confidence` | `confidenceScore()` in enrich.js | 0–100 reliability score |
| `timezone` | `timezone()` in enrich.js | IANA string (e.g. `America/New_York`) |
| `residential` | `residentialFlag()` in enrich.js | `residential` / `commercial` / `unknown` |
| `display_city` | `enrich()` in enrich.js | `post_city` preferred over `inc_muni` |
| `neighborhood` | `enrich()` in enrich.js | `nbrhd_comm` or `uninc_comm` |

Enrichments via separate call (`GET /api/enrich?lat=&lon=` or `?nad_uuid=`):

| Field | Source | Notes |
|-------|--------|-------|
| `census_tract` | Census Bureau Geocoder API | TIGER/Line, no key required |
| `census_tract_raw` | Census Bureau Geocoder API | Unformatted tract code |
| `census_block_grp` | Census Bureau Geocoder API | Block group |
| `census_geoid` | Census Bureau Geocoder API | Full GEOID |
| `flood_zone` | FEMA NFHL API | X = minimal, AE = high risk, etc. |
| `flood_sfha` | FEMA NFHL API | `true` if in Special Flood Hazard Area |
| `flood_community` | FEMA NFHL API | Community name |

Both APIs are US federal — no key, no cost. Results cached in-process (LRU, ~10K entries).

---

## Billing & Subscription

### Pricing Tiers

| Tier | Price | req/day | req/min | Enrichment |
|------|-------|---------|---------|-----------|
| `free` | $0 | 1,000 | 10 | No |
| `starter` | $49/mo | 50,000 | 100 | No |
| `pro` | $249/mo | 500,000 | 1,000 | Yes |
| `metered` | pay-per-lookup | unlimited | 500 | No |
| `enterprise` | custom | unlimited | 9,999 | Yes |

### Stripe Integration (LIVE mode)

| Event | What happens |
|-------|-------------|
| `checkout.session.completed` | API key issued (or existing key upgraded); email sent via SendGrid |
| `customer.subscription.updated` | Key tier synced to new plan — detects upgrade/downgrade by matching `price.id` to tier table |
| `customer.subscription.deleted` | Key downgraded to `free` |
| `invoice.payment_failed` | Dunning email with link to update payment method (up to 4 attempts) |

### Checkout Flow

1. User POSTs to `POST /v1/checkout` with `{ email, tier }`
2. Server creates Stripe Checkout Session → returns `{ session_id, url }`
3. User completes payment on Stripe-hosted page
4. Stripe fires `checkout.session.completed` webhook
5. Server issues / upgrades API key → sends key via SendGrid email
6. Frontend polls `GET /v1/checkout/session/:id` until `status: "complete"`

### Metered Billing Flow

1. Each address lookup increments `metered_unreported` on the key row
2. Server runs `runMeteredFlush()` daily at midnight UTC (self-scheduling `setTimeout`)
3. Flush fires `billing.meterEvents.create` for event `geoclear_lookup` per customer
4. Stripe aggregates usage and bills at month end
5. Manual flush available: `POST /v1/admin/metered/flush`

Live Stripe Billing Meter: `mtr_61UVWpc...` | Event name: `geoclear_lookup`

---

## API Key Management

| Feature | Endpoint | Notes |
|---------|----------|-------|
| Free tier self-serve signup | `POST /v1/signup` | Email only, 5/hr/IP rate limit; SendGrid email delivery |
| Paid tier checkout | `POST /v1/checkout` | Stripe-hosted checkout; `starter`, `pro`, `metered` |
| Poll for key post-payment | `GET /v1/checkout/session/:id` | Returns `status: pending | complete` + key |
| Key status & usage | `GET /v1/me` | Tier, limits, usage today / total |
| Rate limiting | per-key per-tier | `req_per_min` enforced via express-rate-limit |
| Daily quota | per-key per-tier | `req_per_day` enforced in auth middleware |

---

## Admin Endpoints

All require `X-Admin-Secret` header.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/admin/keys` | List all active keys |
| GET | `/v1/admin/keys/stats` | Key + usage counts by tier |
| POST | `/v1/admin/keys` | Issue a key manually `{ email, tier, name, notes }` |
| DELETE | `/v1/admin/keys/:id` | Revoke a key |
| POST | `/v1/admin/metered/flush` | Manually flush metered usage to Stripe |
| POST | `/v1/admin/stream-upload` | Stream-write large files to `/data/<filename>` — no body limit; headers: `X-Upload-Filename` |
| POST | `/v1/admin/upload-chunk` | Resumable chunked upload to `/data/<filename>` at byte offset; headers: `X-Upload-Filename`, `X-Chunk-Offset` |
| POST | `/v1/admin/merge` | Merge all addresses from an attached SQLite DB into nad.db (staging → prod promotion); body: `{ dbPath, source }` |

---

## Infrastructure & Observability

| Item | Status | Notes |
|------|--------|-------|
| **Prod** hosting | Render Web Service `srv-d7ep7bfavr4c73d46gng` | `geoclear.onrender.com` / `geoclear.io` — Virginia |
| **Staging** hosting | Render Web Service `srv-d7f6rh58nd3s73cve8dg` | `geoclear-staging.onrender.com` — autoDeploy OFF; 100GB disk — used for heavy imports |
| Deployment | Auto-deploy on `git push` to `main` (prod); manual trigger only (staging) | `NODE_VERSION=20` pinned on both services |
| Persistent data (prod) | Render disk at `/data` | nad.db 91GB, keys.db |
| Persistent data (staging) | Render disk at `/data` (100GB) | Import workspace — Overture parquet → TSV → SQLite; no customer data |
| DNS | Cloudflare CNAME `geoclear.io → geoclear.onrender.com` | DNS-only (not proxied) |
| SSL | Render custom domain cert | Auto-issued |
| Email | SendGrid — `noreply@geoclear.io` | API keys, payment alerts |
| UptimeRobot monitors | IDs 802836799 (API Health) + 802836800 (Landing Page) | 5-min interval; 90-day uptime 99.963%, avg response 131ms |
| Status proxy endpoint | `GET /api/status` | Server-side UptimeRobot proxy — real uptime ratios (1d/7d/30d/90d) + avg 24h response; API key never in browser |
| Health check | `GET /api/health` | Returns DB status + address count (lazy: null until /api/stats warms cache) |
| Coverage stats | `GET /api/stats` | Breakdown by state; warms 1-hr address count cache |
| Demo widget | `GET /api/demo` | IP rate-limited 10/hr, no key required |
| OpenAPI spec | `openapi.yaml` repo root | OAS 3.0, all public endpoints — ready to upload to RapidAPI Provider Hub |
| Local dev DB | `data/dev.db` (572MB) | Generated by `create-dev-db.js` — 20K addrs/state sampled from nad.db; use with `NAD_DB=data/dev.db` |

---

## Data

| Source | Coverage | Addresses | Location |
|--------|----------|-----------|----------|
| NAD r22 | 120M+ US addresses, ~47 states | 120,160,305 | `/data/nad.db` (91GB) on prod |
| Overture Maps gap-fill | FL, MI, NJ, NV, NH (in prod) | included in nad.db | prod `/data/nad.db` |
| Overture Maps full run | FL, CA, MI, NJ, PA, MS, SC, GA, SD, HI, LA, NV, NH + more | 64,900,000 | `data/overture-additions.db` (37GB, local — upload to prod in progress) |
| Dev sample DB | All 50 states, 20K addrs/state | ~983,000 | `data/dev.db` (572MB, local only — set `NAD_DB=data/dev.db`) |

**Pending:** once `overture-additions.db` finishes uploading to prod `/data`, call `POST /v1/admin/merge` to fold 64.9M rows into nad.db → ~185M total addresses (after dedup).

---

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| Landing page + demo | `/` → `public/landing.html` | Dark design (navy/sky/indigo). SVG pin logo mark, live terminal in hero, `/api/demo` widget, 4-tab code examples, pricing grid, free signup modal. Route: `/` → `landing.html`, `/explorer` → `index.html` |
| Trust layer | landing page | Sri Yantra ghost watermark (5% opacity, screen blend); data sources strip (USDOT NAD r22, Overture Maps, Census TIGER/Line, FEMA NFHL); Stripe secured badge + cancel-anytime note under pricing; 99.9% uptime badge → `/status` |
| Scroll fade-up animations | landing page | IntersectionObserver-driven fade+translateY on all sections; 75ms stagger on grid cards (feat-grid, steps, enrich-grid, pricing-grid) |
| Animated metric counters | landing page | 120M+ / 8+ / 10K count up from 0 on scroll-into-view; `<5ms` uses prefix token; 1.4s duration at 60fps |
| Use-case industry switcher | landing page — code section | 5 pills (General / Insurance / Fintech / E-commerce / Logistics); clicking fades and swaps h2 + description to persona-specific copy; no page reload |
| Pricing volume calculator | landing page — pricing section | Range slider 1K–5M+ lookups/month; auto-highlights matching price card with glow border; shows plan name, price, and included volume in real time |
| Customer portal | `/portal.html` | Key display, upgrade/cancel, checkout success/cancel |
| Status | `/status.html` | Real UptimeRobot data via `/api/status` proxy — uptime table (1d/7d/30d/90d), live response time, external dep checks (Census, FEMA) |
| API explorer | `/explorer` | Interactive API docs |
| Privacy Policy | `/privacy` | Data collection, retention, third-party services |
| Terms of Service | `/terms` | Acceptable use, billing, liability, governing law |

---

## Distribution & GTM

| Item | Location | Notes |
|------|----------|-------|
| Launch announcement strategy | `AddressAPIBusinessGTM.md` | Full sequence: warm outreach → HN → Product Hunt → IH → LinkedIn; email template, HN title/first-comment, passive channel steps |
| OpenAPI spec for marketplace listing | `openapi.yaml` | OAS 3.0, 9 endpoints, ready to upload to RapidAPI |
| G2 / Capterra listing content | `AddressAPIBusinessGTM.md` → Passive Channels | Tagline, description, category pre-written |

---

## Not Yet Built (see QUEUE.md)
- Overture full gap-fill merge to prod (64.9M rows in overture-additions.db — upload in progress, merge pending)
- Usage dashboard for customers (show their own usage over time)
- CSV upload → enriched CSV download
- Bulk async + webhooks for 10M+ record jobs
- Address standardization (USPS format)
- FCC broadband tier by address
- SDKs (Node.js, Python)
- RapidAPI marketplace listing (openapi.yaml ready, manual submission pending)
- G2 / Capterra listing (content ready in AddressAPIBusinessGTM.md, manual submission pending)
- Zapier / Shopify integrations
- Docs page (`/docs`) — full endpoint reference with copy-paste examples (HN launch blocker)
- OpenAddresses import script (additional ~50M US addresses)
- NAD r23 (next quarterly release ~June 2026)
