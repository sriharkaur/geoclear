# GeoClear — Living Architecture
> **Always current. Update this file every time a feature ships.**
> Last updated: v0.1.0 (2026-04-13)

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (no framework beyond Express) |
| Database | SQLite via better-sqlite3 (no ORM) |
| Server | Express 4 |
| Payments | Stripe (subscriptions + metered billing) |
| Hosting | Render (web service + persistent disk at `/data`) |
| DNS / CDN | Cloudflare |
| Port | 4001 (local) / 443 (prod via Cloudflare) |

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
| `overture-import.js` | Overture Maps gap-fill importer |
| `mcp-server.js` | MCP server interface for Claude integration |
| `public/` | Static assets (landing page, demo widget) |

---

## Data

| Source | Coverage | Size | Location |
|---|---|---|---|
| NAD r22 | 120M+ US addresses, 47 states | ~85GB | `/data/nad.db` |
| Overture gap-fill | FL, MI, NJ, NV, NH | included in nad.db | same |
| API keys + sessions | Live customer keys | small | `/data/keys.db` |

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

### Admin (requires `X-Admin-Secret` header)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/admin/keys` | List all active keys |
| GET | `/v1/admin/keys/stats` | Key + usage stats by tier |
| POST | `/v1/admin/keys` | Issue a key manually (`{email, tier, name, notes}`) |
| DELETE | `/v1/admin/keys/:id` | Revoke a key |
| POST | `/v1/admin/metered/flush` | Report accumulated metered usage to Stripe |

---

## Stripe Integration

| Event | Handler |
|---|---|
| `checkout.session.completed` | Upgrade existing key tier or issue new key; store `stripe_customer_id` + `stripe_subscription_id` |
| `customer.subscription.deleted` | Downgrade key to `free` tier |
| `customer.subscription.updated` | Registered (handler TBD — for plan change detection) |
| `invoice.payment_succeeded` | Registered (no handler yet — for payment confirmation emails) |
| `invoice.payment_failed` | Registered (no handler yet — for dunning) |

**Metered billing flow:**
1. Usage tracked in `metered_unreported` column per key
2. `POST /v1/admin/metered/flush` fires `billing.meterEvents` to Stripe in bulk
3. Stripe aggregates and bills customer at month end
4. Flush should be called daily via cron (not yet wired on Render)

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

- Subscription upgrade/downgrade UI (user-facing portal)
- Metered flush cron on Render
- `customer.subscription.updated` handler (plan changes)
- `invoice.payment_failed` handler (dunning / key suspension)
- Email delivery of API keys post-signup
- Usage dashboard for customers
- SDK (Node.js, Python)
