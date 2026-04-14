# GeoGlear Session Handoff
**Date: 2026-04-13**

---

## What This Project Is

GeoClear is an address intelligence API product built on the National Address Database (NAD).
- 96M+ US addresses (Overture Maps fill complete for FL, MI, NJ, NV, NH)
- REST API + MCP server + web portal with Stripe billing
- Domain: **geoclear.io** (managed on Cloudflare)

**Data lives at:** `/Users/shaileshbhujbal/Projects/Syntheticdata/nad/data/` (131GB — symlinked as `data/`)

---

## What Was Done This Session (2026-04-13)

### DNS Migration: GoDaddy → Cloudflare

All three domains moved to Cloudflare DNS management:

#### axiomprotocol.ai
- Zone added to Cloudflare
- 6 Clerk/SendGrid CNAMEs added (DNS-only, no proxy):
  - `60833585.support.dgn` → `sendgrid.net`
  - `accounts.dgn` → `accounts.clerk.services`
  - `clerk.dgn` → `frontend-api.clerk.services`
  - `clk._domainkey.dgn` → `dkim1.z6ivlgkka23h.clerk.services`
  - `clk2._domainkey.dgn` → `dkim2.z6ivlgkka23h.clerk.services`
  - `clkmail.dgn` → `mail.z6ivlgkka23h.clerk.services`
- 2 junk GoDaddy records deleted (`_domainconnect`, `pay`)
- GoDaddy nameservers updated → `christina.ns.cloudflare.com` / `sage.ns.cloudflare.com`
- **Auto-renew: OFF** | **Transfer lock: ON** | **Expires: Jan 13, 2028**

#### auduu.ai
- Nameservers already on Cloudflare from prior session
- **Auto-renew: OFF** | **Transfer lock: ON** | **Expires: Feb 25, 2027**

#### auduu.com
- **Registrar transfer initiated → Cloudflare** ($10.46, card ending 3651)
- Transfer in progress — GoDaddy will send confirmation email (5–7 days)

### Cloudflare Account
- Account ID: `fbc518355420fff3877a44585c282f19`
- Nameservers: `christina.ns.cloudflare.com` / `sage.ns.cloudflare.com`

---

## Auth Codes (Valid 30 days from 2026-04-13)

| Domain | Auth Code | Transfer Status |
|--------|-----------|----------------|
| auduu.com | `WD]8[J617F694E30` | ✅ Transfer initiated to Cloudflare |
| auduu.ai | `qEO[X]FqD{2Cw06j` | ⏸ Not transferring (auto-renew off, lock on) |
| axiomprotocol.ai | `2e^:$I36I4a74kB0` | ⏸ Not transferring (auto-renew off, lock on) |

---

## Project Structure

```
geoclear/
├── api-server.js         # REST API (Express) — main server
├── web-server.js         # Web portal + Stripe billing
├── mcp-server.js         # MCP server for Claude/AI agents
├── geocode.js            # Geocoding logic
├── enrich.js             # Address enrichment (census, FEMA, etc.)
├── query.js              # DB query helpers
├── keys.js               # API key management
├── schema.sql            # SQLite schema
├── init-db.js            # DB initialization
├── overture-import.js    # Overture Maps importer
├── overture-dedup.js     # Deduplication
├── overture-phase2.js    # Phase 2 enrichment
├── download.js           # NAD download utility
├── demo.js               # Demo/test scripts
├── public/               # Frontend (landing.html, portal.html, status.html)
├── docs/                 # API guide, systems guide, user guide
├── data -> [symlink]     # 131GB data at ../Syntheticdata/nad/data/
│   ├── nad.db            # Main SQLite database
│   ├── keys.db           # API keys database
│   └── ...
├── LAUNCH-CHECKLIST.md   # Step-by-step deployment checklist
├── AddressQueue.md       # Full product + business backlog (59 items, T0–T4)
├── AddressArchitecture.md
├── AddressAPIBusinessGTM.md
├── AddressBusinessCases.md
└── SESSION-HANDOFF.md    # This file
```

---

## Immediate Next Steps (from LAUNCH-CHECKLIST.md)

1. **Set admin secret** — change `nad_admin_localdev` before deploying
2. **Stripe setup** — create Starter ($49) + Pro ($249) products, set env vars
3. **Deploy to Render** — push to GitHub, create Web Service on Render
4. **Set env vars on Render:**
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_PRO=price_...
   NAD_BASE_URL=https://geoclear.io
   NAD_ALLOWED_ORIGINS=https://geoclear.io
   NAD_ADMIN_SECRET=<random 32 hex>
   ```
5. **Point geoclear.io DNS** — Add Cloudflare DNS record pointing to Render service URL

---

## Product Backlog Summary (see AddressQueue.md for full detail)

| Tier | Focus | Status |
|------|-------|--------|
| T0 | Fill FL/MI/NJ + Overture + confidence score + fuzzy match | Overture done ✅; others pending |
| T1 | Census tract, FEMA flood, autocomplete, Stripe billing, API keys | Stripe + keys done ✅ |
| T2 | SDKs, SOC 2, enterprise features | Not started |
| T3 | CASS cert, NCOA, international | Not started |

**North Star:** $100K MRR within 12 months (20 Scale customers or 2 Enterprise accounts)

---

*Moved from `/Users/shaileshbhujbal/Projects/Syntheticdata/nad/` on 2026-04-13*
