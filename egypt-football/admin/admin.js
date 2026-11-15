// Archive Admin — content management, user management and update monitoring.
// Hash router; every form is generated from the SCHEMA config below.

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let me = null;

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api/admin' + path, {
    method, credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(method !== 'GET' && method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : method === 'POST' ? '{}' : undefined,
  });
  if (res.status === 401 && path !== '/login') { me = null; renderLogin(); throw new Error('Signed out'); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (toastEl.hidden = true), 3000); }
const can = (role) => ({ viewer: 1, editor: 2, admin: 3 }[me?.role] >= { viewer: 1, editor: 2, admin: 3 }[role]);
const when = (iso) => (iso ? new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z').toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

// ---------- schema: drives list columns and edit forms ----------
const STATUS = ['published', 'draft', 'archived'];
const SCHEMA = {
  news: { label: 'News', columns: ['title', 'status', 'pinned', 'published_at'], fields: [
    ['title', 'Headline', 'text', { wide: true, required: true }], ['excerpt', 'Summary', 'textarea', { wide: true, rows: 3 }],
    ['body', 'Article body (in-house stories)', 'textarea', { wide: true }], ['url', 'External link', 'url'],
    ['image_url', 'Image URL', 'url'], ['language', 'Language', 'select', { options: ['en', 'ar'] }],
    ['tags', 'Tags (comma-separated)', 'text'], ['published_at', 'Publish time', 'datetime'],
    ['status', 'Status', 'select', { options: ['published', 'draft', 'hidden'] }], ['pinned', 'Pin to top', 'bool']] },
  news_sources: { label: 'News sources', columns: ['name', 'enabled', 'last_status', 'last_polled_at', 'items_ingested'], fields: [
    ['name', 'Name', 'text', { required: true }], ['feed_url', 'RSS / Atom feed URL', 'url', { required: true }], ['site_url', 'Website', 'url'],
    ['language', 'Language', 'select', { options: ['en', 'ar'] }], ['poll_minutes', 'Check every (minutes)', 'number'],
    ['enabled', 'Enabled', 'bool'], ['filter_terms', 'Keep items mentioning (comma-separated; empty keeps all)', 'textarea', { wide: true, rows: 3 }]] },
  events: { label: 'Timeline events', columns: ['date', 'title_en', 'featured', 'status'], fields: [
    ['date', 'Date', 'date', { required: true }], ['title_en', 'Title (English)', 'text', { required: true, wide: true }], ['title_ar', 'Title (Arabic)', 'rtl', { wide: true }],
    ['body_en', 'Description', 'textarea', { wide: true, rows: 4 }], ['club_id', 'Related club', 'ref', { ref: 'clubs' }], ['player_id', 'Related player', 'ref', { ref: 'players' }],
    ['featured', 'Featured on home page', 'bool'], ['status', 'Status', 'select', { options: STATUS }]] },
  players: { label: 'Players', columns: ['name_en', 'position', 'birth_date', 'is_legend', 'status'], children: [['player_spells', 'player_id', 'Career spells']], fields: [
    ['name_en', 'Name (English)', 'text', { required: true }], ['name_ar', 'Name (Arabic)', 'rtl'], ['slug', 'URL slug', 'text', { required: true, hint: 'e.g. mohamed-salah' }],
    ['nickname', 'Nickname', 'text'], ['position', 'Position', 'select', { options: ['GK', 'DF', 'MF', 'FW', 'COACH'] }], ['era_id', 'Era', 'ref', { ref: 'eras' }],
    ['birth_date', 'Born', 'text', { hint: 'YYYY-MM-DD or YYYY' }], ['death_date', 'Died', 'text'], ['birthplace', 'Birthplace', 'text'],
    ['intl_caps', 'Egypt caps', 'number'], ['intl_goals', 'Egypt goals', 'number'], ['portrait_url', 'Portrait URL', 'url'],
    ['bio_en', 'Biography (English)', 'textarea', { wide: true }], ['bio_ar', 'Biography (Arabic)', 'textarea', { wide: true, rtl: true }],
    ['is_legend', 'Legend', 'bool'], ['status', 'Status', 'select', { options: STATUS }]] },
  player_spells: { label: 'Career spells', hidden: true, columns: ['club_name', 'club_id', 'from_year', 'to_year'], fields: [
    ['player_id', 'Player', 'ref', { ref: 'players', required: true }], ['club_id', 'Egyptian club', 'ref', { ref: 'clubs' }], ['club_name', 'Or other club name', 'text'],
    ['from_year', 'From', 'number'], ['to_year', 'To', 'number'], ['apps', 'Appearances', 'number'], ['goals', 'Goals', 'number']] },
  clubs: { label: 'Clubs', columns: ['name_en', 'city', 'founded_year', 'status'], children: [['club_milestones', 'club_id', 'Journey milestones']], fields: [
    ['name_en', 'Name (English)', 'text', { required: true }], ['name_ar', 'Name (Arabic)', 'rtl'], ['slug', 'URL slug', 'text', { required: true }],
    ['nickname_en', 'Nickname', 'text'], ['city', 'City', 'text'], ['founded_year', 'Founded', 'number'], ['stadium', 'Stadium', 'text'],
    ['colors', 'Colours (hex, comma-separated)', 'text', { hint: '#C8102E,#FFFFFF' }], ['crest_url', 'Crest URL', 'url'],
    ['history_en', 'History (English)', 'textarea', { wide: true }], ['history_ar', 'History (Arabic)', 'textarea', { wide: true, rtl: true }],
    ['status', 'Status', 'select', { options: STATUS }]] },
  club_milestones: { label: 'Milestones', hidden: true, columns: ['year', 'kind', 'title_en'], fields: [
    ['club_id', 'Club', 'ref', { ref: 'clubs', required: true }], ['year', 'Year', 'number', { required: true }],
    ['kind', 'Type', 'select', { options: ['founded', 'renamed', 'title', 'promotion', 'relegation', 'stadium', 'other'] }],
    ['title_en', 'Title (English)', 'text', { required: true, wide: true }], ['title_ar', 'Title (Arabic)', 'rtl', { wide: true }]] },
  competitions: { label: 'Competitions', columns: ['name_en', 'scope', 'kind', 'first_year'], children: [['titles', 'competition_id', 'Titles won']], fields: [
    ['name_en', 'Name (English)', 'text', { required: true }], ['name_ar', 'Name (Arabic)', 'rtl'], ['slug', 'URL slug', 'text', { required: true }],
    ['scope', 'Scope', 'select', { options: ['domestic', 'continental', 'international'] }], ['kind', 'Type', 'select', { options: ['league', 'cup', 'supercup', 'tournament'] }],
    ['first_year', 'First held', 'number'], ['summary_en', 'Summary', 'textarea', { wide: true, rows: 3 }]] },
  titles: { label: 'Titles', columns: ['season', 'competition_id', 'winner_club_id', 'winner_team_id'], fields: [
    ['competition_id', 'Competition', 'ref', { ref: 'competitions', required: true }], ['season', 'Season', 'text', { required: true, hint: '1986 or 2005-06' }],
    ['winner_club_id', 'Winning club', 'ref', { ref: 'clubs' }], ['winner_team_id', 'Or winning national team', 'ref', { ref: 'national_teams' }],
    ['runner_up', 'Runner-up', 'text'], ['final_score', 'Final score', 'text'], ['host', 'Host', 'text'], ['notes_en', 'Notes', 'textarea', { wide: true, rows: 3 }]] },
  national_teams: { label: 'National teams', columns: ['name_en', 'category'], children: [['tournament_appearances', 'team_id', 'Tournament appearances']], fields: [
    ['name_en', 'Name (English)', 'text', { required: true }], ['name_ar', 'Name (Arabic)', 'rtl'], ['slug', 'URL slug', 'text', { required: true }],
    ['category', 'Category', 'select', { options: ['senior', 'olympic', 'u20', 'u17', 'women', 'futsal', 'beach'] }], ['summary_en', 'Summary', 'textarea', { wide: true, rows: 3 }]] },
  tournament_appearances: { label: 'Tournament appearances', hidden: true, columns: ['year', 'tournament', 'result'], fields: [
    ['team_id', 'Team', 'ref', { ref: 'national_teams', required: true }], ['tournament', 'Tournament', 'text', { required: true }], ['year', 'Year', 'number', { required: true }],
    ['host', 'Host', 'text'], ['result', 'Result', 'text'], ['coach', 'Coach', 'text'], ['notes_en', 'Notes', 'textarea', { wide: true, rows: 3 }]] },
};

// Reference lookups (id -> label), cached per session.
const refCache = {};
async function refs(entity) {
  if (entity === 'eras' && !refCache.eras) {
    refCache.eras = (await (await fetch('/api/v1/eras')).json()).map((e) => ({ id: e.id, label: `${e.name_en} (${e.start_year}–${e.end_year ?? 'today'})` }));
  }
  if (!refCache[entity]) {
    const d = await api(`/${entity}?limit=200`);
    refCache[entity] = d.items.map((r) => ({ id: r.id, label: r.name_en || r.title_en || r.season || r.name || `#${r.id}` }));
  }
  return refCache[entity];
}
const refLabel = async (field, id) => {
  const f = Object.values(SCHEMA).flatMap((s) => s.fields).find((x) => x[0] === field && x[2] === 'ref');
  if (!f || id == null) return id ?? '';
  return (await refs(f[3].ref)).find((r) => r.id === id)?.label ?? `#${id}`;
};

// ---------- layout ----------
function shell(active, inner) {
  const link = (href, label, key) => `<a class="nav" href="${href}" ${active === key ? 'aria-current="page"' : ''}>${label}</a>`;
  app.innerHTML = `<div class="shell"><nav class="side" aria-label="Admin">
    <a class="side__brand" href="#/">Archive Admin</a>
    ${link('#/', 'Overview', 'overview')}
    <div class="side__group">Newsroom</div>${link('#/e/news', 'News', 'news')}${link('#/e/news_sources', 'News sources', 'news_sources')}${link('#/e/events', 'Timeline events', 'events')}
    <div class="side__group">Archive</div>${link('#/e/players', 'Players', 'players')}${link('#/e/clubs', 'Clubs', 'clubs')}${link('#/e/competitions', 'Competitions', 'competitions')}${link('#/e/titles', 'Titles', 'titles')}${link('#/e/national_teams', 'National teams', 'national_teams')}
    <div class="side__group">System</div>${can('admin') ? link('#/users', 'Users', 'users') : ''}${link('#/activity', 'Activity log', 'activity')}
    <a class="nav" href="/" target="_blank" rel="noopener">View site ↗</a>
    <div class="side__user">${esc(me.name)}<br><span class="muted">${esc(me.role)}</span><br><button class="btn btn--ghost btn--sm" data-logout style="margin-top:8px;color:inherit">Sign out</button></div>
  </nav><main class="content" id="content">${inner}</main></div>`;
  app.querySelector('[data-logout]').addEventListener('click', async () => { await api('/logout', { method: 'POST' }); me = null; renderLogin(); });
  return app.querySelector('#content');
}

// ---------- screens ----------
function renderLogin(error = '') {
  app.innerHTML = `<div class="login"><form class="panel" data-login><h1>Archive Admin</h1>
    ${error ? `<div class="error-box" role="alert">${esc(error)}</div>` : ''}
    <div class="field"><label for="em">Email</label><input id="em" name="email" type="email" autocomplete="username" required></div>
    <div class="field"><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn" style="width:100%;justify-content:center">Sign in</button></form></div>`;
  app.querySelector('[data-login]').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { me = await api('/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); route(); }
    catch (err) { renderLogin(err.message); }
  });
  app.querySelector('#em').focus();
}

async function overview() {
  const c = shell('overview', '<p class="muted">Loading…</p>');
  const o = await api('/overview');
  const days = [...Array(14)].map((_, i) => new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10));
  const per = Object.fromEntries(o.news_per_day.map((d) => [d.day, d.n]));
  const max = Math.max(1, ...days.map((d) => per[d] || 0));
  c.innerHTML = `<div class="topbar"><h1>Overview</h1>${can('editor') ? '<div><button class="btn btn--ghost" data-poll>Check all feeds now</button> <a class="btn" href="#/e/news/new">Write a story</a></div>' : ''}</div>
    <dl class="kpis">${[['Players', o.counts.players], ['Clubs', o.counts.clubs], ['Titles', o.counts.titles], ['News items', o.counts.news], ['News today', o.counts.news_today], ['Drafts', o.counts.drafts], ['Users', o.counts.users]]
      .map(([k, v]) => `<div class="panel kpi"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <div class="two">
      <section class="panel"><h2>Feed health</h2><div class="table-wrap"><table><thead><tr><th>Source</th><th>Status</th><th>Last check</th><th>Items</th><th></th></tr></thead><tbody>
        ${o.sources.map((s) => `<tr><td>${esc(s.name)}${s.enabled ? '' : ' <span class="muted">(off)</span>'}</td>
          <td><span class="pill pill--${esc(s.last_status || 'draft')}" title="${esc(s.last_error || '')}">${esc(s.last_status || 'never')}</span></td>
          <td>${when(s.last_polled_at)}</td><td>${s.items_ingested}</td>
          <td class="actions">${can('editor') ? `<button class="btn btn--ghost btn--sm" data-poll-one="${s.id}">Check</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
        <h2 style="margin-top:20px">Stories per day (14 days)</h2>
        <div class="sparkline" role="img" aria-label="News items per day over the last 14 days">${days.map((d) => `<span style="height:${((per[d] || 0) / max) * 100}%" title="${d}: ${per[d] || 0}"></span>`).join('')}</div></section>
      <section class="panel"><h2>Recent activity</h2><ul class="activity">${o.activity.map((a) => `<li><strong>${esc(a.user || 'System')}</strong> ${esc(a.action)} <em>${esc(a.entity)}</em> ${esc(a.summary || '')}<br><span class="muted">${when(a.created_at)}</span></li>`).join('') || '<li class="muted">Nothing yet.</li>'}</ul>
        <p><a href="#/activity">Full activity log</a></p></section>
    </div>`;
  c.querySelector('[data-poll]')?.addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'Checking…';
    const r = await api('/news/poll-all', { method: 'POST' });
    toast(`${r.reduce((n, x) => n + x.inserted, 0)} new item(s) from ${r.length} source(s)`); overview();
  });
  c.querySelectorAll('[data-poll-one]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    const r = await api(`/news_sources/${b.dataset.pollOne}/poll`, { method: 'POST' });
    toast(r.status === 'error' ? `${r.source}: ${r.error}` : `${r.source}: ${r.inserted} new item(s)`); overview();
  }));
}

async function list(entity, params) {
  const s = SCHEMA[entity];
  const c = shell(s.hidden ? '' : entity, '<p class="muted">Loading…</p>');
  const q = params.get('q') || '', status = params.get('status') || '', page = Number(params.get('page') || 1);
  const qs = new URLSearchParams({ limit: 50, page, ...(q && { q }), ...(status && { status }) });
  const data = await api(`/${entity}?${qs}`);
  const hasStatus = s.fields.some((f) => f[0] === 'status');
  const cell = async (row, col) => {
    const v = row[col];
    if (col === 'status' || col === 'last_status') return `<span class="pill pill--${esc(v || 'draft')}">${esc(v || '—')}</span>`;
    if (['pinned', 'enabled', 'featured', 'is_legend'].includes(col)) return v ? 'Yes' : '';
    if (col.endsWith('_at')) return when(v);
    if (col.endsWith('_id')) return esc(await refLabel(col, v));
    return `<div class="truncate">${esc(v)}</div>`;
  };
  const rows = await Promise.all(data.items.map(async (r) => `<tr>${(await Promise.all(s.columns.map((col) => cell(r, col)))).map((h) => `<td>${h}</td>`).join('')}
    <td class="actions"><a class="btn btn--ghost btn--sm" href="#/e/${entity}/${r.id}">${can('editor') ? 'Edit' : 'View'}</a></td></tr>`));
  c.innerHTML = `<div class="topbar"><h1>${esc(s.label)}</h1>${can('editor') ? `<a class="btn" href="#/e/${entity}/new">Add ${esc(s.label.toLowerCase().replace(/s$/, ''))}</a>` : ''}</div>
    <form class="toolbar" data-filter><label class="sr-only" for="fq">Search</label><input id="fq" name="q" type="search" placeholder="Search ${esc(s.label.toLowerCase())}" value="${esc(q)}">
      ${hasStatus ? `<label class="sr-only" for="fs">Status</label><select id="fs" name="status"><option value="">Any status</option>${[...new Set([...STATUS, 'hidden'])].map((x) => `<option ${x === status ? 'selected' : ''}>${x}</option>`).join('')}</select>` : ''}
      <button class="btn btn--ghost">Filter</button></form>
    <div class="panel table-wrap"><table><thead><tr>${s.columns.map((col) => `<th scope="col">${esc(col.replace(/_id$/, '').replace(/_/g, ' '))}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows.join('') || `<tr><td colspan="${s.columns.length + 1}" class="muted">Nothing here yet.</td></tr>`}</tbody></table>
      <div class="pager"><span class="muted">${data.total} total</span>
        ${page > 1 ? `<a class="btn btn--ghost btn--sm" href="#/e/${entity}?${new URLSearchParams({ q, status, page: page - 1 })}">Previous</a>` : ''}
        ${page * 50 < data.total ? `<a class="btn btn--ghost btn--sm" href="#/e/${entity}?${new URLSearchParams({ q, status, page: page + 1 })}">Next</a>` : ''}</div></div>`;
  c.querySelector('[data-filter]').addEventListener('submit', (e) => {
    e.preventDefault();
    location.hash = `#/e/${entity}?${new URLSearchParams([...new FormData(e.target)].filter(([, v]) => v))}`;
  });
}

async function fieldHtml([name, label, type, opt = {}], value) {
  const id = `f_${name}`, req = opt.required ? 'required' : '';
  const wrap = (input) => `<div class="field ${opt.wide ? 'field--wide' : ''}"><label for="${id}">${esc(label)}${opt.required ? ' *' : ''}</label>${input}${opt.hint ? `<small>${esc(opt.hint)}</small>` : ''}</div>`;
  const v = value ?? '';
  switch (type) {
    case 'textarea': return wrap(`<textarea id="${id}" name="${name}" rows="${opt.rows || 8}" ${opt.rtl ? 'dir="rtl" lang="ar"' : ''} ${req}>${esc(v)}</textarea>`);
    case 'rtl': return wrap(`<input id="${id}" name="${name}" dir="rtl" lang="ar" value="${esc(v)}" ${req}>`);
    case 'number': return wrap(`<input id="${id}" name="${name}" type="number" value="${esc(v)}" ${req}>`);
    case 'url': return wrap(`<input id="${id}" name="${name}" type="url" value="${esc(v)}" ${req}>`);
    case 'date': return wrap(`<input id="${id}" name="${name}" type="date" value="${esc(String(v).slice(0, 10))}" ${req}>`);
    case 'datetime': return wrap(`<input id="${id}" name="${name}" type="datetime-local" value="${v ? esc(new Date(v).toISOString().slice(0, 16)) : ''}">`);
    case 'bool': return `<div class="field"><label><input type="checkbox" name="${name}" ${v ? 'checked' : ''}> ${esc(label)}</label></div>`;
    case 'select': return wrap(`<select id="${id}" name="${name}" ${req}>${opt.options.map((o) => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select>`);
    case 'ref': {
      const options = await refs(opt.ref);
      return wrap(`<select id="${id}" name="${name}" ${req}><option value="">—</option>${options.map((o) => `<option value="${o.id}" ${o.id === v ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`);
    }
    default: return wrap(`<input id="${id}" name="${name}" value="${esc(v)}" ${req}>`);
  }
}

function readForm(form, fields) {
  const fd = new FormData(form), out = {};
  for (const [name, , type] of fields) {
    if (type === 'bool') out[name] = fd.has(name) ? 1 : 0;
    else if (type === 'number' || type === 'ref') out[name] = fd.get(name) === '' ? null : Number(fd.get(name));
    else if (type === 'datetime') out[name] = fd.get(name) ? new Date(fd.get(name)).toISOString() : null;
    else out[name] = fd.get(name);
  }
  return out;
}

async function edit(entity, id, params) {
  const s = SCHEMA[entity];
  const isNew = id === 'new';
  const c = shell(s.hidden ? '' : entity, '<p class="muted">Loading…</p>');
  const row = isNew ? Object.fromEntries([...params]) : await api(`/${entity}/${id}`);
  for (const k of Object.keys(row)) if (/^\d+$/.test(row[k]) && k.endsWith('_id')) row[k] = Number(row[k]);
  const fields = (await Promise.all(s.fields.map((f) => fieldHtml(f, row[f[0]])))).join('');
  const ro = !can('editor');
  c.innerHTML = `<div class="topbar"><h1>${isNew ? 'New' : 'Edit'} ${esc(s.label.toLowerCase().replace(/s$/, ''))}</h1><button type="button" class="btn btn--ghost" data-back>Back</button></div>
    <form class="panel" data-edit><div data-err></div><fieldset ${ro ? 'disabled' : ''} style="border:0;padding:0;margin:0"><div class="form">${fields}</div></fieldset>
    ${ro ? '<p class="muted">You have read-only access.</p>' : `<div class="form-actions"><button class="btn">Save</button>${!isNew && can('admin') ? '<button type="button" class="btn btn--danger" data-delete>Delete</button>' : ''}</div>`}</form>
    <div data-children></div>`;
  const form = c.querySelector('[data-edit]');
  c.querySelector('[data-back]').addEventListener('click', () => (history.length > 1 ? history.back() : (location.hash = `#/e/${entity}`)));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const body = readForm(form, s.fields);
      const saved = await api(isNew ? `/${entity}` : `/${entity}/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      delete refCache[entity];
      toast('Saved');
      // Child records return to their parent; top-level records open in edit mode.
      if (s.hidden) history.back();
      else if (isNew) location.hash = `#/e/${entity}/${saved.id}`;
    } catch (err) {
      form.querySelector('[data-err]').innerHTML = `<div class="error-box" role="alert">${esc(err.message)}</div>`;
    }
  });
  form.querySelector('[data-delete]')?.addEventListener('click', async () => {
    if (!confirm('Delete this record permanently? This cannot be undone.')) return;
    try { await api(`/${entity}/${id}`, { method: 'DELETE' }); delete refCache[entity]; toast('Deleted'); history.back(); }
    catch (err) { form.querySelector('[data-err]').innerHTML = `<div class="error-box" role="alert">${esc(err.message)}</div>`; }
  });

  // Nested child records (career spells, milestones, titles, appearances).
  if (!isNew && s.children) {
    const box = c.querySelector('[data-children]');
    for (const [child, fk, label] of s.children) {
      const cs = SCHEMA[child];
      const d = await api(`/${child}?${fk}=${id}&limit=200`);
      const cells = await Promise.all(d.items.map(async (r) => `<tr>${(await Promise.all(cs.columns.map(async (col) => `<td>${esc(col.endsWith('_id') ? await refLabel(col, r[col]) : r[col])}</td>`))).join('')}
        <td class="actions"><a class="btn btn--ghost btn--sm" href="#/e/${child}/${r.id}">Edit</a></td></tr>`));
      box.insertAdjacentHTML('beforeend', `<section class="panel" style="margin-top:20px"><div class="topbar"><h2 style="margin:0">${esc(label)}</h2>
        ${can('editor') ? `<a class="btn btn--ghost btn--sm" href="#/e/${child}/new?${fk}=${id}">Add</a>` : ''}</div>
        <div class="table-wrap"><table><thead><tr>${cs.columns.map((col) => `<th>${esc(col.replace(/_id$/, '').replace(/_/g, ' '))}</th>`).join('')}<th></th></tr></thead>
        <tbody>${cells.join('') || `<tr><td colspan="${cs.columns.length + 1}" class="muted">None yet.</td></tr>`}</tbody></table></div></section>`);
    }
  }
}

async function users() {
  const c = shell('users', '<p class="muted">Loading…</p>');
  const list = await api('/users');
  c.innerHTML = `<div class="topbar"><h1>Users</h1></div>
    <div class="panel table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Last sign-in</th><th></th></tr></thead><tbody>
    ${list.map((u) => `<tr data-id="${u.id}"><td>${esc(u.name)}</td><td>${esc(u.email)}</td>
      <td><label class="sr-only" for="r${u.id}">Role</label><select id="r${u.id}" data-role ${u.id === me.id ? 'disabled' : ''}>${['viewer', 'editor', 'admin'].map((r) => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
      <td><input type="checkbox" aria-label="Active" data-active ${u.active ? 'checked' : ''} ${u.id === me.id ? 'disabled' : ''}></td><td>${when(u.last_login_at)}</td>
      <td class="actions">${u.id === me.id ? '<span class="muted">You</span>' : '<button class="btn btn--ghost btn--sm" data-reset>Reset password</button> <button class="btn btn--danger btn--sm" data-del>Delete</button>'}</td></tr>`).join('')}
    </tbody></table></div>
    <form class="panel" data-new style="margin-top:20px"><h2>Invite a user</h2><div data-err></div><div class="form">
      <div class="field"><label for="nu_name">Name</label><input id="nu_name" name="name" required></div>
      <div class="field"><label for="nu_email">Email</label><input id="nu_email" name="email" type="email" required></div>
      <div class="field"><label for="nu_role">Role</label><select id="nu_role" name="role"><option>editor</option><option>viewer</option><option>admin</option></select></div>
      <div class="field"><label for="nu_pw">Temporary password</label><input id="nu_pw" name="password" type="text" minlength="10" required><small>At least 10 characters. Share it securely.</small></div>
    </div><div class="form-actions"><button class="btn">Create user</button></div>
    <p class="muted">Roles: <strong>viewer</strong> can see the dashboard; <strong>editor</strong> can add and edit content and news; <strong>admin</strong> can also delete records and manage users.</p></form>`;
  const update = async (tr, body) => { try { await api(`/users/${tr.dataset.id}`, { method: 'PUT', body }); toast('User updated'); } catch (e) { toast(e.message); users(); } };
  c.querySelectorAll('tr[data-id]').forEach((tr) => {
    tr.querySelector('[data-role]').addEventListener('change', (e) => update(tr, { role: e.target.value }));
    tr.querySelector('[data-active]').addEventListener('change', (e) => update(tr, { active: e.target.checked ? 1 : 0 }));
    tr.querySelector('[data-reset]')?.addEventListener('click', () => { const pw = prompt('New password (at least 10 characters):'); if (pw) update(tr, { password: pw }); });
    tr.querySelector('[data-del]')?.addEventListener('click', async () => { if (confirm('Delete this user?')) { await api(`/users/${tr.dataset.id}`, { method: 'DELETE' }); toast('User deleted'); users(); } });
  });
  c.querySelector('[data-new]').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('/users', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('User created'); users(); }
    catch (err) { e.target.querySelector('[data-err]').innerHTML = `<div class="error-box" role="alert">${esc(err.message)}</div>`; }
  });
}

async function activity() {
  const c = shell('activity', '<p class="muted">Loading…</p>');
  const log = await api('/audit?limit=300');
  c.innerHTML = `<div class="topbar"><h1>Activity log</h1><button class="btn btn--ghost" data-refresh>Refresh</button></div>
    <div class="panel table-wrap"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Details</th></tr></thead><tbody>
    ${log.map((a) => `<tr><td>${when(a.created_at)}</td><td>${esc(a.user || 'System')}</td><td>${esc(a.action)}</td><td>${esc(a.entity)}${a.entity_id ? ` #${a.entity_id}` : ''}</td><td class="truncate">${esc(a.summary || '')}</td></tr>`).join('')}
    </tbody></table></div>`;
  c.querySelector('[data-refresh]').addEventListener('click', activity);
}

// ---------- router ----------
async function route() {
  if (!me) { try { me = await api('/me'); } catch { return; } }
  const [path, qs = ''] = location.hash.slice(1).split('?');
  const params = new URLSearchParams(qs);
  const parts = path.split('/').filter(Boolean);
  try {
    if (!parts.length) return await overview();
    if (parts[0] === 'users' && can('admin')) return await users();
    if (parts[0] === 'activity') return await activity();
    if (parts[0] === 'e' && SCHEMA[parts[1]]) return parts[2] ? await edit(parts[1], parts[2], params) : await list(parts[1], params);
    shell('', '<h1>Not found</h1><p><a href="#/">Back to overview</a></p>');
  } catch (e) {
    if (e.message !== 'Signed out') shell('', `<div class="error-box" role="alert">${esc(e.message)}</div>`);
  }
}
addEventListener('hashchange', route);
route();
