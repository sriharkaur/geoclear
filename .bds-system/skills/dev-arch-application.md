# /dev-arch-application — Application Architecture

## Model Dispatch — Opus Required

**This skill must run on Claude Opus.** Every finding at the dimension level feeds DECISIONS.md and the architectural debt backlog — quality here determines build quality downstream.

**If you are the Sonnet orchestrator:** Spawn an Opus sub-agent for this dimension review:
```
Agent(
  model="opus",
  subagent_type="general-purpose",
  description="PRISM-10 Application Architecture review",
  prompt="[Full Application Architecture review prompt with project context, all relevant files read, and the complete content of this skill file.]"
)
```
Write the sub-agent output to `architecture/ARCH-DEV_ARCH_APPLICATION-{{YYYY-MM-DD}}.md`, log any decisions to DECISIONS.md, then continue.

**If you are already running as an Opus sub-agent:** Proceed directly with the review below.

---

> How the application is structured internally: layers, boundaries, dependencies, contracts between components.
> Applied as Principal Application Architect at Meta and Google — approved by Chief Architect of Google and Meta.
>
> Core philosophy: The internal structure of an application determines how fast the team can move six months from now. An application with clear boundaries, explicit contracts, and testable components scales with the team. One without boundaries becomes a ball of mud — fast at first, increasingly expensive forever.

---

## Acting as: Principal Application Architect at Google (Robert Martin principles) + Meta (large-scale React + GraphQL)

You have designed application architectures that hundreds of engineers work in simultaneously without stepping on each other. You know that the first version of the architecture is always wrong, but the decisions made in week 1 constrain every decision made in week 52. You apply Domain-Driven Design where domains are clear, and resist it where they are not. You understand that Clean Architecture, Hexagonal Architecture, and Layered Architecture are different expressions of the same insight: keep business logic independent of infrastructure. You design for testability as a first-class concern — untestable code is unverifiable code.

---

## Section 1 — Layered Architecture

**Every application — regardless of size or framework — has layers. The question is whether the layers are explicit or implicit.**

### Layer definition

```
Layer               Responsibility                        Depends on
────────────────────────────────────────────────────────────────────
Presentation        HTTP handlers, controllers, routes    → Application
Application         Use cases, orchestration, workflows   → Domain
Domain              Business logic, entities, rules       → nothing (pure)
Infrastructure      DB, external APIs, messaging, cache   → Domain interfaces
```

**Rules that must hold:**
- Domain layer has ZERO dependencies on infrastructure (no imports of DB libraries, no HTTP calls)
- Application layer orchestrates domain logic and calls infrastructure via interfaces
- Infrastructure implements interfaces defined in the domain (dependency inversion)
- Presentation layer is thin: validate input, call application layer, format response

**Questions:**

- [ ] Is the business logic (domain layer) clearly separated from infrastructure concerns (DB queries, API calls)?
- [ ] Can the domain logic be unit-tested without a running DB, without HTTP calls, without a web server? (if no: the layers are not separated)
- [ ] Is infrastructure accessed through interfaces/abstractions, not direct concrete calls from business logic?
- [ ] If the database were replaced (SQLite → PostgreSQL), how many files would need to change? (answer should be: only the infrastructure layer)
- [ ] Is the presentation layer thin? (routes/controllers that do more than: validate → call service → format response are too fat)

**For Node.js/Express (GeoClear pattern):**
```
web-server.js      → Presentation: route definitions, middleware, request parsing
query.js           → Infrastructure: DB access via better-sqlite3
enrich.js          → Application + Domain: orchestrates enrichment pipeline
keys.js            → Domain: key validation logic
```
Is this separation maintained? Are there direct DB calls in web-server.js? (should be: call query.js, not inline SQL)

---

## Section 2 — API Design Architecture

**APIs are contracts. Breaking a contract has downstream costs. Design them to be stable, evolvable, and self-describing.**

### REST API Design (when applicable)

- [ ] Are resources named as nouns, not verbs? (`/addresses`, not `/getAddresses`)
- [ ] Are HTTP methods used correctly? (GET = read, POST = create, PUT/PATCH = update, DELETE = delete)
- [ ] Are response shapes consistent across all endpoints? (same error structure, same pagination shape)
- [ ] Is versioning strategy defined? (`/v1/address` — what happens when v2 is needed?)
  - URL versioning (`/v1/`, `/v2/`): easy to route, clutters URLs
  - Header versioning (`Accept: application/vnd.geoclear.v2+json`): cleaner, harder to test in browser
  - **Recommendation**: URL versioning for public APIs; header for internal
- [ ] Is the response envelope consistent? (all endpoints use same wrapper: `{ data: ..., meta: ..., error: ... }` — or no envelope consistently)
- [ ] Is HATEOAS applicable? (links in response pointing to related resources — useful for complex APIs, overkill for simple CRUD)

### GraphQL (when applicable)

- [ ] Is GraphQL chosen for the right reasons? (multiple clients with different data needs; complex relationships; rapid iteration on query shape)
- [ ] Is N+1 solved? (DataLoader pattern — batch DB calls per request, not per field resolution)
- [ ] Is schema design domain-driven? (types match business entities, not DB tables)
- [ ] Is query depth/complexity limited? (unbounded GraphQL queries can OOM the server)
- [ ] Is subscription architecture defined for real-time? (WebSocket transport, back-pressure handling)

### RPC / Internal APIs

- [ ] Are internal service interfaces defined as contracts (TypeScript interfaces, Protobuf, OpenAPI) — not implicit function signatures?
- [ ] Is the interface stable across caller and callee deployments? (if caller and callee deploy independently, old callee must serve new caller)

---

## Section 3 — Domain-Driven Design (apply proportionally)

**Apply DDD where domains are complex. Don't cargo-cult it for simple CRUD services.**

### Bounded Context identification

```
For each major business capability, identify:
  Context name:     <e.g. Address Lookup, Key Management, Billing, Enrichment>
  Core domain:      YES (competitive differentiator) | Supporting | Generic
  Owner:            <module / team>
  Ubiquitous language: <domain terms used consistently in code, docs, and conversation>
  Context boundary: <what is inside vs outside this context>
  Integration:      <how does it communicate with adjacent contexts>
```

- [ ] Are there clear bounded contexts? (or is everything in one giant module with global state?)
- [ ] Is the ubiquitous language consistent? (if the business says "API key" but the code says "token" and the DB says "auth_credential" — this is a DDD smell)
- [ ] Are anti-corruption layers in place where two contexts with different models communicate?

### Aggregates and entities (for complex domains)

- [ ] Is there a clear aggregate root per bounded context? (the entry point through which all state changes are made)
- [ ] Are invariants enforced within aggregates, not scattered across service methods?
- [ ] Are domain events used to communicate between bounded contexts? (decoupled, auditable)

**For simple domains (CRUD APIs, data lookup services):** DDD is overkill. Apply the principle of clear boundaries without the full ceremony.

---

## Section 4 — Dependency Management

**Dependencies have a direction. Wrong-direction dependencies create coupling, circular dependencies, and untestable code.**

### Dependency rules

```
ALLOWED:
  Presentation → Application → Domain
  Infrastructure → Domain interfaces
  Application → Infrastructure interfaces (injected)

NOT ALLOWED:
  Domain → Infrastructure (DB, HTTP, filesystem)
  Domain → Presentation (HTTP request/response objects)
  Circular dependencies (A → B → A)
```

- [ ] Are there any circular imports? (`node --trace-cycles`, or `madge` for JS: `npx madge --circular src/`)
- [ ] Does the domain layer import from infrastructure? (if yes: layers are inverted)
- [ ] Are dependencies between modules explicit? (import statement visible, not implicit global state)
- [ ] Are external library dependencies isolated? (wrap third-party libraries at the boundary — don't scatter `stripe.charges.create()` throughout the codebase; wrap in a `BillingService` interface)

### Dependency injection

- [ ] Are dependencies injected (passed as parameters or via constructor), not instantiated internally? (enables testing with mock/stub/fake)
- [ ] For Node.js: are module-level singletons used carefully? (SQLite connection singleton is fine; business logic singleton is a smell)
- [ ] Is the composition root (where dependencies are wired together) explicit and in one place?

---

## Section 5 — Error Handling Architecture

**Error handling is not an afterthought. It is part of the application contract.**

### Error taxonomy

```
Error type              HTTP code   Behavior            Logged?
────────────────────────────────────────────────────────────────
Validation error        400         Return details      No (user error)
Authentication error    401         Generic message     No (avoid log spam)
Authorization error     403         Generic message     No
Not found               404         Generic message     No
Rate limit exceeded     429         Retry-After header  Yes (aggregate)
Upstream dependency     503         Generic message     Yes (critical)
Unexpected              500         Generic message     Yes (critical)
```

- [ ] Is every error path producing the correct HTTP status code and response shape?
- [ ] Are all `500` errors logged with enough context to diagnose? (request ID, input shape, stack trace)
- [ ] Are `400`/`401`/`404` errors NOT logged verbosely? (log spam, noise)
- [ ] Are error messages safe to return to clients? (no stack traces, no file paths, no SQL queries)
- [ ] Is there a global error handler that catches unhandled exceptions and returns 500, not a crash?
- [ ] Are async errors handled? (unhandled promise rejections in Node.js crash the process)

### Result types vs exceptions

- [ ] Is the error handling strategy consistent? (exceptions for truly exceptional cases; Result/Either types or null-returns for expected not-found conditions)
- [ ] Are errors at the boundary of the system (incoming HTTP, outgoing API calls) explicitly caught and handled?

---

## Section 6 — Configuration and Environment Architecture

- [ ] Is configuration loaded once at startup and validated? (fail fast: if `STRIPE_SECRET_KEY` is missing, crash on startup, not on the first payment)
- [ ] Is there a configuration schema? (TypeScript: `z.object({ STRIPE_SECRET_KEY: z.string().min(1) })` with zod)
- [ ] Are different environments (local, staging, prod) handled by configuration, not by conditional code? (no `if (env === 'production') ...` in business logic)
- [ ] Is the full set of required environment variables documented in one place? (`.env.example`, CLAUDE.md env vars table)
- [ ] Is configuration change auditable? (platform env var changes logged in deployment history)

---

## Section 7 — Testability Architecture

**An application that cannot be tested cannot be verified. Testability is designed, not retrofitted.**

- [ ] Can the domain layer be unit-tested without any infrastructure? (no DB, no HTTP, no filesystem)
- [ ] Can the application layer be tested with fake/stub infrastructure? (dependency injection enables this)
- [ ] Are there integration test seams? (can bring up the application with an in-memory DB for integration tests?)
- [ ] Are side effects (DB writes, external API calls, emails) isolated from business logic? (can be replaced with test doubles)
- [ ] Are async operations testable synchronously? (deterministic test execution)

---

## Section 8 — Versioning and Evolution Strategy

- [ ] Is there a strategy for evolving the API without breaking existing clients?
  - Additive changes only (new fields, new endpoints): backward compatible, no version bump
  - Breaking changes (rename fields, remove fields, change types): require version bump
- [ ] Is the database schema evolution strategy documented? (migrations, numbered, staging-first — see `/dev-deploy` Protocol B)
- [ ] Is there a deprecation policy? (deprecated endpoints: how long before removal? how are clients notified?)
- [ ] Are feature flags used for gradual rollout of breaking changes?

---

## Section 9 — Application Observability

- [ ] Is every significant state transition logged with a structured log entry? (key created, lookup performed, tier upgraded, enrichment requested)
- [ ] Are request IDs propagated through all logs for a single request? (correlation ID: trace one request across multiple log lines)
- [ ] Are performance metrics emitted per-layer? (not just total latency — DB query time, enrichment time, serialization time separately)
- [ ] Is the application's startup sequence logged? (which dependencies are connected at startup, with their version/status)
- [ ] Is there a readiness probe separate from the health probe? (readiness: ready to serve traffic; health: running but maybe warming up)

---

## Chief Architect Review: Application Architecture

**Acting as Chief Architect of Google and Meta:**

1. **Layer separation**: Are business rules isolated from infrastructure? Can I replace the DB without touching business logic?
2. **API contract stability**: Is the API versioned? Can it evolve without breaking existing callers?
3. **Error handling completeness**: Is every error path handled explicitly? Are unhandled promise rejections impossible?
4. **Testability**: Can I test domain logic without starting a server or connecting to a DB?
5. **Dependency direction**: Are there any wrong-direction dependencies? Any circular imports?
6. **Configuration robustness**: Does the application fail fast on missing config, or fail at the first use (deep in production path)?
7. **Observability**: Can I diagnose any production issue using only logs, without SSH access?

**Chief Architect Verdict:**
```
Layer separation:    ✅ CLEAN | ⚠️ PARTIAL | ❌ MIXED (business logic + DB in same file)
API contract:        ✅ VERSIONED + STABLE | ⚠️ NO VERSION STRATEGY | ❌ BREAKING CHANGES LIKELY
Error handling:      ✅ ALL PATHS HANDLED | ⚠️ GAPS: <path> | ❌ UNHANDLED REJECTIONS
Testability:         ✅ DOMAIN TESTABLE WITHOUT INFRA | ❌ UNTESTABLE WITHOUT DB
Dependency direction: ✅ CORRECT | ❌ VIOLATIONS: <location>
Configuration:       ✅ VALIDATED AT STARTUP | ❌ FAIL AT RUNTIME

Must-fix before approval:
  - <item>

Status: APPROVED | REQUIRES ATTENTION | REWORK REQUIRED
```

---

## Findings Format

```
=== APPLICATION ARCHITECTURE REVIEW ===
Feature / System: <name>

Layered architecture:    ✅ EXPLICIT LAYERS | ⚠️ PARTIAL | ❌ BALL OF MUD
API design:              ✅ CONSISTENT CONTRACT | ⚠️ INCONSISTENCIES | ❌ NO CONTRACT
DDD applicability:       ✅ BOUNDED CONTEXTS CLEAR | ⚠️ AMBIGUOUS | — SIMPLE CRUD (N/A)
Dependency direction:    ✅ CORRECT | ❌ VIOLATIONS: <location>
Dependency injection:    ✅ TESTABLE | ⚠️ PARTIAL | ❌ HARDWIRED
Error handling:          ✅ ALL PATHS | ⚠️ GAPS | ❌ UNHANDLED
Configuration:           ✅ FAIL FAST | ⚠️ RUNTIME FAILURE | ❌ HARDCODED VALUES
Testability:             ✅ INFRA-INDEPENDENT TESTS | ❌ UNTESTABLE WITHOUT DB
Versioning strategy:     ✅ DEFINED | ⚠️ ADDITIVE ONLY | ❌ NO STRATEGY
Observability:           ✅ STRUCTURED + CORRELATED | ⚠️ PARTIAL | ❌ NONE

Must-fix items:
  - <item>

Chief Architect (Google + Meta) verdict: APPROVED | REQUIRES ATTENTION | REWORK REQUIRED
```
