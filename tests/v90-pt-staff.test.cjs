const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

function extract(start, end) {
  const a = server.indexOf(start);
  const b = server.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `missing source part ${start}`);
  return server.slice(a, b);
}

test('PT employee type is persistent on create/edit and is published to the client', () => {
  assert.match(server, /employee_type: role === 'employee' && employee_type === 'pt' \? 'pt' : 'sales'/);
  assert.match(server, /existing\.employee_type = existing\.role === 'employee' && employee_type === 'pt'/);
  assert.match(server, /employee_type: userEmployeeType\(u\)/);
  assert.equal((client.match(/<select class="input" name="employee_type">/g) || []).length, 2);
  assert.match(client, /Nhân viên PT chỉ hiển thị ở Lịch làm việc/);
});

test('PT users remain eligible in the schedule roster and schedule API unchanged', () => {
  const code = extract("app.get('/api/schedules'", "app.post('/api/schedules/bulk'");
  let handler;
  const pt = {id:11, role:'employee', employee_type:'pt', status:'active', full_name:'PT Ca 4 giờ', store_id:1};
  const sales = {id:12, role:'employee', status:'active', full_name:'Sale A', store_id:1};
  const context = {
    app: {get: (...args) => { handler = args.at(-1); }},
    requireAuth: () => {},
    db: {users:[pt,sales], work_schedules:[], stores:[{id:1,name:'Cửa hàng 1'}]},
    canSelectAssignedStore:()=>true,
    getPrimaryStoreId:()=>1,
    getStore:()=>({id:1,name:'Cửa hàng 1'}),
    canViewSchedule:()=>true,
    scheduleWeekStart:()=> '2026-11-16',
    scheduleWeekDates:()=>['2026-11-16'],
    userAssignedToStoreOnDate:(user,id)=>user.store_id===id,
    activeShifts:()=>[],
    publicUser:user=>({...user, employee_type:user.employee_type || 'sales'}),
    userCanWorkAtStoreOnDate:()=>true,
    scheduleRowsForUser:()=>[],
    canManageSchedule:()=>true,
    scheduleRowValidForTransfer:()=>true,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  const response = { status(code){this.statusCode=code; return this}, json(body){this.body=body;} };
  handler({user:{role:'admin'},query:{store_id:1,week_start:'2026-11-16'}},response);
  assert.equal(response.body.employees.length, 2);
  assert.equal(response.body.employees.find(x=>x.id===11).employee_type,'pt');
});

test('PT users are excluded from revenue staff and leaderboard calculations', () => {
  const pt = {id:11, role:'employee', employee_type:'pt', status:'active', full_name:'PT Ca 4 giờ', store_id:1};
  const sales = {id:12, role:'employee', employee_type:'sales', status:'active', full_name:'Sale A', store_id:1};
  const context = {
    db:{users:[pt,sales], sales:[], assessments:[], work_schedules:[]},
    dateVal:v=>String(v||''),
    getPrimaryStoreId:u=>u.store_id,
    getUserStoreIds:u=>[u.store_id],
    userAssignedToStoreDuringPeriod:()=>true,
    periodRange:()=>({start:'2026-11-01',end:'2026-12-01'}),
    salesProgressForUserPeriod:()=>({revenue:500,target:1000,bill_count:0,item_count:0}),
    getStore:()=>({name:'Cửa hàng 1'}),
    isAllStoreRole:()=>true,
    userHasStore:()=>true,
  };
  vm.createContext(context);
  vm.runInContext(extract('function isPtEmployee(', 'function isAllStoreRole('), context);
  vm.runInContext(extract('function salesStaffForStore(', 'function storeMonthlyTarget('), context);
  vm.runInContext(extract('function leaderboardRows(', 'function monthlyWorkStoreBreakdownForUser('), context);
  assert.deepEqual(Array.from(context.salesStaffForStore(1).map(u=>u.id)),[12]);
  const ranks=context.leaderboardRows({role:'admin'},'month','2026-11-19',null,{includeAllStores:true});
  assert.deepEqual(Array.from(ranks.leaderboard.map(r=>r.user_id)),[12]);
});

test('PT account is schedule-only, and other employee selectors do not include PT', () => {
  assert.match(server, /if \(isPtEmployee\(row\)\) \{[\s\S]*'\/api\/schedules'/);
  assert.match(client, /if \(ptOnly\) return id === 'schedule' \|\| id === 'account'/);
  assert.match(client, /function employees\(\) \{[\s\S]*!isPtStaff\(u\)/);
  assert.match(client, /function salesStaffInStore\(storeId\) \{[\s\S]*!isPtStaff\(u\)/);
  assert.match(server, /if \(!employee \|\| employee\.role !== 'employee' \|\| isPtEmployee\(employee\)\) return res\.status\(400\)/);
});
