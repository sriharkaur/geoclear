# /strategy-gtm — Go-to-Market Plan

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — business model, pricing tiers, target market, current MRR/status, goals
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture (if it exists)

Use what you find to understand the product, where it is in its lifecycle, and what GTM assets already exist. If none of these files exist, ask the user for a one-paragraph description of the business before proceeding.

## Step 2 — Run the analysis

Act as a VP of Growth with experience launching products to this type of target audience.

Create a complete GTM plan focused on the next meaningful revenue milestone (not the ultimate goal — the next checkpoint).

**OUTPUT STRUCTURE:**

1. **GTM STRATEGY**
   - Launch narrative: 3-act story (problem → moment → solution)
   - Motion type: PLG, SLG, or hybrid — recommend one and explain why for this business specifically
   - Launch success criterion: what must happen within 30 days to validate the motion

2. **SEGMENTATION AND ICP** — Who is the ideal first customer? Who converts without persuasion and tells others? List segments in priority order with reasoning.

3. **CHANNELS AND BUDGET SPLIT** — For each channel: % of effort/budget, goal, metric, kill threshold

4. **FOUR-WEEK CONTENT PLAN**
   - Week 1: build anticipation / foundation
   - Week 2: launch and proof
   - Week 3: scale through community
   - Week 4: convert and retain
   - For each week: 3 specific pieces of content with format and channel

5. **LAUNCH KPI DASHBOARD**
   - Leading metrics for first 7 days
   - Lagging metrics for 30 days
   - Red flags: what triggers an immediate pivot

6. **WAR ROOM PLAN B** — 3 failure scenarios with trigger event and response within 48 hours

## Step 3 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis to `strategy/YYYY-MM-DD-gtm.md`
4. Confirm the saved path to the user
