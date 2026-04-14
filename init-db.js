#!/usr/bin/env node
/**
 * NAD Init DB
 * ===========
 * Creates the NAD SQLite database and applies the schema.
 * Run this before download.js if you want to set up the DB first
 * or use the query API against an empty / partially-loaded DB.
 *
 * Usage:
 *   node nad/init-db.js [--db PATH]
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

const NAD_DIR    = path.join(__dirname, 'data');
const SCHEMA_SQL = path.join(__dirname, 'schema.sql');

const argv   = process.argv.slice(2);
const dbArg  = argv.find(a => a.startsWith('--db='))?.split('=')[1]
            ?? (argv.indexOf('--db') >= 0 ? argv[argv.indexOf('--db') + 1] : null);
const DB_PATH = dbArg ?? path.join(NAD_DIR, 'nad.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
const sql = fs.readFileSync(SCHEMA_SQL, 'utf8');
db.exec(sql);
db.close();

console.log(`NAD database initialized: ${DB_PATH}`);
console.log(`Run "node nad/download.js" to download and import the full dataset (~8.4 GB).`);
