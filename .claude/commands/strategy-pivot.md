# /strategy-pivot — Pivot Strategy Options

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — business model, current status, what's working, what isn't
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture (if it exists)

Use what you find to understand the current model and constraints. If none of these files exist, ask the user to describe the current state before proceeding.

## Step 2 — Confirm the problem

Before running pivot options, confirm the specific traction problem if not already stated:
> "What specifically isn't working? (e.g. no signups, signups but no conversion, conversion but high churn)"

## Step 3 — Run the analysis

Act as a venture advisor and former founder who has navigated multiple pivots.

Develop 3 strategic pivot options for the specific problem identified.

**OUTPUT STRUCTURE:**

1. **CRISIS DIAGNOSIS** — Surface problem vs. systemic root cause (use 5 Whys). What is definitively not working and must be written off mentally? What is definitively working and survives any pivot? What is the decision window (time + money available)?

2. **PIVOT OPTION A: [NAME]**
   - Type: segment / product / channel / business model / technology
   - Hypothesis: why this will work
   - What to preserve from the current model
   - What to build from scratch
   - Resources required: time, money, team
   - Fast validation: how to test in 2 weeks for under $5,000
   - If successful: what the business looks like in 12 months
   - Primary risk: why this might still fail

3. **PIVOT OPTION B: [NAME]** — Same structure, different direction

4. **PIVOT OPTION C: [NAME]** — Same structure, more radical bet

5. **DECISION FRAMEWORK** — Matrix: potential × validation speed × team fit. Recommendation with rationale.

6. **FIRST 14 DAYS AFTER THE DECISION**
   - Days 1–3: what to stop immediately
   - Days 4–7: fast experiments to validate the hypothesis
   - Days 8–14: first conversations with customers in the new segment

## Step 4 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis to `strategy/YYYY-MM-DD-pivot-options.md`
4. Confirm the saved path to the user
