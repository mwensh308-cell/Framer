/* El3alamy Store — static-export runtime.
 * Loaded before app.js on every exported page. It stands in for the Node.js API so the storefront keeps
 * working on any static host (or straight from disk): cart pricing, bundles, coupons and search run in
 * the browser from a catalog snapshot. Orders are not stored on a server — the customer sends the order
 * summary to the store (email / social DM). Accounts, tracking and admin need the live server.
 * `__EL3_DATA__` is replaced by scripts/export-static.js.
 */
(() => {
  'use strict';
  const DATA = __EL3_DATA__;
  const script = document.currentScript;
  const ROOT = (script && script.dataset.root) || './';

  /** Maps a site path (/products/x?q#h) to a relative file path from the current page. */
  function resolve(path) {
    if (!path || !path.startsWith('/') || path.startsWith('//')) return path;
    const m = path.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    const clean = m[1].replace(/^\/+|\/+$/g, '');
    const rest = (m[2] || '') + (m[3] || '');
    if (!clean) return `${ROOT}index.html${rest}`;
    if (/\.[a-z0-9]+$/i.test(clean)) return ROOT + clean + rest;
    return `${ROOT}${clean}/index.html${rest}`;
  }

  // JS-rendered links (cart drawer, search results, toasts) use site paths — route them to files.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="/"]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute('href');
    if (href.startsWith('//')) return;
    e.preventDefault();
    location.href = resolve(href);
  }, true);

  // ── Pricing (mirrors server/services/pricing.js) ─────────────────────
  const MAX_QTY = 10;
  const clampQty = (q) => Math.max(1, Math.min(MAX_QTY, Number.parseInt(q, 10) || 1));

  function quote(cart = {}) {
    const lines = [];
    const issues = [];
    const need = new Map();
    const add = (id, q) => need.set(id, (need.get(id) || 0) + q);

    for (const item of (cart.items || []).slice(0, 50)) {
      const v = DATA.variants[item.variantId];
      if (!v) { issues.push({ variantId: item.variantId, issue: 'unavailable' }); continue; }
      const quantity = clampQty(item.quantity);
      add(v.id, quantity);
      lines.push({
        type: 'item', variantId: v.id, sku: v.sku, productName: v.productName, productSlug: v.productSlug,
        variantName: v.name, image: resolve(v.image), unitPrice: v.price, compareAt: v.compareAt,
        quantity, lineTotal: v.price * quantity,
      });
    }
    for (const entry of (cart.bundles || []).slice(0, 20)) {
      const b = DATA.bundles[entry.bundleId];
      if (!b) { issues.push({ bundleId: entry.bundleId, issue: 'unavailable' }); continue; }
      const quantity = clampQty(entry.quantity);
      b.items.forEach((i) => add(i.variantId, i.quantity * quantity));
      lines.push({
        type: 'bundle', bundleId: b.id, productName: b.name, productSlug: b.slug,
        variantName: b.items.map((i) => `${i.quantity}× ${i.productName}`).join(' · '),
        image: resolve(b.image), unitPrice: b.price, compareAt: b.fullPrice, quantity, lineTotal: b.price * quantity,
      });
    }
    for (const [variantId, qty] of need) {
      const available = DATA.variants[variantId]?.stock ?? 0;
      if (qty > available) issues.push({ variantId, issue: 'insufficient_stock', available });
    }

    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    let coupon = null;
    let couponError = null;
    if (cart.coupon) {
      const c = DATA.coupons.find((x) => x.code.toLowerCase() === String(cart.coupon).trim().toLowerCase());
      if (!c) couponError = 'This code is not valid.';
      else if (subtotal < c.minSubtotal) couponError = 'Your cart does not meet the minimum for this code.';
      else coupon = c;
    }
    const discount = coupon ? Math.round((subtotal * coupon.percentOff) / 100 / 100) * 100 : 0;
    const after = subtotal - discount;
    const shipping = lines.length === 0 || after >= DATA.freeShippingThreshold ? 0 : DATA.shippingFlat;
    return {
      currency: DATA.currency, lines, issues,
      coupon: coupon ? { code: coupon.code, percentOff: coupon.percentOff } : null, couponError,
      subtotal, discount, shipping, total: after + shipping, freeShippingThreshold: DATA.freeShippingThreshold,
    };
  }

  // ── Fake API ──────────────────────────────────────────────────────────
  const LIVE_ONLY = 'Accounts, order tracking and the admin dashboard are available on the live store server.';
  const ORDER_KEY = 'el3_static_order';

  function orderNumber() {
    const rand = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, '0');
    return `EL-${new Date().getFullYear()}-${rand}`;
  }

  function handle(method, path, body) {
    const url = new URL(path, 'http://x');
    const p = url.pathname.replace(/^\/api/, '');
    if (p === '/config') {
      return [200, { currency: DATA.currency, cardPayments: false, stripe: false, freeShippingThreshold: DATA.freeShippingThreshold, shippingFlat: DATA.shippingFlat }];
    }
    if (p === '/cart/quote') return [200, quote(body)];
    if (p === '/search') {
      const q = (url.searchParams.get('q') || '').trim().toLowerCase();
      if (q.length < 2) return [200, { results: [] }];
      const results = DATA.search.filter((r) => (`${r.name} ${r.category} ${r.tagline}`).toLowerCase().includes(q)).slice(0, 6)
        .map((r) => ({ ...r, image: resolve(r.image) }));
      return [200, { results }];
    }
    if (p === '/newsletter') {
      const email = String(body?.email || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return [422, { error: 'Please check the highlighted fields.', details: { email: 'email must be a valid email' } }];
      return [201, { message: `Thanks! Follow us on Instagram for drops — or email ${DATA.store.email} to join the list.` }];
    }
    if (p === '/orders' && method === 'POST') {
      const q = quote(body.cart);
      if (!q.lines.length) return [422, { error: 'Your cart is empty.' }];
      const errors = {};
      const a = body.address || {};
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email || '')) errors.email = 'email must be a valid email';
      for (const f of ['fullName', 'line1', 'city', 'country']) if (!String(a[f] || '').trim()) errors[`address.${f}`] = `${f} is required`;
      if (!/^\+?[0-9\s-]{7,20}$/.test(a.phone || '')) errors['address.phone'] = 'phone is invalid';
      if (Object.keys(errors).length) return [422, { error: 'Please check your shipping details.', details: errors }];
      const order = { number: orderNumber(), createdAt: new Date().toISOString(), email: body.email, address: a, paymentMethod: 'cod', ...q };
      try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch { /* ignore */ }
      return [201, { order: { number: order.number, total: order.total, status: 'draft' }, redirect: resolve('/order-sent') }];
    }
    return [503, { error: LIVE_ONLY }];
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.startsWith('/api/')) return realFetch(input, init);
    let body;
    try { body = init.body ? JSON.parse(init.body) : undefined; } catch { body = undefined; }
    const [status, json] = handle((init.method || 'GET').toUpperCase(), url, body);
    return new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } });
  };

  // ── Order summary page (static checkout end point) ────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.querySelector('[data-static-order]');
    if (!el) return;
    const { money, esc, cart } = window.El3;
    let order = null;
    try { order = JSON.parse(localStorage.getItem(ORDER_KEY)); } catch { /* ignore */ }
    if (!order) { el.innerHTML = `<div class="panel"><p class="muted">No order to show. <a class="link-arrow" href="${resolve('/shop')}">Browse the store</a></p></div>`; return; }
    cart.clear();

    const a = order.address;
    const text = [
      `New order ${order.number}`,
      ...order.lines.map((l) => `${l.quantity}x ${l.productName} (${l.variantName}) — ${money(l.lineTotal)}`),
      `Subtotal: ${money(order.subtotal)}`,
      order.discount ? `Discount${order.coupon ? ` (${order.coupon.code})` : ''}: -${money(order.discount)}` : '',
      `Shipping: ${order.shipping ? money(order.shipping) : 'Free'}`,
      `TOTAL: ${money(order.total)} — cash on delivery`,
      '',
      `Name: ${a.fullName}`, `Phone: ${a.phone}`, `Email: ${order.email}`,
      `Address: ${a.line1}${a.line2 ? `, ${a.line2}` : ''}, ${a.city}${a.region ? `, ${a.region}` : ''}, ${a.country}`,
    ].filter((x) => x !== '').join('\n');
    const mailto = `mailto:${DATA.store.email}?subject=${encodeURIComponent(`Order ${order.number}`)}&body=${encodeURIComponent(text)}`;
    const socials = DATA.store.social;

    el.innerHTML = `
      <section class="container page-hero order-hero">
        <div class="success-mark"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></div>
        <h1>Almost done, ${esc(a.fullName.split(' ')[0])}!</h1>
        <p class="lead muted">Send us your order <strong>${esc(order.number)}</strong> to confirm it — we'll reply to arrange delivery. Payment is cash on delivery.</p>
      </section>
      <section class="container section-tight checkout-grid">
        <div class="panel">
          <h2 class="h4">Send your order</h2>
          <p class="muted">Email it in one click, or copy it and send it to us in a DM.</p>
          <p><a class="btn btn-primary btn-lg btn-block" href="${esc(mailto)}">Send order by email</a></p>
          <p><button class="btn btn-glass btn-block" type="button" data-copy-order>Copy order details</button></p>
          <div class="community-links">
            <a class="btn btn-glass social-btn social-instagram" href="${esc(socials.instagram)}" target="_blank" rel="noopener">Instagram DM</a>
            <a class="btn btn-glass social-btn social-facebook" href="${esc(socials.facebook)}" target="_blank" rel="noopener">Facebook</a>
            <a class="btn btn-glass social-btn social-tiktok" href="${esc(socials.tiktok)}" target="_blank" rel="noopener">TikTok</a>
          </div>
          <pre class="muted small" style="white-space:pre-wrap;margin-top:20px">${esc(text)}</pre>
        </div>
        <aside class="panel summary">
          <h2 class="h4">Summary</h2>
          <ul class="summary-lines">${order.lines.map((l) => `<li><span>${l.quantity}× ${esc(l.productName)}<small class="muted">${esc(l.variantName)}</small></span><span>${money(l.lineTotal)}</span></li>`).join('')}</ul>
          <dl class="totals">
            <div><dt>Subtotal</dt><dd>${money(order.subtotal)}</dd></div>
            ${order.discount ? `<div><dt>Discount</dt><dd>−${money(order.discount)}</dd></div>` : ''}
            <div><dt>Shipping</dt><dd>${order.shipping ? money(order.shipping) : 'Free'}</dd></div>
            <div class="total"><dt>Total</dt><dd>${money(order.total)}</dd></div>
          </dl>
        </aside>
      </section>`;
    el.querySelector('[data-copy-order]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); window.El3.toast('Order details copied'); }
      catch { window.El3.toast('Copy failed — select the text below instead', { type: 'error' }); }
    });
  });

  window.EL3_STATIC = { resolve, quote };
})();
