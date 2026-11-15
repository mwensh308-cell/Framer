// The Pharaohs' Archive — public client. No framework: History API router,
// server-rendered-shaped templates, live news over Server-Sent Events.

const main = document.getElementById('main');
const API = '/api/v1';

// ---------- helpers ----------
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const html = (strings, ...vals) => strings.reduce((out, s, i) => out + s + (i < vals.length ? [].concat(vals[i]).join('') : ''), '');
const raw = (v) => [v]; // arrays pass through html`` unescaped; use esc() for user/DB text
async function api(path) {
  const res = await fetch(API + path, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw Object.assign(new Error(res.status === 404 ? 'Not found' : 'Could not load'), { status: res.status });
  return res.json();
}
const year = (d) => (d ? esc(String(d).slice(0, 4)) : '');
const lifespan = (p) => (p.death_date ? `${year(p.birth_date)}–${year(p.death_date)}` : p.birth_date ? `b. ${year(p.birth_date)}` : '');
const POS = { GK: 'Goalkeeper', DF: 'Defender', MF: 'Midfielder', FW: 'Forward', COACH: 'Coach' };
const initials = (name) => esc(name.split(/\s+/).filter((w) => !/^(al|el|sc|fc)$/i.test(w)).slice(0, 2).map((w) => w[0]).join(''));
const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(iso).toLocaleDateString('en-GB', opts);
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  return fmtDate(iso);
};
const crest = (c) => {
  const [a = '#555', b = '#fff'] = (c.colors || '').split(',');
  return `<span class="crest" aria-hidden="true" style="background:linear-gradient(135deg,${esc(a)} 55%,${esc(b)} 55%)">${initials(c.name_en)}</span>`;
};
const setTitle = (t) => { document.title = t ? `${t} — The Pharaohs' Archive` : "The Pharaohs' Archive"; };
const loading = () => { main.innerHTML = `<div class="wrap section"><div class="grid">${'<div class="skeleton"></div>'.repeat(6)}</div></div>`; };
const errorView = (e) => html`<div class="wrap error"><h1>${e.status === 404 ? 'Not in the archive' : 'Something went wrong'}</h1>
  <p>${e.status === 404 ? 'We could not find that page. It may have been renamed.' : 'Please try again in a moment.'}</p><a class="btn" href="/" data-link>Back to the archive</a></div>`;

// ---------- reveal & count-up (respecting reduced motion) ----------
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) document.documentElement.classList.add('js-reveal');
const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px' }) : null;
function enhance() {
  main.querySelectorAll('.reveal').forEach((el) => (io && !reduceMotion ? io.observe(el) : el.classList.add('in')));
  main.querySelectorAll('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion || !target) { el.textContent = target; return; }
    const t0 = performance.now();
    const step = (t) => { const k = Math.min((t - t0) / 900, 1); el.textContent = Math.round(target * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

// ---------- views ----------
const playerCard = (p) => html`<a class="card reveal" href="/players/${esc(p.slug)}" data-link>
  <div class="row"><span class="portrait" aria-hidden="true">${initials(p.name_en)}</span>
    <div><h3>${esc(p.name_en)}</h3>${p.name_ar ? `<span class="ar" lang="ar">${esc(p.name_ar)}</span>` : ''}</div></div>
  <div class="card__meta"><span>${POS[p.position] || ''}</span><span>${lifespan(p)}</span>${p.is_legend ? '<span class="badge badge--gold">Legend</span>' : ''}</div></a>`;

const clubCard = (c) => html`<a class="card reveal" href="/clubs/${esc(c.slug)}" data-link>
  <div class="row">${raw(crest(c))}<div><h3>${esc(c.name_en)}</h3>${c.name_ar ? `<span class="ar" lang="ar">${esc(c.name_ar)}</span>` : ''}</div></div>
  <div class="card__meta"><span>${esc(c.city)}</span><span>Founded ${esc(c.founded_year)}</span>${c.trophies ? `<span class="badge badge--gold">${c.trophies} major titles</span>` : ''}</div></a>`;

const newsItem = (n, fresh = false) => {
  const href = n.url || `/news/${n.id}`;
  const ext = Boolean(n.url);
  return html`<article class="news-item${fresh ? ' news-item--new' : ''}" lang="${esc(n.language)}">
    <time datetime="${esc(n.published_at)}">${ago(n.published_at)}</time>
    <div><h3><a href="${esc(href)}" ${ext ? 'target="_blank" rel="noopener"' : 'data-link'}>${esc(n.title)}${ext ? '<span class="sr-only"> (opens in a new tab)</span>' : ''}</a></h3>
      ${n.excerpt ? `<p>${esc(n.excerpt)}</p>` : ''}
      <div class="card__meta"><span>${esc(n.source_name || 'Pharaohs’ Archive')}</span>${n.pinned ? '<span class="badge badge--red">Pinned</span>' : ''}</div></div></article>`;
};

async function home() {
  setTitle('');
  const [stats, players, clubs, timeline, news] = await Promise.all([
    api('/stats'), api('/players?legend=1&limit=8'), api('/clubs'), api('/timeline?featured=1'), api('/news?limit=6'),
  ]);
  main.innerHTML = html`
  <section class="hero"><div class="wrap">
    <p class="hero__kicker">Since 1907</p>
    <h1>The story of <em>Egyptian</em> football</h1>
    <p class="hero__lede">Africa’s first World Cup nation, record champions of the continent, and the clubs, players and rivalries that made the game a national passion.</p>
    <p><a class="btn" href="/timeline" data-link>Walk the timeline</a> <a class="btn btn--ghost" href="/players" data-link>Meet the players</a></p>
    <svg class="hero__glyph" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 29 28H3Z"/></svg>
  </div></section>
  <div class="wrap"><dl class="stats">
    <div class="stat"><dt>AFCON titles</dt><dd class="gold" data-count="${stats.afcon_titles}">${stats.afcon_titles}</dd></div>
    <div class="stat"><dt>World Cups</dt><dd data-count="${stats.world_cups}">${stats.world_cups}</dd></div>
    <div class="stat"><dt>Players profiled</dt><dd data-count="${stats.players}">${stats.players}</dd></div>
    <div class="stat"><dt>Clubs</dt><dd data-count="${stats.clubs}">${stats.clubs}</dd></div>
    <div class="stat"><dt>Titles recorded</dt><dd data-count="${stats.titles}">${stats.titles}</dd></div>
  </dl></div>
  <section class="section"><div class="wrap">
    <div class="section__head"><h2>Latest news</h2><a href="/news" data-link>All news</a></div>
    <div class="news-list" data-news-list>${news.items.map((n) => newsItem(n))}</div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="section__head"><h2>Legends</h2><a href="/players" data-link>All players</a></div>
    <div class="grid">${players.items.map(playerCard)}</div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="section__head"><h2>Moments that made history</h2><a href="/timeline" data-link>Full timeline</a></div>
    <div class="strip">${timeline.map((e) => html`<div class="card"><span class="badge badge--red">${year(e.date)}</span><h3>${esc(e.title_en)}</h3>${e.body_en ? `<p class="muted">${esc(e.body_en)}</p>` : ''}</div>`)}</div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="section__head"><h2>The clubs</h2><a href="/clubs" data-link>All clubs</a></div>
    <div class="grid">${clubs.slice(0, 6).map(clubCard)}</div>
  </div></section>`;
}

async function players(params) {
  setTitle('Players');
  const [eras] = await Promise.all([api('/eras')]);
  main.innerHTML = html`<div class="wrap detail-head"><h1>Players</h1><p class="hero__lede">Biographies of Egyptian footballers across every era, from the Olympic pioneers of the 1920s to today’s stars in Europe.</p></div>
  <div class="wrap section"><form class="filters" data-filters>
    <label class="sr-only" for="pq">Search by name</label><input id="pq" name="q" type="search" placeholder="Search by name, in English or Arabic" value="${esc(params.get('q') || '')}">
    <label class="sr-only" for="ppos">Position</label><select id="ppos" name="position"><option value="">All positions</option>${Object.entries(POS).map(([k, v]) => `<option value="${k}" ${params.get('position') === k ? 'selected' : ''}>${v}</option>`)}</select>
    <label class="sr-only" for="pera">Era</label><select id="pera" name="era"><option value="">All eras</option>${eras.map((e) => `<option value="${esc(e.slug)}" ${params.get('era') === e.slug ? 'selected' : ''}>${esc(e.name_en)} (${e.start_year}–${e.end_year ?? 'today'})</option>`)}</select>
  </form><p class="muted" aria-live="polite" data-count-label></p><div class="grid" data-results></div></div>`;
  const form = main.querySelector('[data-filters]');
  const load = async () => {
    const qs = new URLSearchParams([...new FormData(form)].filter(([, v]) => v));
    history.replaceState(null, '', `/players${qs.size ? '?' + qs : ''}`);
    const data = await api(`/players?limit=100&${qs}`);
    main.querySelector('[data-count-label]').textContent = `${data.total} player${data.total === 1 ? '' : 's'}`;
    main.querySelector('[data-results]').innerHTML = data.items.length ? data.items.map(playerCard).join('') : '<p class="empty">No players match those filters.</p>';
    enhance();
  };
  let t; form.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 200); });
  form.addEventListener('submit', (e) => { e.preventDefault(); load(); });
  await load();
}

async function player(slug) {
  const p = await api(`/players/${encodeURIComponent(slug)}`);
  setTitle(p.name_en);
  main.innerHTML = html`<header class="detail-head"><div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/players" data-link>Players</a> / ${esc(p.era || '')}</nav>
    ${p.name_ar ? `<span class="ar" lang="ar">${esc(p.name_ar)}</span>` : ''}<h1>${esc(p.name_en)}</h1>
    ${p.nickname ? `<p class="hero__lede">“${esc(p.nickname)}”</p>` : ''}
    <dl class="facts">
      <div><dt>Position</dt><dd>${POS[p.position] || '—'}</dd></div>
      <div><dt>Born</dt><dd>${p.birth_date ? esc(p.birth_date.length > 4 ? fmtDate(p.birth_date) : p.birth_date) : '—'}${p.birthplace ? `, ${esc(p.birthplace)}` : ''}</dd></div>
      ${p.death_date ? `<div><dt>Died</dt><dd>${esc(p.death_date.length > 4 ? fmtDate(p.death_date) : p.death_date)}</dd></div>` : ''}
      ${p.intl_caps != null ? `<div><dt>Egypt caps / goals</dt><dd>${p.intl_caps} / ${p.intl_goals ?? '—'}</dd></div>` : ''}
      <div><dt>Era</dt><dd>${esc(p.era || '—')}</dd></div>
    </dl></div></header>
  <div class="wrap layout">
    <article class="prose">${(p.bio_en || 'Biography coming soon.').split(/\n{2,}/).map((para) => `<p>${esc(para)}</p>`)}</article>
    <aside class="aside">
      <h3>Career</h3>
      ${p.career.length ? html`<div class="table-scroll"><table class="table"><thead><tr><th scope="col">Years</th><th scope="col">Club</th></tr></thead><tbody>
        ${p.career.map((s) => html`<tr><td>${s.from_year ?? ''}${s.to_year !== s.from_year ? `–${s.to_year ?? (s.from_year ? 'now' : '')}` : ''}</td>
          <td>${s.club_slug ? `<a href="/clubs/${esc(s.club_slug)}" data-link>${esc(s.club)}</a>` : esc(s.club)}</td></tr>`)}</tbody></table></div>` : '<p class="muted">Career record to be added.</p>'}
      ${p.events.length ? html`<h3 style="margin-top:32px">Key moments</h3><ul class="timeline">${p.events.map((e) => html`<li class="tl"><span class="tl__year">${year(e.date)}</span><p>${esc(e.title_en)}</p></li>`)}</ul>` : ''}
    </aside></div>`;
}

async function clubs() {
  setTitle('Clubs');
  const list = await api('/clubs');
  main.innerHTML = html`<div class="wrap detail-head"><h1>Clubs</h1><p class="hero__lede">From Al Ahly’s founding in 1907 to the newest champions of Africa: the history and journey of Egyptian clubs.</p></div>
  <div class="wrap section"><div class="grid">${list.map(clubCard)}</div></div>`;
}

async function club(slug) {
  const c = await api(`/clubs/${encodeURIComponent(slug)}`);
  setTitle(c.name_en);
  const max = Math.max(1, ...c.honours.map((h) => h.count));
  main.innerHTML = html`<header class="detail-head"><div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/clubs" data-link>Clubs</a> / ${esc(c.city)}</nav>
    <div class="row">${raw(crest(c))}<div>${c.name_ar ? `<span class="ar" lang="ar">${esc(c.name_ar)}</span>` : ''}</div></div>
    <h1>${esc(c.name_en)}</h1>${c.nickname_en ? `<p class="hero__lede">${esc(c.nickname_en)}</p>` : ''}
    <dl class="facts"><div><dt>Founded</dt><dd>${esc(c.founded_year)}</dd></div><div><dt>City</dt><dd>${esc(c.city)}</dd></div>
      <div><dt>Stadium</dt><dd>${esc(c.stadium || '—')}</dd></div><div><dt>Major titles recorded</dt><dd>${c.honours.reduce((n, h) => n + h.count, 0)}</dd></div></dl>
  </div></header>
  <div class="wrap layout">
    <div>
      <article class="prose">${(c.history_en || '').split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`)}</article>
      <h2 style="margin-top:40px">The journey</h2>
      <ol class="timeline">${c.milestones.map((m) => html`<li class="tl reveal ${m.kind === 'title' ? 'tl--featured' : ''}"><span class="tl__year">${m.year}</span><div><h3>${esc(m.title_en)}</h3><span class="muted">${esc(m.kind)}</span></div></li>`)}</ol>
    </div>
    <aside class="aside">
      <h3>Honours</h3>
      ${c.honours.length ? html`<div class="honours">${c.honours.map((h) => html`<div class="honour"><span class="honour__n">${h.count}</span>
        <div style="flex:1"><a href="/championships/${esc(h.competition_slug)}" data-link><strong>${esc(h.competition)}</strong></a>
        <div class="bar" style="width:${(h.count / max) * 100}%" aria-hidden="true"></div><small class="muted">${esc(h.seasons)}</small></div></div>`)}</div>` : '<p class="muted">No major titles recorded yet.</p>'}
      ${c.players.length ? html`<h3 style="margin-top:32px">Notable players</h3><ul>${c.players.map((p) => html`<li><a href="/players/${esc(p.slug)}" data-link>${esc(p.name_en)}</a> <span class="muted">${p.from_year ?? ''}</span></li>`)}</ul>` : ''}
    </aside></div>`;
}

async function championships() {
  setTitle('Championships');
  const comps = await api('/competitions');
  const groups = { domestic: 'Domestic', continental: 'Continental (clubs)', international: 'International (national teams)' };
  main.innerHTML = html`<div class="wrap detail-head"><h1>Championships</h1><p class="hero__lede">Every league, cup and continental title won by Egyptian clubs and national teams.</p></div>
  ${Object.entries(groups).map(([k, label]) => html`<section class="section"><div class="wrap"><h2>${label}</h2><div class="grid">
    ${comps.filter((c) => c.scope === k).map((c) => html`<a class="card reveal" href="/championships/${esc(c.slug)}" data-link><h3>${esc(c.name_en)}</h3>
      ${c.name_ar ? `<span class="ar" lang="ar">${esc(c.name_ar)}</span>` : ''}<p class="muted">${esc(c.summary_en || '')}</p>
      <div class="card__meta"><span>Since ${c.first_year}</span><span>${c.editions} Egyptian titles recorded</span></div></a>`)}</div></div></section>`)}`;
}

async function championship(slug) {
  const c = await api(`/competitions/${encodeURIComponent(slug)}`);
  setTitle(c.name_en);
  const max = Math.max(1, ...c.leaderboard.map((l) => l.count));
  main.innerHTML = html`<header class="detail-head"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/championships" data-link>Championships</a></nav>
    ${c.name_ar ? `<span class="ar" lang="ar">${esc(c.name_ar)}</span>` : ''}<h1>${esc(c.name_en)}</h1><p class="hero__lede">${esc(c.summary_en || '')}</p></div></header>
  <div class="wrap layout">
    <div class="table-scroll"><table class="table"><caption class="sr-only">Egyptian winners by season</caption>
      <thead><tr><th scope="col">Season</th><th scope="col">Winner</th><th scope="col">Runner-up</th><th scope="col">Final</th><th scope="col">Host</th></tr></thead>
      <tbody>${c.titles.map((t) => html`<tr><td>${esc(t.season)}</td><td>${t.winner_slug ? `<a href="/clubs/${esc(t.winner_slug)}" data-link>${esc(t.winner)}</a>` : esc(t.winner)}</td>
        <td>${esc(t.runner_up || '—')}</td><td>${esc(t.final_score || '—')}</td><td>${esc(t.host || '—')}</td></tr>`)}</tbody></table></div>
    <aside class="aside"><h3>Most titles</h3><div class="honours">${c.leaderboard.map((l) => html`<div class="honour"><span class="honour__n">${l.count}</span>
      <div style="flex:1"><strong>${esc(l.winner)}</strong><div class="bar" style="width:${(l.count / max) * 100}%" aria-hidden="true"></div></div></div>`)}</div>
      <p class="muted" style="margin-top:16px">Only Egyptian winners are listed.</p></aside></div>`;
}

async function nationalTeams() {
  setTitle('National teams');
  const teams = await api('/national-teams');
  main.innerHTML = html`<div class="wrap detail-head"><h1>National teams</h1><p class="hero__lede">The Pharaohs and every Egyptian national side, from the Olympic teams of the 1920s to the youth and women’s teams.</p></div>
  <div class="wrap section"><div class="grid">${teams.map((t) => html`<a class="card reveal" href="/national-teams/${esc(t.slug)}" data-link><h3>${esc(t.name_en)}</h3>
    <span class="ar" lang="ar">${esc(t.name_ar)}</span><p class="muted">${esc(t.summary_en || '')}</p><div class="card__meta"><span class="badge">${esc(t.category)}</span></div></a>`)}</div></div>`;
}

async function nationalTeam(slug) {
  const t = await api(`/national-teams/${encodeURIComponent(slug)}`);
  setTitle(t.name_en);
  const by = Object.groupBy ? Object.groupBy(t.appearances, (a) => a.tournament) : t.appearances.reduce((o, a) => ((o[a.tournament] ||= []).push(a), o), {});
  main.innerHTML = html`<header class="detail-head"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/national-teams" data-link>National teams</a></nav>
    <span class="ar" lang="ar">${esc(t.name_ar)}</span><h1>${esc(t.name_en)}</h1><p class="hero__lede">${esc(t.summary_en || '')}</p></div></header>
  ${Object.entries(by).map(([name, rows]) => html`<section class="section"><div class="wrap"><h2>${esc(name)}</h2>
    <div class="table-scroll"><table class="table"><thead><tr><th scope="col">Year</th><th scope="col">Host</th><th scope="col">Result</th><th scope="col">Coach</th><th scope="col">Notes</th></tr></thead>
    <tbody>${rows.map((a) => html`<tr><td><strong>${a.year}</strong></td><td>${esc(a.host || '—')}</td>
      <td>${a.result === 'Champions' ? '<span class="badge badge--gold">Champions</span>' : esc(a.result || 'To be confirmed')}</td>
      <td>${esc(a.coach || '—')}</td><td class="muted">${esc(a.notes_en || '')}</td></tr>`)}</tbody></table></div></div></section>`)}`;
}

async function timeline() {
  setTitle('Timeline');
  const [events, eras] = await Promise.all([api('/timeline'), api('/eras')]);
  const eraFor = (y) => eras.find((e) => y >= e.start_year && (e.end_year == null || y <= e.end_year));
  let last = null;
  main.innerHTML = html`<div class="wrap detail-head"><h1>Timeline</h1><p class="hero__lede">More than a century of Egyptian football, era by era.</p></div>
  <div class="wrap section"><ol class="timeline">${events.map((e) => {
    const era = eraFor(Number(year(e.date)));
    const band = era && era !== last ? `<li class="era-band" aria-hidden="false">${esc(era.name_en)} · ${era.start_year}–${era.end_year ?? 'today'}</li>` : '';
    last = era;
    const link = e.player_slug ? `/players/${e.player_slug}` : e.club_slug ? `/clubs/${e.club_slug}` : null;
    return band + html`<li class="tl reveal ${e.featured ? 'tl--featured' : ''}"><span class="tl__year">${year(e.date)}</span>
      <div><h3>${link ? `<a href="${esc(link)}" data-link>${esc(e.title_en)}</a>` : esc(e.title_en)}</h3>
      <span class="muted">${fmtDate(e.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span>${e.body_en ? `<p>${esc(e.body_en)}</p>` : ''}</div></li>`;
  })}</ol></div>`;
}

let newsPage = 1;
async function news() {
  setTitle('News');
  newsPage = 1;
  const data = await api('/news?limit=20');
  main.innerHTML = html`<div class="wrap detail-head"><h1>News</h1><p class="hero__lede">Egyptian football headlines from major outlets, updated automatically. New stories appear here as they are published.</p>
    <div class="filters" role="group" aria-label="Language"><button class="chip" aria-pressed="true" data-lang="">All</button><button class="chip" aria-pressed="false" data-lang="en">English</button><button class="chip" aria-pressed="false" data-lang="ar">العربية</button></div></div>
  <div class="wrap section"><div class="news-list" data-news-list>${data.items.length ? data.items.map((n) => newsItem(n)) : '<p class="empty">No stories yet. The feed checks for news every few minutes.</p>'}</div>
  ${data.total > 20 ? '<p style="margin-top:24px"><button class="btn btn--ghost" data-more>Load more</button></p>' : ''}</div>`;
  let lang = '';
  const list = main.querySelector('[data-news-list]');
  main.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', async () => {
    lang = b.dataset.lang; newsPage = 1;
    main.querySelectorAll('[data-lang]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const d = await api(`/news?limit=20${lang ? `&lang=${lang}` : ''}`);
    list.innerHTML = d.items.map((n) => newsItem(n)).join('') || '<p class="empty">No stories in this language yet.</p>';
  }));
  main.querySelector('[data-more]')?.addEventListener('click', async (e) => {
    newsPage += 1;
    const d = await api(`/news?limit=20&page=${newsPage}${lang ? `&lang=${lang}` : ''}`);
    list.insertAdjacentHTML('beforeend', d.items.map((n) => newsItem(n)).join(''));
    if (newsPage * 20 >= d.total) e.target.remove();
  });
}

async function newsArticle(id) {
  const n = await api(`/news/${encodeURIComponent(id)}`);
  if (n.url) { location.href = n.url; return; }
  setTitle(n.title);
  main.innerHTML = html`<header class="detail-head"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="/news" data-link>News</a></nav>
    <h1 style="font-size:clamp(2rem,5vw,3.4rem)">${esc(n.title)}</h1><p class="muted">${fmtDate(n.published_at, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div></header>
    <div class="wrap layout"><article class="prose">${(n.body || n.excerpt || '').split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`)}</article></div>`;
}

async function search(params) {
  const q = params.get('q') || '';
  setTitle(q ? `Search: ${q}` : 'Search');
  const r = q.length >= 2 ? await api(`/search?q=${encodeURIComponent(q)}`) : { players: [], clubs: [], competitions: [] };
  const total = r.players.length + r.clubs.length + r.competitions.length;
  main.innerHTML = html`<div class="wrap detail-head"><h1>Search</h1>
    <form class="filters" data-search role="search"><label class="sr-only" for="sq">Search the archive</label><input id="sq" name="q" type="search" value="${esc(q)}" placeholder="Player, club or competition"><button class="btn">Search</button></form>
    ${q ? `<p class="muted" aria-live="polite">${total} result${total === 1 ? '' : 's'} for “${esc(q)}”</p>` : ''}</div>
  <div class="wrap section">
    ${r.players.length ? html`<h2>Players</h2><div class="grid">${r.players.map(playerCard)}</div>` : ''}
    ${r.clubs.length ? html`<h2 style="margin-top:32px">Clubs</h2><div class="grid">${r.clubs.map(clubCard)}</div>` : ''}
    ${r.competitions.length ? html`<h2 style="margin-top:32px">Competitions</h2><ul>${r.competitions.map((c) => html`<li><a href="/championships/${esc(c.slug)}" data-link>${esc(c.name_en)}</a></li>`)}</ul>` : ''}
    ${q && !total ? '<p class="empty">Nothing found. Try a shorter name or the Arabic spelling.</p>' : ''}</div>`;
}

// ---------- router ----------
const routes = [
  [/^\/$/, home], [/^\/players\/?$/, players], [/^\/players\/([^/]+)$/, player],
  [/^\/clubs\/?$/, clubs], [/^\/clubs\/([^/]+)$/, club],
  [/^\/championships\/?$/, championships], [/^\/championships\/([^/]+)$/, championship],
  [/^\/national-teams\/?$/, nationalTeams], [/^\/national-teams\/([^/]+)$/, nationalTeam],
  [/^\/timeline\/?$/, timeline], [/^\/news\/?$/, news], [/^\/news\/(\d+)$/, newsArticle], [/^\/search\/?$/, search],
];

async function render() {
  const { pathname, search: qs } = location;
  const params = new URLSearchParams(qs);
  document.querySelectorAll('.nav a').forEach((a) => {
    const on = pathname === a.getAttribute('href') || pathname.startsWith(a.getAttribute('href') + '/');
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  loading();
  try {
    const match = routes.find(([re]) => re.test(pathname));
    if (!match) throw Object.assign(new Error('Not found'), { status: 404 });
    const [, ...args] = pathname.match(match[0]);
    await (args.length ? match[1](decodeURIComponent(args[0]), params) : match[1](params));
  } catch (e) {
    console.error(e);
    main.innerHTML = errorView(e);
  }
  enhance();
}

function navigate(url) {
  history.pushState(null, '', url);
  render().then(() => { window.scrollTo(0, 0); main.focus({ preventScroll: true }); });
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
  e.preventDefault();
  closeNav();
  navigate(a.getAttribute('href'));
});
document.addEventListener('submit', (e) => {
  if (!e.target.matches('[data-search]')) return;
  e.preventDefault();
  const q = new FormData(e.target).get('q');
  navigate(`/search?q=${encodeURIComponent(q)}`);
});
addEventListener('popstate', render);

const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('primary-nav');
const closeNav = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });

// ---------- live news ----------
const ticker = document.getElementById('ticker');
const toast = document.getElementById('toast');
let pending = 0;
const setTicker = (n) => { ticker.innerHTML = n ? `<a href="${esc(n.url || '/news')}" ${n.url ? 'target="_blank" rel="noopener"' : 'data-link'}>${esc(n.title)}</a> <span class="muted">· ${esc(n.source_name || 'Archive')}</span>` : 'No headlines yet.'; };
api('/news?limit=1').then((d) => setTicker(d.items[0])).catch(() => setTicker(null));

function onLiveNews(item) {
  setTicker(item);
  const list = main.querySelector('[data-news-list]');
  // Insert immediately when the reader is at the top of the page, otherwise offer a toast so content doesn't jump.
  if (list && window.scrollY < 300) {
    list.querySelector('.empty')?.remove();
    list.insertAdjacentHTML('afterbegin', newsItem(item, true));
  } else {
    pending += 1;
    toast.textContent = `${pending} new ${pending === 1 ? 'story' : 'stories'} — show`;
    toast.hidden = false;
  }
}
toast.addEventListener('click', () => { pending = 0; toast.hidden = true; navigate('/news'); });

if ('EventSource' in window) {
  const es = new EventSource(`${API}/news-stream`);
  es.addEventListener('news', (e) => onLiveNews(JSON.parse(e.data)));
}

render();
