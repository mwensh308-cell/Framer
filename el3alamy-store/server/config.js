'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Minimal .env loader (avoids an extra dependency). Real env vars always win.
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*([^#]*?)\s*(#.*)?$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

const jwtSecret = process.env.JWT_SECRET || (isProd ? null : 'dev-only-insecure-secret');
if (!jwtSecret || (isProd && jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
}

module.exports = {
  env,
  isProd,
  port: Number(process.env.PORT) || 3000,
  siteUrl: (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  jwtSecret,
  dbFile: process.env.DB_FILE || path.join(__dirname, '..', 'data', 'store.db'),
  currency: process.env.STORE_CURRENCY || 'EGP',
  shippingFlat: Number(process.env.SHIPPING_FLAT ?? 15000),
  freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD ?? 500000),
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@el3alamy.store',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe!2026',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  store: {
    name: 'El3alamy Store',
    shortName: 'El3alamy',
    tagline: 'Premium PlayStation consoles & accessories',
    owner: 'Mostafa Ahmed Elalamy',
    email: 'hello@el3alamy.store',
    social: {
      instagram: 'https://www.instagram.com/mostafael.alamy',
      facebook: 'https://www.facebook.com/mostafa.elalamy.9465',
      tiktok: 'https://www.tiktok.com/@mostafaahmedelalamy',
    },
  },
};
