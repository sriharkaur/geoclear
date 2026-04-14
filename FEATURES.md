# GeoClear — Feature Inventory
> **Single source of truth for everything built.**
> Update this file every time a feature ships. Mirrors RELEASES.md chronologically but organized by feature area for quick lookup.
> Last updated: 2026-04-14 (session 2)

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
| `customer.subscription.updated` | Key tier updated to match new plan price ID |
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

---

## Infrastructure & Observability

| Item | Status | Notes |
|------|--------|-------|
| Hosting | Render Web Service `srv-d7ep7bfavr4c73d46gng` | Virginia region, Docker-based |
| Persistent data | Render disk at `/data` | nad.db 91GB, keys.db |
| DNS | Cloudflare CNAME `geoclear.io → geoclear.onrender.com` | DNS-only (not proxied) |
| SSL | Render custom domain cert | Auto-issued |
| Email | SendGrid — `noreply@geoclear.io` | API keys, payment alerts |
| Status page | UptimeRobot | Shown at bottom of landing page |
| Health check | `GET /api/health` | Returns DB status + address count |
| Coverage stats | `GET /api/stats` | Breakdown by state |
| Demo widget | `GET /api/demo` | IP rate-limited 10/hr, no key required |

---

## Data

| Source | Coverage | Addresses | Location |
|--------|----------|-----------|----------|
| NAD r22 | 120M+ US addresses, ~47 states | 120,160,305 | `/data/nad.db` (91GB) |
| Overture Maps gap-fill | FL, MI, NJ, NV, NH | included in nad.db | same |

---

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| Landing page + demo | `/` → `public/landing.html` | Hero, demo widget, pricing, signup CTA |
| Customer portal | `/portal.html` | Key display, upgrade/cancel, checkout success/cancel |
| Status | `/status.html` | UptimeRobot embed |
| API explorer | `/explorer` | Interactive API docs |
| Privacy Policy | `/privacy` | Data collection, retention, third-party services |
| Terms of Service | `/terms` | Acceptable use, billing, liability, governing law |

---

## Not Yet Built (see QUEUE.md)

- `customer.subscription.updated` ~~handler~~ ✅ — shipped 2026-04-14
- Overture full gap-fill run (all states)
- Usage dashboard for customers
- CSV upload → enriched CSV download
- Bulk async + webhooks for 10M+ record jobs
- Address standardization (USPS format)
- FCC broadband tier by address
- SDKs (Node.js, Python)
- Marketplace listings (RapidAPI, Zapier, Shopify)
- Status page ~~(UptimeRobot)~~ ✅ — live per user confirmation 2026-04-14
