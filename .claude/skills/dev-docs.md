# /dev-docs — Documentation Phase

Update all project documentation as part of the feature — never as a follow-up. Docs ship with code, in the same commit.

---

## Step 1 — Load context

Read current versions of: `FEATURES.md`, `ARCHITECTURE.md`, `RELEASES.md`, `QUEUE.md`, `CLAUDE.md`

Know what was built before updating anything.

---

## Step 2 — Update FEATURES.md

- Add the feature to the correct section (lookup, enrichment, billing, admin, infra, frontend, etc.)
- Include: endpoint path, params, behavior, notes — enough for a future session to understand without reading the code
- If it was in a "Not yet built" section: remove it from there
- If it was nowhere in FEATURES.md: add it and also add it to QUEUE.md as done

**Do not** add vague entries like "improved X" — be specific about what endpoint, what field, what behavior.

---

## Step 3 — Update ARCHITECTURE.md

- New endpoint → add to the correct table (public / protected / admin) with method, path, description
- New data field → add to data model section
- New tier capability → update tier table
- Removed from "Not Yet Built" list if it was there
- Update the `Last updated` header version/date if the file has one

---

## Step 4 — Update RELEASES.md

Add one bullet to `## Unreleased`:
```
- <type>: <what shipped> — <why it matters / what problem it solves>
```
Types: `feat` / `fix` / `infra` / `docs` / `perf`

One bullet per feature. Not a paragraph. Not a list of files changed.

---

## Step 5 — Update QUEUE.md

- Check off the completed item with ✅
- If the feature wasn't in QUEUE.md: add it and check it off
- If it was `⏳ IN PROGRESS`: replace with ✅
- If related items were unblocked by this feature: note that inline

---

## Step 6 — Update CLAUDE.md (only if warranted)

Update CLAUDE.md **only** if:
- A new critical rule applies going forward
- A new shorthand command was added
- A new env var is required
- A core architectural pattern changed

Do **not** update CLAUDE.md for routine feature additions.

---

## Step 7 — Update memory (if relevant)

If the feature introduces something worth remembering across future sessions:
- New competitor, pricing tier, or architectural decision → write a `project` memory
- New behavioral rule → write a `feedback` memory
- New external reference → write a `reference` memory

Write to `~/.claude/projects/<project-path>/memory/` following the memory file format.
Update `MEMORY.md` index.

---

## Step 8 — Verify completeness

Re-read all four core files (FEATURES, ARCHITECTURE, RELEASES, QUEUE) and confirm:
- [ ] Feature appears in FEATURES.md with sufficient detail
- [ ] Endpoint or change appears in ARCHITECTURE.md
- [ ] One bullet in RELEASES.md Unreleased section
- [ ] QUEUE.md item is ✅

Do not proceed to `/dev-commit` until all four are checked.

---

## Step 9 — Report

```
Docs updated:
  FEATURES.md    ✅  <what was added>
  ARCHITECTURE.md ✅  <what was added>
  RELEASES.md    ✅  <bullet added>
  QUEUE.md       ✅  <item checked off>
  CLAUDE.md      <✅ updated | — not changed>
  Memory         <✅ written | — not needed>
Next: run /dev-commit
```
