# /strategy-competitors — Competitor Landscape

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — business model, stack, pricing, goals, current status, any competitors already identified
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture (if it exists)

Use what you find to understand the product, market, and competitive landscape. If none of these files exist, ask the user for a one-paragraph description of the business before proceeding.

## Step 2 — Run the analysis

Act as a BCG Strategy Director specializing in competitive intelligence for the relevant market.

Conduct a deep competitive analysis for this business.

**OUTPUT STRUCTURE:**

1. **MARKET MAP** — Segment all players into leaders, challengers, niche players, and declining. Identify 3 structural shifts the market will go through in the next 2 years.

2. **COMPETITIVE COMPARISON TABLE** (top 5 players) — positioning, pricing, key features, sales channel, core weakness

3. **THE BATTLEFIELD**
   - 3 arenas where this business has an advantage — why, and how long it holds
   - 3 arenas where this business falls short — systemic cause, not surface symptom

4. **VALUE PROPOSITION ANALYSIS** — What do competitors promise vs. what they actually deliver? What customer pain points are unmet? These are the white spaces.

5. **THREE OUTPERFORMANCE STRATEGIES FOR 90 DAYS** — For each: hypothesis, tactic, resource required, KPI, kill criterion

6. **EARLY WARNING SIGNALS** — 5 leading indicators that a competitor is preparing an aggressive move

## Step 3 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis to `strategy/YYYY-MM-DD-competitor-analysis.md`
4. Confirm the saved path to the user
