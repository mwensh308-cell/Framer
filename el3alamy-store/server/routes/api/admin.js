'use strict';
const express = require('express');
const { get, tx } = require('../../db');
const products = require('../../repositories/products');
const orders = require('../../services/orders');
const { validate } = require('../../middleware/validate');
const { HttpError } = require('../../middleware/errors');
const { requireAdmin } = require('../../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^[0-9a-fA-F]{6}$/;

router.get('/stats', (req, res) => res.json(orders.stats()));

// ── Products & variants ──────────────────────────────────────────────────
router.get('/products', (req, res) => res.json({ products: products.list({ includeInactive: true, sort: 'name' }) }));

router.post('/products', validate({
  slug: { type: 'string', required: true, pattern: SLUG, max: 80 },
  name: { type: 'string', required: true, min: 2, max: 120 },
  categorySlug: { type: 'string', required: true },
  kind: { type: 'string', required: true, enum: ['console', 'accessory'] },
  art: { type: 'string', required: true, max: 30 },
  tagline: { type: 'string', required: true, max: 160 },
  description: { type: 'string', required: true, max: 4000 },
  platforms: { type: 'array', required: true, max: 2 },
  specs: { type: 'object' },
  highlights: { type: 'array', max: 10 },
}), (req, res) => {
  const b = req.body;
  const category = products.categoryBySlug(b.categorySlug);
  if (!category) throw new HttpError(422, 'Unknown category');
  if (products.bySlug(b.slug, { includeInactive: true })) throw new HttpError(409, 'Slug already in use');
  const id = tx((conn) => {
    const r = conn.prepare(`INSERT INTO products (slug, name, category_id, kind, art, tagline, description, highlights, specs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(b.slug, b.name, category.id, b.kind, b.art, b.tagline, b.description,
      JSON.stringify(b.highlights || []), JSON.stringify(b.specs || {}));
    const pid = Number(r.lastInsertRowid);
    for (const p of b.platforms.filter((x) => ['ps5', 'ps4'].includes(x))) {
      conn.prepare('INSERT INTO product_platforms (product_id, platform) VALUES (?, ?)').run(pid, p);
    }
    return pid;
  });
  res.status(201).json({ product: products.byId(id) });
});

router.patch('/products/:id', validate({
  name: { type: 'string', min: 2, max: 120 },
  tagline: { type: 'string', max: 160 },
  description: { type: 'string', max: 4000 },
  featured: { type: 'bool' },
  active: { type: 'bool' },
}), (req, res) => {
  const fields = ['name', 'tagline', 'description', 'featured', 'active'].filter((f) => req.body[f] !== undefined);
  if (!fields.length) throw new HttpError(422, 'Nothing to update');
  const values = fields.map((f) => (typeof req.body[f] === 'boolean' ? Number(req.body[f]) : req.body[f]));
  const r = get().prepare(`UPDATE products SET ${fields.map((f) => `${f} = ?`).join(', ')} WHERE id = ?`)
    .run(...values, Number(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Product not found');
  res.json({ product: products.byId(Number(req.params.id)) });
});

const VARIANT_RULES = {
  name: { type: 'string', min: 1, max: 120 },
  color: { type: 'string', max: 60 },
  colorHex: { type: 'string', pattern: HEX },
  price: { type: 'int', min: 0, max: 100_000_000 },
  compareAtPrice: { type: 'int', min: 0, max: 100_000_000 },
  stock: { type: 'int', min: 0, max: 100000 },
  active: { type: 'bool' },
};

router.post('/products/:id/variants', validate({
  ...VARIANT_RULES,
  sku: { type: 'string', required: true, pattern: /^[A-Z0-9-]{2,40}$/ },
  name: { ...VARIANT_RULES.name, required: true },
  price: { ...VARIANT_RULES.price, required: true },
  stock: { ...VARIANT_RULES.stock, required: true },
}), (req, res) => {
  const b = req.body;
  if (!products.byId(Number(req.params.id))) throw new HttpError(404, 'Product not found');
  if (get().prepare('SELECT 1 FROM product_variants WHERE sku = ?').get(b.sku)) throw new HttpError(409, 'SKU already exists');
  get().prepare(`INSERT INTO product_variants (product_id, sku, name, color, color_hex, price, compare_at_price, stock, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position),0)+1 FROM product_variants WHERE product_id = ?))`)
    .run(Number(req.params.id), b.sku, b.name, b.color ?? null, b.colorHex?.toLowerCase() ?? null, b.price,
      b.compareAtPrice ?? null, b.stock, Number(req.params.id));
  res.status(201).json({ product: products.byId(Number(req.params.id)) });
});

router.patch('/variants/:id', validate(VARIANT_RULES), (req, res) => {
  const map = { name: 'name', color: 'color', colorHex: 'color_hex', price: 'price', compareAtPrice: 'compare_at_price', stock: 'stock', active: 'active' };
  const keys = Object.keys(map).filter((k) => req.body[k] !== undefined);
  if (!keys.length) throw new HttpError(422, 'Nothing to update');
  const values = keys.map((k) => (typeof req.body[k] === 'boolean' ? Number(req.body[k]) : req.body[k]));
  const r = get().prepare(`UPDATE product_variants SET ${keys.map((k) => `${map[k]} = ?`).join(', ')} WHERE id = ?`)
    .run(...values, Number(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Variant not found');
  res.json({ variant: get().prepare('SELECT * FROM product_variants WHERE id = ?').get(Number(req.params.id)) });
});

// ── Bundles ──────────────────────────────────────────────────────────────
router.get('/bundles', (req, res) => res.json({ bundles: products.bundles({ includeInactive: true }) }));

router.post('/bundles', validate({
  slug: { type: 'string', required: true, pattern: SLUG },
  name: { type: 'string', required: true, max: 120 },
  description: { type: 'string', required: true, max: 1000 },
  discountPercent: { type: 'int', required: true, min: 0, max: 50 },
  items: { type: 'array', required: true, max: 10 },
}), (req, res) => {
  const b = req.body;
  if (b.items.length < 2) throw new HttpError(422, 'A bundle needs at least two items');
  tx((conn) => {
    const r = conn.prepare('INSERT INTO bundles (slug, name, description, discount_percent) VALUES (?, ?, ?, ?)')
      .run(b.slug, b.name, b.description, b.discountPercent);
    for (const i of b.items) {
      if (!Number.isInteger(i.variantId) || !conn.prepare('SELECT 1 FROM product_variants WHERE id = ?').get(i.variantId)) {
        throw new HttpError(422, `Unknown variant ${i.variantId}`);
      }
      conn.prepare('INSERT INTO bundle_items (bundle_id, variant_id, quantity) VALUES (?, ?, ?)')
        .run(Number(r.lastInsertRowid), i.variantId, Math.max(1, Number(i.quantity) || 1));
    }
  });
  res.status(201).json({ bundle: products.bundleBySlug(b.slug) });
});

router.patch('/bundles/:id', validate({ active: { type: 'bool', required: true } }), (req, res) => {
  const r = get().prepare('UPDATE bundles SET active = ? WHERE id = ?').run(Number(req.body.active), Number(req.params.id));
  if (!r.changes) throw new HttpError(404, 'Bundle not found');
  res.json({ ok: true });
});

// ── Orders ───────────────────────────────────────────────────────────────
router.get('/orders', (req, res) => {
  const status = Object.keys(orders.STATUS_FLOW).includes(req.query.status) ? req.query.status : undefined;
  res.json({ orders: orders.list({ status, limit: 100 }), statuses: orders.STATUS_LABELS, flow: orders.STATUS_FLOW });
});

router.get('/orders/:number', (req, res) => {
  const order = orders.findByNumber(req.params.number);
  if (!order) throw new HttpError(404, 'Order not found');
  res.json({ order, next: orders.STATUS_FLOW[order.status] });
});

router.post('/orders/:number/status', validate({
  status: { type: 'string', required: true, enum: Object.keys(orders.STATUS_FLOW) },
  note: { type: 'string', max: 300 },
  trackingNumber: { type: 'string', max: 60 },
}), (req, res) => {
  const order = orders.transition(req.params.number, req.body.status, {
    note: req.body.note, trackingNumber: req.body.trackingNumber,
  });
  res.json({ order, next: orders.STATUS_FLOW[order.status] });
});

// ── Coupons & customers ──────────────────────────────────────────────────
router.get('/coupons', (req, res) => res.json({ coupons: get().prepare('SELECT * FROM coupons ORDER BY code').all() }));

router.post('/coupons', validate({
  code: { type: 'string', required: true, pattern: /^[A-Za-z0-9]{3,20}$/ },
  percentOff: { type: 'int', required: true, min: 1, max: 90 },
  minSubtotal: { type: 'int', min: 0 },
}), (req, res) => {
  get().prepare('INSERT OR REPLACE INTO coupons (code, percent_off, min_subtotal, active) VALUES (?, ?, ?, 1)')
    .run(req.body.code.toUpperCase(), req.body.percentOff, req.body.minSubtotal ?? 0);
  res.status(201).json({ ok: true });
});

router.get('/customers', (req, res) => res.json({
  customers: get().prepare(`SELECT u.id, u.name, u.email, u.created_at,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders,
      (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id = u.id AND o.status NOT IN ('cancelled','refunded','pending_payment')) AS spent
    FROM users u WHERE role = 'customer' ORDER BY u.id DESC LIMIT 200`).all(),
}));

module.exports = router;
