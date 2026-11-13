const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
test('V82: single line name and store and adaptive font sizing', () => {
  assert.match(css, /V82 — podium portrait nudge and single-line labels/);
  assert.match(css, /\.dz72-name\s*\{[^}]*white-space:\s*nowrap\s*!important/s);
  assert.match(css, /\.dz72-store\s*\{[^}]*white-space:\s*nowrap\s*!important/s);
  assert.match(app, /function fitPodiumTextToOneLine\(\)/);
  assert.match(app, /fitPodiumTextToOneLine\(\);\n  \$\('#toggleOverviewRevenueBtn'\)/);
});
test('V82: shift portraits to the left and retain badge icons', () => {
  assert.match(css, /\.dz72-person:not\(\.dz72-no-photo\) img\s*\{\s*right:\s*-20px\s*!important/s);
  for (const rank of [1, 2, 3]) {
    assert.match(app, new RegExp('top' + rank + '-rank\\.png'));
    assert.ok(fs.existsSync(path.join(root, 'public/assets', `top${rank}-rank.png`)));
  }
});
