# /strategy-swot — SWOT Analysis & Strategic Priorities

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — business model, stack, pricing, goals, current status
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture (if it exists)

Use what you find to fill in all business-specific details below. If none of these files exist, ask the user for a one-paragraph description of the business before proceeding.

## Step 2 — Run the analysis

Act as a McKinsey Senior Partner with 20 years of experience in the relevant industry.

Conduct a full strategic SWOT analysis for this business. Each SWOT point must be an **insight**, not a fact.

**OUTPUT STRUCTURE:**

1. **CONTEXT AND STAKES** — Key assumptions about the industry and the company's current position. What changes if no action is taken in the next 90 days?

2. **SWOT MATRIX**
   - Strengths (4 points): how to monetize each
   - Weaknesses (4 points): root cause of each
   - Opportunities (4 points): time window to capture each
   - Threats (4 points): probability and magnitude of damage

3. **STRATEGIC INTERSECTIONS (TOWS Matrix)**
   - SO: use strengths to seize opportunities
   - ST: use strengths to defend against threats
   - WO: use opportunities to offset weaknesses
   - WT: risk minimization when weaknesses meet threats

4. **TOP 5 PRIORITIES FOR THE NEXT 30 DAYS** — The highest-leverage actions only. For each: specific action, owner, success metric, cost of inaction.

5. **EXECUTIVE SUMMARY** (3 sentences) — What is happening. What is critical. What to do immediately.

## Step 3 — Extract the complete action item register

After the analysis is written, sweep every section — every Strength, Weakness, Opportunity, Threat, and every TOWS intersection — and extract **every actionable item** into a complete register.

**Rules for this step:**
- Do not filter. If a SWOT point implies an action, it belongs here. The top 5 priorities in Step 2 are a subset — this register captures everything.
- Each item must be a concrete action, not a restatement of the insight. "Investigate flood zone pricing" is not an action. "Add `flood_zone: null` with upgrade CTA to free-tier API response" is.
- Include any caution, prerequisite, or sequencing dependency inline — do not separate them from the item.
- Group by source section, then assign a priority tier to each item.

**FORMAT:**

### Complete Action Item Register

For each item:
- **Action**: one specific, concrete thing to do
- **Source**: which SWOT element (e.g. S1, W2, T3, SO intersection)
- **Priority**: `Immediate` (0–30 days) / `Near-term` (30–90 days) / `Later` (90+ days)
- **Caution / dependency**: any prerequisite or risk (omit if none)

Group items under headings: Strengths → Monetize, Weaknesses → Fix, Opportunities → Capture, Threats → Mitigate, TOWS → Execute.

This register is the source of truth for what goes into QUEUE.md. It must be exhaustive.

## Step 4 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis (Steps 2 + 3) to `strategy/YYYY-MM-DD-swot-analysis.md`
4. Confirm the saved path to the user
