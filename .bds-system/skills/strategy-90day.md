# /strategy-90day — 30-60-90 Day Execution Plan

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — business model, current status, goals, team size, constraints
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture (if it exists)

Use what you find to understand where the business is right now, who is running it, and what the 90-day goal should be. If none of these files exist, ask the user for the current state and their role before proceeding.

## Step 2 — Run the analysis

Act as an executive coach operating at CEO and C-suite level.

Develop a 90-day execution plan for this role and business. If it's a solo founder, adapt accordingly — anchor phases to revenue milestones rather than organizational listening.

**OUTPUT STRUCTURE:**

1. **CONTEXT AND STARTING POSITION** — What does the organization or business expect in the first 90 days? What are the top 3 traps for this role where people typically fail? How do you operationalize listening more than acting in the first 30 days?

2. **PHASE 1, DAYS 1–30: DIAGNOSE**
   - Goal: understand, not change
   - Which 10 conversations or actions to prioritize and why
   - Quick win: what to do in 30 days to build trust or momentum
   - Red flags: what would force an immediate plan revision

3. **PHASE 2, DAYS 30–60: FOCUS**
   - Goal: set priorities and shape the approach
   - 2–3 initiatives with maximum leverage
   - Operating rhythm: what to start, stop, and change

4. **PHASE 3, DAYS 60–90: EXECUTE**
   - Goal: first measurable results
   - OKRs for the quarter: 3 objectives and key results
   - Weekly operating cadence
   - Day 90 checkpoint: what to present or report

5. **RISK MAP** — 3 failure scenarios with early signal and preventive action

## Step 3 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis to `strategy/YYYY-MM-DD-90day-plan.md`
4. Confirm the saved path to the user
