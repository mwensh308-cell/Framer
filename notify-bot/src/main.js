#!/usr/bin/env node
// Starts the endpoint the phone posts to and the Telegram bot.
import { createBot } from './bot.js';
import { loadConfig, loadEnvFile } from './config.js';
import { createIngest } from './ingest.js';
import { Store } from './store.js';
import { Telegram } from './telegram.js';

loadEnvFile();
const cfg = loadConfig();
const fail = (m) => {
  console.error(m);
  process.exit(1);
};
if (!cfg.token) fail('Set TELEGRAM_BOT_TOKEN (see .env.example).');
if (!cfg.owners.length) console.warn('OWNERS is empty: notifications are kept, but nobody gets them until you add your Telegram id.');

const store = new Store(cfg.db);
const tg = new Telegram(cfg.token, cfg.apiBase);
const bot = createBot({ cfg, tg, store });
let server;
try {
  server = createIngest({ store, deviceToken: cfg.deviceToken, onStored: bot.forward });
} catch (e) {
  fail(e.message);
}

const prune = () => {
  const n = store.prune(cfg.keepDays);
  if (n) console.log(`Deleted ${n} notifications older than ${cfg.keepDays} days.`);
};
prune();
setInterval(prune, 3_600_000).unref();

server.listen(cfg.port, cfg.host, async () => {
  const me = await tg.call('getMe').catch((e) => fail(e.message));
  console.log(`@${me.username}: phone endpoint on http://${cfg.host}:${cfg.port}/api/notifications, database ${cfg.db}`);
});

const stop = new AbortController();
process.on('SIGINT', () => {
  stop.abort();
  server.close();
  store.close();
  process.exit(0);
});
for await (const u of tg.updates(stop.signal)) bot.onUpdate(u).catch((e) => console.error('update:', e.message));
