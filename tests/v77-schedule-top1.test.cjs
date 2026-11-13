const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
test('schedule is one top-level item in both desktop and mobile menus', () => {
  assert.equal((app.match(/key:'schedule', label:'Lịch làm việc'/g) || []).length, 2);
  assert.equal((app.match(/ids:\['schedule'\]/g) || []).length, 2);
  assert.doesNotMatch(app, /ids:\['tasks','cdp_ojti','checklists','schedule','violations'\]/);
  assert.match(app, /\['schedule', 'Lịch làm việc', '↗', 'schedule'\]/);
  assert.match(app, /if \(id === 'schedule'\) return can\('can_view_schedule'\)/);
});
test('top 1 height is reduced only on desktop screens', () => {
  assert.match(css, /V77: compact Top 1 podium height/);
  assert.match(css, /height:290px!important/);
  assert.match(css, /height:276px!important/);
});
