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
test('Zalo report preview renders one vertical card per employee', () => {
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  const style = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
  assert.match(app, /daily-overview-row daily-employee-vertical/);
  assert.match(style, /#dailyReportSummaryBox \.daily-employee-vertical\{/);
});
