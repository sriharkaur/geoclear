# /deploy — Deploy GeoClear to production

Push code to Render and verify the deployment.

## How Render builds work

Render is configured for **Docker-based deployment** (Runtime: Docker, using the `Dockerfile` in the repo root). This means:

- `npm ci` + `better-sqlite3` native compilation happen inside Docker layer caching — deps layer only rebuilds when `package.json` or `package-lock.json` changes.
- Code-only pushes hit the cached deps layer → deploy time ~45 seconds.
- The 91GB `nad.db` is on Render's persistent disk at `/data` — never in the image.
- No warmup query at startup — SQLite warms lazily on the first `/api/health` or `/api/stats` request via the 1-hour stats cache. A blocking startup query would prevent the port from opening before Render's health check fires.

**Do not change Render's runtime back to "Node"** — that re-enables full `npm install` + `better-sqlite3` recompile on every deploy (4-6 min).

## Steps

1. **Check git status** — if there are uncommitted changes, warn the user and ask whether to proceed.

2. **Push to GitHub**:
   - `git push origin main`
   - Render detects the push, builds the Docker image, and deploys.

3. **Monitor Render deployment**:
   - Read `RENDER_API_KEY` from `~/.zshrc`
   - Poll `GET https://api.render.com/v1/services/srv-d7ep7bfavr4c73d46gng/deploys?limit=1` until `status` is `live` or `failed`
   - Report deploy status and duration.

4. **Production smoke test** (run after deploy is `live`):
   - `curl https://geoclear.io/api/health` — expect `{"status":"ok"}`
   - `curl "https://geoclear.io/api/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC&key=<any_valid_key>"` — expect address results

5. **Report** pass/fail. If failed, show the Render deploy logs URL:
   `https://dashboard.render.com/web/srv-d7ep7bfavr4c73d46gng/logs`

## Local testing (avoid unnecessary deploys)

Test against the real `nad.db` locally before pushing — zero deploy needed:
```bash
node web-server.js
```
For Stripe webhook testing without deploying:
```bash
stripe listen --forward-to localhost:4001/v1/webhook/stripe
```
Only push to Render when verifying production-specific behavior.

Do not force-push. Do not bypass hooks.
