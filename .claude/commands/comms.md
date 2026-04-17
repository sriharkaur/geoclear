# /comms — Project Communications Hub

> One file. Every item that needs human attention, input, or decision.
> Written by: Claude, CPM, Observer, Strategy Council, Engineering Council, or you.
> You own the Status and Your Input fields.
> Lives at: `COMMS.md` in the project root.

---

## The Purpose

Every project needs a single place where human ↔ system communication is maintained. Not chat (which disappears). Not scattered across session logs. One file, always findable, always up to date.

When any agent needs your input, review, or decision — it goes in COMMS.md.
When you need to communicate something to the system — it goes in COMMS.md.
When a skill wants you to read a file — it adds a linked item to COMMS.md and tells you the item number.

**The prompt from Claude will say:** "Please review COMMS.md item #7" — you open the file, click the link, read, add your input, update the status.

---

## Invocation Variants

```
/comms                        — show all open items (status: NEW or REVIEW)
/comms init                   — create COMMS.md for this project (if it doesn't exist)
/comms add                    — add a new item (used by any agent needing human input)
/comms open                   — list all items with status NEW, REVIEW, or IN PROGRESS
/comms all                    — list all items including DONE and DEFERRED
/comms done N                 — mark item #N as DONE
/comms defer N                — mark item #N as DEFERRED
/comms update N "your input"  — add your input to item #N programmatically
```

---

## Step 1 — Create COMMS.md

Called by `/bds-bootstrap` Phase 0 and `/project-init`.

Creates `COMMS.md` in the project root with this structure:

```markdown
# COMMS — {Project Name}
> Human ↔ BDS communication hub. One file, everything that needs your attention.
> You own the **Status** and **Your Input** fields on every item.
> Created: {YYYY-MM-DD} | Project: {name}

---

## START HERE — How to Use This File

**This is the single communication channel between you and the BDS system.**

- When any agent (CPM, Observer, Strategy Council, Engineering Council) needs your input → it adds an item here and tells you the number in the chat prompt.
- When you need to communicate something to the system → add it here or just type in Claude Code.
- To act on an item: open the link, read, update **Your Input**, change **Status** to ✅ DONE.

**Status values you control:**
| Status | Meaning |
|--------|---------|
| 🆕 NEW | Just added — not yet reviewed |
| 👀 REVIEW | You're looking at it |
| ⏳ IN PROGRESS | Action underway |
| ✅ DONE | Resolved |
| ⏭️ DEFERRED | Not now — revisit later |
| 🚫 REJECTED | Won't do — with reason |

---

## BDS QUICK START

| You want to... | Type this in Claude Code |
|----------------|--------------------------|
| Full business health check | `/bds` |
| Start engineering work | `/dev` |
| Run a strategy session | `/strategy` |
| See your business goals | `/business-goal` |
| Full program status | `/cpm` |
| Neutral view of anything | `/observer` |
| Bootstrap a new project | `/bds-bootstrap` |
| Import BDS to a project | `/bds-import` |
| Convene the councils | `/bds-customize` |

**Key project files:**
- [BUSINESS-GOAL.md](BUSINESS-GOAL.md) — north star: what we're building, for whom, what winning looks like
- [QUEUE.md](QUEUE.md) — what's being built right now and what's next
- [FEATURES.md](FEATURES.md) — complete inventory of everything built
- [FRAMEWORK.md](FRAMEWORK.md) — full index of every skill and guide
- [BDS.md](BDS.md) — the complete operating system

---

## YOUR BUSINESS IDEA

> Enter your business idea here when starting a new project.
> The BDS reads this file — your idea here becomes the seed for everything.

{Enter your business idea below this line}

---

## COMMUNICATIONS LOG

> Items are added by agents (Claude, CPM, Observer, councils) and by you.
> You control Status and Your Input.
> To reference an item: "COMMS.md item #N"

---
```

After creating: confirm the file exists and show the user the "START HERE" section.

---

## Step 2 — Add an Item

When any agent needs human input, review, or decision, it adds an item using this format.

Each item appended to `COMMS.md` as a block:

```markdown
### #{N} — {ONE-LINE SUMMARY}
**Status:** 🆕 NEW
**Date:** {YYYY-MM-DD HH:MM}
**From:** {CPM / Observer / Strategy Council / Engineering Council / BDS Keeper / Claude / You}
**Category:** {DECISION / REVIEW / ACTION / FYI / QUESTION / BLOCKER}

**Details:**
{2–5 sentences describing what this is and why it needs attention}

**Link:** [{filename or description}]({relative/path/to/file.md}) — {what to look at, specific section if relevant}

**Decision log:** [DECISIONS.md](DECISIONS.md){if a decision was made: ` — see DEC-{NNN}` | if pending: ` — will be logged as DEC-{NNN} when approved`}

**Recommendation:**
{What the agent recommends you do. Specific, actionable. "Approve X", "Read section Y and confirm", "Decide between A and B".}
{If no recommendation needed (FYI): "No action required — for your awareness."}

**Your Input:**
_(Add your input, decision, or notes here. Then update Status above.)_

---
```

**Categories:**
- `DECISION` — you must choose between options
- `REVIEW` — you need to read and approve/reject something
- `ACTION` — you need to do something outside the system (e.g., add a DNS record, approve a Stripe transfer)
- `CREDENTIAL` — the team needs access to a service; you add the credential to `~/.zshrc`
- `FYI` — no action needed, but you should know this
- `QUESTION` — the system has a question that blocks progress
- `BLOCKER` — work is stopped until this is resolved
- `EXPERT-ADDED` — a domain expert has joined the team (FYI, no action needed unless you disagree)

---

## Credential Request Template

When any agent needs access to a website or service, it uses this specific format:

```markdown
### #{N} — CREDENTIAL NEEDED: {service name}
**Status:** 🆕 NEW
**Date:** {YYYY-MM-DD HH:MM}
**From:** {agent}
**Category:** CREDENTIAL

**Service:** {service name and URL}
**What it's needed for:** {specific task — be precise}
**Access method once available:** {API / Playwright / MCP / Admin login}

**Add to ~/.zshrc:**
```bash
export {VARIABLE_NAME}="your_{service}_key_or_password_here"
```

**How the team will secure it:**
- Added to `config/secrets-manifest.yaml` (name only, no value)
- Added to `.env.example` (name only)
- Read at runtime via `source ~/.zshrc`
- Never committed to git, never logged, never shown in chat

**Once you've added it:** Update status to ✅ DONE. The team will detect it on the next session start.

**Your Input:**
_(Add the credential to ~/.zshrc, then mark DONE)_
```

---

## Expert Addition Notification Template

When `/experts` adds a domain expert, it adds this to COMMS.md:

```markdown
### #{N} — EXPERT ADDED: {Name} ({domain})
**Status:** 🆕 NEW
**Date:** {YYYY-MM-DD HH:MM}
**From:** {agent that identified the need}
**Category:** EXPERT-ADDED

**Expert:** {Full name} — {one-line bio / known for}
**Domain:** {specific domain they cover}
**Scope:** {temporary — for task X / ongoing — full project duration}
**Participation mode:** {ADVISORY / COUNCIL / REVIEWER / LEAD}
**Why added:** {what gap they fill, which decision prompted this}

**Recommendation:** No action needed. Expert is now active.
If you prefer a different expert or want to remove this one, reply in Your Input.

**Your Input:**
_(Update if you want changes. Otherwise mark DONE when reviewed.)_
```

---

## Step 3 — Reference Items in Prompts

When an agent adds an item and needs the user to act, the agent's response ends with:

```
━━━ ACTION NEEDED ━━━
Added to [COMMS.md](COMMS.md) as item #{N}: {one-line summary}
Category: {category} | From: {agent}
→ Please review item #{N}, add your input, and update the status.
```

This makes it scannable — the user sees the item number in chat, opens COMMS.md, finds the numbered block, clicks the link, and updates the status.

---

## Step 4 — Show Open Items

`/comms` or `/comms open` — display all items where status is 🆕 NEW, 👀 REVIEW, or ⏳ IN PROGRESS.

Format:

```
=== COMMS — OPEN ITEMS ===
{N} items need your attention | Date: {YYYY-MM-DD}

#N  [🆕 NEW]         {YYYY-MM-DD}  from: {agent}    {one-line summary}
    Category: {X}  → [COMMS.md#{N}](COMMS.md)

#N  [⏳ IN PROGRESS]  {YYYY-MM-DD}  from: {agent}    {one-line summary}
    Category: {X}  → [COMMS.md#{N}](COMMS.md)

{if zero open items: "✅ All clear — no open items."}
```

---

## Step 4b — Key Decisions You Should Know

Every `/comms` run also checks `DECISIONS.md` for entries added since the last session and surfaces them:

```
=== KEY DECISIONS (since last session) ===
{if none: "No new decisions logged since last session."}

DEC-{NNN} | {YYYY-MM-DD} | {source} | {topic}
  → {decision made — one sentence}
  → [Full context]({detail link})

DEC-{NNN} | {YYYY-MM-DD} | {source} | {topic}
  → {decision made — one sentence}
  → [Full context]({detail link})
```

**Purpose:** You don't need to read every session log. Key decisions bubble up here so you always know what was decided on your behalf, with a direct link to the reasoning.

**What counts as "key":**
- Any DECISION category COMMS item resolved ✅ DONE
- Any council decision (Strategy Council, Engineering Council)
- Any architecture decision (ADR created)
- Any BDS global change applied by BDS Keeper
- Any risk escalation resolved (P0/P1 in CPM)

Decisions that do NOT appear here (not surprising enough): routine task completions, session start/end logging, doc updates.

---

## Integration — When Each Agent Adds Items

| Agent | Adds to COMMS.md when... |
|-------|-------------------------|
| `/bds-bootstrap` | Approval gate 1 (strategy brief ready for review) |
| `/bds-bootstrap` | Approval gate 2 (engineering brief ready for review) |
| `/bds-bootstrap` | BLOCKED (missing secrets, DNS, 3x task failure) |
| `/bds-customize` | Council needs human clarification on business model |
| `/cpm` | Risk escalation (P0 or unowned P1 risk) |
| `/cpm` | Decision open >7 days with no owner |
| `/cpm` | Delivery blocked >48 hours |
| `/cpm` | Business metrics off-track vs BUSINESS-GOAL.md targets |
| `/observer` | Significant drift detected (stated vs actual) |
| `/observer` | Tie-breaker invoked — decision logged, needs acknowledgment |
| `/dev` | Task blocked (needs credentials, external action, or decision) |
| `/dev-deploy` | Deploy requires manual step (DNS, platform config) |
| `/dev-secrets` | Secret rotation overdue |
| `/strategy` | Strategy analysis complete — ready for your review |
| `/bds-keeper` | BDS global change proposal ready for user approval |
| `/bds-keeper` | Drift indicators found — health is RED |
| `/bds-ops` | NVIDIA gateway unreachable >1 session |
| `/bds-ops` | NVIDIA API key missing (CREDENTIAL request) |
| Claude directly | Any time human input is needed and no other agent owns it |

---

## COMMS.md Rules

1. **Never delete items** — change status to ✅ DONE or 🚫 REJECTED, never remove
2. **Numbers never reuse** — item #7 is always item #7, even after it's done
3. **One item per need** — don't bundle unrelated things into one item
4. **Links must be relative** — so they work in VSCode, GitHub, and any editor
5. **Agent adds recommendation** — never add a blank item; always include a recommendation or explicit "no action needed"
6. **Staleness check** — if an item is 🆕 NEW for >7 days, the CPM flags it in its next status report

---

## COMMS.md is not the only communication

Chat prompts are still the primary way of working. COMMS.md is for:
- Things that need to persist across sessions
- Things that require your explicit input or decision
- Things a future session needs to know you agreed to
- The record of what was asked of you and what you decided

Think of COMMS.md as the paper trail. The chat is the conversation.
