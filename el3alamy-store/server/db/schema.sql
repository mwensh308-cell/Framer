-- El3alamy Store schema. All money values are INTEGER minor units (e.g. piasters / cents).
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  headline    TEXT NOT NULL,
  intro       TEXT NOT NULL,          -- unique, hand-written hub copy (SEO)
  buying_tips TEXT NOT NULL DEFAULT '[]', -- JSON array of FAQ {q,a}
  comparable  INTEGER NOT NULL DEFAULT 0,  -- generate "A vs B" pages within this category (real search demand only)
  position    INTEGER NOT NULL DEFAULT 0
);

-- A product is the marketing entity (e.g. "DualSense Wireless Controller").
CREATE TABLE IF NOT EXISTS products (
  id                INTEGER PRIMARY KEY,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  category_id       INTEGER NOT NULL REFERENCES categories(id),
  kind              TEXT NOT NULL CHECK (kind IN ('console','accessory')),
  art               TEXT NOT NULL,     -- illustration key used by /art
  tagline           TEXT NOT NULL,
  description       TEXT NOT NULL,
  highlights        TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
  specs             TEXT NOT NULL DEFAULT '{}', -- JSON object label -> value (drives comparisons)
  featured          INTEGER NOT NULL DEFAULT 0,
  active            INTEGER NOT NULL DEFAULT 1,
  release_year      INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- A variant is the purchasable SKU (edition / colour / storage).
CREATE TABLE IF NOT EXISTS product_variants (
  id               INTEGER PRIMARY KEY,
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku              TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  color            TEXT,              -- display name
  color_hex        TEXT,              -- swatch + art tint
  edition          TEXT,
  storage          TEXT,
  price            INTEGER NOT NULL CHECK (price >= 0),
  compare_at_price INTEGER,
  stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  position         INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- Which platforms an item works with (drives /compatible/:platform and cross-sells).
CREATE TABLE IF NOT EXISTS product_platforms (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL CHECK (platform IN ('ps5','ps4')),
  note       TEXT,
  PRIMARY KEY (product_id, platform)
);

-- Accessory bundling: a bundle is a fixed set of variants sold at a discount.
CREATE TABLE IF NOT EXISTS bundles (
  id               INTEGER PRIMARY KEY,
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 0 AND 50),
  active           INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS bundle_items (
  bundle_id  INTEGER NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (bundle_id, variant_id)
);

CREATE TABLE IF NOT EXISTS coupons (
  code          TEXT PRIMARY KEY COLLATE NOCASE,
  percent_off   INTEGER NOT NULL CHECK (percent_off BETWEEN 1 AND 90),
  min_subtotal  INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1,
  expires_at    TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY,
  number           TEXT NOT NULL UNIQUE,
  user_id          INTEGER REFERENCES users(id),
  email            TEXT NOT NULL COLLATE NOCASE,
  status           TEXT NOT NULL CHECK (status IN
                     ('pending_payment','paid','processing','shipped','delivered','cancelled','refunded')),
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('card','cod')),
  payment_ref      TEXT,
  currency         TEXT NOT NULL,
  subtotal         INTEGER NOT NULL,
  discount         INTEGER NOT NULL DEFAULT 0,
  shipping         INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL,
  coupon_code      TEXT,
  shipping_address TEXT NOT NULL,     -- JSON snapshot
  tracking_number  TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Order lines snapshot names/prices so later catalog edits never rewrite history.
CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id   INTEGER REFERENCES product_variants(id),
  bundle_id    INTEGER REFERENCES bundles(id),
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  unit_price   INTEGER NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0)
);

-- Tracking timeline.
CREATE TABLE IF NOT EXISTS order_events (
  id         INTEGER PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id         INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS newsletter (
  email      TEXT PRIMARY KEY COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
