const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const enhance = js.slice(js.indexOf('/* V97: Adapt content tables'), js.indexOf('function shell('));

test('V97 converts complete simple report tables to phone cards and retains inputs/actions', () => {
  assert.match(enhance, /table\.classList\.add\('v97-mobile-cards'\)/);
  assert.match(enhance, /cell\.setAttribute\('data-mobile-label'/);
  assert.match(enhance, /rows\.every\(row =>/);
  assert.match(enhance, /cell\.colSpan === 1 && cell\.rowSpan === 1/);
  assert.match(css, /table\.v97-mobile-cards tbody td::before\{content:attr\(data-mobile-label\)/);
  assert.match(css, /table\.v97-mobile-cards :is\(input,textarea,select\)/);
});

test('V97 keeps complex and schedule data instead of hiding columns on phones', () => {
  assert.match(enhance, /table\.schedule-table:not\(\[data-v97-reviewed\]\)/);
  assert.match(enhance, /v97-wide-table-wrap/);
  assert.match(css, /\.v97-table-scroll-hint/);
  assert.match(js, /setupMobileContentEnhancements\(\);\s*\/\/ V93/);
  assert.match(css, /\.main \.v97-wide-table-wrap table\{min-width:max\(680px,100%\)/);
  assert.match(css, /@media \(max-width:860px\)/);
});

test('V97 updates phone form layout, without modifying desktop and refreshes cached assets', () => {
  assert.match(css, /form\.grid\.four/);
  assert.match(css, /\.main \.toolbar > \.field/);
  assert.match(css, /\.main \.export-grid/);
  assert.match(css, /\.main \.daily-target-range-row/);
  assert.match(html, /V97_ALL_MOBILE_CONTENT/);
});
