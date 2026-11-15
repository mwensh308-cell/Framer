// News aggregator: polls RSS/Atom feeds from major outlets, keeps items about Egyptian
// football, dedupes them, stores headline + excerpt + link (never the full article),
// and pushes every new item to connected browsers over Server-Sent Events.

import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { XMLParser } from 'fast-xml-parser';
import { all, get, run, audit } from './db.js';

export const newsBus = new EventEmitter();
newsBus.setMaxListeners(0);

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#text' });

const text = (v) => (v == null ? '' : typeof v === 'object' ? (v['#text'] ?? '') : String(v));
const strip = (html) => text(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const toArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Normalises RSS 2.0 and Atom into { url, title, excerpt, image, publishedAt }. */
export function parseFeed(xml) {
  const doc = parser.parse(xml);
  const rssItems = toArray(doc?.rss?.channel?.item);
  const atomItems = toArray(doc?.feed?.entry);

  const fromRss = rssItems.map((i) => ({
    url: text(i.link) || text(i.guid),
    title: strip(i.title),
    excerpt: strip(i.description).slice(0, 400),
    image: i['media:thumbnail']?.['@url'] || i['media:content']?.['@url'] || i.enclosure?.['@url'] || null,
    publishedAt: i.pubDate ? new Date(text(i.pubDate)) : new Date(),
  }));
  const fromAtom = atomItems.map((e) => {
    const link = toArray(e.link).find((l) => !l['@rel'] || l['@rel'] === 'alternate') || {};
    return {
      url: link['@href'] || text(e.id),
      title: strip(e.title),
      excerpt: strip(e.summary || e.content).slice(0, 400),
      image: null,
      publishedAt: new Date(text(e.updated || e.published) || Date.now()),
    };
  });
  return [...fromRss, ...fromAtom].filter((i) => i.url && i.title);
}

export function matchesTerms(item, terms) {
  if (!terms) return true;
  const hay = `${item.title} ${item.excerpt}`.toLowerCase();
  return terms.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).some((t) => hay.includes(t));
}

const hashUrl = (url) => createHash('sha1').update(url.replace(/[?#].*$/, '').toLowerCase()).digest('hex');

/** Inserts items that are new; returns the inserted rows. */
export function ingest(source, items) {
  const inserted = [];
  for (const item of items) {
    if (!matchesTerms(item, source.filter_terms)) continue;
    const date = isNaN(item.publishedAt) ? new Date() : item.publishedAt;
    const res = run(
      `INSERT OR IGNORE INTO news (source_id, guid_hash, url, title, excerpt, image_url, language, published_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      source.id, hashUrl(item.url), item.url, item.title, item.excerpt, item.image, source.language, date.toISOString(),
    );
    if (res.changes) inserted.push(get(NEWS_SELECT + ' WHERE n.id = ?', res.lastInsertRowid));
  }
  if (inserted.length) {
    run('UPDATE news_sources SET items_ingested = items_ingested + ? WHERE id = ?', inserted.length, source.id);
  }
  return inserted;
}

export const NEWS_SELECT = `SELECT n.id, n.url, n.title, n.excerpt, n.body, n.image_url, n.language, n.tags,
  n.published_at, n.pinned, n.status, s.name AS source_name, s.site_url AS source_site
  FROM news n LEFT JOIN news_sources s ON s.id = n.source_id`;

/** Fetches one source with conditional-GET headers so unchanged feeds cost almost nothing. */
export async function pollSource(source, { fetchImpl = fetch } = {}) {
  const headers = { 'User-Agent': 'PharaohsArchiveBot/0.1 (+news aggregator)' };
  if (source.etag) headers['If-None-Match'] = source.etag;
  if (source.last_modified) headers['If-Modified-Since'] = source.last_modified;

  let status = 'ok', error = null, inserted = [];
  try {
    const res = await fetchImpl(source.feed_url, { headers, signal: AbortSignal.timeout(15_000) });
    if (res.status === 304) {
      status = 'not-modified';
    } else if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    } else {
      inserted = ingest(source, parseFeed(await res.text()));
      run('UPDATE news_sources SET etag = ?, last_modified = ? WHERE id = ?',
        res.headers.get('etag'), res.headers.get('last-modified'), source.id);
    }
  } catch (err) {
    status = 'error';
    error = err.message;
  }
  run(`UPDATE news_sources SET last_polled_at = datetime('now'), last_status = ?, last_error = ? WHERE id = ?`,
    status, error, source.id);

  for (const item of inserted) newsBus.emit('news', item);
  if (inserted.length) audit(null, 'poll', 'news_sources', source.id, `${source.name}: ${inserted.length} new item(s)`);
  return { source: source.name, status, error, inserted: inserted.length };
}

/** Polls every enabled source whose interval has elapsed. */
export async function pollDue({ force = false } = {}) {
  const sources = all(`SELECT * FROM news_sources WHERE enabled = 1 ${force ? '' : `AND (last_polled_at IS NULL
    OR datetime(last_polled_at, '+' || poll_minutes || ' minutes') <= datetime('now'))`}`);
  return Promise.all(sources.map((s) => pollSource(s)));
}

let timer;
export function startScheduler(intervalMs = 60_000) {
  const tick = () => pollDue().catch((e) => console.error('[news] poll failed', e));
  tick();
  timer = setInterval(tick, intervalMs);
  timer.unref();
}
export const stopScheduler = () => clearInterval(timer);
