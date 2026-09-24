'use strict';
const crypto = require('node:crypto');
const db = require('../db');
const pricing = require('./pricing');
const { HttpError } = require('../middleware/errors');

const STATUS_FLOW = {
  pending_payment: ['paid', 'processing', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

const STATUS_LABELS = {
  pending_payment: 'Awaiting payment',
  paid: 'Payment received',
  processing: 'Preparing your order',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function newOrderNumber() {
  const year = new Date().getFullYear();
  return `EL-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Creates an order atomically: re-prices the cart, reserves stock and writes the first tracking event.
 * Card orders start as pending_payment; cash-on-delivery orders go straight to processing.
 */
function create({ cart, email, address, paymentMethod, userId }) {
  return db.tx((conn) => {
    const q = pricing.quote(cart);
    pricing.assertPurchasable(q);
    if (cart.coupon && !q.coupon) throw new HttpError(422, q.couponError || 'Invalid coupon');

    for (const { variantId, quantity } of q.stockNeeded) {
      const r = conn.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?')
        .run(quantity, variantId, quantity);
      if (r.changes !== 1) throw new HttpError(409, 'An item just sold out. Please review your cart.');
    }

    const status = paymentMethod === 'cod' ? 'processing' : 'pending_payment';
    const number = newOrderNumber();
    const r = conn.prepare(`INSERT INTO orders
      (number, user_id, email, status, payment_method, currency, subtotal, discount, shipping, total, coupon_code, shipping_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      number, userId ?? null, email, status, paymentMethod, q.currency, q.subtotal, q.discount, q.shipping, q.total,
      q.coupon?.code ?? null, JSON.stringify(address)
    );
    const orderId = Number(r.lastInsertRowid);

    const insertItem = conn.prepare(`INSERT INTO order_items
      (order_id, variant_id, bundle_id, product_name, variant_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const l of q.lines) {
      insertItem.run(orderId, l.variantId ?? null, l.bundleId ?? null, l.productName, l.variantName, l.unitPrice, l.quantity);
    }
    conn.prepare('INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)').run(
      orderId, status, paymentMethod === 'cod' ? 'Order placed — pay cash on delivery.' : 'Order placed — awaiting card payment.'
    );
    return findByNumber(number);
  });
}

function findByNumber(number) {
  const conn = db.get();
  const order = conn.prepare('SELECT * FROM orders WHERE number = ?').get(number);
  if (!order) return null;
  return {
    ...order,
    shipping_address: JSON.parse(order.shipping_address),
    status_label: STATUS_LABELS[order.status],
    items: conn.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id),
    events: conn.prepare('SELECT status, note, created_at FROM order_events WHERE order_id = ? ORDER BY id').all(order.id)
      .map((e) => ({ ...e, label: STATUS_LABELS[e.status] || e.status })),
  };
}

function listForUser(userId) {
  return db.get().prepare(
    'SELECT number, status, total, currency, created_at FROM orders WHERE user_id = ? ORDER BY id DESC'
  ).all(userId).map((o) => ({ ...o, status_label: STATUS_LABELS[o.status] }));
}

function list({ status, limit = 50, offset = 0 } = {}) {
  const where = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  return db.get().prepare(
    `SELECT id, number, email, status, payment_method, total, currency, created_at FROM orders ${where}
     ORDER BY id DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset).map((o) => ({ ...o, status_label: STATUS_LABELS[o.status] }));
}

/** Moves an order along the status flow; restocks on cancel. */
function transition(number, nextStatus, { note, trackingNumber, paymentRef } = {}) {
  return db.tx((conn) => {
    const order = conn.prepare('SELECT * FROM orders WHERE number = ?').get(number);
    if (!order) throw new HttpError(404, 'Order not found');
    if (order.status === nextStatus) return findByNumber(number); // idempotent (e.g. repeated webhooks)
    if (!STATUS_FLOW[order.status]?.includes(nextStatus)) {
      throw new HttpError(409, `Cannot move an order from "${order.status}" to "${nextStatus}".`);
    }
    if (nextStatus === 'cancelled') {
      const items = conn.prepare('SELECT variant_id, bundle_id, quantity FROM order_items WHERE order_id = ?').all(order.id);
      for (const i of items) {
        if (i.variant_id) {
          conn.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?').run(i.quantity, i.variant_id);
        } else if (i.bundle_id) {
          for (const bi of conn.prepare('SELECT variant_id, quantity FROM bundle_items WHERE bundle_id = ?').all(i.bundle_id)) {
            conn.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?').run(bi.quantity * i.quantity, bi.variant_id);
          }
        }
      }
    }
    conn.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now'),
      tracking_number = COALESCE(?, tracking_number), payment_ref = COALESCE(?, payment_ref) WHERE id = ?`)
      .run(nextStatus, trackingNumber ?? null, paymentRef ?? null, order.id);
    conn.prepare('INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)')
      .run(order.id, nextStatus, note ?? null);
    return findByNumber(number);
  });
}

/** Releases stock held by card orders that were never paid (e.g. abandoned Stripe Checkout). */
function expireStale(minutes = 60) {
  const stale = db.get().prepare(
    "SELECT number FROM orders WHERE status = 'pending_payment' AND created_at < datetime('now', ?)"
  ).all(`-${Number(minutes)} minutes`);
  for (const { number } of stale) transition(number, 'cancelled', { note: 'Payment not completed — order expired.' });
  return stale.length;
}

function stats() {
  const conn = db.get();
  const revenue = conn.prepare(
    "SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS n FROM orders WHERE status NOT IN ('cancelled','refunded','pending_payment')"
  ).get();
  const byStatus = conn.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all();
  const last30 = conn.prepare(
    `SELECT date(created_at) AS day, SUM(total) AS total, COUNT(*) AS n FROM orders
     WHERE status NOT IN ('cancelled','refunded','pending_payment') AND created_at >= date('now','-30 day')
     GROUP BY day ORDER BY day`
  ).all();
  const lowStock = conn.prepare(
    `SELECT v.id, v.sku, v.name, v.stock, p.name AS product_name FROM product_variants v
     JOIN products p ON p.id = v.product_id WHERE v.active = 1 AND v.stock <= 5 ORDER BY v.stock`
  ).all();
  const customers = conn.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").get().n;
  return { revenue: revenue.total, paidOrders: revenue.n, byStatus, last30, lowStock, customers };
}

module.exports = { create, findByNumber, listForUser, list, transition, expireStale, stats, STATUS_FLOW, STATUS_LABELS };
