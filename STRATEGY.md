# GeoClear — Strategy Skills Reference

10 strategic analysis skills, all pre-loaded with GeoClear context.
Available globally across all Claude Code projects — no setup needed per project.

---

## How skills work in Claude Code

Skills are slash commands stored as `.md` files. When you type `/strategy-swot`, Claude Code:
1. Finds the matching file in `~/.claude/skills/strategy-swot.md` (or the project's `.claude/skills/`)
2. Loads it as a prompt with all context pre-filled
3. Runs the analysis immediately — no bracket-filling needed

**To invoke any skill**: type `/` followed by the skill name in the Claude Code chat.

```
/strategy-swot
/strategy-gtm
/strategy-personas
... etc.
```

You can also append a focus hint after invoking:
```
/strategy-competitors   focus on SmartyStreets and pricing comparison
/strategy-gtm           assume zero paid budget, content-only channels
/strategy-pivot         traction problem: free users aren't converting after 30 days
```

---

## Where the skills live

| Location | Path | Scope |
|----------|------|-------|
| Global (active) | `~/.claude/skills/strategy-*.md` | Available in **every** Claude Code project on this machine |
| Project copy | `.claude/skills/strategy-*.md` | GeoClear-specific backup; project skills override global if names match |

The global copy is what makes these work automatically in any new project — no manual setup required.

**To update a skill**: edit the file in `~/.claude/skills/` (changes apply globally) or in `.claude/skills/` (project-only). Keep both in sync when making content changes.

```bash
# Edit global copy
code ~/.claude/skills/strategy-gtm.md

# Sync project copy to global after edits
cp ~/.claude/skills/strategy-*.md /path/to/project/.claude/skills/
```

---

## Quick-pick by situation

| You need to... | Use |
|----------------|-----|
| Understand GeoClear's position and what to do in 30 days | `/strategy-swot` |
| Know who competitors are and where to outmaneuver them | `/strategy-competitors` |
| Define who to sell to first | `/strategy-personas` |
| Sharpen the pitch, landing page, and positioning | `/strategy-value-prop` |
| Build the GTM motion from zero | `/strategy-gtm` |
| Set up metrics to track progress to $100K MRR | `/strategy-kpis` |
| Validate or optimize current pricing tiers | `/strategy-pricing` |
| Model the financial path to $100K MRR | `/strategy-breakeven` |
| Build a 90-day operating plan as solo founder | `/strategy-90day` |
| Traction has stalled — need to consider a pivot | `/strategy-pivot` |

---

## All skills

### `/strategy-swot`
**When to use**: Start of a new strategic planning cycle, quarterly review, or whenever you need a crisp "where we stand and what to do next."
**Output**: Full SWOT + TOWS matrix + top 5 priorities for the next 30 days + 3-sentence executive summary.
**Invoke**: `/strategy-swot` — no additional input needed.
**Source**: McKinsey Senior Partner SWOT methodology

---

### `/strategy-competitors`
**When to use**: Before GTM decisions, before pricing changes, when a competitor ships something new, or when you're losing deals.
**Output**: Market map (leaders/challengers/niche/declining) + comparison table for top 5 players + battlefield analysis + white space + 3 outperformance strategies.
**Invoke**: `/strategy-competitors` or `/strategy-competitors focus on [specific competitor]`
**Source**: BCG competitive intelligence methodology

---

### `/strategy-personas`
**When to use**: Before writing any marketing copy, before GTM planning, before building a sales motion. Also when conversion is low and you don't know why.
**Output**: 3 buyer personas — demographics, psychographics, jobs-to-be-done, purchase triggers/blockers, channels, and the message that closes the deal.
**Invoke**: `/strategy-personas` or `/strategy-personas focus on [logistics/proptech/fintech] buyer`
**Source**: CMO persona methodology grounded in behavioral psychology

---

### `/strategy-value-prop`
**When to use**: Before rewriting the landing page, before any paid acquisition, when demos aren't converting, or when you can't explain GeoClear in one sentence.
**Output**: Positioning diagnosis + anatomy of the customer's problem + Strategyzer value proposition + 3 proof points + 3 tagline versions + website hero copy (H1/H2/CTA).
**Invoke**: `/strategy-value-prop` — output is ready to paste into the landing page.
**Source**: Strategyzer value proposition canvas + CSO positioning methodology

---

### `/strategy-gtm`
**When to use**: When you're ready to move beyond "product is live" to actually acquiring customers. Run before any marketing spend.
**Output**: GTM narrative + motion type recommendation (PLG/SLG/hybrid) + ICP prioritization + channel/budget split + 4-week content plan + KPI dashboard + Plan B scenarios.
**Invoke**: `/strategy-gtm` or `/strategy-gtm assume $500/mo budget`
**Source**: VP of Growth PLG/SLG launch methodology

---

### `/strategy-kpis`
**When to use**: When you need to know what to measure and how to review it. Run once early, revisit quarterly.
**Output**: North Star metric + 7 causally-linked KPIs (CAC, LTV, LTV/CAC, churn, activation, MRR/NRR, API volume) + daily/weekly/monthly review cadence + measurement traps.
**Invoke**: `/strategy-kpis` — output gives you a dashboard spec to implement in a spreadsheet or BI tool.
**Source**: Chief Analytics Officer KPI system design

---

### `/strategy-pricing`
**When to use**: When conversion from free → paid is low, when ARPU is lower than expected, or when planning a price change.
**Output**: Pricing position audit + value economics (ROI analysis) + tier structure evaluation + psychological anchoring techniques + 3 A/B pricing experiments.
**Invoke**: `/strategy-pricing` — current tiers (Free/Starter/Growth/Scale) are pre-loaded.
**Source**: Pricing Strategist / Good-Better-Best tier methodology

---

### `/strategy-breakeven`
**When to use**: When you need to model what "hitting $100K MRR" actually requires in customer numbers, churn rate, and tier mix. Also before any infrastructure spend decision.
**Output**: 3-scenario model (conservative/base/optimistic) with MRR by month + break-even point + sensitivity analysis + financial trigger thresholds.
**Invoke**: `/strategy-breakeven` or `/strategy-breakeven model 20% monthly churn scenario`
**Source**: CFO 3-scenario financial modeling

---

### `/strategy-90day` *(use when priorities feel scattered)*
**When to use**: When you need to re-focus on what drives revenue in the next 90 days. Not for routine use — pull it when drift sets in.
**Output**: 3-phase plan (validate → convert → scale) adapted for a solo technical founder. Phase targets: first paying customer → $1K–$3K MRR → $5K–$10K MRR. Includes risk map.
**Invoke**: `/strategy-90day` + note where you are: "no paying customers yet" or "have 3 paying customers, need to scale."
**Source**: Executive coach 30-60-90 methodology, adapted for solo founder

---

### `/strategy-pivot` *(contingency only — pull if traction has stalled)*
**When to use**: After 60–90 days live with <$5K MRR, high churn, or ICP has proven wrong. Not for routine use.
**Output**: Crisis diagnosis (5 Whys) + 3 pivot options each with fast validation approach + decision framework + first 14-day action plan.
**Invoke**: **Describe the problem first**, then invoke:
```
/strategy-pivot   traction problem: free users sign up but never make a second API call
```
**Source**: Venture advisor pivot methodology

---

## Recommended sequence — first 30 days post-launch

Run these in order. Each one builds on the last.

```
1. /strategy-swot          → situational clarity — what's true right now
2. /strategy-competitors   → know the battlefield before building the GTM
3. /strategy-personas      → define who to sell to before writing any copy
4. /strategy-value-prop    → sharpen the message using persona output
5. /strategy-gtm           → build the motion using all of the above
6. /strategy-kpis          → set up measurement before executing
```

Run 7–9 after you have revenue data (60+ days in):
```
7. /strategy-pricing       → validate tiers once you see conversion patterns
8. /strategy-breakeven     → model the path when MRR data exists
```

Pull these only if needed:
```
9. /strategy-90day         → when focus drifts
10. /strategy-pivot        → only if traction has stalled after 90 days
```

---

## How skills stay current automatically

The global skills contain no hardcoded context — they read `CLAUDE.md`, `FEATURES.md`, and `ARCHITECTURE.md` from whatever project you're in at the time you invoke them. As those files change, the analysis automatically reflects the current state.

**Nothing to maintain.** Update `CLAUDE.md` as the business evolves and every skill picks it up on the next run.

**To add a new strategy skill**: create a `.md` file in `~/.claude/skills/` — it's immediately available in every project.

**To use in a new project**: nothing to do. Skills are global and load automatically.

---

*Global skills: `~/.claude/skills/strategy-*.md`*
*Source: McKinsey Strategic Analysis framework (10 prompts).*
