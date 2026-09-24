/* Product detail page: variant picker, gallery swap, quantity, sticky add-to-cart bar. */
(() => {
  'use strict';
  const dataEl = document.getElementById('product-data');
  if (!dataEl) return;
  const product = JSON.parse(dataEl.textContent);
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const { money, cart, toast, openCart } = window.El3;

  let selected = product.variants.find((v) => v.id === product.selected) || product.variants[0];
  const qtyInput = $('[data-qty-input]');
  const mainImg = $('[data-main-image]');

  function renderStock(v) {
    const el = $('[data-stock]');
    el.classList.remove('low', 'out');
    if (v.stock <= 0) { el.textContent = 'Sold out — follow us for restock alerts'; el.classList.add('out'); }
    else if (v.stock <= 5) { el.textContent = `Only ${v.stock} left in stock`; el.classList.add('low'); }
    else el.textContent = 'In stock — ships within 24 hours';
    $$('[data-add-selected]').forEach((b) => { b.disabled = v.stock <= 0; });
    qtyInput.max = Math.max(1, Math.min(10, v.stock));
    if (Number(qtyInput.value) > Number(qtyInput.max)) qtyInput.value = qtyInput.max;
  }

  function select(id) {
    const v = product.variants.find((x) => x.id === id);
    if (!v) return;
    selected = v;
    $$('[data-variant]').forEach((b) => {
      const on = Number(b.dataset.variant) === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    });
    $$('[data-thumb]').forEach((b) => b.classList.toggle('active', Number(b.dataset.thumb) === id));
    $('[data-variant-label]').textContent = v.name;
    $('[data-price]').textContent = money(v.price);
    const cmp = $('[data-compare]');
    cmp.hidden = !(v.compareAt && v.compareAt > v.price);
    cmp.textContent = v.compareAt ? money(v.compareAt) : '';
    $('[data-sticky-price]').textContent = money(v.price);
    $('[data-sticky-variant]').textContent = v.name;
    $('[data-sticky-img]').src = v.image;
    const glow = $('[data-stage-glow]');
    if (glow && v.hex) glow.style.setProperty('--glow', `#${v.hex}`);
    if (mainImg.getAttribute('src') !== v.image) {
      mainImg.classList.add('swap');
      setTimeout(() => { mainImg.src = v.image; mainImg.alt = `${product.name} — ${v.name}`; mainImg.classList.remove('swap'); }, 220);
    }
    renderStock(v);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-variant], [data-thumb]');
    if (b) select(Number(b.dataset.variant || b.dataset.thumb));
  });

  // Arrow-key navigation within the radiogroup.
  $$('[role=radiogroup]').forEach((group) => group.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const idx = product.variants.indexOf(selected);
    const next = product.variants[(idx + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + product.variants.length) % product.variants.length];
    select(next.id);
    group.querySelector(`[data-variant="${next.id}"]`)?.focus();
  }));

  const clampQty = () => { qtyInput.value = Math.max(1, Math.min(Number(qtyInput.max) || 10, Number.parseInt(qtyInput.value, 10) || 1)); };
  $('[data-qty-dec]').addEventListener('click', () => { qtyInput.value = Number(qtyInput.value) - 1; clampQty(); });
  $('[data-qty-inc]').addEventListener('click', () => { qtyInput.value = Number(qtyInput.value) + 1; clampQty(); });
  qtyInput.addEventListener('change', clampQty);

  $$('[data-add-selected]').forEach((btn) => btn.addEventListener('click', () => {
    if (selected.stock <= 0) return;
    cart.addVariant(selected.id, Number(qtyInput.value) || 1);
    document.querySelectorAll('[data-cart-count]').forEach((el) => { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); });
    toast(`${product.name} (${selected.name}) added`, { action: { href: '/checkout', label: 'Checkout' } });
    openCart();
  }));

  // Sticky buy bar appears once the main button scrolls out of view.
  const sticky = $('[data-sticky-buy]');
  const mainBtn = $('.pdp-buy [data-add-selected]');
  if ('IntersectionObserver' in window && sticky && mainBtn) {
    sticky.hidden = false;
    new IntersectionObserver(([entry]) => {
      sticky.classList.toggle('show', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }).observe(mainBtn);
  }

  window.El3.configReady.then(() => renderStock(selected));
})();
