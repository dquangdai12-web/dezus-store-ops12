const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync(require('node:path').join(__dirname,'../public/style.css'),'utf8');
test('sidebar scrollbars hidden while mousewheel remains available',()=>{
  const rules=css.split('/* V22: Remove visible scrollbar tracks from sidebar')[1];
  assert.ok(rules);
  assert.match(rules,/scrollbar-width:none!important/);
  assert.match(rules,/overflow-y:auto!important/);
  assert.match(rules,/sidebar::-webkit-scrollbar\{display:none!important/);
  assert.match(rules,/side-nav::-webkit-scrollbar\{display:none!important/);
});
