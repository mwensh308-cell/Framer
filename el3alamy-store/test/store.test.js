'use strict';
// End-to-end API + page tests against an in-memory database. Run: npm test
process.env.DB_FILE = ':memory:';
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'admin-password-123';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const db = require('../server/db');
const { seedIfEmpty } = require('../server/db/seed');
const { createApp } = require('../server/app');
const payments = require('../server/services/payments');

let server;
let base;

before(async () => {
  db.open(':memory:');
  seedIfEmpty();
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); db.close(); });

function client() {
  let cookie = '';
  return async (path, { method = 'GET', body, headers = {} } = {}) => {
    const res = await fetch(base + path, {
      method, redirect: 'manual',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const type = res.headers.get('content-type') || '';
    return { status: res.status, headers: res.headers, body: type.includes('json') ? await res.json() : await res.text() };
  };
}

const variant = (sku) => db.get().prepare('SELECT * FROM product_variants WHERE sku = ?').get(sku);
const ADDRESS = { fullName: 'Test Buyer', phone: '+20 100 000 0000', line1: '1 Nile St', city: 'Cairo', country: 'Egypt' };

test('SEO pages render with canonical, JSON-LD and correct status codes', async () => {
  const req = client();
  for (const path of ['/', '/shop', '/category/consoles', '/compatible/ps4', '/products/ps5-pro', '/bundles', '/compare', '/compare/ps5-pro-vs-ps5-slim', '/about', '/support']) {
    const r = await req(path);
    assert.equal(r.status, 200, path);
    assert.match(r.body, /<link rel="canonical"/, path);
    assert.match(r.body, /application\/ld\+json/, path);
  }
  const product = await req('/products/ps5-pro');
  assert.match(product.body, /"@type":"Product"/);
  assert.match(product.body, /instagram\.com\/mostafael\.alamy/);
  assert.match(product.body, /tiktok\.com\/@mostafaahmedelalamy/);
  assert.match(product.body, /facebook\.com\/mostafa\.elalamy\.9465/);
  assert.equal((await req('/products/does-not-exist')).status, 404);
  assert.equal((await req('/compare/ps5-slim-vs-ps5-pro')).status, 301);
  assert.match((await req('/checkout')).body, /noindex/);
  assert.match((await req('/shop?q=pulse')).body, /noindex/);
});

test('sitemap lists products, hubs and only meaningful comparisons', async () => {
  const { body } = await client()('/sitemap.xml');
  assert.match(body, /\/products\/dualsense-edge</);
  assert.match(body, /\/category\/audio</);
  assert.match(body, /\/compare\/ps5-pro-vs-ps5-slim</);
  assert.doesNotMatch(body, /charging-station-vs/);
});

test('cart quote is priced on the server, applies bundle discount and coupons', async () => {
  const req = client();
  const ds = variant('DS-WHITE');
  const r = await req('/api/cart/quote', { method: 'POST', body: { items: [{ variantId: ds.id, quantity: 2, price: 1 }], bundles: [{ bundleId: 1, quantity: 1 }], coupon: 'WELCOME10' } });
  assert.equal(r.status, 200);
  const itemLine = r.body.lines.find((l) => l.type === 'item');
  assert.equal(itemLine.lineTotal, ds.price * 2);
  const bundleLine = r.body.lines.find((l) => l.type === 'bundle');
  assert.equal(bundleLine.unitPrice, Math.round(bundleLine.compareAt * 0.9 / 100) * 100);
  assert.equal(r.body.discount, Math.round(r.body.subtotal * 0.1 / 100) * 100);
  assert.equal(r.body.shipping, 0); // above free-shipping threshold
  assert.equal(r.body.total, r.body.subtotal - r.body.discount);

  const bad = await req('/api/cart/quote', { method: 'POST', body: { items: [{ variantId: ds.id, quantity: 1 }], coupon: 'NOPE' } });
  assert.equal(bad.body.couponError, 'This code is not valid.');
});

test('COD checkout reserves stock, prevents overselling and supports tracking', async () => {
  const req = client();
  const v = variant('PS4P-1TB');
  const r = await req('/api/orders', { method: 'POST', body: { email: 'buyer@test.local', paymentMethod: 'cod', address: ADDRESS, cart: { items: [{ variantId: v.id, quantity: 2 }] } } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.order.status, 'processing');
  assert.equal(variant('PS4P-1TB').stock, v.stock - 2);

  const over = await req('/api/orders', { method: 'POST', body: { email: 'buyer@test.local', paymentMethod: 'cod', address: ADDRESS, cart: { items: [{ variantId: v.id, quantity: 10 }] } } });
  assert.equal(over.status, 409);

  const tracked = await req('/api/orders/track', { method: 'POST', body: { number: r.body.order.number, email: 'BUYER@test.local' } });
  assert.equal(tracked.status, 200);
  assert.equal(tracked.body.order.shipping_address.city, 'Cairo');
  assert.equal(tracked.body.order.payment_ref, undefined);
  const wrong = await req('/api/orders/track', { method: 'POST', body: { number: r.body.order.number, email: 'other@test.local' } });
  assert.equal(wrong.status, 404);
});

test('checkout validates the shipping address', async () => {
  const r = await client()('/api/orders', { method: 'POST', body: { email: 'x@test.local', paymentMethod: 'cod', address: { fullName: 'A' }, cart: { items: [] } } });
  assert.equal(r.status, 422);
  assert.ok(r.body.details['address.city']);
});

test('card payment (dev mock) marks order paid', async () => {
  const v = variant('MEDIA-REMOTE');
  const r = await client()('/api/orders', { method: 'POST', body: { email: 'card@test.local', paymentMethod: 'card', address: ADDRESS, cart: { items: [{ variantId: v.id, quantity: 1 }] } } });
  assert.equal(r.status, 201);
  assert.match(r.body.redirect, /\?paid=1$/);
  const order = db.get().prepare('SELECT status FROM orders WHERE number = ?').get(r.body.order.number);
  assert.equal(order.status, 'paid');
});

test('auth: register, session cookie, and admin-only endpoints', async () => {
  const user = client();
  const reg = await user('/api/auth/register', { method: 'POST', body: { name: 'Nour', email: 'nour@test.local', password: 'supersecret1' } });
  assert.equal(reg.status, 201);
  assert.match(reg.headers.get('set-cookie'), /HttpOnly/i);
  assert.equal((await user('/api/auth/me')).body.user.email, 'nour@test.local');
  assert.equal((await user('/api/admin/stats')).status, 403);
  assert.equal((await client()('/api/admin/stats')).status, 401);
  const dup = await client()('/api/auth/register', { method: 'POST', body: { name: 'Nour', email: 'NOUR@test.local', password: 'supersecret1' } });
  assert.equal(dup.status, 409);
  const badLogin = await client()('/api/auth/login', { method: 'POST', body: { email: 'nour@test.local', password: 'wrong-password' } });
  assert.equal(badLogin.status, 401);
});

test('admin: order status flow, restock on cancel, inventory edits', async () => {
  const admin = client();
  assert.equal((await admin('/api/auth/login', { method: 'POST', body: { email: 'admin@test.local', password: 'admin-password-123' } })).status, 200);

  const v = variant('DS-CHARGE');
  const placed = await client()('/api/orders', { method: 'POST', body: { email: 'c@test.local', paymentMethod: 'cod', address: ADDRESS, cart: { items: [{ variantId: v.id, quantity: 3 }] } } });
  const num = placed.body.order.number;
  assert.equal(variant('DS-CHARGE').stock, v.stock - 3);

  const illegal = await admin(`/api/admin/orders/${num}/status`, { method: 'POST', body: { status: 'delivered' } });
  assert.equal(illegal.status, 409);
  const cancelled = await admin(`/api/admin/orders/${num}/status`, { method: 'POST', body: { status: 'cancelled', note: 'Customer request' } });
  assert.equal(cancelled.status, 200);
  assert.equal(variant('DS-CHARGE').stock, v.stock);

  const patched = await admin(`/api/admin/variants/${v.id}`, { method: 'PATCH', body: { price: 199900, stock: 3 } });
  assert.equal(patched.status, 200);
  assert.equal(variant('DS-CHARGE').price, 199900);

  const stats = await admin('/api/admin/stats');
  assert.equal(stats.status, 200);
  assert.ok(stats.body.lowStock.some((x) => x.sku === 'DS-CHARGE'));
});

test('state-changing API calls must be JSON (CSRF hardening)', async () => {
  const r = await client()('/api/newsletter', { method: 'POST', body: 'email=a@b.co', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(r.status, 415);
});

test('stripe webhook signature verification', () => {
  const secret = 'whsec_test';
  const raw = JSON.stringify({ type: 'ping' });
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  assert.equal(payments.verifyStripeSignature(raw, `t=${t},v1=${sig}`, secret), true);
  assert.equal(payments.verifyStripeSignature(raw, `t=${t},v1=${'0'.repeat(64)}`, secret), false);
  assert.equal(payments.verifyStripeSignature(raw, `t=${t - 3600},v1=${sig}`, secret), false);
});

test('generated product art is valid, cacheable SVG', async () => {
  const r = await client()('/art/dualsense/c8203a.svg');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(r.body, /^<svg/);
  assert.match(r.body, /c8203a/);
});
