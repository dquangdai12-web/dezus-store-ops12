const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
test('daily summary is a standalone top-level group for admin and office',()=>{
  assert.match(app,/\['store_daily_summary', 'Tổng hợp báo cáo ngày', 'TH', 'daily_overview'\]/);
  assert.equal((app.match(/key:'daily_overview', label:'Tổng hợp báo cáo ngày'/g)||[]).length,2);
  assert.equal((app.match(/ids:\['sales','daily_report','weekly_report'/g)||[]).length,2);
  assert.match(app,/if \(id === 'store_daily_summary'\) return state\.user\?\.role === 'admin' \|\| state\.user\?\.role === 'office'/);
});
test('daily KPI dashboard shows revenue, targets, bills, UPT, ATV and reporting status',()=>{
  const section=app.split('async function renderStoreDailySummary()')[1].split('function dailyReportOverviewBox(')[0];
  for(const label of ['Doanh thu thực đạt','Target ngày','Hoàn thành target','Số bill','Số món','UPT','ATV','Lượt khách','Tình trạng báo cáo']) assert.ok(section.includes(label),label);
});
