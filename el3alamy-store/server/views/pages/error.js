'use strict';
const { layout } = require('../layout');
const { html } = require('../html');
const icons = require('../icons');

function render({ status = 404, message, req }) {
  const notFound = status === 404;
  const body = html`
  <section class="container error-page">
    <div class="error-symbols" aria-hidden="true">${icons.triangle({ size: 48 })}${icons.circle({ size: 48 })}${icons.cross({ size: 48 })}${icons.square({ size: 48 })}</div>
    <p class="eyebrow">Error ${status}</p>
    <h1>${notFound ? 'Game over — page not found.' : 'Something went wrong.'}</h1>
    <p class="lead muted">${notFound ? 'The page you are looking for has respawned somewhere else.' : message}</p>
    <p><a class="btn btn-primary" href="/">Back to home</a> <a class="btn btn-ghost" href="/shop">Browse the store</a></p>
  </section>`;
  return layout({ req, title: notFound ? 'Page not found' : 'Error', description: 'Page not found', noindex: true, body: body.toString() });
}

module.exports = { render };
