# Decision Log — GeoClear
> Master index of all decisions made across all sessions, councils, and agents.
> One line per decision. Follow the link for full context and reasoning.
> Maintained by: every agent that makes a notable decision.
> Created: 2026-04-15

---

## How to use this file

**Find a decision:** scan the table, use your editor's search (Cmd+F), filter by Source or Topic.
**Read the full context:** click the Detail link — it goes to the session, council entry, or COMMS item where the full reasoning lives.
**Add a decision:** append a row immediately when the decision is made — not at end of session.

---

## Decision Index

| ID | Date | Time | Source | Topic | Decision made | Detail |
|----|------|------|--------|-------|--------------|--------|
| DEC-001 | 2026-04-15 | — | BDS Framework Build | Tech stack | Node.js + SQLite (better-sqlite3) + Express — no ORM, no frontend framework | [CLAUDE.md](CLAUDE.md) |
| DEC-002 | 2026-04-15 | — | BDS Framework Build | Data architecture | 91GB nad.db on Render prod disk — staging-first pipeline for all imports | [ARCHITECTURE.md](ARCHITECTURE.md) |
| DEC-003 | 2026-04-15 | — | BDS Framework Build | Deployment | Render auto-deploy on git push main — Cloudflare CNAME DNS-only proxy | [CLAUDE.md](CLAUDE.md) |
| DEC-004 | 2026-04-15 | — | BDS Framework Build | Pricing | 4 tiers: Free (10K), Starter $49 (50K), Growth $249 (500K), Scale $999 (5M) + Enterprise custom | [CLAUDE.md](CLAUDE.md) |
| DEC-005 | 2026-04-15 | — | BDS Framework Build | Auth | KeyStore pattern — API keys hashed, per-key rate limiting, usage tracking in keys.db | [ARCHITECTURE.md](ARCHITECTURE.md) |
| DEC-006 | 2026-04-15 | — | BDS Council Session | BDS framework scope | Full BDS system built with 47 skills, councils, CPM, Observer, COMMS, FIRST-PRINCIPLES | [BDS.md](BDS.md) |

---

## Decision Sources Reference

| Source type | Example | Where to find detail |
|------------|---------|---------------------|
| Strategy Council | Strategy Council on pricing | `architecture/DECISION-LOG.md` — D-{N} entries |
| Engineering Council | Engineering Council on architecture | `architecture/DECISION-LOG.md` — D-{N} entries |
| COMMS.md item | COMMS #4: approved disk upgrade | `COMMS.md` — item #{N} |
| Dev session | Dev session 2026-04-17 | `sessions/DEV-SESSION-{datetime}.md` |
| Strategy session | Strategy session 2026-04-18 | `strategy/STRATEGY-SESSION-{datetime}.md` |
| BDS health session | BDS session 2026-04-20 | `sessions/BDS-SESSION-{datetime}.md` |
| CPM report | CPM risk escalation | `reports/program/CPM-STATUS-{datetime}.md` |
| Observer tiebreak | Observer tiebreak on D-7 | Session log where Observer was invoked |

---

## Adding a New Entry

Append a row at the bottom of the Decision Index table:

```
| DEC-{next N} | {YYYY-MM-DD} | {HH:MM} | {source} | {topic} | {decision made — one sentence} | [{label}]({path}) |
```

**ID numbering:** sequential, never reuse. DEC-001 through DEC-999 for this project.
**Source:** which agent, council, or skill made the decision.
**Decision made:** what was decided — one sentence, specific enough to understand without reading the detail.
**Detail:** relative path link to the file containing the full discussion.
