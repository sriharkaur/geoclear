# RUNBOOK-ENV-VARS — Environment Variable Audit Checklist
_Last updated: 2026-04-17 (Q-144 + Q-145)_

Run this checklist **before every cache-clear deploy** and **before any new service creation**.
A missing required variable = **deploy abort**. Do not proceed.

---

## When to Run

| Trigger | Checklist to run |
|---------|-----------------|
| New Render service creation | Full checklist — both services |
| Cache-clear deploy (prod or staging) | Service-specific checklist + Node version check |
| `node` version bump | Node version check + cache-clear test on staging first |
| Native addon version bump (`better-sqlite3`) | Node version check + cache-clear test on staging first |
| Any infrastructure change | Full checklist |

---

## Service: Prod (`srv-d7ep7bfavr4c73d46gng` · geoclear.io)

### Required env vars — ABORT if any are missing

| Variable | Required Value | Notes |
|----------|---------------|-------|
| `DATA_DIR` | `/data` | Points to Render persistent disk. Missing = SQLITE_CANTOPEN on every request. |
| `NAD_ADMIN_SECRET` | (secret, min 20 chars) | Admin endpoint auth gate. |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Must be LIVE key in prod. Never test key. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook signature verification. Missing = all Stripe events rejected. |
| `STRIPE_PRICE_STARTER` | `price_...` (live) | $49/mo tier. |
| `STRIPE_PRICE_PRO` | `price_...` (live) | $249/mo tier. |
| `STRIPE_METER_ID` | `mtr_...` | Pay-as-you-go metered billing. |
| `NAD_BASE_URL` | `https://geoclear.io` | Used in redirect URLs and email links. |
| `NAD_ALLOWED_ORIGINS` | `https://geoclear.io` | CORS whitelist. Missing = browser API calls blocked. |
| `NODE_VERSION` | `20` | Render build pin. Must match `"engines": {"node": "20.x"}` in package.json. |

### Verify Node pin before cache-clear deploy

```bash
# In Render dashboard → prod service → Environment → check NODE_VERSION=20
# Also confirm package.json engines field:
grep '"node"' package.json
# Expected: "node": "20.x"
```

**Rule**: Any `node` or `better-sqlite3` version bump requires a cache-clear test deploy on **staging** first.
If staging passes, then deploy to prod. Never skip this step — ABI mismatch causes native addon crash on startup.

---

## Service: Staging (`srv-d7f6rh58nd3s73cve8dg` · geoclear-staging.onrender.com)

### Required env vars

| Variable | Required Value | Notes |
|----------|---------------|-------|
| `DATA_DIR` | `/data` | 100GB disk for data imports. |
| `NAD_ADMIN_SECRET` | (secret) | Staging admin access. |
| `NODE_VERSION` | `20` | Must match prod. |

### Not required on staging

- Stripe keys: staging is data-import-only, not customer-facing.
- `NAD_BASE_URL`, `NAD_ALLOWED_ORIGINS`: not needed for data work.

---

## Optional / Override vars (both services)

| Variable | Default | Override when |
|----------|---------|---------------|
| `NAD_DB` | `$DATA_DIR/nad.db` | Non-standard DB path (e.g. local dev) |
| `PORT` | `4001` | Render sets this automatically — do not override |

---

## Local Dev

For local dev, use `data/dev.db` (572MB, ~20K addrs/state):

```bash
NAD_DB=data/dev.db node web-server.js
```

The `NAD_ADMIN_SECRET` defaults to `nad_admin_localdev` when not set. Never use a real secret locally.

---

## Audit Procedure — Before Cache-Clear Deploy

1. Open Render dashboard → service → **Environment** tab.
2. Check every required var in the table above is present and non-empty.
3. Confirm `NODE_VERSION=20` is set.
4. Confirm `package.json` has `"engines": { "node": "20.x" }` — run `grep '"node"' package.json`.
5. If any variable is missing: **STOP**. Add the missing var, save, then proceed.
6. If `node` or `better-sqlite3` version changed: deploy to **staging first**, verify startup logs show `[startup] nad.db: ✓ ready` and `[startup] risk.db: ready`, then deploy to prod.
7. After deploy: run smoke test:

```bash
curl https://geoclear.io/api/health
# Expected: {"status":"ok"} or similar
```

---

## Failure Mode Reference

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| `SQLITE_CANTOPEN` on all requests | `DATA_DIR` missing or wrong | Set `DATA_DIR=/data` in Render env vars |
| All risk endpoints return `risk_data_unavailable` | risk.db not on disk | Run staging import pipeline, upload-chunk, merge |
| Stripe webhooks return 400 | `STRIPE_WEBHOOK_SECRET` missing | Add to Render env vars; restart service |
| CORS error in browser | `NAD_ALLOWED_ORIGINS` missing | Add `https://geoclear.io` to env var |
| Admin endpoints return 401 | `NAD_ADMIN_SECRET` missing | Add to Render env vars |
| Native addon crash at startup | Node version mismatch (ABI) | Set `NODE_VERSION=20`, trigger cache-clear deploy on staging first |
