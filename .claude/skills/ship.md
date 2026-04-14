# /ship — Full end-to-end ship cycle for GeoClear

Master skill. Runs the complete workflow: doc sync → commit → deploy → smoke test → optional release cut.
Call this whenever you want everything done in one shot.

## When to use
- After implementing one or more features and you want to ship
- To sync docs + deploy without cutting a release: `/ship`
- To sync docs + deploy + cut a release: `/ship v1.2.0`

---

## Steps

### 1 — Sync docs (always runs)

Check each of the four tracking docs and bring them current:

**`FEATURES.md`** — for every change made this session:
- Add it to the right section (lookup, enrichment, billing, admin, infra, frontend)
- Remove it from "Not yet built" if it was listed there

**`RELEASES.md` → `## Unreleased`**:
- Add one bullet per shipped item if not already there

**`ARCHITECTURE.md`**:
- Update endpoint tables, tier table, Stripe event table, "Not Yet Built" list

**`QUEUE.md`**:
- Check off completed items with ✅

### 2 — Commit (if there are uncommitted changes)

- `git status` — list what's uncommitted
- Stage all modified tracked files
- Commit with a message summarising what shipped (conventional: `feat:`, `fix:`, `chore:`, `docs:`)
- Do not force-push. Do not skip hooks.

### 3 — Deploy

- `git push origin main` — Render auto-deploys on push
- Read `RENDER_API_KEY` from `~/.zshrc`
- Poll `GET https://api.render.com/v1/services/srv-d7ep7bfavr4c73d46gng/deploys?limit=1` until `status` is `live` or `failed`
- If `failed`: stop, show logs URL `https://dashboard.render.com/web/srv-d7ep7bfavr4c73d46gng/logs`

### 4 — Smoke test (runs after deploy is live)

```bash
curl https://geoclear.io/api/health
```
Expect `{"status":"ok"}`. Report pass/fail.

### 5 — Cut release (only if version arg provided, e.g. `/ship v1.2.0`)

- Move everything under `## Unreleased` in `RELEASES.md` into `## vX.Y.Z — YYYY-MM-DD`
- Reset `## Unreleased` to `_(none)_`
- Update `ARCHITECTURE.md` header: `Last updated: vX.Y.Z (date)`
- Update `CLAUDE.md` header: `Version X.Y.Z`
- Update `FEATURES.md` header: `Last updated: date`
- Commit the version bump: `chore: cut release vX.Y.Z`
- Push again

---

## What each sub-skill covers (for reference)

| Skill | What it does |
|-------|-------------|
| `/feature` | Implement one feature + update all 4 docs |
| `/version` | Show current version + unreleased changes |
| `/release vX.Y.Z` | Cut release only (no deploy) |
| `/deploy` | Deploy only (no doc sync, no release) |
| `/ship` | Everything above in sequence |
| `/ship vX.Y.Z` | Everything above + cut the release |
