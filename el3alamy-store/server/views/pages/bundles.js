'use strict';
const products = require('../../repositories/products');
const schema = require('../../seo/schema');
const config = require('../../config');
const { layout } = require('../layout');
const { html, money } = require('../html');
const { bundleCard, breadcrumb } = require('../components');
const icons = require('../icons');

function renderList(req) {
  const bundles = products.bundles();
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Bundles', url: '/bundles' }];
  const body = html`
  <section class="page-hero container">
    ${breadcrumb(crumbs)}
    <h1 class="reveal">Bundles & setups</h1>
    <p class="lead muted reveal">Curated combinations of consoles and accessories — priced below buying each item separately.</p>
  </section>
  <section class="container section-tight"><div class="bundle-grid">${bundles.map(bundleCard)}</div></section>`;
  return layout({
    req, path: '/bundles',
    title: 'PS5 & PS4 Bundles — Save on Complete Setups',
    description: `PlayStation bundles at ${config.store.name}: ${bundles.map((b) => b.name).join(', ')}. Save up to ${Math.max(0, ...bundles.map((b) => b.discount_percent))}%.`.slice(0, 160),
    jsonLd: [schema.breadcrumbs(crumbs)],
    body: body.toString(),
  });
}

function renderOne(req, b) {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Bundles', url: '/bundles' }, { name: b.name, url: `/bundles/${b.slug}` }];
  const body = html`
  <section class="container product-page">
    ${breadcrumb(crumbs)}
    <div class="pdp">
      <div class="pdp-gallery reveal">
        <div class="bundle-stage" data-tilt>
          ${b.items.map((i, idx) => html`<img src="${i.image}" alt="${i.product_name}" class="bundle-img bundle-img-${idx}" width="300" height="300">`)}
        </div>
      </div>
      <div class="pdp-info">
        <p class="eyebrow">Bundle · save ${b.discount_percent}%</p>
        <h1>${b.name}</h1>
        <p class="pdp-tagline">${b.description}</p>
        <div class="pdp-price"><strong>${money(b.price)}</strong> <s class="muted">${money(b.fullPrice)}</s></div>
        <p class="save-line">${icons.bolt({ size: 18 })} You save ${money(b.savings)}</p>
        <h2 class="h5">What's inside</h2>
        <ul class="bundle-items">
          ${b.items.map((i) => html`
            <li>
              <img src="${i.image}" alt="" width="56" height="56" loading="lazy">
              <span><a href="/products/${i.product_slug}">${i.product_name}</a><small class="muted">${i.quantity}× ${i.variant_name}</small></span>
              <span class="muted">${money(i.price * i.quantity)}</span>
            </li>`)}
        </ul>
        <div class="pdp-buy">
          <button class="btn btn-primary btn-lg btn-grow" type="button" data-add-bundle="${b.id}" ${b.inStock ? '' : 'disabled'}>
            ${icons.cart({ size: 18 })} ${b.inStock ? 'Add bundle to cart' : 'Currently unavailable'}
          </button>
        </div>
      </div>
    </div>
  </section>`;
  return layout({
    req, path: `/bundles/${b.slug}`,
    title: `${b.name} — Save ${money(b.savings)}`,
    description: `${b.description} Save ${b.discount_percent}% (${money(b.savings)}) versus buying separately.`.slice(0, 160),
    jsonLd: [schema.breadcrumbs(crumbs), {
      '@context': 'https://schema.org', '@type': 'Product', name: b.name, description: b.description,
      image: b.items.map((i) => schema.abs(i.image)),
      offers: {
        '@type': 'Offer', price: (b.price / 100).toFixed(2), priceCurrency: config.currency,
        availability: b.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: schema.abs(`/bundles/${b.slug}`),
      },
    }],
    body: body.toString(),
  });
}

module.exports = { renderList, renderOne };
