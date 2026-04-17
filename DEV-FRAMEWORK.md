# Dev Framework — User Guide

> Build software with the same rigor used at Google and Meta.
> Every feature goes through a 10-gate pipeline: requirements → design → plan → architecture → build → test → docs → commit → deploy → verify.
> The framework enforces **First Time Right**: catching a bug at design costs 2x. Catching it in production costs 100x.

---

## What is this?

The Dev Framework is a set of Claude Code skills (slash commands) that guide every development task — from capturing a raw requirement all the way to verifying it's live in production. It is not a checklist you fill out. It is an intelligent pipeline that does the work for you, with the right expert persona at each step.

**Three levels:**

```
/dev                 ← Meta-Orchestrator: reads your project state, decides what to do next
  /dev-feature       ← Single-feature pipeline: runs one feature through all 10 gates
    /dev-requirements, /dev-design, /dev-plan, /dev-arch, /dev-build,
    /dev-test, /dev-docs, /dev-commit, /dev-deploy, /dev-verify
```

**Architecture is embedded** as the PRISM-10 Framework (10 dimensions: 6 WAF pillars + Frontend + Data + Application + Agentic AI). It runs proactively during design and reactively as an audit.

---

## Quick Start

### Starting a new session (most common)
```
/dev
```
Reads your project state, tells you exactly what to do next and why.

### Starting a brand-new project
```
/project-init
```
Creates the standard directory structure. Then run `/dev`.

### Building a specific feature from scratch
```
/dev-requirements    ← describe what the user needs
/dev-design REQ-{ID} ← create the technical design
/dev-plan DESIGN-{ID} ← break into tasks with prompts
/dev-feature         ← run the full pipeline
```

### Fixing a bug
```
/dev-build           ← read the bug, find root cause, fix it
/dev-test            ← verify the fix, add regression test
/dev-commit          ← commit with bug reference
```

### Architecture health check
```
/dev-arch-audit      ← full 10-dimension analysis → prioritized action items
/dev-arch quick      ← 4-question check for simple changes
```

---

## The 10-Gate Pipeline

Each gate must pass before the next starts. The cost of defects scales sharply the later you catch them.

| Gate | Skill | What happens | Cost of skipping |
|------|-------|-------------|-----------------|
| 1 — Requirements | `/dev-requirements` | Principal PM + Distinguished PM + Chief Architect review. REQ-NNNN created. | Builds the wrong thing. 1x to fix. |
| 2 — Design | `/dev-design` | Full technical design with PRISM-10 architecture review embedded. DESIGN-NNNN created. | Wrong architecture discovered after code is written. 10x to fix. |
| 3 — Plan | `/dev-plan` | Tasks broken down with First-Time-Right prompts. TASK-NNNNs created in QUEUE.md. | Work starts in wrong order. Rework cascades. |
| 4 — Architecture | `/dev-arch` | NFRs, ADRs, capacity, failure modes, deployment checklist. | Security or reliability gap shipped to prod. |
| 5 — Build | `/dev-build` | Read-first, implement, smoke test, mark task done. | — |
| 6 — Test | `/dev-test` | 10 test layers. Auto-fix loop. Bug registry. | Bugs reach users. 20x to fix post-prod. |
| 7 — Docs | `/dev-docs` | FEATURES + ARCHITECTURE + RELEASES + QUEUE all updated. | Documentation debt. Future sessions rebuild already-built things. |
| 8 — Commit | `/dev-commit` | Clean staging, HEREDOC message, REQ reference, branch rules. | Half-baked commits. Broken main branch. |
| 9 — Deploy | `/dev-deploy` | Render deploy + large file protocol + migration protocol. | Partial deploys, schema drift, data loss. |
| 10 — Verify | `/dev-verify` | Prod health + acceptance criteria from REQ verified. Formal report. | Feature "deployed" but not actually working. |

---

## Task Prompts — First Time Right

When `/dev-plan` creates tasks, each task in QUEUE.md includes a **TASK PROMPT** block. This is a self-contained brief that gives Claude Code everything needed to execute correctly:

```markdown
- [ ] TASK-2026-0001: Add flood zone to address response *(type: code)*
  Done when: /v1/address returns flood_zone; TC-API-0001 passes

  > **TASK PROMPT** — Read before writing any code
  >
  > **What**: Add flood_zone field to enrich() in enrich.js via FEMA NFHL API
  > **Why**: REQ-2026-0001 — paying customers need flood risk data
  > **Project context**: GeoClear — Express + SQLite + Node.js, Stripe live
  >
  > **Read first**: enrich.js (pipeline pattern), design/DESIGN-2026-0001.md §6
  >
  > **Build exactly**: fetchFloodZone(lat,lon) with 3s timeout, tier gate (free→preview),
  >   add to enrich() pipeline, return null on FEMA failure
  >
  > **Safeguards**: external call has timeout; free tier gets preview not value; FEMA failure → 200+null not 500
  > **Do NOT**: add new endpoint; add caching (separate task); skip tier gate
  >
  > **Acceptance criteria**: Given valid address → flood_zone returns AE/X/null;
  >   Given FEMA down → 200 with flood_zone:null; Given free key → flood_zone_preview:true
  >
  > **Definition of done**: curl test passes; TC-API-0001 green; FEATURES.md updated; ✅ QUEUE.md
```

---

## PRISM-10 Architecture Framework

Architecture is not a separate phase — it is embedded in the design (proactive) and auditable at any time (reactive).

**10 dimensions:**

| # | Dimension | Skill | Key question |
|---|-----------|-------|-------------|
| 1 | Operational Excellence | `/dev-arch-ops-excellence` | Can you see, operate, and improve the system? |
| 2 | Security | `/dev-arch-security` | Is every trust boundary explicitly validated? |
| 3 | Reliability | `/dev-arch-reliability` | Does failure degrade gracefully, not cascade? |
| 4 | Performance | `/dev-arch-performance` | Is every query indexed? No N+1? |
| 5 | Cost | `/dev-arch-cost` | Is every resource paying for itself? |
| 6 | Sustainability | `/dev-arch-sustainability` | Are we running only what is necessary? |
| 7 | Frontend | `/dev-arch-frontend` | Rendering strategy correct? CWV budgeted? |
| 8 | Data | `/dev-arch-data` | Is data a product with lineage and governance? |
| 9 | Application | `/dev-arch-application` | Business logic isolated from infrastructure? |
| 10 | Agentic AI | `/dev-arch-agentic` | Agent bounds, security, and cost governed? |

**Two modes:**
- **Proactive** — runs inside `/dev-design`. Dimensions are guardrails as the design is written. Catches issues before any code exists.
- **Reactive** — `/dev-arch-audit`. Full gap analysis of existing implementation → ARCH-NNNN action items (P1–P4) → added to QUEUE.md.

---

## All Dev Skills

| Skill | When to use |
|-------|------------|
| `/dev` | Start of any session — reads state, decides what to do |
| `/dev-status` | Read-only project snapshot at any time |
| `/dev-requirements` | New feature request from a user or stakeholder |
| `/dev-design REQ-{ID}` | Approved requirement needs a technical design |
| `/dev-plan DESIGN-{ID}` | Approved design needs task breakdown |
| `/dev-feature` | Run the full 10-gate pipeline for one feature |
| `/dev-feature auto` | Same but without confirmation pauses |
| `/dev-build` | Build phase only (Gate 5) |
| `/dev-test` | Test phase only (Gate 6) — all 10 layers |
| `/dev-docs` | Docs update only (Gate 7) |
| `/dev-commit` | Commit phase only (Gate 8) |
| `/dev-deploy` | Deploy phase only (Gate 9) |
| `/dev-verify` | Verify phase only (Gate 10) |
| `/dev-arch` | Full PRISM-10 architecture review |
| `/dev-arch quick` | 4-question check for simple changes |
| `/dev-arch audit` | Reactive audit of existing implementation |
| `/dev-arch <dimension>` | Single dimension: ops, security, reliability, performance, cost, sustainability, frontend, data, application, agentic |

---

## Where Things Are Saved

Every skill that produces output saves a dated file. Nothing is lost between sessions.

| What | Where | Format |
|------|-------|--------|
| Dev session plans | `sessions/` | `DEV-SESSION-{YYYY-MM-DD-HH-MM-SS}.md` |
| Requirements | `requirements/` | `REQ-{YYYY}-{NNNN}-{slug}.md` |
| Designs | `design/` | `DESIGN-{YYYY}-{NNNN}-{slug}.md` |
| Tasks | `QUEUE.md` | `TASK-{YYYY}-{NNNN}` inline |
| Architecture audits | `architecture/` | `ARCH-AUDIT-{YYYY-MM-DD}.md` |
| Test reports | `reports/tests/` | `TR-{YYYYMMDD-HHMMSS}.md` |
| Verification reports | `reports/verify/` | `VR-{YYYYMMDD-HHMMSS}.md` |
| ADRs | `docs/adr/` | `ADR-{NNNN}-{slug}.md` |
| Runbooks | `docs/runbooks/` | `RUNBOOK-{FEATURE}.md` |

---

## ID Reference

| Entity | Format | Example |
|--------|--------|---------|
| Requirement | REQ-{YYYY}-{SEQ:04d} | REQ-2026-0001 |
| Design | DESIGN-{YYYY}-{SEQ:04d} | DESIGN-2026-0001 |
| Task | TASK-{YYYY}-{SEQ:04d} | TASK-2026-0001 |
| Test case | TC-{TYPE}-{SEQ:04d} | TC-API-0001 |
| Bug | BUG-{YYYY}-{SEQ:04d} | BUG-2026-0001 |
| Architecture item | ARCH-{YYYY}-{SEQ:04d} | ARCH-2026-0001 |
| Architecture decision | ADR-{SEQ:04d} | ADR-0001 |

---

## Common Scenarios

### "I have a new feature idea"
```
/dev-requirements   ← describe the feature; PM + Arch review it
→ /dev-design       ← design it if approved
→ /dev-plan         ← break it into tasks with prompts
→ /dev-feature      ← build it through all 10 gates
```

### "I need to fix a bug"
```
/dev-build          ← read the bug report, find root cause, fix
/dev-test           ← verify fix + add regression TC to TC-REGISTRY
/dev-commit         ← commit referencing BUG-ID
```

### "I haven't worked on this in a while"
```
/dev                ← reads everything, tells you exactly what's pending and why
```

### "Is our architecture healthy?"
```
/dev-arch-audit     ← full analysis, P1–P4 action items added to QUEUE
```

### "Something broke in production"
```
/dev-verify         ← health check + failure diagnosis
→ /dev-build        ← fix
→ /dev-deploy       ← redeploy
→ /dev-verify       ← confirm restored
```

---

## Maintenance

Source of truth for all skills: `~/.claude/skills/dev-*.md`

```bash
# After editing any skill, sync to all locations:
cp ~/.claude/skills/dev-*.md ~/.claude/commands/
cp ~/.claude/skills/dev-*.md .claude/skills/
cp ~/.claude/skills/dev-*.md .claude/commands/
```
