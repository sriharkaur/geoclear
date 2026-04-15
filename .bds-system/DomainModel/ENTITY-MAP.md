# BDS Domain Entity Map
> Visual hierarchy, relationships, and cross-tier connections.
> Last updated: 2026-04-15 | Version: 1.0

---

## Primary Hierarchy — Top-Down View

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                         TIER 1: BUSINESS                                    ║
║                                                                              ║
║  BusinessIdea (BI-YYYY-NNNN)                                                 ║
║    "What are we building, for whom, and why?"                                ║
║       │                                                                      ║
║       └──► Vision (VIS-YYYY-NNNN)                                            ║
║              "Where are we in 3 years?"                                      ║
║                 │                                                            ║
║                 └──► BusinessGoal (BG-YYYY-NNNN)  [1..N per quarter]        ║
║                        "What measurable outcome this quarter?"               ║
║                           ├──► MarketingGoal (MG-YYYY-NNNN)                 ║
║                           │      "How do we reach and convert customers?"   ║
║                           ├──► DevGoal (DG-YYYY-NNNN)                       ║
║                           │      "What must engineering deliver?"           ║
║                           └──► CustomerGrowthGoal (CGG-YYYY-NNNN)           ║
║                                  "AARRR: what growth metric moves?"         ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                │ (BG drives)
                                ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                         TIER 2: STRATEGY                                    ║
║                                                                              ║
║  BusinessGoal (BG) ──► StrategyAnalysis (STRAT-YYYY-NNNN)                   ║
║                              ├── Persona (PER-YYYY-NNNN)                    ║
║                              ├── Competitor (COMP-YYYY-NNNN)                ║
║                              └── PricingTier (TIER-YYYY-NNNN)               ║
║                                                                              ║
║  BusinessGoal (BG) ──► KPI (KPI-YYYY-NNNN)                                  ║
║  MarketingGoal (MG) ──► KPI                                                  ║
║  CustomerGrowthGoal (CGG) ──► KPI                                            ║
║                              │                                               ║
║                              └──► Measurement ──────────────────────┐       ║
║                                   (periodic check)                  │       ║
╚══════════════════════════════════════════════════════════════════════╬═══════╝
                                │ (DG drives)            FEEDBACK LOOP │
                                ▼                                       │
╔══════════════════════════════════════════════════════════════════════╬═══════╗
║                         TIER 3: PLANNING                            ║       ║
║                                                                      │       ║
║  DevGoal (DG) ──► Epic (EPIC-YYYY-NNNN)  [1..N per DG]             │       ║
║                     "3-month capability theme"                       │       ║
║                       │                                             │       ║
║                       └──► Feature (FEAT-YYYY-NNNN) [1..N per EPIC]│       ║
║                              "Shippable customer-facing capability"  │       ║
║                                 │                                    │       ║
║                                 └──► Requirement (REQ-YYYY-NNNN)    │       ║
║                                        │  3-layer review             │       ║
║                                        │  (PM + Dist PM + Arch)      ◄───── ┘
║                                        └──► DesignDocument           (if KPI miss:
║                                               (DESIGN-YYYY-NNNN)     new REQ created)
║                                                 │  9-dim arch review           
║                                                 └──► ArchDecision (AD-NNNN)   
╚══════════════════════════════════════════════════════════════════════════════╝
                                │
                                ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                         TIER 4: ENGINEERING                                  ║
║                                                                              ║
║  DesignDocument (DESIGN) ──► Task (TASK-YYYY-NNNN) [1..N per DESIGN]        ║
║                                 │  "1-session implementation unit"           ║
║                                 ├──► APIEndpoint (EP-YYYY-NNNN)             ║
║                                 ├──► DataModel (DM-YYYY-NNNN)               ║
║                                 └──► Migration (MIG-YYYY-NNNN)              ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                │
                                ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                         TIER 5: QUALITY                                      ║
║                                                                              ║
║  Task (TASK) ──► TestCase (TC-YYYY-NNNN) [1 per acceptance criterion]        ║
║                      │  "Given/When/Then — 1 AC = 1 TC"                     ║
║                      └──► TestResult (TR-datetime)                          ║
║                               ├── PASS ──────────────────► Feature ✅       ║
║                               └── FAIL ──► Bug (BUG-YYYY-NNNN)              ║
║                                               └──► Task (fix) [new TASK]    ║
║                                                    (re-enters Tier 4) ↺     ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                │
                                ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                         TIER 6: OPERATIONS                                   ║
║                                                                              ║
║  Task (TASK) ──► Deployment (DEP-YYYY-NNNN)                                  ║
║                      └──► VerificationReport (VR-datetime)                  ║
║                               ├── PASS ──────────────────► Feature shipped  ║
║                               └── FAIL ──► Incident (INC-YYYY-NNNN)         ║
║                                               └──► Bug (BUG) ↺ (Tier 5)    ║
║                                                                              ║
║  Runbook (RB-YYYY-NNNN) ── supports ──► Deployment, Incident response       ║
╚══════════════════════════════════════════════════════════════════════════════╝
                                │ (all tiers)
                                ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                         TIER 7: GOVERNANCE                                   ║
║                                                                              ║
║  Any entity state change ──► CommunicationItem (COMM-NNNN)                  ║
║  Any significant choice ──► Decision (DEC-NNNN)                             ║
║  Any session ──► SessionLog (SESSION-datetime)                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Relationship Matrix

| From → To | Relationship | Cardinality | Link field |
|-----------|-------------|-------------|------------|
| BI → VIS | generates | 1..1 | `vision` in BUSINESS-GOAL.md |
| VIS → BG | decomposes to | 1..N | `linked_vis` on BG |
| BG → MG | decomposes to | 1..N | `linked_bg` on MG |
| BG → DG | decomposes to | 1..N | `linked_bg` on DG |
| BG → CGG | decomposes to | 1..N | `linked_bg` on CGG |
| BG → KPI | measured by | 1..N | `linked_bg` on KPI |
| DG → EPIC | decomposes to | 1..N | `linked_dg` on EPIC |
| EPIC → FEAT | contains | 1..N | `epic` on FEAT |
| FEAT → REQ | specified by | 1..N | `feature` on REQ |
| REQ → DESIGN | designed in | 1..1 | `linked_design` on REQ |
| DESIGN → TASK | planned as | 1..N | `linked_tasks` on DESIGN |
| DESIGN → AD | decided in | 0..N | `linked_design` on AD |
| TASK → TC | tested by | 1..N (one per AC) | `linked_task` on TC |
| TC → TR | runs produce | 1..N | `linked_tc` on TR |
| TR(FAIL) → BUG | creates | 1..1 | `linked_tr` on BUG |
| BUG → TASK | fixed by | 1..1 | `fix_task` on BUG |
| TASK → DEP | deployed in | 1..N | `tasks_included` on DEP |
| DEP → VR | verified by | 1..1 | `linked_vr` on DEP |
| VR(FAIL) → INC | creates | 1..1 | `linked_vr` on INC |
| INC → BUG | reveals | 1..N | `linked_inc` on BUG |
| KPI(miss) → REQ | triggers new | 0..N | `triggered_by_kpi` on REQ |
| Any → COMM | notifies via | 0..N | `linked_entities` on COMM |
| Any → DEC | recorded in | 0..N | `linked_entities` on DEC |

---

## Sibling / Cross-Tier Relationships

```
Persona (PER) ─── informs ────► Feature (FEAT)      (which users does this serve?)
Persona (PER) ─── informs ────► Requirement (REQ)   (acceptance criteria reflect persona)
PricingTier (TIER) ── governs ► APIEndpoint (EP)     (which tier can call what?)
PricingTier (TIER) ── governs ► TestCase (TC)        (tier-specific acceptance criteria)
KPI (KPI) ─── measured by ────► APIEndpoint (EP)     (which endpoints drive the metric?)
StrategyAnalysis (STRAT) ─────► Decision (DEC)       (analyses that produce decisions)
ArchDecision (AD) ─────────────► DESIGN (DESIGN)     (decisions embedded in designs)
```

---

## Entity Count by Tier (typical project at GROWTH stage)

| Tier | Entities | Typical count |
|------|---------|--------------|
| Business | BI, VIS, BG, MG, DG, CGG | 1, 1, 3–5, 3–5, 5–10, 3–5 |
| Strategy | STRAT, PER, COMP, KPI, TIER | 10–20 analyses, 3 personas, 5–10 competitors, 10–15 KPIs, 3–5 tiers |
| Planning | EPIC, FEAT, REQ, DESIGN, AD | 5–10 epics, 20–50 features, 40–100 REQs, 40–100 DESIGNs, 10–20 ADs |
| Engineering | TASK, EP, DM, MIG | 100–300 tasks, 10–30 endpoints, 5–15 data models, 5–20 migrations |
| Quality | TC, TR, BUG | 200–600 TCs, N run results, 10–50 bugs |
| Operations | DEP, VR, INC, RB | 50–200 deploys, 50–200 VRs, 5–20 incidents, 10–20 runbooks |
| Governance | DEC, COMM, SESSION | 20–50 decisions, 100–300 COMM items, 50–200 sessions |
