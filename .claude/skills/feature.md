# /feature — Implement a new GeoClear feature

Structured workflow for adding any feature. Follows CLAUDE.md §3.

## Steps

1. **Clarify scope** — if the feature name is vague, ask one focused question before touching code.

2. **Read before writing** — identify which files are relevant and read them:
   - New endpoint → read `web-server.js` (auth patterns, route structure)
   - New enrichment → read `enrich.js` (pipeline shape)
   - Key/billing change → read `keys.js`
   - Schema change → read `schema.sql`

3. **Implement**:
   - New endpoints go in `web-server.js` with the existing auth middleware pattern
   - New enrichment fields go in `enrich.js`, wired into the `/api/address` response
   - Schema changes → update `schema.sql` AND document the migration SQL needed
   - Never bypass `KeyStore` validation on protected routes

4. **Manual smoke test** — curl the new endpoint and paste the response shape. Do not declare done without this.

5. **Update `FEATURES.md`** — this is the canonical "what we've built" doc:
   - Add the feature to the correct section (lookup, enrichment, billing, admin, infra, etc.)
   - If it was in the "Not yet built" section, remove it from there
   - Add enough detail (endpoint path, params, notes) that future Claude sessions understand it without reading the code

6. **Update `RELEASES.md` → `## Unreleased`**:
   - Add one bullet describing what shipped

7. **Update `ARCHITECTURE.md`**:
   - Add new endpoint to the appropriate table
   - Update any affected tier capabilities or the "Not Yet Built" list

8. **Update `QUEUE.md`**:
   - Check off the completed item with ✅

Do not commit unless the user asks.
