# /version — Show current version and unreleased changes

Read-only. Reports current version state and suggests next bump.

## Steps

1. **Read current version** from `CLAUDE.md` header (`Version X.Y.Z`).

2. **Read `RELEASES.md`**:
   - Show what is under `## Unreleased`
   - Show the most recent versioned release section (title + date only)

3. **Suggest next version bump** based on unreleased content:
   - New endpoints or features → MINOR bump (0.X.0)
   - Bug fixes, infra, config only → PATCH bump (0.0.X)
   - Breaking API changes → MAJOR bump (X.0.0)

4. **Report**:
   - Current version
   - Last release date
   - Unreleased items (or "none")
   - Suggested next version with reasoning

Do not modify any files. To cut a release, use `/release vX.Y.Z`.
