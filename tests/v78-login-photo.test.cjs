const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

test('login left-side controls are preserved', () => {
  const section = app.slice(app.indexOf('function renderLogin()'), app.indexOf('async function loadBase()'));
  assert.match(section, /id="loginForm"/);
  assert.match(section, /name="username"/);
  assert.match(section, /name="password"/);
  assert.match(section, /<h2>Đăng nhập hệ thống<\/h2>/);
  assert.match(section, /<button class="btn"[^>]*>Đăng nhập<\/button>/);
});
test('right-side panel contains only the supplied fashion photo and no captions', () => {
  const section = app.slice(app.indexOf('function renderLogin()'), app.indexOf('async function loadBase()'));
  assert.match(section, /login-art-panel login-fashion-panel/);
  assert.doesNotMatch(section, /DEZUS STORE OPS|Vận hành cửa hàng|Checklist • Vi phạm|mini-metrics/);
  assert.ok(fs.existsSync(path.join(root, 'public/assets/v78/login-fashion.jpg')));
  assert.match(css, /login-fashion\.jpg/);
});
test('current cache code is set for CSS and JS', () => {
  assert.equal((html.match(/DEZUS_V89_PORTRAIT_LARGER_20261113/g) || []).length, 3);
});
