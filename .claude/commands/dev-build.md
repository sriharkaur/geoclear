# /dev-build — Build Phase

Implement a feature following project patterns exactly. Read before write. Verify after build.

---

## Step 1 — Load context

Read: `CLAUDE.md` (patterns, rules), `ARCHITECTURE.md` (existing endpoints and data model)

If coming from `/dev-plan`, the plan already exists. If invoked standalone:
- Ask: "What are you building?" and get the plan first, or run `/dev-plan` logic.

---

## Step 2 — Read before writing

Read every file that will be modified. No exceptions. Never edit a file you haven't read in this session.

Also read adjacent files to understand patterns:
- Adding an endpoint → read 2 existing endpoints in the same file for auth and response patterns
- Adding enrichment → read existing enrichment functions
- Adding a test → read existing tests in the same module

---

## Step 3 — Implement

Follow CLAUDE.md rules for this project. Universal rules:

**Never:**
- Hardcode secrets — use `process.env.*` / env vars only
- Bypass auth middleware on protected routes
- Add error handling for scenarios that cannot happen
- Add features beyond what was planned
- Add comments or docstrings to code you didn't change
- Use `--no-verify` on commits

**Always:**
- Follow existing patterns (file structure, function naming, response shape)
- Validate at system boundaries only (user input, external APIs)
- Prefer editing existing files over creating new ones
- Keep the scope exactly what was planned — no extras

**Project-specific patterns** (detect from CLAUDE.md):
- Express/Node: follow auth middleware pattern, use existing KeyStore, match response shape
- FastAPI/Python: follow existing router patterns, use existing service layer
- EJS/Node: follow Schema → DAL → Routes → Template sequence
- Other: follow whatever sequence CLAUDE.md defines

---

## Step 4 — Immediate smoke test

After building, run the feature-specific test immediately. Do not proceed without this.

Run the exact smoke test defined in the plan. Show the actual output — do not summarize.

**Pass**: Feature returns expected response
**Fail**: Diagnose the error from the actual response, fix, re-test. Repeat until pass.

---

## Step 5 — Report

Output:
```
Built: <feature name>
Files changed: <list>
Smoke test: PASS
Response: <actual curl output>
Next: run /dev-test
```
