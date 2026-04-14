#!/usr/bin/env node
/**
 * NAD Module Integration Demo
 * ============================
 * Shows how to use NADQuery directly from any sibling Node.js project.
 * This is Option 3 (npm module / direct import) — zero network overhead.
 *
 * Usage:
 *   node nad/demo.js
 *   node nad/demo.js --address "935 Pennsylvania Ave, DC"
 *   node nad/demo.js --zip 10001
 *   node nad/demo.js --state TX --limit 5
 *   node nad/demo.js --near "40.7580,-73.9855" --radius 0.005
 */

'use strict';

const { NADQuery } = require('./query.js');

const argv    = process.argv.slice(2);
const get     = f => argv.find(a => a.startsWith(f+'='))?.split('=').slice(1).join('=')
               ?? (argv.indexOf(f) >= 0 ? argv[argv.indexOf(f)+1] : null);

const nad = new NADQuery();

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

function printAddress(a) {
  console.log(`  📍 ${a.full_address || a.formatted_address}`);
  if (a.unit)         console.log(`     Unit        : ${a.unit}`);
  if (a.neighborhood || a.nbrhd_comm)
                      console.log(`     Neighborhood : ${a.neighborhood || a.nbrhd_comm}`);
  console.log(`     City        : ${a.city || a.inc_muni}`);
  console.log(`     County      : ${a.county}`);
  console.log(`     State       : ${a.state}`);
  console.log(`     ZIP         : ${a.zip_code || a.zip || '—'}`);
  if (a.latitude)     console.log(`     Coordinates : ${a.latitude.toFixed(6)}, ${a.longitude.toFixed(6)}`);
  if (a.addr_type)    console.log(`     Type        : ${a.addr_type}`);
  if (a.addr_class)   console.log(`     Class       : ${a.addr_class}`);
  if (a.add_auth)     console.log(`     Authority   : ${a.add_auth}`);
}

// ── CLI mode ──────────────────────────────────────────────────────
if (get('--zip')) {
  const zip = get('--zip');
  section(`ZIP Code: ${zip}`);
  const z = nad.getZip(zip);
  if (!z) { console.log('  Not found'); } else {
    console.log(`  ZIP         : ${z.zip}`);
    console.log(`  Post City   : ${z.post_city}`);
    console.log(`  State       : ${z.state}`);
    console.log(`  Addresses   : ${z.address_count?.toLocaleString() || '—'}`);
  }
  section(`Addresses in ZIP ${zip}`);
  nad.findAddress({ zipCode: zip, limit: parseInt(get('--limit') || '10') })
     .forEach(printAddress);
  nad.close(); process.exit(0);
}

if (get('--near')) {
  const [lat, lon] = get('--near').split(',').map(Number);
  const radius     = parseFloat(get('--radius') || '0.005');
  section(`Addresses near ${lat}, ${lon}  (radius ±${radius}°)`);
  nad.findNear(lat, lon, radius, parseInt(get('--limit') || '20')).forEach(printAddress);
  nad.close(); process.exit(0);
}

if (get('--state') && !get('--demo')) {
  const state = get('--state').toUpperCase();
  const limit = parseInt(get('--limit') || '10');
  section(`Sample addresses in ${state}`);
  nad.findAddress({ stateCode: state, limit }).forEach(printAddress);
  nad.close(); process.exit(0);
}

// ── Full demo (default) ───────────────────────────────────────────
section('NAD Database Stats');
const stats = nad.stats();
console.log(`  Countries     : ${stats.countries.toLocaleString()}`);
console.log(`  States        : ${stats.states.toLocaleString()}`);
console.log(`  Counties      : ${stats.counties.toLocaleString()}`);
console.log(`  Cities        : ${stats.cities.toLocaleString()}`);
console.log(`  Neighborhoods : ${stats.zip_codes.toLocaleString()}`);
console.log(`  ZIP codes     : ${stats.zip_codes.toLocaleString()}`);
console.log(`  Addresses     : ${stats.addresses.toLocaleString()}`);

section('Top 5 States by Address Count');
nad.listStates().slice(0, 5).forEach(s => {
  if (s.address_count > 0)
    console.log(`  ${s.code}  ${s.name.padEnd(30)} ${s.address_count.toLocaleString()} addresses`);
});

section('Pennsylvania Ave, Washington DC');
nad.findAddress({ streetName: 'Pennsylvania', stateCode: 'DC', limit: 3 }).forEach(printAddress);

section('Main St, Austin TX');
nad.findAddress({ streetName: 'Main', city: 'Austin', stateCode: 'TX', limit: 3 }).forEach(printAddress);

section('ZIP 90210 (Beverly Hills, CA)');
const bh = nad.getZip('90210', 'CA');
if (bh) {
  console.log(`  ZIP         : ${bh.zip}`);
  console.log(`  City        : ${bh.city_name}`);
  console.log(`  State       : ${bh.state}`);
  console.log(`  Addresses   : ${bh.address_count?.toLocaleString()}`);
}
nad.findAddress({ zipCode: '90210', limit: 3 }).forEach(printAddress);

section('Near Times Square, NYC  (lat 40.758, lon -73.9855, radius 0.003°)');
nad.findNear(40.758, -73.9855, 0.003, 5).forEach(printAddress);

section('Counties in Texas (top 5 by address count)');
nad.listCounties('TX')
   .sort((a,b) => (b.address_count||0) - (a.address_count||0))
   .slice(0, 5)
   .forEach(c => console.log(`  ${c.name.padEnd(35)} ${(c.address_count||0).toLocaleString()} addresses`));

section('Neighborhoods in Chicago, IL (sample)');
const db = nad.db;
db.prepare(`
  SELECT n.name, n.type, n.address_count
  FROM neighborhoods n
  JOIN states s ON s.id = n.state_id
  JOIN cities ci ON ci.id = n.city_id
  WHERE s.code = 'IL' AND UPPER(ci.name) LIKE '%CHICAGO%'
  ORDER BY n.address_count DESC LIMIT 8
`).all().forEach(n => console.log(`  ${n.name.padEnd(30)} ${n.type.padEnd(20)} ${(n.address_count||0).toLocaleString()} addresses`));

section('How to use in your project');
console.log(`
  // Direct import — no server needed:
  const { NADQuery } = require('../Syntheticdata/nad/query.js');
  const nad = new NADQuery();

  // Verify an address:
  const result = nad.findAddress({ addNumber: '100', streetName: 'Main', stateCode: 'TX' });

  // ZIP code info:
  const zip = nad.getZip('90210', 'CA');

  // Near a location:
  const nearby = nad.findNear(37.7749, -122.4194, 0.01, 10);

  // Always close when done:
  nad.close();
`);

nad.close();
