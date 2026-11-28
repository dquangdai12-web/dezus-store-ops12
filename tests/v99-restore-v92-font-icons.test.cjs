const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

test('V99 restores original V92 icon assets to desktop menus and phone choices', () => {
  assert.match(app, /dezusNavPicture\(DEZUS_MENU_ICON_GROUP\[group\.key\]\) \|\| group\.icon/);
  assert.match(app, /dezusNavPicture\(DEZUS_MENU_ICON_CHILD\[id\]\)/);
  assert.match(app, /icon:dezusNavPicture\('\/assets\/v76\/icon-tong-quan\.png'\)/);
  assert.match(app, /dashboard:dezusNavPicture\('\/assets\/v76\/icon-tong-quan\.png'\)/);
  assert.doesNotMatch(app, /v96-child-icon">\$\{mobileIconFor\(id\)\}/);
  const groupIcons = [...app.matchAll(/['"](\/assets\/v(?:47|76)\/[^'"\s]+\.png)['"]/g)].map(m=>m[1]);
  assert.ok(groupIcons.length > 15, 'Expected original navigation assets');
  for (const uri of groupIcons) assert.ok(fs.existsSync(path.join(root, 'public', uri)), `Missing ${uri}`);
});

test('V99 restores V92 Inter font and removes desktop V96 theme overrides; keeps V98 mobile', () => {
  assert.ok(css.startsWith('@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap");\n'));
  assert.doesNotMatch(css.slice(css.indexOf('/* V99:')), /\.sidebar \.v96-child-icon\s*\{/);
  assert.doesNotMatch(css.slice(css.indexOf('/* V99:')), /\.sidebar \.nav-group-btn\s*\{/);
  assert.match(css, /V98 — mobile content layout audit/);
  assert.match(css, /@media\s*\(max-width:860px\)/);
  assert.match(html, /V99_RESTORE_V92_DESKTOP_FONT_ICONS/);
});
