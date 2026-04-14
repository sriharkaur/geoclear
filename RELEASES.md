# GeoClear — Release Notes
> Append-only. Each release gets a section. Newest at top.
> Versioning: MAJOR.MINOR.PATCH (semver)
>   MAJOR — breaking API changes
>   MINOR — new features, new endpoints
>   PATCH — bug fixes, internal changes

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
- **`metered` tier** — $0.001/lookup, no daily cap, tracked via `metered_unreported` column
- `POST /v1/admin/metered/flush` — bulk-reports metered usage to Stripe Billing Meters API
- Stripe Billing Meter (`geoclear_lookup` event) created in test mode
- Signup rate limiter — 5 attempts / hour / IP to prevent abuse
- `keys.findByEmail()` — prevents duplicate free keys per email
- `keys.upgradeTier()` — idempotent tier upgrade with Stripe customer/subscription ID storage
- `keys.downgradeBySubscription()` — cancellation handler
- `keys.getMeteredKeysWithUsage()` / `keys.markMeteredFlushed()` — metered flush helpers

### Pricing tiers live
| Tier | Price |
|---|---|
| free | $0 |
| starter | $49/mo |
| pro | $249/mo |
| metered | $0.001/lookup |

### Stripe test mode
- Products: Starter, Growth, Scale, Pay-as-you-go
- Prices: `STRIPE_TEST_PRICE_STARTER`, `STRIPE_TEST_PRICE_PRO`, `STRIPE_TEST_PRICE_METERED`
- Meter: `STRIPE_TEST_METER_ID`
- Webhook: registered at `https://geoclear.io/v1/webhook/stripe`

### Data
- 120M+ addresses (NAD r22)
- Overture gap-fill: FL, MI, NJ, NV, NH

### Known gaps (next release)
- Metered flush not yet wired to Render cron
- No email delivery of API keys post-signup
- `customer.subscription.updated` webhook not handled
- `invoice.payment_failed` not handled (no dunning)
- Live Stripe keys still PLACEHOLDER (test mode only)

---

## Unreleased
> Features merged to main but not yet cut into a version.

_(none)_
