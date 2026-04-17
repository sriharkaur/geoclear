# Strategy Framework — User Guide

> Build business strategy with the rigor of a McKinsey Senior Partner.
> Ten analysis skills that build on each other — from SWOT foundation to 90-day execution plan.
> Strategy without context is generic. Every skill reads YOUR project first.

---

## What is this?

The Strategy Framework is a set of Claude Code skills for business analysis. Each skill runs a specific strategic analysis, reads your actual project files (CLAUDE.md, FEATURES.md) for context, and saves a dated report. The meta-orchestrator (`/strategy`) reads what's already been done, identifies gaps or stale analyses, and routes you to the right skill.

**This is not a template filler.** The skills act as a McKinsey Senior Partner who knows your business. They ask hard questions, push back on assumptions, and give you insights — not summaries of what you already told them.

---

## Quick Start

### Starting a strategy session (most common)
```
/strategy
```
Reads existing analyses, identifies the most important gap, explains why, and invokes the right skill.

### Running a specific analysis
```
/strategy-swot          ← always start here if nothing exists
/strategy-pricing       ← if you need to set or revisit pricing
/strategy-90day         ← if you need an execution plan
```

### Reviewing what strategy work exists
```
/strategy gap           ← shows missing analyses, no invocation
/strategy plan-only     ← shows the recommended sequence, no invocation
```

---

## The 10 Strategy Skills

Run them in this order for a new business. Each builds on the ones before it.

```
1. /strategy-swot           ← FOUNDATION — always first. What are you working with?
      ↓
2. /strategy-value-prop     ← Why do customers buy this? What pain does it solve?
3. /strategy-personas       ← Who are the customers? What do they care about?
      ↓
4. /strategy-competitors    ← Who else solves this problem? How do you compare?
5. /strategy-pricing        ← What should you charge? Requires: value-prop + competitors + personas
      ↓
6. /strategy-gtm            ← How do you reach customers? Requires: personas + pricing
7. /strategy-kpis           ← How do you measure progress? Requires: north-star + gtm
      ↓
8. /strategy-90day          ← What are you doing this quarter? Requires: all above
9. /strategy-breakeven      ← When do you become profitable? (run in parallel with above)
10. /strategy-pivot         ← Is the current strategy still right? (run when results stall)
```

---

## All Strategy Skills — What Each Does

| Skill | Question it answers | When to run |
|-------|-------------------|------------|
| `/strategy-swot` | What are our strengths, weaknesses, opportunities, threats? | First. Always. Foundation for everything else. |
| `/strategy-value-prop` | Why do customers buy this? What's the core promise? | Before GTM, pricing, or personas. |
| `/strategy-personas` | Who are our best customers? What do they care about most? | Before GTM and pricing. |
| `/strategy-competitors` | Who are we competing against? How do we compare? | Before pricing and positioning. |
| `/strategy-pricing` | What should we charge? What's the right model? | After value-prop + competitors + personas exist. |
| `/strategy-gtm` | How do we reach and acquire customers? | After personas + pricing exist. |
| `/strategy-kpis` | What metrics tell us if the strategy is working? | After north-star and GTM are defined. |
| `/strategy-90day` | What are we executing in the next 30/60/90 days? | When all foundations are in place. |
| `/strategy-breakeven` | How many customers / how much revenue to break even? | Anytime — especially pre-revenue. |
| `/strategy-pivot` | Is the current strategy still right? What are the alternatives? | When growth stalls or market shifts. |

---

## What `/strategy` Does (the meta-orchestrator)

`/strategy` is the intelligent entry point. When you run it:

1. **Reads** CLAUDE.md (business model, north star, current status), FEATURES.md, and all existing strategy files with their dates
2. **Identifies** what's missing and what's stale (analyses > 60 days old for a live business)
3. **Shows** a transparent plan with reasoning — e.g.:
   ```
   === /strategy SESSION PLAN ===
   Stage: live   North Star: $100K MRR
   
   Analyses complete: SWOT (2026-02-10 — 65 days old, STALE)
   Analyses missing:  value-prop, personas, competitors, pricing, gtm, kpis, 90day
   
   DECISIONS
   1. Run /strategy-swot [Rule 10] — existing SWOT is 65 days old; you've launched since then
   2. Run /strategy-value-prop [Rule 2] — no value prop exists; needed before pricing
   3. Run /strategy-pricing [Rule 5] — no pricing strategy; this is the most direct lever on MRR
   
   Primary question: "Why do customers pay for this vs. alternatives?"
   INVOKING: /strategy-swot
   ```
4. **Saves** the session plan to `strategy/STRATEGY-SESSION-{datetime}.md`

---

## Strategy Task Prompts

When `/strategy` recommends an analysis, each recommendation includes context the skill needs:
- Current business stage (pre-launch / beta / live / scaling)
- North-star metric and current progress
- What prior analyses concluded (so the new one builds on them)
- The specific question that needs answering

This ensures each analysis is grounded in your actual situation, not generic advice.

---

## Where Things Are Saved

Every strategy analysis saves a dated file. Nothing is lost between sessions.

| What | Where | Format |
|------|-------|--------|
| Strategy sessions | `strategy/` | `STRATEGY-SESSION-{YYYY-MM-DD-HH-MM-SS}.md` |
| Strategy index | `strategy/STRATEGY-INDEX.md` | table of all analyses with dates and conclusions |

The `strategy/STRATEGY-INDEX.md` is the single place to see all strategy work ever done on the project.

---

## Common Scenarios

### "We just launched — what strategy work should we do first?"
```
/strategy            ← it will route you: SWOT → value-prop → personas → competitors → pricing
```

### "We need to set pricing for a new tier"
```
/strategy-pricing    ← reads your existing SWOT + competitors + value-prop for context
```

### "Growth has stalled — should we pivot?"
```
/strategy-pivot      ← stress-tests current strategy, maps alternatives, gives verdict
```

### "Investor asks for a go-to-market plan"
```
/strategy-gtm        ← requires personas + pricing to exist first; creates full GTM document
```

### "What are our KPIs for this quarter?"
```
/strategy-kpis       ← turns north-star metric into weekly/monthly leading indicators
```

### "What strategy work is outdated?"
```
/strategy gap        ← shows every analysis with age, flags anything > 60 days
```

---

## Staleness Policy

| Business stage | Refresh threshold |
|---------------|-------------------|
| Pre-launch | 30 days |
| Live / active | 60 days |
| Stable / mature | 90 days |

`/strategy` automatically flags stale analyses and prioritizes refreshing the most critical ones first (SWOT before GTM, etc.).

---

## Integration with Dev Framework

Strategy and Dev are **peers** — neither calls the other. But they inform each other:

- A strategy session that identifies a new customer segment → run `/dev-requirements` to capture the product work
- A dev session where the product roadmap grows without clear direction → `/strategy` recommends running `/strategy-swot` or `/strategy-90day`
- Strategy outputs (personas, pricing) are input to `/dev-requirements` for feature prioritization

The master orchestrator for connecting them is in [FRAMEWORK.md](FRAMEWORK.md).
