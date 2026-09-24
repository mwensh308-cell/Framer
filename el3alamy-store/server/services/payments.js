'use strict';
// Payment provider abstraction.
//  - cod:   cash on delivery (no online step).
//  - card:  Stripe Checkout when STRIPE_SECRET_KEY is set; otherwise a dev-only mock that marks the order paid.
// Stripe is called over its REST API with fetch, so no SDK dependency is needed.
const crypto = require('node:crypto');
const config = require('../config');
const orders = require('./orders');
const { HttpError } = require('../middleware/errors');

const stripeEnabled = () => Boolean(config.stripe.secretKey);
const cardAvailable = () => stripeEnabled() || !config.isProd;

// Stripe expects amounts in the smallest currency unit, which is what we store.
async function createStripeSession(order) {
  const body = new URLSearchParams({
    mode: 'payment',
    'payment_method_types[0]': 'card',
    client_reference_id: order.number,
    customer_email: order.email,
    'metadata[order_number]': order.number,
    success_url: `${config.siteUrl}/order/${order.number}?paid=1`,
    cancel_url: `${config.siteUrl}/checkout?cancelled=${order.number}`,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': order.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(order.total),
    'line_items[0][price_data][product_data][name]': `${config.store.name} order ${order.number}`,
  });
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.stripe.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `checkout-${order.number}`,
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) {
    console.error('Stripe error', json);
    throw new HttpError(502, 'Card payments are temporarily unavailable. Please try cash on delivery.');
  }
  return json.url;
}

/** Returns where the browser should go next after the order is created. */
async function startPayment(order) {
  if (order.payment_method === 'cod') return { redirect: `/order/${order.number}` };
  if (stripeEnabled()) return { redirect: await createStripeSession(order) };
  if (config.isProd) throw new HttpError(503, 'Card payments are not configured.');
  orders.transition(order.number, 'paid', { note: 'Paid (development mock payment).', paymentRef: `mock_${Date.now()}` });
  return { redirect: `/order/${order.number}?paid=1` };
}

/** Verifies a Stripe webhook signature (t=...,v1=...) against the raw body. */
function verifyStripeSignature(rawBody, header, secret, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  const signed = `${parts.t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  const given = header.split(',').filter((kv) => kv.startsWith('v1=')).map((kv) => kv.slice(3));
  const fresh = Math.abs(Date.now() / 1000 - Number(parts.t)) <= toleranceSec;
  return fresh && given.some((sig) =>
    sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

function handleStripeEvent(event) {
  if (event.type === 'checkout.session.completed' && event.data?.object?.payment_status === 'paid') {
    const session = event.data.object;
    const number = session.metadata?.order_number || session.client_reference_id;
    const order = orders.findByNumber(number);
    if (!order) return;
    if (order.total !== session.amount_total) {
      console.error(`Amount mismatch for ${number}: expected ${order.total}, got ${session.amount_total}`);
      return;
    }
    orders.transition(number, 'paid', { note: 'Card payment confirmed.', paymentRef: session.payment_intent || session.id });
  }
}

module.exports = { startPayment, verifyStripeSignature, handleStripeEvent, cardAvailable, stripeEnabled };
