# /strategy — Strategy Meta-Orchestrator

> Project-level intelligence layer for business strategy. Reads project state and existing strategy work, decides which strategy skills to invoke, in what sequence, and explains every decision with reasoning.
> Output: session plan shown to user + saved to `strategy/STRATEGY-SESSION-{YYYY-MM-DD-HH-MM-SS}.md`

---

## What this does

`/strategy` is the intelligent entry point for any strategy session. It reads the business context and all existing strategy analyses, identifies gaps or staleness, and routes to the right strategy skill with explicit reasoning.

Strategy without context is generic. This skill reads YOUR project first.

---

## Step 1 — Read full business and strategy context

Read ALL of the following:

```
CLAUDE.md                — business model, pricing, goals, current status, north star
FEATURES.md              — what is built (shapes GTM, value prop, competitive position)
QUEUE.md                 — what is being built (shapes 90-day plan)
RELEASES.md              — version history + release cadence
strategy/                — list all existing strategy files with their dates
```

If `strategy/` does not exist, note that no strategy work has been done.

For each existing strategy file found, extract:
- File name and date
- Key conclusion (read the first 10 lines of each file)

---

## Step 2 — Build strategy state snapshot

```
NORTH_STAR:           {from CLAUDE.md — e.g. "$100K MRR in 12 months"}
CURRENT_STATUS:       {from CLAUDE.md — live/pre-launch/beta/etc.}
ANALYSES_DONE:        [ list of strategy analyses with date completed ]
ANALYSES_MISSING:     [ strategy skills that have never been run ]
STALE_ANALYSES:       [ analyses older than 60 days ]
CRITICAL_GAP:         {most important missing analysis given current stage}
```

**Staleness threshold:** Any analysis > 60 days old for an active business is stale. > 30 days for pre-launch or rapidly changing markets.

---

## Step 3 — Apply decision rules (in priority order)

Work through these rules in order. The FIRST rule that fires is the primary recommendation.

**Rule 1 — No SWOT exists**
→ Recommend `/strategy-swot` first — always
Reasoning: SWOT is the foundation. Every other strategy analysis depends on knowing strengths, weaknesses, opportunities, threats. Nothing else is useful without it.

**Rule 2 — No value proposition exists**
→ Recommend `/strategy-value-prop`
Reasoning: Before GTM, pricing, or personas — you must know what you're selling and why customers buy it.

**Rule 3 — No customer personas exist**
→ Recommend `/strategy-personas`
Reasoning: GTM, pricing, and KPIs are all persona-specific. Generic strategies fail.

**Rule 4 — No competitor analysis exists**
→ Recommend `/strategy-competitors`
Reasoning: Pricing and positioning cannot be set without knowing the competitive landscape.

**Rule 5 — No pricing strategy exists**
→ Recommend `/strategy-pricing`
Reasoning: Revenue is existential. Pricing is the most direct lever on the north-star MRR goal.

**Rule 6 — No GTM plan exists**
→ Recommend `/strategy-gtm`
Reasoning: Features without a go-to-market plan don't reach customers.

**Rule 7 — No KPI dashboard exists**
→ Recommend `/strategy-kpis`
Reasoning: Can't improve what you can't measure. KPIs turn the north-star into actionable weekly metrics.

**Rule 8 — No 90-day plan exists**
→ Recommend `/strategy-90day`
Reasoning: Strategy without execution milestones is a wish list.

**Rule 9 — No break-even model exists and business is pre-revenue**
→ Recommend `/strategy-breakeven`
Reasoning: For pre-revenue, runway math is existential.

**Rule 10 — Stale analyses exist**
→ Recommend refreshing the most stale critical analysis
Reasoning: A SWOT from 3 months ago before product-market fit doesn't reflect current reality.

**Rule 11 — All analyses fresh**
→ Recommend `/strategy-pivot` (stress-test current strategy) or `/strategy-90day` (update execution plan)
Reasoning: When all bases are covered, the most valuable next step is pressure-testing the plan.

---

## Step 4 — Build orchestration plan

```
=== /strategy SESSION PLAN ===
Date:    {YYYY-MM-DD HH:MM}
Project: {project name}
Stage:   {pre-launch | beta | live | scaling}
North Star: {from CLAUDE.md}

STRATEGY STATE
  Analyses complete:  {count} — {list with dates}
  Analyses missing:   {count} — {list}
  Stale (>60 days):   {count} — {list}
  Critical gap:       {the one analysis that would unlock the most strategic clarity}

DECISIONS
  1. {Action} — [Rule {N}] {one-line reasoning}
  2. {Action} — [Rule {N}] {one-line reasoning}
  3. {Action} — [Rule {N}] {one-line reasoning}

RECOMMENDED SEQUENCE
  Step 1: {skill} — {what question it answers}
  Step 2: {skill} — {what question it answers}
  Step 3: {skill} — depends on Step 1-2 findings

STRATEGIC FOCUS:
  Primary question this session should answer: "{the most important question}"

INVOKING NOW: {first skill}
```

Show this plan to the user BEFORE invoking anything.

---

## Step 5 — Confirm and invoke

Show plan first. Ask: "Shall I run {first skill}? Or do you want to adjust the sequence?"

For `/strategy plan-only`: show plan only, do not invoke.

---

## Step 6 — Save session report

After the plan is shown (and after any invoked skill completes), save to:

```
strategy/STRATEGY-SESSION-{YYYY-MM-DD-HH-MM-SS}.md
```

Format:

```markdown
---
date: {YYYY-MM-DD HH:MM:SS}
triggered_by: /strategy
project: {project name}
stage: {pre-launch | beta | live | scaling}
north_star: {goal}
---

## Strategy State
{full state snapshot}

## Decision Log
{decisions with Rule citations and reasoning}

## Session Outcome
{which analyses were run, key conclusions from each}

## Strategic Priorities (updated)
1. {top priority with 1-line rationale}
2. {second priority}
3. {third priority}

## Next Session
{what gaps remain, what to tackle next}
```

Create `strategy/` directory if it does not exist.

---

## Invocation variants

```
/strategy               — full orchestration: read state → plan → confirm → invoke
/strategy plan-only     — read state → show plan → stop
/strategy refresh       — re-run the most stale critical analysis
/strategy <skill-name>  — run a specific strategy skill directly (e.g. /strategy swot)
/strategy gap           — show only what's missing, no invocation
```

---

## Dependency map (optimal sequence for a fresh project)

```
/strategy-swot          ← foundation — run first, always
     ↓
/strategy-value-prop    ← what you sell and why
/strategy-personas      ← who buys it
     ↓
/strategy-competitors   ← competitive landscape
/strategy-pricing       ← requires: value-prop + competitors + personas
     ↓
/strategy-gtm           ← requires: personas + pricing + value-prop
/strategy-kpis          ← requires: north-star + gtm + pricing
     ↓
/strategy-90day         ← requires: all of the above
/strategy-breakeven     ← financial model — can run in parallel with above
/strategy-pivot         ← run when existing strategy needs stress-testing
```

---

## Integration with /dev

`/strategy` and `/dev` are peers. Neither calls the other.

If a `/strategy` session produces insights that change product direction (e.g., pivot, new persona), the user should carry those into `/dev-requirements` to capture the resulting feature work.

If a `/dev` session reveals that the product roadmap is growing without strategic alignment, `/dev` will flag this and recommend running `/strategy`.
