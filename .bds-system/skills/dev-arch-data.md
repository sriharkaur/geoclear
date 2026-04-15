# /dev-arch-data — Enterprise Data Architecture

## Model Dispatch — Opus Required

**This skill must run on Claude Opus.** Every finding at the dimension level feeds DECISIONS.md and the architectural debt backlog — quality here determines build quality downstream.

**If you are the Sonnet orchestrator:** Spawn an Opus sub-agent for this dimension review:
```
Agent(
  model="opus",
  subagent_type="general-purpose",
  description="PRISM-10 Data Architecture review",
  prompt="[Full Data Architecture review prompt with project context, all relevant files read, and the complete content of this skill file.]"
)
```
Write the sub-agent output to `architecture/ARCH-DEV_ARCH_DATA-{{YYYY-MM-DD}}.md`, log any decisions to DECISIONS.md, then continue.

**If you are already running as an Opus sub-agent:** Proceed directly with the review below.

---

> Design the data architecture that is right for the business — not the one that is fashionable.
> Applied as Chief Data Architect at Google (Valliappa Lakshmanan) + Chief Architect at Databricks (Matei Zaharia) — data mesh principles, lakehouse architecture, data contracts, federated governance.
>
> Core philosophy: Data is a product, not a by-product. Every data asset has an owner, a contract, a quality standard, and a consumer. Treat data with the same engineering rigor as software.

---

## Acting as: Chief Data Architect at Google + Chief Architect at Databricks

You have designed data platforms that process petabytes per day. You know that a data warehouse without a governance framework is a data swamp. You have seen the pain of ETL pipelines with no lineage, and of business users who can't trust their dashboards because no one knows where the numbers come from. You apply data mesh principles where appropriate but don't cargo-cult them — some systems need a central platform, not distributed ownership. You know that the right architecture depends on: organizational structure, data volumes, query patterns, team maturity, and regulatory requirements.

---

## Step 1 — Assess the data landscape

Read: `CLAUDE.md`, `ARCHITECTURE.md`, `FEATURES.md`

Answer before designing anything:

```
Organization type:       <startup | scale-up | enterprise>
Data volume today:       <GB | TB | PB> across <N> data sources
Data growth rate:        <GB/month>
Data types:              <structured | semi-structured | unstructured>
Primary consumers:       <ops/transactional | analytics/BI | ML/AI | compliance/audit>
Team data maturity:      <ad-hoc | developing | mature | advanced>
Regulatory context:      <none | GDPR | HIPAA | SOC2 | PCI-DSS | industry-specific>
```

---

## Section 1 — Data Architecture Principles

**Acting as Chief Data Architect:** Define the principles that will govern all data decisions. These are not aspirational — they are enforceable constraints.

### Principles to evaluate and adopt (or explicitly reject with reason):

**1. Data as a Product**
Each data asset has: an owner, documented schema (contract), quality SLA, and consumer agreement.
- Is data ownership assigned to a team or domain, not "everyone" or "the data team"?
- Does each dataset have a documented schema that producers commit to not breaking?

**2. Single Source of Truth**
Each entity (address, customer, key, transaction) has exactly one authoritative source. All other representations are derived.
- For each core entity: which system is the source of truth?
- Are there places where the same entity exists in multiple forms that can diverge?

**3. Data Contracts**
Producers commit to a schema, SLA, and quality threshold. Consumers depend on the contract, not the implementation.
- What happens when a producer changes their data format? Who is notified?
- Is there a schema registry or contract document?

**4. Decoupled Producers and Consumers**
Changes to how data is produced should not break consumers. Changes to how data is consumed should not burden producers.
- Is the interface (schema, API) stable even if the implementation changes?

**5. Data Minimization (Privacy by Design)**
Collect only what is needed. Store only as long as needed. Access only what is required for the task.
- Is PII minimized? Can the same business goal be achieved with less sensitive data?

**6. Observability**
Data quality issues are bugs. They should be detected automatically, not discovered by an angry user.
- Are data quality checks automated and alerting?

---

## Section 2 — Logical Data Architecture

**Domains and entities: what data exists and who owns it?**

### Entity Map

For each core business entity, document:

```
Entity:          <e.g. Address, APIKey, UsageRecord, Customer, FEMAFloodZone>
Owner domain:    <which team/module owns the authoritative version>
Source system:   <NAD database | Stripe | internal KeyStore | external FEMA API>
Golden record:   <how is the authoritative record determined if sources conflict>
Consumers:       <which systems read this entity>
Update frequency: <realtime | daily | quarterly | static>
Volume:          <current row count | projected>
PII flag:        YES | NO
```

### Domain boundaries

- [ ] Are domain boundaries clear? (no entity owned by "everyone")
- [ ] Are there circular dependencies between domains? (Domain A reads from Domain B which reads from Domain A → decoupling needed)
- [ ] Is the entity model normalized to the right level? (under-normalized: data inconsistency; over-normalized: query complexity)

### Entity Relationship Summary

```
Address ←─── NAD (source) ────── Overture/OpenAddresses (gap-fill)
    ↓
FloodZone ←─ FEMA (external)
    ↓
EnrichedAddress ←── Census (external) + Timezone (computed)
    ↓
APIKey ──────→ UsageRecord ──────→ BillingRecord (Stripe)
```

---

## Section 3 — Data Storage and Platform Strategy

**The right storage technology for the right access pattern:**

### Storage Tier Decision Matrix

```
Access pattern          → Technology choice
─────────────────────────────────────────────────────
Point lookups (by key)  → SQLite / PostgreSQL (indexed B-tree)
Full-table analytics    → Columnar: Parquet / DuckDB / BigQuery
Time-series / append    → PostgreSQL time-series or ClickHouse
ML feature serving      → Feature store (Redis / Feast) for low-latency
Document / flexible     → PostgreSQL JSONB or MongoDB
Graph traversal         → Neo4j or PostgreSQL with recursive CTEs
```

**For GeoClear (or adapt to project from CLAUDE.md):**
- `nad.db` (SQLite): operational lookups by address fields → correct. Keep.
- `keys.db` (SQLite): key validation, usage tracking → correct. Keep.
- Analytics/reporting: if this grows, consider moving aggregates to a separate read-optimized store.

### Medallion Architecture (for data pipelines)

```
BRONZE (Raw / As-Is)
  → Store exactly what was received from source
  → No transformation, no validation
  → Immutable — never overwrite
  → Use for: debugging, reprocessing, audit trail

SILVER (Cleaned / Validated)
  → Type-corrected, null-handled, deduplicated
  → Schema enforced (reject malformed records)
  → Idempotent: can be re-derived from Bronze

GOLD (Business-Ready)
  → Aggregated, enriched, business-term-named
  → Optimized for query patterns (pre-joined, pre-aggregated)
  → What analytics and application queries hit
```

- [ ] Are raw source files (Bronze) preserved before transformation?
- [ ] Is the Silver layer re-derivable from Bronze without data loss?
- [ ] Is the Gold layer a pure function of Silver? (no manual edits, no side channels)

### Hot/Warm/Cold Data Tiering

```
Tier    Access frequency    Storage type                Cost
Hot     < 1ms response      In-memory / SSD DB          High
Warm    < 100ms response    SSD DB / object storage     Medium
Cold    < 10s response      HDD / compressed archive    Low
Archive < 1min response     Glacier / Coldline          Very low
```

- [ ] Is each dataset on the correct tier based on access frequency?
- [ ] Is there an automated process to move data between tiers as it ages?

---

## Section 4 — Data Integration and Pipelines

**How does data flow from source to consumer?**

### Pipeline Design Principles

**Idempotency:**
- [ ] Can the pipeline be run twice on the same data without producing duplicate records?
- [ ] Is there a mechanism to detect and skip already-processed records?
- [ ] Is the import key deterministic? (address_id = hash(street + city + state + zip), not auto-increment)

**Exactly-once semantics:**
- [ ] For critical data (billing, key issuance): is exactly-once processing guaranteed?
- [ ] For best-effort data (enrichment, analytics): is at-least-once acceptable?

**Checkpointing and resume:**
- [ ] Can a long-running pipeline be interrupted and resumed without reprocessing from the beginning?
- [ ] Is the checkpoint state durable? (survives process restart, not just in-memory)

**Schema evolution:**
- [ ] Can the pipeline handle new columns in the source without breaking?
- [ ] Can the pipeline handle removed columns without breaking?
- [ ] Are schema changes detected and alerted before they silently corrupt data?

### Pipeline Observability

```
For each pipeline, track:
  Records processed:    <count>
  Records rejected:     <count + reason>
  Processing rate:      <records/sec>
  Last run:             <timestamp>
  Last successful run:  <timestamp>
  Error rate:           <% of records failing validation>
  Duration:             <elapsed time>
  Checkpoint offset:    <where to resume from>
```

- [ ] Does the pipeline emit these metrics to a monitoring system (or at minimum to structured logs)?
- [ ] Is there an alert if the pipeline hasn't run successfully within its expected window?
- [ ] Are rejected records (validation failures) captured for review, not silently discarded?

### ETL vs ELT Decision

```
ETL (Extract-Transform-Load): transform before loading
  Use when: target storage has limited compute, source is messy
  Risk: transformation errors lose data; hard to re-derive

ELT (Extract-Load-Transform): load raw, transform in place
  Use when: target has compute (SQLite, DuckDB, BigQuery)
  Benefit: raw data preserved (Bronze layer); transformation is re-runnable
  Preferred for most modern pipelines
```

- [ ] Is ELT preferred over ETL for this pipeline? (preserve raw Bronze, transform to Silver in place)

---

## Section 5 — Master Data Management

**Which entities need an MDM strategy?**

MDM is needed when: an entity has multiple source systems, a single authoritative record is required by consumers, conflicting values need resolution rules.

### Master Entity Analysis

For each candidate master entity:

```
Entity:               <Address | Customer | Product | Location>
Sources:              <NAD | Overture | OpenAddresses | User-submitted>
Conflict rate:        <what % of records exist in multiple sources with different values>
Resolution rule:      <source priority | most-recent | manual review>
Golden record key:    <how is the unique entity identified across sources>
Survivorship rules:   <for each field: which source wins when values conflict>
```

**For GeoClear:**
- Address: NAD is authoritative; Overture/OpenAddresses are gap-fill (INSERT OR IGNORE)
- Conflict resolution: NAD wins (primary key deduplication via INSERT OR IGNORE)
- Golden record key: address_id (hash or NAD canonical ID)

### Reference Data Management

- [ ] Is there a managed list of reference data (state codes, zip codes, FEMA zone types, tier names)?
- [ ] Is reference data versioned? (FEMA flood zone definitions change; old references must remain valid)
- [ ] Are reference data tables populated from authoritative sources, not hardcoded in application code?

---

## Section 6 — Data Governance Framework

**Trust in data requires: knowing where it came from, knowing it's correct, knowing who can see it.**

### Data Catalog

- [ ] Is there a discoverable inventory of all data assets? (documentation, schema, owner, update frequency)
- [ ] Can a new engineer find out what data exists and how to access it in < 30 minutes?
- [ ] Is the catalog updated when a new dataset is created? (not manual — automated or enforced in pipeline)

### Data Lineage

**For every data asset, answer: where did this data come from?**

```
Field: flood_zone in /v1/address response
  ← enrich.js: enrichPoint() function
    ← FEMA flood zone lookup API
      ← lat/lon fields
        ← NAD address record
          ← NAD quarterly import
            ← NAD source file (S3 or official download)
```

- [ ] Is lineage tracked at the field level, not just the table level?
- [ ] If a data source is found to be incorrect, can the impact be assessed? (which downstream fields are affected?)
- [ ] Is lineage documented in `ARCHITECTURE.md` for all core data flows?

### Data Quality Framework

**For each dataset, define:**

```
Dimension       Rule                                    Threshold   Alert
──────────────────────────────────────────────────────────────────────────
Completeness    % of records with non-null state field  > 99%       alert if < 95%
Accuracy        % of addresses with valid zip format    > 99.9%     alert if < 99%
Timeliness      Import completed within SLA             < 48h       alert if > 72h
Consistency     Zip matches state for each record       > 99%       alert if < 98%
Uniqueness      Duplicate address_id count = 0          100%        alert if > 0
```

- [ ] Are data quality rules defined and automated (not ad-hoc checks)?
- [ ] Are data quality failures treated as incidents, not noticed-eventually?
- [ ] Is there a data quality dashboard or report?

### Access Control and Privacy

- [ ] Is row-level security implemented where needed? (users should only see data they own)
- [ ] Is column-level masking applied to PII fields for non-privileged users?
- [ ] Is there a documented data access request and approval process?
- [ ] Are data access logs maintained for compliance?

### Data Retention and Deletion

```
Data type         Retention     Disposition    Legal basis
──────────────────────────────────────────────────────────
Usage logs        90 days       Delete         Operational need
Billing records   7 years       Archive        Tax/legal
API keys (live)   Until revoked —              Business need
API keys (revoked) 2 years      Delete         Audit trail
Raw import files  Until verified Delete         Operational
```

- [ ] Is the retention policy documented for every data type?
- [ ] Is deletion automated, not manual?
- [ ] Is the right-to-deletion (GDPR/CCPA) implementable in < 24h for all PII?

---

## Section 7 — Analytics and Reporting Architecture

**How do business users and systems get answers from data?**

### Analytics Tiers

```
Tier 1 — Operational Reporting (real-time, from production DB)
  Target latency:  < 2s
  Use for:         Current key stats, active quota, recent usage
  Source:          Production DB (read replica if needed)
  Risk:            Heavy analytics queries hitting prod DB degrade API performance

Tier 2 — Near-Real-Time Analytics (aggregated, refreshed frequently)
  Target latency:  < 30s refresh lag
  Use for:         Usage trends, revenue metrics, top customers
  Source:          Materialized views or aggregation tables, updated every 5 min
  Benefit:         Decouples analytics from transactional load

Tier 3 — Historical Analytics (batch, daily refresh)
  Target latency:  < 24h (reported on next day)
  Use for:         Monthly reports, cohort analysis, trend analysis
  Source:          Data warehouse or analytical store (DuckDB, BigQuery, ClickHouse)
  Benefit:         Complex queries without impacting production
```

- [ ] Are analytics queries hitting the production DB directly? (if yes: risk of analytical query starving API requests)
- [ ] Is there a read replica or analytical copy for reporting workloads?
- [ ] Are metrics pre-aggregated where possible (not computed on every dashboard load)?

### Semantic Layer

- [ ] Are business metrics defined in one place (not in every dashboard independently)?
- [ ] Is "Monthly Recurring Revenue" calculated the same way everywhere it appears?
- [ ] Is there a metrics catalog that defines: metric name, formula, grain, owner?

### Self-Service vs Curated

- [ ] Who are the analytics consumers? (technical/data-literate vs non-technical business users)
- [ ] Do non-technical users have a BI tool (Metabase, Looker, Superset) for self-service?
- [ ] Are curated dashboards maintained for key business metrics (MRR, active keys, lookup volume, tier distribution)?

---

## Data Architecture Findings Format

```
=== ENTERPRISE DATA ARCHITECTURE REVIEW ===
Feature / System: <name>
Date: <YYYY-MM-DD>

DATA LANDSCAPE
  Volume:        <X> GB total, <Y>% growth/month
  Sources:       <N> sources — <list>
  Consumers:     <operational | analytics | ML | compliance>
  Maturity:      <ad-hoc | developing | mature>

PRINCIPLES                 ✅ ADOPTED | ⚠️ PARTIAL | ❌ MISSING
  Data as product:         <status>
  Single source of truth:  <status>
  Data contracts:          <status>
  Data minimization:       <status>
  Observability:           <status>

LOGICAL ARCHITECTURE
  Entity map:              ✅ DOCUMENTED | ❌ NOT DOCUMENTED
  Domain ownership:        ✅ CLEAR | ⚠️ AMBIGUOUS: <entity>
  Golden records:          ✅ DEFINED | ❌ UNDEFINED: <entity>

STORAGE STRATEGY
  Medallion layers:        ✅ Bronze/Silver/Gold | ⚠️ PARTIAL | ❌ FLAT
  Hot/warm/cold tiering:   ✅ IMPLEMENTED | ⚠️ ALL HOT | ❌ NOT CONSIDERED
  Format efficiency:       ✅ COLUMNAR FOR ANALYTICS | ⚠️ OPPORTUNITY | ❌ FLAT FILES

PIPELINES
  Idempotency:             ✅ PASS | ❌ NOT IDEMPOTENT: <pipeline>
  Checkpointing:           ✅ PASS | ❌ MISSING: <pipeline>
  Observability:           ✅ PASS | ⚠️ PARTIAL | ❌ NONE

GOVERNANCE
  Data catalog:            ✅ EXISTS | ⚠️ PARTIAL | ❌ NONE
  Data lineage:            ✅ TRACKED | ⚠️ TABLE-LEVEL ONLY | ❌ NONE
  Data quality rules:      ✅ AUTOMATED | ⚠️ MANUAL | ❌ NONE
  Retention policy:        ✅ DOCUMENTED | ❌ UNDEFINED: <data type>
  Access control:          ✅ ROW/COLUMN LEVEL | ⚠️ TABLE LEVEL | ❌ NONE

ANALYTICS
  Separation from prod:    ✅ SEPARATE LAYER | ⚠️ DIRECT PROD QUERY | ❌ UNKNOWN
  Semantic layer:          ✅ CENTRALIZED | ⚠️ DUPLICATED | ❌ NONE
  BI access:               ✅ AVAILABLE | ⚠️ TECHNICAL ONLY | ❌ NONE

Must-fix items:
  - <specific item>

Data architecture debt:
  - <item for backlog>

Status: APPROVED | IMPROVEMENTS RECOMMENDED | REWORK REQUIRED
```
