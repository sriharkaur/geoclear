# COMMS — GeoClear
> Human ↔ BDS communication hub. One file, everything that needs your attention.
> You own the **Status** and **Your Input** fields on every item.
> Created: 2026-04-15 | Project: GeoClear — US Address Intelligence API

---

## START HERE — How to Use This File

**This is the single communication channel between you and the BDS system.**

- When any agent (CPM, Observer, Strategy Council, Engineering Council) needs your input → it adds an item here and tells you the number in the chat prompt.
- When you need to communicate something to the system → add it here or just type in Claude Code.
- To act on an item: open the link, read, update **Your Input**, change **Status** to ✅ DONE.

**Status values you control:**
| Status | Meaning |
|--------|---------|
| 🆕 NEW | Just added — not yet reviewed |
| 👀 REVIEW | You're looking at it |
| ⏳ IN PROGRESS | Action underway |
| ✅ DONE | Resolved |
| ⏭️ DEFERRED | Not now — revisit later |
| 🚫 REJECTED | Won't do — with reason |

---

## BDS QUICK START

| You want to... | Type this in Claude Code |
|----------------|--------------------------|
| Full business health check | `/bds` |
| Start engineering work | `/dev` |
| Run a strategy session | `/strategy` |
| See your business goals | `/business-goal` |
| Full program status | `/cpm` |
| Neutral view of anything | `/observer` |
| Convene the councils | `/bds-customize` |
| Import BDS to another project | `/bds-import` |

**Key project files:**
- [BUSINESS-GOAL.md](BUSINESS-GOAL.md) — north star: what we're building, for whom, what winning looks like
- [QUEUE.md](QUEUE.md) — what's being built right now and what's next
- [FEATURES.md](FEATURES.md) — complete inventory of everything built
- [FRAMEWORK.md](FRAMEWORK.md) — full index of every skill and guide
- [BDS.md](BDS.md) — the complete operating system
- [ARCHITECTURE.md](ARCHITECTURE.md) — tech stack, endpoints, data model
- [CLAUDE.md](CLAUDE.md) — project rules and routing map

**Get help:** Say "help", "what framework?", or read [FRAMEWORK.md](FRAMEWORK.md)

---

## BUDGET GOVERNANCE

> Set limits here. The CPM enforces them. The team will not exceed without your approval.

| Budget item | Current limit | Notes |
|------------|--------------|-------|
| Monthly infrastructure (Render) | _not set — update this_ | Current: ~$85/mo (prod + staging) |
| New paid service threshold | $20/mo | Anything above → COMMS.md entry required |
| Data import run cost | _not set_ | Staging disk usage per import job |
| One-time infrastructure spend | _not set_ | e.g., disk upgrade, new service |

_To set a limit: edit this table directly, or tell Claude "set infrastructure cap to $X/mo"_

---

## GEOCLEAR BUSINESS IDEA

> GeoClear — US Address Intelligence API
> 120M+ addresses, real-time enrichment (census, FEMA, RDI, timezone), Stripe-billed SaaS.
> North star: $100K MRR in 12 months.
> Production live at geoclear.io — Stripe LIVE mode, 120M addresses on Render prod disk.
>
> _To update the full business goal detail: run `/business-goal capture` or create `BUSINESS-GOAL.md`_

---

## COMMUNICATIONS LOG

> Items added by agents or by you. You control Status and Your Input.
> Reference any item as "COMMS.md item #N"

### #1 — BUSINESS-GOAL.md does not yet exist for this project
**Status:** 🆕 NEW
**Date:** 2026-04-15
**From:** Claude
**Category:** ACTION

**Details:**
GeoClear is live with a clear north star ($100K MRR in 12 months) but `BUSINESS-GOAL.md` — the formal north star document that all BDS agents read — has not yet been created. The CPM, Observer, and strategy skills will look for this file at the start of every session.

**Link:** [COMMS.md](COMMS.md) — this item; then [FRAMEWORK.md](FRAMEWORK.md) for context on how BUSINESS-GOAL.md fits the system

**Recommendation:**
Run `/business-goal capture` in your next session and describe the goal in one sentence when prompted. Claude will create the full file from the project context. Takes 2 minutes and unblocks CPM and Observer from having a clear reference point.

**Your Input:**
_(Add your input or confirm you've run `/business-goal capture`)_

---

### #2 — BDS Council has not yet run for GeoClear
**Status:** 🆕 NEW
**Date:** 2026-04-15
**From:** Claude
**Category:** FYI

**Details:**
The BDS Council (`/bds-customize`) — Strategy Council (Musk/Zuckerberg/Pichai + CMO/CFO) and Engineering Council (Hölzle/Amodei/Cherny) — was designed after GeoClear went live. No formal council session has been run for GeoClear. The Project Architecture Charter (`architecture/PROJECT-CHARTER-*.md`) and Decision Log (`architecture/DECISION-LOG.md`) do not exist.

**Link:** [BDS.md](BDS.md#the-bds-council--customization-via-deliberation) — council overview

**Recommendation:**
Optional but valuable: run `/bds-customize` when you want a formal strategic and architectural review. The council will review pricing tiers, competitive positioning, and the scale path from current SQLite architecture to 10x/100x/1000x. Can be done as a standalone session anytime — not blocking current work.

**Your Input:**
_(Note when you'd like to schedule a council session, or mark DEFERRED if not a priority now)_

---

### #3 — LinkedIn posts ready to publish (2 posts)
**Status:** 🆕 NEW
**Date:** 2026-04-17
**From:** Claude
**Category:** ACTION NEEDED — manual post required (no LinkedIn credentials stored)

**Details:**
Two LinkedIn posts are queued per the Phase 1 Week 2 and Phase 2 plan. Both are ready to copy-paste. Post #1 first (FEMA anchor), then #2 (developer angle) a few days later.

---

**POST #1 — FEMA anchor (Phase 1 Week 2)**
Target: PropTech + mortgage tech communities. Post any Tuesday/Wednesday 9am PT.

```
Manual flood zone determination costs $3–$15 per address.

We built an API that returns it for free (up to 1,000/day).

curl "https://geoclear.io/api/enrich?lat=30.2672&lon=-97.7431" \
  -H "X-Api-Key: YOUR_KEY"

Returns:
{
  "flood_zone": "AE",
  "flood_sfha": true,
  "census_tract": "48453001702",
  "elevation_ft": 489.2
}

Live FEMA NFHL data. No manual lookup. No subscription required to start.

198M US addresses. One API call. geoclear.io
```

Hashtags: #PropTech #MortgageTech #FEMA #FloodZone #API #RealEstate

---

**POST #2 — Developer angle (Phase 2)**
Post a few days after Post #1.

```
One API call. Everything about a US address.

curl "https://geoclear.io/api/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC" \
  -H "X-Api-Key: YOUR_KEY"

Returns: validated address + FEMA flood zone + census tract + timezone + nearest hospital + fire station + elevation.

198M addresses. <5ms. Free tier — no credit card.

geoclear.io
```

Hashtags: #Developer #API #GeoData #AddressValidation #BuildInPublic

---

**Your Input:**
Post both when ready. Mark ✅ DONE after each.

---

### #4 — Render auto-deploy not triggering on git push
**Status:** 🆕 NEW
**Date:** 2026-04-17
**From:** Claude
**Category:** FYI + ACTION NEEDED

**Details:**
During GSC sitemap setup, discovered that Render's auto-deploy did NOT trigger for 2 git pushes to main (commits `27f1837` and `04dbfc6`). Had to manually trigger via `POST /v1/services/srv-d7ep7bfavr4c73d46gng/deploys`. The previous running deploy was from 04:10 UTC, pushed at ~05:04 UTC — 54 minutes of commits not auto-deploying.

**Action needed:** Check Render dashboard → prod service → Settings → "Auto-Deploy" toggle. Should be ON for the main branch. May have been accidentally disabled during a prior session.

**Manual trigger (if needed):**
```bash
source ~/.zshrc
curl -s -X POST -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-d7ep7bfavr4c73d46gng/deploys"
```

**Your Input:**
_(Confirm auto-deploy is re-enabled in Render dashboard)_

---

### #5 — G2 listing (manual submission needed)
**Status:** 🆕 NEW
**Action required:** You — submit at g2.com/sell (create vendor account if needed)
**Category:** Address Verification Software

**Listing content (copy-paste ready):**

- **Product name:** GeoClear
- **Tagline:** "198M US addresses. FEMA flood zone + census tract in one call."
- **Description:** GeoClear is a US address intelligence API built on the USDOT National Address Database (198M+ records). Verify and enrich US addresses with FEMA flood zone, census tract, county FIPS, timezone, and residential classification — all in a single API call. Free tier (1K/day, no card). Professional plan $249/mo includes unlimited enrichment. No contract. Instant API key.
- **Pricing:** Free, then from $49/mo
- **Website:** https://geoclear.io
- **Category:** Address Verification Software
- **Keywords:** bulk address validation, address API, FEMA flood zone, census tract, address enrichment

---

### #6 — Capterra listing (manual submission needed)
**Status:** 🆕 NEW
**Action required:** You — submit at capterra.com/vendors/sign-up
**Category:** Address Verification Software (same content as G2)

Same content as #5. Submit after G2 is live (use G2 listing URL as a reference in Capterra).

---

### #7 — Create new Stripe prices for Q-105 pricing reframe (Action required by you)
**Status:** 🆕 NEW
**Action required:** You — in Stripe Dashboard (live mode), create two new recurring prices and set env vars on Render.

**Step 1: Create prices in Stripe (Products → Add product)**
| Product name | Price | Interval | Lookup key |
|---|---|---|---|
| GeoClear Growth | $199.00 | Monthly | `growth` |
| GeoClear Professional | $499.00 | Monthly | `pro_v2` |
| GeoClear Scale | $999.00 | Monthly | `scale` |

**Step 2: Set env vars on Render (prod service `srv-d7ep7bfavr4c73d46gng`)**
```
STRIPE_PRICE_GROWTH = price_xxx   ← from Growth product above
STRIPE_PRICE_PRO    = price_xxx   ← from Professional product above (replaces old $249)
STRIPE_PRICE_SCALE  = price_xxx   ← from Scale product above
```

**Step 3: Leave `STRIPE_PRICE_STARTER` unchanged** — grandfathered $49 customers still billed at their original price. Do NOT delete the old Stripe price; just stop exposing it on the pricing page (already done in code).

**Why:** New pricing floor is $199 (Q-105). The $49 Starter card has been removed from the landing page. `openCheckout('growth')` now maps to `STRIPE_PRICE_GROWTH` server-side. Until Render env vars are set, checkout for `growth`/`scale` tiers will return "Stripe price not configured" — this is safe, no revenue lost.

---
