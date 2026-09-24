'use strict';
// Listing template used by three page types:
//   /shop                       — all products with filters (hub of hubs)
//   /category/:slug             — category hubs (pSEO: "[category]" / "buy [category]")
//   /compatible/:platform       — platform collections (pSEO: "[platform] accessories")
const products = require('../../repositories/products');
const schema = require('../../seo/schema');
const { layout } = require('../layout');
const { html } = require('../html');
const { productCard, breadcrumb, faqList, sectionHead } = require('../components');
const icons = require('../icons');

const PLATFORM_PAGES = {
  ps5: {
    title: 'PS5 Accessories — Controllers, Headsets, VR & More',
    h1: 'PS5 accessories',
    intro:
      'Every item on this page is confirmed to work with PlayStation 5, PS5 Slim and PS5 Pro. Start with a second DualSense for local multiplayer, ' +
      'add a PULSE headset to hear Tempest 3D Audio properly, and consider the Disc Drive if you own a Digital Edition or PS5 Pro.',
    faq: [
      { q: 'Which accessories work with PS5 Pro?', a: 'All PS5 accessories work with PS5 Pro, including PS VR2, PlayStation Portal and the PS5 Disc Drive.' },
      { q: 'Do PS4 headsets work on PS5?', a: 'Most USB and 3.5mm headsets work. PULSE 3D is officially supported on both PS5 and PS4.' },
    ],
  },
  ps4: {
    title: 'PS4 Accessories — DualShock 4, Headsets & More',
    h1: 'PS4 accessories',
    intro:
      'Keep your PlayStation 4 going strong. These accessories are compatible with PS4, PS4 Slim and PS4 Pro — the DualShock 4 is the only controller that works with PS4, ' +
      'and the PULSE 3D headset connects wirelessly via its USB adapter.',
    faq: [
      { q: 'Does the DualSense work on PS4?', a: 'No. PS4 requires a DualShock 4 controller.' },
      { q: 'Can I use PS VR2 with PS4?', a: 'No, PS VR2 is compatible with PS5 consoles only.' },
    ],
  },
};

const SORT_OPTIONS = [
  ['featured', 'Featured'], ['newest', 'Newest'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'], ['name', 'Name'],
];

function filters({ categories, activeCategory, activePlatform, sort, showCategory, showPlatform, q }) {
  return html`
  <form class="filters reveal" data-filters method="get">
    ${q ? html`<input type="hidden" name="q" value="${q}">` : ''}
    ${showCategory ? html`
    <div class="chip-group" role="group" aria-label="Category">
      <button type="button" class="chip ${activeCategory ? '' : 'active'}" data-filter-category="">All</button>
      ${categories.filter((c) => c.product_count).map((c) => html`<button type="button" class="chip ${activeCategory === c.slug ? 'active' : ''}" data-filter-category="${c.slug}">${c.name}</button>`)}
    </div>` : ''}
    <div class="filter-right">
      ${showPlatform ? html`
      <div class="segmented" role="group" aria-label="Platform">
        ${[['', 'All'], ['ps5', 'PS5'], ['ps4', 'PS4']].map(([k, l]) => html`<button type="button" class="${(activePlatform || '') === k ? 'active' : ''}" data-filter-platform="${k}">${l}</button>`)}
      </div>` : ''}
      <label class="select">
        <span class="sr-only">Sort by</span>
        <select name="sort" data-sort>
          ${SORT_OPTIONS.map(([k, l]) => html`<option value="${k}" ${sort === k ? 'selected' : ''}>${l}</option>`)}
        </select>
      </label>
    </div>
  </form>`;
}

function renderListing(req, { mode, category, platform }) {
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'featured';
  const q = mode === 'shop' && typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  const qPlatform = mode === 'shop' && ['ps5', 'ps4'].includes(req.query.platform) ? req.query.platform : undefined;
  const categories = products.categories();

  let title, h1, intro, path, faq = [], crumbs, description;
  const list = products.list({
    category: category?.slug || (mode === 'shop' && typeof req.query.category === 'string' ? req.query.category : undefined),
    platform: platform || qPlatform,
    q: q || undefined,
    sort,
  });

  if (mode === 'category') {
    title = `${category.headline} — Buy Online`;
    h1 = category.headline;
    intro = category.intro;
    path = `/category/${category.slug}`;
    faq = category.buying_tips;
    crumbs = [{ name: 'Home', url: '/' }, { name: 'Shop', url: '/shop' }, { name: category.name, url: path }];
    description = `${category.headline} at El3alamy Store: ${list.slice(0, 3).map((p) => p.name).join(', ')} and more. Genuine, warrantied, fast delivery.`;
  } else if (mode === 'platform') {
    const page = PLATFORM_PAGES[platform];
    title = page.title;
    h1 = page.h1;
    intro = page.intro;
    path = `/compatible/${platform}`;
    faq = page.faq;
    crumbs = [{ name: 'Home', url: '/' }, { name: 'Shop', url: '/shop' }, { name: h1, url: path }];
    description = `${list.length} ${h1} confirmed compatible — ${list.slice(0, 3).map((p) => p.name).join(', ')}. Genuine and in stock at El3alamy Store.`;
  } else {
    title = q ? `Search results for “${q}”` : 'Shop PlayStation Consoles & Accessories';
    h1 = q ? `Results for “${q}”` : 'The store';
    intro = q ? `${list.length} product${list.length === 1 ? '' : 's'} found.` : 'Every console, controller and accessory we carry — filter by category or platform.';
    path = '/shop';
    crumbs = [{ name: 'Home', url: '/' }, { name: 'Shop', url: path }];
    description = 'Browse all PlayStation consoles and accessories at El3alamy Store: PS5 Pro, PS5 Slim, PS4, DualSense, PULSE headsets, PS VR2 and more.';
  }

  const isFiltered = mode === 'shop' && (q || req.query.category || req.query.platform);
  const otherPlatform = platform === 'ps5' ? 'ps4' : 'ps5';
  const siblingCategories = categories.filter((c) => c.product_count && c.slug !== category?.slug);

  const body = html`
  <section class="page-hero container">
    ${breadcrumb(crumbs)}
    <h1 class="reveal">${h1}</h1>
    <p class="lead muted reveal">${intro}</p>
  </section>
  <section class="container section-tight">
    ${filters({
      categories, activeCategory: mode === 'shop' ? req.query.category : null, activePlatform: qPlatform, sort, q,
      showCategory: mode === 'shop', showPlatform: mode !== 'platform',
    })}
    <p class="muted small result-count" data-result-count>${list.length} product${list.length === 1 ? '' : 's'}</p>
    <div class="product-grid" data-product-grid>
      ${list.length ? list.map((p, i) => productCard(p, { eager: i < 4 })) : html`<div class="empty-state"><p>No products match. <a href="/shop">Clear filters</a></p></div>`}
    </div>
    <div class="empty-state" data-empty hidden><p>No products match these filters.</p></div>
  </section>

  ${faq.length ? html`
  <section class="container section">
    ${sectionHead({ eyebrow: 'Buying guide', title: `${h1}: common questions` })}
    ${faqList(faq)}
  </section>` : ''}

  ${mode !== 'shop' ? html`
  <section class="container section-tight">
    <div class="related-links reveal">
      <h2 class="h4">Keep exploring</h2>
      <ul class="pill-links">
        ${siblingCategories.map((c) => html`<li><a href="/category/${c.slug}">${c.name}</a></li>`)}
        ${mode === 'platform' ? html`<li><a href="/compatible/${otherPlatform}">${PLATFORM_PAGES[otherPlatform].h1}</a></li>` : html`<li><a href="/compatible/ps5">PS5 accessories</a></li><li><a href="/compatible/ps4">PS4 accessories</a></li>`}
        <li><a href="/compare">Comparisons</a></li>
        <li><a href="/bundles">Bundles ${icons.arrow({ size: 14 })}</a></li>
      </ul>
    </div>
  </section>` : ''}`;

  return layout({
    req,
    path,
    // Filtered/search variants of /shop are not indexable (thin, duplicative); hubs are.
    noindex: Boolean(isFiltered),
    title,
    description,
    jsonLd: [schema.breadcrumbs(crumbs), schema.itemList(h1, list), schema.faq(faq)],
    body: body.toString(),
    bodyClass: 'page-listing',
  });
}

module.exports = { renderListing, PLATFORM_PAGES };
