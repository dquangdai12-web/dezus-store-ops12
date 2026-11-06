const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
test('daily summary keeps original V9 navigation groups and remains accessible from Revenue',()=>{
  assert.match(app,/\['store_daily_summary', 'Tổng hợp báo cáo ngày', 'TH', 'revenue'\]/);
  assert.doesNotMatch(app,/key:'daily_overview', label:'Tổng hợp báo cáo ngày'/);
  assert.equal((app.match(/ids:\['sales','daily_report','store_daily_summary','weekly_report'/g)||[]).length,2);
});
test('daily KPI dashboard shows revenue, targets, bills, UPT, ATV and reporting status',()=>{
  const section=app.split('async function renderStoreDailySummary()')[1].split('function dailyReportOverviewBox(')[0];
  for(const label of ['Doanh thu thực đạt','Target ngày','Hoàn thành target','Số bill','Số món','UPT','ATV','Lượt khách','Tình trạng báo cáo']) assert.ok(section.includes(label),label);
});
