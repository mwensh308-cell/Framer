'use strict';
const config = require('./config');
const db = require('./db');
const { seedIfEmpty } = require('./db/seed');
const { createApp } = require('./app');
const orders = require('./services/orders');

db.open();
if (seedIfEmpty()) console.log('Database was empty — seeded launch catalog.');

const server = createApp().listen(config.port, () => {
  console.log(`El3alamy Store running at ${config.siteUrl} (port ${config.port}, ${config.env})`);
});

// Release stock from abandoned card checkouts every 10 minutes.
const sweeper = setInterval(() => {
  try { const n = orders.expireStale(60); if (n) console.log(`Expired ${n} unpaid order(s).`); } catch (e) { console.error(e); }
}, 10 * 60 * 1000);
sweeper.unref();

function shutdown() {
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
