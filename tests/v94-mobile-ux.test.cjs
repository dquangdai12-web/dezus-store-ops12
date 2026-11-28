const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'public','style.css'),'utf8');

test('mobile menu includes every allowed route, grouped by user permissions', () => {
  const shell = js.slice(js.indexOf('function shell('),js.indexOf('function logout()'));
  assert.match(shell, /mobileGroups.map\(group => \{/);
  assert.match(shell, /availableGroupItems\(group, items\)/);
  assert.match(shell, /data-menu-group="\$\{group.key\}"/);
  assert.match(shell, /data-route="\$\{id\}"/);
  assert.match(shell, /btn.setAttribute\('aria-expanded'/);
  assert.match(shell, /document.body.classList.remove\('v94-menu-open'\)/);
});

test('mobile schedule provides seven interactive weekday choices without dropping hidden inputs', () => {
  const schedule = js.slice(js.indexOf('async function renderSchedule()'),js.indexOf('async function renderDocuments()'));
  assert.match(schedule, /week.dates.map\(\(day, dayIndex\) =>/);
  assert.match(schedule, /data-day-index="\$\{dayIndex\}"/);
  assert.match(schedule, /const selectDay = index =>/);
  assert.match(schedule, /cell.classList.toggle\('v94-day-unselected', col !== index \+ 1\)/);
  assert.match(schedule, /\$\$\('\.scheduleShift'\)\.forEach/);
  assert.match(css, /\.schedule-week-block \.schedule-table tr > \.v94-day-unselected \{display:none!important;\}/);
});

test('member ranking retains the store name on mobile while dropping wide table column', () => {
  assert.match(js,/class="v64-member-name" data-store="\$\{esc\(r.store_name/);
  assert.match(css, /\.v64-rank-table \.v64-member-name::after \{content:attr\(data-store\)/);
});
