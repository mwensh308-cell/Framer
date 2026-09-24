'use strict';
const express = require('express');
const products = require('../repositories/products');
const orders = require('../services/orders');
const sitemap = require('../seo/sitemap');
const art = require('../views/art');
const home = require('../views/pages/home');
const { renderListing, PLATFORM_PAGES } = require('../views/pages/listing');
const productPage = require('../views/pages/product');
const compare = require('../views/pages/compare');
const bundlesPage = require('../views/pages/bundles');
const shells = require('../views/pages/app-shells');
const staticPages = require('../views/pages/static');
const errorPage = require('../views/pages/error');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const send = (res, htmlString, { cache = 'public, max-age=60' } = {}) =>
  res.set('Cache-Control', cache).type('html').send(htmlString);
const PRIVATE = { cache: 'private, no-store' };

router.get('/', (req, res) => send(res, home.render(req)));
router.get('/shop', (req, res) => send(res, renderListing(req, { mode: 'shop' })));

router.get('/category/:slug', (req, res, next) => {
  const category = products.categoryBySlug(req.params.slug);
  if (!category) return next();
  send(res, renderListing(req, { mode: 'category', category }));
});

router.get('/compatible/:platform', (req, res, next) => {
  if (!PLATFORM_PAGES[req.params.platform]) return next();
  send(res, renderListing(req, { mode: 'platform', platform: req.params.platform }));
});

router.get('/products/:slug', (req, res, next) => {
  const product = products.bySlug(req.params.slug);
  if (!product) return next();
  send(res, productPage.render(req, product));
});

router.get('/bundles', (req, res) => send(res, bundlesPage.renderList(req)));
router.get('/bundles/:slug', (req, res, next) => {
  const bundle = products.bundleBySlug(req.params.slug);
  if (!bundle) return next();
  send(res, bundlesPage.renderOne(req, bundle));
});

router.get('/compare', (req, res) => send(res, compare.renderHub(req)));
router.get('/compare/:pair', (req, res, next) => {
  const pairs = products.comparisonPairs();
  const pair = pairs.find((p) => p.slug === req.params.pair);
  if (pair) return send(res, compare.renderPair(req, pair));
  // Canonicalise reversed order (b-vs-a → a-vs-b) with a permanent redirect.
  const [x, y] = req.params.pair.split('-vs-');
  const reversed = y && pairs.find((p) => p.slug === `${y}-vs-${x}`);
  if (reversed) return res.redirect(301, `/compare/${reversed.slug}`);
  next();
});

router.get('/about', (req, res) => send(res, staticPages.about(req)));
router.get('/support', (req, res) => send(res, staticPages.support(req)));

// App shells (noindex, never cached publicly).
router.get('/cart', (req, res) => send(res, shells.cart(req), PRIVATE));
router.get('/checkout', (req, res) => send(res, shells.checkout(req), PRIVATE));
router.get('/track', (req, res) => send(res, shells.track(req), PRIVATE));
router.get('/account', (req, res) => send(res, shells.account(req), PRIVATE));
router.get('/admin', (req, res, next) => {
  if (!req.user) return res.redirect('/account?next=/admin');
  requireAdmin(req, res, (err) => (err ? next(err) : send(res, shells.admin(req), PRIVATE)));
});
router.get('/order/:number', (req, res, next) => {
  const order = orders.findByNumber(String(req.params.number).toUpperCase());
  if (!order) return next();
  send(res, shells.order(req, order), PRIVATE);
});

// Generated product art.
router.get('/art/:kind/:hex.svg', (req, res) => {
  res.set('Cache-Control', 'public, max-age=604800, immutable').type('image/svg+xml')
    .send(art.render(req.params.kind, req.params.hex));
});

router.get('/sitemap.xml', (req, res) => res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(sitemap.build()));
router.get('/robots.txt', (req, res) => res.type('text/plain').send(sitemap.robots()));

router.use((req, res) => res.status(404).type('html').send(errorPage.render({ status: 404, req })));

module.exports = router;
