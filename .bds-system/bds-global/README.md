# BDS Global — Control Plane
> The BDS framework managing itself. Version: 1.0 | Project prefix: BDS
> This is the meta-layer: it governs how the BDS framework is built, versioned, and evolved.

---

## What Lives Here

```
~/.claude/bds-global/
├── README.md          ← you are here
├── GOALS.md           ← north star, vision, BGs, KPIs for BDS Global
├── FEATURES.md        ← canonical inventory of every framework capability built
├── QUEUE.md           ← feature backlog with release targets + rollout plan
└── RELEASES.md        ← version history for the BDS framework
```

The operational DB for BDS Global is `~/.claude/bds-global.db`.
The distributed framework lives in `~/.claude/bds-framework/`.

---

## How BDS Global Works

BDS Global treats the BDS framework as a product. It uses BDS itself to:
- Track what's built (`FEATURES.md` = the framework's FEATURES.md)
- Queue what to build next (`QUEUE.md` = the framework's QUEUE.md)
- Measure success (`GOALS.md` = the framework's BUSINESS-GOAL.md)
- Track history (`RELEASES.md` = the framework's RELEASES.md)

**Entry point for BDS Global work:**

```
Start session → read GOALS.md (north star current?) → read QUEUE.md (what's IN PROGRESS?)
             → /dev → build the next BDS framework feature
```

---

## Registered Projects

All projects using BDS are registered in `~/.claude/bds-global.db`:

```bash
sqlite3 ~/.claude/bds-global.db \
  "SELECT project_prefix, project_name, stage, health_score, last_bds_run FROM projects ORDER BY registered_at;"
```

---

## Framework Version

Current: **1.0** | Next target: **1.1** (projects registry + GeoClear onboarding)

```bash
sqlite3 ~/.claude/bds-global.db "SELECT version, released_at FROM bds_framework WHERE id=1;"
```

---

## Feedback from Projects

Project agents submit feedback via COMM items (`category: FEEDBACK`) in their project's `COMMS.md`.
BDS Global agents surface these and translate approved items into tasks in `QUEUE.md`.

See `~/.claude/bds-framework/docs/06-FEEDBACK-GUIDE.md` for the full feedback protocol.
