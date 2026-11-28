const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

test('V94 phone navigation uses five pinned actions and a full accessible category sheet', () => {
  const shell = js.slice(js.indexOf('function shell('), js.indexOf('function logout()'));
  assert.match(shell, /const pinnedKeys = \['overview', 'work', 'schedule', 'revenue'\]/);
  assert.match(shell, /const moreTab = \{key:'all'/);
  assert.match(shell, /role="dialog" aria-modal="true"/);
  assert.match(shell, /const openMobileMenu = key =>/);
  assert.match(shell, /if \(key === 'all'\) \{openMobileMenu\('all'\); return;\}/);
  assert.match(shell, /\$\$\('\[data-route\]', app\)\.forEach/);
  assert.match(shell, /closeMobileMenu\(\); openRoute\(btn\.dataset\.route\)/);
  assert.match(shell, /menuSheet\?\.addEventListener\('keydown'/);
});

test('V94 bottom navigation is a fixed non-scrolling row with 44px-plus targets', () => {
  assert.match(css, /grid-template-columns:repeat\(var\(--v94-mobile-tab-count,5\),minmax\(0,1fr\)\)!important/);
  assert.match(css, /height:64px!important;min-height:64px!important;max-height:64px!important/);
  assert.match(css, /\.mobile-subnav\.mobile-menu-list \{display:none!important;\}/);
  assert.match(css, /touch-action:manipulation!important/);
});

test('mobile loading is nonblocking and iPhone inputs do not trigger zoom', () => {
  assert.match(js, /mobile-route-progress/);
  assert.match(css, /\.mobile-route-progress\s*\{[^}]*pointer-events: none/s);
  assert.match(css, /\.main input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)/);
  assert.match(css, /\.login-form-panel input \{ font-size: 16px !important/);
  assert.match(index, /DEZUS_V91_OPTIMIZED_20261119_V93_MOBILE_TOUCH_20261128/);
});

test('independent bootstrap requests run concurrently instead of serially', () => {
  const chunk = js.slice(js.indexOf('async function loadBase()'), js.indexOf('async function start()'));
  assert.match(chunk, /await Promise\.all\(/);
  assert.match(chunk, /api\('\/api\/bootstrap'\)/);
  assert.match(chunk, /api\('\/api\/checklist\/templates'\)/);
});

test('route changes abort stale GET reads but never cancel saves', () => {
  assert.match(js, /let routeReadController = null/);
  assert.match(js, /routeReadController\.abort\(\)/);
  assert.match(js, /const read = !opts\.method \|\| String\(opts\.method\)\.toUpperCase\(\) === 'GET'/);
  assert.match(js, /read \? routeReadController\?\.signal : undefined/);
  assert.match(js, /if \(err\?\.name === 'AbortError'\) return/);
});
