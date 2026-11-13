const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
test('V87 target icon uses the uploaded PNG in podium goal label', () => {
  assert.ok(fs.existsSync(path.join(root,'public/assets/target-achievement-v87.png')));
  assert.match(app, /class="dz87-goal-icon" src="\/assets\/target-achievement-v87\.png"/);
  assert.match(css, /\.dz87-goal-icon/);
});
test('V87 top labels keep refined typography with slightly stronger weight', () => {
  assert.match(css, /V87: TOP labels subtly stronger/);
  assert.match(css, /font-weight: 500 !important;/);
});
