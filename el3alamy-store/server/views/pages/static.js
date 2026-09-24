'use strict';
const config = require('../../config');
const schema = require('../../seo/schema');
const { layout, SOCIAL } = require('../layout');
const { html, money } = require('../html');
const { breadcrumb, faqList } = require('../components');
const icons = require('../icons');

function about(req) {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'About', url: '/about' }];
  const body = html`
  <section class="page-hero container">
    ${breadcrumb(crumbs)}
    <h1 class="reveal">About ${config.store.name}</h1>
  </section>
  <section class="container section-tight about">
    <div class="about-visual reveal"><img src="/img/logo.jpg" alt="${config.store.owner}" width="480" height="480"></div>
    <div class="about-copy reveal">
      <p class="lead">${config.store.name} was founded by ${config.store.owner} with a simple promise: genuine PlayStation hardware, honest advice and support that picks up the phone.</p>
      <p class="muted">We stock only sealed, official Sony consoles and accessories, test every bundle combination ourselves and share it all — unboxings, setup tours and giveaways — with our community on social media.</p>
      <h2 class="h4">Find us online</h2>
      <div class="social-cards">
        ${SOCIAL.map((s) => html`<a class="social-card social-${s.key}" href="${s.url}" target="_blank" rel="noopener me">${icons[s.key]({ size: 26 })}<span><strong>${s.label}</strong><small>${s.handle}</small></span>${icons.arrow({ size: 18, cls: 'social-card-arrow' })}</a>`)}
      </div>
    </div>
  </section>`;
  return layout({
    req, path: '/about', title: `About ${config.store.name}`,
    description: `${config.store.name} is a PlayStation specialist founded by ${config.store.owner}. Genuine consoles, accessories and real after-sales support.`,
    jsonLd: [schema.breadcrumbs(crumbs)], body: body.toString(),
  });
}

const SUPPORT_FAQ = [
  { q: 'How long does delivery take?', a: 'Orders placed before 3pm ship the same working day. Delivery typically takes 1–2 working days in Cairo and Giza and 2–5 working days elsewhere.' },
  { q: 'How much is shipping?', a: `Shipping is a flat ${money(config.shippingFlat)} and free on orders over ${money(config.freeShippingThreshold)}.` },
  { q: 'Can I pay cash on delivery?', a: 'Yes. Choose “Cash on delivery” at checkout and pay the courier when your order arrives.' },
  { q: 'What is your return policy?', a: 'Unopened items can be returned within 14 days of delivery for a full refund. Opened items are covered by warranty if faulty.' },
  { q: 'How does the warranty work?', a: 'Consoles carry a 12-month local warranty and accessories 6 months. Message us with your order number and we handle the repair or replacement.' },
];

function support(req) {
  const crumbs = [{ name: 'Home', url: '/' }, { name: 'Support', url: '/support' }];
  const body = html`
  <section class="page-hero container">
    ${breadcrumb(crumbs)}
    <h1 class="reveal">Shipping, returns & warranty</h1>
    <p class="lead muted reveal">Everything you need to know after you click “Place order”.</p>
  </section>
  <section class="container section-tight narrow" id="warranty">
    ${faqList(SUPPORT_FAQ)}
    <div class="panel reveal support-contact">
      <h2 class="h4">Still need help?</h2>
      <p class="muted">DM us on social media or email <a href="mailto:${config.store.email}">${config.store.email}</a>. <a href="/track">Track an order</a>.</p>
      <div class="community-links">${SOCIAL.map((s) => html`<a class="btn btn-glass social-btn social-${s.key}" href="${s.url}" target="_blank" rel="noopener me">${icons[s.key]({ size: 18 })} ${s.label}</a>`)}</div>
    </div>
  </section>`;
  return layout({
    req, path: '/support', title: 'Shipping, Returns & Warranty',
    description: `Delivery times, shipping costs, cash on delivery, returns and warranty at ${config.store.name}.`,
    jsonLd: [schema.breadcrumbs(crumbs), schema.faq(SUPPORT_FAQ)], body: body.toString(),
  });
}

module.exports = { about, support };
