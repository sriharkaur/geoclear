# /business-goal — North Star Goal Management

## Model Dispatch

**`refine` invocations must run on Claude Opus** — post-council refinement must match the nuance of the council output exactly.

**`capture`, `status`, `history`, `align`** run on Sonnet — they are read/write operations, not reasoning tasks.

**If you are the Sonnet orchestrator and the invocation is `refine`:** Spawn an Opus sub-agent:
```
Agent(
  model="opus",
  subagent_type="general-purpose",
  description="Business goal refinement post-council",
  prompt="[Full refinement prompt with current BUSINESS-GOAL.md content, DECISION-LOG.md entries from the council session, and the refinement protocol from this skill file.]"
)
```
Write the sub-agent output as the new version in BUSINESS-GOAL.md, then continue.

**All other invocations:** Proceed on current model.

---

> The single source of truth for what this company is trying to achieve.
> Captures the raw idea. Refined by the Strategy Council. Maintained through the life of the company.
> Every session — dev, strategy, BDS, CPM — reads this first.
> Lives at: `BUSINESS-GOAL.md` in the project root.

---

## The Purpose

Every business needs a north star that doesn't drift with each session. The `/business-goal` skill manages the evolution of the business idea — from raw founder input → Strategy Council refinement → measurable quarterly objectives → milestone tracking.

**BUSINESS-GOAL.md is not a strategy document.** It answers three questions that never go away:
1. **Who are we building for, and what problem are we solving?**
2. **What does winning look like, in specific measurable terms?**
3. **Are our current actions moving us toward that?**

Every engineer picks a task from QUEUE.md. The CPM tracks delivery. The Strategy Council debates positioning. All of them must be able to answer question 3 without a meeting.

---

## Invocation Variants

```
/business-goal              — show current goals + staleness check
/business-goal capture      — initial capture of raw idea → create BUSINESS-GOAL.md (v1.0)
/business-goal refine       — update after Strategy Council session (reads DECISION-LOG.md)
/business-goal update "X"   — record a specific milestone, goal change, or metric update
/business-goal status       — on-track assessment (reads QUEUE.md, RELEASES.md, sessions/)
/business-goal history      — full evolution log — every version, every change
/business-goal align        — check if current QUEUE.md tasks actually serve the goals
```

---

## Step 1 — Capture (v1.0 — first time only)

Called by `/bds-bootstrap` Phase 1 immediately after intake analysis. Triggered when BUSINESS-GOAL.md does not exist.

**Input:** User's raw business idea + Phase 1 intake analysis (BUSINESS_IDEA, PROBLEM_BEING_SOLVED, TARGET_USER, BUSINESS_MODEL, PRODUCT_TYPE).

**Extract and create `BUSINESS-GOAL.md`:**

```markdown
# Business Goals — {Project Name}
> Version: 1.0 | Created: {YYYY-MM-DD} | Stage: PRE-LAUNCH
> Status: INITIAL CAPTURE — not yet refined by Strategy Council

---

## North Star

**One sentence:** {What we're building, for whom, and to what end — founder's framing}

> _Founder's original words ({date}): "{user's exact input, preserved verbatim}"_

---

## Mission (Why We Exist)

{2–3 sentences on the specific problem being solved, for whom, and why the current alternatives fail}

---

## Vision (3-Year Horizon)

{What does winning look like in 3 years? Be specific: revenue milestone, customer milestone, market position}

---

## Current Objectives (This Quarter)

| # | Objective | Success Metric | Owner | Status |
|---|-----------|---------------|-------|--------|
| 1 | {first milestone — typically: launch and get first paying customer} | {measurable signal} | Founder | 🔲 Not started |
| 2 | {second milestone} | {metric} | Engineering | 🔲 Not started |
| 3 | {third milestone} | {metric} | Strategy | 🔲 Not started |

---

## North Star Metrics

| Metric | Current | 30-day | 90-day | 1-year |
|--------|---------|--------|--------|--------|
| MRR | $0 | $1K | $10K | $100K |
| Paying customers | 0 | 10 | 100 | 1,000 |
| Gross margin | — | — | >60% | >70% |
| CAC payback | — | — | <12mo | <6mo |
| NRR | — | — | >100% | >110% |

---

## What Success Is NOT

{Anti-goals — what we explicitly are NOT optimizing for. Forces clarity and prevents scope creep.}

Examples: "Not a consumer product." "Not feature-parity with incumbent X." "Not growing before unit economics are positive."

---

## Red Lines (Non-Negotiable)

{Things that, if compromised, invalidate the business or violate trust}

Examples: "We will not store customer data insecurely." "We will not launch without a working payment flow." "We will not grow headcount before $50K MRR."

---

## Evolution Log

| Version | Date | What changed | Trigger | Who approved |
|---------|------|-------------|---------|-------------|
| 1.0 | {date} | Initial capture | Founder intake | Founder |
```

After writing: confirm the file was created and show the North Star sentence to the user.

---

## Step 2 — Refine (after Strategy Council)

Called automatically after `/bds-customize strategy` or `/strategy-90day` produces new decisions.

**Read:** `architecture/DECISION-LOG.md` — find all decisions tagged with business model, pricing, customer segmentation, positioning.

**Update BUSINESS-GOAL.md:**

1. **North Star** — if the product definition or customer has been sharpened, update the one-sentence statement. Preserve prior version in Evolution Log.
2. **Mission** — if customer definition changed (e.g., from B2C → B2B), update.
3. **Vision** — if scale target changed based on market sizing or competitive analysis, update.
4. **Current Objectives** — replace with the 90-day plan from `/strategy-90day` (top 3 items, with owners and metrics).
5. **North Star Metrics** — update targets based on Strategy Council pricing and breakeven decisions.
6. **What Success Is NOT** — add any anti-goals that emerged from competitive positioning debate.
7. **Red Lines** — add any non-negotiables from Engineering Council or Strategy Council.
8. **Evolution Log** — add row: what changed, triggered by which D-{N} decision(s), approved by council.

**Bump version:** 1.0 → 1.1 (refinement within same stage) or 2.0 (stage change: PRE-LAUNCH → EARLY → GROWTH → SCALE).

Show diff of what changed. Write the file.

---

## Step 3 — Update (milestone and goal changes)

```
/business-goal update "first paying customer: Acme Corp, $49/mo, 2026-04-20"
/business-goal update "goal pivot: narrowing ICP from SMB to mid-market only"
/business-goal update "metric revised: CAC payback now 9mo based on first 20 customers"
/business-goal update "red line added: no enterprise contracts until SOC2 complete"
```

For each update:
1. Locate the relevant section in BUSINESS-GOAL.md
2. Update the data
3. Add to Evolution Log
4. If objectives were completed: mark ✅ and propose next objectives
5. If goals changed: flag any QUEUE.md tasks that may no longer serve the updated goals

---

## Step 4 — Status Assessment

`/business-goal status` — are we on track?

**Read:**
- BUSINESS-GOAL.md (what we're trying to achieve)
- QUEUE.md (what's in progress and pending)
- RELEASES.md (what shipped)
- strategy/STRATEGY-INDEX.md (last strategy session date and type)
- reports/program/ (last CPM status if exists)
- FEATURES.md (what is built vs planned)

**Report:**

```
=== BUSINESS GOAL STATUS ===
Date: {YYYY-MM-DD}
Goal version: {N} | Stage: {STAGE} | Last refined: {date}

NORTH STAR
{one sentence}

OBJECTIVES — THIS QUARTER
  [✅ / ⏳ / 🔲 / ❌]  Objective 1: {status note}
  [✅ / ⏳ / 🔲 / ❌]  Objective 2: {status note}
  [✅ / ⏳ / 🔲 / ❌]  Objective 3: {status note}

METRICS PROGRESS
  MRR:       $X / $Y target ({N}% of 90-day goal)
  Customers: N / Y target
  Churn:     N%

ALIGNMENT CHECK
  Queue items serving current goals:    N tasks
  Queue items NOT serving current goals: N tasks (list them)

NEXT MOST IMPORTANT ACTION
  {single most important thing to do right now to move toward the north star}

STALENESS WARNING (if applicable)
  {if goals haven't been updated in >30 days at pre-launch, >60 days at EARLY, >90 days at GROWTH}
```

---

## Step 5 — Align (QUEUE health against goals)

`/business-goal align` — checks every task in QUEUE.md and asks: does this serve the current North Star Objectives?

For each task:
- **Directly serves an objective** → ✅ keep
- **Indirect / infrastructure** → ⚠️ flag for de-prioritization if no capacity left after direct items
- **No connection to current objectives** → ❌ flag for archival or deferral

Output: a ranked view of the queue by alignment score, with recommendations.

---

## Integration Points

| Who calls it | When | What they do |
|-------------|------|-------------|
| `/bds-bootstrap` Phase 1 | After intake analysis | `/business-goal capture` |
| `/bds-customize strategy` | After council session ends | `/business-goal refine` |
| `/strategy-90day` | After 90-day plan is written | `/business-goal refine` |
| `/cpm` | Every status report | Reads BUSINESS-GOAL.md as primary reference |
| `/observer` | Any session | Reads BUSINESS-GOAL.md to frame observations |
| `/bds` health check | Layer 4 (Business) | Reads BUSINESS-GOAL.md, checks staleness |
| `/dev` meta-orchestrator | Session start | Reads BUSINESS-GOAL.md, flags misaligned tasks |
| `/strategy` meta-orchestrator | Session start | Reads BUSINESS-GOAL.md as strategic context |

---

## BUSINESS-GOAL.md is not optional

If it doesn't exist: run `/business-goal capture`.

If it exists but the Evolution Log shows no updates in:
- **PRE-LAUNCH**: 30+ days → stale. Something changed; the goals haven't caught up.
- **EARLY / GROWTH**: 60+ days → stale. Customer feedback has informed what winning looks like.
- **SCALE / ENTERPRISE**: 90+ days → stale. Market dynamics and competitive position shift at scale.

When stale: run `/business-goal refine` or `/business-goal update "{what changed}"`.

The north star only works if it's current.
