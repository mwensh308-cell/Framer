// The loopback bridge between the agent's MCP server and the bot. The MCP server posts a question
// or a permission request and polls for its answer; the bot shows it on Telegram and answers it.
import http from 'node:http';
import crypto from 'node:crypto';

export class Bridge {
  /**
   * handlers: {
   *   ask(project, { id, question, choices }),            show it; answer later with resolve(id, text)
   *   approve(project, { id, tool_name, input }) → decision | null   null = shown, answer later
   *   notify(project, text)
   * }
   */
  constructor(handlers) {
    this.handlers = handlers;
    this.token = crypto.randomBytes(24).toString('hex');
    this.pending = new Map(); // id → { project, done, answer }
    this.server = http.createServer((req, res) => this.#route(req, res).catch((e) => send(res, 500, { error: e.message })));
  }

  listen() {
    return new Promise((resolve) => {
      this.server.listen(0, '127.0.0.1', () => {
        this.url = `http://127.0.0.1:${this.server.address().port}`;
        resolve(this.url);
      });
    });
  }

  close() {
    this.server.close();
  }

  /** Answers a waiting request. */
  resolve(id, answer) {
    const p = this.pending.get(id);
    if (!p || p.done) return false;
    Object.assign(p, { done: true, answer });
    // Kept a while so the MCP server's next poll reads it.
    setTimeout(() => this.pending.delete(id), 60_000).unref();
    return true;
  }

  /** Every waiting request of a project (a stopped run refuses them). */
  waiting(project) {
    return [...this.pending.entries()].filter(([, p]) => p.project === project && !p.done).map(([id, p]) => ({ id, ...p }));
  }

  async #route(req, res) {
    if (req.headers.authorization !== `Bearer ${this.token}`) return send(res, 401, { error: 'unauthorized' });
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname.startsWith('/answer/')) {
      const p = this.pending.get(decodeURIComponent(url.pathname.slice(8)));
      if (!p) return send(res, 404, { error: 'unknown request' });
      return send(res, 200, { done: p.done, answer: p.answer });
    }
    if (req.method !== 'POST') return send(res, 404, { error: 'not found' });
    const body = await readJson(req);
    const project = String(body.project || '');
    const id = crypto.randomUUID();
    if (url.pathname === '/ask') {
      this.pending.set(id, { project, kind: 'ask', done: false });
      await this.handlers.ask(project, { id, question: String(body.question || ''), choices: (body.choices || []).map(String) });
      return send(res, 200, { id });
    }
    if (url.pathname === '/approve') {
      this.pending.set(id, { project, kind: 'approve', done: false });
      const decision = await this.handlers.approve(project, { id, tool_name: String(body.tool_name || ''), input: body.input || {} });
      if (decision) {
        this.pending.delete(id);
        return send(res, 200, { decision });
      }
      return send(res, 200, { id });
    }
    if (url.pathname === '/notify') {
      await this.handlers.notify(project, String(body.text || ''));
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'not found' });
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1_000_000) req.destroy(new Error('too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
