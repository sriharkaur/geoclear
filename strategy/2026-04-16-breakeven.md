# GeoClear — Break-Even Financial Model
> Generated: 2026-04-16 | Skill: /strategy-breakeven | Framework: CFO / financial modeling
> Context: Full strategy stack (SWOT → 90-day plan), CLAUDE.md, FEATURES.md, ARCHITECTURE.md
> Current state: $0 MRR | Monthly infra burn: ~$130 | North star: $100K MRR in 12 months

---

## 1. FINANCIAL ARCHITECTURE

**Business model in one sentence:** GeoClear sells API access to US address intelligence (validation + enrichment) on a self-serve subscription basis, with pricing tiers matched to usage volume and enrichment access.

**The core financial mechanism:** Near-zero marginal cost per API call (SQLite on existing disk, federal open data APIs at $0) combined with a recurring subscription model creates a flywheel where each new customer adds ~$249–$499/mo in revenue against ~$2–5/mo in attributable infrastructure cost. Gross margin is ~97–98%. Every customer above break-even drops almost entirely to operating income.

**The key assumption the entire model rests on:** Customer acquisition is the constraint, not margin or capacity. GeoClear is not infrastructure-constrained (SQLite handles millions of queries/day on existing Render hardware) and not data-cost-constrained (FEMA, Census, USDOT are free). The model lives or dies on whether GTM channels convert at projected rates.

---

## 2. REVENUE STRUCTURE

### Revenue streams

| Stream | Price | Type | Projected % of MRR at $10K MRR |
|--------|-------|------|-------------------------------|
| Professional subscriptions | $249/mo | Recurring | 55% |
| Pro Compliance subscriptions | $499/mo | Recurring | 25% |
| Builder subscriptions | $49/mo | Recurring | 10% |
| Scale subscriptions | $999/mo | Recurring | 8% |
| Metered (pay-per-lookup) | Variable | Usage-based | 2% |
| Bulk Credits Packs | $199/$799 | One-time | < 1% (early stage) |
| Enterprise | $2,000+/mo | Recurring | 0% (not targeted in 90 days) |

**Why Professional dominates:** Dev Dana (inbound) converts to Professional when she hits the enrichment gate. Compliance Claire converts to Pro Compliance ($499) via outreach. Builder ($49) is a stepping stone — most revenue comes from Pro tiers.

### Volumes required to hit key MRR milestones

| MRR milestone | Builder ($49) | Professional ($249) | Pro Compliance ($499) | Scale ($999) | Mix assumed |
|---------------|--------------|--------------------|-----------------------|-------------|-------------|
| $500 | 2 | 2 | 0 | 0 | Early, dev-heavy |
| $2,500 | 5 | 8 | 1 | 0 | First Claire customer |
| $5,000 | 8 | 12 | 3 | 1 | PMF signal |
| $10,000 | 10 | 22 | 6 | 2 | Scaling |
| $50,000 | 20 | 80 | 30 | 10 | Growth stage |
| $100,000 | 30 | 160 | 60 | 20 | North star |

**Key observation:** $100K MRR requires ~270 paying customers. At 5% monthly churn, that means acquiring ~14–15 new customers per month at steady state just to maintain flat MRR. Growth to $100K requires acquiring 20–25/mo. This is the acquisition rate the GTM plan must eventually sustain.

### Seasonality and non-linearities

- **Q1 mortgage activity spike:** Mortgage origination peaks January–April (tax refund season, spring home buying). Compliance Claire's budget cycles also reset in January. Outreach in Q1 should outperform Q3.
- **Developer hiring cycles:** Startup hiring and new project starts cluster in January and September. HN/RapidAPI inbound is likely to spike at these times.
- **Metered revenue non-linearity:** A single high-volume metered customer can spike revenue unpredictably. Don't plan around metered — treat it as upside.

---

## 3. COST STRUCTURE

### Variable costs (COGS)

| Cost item | Monthly (at $0 MRR) | Monthly (at $10K MRR) | Notes |
|-----------|--------------------|-----------------------|-------|
| Render prod (web service) | $85 | $85–$170 | May need upgrade at high concurrent load |
| Render staging (data ops) | $25 | $25 | Fixed — data processing only |
| SendGrid email | $0 | $20–$50 | Free tier covers ~100 emails/day; paid at scale |
| FEMA NFHL API | $0 | $0 | Federal open data, no cost |
| Census Bureau Geocoder | $0 | $0 | Federal open data, no cost |
| USDOT NAD | $0 | $0 | Federal open data, no cost |
| Stripe fees | $0 | ~$290 (2.9% + $0.30) | ~2.9% of MRR at $10K |
| **Total COGS** | **$110** | **$420–$535** | |

**Gross margin at $10K MRR:** ($10,000 - $500) ÷ $10,000 = **~95%**

This is exceptionally high. The structural reason: all three enrichment data sources (FEMA, Census, USDOT) are zero-cost federal open data. This advantage is durable as long as GeoClear does not add commercial data dependencies.

### Fixed costs (monthly, current)

| Item | Monthly | Notes |
|------|---------|-------|
| Render prod | $85 | Included in COGS above |
| Render staging | $25 | Included in COGS above |
| Domain (geoclear.io) | ~$2 | Amortised annual cost |
| Cloudflare | $0 | Free tier |
| UptimeRobot | $0 | Free tier |
| **Total fixed** | **~$112/mo** | Essentially infra-only |

**Founder compensation:** $0 currently (bootstrapped). Not modelled until $10K MRR — at that point, the model should include a market-rate cost of founder time as a real line item.

### One-time investments already made

| Item | Approximate cost | Notes |
|------|-----------------|-------|
| Render disk (91GB, prod) | Included in service cost | Persistent disk attached to web service |
| NAD data download + import | ~$50 in staging compute | One-time; quarterly update ~$20 |
| Overture Maps import | ~$100 in staging compute | Completed 2026-04-16 |
| Domain registration | ~$20/yr | |
| Engineering time (all features) | Founder time (not cash) | |

**Total cash invested to date:** < $500. This is one of the lowest-cost SaaS launches possible.

---

## 4. THREE-SCENARIO MODEL

### Scenario A — Conservative (40% probability)
*Assumption: GTM channels underperform. HN post gets < 20 upvotes. Compliance outreach yields 1 reply in 30 days. RapidAPI listing produces slow organic growth. PLG motion takes 60+ days to generate paying customers.*

| Month | New customers | Churned | Total customers | MRR | MoM growth |
|-------|--------------|---------|----------------|-----|-----------|
| 1 | 1 | 0 | 1 | $249 | — |
| 2 | 2 | 0 | 3 | $747 | 200% |
| 3 | 3 | 1 | 5 | $1,245 | 67% |
| 4 | 4 | 1 | 8 | $1,992 | 60% |
| 5 | 5 | 1 | 12 | $2,988 | 50% |
| 6 | 6 | 2 | 16 | $3,984 | 33% |

**Break-even month:** Month 1 (infra break-even at 1 Professional customer — $249 > $130 monthly burn)

**Operational break-even:** Month 1. The business is cash-flow positive from the first paying customer. This is a fundamental strength of the model.

**North star trajectory:** At this growth rate ($4K MRR at Month 6), reaching $100K MRR in 12 months is not achievable. Month 12 projection: ~$15K MRR. Plan revision required at Month 3 if conservative scenario is tracking.

**Runway:** Indefinite — monthly costs are $130, break-even at 1 customer. No cash runway crisis possible at current cost structure.

---

### Scenario B — Base Case (45% probability)
*Assumption: GTM channels perform as planned. HN post gets 30–50 upvotes. Compliance outreach yields 2–3 replies, 1 paid trial. RapidAPI listing generates 20+ signups in first 30 days. 5% monthly churn.*

| Month | New customers | Churned | Total customers | MRR | MoM growth |
|-------|--------------|---------|----------------|-----|-----------|
| 1 | 3 | 0 | 3 | $747 | — |
| 2 | 6 | 0 | 9 | $2,241 | 200% |
| 3 | 8 | 1 | 16 | $3,984 | 78% |
| 4 | 10 | 1 | 25 | $6,225 | 56% |
| 5 | 12 | 2 | 35 | $8,715 | 40% |
| 6 | 15 | 2 | 48 | $11,952 | 37% |

**Break-even:** Month 1 (same — infra break-even at first customer)

**North star trajectory:** At base case growth, Month 12 projection: ~$45–60K MRR. Achievable with channel scaling and one enterprise customer. Gap to $100K requires either (a) faster acquisition rate in months 7–12, or (b) one $10K+/mo enterprise contract.

**$5K MRR milestone:** Month 4 (Day 90–120 from today). Slightly behind the 90-day plan target — but within range if compliance outreach yields 2 paying customers by Day 45.

---

### Scenario C — Optimistic (15% probability)
*Assumption: HN post goes viral (100+ upvotes, front page). One compliance customer signs at $499 within 30 days and refers two peers. RapidAPI listing gets featured. SEO pages rank within 45 days. 3% monthly churn (customers are sticky).*

| Month | New customers | Churned | Total customers | MRR | MoM growth |
|-------|--------------|---------|----------------|-----|-----------|
| 1 | 8 | 0 | 8 | $1,992 | — |
| 2 | 12 | 0 | 20 | $4,980 | 150% |
| 3 | 15 | 1 | 34 | $8,466 | 70% |
| 4 | 18 | 1 | 51 | $12,699 | 50% |
| 5 | 20 | 2 | 69 | $17,181 | 35% |
| 6 | 25 | 2 | 92 | $22,908 | 33% |

**North star trajectory:** Month 12 projection: $80–100K MRR. North star achievable within 12 months. Requires no single enterprise contract — purely self-serve at scale.

**Infrastructure trigger:** At ~100 concurrent paying customers making enrichment calls, Render's single-instance setup may require an upgrade. Plan: add a second Render instance ($85/mo) at $20K MRR. Still 99%+ gross margin at that scale.

---

## 5. SENSITIVITY ANALYSIS

### Variable 1 — Monthly churn rate (highest impact)

| Churn rate | LTV at Pro ($249) | Customers needed for $100K MRR (steady state) | Monthly new customers required |
|-----------|------------------|----------------------------------------------|-------------------------------|
| 2% | $12,450 | 402 | 8/mo |
| 5% (base) | $4,980 | 402 | 20/mo |
| 10% | $2,490 | 402 | 40/mo |

**±20% movement:** Base case 5% churn → 4% churn means LTV rises from $4,980 to $6,225 (+25%). Monthly new customer requirement drops from 20 to 16. This is the highest-leverage single metric to optimise. Every product improvement that increases stickiness compounds dramatically.

**Action:** Prioritise activation (signup → first API call) and enrichment integration depth — customers who integrate enrichment into production workflows have high switching cost and low churn. This is why ECPC is the North Star metric.

---

### Variable 2 — Average Revenue Per Customer (ARPC)

| Scenario | ARPC | Customers for $100K MRR |
|----------|------|------------------------|
| All Professional ($249) | $249 | 402 |
| Mix: 60% Pro + 30% Compliance + 10% Scale (base) | $332 | 301 |
| Mix: 40% Pro + 40% Compliance + 20% Scale | $424 | 236 |

**±20% movement:** If Pro Compliance tier ($499) converts at 30% of customers instead of 20%, ARPC rises from $332 to ~$375 (+13%), reducing the customer count needed for $100K MRR from 301 to 267. Every compliance customer acquired is worth 2× a standard Professional customer.

**Action:** The Pro Compliance tier at $499 is not just a revenue line — it materially changes the unit economics of the business. Shipping it (1 day of work) has outsized financial impact.

---

### Variable 3 — Free-to-paid conversion rate

| Conversion rate | Free signups needed for 20 new paying customers/mo |
|----------------|--------------------------------------------------|
| 3% (low) | 667 signups/mo |
| 8% (base) | 250 signups/mo |
| 15% (high, enrichment taste helps) | 133 signups/mo |

**±20% movement:** Base case 8% → 6.4% conversion means needing 312 signups/mo instead of 250 to hit the same paying customer count. At 6.4%, PLG channel volume matters more. At 10%+, outreach and content can be smaller.

**The enrichment taste experiment (500 calls in Builder tier) directly improves this variable.** If it moves conversion from 8% to 12%, the monthly signup requirement drops from 250 to 167 — a 33% reduction in acquisition effort for the same output.

**Action:** Ship the 500-call enrichment taste for Builder tier. It is the single highest-leverage conversion rate improvement available.

---

## 6. FINANCIAL TRIGGERS

### Trigger 1 — Model revision required (downside)

**Signal:** Month 3, MRR < $1,000 with 7 GTM assets live and 30+ outreach contacts sent.

**What it means:** Either the ICP is wrong (the people we're targeting don't have the problem we think they have) or the message is wrong (they have the problem but don't recognise GeoClear as the solution). This is not a cost problem — costs are $130/mo and covered by 1 customer. It is a revenue hypothesis failure.

**Response:** Do not reduce costs (nothing to cut). Do not add features. Interview 10 free signups and 5 outreach non-responders. Find the gap between what GeoClear promises and what buyers actually need. Revise the ICP or the message — not both at once.

---

### Trigger 2 — Investment increase justified (upside)

**Signal:** Month 4–5, MRR > $5,000, NRR > 105%, LTV/CAC > 5× on at least one channel.

**What it means:** The business model is validated. The marginal dollar invested in acquisition returns > $5 in LTV. This is the moment to increase GTM spend — paid search, content production, or a part-time growth hire.

**Budget unlock at $5K MRR:**
- Add $500/mo Google Ads targeting "SmartyStreets alternative", "FEMA flood zone API" (expected CPC: $2–5, expected conversion to trial: 3–5%)
- Commission 2 technical blog posts/mo at $300/post targeting developer SEO keywords
- Consider a fractional content marketer at $1,000/mo

**Condition:** Only increase spend if LTV/CAC on the new spend channel is projected > 3× before committing. Do not spend on channels where CAC > LTV.

---

### Trigger 3 — Shutdown / pivot consideration

**Signal:** Month 6, MRR < $2,000 despite 7 GTM assets live, 45+ outreach contacts, HN post, and Product Hunt launch. Free signups exist but conversion is < 2%.

**What it means:** The market either doesn't exist at the price point, the ICP is wrong, or there is a product-market fit gap that features cannot solve.

**Response sequence (in order, before shutdown):**
1. Reduce Professional price to $99/mo for 60 days — test if price is the barrier
2. Pivot the ICP to Ops Owen (bulk/CSV) — test if the compliance/dev message was wrong and the real buyer is the operations segment
3. Offer a done-for-you address cleanup service at $500 per project — convert technical capabilities into a service while the product finds PMF
4. If none of the above produces $2K MRR by Month 9: evaluate whether to continue

**Critical note:** Shutdown is not a financial decision at this cost structure ($130/mo infra). It is a time/opportunity cost decision. The question at Month 6 with < $2K MRR is not "can we afford to continue?" (yes — infra is covered by 1 customer) but "is this the best use of the next 6 months of founder time?"

---

## Summary — Key Numbers

| Metric | Value |
|--------|-------|
| Monthly infra burn | $130/mo |
| Operational break-even | 1 Professional customer ($249/mo) |
| Gross margin | ~97–98% |
| Base case LTV (Professional) | $4,980 |
| Base case LTV (Pro Compliance) | $16,633 |
| Customers needed for $100K MRR | ~301 (base mix) |
| Monthly new customers needed at $100K MRR | ~20/mo (at 5% churn) |
| Cash invested to date | < $500 |
| Runway | Indefinite (costs covered by 1 customer) |
| Month 6 MRR (base case) | ~$12,000 |
| Month 12 MRR (base case) | ~$45–60,000 |
| Month 12 MRR (optimistic) | ~$80–100,000 |
