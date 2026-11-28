const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const root=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');

test('V98 restores wrapping of card headings and section action groups on narrow phones',()=>{
  const v98=css.slice(css.indexOf('/* V98 — mobile content layout audit'));
  assert.ok(v98.length>4000);
  assert.match(v98,/\.main \.card \.toolbar > h3/);
  assert.match(v98,/white-space:normal!important/);
  assert.match(v98,/\.main \.card \.section-title/);
  assert.match(v98,/\.main \.card \.toolbar > :is\(button,\.btn\)/);
});

test('V98 makes seven schedule days fit and keeps all data in report tables',()=>{
  const v98=css.slice(css.indexOf('/* V98 — mobile content layout audit'));
  assert.match(v98,/grid-template-columns:repeat\(7,minmax\(0,1fr\)\)!important/);
  assert.match(v98,/\.main table\.v97-mobile-cards tbody td/);
  assert.match(v98,/\.main \.v97-wide-table-wrap/);
  assert.doesNotMatch(v98,/\.schedule-table th:nth-child/);
});

test('V98 cache-bust tag and gzip CSS correspond to deployed source',()=>{
  assert.match(html,/V98_LAYOUT_FIX_20261128/);
  const gz=fs.readFileSync(path.join(root,'public/style.css.gz'));
  assert.equal(zlib.gunzipSync(gz).toString(),css);
});
