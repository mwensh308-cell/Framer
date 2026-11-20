// One project per chat: app/ (what the builder writes), capture/ (what was studied), checks/
// (each round's screenshots) and state.json (the request, the agent's session, the checks).
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const SKIP = new Set(['node_modules', 'dist', 'build', 'out', '.git', 'target', '.next', '.cache']);

export class Project {
  constructor(dataDir, id) {
    this.id = String(id);
    this.root = path.join(dataDir, this.id);
    this.app = path.join(this.root, 'app');
    this.captureDir = path.join(this.root, 'capture');
    this.checksDir = path.join(this.root, 'checks');
    this.stateFile = path.join(this.root, 'state.json');
    this.state = this.#load();
  }

  #load() {
    try {
      return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    } catch {
      return null;
    }
  }

  exists() {
    return !!this.state;
  }

  save() {
    fs.mkdirSync(this.root, { recursive: true });
    fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  /** Starts over with a new request. */
  async reset({ request, target, kind, stack }) {
    await fsp.rm(this.root, { recursive: true, force: true });
    for (const d of [this.app, this.captureDir, this.checksDir]) await fsp.mkdir(d, { recursive: true });
    this.state = { request, target, kind, stack, sessionId: null, studied: false, checks: [], lastReply: '', status: 'new', createdAt: new Date().toISOString() };
    this.save();
  }

  appIsEmpty() {
    try {
      return fs.readdirSync(this.app).filter((f) => !f.startsWith('.')).length === 0;
    } catch {
      return true;
    }
  }

  /** A fingerprint of what the builder wrote, to tell a turn that changed nothing. */
  fingerprint() {
    const h = crypto.createHash('sha256');
    const walk = (dir, depth) => {
      if (depth > 12) return;
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
      } catch {
        return;
      }
      for (const e of entries) {
        if (SKIP.has(e.name)) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, depth + 1);
        else if (e.isFile()) {
          const s = fs.statSync(p);
          h.update(`${path.relative(this.app, p)}\0${s.size}\0${s.mtimeMs}\n`);
        }
      }
    };
    walk(this.app, 0);
    return h.digest('hex');
  }
}
