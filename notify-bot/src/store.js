// Notifications in SQLite (node:sqlite), with an FTS5 index over app, title and text.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const LIMITS = { device: 100, package: 200, app: 200, title: 1000, text: 8000, subText: 500, category: 50, key: 500 };
const DUPLICATE_WINDOW_MS = 2 * 60_000; // Android re-posts the same notification when it updates.

/** Cleans one notification from the phone; null when it says nothing. */
export function normalize(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return null;
  const s = (k) => (raw[k] == null ? '' : String(raw[k]).slice(0, LIMITS[k]).trim());
  const n = {
    device: s('device') || 'phone',
    package: s('package'),
    app: s('app') || s('package') || 'unknown',
    title: s('title'),
    text: s('text'),
    subText: s('subText'),
    category: s('category'),
    key: s('key'),
    postedAt: Number.isFinite(Number(raw.postedAt)) && Number(raw.postedAt) > 0 ? Math.min(Number(raw.postedAt), now + 60_000) : now,
  };
  return n.title || n.text ? n : null;
}

/** A search the person typed, as an FTS5 query: every word must appear (as a prefix). */
export function ftsQuery(q) {
  const words = String(q).match(/[\p{L}\p{N}_]+/gu) || [];
  return words.slice(0, 10).map((w) => `"${w}"*`).join(' ');
}

export class Store {
  constructor(file) {
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY,
        device TEXT NOT NULL, package TEXT NOT NULL, app TEXT NOT NULL,
        title TEXT NOT NULL, text TEXT NOT NULL, sub_text TEXT NOT NULL, category TEXT NOT NULL,
        key TEXT NOT NULL, posted_at INTEGER NOT NULL, received_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS notifications_posted ON notifications(posted_at);
      CREATE INDEX IF NOT EXISTS notifications_app ON notifications(app, posted_at);
      CREATE VIRTUAL TABLE IF NOT EXISTS notifications_fts USING fts5(
        app, title, text, content='notifications', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
      );
      CREATE TRIGGER IF NOT EXISTS notifications_ai AFTER INSERT ON notifications BEGIN
        INSERT INTO notifications_fts(rowid, app, title, text) VALUES (new.id, new.app, new.title, new.text);
      END;
      CREATE TRIGGER IF NOT EXISTS notifications_ad AFTER DELETE ON notifications BEGIN
        INSERT INTO notifications_fts(notifications_fts, rowid, app, title, text) VALUES ('delete', old.id, old.app, old.title, old.text);
      END;
      CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    this.q = {
      dup: this.db.prepare(
        `SELECT id FROM notifications WHERE device = ? AND package = ? AND title = ? AND text = ? AND (key = ? OR key = '') AND posted_at > ? LIMIT 1`,
      ),
      add: this.db.prepare(
        `INSERT INTO notifications (device, package, app, title, text, sub_text, category, key, posted_at, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ),
      get: this.db.prepare(`SELECT * FROM notifications WHERE id = ?`),
      getSetting: this.db.prepare(`SELECT value FROM settings WHERE name = ?`),
      setSetting: this.db.prepare(`INSERT INTO settings (name, value) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value`),
    };
  }

  close() {
    this.db.close();
  }

  /** Stores a notification; null when it repeats one just stored. */
  add(n, now = Date.now()) {
    if (this.q.dup.get(n.device, n.package, n.title, n.text, n.key, n.postedAt - DUPLICATE_WINDOW_MS)) return null;
    const { lastInsertRowid } = this.q.add.run(n.device, n.package, n.app, n.title, n.text, n.subText, n.category, n.key, n.postedAt, now);
    return this.get(Number(lastInsertRowid));
  }

  get(id) {
    return row(this.q.get.get(id));
  }

  /** The newest notifications, optionally of one app (matched by name or package, any case). */
  last(limit = 10, app = '') {
    const sql = app
      ? `SELECT * FROM notifications WHERE app LIKE ? OR package LIKE ? ORDER BY posted_at DESC, id DESC LIMIT ?`
      : `SELECT * FROM notifications ORDER BY posted_at DESC, id DESC LIMIT ?`;
    const args = app ? [`%${app}%`, `%${app}%`, limit] : [limit];
    return this.db.prepare(sql).all(...args).map(row);
  }

  search(q, limit = 10) {
    const fts = ftsQuery(q);
    if (!fts) return [];
    return this.db
      .prepare(
        `SELECT n.* FROM notifications_fts f JOIN notifications n ON n.id = f.rowid WHERE notifications_fts MATCH ? ORDER BY n.posted_at DESC LIMIT ?`,
      )
      .all(fts, limit)
      .map(row);
  }

  /** Notifications per app since `since` (ms), most first. */
  apps(since = 0) {
    return this.db.prepare(`SELECT app, COUNT(*) AS count FROM notifications WHERE posted_at >= ? GROUP BY app ORDER BY count DESC`).all(since);
  }

  stats() {
    const r = this.db.prepare(`SELECT COUNT(*) AS total, MIN(posted_at) AS first, MAX(posted_at) AS last, COUNT(DISTINCT app) AS apps, COUNT(DISTINCT device) AS devices FROM notifications`).get();
    return { ...r };
  }

  since(since = 0) {
    return this.db.prepare(`SELECT * FROM notifications WHERE posted_at >= ? ORDER BY posted_at`).all(since).map(row);
  }

  /** Deletes notifications older than `days`; returns how many. */
  prune(days, now = Date.now()) {
    if (!days) return 0;
    return Number(this.db.prepare(`DELETE FROM notifications WHERE posted_at < ?`).run(now - days * 86_400_000).changes);
  }

  setting(name, fallback) {
    const r = this.q.getSetting.get(name);
    return r ? JSON.parse(r.value) : fallback;
  }

  setSetting(name, value) {
    this.q.setSetting.run(name, JSON.stringify(value));
  }
}

function row(r) {
  if (!r) return null;
  return {
    id: r.id,
    device: r.device,
    package: r.package,
    app: r.app,
    title: r.title,
    text: r.text,
    subText: r.sub_text,
    category: r.category,
    key: r.key,
    postedAt: r.posted_at,
    receivedAt: r.received_at,
  };
}
