const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('Zalo employee sales use separate vertical lines', () => {
  const code = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const start = code.indexOf('function dailyReportZaloText(payload)');
  const end = code.indexOf('// V10: Read-only', start);
  const block = code.slice(start, end);
  assert.match(block, /lines\.push\(`- \$\{u\.full_name\}`\)/);
  assert.match(block, /lines\.push\(`  Doanh thu: /);
  assert.match(block, /lines\.push\(`  Bill: /);
  assert.match(block, /lines\.push\(`  Món: /);
});
test('Daily report preview restores employee rows from V9 (one employee per row)', () => {
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  const style = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
  const preview = app.split('function dailyReportOverviewBox(data = {}) {')[1].split('async function renderDailyReport()')[0];
  assert.match(preview, /sales\.map\(r => `<div class="daily-overview-row">/);
  assert.match(preview, /<b>\$\{esc\(r\.full_name \|\| ''\)\}<\/b>/);
  assert.match(preview, /Bill \$\{money\(r\.bill_count \|\| 0\)\} • Món/);
  assert.doesNotMatch(preview, /daily-report-employee-item|daily-employee-vertical/);
  assert.match(style, /#dailyReportSummaryBox \.daily-overview-row\{/);
});
