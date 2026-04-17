# Business Delivery System (BDS)

> Build real products. Acquire real customers. Generate real revenue. Scale to real size.
> The BDS is the operating system for a company — from first line of code to 1000x growth.
> Built on the engineering rigor of Google and Meta. The business discipline of McKinsey. The product instincts of the best founders.

---

## What is the Business Delivery System?

Most engineering frameworks stop at deployment. Most business frameworks stop at strategy. The BDS connects them into one operating system — because a product that doesn't make money is a hobby, and a strategy without engineering execution is a wish list.

**The BDS answers five questions continuously:**

1. **Are we building the right thing?** — Product-market fit, user value, revenue alignment
2. **Are we building it correctly?** — Engineering excellence, security, reliability, scalability
3. **Can it run without us?** — Production readiness, observability, incident response
4. **Is it making money?** — Unit economics, profitability, sustainable growth
5. **Can it grow 1000x?** — Architecture decisions made now that enable scale later

Every session — whether engineering or strategy — answers one or more of these questions.

---

## The Five Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 5: SCALE                                                  │
│  10x → 100x → 1000x capacity, economics, and operations         │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 4: BUSINESS                                               │
│  Revenue model · Unit economics · GTM · KPIs · Profitability     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: OPERATIONS                                             │
│  Monitoring · Incident response · Cost control · Runbooks        │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: ENGINEERING                                            │
│  10-gate pipeline · PRISM-10 architecture · 10-layer testing     │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: FOUNDATIONS                                            │
│  Project structure · Standards · Docs · Requirements · Design    │
└─────────────────────────────────────────────────────────────────┘
```

Each layer depends on the one below it. You cannot reliably scale what isn't reliable. You cannot profit from what doesn't work. You cannot operate what you cannot observe.

**The BDS enforces this sequence.** Skipping layers is how startups fail — not from lack of ambition but from building the sixth floor before the third floor is solid.

---

## Entry Points

| You want to... | Command | Layer |
|----------------|---------|-------|
| Full business health check | `/bds` | All 5 |
| Engineering session | `/dev` | 1–3 |
| Strategy session | `/strategy` | 4 |
| Scale readiness check | `/bds scale` | 5 |
| Launch readiness check | `/bds launch` | 3–4 |
| Production health | `/dev-verify` | 3 |
| Set up a new project | `/project-init` | 1 |

---

## The Metrics That Define Success at Each Stage

### Stage 1 — Pre-Launch (0 customers)
The only metric that matters: **does anyone want this?**
- Validation: 10 potential customers interviewed
- Signal: at least 3 will pay before it's built
- Technical: local dev works end-to-end

### Stage 2 — Launch (1–10 customers)
**Does it work reliably for paying customers?**
- Revenue: first $1 MRR
- Reliability: 99% uptime (3.65 days downtime/year acceptable)
- Support: p95 response time < 500ms
- Retention: >50% month-2 retention
- NPS: > 0

### Stage 3 — Growth (10–100 customers)
**Can it acquire customers repeatably and profitably?**
- Revenue: $10K MRR
- CAC payback: < 12 months
- Gross margin: > 60%
- Churn: < 5%/month
- Reliability: 99.9% uptime (8.7 hours downtime/year)

### Stage 4 — Scale (100–1000 customers)
**Can it grow faster than it costs to grow?**
- Revenue: $100K MRR
- LTV/CAC ratio: > 3:1
- Gross margin: > 70%
- Churn: < 2%/month
- Reliability: 99.95% uptime
- P95 latency: < 200ms at full load

### Stage 5 — Enterprise Scale (1000+ customers)
**Can it run reliably at Google/Meta-level load?**
- Revenue: $1M+ MRR
- Net revenue retention: > 110%
- Gross margin: > 75%
- Reliability: 99.99% uptime (53 minutes downtime/year)
- Architecture: horizontally scalable, no single point of failure
- Security: SOC2 or equivalent

---

## The Scale Ladder — Architecture Decisions That Compound

These are the decisions that determine whether you can grow 1000x. Make them early — retrofitting costs 10x.

### 0 → 10x (current stage)
- SQLite is fine up to ~100 concurrent writes, 10GB active data
- Single server is fine up to ~1000 req/s with proper caching
- API key auth is correct — add per-key rate limiting now
- Indexes on all query columns — non-negotiable from day one
- Structured logging — makes debugging 100x faster at scale

### 10x → 100x
- Read replicas or WAL-mode optimizations for SQLite (or migration to Postgres)
- CDN for static assets and cacheable API responses
- Background job queue for async work (webhooks, emails, reports)
- Database connection pooling
- Horizontal scaling: stateless API servers, shared persistent storage

### 100x → 1000x
- Database sharding or migration to distributed DB (CockroachDB, PlanetScale)
- Dedicated search service (Typesense, Algolia) instead of SQLite LIKE queries
- Message queue (Redis, SQS) for all async communication
- Multi-region deployment with geo-routing
- Dedicated caching layer (Redis) for hot-path queries
- Separate OLAP for analytics (ClickHouse, BigQuery) vs OLTP for transactions

**Architecture decisions already made in PRISM-10** (the engineering framework embedded in `/dev-arch`) are calibrated to this ladder. Every design review asks: does this work at 10x? At 100x? Where does it break first?

---

## Production Readiness Checklist

A feature is not done when it deploys. It is done when it can run without you.

### Observability (can you see what's happening?)
- [ ] Structured logs with correlation IDs on every request
- [ ] Health endpoint (`/api/health`) tests every dependency, not just HTTP 200
- [ ] Error rate, latency p50/p95/p99 tracked per endpoint
- [ ] Alerts fire before customers notice — not after

### Reliability (does it degrade gracefully?)
- [ ] Every external dependency has a timeout
- [ ] External dependency down → graceful null/fallback, not 500
- [ ] Retry logic with exponential backoff on transient failures
- [ ] Database backup tested by restore (not just "backup exists")
- [ ] Rollback plan documented and tested for every deploy

### Security (is customer data safe?)
- [ ] All inputs parameterized — no string concat into SQL
- [ ] API keys hashed (not stored plaintext), rotatable
- [ ] Rate limiting per key AND per IP
- [ ] No secrets in git, no secrets in logs, no secrets in responses
- [ ] Dependency audit clean (`npm audit` / `pip audit`)

### Operations (can someone else run it at 3am?)
- [ ] Every alert has a runbook
- [ ] On-call rotation defined (even if it's just you)
- [ ] Deployment is a single command, not a 20-step manual process
- [ ] Data backup automated and verified
- [ ] Incident severity levels defined (P0/P1/P2/P3)

---

## Launch Readiness — Gates Before Going Live

Before acquiring paying customers, verify:

**Technical gates:**
- [ ] `/api/health` returns 200 with all dependencies healthy
- [ ] End-to-end test of the golden path: signup → pay → use → renew
- [ ] At least 10 hours of load testing at 2x expected peak traffic
- [ ] Security scan completed (OWASP top 10 verified)
- [ ] SSL/TLS configured, HTTPS enforced everywhere
- [ ] Error monitoring active (Sentry or equivalent)

**Business gates:**
- [ ] Pricing published and Stripe (or equivalent) configured in live mode
- [ ] Terms of service and privacy policy live
- [ ] Support channel exists (email minimum)
- [ ] Cancellation/refund policy defined
- [ ] At least one paying customer in beta (validates willingness to pay)

**Operational gates:**
- [ ] Monitoring dashboard showing real-time error rate and latency
- [ ] Runbook for top 3 most likely failure modes
- [ ] Backup and restore tested end-to-end
- [ ] Deployment process verified: push → deploy → smoke test automated

---

## Unit Economics — The Numbers That Determine Survival

Every product must be able to answer these:

| Metric | Formula | Healthy target |
|--------|---------|----------------|
| **MRR** | Active subscriptions × avg monthly price | Growing > 10%/month early |
| **Gross margin** | (Revenue − COGS) / Revenue | > 60% for SaaS |
| **CAC** | Total sales + marketing spend / new customers | < 3 months LTV |
| **LTV** | ARPU × gross margin × avg customer lifetime | > 3× CAC |
| **Payback period** | CAC / (ARPU × gross margin) | < 12 months |
| **NRR** | (Start MRR + expansion − churn − contraction) / Start MRR | > 100% = expansion > churn |
| **Burn multiple** | Net burn / Net new ARR | < 2x (< 1x is world-class) |

`/strategy-breakeven` and `/strategy-kpis` calculate these for your specific numbers.

The BDS uses these as **primary health signals** — not vanity metrics. Revenue without margin is a trap. Growth without retention is a leaky bucket.

---

## The Google/Meta-Level Engineering Principles (in plain language)

These are the principles that separate systems that run at 99.99% uptime under 1B+ requests from systems that fall over at 1000 users.

**1. Observability first.** You cannot fix what you cannot see. Logs, metrics, traces are not optional. Build them into every feature, not bolted on after the fact.

**2. Graceful degradation, not cascade failure.** Every external dependency will go down. The question is: when it does, does your system return null, or does it return 500 to every customer? Design for the former.

**3. Every query must use an index.** A table scan that runs in 5ms at 10K rows takes 50 seconds at 100M rows. EXPLAIN QUERY PLAN is mandatory before any query ships.

**4. No synchronous blocking on the hot path.** Node.js, Python async, Go — all have the same failure mode: blocking the event loop with a slow operation kills throughput for everyone. Background jobs exist for a reason.

**5. Idempotency.** Every operation that can be retried must produce the same result when retried. Webhooks get delivered twice. Network requests fail and retry. Design for it.

**6. Defense in depth.** One security layer failing should not mean a breach. Authentication + authorization + input validation + rate limiting + audit logs — all of them, not just one.

**7. Data is permanent.** Code can be rolled back. Data cannot be unwritten. Schema changes are permanent in production. Every migration needs a rollback path that preserves data.

**8. Deployment is a product.** A system that takes 20 manual steps to deploy will not be deployed safely under pressure. One-command deploy, automated smoke test, automated rollback trigger.

**9. SLOs are contracts.** Define your uptime and latency commitments before customers sign up. Then monitor them. Error budgets tell you when to slow down and fix reliability vs ship features.

**10. Cost is a design constraint.** Infrastructure that costs $50K/month at 10K users is not scalable economics. Cost per unit (API call, user, GB) must be calculated and acceptable before shipping.

---

## The BDS Council — Customization via Deliberation

Before the first line of code is written on any new project, the BDS is customized through structured council deliberation. This is not a checklist — it is a governed decision process.

**Strategy Council** reviews the business model, pricing, customer segmentation, and competitive position:
- Elon Musk — first principles, eliminate unnecessary, pursue 10x not 10%
- Mark Zuckerberg — network effects, social graph, grow faster than competition understands
- Sundar Pichai — organize information, data flywheel, platform bets that compound
- Google CMO (Lorraine Twohill persona) — who is the customer, what pain are we erasing
- Google CFO (Anat Ashkenazi persona) — unit economics before growth spend, margin not just revenue

**Engineering Council** reviews architecture, security, scale path, and AI design:
- Google Chief Architect (Urs Hölzle persona) — systems thinking at 1000x, design for failure, no single point
- Anthropic Chief Scientist (Dario Amodei persona) — safety, interpretability, blast radius, trust
- Claude Code Chief Founder (Boris Cherny persona) — developer experience, correctness, debuggability

Each council runs 3 rounds: initial positions → cross-examination → convergence. Every decision is logged in `architecture/DECISION-LOG.md` with the specific exchange that turned the debate, dissent preserved, confidence level, and revisit trigger.

**Run:** `/bds-customize` — full council | `/bds-customize strategy` — strategy only | `/bds-customize engineering` — engineering only | `/bds-customize challenge D-{N}` — reopen a logged decision

---

## How the BDS Connects

```
/bds  ← Start here: business health across all 5 layers
  │
  ├── /strategy  ← Layer 4: Business
  │     Answers: are we building for a real market at profitable economics?
  │     Skills: swot, value-prop, personas, competitors, pricing, gtm, kpis, 90day
  │
  ├── /dev  ← Layers 1–3: Foundations + Engineering + Operations
  │     Answers: are we building it correctly and can it run reliably?
  │     Gates: REQ→DESIGN→PLAN→ARCH→BUILD→TEST→DOCS→COMMIT→DEPLOY→VERIFY
  │     Architecture: PRISM-10 (10 dimensions, Google/Meta-level guardrails)
  │
  └── /project-init  ← Layer 1: Foundations
        Answers: does the project have the right structure to scale?
        Output: standard Google/Meta/Anthropic directory structure
```

**The BDS loop (run every 2–4 weeks):**

```
/bds              ← health check across all layers
  ↓
/strategy         ← is the business strategy still correct?
  ↓
/dev              ← what engineering work moves the business forward?
  ↓
/bds launch       ← are we ready to ship to customers?
  ↓
ship → measure → /bds  ← repeat
```

---

## Documents in This System

| Document | What it is | Open when... |
|----------|-----------|-------------|
| [BDS.md](BDS.md) | This file — the complete operating system | You want to understand the whole system |
| [FRAMEWORK.md](FRAMEWORK.md) | Master skill index with all commands | You want to find a specific skill |
| [DEV-FRAMEWORK.md](DEV-FRAMEWORK.md) | Engineering framework user guide | You're starting an engineering session |
| [STRATEGY-FRAMEWORK.md](STRATEGY-FRAMEWORK.md) | Strategy framework user guide | You're starting a strategy session |
| [PROJECT-GUIDE.md](PROJECT-GUIDE.md) | Project structure guide | You need to know where a file goes |
| [CLAUDE.md](CLAUDE.md) | Project rules + routing map | Claude Code reads this at session start |
| [FEATURES.md](FEATURES.md) | What is built | Never rebuild what's already built |
| [QUEUE.md](QUEUE.md) | What's in progress | Pick up where the last session ended |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture | Before adding any endpoint or component |
| [RELEASES.md](RELEASES.md) | Version history | Before cutting a release |
| [requirements/](requirements/) | All product requirements (REQ-NNNN) | Before designing anything |
| [design/](design/) | All technical designs (DESIGN-NNNN) | Before planning or building |
| [strategy/](strategy/) | All strategy analyses | Before making a business decision |
| [sessions/](sessions/) | All dev session logs | After sessions — full context preserved |

---

## The Promise

A product built with the BDS will be:

**Production-grade** — monitored, observable, alertable, documented. Not a demo.

**Profitable** — unit economics understood and positive before scaling spend.

**Secure** — Zero Trust, parameterized queries, hashed keys, rate limits. Not an afterthought.

**Scalable** — architecture decisions made now that work at 10x, 100x, and 1000x without rewriting the system.

**Maintainable** — any engineer, in any session, can read the QUEUE, understand the state, and continue work without a handoff meeting.

**Reliable** — SLOs defined, error budgets tracked, graceful degradation on every external dependency. Customers don't experience your dependency failures.

**Sustainable** — retained customers, expanding revenue, positive gross margin, not burning cash to acquire users who don't stay.

This is how companies are built. Not by moving fast and breaking things — but by moving deliberately and building things that last.
