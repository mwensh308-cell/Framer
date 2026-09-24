'use strict';
const products = require('../../repositories/products');
const schema = require('../../seo/schema');
const config = require('../../config');
const { layout } = require('../layout');
const { html, money, stars, jsonScript } = require('../html');
const { productCard, bundleCard, breadcrumb, sectionHead } = require('../components');
const icons = require('../icons');

function render(req, product) {
  const reviews = products.reviewsFor(product.id);
  const bundles = products.bundlesForProduct(product.id);
  const related = products.related(product);
  const comparisons = products.comparisonPairs().filter((c) => c.a.id === product.id || c.b.id === product.id);
  const v0 = product.variants.find((v) => v.stock > 0) || product.variants[0];
  const crumbs = [
    { name: 'Home', url: '/' },
    { name: product.category_name, url: `/category/${product.category_slug}` },
    { name: product.name, url: `/products/${product.slug}` },
  ];
  const hasColors = new Set(product.variants.map((v) => v.color)).size > 1;

  const body = html`
  <section class="container product-page">
    ${breadcrumb(crumbs)}
    <div class="pdp">
      <div class="pdp-gallery reveal">
        <div class="pdp-stage" data-tilt data-tilt-strong>
          <span class="stage-glow" aria-hidden="true" style="--glow:#${v0.color_hex || '3fb6ff'}" data-stage-glow></span>
          <img src="${v0.image}" alt="${product.name} — ${v0.name}" width="640" height="640" data-main-image fetchpriority="high">
        </div>
        ${product.variants.length > 1 ? html`
        <div class="pdp-thumbs" role="list">
          ${product.variants.map((v) => html`
            <button type="button" role="listitem" class="thumb ${v.id === v0.id ? 'active' : ''}" data-thumb="${v.id}" aria-label="Show ${v.name}">
              <img src="${v.image}" alt="" width="96" height="96" loading="lazy">
            </button>`)}
        </div>` : ''}
      </div>

      <div class="pdp-info">
        <p class="eyebrow">${product.category_name}</p>
        <h1>${product.name}</h1>
        <p class="pdp-tagline">${product.tagline}</p>
        ${product.rating ? html`<a class="pdp-rating" href="#reviews">${stars(product.rating.avg)} <span>${product.rating.avg} · ${product.rating.count} review${product.rating.count === 1 ? '' : 's'}</span></a>` : ''}

        <div class="pdp-price">
          <strong data-price>${money(v0.price)}</strong>
          <s class="muted" data-compare ${v0.compare_at_price ? '' : 'hidden'}>${v0.compare_at_price ? money(v0.compare_at_price) : ''}</s>
        </div>

        <div class="variant-picker">
          <p class="picker-label">${hasColors ? 'Colour' : 'Option'}: <strong data-variant-label>${v0.name}</strong></p>
          <div class="${hasColors ? 'swatch-picker' : 'option-picker'}" role="radiogroup" aria-label="Choose an option">
            ${product.variants.map((v) => (hasColors
              ? html`<button type="button" role="radio" class="swatch-btn ${v.id === v0.id ? 'active' : ''}" style="--sw:#${v.color_hex}" data-variant="${v.id}" aria-checked="${v.id === v0.id}" aria-label="${v.name}" title="${v.name}"></button>`
              : html`<button type="button" role="radio" class="option-btn ${v.id === v0.id ? 'active' : ''}" data-variant="${v.id}" aria-checked="${v.id === v0.id}">${v.name}</button>`))}
          </div>
        </div>

        <p class="stock-line" data-stock></p>

        <div class="pdp-buy">
          <div class="qty" data-qty>
            <button type="button" data-qty-dec aria-label="Decrease quantity">−</button>
            <input type="number" value="1" min="1" max="10" data-qty-input aria-label="Quantity">
            <button type="button" data-qty-inc aria-label="Increase quantity">+</button>
          </div>
          <button class="btn btn-primary btn-lg btn-grow" type="button" data-add-selected>${icons.cart({ size: 18 })} Add to cart</button>
        </div>

        <ul class="pdp-assurance">
          <li>${icons.truck({ size: 18 })} Free delivery over ${money(config.freeShippingThreshold)}</li>
          <li>${icons.shield({ size: 18 })} ${product.kind === 'console' ? '12' : '6'}-month local warranty</li>
          <li>${icons.check({ size: 18 })} Genuine, sealed PlayStation hardware</li>
        </ul>

        <div class="compat">
          <h2 class="h5">Works with</h2>
          <ul class="compat-list">
            ${product.platforms.map((p) => html`<li><a href="/compatible/${p.key}" class="compat-chip">${p.label}${p.note ? html` <span class="muted">— ${p.note}</span>` : ''}</a></li>`)}
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="container section">
    <div class="pdp-details">
      <div class="reveal">
        <h2>Overview</h2>
        <p class="lead">${product.description}</p>
        <ul class="check-list">${product.highlights.map((h) => html`<li>${icons.check({ size: 18 })} ${h}</li>`)}</ul>
      </div>
      <div class="reveal">
        <h2>Specifications</h2>
        <table class="spec-table">
          <tbody>${Object.entries(product.specs).map(([k, v]) => html`<tr><th scope="row">${k}</th><td>${v}</td></tr>`)}</tbody>
        </table>
        ${comparisons.length ? html`
        <div class="compare-links">
          <h3 class="h5">Compare ${product.name}</h3>
          <ul class="pill-links">
            ${comparisons.map((c) => { const other = c.a.id === product.id ? c.b : c.a; return html`<li><a href="/compare/${c.slug}">vs ${other.name}</a></li>`; })}
          </ul>
        </div>` : ''}
      </div>
    </div>
  </section>

  ${bundles.length ? html`
  <section class="container section">
    ${sectionHead({ eyebrow: 'Bundle & save', title: `Get more with ${product.name}` })}
    <div class="bundle-grid">${bundles.map(bundleCard)}</div>
  </section>` : ''}

  ${related.length ? html`
  <section class="container section">
    ${sectionHead({ eyebrow: 'Complete your setup', title: product.kind === 'console' ? 'Must-have accessories' : 'Pairs perfectly with' })}
    <div class="product-grid">${related.map((p) => productCard(p))}</div>
  </section>` : ''}

  <section class="container section" id="reviews">
    ${sectionHead({ eyebrow: 'Reviews', title: reviews.length ? `What players say` : 'No reviews yet' })}
    ${reviews.length ? html`
    <div class="review-grid">
      ${reviews.map((r) => html`
        <figure class="review reveal">
          ${stars(r.rating)}
          <blockquote><strong>${r.title}</strong><p>${r.body}</p></blockquote>
          <figcaption class="muted small">— ${r.author}</figcaption>
        </figure>`)}
    </div>` : html`<p class="muted">Bought this from us? Share your thoughts with us on Instagram or TikTok.</p>`}
  </section>

  <div class="sticky-buy" data-sticky-buy hidden>
    <div class="container sticky-inner">
      <img src="${v0.image}" alt="" width="48" height="48" data-sticky-img>
      <div><strong>${product.name}</strong><span class="muted small" data-sticky-variant>${v0.name}</span></div>
      <strong data-sticky-price>${money(v0.price)}</strong>
      <button class="btn btn-primary" type="button" data-add-selected>Add to cart</button>
    </div>
  </div>

  <script type="application/json" id="product-data">${jsonScript({
    id: product.id, name: product.name, slug: product.slug,
    variants: product.variants.map((v) => ({
      id: v.id, name: v.name, price: v.price, compareAt: v.compare_at_price, stock: v.stock, image: v.image, hex: v.color_hex,
    })),
    selected: v0.id,
  })}</script>`;

  return layout({
    req,
    path: `/products/${product.slug}`,
    title: `${product.name} — ${product.tagline.replace(/\.$/, '')}`,
    description: `${product.name}: ${product.highlights.slice(0, 3).join(', ')}. From ${money(product.minPrice)} at El3alamy Store — genuine, warrantied, fast delivery.`.slice(0, 160),
    ogType: 'product',
    jsonLd: [schema.product(product, reviews), schema.breadcrumbs(crumbs)],
    body: body.toString(),
    bodyClass: 'page-product',
    scripts: ['/js/product.js'],
  });
}

module.exports = { render };
