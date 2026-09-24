'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const orders = require('../../services/orders');
const payments = require('../../services/payments');
const { validate, check } = require('../../middleware/validate');
const { HttpError, asyncHandler } = require('../../middleware/errors');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();
const checkoutLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

const ADDRESS_RULES = {
  fullName: { type: 'string', required: true, min: 2, max: 100 },
  phone: { type: 'string', required: true, pattern: /^\+?[0-9\s-]{7,20}$/ },
  line1: { type: 'string', required: true, min: 3, max: 200 },
  line2: { type: 'string', max: 200 },
  city: { type: 'string', required: true, min: 2, max: 80 },
  region: { type: 'string', max: 80 },
  postalCode: { type: 'string', max: 20 },
  country: { type: 'string', required: true, min: 2, max: 60 },
};

router.post('/', checkoutLimiter, validate({
  email: { type: 'email', required: true, max: 160 },
  paymentMethod: { type: 'string', required: true, enum: ['card', 'cod'] },
  cart: { type: 'object', required: true },
  address: { type: 'object', required: true },
}), asyncHandler(async (req, res) => {
  const errors = {};
  const address = {};
  for (const [field, rule] of Object.entries(ADDRESS_RULES)) {
    const err = check(req.body.address[field], rule, field);
    if (err) errors[`address.${field}`] = err;
    else if (req.body.address[field]) address[field] = String(req.body.address[field]).trim();
  }
  if (Object.keys(errors).length) throw new HttpError(422, 'Please check your shipping details.', errors);
  if (req.body.paymentMethod === 'card' && !payments.cardAvailable()) {
    throw new HttpError(422, 'Card payments are not available right now.');
  }

  const order = orders.create({
    cart: req.body.cart,
    email: req.body.email.trim(),
    address,
    paymentMethod: req.body.paymentMethod,
    userId: req.user?.id,
  });
  const next = await payments.startPayment(order);
  res.status(201).json({ order: { number: order.number, total: order.total, status: order.status }, ...next });
}));

router.get('/mine', requireAuth, (req, res) => res.json({ orders: orders.listForUser(req.user.id) }));

// Tracking: order number + email (guests) or signed-in owner.
router.post('/track', rateLimit({ windowMs: 10 * 60 * 1000, limit: 40 }), validate({
  number: { type: 'string', required: true, max: 40 },
  email: { type: 'email', required: true },
}), (req, res) => {
  const order = orders.findByNumber(req.body.number.trim().toUpperCase());
  if (!order || order.email.toLowerCase() !== req.body.email.trim().toLowerCase()) {
    throw new HttpError(404, 'We could not find an order with those details.');
  }
  res.json({ order: publicOrder(order) });
});

router.get('/:number', requireAuth, (req, res) => {
  const order = orders.findByNumber(req.params.number);
  if (!order || (order.user_id !== req.user.id && req.user.role !== 'admin')) throw new HttpError(404, 'Order not found');
  res.json({ order: publicOrder(order) });
});

function publicOrder(o) {
  const { user_id, payment_ref, ...rest } = o;
  return rest;
}

module.exports = router;
module.exports.publicOrder = publicOrder;
