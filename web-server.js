#!/usr/bin/env node
/**
 * NAD Web Server
 * ==============
 * Serves the NAD web interface + API on port 4001.
 * Combines static file serving with a lightweight API layer —
 * no separate REST API process needed for local use.
 *
 * Usage:
 *   node nad/web-server.js
 *   node nad/web-server.js --port 4002
 *
 * Then open: http://localhost:4001
 */

'use strict';

const express    = require('express');
const rateLimit  = require('express-rate-limit');
const crypto     = require('crypto');
const path       = require('path');
const { NADQuery }    = require('./query.js');
const { enrich }      = require('./enrich.js');
const { enrichPoint, getFEMAFloodZone, getEarthquakeRisk, getDroughtRisk, getFAADroneAirspace } = require('./geocode.js');
const { KeyStore }    = require('./keys.js');
const { RiskData }    = require('./risk-data.js');

// ── Config ────────────────────────────────────────────────────────
const argv  = process.argv.slice(2);
const PORT  = parseInt(
  argv.find(a => a.startsWith('--port='))?.split('=')[1] ??
  (argv.indexOf('--port') >= 0 ? argv[argv.indexOf('--port')+1] : null) ??
  process.env.PORT ??
  '4001'
);

// ── DB + Cache ───────────────────────────────────────────────────
const nad      = new NADQuery();
const keys     = new KeyStore();
let riskData = new RiskData();
const ADMIN_SECRET          = process.env.NAD_ADMIN_SECRET    || 'nad_admin_localdev';
const STRIPE_SECRET         = process.env.STRIPE_SECRET_KEY   || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICES         = {
  starter:        process.env.STRIPE_PRICE_STARTER         || '',  // $49 — grandfathered, not shown on pricing page
  growth:         process.env.STRIPE_PRICE_GROWTH          || '',  // $199 — current entry tier
  pro:            process.env.STRIPE_PRICE_PRO             || '',  // $499 — Professional
  scale:          process.env.STRIPE_PRICE_SCALE           || '',  // $999 — Scale
  pro_compliance: process.env.STRIPE_PRICE_PRO_COMPLIANCE  || '',  // retained for webhook compat only
  metered:        process.env.STRIPE_PRICE_METERED         || '',  // PAYG $0.001/lookup
};
const STRIPE_PRICES_BULK    = {
  bulk_1m:        process.env.STRIPE_PRICE_BULK_1M         || 'price_1TN4qvClBrXaJBXitL6R21rO',
  bulk_5m:        process.env.STRIPE_PRICE_BULK_5M         || 'price_1TN4qvClBrXaJBXicSYxysfe',
};
const STRIPE_METER_ID    = process.env.STRIPE_METER_ID       || '';
const BASE_URL           = process.env.NAD_BASE_URL           || `http://localhost:${PORT}`;
const SENDGRID_API_KEY       = process.env.SENDGRID_API_KEY       || '';
const FROM_EMAIL             = process.env.GEOCLEAR_FROM_EMAIL    || 'noreply@geoclear.io';
const UPTIMEROBOT_API_KEY    = process.env.UPTIMEROBOT_API_KEY    || '';
const UPTIMEROBOT_MONITOR_IDS = '802836799-802836800'; // GeoClear API Health + Landing Page
const stripe             = STRIPE_SECRET ? require('stripe')(STRIPE_SECRET) : null;

// ── SendGrid email helper ─────────────────────────────────────────
async function sendEmail(to, subject, html) {
  if (!SENDGRID_API_KEY) { console.warn('[email] SENDGRID_API_KEY not set — skipping email to', to); return; }
  try {
    const https = require('https');
    const body  = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from:    { email: FROM_EMAIL, name: 'GeoClear' },
      subject,
      content: [{ type: 'text/html', value: html }],
    });
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.sendgrid.com',
        path:     '/v3/mail/send',
        method:   'POST',
        headers:  { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        res.resume();
        res.statusCode < 300 ? resolve() : reject(new Error(`SendGrid ${res.statusCode}`));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    console.log(`[email] Sent "${subject}" → ${to}`);
  } catch (e) {
    console.error('[email] Failed:', e.message);
  }
}

function keyEmail(apiKey, tier, limits) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0d1117;color:#e6edf3;border-radius:8px;">
      <h2 style="color:#2ea043;margin:0 0 8px">Your GeoClear API key</h2>
      <p style="color:#8b949e;margin:0 0 24px">You're on the <strong style="color:#e6edf3">${tier}</strong> tier.</p>
      <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:16px;font-family:monospace;font-size:14px;word-break:break-all;color:#2ea043;">${apiKey}</div>
      <p style="color:#8b949e;margin:24px 0 8px;font-size:13px;">Limits: <strong style="color:#e6edf3">${limits.req_per_day.toLocaleString()} req/day</strong> · <strong style="color:#e6edf3">${limits.req_per_min} req/min</strong></p>
      <p style="color:#8b949e;font-size:13px;">Pass it as <code style="background:#21262d;padding:2px 6px;border-radius:4px;">X-Api-Key: ${apiKey.slice(0,24)}…</code> on every request.</p>
      <hr style="border:none;border-top:1px solid #30363d;margin:24px 0"/>
      <p style="color:#e6edf3;font-size:13px;margin-bottom:8px;font-weight:600;">30-second quickstart</p>
      <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:14px;font-family:monospace;font-size:12px;color:#79c0ff;white-space:pre-wrap;">curl "https://geoclear.io/api/address?street=1600+Pennsylvania+Ave&city=Washington&state=DC" \\
  -H "X-Api-Key: ${apiKey.slice(0,24)}…"</div>
      <p style="color:#8b949e;font-size:12px;margin-top:20px;">Full docs at <a href="https://geoclear.io/docs.html" style="color:#388bfd;">geoclear.io/docs.html</a> · Questions? Reply to this email.</p>
    </div>`;
}

// Simple in-memory cache for expensive queries
const cache = new Map();
function cached(key, fn, ttlMs = 1000 * 60 * 60) {  // 1-hour TTL
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.val;
  const val = fn();
  cache.set(key, { val, ts: Date.now() });
  return val;
}

// ── App ───────────────────────────────────────────────────────────
const app = express();

// ── Stripe Webhook (raw body — MUST precede express.json) ─────────
app.post('/v1/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).json({ ok: false, error: 'Stripe not configured.' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session      = event.data.object;
    const { tier }     = session.metadata || {};
    const email        = session.customer_details?.email || session.customer_email;
    const subId        = session.subscription || null;
    const customerId   = session.customer || null;
    if (email && tier) {
      try {
        const upgraded = await keys.upgradeTier(email.toLowerCase(), tier, subId, customerId);
        if (upgraded) {
          console.log(`[Stripe] Upgraded existing key for ${email} → ${tier}`);
          await keys.completeStripeSession(session.id, `upgraded:${upgraded.id}`);
          const { TIERS } = require('./keys.js');
          sendEmail(email, 'Your GeoClear plan has been upgraded', keyEmail('(your existing key — unchanged)', tier, TIERS[tier] || TIERS.free)).catch(() => {});
        } else {
          const result = await keys.generate({ email: email.toLowerCase(), tier, notes: `stripe:${session.id}` });
          await keys.upgradeTier(email.toLowerCase(), tier, subId, customerId);
          await keys.completeStripeSession(session.id, result.key);
          console.log(`[Stripe] New key issued for ${email} (${tier}): ${result.key.slice(0, 24)}…`);
          sendEmail(email, 'Your GeoClear API key', keyEmail(result.key, tier, result.limits)).catch(() => {});
        }
      } catch (e) {
        console.error('[Stripe] Key generation failed:', e.message);
      }
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub      = event.data.object;
    const subId    = sub.id;
    const priceId  = sub.items?.data?.[0]?.price?.id;
    // Reverse-lookup tier from price ID
    const newTier  = priceId ? Object.entries(STRIPE_PRICES).find(([, v]) => v === priceId)?.[0] : null;
    if (newTier) {
      const changed = await keys.changeSubscriptionTier(subId, newTier);
      if (changed) {
        console.log(`[Stripe] Subscription ${subId} plan changed: ${changed.oldTier} → ${newTier} (${changed.email})`);
      } else {
        console.warn(`[Stripe] subscription.updated for ${subId} — no matching key found`);
      }
    } else {
      console.warn(`[Stripe] subscription.updated: unrecognised price ${priceId}, skipping tier change`);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub   = event.data.object;
    const subId = sub.id;
    const downgraded = await keys.downgradeBySubscription(subId);
    if (downgraded) {
      console.log(`[Stripe] Subscription ${subId} cancelled → key downgraded to free`);
    } else {
      console.warn(`[Stripe] Subscription ${subId} cancelled but no matching key found`);
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const email   = invoice.customer_email;
    const attempt = invoice.attempt_count || 1;
    if (email) {
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0d1117;color:#e6edf3;border-radius:8px;">
          <h2 style="color:#f85149;margin:0 0 8px">Payment failed</h2>
          <p style="color:#8b949e;margin:0 0 20px">Attempt ${attempt} of 4. Your GeoClear API subscription is still active — please update your payment method to prevent service interruption.</p>
          <a href="${BASE_URL}/portal.html" style="display:inline-block;background:#388bfd;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Update Payment Method</a>
          <p style="color:#8b949e;margin-top:24px;font-size:0.85rem;">Questions? Reply to this email or visit <a href="${BASE_URL}" style="color:#388bfd;">geoclear.io</a></p>
        </div>`;
      sendEmail(email, `GeoClear: Payment failed (attempt ${attempt} of 4)`, html).catch(() => {});
      console.log(`[Stripe] invoice.payment_failed for ${email} (attempt ${attempt})`);
    }
  }

  res.json({ received: true });
});

app.use(express.json());

// ── Admin chunked upload (must be before body parsers consume stream) ──
// POST /v1/admin/stream-upload  headers: X-Admin-Secret, X-Upload-Filename
// Streams request body to /data/<filename> — single-shot, no body limit.
app.post('/v1/admin/stream-upload', (req, res) => {
  const secret   = req.headers['x-admin-secret'];
  const filename = req.headers['x-upload-filename'];
  if (secret !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!filename || filename.includes('/') || filename.includes('..'))
    return res.status(400).json({ ok: false, error: 'Invalid X-Upload-Filename header' });
  const fs   = require('fs');
  const dest = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), filename);
  const out  = fs.createWriteStream(dest);
  let bytes  = 0;
  req.on('data', chunk => { bytes += chunk.length; });
  req.pipe(out);
  out.on('finish', () => {
    console.log(`[stream-upload] ${filename}: ${(bytes/1e9).toFixed(2)}GB written to ${dest}`);
    res.json({ ok: true, path: dest, bytes });
  });
  out.on('error', e => {
    console.error('[stream-upload] error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  });
});

// POST /v1/admin/reload-risk-db — no-op with Neon (kept for backwards compat)
app.post('/v1/admin/reload-risk-db', adminAuth, async (req, res) => {
  try {
    const coverage = await riskData.coverage();
    console.log('[reload-risk-db] Neon — no reload needed. coverage:', JSON.stringify(coverage));
    res.json({ ok: true, coverage });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /v1/admin/upload-chunk  headers: X-Admin-Secret, X-Upload-Filename, X-Chunk-Offset
// Writes one chunk at the given byte offset. Supports resumable uploads for large files.
// Client sends chunks sequentially; server opens file with 'r+' (or creates if offset==0).
app.post('/v1/admin/upload-chunk', (req, res) => {
  const secret   = req.headers['x-admin-secret'];
  const filename = req.headers['x-upload-filename'];
  const offset   = parseInt(req.headers['x-chunk-offset'] || '0', 10);
  if (secret !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!filename || filename.includes('/') || filename.includes('..'))
    return res.status(400).json({ ok: false, error: 'Invalid X-Upload-Filename' });
  if (isNaN(offset) || offset < 0) return res.status(400).json({ ok: false, error: 'Invalid X-Chunk-Offset' });
  const fs   = require('fs');
  const dest = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), filename);
  // Create file on first chunk; append at offset for subsequent chunks
  const flags = offset === 0 ? 'w' : 'r+';
  const out   = fs.createWriteStream(dest, { flags, start: offset });
  let bytes   = 0;
  req.on('data', chunk => { bytes += chunk.length; });
  req.pipe(out);
  out.on('finish', () => {
    const newOffset = offset + bytes;
    console.log(`[upload-chunk] ${filename} offset=${offset} +${bytes}B → total=${newOffset}`);
    res.json({ ok: true, offset, bytes, newOffset });
  });
  out.on('error', e => {
    console.error('[upload-chunk] error:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  });
});

// ── Security headers + CORS ───────────────────────────────────────
// Set NAD_ALLOWED_ORIGINS=https://yourdomain.com in production to restrict CORS.
// Leave unset (or empty) in dev to allow all origins.
const ALLOWED_ORIGINS = process.env.NAD_ALLOWED_ORIGINS
  ? new Set(process.env.NAD_ALLOWED_ORIGINS.split(',').map(o => o.trim()))
  : null; // null = wildcard (dev/local mode)

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS === null) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key, X-Admin-Secret');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve static files — disable index so root '/' falls through to the route handler below
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/status', (req, res) => res.redirect('/status.html'));

// ── API Auth + Rate Limiting ──────────────────────────────────────
// /api/health, /api/stats, /api/states are open — everything else requires a key
const OPEN_API_PATHS = new Set(['/health', '/stats', '/states', '/demo', '/status']);

async function apiAuth(req, res, next) {
  const rawKey = req.headers['x-api-key'] || req.query.key;
  if (!rawKey) {
    return res.status(401).json({
      ok: false,
      error: 'API key required. Pass X-Api-Key header or ?key= query param.',
      get_key: `${BASE_URL}/portal.html`,
    });
  }
  const info = await keys.validate(rawKey);
  if (!info) {
    return res.status(401).json({ ok: false, error: 'Invalid or revoked API key.' });
  }
  if (info.requests_today >= info.limits.req_per_day) {
    return res.status(429).json({
      ok: false,
      error: `Daily quota exhausted (${info.limits.req_per_day.toLocaleString()} req/day for ${info.tier} tier). Resets at midnight UTC.`,
      upgrade: `${BASE_URL}/portal.html`,
    });
  }
  // Warn at 80% of daily limit — nudge upgrade before they hit the wall
  const usagePct = info.requests_today / info.limits.req_per_day;
  if (usagePct >= 0.8 && info.tier !== 'enterprise') {
    res.set('X-Quota-Warning', `${Math.round(usagePct * 100)}% of daily limit used — upgrade at ${BASE_URL}/portal.html`);
  }
  req.keyInfo = info;
  req._startAt = process.hrtime.bigint();
  res.on('finish', () => {
    const latencyMs = req._startAt ? Number(process.hrtime.bigint() - req._startAt) / 1e6 : null;
    keys.recordUsage(info.key_id, req.path, res.statusCode, Math.round(latencyMs), info.tier);
  });
  next();
}

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => req.keyInfo?.limits?.req_per_min ?? 10,
  keyGenerator: (req) => `k:${req.keyInfo?.key_id ?? req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lim  = req.keyInfo?.limits?.req_per_min ?? 10;
    const tier = req.keyInfo?.tier ?? 'free';
    res.status(429).json({
      ok: false,
      error: `Rate limit exceeded — ${lim} req/min for ${tier} tier.`,
      upgrade: `${BASE_URL}/portal.html`,
    });
  },
});

// DB readiness gate — address/lookup routes need nad.db; keys routes just need keys.db
app.use('/api', (req, res, next) => {
  const needsNad = !OPEN_API_PATHS.has(req.path) && req.path !== '/keys' && req.path !== '/health';
  if (needsNad && !nad.isReady()) {
    return res.status(503).json({ ok: false, error: 'Address database not yet loaded. Check back shortly.', code: 'DB_NOT_READY' });
  }
  next();
});

// Apply auth + rate-limit to all protected /api routes
app.use('/api', (req, res, next) => {
  if (OPEN_API_PATHS.has(req.path) || req.path.startsWith('/demo')) return next();
  apiAuth(req, res, next);
});
app.use('/api', (req, res, next) => {
  if (OPEN_API_PATHS.has(req.path) || !req.keyInfo) return next();
  apiLimiter(req, res, next);
});

// ── Helpers ───────────────────────────────────────────────────────
const ok  = (res, data, meta = {}) => res.json({ ok: true, ...meta, data });
const err = (res, msg, status = 400) => res.status(status).json({ ok: false, error: msg });

const _OVERTURE_STATES = new Set(['CA','FL','NJ','MI','PA','MS','GA','LA','NV','SC','ID','MT','NH','WY','SD']);
const _THIN_STATES     = new Set(['AK','VI','AS','GU','MP','PR']);

function enrichAddress(a) {
  const e = enrich(a);
  return {
    verified:     true,
    confidence:   e.confidence,
    full_address: e.full_address,
    add_number:   e.add_number,
    st_pre_dir:   e.st_pre_dir,
    st_name:      e.st_name,
    st_pos_typ:   e.st_pos_typ,
    st_pos_dir:   e.st_pos_dir,
    unit:         e.unit,
    neighborhood: e.neighborhood,
    inc_muni:     e.inc_muni,
    post_city:    e.post_city,
    city:         e.display_city,
    county:       e.county,
    state:        e.state,
    zip_code:     e.zip_code,
    plus_4:       e.plus4,
    fips:         e.fips,
    timezone:     e.timezone,
    residential:  e.residential,
    latitude:     e.latitude,
    longitude:    e.longitude,
    placement:    e.placement,
    addr_type:    e.addr_type,
    addr_class:   e.addr_class,
    add_auth:     e.add_auth,
    date_update:  e.date_update,
    nad_source:   e.nad_source,
    nad_uuid:     e.nad_uuid,
    coverage:     _OVERTURE_STATES.has(e.state) ? 'gap-fill'
                : _THIN_STATES.has(e.state)     ? 'partial'
                : e.state                       ? 'full'
                :                                 null,
  };
}

// ── API Routes ────────────────────────────────────────────────────

// Stats
app.get('/api/stats', (req, res) => {
  const data = cached('stats', () => nad.stats());
  ok(res, data);
});

// Address search  (?fuzzy=true enables typo-tolerant matching)
app.get('/api/address', (req, res) => {
  const { street, number, city, state, zip, limit, fuzzy } = req.query;
  if (!street && !zip && !number && !city && !state) {
    return err(res, 'Provide at least one search parameter.');
  }
  const lim   = Math.min(parseInt(limit || '10'), 50);
  const isFuz = fuzzy === 'true' || fuzzy === '1';
  const key   = `addr:${number}:${street}:${city}:${state}:${zip}:${lim}:${isFuz}`;
  const fn    = isFuz ? 'findAddressFuzzy' : 'findAddress';
  const raw   = cached(key, () => nad[fn]({
    addNumber:  number,
    streetName: street,
    city,
    stateCode:  state,
    zipCode:    zip,
    limit:      lim,
  }));
  if (!raw.length) return err(res, 'No addresses found.', 404);
  const results = raw.map(enrichAddress);
  if (!req.keyInfo?.limits?.enrichment) {
    const hint = { census_tract: null, flood_zone: null, flood_sfha: null, elevation_ft: null,
      _enrichment: { available: true, required_tier: 'professional', upgrade_url: 'https://geoclear.io/portal.html' } };
    results.forEach(r => Object.assign(r, hint));
  }
  // Ground-Truth Graph: record query signal for each returned address (fire-and-forget)
  setImmediate(() => { for (const r of raw) keys.recordAddressQuery(r.nad_uuid); });
  ok(res, results, { count: results.length });
});

// Autocomplete / typeahead  (?q=123+Main&state=TX&limit=10)
app.get('/api/suggest', (req, res) => {
  const { q, state, zip, limit } = req.query;
  if (!q || q.trim().length < 2) return err(res, 'q must be at least 2 characters.');
  const lim  = Math.min(parseInt(limit || '10'), 20);
  const key  = `suggest:${q}:${state||''}:${zip||''}:${lim}`;
  const data = cached(key, () => nad.suggest({ q, stateCode: state, zipCode: zip, limit: lim }),
    1000 * 60 * 5);  // 5-min TTL (typeahead is more volatile)
  ok(res, data, { count: data.length });
});

// Bulk address verify
app.post('/api/address/bulk', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return err(res, 'Body must be an array.');
  if (items.length > 1000)   return err(res, 'Max 1,000 addresses per request.');
  const results = items.map(({ street, number, city, state, zip }) => {
    const found = nad.findAddress({ addNumber: number, streetName: street, city, stateCode: state, zipCode: zip, limit: 1 });
    return found.length ? enrichAddress(found[0]) : { verified: false, input: { street, number, city, state, zip } };
  });
  if (!req.keyInfo?.limits?.enrichment) {
    const hint = { census_tract: null, flood_zone: null, flood_sfha: null, elevation_ft: null,
      _enrichment: { available: true, required_tier: 'pro', upgrade_url: 'https://geoclear.io/portal.html' } };
    results.forEach(r => { if (r.verified !== false) Object.assign(r, hint); });
  }
  ok(res, results, { count: results.length });
});

// ── CSV helpers ───────────────────────────────────────────────────

// RFC 4180-compliant CSV parser. Handles quoted fields, escaped quotes, CRLF + LF.
function parseCSV(text) {
  const rows = [];
  let field = '';
  let inQuote = false;
  let row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuote = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
      if (ch === '\r') i++; // consume \n after \r
      row.push(field); field = '';
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field || row.length) { row.push(field); if (row.length > 0) rows.push(row); }
  return rows;
}

// Serialize rows (array of arrays) to CSV string.
function toCSV(rows) {
  return rows.map(row =>
    row.map(v => {
      const s = v == null ? '' : String(v);
      return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  ).join('\n');
}

// Map known header aliases to canonical field names.
const CSV_COL_ALIASES = {
  number:  ['number', 'street_number', 'house_number', 'hn', 'add_number', 'num', 'house', 'bldg'],
  street:  ['street', 'street_name', 'street_address', 'addr', 'address'],
  city:    ['city', 'city_name', 'place', 'municipality'],
  state:   ['state', 'state_code', 'state_abbr', 'province'],
  zip:     ['zip', 'zipcode', 'zip_code', 'postal_code', 'postal', 'postalcode'],
};

function detectColumns(headers) {
  const lower = headers.map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const map = {};
  for (const [canon, aliases] of Object.entries(CSV_COL_ALIASES)) {
    for (let i = 0; i < lower.length; i++) {
      // Exact match first; then startsWith only for aliases ≥ 4 chars (prevents 'st' matching 'street')
      if (aliases.some(a => lower[i] === a || (a.length >= 4 && lower[i].startsWith(a)))) {
        map[canon] = i; break;
      }
    }
  }
  return map;
}

// ── CSV address verification endpoint ────────────────────────────
// POST /api/address/csv
// Content-Type: text/csv (or application/csv)
// Body: CSV with headers (max 5,000 rows)
// Returns: same CSV + geo_verified, nad_uuid, confidence, residential, fips, timezone, coverage, match_type columns
app.post('/api/address/csv', (req, res) => {
  // Read raw body directly — avoids express.json() body-consumption ordering issues.
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('error', () => err(res, 'Body read error.'));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    if (!body.trim()) return err(res, 'Empty CSV body.');

    const parsed = parseCSV(body.trim());
    if (parsed.length < 2) return err(res, 'CSV must have a header row and at least one data row.');
    if (parsed.length > 5001) return err(res, 'Max 5,000 rows per CSV request.');

    const headers = parsed[0];
    const colMap  = detectColumns(headers);

    if (colMap.street === undefined) {
      return err(res, 'Could not detect a "street" or "address" column. Required: street (or address), city, state.');
    }

    const ENRICHMENT_COLS = ['geo_verified', 'nad_uuid', 'confidence', 'residential', 'fips', 'timezone', 'coverage', 'match_type'];
    const outHeaders = [...headers, ...ENRICHMENT_COLS];
    const outRows = [outHeaders];

    const dataRows = parsed.slice(1);
    for (const row of dataRows) {
      const get = (col) => (colMap[col] !== undefined ? (row[colMap[col]] || '').trim() : '');
      const found = nad.findAddress({
        addNumber:  get('number'),
        streetName: get('street'),
        city:       get('city'),
        stateCode:  get('state'),
        zipCode:    get('zip'),
        limit: 1,
      });
      let enriched;
      if (found.length) {
        const e = enrichAddress(found[0]);
        enriched = [
          true,
          e.nad_uuid     || '',
          e.confidence   ?? '',
          e.residential  || '',
          e.fips         || '',
          e.timezone     || '',
          e.coverage     || '',
          e.match_type   || '',
        ];
      } else {
        enriched = [false, '', '', '', '', '', '', ''];
      }
      outRows.push([...row, ...enriched]);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="geoclear-verified.csv"');
    res.send(toCSV(outRows));
  }); // req.on('end')
});

// ZIP lookup
app.get('/api/zip/:zip', (req, res) => {
  const { zip } = req.params;
  const { state } = req.query;
  const data = cached(`zip:${zip}:${state||''}`, () => nad.getZip(zip, state));
  if (!data) return err(res, `ZIP ${zip} not found.`, 404);
  ok(res, data);
});

// State summary
app.get('/api/state/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const data = cached(`state:${code}`, () => nad.getState(code));
  if (!data) return err(res, `State ${code} not found.`, 404);
  ok(res, data);
});

// All states (for top-states list)
app.get('/api/states', (req, res) => {
  const data = cached('states', () =>
    nad.listStates().sort((a, b) => (b.address_count || 0) - (a.address_count || 0))
  );
  ok(res, data, { count: data.length });
});

// Counties
app.get('/api/county', (req, res) => {
  const { state, name } = req.query;
  if (!state) return err(res, 'state parameter required.');
  const key  = `county:${state}:${name||''}`;
  const data = cached(key, () =>
    name ? [nad.getCounty(name, state)].filter(Boolean) : nad.listCounties(state)
  );
  ok(res, data, { count: data.length });
});

// Cities
app.get('/api/city', (req, res) => {
  const { state, name, county, limit } = req.query;
  if (!state && !name) return err(res, 'Provide state or name.');
  const lim  = parseInt(limit || '100');
  const key  = `city:${state}:${county}:${name}:${lim}`;
  let data   = cached(key, () =>
    name ? nad.searchCity(name, state) : nad.listCities(state, county)
  );
  data = data.slice(0, lim);
  ok(res, data, { count: data.length });
});

// Neighborhoods
app.get('/api/neighborhood', (req, res) => {
  const { state, city, limit } = req.query;
  if (!state) return err(res, 'state parameter required.');
  const lim = parseInt(limit || '50');
  const key = `nbrhd:${state}:${city}:${lim}`;
  const db  = nad.db;
  const data = cached(key, () =>
    db.prepare(`
      SELECT n.name, n.type, n.address_count,
             ci.name AS city_name, s.code AS state_code
      FROM neighborhoods n
      JOIN states s ON s.id = n.state_id
      LEFT JOIN cities ci ON ci.id = n.city_id
      WHERE s.code = ?
        ${city ? "AND UPPER(ci.name) LIKE UPPER(?)" : ""}
      ORDER BY n.address_count DESC LIMIT ?
    `).all(...[state.toUpperCase(), ...(city ? [`%${city}%`] : []), lim])
  );
  ok(res, data, { count: data.length });
});

// ZIP codes in state/city
app.get('/api/zips', (req, res) => {
  const { state, city, limit } = req.query;
  if (!state) return err(res, 'state parameter required.');
  const lim  = parseInt(limit || '50');
  const key  = `zips:${state}:${city}:${lim}`;
  const data = cached(key, () => nad.listZips(state, city).slice(0, lim));
  ok(res, data, { count: data.length });
});

// Proximity search
app.get('/api/near', (req, res) => {
  const { lat, lon, radius_km, limit } = req.query;
  if (!lat || !lon) return err(res, 'lat and lon required.');
  const radiusDeg = (parseFloat(radius_km) || 0.5) / 111;
  const lim       = Math.min(parseInt(limit || '20'), 100);
  const results   = nad.findNear(parseFloat(lat), parseFloat(lon), radiusDeg, lim);
  if (!results.length) return err(res, `No addresses found within ${radius_km || 0.5} km.`, 404);
  ok(res, results.map(enrichAddress), { count: results.length });
});

// Point enrichment — census tract + FEMA flood zone  (?lat=&lon=)
// Also accepts ?nad_uuid= to look up address first then enrich its coordinates
app.get('/api/enrich', async (req, res) => {
  if (!req.keyInfo?.limits?.enrichment) {
    return res.status(402).json({
      ok: false,
      error: 'enrichment_requires_pro',
      message: 'Census tract and FEMA flood zone data requires a Professional plan or higher.',
      upgrade_url: 'https://geoclear.io/portal.html',
    });
  }
  // Builder tier: metered monthly enrichment quota
  const monthlyLimit = req.keyInfo.limits.enrichment_monthly_limit;
  if (monthlyLimit !== null && monthlyLimit > 0) {
    const quota = await keys.checkEnrichmentQuota(req.keyInfo.key_id, monthlyLimit);
    if (!quota.allowed) {
      return res.status(402).json({
        ok: false,
        error: 'enrichment_monthly_limit_reached',
        message: `Builder tier includes ${monthlyLimit} enrichment calls/month. Used: ${quota.used}/${quota.limit}. Upgrade to Professional for unlimited enrichment.`,
        upgrade_url: 'https://geoclear.io/portal.html',
      });
    }
  }

  let { lat, lon, nad_uuid } = req.query;

  if (nad_uuid && (!lat || !lon)) {
    const row = nad.db.prepare('SELECT latitude, longitude FROM addresses WHERE nad_uuid=? LIMIT 1').get(nad_uuid);
    if (!row) return err(res, `Address UUID ${nad_uuid} not found.`, 404);
    lat = row.latitude;
    lon = row.longitude;
  }

  if (!lat || !lon) return err(res, 'lat and lon required (or nad_uuid).');

  try {
    const fLat = parseFloat(lat);
    const fLon = parseFloat(lon);
    const hardNull = (ms) => new Promise(r => setTimeout(() => r(null), ms));
    const [data, airspace] = await Promise.all([
      enrichPoint(fLat, fLon),
      Promise.race([getFAADroneAirspace(fLat, fLon).catch(() => null), hardNull(5000)]),
    ]);

    // Building footprint from Neon (populated by building-import.js, staging pipeline)
    const building   = await riskData.getBuildingFootprint(fLat, fLon);
    const openSqm    = building ? Math.max(0, 400 - (building.area_sqm || 0)) : null;

    // Drone deliverability: Class G + open yard ≥ 50 sqm → deliverable
    const inControlled   = airspace?.in_controlled_airspace ?? false;
    const authAlt        = airspace?.authorized_altitude_ft ?? (inControlled ? 0 : 400);
    const canFly         = !inControlled || (authAlt >= 50);
    const hasLandingZone = openSqm === null ? null : openSqm >= 50;
    const deliverable    = canFly && (hasLandingZone !== false);
    const confidence     = building ? (airspace ? 'high' : 'medium') : (airspace ? 'low' : 'low');

    ok(res, {
      ...data,
      drone: {
        deliverable,
        airspace_class:        inControlled ? 'controlled' : 'G',
        authorized_altitude_ft: authAlt,
        laanc_available:        airspace?.laanc_available ?? false,
        airport_id:             airspace?.airport_id      ?? null,
        estimated_open_sqm:     openSqm,
        building_area_sqm:      building?.area_sqm ?? null,
        confidence,
      },
    });
  } catch (e) {
    err(res, `Enrichment failed: ${e.message}`, 500);
  }
});

// Health check — never blocks. Returns cached count if warm, null if not yet computed.
// COUNT(*) on 120M rows is expensive; /api/stats warms the cache lazily via first request.
app.get('/api/health', (req, res) => {
  if (!nad.isReady()) return res.json({ status: 'starting', addresses: null, version: '1.0.0' });
  const hit = cache.get('stats');
  res.json({ status: 'ok', addresses: hit ? hit.val.addresses : null, version: '1.0.0' });
});

// UptimeRobot proxy — returns real uptime data for GeoClear monitors only.
// API key stays server-side; browser never sees it.
app.get('/api/status', async (req, res) => {
  if (!UPTIMEROBOT_API_KEY) return res.json({ ok: false, error: 'Uptime monitoring not configured' });
  try {
    const body = new URLSearchParams({
      api_key: UPTIMEROBOT_API_KEY,
      monitors: UPTIMEROBOT_MONITOR_IDS,
      format: 'json',
      custom_uptime_ratios: '1-7-30-90',
      response_times: '1',
      response_times_limit: '24',
    });
    const r = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    if (data.stat !== 'ok') return res.status(502).json({ ok: false, error: 'UptimeRobot error' });

    const monitors = data.monitors.map(m => {
      const ratios = (m.custom_uptime_ratio || '').split('-').map(Number);
      const avgResponseMs = m.response_times && m.response_times.length
        ? Math.round(m.response_times.reduce((s, t) => s + t.value, 0) / m.response_times.length)
        : null;
      return {
        id: m.id,
        name: m.friendly_name,
        url: m.url,
        status: m.status, // 2=up, 9=down, 1=unknown
        uptime_1d:  ratios[0] ?? null,
        uptime_7d:  ratios[1] ?? null,
        uptime_30d: ratios[2] ?? null,
        uptime_90d: ratios[3] ?? null,
        avg_response_ms: avgResponseMs,
        interval_s: m.interval,
      };
    });

    res.json({ ok: true, monitors });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Failed to reach UptimeRobot' });
  }
});

// ── Key management (portal routes) ───────────────────────────────
function adminAuth(req, res, next) {
  const provided = req.headers['x-admin-secret'] || req.query.admin_secret || '';
  // timingSafeEqual requires equal-length buffers; length mismatch is itself rejected
  const a = Buffer.from(provided);
  const b = Buffer.from(ADMIN_SECRET);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) return res.status(403).json({ ok: false, error: 'Admin secret required.' });
  next();
}

app.get('/v1/admin/keys/stats', adminAuth, async (req, res) => {
  ok(res, await keys.stats());
});

// GET /v1/admin/signals — Ground-Truth Graph: top queried addresses + signal totals
app.get('/v1/admin/signals', adminAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100'), 1000);
  const [top, total] = await Promise.all([
    keys.getTopQueriedAddresses(limit),
    keys.getSignalTotals(),
  ]);
  ok(res, { total_addresses_tracked: parseInt(total.n, 10), total_query_hits: parseInt(total.hits, 10), top });
});
// GET /v1/admin/data-sources — Data catalog: all data sources with metadata
// ?status=active|blocked|planned  (optional filter)
app.get('/v1/admin/data-sources', adminAuth, async (req, res) => {
  const sources = await keys.getDataSources(req.query.status || null);
  ok(res, { count: sources.length, sources });
});

// PATCH /v1/admin/data-sources/:source_id — Update refresh metadata on a data source
// Body: { last_sourced_at, next_refresh_at, row_count, status, notes }
app.patch('/v1/admin/data-sources/:source_id', adminAuth, async (req, res) => {
  const result = await keys.updateDataSource(req.params.source_id, req.body);
  if (!result) return res.status(400).json({ ok: false, error: 'no_valid_fields_or_not_found' });
  ok(res, { updated: result.changes > 0 });
});

// GET /v1/risk — Risk Score v1
// Returns 4 dimensions (0–1) for any address. Available on Professional+ tiers.
// ?nad_uuid=  OR  ?street=&city=&state=&zip=  OR  ?lat=&lon=
//
// Dimensions:
//   deliverability — NAD placement + confidence + query activity
//   fraud          — velocity (distinct keys querying same addr) + fraud_signal_count
//   disaster       — FEMA flood zone (live); USFS wildfire + NOAA storm (pending data import)
//   vacancy        — zero-query signal + addr_class heuristic
app.get('/v1/risk', async (req, res) => {
  // Inline auth for /v1/ routes (apiAuth middleware only covers /api/)
  const _riskKey = req.headers['x-api-key'] || req.query.key;
  if (!_riskKey) return res.status(401).json({ ok: false, error: 'API key required.' });
  const _riskInfo = await keys.validate(_riskKey);
  if (!_riskInfo) return res.status(401).json({ ok: false, error: 'Invalid or revoked API key.' });
  req.keyInfo = _riskInfo;

  if (!req.keyInfo.limits?.enrichment) {
    return res.status(402).json({
      ok: false,
      error: 'risk_requires_professional',
      message: 'Risk Score requires a Professional plan or higher.',
      upgrade_url: `${BASE_URL}/portal.html`,
    });
  }
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'Database not ready.' });
  if (!riskData.isReady()) return res.status(503).json({ ok: false, error: 'risk_data_unavailable' });

  let { nad_uuid, street, number, city, state, zip, lat, lon } = req.query;

  // ── 1. Resolve address row ────────────────────────────────────────
  let addr = null;
  if (nad_uuid) {
    addr = nad.db.prepare(
      `SELECT a.*, c.name AS county FROM addresses a
       LEFT JOIN counties c ON c.id = a.county_id
       WHERE a.nad_uuid = ? LIMIT 1`
    ).get(nad_uuid);
  } else if (street || zip) {
    const rows = nad.findAddress({ addNumber: number, streetName: street, city, stateCode: state, zipCode: zip, limit: 1 });
    addr = rows[0] || null;
  } else if (lat && lon) {
    // Nearest address within 50m
    const rows = nad.findNear(parseFloat(lat), parseFloat(lon), 0.0005, 1);
    addr = rows[0] || null;
  }

  if (!addr) return err(res, 'Address not found. Provide nad_uuid, street+city+state, or lat+lon.', 404);
  if (!addr.nad_uuid) return err(res, 'Address record has no nad_uuid — cannot score.', 422);

  const enriched = enrich(addr);
  const addrLat  = parseFloat(addr.latitude  || lat  || 0);
  const addrLon  = parseFloat(addr.longitude || lon  || 0);

  // ── 2. Fetch signals in parallel ─────────────────────────────────
  const countyFips5 = enriched.fips || null;
  const [femaResult, signalRow, velocityRow, wildfireRow, stormRow, outcomeStats, earthquakeResult, droughtResult] = await Promise.all([
    (addrLat && addrLon) ? getFEMAFloodZone(addrLat, addrLon).catch(() => null) : Promise.resolve(null),
    keys.getAddressSignal(addr.nad_uuid),
    keys.getAddressQueryVelocity(),
    countyFips5 ? riskData.getWildfireRisk(countyFips5) : Promise.resolve(null),
    countyFips5 ? riskData.getStormRisk(countyFips5)    : Promise.resolve(null),
    keys.getOutcomeStats(addr.nad_uuid),
    // Earthquake: Neon lookup first, fall back to live USGS API
    (countyFips5 ? riskData.getEarthquakeRisk(countyFips5) : Promise.resolve(null))
      .then(r => r ?? ((addrLat && addrLon) ? getEarthquakeRisk(addrLat, addrLon).catch(() => null) : null)),
    // Drought: Neon lookup first, fall back to live USDA API
    (countyFips5 ? riskData.getDroughtRisk(countyFips5) : Promise.resolve(null))
      .then(r => r ?? (countyFips5 ? getDroughtRisk(countyFips5).catch(() => null) : null)),
  ]);

  // CAL FIRE: CA addresses only, lat/lon required
  const calFireRow = (addr.state === 'CA' && addrLat && addrLon)
    ? await riskData.getCalFireFHSZ(addrLat, addrLon) : null;

  // ── 3. Score each dimension ───────────────────────────────────────

  // Deliverability (0–1)
  // v2: outcome-backed when delivery outcomes exist for this address (drone/postal feedback)
  // v1: confidence + placement + query activity heuristic
  const confNorm       = (enriched.confidence || 50) / 100;
  const placementBoost = { 'Structure - Rooftop': 0.15, Rooftop: 0.15, Parcel: 0.05 }[addr.placement] ?? 0;
  const activityBoost  = Math.min((signalRow.query_count || 0) / 20, 0.1);
  const heuristicDelivery = Math.min(1, confNorm * 0.75 + placementBoost + activityBoost);

  const deliveryOutcomes = (outcomeStats.delivery_success || 0) + (outcomeStats.delivery_failed || 0);
  const deliverability = deliveryOutcomes >= 3
    ? outcomeStats.delivery_rate                                       // v2: outcome-backed (min 3 attempts)
    : Math.min(1, Math.max(0, heuristicDelivery));                     // v1: heuristic fallback

  // Fraud (0–1)
  // v2: outcome-backed when fraud labels exist; v1: signal count + velocity heuristic
  const fraudSignals  = signalRow.fraud_signal_count || 0;
  const velocityScore = Math.min((velocityRow?.n || 0) / 50, 0.3);
  const fraudHeuristic = Math.min(1, Math.max(0, Math.min(fraudSignals / 5, 0.7) + velocityScore));

  const fraudOutcomes = (outcomeStats.fraud_confirmed || 0) + (outcomeStats.fraud_cleared || 0);
  const fraud = fraudOutcomes >= 2
    ? Math.min(1, (outcomeStats.fraud_rate || 0) + Math.min((outcomeStats.chargeback || 0) / 3, 0.3))
    : fraudHeuristic;

  // Disaster (0–1): FEMA flood + USFS wildfire + NOAA storm + CAL FIRE FHSZ
  let disasterFlood = 0;
  if (femaResult) {
    if (femaResult.sfha === true)                                                                            disasterFlood = 0.8;
    else if (femaResult.flood_zone && femaResult.flood_zone !== 'X' && femaResult.flood_zone !== 'OUTSIDE') disasterFlood = 0.4;
    else if (femaResult.flood_zone === 'X')                                                                  disasterFlood = 0.05;
  }

  // Wildfire: WHP class 1–5 → 0–0.4 contribution
  const WHP_SCORE = { 1: 0.0, 2: 0.05, 3: 0.15, 4: 0.30, 5: 0.40 };
  const disasterWildfire = wildfireRow ? (WHP_SCORE[Math.round(wildfireRow.whp_score)] ?? 0) : 0;

  // CAL FIRE: overrides wildfire score for CA (more granular)
  const CAL_FIRE_SCORE = { Moderate: 0.15, High: 0.30, 'Very High': 0.45 };
  const disasterCalFire = calFireRow ? (CAL_FIRE_SCORE[calFireRow.fhsz_label] ?? 0) : 0;

  // Storm: normalize 10-yr event count (>200 events/decade = high risk county)
  const disasterStorm = stormRow ? Math.min((stormRow.event_count || 0) / 200, 0.3) : 0;

  // Combine: flood dominates, wildfire/storm add on top (capped at 1.0)
  const disasterWildfireFinal = Math.max(disasterCalFire, disasterWildfire);
  const disaster = Math.min(1, Math.max(0, disasterFlood * 0.6 + disasterWildfireFinal * 0.25 + disasterStorm * 0.15));

  // Vacancy (0–1)
  // v2: delivery_failed rate is a strong vacancy signal (drone/postal confirmed inaccessible)
  // v1: zero-query heuristic + addr_class flag
  const neverQueried = (signalRow.query_count || 0) === 0 ? 0.3 : 0;
  const classVacancy = (addr.addr_class || '').toLowerCase().includes('vacant') ? 0.5 : 0;
  const failedDeliverySignal = deliveryOutcomes >= 3
    ? Math.min((outcomeStats.delivery_failed || 0) / deliveryOutcomes * 0.8, 0.8)
    : 0;
  const vacancy = Math.min(1, Math.max(0,
    failedDeliverySignal > 0 ? failedDeliverySignal : neverQueried + classVacancy
  ));

  // ── 4. Climate Risk composite ─────────────────────────────────────
  // Weighted: flood (most actionable) + wildfire + storm + earthquake + drought
  // Each dimension 0–1. Composite = weighted mean of available dimensions.
  const climateFlood    = disasterFlood;
  const climateWildfire = disasterWildfireFinal;
  const climateStorm    = disasterStorm / 0.3; // re-normalize from 0–0.3 cap to 0–1
  const climateEq       = earthquakeResult?.risk_score ?? null;
  const climateDrought  = droughtResult?.risk_score   ?? null;

  const climateInputs = [
    { score: climateFlood,    weight: 0.30 },
    { score: climateWildfire, weight: 0.25 },
    { score: climateStorm,    weight: 0.20 },
    ...(climateEq       != null ? [{ score: climateEq,      weight: 0.15 }] : []),
    ...(climateDrought  != null ? [{ score: climateDrought, weight: 0.10 }] : []),
  ];
  const totalWeight    = climateInputs.reduce((s, d) => s + d.weight, 0);
  const climateComposite = totalWeight > 0
    ? climateInputs.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight
    : null;

  // ── 5. Determine score version ────────────────────────────────────
  const hasOutcomes = outcomeStats.total_outcomes > 0;
  const scoreVersion = (deliveryOutcomes >= 3 || fraudOutcomes >= 2) ? 'v2' : 'v1';

  // ── 6. Build response ─────────────────────────────────────────────
  ok(res, {
    nad_uuid:  addr.nad_uuid,
    address:   enriched.full_address || `${addr.add_number || ''} ${addr.st_name || ''}`.trim(),
    scores: {
      deliverability: +deliverability.toFixed(3),
      fraud:          +fraud.toFixed(3),
      disaster:       +disaster.toFixed(3),
      vacancy:        +vacancy.toFixed(3),
    },
    climate_risk: {
      composite:  climateComposite !== null ? +climateComposite.toFixed(3) : null,
      flood:      +climateFlood.toFixed(3),
      wildfire:   +climateWildfire.toFixed(3),
      storm:      +Math.min(1, climateStorm).toFixed(3),
      earthquake: earthquakeResult ? {
        score:      earthquakeResult.risk_score,
        pgam:       earthquakeResult.pgam,
        sdc:        earthquakeResult.sdc,
        label:      earthquakeResult.risk_label,
      } : null,
      drought: droughtResult ? {
        score:         droughtResult.risk_score,
        current_level: droughtResult.current_level,
        weeks_sampled: droughtResult.weeks_sampled,
      } : null,
    },
    signals: {
      confidence:          enriched.confidence,
      placement:           addr.placement || null,
      query_count:         signalRow.query_count,
      fraud_signal_count:  signalRow.fraud_signal_count,
      flood_zone:          femaResult?.flood_zone      || null,
      flood_sfha:          femaResult?.sfha            ?? null,
      wildfire_class:      wildfireRow?.whp_class      || calFireRow?.fhsz_label || null,
      storm_events_10yr:   stormRow?.event_count       || null,
      cal_fire_fhsz:       calFireRow?.fhsz_label      || null,
      earthquake_pgam:     earthquakeResult?.pgam      ?? null,
      drought_level:       droughtResult?.current_level ?? null,
      ...(hasOutcomes && {
        outcomes: {
          total:            outcomeStats.total_outcomes,
          delivery_success: outcomeStats.delivery_success,
          delivery_failed:  outcomeStats.delivery_failed,
          fraud_confirmed:  outcomeStats.fraud_confirmed,
          chargeback:       outcomeStats.chargeback,
        },
      }),
    },
    data_coverage: {
      fema_flood:    femaResult       !== null,
      wildfire:      wildfireRow      !== null,
      storm:         stormRow         !== null,
      cal_fire:      calFireRow       !== null,
      earthquake:    earthquakeResult !== null,
      drought:       droughtResult    !== null,
      ground_truth:  (signalRow.query_count || 0) > 0,
      outcome_feedback: hasOutcomes,
    },
    score_version: scoreVersion,
    version: '2.1',
  });
});

// POST /v1/outcomes — Submit delivery / fraud / chargeback outcome for an address.
// Requires Professional+. Body: { nad_uuid, outcome_type, outcome_value?, metadata? }
// Outcome types: delivery_success | delivery_failed | fraud_confirmed | fraud_cleared | chargeback | claim_filed
app.post('/v1/outcomes', async (req, res) => {
  const _outKey = req.headers['x-api-key'] || req.query.key;
  if (!_outKey) return res.status(401).json({ ok: false, error: 'API key required.' });
  const _outInfo = await keys.validate(_outKey);
  if (!_outInfo) return res.status(401).json({ ok: false, error: 'Invalid or revoked API key.' });
  req.keyInfo = _outInfo;

  if (!req.keyInfo.limits?.enrichment) {
    return res.status(402).json({
      ok: false,
      error: 'outcomes_require_professional',
      message: 'Outcome feedback requires a Professional plan or higher.',
      upgrade_url: `${BASE_URL}/portal.html`,
    });
  }

  const { nad_uuid, outcome_type, outcome_value, metadata } = req.body || {};

  if (!nad_uuid)     return err(res, 'nad_uuid is required.');
  if (!outcome_type) return err(res, 'outcome_type is required.');
  if (!KeyStore.VALID_OUTCOME_TYPES.has(outcome_type)) {
    return err(res, `Invalid outcome_type. Valid values: ${[...KeyStore.VALID_OUTCOME_TYPES].join(', ')}`);
  }

  // Validate nad_uuid exists in our DB (rate-limit abuse prevention)
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'Database not ready.' });
  const exists = nad.db.prepare('SELECT 1 FROM addresses WHERE nad_uuid = ? LIMIT 1').get(nad_uuid);
  if (!exists) return err(res, 'nad_uuid not found in address database.', 404);

  // Per-key rate limit: max 10K outcome submissions per day
  const todayCount = await keys.getOutcomeDailyCount(req.keyInfo.key_id);
  if (todayCount >= 10000) {
    return res.status(429).json({ ok: false, error: 'outcome_rate_limit', message: 'Max 10,000 outcome submissions per day per key.' });
  }

  keys.recordOutcome(req.keyInfo.key_id, nad_uuid, outcome_type,
    outcome_value != null ? parseFloat(outcome_value) : null,
    metadata || null);

  res.status(201).json({ ok: true, data: { nad_uuid, outcome_type, recorded: true } });
});

// GET /v1/admin/outcomes — Outcome feedback summary (admin only)
app.get('/v1/admin/outcomes', adminAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50'), 200);
  ok(res, await keys.getOutcomeSummary(limit));
});

app.get('/v1/admin/keys', adminAuth, async (req, res) => {
  const data = await keys.list({ includeRevoked: req.query.include_revoked === 'true' });
  ok(res, data, { count: data.length });
});
app.post('/v1/admin/keys', adminAuth, async (req, res) => {
  const { email, name, tier, notes } = req.body || {};
  if (!email) return err(res, 'email required.');
  const result = await keys.generate({ email, name, tier: tier || 'free', notes });
  res.status(201).json({ ok: true, data: result });
});
app.delete('/v1/admin/keys/:id', adminAuth, async (req, res) => {
  const revoked = await keys.revoke(req.params.id);
  if (!revoked) return err(res, 'Key not found.', 404);
  ok(res, { revoked: true, id: parseInt(req.params.id, 10) });
});
// ── Metered flush core (used by endpoint + daily cron) ───────────
async function runMeteredFlush() {
  if (!stripe || !STRIPE_METER_ID) return { skipped: true, reason: 'Stripe or meter not configured' };
  const rows    = await keys.getMeteredKeysWithUsage();
  const results = [];
  for (const row of rows) {
    if (!row.stripe_customer_id) {
      results.push({ email: row.email, skipped: true, reason: 'no stripe_customer_id' });
      continue;
    }
    try {
      await stripe.billing.meterEvents.create({
        event_name: 'geoclear_lookup',
        payload:    { value: String(row.metered_unreported), stripe_customer_id: row.stripe_customer_id },
      });
      keys.markMeteredFlushed(row.id, row.metered_unreported);
      results.push({ email: row.email, reported: row.metered_unreported });
    } catch (e) {
      results.push({ email: row.email, error: e.message });
    }
  }
  console.log(`[metered-flush] ${new Date().toISOString()} — ${results.length} records`);
  return { flushed: results.length, results };
}

// ── Welcome email drip (Day 1 sent at signup; Day 3 + Day 7 via daily cron) ──

function dripDay3Email(callCount) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0d1117;color:#e6edf3;border-radius:8px;">
      <h2 style="color:#2ea043;margin:0 0 8px">You've made ${callCount.toLocaleString()} address ${callCount === 1 ? 'lookup' : 'lookups'} 🎉</h2>
      <p style="color:#8b949e;margin:0 0 20px">Here's what full enrichment looks like — one call returns flood zone, census tract, timezone, and RDI together:</p>
      <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:16px;font-family:monospace;font-size:13px;color:#c9d1d9;overflow-x:auto;">
        curl "https://geoclear.io/api/enrich?nad_uuid=&lt;uuid&gt;" \\<br>
        &nbsp;&nbsp;-H "X-Api-Key: YOUR_KEY"
      </div>
      <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:16px;font-family:monospace;font-size:13px;color:#c9d1d9;margin-top:12px;">
        {<br>
        &nbsp;&nbsp;"flood_zone": "AE",&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#8b949e">// FEMA high-risk zone</span><br>
        &nbsp;&nbsp;"flood_sfha": true,<br>
        &nbsp;&nbsp;"census_tract": "007402",&nbsp;<span style="color:#8b949e">// HMDA required</span><br>
        &nbsp;&nbsp;"timezone": "America/New_York"<br>
        }
      </div>
      <p style="color:#8b949e;margin:20px 0 8px;font-size:13px;">Enrichment is included on Professional ($249/mo) — <a href="https://geoclear.io/portal.html" style="color:#388bfd;">upgrade here</a> if you need it on every call.</p>
      <hr style="border:none;border-top:1px solid #30363d;margin:20px 0"/>
      <p style="color:#8b949e;font-size:12px;">Questions? Just reply to this email.</p>
    </div>`;
}

function dripDay7Email(tier) {
  const onFree = tier === 'free';
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0d1117;color:#e6edf3;border-radius:8px;">
      <h2 style="color:#2ea043;margin:0 0 8px">One week with GeoClear</h2>
      <p style="color:#8b949e;margin:0 0 16px">${onFree
        ? 'You\'re on the free tier (10K lookups/mo). Teams that need FEMA flood zone + census tract for compliance, insurance, or logistics are on Professional.'
        : 'Thanks for being a GeoClear customer. A few things you might not know about:'
      }</p>
      <ul style="color:#8b949e;font-size:14px;line-height:1.8;padding-left:20px;margin:0 0 20px;">
        <li><strong style="color:#e6edf3">FEMA flood zone</strong> — same NFHL source used for NFIP flood determination</li>
        <li><strong style="color:#e6edf3">Census tract</strong> — required for HMDA and CRA compliance reporting</li>
        <li><strong style="color:#e6edf3">Bulk verify</strong> — up to 1,000 addresses in a single POST /api/address/bulk</li>
        <li><strong style="color:#e6edf3">Proximity search</strong> — GET /api/near?lat=&amp;lon=&amp;radius_km=</li>
      </ul>
      ${onFree ? `<a href="https://geoclear.io/portal.html" style="display:inline-block;padding:12px 24px;background:#2ea043;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Upgrade to Professional — $249/mo →</a>` : ''}
      <hr style="border:none;border-top:1px solid #30363d;margin:24px 0"/>
      <p style="color:#8b949e;font-size:12px;">Questions? Just reply to this email. We read everything.</p>
    </div>`;
}

async function runDrip() {
  const d3 = await keys.getDripDay3Candidates();
  for (const row of d3) {
    await sendEmail(row.email, `You've made ${row.requests_total.toLocaleString()} address lookups — here's what enrichment looks like`, dripDay3Email(row.requests_total)).catch(() => {});
    keys.markDripSent(row.id, 'd3');
  }
  const d7 = await keys.getDripDay7Candidates();
  for (const row of d7) {
    await sendEmail(row.email, 'One week with GeoClear — features you might have missed', dripDay7Email(row.tier)).catch(() => {});
    keys.markDripSent(row.id, 'd7');
  }
  console.log(`[drip] Day3: ${d3.length} sent, Day7: ${d7.length} sent`);
  return { day3: d3.length, day7: d7.length };
}

// Manual trigger for drip (admin)
app.post('/v1/admin/drip/run', adminAuth, async (req, res) => {
  ok(res, await runDrip());
});

// Flush metered usage to Stripe (called by daily cron or manually)
app.post('/v1/admin/metered/flush', adminAuth, async (req, res) => {
  if (!stripe || !STRIPE_METER_ID) return err(res, 'Stripe or meter not configured.', 503);
  ok(res, await runMeteredFlush());
});

// ── Staging → Prod merge ──────────────────────────────────────────
// POST /v1/admin/merge  body: { source: 'nad_source value', dbPath: '/data/overture-additions.db' }
// Merges all addresses from an attached DB into this instance's nad.db.
// Admin-only. Use from Render shell or staging service to promote new data.
app.post('/v1/admin/merge', adminAuth, (req, res) => {
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'DB not ready.' });
  const { dbPath, source } = req.body || {};
  if (!dbPath) return err(res, 'dbPath required (path to SQLite file on this disk).');
  const fs = require('fs');
  if (!fs.existsSync(dbPath)) return err(res, `File not found: ${dbPath}`);
  try {
    const srcDb = require('better-sqlite3')(dbPath, { readonly: true });
    const where = source ? `WHERE nad_source = '${source.replace(/'/g,"''")}'` : '';
    const rows  = srcDb.prepare(`SELECT COUNT(*) as n FROM addresses ${where}`).get();
    const total = rows.n;
    srcDb.close();

    // Run merge in background — can take minutes for large files
    res.json({ ok: true, message: `Merge started: ${total.toLocaleString()} source rows. Check /api/stats in ~5min.` });

    setImmediate(() => {
      try {
        const src = require('better-sqlite3')(dbPath, { readonly: true });
        const DATA_DIR_M = process.env.DATA_DIR || path.join(__dirname, 'data');
        const mergeDb = require('better-sqlite3')(path.join(DATA_DIR_M, 'nad.db'));
        mergeDb.pragma('journal_mode = WAL');
        mergeDb.pragma('synchronous = NORMAL');
        const stmt = mergeDb.prepare(`INSERT OR IGNORE INTO addresses
          (nad_uuid,add_number,st_name,unit,post_city,inc_muni,state,zip_code,
           latitude,longitude,addr_type,placement,nad_source,full_address,date_update,date_imported)
          SELECT nad_uuid,add_number,st_name,unit,post_city,inc_muni,state,zip_code,
           latitude,longitude,addr_type,placement,nad_source,full_address,date_update,date_imported
          FROM addresses ${where} LIMIT 10000 OFFSET ?`);
        const BATCH = 10000;
        let offset = 0, inserted = 0;
        const go = mergeDb.transaction((off) => { const r = stmt.run(off); return r.changes; });
        while (true) {
          const changes = go(offset);
          inserted += changes;
          offset += BATCH;
          if (changes === 0) break;
        }
        src.close();
        mergeDb.pragma('synchronous = FULL');
        mergeDb.close();
        cache.delete('stats');
        console.log(`[merge] Done: ${inserted.toLocaleString()} new rows from ${dbPath}`);
      } catch (e) {
        console.error('[merge] Failed:', e.message);
      }
    });
  } catch (e) {
    err(res, `Merge failed: ${e.message}`);
  }
});

// POST /v1/admin/import-tsv-gz
// Accepts a gzip-compressed TSV stream; decompresses and bulk-inserts into nad.db.
// Columns (tab-separated, no header):
//   nad_uuid, add_number, st_name, unit, post_city, inc_muni, state, zip_code,
//   latitude, longitude, addr_type, placement, nad_source, full_address, date_update, date_imported
// Admin-only. Run in background — check /api/stats for row count after completion.
app.post('/v1/admin/import-tsv-gz', (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'DB not ready.' });

  const zlib      = require('zlib');
  const readline  = require('readline');
  const gunzip    = zlib.createGunzip();
  const rl        = readline.createInterface({ input: gunzip, crlfDelay: Infinity });

  const COLS = ['nad_uuid','add_number','st_name','unit','post_city','inc_muni','state',
    'zip_code','latitude','longitude','addr_type','placement','nad_source',
    'full_address','date_update','date_imported'];

  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
  const writeDb  = require('better-sqlite3')(path.join(DATA_DIR, 'nad.db'));
  writeDb.pragma('journal_mode = WAL');
  writeDb.pragma('synchronous = NORMAL');
  const stmt = writeDb.prepare(`INSERT OR IGNORE INTO addresses
    (nad_uuid,add_number,st_name,unit,post_city,inc_muni,state,zip_code,
     latitude,longitude,addr_type,placement,nad_source,full_address,date_update,date_imported)
    VALUES (${COLS.map(() => '?').join(',')})`);
  const insertBatch = writeDb.transaction(rows => {
    let n = 0;
    for (const r of rows) { stmt.run(...r); n++; }
    return n;
  });

  let inserted = 0, lineCount = 0, batch = [];
  const BATCH = 10000;
  const CACHE_PATH = path.join(DATA_DIR, 'overture.tsv.gz');
  const fs = require('fs');

  nad.db.pragma('synchronous = NORMAL');

  res.json({ ok: true, message: 'Import started in background. Check /api/stats for progress.' });

  // Tee the stream: save to disk AND pipe to gunzip simultaneously.
  // If import is interrupted, POST /v1/admin/import-tsv-gz-cached re-runs from saved file.
  const tee = fs.createWriteStream(CACHE_PATH);
  req.pipe(tee);
  req.pipe(gunzip);

  rl.on('line', line => {
    if (!line.trim()) return;
    const parts = line.split('\t');
    if (parts.length < COLS.length) return;
    batch.push(parts.slice(0, COLS.length).map(v => v === '' ? null : v));
    lineCount++;
    if (batch.length >= BATCH) {
      inserted += insertBatch(batch);
      batch = [];
      if (lineCount % 1000000 === 0)
        console.log(`[import-tsv-gz] ${(lineCount/1e6).toFixed(1)}M lines, ${inserted.toLocaleString()} inserted`);
    }
  });
  rl.on('close', () => {
    if (batch.length) inserted += insertBatch(batch);
    writeDb.close();
    cache.delete('stats');
    console.log(`[import-tsv-gz] Done: ${lineCount.toLocaleString()} lines, ${inserted.toLocaleString()} new rows inserted`);
  });
  gunzip.on('error', e => console.error('[import-tsv-gz] gunzip error:', e.message));
});

// POST /v1/admin/import-tsv-gz-cached — re-run import from saved /data/overture.tsv.gz
// Use this if the server restarted mid-import and the file is already on disk.
// Runs the import in a worker_threads thread so the main event loop is never blocked.
app.post('/v1/admin/import-tsv-gz-cached', adminAuth, (req, res) => {
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'DB not ready.' });
  const fs       = require('fs');
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
  const CACHE_PATH = path.join(DATA_DIR, 'overture.tsv.gz');
  if (!fs.existsSync(CACHE_PATH)) return err(res, `No cached file at ${CACHE_PATH}. Upload first.`);

  const { Worker } = require('worker_threads');
  const dbPath   = path.join(DATA_DIR, 'nad.db');
  const fileSize = fs.statSync(CACHE_PATH).size;
  console.log(`[import-cached] Spawning worker: ${CACHE_PATH} (${(fileSize/1e9).toFixed(3)}GB)`);
  res.json({ ok: true, message: `Import started in worker thread from ${CACHE_PATH}. Check /api/stats.` });

  const CHECKPOINT_PATH = path.join(DATA_DIR, 'import-checkpoint.txt');
  const worker = new Worker(path.join(__dirname, 'import-worker.js'), {
    workerData: { dbPath, cachePath: CACHE_PATH, checkpointPath: CHECKPOINT_PATH },
  });
  worker.on('message', msg => {
    if (msg.type === 'progress') {
      if (msg.message) console.log(`[import-cached] ${msg.message}`);
      else console.log(`[import-cached] line ${(msg.totalLines/1e6).toFixed(1)}M — ${(msg.lineCount/1e6).toFixed(1)}M processed, ${msg.inserted.toLocaleString()} inserted, ${msg.skipped} skipped`);
    }
    if (msg.type === 'done') {
      cache.delete('stats');
      console.log(`[import-cached] Done: ${msg.totalLines.toLocaleString()} raw lines, ${msg.lineCount.toLocaleString()} processed, ${msg.inserted.toLocaleString()} new rows, ${msg.skipped} skipped`);
    }
    if (msg.type === 'error')
      console.error('[import-cached] Worker error:', msg.message);
  });
  worker.on('error', e => console.error('[import-cached] Worker fatal:', e.message));
  worker.on('exit', code => { if (code !== 0) console.error(`[import-cached] Worker exited with code ${code}`); });
});

// GET /v1/admin/db-probe — query prod DB schema and test a direct INSERT
// Returns addresses table schema, all indexes, and before/after count for a test row.
app.get('/v1/admin/db-probe', adminAuth, (req, res) => {
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
  let writeDb3;
  try {
    writeDb3 = require('better-sqlite3')(path.join(DATA_DIR, 'nad.db'));
    writeDb3.pragma('journal_mode = WAL');
    const tblSql    = writeDb3.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='addresses'").get();
    const indexes   = writeDb3.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='addresses'").all();
    const before    = writeDb3.prepare('SELECT COUNT(*) as n FROM addresses').get().n;
    let insertErr   = null, changes = 0;
    try {
      const r = writeDb3.prepare(`INSERT OR IGNORE INTO addresses
        (nad_uuid,add_number,st_name,unit,post_city,inc_muni,state,zip_code,
         latitude,longitude,addr_type,placement,nad_source,full_address,date_update,date_imported)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run('probe-uuid-zzzz-0000','0','Probe St','','ProbeCity','ProbeCity','TX','99998',
             29.1,-95.1,'Point','Parcel','PROBE','0 Probe St ProbeCity TX 99998','2026-01-01','2026-01-01');
      changes = r.changes;
      // Roll back the test row if inserted
      if (changes > 0) writeDb3.prepare("DELETE FROM addresses WHERE nad_uuid='probe-uuid-zzzz-0000'").run();
    } catch (e) { insertErr = e.message; }
    const after = writeDb3.prepare('SELECT COUNT(*) as n FROM addresses').get().n;
    writeDb3.close();
    res.json({ ok: true, schema: tblSql?.sql, indexes, before, after, changes, insertErr });
  } catch (e) {
    if (writeDb3) try { writeDb3.close(); } catch {}
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /v1/admin/relink-fks
// Populates state_id, zip_code_id, county_id, city_id for addresses with NULL FK columns.
// Targets ~64.9M Overture rows merged without hierarchy linkage.
// Runs in a worker thread — returns immediately. Progress logged to console.
// Check /api/states after completion to confirm counts update.
app.post('/v1/admin/relink-fks', adminAuth, (req, res) => {
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'DB not ready.' });
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
  const dbPath   = path.join(DATA_DIR, 'nad.db');
  const { Worker } = require('worker_threads');

  console.log('[relink-fks] Starting relink worker');
  res.json({ ok: true, message: 'FK relink started in background. Monitor console logs for progress. /api/states will update when complete.' });

  const worker = new Worker(path.join(__dirname, 'relink-worker.js'), { workerData: { dbPath } });
  worker.on('message', msg => {
    if (msg.message) console.log(`[relink-fks] ${msg.message}`);
    if (msg.type === 'done') {
      cache.clear();  // bust all caches so /api/states reflects new counts
      console.log('[relink-fks] Complete. Cache cleared.', JSON.stringify(msg.results));
    }
    if (msg.type === 'error') console.error('[relink-fks] Error:', msg.message);
  });
  worker.on('error', e => console.error('[relink-fks] Worker fatal:', e.message));
  worker.on('exit', code => { if (code !== 0) console.error(`[relink-fks] Worker exit code ${code}`); });
});

// POST /v1/admin/refresh-counts
// Recalculates address_count / county_count / city_count / zip_count on hierarchy tables.
// Run after any bulk import or FK relink. Heavy — takes ~5-10min on 120M rows.
app.post('/v1/admin/refresh-counts', adminAuth, (req, res) => {
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'DB not ready.' });
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
  const dbPath   = path.join(DATA_DIR, 'nad.db');
  const { Worker } = require('worker_threads');

  console.log('[refresh-counts] Starting refresh worker');
  res.json({ ok: true, message: 'Count refresh started in background. Monitor console logs. /api/states will update when complete.' });

  const worker = new Worker(path.join(__dirname, 'refresh-counts-worker.js'), { workerData: { dbPath } });
  worker.on('message', msg => {
    if (msg.msg)   console.log(`[refresh-counts] ${msg.msg}`);
    if (msg.done)  { cache.clear(); console.log('[refresh-counts] Complete. Cache cleared.'); }
    if (msg.error) console.error('[refresh-counts] Error:', msg.error);
  });
  worker.on('error', e => console.error('[refresh-counts] Worker fatal:', e.message));
  worker.on('exit', code => { if (code !== 0) console.error(`[refresh-counts] Worker exit ${code}`); });
});

// DELETE /v1/admin/data-file  body: { filename }
// Deletes a file from /data/<filename>. Use to clean up partial uploads.
app.delete('/v1/admin/data-file', adminAuth, (req, res) => {
  const { filename } = req.body || {};
  if (!filename || filename.includes('/') || filename.includes('..'))
    return err(res, 'Invalid filename');
  const fs   = require('fs');
  const dest = path.join(process.env.DATA_DIR || path.join(__dirname, 'data'), filename);
  if (!fs.existsSync(dest)) return err(res, `File not found: ${dest}`, 404);
  fs.unlinkSync(dest);
  console.log(`[data-file] Deleted ${dest}`);
  res.json({ ok: true, deleted: dest });
});

// GET /v1/admin/analytics — 30-day KPI pulse
app.get('/v1/admin/analytics', adminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days ?? '30', 10);
    const data = await keys.getAnalytics(days);
    res.json({ ok: true, period_days: days, ...data });
  } catch (e) {
    err(res, e.message);
  }
});

// Open demo endpoint — no API key, IP rate-limited (10 req/hr)
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `demo:${req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ ok: false, error: 'Demo limit reached (10/hr). Sign up free at geoclear.io' }),
});
// Risk Score demo — no API key, same IP rate limit as /api/demo
app.get('/api/demo/risk', demoLimiter, async (req, res) => {
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'Database not ready.' });
  if (!riskData.isReady()) return res.status(503).json({ ok: false, error: 'risk_data_unavailable' });
  const { street, number, city, state, zip } = req.query;
  if (!street && !zip) return err(res, 'Provide street or zip.');
  // Parse "123 Main St" into addNumber=123 + streetName="Main St" if caller didn't split them.
  // Without addNumber, findAddress falls back to LIKE '%street%' — full table scan on 120M rows.
  let addNum = number, stName = street;
  if (!number && street) {
    const m = street.match(/^(\d+[A-Za-z]?)\s+(.+)/);
    if (m) { addNum = m[1]; stName = m[2]; }
  }
  // Strip direction suffixes (NW, NE, SW, SE, North, South…) and street types (St, Ave, Blvd…)
  // so "10th Street NW" matches st_name "10TH" in NAD.
  if (stName) {
    stName = stName
      .replace(/\s+(northwest|northeast|southwest|southeast|nw|ne|sw|se|north|south|east|west)\.?\s*$/i, '')
      .replace(/\s+(street|avenue|boulevard|drive|road|lane|court|place|way|circle|terrace|parkway|highway|st|ave|blvd|dr|rd|ln|ct|pl|cir|ter|pkwy|hwy)\.?\s*$/i, '')
      .trim();
  }
  const rows = nad.findAddress({ addNumber: addNum, streetName: stName, city, stateCode: state, zipCode: zip, limit: 1 });
  if (!rows.length) return err(res, 'No addresses found.', 404);
  const addr     = rows[0];
  const enriched = enrich(addr);
  const addrLat  = parseFloat(addr.latitude  || 0);
  const addrLon  = parseFloat(addr.longitude || 0);
  const fips5    = enriched.fips || null;

  const hardNull = (ms) => new Promise(r => setTimeout(() => r(null), ms));
  const femaPromise = (addrLat && addrLon)
    ? Promise.race([getFEMAFloodZone(addrLat, addrLon).catch(() => null), hardNull(4000)])
    : Promise.resolve(null);
  const [femaResult, wildfireRow, stormRow, eqRow, droughtRow, nriRow] = await Promise.race([
    Promise.all([
      femaPromise,
      fips5 ? riskData.getWildfireRisk(fips5)   : Promise.resolve(null),
      fips5 ? riskData.getStormRisk(fips5)      : Promise.resolve(null),
      fips5 ? riskData.getEarthquakeRisk(fips5) : Promise.resolve(null),
      fips5 ? riskData.getDroughtRisk(fips5)    : Promise.resolve(null),
      fips5 ? riskData.getNRIRisk(fips5)        : Promise.resolve(null),
    ]),
    hardNull(5500).then(() => [null, null, null, null, null, null]),
  ]);
  const calFireRow = (addr.state === 'CA' && addrLat && addrLon) ? await riskData.getCalFireFHSZ(addrLat, addrLon) : null;

  // Deliverability
  const confNorm  = (enriched.confidence || 50) / 100;
  const pBoost    = { 'Structure - Rooftop': 0.15, Rooftop: 0.15, Parcel: 0.05 }[addr.placement] ?? 0;
  const deliverability = Math.min(1, Math.max(0, confNorm * 0.75 + pBoost));

  // Disaster
  let disasterFlood = 0;
  if (femaResult) {
    if (femaResult.sfha === true)                                                                            disasterFlood = 0.8;
    else if (femaResult.flood_zone && femaResult.flood_zone !== 'X' && femaResult.flood_zone !== 'OUTSIDE') disasterFlood = 0.4;
    else if (femaResult.flood_zone === 'X')                                                                  disasterFlood = 0.05;
  }
  const WHP_SCORE = { 1: 0.0, 2: 0.05, 3: 0.15, 4: 0.30, 5: 0.40 };
  const CAL_FIRE_SCORE = { Moderate: 0.15, High: 0.30, 'Very High': 0.45 };
  const disasterWildfire = Math.max(
    calFireRow ? (CAL_FIRE_SCORE[calFireRow.fhsz_label] ?? 0) : 0,
    wildfireRow ? (WHP_SCORE[Math.round(wildfireRow.whp_score)] ?? 0) : 0
  );
  const disasterStorm = stormRow ? Math.min((stormRow.event_count || 0) / 200, 0.3) : 0;
  const disaster = Math.min(1, Math.max(0, disasterFlood * 0.6 + disasterWildfire * 0.25 + disasterStorm * 0.15));

  // Climate Risk composite — Phase 2 adds NRI heat wave + hurricane + coastal flood
  const climateEq        = eqRow?.risk_score ?? null;
  const climateDrought   = droughtRow?.risk_score ?? null;
  const climateHeat      = nriRow?.heat_wave_score ?? null;
  const climateHurricane = nriRow?.hurricane_score ?? null;
  const climateCoastal   = nriRow?.coastal_flood_score ?? null;

  // If NRI riverine flood is available, blend with FEMA zone for a stronger flood signal
  const nriFlood       = nriRow?.riverine_flood_score ?? null;
  const blendedFlood   = (nriFlood != null)
    ? +( disasterFlood * 0.6 + nriFlood * 0.4 ).toFixed(3)
    : disasterFlood;

  const climateInputs = [
    { score: blendedFlood,    weight: 0.25 },
    { score: disasterWildfire, weight: 0.20 },
    { score: disasterStorm / 0.3, weight: 0.15 },
    ...(climateEq        != null ? [{ score: climateEq,        weight: 0.12 }] : []),
    ...(climateDrought   != null ? [{ score: climateDrought,   weight: 0.08 }] : []),
    ...(climateHeat      != null ? [{ score: climateHeat,      weight: 0.10 }] : []),
    ...(climateHurricane != null ? [{ score: climateHurricane, weight: 0.06 }] : []),
    ...(climateCoastal   != null ? [{ score: climateCoastal,   weight: 0.04 }] : []),
  ];
  const totalW = climateInputs.reduce((s, d) => s + d.weight, 0);
  const climateComposite = totalW > 0
    ? +( climateInputs.reduce((s, d) => s + d.score * d.weight, 0) / totalW ).toFixed(2)
    : null;

  ok(res, {
    address:       enrichAddress(addr),
    scores: {
      deliverability: Math.round(deliverability * 100) / 100,
      fraud:          null,
      disaster:       Math.round(disaster * 100) / 100,
      vacancy:        null,
    },
    climate_risk: {
      composite:      climateComposite,
      flood:          +blendedFlood.toFixed(2),
      wildfire:       +disasterWildfire.toFixed(2),
      storm:          +Math.min(1, disasterStorm / 0.3).toFixed(2),
      earthquake:     eqRow     ? { score: eqRow.risk_score, sdc: eqRow.sdc, label: eqRow.risk_label } : null,
      drought:        droughtRow? { score: droughtRow.risk_score, level: droughtRow.current_level }     : null,
      heat_wave:      nriRow    ? nriRow.heat_wave_score     : null,
      hurricane:      nriRow    ? nriRow.hurricane_score     : null,
      coastal_flood:  nriRow    ? nriRow.coastal_flood_score : null,
      nri_composite:  nriRow    ? nriRow.risk_score          : null,
      nri_rating:     nriRow    ? nriRow.risk_rating         : null,
    },
    signals: {
      flood_zone:        femaResult?.flood_zone ?? null,
      flood_sfha:        femaResult?.sfha ?? null,
      wildfire_class:    wildfireRow?.whp_class ?? null,
      storm_events_10yr: stormRow?.event_count ?? null,
      earthquake_sdc:    eqRow?.sdc ?? null,
      drought_level:     droughtRow?.current_level ?? null,
      nri_rating:        nriRow?.risk_rating ?? null,
    },
    note: 'fraud + vacancy require Professional plan (full traffic history)',
    version: '2.2-demo',
    demo: true,
  });
});

// Compliance / enrichment demo — flood zone + census tract, no API key required
app.get('/api/demo/enrich', demoLimiter, async (req, res) => {
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'Database not ready.' });
  const { street, number, city, state, zip } = req.query;
  if (!street && !zip) return err(res, 'Provide street or zip.');
  let addNum = number, stName = street;
  if (!number && street) {
    const m = street.match(/^(\d+[A-Za-z]?)\s+(.+)/);
    if (m) { addNum = m[1]; stName = m[2]; }
  }
  // Strip direction suffixes and street types so "10th Street NW" matches st_name "10TH"
  if (stName) {
    stName = stName
      .replace(/\s+(northwest|northeast|southwest|southeast|nw|ne|sw|se|north|south|east|west)\.?\s*$/i, '')
      .replace(/\s+(street|avenue|boulevard|drive|road|lane|court|place|way|circle|terrace|parkway|highway|st|ave|blvd|dr|rd|ln|ct|pl|cir|ter|pkwy|hwy)\.?\s*$/i, '')
      .trim();
  }
  const rows = nad.findAddress({ addNumber: addNum, streetName: stName, city, stateCode: state, zipCode: zip, limit: 1 });
  if (!rows.length) return err(res, 'No addresses found.', 404);
  const addr    = rows[0];
  const enriched = enrich(addr);
  const lat = parseFloat(addr.latitude  || 0);
  const lon = parseFloat(addr.longitude || 0);
  if (!lat || !lon) return err(res, 'Address has no coordinates — cannot enrich.', 422);
  try {
    const hardNull = (ms) => new Promise(r => setTimeout(() => r(null), ms));
    const data = await Promise.race([
      enrichPoint(lat, lon).catch(() => null),
      hardNull(5000),
    ]);
    if (!data) return err(res, 'Enrichment timed out — try again.', 504);
    ok(res, {
      address: enrichAddress(addr),
      flood_zone:       data.flood_zone       ?? null,
      flood_sfha:       data.flood_sfha       ?? null,
      flood_community:  data.flood_community  ?? null,
      census_tract:     data.census_tract     ?? null,
      census_block_grp: data.census_block_grp ?? null,
      census_geoid:     data.census_geoid     ?? null,
      fips:             enriched.fips         ?? null,
      confidence:       enriched.confidence   ?? null,
      demo: true,
    });
  } catch(e) {
    err(res, `Enrichment failed: ${e.message}`, 502);
  }
});

app.get('/api/demo', demoLimiter, (req, res) => {
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'Database not ready.' });
  const { street, number, city, state, zip } = req.query;
  if (!street && !zip && !number) return err(res, 'Provide at least street or zip.');
  const raw = nad.findAddress({ addNumber: number, streetName: street, city, stateCode: state, zipCode: zip, limit: 3 });
  if (!raw.length) return err(res, 'No addresses found.', 404);
  ok(res, raw.map(enrichAddress), { count: raw.length, demo: true });
});

app.get('/v1/me', async (req, res) => {
  const rawKey = req.headers['x-api-key'] || req.query.key;
  const info   = await keys.validate(rawKey);
  if (!info) return err(res, 'Invalid or missing API key.', 401);
  const days = Math.min(parseInt(req.query.history_days || '30', 10), 90);
  const usage_history = await keys.getUsageHistory(info.key_id, days);
  ok(res, {
    tier:           info.tier,
    email:          info.email,
    limits:         info.limits,
    requests_today: info.requests_today,
    requests_total: info.requests_total,
    created_at:     info.created_at,
    usage_history,
  });
});

// ── Free Tier Signup ──────────────────────────────────────────────
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ ok: false, error: 'Too many signup attempts. Try again in an hour.' }),
});

app.post('/v1/signup', signupLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err(res, 'Valid email required.');
  }
  const existing = await keys.findByEmail(email.toLowerCase());
  if (existing) {
    return err(res, 'An API key already exists for this email. Use /v1/me to check your key status.', 409);
  }
  const result = await keys.generate({ email: email.toLowerCase(), tier: 'free' });
  sendEmail(email, 'Your GeoClear API key', keyEmail(result.key, result.tier, result.limits)).catch(() => {});
  res.status(201).json({
    ok: true,
    data: {
      api_key:  result.key,
      tier:     result.tier,
      email:    result.email,
      limits:   result.limits,
    },
  });
});

// ── Stripe Checkout ────────────────────────────────────────────────
// Create a Stripe Checkout Session (public endpoint — no API key required)
app.post('/v1/checkout', async (req, res) => {
  if (!stripe) return err(res, 'Stripe not configured. Set STRIPE_SECRET_KEY env var.', 503);
  const { email, tier } = req.body || {};
  if (!email || !tier) return err(res, 'email and tier required.');
  if (!['growth', 'pro', 'scale', 'metered', 'starter'].includes(tier)) return err(res, 'tier must be "growth", "pro", "scale", or "metered".');
  const priceId = STRIPE_PRICES[tier];
  if (!priceId) return err(res, `Stripe price not configured for ${tier}. Set STRIPE_PRICE_${tier.toUpperCase()} env var.`, 503);
  try {
    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      customer_email:       email,
      line_items:           [tier === 'metered' ? { price: priceId } : { price: priceId, quantity: 1 }],
      metadata:             { tier, email },
      success_url: `${BASE_URL}/portal.html?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE_URL}/portal.html?cancelled=1`,
    });
    await keys.storeStripeSession(session.id, tier, email);
    ok(res, { session_id: session.id, url: session.url });
  } catch (e) {
    err(res, `Stripe error: ${e.message}`, 500);
  }
});

// One-time bulk credits checkout (no subscription, no API key issued)
app.post('/v1/checkout/bulk', async (req, res) => {
  if (!stripe) return err(res, 'Stripe not configured.', 503);
  const { email, pack } = req.body || {};
  if (!email || !pack) return err(res, 'email and pack required.');
  const priceId = STRIPE_PRICES_BULK[`bulk_${pack}`];
  if (!priceId) return err(res, 'pack must be "1m" or "5m".', 400);
  try {
    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      customer_email:       email,
      line_items:           [{ price: priceId, quantity: 1 }],
      metadata:             { bulk_pack: pack, email },
      success_url: `${BASE_URL}/bulk?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE_URL}/bulk?cancelled=1`,
    });
    ok(res, { session_id: session.id, url: session.url });
  } catch (e) {
    err(res, `Stripe error: ${e.message}`, 500);
  }
});

// Poll for key after payment completes (called by success page JS)
app.get('/v1/checkout/session/:sessionId', async (req, res) => {
  const info = await keys.getStripeSession(req.params.sessionId);
  if (!info) return err(res, 'Session not found.', 404);
  if (!info.api_key) return ok(res, { status: 'pending' });
  ok(res, { status: 'complete', api_key: info.api_key, tier: info.tier, email: info.email });
});

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: `Unknown API endpoint: ${req.method} ${req.path}` });
});

// Serve landing page for root; explorer for /explorer; legal pages
app.get('/explorer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});
app.get('/compliance', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'compliance.html'));
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});
app.get('/bulk', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bulk.html'));
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Global error handler
app.use((err, req, res, next) => {  // eslint-disable-line no-unused-vars
  if (err.code === 'DB_NOT_READY') return res.status(503).json({ ok: false, error: err.message, code: 'DB_NOT_READY' });
  console.error('[error]', err.message);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────
// Wait for nad.db to open before binding the port.
// Render keeps the old instance alive until the new one passes its health check —
// so customers never hit DB_NOT_READY during a deploy.
// better-sqlite3 opens synchronously; if it fails, isReady() is false immediately.
// We poll briefly (100ms × 600 = 60s max) so warm restarts on the same machine
// bind in <5s while cold starts get the full window.
function startServer() {
  let waited = 0;
  function tryListen() {
    if (!nad.isReady() && waited < 60000) {
      waited += 100;
      return setTimeout(tryListen, 100);
    }
    if (!nad.isReady()) {
      console.warn('[startup] nad.db did not open within 60s — starting anyway (DB_NOT_READY responses expected)');
    }
    app.listen(PORT, onListening);
  }
  tryListen();
}

async function onListening() {
  const dbReady  = nad.isReady();
  let dbStatus   = '⚠ nad.db not loaded (rsync to /data to activate)';
  if (dbReady) {
    // Don't run COUNT(*) at startup — it blocks the event loop for minutes on cold cache.
    // The first /api/health or /api/stats call will warm the 1-hr cache instead.
    dbStatus = `✓ ready`;
  }
  console.log(`[startup] nad.db  : ${dbStatus}`);
  console.log(`[startup] risk.db : ✓ Neon PostgreSQL`);
  const keyStats = await keys.stats();
  console.log(`\n  GeoClear Address Intelligence API`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  URL       : ${BASE_URL}`);
  console.log(`  Port      : ${PORT}`);
  console.log(`  nad.db    : ${dbStatus}`);
  console.log(`  risk.db   : ✓ Neon PostgreSQL`);
  console.log(`  API Keys  : ${keyStats.active} active`);
  console.log(`    GET  /api/address?street=Main&state=TX`);
  console.log(`    GET  /api/health\n`);

  // Daily metered flush cron (self-scheduling, midnight UTC)
  if (stripe && STRIPE_METER_ID) {
    (function scheduleDailyFlush() {
      const msUntilMidnight = new Date(new Date().setUTCHours(24, 0, 0, 0)) - Date.now();
      setTimeout(async () => {
        await runMeteredFlush().catch(e => console.error('[metered-flush] cron error:', e.message));
        scheduleDailyFlush();
      }, msUntilMidnight);
      console.log(`  Metered flush : daily cron scheduled (next in ~${Math.round(msUntilMidnight / 3600000)}h at midnight UTC)`);
    })();
  }

  // Daily welcome email drip cron (self-scheduling, runs 1h after midnight UTC)
  (function scheduleDrip() {
    const now = Date.now();
    const next = new Date(new Date().setUTCHours(25, 0, 0, 0)); // 01:00 UTC next day
    const msUntilNext = next - now;
    setTimeout(async () => {
      await runDrip().catch(e => console.error('[drip] cron error:', e.message));
      scheduleDrip();
    }, msUntilNext);
  })();
}

startServer();
