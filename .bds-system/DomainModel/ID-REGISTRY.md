# BDS Domain Entity ID Registry
> Single source of truth for all entity ID formats across the Business Delivery System.
> Every entity created in any BDS-governed project MUST use an ID from this registry.
> Last updated: 2026-04-15 | Version: 1.0

---

## ID Format Convention

```
{PREFIX}-{YYYY}-{SEQ:04d}     — for time-scoped entities (reset seq per year)
{PREFIX}-{SEQ:04d}            — for project-scoped entities (global project sequence)
{PREFIX}-{YYYY-MM-DD-HH-MM-SS} — for timestamp-keyed artifacts (sessions, results)
```

**Sequence rules:**
- Sequences are per-project, never per-session.
- Never reuse a retired ID — mark as DEPRECATED or SUPERSEDED.
- Sequences start at 0001 and increment globally (not per feature or epic).
- Year component = calendar year when entity was CREATED, never modified.

---

## Master ID Table

| Prefix | Entity | Format | Example | Tier | File Location |
|--------|--------|--------|---------|------|---------------|
| `BI` | BusinessIdea | `BI-{YYYY}-{NNNN}` | `BI-2026-0001` | Business | `strategy/BUSINESS-IDEAS.md` |
| `VIS` | Vision | `VIS-{YYYY}-{NNNN}` | `VIS-2026-0001` | Business | `BUSINESS-GOAL.md` |
| `BG` | BusinessGoal | `BG-{YYYY}-{NNNN}` | `BG-2026-0001` | Business | `BUSINESS-GOAL.md` |
| `MG` | MarketingGoal | `MG-{YYYY}-{NNNN}` | `MG-2026-0001` | Business | `strategy/GOALS-MARKETING.md` |
| `DG` | DevGoal | `DG-{YYYY}-{NNNN}` | `DG-2026-0001` | Business | `strategy/GOALS-DEV.md` |
| `CGG` | CustomerGrowthGoal | `CGG-{YYYY}-{NNNN}` | `CGG-2026-0001` | Business | `strategy/GOALS-CUSTOMER.md` |
| `STRAT` | StrategyAnalysis | `STRAT-{YYYY}-{NNNN}` | `STRAT-2026-0001` | Strategy | `strategy/` |
| `PER` | Persona | `PER-{YYYY}-{NNNN}` | `PER-2026-0001` | Strategy | `strategy/PERSONAS.md` |
| `COMP` | Competitor | `COMP-{YYYY}-{NNNN}` | `COMP-2026-0001` | Strategy | `strategy/COMPETITORS.md` |
| `TIER` | PricingTier | `TIER-{YYYY}-{NNNN}` | `TIER-2026-0001` | Strategy | `ARCHITECTURE.md` |
| `KPI` | KeyPerformanceIndicator | `KPI-{YYYY}-{NNNN}` | `KPI-2026-0001` | Strategy | `strategy/KPIS.md` |
| `EPIC` | Epic | `EPIC-{YYYY}-{NNNN}` | `EPIC-2026-0001` | Planning | `planning/EPICS.md` |
| `FEAT` | Feature | `FEAT-{YYYY}-{NNNN}` | `FEAT-2026-0001` | Planning | `FEATURES.md` |
| `REQ` | Requirement | `REQ-{YYYY}-{NNNN}` | `REQ-2026-0001` | Planning | `requirements/REQ-{YYYY}-{NNNN}-{slug}.md` |
| `DESIGN` | DesignDocument | `DESIGN-{YYYY}-{NNNN}` | `DESIGN-2026-0001` | Planning | `design/DESIGN-{YYYY}-{NNNN}-{slug}.md` |
| `AD` | ArchitectureDecision | `AD-{NNNN}` | `AD-0001` | Planning | `architecture/DECISION-LOG.md` |
| `TASK` | Task | `TASK-{YYYY}-{NNNN}` | `TASK-2026-0001` | Engineering | `QUEUE.md` |
| `EP` | APIEndpoint | `EP-{YYYY}-{NNNN}` | `EP-2026-0001` | Engineering | `ARCHITECTURE.md` |
| `DM` | DataModel | `DM-{YYYY}-{NNNN}` | `DM-2026-0001` | Engineering | `schema.sql` / design docs |
| `MIG` | Migration | `MIG-{YYYY}-{NNNN}` | `MIG-2026-0001` | Engineering | `migrations/` |
| `TC` | TestCase | `TC-{YYYY}-{NNNN}` | `TC-2026-0001` | Quality | `tests/` |
| `TR` | TestResult | `TR-{YYYY-MM-DD-HH-MM-SS}` | `TR-2026-04-15-14-30-00` | Quality | `reports/tests/` |
| `BUG` | Bug | `BUG-{YYYY}-{NNNN}` | `BUG-2026-0001` | Quality | `tests/BUG-REGISTRY.md` |
| `VR` | VerificationReport | `VR-{YYYY-MM-DD-HH-MM-SS}` | `VR-2026-04-15-14-30-00` | Operations | `reports/verify/` |
| `DEP` | Deployment | `DEP-{YYYY}-{NNNN}` | `DEP-2026-0001` | Operations | `RELEASES.md` |
| `INC` | Incident | `INC-{YYYY}-{NNNN}` | `INC-2026-0001` | Operations | `docs/runbooks/INCIDENTS.md` |
| `RB` | Runbook | `RB-{YYYY}-{NNNN}` | `RB-2026-0001` | Operations | `docs/runbooks/` |
| `DEC` | Decision | `DEC-{NNNN}` | `DEC-0001` | Governance | `DECISIONS.md` |
| `COMM` | CommunicationItem | `COMM-{NNNN}` | `COMM-0001` | Governance | `COMMS.md` |
| `SESSION` | SessionLog | `SESSION-{YYYY-MM-DD-HH-MM-SS}` | `SESSION-2026-04-15-14-30` | Governance | `sessions/` |

---

## Legacy / Pre-Registry IDs

These exist in older projects before the registry was established. Treat as equivalent to the new format:

| Old format | Maps to | Notes |
|-----------|---------|-------|
| `D-{N}` (DECISION-LOG.md) | `AD-{NNNN}` | Architecture decisions from council sessions |
| `TASK-{NNNN}` (no year) | `TASK-{YYYY}-{NNNN}` | Year = year the project was created |
| `RUNBOOK-{NAME}` | `RB-{YYYY}-{NNNN}` | Runbooks named by feature not by sequence |

---

## Notes

- `BI` is assigned once per project. If a pivot changes the core idea, create `BI-{YYYY}-0002` and link to the prior one.
- `VIS` evolves: the same vision may have VIS-2026-0001 v1.0, v2.0 — tracked in Evolution Log in BUSINESS-GOAL.md.
- `BG`, `MG`, `DG`, `CGG` are per-quarter: when a new 90-day plan is set, existing goals are closed and new ones created.
- `KPI` instances persist as long as they are tracked. Retired KPIs are marked RETIRED, never deleted.
- `TASK` and `REQ` and `DESIGN` IDs are never reused within a project, even if the work is cancelled.
