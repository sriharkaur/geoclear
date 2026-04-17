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
