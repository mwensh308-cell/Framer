import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBot, format, toCsv } from '../src/bot.js';
import { loadConfig } from '../src/config.js';
import { createIngest } from '../src/ingest.js';
import { Store, ftsQuery, normalize } from '../src/store.js';

const TOKEN = 'a-device-token-long-enough';
const note = (over = {}) => ({ device: 'Pixel 8', package: 'com.whatsapp', app: 'WhatsApp', title: 'Sara', text: 'Are we meeting at 6?', key: 'k1', postedAt: Date.now(), ...over });

function fakeTelegram() {
  const sent = [];
  return {
    sent,
    async send(chat, text) {
      sent.push({ chat, text });
    },
    async sendDocument(chat, file, caption) {
      sent.push({ chat, text: `[document] ${caption}`, file });
    },
  };
}

function setup(env = {}) {
  const store = new Store(':memory:');
  const cfg = loadConfig({ OWNERS: '7', DEVICE_TOKEN: TOKEN, TZ_NAME: 'UTC', ...env });
  const tg = fakeTelegram();
  const bot = createBot({ cfg, tg, store });
  const say = (text, from = 7, type = 'private') => bot.onUpdate({ message: { chat: { id: from, type }, from: { id: from }, text } });
  return { store, cfg, tg, bot, say };
}

async function withServer(store, onStored, fn) {
  const server = createIngest({ store, deviceToken: TOKEN, onStored });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(url);
  } finally {
    server.close();
  }
}

const post = (url, body, token = TOKEN) =>
  fetch(`${url}/api/notifications`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('a notification that says nothing is dropped; long fields are cut', () => {
  assert.equal(normalize({ app: 'X', title: '', text: '' }), null);
  const n = normalize({ title: 'x'.repeat(5000), text: 'hi', postedAt: 'soon' });
  assert.ok(n.title.length < 5000);
  assert.ok(n.postedAt > 0, 'a bad time becomes the time it arrived');
});

test("the same notification posted again within a short time is kept once; a changed one isn't", () => {
  const store = new Store(':memory:');
  // In the past: a time more than a minute ahead is taken as the time it arrived.
  const t = Date.now() - 30 * 60_000;
  assert.ok(store.add(normalize(note({ postedAt: t }))));
  assert.equal(store.add(normalize(note({ postedAt: t + 1000 }))), null);
  assert.ok(store.add(normalize(note({ postedAt: t + 2000, text: 'Running late' }))));
  assert.ok(store.add(normalize(note({ postedAt: t + 10 * 60_000 }))), 'the same words much later are a new notification');
});

test('search finds words in any field, in Arabic too, and ignores FTS syntax', () => {
  const store = new Store(':memory:');
  store.add(normalize(note()));
  store.add(normalize(note({ app: 'Bank', package: 'com.bank', title: 'تحويل', text: 'تم تحويل ٥٠٠ ريال إلى حسابك', key: 'k2' })));
  assert.equal(store.search('meeting')[0].title, 'Sara');
  assert.equal(store.search('meet')[0].title, 'Sara', 'words match as prefixes');
  assert.equal(store.search('تحويل حسابك')[0].app, 'Bank');
  assert.equal(store.search('whatsapp sara').length, 1);
  assert.deepEqual(store.search('" OR * NEAR('), []);
  assert.equal(ftsQuery('a"b'), '"a"* "b"*');
});

test('the phone endpoint needs the token and stores single and queued notifications', async () => {
  const store = new Store(':memory:');
  const forwarded = [];
  await withServer(store, (n) => forwarded.push(n), async (url) => {
    assert.equal((await post(url, note(), 'wrong-token-of-some-length')).status, 401);
    assert.equal((await post(url, '{not json')).status, 400);
    assert.deepEqual(await (await post(url, note())).json(), { stored: 1, skipped: 0 });
    const batch = await (await post(url, { items: [note({ key: 'a', text: 'one' }), note({ key: 'b', text: 'two' }), { title: '' }] })).json();
    assert.deepEqual(batch, { stored: 2, skipped: 1 });
    assert.equal((await fetch(`${url}/health`)).status, 200);
  });
  assert.equal(store.stats().total, 3);
  assert.equal(forwarded.length, 3);
});

test("a short token is refused at start", () => {
  assert.throws(() => createIngest({ store: new Store(':memory:'), deviceToken: 'short' }), /DEVICE_TOKEN/);
});

test('notifications reach the owner unless paused or the app is muted', async () => {
  const { store, tg, bot, say } = setup();
  await bot.forward(store.add(normalize(note())));
  assert.match(tg.sent.at(-1).text, /WhatsApp[\s\S]*Sara[\s\S]*meeting/);
  await say('/mute whatsapp');
  await bot.forward(store.add(normalize(note({ key: 'm', text: 'muted one' }))));
  assert.doesNotMatch(tg.sent.at(-1).text, /muted one/);
  await say('/unmute whatsapp');
  await say('/pause');
  await bot.forward(store.add(normalize(note({ key: 'p', text: 'paused one' }))));
  assert.doesNotMatch(tg.sent.map((m) => m.text).join('\n'), /paused one/);
  await say('/resume');
  await bot.forward(store.add(normalize(note({ key: 'r', text: 'back again' }))));
  assert.match(tg.sent.at(-1).text, /back again/);
  assert.equal(store.stats().total, 4, 'muted and paused ones are still kept');
});

test('commands read what is kept; strangers and groups get nothing', async () => {
  const { store, tg, say } = setup();
  store.add(normalize(note()));
  store.add(normalize(note({ app: 'Gmail', package: 'com.google.android.gm', title: 'Invoice', text: 'Your invoice is ready', key: 'g' })));
  await say('/last 5 gmail');
  assert.match(tg.sent.at(-1).text, /Invoice/);
  assert.doesNotMatch(tg.sent.at(-1).text, /Sara/);
  await say('/search invoice');
  assert.match(tg.sent.at(-1).text, /Invoice/);
  await say('/today');
  assert.match(tg.sent.at(-1).text, /2 إشعار/);
  await say('/export');
  assert.match(tg.sent.at(-1).text, /\[document\] 2/);
  await say('/last', 99);
  assert.match(tg.sent.at(-1).text, /خاص/);
  await say('/last', 7, 'group');
  assert.match(tg.sent.at(-1).text, /خاص/);
});

test('CSV keeps commas, quotes and Arabic intact', () => {
  const csv = toCsv([{ ...normalize(note({ text: 'a, "b"\nمرحبا' })), postedAt: 0 }], 'UTC');
  assert.ok(csv.startsWith('﻿'));
  assert.ok(csv.includes('"a, ""b""\nمرحبا"'));
  assert.match(format(normalize(note()), 'UTC'), /Pixel 8/);
});

test('old notifications are pruned only when asked', () => {
  const store = new Store(':memory:');
  const now = Date.now();
  store.add(normalize(note({ postedAt: now - 40 * 86_400_000, key: 'old' })));
  store.add(normalize(note({ postedAt: now, key: 'new', text: 'new' })));
  assert.equal(store.prune(0), 0);
  assert.equal(store.prune(30, now), 1);
  assert.equal(store.search('meeting').length, 0, 'the search index forgets it too');
  assert.equal(store.stats().total, 1);
});
