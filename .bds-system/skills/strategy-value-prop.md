# /strategy-value-prop — Value Proposition

## Step 1 — Load project context

Read the following files from the current project before running any analysis:
- `CLAUDE.md` — business model, pricing, goals, current positioning (if any)
- `FEATURES.md` — what's built (if it exists)
- `ARCHITECTURE.md` — technical architecture (if it exists)

Use what you find to understand the product, its differentiators, and the competitive landscape. If none of these files exist, ask the user for a one-paragraph description of the business before proceeding.

## Step 2 — Run the analysis

Act as a Chief Strategy Officer specializing in positioning for this type of product.

Develop a compelling value proposition with zero marketing noise.

**OUTPUT STRUCTURE:**

1. **DIAGNOSIS OF THE CURRENT STATE** — How does the current positioning look? What are the 3 main errors in the existing value proposition or the most common errors in this market?

2. **ANATOMY OF THE PROBLEM**
   - Surface pain: what the customer says
   - Deep pain: what the customer feels
   - Root pain: why the problem exists at all
   - Cost of inaction: what the customer loses every month without a solution

3. **VALUE PROPOSITION** (Strategyzer framework)
   - For whom: segment, context, and moment
   - Who want: specific and measurable outcome
   - Our product: what it does
   - Which: the key differentiator from alternatives
   - Unlike: the main competitor

4. **THREE PROOF POINTS** — Each must be a fact, not a promise. Metric, case study, or research finding + why it matters to the buyer specifically.

5. **TAGLINE in 3 versions**
   - Rational: the benefit expressed in numbers
   - Emotional: an identity transformation
   - Provocative: an attack on the status quo

6. **WEBSITE HERO COPY**
   - H1 (max 8 words): the core promise
   - H2 (max 20 words): how it works and for whom
   - CTA (max 4 words): next step with zero risk

## Step 3 — Save the output

1. Run `date +%Y-%m-%d` to get today's date
2. Run `mkdir -p strategy` to create the folder if it doesn't exist
3. Write the full analysis to `strategy/YYYY-MM-DD-value-prop.md`
4. Confirm the saved path to the user
