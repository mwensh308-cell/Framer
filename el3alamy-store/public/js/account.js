/* Account (sign in / register / order history) and order tracking. */
(() => {
  'use strict';
  const { api, money, esc, configReady } = window.El3;
  const $ = (s, r = document) => r.querySelector(s);

  const nextUrl = () => {
    const n = new URLSearchParams(location.search).get('next');
    return n && n.startsWith('/') && !n.startsWith('//') ? n : '/account';
  };

  document.querySelectorAll('[data-auth-form]').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = form.dataset.authForm;
    const err = $('[data-form-error]', form);
    const btn = form.querySelector('button[type=submit]');
    err.hidden = true;
    btn.classList.add('is-loading');
    try {
      await api(`/auth/${mode}`, { method: 'POST', body: Object.fromEntries(new FormData(form)) });
      location.href = nextUrl();
    } catch (ex) {
      btn.classList.remove('is-loading');
      err.textContent = ex.details ? Object.values(ex.details).join(' · ') : ex.message;
      err.hidden = false;
    }
  }));

  $('[data-logout]')?.addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST', body: {} }).catch(() => {});
    location.href = '/';
  });

  const ordersEl = $('[data-orders]');
  if (ordersEl) {
    configReady.then(() => api('/orders/mine')).then(({ orders }) => {
      ordersEl.innerHTML = orders.length
        ? `<div class="table-scroll"><table class="orders-table"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>
            ${orders.map((o) => `<tr><td><a class="link-arrow" href="/order/${esc(o.number)}">${esc(o.number)}</a></td><td>${esc(o.created_at.slice(0, 10))}</td><td><span class="status-pill status-${esc(o.status)}">${esc(o.status_label)}</span></td><td>${money(o.total, o.currency)}</td></tr>`).join('')}
          </tbody></table></div>`
        : '<p class="muted">No orders yet. <a class="link-arrow" href="/shop">Start shopping</a></p>';
    }).catch(() => { ordersEl.innerHTML = '<p class="form-error">Could not load orders.</p>'; });
  }

  const trackForm = $('[data-track-form]');
  if (trackForm) {
    const result = $('[data-track-result]');
    trackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('[data-form-error]', trackForm);
      err.hidden = true;
      try {
        await configReady;
        const { order } = await api('/orders/track', { method: 'POST', body: Object.fromEntries(new FormData(trackForm)) });
        result.innerHTML = `
          <div class="panel reveal in" style="margin-top:20px">
            <div class="panel-head"><h2 class="h4">${esc(order.number)}</h2><span class="status-pill status-${esc(order.status)}">${esc(order.status_label)}</span></div>
            ${order.tracking_number ? `<p>Courier tracking number: <strong>${esc(order.tracking_number)}</strong></p>` : ''}
            <ol class="timeline">${order.events.map((ev) => `<li><strong>${esc(ev.label)}</strong><span class="muted small">${esc(ev.created_at)} UTC${ev.note ? ` · ${esc(ev.note)}` : ''}</span></li>`).join('')}</ol>
            <ul class="summary-lines">${order.items.map((i) => `<li><span>${i.quantity}× ${esc(i.product_name)}<small class="muted">${esc(i.variant_name)}</small></span><span>${money(i.unit_price * i.quantity, order.currency)}</span></li>`).join('')}</ul>
            <dl class="totals"><div class="total"><dt>Total</dt><dd>${money(order.total, order.currency)}</dd></div></dl>
          </div>`;
      } catch (ex) {
        result.innerHTML = '';
        err.textContent = ex.message;
        err.hidden = false;
      }
    });
    if (trackForm.number.value && trackForm.email.value) trackForm.requestSubmit();
  }
})();
