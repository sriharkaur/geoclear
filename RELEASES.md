# GeoClear — Release Notes
> Append-only. Each release gets a section. Newest at top.
> Versioning: MAJOR.MINOR.PATCH (semver)
>   MAJOR — breaking API changes
>   MINOR — new features, new endpoints
>   PATCH — bug fixes, internal changes

---

## Unreleased
> Features merged to main but not yet cut into a version.

- Stripe **live mode** fully wired: `sk_live_...`, `whsec_live_...`, live price IDs for Starter / Growth / Pay-as-you-go
- Metered billing live: `STRIPE_METER_ID` + `STRIPE_PRICE_METERED` set to live Stripe Billing Meter (`mtr_61UVWpc...`, event `geoclear_lookup`)
- Fix: metered tier checkout session omits `quantity` (required by Stripe for metered prices)
- `GET /privacy` and `GET /terms` — Privacy Policy and Terms of Service pages

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
