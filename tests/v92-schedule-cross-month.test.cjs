const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

const helperStart = client.indexOf('function parseLocalDate(');
const helperEnd = client.indexOf('function timeRange(', helperStart);
assert.ok(helperStart !== -1 && helperEnd > helperStart);
const context = vm.createContext({ Date, String, Number, Array, RegExp });
vm.runInContext(client.slice(helperStart, helperEnd), context);
const monthWeeks = month => JSON.parse(JSON.stringify(vm.runInContext(`scheduleMonthWeeks('${month}')`, context)));

test('November 2026 displays six full Monday–Sunday weeks, including both neighboring months', () => {
  const weeks = monthWeeks('2026-11');
  assert.equal(weeks.length, 6);
  assert.deepEqual(weeks[0].dates, [
    '2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'
  ]);
  assert.deepEqual(weeks[5].dates, [
    '2026-11-30','2026-12-01','2026-12-02','2026-12-03','2026-12-04','2026-12-05','2026-12-06'
  ]);
});

test('shared week is identical when switching between November and December 2026', () => {
  const novemberLast = monthWeeks('2026-11').at(-1);
  const decemberFirst = monthWeeks('2026-12')[0];
  assert.deepEqual(novemberLast, decemberFirst);
  assert.deepEqual(monthWeeks('2026-12').at(-1).dates, [
    '2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'
  ]);
});

test('schedule view renders and allows editing every day, including adjacent months', () => {
  const start = client.indexOf('async function renderSchedule()');
  const end = client.indexOf('function ', start + 'async function renderSchedule()'.length);
  const code = client.slice(start, end > start ? end : undefined);
  assert.match(code, /weekDatas = await Promise\.all\(weeks\.map/);
  assert.match(code, /week\.dates\.map\(\(day\) =>/);
  assert.doesNotMatch(code, /if\s*\(!day\.startsWith\(month\)\)\s*return/);
  assert.match(code, /outsideMonthClass = day\.startsWith\(month\) \? '' : ' schedule-out-month'/);
  assert.match(code, /schedule-cell\$\{outsideMonthClass\}/);
  assert.match(code, /data-week="\$\{week\.week_start\}"/);
  assert.match(code, /data-date="\$\{day\}"/);
  assert.match(code, /\$\{weekLabel\(d\)\}/);
  assert.match(code, /\$\{dOnly\(week\.dates\[0\]\)\} – \$\{dOnly\(week\.dates\[6\]\)\}/);
  assert.match(code, /api\('\/api\/schedules\/bulk'/);
  assert.match(css, /td\.schedule-out-month:not\(\.schedule-not-eligible\)/);
  assert.match(css, /th\.schedule-out-month \.hint/);
});

test('schedule API already retrieves and saves all seven days of the week, including cross-month entries', () => {
  const getApi = server.slice(server.indexOf("app.get('/api/schedules'"), server.indexOf("app.post('/api/schedules/bulk'"));
  const saveApi = server.slice(server.indexOf("app.post('/api/schedules/bulk'"), server.indexOf("app.get('/api/orders'"));
  assert.match(getApi, /const dates = scheduleWeekDates\(week_start\)/);
  assert.match(saveApi, /const dates = scheduleWeekDates\(wk\)/);
  assert.match(saveApi, /if \(!dates\.includes\(workDate\)\)/);
  assert.doesNotMatch(saveApi, /workDate\.startsWith\(.*month/);
});
