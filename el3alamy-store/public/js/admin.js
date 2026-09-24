/* Admin dashboard: overview stats, order fulfilment, inventory, bundles, coupons, customers. */
(() => {
  'use strict';
  const { api, money, esc, toast, configReady } = window.El3;
  const $ = (s, r = document) => r.querySelector(s);
  const panel = $('[data-admin-panel]');
  const modal = $('[data-modal]');
  const modalBody = $('[data-modal-body]');
  if (!panel) return;

  const toMinor = (major) => Math.round(Number(major) * 100);
  const fmtDate = (s) => esc(String(s).replace('T', ' ').slice(0, 16));
  const pill = (status, label) => `<span class="status-pill status-${esc(status)}">${esc(label || status)}</span>`;
  const fail = (err) => toast(err.details ? Object.values(err.details).join(' · ') : err.message, { type: 'error' });

  // ── Overview ───────────────────────────────────────────────────────────
  async function overview() {
    const s = await api('/admin/stats');
    const max = Math.max(1, ...s.last30.map((d) => d.total));
    const count = (st) => s.byStatus.find((x) => x.status === st)?.n || 0;
    panel.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><span class="muted small">Revenue (paid & COD)</span><strong>${money(s.revenue)}</strong></div>
        <div class="stat"><span class="muted small">Orders</span><strong>${s.paidOrders}</strong></div>
        <div class="stat"><span class="muted small">To fulfil</span><strong>${count('paid') + count('processing')}</strong></div>
        <div class="stat"><span class="muted small">Customers</span><strong>${s.customers}</strong></div>
      </div>
      <div class="checkout-grid">
        <div class="panel">
          <h2 class="h4">Revenue — last 30 days</h2>
          ${s.last30.length
            ? `<div class="bars" role="img" aria-label="Daily revenue chart">${s.last30.map((d) => `<span style="height:${Math.max(4, (d.total / max) * 100)}%" title="${esc(d.day)}: ${money(d.total)} (${d.n} orders)"></span>`).join('')}</div>`
            : '<p class="muted">No sales yet in this period.</p>'}
        </div>
        <div class="panel">
          <h2 class="h4">Low stock</h2>
          ${s.lowStock.length
            ? `<table class="data-table"><tbody>${s.lowStock.map((v) => `<tr><td>${esc(v.product_name)}<br><small class="muted">${esc(v.sku)} · ${esc(v.name)}</small></td><td><strong style="color:${v.stock === 0 ? 'var(--red)' : 'var(--amber)'}">${v.stock}</strong></td></tr>`).join('')}</tbody></table>`
            : '<p class="muted">All variants are well stocked.</p>'}
        </div>
      </div>`;
  }

  // ── Orders ─────────────────────────────────────────────────────────────
  let orderFilter = '';
  async function ordersTab() {
    const { orders, statuses } = await api(`/admin/orders${orderFilter ? `?status=${orderFilter}` : ''}`);
    panel.innerHTML = `
      <div class="admin-toolbar">
        <label>Status <select data-order-filter><option value="">All</option>${Object.entries(statuses).map(([k, l]) => `<option value="${k}" ${k === orderFilter ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <span class="muted small">${orders.length} order${orders.length === 1 ? '' : 's'}</span>
      </div>
      <div class="table-scroll"><table class="data-table">
        <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>${orders.map((o) => `<tr>
          <td><button class="btn btn-sm btn-glass" type="button" data-open-order="${esc(o.number)}">${esc(o.number)}</button></td>
          <td>${fmtDate(o.created_at)}</td><td>${esc(o.email)}</td><td>${o.payment_method === 'cod' ? 'COD' : 'Card'}</td>
          <td>${pill(o.status, o.status_label)}</td><td>${money(o.total, o.currency)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No orders.</td></tr>'}
        </tbody></table></div>`;
    $('[data-order-filter]').addEventListener('change', (e) => { orderFilter = e.target.value; ordersTab().catch(fail); });
  }

  async function openOrder(number) {
    const { order: o, next } = await api(`/admin/orders/${encodeURIComponent(number)}`);
    const a = o.shipping_address;
    modalBody.innerHTML = `
      <div class="panel-head"><h2 class="h4">${esc(o.number)}</h2>${pill(o.status, o.status_label)}</div>
      <p class="muted small">${fmtDate(o.created_at)} UTC · ${o.payment_method === 'cod' ? 'Cash on delivery' : 'Card'}${o.payment_ref ? ` · ref ${esc(o.payment_ref)}` : ''}</p>
      <p><strong>${esc(a.fullName)}</strong> · ${esc(a.phone)} · ${esc(o.email)}<br>${esc(a.line1)}${a.line2 ? `, ${esc(a.line2)}` : ''}, ${esc(a.city)}${a.region ? `, ${esc(a.region)}` : ''}, ${esc(a.country)}</p>
      <ul class="summary-lines">${o.items.map((i) => `<li><span>${i.quantity}× ${esc(i.product_name)}<small class="muted">${esc(i.variant_name)}</small></span><span>${money(i.unit_price * i.quantity, o.currency)}</span></li>`).join('')}</ul>
      <dl class="totals"><div class="total"><dt>Total</dt><dd>${money(o.total, o.currency)}</dd></div></dl>
      <h3 class="h5" style="margin-top:20px">Timeline</h3>
      <ol class="timeline">${o.events.map((e) => `<li><strong>${esc(e.label)}</strong><span class="muted small">${fmtDate(e.created_at)}${e.note ? ` · ${esc(e.note)}` : ''}</span></li>`).join('')}</ol>
      ${next.length ? `
      <form data-status-form>
        <div class="field-grid">
          <label class="field"><span>Move to</span><select name="status">${next.map((s) => `<option value="${s}">${esc(s.replace('_', ' '))}</option>`).join('')}</select></label>
          <label class="field"><span>Courier tracking # (optional)</span><input name="trackingNumber" value="${esc(o.tracking_number || '')}"></label>
          <label class="field span-2"><span>Note for customer (optional)</span><input name="note" maxlength="300"></label>
        </div>
        <button class="btn btn-primary" type="submit">Update status</button>
        <button class="btn btn-ghost" type="button" data-close-modal>Close</button>
      </form>` : '<button class="btn btn-ghost" type="button" data-close-modal>Close</button>'}`;
    modal.showModal();
    $('[data-status-form]', modalBody)?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries([...new FormData(e.target)].filter(([, v]) => v));
      try {
        await api(`/admin/orders/${encodeURIComponent(number)}/status`, { method: 'POST', body });
        toast('Order updated');
        modal.close();
        ordersTab().catch(fail);
      } catch (err) { fail(err); }
    });
  }

  // ── Products & inventory ───────────────────────────────────────────────
  async function productsTab() {
    const { products } = await api('/admin/products');
    panel.innerHTML = `
      <p class="muted small">Edit prices (in major units) and stock inline, then press Save on the row.</p>
      <div class="table-scroll"><table class="data-table">
        <thead><tr><th>Product / variant</th><th>SKU</th><th>Price</th><th>Compare at</th><th>Stock</th><th>Active</th><th></th></tr></thead>
        <tbody>${products.map((p) => `
          <tr style="background:rgba(255,255,255,.03)">
            <td colspan="5"><strong><a href="/products/${esc(p.slug)}" target="_blank" rel="noopener">${esc(p.name)}</a></strong> <span class="muted small">· ${esc(p.category_name)}</span></td>
            <td><label><input type="checkbox" data-product-toggle="${p.id}" data-field="active" ${p.active ? 'checked' : ''}> live</label></td>
            <td><label><input type="checkbox" data-product-toggle="${p.id}" data-field="featured" ${p.featured ? 'checked' : ''}> featured</label></td>
          </tr>
          ${p.variants.map((v) => `
          <tr data-variant-row="${v.id}">
            <td style="padding-left:24px">${esc(v.name)}</td>
            <td class="muted small">${esc(v.sku)}</td>
            <td><input class="inline" type="number" min="0" step="0.01" name="price" value="${(v.price / 100).toFixed(2)}"></td>
            <td><input class="inline" type="number" min="0" step="0.01" name="compareAtPrice" value="${v.compare_at_price ? (v.compare_at_price / 100).toFixed(2) : ''}"></td>
            <td><input class="inline" type="number" min="0" step="1" name="stock" value="${v.stock}"></td>
            <td><input type="checkbox" name="active" ${v.active ? 'checked' : ''}></td>
            <td><button class="btn btn-sm btn-glass" type="button" data-save-variant="${v.id}">Save</button></td>
          </tr>`).join('')}`).join('')}
        </tbody></table></div>`;
  }

  async function saveVariant(id) {
    const row = $(`[data-variant-row="${id}"]`);
    const val = (n) => row.querySelector(`[name=${n}]`);
    const body = { price: toMinor(val('price').value), stock: Number.parseInt(val('stock').value, 10), active: val('active').checked };
    if (val('compareAtPrice').value) body.compareAtPrice = toMinor(val('compareAtPrice').value);
    try { await api(`/admin/variants/${id}`, { method: 'PATCH', body }); toast('Variant saved'); } catch (err) { fail(err); }
  }

  // ── Bundles ────────────────────────────────────────────────────────────
  async function bundlesTab() {
    const [{ bundles }, { products }] = await Promise.all([api('/admin/bundles'), api('/admin/products')]);
    const variantOptions = products.flatMap((p) => p.variants.map((v) => `<option value="${v.id}">${esc(p.name)} — ${esc(v.name)}</option>`)).join('');
    panel.innerHTML = `
      <div class="table-scroll"><table class="data-table">
        <thead><tr><th>Bundle</th><th>Items</th><th>Discount</th><th>Price</th><th>Active</th></tr></thead>
        <tbody>${bundles.map((b) => `<tr>
          <td><a href="/bundles/${esc(b.slug)}" target="_blank" rel="noopener">${esc(b.name)}</a></td>
          <td class="small">${b.items.map((i) => `${i.quantity}× ${esc(i.product_name)} (${esc(i.variant_name)})`).join('<br>')}</td>
          <td>${b.discount_percent}%</td><td>${money(b.price)} <s class="muted small">${money(b.fullPrice)}</s></td>
          <td><input type="checkbox" data-bundle-toggle="${b.id}" ${b.active ? 'checked' : ''}></td></tr>`).join('')}
        </tbody></table></div>
      <form class="panel" data-bundle-form style="margin-top:20px">
        <h2 class="h4">New bundle</h2>
        <div class="field-grid">
          <label class="field"><span>Name</span><input name="name" required></label>
          <label class="field"><span>Slug (url)</span><input name="slug" required pattern="[a-z0-9-]+"></label>
          <label class="field span-2"><span>Description</span><input name="description" required></label>
          <label class="field"><span>Discount %</span><input name="discountPercent" type="number" min="0" max="50" value="5" required></label>
          <label class="field"><span>Items (hold Ctrl/Cmd to select several)</span><select name="items" multiple size="6" required>${variantOptions}</select></label>
        </div>
        <button class="btn btn-primary" type="submit">Create bundle</button>
      </form>`;
    $('[data-bundle-form]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await api('/admin/bundles', { method: 'POST', body: {
          name: f.name.value, slug: f.slug.value, description: f.description.value,
          discountPercent: Number(f.discountPercent.value),
          items: [...f.items.selectedOptions].map((o) => ({ variantId: Number(o.value), quantity: 1 })),
        } });
        toast('Bundle created');
        bundlesTab().catch(fail);
      } catch (err) { fail(err); }
    });
  }

  // ── Coupons ────────────────────────────────────────────────────────────
  async function couponsTab() {
    const { coupons } = await api('/admin/coupons');
    panel.innerHTML = `
      <div class="table-scroll"><table class="data-table"><thead><tr><th>Code</th><th>% off</th><th>Min. subtotal</th><th>Active</th></tr></thead>
      <tbody>${coupons.map((c) => `<tr><td><strong>${esc(c.code)}</strong></td><td>${c.percent_off}%</td><td>${money(c.min_subtotal)}</td><td>${c.active ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table></div>
      <form class="panel admin-toolbar" data-coupon-create style="margin-top:20px">
        <input name="code" placeholder="CODE" required pattern="[A-Za-z0-9]{3,20}" style="width:160px">
        <input name="percentOff" type="number" min="1" max="90" placeholder="% off" required style="width:110px">
        <input name="minSubtotal" type="number" min="0" step="0.01" placeholder="Min. subtotal" style="width:150px">
        <button class="btn btn-primary btn-sm" type="submit">Save coupon</button>
      </form>`;
    $('[data-coupon-create]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await api('/admin/coupons', { method: 'POST', body: { code: f.code.value, percentOff: Number(f.percentOff.value), minSubtotal: toMinor(f.minSubtotal.value || 0) } });
        toast('Coupon saved');
        couponsTab().catch(fail);
      } catch (err) { fail(err); }
    });
  }

  // ── Customers ──────────────────────────────────────────────────────────
  async function customersTab() {
    const { customers } = await api('/admin/customers');
    panel.innerHTML = `<div class="table-scroll"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Orders</th><th>Spent</th></tr></thead>
      <tbody>${customers.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${fmtDate(c.created_at)}</td><td>${c.orders}</td><td>${money(c.spent)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No customers yet.</td></tr>'}</tbody></table></div>`;
  }

  const TABS = { overview, orders: ordersTab, products: productsTab, bundles: bundlesTab, coupons: couponsTab, customers: customersTab };

  function show(tab) {
    document.querySelectorAll('[data-tab]').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    panel.innerHTML = '<p class="muted">Loading…</p>';
    TABS[tab]().catch((err) => { panel.innerHTML = `<p class="form-error">${esc(err.message)}</p>`; });
    history.replaceState(null, '', `#${tab}`);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) return show(t.dataset.tab);
    const o = e.target.closest('[data-open-order]');
    if (o) return openOrder(o.dataset.openOrder).catch(fail);
    const s = e.target.closest('[data-save-variant]');
    if (s) return saveVariant(Number(s.dataset.saveVariant));
    if (e.target.closest('[data-close-modal]')) modal.close();
  });

  document.addEventListener('change', async (e) => {
    const p = e.target.closest('[data-product-toggle]');
    if (p) {
      try {
        await api(`/admin/products/${p.dataset.productToggle}`, { method: 'PATCH', body: { [p.dataset.field]: p.checked } });
        toast('Product updated');
      } catch (err) { p.checked = !p.checked; fail(err); }
    }
    const b = e.target.closest('[data-bundle-toggle]');
    if (b) {
      try { await api(`/admin/bundles/${b.dataset.bundleToggle}`, { method: 'PATCH', body: { active: b.checked } }); toast('Bundle updated'); }
      catch (err) { b.checked = !b.checked; fail(err); }
    }
  });

  configReady.then(() => show(TABS[location.hash.slice(1)] ? location.hash.slice(1) : 'overview'));
})();
