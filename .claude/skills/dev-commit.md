# /dev-commit — Commit Phase

Stage, validate, and commit. Code + docs together. Never partial. Never bypass hooks.

---

## Step 1 — Pre-commit checklist

Run these checks before staging anything:

```bash
git status          # see all changed files
git diff            # review unstaged changes
```

Verify:
- [ ] Only expected files are modified — no accidental changes to unrelated files
- [ ] No sensitive files staged: `.env`, `keys.db`, `*.db`, `credentials.*`, `secrets.*`
- [ ] No large binaries staged
- [ ] All four doc files are modified: `FEATURES.md`, `ARCHITECTURE.md`, `RELEASES.md`, `QUEUE.md`
- [ ] Tests passed (Gate 3) before this step

If any check fails: stop, fix, re-check.

---

## Step 2 — Stage files

Stage feature code + all doc files together. Never commit code without docs.

```bash
git add <specific-code-files> FEATURES.md ARCHITECTURE.md RELEASES.md QUEUE.md
# add CLAUDE.md only if it was updated
```

Use specific file names — never `git add -A` or `git add .` (risk of staging sensitive files).

---

## Step 3 — Write commit message

Read CLAUDE.md for project-specific commit format. Default format:

```
<type>: <description in imperative present tense, under 72 chars>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types:
- `feat:` — new feature or capability
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code change, no behavior change
- `test:` — test changes
- `chore:` — build, config, deps, infra
- `perf:` — performance improvement

Good: `feat: add flood zone null preview to free-tier API response`
Bad: `update stuff`, `wip`, `fix bug`, `changes`

---

## Step 4 — Commit

```bash
git commit -m "$(cat <<'EOF'
<type>: <description>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Never:**
- `--no-verify` (bypasses pre-commit hook)
- `--amend` on a pushed commit (rewrites shared history)
- `--allow-empty`
- Force-push without explicit user instruction

**If pre-commit hook fails:** read the hook error, fix the underlying issue. Do not bypass.

---

## Step 5 — Branch handling

**On feature branch:**
- Commit is local — do not push yet
- Only push when feature is complete and smoke-tested on local
- When ready to merge: `git checkout main && git merge feat/<name> && git push origin main`
- Delete branch after merge: `git branch -d feat/<name>`

**On main:**
- Push immediately: `git push origin main`
- Auto-deploy triggers if Render is configured

---

## Step 6 — Confirm and report

```bash
git log --oneline -1    # confirm commit recorded
git status              # confirm clean working tree
```

```
Committed: <SHA> — <message>
Branch: <main | feat/<name>>
Pushed: <yes — triggers auto-deploy | no — on feature branch>
Next: run /dev-deploy
```
