# /bds-ops — BDS Operations & Cost Management

> **Purpose**: Operational visibility into BDS system costs, model selection, and infrastructure health.
> **Current tier policy (v1):** Two tiers — Opus for councils and decisions, Sonnet for everything else.
> **Upgrade path**: NVIDIA free tier (4 models) and Ollama local available when evidence warrants expansion.

---

## Invocation Variants

```
/bds-ops                          — full operational status: cost + model assignment + health
/bds-ops cost                     — cost breakdown: session estimates, Opus usage, model distribution
/bds-ops models                   — show model tier assignments for all BDS skills
/bds-ops assign "skill" "tier"    — change model tier for a skill (logged, not auto-applied)
/bds-ops local                    — check if Ollama is running; show local model status
/bds-ops nvidia                   — verify NVIDIA gateway reachability and active models
/bds-ops report                   — save full ops report to reports/program/BDS-OPS-{datetime}.md
```

---

## Current Tier Policy — v1 (Two Tiers)

Start simple. Two models. Add more when evidence warrants.

| Tier | Model | When |
|------|-------|------|
| **opus** | `claude-opus-4-6` | Councils, decisions, complex/security-sensitive code, arch reviews |
| **sonnet** | `claude-sonnet-4-6` | Everything else — standard build/test/deploy, strategy analyses, status, docs |

---

## BDS Skill → Tier Assignment (v1)

### Opus — Councils, Decisions, Complex Code

| Skill | Why Opus |
|-------|----------|
| `/bds-customize` | Strategy Council + Engineering Council — persona debate quality is what catches bad decisions |
| `/observer` (tiebreaker) | Active conflict tie-breaking — maximum reasoning required |
| `/business-goal` (refine) | Post-council alignment — must match council nuance precisely |
| `/bds-bootstrap` (Phase 3.5) | Council customization — same as `/bds-customize` |
| `FIRST-PRINCIPLES.md` amendments | Constitutional changes — zero tolerance for shallow reasoning |
| `/dev-arch` | Full PRISM-10 review — architecture decisions land in DECISIONS.md |
| `/dev-arch-audit` | Gap analysis drives backlog — needs to surface real issues, not obvious ones |
| `/dev-design` (complex features) | Design decisions are upstream of all build work |
| All PRISM-10 sub-skills | Architecture reasoning — each feeds DECISIONS.md |
| Any coding task touching 5+ files | Integration complexity, subtle bugs, security implications |
| Security-sensitive code | Auth, payments, keys, SQL — Opus catches what Sonnet misses |
| `/bds-keeper propose` | BDS global change proposals — feeds DECISIONS.md |

### Sonnet — Standard Coding, Analysis, Operations

| Skill | Why Sonnet |
|-------|-----------|
| `/strategy-swot`, `/strategy-value-prop`, `/strategy-personas` | Excellent analysis quality; user reviews before acting |
| `/strategy-competitors`, `/strategy-pricing`, `/strategy-gtm` | Same — Sonnet is strong for research-heavy writing |
| `/strategy-kpis`, `/strategy-90day`, `/strategy-breakeven`, `/strategy-pivot` | Quantitative + narrative — Sonnet handles well |
| `/bds` (health check) | Read + score — no decisions made |
| `/dev-build` (standard) | Single-service, clear patterns — Sonnet is excellent |
| `/dev-test` | Test generation, auto-fix loop |
| `/dev-docs`, `/dev-commit`, `/dev-deploy`, `/dev-verify` | Structured tasks, low decision risk |
| `/dev-plan`, `/dev-requirements` | Task breakdown + requirements capture |
| `/dev-secrets` (audit) | Pattern scan for leaks |
| `/dev-status` | Read-only project snapshot |
| `/cpm` (all variants) | File reading + structured health output |
| `/observer` (passive monitoring) | Drift detection — pattern matching, not judgment |
| `/bds-keeper` (scan + audit) | BDS file audit — surfaces issues for human review |
| `/comms` (display/update) | Structured list management |
| `/business-goal` (status/history) | Read + display |
| `/experts` | Expert roster management |

---

## Upgrade Path — When to Add More Tiers

Add NVIDIA free tier when:
- Monthly Opus bill from strategy analyses feels disproportionate (currently ~$2-4/month — probably never)
- You want living agents to run between Claude Code sessions without any API cost
- You want offline capability (Ollama local)

The NVIDIA models and Ollama setup are fully documented in `accelerators/` in the BDS repo. Adding them is a config change, not a rebuild.

---

## Cost Tracking

### Session Cost Estimate

When `/bds-ops cost` is run, estimate session cost by scanning the session log for skill invocations:

```
=== BDS OPS — COST ESTIMATE ===
Date: {YYYY-MM-DD}  |  Session: {session log name or "current"}

OPUS INVOCATIONS (paid):
  /bds-customize ×1     ~$0.15–0.40 per council session (est. 50K–130K tokens)
  /observer tiebreaker  ~$0.05–0.10 per invocation
  Subtotal: ~${X}

NVIDIA INVOCATIONS (free):
  /strategy-* ×N        FREE
  /dev-* ×N             FREE
  /bds ×N               FREE
  Subtotal: $0.00

LOCAL INVOCATIONS (free):
  CPM heartbeat ×N      FREE
  Observer passive ×N   FREE
  Subtotal: $0.00

TOTAL SESSION ESTIMATE: ~${X}
Opus % of total: {Y}%

OPTIMIZATION NOTE: {if Opus >20% of invocations, flag specific skill for tier review}
```

### Monthly Budget Tracking

Track in `reports/program/BDS-OPS-MONTHLY-{YYYY-MM}.md`:

| Date | Session | Opus invocations | Estimated cost | Notes |
|------|---------|-----------------|----------------|-------|
{one row per session}

**Monthly Opus budget target:** Keep council sessions ≤2/month unless business-critical. All other work stays free.

---

## Step 1 — Operational Status Display

`/bds-ops` shows:

```
=== BDS OPERATIONS STATUS — {YYYY-MM-DD HH:MM} ===

MODEL AVAILABILITY:
  ✅ NVIDIA gateway    integrate.api.nvidia.com (free tier active)
  ✅ / ❌ Ollama local  localhost:11434 ({running/not running})
  ✅ Anthropic (Opus)  Available (paid — use sparingly)

TIER ASSIGNMENTS: {N} skills mapped
  Opus:         {N} skills
  NVIDIA deep:  {N} skills
  NVIDIA think: {N} skills
  NVIDIA code:  {N} skills
  NVIDIA fast:  {N} skills
  Local:        {N} agents

COST THIS MONTH (estimate):
  Opus sessions: {N} × ~$0.25 avg = ~${X}
  Free tier:     {N} sessions = $0.00
  Total estimate: ~${X}

OPEN BDS-KEEPER PROPOSALS: {N} (run /bds-keeper for details)
LIVING AGENTS STATUS: CPM {active/inactive} | Observer {active/inactive}

RECOMMENDATION: {one sentence — e.g., "No issues. All living agents on free tier as designed."}
```

---

## Step 2 — Check NVIDIA Gateway

`/bds-ops nvidia`:

```bash
# Verify NVIDIA gateway is reachable
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $NVIDIA_API_KEY" \
  "https://integrate.api.nvidia.com/v1/models" 2>/dev/null
```

If `NVIDIA_API_KEY` is not set in `~/.zshrc`, add a COMMS.md CREDENTIAL item:

```markdown
### #{N} — CREDENTIAL NEEDED: NVIDIA API Key
**Category:** CREDENTIAL
**Service:** NVIDIA Inference Gateway — integrate.api.nvidia.com
**What for:** Free model tier (Fast/Code/Deep/Think) for BDS living agents
**Add to ~/.zshrc:**
```bash
export NVIDIA_API_KEY="your_nvidia_api_key_here"
```
**Get it at:** build.nvidia.com → API Keys
**Once added:** Mark ✅ DONE. BDS Ops will detect it next session.
```

---

## Step 3 — Check Local Ollama

`/bds-ops local`:

```bash
curl -s http://localhost:11434/api/tags 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
models = [m['name'] for m in data.get('models', [])]
print('Ollama running. Models:', models if models else 'none installed')
" 2>/dev/null || echo "Ollama not running (localhost:11434 unreachable)"
```

If Ollama is not running or `gemma4:8b` is not installed:

```
RECOMMENDATION: To enable living agents on local (free):
  1. brew install ollama   (if not installed)
  2. ollama serve &        (start in background)
  3. ollama pull gemma4:8b (download model — ~5GB)

Living agents will use NVIDIA fast tier (still free) until local is available.
They will NOT fall back to Opus.
```

---

## Step 4 — Model Routing Logic

When a BDS skill is invoked, the model selection follows this priority:

```
1. Is this skill in the Opus list?
   YES → Use claude-opus-4-6 (Anthropic)
   
2. Is this skill a living agent (CPM heartbeat / Observer passive)?
   YES + Ollama running + gemma4:8b installed → Use localhost:11434
   YES + Ollama not available → Use NVIDIA fast (integrate.api.nvidia.com)
   
3. What tier is this skill assigned?
   deep  → nvidia/llama-3.1-nemotron-ultra-253b-v1
   think → google/gemma-4-31b-it
   code  → qwen/qwen3-coder-480b-a35b-instruct
   fast  → nvidia/llama-3.3-nemotron-super-49b-v1
   
4. Is NVIDIA gateway reachable?
   NO → Escalate to Claude (non-Opus) for analysis/code tasks
       → Add COMMS.md FYI: "NVIDIA gateway unreachable, using Claude for all tiers"
```

**Hard rule: Never silently upgrade to Opus.** If a free tier fails and the only fallback is Opus, add a COMMS.md item and wait for user decision.

---

## Integration with BDS Framework

| Skill | BDS Ops integration |
|-------|---------------------|
| `/bds` | Appends cost estimate to health report |
| `/bds-bootstrap` | Runs `/bds-ops` check in Phase 0 (before any council invocation) |
| `/cpm` | Reads cost estimates for monthly program report |
| `/bds-keeper` | Flags tier misassignments as BDS-IMPROVE proposals |
| Session start | Living agents check: if Ollama down >3 sessions, add COMMS.md FYI |

---

## Reports

`/bds-ops report` saves to `reports/program/BDS-OPS-{YYYY-MM-DD-HH-MM}.md`:

```markdown
# BDS Operations Report — {YYYY-MM-DD HH:MM}

## Model Availability
{status of all 3 tiers}

## Skill → Tier Assignment (full table)
{complete mapping}

## Cost Estimate — This Session
{breakdown}

## Cost Estimate — This Month
{cumulative}

## Living Agent Status
{CPM heartbeat | Observer passive — model used, last run}

## Recommendations
{any tier changes, cost optimizations, gateway issues}
```
