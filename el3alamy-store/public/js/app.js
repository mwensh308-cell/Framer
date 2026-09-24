/* El3alamy Store — global client script: cart, UI motion, search, filters. No framework, no build step. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } },
  };
  const session = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, v) { try { sessionStorage.setItem(key, v); } catch { /* ignore */ } },
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── API ────────────────────────────────────────────────────────────────
  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Request failed');
      err.status = res.status;
      err.details = data.details;
      throw err;
    }
    return data;
  }

  let currency = 'EGP';
  const configReady = api('/config').then((c) => { currency = c.currency; return c; }).catch(() => ({}));

  function money(minor, cur = currency) {
    const major = minor / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: cur, currencyDisplay: 'code',
      minimumFractionDigits: Number.isInteger(major) ? 0 : 2, maximumFractionDigits: 2,
    }).format(major).replace(/ /g, ' ');
  }

  // ── Toasts ─────────────────────────────────────────────────────────────
  const ICON_OK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>';
  const ICON_ERR = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>';
  function toast(message, { type = 'ok', action } = {}) {
    const stack = $('[data-toasts]');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `toast ${type === 'error' ? 'error' : ''}`;
    el.innerHTML = `${type === 'error' ? ICON_ERR : ICON_OK}<span>${esc(message)}</span>${action ? `<a href="${esc(action.href)}">${esc(action.label)}</a>` : ''}`;
    stack.append(el);
    setTimeout(() => { el.classList.add('out'); el.addEventListener('animationend', () => el.remove(), { once: true }); }, 3600);
  }

  // ── Cart store (browser keeps IDs + quantities; server prices everything) ──
  const CART_KEY = 'el3_cart_v1';
  const cart = {
    read() {
      const c = storage.get(CART_KEY, {});
      return { items: Array.isArray(c.items) ? c.items : [], bundles: Array.isArray(c.bundles) ? c.bundles : [], coupon: c.coupon || '' };
    },
    write(c) { storage.set(CART_KEY, c); updateCount(); document.dispatchEvent(new CustomEvent('cart:change')); },
    count() { const c = this.read(); return [...c.items, ...c.bundles].reduce((s, i) => s + i.quantity, 0); },
    addVariant(variantId, quantity = 1) {
      const c = this.read();
      const line = c.items.find((i) => i.variantId === variantId);
      if (line) line.quantity = Math.min(10, line.quantity + quantity); else c.items.push({ variantId, quantity: Math.min(10, quantity) });
      this.write(c);
    },
    addBundle(bundleId, quantity = 1) {
      const c = this.read();
      const line = c.bundles.find((i) => i.bundleId === bundleId);
      if (line) line.quantity = Math.min(10, line.quantity + quantity); else c.bundles.push({ bundleId, quantity });
      this.write(c);
    },
    setQty(type, id, quantity) {
      const c = this.read();
      const list = type === 'bundle' ? c.bundles : c.items;
      const key = type === 'bundle' ? 'bundleId' : 'variantId';
      const idx = list.findIndex((i) => i[key] === id);
      if (idx === -1) return;
      if (quantity <= 0) list.splice(idx, 1); else list[idx].quantity = Math.min(10, quantity);
      this.write(c);
    },
    setCoupon(code) { const c = this.read(); c.coupon = code; this.write(c); },
    clear() { this.write({ items: [], bundles: [], coupon: '' }); },
    quote() { return api('/cart/quote', { method: 'POST', body: this.read() }); },
  };

  function updateCount({ bump = false } = {}) {
    const n = cart.count();
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = n;
      el.hidden = n === 0;
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
  }

  // ── Cart drawer ────────────────────────────────────────────────────────
  const drawer = $('[data-cart-drawer]');
  const backdrop = $('[data-drawer-backdrop]');
  let lastFocus = null;

  function openCart() {
    lastFocus = document.activeElement;
    backdrop.hidden = false;
    requestAnimationFrame(() => { backdrop.classList.add('show'); drawer.classList.add('open'); });
    drawer.setAttribute('aria-hidden', 'false');
    drawer.focus();
    renderDrawer();
  }
  function closeCart() {
    drawer.classList.remove('open');
    backdrop.classList.remove('show');
    drawer.setAttribute('aria-hidden', 'true');
    setTimeout(() => { backdrop.hidden = true; }, 350);
    lastFocus?.focus?.();
  }

  function lineHtml(l, { compact = true } = {}) {
    const id = l.type === 'bundle' ? l.bundleId : l.variantId;
    const href = l.type === 'bundle' ? `/bundles/${l.productSlug}` : `/products/${l.productSlug}`;
    return `
      <div class="cart-line">
        <img src="${esc(l.image)}" alt="" width="72" height="72">
        <div class="cart-line-info">
          <a href="${href}">${esc(l.productName)}</a>
          <small>${esc(l.variantName)}</small>
          <strong>${money(l.unitPrice)}${l.compareAt && l.compareAt > l.unitPrice ? ` <s class="muted small">${money(l.compareAt)}</s>` : ''}</strong>
        </div>
        <div class="cart-line-actions">
          <div class="mini-qty">
            <button type="button" data-line-qty="${l.type}:${id}:${l.quantity - 1}" aria-label="Decrease">−</button>
            <span>${l.quantity}</span>
            <button type="button" data-line-qty="${l.type}:${id}:${l.quantity + 1}" aria-label="Increase">+</button>
          </div>
          ${compact ? '' : `<strong>${money(l.lineTotal)}</strong>`}
          <button type="button" class="remove-btn" data-line-qty="${l.type}:${id}:0">Remove</button>
        </div>
      </div>`;
  }

  function shipProgress(q) {
    if (!q.lines.length) return '';
    const after = q.subtotal - q.discount;
    if (after >= q.freeShippingThreshold) return '<div class="ship-progress">🎉 You unlocked <strong>free delivery</strong>.<div class="bar"><span style="width:100%"></span></div></div>';
    const pct = Math.min(100, Math.round((after / q.freeShippingThreshold) * 100));
    return `<div class="ship-progress">Add <strong>${money(q.freeShippingThreshold - after)}</strong> for free delivery.<div class="bar"><span style="width:${pct}%"></span></div></div>`;
  }

  function issuesHtml(q) {
    if (!q.issues?.length) return '';
    return `<p class="form-error">Some items are unavailable in the requested quantity. Please adjust your cart.</p>`;
  }

  const EMPTY = `<div class="cart-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6.2"/></svg><p>Your cart is empty.</p><a class="btn btn-primary" href="/shop">Start shopping</a></div>`;

  async function renderDrawer() {
    const body = $('[data-cart-lines]');
    const foot = $('[data-cart-foot]');
    if (!body) return;
    if (cart.count() === 0) { body.innerHTML = EMPTY; foot.innerHTML = ''; return; }
    try {
      await configReady;
      const q = await cart.quote();
      body.innerHTML = issuesHtml(q) + q.lines.map((l) => lineHtml(l)).join('');
      foot.innerHTML = `
        ${shipProgress(q)}
        <div class="drawer-total"><span>Subtotal</span><span>${money(q.subtotal)}</span></div>
        <p class="muted small" style="margin:0">Shipping & discounts calculated at checkout.</p>
        <a class="btn btn-primary btn-lg btn-block" href="/checkout">Checkout</a>
        <a class="btn btn-ghost btn-block" href="/cart">View cart</a>`;
    } catch {
      body.innerHTML = '<p class="form-error">Could not load your cart. Please refresh.</p>';
    }
  }

  document.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-line-qty]');
    if (qtyBtn) {
      const [type, id, qty] = qtyBtn.dataset.lineQty.split(':');
      cart.setQty(type, Number(id), Number(qty));
    }
  });
  document.addEventListener('cart:change', () => { if (drawer?.classList.contains('open')) renderDrawer(); });

  $$('[data-cart-open]').forEach((b) => b.addEventListener('click', openCart));
  $$('[data-cart-close]').forEach((b) => b.addEventListener('click', closeCart));
  backdrop?.addEventListener('click', closeCart);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (drawer?.classList.contains('open')) closeCart(); closeSearch(); }
  });

  // Fly-to-cart micro-interaction.
  function flyToCart(fromEl) {
    const img = fromEl?.closest('.product-card, .bundle-card, .pdp, .sticky-buy')?.querySelector('img');
    const target = $('.cart-btn');
    if (!img || !target || reducedMotion) return;
    const a = img.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const clone = img.cloneNode();
    clone.className = 'fly-img';
    clone.style.left = `${a.left + a.width / 2 - 60}px`;
    clone.style.top = `${a.top + a.height / 2 - 60}px`;
    clone.style.setProperty('--fx', `${b.left + b.width / 2 - (a.left + a.width / 2)}px`);
    clone.style.setProperty('--fy', `${b.top + b.height / 2 - (a.top + a.height / 2)}px`);
    document.body.append(clone);
    clone.addEventListener('animationend', () => clone.remove(), { once: true });
  }

  function added(el, name) {
    flyToCart(el);
    updateCount({ bump: true });
    toast(`${name} added to cart`, { action: { href: '/checkout', label: 'Checkout' } });
    setTimeout(openCart, reducedMotion ? 0 : 650);
  }

  document.addEventListener('click', (e) => {
    const v = e.target.closest('[data-add-variant]');
    if (v) {
      cart.addVariant(Number(v.dataset.addVariant), 1);
      added(v, v.closest('.product-card')?.querySelector('.card-title')?.textContent.trim() || 'Item');
      return;
    }
    const b = e.target.closest('[data-add-bundle]');
    if (b) {
      cart.addBundle(Number(b.dataset.addBundle), 1);
      added(b, 'Bundle');
    }
  });

  // ── First-visit loader ─────────────────────────────────────────────────
  const loader = $('[data-loader]');
  if (loader) {
    if (session.get('el3_seen') || reducedMotion) {
      loader.remove();
      document.documentElement.style.setProperty('--intro-delay', '0s');
    } else {
      session.set('el3_seen', '1');
      loader.addEventListener('animationend', (e) => { if (e.animationName === 'loaderOut') loader.remove(); });
    }
  }

  // ── Header & mobile nav ────────────────────────────────────────────────
  const header = $('[data-header]');
  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const menuBtn = $('[data-menu-toggle]');
  menuBtn?.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('[data-nav] a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('nav-open')));

  // ── Scroll reveal with sibling stagger ─────────────────────────────────
  if ('IntersectionObserver' in window && !reducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
        el.style.setProperty('--rd', `${Math.min(siblings.indexOf(el), 6) * 0.07}s`);
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('in'));
  }

  // ── 3D tilt + spotlight on hover ───────────────────────────────────────
  if (finePointer && !reducedMotion) {
    $$('[data-tilt]').forEach((el) => {
      const max = el.hasAttribute('data-tilt-strong') ? 8 : 5;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
        el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });

    const parallax = $$('[data-parallax]');
    if (parallax.length) {
      window.addEventListener('pointermove', (e) => {
        const dx = e.clientX / window.innerWidth - 0.5;
        const dy = e.clientY / window.innerHeight - 0.5;
        parallax.forEach((el) => { el.style.transform = `translate3d(${dx * -18}px, ${dy * -14}px, 0)`; });
      }, { passive: true });
    }
  }

  // ── Count-up stats ─────────────────────────────────────────────────────
  $$('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    if (reducedMotion) { el.textContent = target; return; }
    const start = performance.now() + (loader?.isConnected ? 1300 : 300);
    const tick = (t) => {
      const p = Math.max(0, Math.min(1, (t - start) / 1400));
      el.textContent = Math.round(target * (1 - (1 - p) ** 3));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // ── Search overlay ─────────────────────────────────────────────────────
  const searchEl = $('[data-search]');
  const searchInput = $('[data-search-input]');
  const searchResults = $('[data-search-results]');
  function openSearch() { searchEl.hidden = false; searchInput.value = ''; searchResults.innerHTML = ''; searchInput.focus(); document.body.style.overflow = 'hidden'; }
  function closeSearch() { if (searchEl && !searchEl.hidden) { searchEl.hidden = true; document.body.style.overflow = ''; } }
  $$('[data-search-open]').forEach((b) => b.addEventListener('click', openSearch));
  $('[data-search-close]')?.addEventListener('click', closeSearch);
  searchEl?.addEventListener('click', (e) => { if (e.target === searchEl) closeSearch(); });
  let searchTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    searchTimer = setTimeout(async () => {
      if (q.length < 2) { searchResults.innerHTML = ''; return; }
      try {
        await configReady;
        const { results } = await api(`/search?q=${encodeURIComponent(q)}`);
        searchResults.innerHTML = results.length
          ? results.map((r, i) => `<a class="search-item" style="animation-delay:${i * 40}ms" href="/products/${esc(r.slug)}"><img src="${esc(r.image)}" alt="" width="56" height="56"><span><strong>${esc(r.name)}</strong><br><small class="muted">${esc(r.category)}</small></span><strong>${money(r.price)}</strong></a>`).join('')
            + `<a class="link-arrow" href="/shop?q=${encodeURIComponent(q)}">See all results →</a>`
          : '<p class="muted">No matches. Try “DualSense” or “PS5”.</p>';
      } catch { searchResults.innerHTML = ''; }
    }, 180);
  });
  searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && searchInput.value.trim()) location.href = `/shop?q=${encodeURIComponent(searchInput.value.trim())}`; });

  // ── Newsletter ─────────────────────────────────────────────────────────
  $$('[data-newsletter]').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type=email]');
    try {
      const r = await api('/newsletter', { method: 'POST', body: { email: input.value } });
      toast(r.message);
      form.reset();
    } catch (err) { toast(err.details?.email || err.message, { type: 'error' }); }
  }));

  // ── Listing filters (progressive enhancement over server-rendered grid) ──
  const filterForm = $('[data-filters]');
  if (filterForm) {
    const grid = $('[data-product-grid]');
    const params = new URLSearchParams(location.search);
    const state = { category: params.get('category') || '', platform: params.get('platform') || '' };
    const apply = () => {
      let shown = 0;
      $$('.product-card', grid).forEach((card) => {
        const ok = (!state.category || card.dataset.category === state.category)
          && (!state.platform || card.dataset.platforms.split(' ').includes(state.platform));
        card.classList.toggle('is-hidden', !ok);
        if (ok) { shown++; card.classList.add('in'); }
      });
      $('[data-result-count]').textContent = `${shown} product${shown === 1 ? '' : 's'}`;
      $('[data-empty]').hidden = shown > 0;
      const url = new URL(location.href);
      ['category', 'platform'].forEach((k) => (state[k] ? url.searchParams.set(k, state[k]) : url.searchParams.delete(k)));
      history.replaceState(null, '', url);
    };
    const serverFiltered = location.pathname === '/shop' && (params.get('category') || params.get('platform'));
    filterForm.addEventListener('click', (e) => {
      const c = e.target.closest('[data-filter-category]');
      const p = e.target.closest('[data-filter-platform]');
      if (!c && !p) return;
      // If the server already narrowed the grid, reload so the full set is available to filter.
      if (serverFiltered) {
        const url = new URL(location.href);
        if (c) url.searchParams.set('category', c.dataset.filterCategory); else url.searchParams.set('platform', p.dataset.filterPlatform);
        [...url.searchParams].forEach(([k, v]) => { if (!v) url.searchParams.delete(k); });
        location.href = url.toString();
        return;
      }
      if (c) { state.category = c.dataset.filterCategory; $$('[data-filter-category]').forEach((b) => b.classList.toggle('active', b === c)); }
      if (p) { state.platform = p.dataset.filterPlatform; $$('[data-filter-platform]').forEach((b) => b.classList.toggle('active', b === p)); }
      apply();
    });
    $('[data-sort]', filterForm)?.addEventListener('change', (e) => {
      const url = new URL(location.href);
      url.searchParams.set('sort', e.target.value);
      location.href = url.toString();
    });
  }

  updateCount();
  window.El3 = { api, money, toast, cart, openCart, lineHtml, shipProgress, esc, configReady };
})();
