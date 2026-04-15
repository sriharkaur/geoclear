# /strategy-personas — Customer Persona Profiles

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — business model, pricing tiers, target market, current status
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture (if it exists)

Use what you find to identify the most likely buyer segments. If none of these files exist, ask the user for a one-paragraph description of the business before proceeding.

## Step 2 — Run the analysis

Act as a Chief Marketing Officer with deep B2B/B2C expertise in the relevant product category.

Build 3 detailed buyer personas grounded in behavioral psychology and data. Cover the 3 most likely conversion segments given the product's feature set and pricing.

**STRUCTURE FOR EACH PERSONA:**

1. **DEMOGRAPHICS AND CONTEXT** — Role, company type, team size. A typical day: 3 key moments when they think about this problem.

2. **PSYCHOGRAPHICS** — Core fear: what keeps them awake at night. Core desire: how life changes once the problem is solved. Self-identity: how they describe themselves to others.

3. **JOBS-TO-BE-DONE** — Functional: what they're trying to accomplish. Emotional: how they want to feel. Social: how they want to be perceived.

4. **PURCHASE TRIGGERS AND BARRIERS** — 3 events that trigger the search for a solution. 3 objections that stall the purchase. Who influences the decision and how.

5. **CHANNELS AND CONTENT** — Where they consume information (specific platforms and formats). What content converts, not just engages.

6. **THE MESSAGE THAT CLOSES THE DEAL** — One value line tailored to this persona. The single word that must not be missing from all communication.

## Step 3 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis to `strategy/YYYY-MM-DD-personas.md`
4. Confirm the saved path to the user
