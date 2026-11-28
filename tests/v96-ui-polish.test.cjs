const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

test('V96 uses matching vector symbols for desktop groups, child routes and phone navigation', () => {
  assert.match(app, /const attrs = 'class="app-ui-icon"/);
  for (const symbol of ['home','tasks','calendar','revenue','product','report','trend','heart','sparkle','package','settings']) {
    assert.ok(app.includes(`${symbol}: `) || app.includes(`${symbol}:<`), `Missing icon ${symbol}`);
  }
  assert.match(app, /<b>\$\{group\.icon\}<\/b>/);
  assert.match(app, /v96-child-icon">\$\{mobileIconFor\(id\)\}/);
  assert.match(app, /data-group="\$\{group\.key\}"/);
  assert.match(app, /data-route="\$\{id\}"/);
});

test('V96 refines touch targets and navigation focus without remote render-blocking font', () => {
  assert.match(css, /V96: DEZUS visual refinement/);
  assert.match(css, /\.v94-menu-item\s*\{[\s\S]*?min-height:64px!important/);
  assert.match(css, /\.mobile-bottom-nav \.mobile-tab\.active/);
  assert.match(css, /\.sidebar \.nav-group-btn:focus-visible/);
  assert.doesNotMatch(css, /@import url\("https:\/\/fonts\.googleapis\.com/);
  assert.match(html, /V96_UI_POLISH_20261128/);
});
