const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const server = fs.readFileSync(require('node:path').join(__dirname, '../server.js'), 'utf8');
const app = fs.readFileSync(require('node:path').join(__dirname, '../public/app.js'), 'utf8');
test('new daily briefing is admin/office only at API and navigation', () => {
  assert.match(server, /app\.get\('\/api\/store-daily-summary', requireAuth/);
  assert.match(server, /if \(!isAllStoreRole\(req\.user\)\) return res\.status\(403\)/);
  assert.match(app, /id === 'store_daily_summary'\) return state\.user\?\.role === 'admin' \|\| state\.user\?\.role === 'office'/);
});
test('daily summary reads existing sales, reports, targets and situation', () => {
  const part = server.split("app.get('/api/store-daily-summary'")[1].split("app.get('/api/daily-report'")[0];
  for (const text of ['dailyReportRow(', 'db.sales || []', 'db.sales_store_days || []', 'storeDailyTarget(', 'store_situation_morning', 'store_situation_evening', 'reported_stores']) assert.ok(part.includes(text), text);
});
