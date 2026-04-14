#!/usr/bin/env node
/**
 * NAD MCP Server
 * ==============
 * Exposes the National Address Database as MCP tools for Claude agents.
 * Runs over stdio transport — add to .claude/settings.json to enable.
 *
 * Setup in Claude Code:
 *   Add to ~/.claude/settings.json or project .claude/settings.json:
 *   {
 *     "mcpServers": {
 *       "nad": {
 *         "command": "node",
 *         "args": ["/Users/shaileshbhujbal/Projects/Syntheticdata/nad/mcp-server.js"]
 *       }
 *     }
 *   }
 *
 * Tools exposed:
 *   nad_stats              — database coverage summary
 *   nad_search_address     — find/verify an address
 *   nad_lookup_zip         — ZIP code metadata + address count
 *   nad_list_cities        — cities in a state
 *   nad_list_neighborhoods — neighborhoods in a city/state
 *   nad_list_counties      — counties in a state
 *   nad_find_near          — addresses near a lat/lon coordinate
 *   nad_state_summary      — full stats for a state
 */

'use strict';

const { McpServer }             = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport }  = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z }                     = require('zod');
const { NADQuery }              = require('./query.js');

// ── Init DB connection ────────────────────────────────────────────
const nad = new NADQuery();

// ── MCP Server ───────────────────────────────────────────────────
const server = new McpServer({
  name:    'nad',
  version: '1.0.0',
});

// ── Tool: nad_stats ──────────────────────────────────────────────
server.tool(
  'nad_stats',
  'Get National Address Database coverage statistics — total addresses, states, counties, cities, neighborhoods, ZIP codes.',
  {},
  async () => {
    const s = nad.stats();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          addresses:     s.addresses,
          states:        s.states,
          counties:      s.counties,
          cities:        s.cities,
          zip_codes:     s.zip_codes,
          last_import:   s.lastImport,
        }, null, 2),
      }],
    };
  }
);

// ── Tool: nad_search_address ─────────────────────────────────────
server.tool(
  'nad_search_address',
  'Search and verify a US address. Returns full address details including neighborhood, county, coordinates, and address type. At least one of street_name or zip_code is required.',
  {
    street_name: z.string().optional().describe('Street name (e.g. "Main", "Pennsylvania")'),
    add_number:  z.string().optional().describe('House/building number (e.g. "935")'),
    city:        z.string().optional().describe('City name (e.g. "Austin", "Washington")'),
    state:       z.string().optional().describe('2-letter state code (e.g. "TX", "DC", "CA")'),
    zip_code:    z.string().optional().describe('5-digit ZIP code (e.g. "78701")'),
    limit:       z.number().optional().describe('Max results to return (default 10, max 50)'),
  },
  async ({ street_name, add_number, city, state, zip_code, limit }) => {
    const results = nad.findAddress({
      streetName: street_name,
      addNumber:  add_number,
      city,
      stateCode:  state,
      zipCode:    zip_code,
      limit:      Math.min(limit ?? 10, 50),
    });
    return {
      content: [{
        type: 'text',
        text: results.length
          ? JSON.stringify(results, null, 2)
          : 'No addresses found matching those criteria.',
      }],
    };
  }
);

// ── Tool: nad_lookup_zip ─────────────────────────────────────────
server.tool(
  'nad_lookup_zip',
  'Look up a US ZIP code — returns city, county, state, and number of addresses in that ZIP.',
  {
    zip:   z.string().describe('5-digit ZIP code (e.g. "90210")'),
    state: z.string().optional().describe('2-letter state code to disambiguate same ZIP across states'),
  },
  async ({ zip, state }) => {
    const result = nad.getZip(zip, state);
    if (!result) return { content: [{ type: 'text', text: `ZIP ${zip} not found in NAD.` }] };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool: nad_list_counties ──────────────────────────────────────
server.tool(
  'nad_list_counties',
  'List all counties in a US state with their address counts.',
  {
    state: z.string().describe('2-letter state code (e.g. "TX")'),
  },
  async ({ state }) => {
    const results = nad.listCounties(state)
      .sort((a, b) => (b.address_count || 0) - (a.address_count || 0));
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

// ── Tool: nad_list_cities ────────────────────────────────────────
server.tool(
  'nad_list_cities',
  'List cities in a US state, optionally filtered by county. Returns cities sorted by address count.',
  {
    state:  z.string().describe('2-letter state code (e.g. "TX")'),
    county: z.string().optional().describe('County name to filter by (e.g. "Travis County")'),
    limit:  z.number().optional().describe('Max cities to return (default 50)'),
  },
  async ({ state, county, limit }) => {
    const results = nad.listCities(state, county)
      .sort((a, b) => (b.address_count || 0) - (a.address_count || 0))
      .slice(0, limit ?? 50);
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

// ── Tool: nad_list_neighborhoods ─────────────────────────────────
server.tool(
  'nad_list_neighborhoods',
  'List neighborhoods in a city and state. Returns neighborhood names with address counts.',
  {
    state: z.string().describe('2-letter state code (e.g. "IL")'),
    city:  z.string().optional().describe('City name (e.g. "Chicago")'),
    limit: z.number().optional().describe('Max neighborhoods to return (default 50)'),
  },
  async ({ state, city, limit }) => {
    const db = nad.db;
    const rows = db.prepare(`
      SELECT n.name, n.type, n.address_count,
             ci.name AS city_name, s.code AS state_code
      FROM neighborhoods n
      JOIN states s ON s.id = n.state_id
      LEFT JOIN cities ci ON ci.id = n.city_id
      WHERE s.code = ?
        ${city ? "AND UPPER(ci.name) LIKE UPPER(?)" : ""}
      ORDER BY n.address_count DESC
      LIMIT ?
    `).all(...[state.toUpperCase(), ...(city ? [`%${city}%`] : []), limit ?? 50]);

    return {
      content: [{
        type: 'text',
        text: rows.length
          ? JSON.stringify(rows, null, 2)
          : `No neighborhoods found for ${city ? city + ', ' : ''}${state}.`,
      }],
    };
  }
);

// ── Tool: nad_list_zips ──────────────────────────────────────────
server.tool(
  'nad_list_zips',
  'List ZIP codes in a state or city with address counts.',
  {
    state: z.string().describe('2-letter state code'),
    city:  z.string().optional().describe('City name to filter'),
    limit: z.number().optional().describe('Max ZIPs to return (default 50)'),
  },
  async ({ state, city, limit }) => {
    const results = nad.listZips(state, city).slice(0, limit ?? 50);
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

// ── Tool: nad_find_near ──────────────────────────────────────────
server.tool(
  'nad_find_near',
  'Find US addresses near a geographic coordinate. Useful for proximity lookups, delivery radius checks, and location-based queries.',
  {
    latitude:  z.number().describe('Latitude in decimal degrees (e.g. 40.758)'),
    longitude: z.number().describe('Longitude in decimal degrees (e.g. -73.9855)'),
    radius_km: z.number().optional().describe('Search radius in kilometers (default 0.5 km)'),
    limit:     z.number().optional().describe('Max results (default 20, max 100)'),
  },
  async ({ latitude, longitude, radius_km, limit }) => {
    // 1 degree ≈ 111 km
    const radiusDeg = (radius_km ?? 0.5) / 111;
    const results   = nad.findNear(latitude, longitude, radiusDeg, Math.min(limit ?? 20, 100));
    return {
      content: [{
        type: 'text',
        text: results.length
          ? JSON.stringify(results, null, 2)
          : `No addresses found within ${radius_km ?? 0.5} km of ${latitude}, ${longitude}.`,
      }],
    };
  }
);

// ── Tool: nad_state_summary ──────────────────────────────────────
server.tool(
  'nad_state_summary',
  'Get a full summary for a US state — address count, county count, city count, ZIP count, and top counties by address density.',
  {
    state: z.string().describe('2-letter state code (e.g. "TX")'),
  },
  async ({ state }) => {
    const s   = nad.getState(state);
    if (!s) return { content: [{ type: 'text', text: `State ${state} not found.` }] };
    const top = nad.listCounties(state)
      .sort((a, b) => (b.address_count || 0) - (a.address_count || 0))
      .slice(0, 5)
      .map(c => ({ county: c.name, addresses: c.address_count }));
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ ...s, top_counties: top }, null, 2),
      }],
    };
  }
);

// ── Start ────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so it doesn't pollute the stdio MCP channel
  process.stderr.write('[NAD MCP] Server running — 96M US addresses ready\n');
}

main().catch(err => {
  process.stderr.write(`[NAD MCP] Fatal: ${err.message}\n`);
  process.exit(1);
});
