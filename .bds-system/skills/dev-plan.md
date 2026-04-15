# /dev-plan — Task Planning

> Planning is the bridge between an approved design and working code.
> Done by Principal TPM (sequencing, risk, estimates) + Principal Architect (technical decomposition, implementation order).
> Input: approved DESIGN-{ID} document. Output: TASK-NNNN breakdown in QUEUE.md.

---

## TASK ID Format

```
{PREFIX}-TASK-{YYYY}-{SEQ:04d}
Example: GEO-TASK-2026-0001

Stored: inline in QUEUE.md, referenced from design/DESIGN-{ID}.md and requirements/REQ-{ID}.md
```

**Always use `/bds-db next-id TASK` for atomic ID assignment:**
```bash
sqlite3 .bds/bds.db "
  INSERT INTO entity_sequences (entity_type, year, last_seq)
  VALUES ('TASK', strftime('%Y','now'), 0)
  ON CONFLICT(entity_type, year) DO UPDATE SET last_seq = last_seq + 1
  RETURNING printf('%s-TASK-%s-%04d',
    (SELECT project_prefix FROM project_info),
    strftime('%Y','now'),
    last_seq
  );
"
```
Read `project_prefix` from CLAUDE.md before assigning any ID. Never hand-sequence TASK IDs.

---

## Step 1 — Load context

Read:
- `CLAUDE.md` — project rules, branch strategy, deployment platform
- `QUEUE.md` — current execution state (what's done, in progress, queued)
- `FEATURES.md` — what's already built (never replan something that exists)
- `ARCHITECTURE.md` — existing patterns and constraints

If a DESIGN-{ID} was specified: read `design/DESIGN-{ID}-*.md` fully.
If a REQ-{ID} was specified: read `requirements/REQ-{ID}-*.md` and linked design.

If neither was specified:
1. Find first `⏳ IN PROGRESS` item in QUEUE.md — resume that
2. Otherwise, find first unchecked item in highest-priority section
3. If it has a linked DESIGN: read it. If not: note that planning without a design is higher risk.

---

## Step 2 — Principal TPM: Break into tasks

**Acting as Principal Technical Project Manager** (15+ years shipping complex features at scale):

Decompose the design into the smallest independently completable tasks. Rules:
- Each task should be completable in 1 session (a few hours max)
- Each task must be verifiable (has a clear done-criterion)
- Tasks must be ordered by dependency (no task should require completing a later task first)
- No task should span both "code change" and "data migration" — keep concerns separate
- Identify tasks that can be parallelized (multiple devs or sessions)

**Task decomposition template:**

```
TASK-{ID}: <imperative title — what to do, not what to observe>
  REQ: REQ-{ID}
  DESIGN: DESIGN-{ID}
  Type: code | schema | data | config | test | docs | infra
  Depends on: TASK-{prior-ID} | — (none)
  Blocks: TASK-{subsequent-ID} | — (none)
  Done when: <specific, measurable criterion — e.g. "curl /v1/address returns flood_zone field for all tiers">
  Risk: Low | Medium | High
  Risk detail: <what could go wrong and how to detect it>
```

---

## Step 3 — Principal Architect: Validate sequencing and technical completeness

**Acting as Principal Architect at Google or Meta**:

Review the TPM's task list against the approved design:

1. **Coverage**: Are all sections of the design covered by at least one task? No design element left unimplemented.
2. **Sequencing**: Do the tasks respect technical dependencies? (You cannot test what hasn't been built. You cannot migrate data before the schema is ready.)
3. **Test coverage**: Is there a TASK for writing tests? (Never an afterthought — tests are part of the implementation.)
4. **Migration tasks**: If there's a schema change, is there a separate task for: write migration file → apply on staging → verify → apply on prod?
5. **Rollback task**: For any irreversible step, is there a task to verify the rollback plan before executing the forward step?
6. **Documentation task**: Is updating FEATURES.md, ARCHITECTURE.md, RELEASES.md, QUEUE.md part of the task list?

If gaps found: add missing tasks before finalizing.

---

## Step 4 — Determine branch strategy

| Change type | Git strategy |
|-------------|-------------|
| Single-file fix, config, docs | Push directly to `main` |
| Multi-file feature, new endpoint, schema change | `git checkout -b feat/<kebab-name>` |
| Data operation (import, merge) | No branch — data never goes in git |

Create the branch now if multi-file. Never start work on main for multi-file changes.

---

## Step 5 — Read all files that will be modified

Before producing the final plan, read every file that will be touched. Do not plan from memory.

---

## Step 6 — Produce the plan

Output exactly this format:

```
=== FEATURE PLAN ===
Feature:   <feature name>
REQ:       REQ-{ID}: <title>
Design:    DESIGN-{ID}: <title>
Branch:    <main | feat/<name>>

TASKS:
  TASK-{ID}  [type]  <title>
    Done when: <criterion>
    Depends on: — | TASK-{prior-ID}
    Risk: Low/Med/High — <brief>

  TASK-{ID}  [type]  <title>
    Done when: <criterion>
    ...

TASK ORDER (execution sequence):
  1. TASK-{ID}: <title>
  2. TASK-{ID}: <title>
  ...

FAILURE MODES:
  - <risk>: <how to detect> → <mitigation>
  - <risk>: ...

ROLLBACK:
  <exact steps — git revert, migration rollback SQL, or data restore command>

SMOKE TEST (final verification):
  <exact curl or test command to verify the complete feature works>

Estimated sessions: <N>
```

---

## Step 7 — Generate task prompts (First Time Right context blocks)

For each task, generate a self-contained TASK PROMPT. This prompt goes directly in QUEUE.md below the task line. It gives Claude Code everything needed to execute correctly the first time — without having to ask follow-up questions or re-read all linked docs.

**What a good task prompt contains:**
- What to build (specific, scoped — no more, no less)
- Why it matters (business context in one sentence)
- Files to read first (in order, with reason why)
- Implement exactly this (concrete steps from the design)
- Safeguards (checklist of things that MUST be true — security, reliability, scope)
- Do NOT (anti-patterns, scope creep, common mistakes to avoid)
- Acceptance criteria (from REQ — verifiable with a curl or test command)
- Definition of done (checkboxes, each specific and testable)

**Task prompt template:**

```markdown
  > **TASK PROMPT** — Read this entire block before writing any code
  >
  > **What**: {one sentence — what to build/change/fix}
  > **Why**: {one sentence — business reason, linked to REQ-{ID}}
  > **Project context**: {project name, stack, key constraint relevant to this task}
  >
  > **Read first** (in order):
  > 1. `{file}` — {why this file is needed}
  > 2. `requirements/REQ-{ID}.md` — acceptance criteria
  > 3. `design/DESIGN-{ID}.md` — full spec (Section {N} is most relevant)
  >
  > **Build exactly this**:
  > - {specific implementation step from design}
  > - {specific implementation step}
  > - {specific implementation step}
  >
  > **Safeguards** (all must be true or task is incomplete):
  > - [ ] {specific check — e.g. "external call has 3s timeout"}
  > - [ ] {specific check — e.g. "free tier gets preview flag, not full value"}
  > - [ ] {specific check — e.g. "error returns 200 with null field, not 500"}
  >
  > **Do NOT**:
  > - {anti-pattern — e.g. "add a new endpoint — goes into existing /v1/address"}
  > - {scope item — e.g. "add caching — that's TASK-{next-ID}"}
  > - {assumption — e.g. "skip the tier gate check"}
  >
  > **Acceptance criteria** (verify each before marking done):
  > - Given {condition} → {expected result}
  > - Given {condition} → {expected result}
  >
  > **Definition of done**:
  > - [ ] {specific verifiable check — e.g. curl command + expected output}
  > - [ ] Tests pass: {test layer + TC-ID if assigned}
  > - [ ] FEATURES.md updated
  > - [ ] QUEUE.md item checked ✅
```

**Quality bar for task prompts:**
- A developer who has never seen this codebase should be able to execute the task correctly from the prompt alone
- Every safeguard should reference a specific risk (timeout = reliability, tier gate = billing correctness)
- Acceptance criteria must be verifiable — "it works" is not acceptable; a specific curl or assertion is

---

## Step 8 — Write tasks to QUEUE.md

Add the tasks to QUEUE.md under the appropriate section. Each task line is followed immediately by its task prompt block.

Every task section header MUST include lineage IDs (see `~/.claude/DomainModel/LINEAGE-RULES.md`):
- `[BG-{ID}]` — the BusinessGoal this work serves
- `[FEAT-{ID}]` — the Feature being implemented
- `[EPIC-{ID}]` — the Epic it belongs to

Every task prompt MUST include `business_goal: BG-{YYYY}-{NNNN}` and `feature: FEAT-{YYYY}-{NNNN}` so `/domain-lineage audit` can trace it.

```markdown
### <Feature Name>  [REQ-{ID}] [DESIGN-{ID}] [FEAT-{ID}] [BG-{ID}]

- [ ] TASK-{ID}: <title> *(type: code)* — done when: <criterion>
  > **TASK PROMPT** — Read this entire block before writing any code
  >
  > **What**: {specific what}
  > **Why**: {business reason — REQ-{ID}}
  > **Project context**: {stack, constraints}
  >
  > **Read first**: `{file}` (reason), `requirements/REQ-{ID}.md`, `design/DESIGN-{ID}.md §{N}`
  >
  > **Build exactly this**: {list}
  >
  > **Safeguards**: {checklist}
  > **Do NOT**: {list}
  > **Acceptance criteria**: {Given/Then list}
  > **Definition of done**: {checkboxes}

- [ ] TASK-{ID}: <title> *(type: test)* — done when: <criterion>
  > **TASK PROMPT** — ...
```

Update the linked design doc: `linked_tasks: TASK-{ID}, TASK-{ID}, ...`
Update the linked requirement doc: `linked_tasks: TASK-{ID}, TASK-{ID}, ...`

---

## Step 9 — Checkpoint

Show the plan and wait for user confirmation before writing any code.

Exception: if called from `/dev-feature auto`, skip the pause.

After confirmation: mark the first task as `⏳ IN PROGRESS` in QUEUE.md.
