'use strict';
// Server-side source of truth for cart totals. Client prices are never trusted.
const config = require('../config');
const { get } = require('../db');
const products = require('../repositories/products');
const { HttpError } = require('../middleware/errors');

const MAX_QTY = 10;

function loadVariants(ids) {
  if (!ids.length) return new Map();
  const rows = get().prepare(
    `SELECT v.*, p.name AS product_name, p.slug AS product_slug, p.art, p.active AS product_active
     FROM product_variants v JOIN products p ON p.id = v.product_id
     WHERE v.id IN (${ids.map(() => '?').join(',')})`
  ).all(...ids);
  return new Map(rows.map((r) => [r.id, r]));
}

function findCoupon(code, subtotal) {
  if (!code) return { coupon: null };
  const c = get().prepare(
    "SELECT * FROM coupons WHERE code = ? AND active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))"
  ).get(String(code).trim());
  if (!c) return { coupon: null, couponError: 'This code is not valid.' };
  if (subtotal < c.min_subtotal) return { coupon: null, couponError: 'Your cart does not meet the minimum for this code.' };
  return { coupon: c };
}

/**
 * @param {{items?: {variantId:number, quantity:number}[], bundles?: {bundleId:number, quantity:number}[], coupon?: string}} cart
 * @returns quote with lines, totals and per-variant stock requirements
 */
function quote(cart = {}) {
  const itemsIn = Array.isArray(cart.items) ? cart.items.slice(0, 50) : [];
  const bundlesIn = Array.isArray(cart.bundles) ? cart.bundles.slice(0, 20) : [];
  const lines = [];
  const stockNeeded = new Map(); // variantId -> qty
  const issues = [];

  const need = (variantId, qty) => stockNeeded.set(variantId, (stockNeeded.get(variantId) || 0) + qty);
  const clampQty = (q) => Math.max(1, Math.min(MAX_QTY, Number.parseInt(q, 10) || 1));

  const variants = loadVariants(itemsIn.map((i) => Number(i.variantId)).filter(Number.isInteger));
  for (const item of itemsIn) {
    const v = variants.get(Number(item.variantId));
    if (!v || !v.active || !v.product_active) { issues.push({ variantId: item.variantId, issue: 'unavailable' }); continue; }
    const quantity = clampQty(item.quantity);
    need(v.id, quantity);
    lines.push({
      type: 'item', variantId: v.id, sku: v.sku, productName: v.product_name, productSlug: v.product_slug,
      variantName: v.name, image: products.artUrl(v.art, v.color_hex),
      unitPrice: v.price, compareAt: v.compare_at_price, quantity, lineTotal: v.price * quantity,
    });
  }

  const allBundles = products.bundles();
  for (const entry of bundlesIn) {
    const b = allBundles.find((x) => x.id === Number(entry.bundleId));
    if (!b) { issues.push({ bundleId: entry.bundleId, issue: 'unavailable' }); continue; }
    const quantity = clampQty(entry.quantity);
    b.items.forEach((i) => need(i.variant_id, i.quantity * quantity));
    lines.push({
      type: 'bundle', bundleId: b.id, productName: b.name, productSlug: b.slug,
      variantName: b.items.map((i) => `${i.quantity}× ${i.product_name}`).join(' · '),
      image: b.items[0]?.image, items: b.items,
      unitPrice: b.price, compareAt: b.fullPrice, quantity, lineTotal: b.price * quantity,
    });
  }

  // Stock check across items and bundles that share variants.
  const stockRows = loadVariants([...stockNeeded.keys()]);
  for (const [variantId, qty] of stockNeeded) {
    const available = stockRows.get(variantId)?.stock ?? 0;
    if (qty > available) issues.push({ variantId, issue: 'insufficient_stock', available });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const { coupon, couponError } = findCoupon(cart.coupon, subtotal);
  const discount = coupon ? Math.round((subtotal * coupon.percent_off) / 100 / 100) * 100 : 0; // whole units
  const afterDiscount = subtotal - discount;
  const shipping = lines.length === 0 || afterDiscount >= config.freeShippingThreshold ? 0 : config.shippingFlat;

  return {
    currency: config.currency,
    lines,
    issues,
    coupon: coupon ? { code: coupon.code, percentOff: coupon.percent_off } : null,
    couponError: couponError || null,
    subtotal,
    discount,
    shipping,
    total: afterDiscount + shipping,
    freeShippingThreshold: config.freeShippingThreshold,
    stockNeeded: [...stockNeeded].map(([variantId, quantity]) => ({ variantId, quantity })),
  };
}

function assertPurchasable(q) {
  if (!q.lines.length) throw new HttpError(422, 'Your cart is empty.');
  if (q.issues.length) throw new HttpError(409, 'Some items in your cart are no longer available in that quantity.', q.issues);
}

module.exports = { quote, assertPurchasable, MAX_QTY };
