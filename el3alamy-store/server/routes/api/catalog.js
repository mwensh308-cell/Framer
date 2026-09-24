'use strict';
const express = require('express');
const products = require('../../repositories/products');
const pricing = require('../../services/pricing');
const { get } = require('../../db');
const { validate } = require('../../middleware/validate');
const { HttpError } = require('../../middleware/errors');

const router = express.Router();

router.get('/categories', (req, res) => res.json({ categories: products.categories() }));

router.get('/products', (req, res) => {
  const { category, platform, q, sort, featured } = req.query;
  res.json({
    products: products.list({
      category: typeof category === 'string' ? category : undefined,
      platform: ['ps5', 'ps4'].includes(platform) ? platform : undefined,
      q: typeof q === 'string' ? q.slice(0, 80) : undefined,
      sort: typeof sort === 'string' ? sort : undefined,
      featured: featured === 'true',
    }),
  });
});

router.get('/products/:slug', (req, res) => {
  const product = products.bySlug(req.params.slug);
  if (!product) throw new HttpError(404, 'Product not found');
  res.json({
    product,
    reviews: products.reviewsFor(product.id),
    bundles: products.bundlesForProduct(product.id),
    related: products.related(product),
  });
});

router.get('/bundles', (req, res) => res.json({ bundles: products.bundles() }));

router.get('/search', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  if (q.length < 2) return res.json({ results: [] });
  res.json({
    results: products.list({ q, limit: 6 }).map((p) => ({
      name: p.name, slug: p.slug, image: p.image, price: p.minPrice, category: p.category_name,
    })),
  });
});

// Cart quote: the browser keeps the cart, the server prices it.
router.post('/cart/quote', validate({
  items: { type: 'array', max: 50 }, bundles: { type: 'array', max: 20 }, coupon: { type: 'string', max: 40 },
}), (req, res) => {
  const { stockNeeded, ...q } = pricing.quote(req.body);
  res.json(q);
});

router.post('/newsletter', validate({ email: { type: 'email', required: true, max: 160 } }), (req, res) => {
  get().prepare('INSERT OR IGNORE INTO newsletter (email) VALUES (?)').run(req.body.email.trim());
  res.status(201).json({ ok: true, message: 'You are on the list — watch your inbox for drops and deals.' });
});

module.exports = router;
