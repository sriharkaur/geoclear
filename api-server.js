#!/usr/bin/env node
/**
 * NAD REST API Server
 * ====================
 * Exposes the National Address Database as a REST API.
 * 96M US addresses — verify, enrich, geocode, proximity search.
 *
 * Usage:
 *   node nad/api-server.js [--port 3847] [--api-keys "key1,key2"] [--no-auth]
 *
 * Endpoints:
 *   GET  /health
 *   GET  /v1/stats
 *   GET  /v1/address              ?street=&city=&state=&zip=&number=&limit=
 *   POST /v1/address/bulk         body: [{ street, city, state, zip, number }]
 *   GET  /v1/zip/:zip             ?state=
 *   GET  /v1/state/:code
 *   GET  /v1/county               ?state=&name=
 *   GET  /v1/city                 ?state=&name=&county=
 *   GET  /v1/neighborhood         ?state=&city=&limit=
 *   GET  /v1/near                 ?lat=&lon=&radius_km=&limit=
 */

'use strict';

const express     = require('express');
const rateLimit   = require('express-rate-limit');
const { LRUCache }= require('lru-cache');
const { NADQuery }    = require('./query.js');
const { enrich }      = require('./enrich.js');
const { enrichPoint } = require('./geocode.js');
const { KeyStore }    = require('./keys.js');

// ── Config ────────────────────────────────────────────────────────
const argv      = process.argv.slice(2);
const PORT      = parseInt(argv.find(a => a.startsWith('--port='))?.split('=')[1]
               ?? (argv.indexOf('--port') >= 0 ? argv[argv.indexOf('--port')+1] : '3847'));
const NO_AUTH   = argv.includes('--no-auth');
const KEY_ARG   = argv.find(a => a.startsWith('--api-keys='))?.split('=').slice(1).join('=')
               ?? (argv.indexOf('--api-keys') >= 0 ? argv[argv.indexOf('--api-keys')+1] : null);

// Default dev key when no keys specified
const API_KEYS  = new Set(
  KEY_ARG
    ? KEY_ARG.split(',').map(k => k.trim())
    : ['nad_dev_localtest']
);

// ── DB + Cache ───────────────────────────────────────────────────
const nad  = new NADQuery();
const keys = new KeyStore();

const cache = new LRUCache({
  max:  50_000,                  // 50K entries
  ttl:  1000 * 60 * 60 * 24,    // 24-hour TTL (NAD updates quarterly)
});

function cached(key, fn) {
  if (cache.has(key)) return cache.get(key);
  const val = fn();
  cache.set(key, val);
  return val;
}

// ── Express app ──────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '2mb' }));

// ── Rate limiter ─────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max:      1000,         // 1,000 requests/min per IP (generous for dev)
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Rate limit exceeded. Slow down.', retry_after: '60s' },
});
app.use('/v1', limiter);

// ── Auth middleware ───────────────────────────────────────────────
function auth(req, res, next) {
  if (NO_AUTH) { req.keyInfo = { tier: 'enterprise', key_id: 0 }; return next(); }
  const rawKey = req.headers['x-api-key'] || req.query.key;
  // Fallback: legacy static key list (backwards compat during migration)
  if (API_KEYS.has(rawKey)) {
    req.keyInfo = { tier: 'pro', key_id: 0 };
    return next();
  }
  const info = keys.validate(rawKey);
  if (!info) {
    return res.status(401).json({ error: 'Invalid or missing API key. Pass X-Api-Key header.' });
  }
  req.keyInfo = info;
  next();
}

// ── Admin auth (separate secret for key management routes) ────────
const ADMIN_SECRET = process.env.NAD_ADMIN_SECRET || 'nad_admin_localdev';
function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.query.admin_secret;
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Admin secret required. Set NAD_ADMIN_SECRET env var.' });
  }
  next();
}

// ── Response helpers ─────────────────────────────────────────────
function ok(res, data, meta = {}) {
  res.json({ ok: true, ...meta, data });
}
function notFound(res, msg) {
  res.status(404).json({ ok: false, error: msg });
}
function badRequest(res, msg) {
  res.status(400).json({ ok: false, error: msg });
}

// ── Enrich a raw address row — adds FIPS, confidence, timezone, etc. ─
function enrichAddress(a) {
  const e = enrich(a);
  return {
    verified:      true,
    confidence:    e.confidence,
    full_address:  e.full_address,
    components: {
      number:      e.add_number,
      pre_dir:     e.st_pre_dir,
      street:      e.st_name,
      post_type:   e.st_pos_typ,
      post_dir:    e.st_pos_dir,
      unit:        e.unit,
    },
    jurisdiction: {
      neighborhood: e.neighborhood,
      city:         e.display_city,
      inc_muni:     e.inc_muni,
      post_city:    e.post_city,
      county:       e.county,
      state:        e.state,
      zip:          e.zip_code,
      plus4:        e.plus4,
      fips:         e.fips,
      country:      'US',
    },
    coordinates: {
      latitude:    e.latitude,
      longitude:   e.longitude,
    },
    metadata: {
      residential: e.residential,
      timezone:    e.timezone,
      addr_type:   e.addr_type,
      addr_class:  e.addr_class,
      placement:   e.placement,
      authority:   e.add_auth,
      date_update: e.date_update,
      nad_source:  e.nad_source,
      nad_uuid:    e.nad_uuid,
    },
  };
}

// ────────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────────

// Health check (no auth)
app.get('/health', (req, res) => {
  const stats = nad.stats();
  res.json({ status: 'ok', addresses: stats.addresses, version: '1.0.0' });
});

// Stats (no auth)
app.get('/v1/stats', (req, res) => {
  const data = cached('stats', () => nad.stats());
  ok(res, data);
});

// ── Address search  (?fuzzy=true enables typo-tolerant matching) ──
app.get('/v1/address', auth, (req, res) => {
  const { street, number, city, state, zip, limit, fuzzy } = req.query;
  if (!street && !zip && !number) {
    return badRequest(res, 'Provide at least one of: street, zip, number');
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
  if (!raw.length) return notFound(res, 'No addresses found matching those criteria.');
  ok(res, raw.map(enrichAddress), { count: raw.length });
});

// ── Autocomplete / typeahead ─────────────────────────────────────
app.get('/v1/suggest', auth, (req, res) => {
  const { q, state, zip, limit } = req.query;
  if (!q || q.trim().length < 2) return badRequest(res, 'q must be at least 2 characters.');
  const lim  = Math.min(parseInt(limit || '10'), 20);
  const key  = `suggest:${q}:${state||''}:${zip||''}:${lim}`;
  const data = cached(key, () => nad.suggest({ q, stateCode: state, zipCode: zip, limit: lim }));
  ok(res, data, { count: data.length });
});

// ── Bulk address lookup ──────────────────────────────────────────
app.post('/v1/address/bulk', auth, (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return badRequest(res, 'Body must be an array of address queries.');
  if (items.length > 1000) return badRequest(res, 'Max 1,000 addresses per bulk request.');

  const results = items.map(({ street, number, city, state, zip }) => {
    const found = nad.findAddress({ addNumber: number, streetName: street, city, stateCode: state, zipCode: zip, limit: 1 });
    if (!found.length) return { verified: false, input: { street, number, city, state, zip } };
    return enrichAddress(found[0]);
  });
  ok(res, results, { count: results.length });
});

// ── ZIP lookup ───────────────────────────────────────────────────
app.get('/v1/zip/:zip', auth, (req, res) => {
  const { zip } = req.params;
  const { state } = req.query;
  const key = `zip:${zip}:${state || ''}`;
  const data = cached(key, () => nad.getZip(zip, state));
  if (!data) return notFound(res, `ZIP ${zip} not found.`);
  ok(res, data);
});

// ── State summary ────────────────────────────────────────────────
app.get('/v1/state/:code', auth, (req, res) => {
  const code = req.params.code.toUpperCase();
  const data = cached(`state:${code}`, () => nad.getState(code));
  if (!data) return notFound(res, `State ${code} not found.`);
  ok(res, data);
});

// ── Counties ─────────────────────────────────────────────────────
app.get('/v1/county', auth, (req, res) => {
  const { state, name } = req.query;
  if (!state) return badRequest(res, 'state parameter required.');
  const key = `county:${state}:${name || ''}`;
  const data = cached(key, () =>
    name ? [nad.getCounty(name, state)].filter(Boolean) : nad.listCounties(state)
  );
  ok(res, data, { count: data.length });
});

// ── Cities ───────────────────────────────────────────────────────
app.get('/v1/city', auth, (req, res) => {
  const { state, name, county, limit } = req.query;
  if (!state && !name) return badRequest(res, 'Provide state or name.');
  const lim = parseInt(limit || '100');
  const key = `city:${state}:${county}:${name}:${lim}`;
  let data = cached(key, () =>
    name ? nad.searchCity(name, state) : nad.listCities(state, county)
  );
  data = data.slice(0, lim);
  ok(res, data, { count: data.length });
});

// ── Neighborhoods ────────────────────────────────────────────────
app.get('/v1/neighborhood', auth, (req, res) => {
  const { state, city, limit } = req.query;
  if (!state) return badRequest(res, 'state parameter required.');
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
      ORDER BY n.address_count DESC
      LIMIT ?
    `).all(...[state.toUpperCase(), ...(city ? [`%${city}%`] : []), lim])
  );
  ok(res, data, { count: data.length });
});

// ── ZIP codes in state/city ───────────────────────────────────────
app.get('/v1/zips', auth, (req, res) => {
  const { state, city, limit } = req.query;
  if (!state) return badRequest(res, 'state parameter required.');
  const lim = parseInt(limit || '50');
  const key = `zips:${state}:${city}:${lim}`;
  const data = cached(key, () => nad.listZips(state, city).slice(0, lim));
  ok(res, data, { count: data.length });
});

// ── Proximity search ─────────────────────────────────────────────
app.get('/v1/near', auth, (req, res) => {
  const { lat, lon, radius_km, limit } = req.query;
  if (!lat || !lon) return badRequest(res, 'lat and lon parameters required.');
  const radiusDeg = (parseFloat(radius_km) || 0.5) / 111;
  const lim       = Math.min(parseInt(limit || '20'), 100);
  const results   = nad.findNear(parseFloat(lat), parseFloat(lon), radiusDeg, lim);
  if (!results.length) return notFound(res, `No addresses found within ${radius_km || 0.5} km.`);
  ok(res, results.map(enrichAddress), { count: results.length });
});

// ── Point Enrichment — census tract + FEMA flood zone ────────────
// GET /v1/enrich?lat=38.878&lon=-77.175
app.get('/v1/enrich', auth, async (req, res) => {
  let { lat, lon, nad_uuid } = req.query;

  // Pro+ tier required for enrichment
  if (req.keyInfo?.limits?.enrichment === false) {
    return res.status(402).json({
      ok: false,
      error: 'Census tract + FEMA enrichment requires Pro tier or above.',
      upgrade: 'https://nad.example.com/pricing',
    });
  }

  if (nad_uuid && (!lat || !lon)) {
    const row = nad.db.prepare('SELECT latitude, longitude FROM addresses WHERE nad_uuid=? LIMIT 1').get(nad_uuid);
    if (!row) return notFound(res, `Address UUID ${nad_uuid} not found.`);
    lat = row.latitude; lon = row.longitude;
  }

  if (!lat || !lon) return badRequest(res, 'lat and lon required (or nad_uuid).');

  try {
    const data = await enrichPoint(parseFloat(lat), parseFloat(lon));
    ok(res, { lat: parseFloat(lat), lon: parseFloat(lon), ...data });
  } catch (e) {
    res.status(500).json({ ok: false, error: `Enrichment failed: ${e.message}` });
  }
});

// ── API Key Management (admin-only) ──────────────────────────────

// List all keys
app.get('/v1/admin/keys', adminAuth, (req, res) => {
  const { include_revoked } = req.query;
  const data = keys.list({ includeRevoked: include_revoked === 'true' });
  ok(res, data, { count: data.length });
});

// Create a new key
app.post('/v1/admin/keys', adminAuth, (req, res) => {
  const { email, name, tier, notes } = req.body || {};
  if (!email) return badRequest(res, 'email required.');
  const VALID_TIERS = ['free', 'starter', 'pro', 'enterprise'];
  if (tier && !VALID_TIERS.includes(tier)) {
    return badRequest(res, `tier must be one of: ${VALID_TIERS.join(', ')}`);
  }
  const result = keys.generate({ email, name, tier: tier || 'free', notes });
  res.status(201).json({ ok: true, data: result });
});

// Revoke a key
app.delete('/v1/admin/keys/:key', adminAuth, (req, res) => {
  const revoked = keys.revoke(req.params.key);
  if (!revoked) return notFound(res, `Key not found.`);
  ok(res, { revoked: true, key: req.params.key });
});

// Key stats
app.get('/v1/admin/keys/stats', adminAuth, (req, res) => {
  ok(res, keys.stats());
});

// Self-service: caller's own key info
app.get('/v1/me', auth, (req, res) => {
  ok(res, {
    tier:           req.keyInfo.tier,
    email:          req.keyInfo.email,
    limits:         req.keyInfo.limits,
    requests_today: req.keyInfo.requests_today,
    requests_total: req.keyInfo.requests_total,
    created_at:     req.keyInfo.created_at,
  });
});

// ── 404 catch ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Unknown endpoint: ${req.method} ${req.path}`,
    docs: 'GET /health or GET /v1/stats to get started.',
  });
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n NAD REST API running on http://localhost:${PORT}`);
  console.log(` Auth: ${NO_AUTH ? 'DISABLED (dev mode)' : 'X-API-Key required'}`);
  if (!NO_AUTH) console.log(` Dev key: nad_dev_localtest`);
  console.log(`\n Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/v1/stats`);
  console.log(`   GET  http://localhost:${PORT}/v1/address?street=Main&state=TX`);
  console.log(`   POST http://localhost:${PORT}/v1/address/bulk`);
  console.log(`   GET  http://localhost:${PORT}/v1/zip/78701`);
  console.log(`   GET  http://localhost:${PORT}/v1/state/TX`);
  console.log(`   GET  http://localhost:${PORT}/v1/county?state=TX`);
  console.log(`   GET  http://localhost:${PORT}/v1/city?state=TX`);
  console.log(`   GET  http://localhost:${PORT}/v1/neighborhood?state=IL&city=Chicago`);
  console.log(`   GET  http://localhost:${PORT}/v1/near?lat=40.758&lon=-73.9855&radius_km=0.5`);
  console.log(`\n Addresses loaded: 96,893,147`);
  console.log(` Cache: LRU 50K entries, 24h TTL\n`);
});
