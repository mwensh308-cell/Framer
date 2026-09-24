/* Cart page, checkout form and order confirmation. */
(() => {
  'use strict';
  const { api, money, cart, esc, lineHtml, shipProgress, toast, configReady } = window.El3;
  const $ = (s, r = document) => r.querySelector(s);

  const PENDING_KEY = 'el3_pending_order';

  // Order confirmation: clear the cart only for the order this browser just placed.
  const complete = $('[data-order-complete]');
  if (complete) {
    try {
      const pending = sessionStorage.getItem(PENDING_KEY);
      if (pending && location.pathname.endsWith(pending)) { cart.clear(); sessionStorage.removeItem(PENDING_KEY); }
    } catch { /* ignore */ }
    return;
  }

  const summaryEl = $('[data-summary]');
  const cartPage = $('[data-cart-page]');
  const form = $('[data-checkout-form]');

  function summaryHtml(q, { withCheckout }) {
    const couponBlock = `
      <form class="coupon-form" data-coupon-form>
        <label class="sr-only" for="coupon">Discount code</label>
        <input id="coupon" name="coupon" placeholder="Discount code" value="${esc(q.coupon?.code || cart.read().coupon || '')}" autocomplete="off">
        <button class="btn btn-glass btn-sm" type="submit">Apply</button>
      </form>
      ${q.couponError ? `<p class="form-error small">${esc(q.couponError)}</p>` : ''}
      ${q.coupon ? `<p class="form-success small">Code ${esc(q.coupon.code)} applied — ${q.coupon.percentOff}% off.</p>` : ''}`;
    return `
      <h2 class="h4">Order summary</h2>
      ${withCheckout ? '' : `<ul class="summary-lines">${q.lines.map((l) => `<li><span>${l.quantity}× ${esc(l.productName)}<small class="muted">${esc(l.variantName)}</small></span><span>${money(l.lineTotal)}</span></li>`).join('')}</ul>`}
      ${couponBlock}
      <dl class="totals">
        <div><dt>Subtotal</dt><dd>${money(q.subtotal)}</dd></div>
        ${q.discount ? `<div><dt>Discount</dt><dd>−${money(q.discount)}</dd></div>` : ''}
        <div><dt>Shipping</dt><dd>${q.shipping ? money(q.shipping) : 'Free'}</dd></div>
        <div class="total"><dt>Total</dt><dd>${money(q.total)}</dd></div>
      </dl>
      ${shipProgress(q)}
      ${withCheckout ? `<a class="btn btn-primary btn-lg btn-block" href="/checkout" style="margin-top:16px">Proceed to checkout</a>` : ''}`;
  }

  let lastQuote = null;
  async function refresh() {
    await configReady;
    if (cart.count() === 0) {
      const empty = '<div class="cart-empty"><p>Your cart is empty.</p><a class="btn btn-primary" href="/shop">Browse the store</a></div>';
      if (cartPage) cartPage.innerHTML = empty;
      if (summaryEl) summaryEl.innerHTML = cartPage ? '' : empty;
      if (form) form.querySelector('[data-place-order]').disabled = true;
      return;
    }
    try {
      const q = await cart.quote();
      lastQuote = q;
      if (cartPage) {
        cartPage.innerHTML = (q.issues.length ? '<p class="form-error">Some items are unavailable in the requested quantity. Please adjust.</p>' : '')
          + q.lines.map((l) => lineHtml(l, { compact: false })).join('');
      }
      if (summaryEl) summaryEl.innerHTML = summaryHtml(q, { withCheckout: Boolean(cartPage) });
      if (form) form.querySelector('[data-place-order]').textContent = `Place order · ${money(q.total)}`;
    } catch {
      if (summaryEl) summaryEl.innerHTML = '<p class="form-error">Could not load prices. Please refresh.</p>';
    }
  }

  document.addEventListener('submit', (e) => {
    if (!e.target.matches('[data-coupon-form]')) return;
    e.preventDefault();
    cart.setCoupon(e.target.coupon.value.trim());
  });
  document.addEventListener('cart:change', refresh);
  refresh();

  if (new URLSearchParams(location.search).get('cancelled')) {
    toast('Payment was cancelled — your cart is still here.', { type: 'error' });
  }

  if (!form) return;

  function showErrors(details = {}) {
    form.querySelectorAll('.field').forEach((f) => { f.classList.remove('invalid'); f.querySelector('.field-msg')?.remove(); });
    for (const [key, msg] of Object.entries(details)) {
      const name = key.replace(/^address\./, '');
      const input = form.elements[name];
      const field = input?.closest?.('.field');
      if (!field) continue;
      field.classList.add('invalid');
      field.insertAdjacentHTML('beforeend', `<small class="field-msg">${esc(msg)}</small>`);
    }
    form.querySelector('.invalid input')?.focus();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[data-place-order]');
    const errorEl = form.querySelector('[data-form-error]');
    errorEl.hidden = true;
    const f = form.elements;
    const c = cart.read();
    const body = {
      email: f.email.value.trim(),
      paymentMethod: form.querySelector('input[name=paymentMethod]:checked')?.value || 'cod',
      cart: { items: c.items, bundles: c.bundles, ...(lastQuote?.coupon ? { coupon: lastQuote.coupon.code } : {}) },
      address: Object.fromEntries(['fullName', 'phone', 'line1', 'line2', 'city', 'region', 'postalCode', 'country'].map((k) => [k, f[k].value.trim()])),
    };
    btn.classList.add('is-loading');
    try {
      const res = await api('/orders', { method: 'POST', body });
      try { sessionStorage.setItem(PENDING_KEY, res.order.number); } catch { /* ignore */ }
      location.href = res.redirect;
    } catch (err) {
      btn.classList.remove('is-loading');
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      showErrors(err.details && !Array.isArray(err.details) ? err.details : {});
      if (err.status === 409) refresh();
    }
  });
})();
