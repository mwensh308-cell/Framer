'use strict';
// Tagged-template HTML with automatic escaping. Interpolated values are escaped unless wrapped in raw()
// or produced by another html`` call. Arrays are joined, null/undefined/false render as nothing.
const config = require('../config');

class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function render(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof SafeHtml) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return escape(v);
}

function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return new SafeHtml(out);
}

const raw = (s) => new SafeHtml(String(s));

/** JSON safe to embed inside <script type="application/json|ld+json">. */
const jsonScript = (obj) => raw(JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026'));

function money(minor, currency = config.currency) {
  const major = minor / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, currencyDisplay: 'code',
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2, maximumFractionDigits: 2,
  }).format(major).replace(/\u00a0/g, ' ');
}

const stars = (avg) => {
  const full = Math.round(avg);
  return raw(`<span class="stars" aria-label="${avg} out of 5 stars">${'★'.repeat(full)}<span class="stars-off">${'★'.repeat(5 - full)}</span></span>`);
};

module.exports = { html, raw, escape, jsonScript, money, stars, SafeHtml };
