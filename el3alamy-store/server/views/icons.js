'use strict';
const { raw } = require('./html');

const svg = (body, { size = 20, fill = 'none', stroke = 'currentColor', vb = '0 0 24 24', cls = '' } = {}) =>
  raw(`<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="${vb}" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`);

module.exports = {
  cart: (o) => svg('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.2"/><circle cx="17.5" cy="20.5" r="1.2"/>', o),
  search: (o) => svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', o),
  user: (o) => svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', o),
  close: (o) => svg('<path d="M6 6l12 12M18 6 6 18"/>', o),
  menu: (o) => svg('<path d="M4 7h16M4 12h16M4 17h10"/>', o),
  arrow: (o) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', o),
  check: (o) => svg('<path d="m5 12 5 5 9-10"/>', o),
  truck: (o) => svg('<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>', o),
  shield: (o) => svg('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>', o),
  bolt: (o) => svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', o),
  chat: (o) => svg('<path d="M4 5h16v11H8l-4 4z"/>', o),
  instagram: (o) => svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/>', o),
  facebook: (o) => svg('<path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8.9v3h2.6V21z" fill="currentColor" stroke="none"/>', o),
  tiktok: (o) => svg('<path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3a7 7 0 0 1-3.9-1.2v6.2A5.8 5.8 0 1 1 10.8 9v3.1a2.8 2.8 0 1 0 2.4 2.8V3z" fill="currentColor" stroke="none"/>', o),
  // PlayStation face-button glyphs, used decoratively.
  cross: (o) => svg('<path d="M6 6l12 12M18 6 6 18"/>', o),
  circle: (o) => svg('<circle cx="12" cy="12" r="7.5"/>', o),
  square: (o) => svg('<rect x="5" y="5" width="14" height="14" rx="1"/>', o),
  triangle: (o) => svg('<path d="M12 4.5 20 18.5H4z"/>', o),
};
