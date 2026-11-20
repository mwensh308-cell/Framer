// The whole bot with a fake Telegram and a stand-in agent: a request becomes a project, the agent
// builds it, the check runs, the result is sent; a follow-up resumes the same session.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBot } from '../src/bot.js';
import { Bridge } from '../src/bridge.js';
import { loadConfig } from '../src/config.js';

const here = path.dirname(fileURLToPath(import.meta.url));

function fakeTelegram() {
  const sent = [];
  let id = 0;
  const waiters = [];
  const push = (m) => {
    sent.push(m);
    for (const w of [...waiters]) if (w.test(m)) waiters.splice(waiters.indexOf(w), 1) && w.resolve(m);
  };
  return {
    sent,
    until: (re, ms = 60_000) =>
      new Promise((resolve, reject) => {
        const found = sent.find((m) => re.test(m.text));
        if (found) return resolve(found);
        const t = setTimeout(() => reject(new Error(`timed out waiting for ${re}; sent:\n${sent.map((m) => m.text).join('\n---\n')}`)), ms);
        waiters.push({ test: (m) => re.test(m.text), resolve: (m) => (clearTimeout(t), resolve(m)) });
      }),
    async send(chat, text, extra) {
      push({ chat, text, extra });
      return { message_id: ++id };
    },
    async edit(chat, mid, text) {
      push({ chat, text, edit: true });
    },
    async sendPhoto(chat, file, caption) {
      push({ chat, text: `[photo] ${caption}`, file });
    },
    async sendDocument(chat, file, caption) {
      push({ chat, text: `[document] ${caption}`, file });
    },
    async answerCallback() {},
  };
}

async function setup(env = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctb-'));
  const cfg = loadConfig({
    ALLOWED_USERS: '7',
    AGENT: 'claude-code',
    AGENT_PROGRAM: path.join(here, 'fixtures/fake-agent.js'),
    DATA_DIR: dataDir,
    MAX_ROUNDS: '2',
    ...env,
  });
  const tg = fakeTelegram();
  const bridge = new Bridge({});
  await bridge.listen();
  const bot = createBot({ cfg, tg, bridge });
  const msg = (text, from = 7) => bot.onUpdate({ message: { chat: { id: 7 }, from: { id: from }, text } });
  return { cfg, tg, bridge, bot, msg, dataDir };
}

test('strangers are told their id and nothing runs', async () => {
  const { tg, msg, bridge, dataDir } = await setup();
  await msg('build me a site', 99);
  assert.match(tg.sent[0].text, /99/);
  assert.equal(fs.readdirSync(dataDir).length, 0);
  bridge.close();
});

test('a request is built, checked and sent; a follow-up resumes the session', async () => {
  const { tg, msg, bridge, dataDir } = await setup();
  try {
    await msg('اصنع صفحة ترحيب بسيطة بـ html');
    await tg.until(/✅ جاهز/);
    const state = JSON.parse(fs.readFileSync(path.join(dataDir, '7', 'state.json'), 'utf8'));
    assert.equal(state.kind, 'website');
    assert.equal(state.stack, 'Static HTML');
    assert.equal(state.sessionId, 'fake-session-1');
    assert.ok(state.checks.at(-1).passed, state.checks.at(-1).note);
    assert.ok(tg.sent.some((m) => /🔍 فحص 1: ✅/.test(m.text)));
    assert.ok(tg.sent.some((m) => /🤖 I built a small page/.test(m.text)));

    tg.sent.length = 0;
    await msg('اجعل العنوان أكبر');
    await tg.until(/✅ جاهز/);
    const prompts = fs.readFileSync(path.join(dataDir, '7', 'prompts.log'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(prompts.at(-1).resume, 'fake-session-1');
    assert.match(prompts.at(-1).prompt, /اجعل العنوان أكبر/);
    assert.match(prompts[0].prompt, /Build the website the request describes/);
  } finally {
    bridge.close();
  }
});

test('a builder that writes nothing is stopped rather than looping', async () => {
  const { tg, msg, bridge } = await setup();
  process.env.FAKE_AGENT_MODE = 'nothing';
  try {
    await msg('a CLI tool in Go');
    const end = await tg.until(/^❌ The build/);
    assert.match(end.text, /changed nothing|hasn't worked/);
    assert.ok(tg.sent.some((m) => /app\/ is empty/.test(m.text)));
  } finally {
    delete process.env.FAKE_AGENT_MODE;
    bridge.close();
  }
});

test("the agent's failure reaches the person", async () => {
  const { tg, msg, bridge } = await setup();
  process.env.FAKE_AGENT_MODE = 'fail';
  try {
    await msg('a todo app');
    await tg.until(/❌ Credit balance is too low/);
  } finally {
    delete process.env.FAKE_AGENT_MODE;
    bridge.close();
  }
});
