#!/usr/bin/env node
// The Telegram bot: one project per chat. Send a link and/or a request; the bot studies the
// original, has a coding agent build it, checks the build, refines it, and sends the result.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { adapterFor } from './adapters.js';
import { Bridge } from './bridge.js';
import { loadConfig, loadEnvFile } from './config.js';
import { choose, kindById, URL_RE } from './kinds.js';
import { decide } from './policy.js';
import { Project } from './project.js';
import { RebuildRun } from './rebuild.js';
import { ProgressMessage, Telegram } from './telegram.js';

const MCP_SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'mcp-server.js');

export const HELP = `🛠️ أرسل رابط موقع و/أو وصفًا لما تريد بناءه، مثل:
• https://example.com انسخ هذا الموقع بـ React
• اصنع لعبة ثعبان بسيطة
• صفحة هبوط لمقهى باللون الأخضر

سأدرس الأصل، ثم يبني الوكيل نسخة جديدة، ثم أفحصها وأقارنها بالأصل وأطلب التحسين حتى تصبح قريبة بما يكفي.

الأوامر:
/new <طلب> — مشروع جديد (يمسح السابق)
/status — حالة المشروع
/stop — إيقاف العمل الجاري
/check — فحص البناء الحالي فقط
/preview — آخر لقطات للبناء
/download — تنزيل مجلد app/ مضغوطًا
/reset — حذف المشروع
/id — رقمك في تيليجرام

أثناء العمل: أي رسالة ترسلها تصل للوكيل بعد خطوته الحالية.
بعد الانتهاء: أي رسالة = طلب تعديل على البناء نفسه.`;

const STATUS_AR = { new: 'جديد', working: 'قيد العمل', ready: 'جاهز', failed: 'فشل', paused: 'متوقف' };

function describe(e, root) {
  const rel = (f) => (f ? path.relative(root, path.resolve(root, f)) : '');
  const i = e.input || {};
  switch (e.name) {
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
      return `✏️ ${rel(i.file_path)}`;
    case 'Read':
      return `👀 ${rel(i.file_path)}`;
    case 'Bash':
      return `⌨️ ${String(i.command || '').slice(0, 90)}`;
    case 'Glob':
    case 'Grep':
      return `🔎 ${i.pattern || ''}`;
    case 'TodoWrite':
      return `📋 ${(i.todos || []).filter((t) => t.status === 'completed').length}/${(i.todos || []).length} من الخطة`;
    default:
      return e.name?.startsWith('mcp__telegram__') ? null : `🔧 ${e.name}`;
  }
}

export function createBot({ cfg, tg, bridge }) {
  const runs = new Map(); // chat → RebuildRun
  const queue = []; // [chat, start]
  const asks = new Map(); // request id → { chat, choices, kind }
  const typedAnswer = new Map(); // chat → request id waiting for a typed answer
  let active = 0;

  const project = (chat) => new Project(cfg.dataDir, chat);
  const allowed = (from) => from && cfg.allowedUsers.has(String(from.id));

  // —— the agent's questions and permission requests, from the bridge ——
  bridge.handlers = {
    async ask(chat, { id, question, choices }) {
      asks.set(id, { chat, choices, kind: 'ask' });
      typedAnswer.set(chat, id);
      const keyboard = choices.map((c, i) => [{ text: c.slice(0, 60), callback_data: `a|${id}|${i}` }]);
      await tg.send(chat, `❓ ${question}\n\n(اختر أو اكتب إجابتك)`, { reply_markup: { inline_keyboard: keyboard } });
    },
    async approve(chat, { id, tool_name, input }) {
      const p = project(chat);
      const d = decide(tool_name, input, { root: p.root, app: p.app });
      if (!d.ask) return d;
      asks.set(id, { chat, kind: 'approve' });
      await tg.send(chat, `🔐 الوكيل يطلب إذنًا:\n${d.summary}`, {
        reply_markup: { inline_keyboard: [[{ text: '✅ اسمح', callback_data: `p|${id}|1` }, { text: '❌ ارفض', callback_data: `p|${id}|0` }]] },
      });
      return null;
    },
    async notify(chat, text) {
      await tg.send(chat, `📣 ${text}`);
    },
  };

  function answer(id, value) {
    const a = asks.get(id);
    if (!a) return false;
    asks.delete(id);
    if (typedAnswer.get(a.chat) === id) typedAnswer.delete(a.chat);
    return bridge.resolve(id, value);
  }

  function refuseWaiting(chat) {
    for (const w of bridge.waiting(chat)) answer(w.id, w.kind === 'approve' ? { allow: false, message: 'The run was stopped.' } : 'The person stopped the run.');
  }

  // —— runs ——
  function startRun(chat, opts) {
    const begin = () => {
      active += 1;
      const p = project(chat);
      const adapter = adapterFor(cfg.agent);
      const run = new RebuildRun(p, {
        adapter,
        program: cfg.agentProgram || adapter.program,
        extra: cfg.agentArgs,
        model: cfg.model,
        mcp: { command: process.execPath, args: [MCP_SERVER, '--bridge', bridge.url, '--token', bridge.token, '--project', String(chat)] },
        maxRounds: cfg.maxRounds,
        goodEnough: cfg.goodEnough,
        widths: cfg.widths,
        turnTimeoutMs: cfg.turnTimeoutMs,
        ...opts,
      });
      runs.set(chat, run);
      const progress = new ProgressMessage(tg, chat);
      const lines = [];
      let header = '⏳ يبدأ…';
      const show = () => progress.set([header, ...lines.slice(-8)].join('\n'));
      run.on('step', (t) => {
        header = `⏳ ${t}`;
        show();
      });
      run.on('agent', (e) => {
        const line = e.type === 'tool' ? describe(e, p.root) : e.type === 'error' ? `⚠️ ${e.message.slice(0, 200)}` : null;
        if (line) {
          lines.push(line);
          show();
        }
      });
      run.on('checked', (c) => tg.send(chat, `🔍 فحص ${c.round}: ${c.passed ? '✅' : '❌'} ${c.note.slice(0, 1500)}`).catch(() => null));
      run.on('reply', (text) => tg.send(chat, `🤖 ${text}`).catch(() => null));
      run.on('finished', async ({ ok, paused, message, check }) => {
        // The run is over now: a message sent from here on is a new request, not a note.
        runs.delete(chat);
        header = ok ? '✅ انتهى' : paused ? '⏸️ توقف' : '❌ توقف بخطأ';
        show();
        await progress.flush();
        refuseWaiting(chat);
        try {
          if (ok) {
            await tg.send(chat, `✅ جاهز.\n${message}\n\nأرسل أي تعديل تريده، أو /download لتنزيل الملفات.`);
            await sendShots(chat, check);
          } else if (!paused) {
            await tg.send(chat, `❌ ${message}\n\nأرسل طلب إصلاح، أو أعد المحاولة برسالة "حاول مجددًا".`);
          } else {
            await tg.send(chat, '⏸️ أوقفت العمل. أرسل رسالة للمتابعة من حيث توقف.');
          }
        } catch (e) {
          console.error(e.message);
        }
        active -= 1;
        const next = queue.shift();
        if (next) next();
      });
      run.start();
    };
    if (active >= cfg.maxRuns) {
      queue.push(begin);
      return tg.send(chat, `🕒 في الانتظار: أمامك ${queue.length - 1} مشروع.`);
    }
    begin();
    return null;
  }

  async function sendShots(chat, check) {
    const shots = (check?.shots || []).filter((f) => fs.existsSync(f));
    for (const f of shots.slice(0, 2)) await tg.sendPhoto(chat, f, `البناء — ${path.basename(f, '.png').replace('screenshot-', '')}px`).catch((e) => tg.send(chat, `(لم أستطع إرسال الصورة: ${e.message})`));
  }

  async function newProject(chat, text) {
    if (runs.has(chat)) return tg.send(chat, 'هناك عمل جارٍ. أوقفه أولًا بـ /stop.');
    const request = text.trim();
    if (!request) return tg.send(chat, 'اكتب ما تريد بناءه بعد /new.');
    const target = request.match(URL_RE)?.[0]?.replace(/[).,]+$/, '') || null;
    const { kind, stack } = choose(request, target);
    await project(chat).reset({ request, target, kind: kind.id, stack });
    await tg.send(chat, `🆕 مشروع جديد: ${kind.label}${target ? ` على غرار ${target}` : ''}\nالتقنية: ${stack}`);
    return startRun(chat, {});
  }

  async function onText(chat, text) {
    const cmd = text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);
    if (cmd) {
      const [, name, rest] = cmd;
      const p = project(chat);
      switch (name) {
        case 'start':
        case 'help':
          return tg.send(chat, HELP);
        case 'new':
          return newProject(chat, rest);
        case 'stop':
          if (!runs.has(chat)) return tg.send(chat, 'لا يوجد عمل جارٍ.');
          refuseWaiting(chat);
          runs.get(chat).stop();
          return tg.send(chat, '⏹️ جارٍ الإيقاف…');
        case 'status': {
          if (!p.exists()) return tg.send(chat, 'لا يوجد مشروع بعد. أرسل طلبك.');
          const s = p.state;
          const last = s.checks.at(-1);
          return tg.send(chat, `📁 ${kindById(s.kind).label} — ${STATUS_AR[s.status] || s.status}${runs.has(chat) ? ' (يعمل الآن)' : ''}\nالطلب: ${s.request}\nالتقنية: ${s.stack}\nالفحوصات: ${s.checks.length}${last ? `\nآخر فحص: ${last.passed ? '✅' : '❌'} ${last.note.slice(0, 500)}` : ''}`);
        }
        case 'check':
          if (!p.exists()) return tg.send(chat, 'لا يوجد مشروع بعد.');
          if (runs.has(chat)) return tg.send(chat, 'هناك عمل جارٍ.');
          return startRun(chat, { checkOnly: true });
        case 'preview':
          if (!p.exists() || !p.state.checks.length) return tg.send(chat, 'لا توجد لقطات بعد.');
          return sendShots(chat, [...p.state.checks].reverse().find((c) => c.shots?.length));
        case 'download':
          return download(chat, p);
        case 'reset':
          if (runs.has(chat)) return tg.send(chat, 'أوقف العمل الجاري أولًا بـ /stop.');
          fs.rmSync(p.root, { recursive: true, force: true });
          return tg.send(chat, '🗑️ حُذف المشروع.');
        case 'id':
          return tg.send(chat, `رقمك: ${chat}`);
        default:
          return tg.send(chat, 'أمر غير معروف. /help');
      }
    }
    // A question waiting for a typed answer takes the message.
    const waiting = typedAnswer.get(chat);
    if (waiting && asks.has(waiting)) {
      answer(waiting, text);
      return tg.send(chat, '👍 وصلت إجابتك للوكيل.');
    }
    const run = runs.get(chat);
    if (run) {
      run.addNote(text);
      return tg.send(chat, '📝 سأعطيها للوكيل بعد خطوته الحالية.');
    }
    const p = project(chat);
    if (!p.exists()) return newProject(chat, text);
    const again = /^(حاول مجددا|حاول مجددًا|أعد المحاولة|try again|retry)$/i.test(text.trim());
    return startRun(chat, again ? {} : { message: text });
  }

  async function download(chat, p) {
    if (!p.exists() || p.appIsEmpty()) return tg.send(chat, 'لا توجد ملفات بعد.');
    const file = path.join(p.root, `app-${Date.now()}.tar.gz`);
    const code = await new Promise((r) => spawn('tar', ['-czf', file, '--exclude=node_modules', '-C', p.root, 'app']).on('close', r).on('error', () => r(-1)));
    if (code !== 0) return tg.send(chat, 'لم أستطع ضغط الملفات.');
    try {
      await tg.sendDocument(chat, file, 'مجلد app/ (بدون node_modules)');
    } finally {
      fs.rmSync(file, { force: true });
    }
    return null;
  }

  async function onUpdate(u) {
    if (u.callback_query) {
      const q = u.callback_query;
      if (!allowed(q.from)) return tg.answerCallback(q.id, 'غير مسموح');
      const [type, id, value] = String(q.data || '').split('|');
      const a = asks.get(id);
      if (!a) return tg.answerCallback(q.id, 'انتهى هذا الطلب');
      if (type === 'a') {
        const choice = a.choices[Number(value)] ?? value;
        answer(id, choice);
        await tg.answerCallback(q.id, choice);
        return tg.edit(q.message.chat.id, q.message.message_id, `${q.message.text}\n\n← ${choice}`).catch(() => null);
      }
      if (type === 'p') {
        const yes = value === '1';
        answer(id, yes ? { allow: true } : { allow: false, message: 'The person refused this.' });
        await tg.answerCallback(q.id, yes ? 'سُمح' : 'رُفض');
        return tg.edit(q.message.chat.id, q.message.message_id, `${q.message.text}\n\n← ${yes ? '✅ سُمح' : '❌ رُفض'}`).catch(() => null);
      }
      return null;
    }
    const m = u.message;
    if (!m?.text) return null;
    const chat = String(m.chat.id);
    if (!allowed(m.from)) {
      return tg.send(chat, `هذا البوت خاص. رقمك هو ${m.from?.id}؛ ليستخدمه، يضيفه المالك إلى ALLOWED_USERS.`);
    }
    return onText(chat, m.text);
  }

  return { onUpdate, onText, runs, asks };
}

async function main() {
  loadEnvFile();
  const cfg = loadConfig();
  if (!cfg.token) {
    console.error('Set TELEGRAM_BOT_TOKEN (see .env.example).');
    process.exit(1);
  }
  if (!cfg.allowedUsers.size) console.warn('ALLOWED_USERS is empty: nobody can use the bot until you add your Telegram id.');
  fs.mkdirSync(cfg.dataDir, { recursive: true });
  const tg = new Telegram(cfg.token, cfg.apiBase);
  const bridge = new Bridge({});
  await bridge.listen();
  const bot = createBot({ cfg, tg, bridge });
  const me = await tg.call('getMe');
  console.log(`@${me.username} is running with ${cfg.agent}; projects in ${cfg.dataDir}`);
  const stop = new AbortController();
  process.on('SIGINT', () => {
    stop.abort();
    for (const r of bot.runs.values()) r.stop();
    bridge.close();
    setTimeout(() => process.exit(0), 1000);
  });
  for await (const u of tg.updates(stop.signal)) bot.onUpdate(u).catch((e) => console.error('update:', e));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
