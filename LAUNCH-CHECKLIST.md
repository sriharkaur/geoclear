# NAD Address API — Launch Checklist
**Last updated: 2026-04-13**

---

## Session Summary — What Was Built

| # | What | Status |
|---|---|---|
| 1 | Per-key rate limiting (req/min + daily quota) in `web-server.js` | ✅ Done |
| 2 | API key auth enforced on all `/api/*` routes (except health/stats/states) | ✅ Done |
| 3 | Stripe Checkout endpoints (`POST /v1/checkout`, webhook, session poll) | ✅ Done |
| 4 | Self-serve pricing UI in `portal.html` (Starter $49, Pro $249) | ✅ Done |
| 5 | API keys hashed at rest (SHA-256, prefix-only stored in DB) | ✅ Done |
| 6 | Admin secret uses `crypto.timingSafeEqual()` — timing attack closed | ✅ Done |
| 7 | CORS + `X-Content-Type-Options` + `X-Frame-Options` headers | ✅ Done |

---

## YOUR IMMEDIATE NEXT STEPS (in order)

### Step 1 — Change the default admin secret (5 min)
The default `nad_admin_localdev` is hardcoded and public. Set it before anything else.

```bash
# Add to your shell profile or Render env vars
export NAD_ADMIN_SECRET="$(openssl rand -hex 32)"
echo $NAD_ADMIN_SECRET   # save this somewhere safe
```

---

### Step 2 — Set up Stripe (30–60 min)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → **Products**
2. Create two recurring products:
   - **NAD Starter** — $49/month recurring → copy the **Price ID** (`price_xxx`)
   - **NAD Pro** — $249/month recurring → copy the **Price ID** (`price_xxx`)
3. Go to **Developers → Webhooks** → Add endpoint:
   - URL: `https://your-domain.com/v1/webhook/stripe`
   - Events: `checkout.session.completed`
   - Copy the **Webhook signing secret** (`whsec_xxx`)
4. Go to **Developers → API keys** → copy **Secret key** (`sk_live_xxx`)

```bash
# Set these env vars (Render dashboard or local .env)
export STRIPE_SECRET_KEY="sk_live_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
export STRIPE_PRICE_STARTER="price_..."
export STRIPE_PRICE_PRO="price_..."
export NAD_BASE_URL="https://your-domain.com"
export NAD_ALLOWED_ORIGINS="https://your-domain.com"
```

---

### Step 3 — Deploy to Render (1–2 hours)

1. Push this repo to GitHub if not already there
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect the repo, set:
   - **Build command**: `npm install`
   - **Start command**: `node nad/web-server.js`
   - **Port**: `4001`
4. Add all env vars from Step 1 + Step 2 in the Render dashboard
5. Note the Render URL (`https://xxxx.onrender.com`) → set as `NAD_BASE_URL`
6. Add a custom domain if you have one

---

### Step 4 — Wire up real status monitoring (15 min)

[uptimerobot.com](https://uptimerobot.com) — free plan covers this:

1. Create monitor → HTTP(S) → `https://your-domain.com/api/health`
2. Alert on: 2 consecutive failures
3. Update `nad/public/status.html` to embed the UptimeRobot public status page URL
   (currently shows hardcoded green bars — not live)

---

### Step 5 — Test the full Stripe payment flow (30 min)

Use Stripe test mode first (`sk_test_...` keys):
1. Hit `https://your-domain.com/portal.html`
2. Click **Subscribe — $49/mo** → enter email → redirected to Stripe
3. Use test card `4242 4242 4242 4242` / any future date / any CVC
4. Confirm redirect back to portal with API key displayed
5. Test the key: `curl -H "X-Api-Key: nad_starter_..." https://your-domain.com/api/address?street=Main&state=TX`
6. Switch to live keys when happy

---

### Step 6 — Send first 3 outreach emails (Week 2 GTM)

Target: mortgage tech companies (LOS vendors, POS platforms).
Template is in [AddressAPIBusinessGTM.md](../AddressAPIBusinessGTM.md) → Week 2 section.

---

## Known Gaps (not blockers, do after revenue)

| Gap | Notes |
|---|---|
| `status.html` shows fake uptime bars | Wire to UptimeRobot public API (Step 4) |
| No `/docs` page | Devs can't self-onboard; use readme.io or Mintlify |
| No email on key delivery | Stripe confirmation email covers this for now |
| No key rotation endpoint | Customers can't rotate without contacting you |
| No org/team key management | Irrelevant until enterprise customers arrive |
| MI addresses missing `post_city` in some rows | Spot-check quality before marketing to MI customers |
| Free tier has no auth gate on landing page demo | Demo widget calls open endpoints — intentional |

---

## Env Var Reference

| Variable | Required | Example |
|---|---|---|
| `NAD_ADMIN_SECRET` | ✅ Yes (change default!) | `openssl rand -hex 32` output |
| `STRIPE_SECRET_KEY` | ✅ For payments | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ For payments | `whsec_...` |
| `STRIPE_PRICE_STARTER` | ✅ For payments | `price_...` |
| `STRIPE_PRICE_PRO` | ✅ For payments | `price_...` |
| `NAD_BASE_URL` | ✅ For Stripe redirects | `https://your-domain.com` |
| `NAD_ALLOWED_ORIGINS` | Recommended | `https://your-domain.com` |

---

## Architecture State (as of 2026-04-13)

```
nad/
├── web-server.js       ← Express API + UI server (port 4001)
│   ├── Auth: API key required on all /api/* (except health/stats/states)
│   ├── Rate limit: per-key sliding window (tier limits from keys.js)
│   ├── Daily quota: checked on every request
│   ├── Stripe: /v1/checkout + /v1/webhook/stripe + /v1/checkout/session/:id
│   └── CORS: locked to NAD_ALLOWED_ORIGINS in prod
├── keys.js             ← Key store (SQLite)
│   ├── Keys: SHA-256 hashed, prefix-only stored
│   ├── Tiers: free (1K/day), starter (50K/day), pro (500K/day)
│   └── Stripe sessions: stored in stripe_sessions table
├── public/
│   ├── portal.html     ← Self-serve pricing + admin key management
│   ├── landing.html    ← Marketing page
│   ├── index.html      ← Address explorer (Leaflet map)
│   └── status.html     ← Status page (needs UptimeRobot wiring)
└── data/
    ├── nad.db          ← 120M US addresses (~50GB)
    └── keys.db         ← API keys + stripe sessions
```

---

## Security Posture (as of 2026-04-13)

| Control | Status |
|---|---|
| API key required on all data endpoints | ✅ |
| Keys hashed at rest (SHA-256) | ✅ |
| Admin secret timing-safe comparison | ✅ |
| Per-key rate limiting (req/min) | ✅ |
| Daily quota enforcement | ✅ |
| CORS restricted in production | ✅ (set NAD_ALLOWED_ORIGINS) |
| HTTPS | ✅ (Render provides TLS) |
| Stripe webhook signature verification | ✅ |
| No SQL injection (parameterised queries throughout) | ✅ |
| Admin brute-force lockout | ❌ Not implemented |
| Key expiry / auto-rotation | ❌ Not implemented |
| Audit log for admin actions | ❌ Not implemented |
