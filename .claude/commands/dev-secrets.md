# /dev-secrets — API Key & Secrets Management

> Secure lifecycle management for all project secrets: create, store, deploy, audit, rotate.
> Pattern: .env locally (gitignored) → platform env vars via API → never in git, never in chat.
> Acting as: Chief Security Architect (Zero Trust model applied to secrets)

---

## The Secrets Hierarchy

```
Developer machine
  ~/.zshrc                ← personal/global tools (GITHUB_TOKEN, ANTHROPIC_API_KEY, RENDER_API_KEY)
  .env                    ← project-local secrets (gitignored, NEVER committed)
  .env.example            ← committed — shows required var names WITHOUT values

Deployment platform (Render / Railway / Vercel / AWS)
  Environment variables   ← set via platform API, not manual dashboard when possible
  Secrets manager         ← for Scale/Enterprise: AWS Secrets Manager, GCP Secret Manager

NEVER:
  git history             ← secrets in code, even "deleted" ones, are compromised
  chat / logs             ← never paste in conversation
  config/                 ← committed config files never contain real values
  Docker images           ← no secrets baked into image layers
```

---

## Step 1 — Read existing secrets from environment

When `/dev-secrets` runs, read from `~/.zshrc` to determine what's available globally:

```bash
# Read without exposing values — check for presence only
source ~/.zshrc 2>/dev/null

# Known global secrets to check for:
GITHUB_TOKEN       — GitHub API (create repos, push)
GH_TOKEN           — GitHub CLI alternative name
RENDER_API_KEY     — Render platform API (deploy env vars)
ANTHROPIC_API_KEY  — Claude / Anthropic API
STRIPE_SECRET_KEY  — Stripe (note: project-specific, not truly global)
CLOUDFLARE_API_KEY — Cloudflare DNS
OPENAI_API_KEY     — OpenAI (if used)
```

Report what is present (by name, never value). Flag any that should be project-local not global (e.g., STRIPE_SECRET_KEY is project-specific and should be in .env, not ~/.zshrc).

---

## Step 2 — Create secrets manifest

Every project must have a machine-readable record of all secrets it needs.

Create `config/secrets-manifest.yaml` (committed — contains names and metadata, never values):

```yaml
# config/secrets-manifest.yaml
# Documents all secrets required by this project.
# Values NEVER go in this file. Add values to .env (local) and platform env vars (deployed).
# Last audited: {YYYY-MM-DD}

secrets:
  - name: STRIPE_SECRET_KEY
    purpose: "Stripe payment processing — charge customers, manage subscriptions"
    required_in: [production, staging]
    optional_in: [development]
    rotation_period: "90 days"
    rotation_runbook: "docs/runbooks/RUNBOOK-SECRETS.md#stripe"
    owner: "backend API"
    sensitivity: critical  # critical | high | medium | low

  - name: STRIPE_WEBHOOK_SECRET
    purpose: "Verify Stripe webhook signatures — prevents spoofed payment events"
    required_in: [production, staging]
    optional_in: []
    rotation_period: "on webhook endpoint change"
    owner: "webhook handler"
    sensitivity: critical

  - name: DATABASE_URL
    purpose: "Database connection string"
    required_in: [production, staging]
    optional_in: []  # local uses NAD_DB or SQLite file path instead
    rotation_period: "on compromise or quarterly"
    owner: "data layer"
    sensitivity: critical

  # Add all project secrets following this pattern
```

---

## Step 3 — Create .env and .env.example

**Create `.env`** (gitignored — never committed):

```bash
# .env — LOCAL DEVELOPMENT ONLY
# Never commit this file. Values here are for local dev only.
# Production values go in the deployment platform's env var configuration.

# Database
NAD_DB=data/dev.db                    # local dev DB

# Auth / Admin
NAD_ADMIN_SECRET=dev_admin_secret_local

# Stripe (use TEST mode keys locally)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_PRICE_STARTER=price_test_...

# Add all secrets from secrets-manifest.yaml
```

**Create `.env.example`** (committed — shows structure without values):

```bash
# .env.example — copy this to .env and fill in values
# See config/secrets-manifest.yaml for details on each variable

# Database
NAD_DB=data/dev.db

# Auth / Admin
NAD_ADMIN_SECRET=

# Stripe (use test keys locally: https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_
STRIPE_WEBHOOK_SECRET=whsec_
STRIPE_PRICE_STARTER=price_

# Add new variables here whenever you add to secrets-manifest.yaml
```

**Ensure `.gitignore` contains:**
```
.env
.env.*
!.env.example
```

---

## Step 4 — Deploy secrets to platform via API

**For Render (primary deployment target):**

Read `RENDER_API_KEY` from environment (sourced from `~/.zshrc`).

```bash
# Set an environment variable on a Render service via API
# Service ID is in CLAUDE.md under Deployment section

set_render_env() {
  local service_id=$1
  local key=$2
  local value=$3

  curl -s -X PUT \
    "https://api.render.com/v1/services/${service_id}/env-vars" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "[{\"key\":\"${key}\",\"value\":\"${value}\"}]"
}
```

**When to use this step:**
- New service created
- New secret added to secrets-manifest.yaml
- Secret rotation (old value → new value, verify, then remove old)

**Never** set production secrets (live Stripe keys, live DB passwords) from a terminal command visible in shell history without clearing history after.

---

## Step 5 — Audit for leaked secrets

Before every commit and as a standalone audit:

```bash
# Check git history for secret patterns
git log --all --full-history -p | grep -iE "(sk_live|sk_test|whsec_|api_key|secret|password|token)" | grep -v ".example" | grep -v "secrets-manifest"

# Check current files (excluding .env which should be gitignored)
grep -r --include="*.js" --include="*.ts" --include="*.py" --include="*.go" \
  -E "(sk_live_|sk_test_|whsec_|Bearer [a-zA-Z0-9_\-]{20,})" \
  --exclude-dir=node_modules --exclude-dir=.git .
```

**If a secret is found in git history:**
1. Treat it as COMPROMISED — rotate immediately (new key from the provider)
2. Use git-filter-repo to remove from history: `git filter-repo --path <file> --invert-paths`
3. Force push: `git push --force-with-lease`
4. Notify all collaborators to re-clone
5. Document the incident in `docs/runbooks/RUNBOOK-SECRETS.md`

---

## Step 6 — Write secrets runbook

Create `docs/runbooks/RUNBOOK-SECRETS.md`:

```markdown
# Runbook: Secrets Management

## Adding a new secret
1. Add to `config/secrets-manifest.yaml` (name, purpose, rotation_period)
2. Add to `.env.example` (name=, no value)
3. Add to your local `.env` (name=actual_value)
4. Run `/dev-secrets deploy` to push to Render
5. Update `CLAUDE.md` §5 (Environment Variables table)

## Rotating a secret
1. Generate new value at the provider (Stripe, etc.)
2. Add new value to Render env (do NOT remove old yet)
3. Verify new value works: run smoke test
4. Remove old value from Render
5. Update local `.env`
6. Update rotation date in `secrets-manifest.yaml`

## Secret leaked in git
1. Immediately rotate at the provider
2. Run: git filter-repo --path <file> --invert-paths
3. Force push to remote
4. Notify all collaborators
5. Document in this file under ## Incidents

## Incidents
| Date | Secret | Action taken | Resolved |
|------|--------|-------------|---------|
```

---

## Invocation variants

```
/dev-secrets                — full audit: check for leaks, verify .env.example, check manifest
/dev-secrets init           — create .env, .env.example, secrets-manifest.yaml for a new project
/dev-secrets deploy         — push all secrets from .env to Render via API
/dev-secrets deploy staging — push to staging service only
/dev-secrets audit          — scan git history and codebase for leaked secrets
/dev-secrets rotate <NAME>  — guided rotation for a specific secret
/dev-secrets add <NAME>     — add a new secret to the manifest + .env.example
```

---

## Integration with dev-deploy

`/dev-deploy` calls `/dev-secrets audit` before every deploy. A deploy is blocked if:
- Any secret pattern found in staged files
- `.env` is staged for commit (should be gitignored)
- `config/secrets-manifest.yaml` lists a required secret not present in the deployment environment

---

## The rule: 3 places, never more

| Environment | Where secrets live | How set |
|------------|-------------------|---------|
| Local dev | `.env` (gitignored) | Manual, once |
| Staging | Render env vars | `/dev-secrets deploy staging` |
| Production | Render env vars | `/dev-secrets deploy production` |

That's it. No other place. Not in code, not in config, not in chat, not in logs.
