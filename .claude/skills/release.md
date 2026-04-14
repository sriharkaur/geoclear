# /release — Cut a GeoClear release

Cut a new version, update RELEASES.md and ARCHITECTURE.md.

## Steps

1. **Ask for version number** if not provided in args (e.g. `/release 0.2.0`).

2. **Read `RELEASES.md`** — collect everything under `## Unreleased`.

3. **If Unreleased is empty**, tell the user and stop — nothing to release.

4. **Update `RELEASES.md`**:
   - Add a new section `## vX.Y.Z — YYYY-MM-DD` (today's date) above the previous release
   - Move all Unreleased bullets into it
   - Reset `## Unreleased` to `_(none)_`

5. **Update `ARCHITECTURE.md`** header line:
   - Change `Last updated: vA.B.C (date)` to `Last updated: vX.Y.Z (today)`

6. **Update `CLAUDE.md`** header:
   - Change `Version A.B.C` to `Version X.Y.Z`

7. **Report** what was included in the release — list the bullets that moved from Unreleased.

Do not commit, push, or tag git unless the user explicitly asks.
