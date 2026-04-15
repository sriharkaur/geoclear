# /dev-arch-security — Security Pillar

## Model Dispatch — Opus Required

**This skill must run on Claude Opus.** Every finding at the dimension level feeds DECISIONS.md and the architectural debt backlog — quality here determines build quality downstream.

**If you are the Sonnet orchestrator:** Spawn an Opus sub-agent for this dimension review:
```
Agent(
  model="opus",
  subagent_type="general-purpose",
  description="PRISM-10 Security review",
  prompt="[Full Security review prompt with project context, all relevant files read, and the complete content of this skill file.]"
)
```
Write the sub-agent output to `architecture/ARCH-DEV_ARCH_SECURITY-{{YYYY-MM-DD}}.md`, log any decisions to DECISIONS.md, then continue.

**If you are already running as an Opus sub-agent:** Proceed directly with the review below.

---

> WAF Pillar 2: Protect data, systems, and assets. Applied as Google Chief Security Architect — Zero Trust model, defense in depth, assume breach.
>
> Core philosophy: Security is not a feature you add at the end. Every design decision either increases or decreases your attack surface. The question is whether you made that trade-off consciously.

---

## Acting as: Chief Security Architect at Google (Zero Trust)

Never trust, always verify — regardless of network location. Defense in depth means an attacker who passes one layer hits another. Design for breach containment, not just breach prevention. Treat security findings as bugs, prioritize by exploitability × impact, track to resolution.

---

## Design Question Set

### 1. Identity and Access

**Authentication:**
- [ ] Is every endpoint that returns sensitive data or modifies state behind authentication?
- [ ] Is the auth mechanism consistent with the existing system? (new auth paths = new attack surface)
- [ ] Are API keys/tokens validated on every request — never cached long-term in process memory?
- [ ] Are authentication and authorization errors indistinguishable to the caller? (don't leak user existence)
- [ ] What is the key/token revocation strategy? Can a compromised credential be revoked in < 5 minutes?

**Authorization:**
- [ ] Is every resource access checked against the caller's permissions at every code path, not just the entry point?
- [ ] Are admin endpoints behind a different auth mechanism than customer endpoints?
- [ ] Does a free-tier key ever transiently access paid-tier data? (audit every branch)
- [ ] Is there a test: valid-key-wrong-tier → must return 403, not 200?

**Least Privilege:**
- [ ] Does the application's DB connection use a scoped credential — not root/superuser?
- [ ] Do background workers have minimal permissions, not full app permissions?

### 2. Data Protection

**In transit:**
- [ ] Is all external communication TLS 1.2+ (TLS 1.3 preferred)?
- [ ] Is TLS certificate renewal automated?
- [ ] Are HSTS headers set for browser-facing endpoints?

**At rest:**
- [ ] Classify every data field: Public / Internal / Confidential / Restricted
- [ ] Are API keys stored hashed (bcrypt/argon2), not plaintext?
- [ ] Is customer PII (if any) identified, inventoried, and minimized?
- [ ] Is there a data retention policy? Is data that should be deleted actually deleted?

**Secrets:**
- [ ] Are ALL secrets in environment variables — never in code, config files, or chat?
- [ ] Is `.env` in `.gitignore`? Has git history been audited for accidental secret commits?
- [ ] What is the rotation plan? How long to rotate all secrets after a compromise?
- [ ] Read secrets from `~/.zshrc` or platform env vars — never paste into chat or logs.

### 3. Input Validation

**SQL injection:**
- [ ] Are ALL DB queries parameterized? Zero exceptions. No string concatenation into SQL.
- [ ] Are there tests that send `' OR '1'='1`, `'; DROP TABLE --` to every query parameter?

**Injection:**
- [ ] Is any user input passed to: `eval()`, `exec()`, shell commands, file paths, URLs fetched server-side? → if yes: CRITICAL severity, fix immediately
- [ ] Is body size limited before processing? (prevent memory exhaustion)
- [ ] Are all inputs validated for: type, max length, format, allowed character set?

### 4. Network and API Security

**CORS:**
- [ ] Is `Access-Control-Allow-Origin` set to a specific allowlist, not `*`?
- [ ] Are CORS headers set on error responses as well as success?

**Rate limiting:**
- [ ] Is rate limiting applied per-key, not just per-IP? (IP-only is bypassable)
- [ ] Is rate limiting on authentication endpoints to prevent brute force?
- [ ] Is the 429 response accompanied by `Retry-After`?

**HTTP security headers (browser-facing):**
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Content-Security-Policy` (prevent XSS)
- [ ] `Strict-Transport-Security`

**Error responses:**
- [ ] Do 5xx responses ever include: stack traces, file paths, SQL queries, server version, internal IPs? → HIGH severity. Strip all.
- [ ] Are validation errors helpful to legitimate users but not to attackers mapping the system?

### 5. Supply Chain

- [ ] Are production dependencies pinned to exact versions (no `^` or `~`)?
- [ ] Are there known CVEs? (`npm audit` / `pip audit` / `snyk`)
- [ ] Are unused dependencies removed? (reduce attack surface)

### 6. Compliance and Audit

- [ ] Does this feature handle PII? If yes: legal basis, deletion mechanism, data minimization
- [ ] Does this feature handle payment data? → never log card numbers; use tokenization only
- [ ] Are audit logs produced for: key creation, revocation, admin actions, billing events?
- [ ] Is there a security incident response plan? (who to notify, how to revoke, blast radius assessment)

---

## Threat Model (per new feature)

```
Asset:          <what data/capability is exposed>
Threat actors:  <anonymous user, competitor, compromised key holder, insider>
Attack vectors: <unauthenticated access, injection, key theft, rate abuse, SSRF>
Impact:         <data leak, service disruption, cost abuse, reputational>
Mitigations:    <controls in place for each vector>
Residual risk:  <what remains — is it acceptable?>
```

---

## Anti-Patterns to Reject

| Anti-pattern | Severity | Fix |
|-------------|---------|-----|
| String concat into SQL | CRITICAL | Parameterized queries — always |
| Secrets in code or git | CRITICAL | Env vars; audit git history |
| Stack traces in 5xx | HIGH | Generic message; log internally |
| `Access-Control-Allow-Origin: *` | HIGH | Explicit allowlist |
| Admin behind same auth as customer | HIGH | Separate secret, separate path |
| Rate limit by IP only | MEDIUM | Rate limit by key + IP |
| API keys stored plaintext | HIGH | Hash + salt; store only hash |
| Logging request bodies verbatim | MEDIUM | Explicit safe-field include list |

---

## Findings Format

```
=== SECURITY REVIEW ===
Feature: <name>

Identity & Access:    ✅ PASS | ⚠️ CONCERN: <issue> | ❌ CRITICAL: <issue>
Data protection:      ✅ PASS | ⚠️ CONCERN | ❌ CRITICAL
Input validation:     ✅ PASS | ⚠️ CONCERN | ❌ CRITICAL
Network / API:        ✅ PASS | ⚠️ CONCERN | ❌ CRITICAL
Supply chain:         ✅ PASS | ⚠️ CONCERN | ❌ CRITICAL
Compliance:           ✅ PASS | ⚠️ CONCERN | — N/A

Threat model:
  <vector>: MITIGATED | RESIDUAL RISK ACCEPTED | UNMITIGATED (must fix)

Critical findings (block deploy):
  - <finding>

High findings (fix within 1 sprint):
  - <finding>

Status: APPROVED | REQUIRES ATTENTION | REWORK REQUIRED
```
