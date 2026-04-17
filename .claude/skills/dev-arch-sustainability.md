# /dev-arch-sustainability — Sustainability Pillar

> WAF Pillar 6: Minimize the environmental impacts of running cloud workloads.
> Applied as Google Chief Sustainability Architect — energy efficiency, data minimization, carbon-aware design.
>
> Core philosophy: Sustainability and performance efficiency are aligned. A system that wastes compute, stores unnecessary data, and runs redundant processes is both expensive and environmentally harmful. Good engineering is sustainable engineering.

---

## Acting as: Chief Sustainability Architect at Google

Google has operated carbon-neutral since 2007 and targets 24/7 carbon-free energy. You apply the same rigor to software that Google applies to data center design. You know that the most sustainable code is code that doesn't run — removing unnecessary computation, data, and processing is always better than optimizing it. You design for efficiency at every layer: algorithm efficiency, data efficiency, infrastructure efficiency.

---

## Design Question Set

### 1. Compute Efficiency — Do we run only what is necessary?

- [ ] Is every background job, cron task, and scheduled process actually needed? When was the last time its output was used?
- [ ] Are any processes running continuously that could be event-driven or on-demand? (polling vs webhooks; always-on worker vs triggered function)
- [ ] Is compute right-sized? (over-provisioned compute burns energy without delivering proportional value)
- [ ] Are there any infinite loops, busy-wait patterns, or tight polling intervals that consume CPU while doing no useful work?
- [ ] Can batch jobs be scheduled during off-peak hours (lower carbon intensity on many grids)?

**For heavy data processing:**
- [ ] Is the processing pipeline structured to minimize passes over data? (read once, process, write once — not read three times for three different operations)
- [ ] Can transformations be pushed down to the storage layer (SQL, columnar scan) rather than reading everything into application memory?
- [ ] Is parallel processing used where safe? (import pipeline: parallel workers for CPU-bound tasks)

### 2. Data Minimization — Do we store only what we need?

> The most sustainable data is data that doesn't exist.

**Storage lifecycle:**
- [ ] Is there a documented retention policy for every data category?

```
Data category:          <usage logs, audit logs, enrichment cache, raw imports>
Retention period:       <how long must it be kept — business need or legal requirement>
Disposition:            <delete after retention | archive to cold storage>
Currently implemented:  YES | NO — how long has data been accumulating?
```

- [ ] Are raw import files deleted after successful processing? (91GB NAD downloads don't need to stay forever)
- [ ] Are temporary/staging files cleaned up after use?
- [ ] Are old backups rotated? (keeping 365 daily backups when 7 would suffice wastes storage energy)
- [ ] Are failed/cancelled jobs cleaned up? (dead queue entries, orphaned temp tables)

**Data format efficiency:**
- [ ] Is data stored in the most efficient format for its access pattern?
  - Analytical/read-heavy → columnar (Parquet, SQLite with proper indexes): 5-20x smaller than CSV/JSON
  - Operational/point-lookup → indexed SQLite or PostgreSQL
  - Log data → compressed append-only (gzip): 5-10x compression typical
- [ ] Is there any JSON blob storage where structured columns would be more efficient?
- [ ] Are there any fields storing redundant copies of data that already exists elsewhere?

### 3. Network and Transfer Efficiency

- [ ] Is gzip/brotli compression enabled on all text-based API responses?
- [ ] Are responses returning only the fields the caller needs? (no over-fetching)
- [ ] Are pagination controls tight enough to prevent massive data transfers? (default page size should not be "all records")
- [ ] Can any large data transfers be replaced by compute-pushdown? (move the processing to the data, not the data to the processing)
- [ ] For large file transfers (staging → prod): is the transfer resumable? (failed transfer that restarts from 0 = 2x the data transfer)

### 4. Efficiency of Algorithms and Data Structures

- [ ] Are there any O(n²) or worse algorithms in production code paths? (address matching, deduplication, similarity search)
- [ ] Are there any linear scans that could be index lookups? (O(n) → O(log n) or O(1))
- [ ] Are there operations that process the full dataset when a subset would suffice?
- [ ] Is memoization or result caching applied to expensive deterministic computations?

### 5. Infrastructure Lifecycle

- [ ] Are test/staging environments shut down when not in use? (Render staging: autoDeploy OFF is good; is it stopped between data operations?)
- [ ] Are development environments using minimal resources? (local dev.db at 572MB instead of 91GB NAD)
- [ ] Are there any unused services still running and billing? (check Render dashboard for dormant services)
- [ ] Is the production service sized for actual load, not theoretical maximum?

### 6. Dependency and Third-Party Efficiency

- [ ] Are third-party API calls cached to avoid redundant requests? (every redundant FEMA lookup = compute on their end too)
- [ ] Are batch APIs used where available rather than N individual calls?
- [ ] Are unnecessary dependencies removed? (every dependency pulled at build time = compute + bandwidth on every deploy)
- [ ] Is the production container/runtime base image minimal? (alpine vs ubuntu: 5MB vs 100MB)

---

## Sustainability Scorecard

Score each dimension on a 1-5 scale:

```
Compute efficiency:     <1-5> — are we running only necessary compute, right-sized?
Data minimization:      <1-5> — do we store only what we need, for only as long as needed?
Format efficiency:      <1-5> — are we using efficient formats for each access pattern?
Transfer efficiency:    <1-5> — are we compressing, paginating, and minimizing data movement?
Algorithm efficiency:   <1-5> — are algorithms and data structures appropriate for scale?
Infrastructure waste:   <1-5> — are unused resources cleaned up?

Overall score: <X>/30
```

Score < 20: sustainability improvements should be part of the implementation backlog.
Score < 15: architectural changes needed before this feature is considered complete.

---

## Anti-Patterns to Reject

| Anti-pattern | Sustainability impact | Fix |
|-------------|----------------------|-----|
| Always-on polling instead of event-driven | Continuous CPU burn with no work | Webhook or event queue |
| Raw import files never deleted | Storage energy waste | Delete after verified import |
| JSON for analytical queries | 10-20x more storage and I/O vs columnar | Parquet or indexed SQLite |
| No data retention policy | Storage grows without bound | Documented lifecycle per data type |
| Over-provisioned compute 24/7 | Energy waste proportional to over-provisioning | Right-size; autoscale |
| No compression on API responses | 5-10x excess bandwidth | Enable gzip at web server |
| Full dataset processed for partial result | Wasteful I/O and compute | Filter at source, not in application |
| Test environments running idle | Wasted energy and cost | Stop when not in use |

---

## Findings Format

```
=== SUSTAINABILITY REVIEW ===
Feature: <name>

Compute efficiency:     <score>/5 — <key finding>
Data minimization:      <score>/5 — <key finding>
  Retention policy:     ✅ DEFINED | ❌ NOT DEFINED for: <data type>
Format efficiency:      <score>/5 — <key finding>
Transfer efficiency:    <score>/5 — <key finding>
Algorithm efficiency:   <score>/5 — <key finding>
Infrastructure waste:   <score>/5 — <key finding>

Overall score:          <X>/30

Sustainability debt identified:
  - <item 1 — specific, actionable>
  - <item 2>

Immediate wins (low effort, high impact):
  - <item>

Status: APPROVED | IMPROVEMENTS RECOMMENDED | REWORK REQUIRED (score < 15)
```
