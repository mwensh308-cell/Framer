'use strict';
const config = require('../../config');
const products = require('../../repositories/products');
const schema = require('../../seo/schema');
const { layout, SOCIAL } = require('../layout');
const { html, money } = require('../html');
const { productCard, bundleCard, sectionHead } = require('../components');
const icons = require('../icons');

function render(req) {
  const featured = products.list({ featured: true });
  const hero = products.bySlug('ps5-pro') || featured[0];
  const consoles = products.list({ category: 'consoles' });
  const accessories = featured.filter((p) => p.kind === 'accessory');
  const bundles = products.bundles().slice(0, 3);
  const categories = products.categories().filter((c) => c.product_count > 0);

  const body = html`
  <section class="hero">
    <div class="hero-orbs" aria-hidden="true">
      <span class="orb orb-blue"></span><span class="orb orb-violet"></span>
      <span class="float-sym fs-1">${icons.triangle({ size: 46 })}</span>
      <span class="float-sym fs-2">${icons.circle({ size: 40 })}</span>
      <span class="float-sym fs-3">${icons.cross({ size: 38 })}</span>
      <span class="float-sym fs-4">${icons.square({ size: 36 })}</span>
    </div>
    <div class="container hero-inner">
      <div class="hero-copy">
        <p class="eyebrow hero-in" style="--d:0">New · ${hero.name}</p>
        <h1 class="hero-title hero-in" style="--d:1">Play has <span class="text-gradient">no limits.</span></h1>
        <p class="hero-lead hero-in" style="--d:2">
          ${config.store.name} is your destination for genuine PlayStation consoles, controllers and gear —
          sealed, warrantied and delivered fast.
        </p>
        <div class="hero-cta hero-in" style="--d:3">
          <a class="btn btn-primary btn-lg" href="/products/${hero.slug}">Shop ${hero.name} ${icons.arrow({ size: 18 })}</a>
          <a class="btn btn-ghost btn-lg" href="/shop">Explore the store</a>
        </div>
        <ul class="hero-stats hero-in" style="--d:4">
          <li><strong data-count="100">0</strong><span>% genuine & sealed</span></li>
          <li><strong data-count="48">0</strong><span>hour delivery in Cairo</span></li>
          <li><strong data-count="12">0</strong><span>month warranty</span></li>
        </ul>
      </div>
      <div class="hero-visual" data-parallax>
        <div class="hero-ring" aria-hidden="true"></div>
        <img class="hero-console" src="${hero.image}" alt="${hero.name}" width="520" height="520" fetchpriority="high">
        <div class="hero-price glass">
          <span class="muted small">From</span>
          <strong>${money(hero.minPrice)}</strong>
          <a href="/products/${hero.slug}" class="link-arrow small">Details ${icons.arrow({ size: 14 })}</a>
        </div>
      </div>
    </div>
    <div class="marquee" aria-hidden="true">
      <div class="marquee-track">
        ${[0, 1].map(() => html`<span>PS5 PRO</span><span>${icons.triangle({ size: 18 })}</span><span>DUALSENSE EDGE</span><span>${icons.circle({ size: 18 })}</span><span>PULSE ELITE</span><span>${icons.cross({ size: 18 })}</span><span>PS VR2</span><span>${icons.square({ size: 18 })}</span><span>PLAYSTATION PORTAL</span><span>${icons.triangle({ size: 18 })}</span>`)}
      </div>
    </div>
  </section>

  <section class="section container">
    ${sectionHead({ eyebrow: 'Shop by category', title: 'Everything for your setup', link: { href: '/shop', label: 'View all products' } })}
    <div class="category-grid">
      ${categories.map((c, i) => html`
        <a class="category-tile reveal" href="/category/${c.slug}" style="--i:${i}">
          <span class="tile-sym">${[icons.triangle, icons.circle, icons.cross, icons.square][i % 4]({ size: 28 })}</span>
          <strong>${c.name}</strong>
          <span class="muted small">${c.product_count} product${c.product_count === 1 ? '' : 's'}</span>
          ${icons.arrow({ size: 18, cls: 'tile-arrow' })}
        </a>`)}
    </div>
  </section>

  <section class="section container">
    ${sectionHead({ eyebrow: 'Consoles', title: 'Choose your PlayStation', text: 'Sealed, genuine and ready to play — with local warranty on every console.', link: { href: '/compare/ps5-pro-vs-ps5-slim', label: 'PS5 Pro vs PS5 Slim' } })}
    <div class="product-grid">${consoles.map((p, i) => productCard(p, { eager: i < 2 }))}</div>
  </section>

  <section class="section showcase">
    <div class="container showcase-inner">
      <div class="showcase-visual reveal" data-parallax>
        <img src="${products.artUrl('edge', '22252e')}" alt="DualSense Edge controller" width="520" height="520" loading="lazy">
      </div>
      <div class="showcase-copy reveal">
        <p class="eyebrow">Pro-grade control</p>
        <h2>DualSense Edge. <span class="text-gradient">Your rules.</span></h2>
        <p class="muted">Remappable back buttons, swappable stick modules and adjustable trigger stops. Built for players who play to win.</p>
        <ul class="check-list">
          <li>${icons.check({ size: 18 })} Two remappable back buttons</li>
          <li>${icons.check({ size: 18 })} Replaceable stick modules</li>
          <li>${icons.check({ size: 18 })} Three on-the-fly control profiles</li>
        </ul>
        <a class="btn btn-primary" href="/products/dualsense-edge">Discover DualSense Edge ${icons.arrow({ size: 18 })}</a>
      </div>
    </div>
  </section>

  <section class="section container">
    ${sectionHead({ eyebrow: 'Best sellers', title: 'Level up your gear', link: { href: '/compatible/ps5', label: 'All PS5 accessories' } })}
    <div class="product-grid">${accessories.map((p) => productCard(p))}</div>
  </section>

  <section class="section container">
    ${sectionHead({ eyebrow: 'Bundle & save', title: 'Complete setups, better prices', text: 'Hand-picked combinations that save you up to 10% versus buying separately.', link: { href: '/bundles', label: 'All bundles' } })}
    <div class="bundle-grid">${bundles.map(bundleCard)}</div>
  </section>

  <section class="section container">
    <div class="perks">
      ${[
        [icons.shield, '100% genuine', 'Sealed Sony hardware with serial numbers you can verify.'],
        [icons.truck, 'Fast delivery', 'Free shipping over ' + money(config.freeShippingThreshold) + '. Cash on delivery available.'],
        [icons.bolt, 'Local warranty', '12 months on consoles, 6 months on accessories — handled by us.'],
        [icons.chat, 'Real humans', 'Setup advice from gamers, via Instagram, TikTok or Facebook DMs.'],
      ].map(([ic, t, d]) => html`<div class="perk reveal">${ic({ size: 26 })}<h3>${t}</h3><p class="muted">${d}</p></div>`)}
    </div>
  </section>

  <section class="section container">
    <div class="community reveal">
      <div class="community-copy">
        <p class="eyebrow">Meet the founder</p>
        <h2>Built by a gamer, for gamers.</h2>
        <p class="muted">${config.store.owner} started ${config.store.name} to make genuine PlayStation hardware easy to buy — with honest advice and real after-sales support. Catch the unboxings, setup tours and giveaways on our channels.</p>
        <div class="community-links">
          ${SOCIAL.map((s) => html`<a class="btn btn-glass social-btn social-${s.key}" href="${s.url}" target="_blank" rel="noopener me">${icons[s.key]({ size: 18 })} ${s.label}</a>`)}
        </div>
      </div>
      <div class="community-visual">
        <img src="/img/logo.jpg" alt="${config.store.owner} — El3alamy Store" width="360" height="360" loading="lazy">
      </div>
    </div>
  </section>`;

  return layout({
    req,
    path: '/',
    title: `${config.store.name} — PS5, PS5 Pro, PS4 Consoles & Accessories`,
    description: 'Shop genuine PlayStation 5 Pro, PS5 Slim and PS4 consoles, DualSense controllers, PULSE headsets, PS VR2 and PlayStation Portal. Fast delivery, local warranty and bundle savings.',
    jsonLd: [schema.website(), schema.itemList('Featured products', featured)],
    body: body.toString(),
    bodyClass: 'page-home',
  });
}

module.exports = { render };
