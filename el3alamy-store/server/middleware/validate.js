'use strict';
const { HttpError } = require('./errors');

// Tiny declarative validator — enough for this API without pulling in a schema library.
// rules: { field: { type: 'string'|'int'|'email'|'array'|'object'|'bool', required, min, max, enum, pattern } }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function check(value, rule, field) {
  if (value === undefined || value === null || value === '') {
    if (rule.required) return `${field} is required`;
    return null;
  }
  switch (rule.type) {
    case 'string':
    case 'email':
      if (typeof value !== 'string') return `${field} must be a string`;
      if (rule.min && value.trim().length < rule.min) return `${field} must be at least ${rule.min} characters`;
      if (value.length > (rule.max || 500)) return `${field} is too long`;
      if (rule.type === 'email' && !EMAIL.test(value)) return `${field} must be a valid email`;
      if (rule.pattern && !rule.pattern.test(value)) return `${field} is invalid`;
      break;
    case 'int':
      if (!Number.isInteger(value)) return `${field} must be an integer`;
      if (rule.min !== undefined && value < rule.min) return `${field} must be ≥ ${rule.min}`;
      if (rule.max !== undefined && value > rule.max) return `${field} must be ≤ ${rule.max}`;
      break;
    case 'bool':
      if (typeof value !== 'boolean') return `${field} must be true or false`;
      break;
    case 'array':
      if (!Array.isArray(value)) return `${field} must be a list`;
      if (rule.max && value.length > rule.max) return `${field} has too many entries`;
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) return `${field} must be an object`;
      break;
  }
  if (rule.enum && !rule.enum.includes(value)) return `${field} must be one of: ${rule.enum.join(', ')}`;
  return null;
}

function validate(rules, source = 'body') {
  return (req, _res, next) => {
    const data = req[source] || {};
    const errors = {};
    for (const [field, rule] of Object.entries(rules)) {
      const err = check(data[field], rule, field);
      if (err) errors[field] = err;
    }
    if (Object.keys(errors).length) return next(new HttpError(422, 'Please check the highlighted fields.', errors));
    next();
  };
}

module.exports = { validate, check };
