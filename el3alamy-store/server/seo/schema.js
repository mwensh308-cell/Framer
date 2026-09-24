'use strict';
// schema.org JSON-LD builders.
const config = require('../config');

const abs = (path) => `${config.siteUrl}${path}`;
const price = (minor) => (minor / 100).toFixed(2);

function organization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': abs('/#store'),
    name: config.store.name,
    url: abs('/'),
    logo: abs('/img/logo.jpg'),
    image: abs('/img/logo.jpg'),
    description: config.store.tagline,
    founder: { '@type': 'Person', name: config.store.owner },
    sameAs: Object.values(config.store.social),
  };
}

function website() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.store.name,
    url: abs('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: abs('/shop?q={search_term_string}') },
      'query-input': 'required name=search_term_string',
    },
  };
}

function breadcrumbs(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.url) })),
  };
}

function product(p, reviews = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.variants.map((v) => abs(v.image)),
    brand: { '@type': 'Brand', name: 'PlayStation' },
    category: p.category_name,
    sku: p.variants[0]?.sku,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: config.currency,
      lowPrice: price(p.minPrice),
      highPrice: price(p.maxPrice),
      offerCount: p.variants.length,
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': abs('/#store') },
      url: abs(`/products/${p.slug}`),
    },
    ...(p.rating ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating.avg, reviewCount: p.rating.count },
      review: reviews.slice(0, 5).map((r) => ({
        '@type': 'Review',
        author: { '@type': 'Person', name: r.author },
        reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
        name: r.title,
        reviewBody: r.body,
      })),
    } : {}),
  };
}

function itemList(name, products) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem', position: i + 1, url: abs(`/products/${p.slug}`), name: p.name,
    })),
  };
}

function faq(entries) {
  if (!entries?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({ '@type': 'Question', name: e.q, acceptedAnswer: { '@type': 'Answer', text: e.a } })),
  };
}

module.exports = { organization, website, breadcrumbs, product, itemList, faq, abs };
