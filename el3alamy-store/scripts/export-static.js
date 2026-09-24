'use strict';
// Exports the whole storefront as static HTML files: npm run export:static
//
//   SITE_URL=https://your-domain npm run export:static   → ./static-site/
//
// Every page is rendered by the real server (against a fresh in-memory copy of the catalog), links are
// rewritten to relative `…/index.html` paths so the site works on any static host or opened from disk,
// and scripts/static/static-api.js replaces the API in the browser (cart, bundles, coupons, search).
// Checkout produces an order summary the customer emails/DMs to the store. Accounts, tracking and admin
// need the Node.js server and are not exported (their pages explain this).
const fs = require('node:fs');
const path = require('node:path');

process.env.DB_FILE = ':memory:';
process.env.NODE_ENV = 'production'; // hides the dev-only mock card payment
process.env.JWT_SECRET ||= require('node:crypto').randomBytes(32).toString('hex');
process.env.ADMIN_PASSWORD ||= require('node:crypto').randomBytes(16).toString('hex');
process.env.SITE_URL ||= 'https://el3alamy.store';

const ROOT_DIR = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT_DIR, 'static-site'));

const config = require('../server/config');
const db = require('../server/db');
const { seedIfEmpty } = require('../server/db/seed');
const { createApp } = require('../server/app');
const products = require('../server/repositories/products');
const { PLATFORM_PAGES } = require('../server/views/pages/listing');
const { layout } = require('../server/views/layout');
const art = require('../server/views/art');

function outFile(sitePath) {
  const clean = sitePath.replace(/^\/+|\/+$/g, '');
  return clean ? path.join(clean, 'index.html') : 'index.html';
}

/** Rewrites root-relative URLs in attributes and embedded JSON to paths relative to `root`. */
function relativise(html, root) {
  const toRel = (p) => {
    const m = p.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    const clean = m[1].replace(/^\/+|\/+$/g, '');
    const rest = (m[2] || '') + (m[3] || '');
    if (!clean) return `${root || './'}index.html${rest}`;
    if (/\.[a-z0-9]+$/i.test(clean)) return root + clean + rest;
    return `${root}${clean}/index.html${rest}`;
  };
  return html
    .replace(/"\/art\//g, `"${root}art/`) // attributes and JSON (product-data)
    .replace(/(href|src)="(\/(?!\/)[^"]*)"/g, (_, attr, p) => `${attr}="${toRel(p)}"`);
}

function injectRuntime(html, root) {
  return html.replace(
    '<script src="/js/app.js" defer></script>',
    `<script src="/static/static-api.js" data-root="${root || './'}"></script>\n  <script src="/js/app.js" defer></script>`
  );
}

function catalogSnapshot() {
  const list = products.list();
  const variants = {};
  for (const p of list) {
    for (const v of p.variants) {
      variants[v.id] = {
        id: v.id, sku: v.sku, name: v.name, price: v.price, compareAt: v.compare_at_price, stock: v.stock,
        image: v.image, productName: p.name, productSlug: p.slug,
      };
    }
  }
  const bundles = {};
  for (const b of products.bundles()) {
    bundles[b.id] = {
      id: b.id, slug: b.slug, name: b.name, price: b.price, fullPrice: b.fullPrice, image: b.items[0]?.image,
      items: b.items.map((i) => ({ variantId: i.variant_id, quantity: i.quantity, productName: i.product_name })),
    };
  }
  const coupons = db.get().prepare('SELECT code, percent_off, min_subtotal FROM coupons WHERE active = 1').all()
    .map((c) => ({ code: c.code, percentOff: c.percent_off, minSubtotal: c.min_subtotal }));
  return {
    currency: config.currency,
    shippingFlat: config.shippingFlat,
    freeShippingThreshold: config.freeShippingThreshold,
    store: { email: config.store.email, social: config.store.social },
    variants, bundles, coupons,
    search: list.map((p) => ({ name: p.name, slug: p.slug, image: p.image, price: p.minPrice, category: p.category_name, tagline: p.tagline })),
  };
}

async function main() {
  db.open(':memory:');
  seedIfEmpty();
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const pages = [
    '/', '/shop', '/bundles', '/compare', '/about', '/support', '/cart', '/checkout', '/account', '/track',
    ...products.categories().filter((c) => c.product_count).map((c) => `/category/${c.slug}`),
    ...Object.keys(PLATFORM_PAGES).map((k) => `/compatible/${k}`),
    ...products.list().map((p) => `/products/${p.slug}`),
    ...products.bundles().map((b) => `/bundles/${b.slug}`),
    ...products.comparisonPairs().map((c) => `/compare/${c.slug}`),
  ];

  const artPaths = new Set();
  const write = (rel, content) => {
    const file = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const emit = (sitePath, html) => {
    const rel = outFile(sitePath);
    const depth = rel.split('/').length - 1;
    const root = '../'.repeat(depth);
    for (const m of html.matchAll(/\/art\/([a-z0-9]+)\/([0-9a-f]{6})\.svg/g)) artPaths.add(`${m[1]}/${m[2]}`);
    write(rel, relativise(injectRuntime(html, root), root));
  };

  for (const p of pages) {
    const res = await fetch(base + p);
    if (res.status !== 200) throw new Error(`${p} returned ${res.status}`);
    emit(p, await res.text());
  }

  // Static-only pages.
  emit('/order-sent', layout({
    title: 'Send your order', description: 'Order summary', noindex: true,
    body: '<div data-static-order><section class="container page-hero"><p class="muted">Loading your order…</p></section></div>',
  }));
  const notFound = await fetch(`${base}/__not-found__`);
  const nf = await notFound.text();
  for (const m of nf.matchAll(/\/art\/([a-z0-9]+)\/([0-9a-f]{6})\.svg/g)) artPaths.add(`${m[1]}/${m[2]}`);
  write('404.html', relativise(injectRuntime(nf, '/'), '/')); // hosts serve 404.html from the site root

  // Every variant/bundle image the runtime may show in the cart.
  const data = catalogSnapshot();
  for (const v of Object.values(data.variants)) {
    const m = v.image.match(/\/art\/([a-z0-9]+)\/([0-9a-f]{6})\.svg/);
    if (m) artPaths.add(`${m[1]}/${m[2]}`);
  }
  for (const key of artPaths) {
    const [kind, hex] = key.split('/');
    write(`art/${kind}/${hex}.svg`, art.render(kind, hex));
  }

  fs.cpSync(path.join(ROOT_DIR, 'public'), OUT, { recursive: true });
  const runtime = fs.readFileSync(path.join(__dirname, 'static', 'static-api.js'), 'utf8')
    .replace('const DATA = __EL3_DATA__;', () => `const DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')};`);
  write('static/static-api.js', runtime);
  write('sitemap.xml', await (await fetch(`${base}/sitemap.xml`)).text());
  write('robots.txt', (await (await fetch(`${base}/robots.txt`)).text()));

  server.close();
  db.close();
  console.log(`Exported ${pages.length + 1} pages and ${artPaths.size} images to ${OUT}`);
  console.log(`Canonical URLs and sitemap use ${config.siteUrl} (set SITE_URL to change).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
