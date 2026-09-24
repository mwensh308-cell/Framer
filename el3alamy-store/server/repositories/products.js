'use strict';
const { get } = require('../db');

const PLATFORMS = { ps5: 'PS5', ps4: 'PS4' };

const artUrl = (art, hex) => `/art/${art}/${(hex || 'f2f4f8').toLowerCase()}.svg`;

function variantsFor(productIds, includeInactive) {
  if (!productIds.length) return new Map();
  const rows = get().prepare(
    `SELECT * FROM product_variants WHERE ${includeInactive ? '1 = 1' : 'active = 1'} AND product_id IN (${productIds.map(() => '?').join(',')})
     ORDER BY position`
  ).all(...productIds);
  const map = new Map();
  for (const v of rows) {
    if (!map.has(v.product_id)) map.set(v.product_id, []);
    map.get(v.product_id).push(v);
  }
  return map;
}

function hydrate(rows, { includeInactive = false } = {}) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const variants = variantsFor(ids, includeInactive);
  const placeholders = ids.map(() => '?').join(',');
  const platforms = get().prepare(
    `SELECT * FROM product_platforms WHERE product_id IN (${placeholders})`
  ).all(...ids);
  const ratings = get().prepare(
    `SELECT product_id, COUNT(*) AS count, ROUND(AVG(rating), 1) AS avg FROM reviews
     WHERE product_id IN (${placeholders}) GROUP BY product_id`
  ).all(...ids);

  return rows.map((r) => {
    const vs = (variants.get(r.id) || []).map((v) => ({ ...v, image: artUrl(r.art, v.color_hex) }));
    const rating = ratings.find((x) => x.product_id === r.id);
    const prices = vs.filter((v) => v.active).map((v) => v.price);
    return {
      ...r,
      highlights: JSON.parse(r.highlights),
      specs: JSON.parse(r.specs),
      variants: vs,
      image: vs[0]?.image || artUrl(r.art),
      platforms: platforms.filter((p) => p.product_id === r.id)
        .map((p) => ({ key: p.platform, label: PLATFORMS[p.platform], note: p.note })),
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      compareAt: vs.find((v) => v.compare_at_price)?.compare_at_price || null,
      inStock: vs.some((v) => v.active && v.stock > 0),
      totalStock: vs.filter((v) => v.active).reduce((s, v) => s + v.stock, 0),
      rating: rating ? { avg: rating.avg, count: rating.count } : null,
    };
  });
}

const BASE = `SELECT p.*, c.slug AS category_slug, c.name AS category_name
              FROM products p JOIN categories c ON c.id = p.category_id`;

const SORTS = {
  featured: 'p.featured DESC, c.position, p.id',
  newest: 'p.release_year DESC, p.id DESC',
  'price-asc': '(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) ASC',
  'price-desc': '(SELECT MIN(price) FROM product_variants WHERE product_id = p.id) DESC',
  name: 'p.name COLLATE NOCASE',
};

function list({ category, platform, q, sort = 'featured', featured, includeInactive = false, limit } = {}) {
  const where = [];
  const params = [];
  if (!includeInactive) where.push('p.active = 1');
  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (platform) {
    where.push('EXISTS (SELECT 1 FROM product_platforms pp WHERE pp.product_id = p.id AND pp.platform = ?)');
    params.push(platform);
  }
  if (featured) where.push('p.featured = 1');
  if (q) {
    where.push('(p.name LIKE ? OR p.tagline LIKE ? OR c.name LIKE ?)');
    const like = `%${q.replace(/[%_]/g, '')}%`;
    params.push(like, like, like);
  }
  let sql = `${BASE} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${SORTS[sort] || SORTS.featured}`;
  if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
  return hydrate(get().prepare(sql).all(...params), { includeInactive });
}

function bySlug(slug, { includeInactive = false } = {}) {
  const row = get().prepare(`${BASE} WHERE p.slug = ? ${includeInactive ? '' : 'AND p.active = 1'}`).get(slug);
  return row ? hydrate([row])[0] : null;
}

function byId(id) {
  const row = get().prepare(`${BASE} WHERE p.id = ?`).get(id);
  return row ? hydrate([row], { includeInactive: true })[0] : null;
}

function reviewsFor(productId) {
  return get().prepare('SELECT author, rating, title, body, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC')
    .all(productId);
}

function categories() {
  return get().prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.active = 1) AS product_count
     FROM categories c ORDER BY position`
  ).all().map((c) => ({ ...c, buying_tips: JSON.parse(c.buying_tips) }));
}

function categoryBySlug(slug) {
  return categories().find((c) => c.slug === slug) || null;
}

/** Complementary items: for a console, accessories on its platform; for an accessory, consoles + other accessories. */
function related(product, limit = 4) {
  const platform = product.platforms[0]?.key;
  if (!platform) return [];
  return list({ platform })
    .filter((p) => p.id !== product.id && p.category_id !== product.category_id)
    .sort((a, b) => (product.kind === 'accessory' ? (b.kind === 'console') - (a.kind === 'console') : 0)
      || b.featured - a.featured)
    .slice(0, limit);
}

// ── Bundles ────────────────────────────────────────────────────────────────
function hydrateBundles(rows) {
  return rows.map((b) => {
    const items = get().prepare(
      `SELECT bi.quantity, v.id AS variant_id, v.name AS variant_name, v.price, v.stock, v.color_hex,
              p.name AS product_name, p.slug AS product_slug, p.art
       FROM bundle_items bi JOIN product_variants v ON v.id = bi.variant_id JOIN products p ON p.id = v.product_id
       WHERE bi.bundle_id = ?`
    ).all(b.id).map((i) => ({ ...i, image: artUrl(i.art, i.color_hex) }));
    const fullPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);
    // Round bundle prices to whole currency units (e.g. EGP 32,217 not 32,217.30).
    const price = Math.round((fullPrice * (100 - b.discount_percent)) / 100 / 100) * 100;
    return {
      ...b, items, fullPrice, price, savings: fullPrice - price,
      inStock: items.every((i) => i.stock >= i.quantity),
    };
  });
}

function bundles({ includeInactive = false } = {}) {
  return hydrateBundles(get().prepare(`SELECT * FROM bundles ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY id`).all());
}

function bundleBySlug(slug) {
  const row = get().prepare('SELECT * FROM bundles WHERE slug = ? AND active = 1').get(slug);
  return row ? hydrateBundles([row])[0] : null;
}

function bundlesForProduct(productId) {
  return hydrateBundles(get().prepare(
    `SELECT DISTINCT b.* FROM bundles b JOIN bundle_items bi ON bi.bundle_id = b.id
     JOIN product_variants v ON v.id = bi.variant_id WHERE v.product_id = ? AND b.active = 1`
  ).all(productId));
}

// ── Programmatic comparisons ───────────────────────────────────────────────
// Only generate "A vs B" pages in categories shoppers genuinely compare (consoles, controllers, audio)
// and where both products share enough spec rows for a meaningful table — avoids thin/doorway pages.
const MIN_SHARED_SPECS = 4;

function comparisonPairs() {
  const comparable = new Set(get().prepare('SELECT id FROM categories WHERE comparable = 1').all().map((c) => c.id));
  const all = list().filter((p) => comparable.has(p.category_id));
  const pairs = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const [a, b] = [all[i], all[j]].sort((x, y) => x.slug.localeCompare(y.slug));
      if (a.category_id !== b.category_id) continue;
      const shared = Object.keys(a.specs).filter((k) => k in b.specs);
      if (shared.length < MIN_SHARED_SPECS) continue;
      pairs.push({ a, b, shared, slug: `${a.slug}-vs-${b.slug}` });
    }
  }
  return pairs;
}

module.exports = {
  PLATFORMS, artUrl, list, bySlug, byId, reviewsFor, categories, categoryBySlug, related,
  bundles, bundleBySlug, bundlesForProduct, comparisonPairs,
};
