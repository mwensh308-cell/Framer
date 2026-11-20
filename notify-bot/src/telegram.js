// A small Telegram Bot API client: long polling, messages and files.
import fs from 'node:fs/promises';
import path from 'node:path';

export const LIMIT = 4000;

/** Splits text into pieces Telegram accepts, at line breaks where it can. */
export function split(text, limit = LIMIT) {
  const parts = [];
  let rest = String(text ?? '');
  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n', limit);
    if (cut < limit / 2) cut = limit;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut).replace(/^\n/, '');
  }
  if (rest.length || !parts.length) parts.push(rest);
  return parts;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Telegram {
  constructor(token, base = 'https://api.telegram.org') {
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set.');
    this.url = `${base.replace(/\/$/, '')}/bot${token}`;
  }

  async call(method, params = {}, attempt = 0) {
    const res = await fetch(`${this.url}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) });
    const body = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
    if (body.ok) return body.result;
    if (res.status === 429 && body.parameters?.retry_after && attempt < 3) {
      await sleep(body.parameters.retry_after * 1000);
      return this.call(method, params, attempt + 1);
    }
    throw new Error(`Telegram ${method}: ${body.description || res.status}`);
  }

  async send(chatId, text, extra = {}) {
    let last;
    for (const part of split(text)) last = await this.call('sendMessage', { chat_id: chatId, text: part, disable_web_page_preview: true, ...extra });
    return last;
  }

  async sendDocument(chatId, file, caption) {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    if (caption) form.append('caption', caption.slice(0, 1000));
    form.append('document', new Blob([await fs.readFile(file)]), path.basename(file));
    const res = await fetch(`${this.url}/sendDocument`, { method: 'POST', body: form });
    const body = await res.json().catch(() => ({ ok: false }));
    if (!body.ok) throw new Error(`Telegram sendDocument: ${body.description || res.status}`);
    return body.result;
  }

  async *updates(signal) {
    let offset = 0;
    while (!signal?.aborted) {
      let batch = [];
      try {
        batch = await this.call('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
      } catch (e) {
        console.error(e.message);
        await sleep(3000);
      }
      for (const u of batch) {
        offset = u.update_id + 1;
        yield u;
      }
    }
  }
}
