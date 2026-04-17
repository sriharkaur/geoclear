# /dev — Dev Meta-Orchestrator

> Project-level intelligence layer. Reads full project state, decides which dev skills to invoke, in what sequence, and explains every decision with reasoning.
> This sits ABOVE /dev-feature (single feature pipeline) — it looks across all features, all debt, all open work.
> Output: session plan shown to user + saved to `sessions/DEV-SESSION-{YYYY-MM-DD-HH-MM-SS}.md`

---

## What this does

`/dev` is the intelligent entry point for any development session. It reads everything, decides what matters most, shows transparent reasoning, and hands off to the right skill.

It never guesses. It reads actual files.

---

## Step 1 — Read full project state

Read ALL of the following. Do not skip any:

```
CLAUDE.md                          — rules, stack, constraints, business context
FEATURES.md                        — what is built
ARCHITECTURE.md                    — tech stack, all endpoints
QUEUE.md                           — task execution state (IN PROGRESS / queued / done)
RELEASES.md                        — version history (last release date)
requirements/REQUIREMENTS-INDEX.md — open REQs and their status
design/DESIGN-INDEX.md             — DESIGNs and their status
tests/BUG-REGISTRY.md              — open bugs (if exists)
architecture/ARCH-AUDIT-INDEX.md   — P1/P2 arch debt items (if exists)
```

Then check git status: `git status --short` and `git log --oneline -5`

---

## Step 2 — Build state snapshot

From what you read, extract:

```
IN_PROGRESS_TASKS:    [ TASK-IDs with ⏳ in QUEUE.md ]
QUEUED_TASKS:         [ TASK-IDs with □ and dependencies met ]
BLOCKED_TASKS:        [ TASK-IDs with □ but unmet dependencies ]
OPEN_REQS:            [ REQ-IDs with status = Draft or Approved, no linked design ]
APPROVED_REQS:        [ REQ-IDs Approved with no linked DESIGN ]
APPROVED_DESIGNS:     [ DESIGN-IDs Approved with no linked tasks in QUEUE ]
OPEN_BUGS:            [ BUG-IDs with status = Open ]
P1_ARCH_DEBT:         [ ARCH-IDs with P1 priority, unresolved ]
P2_ARCH_DEBT:         [ ARCH-IDs with P2 priority, unresolved ]
UNCOMMITTED_CHANGES:  [ from git status ]
LAST_RELEASE:         [ version + date from RELEASES.md ]
```

---

## Step 3 — Apply decision rules (in priority order)

Work through these rules in order. The FIRST rule that fires becomes the primary recommendation. Continue down the list to identify secondary actions.

**Rule 1 — Uncommitted work exists**
If UNCOMMITTED_CHANGES is non-empty:
→ Determine if it's a half-finished feature or ready to commit
→ If ready: recommend `/dev-commit` then `/dev-deploy`
→ If in-progress: treat as Rule 2
Reasoning: uncommitted work is a risk — it can be lost, and it's not in version control

**Rule 2 — In-progress task exists**
If IN_PROGRESS_TASKS is non-empty:
→ Recommend resuming `/dev-build` for the first in-progress task
→ Then continue its pipeline: `/dev-test` → `/dev-docs` → `/dev-commit` → `/dev-deploy` → `/dev-verify`
Reasoning: stopping mid-task creates partial state; always finish before starting new work

**Rule 3 — P1 architecture debt exists**
If P1_ARCH_DEBT is non-empty:
→ Recommend `/dev-arch-security` or the relevant dimension sub-skill
→ P1 = active risk; it blocks new feature work
Reasoning: shipping features on top of P1 security/reliability gaps compounds risk

**Rule 4 — Open bugs exist**
If OPEN_BUGS is non-empty with severity Critical or High:
→ Recommend fixing the highest-severity bug: `/dev-build` targeting the bug
→ Then: `/dev-test` → `/dev-commit`
Reasoning: unresolved bugs in production take priority over new features

**Rule 5 — Approved DESIGN with no tasks**
If APPROVED_DESIGNS is non-empty:
→ Recommend `/dev-plan DESIGN-{ID}` for the first approved design
Reasoning: approved design is ready to execute; planning unblocks build

**Rule 6 — Approved REQ with no DESIGN**
If APPROVED_REQS is non-empty:
→ Recommend `/dev-design REQ-{ID}` for the first approved REQ
Reasoning: approved requirements need design before any code can start

**Rule 7 — Tasks queued with dependencies met**
If QUEUED_TASKS is non-empty:
→ Recommend `/dev-feature` starting at Gate 5 (build) for the first ready task
Reasoning: all prior gates passed; build can proceed

**Rule 8 — P2 architecture debt**
If P2_ARCH_DEBT is non-empty and no higher-priority work:
→ Recommend addressing the oldest P2 item
Reasoning: P2 items compound into P1s over time

**Rule 9 — No open work**
If none of the above:
→ Recommend `/dev-requirements` to capture the next feature
→ Ask: "What's the next thing you want to build?"
Reasoning: clean slate — good time to plan carefully

---

## Step 4 — Build orchestration plan

Format the plan as follows. Be explicit about every decision.

```
=== /dev SESSION PLAN ===
Date:    {YYYY-MM-DD HH:MM}
Project: {project name from CLAUDE.md}

STATE SNAPSHOT
  In Progress:     {count} tasks — {TASK-IDs or "none"}
  Queued (ready):  {count} tasks
  Open bugs:       {count} — {BUG-IDs or "none"}
  Open REQs:       {count} — {REQ-IDs or "none"}
  Approved DESIGNs waiting for plan: {count}
  P1 arch debt:    {count} items
  P2 arch debt:    {count} items
  Uncommitted changes: {yes/no}

DECISIONS
  1. {Action} — [Rule {N}] {one-line reasoning why this is first}
  2. {Action} — [Rule {N}] {one-line reasoning}
  3. {Action} — [Rule {N}] {one-line reasoning}
  ... (all applicable decisions, in sequence)

RECOMMENDED SEQUENCE
  Step 1: {skill invocation} — {what it will do}
  Step 2: {skill invocation} — {what it will do}
  Step 3: {skill invocation} — depends on Step 1 outcome

INVOKING NOW: {first skill}
```

Show this plan to the user BEFORE invoking anything.

---

## Step 5 — Confirm and invoke

If the project has customers or live prod traffic (check CLAUDE.md for "PRODUCTION STATUS"):
→ Show plan and ask: "Proceed with Step 1?" before invoking

If no production (fresh project, dev only):
→ Show plan and invoke Step 1 immediately unless `/dev plan-only` was called

For `/dev plan-only`:
→ Show plan only, do not invoke any skill

---

## Step 6 — Save session report

After the plan is shown (and after any invoked skill completes), save the session to:

```
sessions/DEV-SESSION-{YYYY-MM-DD-HH-MM-SS}.md
```

Format:

```markdown
---
date: {YYYY-MM-DD HH:MM:SS}
triggered_by: /dev
project: {project name}
---

## State Snapshot
{full state snapshot block}

## Decision Log
{full decisions block with Rule citations}

## Session Outcome
{what was invoked, what completed, what is now in-progress}

## Next Session
{what Rule will fire next, what to expect}
```

Create `sessions/` directory if it does not exist.

---

## Invocation variants

```
/dev              — full orchestration: read state → plan → confirm → invoke
/dev plan-only    — read state → show plan → stop (no invocation)
/dev status       — alias for /dev-status (read-only project snapshot)
/dev resume       — skip state analysis, resume the first IN_PROGRESS task directly
/dev <task-id>    — focus on one specific TASK-ID: show its full context + continue it
```

---

## Integration with other meta-orchestrators

`/dev` handles: everything in the dev pipeline (requirements → deploy → verify)
`/strategy` handles: business strategy, GTM, pricing, KPIs, SWOT

If during `/dev` analysis you detect that strategic context is missing (e.g., no SWOT, no 90-day plan, MRR goal undefined), note it in the session report as a recommendation to run `/strategy`.
