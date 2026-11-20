// A small Telegram Bot API client: long polling, messages, edits, buttons and files.
import fs from 'node:fs/promises';
import path from 'node:path';

export const LIMIT = 4000; // Telegram allows 4096 characters per message.

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
    const res = await fetch(`${this.url}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    });
    return this.#answer(res, method, attempt, () => this.call(method, params, attempt + 1));
  }

  async upload(method, fields, fileField, filePath, attempt = 0) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) form.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    form.append(fileField, new Blob([await fs.readFile(filePath)]), path.basename(filePath));
    const res = await fetch(`${this.url}/${method}`, { method: 'POST', body: form });
    return this.#answer(res, method, attempt, () => this.upload(method, fields, fileField, filePath, attempt + 1));
  }

  async #answer(res, method, attempt, retry) {
    const body = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
    if (body.ok) return body.result;
    const wait = body.parameters?.retry_after;
    if (res.status === 429 && wait && attempt < 3) {
      await sleep(wait * 1000);
      return retry();
    }
    const err = new Error(`Telegram ${method}: ${body.description || res.status}`);
    err.description = body.description || '';
    throw err;
  }

  async send(chatId, text, extra = {}) {
    let last;
    for (const part of split(text)) last = await this.call('sendMessage', { chat_id: chatId, text: part, ...extra });
    return last;
  }

  async edit(chatId, messageId, text, extra = {}) {
    try {
      return await this.call('editMessageText', { chat_id: chatId, message_id: messageId, text: split(text).at(-1), ...extra });
    } catch (e) {
      if (/not modified/i.test(e.description)) return null;
      throw e;
    }
  }

  answerCallback(id, text) {
    return this.call('answerCallbackQuery', { callback_query_id: id, text }).catch(() => null);
  }

  sendPhoto(chatId, file, caption) {
    return this.upload('sendPhoto', { chat_id: chatId, caption: caption?.slice(0, 1000) }, 'photo', file);
  }

  sendDocument(chatId, file, caption) {
    return this.upload('sendDocument', { chat_id: chatId, caption: caption?.slice(0, 1000) }, 'document', file);
  }

  /** Yields updates until `signal` aborts. */
  async *updates(signal) {
    let offset = 0;
    while (!signal?.aborted) {
      let batch = [];
      try {
        batch = await this.call('getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'callback_query'] });
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

/** One message that shows a run's progress, edited at most every few seconds. */
export class ProgressMessage {
  constructor(tg, chatId, every = 2500) {
    Object.assign(this, { tg, chatId, every, id: null, text: '', timer: null, last: 0, chain: Promise.resolve() });
  }

  set(text) {
    this.text = text;
    const wait = Math.max(0, this.every - (Date.now() - this.last));
    if (!this.timer) this.timer = setTimeout(() => this.flush(), wait);
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    this.last = Date.now();
    const text = this.text;
    this.chain = this.chain.then(async () => {
      try {
        if (this.id == null) this.id = (await this.tg.send(this.chatId, text)).message_id;
        else await this.tg.edit(this.chatId, this.id, text);
      } catch (e) {
        console.error('progress:', e.message);
      }
    });
    return this.chain;
  }
}
