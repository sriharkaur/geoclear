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
const { enrichPoint } = require('./geocode.js');
const { KeyStore }    = require('./keys.js');

// ── Config ────────────────────────────────────────────────────────
const argv  = process.argv.slice(2);
const PORT  = parseInt(
  argv.find(a => a.startsWith('--port='))?.split('=')[1] ??
  (argv.indexOf('--port') >= 0 ? argv[argv.indexOf('--port')+1] : null) ??
  process.env.PORT ??
  '4001'
);

// ── DB + Cache ───────────────────────────────────────────────────
const nad  = new NADQuery();
const keys = new KeyStore();
const ADMIN_SECRET          = process.env.NAD_ADMIN_SECRET    || 'nad_admin_localdev';
const STRIPE_SECRET         = process.env.STRIPE_SECRET_KEY   || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICES         = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro:     process.env.STRIPE_PRICE_PRO     || '',
  metered: process.env.STRIPE_PRICE_METERED || '',
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
      <p style="color:#8b949e;font-size:12px;">Questions? Reply to this email or visit <a href="https://geoclear.io" style="color:#388bfd;">geoclear.io</a></p>
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
        const upgraded = keys.upgradeTier(email.toLowerCase(), tier, subId, customerId);
        if (upgraded) {
          console.log(`[Stripe] Upgraded existing key for ${email} → ${tier}`);
          keys.completeStripeSession(session.id, `upgraded:${upgraded.id}`);
          const { TIERS } = require('./keys.js');
          sendEmail(email, 'Your GeoClear plan has been upgraded', keyEmail('(your existing key — unchanged)', tier, TIERS[tier] || TIERS.free)).catch(() => {});
        } else {
          const result = keys.generate({ email: email.toLowerCase(), tier, notes: `stripe:${session.id}` });
          keys.upgradeTier(email.toLowerCase(), tier, subId, customerId);
          keys.completeStripeSession(session.id, result.key);
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
      const changed = keys.changeSubscriptionTier(subId, newTier);
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
    const downgraded = keys.downgradeBySubscription(subId);
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

// ── API Auth + Rate Limiting ──────────────────────────────────────
// /api/health, /api/stats, /api/states are open — everything else requires a key
const OPEN_API_PATHS = new Set(['/health', '/stats', '/states', '/demo', '/status']);

function apiAuth(req, res, next) {
  const rawKey = req.headers['x-api-key'] || req.query.key;
  if (!rawKey) {
    return res.status(401).json({
      ok: false,
      error: 'API key required. Pass X-Api-Key header or ?key= query param.',
      get_key: `${BASE_URL}/portal.html`,
    });
  }
  const info = keys.validate(rawKey);
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
  req.keyInfo = info;
  res.on('finish', () => keys.recordUsage(info.key_id, req.path, res.statusCode));
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
  if (OPEN_API_PATHS.has(req.path)) return next();
  apiAuth(req, res, next);
});
app.use('/api', (req, res, next) => {
  if (OPEN_API_PATHS.has(req.path) || !req.keyInfo) return next();
  apiLimiter(req, res, next);
});

// ── Helpers ───────────────────────────────────────────────────────
const ok  = (res, data, meta = {}) => res.json({ ok: true, ...meta, data });
const err = (res, msg, status = 400) => res.status(status).json({ ok: false, error: msg });

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
  ok(res, raw.map(enrichAddress), { count: raw.length });
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
  ok(res, results, { count: results.length });
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
  let { lat, lon, nad_uuid } = req.query;

  if (nad_uuid && (!lat || !lon)) {
    const row = nad.db.prepare('SELECT latitude, longitude FROM addresses WHERE nad_uuid=? LIMIT 1').get(nad_uuid);
    if (!row) return err(res, `Address UUID ${nad_uuid} not found.`, 404);
    lat = row.latitude;
    lon = row.longitude;
  }

  if (!lat || !lon) return err(res, 'lat and lon required (or nad_uuid).');

  try {
    const data = await enrichPoint(parseFloat(lat), parseFloat(lon));
    ok(res, data);
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

app.get('/v1/admin/keys/stats', adminAuth, (req, res) => {
  ok(res, keys.stats());
});
app.get('/v1/admin/keys', adminAuth, (req, res) => {
  const data = keys.list({ includeRevoked: req.query.include_revoked === 'true' });
  ok(res, data, { count: data.length });
});
app.post('/v1/admin/keys', adminAuth, (req, res) => {
  const { email, name, tier, notes } = req.body || {};
  if (!email) return err(res, 'email required.');
  const result = keys.generate({ email, name, tier: tier || 'free', notes });
  res.status(201).json({ ok: true, data: result });
});
app.delete('/v1/admin/keys/:id', adminAuth, (req, res) => {
  const revoked = keys.revoke(req.params.id);
  if (!revoked) return err(res, 'Key not found.', 404);
  ok(res, { revoked: true, id: parseInt(req.params.id, 10) });
});
// ── Metered flush core (used by endpoint + daily cron) ───────────
async function runMeteredFlush() {
  if (!stripe || !STRIPE_METER_ID) return { skipped: true, reason: 'Stripe or meter not configured' };
  const rows    = keys.getMeteredKeysWithUsage();
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
    writeDb.pragma('synchronous = FULL');
    writeDb.close();
    cache.delete('stats');
    console.log(`[import-tsv-gz] Done: ${lineCount.toLocaleString()} lines, ${inserted.toLocaleString()} new rows inserted`);
  });
  gunzip.on('error', e => console.error('[import-tsv-gz] gunzip error:', e.message));
});

// POST /v1/admin/import-tsv-gz-cached — re-run import from saved /data/overture.tsv.gz
// Use this if the server restarted mid-import and the file is already on disk.
app.post('/v1/admin/import-tsv-gz-cached', adminAuth, (req, res) => {
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'DB not ready.' });
  const fs        = require('fs');
  const zlib      = require('zlib');
  const readline  = require('readline');
  const DATA_DIR  = process.env.DATA_DIR || path.join(__dirname, 'data');
  const CACHE_PATH = path.join(DATA_DIR, 'overture.tsv.gz');
  if (!fs.existsSync(CACHE_PATH)) return err(res, `No cached file at ${CACHE_PATH}. Upload first.`);

  const COLS = ['nad_uuid','add_number','st_name','unit','post_city','inc_muni','state',
    'zip_code','latitude','longitude','addr_type','placement','nad_source',
    'full_address','date_update','date_imported'];

  const writeDb2 = require('better-sqlite3')(path.join(DATA_DIR, 'nad.db'));
  writeDb2.pragma('journal_mode = WAL');
  writeDb2.pragma('synchronous = NORMAL');
  const stmt2 = writeDb2.prepare(`INSERT OR IGNORE INTO addresses
    (nad_uuid,add_number,st_name,unit,post_city,inc_muni,state,zip_code,
     latitude,longitude,addr_type,placement,nad_source,full_address,date_update,date_imported)
    VALUES (${COLS.map(() => '?').join(',')})`);
  const insertBatch2 = writeDb2.transaction(rows => {
    let n = 0;
    for (const r of rows) { n += stmt2.run(...r).changes; }
    return n;
  });

  const fileSize = fs.statSync(CACHE_PATH).size;
  console.log(`[import-cached] Starting: ${CACHE_PATH} (${(fileSize/1e9).toFixed(3)}GB)`);
  res.json({ ok: true, message: `Re-running import from ${CACHE_PATH}. Check /api/stats.` });

  let inserted = 0, lineCount = 0, skipped = 0, batch = [];
  const BATCH = 10000;
  const gunzip = zlib.createGunzip();
  const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity });
  fs.createReadStream(CACHE_PATH).pipe(gunzip);
  rl.on('line', line => {
    if (!line.trim()) return;
    const parts = line.split('\t');
    if (parts.length < COLS.length) { skipped++; return; }
    batch.push(parts.slice(0, COLS.length).map(v => v === '' ? null : v));
    lineCount++;
    if (batch.length >= BATCH) {
      try { inserted += insertBatch2(batch); } catch(e) { console.error('[import-cached] batch error:', e.message); }
      batch = [];
      if (lineCount % 1000000 === 0) console.log(`[import-cached] ${(lineCount/1e6).toFixed(1)}M lines, ${inserted.toLocaleString()} inserted, ${skipped} skipped`);
    }
  });
  rl.on('close', () => {
    try { if (batch.length) inserted += insertBatch2(batch); } catch(e) { console.error('[import-cached] final batch error:', e.message); }
    writeDb2.pragma('synchronous = FULL');
    writeDb2.close();
    cache.delete('stats');
    console.log(`[import-cached] Done: ${lineCount.toLocaleString()} lines, ${inserted.toLocaleString()} inserted, ${skipped} skipped`);
  });
  gunzip.on('error', e => console.error('[import-cached] gunzip error:', e.message));
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

// Open demo endpoint — no API key, IP rate-limited (10 req/hr)
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `demo:${req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ ok: false, error: 'Demo limit reached (10/hr). Sign up free at geoclear.io' }),
});
app.get('/api/demo', demoLimiter, (req, res) => {
  if (!nad.isReady()) return res.status(503).json({ ok: false, error: 'Database not ready.' });
  const { street, number, city, state, zip } = req.query;
  if (!street && !zip && !number) return err(res, 'Provide at least street or zip.');
  const raw = nad.findAddress({ addNumber: number, streetName: street, city, stateCode: state, zipCode: zip, limit: 3 });
  if (!raw.length) return err(res, 'No addresses found.', 404);
  ok(res, raw.map(enrichAddress), { count: raw.length, demo: true });
});

app.get('/v1/me', (req, res) => {
  const rawKey = req.headers['x-api-key'] || req.query.key;
  const info   = keys.validate(rawKey);
  if (!info) return err(res, 'Invalid or missing API key.', 401);
  ok(res, {
    tier:           info.tier,
    email:          info.email,
    limits:         info.limits,
    requests_today: info.requests_today,
    requests_total: info.requests_total,
    created_at:     info.created_at,
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

app.post('/v1/signup', signupLimiter, (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err(res, 'Valid email required.');
  }
  const existing = keys.findByEmail(email.toLowerCase());
  if (existing) {
    return err(res, 'An API key already exists for this email. Use /v1/me to check your key status.', 409);
  }
  const result = keys.generate({ email: email.toLowerCase(), tier: 'free' });
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
  if (!['starter', 'pro', 'metered'].includes(tier)) return err(res, 'tier must be "starter", "pro", or "metered".');
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
    keys.storeStripeSession(session.id, tier, email);
    ok(res, { session_id: session.id, url: session.url });
  } catch (e) {
    err(res, `Stripe error: ${e.message}`, 500);
  }
});

// Poll for key after payment completes (called by success page JS)
app.get('/v1/checkout/session/:sessionId', (req, res) => {
  const info = keys.getStripeSession(req.params.sessionId);
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
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
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
app.listen(PORT, () => {
  const dbReady  = nad.isReady();
  let stats      = null;
  let dbStatus   = '⚠ nad.db not loaded (rsync to /data to activate)';
  if (dbReady) {
    // Don't run COUNT(*) at startup — it blocks the event loop for minutes on cold cache.
    // The first /api/health or /api/stats call will warm the 1-hr cache instead.
    dbStatus = `✓ ready`;
  }
  const keyStats = keys.stats();
  console.log(`\n  GeoClear Address Intelligence API`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  URL       : ${BASE_URL}`);
  console.log(`  Port      : ${PORT}`);
  console.log(`  DB Status : ${dbStatus}`);
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
});
