const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const ctx={};vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('function filterLoyaltyPeriod('),src.indexOf("app.get('/api/loyalty',")),ctx);
const dates=['2023-12-31','2024-01-01','2024-02-29','2024-03-31','2024-04-01','2024-12-31','2025-01-01'];const rows=dates.map(sale_date=>({sale_date}));
const result=q=>Array.from(ctx.filterLoyaltyPeriod(rows,q),r=>r.sale_date);
test('month includes leap day and excludes other months',()=>assert.deepEqual(result({period:'month',year:2024,month:2}),['2024-02-29']));
test('quarter includes both endpoints',()=>assert.deepEqual(result({period:'quarter',year:2024,quarter:1}),['2024-01-01','2024-02-29','2024-03-31']));
test('year excludes adjacent years',()=>assert.deepEqual(result({period:'year',year:2024}),dates.slice(1,-1)));
test('invalid periods rejected; legacy requests remain supported',()=>{assert.throws(()=>result({period:'quarter',year:2024,quarter:5}));assert.throws(()=>result({period:'month',year:2024,month:0}));assert.deepEqual(result({}),dates)});
