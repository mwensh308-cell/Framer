'use strict';
const config = require('../config');
const products = require('../repositories/products');
const { PLATFORM_PAGES } = require('../views/pages/listing');

function urlEntry(path, { priority = 0.5, changefreq = 'weekly' } = {}) {
  return `<url><loc>${config.siteUrl}${path}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

/** One sitemap for the whole store — split per page type (sitemap index) once URLs exceed a few thousand. */
function build() {
  const entries = [
    urlEntry('/', { priority: 1.0, changefreq: 'daily' }),
    urlEntry('/shop', { priority: 0.9, changefreq: 'daily' }),
    urlEntry('/bundles', { priority: 0.8 }),
    urlEntry('/compare', { priority: 0.6 }),
    urlEntry('/about', { priority: 0.4, changefreq: 'monthly' }),
    urlEntry('/support', { priority: 0.4, changefreq: 'monthly' }),
    ...products.categories().filter((c) => c.product_count > 0).map((c) => urlEntry(`/category/${c.slug}`, { priority: 0.8 })),
    ...Object.keys(PLATFORM_PAGES).map((k) => urlEntry(`/compatible/${k}`, { priority: 0.7 })),
    ...products.list().map((p) => urlEntry(`/products/${p.slug}`, { priority: 0.9, changefreq: 'daily' })),
    ...products.bundles().map((b) => urlEntry(`/bundles/${b.slug}`, { priority: 0.7 })),
    ...products.comparisonPairs().map((c) => urlEntry(`/compare/${c.slug}`, { priority: 0.6, changefreq: 'monthly' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join('')}</urlset>`;
}

function robots() {
  return [
    'User-agent: *',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /account',
    'Disallow: /checkout',
    'Disallow: /cart',
    'Disallow: /order/',
    'Disallow: /*?*sort=',
    '',
    `Sitemap: ${config.siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

module.exports = { build, robots };
