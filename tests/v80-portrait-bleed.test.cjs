const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');
test('Top podium portrait extends beyond upper card edge without overlapping neighboring cards', () => {
  assert.match(css, /V80 — Chân dung tràn viền thẻ Top/);
  assert.match(css, /overflow: visible !important; \/\* model's hair can rise past the rounded card \*\//);
  assert.match(css, /clip-path: inset\(-72px 0 0 -190px\) !important/);
  assert.match(css, /height: 117% !important/);
});
