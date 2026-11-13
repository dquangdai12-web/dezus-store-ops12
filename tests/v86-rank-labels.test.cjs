const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');

test('V86: top badges use slim wordmark-inspired styling and narrower pill dimensions', () => {
  const v86 = css.slice(css.indexOf('/* V86 — slim DEZUS-inspired rank badges'));
  assert.ok(v86.length > 1000);
  assert.match(v86, /font-family:[^;]*Century Gothic/);
  assert.match(v86, /font-weight: 400 !important/);
  assert.match(v86, /letter-spacing: \.13em !important/);
  assert.match(v86, /height: 30px !important/);
  assert.match(v86, /height: 32px !important/);
  assert.match(v86, /border: 1px solid rgba/);
});

test('V86: top 1, 2 and 3 keep their correct original image icons', () => {
  for (const rank of [1, 2, 3]) {
    assert.match(app, new RegExp('top' + rank + '-rank\\.png'));
    assert.ok(fs.existsSync(path.join(root, 'public/assets', `top${rank}-rank.png`)));
  }
});
