'use strict';
// Pages whose content is driven by client-side JS against the REST API (cart, checkout, account,
// admin, tracking, order confirmation). They are noindex and carry no product data in the HTML.
const config = require('../../config');
const payments = require('../../services/payments');
const { layout } = require('../layout');
const { html, money } = require('../html');
const icons = require('../icons');

const shell = (req, { title, path, body, scripts = [], bodyClass = '' }) => layout({
  req, path, title, noindex: true, bodyClass,
  description: `${title} — ${config.store.name}`,
  body: body.toString(), scripts,
});

const cart = (req) => shell(req, {
  title: 'Your cart', path: '/cart', scripts: ['/js/checkout.js'], bodyClass: 'page-cart',
  body: html`
  <section class="container page-hero"><h1>Your cart</h1></section>
  <section class="container section-tight checkout-grid">
    <div class="panel" data-cart-page><p class="muted">Loading your cart…</p></div>
    <aside class="panel summary" data-summary></aside>
  </section>`,
});

const checkout = (req) => shell(req, {
  title: 'Checkout', path: '/checkout', scripts: ['/js/checkout.js'], bodyClass: 'page-checkout',
  body: html`
  <section class="container page-hero"><h1>Checkout</h1><p class="muted">Secure checkout · ${icons.shield({ size: 16 })} Your details are encrypted in transit.</p></section>
  <section class="container section-tight checkout-grid">
    <form class="panel checkout-form" data-checkout-form novalidate>
      <fieldset>
        <legend>Contact</legend>
        <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email" value="${req.user?.email || ''}"></label>
        ${req.user ? '' : html`<p class="muted small">Have an account? <a href="/account?next=/checkout">Sign in</a> to track orders in one place.</p>`}
      </fieldset>
      <fieldset>
        <legend>Shipping address</legend>
        <div class="field-grid">
          <label class="field span-2"><span>Full name</span><input name="fullName" required autocomplete="name" value="${req.user?.name || ''}"></label>
          <label class="field span-2"><span>Phone</span><input name="phone" type="tel" required autocomplete="tel" placeholder="+20 10 0000 0000"></label>
          <label class="field span-2"><span>Address</span><input name="line1" required autocomplete="address-line1"></label>
          <label class="field span-2"><span>Apartment, floor (optional)</span><input name="line2" autocomplete="address-line2"></label>
          <label class="field"><span>City</span><input name="city" required autocomplete="address-level2"></label>
          <label class="field"><span>Governorate / region</span><input name="region" autocomplete="address-level1"></label>
          <label class="field"><span>Postal code</span><input name="postalCode" autocomplete="postal-code"></label>
          <label class="field"><span>Country</span><input name="country" required autocomplete="country-name" value="Egypt"></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Payment</legend>
        <div class="pay-options">
          <label class="pay-option"><input type="radio" name="paymentMethod" value="cod" checked>
            <span><strong>Cash on delivery</strong><small class="muted">Pay when your order arrives.</small></span></label>
          <label class="pay-option ${payments.cardAvailable() ? '' : 'is-disabled'}"><input type="radio" name="paymentMethod" value="card" ${payments.cardAvailable() ? '' : 'disabled'}>
            <span><strong>Credit / debit card</strong><small class="muted">${payments.stripeEnabled() ? 'Secure payment via Stripe.' : payments.cardAvailable() ? 'Development mode: simulated payment.' : 'Currently unavailable.'}</small></span></label>
        </div>
      </fieldset>
      <p class="form-error" data-form-error hidden></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit" data-place-order>Place order</button>
    </form>
    <aside class="panel summary" data-summary><p class="muted">Loading…</p></aside>
  </section>`,
});

function order(req, o) {
  const isOwner = req.user && (req.user.id === o.user_id || req.user.role === 'admin');
  const addr = o.shipping_address;
  return shell(req, {
    title: `Order ${o.number}`, path: `/order/${o.number}`, scripts: ['/js/checkout.js'], bodyClass: 'page-order',
    body: html`
    <section class="container page-hero order-hero" data-order-complete>
      <div class="success-mark">${icons.check({ size: 40 })}</div>
      <h1>Thank you${isOwner ? `, ${addr.fullName.split(' ')[0]}` : ''}!</h1>
      <p class="lead muted">Order <strong>${o.number}</strong> — ${o.status_label}. Keep your order number to track delivery anytime.</p>
    </section>
    <section class="container section-tight checkout-grid">
      <div class="panel">
        <h2 class="h4">Order timeline</h2>
        <ol class="timeline">${o.events.map((e) => html`<li><strong>${e.label}</strong><span class="muted small">${e.created_at} UTC${e.note ? ` · ${e.note}` : ''}</span></li>`)}</ol>
        ${isOwner ? html`<h2 class="h4">Delivering to</h2><p class="muted">${addr.fullName}<br>${addr.line1}${addr.line2 ? `, ${addr.line2}` : ''}<br>${addr.city}${addr.region ? `, ${addr.region}` : ''}, ${addr.country}</p>` : ''}
        <p><a class="btn btn-glass" href="/track?number=${o.number}">Track this order</a> <a class="btn btn-ghost" href="/shop">Continue shopping</a></p>
      </div>
      <aside class="panel summary">
        <h2 class="h4">Summary</h2>
        <ul class="summary-lines">${o.items.map((i) => html`<li><span>${i.quantity}× ${i.product_name}<small class="muted">${i.variant_name}</small></span><span>${money(i.unit_price * i.quantity, o.currency)}</span></li>`)}</ul>
        <dl class="totals">
          <div><dt>Subtotal</dt><dd>${money(o.subtotal, o.currency)}</dd></div>
          ${o.discount ? html`<div><dt>Discount${o.coupon_code ? ` (${o.coupon_code})` : ''}</dt><dd>−${money(o.discount, o.currency)}</dd></div>` : ''}
          <div><dt>Shipping</dt><dd>${o.shipping ? money(o.shipping, o.currency) : 'Free'}</dd></div>
          <div class="total"><dt>Total</dt><dd>${money(o.total, o.currency)}</dd></div>
        </dl>
        <p class="muted small">Payment: ${o.payment_method === 'cod' ? 'Cash on delivery' : 'Card'}</p>
      </aside>
    </section>`,
  });
}

const track = (req) => shell(req, {
  title: 'Track your order', path: '/track', scripts: ['/js/account.js'],
  body: html`
  <section class="container page-hero"><h1>Track your order</h1><p class="lead muted">Enter your order number and the email you used at checkout.</p></section>
  <section class="container section-tight narrow">
    <form class="panel" data-track-form novalidate>
      <label class="field"><span>Order number</span><input name="number" required placeholder="EL-2026-XXXXXXXX" value="${typeof req.query.number === 'string' ? req.query.number : ''}"></label>
      <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email" value="${req.user?.email || ''}"></label>
      <p class="form-error" data-form-error hidden></p>
      <button class="btn btn-primary btn-block" type="submit">Track order</button>
    </form>
    <div data-track-result></div>
  </section>`,
});

const account = (req) => shell(req, {
  title: 'My account', path: '/account', scripts: ['/js/account.js'],
  body: html`
  <section class="container page-hero"><h1>${req.user ? `Hi, ${req.user.name.split(' ')[0]}` : 'Welcome back'}</h1></section>
  <section class="container section-tight" data-account data-signed-in="${req.user ? '1' : '0'}" data-role="${req.user?.role || ''}">
    ${req.user ? html`
      <div class="panel">
        <div class="panel-head"><h2 class="h4">Your orders</h2><button class="btn btn-ghost btn-sm" type="button" data-logout>Sign out</button></div>
        ${req.user.role === 'admin' ? html`<p><a class="btn btn-primary btn-sm" href="/admin">Open admin dashboard</a></p>` : ''}
        <div data-orders><p class="muted">Loading…</p></div>
      </div>` : html`
      <div class="auth-grid">
        <form class="panel" data-auth-form="login" novalidate>
          <h2 class="h4">Sign in</h2>
          <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
          <label class="field"><span>Password</span><input name="password" type="password" required autocomplete="current-password"></label>
          <p class="form-error" data-form-error hidden></p>
          <button class="btn btn-primary btn-block" type="submit">Sign in</button>
        </form>
        <form class="panel" data-auth-form="register" novalidate>
          <h2 class="h4">Create account</h2>
          <label class="field"><span>Name</span><input name="name" required autocomplete="name"></label>
          <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
          <label class="field"><span>Password (8+ characters)</span><input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
          <p class="form-error" data-form-error hidden></p>
          <button class="btn btn-glass btn-block" type="submit">Create account</button>
        </form>
      </div>`}
  </section>`,
});

const admin = (req) => shell(req, {
  title: 'Admin dashboard', path: '/admin', scripts: ['/js/admin.js'], bodyClass: 'page-admin',
  body: html`
  <section class="container page-hero"><p class="eyebrow">El3alamy Store</p><h1>Admin dashboard</h1></section>
  <section class="container section-tight admin" data-admin>
    <nav class="admin-tabs" role="tablist">
      ${['overview', 'orders', 'products', 'bundles', 'coupons', 'customers'].map((t, i) => html`<button type="button" role="tab" class="${i === 0 ? 'active' : ''}" data-tab="${t}" aria-selected="${i === 0}">${t[0].toUpperCase() + t.slice(1)}</button>`)}
    </nav>
    <div class="admin-panel" data-admin-panel><p class="muted">Loading…</p></div>
  </section>
  <dialog class="modal" data-modal><div data-modal-body></div></dialog>`,
});

module.exports = { cart, checkout, order, track, account, admin };
