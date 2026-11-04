const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
test('new shift creation opens schedule editing and updates visible codes', () => {
  assert.match(app, /state\.scheduleEditMode = true;\s*toast\(`Đã thêm ca/);
  assert.match(app, /datalist id="scheduleShiftCodes"/);
  assert.match(app, /list="scheduleShiftCodes"/);
  assert.match(html, /dezus-schedule-new-shifts-V9/);
});
test('schedule bulk save reports ignored entries rather than silent success', () => {
  const start = server.indexOf("app.post('/api/schedules/bulk'");
  const end = server.indexOf("app.get('/api/orders'", start);
  const block = server.slice(start, end);
  assert.match(block, /rejected\.push/);
  assert.match(block, /res\.json\(\{ ok: rejected\.length === 0, count, rejected/);
  assert.match(app, /const rejected = results\.flatMap/);
});
