# /strategy-kpis — KPI Dashboard

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — business model, revenue model, pricing tiers, goals, current instrumentation
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture (if it exists)

Use what you find to understand how revenue is generated, what billing exists, and what is already being measured. If none of these files exist, ask the user for a one-paragraph description of the business before proceeding.

## Step 2 — Run the analysis

Act as a Chief Analytics Officer with experience building measurement systems for this type of business.

Design a 7-KPI system grounded in causal logic, not vanity metrics.

**OUTPUT STRUCTURE:**

1. **METRICS PHILOSOPHY** — What is the difference between vanity and actionable metrics for this business specifically? Define the North Star Metric principle: the one number that matters most.

2. **NORTH STAR METRIC** — Name, formula, why it reflects genuine value creation for the customer, measurement frequency, owner

3. **THE 7 KEY KPIs** — For each: name + formula, industry benchmark, current target range, what a downward deviation means (causes + actions), what an upward deviation means and why it's not always good, causal link to the North Star
   - KPI 1: Customer Acquisition Cost by channel
   - KPI 2: Lifetime Value with a cohort lens
   - KPI 3: LTV/CAC ratio as the sustainability indicator
   - KPI 4: Retention and Churn by cohort and segment
   - KPI 5: Activation and Engagement — how the product builds a habit
   - KPI 6: Revenue metrics — MRR, ARR, expansion revenue, NRR
   - KPI 7: Operational efficiency — burn rate, runway, unit economics

4. **DASHBOARD AND REVIEW CADENCE**
   - Daily pulse: 3 numbers for the morning check-in
   - Weekly review: what to examine and who decides
   - Monthly strategic review: what the trends actually mean

5. **MEASUREMENT TRAPS** — 3 ways teams deceive themselves through metrics and how to defend against each

## Step 3 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis to `strategy/YYYY-MM-DD-kpis.md`
4. Confirm the saved path to the user
