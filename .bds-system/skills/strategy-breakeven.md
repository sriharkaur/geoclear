# /strategy-breakeven — Break-Even Financial Model

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — business model, pricing tiers, cost structure, goals, current MRR
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture and infrastructure costs (if it exists)

Use what you find to understand revenue streams, known costs, and financial goals. If none of these files exist, ask the user for the pricing, known costs, and revenue target before proceeding.

## Step 2 — Run the analysis

Act as a CFO with deep financial modeling experience for this type of business.

Build a simple but realistic financial model with 3 scenarios.

**OUTPUT STRUCTURE:**

1. **FINANCIAL ARCHITECTURE** — Business model in one sentence: what we sell, to whom, and how. The core financial mechanism: where profit is created. The key assumption the entire model rests on.

2. **REVENUE STRUCTURE** — Revenue streams with % contribution from each. Price points and volumes required. Seasonality and non-linearities.

3. **COST STRUCTURE** — Variable costs (COGS): what's included and % of revenue. Fixed costs: line items and monthly total. One-time investments already made or needed.

4. **THREE-SCENARIO MODEL**
   - Conservative (40% probability): assumptions, revenue for months 1–6, break-even point, runway
   - Base case (45% probability): same structure
   - Optimistic (15% probability): same structure

5. **SENSITIVITY ANALYSIS** — Top 3 variables with highest impact on outcomes. What happens if each moves ±20%?

6. **FINANCIAL TRIGGERS** — What signals an immediate model revision? Decision point for increasing investment? Decision point for shutdown or pivot?

## Step 3 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis to `strategy/YYYY-MM-DD-breakeven.md`
4. Confirm the saved path to the user
