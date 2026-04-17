# /strategy-pricing — Pricing Strategy

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — current pricing tiers, business model, target market, goals
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture (if it exists)

Use what you find to understand the current tier structure, competitive anchors, and target segments. If none of these files exist, ask the user for the current pricing and a one-paragraph description of the business before proceeding.

## Step 2 — Run the analysis

Act as a Pricing Strategist specializing in this type of product or service.

Develop a three-tier pricing strategy grounded in value economics. If pricing already exists, validate it and recommend improvements.

**OUTPUT STRUCTURE:**

1. **PRICING POSITION AUDIT** — How is the price currently perceived in the market? How do competitor price anchors shape perception? What is the willingness to pay across 3 buyer segments?

2. **VALUE ECONOMICS** — What does the customer lose without this product (in money or time)? What is the ROI across conservative, realistic, and optimistic scenarios? How much is the customer rationally willing to pay?

3. **GOOD / BETTER / BEST MODEL** — Evaluate the current tier structure or design one from scratch:
   - GOOD tier: for whom, what's included, psychological role, the constraint that pushes to the next tier
   - BETTER tier: for whom, what's included, why this tier outsells the others, what gap remains vs. Best
   - BEST tier: for whom, full feature list, psychological role (anchor / prestige / primary revenue)

4. **PRICING PSYCHOLOGY** — 3 anchoring techniques that will increase average ticket. How to name the tiers to sell the middle one.

5. **PRICING EXPERIMENTS** — 3 A/B tests with hypothesis, metric, and timeline

## Step 3 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis to `strategy/YYYY-MM-DD-pricing.md`
4. Confirm the saved path to the user
