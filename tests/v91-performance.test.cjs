const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

test('dashboard requests only task summary and leaderboard, not 1–12 unused performance reports', () => {
  const start = client.indexOf('async function renderDashboard()');
  const end = client.indexOf('async function renderStoreDailySummary()', start);
  const dashboard = client.slice(start, end);
  assert.match(dashboard, /\/api\/dashboard\/task-summary\?start=/);
  assert.match(dashboard, /\/api\/sales\/leaderboard\?/);
  assert.doesNotMatch(dashboard, /overviewPerformanceForPeriod\(ctx\)/);
  assert.doesNotMatch(dashboard, /api\('\/api\/tasks'\)/);
});

test('compressed JS/CSS reproduce the exact sources and are much smaller', () => {
  for (const name of ['app.js', 'style.css']) {
    const raw = fs.readFileSync(path.join(root, 'public', name));
    const zip = fs.readFileSync(path.join(root, 'public', name + '.gz'));
    assert.deepEqual(zlib.gunzipSync(zip), raw);
    assert.ok(zip.byteLength < raw.byteLength * 0.3, `${name} gzip should reduce bytes by >70%`);
  }
  assert.match(server, /app\.use\(compression\(\{ threshold: 1024/);
  assert.match(html, /DEZUS_V91_OPTIMIZED_20261119/);
});

test('hero uses optimized WebP and old original image is retained', () => {
  const oldFile = path.join(root, 'public/assets/v47/hero-reference.png');
  const newFile = path.join(root, 'public/assets/v47/hero-reference-v91.webp');
  assert.ok(fs.existsSync(oldFile) && fs.existsSync(newFile));
  assert.ok(fs.statSync(newFile).size < fs.statSync(oldFile).size / 4);
  assert.match(css, /hero-reference-v91\.webp/);
});

test('dashboard task-summary counts by date and status and keeps per-user access', () => {
  const start = server.indexOf("app.get('/api/dashboard/task-summary'");
  const end = server.indexOf("app.get('/api/tasks'", start);
  assert.ok(start > 0 && end > start);
  const input = [
    {task_date:'2026-11-12', status:'assigned'},
    {task_date:'2026-11-13', status:'completed_on_time'},
    {task_date:'2026-11-14', status:'completed_late'},
    {task_date:'2026-11-15', status:'overdue'},
    {task_date:'2026-11-16', status:'not_completed'},
    {task_date:'2026-10-10', status:'assigned'},
  ];
  let handler;
  const ctx = {
    app:{get:(_route,_auth,fn)=>handler=fn},
    requireAuth:()=>{},
    taskRowsForUser:user=>{assert.equal(user.id,17);return input;},
    cachedHeavyRead:(_k,fn)=>fn(),
  };
  vm.createContext(ctx);
  vm.runInContext(server.slice(start,end),ctx);
  const response = { code:200, status(n){this.code=n;return this}, setHeader(){},json(x){this.data=x;return this}};
  handler({user:{id:17},query:{start:'2026-11-01',end:'2026-12-01'}},response);
  assert.equal(response.code,200);
  assert.deepEqual(JSON.parse(JSON.stringify(response.data)),{open:1,late:3,done:1,total:5});
});

test('db saving stays synchronous and atomic, and invalidates heavy read cache', () => {
  const start = server.indexOf('function saveDb()');
  const end = server.indexOf('function backupDbBeforeTaskDelete()',start);
  const code = server.slice(start,end);
  assert.match(code, /fs\.writeFileSync\(tmp, JSON\.stringify\(db\), 'utf8'\)/);
  assert.match(code, /fs\.renameSync\(tmp, DB_PATH\)/);
  assert.match(code, /expensiveReadCache\.clear\(\)/);
});

test('heavy read cache includes account id and short TTL', () => {
  assert.match(server, /`leaderboard:\$\{req\.user\.id\}:/);
  assert.match(server, /`performance:\$\{req\.user\.id\}:/);
  assert.match(server, /`task-summary:\$\{req\.user\.id\}:/);
  assert.match(server, /cachedHeavyRead\(cacheKey,[\s\S]*?3000\)/);
});
