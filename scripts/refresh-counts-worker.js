'use strict';
const { workerData, parentPort } = require('worker_threads');
const Database = require('better-sqlite3');

try {
  const db = new Database(workerData.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  parentPort.postMessage({ msg: 'Refreshing states...' });
  db.exec(`UPDATE states SET
    address_count = (SELECT COUNT(*) FROM addresses WHERE state_id = states.id),
    county_count  = (SELECT COUNT(*) FROM counties  WHERE state_id = states.id),
    city_count    = (SELECT COUNT(*) FROM cities    WHERE state_id = states.id),
    zip_count     = (SELECT COUNT(*) FROM zip_codes WHERE state_id = states.id)`);

  parentPort.postMessage({ msg: 'Refreshing counties...' });
  db.exec('UPDATE counties SET address_count = (SELECT COUNT(*) FROM addresses WHERE county_id = counties.id)');

  parentPort.postMessage({ msg: 'Refreshing cities...' });
  db.exec('UPDATE cities SET address_count = (SELECT COUNT(*) FROM addresses WHERE city_id = cities.id)');

  parentPort.postMessage({ msg: 'Refreshing zip_codes...' });
  db.exec('UPDATE zip_codes SET address_count = (SELECT COUNT(*) FROM addresses WHERE zip_code_id = zip_codes.id)');

  db.close();
  parentPort.postMessage({ done: true });
} catch (e) {
  parentPort.postMessage({ error: e.message });
}
