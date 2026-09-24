'use strict';
// Programmatic comparison pages: /compare/:a-vs-:b
// Pairs are generated from catalog data (same category, ≥4 shared spec rows) so every page has a real
// side-by-side table, price delta and a data-driven verdict rather than swapped template text.
const products = require('../../repositories/products');
const schema = require('../../seo/schema');
const { layout } = require('../layout');
const { html, money, stars } = require('../html');
const { breadcrumb, sectionHead } = require('../components');
const icons = require('../icons');

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

function verdict(pair) {
  const { a, b, shared } = pair;
  const diffs = shared.filter((k) => a.specs[k] !== b.specs[k]);
  const onlyA = Object.keys(a.specs).filter((k) => !(k in b.specs));
  const onlyB = Object.keys(b.specs).filter((k) => !(k in a.specs));
  const [cheap, pricey] = a.minPrice <= b.minPrice ? [a, b] : [b, a];
  const delta = pricey.minPrice - cheap.minPrice;
  const pct = cheap.minPrice ? Math.round((delta / cheap.minPrice) * 100) : 0;

  const summary = [];
  if (delta > 0) {
    summary.push(`${pricey.name} costs ${money(delta)} more (${pct}%) than ${cheap.name}.`);
  } else {
    summary.push(`${a.name} and ${b.name} are priced the same.`);
  }
  if (diffs.length) summary.push(`They differ on ${diffs.length} of ${shared.length} key specs: ${diffs.slice(0, 4).map(lower).join(', ')}.`);
  if (a.release_year && b.release_year && a.release_year !== b.release_year) {
    const [older, newer] = a.release_year < b.release_year ? [a, b] : [b, a];
    summary.push(`${newer.name} is the newer model (${newer.release_year} vs ${older.release_year}).`);
  }
  const platformsA = a.platforms.map((p) => p.label).join(' & ');
  const platformsB = b.platforms.map((p) => p.label).join(' & ');
  if (platformsA !== platformsB) summary.push(`${a.name} works with ${platformsA}; ${b.name} works with ${platformsB}.`);

  const pick = (p, other) => {
    const reasons = p.highlights.filter((h) => !other.highlights.includes(h)).slice(0, 3).map(lower);
    return { product: p, reasons: reasons.length ? reasons : [lower(p.tagline.replace(/\.$/, ''))] };
  };

  return { diffs, onlyA, onlyB, summary, cheap, pricey, delta, choose: [pick(a, b), pick(b, a)] };
}

function renderPair(req, pair) {
  const { a, b, shared } = pair;
  const v = verdict(pair);
  const path = `/compare/${pair.slug}`;
  const title = `${a.name} vs ${b.name}: Specs, Price & Which to Buy`;
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Compare', url: '/compare' }, { name: `${a.name} vs ${b.name}`, url: path }];
  const faq = [
    { q: `Which is cheaper, ${a.name} or ${b.name}?`, a: v.delta > 0 ? `${v.cheap.name} is cheaper — ${money(v.delta)} less than ${v.pricey.name} at El3alamy Store.` : 'They are currently the same price.' },
    { q: `What is the main difference between ${a.name} and ${b.name}?`, a: v.summary.slice(1).join(' ') || `They share the same key specs; the difference is design and price.` },
  ];
  const rows = [...shared, ...v.onlyA, ...v.onlyB];

  const body = html`
  <section class="page-hero container">
    ${breadcrumb(crumbs)}
    <p class="eyebrow">Head to head</p>
    <h1 class="reveal">${a.name} <span class="vs">vs</span> ${b.name}</h1>
    <p class="lead muted reveal">${v.summary.join(' ')}</p>
  </section>

  <section class="container section-tight">
    <div class="versus reveal">
      ${[a, b].map((p) => html`
      <article class="versus-card" data-tilt>
        <a href="/products/${p.slug}"><img src="${p.image}" alt="${p.name}" width="320" height="320"></a>
        <h2 class="h4"><a href="/products/${p.slug}">${p.name}</a></h2>
        ${p.rating ? html`<p>${stars(p.rating.avg)} <span class="muted small">(${p.rating.count})</span></p>` : ''}
        <p class="price"><strong>${p.variants.length > 1 ? 'From ' : ''}${money(p.minPrice)}</strong></p>
        <a class="btn btn-primary btn-block" href="/products/${p.slug}">View ${p.name}</a>
      </article>`)}
      <span class="versus-badge" aria-hidden="true">VS</span>
    </div>
  </section>

  <section class="container section">
    ${sectionHead({ eyebrow: 'Side by side', title: 'Specifications compared' })}
    <div class="table-scroll reveal">
      <table class="compare-table">
        <thead><tr><th scope="col">Spec</th><th scope="col">${a.name}</th><th scope="col">${b.name}</th></tr></thead>
        <tbody>
          <tr><th scope="row">Price</th><td>${money(a.minPrice)}</td><td>${money(b.minPrice)}</td></tr>
          ${rows.map((k) => html`<tr class="${a.specs[k] !== b.specs[k] ? 'is-diff' : ''}"><th scope="row">${k}</th><td>${a.specs[k] ?? '—'}</td><td>${b.specs[k] ?? '—'}</td></tr>`)}
          <tr><th scope="row">Works with</th><td>${a.platforms.map((p) => p.label).join(', ')}</td><td>${b.platforms.map((p) => p.label).join(', ')}</td></tr>
          <tr><th scope="row">Options</th><td>${a.variants.map((x) => x.name).join(', ')}</td><td>${b.variants.map((x) => x.name).join(', ')}</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="container section">
    ${sectionHead({ eyebrow: 'Verdict', title: 'Which should you buy?' })}
    <div class="choose-grid">
      ${v.choose.map((c) => html`
      <div class="choose-card reveal">
        <h3>Choose ${c.product.name} if you want…</h3>
        <ul class="check-list">${c.reasons.map((r) => html`<li>${icons.check({ size: 18 })} ${r}</li>`)}</ul>
        <a class="link-arrow" href="/products/${c.product.slug}">Shop ${c.product.name} ${icons.arrow({ size: 16 })}</a>
      </div>`)}
    </div>
  </section>`;

  return layout({
    req,
    path,
    // Near-identical pairs add little value — keep them crawlable for users but out of the index.
    noindex: v.diffs.length < 2,
    title,
    description: `${a.name} vs ${b.name}: ${v.summary[0]} Full spec comparison and our buying advice.`.slice(0, 160),
    jsonLd: [schema.breadcrumbs(crumbs), schema.faq(faq)],
    body: body.toString(),
    bodyClass: 'page-compare',
  });
}

function renderHub(req) {
  const pairs = products.comparisonPairs();
  const byCategory = new Map();
  for (const p of pairs) {
    const key = p.a.category_name;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(p);
  }
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Compare', url: '/compare' }];
  const body = html`
  <section class="page-hero container">
    ${breadcrumb(crumbs)}
    <h1 class="reveal">Compare PlayStation gear</h1>
    <p class="lead muted reveal">Not sure which to buy? Every comparison is generated from our live catalog — real specs, current prices and a straight answer.</p>
  </section>
  <section class="container section-tight">
    ${[...byCategory].map(([cat, list]) => html`
      <h2 class="h4 compare-group">${cat}</h2>
      <div class="compare-hub-grid">
        ${list.map((p) => html`
        <a class="compare-tile reveal" href="/compare/${p.slug}">
          <span class="compare-tile-imgs"><img src="${p.a.image}" alt="" width="96" height="96" loading="lazy"><span class="vs">vs</span><img src="${p.b.image}" alt="" width="96" height="96" loading="lazy"></span>
          <strong>${p.a.name} vs ${p.b.name}</strong>
        </a>`)}
      </div>`)}
  </section>`;
  return layout({
    req, path: '/compare',
    title: 'Compare PS5, PS4, Controllers & Headsets',
    description: 'Side-by-side comparisons of PS5 Pro, PS5 Slim, PS4, DualSense, DualSense Edge, PULSE headsets and more — specs, prices and which to buy.',
    jsonLd: [schema.breadcrumbs(crumbs)],
    body: body.toString(),
  });
}

module.exports = { renderPair, renderHub, verdict };
