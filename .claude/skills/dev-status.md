# /dev-status — Master Project Status

> CLAUDE.md is the orchestrator. This skill is how it responds to any "what is the state of X" question.
> Read the right files, report actual data, never guess or summarize from memory.

---

## How to invoke

```
/dev-status                  — full project snapshot
/dev-status features         — what is built
/dev-status pending          — what is in the queue
/dev-status deployment       — live production status
/dev-status strategy         — current strategic priorities
/dev-status requirements     — requirements index
/dev-status design           — design documents index
/dev-status <feature-name>   — everything about a specific feature
```

---

## Step 1 — Load orchestration context

Always read `CLAUDE.md` first. It is the master index and tells you:
- Project name, version, production URL
- Where each type of information lives
- Which skills handle which tasks
- Current critical rules and context

---

## Step 2 — Route to the right source

| Query | Files to read | Command to run |
|-------|--------------|----------------|
| "what's built?" / "what features exist?" | `FEATURES.md` | — |
| "what's pending?" / "what's next?" | `QUEUE.md` | — |
| "what's in progress?" | `QUEUE.md` (⏳ items) | — |
| "is X deployed?" / "deployment status?" | `QUEUE.md` + live health check | `curl /api/health` |
| "strategy" / "priorities" / "focus?" | `strategy/` folder — latest dated file | — |
| "what are the requirements for X?" | `requirements/REQUIREMENTS-INDEX.md` | — |
| "show me the design for X?" | `design/DESIGN-INDEX.md` | — |
| "architecture?" / "endpoints?" | `ARCHITECTURE.md` | — |
| "releases?" / "version history?" | `RELEASES.md` | — |
| "bugs?" / "known issues?" | `tests/BUG-REGISTRY.md` | — |
| "tasks for X?" | `QUEUE.md` + linked TASK IDs | — |
| "everything about feature X" | All of the above, filtered to X | — |

---

## Step 3 — Full project snapshot (`/dev-status` with no argument)

Read and synthesize in this order:

### 3.1 Production health
```bash
curl -s <prod-url>/api/health
```
Report: HTTP status, DB connected, version if present.

### 3.2 What is built
Read `FEATURES.md` — list feature areas and count of features per area.

### 3.3 What is in progress
Read `QUEUE.md` — find all ⏳ IN PROGRESS items.

### 3.4 What is queued
Read `QUEUE.md` — find unchecked items in priority order.

### 3.5 Recent deployments
Read `RELEASES.md` → `## Unreleased` section. What has shipped since last version cut?

### 3.6 Strategic focus
Read the latest file in `strategy/` (by date prefix). Extract the Top 5 Priorities section.

### 3.7 Open requirements
Read `requirements/REQUIREMENTS-INDEX.md` if it exists — list any Approved but not-yet-designed requirements.

### 3.8 Open designs
Read `design/DESIGN-INDEX.md` if it exists — list any Approved but not-yet-implemented designs.

---

## Step 4 — Output the status report

```
=== PROJECT STATUS ===
Project:     <name from CLAUDE.md>
Date:        {YYYY-MM-DD HH:MM}
Version:     <current version>

PRODUCTION
  Status:    ✅ LIVE  (HTTP 200)  |  ❌ DOWN  |  ⚠️ DEGRADED
  URL:       <prod-url>
  Health:    <actual response from health check>

BUILT FEATURES
  <feature area 1>: <N features>  — <2-line summary>
  <feature area 2>: <N features>  — <2-line summary>
  Total: <N> features across <M> areas

IN PROGRESS
  ⏳ <item> — <brief description>
  (or: — nothing in progress)

QUEUED (next up)
  □ <item 1>  [REQ-{ID} if exists]
  □ <item 2>
  □ <item 3>
  ... (<N> total items queued)

RECENTLY SHIPPED (unreleased)
  - <bullet from RELEASES.md Unreleased>
  - <...>

STRATEGIC FOCUS (from latest strategy/)
  P1: <priority>
  P2: <priority>
  P3: <priority>

OPEN REQUIREMENTS  (approved, not yet designed)
  REQ-{ID}: <title>  |  — none

OPEN DESIGNS  (approved, not yet implemented)
  DESIGN-{ID}: <title>  |  — none

KNOWN BUGS  (open)
  BUG-{ID}: <title>  |  — none

=== NEXT ACTION ===
<Based on what's in progress and queued: what should be worked on next, and which skill to invoke>
Example: "REQ-2026-0001 is Approved. Run /dev-design REQ-2026-0001 to create the design document."
Example: "DESIGN-2026-0003 is Approved. Run /dev-feature to begin implementation."
Example: "Nothing in progress. Run /dev-requirements to capture the next feature."
```

---

## Step 5 — Feature-specific query (`/dev-status <feature-name>`)

When user asks about a specific feature (by name, REQ ID, or DESIGN ID):

1. Search `FEATURES.md` — is it built? What does it do?
2. Search `requirements/REQUIREMENTS-INDEX.md` — does a REQ exist? What is its status?
3. Search `design/DESIGN-INDEX.md` — does a DESIGN exist? What is its status?
4. Search `QUEUE.md` — is it queued, in progress, or done?
5. Search `RELEASES.md` — when did it ship?
6. Search `tests/BUG-REGISTRY.md` — any known bugs?

Report:
```
Feature: <name>

Requirement:  REQ-{ID} — <status: Draft|Approved|Rejected>
Design:       DESIGN-{ID} — <status: Draft|Approved> | — not yet designed
Implementation: ✅ BUILT (FEATURES.md) | ⏳ IN PROGRESS | □ QUEUED | — not started
Deployed:     ✅ YES (shipped in v{X.Y.Z}) | — not yet
Known bugs:   <N> open | — none

Files:
  requirements/REQ-{ID}-slug.md
  design/DESIGN-{ID}-slug.md
  (code files if known from ARCHITECTURE.md or FEATURES.md)
```

---

## Step 6 — Answer operational questions

**"Is X deployed?"**
- Check `QUEUE.md` for ✅ status
- Run health check on prod URL
- Look in RELEASES.md for the feature
- Report with evidence, not assumption

**"What should we work on next?"**
- Read QUEUE.md priority order
- Check if any ⏳ IN PROGRESS should be resumed first
- Check REQUIREMENTS-INDEX and DESIGN-INDEX for approved-but-not-started items
- Cross-reference with strategy/ for alignment with current priorities

**"How do I start building feature X?"**
```
1. Does a REQ exist? → if not: run /dev-requirements
2. Does a DESIGN exist? → if not: run /dev-design REQ-{ID}
3. Is the DESIGN approved? → if not: design must be approved first
4. Run /dev-feature — it will pick up from the approved design
```

---

## CLAUDE.md Orchestrator Pattern

For any project using this framework, CLAUDE.md should include this section:

```markdown
## MASTER ORCHESTRATOR — Skill Routing

CLAUDE.md is the central index. All knowledge lives in specific files. Never guess — read the right file.

| Ask... | Read... | Run... |
|--------|---------|--------|
| What features are built? | FEATURES.md | — |
| What's pending / next? | QUEUE.md | — |
| What's the architecture? | ARCHITECTURE.md | — |
| What are requirements for X? | requirements/ | /dev-requirements |
| What's the design for X? | design/ | /dev-design |
| What's the deployment status? | live health check | /dev-verify |
| What's the strategic focus? | strategy/ | /strategy-swot |
| Start a new feature | QUEUE.md → run | /dev-feature |
| Capture a new requirement | — | /dev-requirements |
| Create a design | requirements/ → | /dev-design |
| Build a planned feature | design/ → | /dev-feature |
| Run all tests | — | /dev-test |
| Deploy to prod | — | /dev-deploy |
| Verify production | — | /dev-verify |
| Project health snapshot | all files | /dev-status |
```
