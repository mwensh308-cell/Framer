// The Telegram side: forwards each stored notification to the owners (unless paused or muted) and
// answers commands to read, search, count and export what's kept.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const HELP = `📱 بوت إشعارات الهاتف

كل إشعار يصل من هاتفك يُحفظ هنا ويُرسل لك.

/last [عدد] [تطبيق] — آخر الإشعارات (مثال: /last 20 whatsapp)
/search <كلمات> — بحث في كل الإشعارات المحفوظة
/today — إشعارات اليوم حسب التطبيق
/apps — أكثر التطبيقات إرسالًا (آخر 7 أيام)
/mute <تطبيق> — لا ترسل إشعاراته (تبقى محفوظة)
/unmute <تطبيق> — أعد إرسالها
/muted — التطبيقات المكتومة
/pause — أوقف الإرسال كله (الحفظ مستمر)
/resume — أعد الإرسال
/export [أيام] — ملف CSV بالإشعارات
/stats — إحصاءات
/id — رقمك في تيليجرام`;

export function formatTime(ms, timeZone) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));
}

export function format(n, timeZone, { full = true } = {}) {
  const text = full ? n.text : n.text.length > 300 ? `${n.text.slice(0, 300)}…` : n.text;
  return [`📱 ${n.app}${n.subText ? ` · ${n.subText}` : ''}`, n.title && `▪️ ${n.title}`, text, `🕒 ${formatTime(n.postedAt, timeZone)}${n.device !== 'phone' ? ` · ${n.device}` : ''}`]
    .filter(Boolean)
    .join('\n');
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function toCsv(rows, timeZone) {
  const head = ['time', 'app', 'package', 'title', 'text', 'sub_text', 'category', 'device'];
  const lines = rows.map((n) => [formatTime(n.postedAt, timeZone), n.app, n.package, n.title, n.text, n.subText, n.category, n.device].map(csvCell).join(','));
  // A byte-order mark so spreadsheet programs read Arabic correctly.
  return `﻿${head.join(',')}\n${lines.join('\n')}\n`;
}

function startOfToday(timeZone, now = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }).formatToParts(new Date(now)).map((p) => [p.type, Number(p.value)]));
  return now - ((parts.hour % 24) * 3600 + parts.minute * 60 + parts.second) * 1000 - (now % 1000);
}

export function createBot({ cfg, tg, store }) {
  const owners = new Set(cfg.owners.map(String));
  const tz = cfg.timeZone;
  const muted = () => new Set(store.setting('muted', []));
  const paused = () => store.setting('paused', false);

  function isMuted(n) {
    const m = muted();
    return m.has(n.app.toLowerCase()) || m.has(n.package.toLowerCase());
  }

  /** Sends a newly stored notification to every owner. */
  async function forward(n) {
    if (paused() || isMuted(n)) return;
    for (const chat of owners) await tg.send(chat, format(n, tz));
  }

  const listOf = (rows, empty) => (rows.length ? rows.map((n) => format(n, tz, { full: false })).join('\n\n— — —\n\n') : empty);

  async function command(chat, text) {
    const m = text.match(/^\/(\w+)(?:@\w+)?\s*([\s\S]*)$/);
    if (!m) return tg.send(chat, 'اكتب /search ثم كلماتك للبحث، أو /help.');
    const [, name, rest] = m;
    const arg = rest.trim();
    switch (name) {
      case 'start':
      case 'help':
        return tg.send(chat, HELP);
      case 'id':
        return tg.send(chat, `رقمك: ${chat}`);
      case 'last': {
        const [first, ...more] = arg.split(/\s+/).filter(Boolean);
        const count = Math.min(Number(first) > 0 ? Number(first) : 10, 50);
        const app = Number(first) > 0 ? more.join(' ') : arg;
        return tg.send(chat, listOf(store.last(count, app).reverse(), 'لا توجد إشعارات بعد.'));
      }
      case 'search':
        if (!arg) return tg.send(chat, 'اكتب كلمات البحث بعد /search.');
        return tg.send(chat, listOf(store.search(arg, 20).reverse(), `لم أجد شيئًا عن "${arg}".`));
      case 'today': {
        const rows = store.apps(startOfToday(tz));
        const total = rows.reduce((a, r) => a + r.count, 0);
        return tg.send(chat, total ? `📊 اليوم: ${total} إشعار\n${rows.map((r) => `• ${r.app}: ${r.count}`).join('\n')}` : 'لا إشعارات اليوم.');
      }
      case 'apps': {
        const rows = store.apps(Date.now() - 7 * 86_400_000).slice(0, 30);
        return tg.send(chat, rows.length ? `📊 آخر 7 أيام:\n${rows.map((r) => `• ${r.app}: ${r.count}`).join('\n')}` : 'لا إشعارات في آخر 7 أيام.');
      }
      case 'mute':
      case 'unmute': {
        if (!arg) return tg.send(chat, `اكتب اسم التطبيق أو الحزمة بعد /${name}.`);
        const set = muted();
        if (name === 'mute') set.add(arg.toLowerCase());
        else set.delete(arg.toLowerCase());
        store.setSetting('muted', [...set]);
        return tg.send(chat, name === 'mute' ? `🔕 لن أرسل إشعارات ${arg} (ستبقى محفوظة).` : `🔔 عادت إشعارات ${arg}.`);
      }
      case 'muted': {
        const set = [...muted()];
        return tg.send(chat, set.length ? `🔕 مكتوم:\n${set.map((a) => `• ${a}`).join('\n')}` : 'لا شيء مكتوم.');
      }
      case 'pause':
        store.setSetting('paused', true);
        return tg.send(chat, '⏸️ أوقفت الإرسال. الإشعارات ما زالت تُحفظ. /resume للعودة.');
      case 'resume':
        store.setSetting('paused', false);
        return tg.send(chat, '▶️ عاد الإرسال.');
      case 'stats': {
        const s = store.stats();
        if (!s.total) return tg.send(chat, 'لا إشعارات محفوظة بعد.');
        return tg.send(chat, `📦 ${s.total} إشعار من ${s.apps} تطبيق و${s.devices} جهاز\nمن ${formatTime(s.first, tz)} إلى ${formatTime(s.last, tz)}${paused() ? '\n⏸️ الإرسال متوقف' : ''}${cfg.keepDays ? `\n🗓️ تُحذف بعد ${cfg.keepDays} يوم` : ''}`);
      }
      case 'export': {
        const days = Number(arg) > 0 ? Number(arg) : 0;
        const rows = store.since(days ? Date.now() - days * 86_400_000 : 0);
        if (!rows.length) return tg.send(chat, 'لا إشعارات للتصدير.');
        const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'notify-')), `notifications${days ? `-${days}d` : ''}.csv`);
        fs.writeFileSync(file, toCsv(rows, tz));
        try {
          await tg.sendDocument(chat, file, `${rows.length} إشعار`);
        } finally {
          fs.rmSync(path.dirname(file), { recursive: true, force: true });
        }
        return null;
      }
      default:
        return tg.send(chat, 'أمر غير معروف. /help');
    }
  }

  async function onUpdate(u) {
    const msg = u.message;
    if (!msg?.text) return null;
    const chat = String(msg.chat.id);
    // The notifications are private: only an owner, in a private chat with the bot, reads them.
    if (!owners.has(String(msg.from?.id)) || msg.chat.type !== 'private') {
      return tg.send(chat, `هذا البوت خاص. رقمك هو ${msg.from?.id}؛ ليستخدمه، يضيفه المالك إلى OWNERS.`);
    }
    return command(chat, msg.text);
  }

  return { forward, onUpdate, command };
}
