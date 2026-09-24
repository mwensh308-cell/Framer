'use strict';
const fs = require('node:fs');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('./index');
const catalog = require('./catalog');

const toMinor = (major) => Math.round(major * 100);

function seedCatalog(conn) {
  const catIds = {};
  catalog.categories.forEach((c, i) => {
    const r = conn.prepare(
      'INSERT INTO categories (slug, name, headline, intro, buying_tips, comparable, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(c.slug, c.name, c.headline, c.intro, JSON.stringify(c.tips || []), c.comparable ? 1 : 0, i);
    catIds[c.slug] = Number(r.lastInsertRowid);
  });

  const skuIds = {};
  const productIds = {};
  for (const p of catalog.products) {
    const r = conn.prepare(`INSERT INTO products
      (slug, name, category_id, kind, art, tagline, description, highlights, specs, featured, release_year)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      p.slug, p.name, catIds[p.category], p.kind, p.art, p.tagline, p.description,
      JSON.stringify(p.highlights || []), JSON.stringify(p.specs || {}), p.featured || 0, p.year || null
    );
    const pid = Number(r.lastInsertRowid);
    productIds[p.slug] = pid;
    for (const platform of p.platforms) {
      conn.prepare('INSERT INTO product_platforms (product_id, platform, note) VALUES (?, ?, ?)')
        .run(pid, platform, p.platformNotes?.[platform] ?? null);
    }
    p.variants.forEach((v, i) => {
      const vr = conn.prepare(`INSERT INTO product_variants
        (product_id, sku, name, color, color_hex, edition, storage, price, compare_at_price, stock, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        pid, v.sku, v.name, v.color ?? null, v.hex ?? null, v.edition ?? null, v.storage ?? null,
        toMinor(v.price), v.compare ? toMinor(v.compare) : null, v.stock, i
      );
      skuIds[v.sku] = Number(vr.lastInsertRowid);
    });
  }

  for (const b of catalog.bundles) {
    const r = conn.prepare('INSERT INTO bundles (slug, name, description, discount_percent) VALUES (?, ?, ?, ?)')
      .run(b.slug, b.name, b.description, b.discount);
    for (const [sku, qty] of b.items) {
      conn.prepare('INSERT INTO bundle_items (bundle_id, variant_id, quantity) VALUES (?, ?, ?)')
        .run(Number(r.lastInsertRowid), skuIds[sku], qty);
    }
  }

  for (const [slug, author, rating, title, body] of catalog.reviews) {
    conn.prepare('INSERT INTO reviews (product_id, author, rating, title, body) VALUES (?, ?, ?, ?, ?)')
      .run(productIds[slug], author, rating, title, body);
  }

  for (const c of catalog.coupons) {
    conn.prepare('INSERT INTO coupons (code, percent_off, min_subtotal) VALUES (?, ?, ?)')
      .run(c.code, c.percent, toMinor(c.min));
  }
}

function ensureAdmin(conn) {
  const exists = conn.prepare('SELECT id FROM users WHERE email = ?').get(config.admin.email);
  if (exists) return;
  if (config.isProd && config.admin.password === 'ChangeMe!2026') {
    throw new Error('Set ADMIN_PASSWORD before seeding a production database.');
  }
  conn.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(config.admin.email, bcrypt.hashSync(config.admin.password, 12), 'Store Admin', 'admin');
}

/** Seed the catalog on first boot only (idempotent). */
function seedIfEmpty() {
  const conn = db.get();
  const { n } = conn.prepare('SELECT COUNT(*) AS n FROM products').get();
  db.tx((c) => {
    if (n === 0) seedCatalog(c);
    ensureAdmin(c);
  });
  return n === 0;
}

module.exports = { seedIfEmpty };

if (require.main === module) {
  if (process.argv.includes('--reset') && fs.existsSync(config.dbFile)) {
    for (const suffix of ['', '-wal', '-shm']) fs.rmSync(config.dbFile + suffix, { force: true });
    console.log('Removed existing database.');
  }
  db.open();
  seedIfEmpty();
  console.log(`Seeded ${catalog.products.length} products, ${catalog.bundles.length} bundles. Admin: ${config.admin.email}`);
  db.close();
}
