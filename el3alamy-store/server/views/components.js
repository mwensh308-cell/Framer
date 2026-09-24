'use strict';
const { html, money, stars } = require('./html');
const icons = require('./icons');

function badge(p) {
  if (!p.inStock) return html`<span class="badge badge-muted">Sold out</span>`;
  if (p.compareAt && p.compareAt > p.minPrice) {
    return html`<span class="badge badge-sale">Save ${Math.round((1 - p.minPrice / p.compareAt) * 100)}%</span>`;
  }
  if (p.totalStock <= 5) return html`<span class="badge badge-warn">Only ${p.totalStock} left</span>`;
  if (p.featured) return html`<span class="badge">Best seller</span>`;
  return '';
}

function productCard(p, { eager = false } = {}) {
  const single = p.variants.length === 1 ? p.variants[0] : null;
  const colors = [...new Map(p.variants.filter((v) => v.color_hex).map((v) => [v.color_hex, v])).values()];
  return html`
  <article class="product-card reveal" data-tilt
    data-name="${p.name.toLowerCase()}" data-category="${p.category_slug}"
    data-platforms="${p.platforms.map((x) => x.key).join(' ')}" data-price="${p.minPrice}">
    <a class="card-media" href="/products/${p.slug}" aria-label="${p.name}">
      <span class="card-glow" aria-hidden="true"></span>
      <img src="${p.image}" alt="${p.name}" width="400" height="400" ${eager ? '' : html`loading="lazy"`} decoding="async">
      ${badge(p)}
    </a>
    <div class="card-body">
      <p class="card-cat">${p.category_name} · ${p.platforms.map((x) => x.label).join(' / ')}</p>
      <h3 class="card-title"><a href="/products/${p.slug}">${p.name}</a></h3>
      <p class="card-tagline muted">${p.tagline}</p>
      ${p.rating ? html`<p class="card-rating">${stars(p.rating.avg)} <span class="muted small">(${p.rating.count})</span></p>` : ''}
      <div class="card-foot">
        <p class="price">
          ${p.variants.length > 1 && p.minPrice !== p.maxPrice ? html`<span class="from">From</span>` : ''}
          <strong>${money(p.minPrice)}</strong>
          ${p.compareAt && p.compareAt > p.minPrice ? html`<s class="muted">${money(p.compareAt)}</s>` : ''}
        </p>
        ${single
          ? html`<button class="btn btn-sm btn-glass" type="button" data-add-variant="${single.id}" ${p.inStock ? '' : 'disabled'}>${icons.cart({ size: 16 })} Add</button>`
          : html`<a class="btn btn-sm btn-glass" href="/products/${p.slug}">Options</a>`}
      </div>
      ${colors.length > 1 ? html`<ul class="swatches" aria-label="Available colours">${colors.map((v) => html`<li style="--sw:#${v.color_hex}" title="${v.color}"></li>`)}</ul>` : ''}
    </div>
  </article>`;
}

function bundleCard(b) {
  return html`
  <article class="bundle-card reveal" data-tilt>
    <a href="/bundles/${b.slug}" class="bundle-media" aria-label="${b.name}">
      ${b.items.slice(0, 3).map((i, idx) => html`<img src="${i.image}" alt="" class="bundle-img bundle-img-${idx}" width="220" height="220" loading="lazy">`)}
      <span class="badge badge-sale">Save ${b.discount_percent}%</span>
    </a>
    <div class="card-body">
      <p class="card-cat">Bundle · ${b.items.length} items</p>
      <h3 class="card-title"><a href="/bundles/${b.slug}">${b.name}</a></h3>
      <p class="muted card-tagline">${b.description}</p>
      <div class="card-foot">
        <p class="price"><strong>${money(b.price)}</strong> <s class="muted">${money(b.fullPrice)}</s></p>
        <button class="btn btn-sm btn-primary" type="button" data-add-bundle="${b.id}" ${b.inStock ? '' : 'disabled'}>${b.inStock ? 'Add bundle' : 'Sold out'}</button>
      </div>
    </div>
  </article>`;
}

const breadcrumb = (items) => html`
  <nav class="breadcrumb" aria-label="Breadcrumb"><ol>
    ${items.map((it, i) => (i === items.length - 1
      ? html`<li aria-current="page">${it.name}</li>`
      : html`<li><a href="${it.url}">${it.name}</a></li>`))}
  </ol></nav>`;

const sectionHead = ({ eyebrow, title, text, link }) => html`
  <div class="section-head reveal">
    <div>
      ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}
      <h2>${title}</h2>
      ${text ? html`<p class="muted">${text}</p>` : ''}
    </div>
    ${link ? html`<a class="link-arrow" href="${link.href}">${link.label} ${icons.arrow({ size: 16 })}</a>` : ''}
  </div>`;

const faqList = (entries) => html`
  <div class="faq">
    ${entries.map((e) => html`<details class="reveal"><summary>${e.q}</summary><p>${e.a}</p></details>`)}
  </div>`;

module.exports = { productCard, bundleCard, breadcrumb, sectionHead, faqList, badge };
