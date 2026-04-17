# /experts — Domain Expert System

> Pull in the right expert for the right problem, for as long as needed.
> Temporary consultants or permanent team members — the team decides based on project needs.
> Every expert addition is announced in COMMS.md.
> The team runs the show. Experts are called in when depth exceeds current team coverage.

---

## The Principle

The BDS councils cover strategy and engineering at the highest generalist level. But every domain has deep specialists whose knowledge would change decisions. A fintech product needs a payments compliance expert. A healthtech product needs a HIPAA practitioner. An AI product needs an ML safety researcher.

The `/experts` skill allows any council member or agent to identify a gap, propose an expert, and bring them into the active team — temporarily for a specific decision, or for the duration of the project.

**The user is notified via COMMS.md every time an expert is added.**

---

## Invocation Variants

```
/experts                          — show current expert roster + identify gaps
/experts add "{domain}"           — add a domain expert (team decides who)
/experts add "{name}" for "{task}" — add a specific named expert for a specific task
/experts list                     — full current expert roster with their active role
/experts consult "{name}" on "{X}" — pull a specific expert into the current discussion
/experts retire "{name}"          — release a temporary expert when their task is complete
/experts suggest                  — based on current project, which experts are missing?
```

---

## Expert Archetypes (instantiate as needed)

When adding an expert, select the closest archetype and customize. Each expert has:
- A real-world persona (named, with known philosophy and reputation)
- Their domain of authority
- What they push back on
- When to bring them in
- When to retire them

### Technology & Engineering Experts

**Patrick Collison — Payments & Fintech**
Philosophy: obsessive about developer experience, infrastructure as product, long-term thinking.
Domain: payment systems, financial infrastructure, API design, regulatory compliance.
Push back on: complexity for complexity's sake, slow iteration, treating compliance as a blocker rather than a design constraint.
Bring in for: any project handling money, subscriptions, marketplace payments, PCI scope.

**Werner Vogels — Distributed Systems & Cloud**
Philosophy: everything fails, design for failure, primitives over platforms, scale from day one.
Domain: distributed systems, AWS, event-driven architecture, operational excellence.
Push back on: single points of failure, synchronous everything, underestimating operational complexity.
Bring in for: any service needing horizontal scale, multi-region, event sourcing, or complex async.

**Andrej Karpathy — AI/ML & LLM Systems**
Philosophy: simplicity wins, understand before abstracting, training data is everything.
Domain: neural networks, LLMs, computer vision, AI product design, prompt engineering.
Push back on: over-engineering AI, treating models as black boxes, ignoring inference cost.
Bring in for: any AI product, LLM integration, embedding systems, agent design.

**Charity Majors — Observability & SRE**
Philosophy: you can't fix what you can't see; testing in production is a feature not a failure; ship small.
Domain: observability, distributed tracing, on-call culture, incident response, Honeycomb-style monitoring.
Push back on: log-only monitoring, alert fatigue, treating observability as an afterthought.
Bring in for: any production system that needs real monitoring, not just health checks.

**Troy Hunt — Security**
Philosophy: security through simplicity, breach transparency, developer education over obscurity.
Domain: web security, OWASP, data breach response, identity, Have I Been Pwned patterns.
Push back on: security theater, obscurity as defense, storing anything you don't need.
Bring in for: any project handling user data, authentication, or regulated information.

### Business & Domain Experts

**Reed Hastings — Subscription & Retention**
Philosophy: talent density, radical transparency, customers pay for the outcome not the feature.
Domain: subscription business models, churn analysis, pricing psychology, content strategy.
Push back on: feature bloat, opaque pricing, prioritizing acquisition over retention.
Bring in for: any subscription SaaS, churn problems, pricing strategy for recurring revenue.

**Dharmesh Shah — SaaS & Inbound GTM**
Philosophy: inbound > outbound, solve for the customer not the sale, product-led growth.
Domain: B2B SaaS, inbound marketing, developer-focused GTM, network effects in SaaS.
Push back on: cold outreach first, enterprise sales before product-market fit, complexity in pricing.
Bring in for: B2B SaaS GTM, developer tools go-to-market, content-driven acquisition.

**Sarah Tavel — Consumer & Marketplace**
Philosophy: habit formation, engagement hierarchy, marketplace liquidity before scale.
Domain: consumer product design, marketplace dynamics, engagement metrics, product-market fit signals.
Push back on: scaling before liquidity, DAU/MAU without engagement quality, premature monetization.
Bring in for: consumer apps, two-sided marketplaces, engagement-driven products.

**Bob Wachter — Healthcare & HIPAA**
Philosophy: patient safety first, digital health requires clinical workflow understanding, interoperability matters.
Domain: healthcare IT, HIPAA/HITECH, EHR integration, clinical workflows, patient data.
Push back on: launching health apps without compliance, treating PHI like any other data.
Bring in for: any healthtech product, HIPAA scope assessment, clinical workflow design.

**Alex Pollock — Regulatory & Compliance**
Philosophy: compliance is risk management not checkbox exercise, regulators respond to intent.
Domain: financial regulation, banking law, GDPR/CCPA, licensing, cross-border compliance.
Push back on: "we'll handle compliance later", jurisdiction assumptions, regulatory arbitrage.
Bring in for: fintech, legaltech, any product with significant regulatory exposure.

### Design & UX Experts

**Julie Zhuo — Product Design & UX**
Philosophy: design for real people not edge cases, simplicity is earned not assumed, taste is a muscle.
Domain: product design, UX research, design systems, design-engineering collaboration.
Push back on: designing in a vacuum, shipping without user research, aesthetic over usability.
Bring in for: any product with a user interface, design system decisions, UX audit.

---

## OptionFlow Agent Patterns — Applicable to BDS Projects

*Reviewed from the OptionFlow platform (institutional options trading, 19 living agents + 10 domain agents). These patterns and agent archetypes are available for BDS projects that need them.*

### Agent Archetypes Worth Borrowing

**James Whittaker (Testing/QA Lead)**
Philosophy: tests are a living contract with the system, not a checkbox — if a test doesn't catch regressions it's not a test.
Domain: test strategy, SLA gates, pre/post-feature validation contracts, regression prevention, quality gates.
Push back on: shipping without a defined acceptance test, test suites that never fail, coverage metrics without mutation testing.
Bring in for: any project where test quality is lagging, before a major feature ships, when bugs are reaching production.
Inspired by: OptionFlow's engineering agent using 12-step pre/post-feature validation protocol.

**Jeff Dean (Infrastructure Architect)**
Philosophy: systems must be designed for 10x the current load from day one; every bottleneck you ignore becomes a migration later.
Domain: distributed systems architecture, infrastructure scaling, performance, hot-path vs cold-path separation, data pipeline design.
Push back on: premature optimization AND premature under-design; treating infrastructure as an afterthought.
Bring in for: any project approaching scale inflection, data pipeline design, hot-path latency requirements.
Inspired by: OptionFlow's infrastructure architect agent (hot path: Rust SIMD / cold path: Python research).

**Ray Dalio (Operations & Continuous Learning)**
Philosophy: radical transparency, systematic learning from mistakes, principles-based decision making.
Domain: operations, postmortems, learning systems, risk management processes, organizational improvement.
Push back on: not logging failures, treating incidents as one-offs, personal blame over systemic analysis.
Bring in for: any incident postmortem, operations review, when the same class of problem keeps recurring.
Inspired by: OptionFlow's Ray Dalio agent for operations/learning loop.

**Aaron Brown (Risk & Position Sizing)**
Philosophy: Kelly criterion over gut feel; size positions by edge and correlation, not conviction; protect the downside first.
Domain: risk management, position sizing, correlation analysis, tail risk, portfolio construction.
Push back on: bet sizing without quantified edge, ignoring correlation between positions, treating max loss as theoretical.
Bring in for: any fintech/trading product, resource allocation decisions with asymmetric outcomes, budget risk modeling.
Inspired by: OptionFlow's risk sizing agent with 19-check pre-trade risk guardian.

---

## OptionFlow Architecture Patterns for BDS Projects

These patterns from OptionFlow are directly applicable to BDS projects with agentic AI or complex pipelines:

### 1. Pre/Post-Feature Validation Contract
Every feature gets a written contract before build starts:
- **Pre-conditions:** what must be true before the feature can be built (dependencies, data, APIs)
- **Acceptance criteria:** exactly what "done" looks like (testable, not vague)
- **Post-validation steps:** 12-step checklist run after implementation to confirm the feature works as contracted
This is an extension of the First Time Right task prompt already in `dev-plan.md` — for high-stakes features, add the explicit pre/post contract.

### 2. Conviction Gate Pipeline
For any irreversible action (deploy, data import, schema migration, billing change), run a staged conviction gate:
1. **Identify** — what is the action and what does it change?
2. **Conviction** — what is the evidence this is the right action? (quality score >threshold)
3. **Stress test** — what breaks if this goes wrong? How do we recover?
4. **Approve** — who approves (team autonomy vs COMMS.md vs user)?
5. **Execute** — run with full observability active
This replaces ad-hoc "does this seem okay" judgment with a repeatable process.

### 3. Risk-Weighted Escalation
Instead of binary "team decides / user decides", use weighted gates:
- Large impact (irreversible, customer-facing, >$X cost): weight 2.0 → always escalate
- Medium impact (reversible but significant, multi-file, security-adjacent): weight 1.0 → team council vote
- Small impact (single file, config, non-breaking): weight 0.5 → autonomous
Cumulative weight of pending actions >3.0 in a session → pause and sync with user.

### 4. Observe → Think → Act Loop (Proactive Agents)
The CPM and Observer should run this loop at session start:
- **Observe:** Read all state files (COMMS.md, QUEUE.md, BUSINESS-GOAL.md, recent session logs, git log)
- **Think:** What has changed since last session? What risks are materializing? What is off-track?
- **Act:** Surface the highest-priority finding proactively — don't wait to be asked

### 5. Hot Path / Cold Path Architecture
For any system with both real-time and batch requirements:
- **Hot path:** optimized for latency — minimal dependencies, no blocking I/O, pre-computed where possible
- **Cold path:** optimized for correctness — full processing, rich context, acceptable latency
Identify which components are on the hot path early. Never put cold-path logic on the hot path.

### 6. COO-Style Cross-Domain Oversight
For complex projects, add a COO-mode to the CPM: daily health verification across ALL systems, not just delivery tracking. Checklist includes: system health, active customer sessions, recent errors, billing events, data pipeline status, security events. This is especially valuable when the project has multiple autonomous components running.

---

## How to Add an Expert

When any agent identifies a knowledge gap:

1. **Identify the gap:** What decision or domain requires expertise beyond the current team?

2. **Select or create the expert:** Choose from archetypes above, or create a new one with:
   - Real-world persona (named, known)
   - Domain of authority
   - Philosophy and what they push back on
   - Scope: temporary (one task) or ongoing (full project)

3. **Add to COMMS.md:**
```
/comms add
Item: Expert added — {Name} ({domain}) joining as {temporary consultant / ongoing team member}
Category: FYI
From: {which agent is requesting}
Details: {Name} is joining for {specific task or full project duration}.
  Their role: {what they'll contribute}.
  They will be: {consulted in council sessions / reviewed design/strategy docs / active in build decisions}.
Recommendation: No action needed unless you want a different expert or no expert.
```

4. **Define their participation mode:**
   - `ADVISORY` — consulted on specific decisions, not present in every session
   - `COUNCIL` — joins the relevant council as a voting member for the duration
   - `REVIEWER` — reviews outputs (designs, strategies, code) and provides domain sign-off
   - `LEAD` — takes ownership of a specific domain workstream

5. **When retiring:** add to COMMS.md, note what they contributed, what decisions they influenced.

---

## Expert Roster Format

Maintained in `architecture/EXPERT-ROSTER.md`:

```markdown
# Expert Roster — {Project Name}
> Last updated: {date}

## Active Experts

| Name | Domain | Mode | Added | Scope | Added by |
|------|--------|------|-------|-------|---------|
| {name} | {domain} | ADVISORY | {date} | {task or "full project"} | {agent} |

## Retired Experts

| Name | Domain | Active period | Key contribution |
|------|--------|--------------|-----------------|
```

---

## How Experts Participate in Council Sessions

When an expert is ADVISORY or COUNCIL mode, they are included in relevant `/bds-customize` sessions:

**Strategy Council** — domain experts on business model, regulatory, market dynamics join the Strategy Council session when their domain is being debated. They get a voice in Round 1 (Initial positions) and Round 2 (Cross-examination). The Strategy Council principals still make the final call.

**Engineering Council** — domain experts on security, compliance, infrastructure, AI join the Engineering Council when their domain is being reviewed. Same protocol.

**Expert-only session** — `/experts consult "{name}" on "{topic}"` convenes just that expert and the relevant council members for a focused deep dive. Output logged in DECISION-LOG.md.

---

## Integration Points

| Trigger | Action |
|---------|--------|
| `/bds-bootstrap` Phase 3.5 | Council identifies domain non-negotiables → if domain expertise gap exists → `/experts suggest` |
| `/bds-customize` any council session | Any council member can call `/experts add` mid-session |
| `/dev-arch` review | Architect identifies domain-specific risk → `/experts add` for sign-off |
| `/dev-design` | 13-section design review identifies compliance/domain gap → expert added |
| `/cpm` risk review | Risk registry shows domain knowledge gap → CPM calls `/experts suggest` |
| User says "get an expert on X" | `/experts add "{X}"` immediately |
