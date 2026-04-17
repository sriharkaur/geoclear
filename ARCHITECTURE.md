# GeoClear — Living Architecture
> **Always current. Update this file every time a feature ships.**
> Last updated: v1.0.0 (2026-04-14, session 5)

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS (no framework beyond Express) |
| Database | SQLite via better-sqlite3 (no ORM) |
| Server | Express 4 |
| Payments | Stripe (subscriptions + metered billing) |
| Hosting (prod) | Render Web Service `srv-d7ep7bfavr4c73d46gng` — `geoclear.io` |
| Hosting (staging) | Render Web Service `srv-d7f6rh58nd3s73cve8dg` — `geoclear-staging.onrender.com` |
| DNS / CDN | Cloudflare (DNS-only, not proxied) |
| Port | 4001 (local) / 443 (prod) |

---

## Source Files

| File | Responsibility |
|---|---|
| `web-server.js` | Express server, all routes, Stripe webhook, auth middleware |
| `query.js` | `NADQuery` — all address lookup/search logic against SQLite |
| `enrich.js` | `enrich()` — census, FEMA, RDI, timezone enrichment pipeline |
| `geocode.js` | `enrichPoint()` — reverse geocoding |
| `keys.js` | `KeyStore` — API key issuance, validation, usage tracking, Stripe session handling |
| `schema.sql` | DB schema |
| `init-db.js` | One-time DB initialization |
| `download.js` | NAD + Overture data download pipeline |
| `overture-import.js` | Overture Maps gap-fill importer (DuckDB parquet → SQLite); supports `--db=<path>` flag |
| `create-dev-db.js` | Generates `data/dev.db` — 20K addrs/state sampled from nad.db; 572MB for local dev |
| `sync-staging-to-prod.sh` | Documents and guides the staging → prod data promotion workflow |
| `mcp-server.js` | MCP server interface for Claude integration |
| `public/` | Static assets (landing page, portal, status, explorer) |

---

## Data

| Source | Coverage | Rows | Location |
|---|---|---|---|
| NAD r22 | ~47 states | 120,160,305 | prod `/data/nad.db` (91GB) |
| Overture Maps (original gap-fill) | FL, MI, NJ, NV, NH | included in nad.db | prod `/data/nad.db` |
| Overture Maps (full run) | FL, CA, MI, NJ, PA, MS, SC, GA, SD, HI, LA, NV, NH + | 64,900,000 | `data/overture-additions.db` (37GB) — upload to prod in progress; merge via `POST /v1/admin/merge` pending |
| Dev sample | All 50 states, 20K/state | ~983,000 | `data/dev.db` (572MB) — local dev only |
| API keys + sessions | Live customer keys | small | prod `/data/keys.db` |

**After merge: ~185M total addresses** (120M NAD + 64.9M Overture, deduped by `nad_uuid`)

---

## Data Pipeline & Staging Workflow

The staging service (`geoclear-staging.onrender.com`) exists solely as a data processing environment — no customers hit it. All heavy imports (Overture parquet → SQLite, future NAD updates) run there. Local machine is not involved in data operations.

```
New data source (e.g. Overture S3 parquet)
  │
  ▼  [run on staging Render Shell]
node overture-import.js --db=/data/overture-additions.db
  │  (DuckDB reads parquet from S3 → SQLite rows)
  │
  ▼  [chunked HTTP upload via /v1/admin/upload-chunk]
prod /data/overture-additions.db
  │
  ▼  [POST /v1/admin/merge  body: {dbPath}]
prod /data/nad.db  ← INSERT OR IGNORE in 10K-row batches (background)
  │
  ▼
GET /api/stats  ← verify new row count
```

**For local development** (no 91GB database needed):
```bash
node create-dev-db.js        # one-time: samples 20K addrs/state → data/dev.db
NAD_DB=data/dev.db node web-server.js
```

---

## Pricing Tiers

| Tier | Price | req/day | req/min | Bulk | Enrichment | Billing |
|---|---|---|---|---|---|---|
| `free` | $0 | 1K | 10 | — | No | None |
| `starter` | $49/mo | 50K | 100 | 100 | No | Stripe subscription |
| `pro` | $249/mo | 500K | 1,000 | 1,000 | Yes | Stripe subscription |
| `metered` | $0.001/lookup | unlimited | 500 | 1,000 | No | Stripe metered (monthly) |
| `enterprise` | Custom | unlimited | 9,999 | 1,000 | Yes | Custom |

---

## API Endpoints

### Public (no auth)

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check — DB status, address count |
| GET | `/api/stats` | DB coverage stats |
| GET | `/api/states` | All states with address counts |
| POST | `/v1/signup` | Self-serve free tier key (email only, 5/hr/IP rate limit) |
| POST | `/v1/checkout` | Create Stripe checkout session (starter / pro / metered) |
| GET | `/v1/checkout/session/:id` | Poll for API key after payment completes |
| POST | `/v1/webhook/stripe` | Stripe webhook receiver (raw body, signature verified) |

### Protected (requires `X-Api-Key` header or `?key=`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/address` | Address search (`?street=&city=&state=&zip=&number=&limit=&fuzzy=`) |
| GET | `/api/suggest` | Autocomplete / typeahead (`?q=&state=&zip=&limit=`) |
| POST | `/api/address/bulk` | Bulk address verify (array, max 1,000) |
| GET | `/api/zip/:zip` | ZIP code lookup |
| GET | `/api/state/:code` | State summary |
| GET | `/api/county` | County list / lookup (`?state=&name=`) |
| GET | `/api/city` | City search / list (`?state=&name=&county=&limit=`) |
| GET | `/api/neighborhood` | Neighborhood list (`?state=&city=&limit=`) |
| GET | `/api/zips` | ZIP codes in state/city (`?state=&city=&limit=`) |
| GET | `/api/near` | Proximity search (`?lat=&lon=&radius_km=&limit=`) |
| GET | `/api/enrich` | Point enrichment — census tract, FEMA flood zone (`?lat=&lon=` or `?nad_uuid=`) |
| GET | `/v1/me` | Key status — tier, limits, usage today/total |
| GET | `/v1/risk` | Risk Score (Professional+) — deliverability, fraud, disaster, vacancy (0–1); `score_version: v1|v2`; resolves by nad_uuid, street+city+state, or lat+lon |
| POST | `/v1/outcomes` | Outcome feedback — report delivery/fraud/chargeback per nad_uuid; upgrades v1 heuristic to v2 outcome-backed score |

### Admin (requires `X-Admin-Secret` header)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/admin/keys` | List all active keys |
| GET | `/v1/admin/keys/stats` | Key + usage stats by tier |
| POST | `/v1/admin/keys` | Issue a key manually (`{email, tier, name, notes}`) |
| DELETE | `/v1/admin/keys/:id` | Revoke a key |
| POST | `/v1/admin/metered/flush` | Report accumulated metered usage to Stripe |
| POST | `/v1/admin/stream-upload` | Stream a file to `/data/<filename>` without body buffering. Header: `X-Upload-Filename`. For small-to-medium files. |
| POST | `/v1/admin/upload-chunk` | Write one chunk at a byte offset — resumable upload for large files (37GB+). Headers: `X-Upload-Filename`, `X-Chunk-Offset`. |
| POST | `/v1/admin/merge` | Merge all addresses from an attached SQLite DB into nad.db in background (10K-row batches, INSERT OR IGNORE). Body: `{ dbPath, source? }`. |
| GET | `/v1/admin/signals` | Top queried + fraud-flagged addresses from Ground-Truth Graph |
| GET | `/v1/admin/outcomes` | Outcome feedback summary — by_type counts, by_key breakdown, top addresses |
| GET | `/v1/admin/data-sources` | Data source catalog entries; `?status=` filter |
| PATCH | `/v1/admin/data-sources/:source_id` | Update data source metadata |

---

## Stripe Integration

| Event | Handler |
|---|---|
| `checkout.session.completed` | Upgrade existing key tier or issue new key; store `stripe_customer_id` + `stripe_subscription_id` |
| `customer.subscription.updated` | Key tier synced: match `price.id` → tier lookup → update key row |
| `customer.subscription.deleted` | Downgrade key to `free` tier |
| `invoice.payment_failed` | Dunning email sent with link to update payment method (up to 4 attempts) |

**Metered billing flow:**
1. Usage tracked in `metered_unreported` column per key
2. `POST /v1/admin/metered/flush` fires `billing.meterEvents` to Stripe in bulk
3. Stripe aggregates and bills customer at month end
4. Flush runs daily via self-scheduling `setTimeout` at midnight UTC inside the server process

---

## Key Lifecycle

```
POST /v1/signup (free)          → key issued, tier=free
POST /v1/checkout (paid)        → Stripe session → webhook → key upgraded or issued
customer.subscription.deleted   → key downgraded to free
DELETE /v1/admin/keys/:id       → key revoked (is_active=0)
```

---

## Rate Limiting

| Layer | Scope | Limit |
|---|---|---|
| Signup endpoint | Per IP | 5 requests / hour |
| API endpoints | Per API key | Tier's `req_per_min` (10–9,999) |
| Daily quota | Per API key | Tier's `req_per_day` (1K–unlimited) |

---

## Not Yet Built (see QUEUE.md for full backlog)

- Overture full gap-fill merge to prod (64.9M rows ready — upload in progress)
- Usage dashboard for customers (self-serve usage over time)
- CSV upload → enriched CSV download
- Bulk async processing for 10M+ record jobs (current bulk is sync, max 1K)
- Address standardization (USPS format)
- FCC broadband tier by address
- OpenAddresses import (~50M additional US addresses)
- NAD r23 quarterly update (~June 2026)
- SDK (Node.js, Python)
- Docs page (`/docs`)
