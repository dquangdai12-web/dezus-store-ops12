const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../server.js'), 'utf8');
function fixture(role, confirm = true) {
  const db = { stores: [{ id: 1, name: 'Closed store', status: 'active' }], sales: [{ store_id: 1, amount: 100 }], users: [{ store_id: 1 }] };
  let handler, saves = 0;
  const ctx = { db, requireAuth() {}, nowIso: () => '2026-10-25T00:00:00Z', saveDb: () => saves++, app: { delete: (...args) => { handler = args.at(-1); } } };
  const start = source.indexOf("app.delete('/api/stores/:id'");
  vm.runInNewContext(source.slice(start, source.indexOf("\n\napp.post('/api/users'", start)), ctx);
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  const run = () => handler({ user: { id: 9, role, permissions: { can_manage_users: 1 } }, params: { id: '1' }, body: { confirm_closed: confirm } }, res);
  return { db, res, run, saves: () => saves };
}
test('only admin may delete, even when another role has user-management permission', () => {
  for (const role of ['office', 'manager', 'employee']) {
    const f = fixture(role); f.run(); assert.equal(f.res.code, 403); assert.equal(f.db.stores[0].status, 'active'); assert.equal(f.saves(), 0);
  }
});
test('admin must confirm closure', () => {
  const f = fixture('admin', false); f.run(); assert.equal(f.res.code, 400); assert.equal(f.saves(), 0);
});
test('admin archives store with references and preserves history, recording actor', () => {
  const f = fixture('admin'); const before = JSON.stringify({ sales: f.db.sales, users: f.db.users });
  f.run(); assert.equal(f.res.code, 200); assert.equal(f.db.stores[0].status, 'deleted'); assert.equal(f.db.stores[0].deleted_by, 9); assert.equal(f.db.stores[0].name, 'Closed store'); assert.equal(f.saves(), 1);
  assert.equal(JSON.stringify({ sales: f.db.sales, users: f.db.users }), before);
  f.run(); assert.equal(f.res.code, 404); assert.equal(f.saves(), 1);
});
