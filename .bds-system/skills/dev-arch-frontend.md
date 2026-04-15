# /dev-arch-frontend — Frontend Architecture

## Model Dispatch — Opus Required

**This skill must run on Claude Opus.** Every finding at the dimension level feeds DECISIONS.md and the architectural debt backlog — quality here determines build quality downstream.

**If you are the Sonnet orchestrator:** Spawn an Opus sub-agent for this dimension review:
```
Agent(
  model="opus",
  subagent_type="general-purpose",
  description="PRISM-10 Frontend Architecture review",
  prompt="[Full Frontend Architecture review prompt with project context, all relevant files read, and the complete content of this skill file.]"
)
```
Write the sub-agent output to `architecture/ARCH-DEV_ARCH_FRONTEND-{{YYYY-MM-DD}}.md`, log any decisions to DECISIONS.md, then continue.

**If you are already running as an Opus sub-agent:** Proceed directly with the review below.

---

> Modern Frontend Architecture 2026: three pillars — Rendering Strategies, Integration Patterns, Emerging Trends.
> Applied as Principal Frontend Architect at Meta and Google — approved by Chief Architect of Google.
>
> Core philosophy: Frontend architecture is not about framework choices. It is about delivery speed, runtime performance, user experience correctness, and operational maintainability at scale. The right architecture enables teams to ship fast without breaking each other.

---

## Acting as: Principal Frontend Architect at Meta (React/Relay team) + Google (Angular/Chrome team)

You have built and scaled frontend systems serving hundreds of millions of users. You know that a 100ms improvement in LCP directly increases conversion. You have seen micro-frontend migrations that took 18 months and ones that took 3 — the difference was architecture decisions made in week 1. You apply progressive enhancement, Core Web Vitals budgets, and accessibility as non-negotiable constraints, not nice-to-haves. You know that the best state management is the one you don't need.

---

## Scope check

Run this review when the project has:
- A web UI (landing page, dashboard, customer portal)
- A public-facing API that browsers call directly
- A design system or component library
- Real-time data requirements (WebSocket, SSE)
- Performance SLOs that affect SEO or conversion

Skip (mark N/A) when: the project is API-only with no browser-facing surface.

---

## Section 1 — Rendering Strategy

**The most impactful architectural decision for a frontend system. Choose based on content type and performance requirements.**

### Strategy Decision Matrix

```
Page type                          → Recommended strategy
────────────────────────────────────────────────────────────
Marketing/landing (SEO-critical)   → SSR or ISR (static + revalidate)
User dashboard (auth-gated)        → CSR/SPA (no SEO need; dynamic data)
Product detail (SEO + dynamic)     → ISR (static shell + client hydration)
Real-time data (live feeds)        → CSR + WebSocket/SSE
API documentation                  → SSG (fully static, rarely changes)
Admin panel                        → CSR (internal, no SEO)
Edge-personalized content          → Edge rendering + partial hydration
Mixed (different pages differ)     → Per-route strategy selection
```

**Questions to answer:**

- [ ] Is the rendering strategy chosen per-route based on content type, or is one strategy applied to everything? (one-size-fits-all = either over-engineered or under-optimized)
- [ ] For SSR/ISR pages: what is the revalidation strategy? (stale-while-revalidate? on-demand ISR? time-based?)
- [ ] For CSR pages: what is the initial shell? (loading skeleton → prevents CLS; blank screen → poor UX)
- [ ] Is there a hydration strategy? (full hydration vs partial/progressive/resumable)
- [ ] Can the rendering strategy change per deployment without a full rewrite? (feature flag controlled)

**Core Web Vitals targets:**
```
LCP (Largest Contentful Paint):  < 2.5s (good), < 4.0s (needs improvement)
CLS (Cumulative Layout Shift):   < 0.1  (good), < 0.25 (needs improvement)
INP (Interaction to Next Paint):  < 200ms (good), < 500ms (needs improvement)
FCP (First Contentful Paint):    < 1.8s
TTFB (Time to First Byte):       < 800ms
```

- [ ] Are Core Web Vitals measured? (not assumed — measured with Lighthouse, WebPageTest, or CrUX)
- [ ] Are CWV budgets enforced in CI? (deploy fails if LCP degrades by > 20%)
- [ ] Is the LCP element identified and preloaded? (`<link rel="preload">`)
- [ ] Are fonts loaded without blocking render? (`font-display: swap` or `optional`)
- [ ] Are images lazy-loaded below the fold? Is the hero image eager-loaded with correct dimensions (prevents CLS)?

---

## Section 2 — Integration Patterns

### BFF (Backend for Frontend) Pattern

Applicable when: multiple clients (web, mobile, third-party) with different data requirements are served by the same backend.

- [ ] Does the web frontend call backend APIs designed for its specific data needs, or does it call generic APIs and filter client-side?
- [ ] Is there a BFF layer that aggregates multiple backend calls into a single optimized client request? (reduces waterfall latency)
- [ ] Is the BFF owned by the frontend team? (BFF is a frontend concern — backend team owning it creates coupling)
- [ ] If using Next.js API routes or server actions: are these the BFF layer?

### API Design (from the frontend perspective)

- [ ] Does the API return exactly the fields the frontend needs? (no over-fetching = smaller payloads, faster renders)
- [ ] Are related resources returned in one request, not via client-initiated waterfall? (N+1 on the client side)
- [ ] Is pagination designed for infinite scroll or paginated UI? (cursor-based for infinite scroll; offset for paginated)
- [ ] Are error shapes consistent? (same error structure across all endpoints — frontend error handling is simpler)
- [ ] Are response schemas versioned? (can the frontend tolerate an API change without breaking?)

### Edge Middleware

- [ ] Is there any logic that should run at the edge (before the request hits the origin)?
  - Auth token validation → redirect to login at edge, not after full page load
  - A/B testing → serve variant at edge without client flicker
  - Geolocation → redirect to regional URL at edge
  - Feature flags → serve appropriate content at edge
- [ ] Is edge middleware kept stateless and fast? (no DB calls, no heavy computation at edge)
- [ ] Is there a fallback when edge middleware is unavailable?

### Real-Time Data (WebSocket / SSE)

- [ ] Does this feature require real-time data? (live usage counter, streaming AI response, collaborative editing)
- [ ] Is WebSocket appropriate, or is SSE sufficient?
  - SSE: server-to-client only, automatic reconnect, simpler → use for: live feeds, streaming responses
  - WebSocket: bidirectional → use for: collaborative editing, chat, gaming
- [ ] Is there a graceful degradation when real-time connection fails? (fall back to polling? show stale indicator?)
- [ ] Is connection count managed? (unbounded WebSocket connections = server resource exhaustion)
- [ ] Is reconnection with exponential backoff implemented?

### Graceful Degradation

- [ ] Does the page render usably if JavaScript fails to load? (progressive enhancement baseline)
- [ ] Does the page render usably if an API call fails? (skeleton → error state, not blank screen)
- [ ] Does the page render usably on a slow connection? (streaming HTML, not wait-for-full-JS)
- [ ] Is there an offline mode or stale-content mode for critical paths? (service worker caching)

---

## Section 3 — Emerging Trends (apply where applicable)

### AI Integration

- [ ] Are there AI-powered UI components? (autocomplete, semantic search, recommendations, summarization)
  - If yes: are they progressive enhancements? (feature degrades gracefully if AI unavailable)
  - Are AI responses streamed? (show tokens as they arrive, not wait for completion → perceived speed)
  - Are AI response errors handled gracefully? (timeout, content filter, empty response)
- [ ] Is AI-assisted development used in the team's workflow? (Claude, Copilot) → ensure generated code goes through same review process as human code

### Edge-First Design

- [ ] Can static assets (JS, CSS, images) be served from CDN edge nodes globally?
  - Are cache headers correct? `Cache-Control: public, max-age=31536000, immutable` for hashed assets
  - Are assets content-hashed for cache busting?
- [ ] Is distributed state management needed? (Cloudflare Durable Objects, KV, D1 for edge state)
- [ ] Is the TTFB acceptable from regions where customers are located? (not just from the developer's location)

### Micro-Frontends (apply only for multi-team projects)

Micro-frontends are a **team scaling solution**, not a technology choice. Only applicable when:
- Multiple teams independently deploy parts of the same UI
- Different parts of the application have genuinely different tech requirements
- Team autonomy > unified consistency

If applicable:
- [ ] Is the integration mechanism chosen? (Module Federation, iframes, web components, server-side composition)
- [ ] Is there a shared design system / component library to maintain visual consistency?
- [ ] Are communication patterns between micro-frontends defined? (shared state via custom events, not direct imports)
- [ ] Is the deployment model defined? (independent deployment = each MFE deploys without coordinating with others)
- [ ] Is the **Strangler Pattern** used for migration? (incrementally replace monolith pages, not big-bang rewrite)
- [ ] Is **Feature-Sliced Design** architecture applied within each micro-frontend? (layers: app → pages → widgets → features → entities → shared)

**Warning: Do NOT apply micro-frontends for a single-team project. The operational overhead exceeds the benefit.**

---

## Section 4 — Performance Architecture

### Bundle Strategy

- [ ] Is code splitting implemented? (route-based minimum; feature-based for large optional features)
- [ ] Is the initial bundle size measured and budgeted? (< 170KB compressed for initial JS is Google's recommendation)
- [ ] Are large third-party dependencies evaluated for bundle impact? (`import cost` VSCode extension; `bundlephobia.com`)
- [ ] Are unused exports tree-shaken? (ESM imports, not CommonJS `require`)
- [ ] Are heavy components lazy-loaded? (charts, rich text editors, maps → load on demand)
- [ ] Is there a bundle analyzer check in CI? (flag if bundle grows by > 10%)

### Image Optimization

- [ ] Are images served in modern formats? (WebP with JPEG/PNG fallback; AVIF where supported)
- [ ] Are images sized correctly? (not 2000px wide served into a 400px container)
- [ ] Are images served from CDN with cache headers?
- [ ] Is `width` and `height` set on every `<img>` tag? (prevents CLS)
- [ ] Are images below the fold lazy-loaded (`loading="lazy"`)?

### State Management

- [ ] Is state management chosen at the right level?
  - Server state (data from APIs) → React Query, SWR, or RTK Query
  - Global UI state (modals, themes, auth) → Zustand, Jotai, or Context (for simple cases)
  - Local component state → `useState` (don't lift state higher than necessary)
  - URL state (filters, search, pagination) → URL params (shareable, bookmarkable)
- [ ] Is there any state that "should" be in the URL but is in component state? (user loses it on refresh)
- [ ] Is derived state computed, not stored? (storing `isLoaded = data !== null` when it can be derived = sync bugs)

---

## Section 5 — Accessibility and Internationalisation

- [ ] Is semantic HTML used? (not `<div onClick>` instead of `<button>` — keyboard + screen reader accessibility)
- [ ] Are interactive elements keyboard-navigable? (Tab order, focus visible, no keyboard traps)
- [ ] Is color contrast ratio WCAG AA compliant? (4.5:1 for normal text, 3:1 for large text)
- [ ] Are images, icons, and interactive elements annotated with `alt` text or `aria-label`?
- [ ] Is the application tested with a screen reader? (VoiceOver / NVDA / JAWS)
- [ ] If multi-locale is required: is i18n architecture designed from the start? (not retrofitted — retrofitting i18n is expensive)

---

## Section 6 — Frontend Observability

- [ ] Is Real User Monitoring (RUM) in place? (Core Web Vitals from real users, not just Lighthouse)
- [ ] Are JavaScript errors tracked? (Sentry, or equivalent — unhandled exceptions, promise rejections)
- [ ] Are API errors from the frontend tracked? (4xx/5xx rates, latency from the client's perspective)
- [ ] Are user journey analytics in place? (funnel drop-off, interaction rates for key flows)
- [ ] Is there a way to reproduce a specific user's session when investigating a reported bug? (session replay)
- [ ] Are feature flags instrumented? (can you measure the impact of each flag on metrics?)

---

## Chief Architect of Google Review: Frontend

**Acting as Chief Architect of Google** — reviewing the frontend architecture for correctness at scale:

1. **Rendering correctness**: Is the rendering strategy appropriate for each page's content type and SEO requirements? Is there a risk of serving stale content when freshness matters?
2. **Performance discipline**: Are CWV budgets defined and enforced? Is the LCP element identifiable and preloaded? Is there any render-blocking resource?
3. **API coupling**: Is the frontend tightly coupled to backend API shapes? What breaks if the API changes a field name?
4. **State management sanity**: Is there derived state stored redundantly? Is server state managed by a cache layer or manually synchronized?
5. **Accessibility**: Is WCAG AA compliance verifiable? Is keyboard navigation testable?
6. **Scalability to multi-team**: If the team doubles, can different engineers own different parts without stepping on each other?
7. **Operational visibility**: Can a frontend error be traced to the specific user action and API call that caused it?

**Chief Architect Verdict:**
```
Rendering strategy:     ✅ CORRECT | ⚠️ SUBOPTIMAL: <reason> | ❌ WRONG: <must change>
Performance (CWV):      ✅ BUDGETED | ⚠️ NOT MEASURED | ❌ EXCEEDS THRESHOLD
API coupling:           ✅ DECOUPLED | ⚠️ FRAGILE: <risk>
State management:       ✅ CLEAN | ⚠️ OVERCOMPLEX | ❌ SYNC BUGS LIKELY
Accessibility:          ✅ WCAG AA | ⚠️ PARTIAL | ❌ NOT ADDRESSED
Frontend observability: ✅ PASS | ⚠️ GAPS: <what's missing>

Must-fix before approval:
  - <item>

Status: APPROVED | REQUIRES ATTENTION | REWORK REQUIRED
```

---

## Findings Format

```
=== FRONTEND ARCHITECTURE REVIEW ===
Feature / System: <name>

Rendering strategy:         ✅ PER-ROUTE | ⚠️ ONE-SIZE-FITS-ALL | — API ONLY (N/A)
Core Web Vitals:            ✅ BUDGETED (LCP <2.5s) | ⚠️ NOT MEASURED | ❌ EXCEEDS
BFF / API design:           ✅ OPTIMIZED FOR CLIENT | ⚠️ OVER-FETCHING | ❌ WATERFALL
Real-time:                  ✅ SSE/WS designed | — NOT REQUIRED | ❌ POLLING (wasteful)
Graceful degradation:       ✅ PASS | ❌ BLANK SCREEN ON ERROR
Micro-frontends:            ✅ APPROPRIATE | — SINGLE TEAM (not applicable) | ⚠️ WRONG TOOL
Bundle strategy:            ✅ SPLIT + BUDGETED | ⚠️ NO BUDGET | ❌ MONOLITH BUNDLE
State management:           ✅ RIGHT TOOL/LEVEL | ⚠️ OVER-ENGINEERED | ❌ SYNC BUGS
Accessibility:              ✅ WCAG AA | ⚠️ PARTIAL | ❌ NOT ADDRESSED
Frontend observability:     ✅ RUM + ERROR TRACKING | ⚠️ PARTIAL | ❌ NONE

Must-fix items:
  - <item>

Chief Architect verdict: APPROVED | REQUIRES ATTENTION | REWORK REQUIRED
```
