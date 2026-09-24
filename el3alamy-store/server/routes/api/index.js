'use strict';
const express = require('express');
const payments = require('../../services/payments');
const config = require('../../config');
const { apiNotFound } = require('../../middleware/errors');

const router = express.Router();

// Stripe webhooks need the raw body for signature verification, so mount before express.json().
router.post('/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
  const raw = req.body.toString('utf8');
  if (!payments.verifyStripeSignature(raw, req.get('stripe-signature'), config.stripe.webhookSecret)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  payments.handleStripeEvent(JSON.parse(raw));
  res.json({ received: true });
});

router.use(express.json({ limit: '100kb' }));

// Only accept JSON for state-changing requests: blocks cross-site form posts (CSRF) in addition to SameSite cookies.
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

router.get('/health', (req, res) => res.json({ ok: true }));
router.get('/config', (req, res) => res.json({
  currency: config.currency, cardPayments: payments.cardAvailable(), stripe: payments.stripeEnabled(),
  freeShippingThreshold: config.freeShippingThreshold, shippingFlat: config.shippingFlat,
}));

router.use('/auth', require('./auth'));
router.use('/', require('./catalog'));
router.use('/orders', require('./orders'));
router.use('/admin', require('./admin'));
router.use(apiNotFound);

module.exports = router;
