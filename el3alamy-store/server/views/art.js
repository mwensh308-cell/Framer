'use strict';
// Stylised product renders generated as SVG and tinted per variant colour: /art/:kind/:hex.svg
// Lets the catalog ship with crisp, lightweight imagery until real product photography is uploaded
// (swap product_variants image URLs for CDN photos — see docs/DEPLOYMENT.md).

const KINDS = new Set(['ps5', 'ps5pro', 'ps4', 'ps4pro', 'dualsense', 'edge', 'dualshock', 'headset', 'earbuds', 'vr', 'portal', 'charger', 'discdrive', 'stand', 'covers', 'camera', 'remote']);

function shade(hex, amt) {
  const n = parseInt(hex, 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt), g = clamp(((n >> 8) & 255) + amt), b = clamp((n & 255) + amt);
  return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
const isDark = (hex) => {
  const n = parseInt(hex, 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110;
};

function defs(c) {
  const hi = shade(c, 40), lo = shade(c, -55);
  return `<defs>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#${hi}"/><stop offset=".55" stop-color="#${c}"/><stop offset="1" stop-color="#${lo}"/></linearGradient>
    <linearGradient id="core" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a2e3a"/><stop offset="1" stop-color="#07080c"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a48"/><stop offset="1" stop-color="#05070d"/></linearGradient>
    <radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#1f6fff"/></linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>`;
}

const floor = (cx = 200, cy = 360, rx = 130) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="16" fill="url(#shadow)"/>`;
const buttons = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke-width="2.6" stroke-linecap="round">
    <path d="M0 -17 l6 10 h-12z" stroke="#34c68b"/>
    <circle cx="17" cy="0" r="5.5" stroke="#e0325c"/>
    <path d="M-4 13 l8 8 M4 13 l-8 8" stroke="#5aa0ff"/>
    <rect x="-23" y="-5" width="10" height="10" rx="1" stroke="#e76fb4"/>
  </g>`;
const dpad = (x, y, fill) => `<g transform="translate(${x} ${y})" fill="${fill}"><rect x="-4" y="-17" width="8" height="12" rx="2"/><rect x="-4" y="5" width="8" height="12" rx="2"/><rect x="-17" y="-4" width="12" height="8" rx="2"/><rect x="5" y="-4" width="12" height="8" rx="2"/></g>`;
const stick = (x, y) => `<circle cx="${x}" cy="${y}" r="19" fill="#0b0c11"/><circle cx="${x}" cy="${y}" r="13" fill="#23262f"/><circle cx="${x - 3}" cy="${y - 3}" r="5" fill="#3a3e4a"/>`;

const CONTROLLER_BODY = 'M122 118 C150 100 250 100 278 118 C312 120 338 140 348 176 L368 252 C376 284 352 304 326 294 C305 286 292 260 276 240 L124 240 C108 260 95 286 74 294 C48 304 24 284 32 252 L52 176 C62 140 88 120 122 118 Z';

function controller(c, variant) {
  const dark = isDark(c);
  const core = variant === 'dualshock' ? `url(#body)` : 'url(#core)';
  const btnFill = dark ? '#3a3e4a' : '#1b1d24';
  const lightbar = variant === 'dualshock'
    ? `<rect x="160" y="110" width="80" height="6" rx="3" fill="url(#light)" filter="url(#glow)"/><rect x="160" y="110" width="80" height="6" rx="3" fill="#6cc4ff"/>`
    : `<path d="M162 128 q-6 22 0 44 M238 128 q6 22 0 44" stroke="#6cc4ff" stroke-width="3" fill="none" filter="url(#glow)"/><path d="M162 128 q-6 22 0 44 M238 128 q6 22 0 44" stroke="#bfe6ff" stroke-width="1.5" fill="none"/>`;
  const edgeTrim = variant === 'edge'
    ? `<rect x="163" y="123" width="74" height="54" rx="10" fill="#0b0c11"/><path d="M60 250 q20 -20 40 -8 M340 250 q-20 -20 -40 -8" stroke="#0b0c11" stroke-width="6" fill="none" stroke-linecap="round"/>`
    : `<rect x="163" y="123" width="74" height="54" rx="10" fill="${variant === 'dualshock' ? '#15171d' : 'url(#body)'}" stroke="rgba(0,0,0,.15)"/>`;
  return `
    ${floor(200, 330, 150)}
    <g transform="translate(0 20)">
      <path d="${CONTROLLER_BODY}" fill="url(#body)"/>
      <path d="M140 150 C160 140 240 140 260 150 L270 236 L130 236 Z" fill="${core}" opacity="${variant === 'dualshock' ? 1 : 0.95}"/>
      ${edgeTrim}
      ${lightbar}
      ${dpad(100, 168, btnFill)}
      ${buttons(300, 168)}
      ${stick(160, 214)}${stick(240, 214)}
      <circle cx="200" cy="222" r="7" fill="#0b0c11"/>
      <path d="${CONTROLLER_BODY}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
    </g>`;
}

const WING_L = 'M174 34 C146 36 122 46 108 70 C113 160 123 262 134 336 C140 352 156 360 174 362 Z';
const WING_R = 'M226 34 C254 36 278 46 292 70 C287 160 277 262 266 336 C260 352 244 360 226 362 Z';

function ps5(c, pro) {
  // PS5 Pro: three black bands across the wings.
  const stripes = pro ? [168, 192, 216].map((y) => `<path d="M${112 + (y - 70) * 0.09} ${y} H174 V${y + 11} H${113 + (y - 70) * 0.09} Z M${288 - (y - 70) * 0.09} ${y} H226 V${y + 11} H${287 - (y - 70) * 0.09} Z" fill="#0b0c11"/>`).join('') : '';
  return `
    ${floor(200, 374, 110)}
    <ellipse cx="200" cy="366" rx="62" ry="9" fill="#0b0c11"/>
    <rect x="170" y="28" width="60" height="336" rx="12" fill="url(#core)"/>
    <path d="${WING_L}" fill="url(#body)"/>
    <path d="${WING_R}" fill="url(#body)"/>
    ${stripes}
    <path d="M174 34 C146 36 122 46 108 70" stroke="rgba(255,255,255,.75)" stroke-width="2" fill="none"/>
    <path d="M226 34 C254 36 278 46 292 70" stroke="rgba(0,0,0,.2)" stroke-width="2" fill="none"/>
    <rect x="197" y="44" width="6" height="306" rx="3" fill="url(#light)" filter="url(#glow)" opacity=".9"/>
    <rect x="198.5" y="44" width="3" height="306" rx="1.5" fill="#bfe6ff"/>
`;
}

function ps4(c, pro) {
  const layers = pro ? 3 : 2;
  let g = floor(200, 300, 170);
  for (let i = 0; i < layers; i++) {
    const y = 250 - i * 34;
    g += `<path d="M60 ${y} L300 ${y - 50} L350 ${y - 18} L112 ${y + 34} Z" fill="url(#body)"/>
          <path d="M60 ${y} L112 ${y + 34} L112 ${y + 44} L60 ${y + 10} Z M112 ${y + 34} L350 ${y - 18} L350 ${y - 8} L112 ${y + 44} Z" fill="#0b0c11"/>`;
  }
  g += `<path d="M106 ${250 - (layers - 1) * 34 + 26} L344 ${250 - (layers - 1) * 34 - 24}" stroke="url(#light)" stroke-width="2.5" filter="url(#glow)"/>`;
  return g;
}

function headset(c) {
  return `${floor(200, 350, 120)}
    <path d="M92 220 C88 110 312 110 308 220" stroke="url(#body)" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M110 205 C112 140 288 140 290 205" stroke="#0b0c11" stroke-width="10" fill="none" stroke-linecap="round"/>
    <rect x="62" y="200" width="70" height="120" rx="34" fill="url(#body)"/>
    <rect x="268" y="200" width="70" height="120" rx="34" fill="url(#body)"/>
    <rect x="118" y="212" width="22" height="96" rx="11" fill="#0b0c11"/>
    <rect x="260" y="212" width="22" height="96" rx="11" fill="#0b0c11"/>
    <circle cx="97" cy="260" r="16" fill="none" stroke="url(#light)" stroke-width="3" filter="url(#glow)"/>
    <circle cx="303" cy="260" r="16" fill="none" stroke="url(#light)" stroke-width="3" filter="url(#glow)"/>`;
}

function earbuds(c) {
  return `${floor(200, 340, 120)}
    <rect x="110" y="200" width="180" height="110" rx="50" fill="url(#body)"/>
    <path d="M110 245 H290" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <circle cx="200" cy="285" r="4" fill="#6cc4ff" filter="url(#glow)"/>
    <g transform="translate(140 120) rotate(-15)"><ellipse rx="34" ry="30" fill="url(#body)"/><ellipse cx="6" cy="4" rx="16" ry="14" fill="#0b0c11"/></g>
    <g transform="translate(260 120) rotate(15)"><ellipse rx="34" ry="30" fill="url(#body)"/><ellipse cx="-6" cy="4" rx="16" ry="14" fill="#0b0c11"/></g>`;
}

function vr(c) {
  return `${floor(200, 340, 140)}
    <path d="M80 180 C80 110 320 110 320 180" stroke="url(#body)" stroke-width="18" fill="none"/>
    <ellipse cx="200" cy="130" rx="60" ry="18" fill="url(#body)"/>
    <path d="M70 200 C70 160 110 150 200 150 C290 150 330 160 330 200 L320 268 C316 292 290 300 200 300 C110 300 84 292 80 268 Z" fill="url(#body)"/>
    <path d="M92 210 C92 184 126 176 200 176 C274 176 308 184 308 210 L300 262 C296 278 270 282 200 282 C130 282 104 278 100 262 Z" fill="url(#glass)"/>
    <path d="M110 200 C150 188 250 188 290 200" stroke="rgba(143,211,255,.5)" stroke-width="3" fill="none"/>
    ${buttons(200, 238, 0.7)}`;
}

function portal(c) {
  return `${floor(200, 330, 180)}
    <path d="M20 170 C30 130 70 125 96 135 L96 265 C70 282 34 290 22 262 C12 236 14 200 20 170 Z" fill="url(#body)"/>
    <path d="M380 170 C370 130 330 125 304 135 L304 265 C330 282 366 290 378 262 C388 236 386 200 380 170 Z" fill="url(#body)"/>
    <rect x="88" y="118" width="224" height="160" rx="16" fill="url(#core)"/>
    <rect x="98" y="128" width="204" height="140" rx="8" fill="url(#glass)"/>
    <path d="M120 240 L170 170 L205 215 L230 190 L280 240 Z" fill="#1f6fff" opacity=".5"/>
    <circle cx="255" cy="165" r="12" fill="#8fd3ff" opacity=".7"/>
    ${dpad(52, 180, '#1b1d24')}
    ${buttons(348, 180, 0.8)}
    ${stick(62, 236)}${stick(338, 236)}`;
}

function charger(c) {
  const mini = (x) => `<g transform="translate(${x} 150) scale(.42)">
      <path d="${CONTROLLER_BODY}" fill="url(#body)" transform="rotate(90 200 200)"/></g>`;
  return `${floor(200, 340, 150)}
    ${mini(40)}${mini(200)}
    <rect x="70" y="260" width="260" height="70" rx="24" fill="url(#body)"/>
    <rect x="70" y="300" width="260" height="30" rx="14" fill="#0b0c11"/>
    <rect x="120" y="268" width="50" height="6" rx="3" fill="url(#light)" filter="url(#glow)"/>
    <rect x="230" y="268" width="50" height="6" rx="3" fill="url(#light)" filter="url(#glow)"/>`;
}

function discdrive(c) {
  return `${floor(200, 330, 140)}
    <path d="M80 140 C80 120 100 110 130 110 L300 110 C320 110 330 124 330 144 L330 300 L80 300 Z" fill="url(#body)"/>
    <rect x="80" y="286" width="250" height="16" fill="#0b0c11"/>
    <circle cx="205" cy="200" r="70" fill="none" stroke="rgba(0,0,0,.15)" stroke-width="2"/>
    <circle cx="205" cy="200" r="66" fill="none" stroke="url(#light)" stroke-width="2" opacity=".6"/>
    <circle cx="205" cy="200" r="14" fill="#0b0c11"/>
    <rect x="96" y="130" width="120" height="5" rx="2.5" fill="#0b0c11"/>`;
}

function stand(c) {
  return `${floor(200, 340, 130)}
    <ellipse cx="200" cy="320" rx="110" ry="22" fill="url(#body)"/>
    <ellipse cx="200" cy="314" rx="110" ry="22" fill="url(#body)" opacity=".9"/>
    <ellipse cx="200" cy="312" rx="80" ry="14" fill="rgba(0,0,0,.15)"/>
    <rect x="186" y="220" width="28" height="92" rx="6" fill="url(#body)"/>
    <rect x="176" y="210" width="48" height="16" rx="6" fill="#0b0c11"/>`;
}

function covers(c) {
  return `${floor(200, 360, 140)}
    <g transform="translate(-36 0) rotate(-6 200 200)"><path d="${WING_L}" fill="url(#body)"/></g>
    <g transform="translate(36 0) rotate(6 200 200)"><path d="${WING_R}" fill="url(#body)"/></g>
    <path d="M200 70 V330" stroke="url(#light)" stroke-width="2" stroke-dasharray="6 10" opacity=".5"/>`;
}

function camera(c) {
  return `${floor(200, 300, 150)}
    <rect x="70" y="170" width="260" height="70" rx="35" fill="url(#body)"/>
    <circle cx="140" cy="205" r="24" fill="url(#glass)"/><circle cx="260" cy="205" r="24" fill="url(#glass)"/>
    <circle cx="140" cy="205" r="10" fill="#1f6fff" opacity=".7"/><circle cx="260" cy="205" r="10" fill="#1f6fff" opacity=".7"/>
    <rect x="185" y="198" width="30" height="14" rx="7" fill="#0b0c11"/>
    <path d="M150 240 L130 290 H270 L250 240" fill="#0b0c11" opacity=".9"/>`;
}

function remote(c) {
  return `${floor(200, 360, 70)}
    <rect x="160" y="50" width="80" height="300" rx="36" fill="url(#body)"/>
    <circle cx="200" cy="110" r="26" fill="#0b0c11"/><circle cx="200" cy="110" r="10" fill="url(#body)"/>
    ${[160, 190, 220, 250].map((y) => `<circle cx="184" cy="${y}" r="7" fill="#0b0c11"/><circle cx="216" cy="${y}" r="7" fill="#0b0c11"/>`).join('')}
    <rect x="182" y="290" width="36" height="12" rx="6" fill="url(#light)"/>`;
}

function render(kind, hex) {
  const c = /^[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : 'f2f4f8';
  const k = KINDS.has(kind) ? kind : 'dualsense';
  const draw = {
    ps5: () => ps5(c, false), ps5pro: () => ps5(c, true), ps4: () => ps4(c, false), ps4pro: () => ps4(c, true),
    dualsense: () => controller(c, 'dualsense'), edge: () => controller(c, 'edge'), dualshock: () => controller(c, 'dualshock'),
    headset: () => headset(c), earbuds: () => earbuds(c), vr: () => vr(c), portal: () => portal(c), charger: () => charger(c),
    discdrive: () => discdrive(c), stand: () => stand(c), covers: () => covers(c), camera: () => camera(c), remote: () => remote(c),
  }[k];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${defs(c)}${draw()}</svg>`;
}

module.exports = { render, KINDS };
