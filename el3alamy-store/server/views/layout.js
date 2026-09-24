'use strict';
const config = require('../config');
const { html, raw, jsonScript } = require('./html');
const icons = require('./icons');
const schema = require('../seo/schema');
const productsRepo = require('../repositories/products');

const NAV = [
  { href: '/category/consoles', label: 'Consoles' },
  { href: '/category/controllers', label: 'Controllers' },
  { href: '/category/audio', label: 'Audio' },
  { href: '/category/vr-and-remote-play', label: 'VR & Portal' },
  { href: '/bundles', label: 'Bundles' },
  { href: '/compare', label: 'Compare' },
];

const SOCIAL = [
  { key: 'instagram', label: 'Instagram', handle: '@mostafael.alamy', url: config.store.social.instagram },
  { key: 'tiktok', label: 'TikTok', handle: '@mostafaahmedelalamy', url: config.store.social.tiktok },
  { key: 'facebook', label: 'Facebook', handle: 'Mostafa Elalamy', url: config.store.social.facebook },
];

const socialLinks = (cls = 'social') => html`
  <ul class="${cls}">
    ${SOCIAL.map((s) => html`<li><a href="${s.url}" target="_blank" rel="noopener me" aria-label="${config.store.name} on ${s.label}" data-social="${s.key}">${icons[s.key]({ size: 20 })}</a></li>`)}
  </ul>`;

function header(req) {
  const path = req?.path || '/';
  return html`
  <header class="site-header" data-header>
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="${config.store.name} home">
        <img src="/img/logo.jpg" alt="" width="40" height="40" class="brand-logo">
        <span class="brand-text">El3alamy<span class="brand-accent">Store</span></span>
      </a>
      <nav class="main-nav" aria-label="Main" data-nav>
        <ul>
          ${NAV.map((n) => html`<li><a href="${n.href}" class="${path.startsWith(n.href) ? 'active' : ''}">${n.label}</a></li>`)}
        </ul>
        <div class="nav-mobile-extra">
          <a href="/shop" class="btn btn-primary btn-block">Shop all</a>
          ${socialLinks('social social-nav')}
        </div>
      </nav>
      <div class="header-actions">
        <button class="icon-btn" type="button" data-search-open aria-label="Search">${icons.search()}</button>
        <a class="icon-btn" href="/account" aria-label="Account">${icons.user()}</a>
        <button class="icon-btn cart-btn" type="button" data-cart-open aria-label="Open cart">
          ${icons.cart()}<span class="cart-count" data-cart-count hidden>0</span>
        </button>
        <button class="icon-btn menu-btn" type="button" data-menu-toggle aria-label="Menu" aria-expanded="false">${icons.menu()}</button>
      </div>
    </div>
  </header>`;
}

function footer() {
  const cats = productsRepo.categories();
  return html`
  <footer class="site-footer">
    <div class="footer-glow" aria-hidden="true"></div>
    <div class="container">
      <section class="footer-community reveal">
        <div>
          <p class="eyebrow">Join the squad</p>
          <h2>Unboxings, drops & giveaways — live on our socials.</h2>
          <p class="muted">Follow ${config.store.owner} for first looks at new stock, setup tours and exclusive discount codes.</p>
        </div>
        <div class="social-cards">
          ${SOCIAL.map((s) => html`
            <a class="social-card social-${s.key}" href="${s.url}" target="_blank" rel="noopener me">
              ${icons[s.key]({ size: 26 })}
              <span><strong>${s.label}</strong><small>${s.handle}</small></span>
              ${icons.arrow({ size: 18, cls: 'social-card-arrow' })}
            </a>`)}
        </div>
      </section>

      <div class="footer-grid">
        <div class="footer-brand">
          <a class="brand" href="/">
            <img src="/img/logo.jpg" alt="" width="48" height="48" class="brand-logo" loading="lazy">
            <span class="brand-text">El3alamy<span class="brand-accent">Store</span></span>
          </a>
          <p class="muted">${config.store.tagline}. Genuine hardware, local warranty and fast delivery — curated by ${config.store.owner}.</p>
          ${socialLinks()}
        </div>
        <nav aria-label="Shop">
          <h3>Shop</h3>
          <ul>${cats.map((c) => html`<li><a href="/category/${c.slug}">${c.name}</a></li>`)}<li><a href="/bundles">Bundles</a></li></ul>
        </nav>
        <nav aria-label="Guides">
          <h3>Guides</h3>
          <ul>
            <li><a href="/compatible/ps5">PS5 accessories</a></li>
            <li><a href="/compatible/ps4">PS4 accessories</a></li>
            <li><a href="/compare">Compare consoles & gear</a></li>
            <li><a href="/compare/ps5-pro-vs-ps5-slim">PS5 Pro vs PS5 Slim</a></li>
          </ul>
        </nav>
        <nav aria-label="Help">
          <h3>Help</h3>
          <ul>
            <li><a href="/track">Track your order</a></li>
            <li><a href="/support">Shipping & returns</a></li>
            <li><a href="/support#warranty">Warranty</a></li>
            <li><a href="/about">About us</a></li>
            <li><a href="mailto:${config.store.email}">${config.store.email}</a></li>
          </ul>
        </nav>
        <div class="footer-newsletter">
          <h3>Drop alerts</h3>
          <p class="muted">Restocks and limited editions sell out fast. Get notified first.</p>
          <form class="newsletter-form" data-newsletter novalidate>
            <label class="sr-only" for="nl-email">Email</label>
            <input id="nl-email" type="email" name="email" placeholder="you@email.com" required autocomplete="email">
            <button class="btn btn-primary" type="submit">Subscribe</button>
          </form>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</p>
        <p class="muted small">PlayStation, PS5, PS4, DualSense and DualShock are trademarks of Sony Interactive Entertainment. ${config.store.name} is an independent retailer.</p>
      </div>
    </div>
  </footer>`;
}

const overlays = () => html`
  <div class="drawer-backdrop" data-drawer-backdrop hidden></div>
  <aside class="cart-drawer" data-cart-drawer aria-label="Shopping cart" aria-hidden="true" tabindex="-1">
    <div class="drawer-head">
      <h2>Your cart</h2>
      <button class="icon-btn" type="button" data-cart-close aria-label="Close cart">${icons.close()}</button>
    </div>
    <div class="drawer-body" data-cart-lines><p class="muted">Loading…</p></div>
    <div class="drawer-foot" data-cart-foot></div>
  </aside>

  <div class="search-overlay" data-search hidden role="dialog" aria-modal="true" aria-label="Search">
    <div class="search-box">
      ${icons.search({ size: 22 })}
      <input type="search" placeholder="Search consoles, controllers, headsets…" data-search-input aria-label="Search products" autocomplete="off">
      <button class="icon-btn" type="button" data-search-close aria-label="Close search">${icons.close()}</button>
    </div>
    <div class="search-results" data-search-results></div>
  </div>

  <div class="toast-stack" data-toasts aria-live="polite"></div>`;

// First-visit loading sequence (skipped on later navigations via sessionStorage, and for reduced motion).
const loader = () => html`
  <div class="loader" data-loader aria-hidden="true">
    <div class="loader-symbols">
      <span class="sym sym-triangle">${icons.triangle({ size: 34 })}</span>
      <span class="sym sym-circle">${icons.circle({ size: 34 })}</span>
      <span class="sym sym-cross">${icons.cross({ size: 34 })}</span>
      <span class="sym sym-square">${icons.square({ size: 34 })}</span>
    </div>
    <p class="loader-word">EL3ALAMY</p>
    <div class="loader-bar"><span></span></div>
  </div>`;

/**
 * @param {object} o
 * @param {string} o.title           Page title (brand is appended)
 * @param {string} o.description     Meta description (≤160 chars)
 * @param {string} [o.path]          Canonical path
 * @param {boolean} [o.noindex]
 * @param {object[]} [o.jsonLd]
 * @param {string} [o.image]         Social preview image path
 * @param {string[]} [o.scripts]     Extra page scripts
 */
function layout(o) {
  const title = o.title.includes(config.store.name) ? o.title : `${o.title} | ${config.store.name}`;
  const canonical = o.path !== undefined ? `${config.siteUrl}${o.path}` : null;
  const image = `${config.siteUrl}${o.image || '/img/logo.jpg'}`;
  const ld = [schema.organization(), ...(o.jsonLd || [])].filter(Boolean);
  return `<!doctype html>${html`
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${title}</title>
  <meta name="description" content="${o.description}">
  ${canonical ? html`<link rel="canonical" href="${canonical}">` : ''}
  <meta name="robots" content="${o.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
  <meta name="theme-color" content="#05070d">
  <meta property="og:type" content="${o.ogType || 'website'}">
  <meta property="og:site_name" content="${config.store.name}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${o.description}">
  ${canonical ? html`<meta property="og:url" content="${canonical}">` : ''}
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/img/logo.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@500;600;700;800&display=swap">
  <link rel="stylesheet" href="/css/main.css">
  ${ld.map((d) => html`<script type="application/ld+json">${jsonScript(d)}</script>`)}
</head>
<body class="${o.bodyClass || ''}">
  <a class="skip-link" href="#main">Skip to content</a>
  ${loader()}
  <div class="bg-grid" aria-hidden="true"></div>
  ${header(o.req)}
  <main id="main">${raw(o.body)}</main>
  ${footer()}
  ${overlays()}
  <script src="/js/app.js" defer></script>
  ${(o.scripts || []).map((s) => html`<script src="${s}" defer></script>`)}
</body>
</html>`}`;
}

module.exports = { layout, SOCIAL, socialLinks };
