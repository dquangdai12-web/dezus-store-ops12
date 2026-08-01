/*
  Dezus Store Ops Web - NO SQLite / NO Python build version
  Database: data/store_ops.json
  Run: npm install && npm start
*/
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_DEZUS_STORE_OPS_SECRET';
const ROOT = __dirname;
const STORAGE_ROOT = process.env.STORAGE_ROOT || ROOT;
const DATA_DIR = process.env.DATA_DIR || path.join(STORAGE_ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'store_ops.json');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(STORAGE_ROOT, 'uploads');
const DOC_DIR = process.env.DOC_DIR || path.join(STORAGE_ROOT, 'documents');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(DOC_DIR, { recursive: true });
const SOURCE_CHECKLIST_PATH = path.join(ROOT, 'data', 'checklists.json');
const RUNTIME_CHECKLIST_PATH = path.join(DATA_DIR, 'checklists.json');
if (!fs.existsSync(RUNTIME_CHECKLIST_PATH) && fs.existsSync(SOURCE_CHECKLIST_PATH)) {
  fs.copyFileSync(SOURCE_CHECKLIST_PATH, RUNTIME_CHECKLIST_PATH);
}

const app = express();
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /image|pdf|word|excel|spreadsheet|presentation|powerpoint|octet-stream/.test(file.mimetype || '') || /\.(jpg|jpeg|png|webp|pdf|docx?|xlsx?|csv|pptx?)$/i.test(file.originalname || '');
    cb(ok ? null : new Error('File không hợp lệ'), ok);
  }
});

app.use(express.json({ limit: '6mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(ROOT, 'public')));

const ROLE_DEFAULTS = {
  admin: {
    can_assign_tasks: 1, can_manage_violations: 1, can_grade_checklists: 1,
    can_manage_sales: 1, can_manage_total_sales: 1, can_manage_daily_report: 1, can_set_sales_targets: 1, can_manage_weekly_report: 1, can_view_weekly_report: 1, can_view_reports: 1, can_manage_users: 1, can_export: 1, can_view_sales_target: 1, can_view_store_sales_summary: 1, can_manage_bonuses: 1, can_view_bonuses: 1, can_manage_documents: 1, can_view_documents: 1, can_manage_shifts: 1, can_manage_schedule: 1, can_view_schedule: 1, can_manage_orders: 1, can_view_orders: 1, can_manage_online_orders: 1, can_view_online_orders: 1, can_manage_product_feedback: 1, can_view_product_feedback: 1, can_manage_product_collections: 1, can_manage_product_training: 1, can_view_product_training: 1
  },
  manager: {
    can_assign_tasks: 1, can_manage_violations: 1, can_grade_checklists: 1,
    can_manage_sales: 1, can_manage_total_sales: 1, can_manage_daily_report: 1, can_set_sales_targets: 0, can_manage_weekly_report: 1, can_view_weekly_report: 1, can_view_reports: 1, can_manage_users: 0, can_export: 1, can_view_sales_target: 0, can_view_store_sales_summary: 1, can_manage_bonuses: 0, can_view_bonuses: 1, can_manage_documents: 1, can_view_documents: 1, can_manage_shifts: 0, can_manage_schedule: 1, can_view_schedule: 1, can_manage_orders: 1, can_view_orders: 1, can_manage_online_orders: 1, can_view_online_orders: 1, can_manage_product_feedback: 1, can_view_product_feedback: 1, can_manage_product_collections: 0, can_manage_product_training: 0, can_view_product_training: 1
  },
  employee: {
    can_assign_tasks: 0, can_manage_violations: 0, can_grade_checklists: 0,
    can_manage_sales: 0, can_manage_total_sales: 0, can_manage_daily_report: 0, can_set_sales_targets: 0, can_manage_weekly_report: 0, can_view_weekly_report: 0, can_view_reports: 0, can_manage_users: 0, can_export: 0, can_view_sales_target: 0, can_view_store_sales_summary: 0, can_manage_bonuses: 0, can_view_bonuses: 0, can_manage_documents: 0, can_view_documents: 1, can_manage_shifts: 0, can_manage_schedule: 0, can_view_schedule: 1, can_manage_orders: 0, can_view_orders: 1, can_manage_online_orders: 0, can_view_online_orders: 0, can_manage_product_feedback: 1, can_view_product_feedback: 1, can_manage_product_collections: 0, can_manage_product_training: 0, can_view_product_training: 1
  }
};

function nowIso() { return new Date().toISOString(); }
function dateOnly(d) {
  if (d === null || d === undefined || d === '') return new Date().toISOString().slice(0, 10);
  const raw = String(d);
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? new Date().toISOString().slice(0, 10) : dt.toISOString().slice(0, 10);
}
function monthKey(v) { return dateOnly((v || new Date())).slice(0, 7); }
function monthKeysBetween(start, end) {
  const out = [];
  const d = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  d.setUTCDate(1);
  while (d < e) {
    out.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}
function toNumber(v, fallback = 0) {
  if (v === null || v === undefined || v === '') return fallback;
  const normalized = typeof v === 'string'
    ? v.trim().replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '')
    : v;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function slugCode(name) { return String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase(); }

function defaultDb() {
  const stores = ['Bà Triệu', 'Đà Nẵng', 'Quận 1', 'Quận 7', 'Hanoi Centre'].map((name, i) => ({ id: i + 1, name, code: slugCode(name), status: 'active' }));
  const hash = bcrypt.hashSync('123456', 10);
  const sid = (name) => stores.find(s => s.name === name).id;
  const users = [
    { id: 1, full_name: 'Admin PKD', username: 'admin', password_hash: hash, role: 'admin', store_id: null, status: 'active', created_at: nowIso() },
    { id: 2, full_name: 'QL Bà Triệu', username: 'qly.bt', password_hash: hash, role: 'manager', store_id: sid('Bà Triệu'), status: 'active', created_at: nowIso() },
    { id: 3, full_name: 'ĐSKD Bà Triệu 01', username: 'nv.bt1', password_hash: hash, role: 'employee', store_id: sid('Bà Triệu'), status: 'active', created_at: nowIso() },
    { id: 4, full_name: 'ĐSKD Bà Triệu 02', username: 'nv.bt2', password_hash: hash, role: 'employee', store_id: sid('Bà Triệu'), status: 'active', created_at: nowIso() },
    { id: 5, full_name: 'QL Đà Nẵng', username: 'qly.dn', password_hash: hash, role: 'manager', store_id: sid('Đà Nẵng'), status: 'active', created_at: nowIso() },
    { id: 6, full_name: 'ĐSKD Đà Nẵng 01', username: 'nv.dn1', password_hash: hash, role: 'employee', store_id: sid('Đà Nẵng'), status: 'active', created_at: nowIso() }
  ];
  const shifts = [
    { id: 1, code: 'S', name: 'Ca S', start_time: '08:30', end_time: '16:30', note: 'Ca sáng', status: 'active', created_at: nowIso() },
    { id: 2, code: 'C', name: 'Ca C', start_time: '14:00', end_time: '22:00', note: 'Ca chiều', status: 'active', created_at: nowIso() },
    { id: 3, code: 'G1', name: 'Ca G1', start_time: '12:00', end_time: '22:00', note: 'Ca gãy / full peak', status: 'active', created_at: nowIso() },
    { id: 4, code: 'F1', name: 'Ca F1', start_time: '09:00', end_time: '17:00', note: '', status: 'active', created_at: nowIso() },
    { id: 5, code: 'C2', name: 'Ca C2', start_time: '14:30', end_time: '20:30', note: '', status: 'active', created_at: nowIso() }
  ];
  const permissions = users.map(u => ({ user_id: u.id, ...ROLE_DEFAULTS[u.role] }));
  return {
    version: 2,
    nextIds: { stores: 6, users: 7, tasks: 1, task_assignees: 1, violations: 1, assessments: 1, assessment_items: 1, sales: 1, sales_targets: 1, sales_daily_targets: 1, sales_store_days: 1, bonuses: 1, documents: 1, shifts: 6, work_schedules: 1, orders: 1, online_orders: 1, product_feedback: 1, product_collections: 1, product_collection_items: 1, product_trainings: 1, product_training_attempts: 1, weekly_reports: 1, daily_reports: 1 },
    stores, users, permissions, shifts,
    tasks: [], task_assignees: [], violations: [], assessments: [], assessment_items: [], sales: [], sales_targets: [], sales_daily_targets: [], sales_store_days: [], bonuses: [], documents: [], orders: [], online_orders: [], product_feedback: [], product_collections: [], product_collection_items: [], product_trainings: [], product_training_attempts: [], weekly_reports: [], daily_reports: [], work_schedules: []
  };
}

let db = loadDb();

function loadDb() {
  if (!fs.existsSync(DB_PATH)) {
    const fresh = defaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2), 'utf8');
    return fresh;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const base = defaultDb();
    return {
      ...base,
      ...parsed,
      nextIds: { ...base.nextIds, ...(parsed.nextIds || {}) },
      stores: parsed.stores || base.stores,
      users: parsed.users || base.users,
      permissions: parsed.permissions || base.permissions,
      tasks: parsed.tasks || [],
      task_assignees: parsed.task_assignees || [],
      violations: parsed.violations || [],
      assessments: parsed.assessments || [],
      assessment_items: parsed.assessment_items || [],
      sales: parsed.sales || [],
      sales_targets: parsed.sales_targets || [],
      sales_daily_targets: parsed.sales_daily_targets || [],
      sales_store_days: parsed.sales_store_days || [],
      bonuses: parsed.bonuses || [],
      documents: parsed.documents || [],
      orders: parsed.orders || [],
      online_orders: parsed.online_orders || [],
      product_feedback: parsed.product_feedback || [],
      product_collections: parsed.product_collections || [],
      product_collection_items: parsed.product_collection_items || [],
      product_trainings: parsed.product_trainings || [],
      product_training_attempts: parsed.product_training_attempts || [],
      weekly_reports: parsed.weekly_reports || [],
      daily_reports: parsed.daily_reports || [],
      shifts: parsed.shifts || base.shifts,
      work_schedules: parsed.work_schedules || []
    };
  } catch (err) {
    const backup = DB_PATH + `.broken-${Date.now()}.bak`;
    fs.copyFileSync(DB_PATH, backup);
    const fresh = defaultDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2), 'utf8');
    console.error('Database JSON lỗi, đã tạo lại file mới. Backup:', backup);
    return fresh;
  }
}

function saveDb() {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

function nextId(name) {
  const id = Number(db.nextIds[name] || 1);
  db.nextIds[name] = id + 1;
  return id;
}

function getStore(id) { return db.stores.find(s => Number(s.id) === Number(id)); }
function getUser(id) { return db.users.find(u => Number(u.id) === Number(id)); }
function getActiveUser(id) { const u = getUser(id); return u && u.status === 'active' ? u : null; }
function getPermissions(userId, role) {
  const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.employee;
  const row = db.permissions.find(p => Number(p.user_id) === Number(userId)) || {};
  const out = { ...defaults };
  Object.keys(defaults).forEach(k => out[k] = Number(row[k] ?? defaults[k]));
  return out;
}
function setPermissions(userId, role, permissions) {
  const base = { ...ROLE_DEFAULTS[role], ...(permissions || {}) };
  let row = db.permissions.find(p => Number(p.user_id) === Number(userId));
  if (!row) {
    row = { user_id: Number(userId) };
    db.permissions.push(row);
  }
  Object.keys(ROLE_DEFAULTS.admin).forEach(k => row[k] = Number(base[k] || 0));
}
function normalizeStoreIds(list) {
  return Array.from(new Set((Array.isArray(list) ? list : []).map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0)));
}
function getUserStoreIds(row) {
  if (!row) return [];
  const raw = Array.isArray(row.store_ids) ? row.store_ids : (Array.isArray(row.access_store_ids) ? row.access_store_ids : (row.store_id ? [row.store_id] : []));
  return normalizeStoreIds(raw.length ? raw : (row.store_id ? [row.store_id] : []));
}
function getPrimaryStoreId(row) {
  if (!row) return null;
  return row.store_id ? Number(row.store_id) : (getUserStoreIds(row)[0] || null);
}
function userHasStore(user, storeId) {
  if (user?.role === 'admin') return true;
  if (!storeId) return true;
  const ids = getUserStoreIds(user);
  if (!ids.length) return false;
  return ids.includes(Number(storeId));
}
function userStoreNames(row) {
  return getUserStoreIds(row).map(id => getStore(id)?.name).filter(Boolean);
}
function withStore(row) {
  if (!row) return null;
  const ids = getUserStoreIds(row);
  const names = userStoreNames(row);
  return { ...row, store_id: getPrimaryStoreId(row), store_ids: ids, store_name: names[0] || null, store_names: names };
}
function publicUser(row) {
  if (!row) return null;
  const u = withStore(row);
  return {
    id: u.id,
    full_name: u.full_name,
    username: u.username,
    role: u.role,
    store_id: u.store_id,
    store_ids: u.store_ids || [],
    store_name: u.store_name || null,
    store_names: u.store_names || [],
    status: u.status,
    permissions: getPermissions(u.id, u.role)
  };
}
function canAccessStore(req, storeId) { return userHasStore(req.user, storeId); }

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const row = getActiveUser(payload.id);
    if (!row) return res.status(401).json({ error: 'Tài khoản không tồn tại hoặc đã bị khóa' });
    req.user = publicUser(row);
    next();
  } catch (_err) {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
  }
}
function requirePerm(permission) {
  return (req, res, next) => {
    if (req.user.role === 'admin' || Number(req.user.permissions[permission]) === 1) return next();
    return res.status(403).json({ error: 'Không có quyền thao tác mục này' });
  };
}
function requireAnyPerm(...permissions) {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();
    const ok = permissions.some(permission => Number(req.user.permissions?.[permission]) === 1);
    if (ok) return next();
    return res.status(403).json({ error: 'Không có quyền thao tác mục này' });
  };
}

function saveUploadedFile(file) {
  if (!file) return null;
  const ext = path.extname(file.originalname || '').slice(0, 12) || '';
  const newName = `${file.filename}${ext}`;
  const nextPath = path.join(UPLOAD_DIR, newName);
  fs.renameSync(file.path, nextPath);
  return `/uploads/${newName}`;
}
function saveUploadedFiles(files) {
  const saved = (files || []).map(file => saveUploadedFile(file)).filter(Boolean);
  return saved.length ? JSON.stringify(saved) : null;
}

function saveDocumentFile(file) {
  if (!file) return null;
  const ext = path.extname(file.originalname || '').slice(0, 16) || '';
  const newName = `${file.filename}${ext}`;
  const nextPath = path.join(DOC_DIR, newName);
  fs.renameSync(file.path, nextPath);
  return newName;
}
function documentRowsForUser(user) {
  const canView = user.role === 'admin' || Number(user.permissions.can_view_documents) === 1 || Number(user.permissions.can_manage_documents) === 1;
  if (!canView) return [];
  let rows = (db.documents || []).filter(d => d.status !== 'deleted');
  if (user.role !== 'admin') rows = rows.filter(d => !d.store_id || userHasStore(user, d.store_id));
  return rows.map(d => {
    const store = d.store_id ? getStore(d.store_id) : null;
    const creator = getUser(d.created_by);
    return { ...d, store_name: store ? store.name : 'Toàn hệ thống', created_by_name: creator ? creator.full_name : '' };
  }).sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
}
function canAccessDocument(user, doc) {
  if (!doc || doc.status === 'deleted') return false;
  if (user.role === 'admin') return true;
  const canView = Number(user.permissions.can_view_documents) === 1 || Number(user.permissions.can_manage_documents) === 1;
  return canView && (!doc.store_id || userHasStore(user, doc.store_id));
}
function canManageDocumentScope(user, storeId) {
  if (user.role === 'admin') return true;
  if (Number(user.permissions.can_manage_documents) !== 1) return false;
  return !storeId || userHasStore(user, storeId);
}


function orderStatusLabel(status) {
  const map = {
    new: 'Chờ xử lý',
    done: 'Đã làm',
    waiting: 'Chờ hàng nhập',
    received: 'Đã nhập hàng',
    cancelled: 'Hủy'
  };
  return map[status] || status || 'Chờ xử lý';
}

function normalizeOrderBatchName(v) {
  const raw = String(v || 'Chưa gắn lần').trim() || 'Chưa gắn lần';
  return raw.replace(/^Đợt\b/i, 'Lần');
}
function canViewOrderScope(user, storeId) {
  if (user.role === 'admin') return true;
  const ok = Number(user.permissions.can_view_orders) === 1 || Number(user.permissions.can_manage_orders) === 1;
  if (!ok) return false;
  if (!user.store_id) return true;
  return userHasStore(user, storeId);
}
function canManageOrderScope(user, storeId) {
  if (user.role === 'admin') return true;
  if (Number(user.permissions.can_manage_orders) !== 1) return false;
  if (!user.store_id) return true;
  return userHasStore(user, storeId);
}
function orderRowsForUser(user, storeId = null) {
  db.orders = db.orders || [];
  let rows = db.orders.filter(o => o.status !== 'deleted');
  if (storeId) rows = rows.filter(o => Number(o.store_id) === Number(storeId));
  if (user.role !== 'admin') {
    if (!Number(user.permissions.can_view_orders) && !Number(user.permissions.can_manage_orders)) return [];
    if (user.store_id) rows = rows.filter(o => userHasStore(user, o.store_id));
  }
  return rows.map(o => {
    const store = getStore(o.store_id);
    const creator = getUser(o.created_by);
    const updater = getUser(o.updated_by);
    return {
      ...o,
      batch_name: normalizeOrderBatchName(o.batch_name || o.order_batch),
      store_name: store ? store.name : '',
      created_by_name: creator ? creator.full_name : '',
      updated_by_name: updater ? updater.full_name : '',
      status_label: orderStatusLabel(o.order_status || 'new')
    };
  }).sort((a, b) => String(b.order_date || b.created_at || '').localeCompare(String(a.order_date || a.created_at || '')) || Number(b.id) - Number(a.id));
}

function aggregateOrderRows(rows) {
  const map = new Map();
  (rows || []).forEach(o => {
    const batchName = normalizeOrderBatchName(o.batch_name || o.order_batch);
    const sku = String(o.sku || '').trim();
    const productName = String(o.product_name || '').trim();
    const size = String(o.size || '').trim();
    const key = [Number(o.store_id || 0), batchName.toLowerCase(), sku.toLowerCase(), productName.toLowerCase(), size.toLowerCase()].join('||');
    if (!map.has(key)) {
      map.set(key, {
        batch_name: batchName,
        store_id: o.store_id,
        store_name: o.store_name || getStore(o.store_id)?.name || '',
        sku,
        product_name: productName,
        size,
        total_quantity: 0,
        first_order_date: o.order_date || '',
        last_order_date: o.order_date || '',
        source_count: 0,
        statuses: new Set(),
        notes: new Set(),
        created_by_names: new Set()
      });
    }
    const row = map.get(key);
    row.total_quantity += Number(o.quantity || 0);
    row.source_count += 1;
    if (o.order_date && (!row.first_order_date || String(o.order_date) < String(row.first_order_date))) row.first_order_date = o.order_date;
    if (o.order_date && (!row.last_order_date || String(o.order_date) > String(row.last_order_date))) row.last_order_date = o.order_date;
    if (o.order_status) row.statuses.add(o.order_status);
    if (o.note) row.notes.add(o.note);
    if (o.created_by_name) row.created_by_names.add(o.created_by_name);
  });
  return Array.from(map.values()).map(row => {
    const statuses = Array.from(row.statuses);
    const status = statuses.length === 1 ? statuses[0] : 'mixed';
    return {
      ...row,
      status,
      status_label: status === 'mixed' ? 'Nhiều trạng thái' : orderStatusLabel(status),
      note: Array.from(row.notes).join(' | '),
      created_by_name: Array.from(row.created_by_names).join(' | ')
    };
  }).sort((a, b) => String(b.last_order_date || '').localeCompare(String(a.last_order_date || '')) || String(a.batch_name || '').localeCompare(String(b.batch_name || ''), 'vi') || String(a.sku || '').localeCompare(String(b.sku || ''), 'vi'));
}




function canViewOnlineOrderScope(user, storeId) {
  if (user.role === 'admin') return true;
  const ok = Number(user.permissions.can_view_online_orders) === 1 || Number(user.permissions.can_manage_online_orders) === 1;
  if (!ok) return false;
  return !storeId || userHasStore(user, storeId);
}
function canManageOnlineOrderScope(user, storeId) {
  if (user.role === 'admin') return true;
  if (Number(user.permissions.can_manage_online_orders) !== 1) return false;
  return userHasStore(user, storeId);
}
function onlineOrderRowsForUser(user, storeId = null, month = null) {
  db.online_orders = db.online_orders || [];
  let rows = db.online_orders.filter(o => o.status !== 'deleted');
  if (storeId) rows = rows.filter(o => Number(o.store_id) === Number(storeId));
  if (month) rows = rows.filter(o => String(o.order_date || '').slice(0, 7) === String(month).slice(0, 7));
  if (user.role !== 'admin') {
    if (!Number(user.permissions.can_view_online_orders) && !Number(user.permissions.can_manage_online_orders)) return [];
    rows = rows.filter(o => userHasStore(user, o.store_id));
  }
  return rows.map(o => ({
    ...o,
    store_name: getStore(o.store_id)?.name || '',
    packer_name: getUser(o.packer_id)?.full_name || '',
    created_by_name: getUser(o.created_by)?.full_name || ''
  })).sort((a, b) => String(b.order_date || '').localeCompare(String(a.order_date || '')) || Number(b.id) - Number(a.id));
}
function onlineOrderSummary(rows) {
  const employeeMap = new Map();
  const storeMap = new Map();
  rows.forEach(r => {
    const val = Number(r.order_value || 0);
    const benefit = Number(r.benefit_revenue || 0);
    const empKey = String(r.packer_id || '');
    const emp = employeeMap.get(empKey) || { user_id: r.packer_id, full_name: r.packer_name || '', store_id: r.store_id, store_name: r.store_name || '', order_count: 0, order_value: 0, benefit_revenue: 0 };
    emp.order_count += 1;
    emp.order_value += val;
    emp.benefit_revenue += benefit;
    employeeMap.set(empKey, emp);
    const stKey = String(r.store_id || '');
    const st = storeMap.get(stKey) || { store_id: r.store_id, store_name: r.store_name || '', order_count: 0, order_value: 0, benefit_revenue: 0 };
    st.order_count += 1;
    st.order_value += val;
    st.benefit_revenue += benefit;
    storeMap.set(stKey, st);
  });
  return {
    stores: Array.from(storeMap.values()).sort((a, b) => b.benefit_revenue - a.benefit_revenue),
    employees: Array.from(employeeMap.values()).sort((a, b) => b.benefit_revenue - a.benefit_revenue),
    totals: rows.reduce((acc, r) => {
      acc.order_count += 1;
      acc.order_value += Number(r.order_value || 0);
      acc.benefit_revenue += Number(r.benefit_revenue || 0);
      return acc;
    }, { order_count: 0, order_value: 0, benefit_revenue: 0 })
  };
}

function canViewProductCollectionScope(user, storeId) {
  if (user.role === 'admin') return true;
  const ok = Number(user.permissions.can_view_product_feedback) === 1 || Number(user.permissions.can_manage_product_feedback) === 1 || Number(user.permissions.can_view_product_training) === 1;
  if (!ok) return false;
  if (!storeId) return true;
  if (!user.store_id) return true;
  return userHasStore(user, storeId);
}
function canManageProductCollectionScope(user, storeId) {
  if (user.role === 'admin') return true;
  if (Number(user.permissions.can_manage_product_collections) !== 1) return false;
  if (!user.store_id) return true;
  return !storeId || userHasStore(user, storeId);
}
function collectionItems(collectionId) {
  db.product_collection_items = db.product_collection_items || [];
  return db.product_collection_items
    .filter(i => i.status !== 'deleted' && Number(i.collection_id) === Number(collectionId))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.sku || '').localeCompare(String(b.sku || ''), 'vi'));
}
function productCollectionRowsForUser(user, storeId = null, month = null) {
  db.product_collections = db.product_collections || [];
  let rows = db.product_collections.filter(c => c.status !== 'deleted');
  if (storeId) rows = rows.filter(c => !c.store_id || Number(c.store_id) === Number(storeId));
  if (month) rows = rows.filter(c => String(c.collection_month || '').slice(0, 7) === String(month).slice(0, 7));
  if (user.role !== 'admin') {
    rows = rows.filter(c => canViewProductCollectionScope(user, c.store_id));
    if (user.store_id) rows = rows.filter(c => !c.store_id || userHasStore(user, c.store_id));
  }
  return rows.map(c => {
    const store = c.store_id ? getStore(c.store_id) : null;
    const creator = getUser(c.created_by);
    const updater = getUser(c.updated_by);
    const items = collectionItems(c.id).map(i => ({ id: i.id, sku: i.sku || '', product_name: i.product_name || '', note: i.note || '', sort_order: Number(i.sort_order || 0) }));
    return { ...c, store_name: store ? store.name : 'Toàn hệ thống', created_by_name: creator ? creator.full_name : '', updated_by_name: updater ? updater.full_name : '', items };
  }).sort((a, b) => String(b.collection_month || '').localeCompare(String(a.collection_month || '')) || String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
}
function parseCollectionItems(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const parts = line.split(/\t|\||,/).map(x => x.trim()).filter(Boolean);
      const sku = parts[0] || '';
      const product_name = parts.slice(1).join(' - ') || parts[0] || '';
      return { sku, product_name, note: '', sort_order: idx + 1 };
    })
    .filter(i => i.sku || i.product_name);
}
function productFeedbackSummaryForUser(user, storeId = null, collectionId = null, month = null) {
  const rows = productFeedbackRowsForUser(user, storeId, collectionId, month);
  const map = new Map();
  rows.forEach(r => {
    const key = [Number(r.collection_id || 0), String(r.sku || '').trim().toLowerCase(), String(r.product_name || '').trim().toLowerCase()].join('||');
    if (!map.has(key)) {
      map.set(key, {
        collection_id: r.collection_id || null,
        collection_name: r.collection_name || '',
        sku: r.sku || '',
        product_name: r.product_name || '',
        stores: new Set(),
        count: 0,
        restock_yes: 0,
        restock_no: 0,
        restock_watch: 0,
        first_date: r.feedback_date || '',
        last_date: r.feedback_date || '',
        style_notes: [], material_notes: [], error_notes: [], customer_notes: [], notes: []
      });
    }
    const g = map.get(key);
    g.count += 1;
    if (r.store_name) g.stores.add(r.store_name);
    if (r.restock_wish === 'Đề xuất tái') g.restock_yes += 1;
    else if (r.restock_wish === 'Không tái') g.restock_no += 1;
    else g.restock_watch += 1;
    const fd = r.feedback_date || '';
    if (fd && (!g.first_date || fd < g.first_date)) g.first_date = fd;
    if (fd && (!g.last_date || fd > g.last_date)) g.last_date = fd;
    [['style_notes','style_feedback'],['material_notes','material_feedback'],['error_notes','product_errors'],['customer_notes','customer_feedback'],['notes','note']].forEach(([arr, field]) => {
      const v = String(r[field] || '').trim();
      if (v && !g[arr].includes(v)) g[arr].push(v);
    });
  });
  return Array.from(map.values()).map(g => ({
    ...g,
    stores: Array.from(g.stores).join(', '),
    style_notes: g.style_notes.slice(0, 6).join(' | '),
    material_notes: g.material_notes.slice(0, 6).join(' | '),
    error_notes: g.error_notes.slice(0, 6).join(' | '),
    customer_notes: g.customer_notes.slice(0, 6).join(' | '),
    notes: g.notes.slice(0, 6).join(' | '),
    recommend_label: g.restock_yes >= Math.max(g.restock_no, g.restock_watch) && g.restock_yes > 0 ? 'Đề xuất tái' : (g.restock_no > Math.max(g.restock_yes, g.restock_watch) ? 'Không tái' : 'Cần theo dõi thêm')
  })).sort((a, b) => Number(b.count || 0) - Number(a.count || 0) || String(a.product_name || '').localeCompare(String(b.product_name || ''), 'vi'));
}

function canViewProductFeedbackScope(user, storeId) {
  if (user.role === 'admin') return true;
  const ok = Number(user.permissions.can_view_product_feedback) === 1 || Number(user.permissions.can_manage_product_feedback) === 1;
  if (!ok) return false;
  if (!user.store_id) return true;
  return !storeId || userHasStore(user, storeId);
}
function canManageProductFeedbackScope(user, storeId) {
  if (user.role === 'admin') return true;
  if (Number(user.permissions.can_manage_product_feedback) !== 1) return false;
  if (!user.store_id) return true;
  return userHasStore(user, storeId);
}
function productFeedbackRowsForUser(user, storeId = null, collectionId = null, month = null) {
  db.product_feedback = db.product_feedback || [];
  let rows = db.product_feedback.filter(r => r.status !== 'deleted');
  if (storeId) rows = rows.filter(r => Number(r.store_id) === Number(storeId));
  if (collectionId) rows = rows.filter(r => Number(r.collection_id) === Number(collectionId));
  if (month) rows = rows.filter(r => String(r.feedback_date || '').slice(0, 7) === String(month).slice(0, 7));
  if (user.role !== 'admin') {
    if (!Number(user.permissions.can_view_product_feedback) && !Number(user.permissions.can_manage_product_feedback)) return [];
    if (user.store_id) rows = rows.filter(r => userHasStore(user, r.store_id));
  }
  return rows.map(r => {
    const store = getStore(r.store_id);
    const creator = getUser(r.created_by);
    const updater = getUser(r.updated_by);
    const collection = (db.product_collections || []).find(c => Number(c.id) === Number(r.collection_id));
    return { ...r, collection_name: collection ? collection.name : '', collection_month: collection ? collection.collection_month : '', store_name: store ? store.name : '', created_by_name: creator ? creator.full_name : '', updated_by_name: updater ? updater.full_name : '' };
  }).sort((a, b) => String(b.feedback_date || b.created_at || '').localeCompare(String(a.feedback_date || a.created_at || '')) || Number(b.id) - Number(a.id));
}
function canViewProductTrainingScope(user, storeId) {
  if (user.role === 'admin') return true;
  const ok = Number(user.permissions.can_view_product_training) === 1 || Number(user.permissions.can_manage_product_training) === 1;
  if (!ok) return false;
  if (!storeId) return true;
  if (!user.store_id) return true;
  return userHasStore(user, storeId);
}
function canManageProductTrainingScope(user, storeId) {
  if (user.role === 'admin') return true;
  if (Number(user.permissions.can_manage_product_training) !== 1) return false;
  if (!user.store_id) return true;
  return !storeId || userHasStore(user, storeId);
}
function trainingQuestions(row, includeAnswers = false) {
  let questions = [];
  try { questions = Array.isArray(row.quiz_questions) ? row.quiz_questions : JSON.parse(row.quiz_questions || '[]'); } catch (_err) { questions = []; }
  questions = questions.filter(q => q && String(q.question || '').trim());
  return questions.map((q, idx) => {
    const base = { index: idx, question: String(q.question || '').trim(), options: (Array.isArray(q.options) ? q.options : []).map(x => String(x || '').trim()).filter(Boolean) };
    if (includeAnswers) base.correct_index = Number(q.correct_index || 0);
    return base;
  }).filter(q => q.options.length >= 2);
}

function parseQuizText(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(/\||\t/).map(x => x.trim()).filter(Boolean);
      if (parts.length < 4) return null;
      const answerRaw = String(parts[parts.length - 1] || '').trim().toUpperCase();
      const question = parts[0];
      const options = parts.slice(1, -1);
      let correctIndex = 0;
      if (/^[A-D]$/.test(answerRaw)) correctIndex = answerRaw.charCodeAt(0) - 65;
      else {
        const byText = options.findIndex(o => o.toLowerCase() === answerRaw.toLowerCase());
        correctIndex = byText >= 0 ? byText : Math.max(0, Number(answerRaw) - 1);
      }
      if (!question || options.length < 2 || correctIndex < 0 || correctIndex >= options.length) return null;
      return { question, options, correct_index: correctIndex };
    })
    .filter(Boolean);
}

function trainingAttemptsFor(trainingId, userId = null) {
  db.product_training_attempts = db.product_training_attempts || [];
  return db.product_training_attempts.filter(a => Number(a.training_id) === Number(trainingId) && (!userId || Number(a.user_id) === Number(userId)) && a.status !== 'deleted');
}

function trainingProgress(trainingId, userId, passPercent = 90) {
  const attempts = trainingAttemptsFor(trainingId, userId).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const bestScore = attempts.length ? Math.max(...attempts.map(a => Number(a.score_percent || 0))) : 0;
  const passed = attempts.some(a => Number(a.passed) === 1 || Number(a.score_percent || 0) >= Number(passPercent || 90));
  const passedAttempt = attempts.find(a => Number(a.passed) === 1 || Number(a.score_percent || 0) >= Number(passPercent || 90));
  return { attempts_count: attempts.length, best_score: Math.round(bestScore * 100) / 100, passed, completed_at: passedAttempt ? passedAttempt.created_at : null, last_score: attempts[0] ? Number(attempts[0].score_percent || 0) : null };
}

function trainingAssignees(row) {
  if (!row || Number(row.is_required || 0) !== 1) return [];
  return db.users.filter(u => u.status === 'active' && u.role === 'employee' && (!row.store_id || Number(u.store_id) === Number(row.store_id)));
}

function overdueTrainingCountForUser(userId) {
  const today = nowIso();
  return (db.product_trainings || []).filter(r => r.status !== 'deleted' && Number(r.is_required || 0) === 1 && r.due_at && String(r.due_at) < today && trainingAssignees(r).some(u => Number(u.id) === Number(userId)) && !trainingProgress(r.id, userId, r.pass_percent || 90).passed).length;
}

function productTrainingRowsForUser(user, storeId = null) {
  db.product_trainings = db.product_trainings || [];
  let rows = db.product_trainings.filter(r => r.status !== 'deleted');
  if (storeId) rows = rows.filter(r => !r.store_id || Number(r.store_id) === Number(storeId));
  if (user.role !== 'admin') {
    if (!Number(user.permissions.can_view_product_training) && !Number(user.permissions.can_manage_product_training)) return [];
    if (getUserStoreIds(user).length) rows = rows.filter(r => !r.store_id || userHasStore(user, r.store_id));
  }
  return rows.map(r => {
    const store = r.store_id ? getStore(r.store_id) : null;
    const creator = getUser(r.created_by);
    const updater = getUser(r.updated_by);
    const questions = trainingQuestions(r, false);
    const progress = user.role === 'employee' ? trainingProgress(r.id, user.id, r.pass_percent || 90) : null;
    const assignees = (user.role === 'admin' || Number(user.permissions.can_manage_product_training) === 1) ? trainingAssignees(r).map(u => ({ user_id: u.id, full_name: u.full_name, store_name: getStore(u.store_id)?.name || '', ...trainingProgress(r.id, u.id, r.pass_percent || 90) })) : [];
    return { ...r, quiz_questions: undefined, quiz_question_count: questions.length, pass_percent: Number(r.pass_percent || 90), is_required: Number(r.is_required || 0), due_at: r.due_at || '', store_name: store ? store.name : 'Toàn hệ thống', created_by_name: creator ? creator.full_name : '', updated_by_name: updater ? updater.full_name : '', progress, assignees };
  }).sort((a, b) => String(a.arrival_date || '9999-12-31').localeCompare(String(b.arrival_date || '9999-12-31')) || Number(b.id) - Number(a.id));
}

function activeShifts() {
  db.shifts = db.shifts || [];
  return db.shifts.filter(s => s.status !== 'deleted').sort((a, b) => String(a.code || '').localeCompare(String(b.code || ''), 'vi'));
}
function scheduleWeekStart(input) {
  const base = input ? new Date(`${dateOnly(input)}T00:00:00Z`) : new Date();
  if (Number.isNaN(base.getTime())) return dateOnly(new Date());
  const day = base.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setUTCDate(base.getUTCDate() + diff);
  return base.toISOString().slice(0, 10);
}
function scheduleWeekDates(weekStart) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
function canViewSchedule(user, storeId) {
  if (user.role === 'admin') return true;
  if (!userHasStore(user, storeId)) return false;
  return Number(user.permissions.can_view_schedule) === 1 || Number(user.permissions.can_manage_schedule) === 1;
}
function canManageSchedule(user, storeId) {
  if (user.role === 'admin') return true;
  if (Number(user.permissions.can_manage_schedule) !== 1) return false;
  return userHasStore(user, storeId);
}
function scheduleRowsForUser(user, storeId, dates) {
  db.work_schedules = db.work_schedules || [];
  let rows = db.work_schedules.filter(x => Number(x.store_id) === Number(storeId) && dates.includes(String(x.work_date)) && x.status !== 'deleted');
  if (user.role === 'employee') rows = rows.filter(x => Number(x.user_id) === Number(user.id));
  return rows.map(x => {
    const emp = getUser(x.user_id);
    const shift = (db.shifts || []).find(s => Number(s.id) === Number(x.shift_id));
    const creator = getUser(x.created_by);
    const updater = getUser(x.updated_by);
    return { ...x, employee_name: emp ? emp.full_name : '', shift_name: shift ? shift.name : '', shift_code: shift ? shift.code : '', shift_start: shift ? shift.start_time : '', shift_end: shift ? shift.end_time : '', created_by_name: creator ? creator.full_name : '', updated_by_name: updater ? updater.full_name : '' };
  }).sort((a, b) => String(a.work_date).localeCompare(String(b.work_date)) || String(a.employee_name).localeCompare(String(b.employee_name), 'vi'));
}

function taskStatus(row) {
  if (row.completed_at) return new Date(row.completed_at) <= new Date(row.due_at) ? 'completed_on_time' : 'completed_late';
  return new Date() > new Date(row.due_at) ? 'overdue' : 'assigned';
}
function periodRange(period, ref) {
  const d = ref ? new Date(ref) : new Date();
  if (Number.isNaN(d.getTime())) throw new Error('Ngày không hợp lệ');
  let start, end;
  if (period === 'quarter') {
    const q = Math.floor(d.getMonth() / 3);
    start = new Date(Date.UTC(d.getFullYear(), q * 3, 1));
    end = new Date(Date.UTC(d.getFullYear(), q * 3 + 3, 1));
  } else if (period === 'year') {
    start = new Date(Date.UTC(d.getFullYear(), 0, 1));
    end = new Date(Date.UTC(d.getFullYear() + 1, 0, 1));
  } else {
    start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
    end = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1));
  }
  return { start: dateOnly(start), end: dateOnly(end) };
}

function monthlyTargetRowForUser(userId, month) {
  db.sales_targets = db.sales_targets || [];
  return db.sales_targets
    .filter(t => Number(t.user_id) === Number(userId) && String(t.target_month) === String(month))
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0] || null;
}

function monthlyTargetForUser(userId, month) {
  const row = monthlyTargetRowForUser(userId, month);
  if (row) return Number(row.target_revenue ?? row.target ?? 0);
  // Legacy fallback: old versions stored target on sales rows. Use max target in that month, not sum.
  const legacyRows = (db.sales || []).filter(sa => Number(sa.user_id) === Number(userId) && monthKey(sa.sale_date) === month);
  return Math.max(0, ...legacyRows.map(r => Number(r.target || r.target_value || 0)));
}

function monthlyKpiTargetsForUser(userId, month) {
  const row = monthlyTargetRowForUser(userId, month);
  return {
    target_revenue: row ? Number(row.target_revenue ?? row.target ?? 0) : monthlyTargetForUser(userId, month),
    target_upt: row ? Number(row.target_upt || 0) : 0,
    target_atv: row ? Number(row.target_atv || 0) : 0,
    target_cr: row ? Number(row.target_cr || 0) : 0,
  };
}


function storeDailyTargetRow(storeId, saleDate) {
  db.sales_daily_targets = db.sales_daily_targets || [];
  const d = dateOnly(saleDate || new Date());
  return db.sales_daily_targets
    .filter(t => Number(t.store_id) === Number(storeId) && String(t.target_date) === d)
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))[0] || null;
}

function storeDailyTarget(storeId, saleDate) {
  const row = storeDailyTargetRow(storeId, saleDate);
  return {
    target_revenue: row ? Number(row.target_revenue || 0) : 0,
    // UPT / ATV / CR không set theo ngày nữa; các màn tổng hợp dùng target tháng.
    target_upt: 0,
    target_atv: 0,
    target_cr: 0,
    note: row ? (row.note || '') : ''
  };
}

function aggregateKpiTargetsForUser(userId, months) {
  const rows = months.map(month => monthlyKpiTargetsForUser(userId, month));
  const avg = key => {
    const vals = rows.map(r => Number(r[key] || 0)).filter(v => v > 0);
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : 0;
  };
  return {
    target: rows.reduce((sum, r) => sum + Number(r.target_revenue || 0), 0),
    target_upt: avg('target_upt'),
    target_atv: avg('target_atv'),
    target_cr: avg('target_cr'),
  };
}

function aggregateKpiTargetsForStore(storeId, months) {
  const staff = salesStaffForStore(storeId);
  const employeeTargets = staff.map(u => aggregateKpiTargetsForUser(u.id, months));
  const avg = key => {
    const vals = employeeTargets.map(r => Number(r[key] || 0)).filter(v => v > 0);
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : 0;
  };
  return {
    target: employeeTargets.reduce((sum, r) => sum + Number(r.target || 0), 0),
    target_upt: avg('target_upt'),
    target_atv: avg('target_atv'),
    target_cr: avg('target_cr'),
  };
}


function periodPaceMetrics(start, end, target, revenue) {
  const startD = new Date(`${dateOnly(start)}T00:00:00Z`);
  const endD = new Date(`${dateOnly(end)}T00:00:00Z`);
  const todayD = new Date(`${dateOnly(new Date())}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((endD - startD) / dayMs));
  let elapsedDays;
  if (todayD < startD) elapsedDays = 0;
  else if (todayD >= endD) elapsedDays = totalDays;
  else elapsedDays = Math.min(totalDays, Math.max(1, Math.floor((todayD - startD) / dayMs) + 1));
  const daysRemaining = Math.max(0, totalDays - elapsedDays);
  const rev = toNumber(revenue, 0);
  const tgt = toNumber(target, 0);
  const dailyAverage = elapsedDays > 0 ? rev / elapsedDays : 0;
  const projectedRevenue = Math.round(todayD >= endD ? rev : dailyAverage * totalDays);
  const pacePercent = tgt ? Math.round((projectedRevenue / tgt) * 10000) / 100 : 0;
  const dailyNeeded = daysRemaining > 0 ? Math.ceil(Math.max(tgt - rev, 0) / daysRemaining) : Math.max(Math.ceil(tgt - rev), 0);
  return { pace_percent: pacePercent, projected_revenue: projectedRevenue, days_elapsed: elapsedDays, days_remaining: daysRemaining, daily_needed: dailyNeeded };
}

function salesRowsForUserPeriod(userId, start, end) {
  return (db.sales || []).filter(sa => Number(sa.user_id) === Number(userId) && dateVal(sa.sale_date) >= start && dateVal(sa.sale_date) < end);
}

function salesProgressForUserPeriod(userId, start, end) {
  const months = monthKeysBetween(start, end);
  const rows = salesRowsForUserPeriod(userId, start, end);
  const revenue = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const bill_count = rows.reduce((sum, r) => sum + Number(r.bill_count || 0), 0);
  const item_count = rows.reduce((sum, r) => sum + Number(r.item_count || 0), 0);
  const targets = aggregateKpiTargetsForUser(userId, months);
  const target = targets.target;
  const last_update = rows.reduce((latest, r) => {
    const val = r.updated_at || r.created_at || r.sale_date || null;
    return val && (!latest || val > latest) ? val : latest;
  }, null);
  return {
    revenue,
    target,
    target_upt: targets.target_upt,
    target_atv: targets.target_atv,
    target_cr: targets.target_cr,
    bill_count,
    item_count,
    upt: bill_count ? Math.round((item_count / bill_count) * 100) / 100 : 0,
    atv: bill_count ? Math.round(revenue / bill_count) : 0,
    asp: item_count ? Math.round(revenue / item_count) : 0,
    cr: 0,
    ...periodPaceMetrics(start, end, target, revenue),
    last_update
  };
}

function salesStaffForStore(storeId) {
  return db.users.filter(u => u.status === 'active' && Number(u.store_id) === Number(storeId) && u.role === 'employee');
}

function storeMonthlyTarget(storeId, month) {
  // Target cửa hàng/quản lý = tổng target cá nhân của toàn bộ nhân viên cửa hàng.
  // Không cộng target riêng của quản lý để tránh tính trùng.
  return salesStaffForStore(storeId).reduce((sum, u) => sum + monthlyTargetForUser(u.id, month), 0);
}

function storeSalesProgressForPeriod(storeId, start, end) {
  const months = monthKeysBetween(start, end);
  const rows = (db.sales || []).filter(sa => Number(sa.store_id) === Number(storeId) && dateVal(sa.sale_date) >= start && dateVal(sa.sale_date) < end);
  const revenue = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const bill_count = rows.reduce((sum, r) => sum + Number(r.bill_count || 0), 0);
  const item_count = rows.reduce((sum, r) => sum + Number(r.item_count || 0), 0);
  const targets = aggregateKpiTargetsForStore(storeId, months);
  const target = targets.target;
  const customer_count = (db.sales_store_days || [])
    .filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.sale_date) >= start && dateVal(x.sale_date) < end)
    .reduce((sum, x) => sum + Number(x.customer_count || 0), 0);
  const last_update = rows.reduce((latest, r) => {
    const val = r.updated_at || r.created_at || r.sale_date || null;
    return val && (!latest || val > latest) ? val : latest;
  }, null);
  return {
    revenue,
    target,
    target_upt: targets.target_upt,
    target_atv: targets.target_atv,
    target_cr: targets.target_cr,
    bill_count,
    item_count,
    customer_count,
    upt: bill_count ? Math.round((item_count / bill_count) * 100) / 100 : 0,
    atv: bill_count ? Math.round(revenue / bill_count) : 0,
    asp: item_count ? Math.round(revenue / item_count) : 0,
    cr: customer_count ? Math.round((bill_count / customer_count) * 10000) / 100 : 0,
    ...periodPaceMetrics(start, end, target, revenue),
    last_update
  };
}

function canViewStoreSales(user, storeId) {
  if (user.role === 'admin') return true;
  if (!userHasStore(user, storeId)) return false;
  return Number(user.permissions.can_view_store_sales_summary) === 1 || Number(user.permissions.can_manage_sales) === 1 || Number(user.permissions.can_view_sales_target) === 1;
}

function upsertStoreSalesDay(storeId, saleDate, customerCount, note, actorId) {
  db.sales_store_days = db.sales_store_days || [];
  const d = dateOnly(saleDate || new Date());
  let row = db.sales_store_days.find(x => Number(x.store_id) === Number(storeId) && String(x.sale_date) === d);
  if (row) {
    row.customer_count = toNumber(customerCount, 0);
    row.note = note || '';
    row.updated_by = actorId;
    row.updated_at = nowIso();
  } else {
    row = { id: nextId('sales_store_days'), store_id: Number(storeId), sale_date: d, customer_count: toNumber(customerCount, 0), note: note || '', created_by: actorId, created_at: nowIso(), updated_by: actorId, updated_at: nowIso() };
    db.sales_store_days.push(row);
  }
  return row;
}

function upsertSalesRow(employee, saleDate, payload, actorId) {
  const d = dateOnly(saleDate || new Date());
  let row = (db.sales || []).find(sa => Number(sa.user_id) === Number(employee.id) && String(sa.sale_date) === d);
  if (row) {
    row.revenue = toNumber(payload.revenue, 0);
    row.bill_count = toNumber(payload.bill_count, 0);
    row.item_count = toNumber(payload.item_count, 0);
    row.note = payload.note || '';
    row.updated_by = actorId;
    row.updated_at = nowIso();
  } else {
    row = { id: nextId('sales'), user_id: employee.id, store_id: employee.store_id, sale_date: d, revenue: toNumber(payload.revenue, 0), bill_count: toNumber(payload.bill_count, 0), item_count: toNumber(payload.item_count, 0), note: payload.note || '', created_by: actorId, created_at: nowIso(), updated_by: actorId, updated_at: nowIso() };
    db.sales.push(row);
  }
  return row;
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}
function toCsv(rows) {
  if (!rows.length) return 'Không có dữ liệu\n';
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n');
}
function loadChecklists() {
  const runtimePath = path.join(DATA_DIR, 'checklists.json');
  const sourcePath = path.join(ROOT, 'data', 'checklists.json');
  const filePath = fs.existsSync(runtimePath) ? runtimePath : sourcePath;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
function dateVal(v) { return dateOnly(v || new Date()); }

function addDaysIso(dateStr, days) {
  const raw = dateOnly(dateStr);
  const [y, m, d] = raw.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}
function dateRangeEvery(start, end, every = 1) {
  const out = [];
  const step = Math.max(1, Number(every || 1));
  let cur = dateOnly(start);
  const last = dateOnly(end || start);
  let guard = 0;
  while (cur <= last && guard < 370) {
    out.push(cur);
    cur = addDaysIso(cur, step);
    guard += 1;
  }
  return out;
}
function shiftLabelByIds(ids) {
  const set = new Set((ids || []).map(Number));
  return activeShifts().filter(sh => set.has(Number(sh.id))).map(sh => sh.code || sh.name).join(', ');
}
function scheduledUsersByShift(storeId, workDate, shiftIds = []) {
  const set = new Set((shiftIds || []).map(Number).filter(Boolean));
  if (!set.size) return [];
  return (db.work_schedules || [])
    .filter(x => x.status !== 'deleted' && Number(x.store_id) === Number(storeId) && String(x.work_date) === String(workDate) && set.has(Number(x.shift_id)))
    .map(x => Number(x.user_id));
}

function taskRowsForUser(user) {
  let rows = db.task_assignees.map(ta => {
    const t = db.tasks.find(x => Number(x.id) === Number(ta.task_id));
    const ass = getUser(ta.user_id);
    if (!t || !ass) return null;
    const s = getStore(t.store_id);
    const creator = getUser(t.created_by);
    return {
      assignment_id: ta.id,
      assignee_id: ta.user_id,
      assignee_name: ass.full_name,
      completed_at: ta.completed_at || null,
      evidence_path: ta.evidence_path || null,
      evidence_note: ta.evidence_note || '',
      points_delta: ta.points_delta || 0,
      ...t,
      store_name: s ? s.name : '',
      created_by_name: creator ? creator.full_name : ''
    };
  }).filter(Boolean);
  if (user.role === 'employee') rows = rows.filter(r => Number(r.assignee_id) === Number(user.id));
  else if (user.role === 'manager') rows = rows.filter(r => userHasStore(user, r.store_id));
  return rows.map(r => ({ ...r, status: taskStatus(r) })).sort((a, b) => new Date(a.due_at) - new Date(b.due_at) || new Date(b.created_at) - new Date(a.created_at));
}

function violationRowsForUser(user) {
  let rows = db.violations.map(v => {
    const emp = getUser(v.user_id);
    const s = getStore(v.store_id);
    const c = getUser(v.created_by);
    return { ...v, employee_name: emp ? emp.full_name : '', store_name: s ? s.name : '', created_by_name: c ? c.full_name : '' };
  });
  if (user.role === 'employee') rows = rows.filter(v => Number(v.user_id) === Number(user.id));
  else if (user.role === 'manager') rows = rows.filter(v => userHasStore(user, v.store_id));
  return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function bonusRowsForUser(user) {
  let rows = (db.bonuses || []).map(b => {
    const emp = getUser(b.user_id);
    const store = getStore(b.store_id);
    const creator = getUser(b.created_by);
    return { ...b, employee_name: emp ? emp.full_name : '', store_name: store ? store.name : '', created_by_name: creator ? creator.full_name : '' };
  });
  const canViewAll = user.role === 'admin' || Number(user.permissions.can_view_bonuses) === 1;
  if (!canViewAll && user.role === 'manager') rows = rows.filter(b => userHasStore(user, b.store_id));
  if (!canViewAll && user.role === 'employee') rows = rows.filter(b => Number(b.user_id) === Number(user.id));
  return rows.sort((a, b) => new Date(b.bonus_date) - new Date(a.bonus_date) || new Date(b.created_at) - new Date(a.created_at));
}

function bonusSummaryForUser(user) {
  const rows = bonusRowsForUser(user);
  const map = new Map();
  rows.forEach(b => {
    const key = String(b.user_id);
    const row = map.get(key) || {
      user_id: b.user_id,
      employee_name: b.employee_name,
      store_id: b.store_id,
      store_name: b.store_name,
      total_amount: 0,
      hotbill_amount: 0,
      week_amount: 0,
      kpi_amount: 0,
      other_amount: 0,
      entries_count: 0,
      latest_date: b.bonus_date || null,
      latest_note: ''
    };
    const amount = Number(b.amount || 0);
    row.total_amount += amount;
    row.entries_count += 1;
    const type = String(b.bonus_type || '').toLowerCase();
    if (type.includes('hotbill')) row.hotbill_amount += amount;
    else if (type.includes('tuần') || type.includes('tuan')) row.week_amount += amount;
    else if (type.includes('kpi')) row.kpi_amount += amount;
    else row.other_amount += amount;
    if (!row.latest_date || String(b.bonus_date || '') >= String(row.latest_date)) {
      row.latest_date = b.bonus_date || row.latest_date;
      row.latest_note = b.note || '';
    }
    map.set(key, row);
  });
  return Array.from(map.values()).sort((a, b) => Number(b.total_amount) - Number(a.total_amount) || a.employee_name.localeCompare(b.employee_name, 'vi'));
}

function assessmentRowsForUser(user, templateId) {
  let rows = db.assessments.map(a => {
    const s = getStore(a.store_id);
    const emp = getUser(a.employee_id);
    const c = getUser(a.created_by);
    return { ...a, store_name: s ? s.name : '', employee_name: emp ? emp.full_name : '', created_by_name: c ? c.full_name : '' };
  });
  if (user.role === 'employee') {
    rows = rows.filter(a => (a.target_type === 'employee' && Number(a.employee_id) === Number(user.id)) || (a.target_type === 'store' && userHasStore(user, a.store_id)));
  } else if (user.role === 'manager') {
    rows = rows.filter(a => userHasStore(user, a.store_id));
  }
  if (templateId) rows = rows.filter(a => a.template_id === templateId);
  return rows.sort((a, b) => new Date(b.assessed_at) - new Date(a.assessed_at)).slice(0, 300);
}

function leaderboardRows(user, period, refDate, storeId = null, options = {}) {
  const { start, end } = periodRange(period, refDate);
  // Bảng doanh thu chỉ hiển thị nhân viên bán hàng, không đưa quản lý vào bảng này.
  let people = db.users.filter(u => u.status === 'active' && u.role === 'employee');
  const requestedStoreId = storeId ? Number(storeId) : null;
  if (requestedStoreId) {
    people = people.filter(u => Number(getPrimaryStoreId(u)) === Number(requestedStoreId));
  } else if (options.includeAllStores) {
    // Màn Tổng quan: cho phép xem bảng xếp hạng theo % đạt target toàn hệ thống.
    // Không truyền store_id để tránh bị khóa theo cửa hàng ở khu vực này.
  } else if (user.role !== 'admin') {
    const canViewStoreScope = user.role === 'manager' || Number(user.permissions.can_manage_sales) === 1 || Number(user.permissions.can_view_sales_target) === 1 || Number(user.permissions.can_view_store_sales_summary) === 1;
    people = canViewStoreScope ? people.filter(u => userHasStore(user, getPrimaryStoreId(u))) : people.filter(u => Number(u.id) === Number(user.id));
  }
  const rows = people.map(u => {
    const progress = salesProgressForUserPeriod(u.id, start, end);
    const guestsRows = db.assessments.filter(a => a.template_id === 'GUESTS' && Number(a.employee_id) === Number(u.id) && dateVal(a.assessed_at) >= start && dateVal(a.assessed_at) < end);
    const guests_percent = guestsRows.length ? guestsRows.reduce((sum, a) => sum + Number(a.percent || 0), 0) / guestsRows.length : 0;
    const achievement_percent = progress.target ? Math.round((progress.revenue / progress.target) * 10000) / 100 : 0;
    return { user_id: u.id, full_name: u.full_name, role: u.role, is_store_total: false, store_name: getStore(u.store_id)?.name || '', revenue: progress.revenue, target: progress.target, target_upt: progress.target_upt, target_atv: progress.target_atv, target_cr: progress.target_cr, achievement_percent, bill_count: progress.bill_count, item_count: progress.item_count, upt: progress.upt, atv: progress.atv, asp: progress.asp, cr: progress.cr, pace_percent: progress.pace_percent, projected_revenue: progress.projected_revenue, days_elapsed: progress.days_elapsed, days_remaining: progress.days_remaining, daily_needed: progress.daily_needed, guests_percent, last_update: progress.last_update };
  }).sort((a, b) => b.achievement_percent - a.achievement_percent || b.revenue - a.revenue || b.guests_percent - a.guests_percent);
  const employeeTotal = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  return { period, start, end, leaderboard: rows.map((r, idx) => ({ ...r, rank: idx + 1, revenue_percent: employeeTotal ? Math.round((r.revenue / employeeTotal) * 10000) / 100 : 0 })) };
}

function computePerformance(scopeUser) {
  const now = new Date();
  let users = db.users.filter(u => u.status === 'active' && ['employee', 'manager'].includes(u.role));
  if (scopeUser.role === 'manager') users = users.filter(u => userHasStore(scopeUser, u.store_id));
  if (scopeUser.role === 'employee') users = users.filter(u => Number(u.id) === Number(scopeUser.id));
  const { start, end } = periodRange('month', now);
  return users.map(u => {
    const assignments = db.task_assignees.filter(ta => Number(ta.user_id) === Number(u.id)).map(ta => {
      const t = db.tasks.find(x => Number(x.id) === Number(ta.task_id));
      return t ? { completed_at: ta.completed_at, due_at: t.due_at } : null;
    }).filter(Boolean);
    let onTime = 0, late = 0, overdue = 0;
    assignments.forEach(a => {
      if (a.completed_at) {
        if (new Date(a.completed_at) <= new Date(a.due_at)) onTime += 1; else late += 1;
      } else if (now > new Date(a.due_at)) overdue += 1;
    });
    const totalTasks = assignments.length;
    const taskScore = totalTasks ? Math.max(0, Math.round((onTime / totalTasks) * 100 - late * 5 - overdue * 10)) : 100;
    const vRows = db.violations.filter(v => Number(v.user_id) === Number(u.id));
    const violationDeductions = vRows.reduce((sum, v) => sum + Number(v.points_deducted || 0), 0);
    const violationScore = Math.max(0, 100 - violationDeductions);
    const gRows = db.assessments.filter(a => a.template_id === 'GUESTS' && Number(a.employee_id) === Number(u.id));
    const guestScore = gRows.length ? Math.round(gRows.reduce((sum, a) => sum + Number(a.percent || 0), 0) / gRows.length) : 0;
    const progress = u.role === 'manager' ? storeSalesProgressForPeriod(u.store_id, start, end) : salesProgressForUserPeriod(u.id, start, end);
    const revenue = progress.revenue;
    const target = progress.target;
    const achievement_percent = target ? Math.round((revenue / target) * 10000) / 100 : 0;
    const revenueScore = target ? Math.min(100, Math.round(achievement_percent)) : 0;
    const trainingOverdue = overdueTrainingCountForUser(u.id);
    const trainingDeduction = trainingOverdue * 10;
    const finalScore = Math.round(taskScore * 0.35 + violationScore * 0.20 + guestScore * 0.25 + revenueScore * 0.20 - trainingDeduction);
    return {
      user_id: u.id,
      full_name: u.full_name,
      store_name: getStore(u.store_id)?.name || '',
      tasks_total: totalTasks,
      tasks_on_time: onTime,
      tasks_late: late,
      tasks_overdue: overdue,
      task_score: taskScore,
      violations_count: vRows.length,
      violation_deductions: violationDeductions,
      violation_score: violationScore,
      guests_score: guestScore,
      revenue,
      target,
      achievement_percent,
      revenue_score: revenueScore,
      training_overdue: trainingOverdue,
      training_deduction: trainingDeduction,
      final_score: Math.min(100, Math.max(0, finalScore))
    };
  });
}

function storeSummaryRows(user) {
  let stores = db.stores.filter(s => s.status === 'active');
  if (user.role === 'manager') stores = stores.filter(s => userHasStore(user, s.id));
  if (user.role === 'employee') stores = stores.filter(s => userHasStore(user, s.id));
  return stores.map(s => {
    const ops = db.assessments.filter(a => Number(a.store_id) === Number(s.id) && a.template_id === 'OPS');
    const vm = db.assessments.filter(a => Number(a.store_id) === Number(s.id) && a.template_id === 'VM');
    const avg = rows => rows.length ? rows.reduce((sum, a) => sum + Number(a.percent || 0), 0) / rows.length : 0;
    const violations = db.violations.filter(v => Number(v.store_id) === Number(s.id)).length;
    return { store_id: s.id, store_name: s.name, ops_score: avg(ops), vm_score: avg(vm), violations };
  });
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const row = db.users.find(u => u.status === 'active' && String(u.username).toLowerCase() === String(username || '').trim().toLowerCase());
  if (!row || !bcrypt.compareSync(String(password || ''), row.password_hash)) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
  const token = jwt.sign({ id: row.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: publicUser(row) });
});

app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }));

app.patch('/api/me/password', requireAuth, (req, res) => {
  const { current_password, new_password, confirm_password } = req.body || {};
  const current = String(current_password || '');
  const next = String(new_password || '');
  const confirm = String(confirm_password || '');
  if (!current || !next || !confirm) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và nhập lại mật khẩu mới' });
  if (next.length < 6) return res.status(400).json({ error: 'Mật khẩu mới cần tối thiểu 6 ký tự' });
  if (next !== confirm) return res.status(400).json({ error: 'Mật khẩu mới và nhập lại mật khẩu mới chưa khớp' });
  const row = getActiveUser(req.user.id);
  if (!row || !bcrypt.compareSync(current, row.password_hash)) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
  if (bcrypt.compareSync(next, row.password_hash)) return res.status(400).json({ error: 'Mật khẩu mới không được trùng mật khẩu hiện tại' });
  row.password_hash = bcrypt.hashSync(next, 10);
  row.password_changed_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.get('/api/bootstrap', requireAuth, (req, res) => {
  const stores = db.stores.filter(s => s.status === 'active').sort((a, b) => a.id - b.id).map(clone);
  let users = db.users.filter(u => u.status === 'active');
  if (req.user.role === 'manager') users = users.filter(u => userHasStore(req.user, u.store_id));
  users = users.sort((a, b) => Number(getPrimaryStoreId(a) || 0) - Number(getPrimaryStoreId(b) || 0) || a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name, 'vi')).map(publicUser);
  res.json({ stores, users, currentUser: req.user });
});

app.get('/api/users', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const users = db.users
    .filter(u => u.status === 'active')
    .slice()
    .sort((a, b) => Number(getPrimaryStoreId(a) || 0) - Number(getPrimaryStoreId(b) || 0) || a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name, 'vi'))
    .map(publicUser);
  res.json({ users });
});

app.post('/api/users', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const { full_name, username, password, role, store_id, store_ids, permissions } = req.body || {};
  if (!full_name || !username || !password || !['admin', 'manager', 'employee'].includes(role)) return res.status(400).json({ error: 'Thiếu thông tin tài khoản' });
  if (db.users.some(u => String(u.username).toLowerCase() === String(username).trim().toLowerCase())) return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
  const id = nextId('users');
  const normalizedStoreIds = normalizeStoreIds(Array.isArray(store_ids) ? store_ids : (store_id ? [store_id] : []));
  db.users.push({ id, full_name: String(full_name).trim(), username: String(username).trim(), password_hash: bcrypt.hashSync(String(password), 10), role, store_id: normalizedStoreIds[0] || null, store_ids: normalizedStoreIds, status: 'active', created_at: nowIso() });
  setPermissions(id, role, permissions || {});
  saveDb();
  res.json({ ok: true, id });
});

app.patch('/api/users/:id', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const id = Number(req.params.id);
  const existing = getUser(id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
  const { full_name, role, store_id, store_ids, status, password, permissions } = req.body || {};
  if (full_name) existing.full_name = full_name;
  if (role && ['admin', 'manager', 'employee'].includes(role)) existing.role = role;
  const nextStoreIds = store_ids === undefined ? getUserStoreIds(existing) : normalizeStoreIds(Array.isArray(store_ids) ? store_ids : (store_id ? [store_id] : []));
  existing.store_ids = nextStoreIds;
  existing.store_id = nextStoreIds[0] || null;
  if (status) existing.status = status;
  if (password) existing.password_hash = bcrypt.hashSync(String(password), 10);
  setPermissions(id, existing.role, permissions || getPermissions(id, existing.role));
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/users/:id', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const id = Number(req.params.id);
  const existing = getUser(id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
  if (Number(existing.id) === Number(req.user.id)) return res.status(400).json({ error: 'Không thể xóa chính tài khoản đang đăng nhập' });
  if (existing.role === 'admin') {
    const activeAdmins = db.users.filter(u => u.status === 'active' && u.role === 'admin');
    if (activeAdmins.length <= 1) return res.status(400).json({ error: 'Không thể xóa admin cuối cùng của hệ thống' });
  }
  existing.status = 'inactive';
  existing.deleted_at = nowIso();
  existing.deleted_by = req.user.id;
  existing.username = `${existing.username}__deleted_${existing.id}_${Date.now()}`;
  saveDb();
  res.json({ ok: true });
});

app.get('/api/tasks', requireAuth, (req, res) => res.json({ tasks: taskRowsForUser(req.user) }));

app.post('/api/tasks', requireAuth, requirePerm('can_assign_tasks'), (req, res) => {
  const { title, description, due_at, priority, store_id, assignee_ids, score_value, start_date, end_date, due_time, repeat_every_days, shift_ids } = req.body || {};
  const manualAssignees = Array.isArray(assignee_ids) ? assignee_ids.map(Number).filter(Boolean) : [];
  const selectedShiftIds = Array.isArray(shift_ids) ? shift_ids.map(Number).filter(Boolean) : [];
  const useMultiDate = !!(start_date && end_date);
  if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề công việc' });
  if (!useMultiDate && !due_at) return res.status(400).json({ error: 'Vui lòng nhập hạn hoàn thành hoặc chọn khoảng ngày giao việc' });
  if (!manualAssignees.length && !selectedShiftIds.length) return res.status(400).json({ error: 'Vui lòng chọn nhân viên hoặc chọn ca giao việc' });
  const storeId = req.user.role === 'admin' ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
  if (!storeId || !canAccessStore(req, storeId)) return res.status(403).json({ error: 'Không có quyền giao việc cửa hàng này' });
  const dates = useMultiDate ? dateRangeEvery(start_date, end_date, repeat_every_days || 1) : [dateOnly(due_at)];
  if (!dates.length) return res.status(400).json({ error: 'Khoảng ngày giao việc không hợp lệ' });
  const shiftText = shiftLabelByIds(selectedShiftIds);
  let createdTasks = 0;
  let createdAssignments = 0;
  const batchId = `TASK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  dates.forEach(workDate => {
    const ids = new Set(manualAssignees);
    scheduledUsersByShift(storeId, workDate, selectedShiftIds).forEach(uid => ids.add(uid));
    const validUsers = Array.from(ids).filter(uid => {
      const u = getActiveUser(uid);
      return u && u.role !== 'admin' && userHasStore(u, storeId);
    });
    if (!validUsers.length) return;
    const taskId = nextId('tasks');
    const dueAt = useMultiDate ? `${workDate}T${due_time || '22:00'}` : due_at;
    const extraDesc = [];
    if (useMultiDate) extraDesc.push(`Giao cố định/nhiều ngày: ${dateOnly(start_date)} đến ${dateOnly(end_date)}, lặp mỗi ${Math.max(1, Number(repeat_every_days || 1))} ngày.`);
    if (shiftText) extraDesc.push(`Áp dụng ca: ${shiftText}.`);
    db.tasks.push({
      id: taskId,
      title,
      description: [description || '', extraDesc.join(' ')].filter(Boolean).join('\n'),
      priority: priority || 'medium',
      due_at: dueAt,
      task_date: workDate,
      shift_ids: selectedShiftIds,
      shift_label: shiftText,
      recurrence_batch: useMultiDate ? batchId : null,
      recurrence_label: useMultiDate ? `Lặp mỗi ${Math.max(1, Number(repeat_every_days || 1))} ngày` : '',
      store_id: storeId,
      score_value: Number(score_value || 10),
      created_by: req.user.id,
      created_at: nowIso()
    });
    [...new Set(validUsers)].forEach(uid => {
      db.task_assignees.push({ id: nextId('task_assignees'), task_id: taskId, user_id: uid, completed_at: null, evidence_path: null, evidence_note: '', points_delta: 0 });
      createdAssignments += 1;
    });
    createdTasks += 1;
  });
  if (!createdAssignments) return res.status(400).json({ error: 'Không có nhân viên hợp lệ trong ngày/ca đã chọn. Hãy kiểm tra lịch làm việc hoặc chọn nhân viên thủ công.' });
  saveDb();
  res.json({ ok: true, created_tasks: createdTasks, created_assignments: createdAssignments });
});

app.post('/api/tasks/:assignmentId/complete', requireAuth, upload.array('evidence', 10), (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const ta = db.task_assignees.find(x => Number(x.id) === assignmentId);
  const t = ta ? db.tasks.find(x => Number(x.id) === Number(ta.task_id)) : null;
  if (!ta || !t) return res.status(404).json({ error: 'Không tìm thấy công việc' });
  const isOwner = Number(ta.user_id) === Number(req.user.id);
  const canManagerAct = req.user.role !== 'employee' && canAccessStore(req, t.store_id);
  if (!isOwner && !canManagerAct) return res.status(403).json({ error: 'Chỉ nhân viên được giao hoặc quản lý cửa hàng được hoàn thành việc này' });
  const evidencePath = saveUploadedFiles(req.files);
  const completedAt = nowIso();
  const late = new Date(completedAt) > new Date(t.due_at);
  ta.completed_at = completedAt;
  if (evidencePath) ta.evidence_path = evidencePath;
  ta.evidence_note = req.body.note || '';
  ta.points_delta = late ? -Math.abs(Number(t.score_value || 10)) : 0;
  saveDb();
  res.json({ ok: true, status: late ? 'completed_late' : 'completed_on_time', points_delta: ta.points_delta });
});

app.get('/api/violations', requireAuth, (req, res) => res.json({ violations: violationRowsForUser(req.user) }));

app.post('/api/violations', requireAuth, requirePerm('can_manage_violations'), upload.array('evidence', 10), (req, res) => {
  const { user_id, violation_type, description, points_deducted } = req.body || {};
  const target = getActiveUser(Number(user_id));
  if (!target) return res.status(400).json({ error: 'Nhân viên không hợp lệ' });
  if (req.user.role !== 'admin' && !userHasStore(req.user, target.store_id)) return res.status(403).json({ error: 'Không có quyền ghi nhận vi phạm nhân viên này' });
  const id = nextId('violations');
  db.violations.push({ id, user_id: target.id, store_id: target.store_id, violation_type: violation_type || 'Vi phạm vận hành', description: description || '', points_deducted: Math.abs(Number(points_deducted || 0)), evidence_path: saveUploadedFiles(req.files), created_by: req.user.id, created_at: nowIso() });
  saveDb();
  res.json({ ok: true, id });
});

app.get('/api/checklist/templates', requireAuth, (_req, res) => res.json({ templates: loadChecklists() }));

app.post('/api/checklist/assessments', requireAuth, requirePerm('can_grade_checklists'), (req, res) => {
  const { template_id, store_id, employee_id, assessed_at, general_note, scores } = req.body || {};
  const template = loadChecklists().find(t => t.id === template_id);
  if (!template) return res.status(400).json({ error: 'Checklist không hợp lệ' });
  let storeId = Number(store_id || req.user.store_id);
  let empId = employee_id ? Number(employee_id) : null;
  if (template.target_type === 'employee') {
    const emp = getActiveUser(empId);
    if (!emp || !emp.store_id) return res.status(400).json({ error: 'Đại sứ kinh doanh không hợp lệ' });
    if (req.user.role !== 'admin' && !userHasStore(req.user, emp.store_id)) return res.status(403).json({ error: 'Không có quyền chấm nhân viên này' });
    storeId = Number(emp.store_id);
  } else {
    empId = null;
  }
  if (!storeId || !canAccessStore(req, storeId)) return res.status(403).json({ error: 'Không có quyền chấm cửa hàng này' });
  const scoreMap = scores || {};
  let total = 0;
  template.items.forEach(item => {
    const raw = typeof scoreMap[item.id] === 'object' ? scoreMap[item.id].score : scoreMap[item.id];
    total += Math.max(0, Math.min(Number(item.max_score), toNumber(raw, 0)));
  });
  const max = template.max_score || template.items.reduce((s, i) => s + Number(i.max_score || 0), 0);
  const percent = max ? Math.round((total / max) * 10000) / 100 : 0;
  const assessmentId = nextId('assessments');
  db.assessments.push({ id: assessmentId, template_id: template.id, target_type: template.target_type, store_id: storeId, employee_id: empId, assessed_at: assessed_at || nowIso(), total_score: total, max_score: max, percent, general_note: general_note || '', created_by: req.user.id, created_at: nowIso() });
  template.items.forEach(item => {
    const input = scoreMap[item.id];
    const raw = typeof input === 'object' ? input.score : input;
    const note = typeof input === 'object' ? input.note : '';
    const score = Math.max(0, Math.min(Number(item.max_score), toNumber(raw, 0)));
    db.assessment_items.push({ id: nextId('assessment_items'), assessment_id: assessmentId, item_id: item.id, score, note: note || '' });
  });
  saveDb();
  res.json({ ok: true, id: assessmentId, total_score: total, max_score: max, percent });
});

app.get('/api/checklist/assessments', requireAuth, (req, res) => res.json({ assessments: assessmentRowsForUser(req.user, req.query.template_id) }));

app.get('/api/checklist/assessments/:id', requireAuth, (req, res) => {
  const a = assessmentRowsForUser(req.user).find(x => Number(x.id) === Number(req.params.id));
  if (!a) return res.status(404).json({ error: 'Không tìm thấy phiếu chấm hoặc không có quyền xem' });
  const template = loadChecklists().find(t => t.id === a.template_id);
  const items = db.assessment_items
    .filter(i => Number(i.assessment_id) === Number(a.id))
    .map(i => {
      const item = template?.items?.find(x => String(x.id) === String(i.item_id));
      const section = template?.sections?.find(sec => String(sec.id) === String(item?.section_id));
      return { ...i, title: item?.title || i.item_id, max_score: item?.max_score || 0, section_id: item?.section_id || '', section_title: section?.title || '' };
    });
  res.json({ assessment: a, items });
});

app.post('/api/sales', requireAuth, requireAnyPerm('can_manage_total_sales','can_manage_sales'), (req, res) => {
  const { user_id, sale_date, revenue, bill_count, item_count, customer_count, note } = req.body || {};
  const employee = getActiveUser(Number(user_id));
  if (!employee || employee.role !== 'employee') return res.status(400).json({ error: 'Chỉ nhập doanh thu cho nhân viên bán hàng' });
  if (req.user.role !== 'admin' && !userHasStore(req.user, employee.store_id)) return res.status(403).json({ error: 'Không có quyền nhập doanh thu nhân viên này' });
  const row = upsertSalesRow(employee, sale_date, { revenue, bill_count, item_count, note }, req.user.id);
  if (customer_count !== undefined && customer_count !== null && customer_count !== '') upsertStoreSalesDay(employee.store_id, sale_date, customer_count, '', req.user.id);
  saveDb();
  res.json({ ok: true, id: row.id });
});


function addDaysUtc(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}
function weekStartOf(value) {
  const d = new Date(`${dateOnly(value || new Date())}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}
function daysInMonthKey(month) {
  const [y, m] = String(month).split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function datesBetween(start, end) {
  const out = [];
  let d = start;
  while (d < end) { out.push(d); d = addDaysUtc(d, 1); }
  return out;
}
function proratedTargetForUser(userId, start, end) {
  return datesBetween(start, end).reduce((sum, d) => {
    const month = d.slice(0, 7);
    const t = monthlyKpiTargetsForUser(userId, month).target_revenue || 0;
    return sum + (Number(t) / Math.max(daysInMonthKey(month), 1));
  }, 0);
}
function weeklyReportRow(storeId, weekStart) {
  db.weekly_reports = db.weekly_reports || [];
  return db.weekly_reports.find(r => Number(r.store_id) === Number(storeId) && String(r.week_start) === String(weekStart)) || null;
}
function parseWeeklyList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (_err) { return []; }
}
function normalizeWeeklyProducts(value) {
  return parseWeeklyList(value).map(item => ({
    name: String(item.name || item.product_name || '').trim(),
    sku: String(item.sku || '').trim(),
    quantity: toNumber(item.quantity || item.qty, 0),
    bill_count: toNumber(item.bill_count, 0),
    note: String(item.note || '').trim()
  })).filter(item => item.name || item.sku || item.quantity).slice(0, 5);
}
function normalizeWeeklyPromotions(value) {
  return parseWeeklyList(value).map(item => ({
    name: String(item.name || item.promotion_name || '').trim(),
    bill_count: toNumber(item.bill_count || item.bills, 0),
    note: String(item.note || '').trim()
  })).filter(item => item.name || item.bill_count).slice(0, 20);
}
function buildWeeklyReport(user, rawWeekStart, rawStoreId) {
  const week_start = weekStartOf(rawWeekStart || new Date());
  const week_end = addDaysUtc(week_start, 6);
  const endExclusive = addDaysUtc(week_start, 7);
  const storeId = user.role === 'admin' ? Number(rawStoreId || getPrimaryStoreId(user) || db.stores[0]?.id) : Number(getPrimaryStoreId(user));
  const store = getStore(storeId);
  if (!store) throw new Error('Cửa hàng không hợp lệ');
  if (user.role !== 'admin' && Number(user.permissions.can_view_weekly_report) !== 1 && Number(user.permissions.can_manage_weekly_report) !== 1) throw new Error('Không có quyền xem báo cáo tuần');
  const days = datesBetween(week_start, endExclusive);
  const salesRows = (db.sales || []).filter(sa => Number(sa.store_id) === Number(storeId) && dateVal(sa.sale_date) >= week_start && dateVal(sa.sale_date) < endExclusive);
  const dailyMap = new Map(days.map(d => [d, { sale_date: d, revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, target_revenue: 0, upt: 0, atv: 0, asp: 0, cr: 0, achievement_percent: 0, note: '' }]));
  salesRows.forEach(r => {
    const d = dateVal(r.sale_date);
    const row = dailyMap.get(d);
    if (!row) return;
    row.revenue += Number(r.revenue || 0);
    row.bill_count += Number(r.bill_count || 0);
    row.item_count += Number(r.item_count || 0);
  });
  (db.sales_store_days || []).filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.sale_date) >= week_start && dateVal(x.sale_date) < endExclusive).forEach(x => {
    const d = dateVal(x.sale_date);
    const row = dailyMap.get(d);
    if (!row) return;
    row.customer_count = Number(x.customer_count || 0);
    row.note = x.note || '';
  });
  (db.sales_daily_targets || []).filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.target_date) >= week_start && dateVal(x.target_date) < endExclusive).forEach(x => {
    const d = dateVal(x.target_date);
    const row = dailyMap.get(d);
    if (!row) return;
    row.target_revenue = Number(x.target_revenue || 0);
    row.target_upt = Number(x.target_upt || 0);
    row.target_atv = Number(x.target_atv || 0);
    row.target_cr = Number(x.target_cr || 0);
  });
  const daysRows = Array.from(dailyMap.values()).map(r => {
    r.upt = r.bill_count ? Math.round((r.item_count / r.bill_count) * 100) / 100 : 0;
    r.atv = r.bill_count ? Math.round(r.revenue / r.bill_count) : 0;
    r.asp = r.item_count ? Math.round(r.revenue / r.item_count) : 0;
    r.cr = r.customer_count ? Math.round((r.bill_count / r.customer_count) * 10000) / 100 : 0;
    r.achievement_percent = r.target_revenue ? Math.round((r.revenue / r.target_revenue) * 10000) / 100 : 0;
    return r;
  });
  const staff = salesStaffForStore(storeId);
  const employeeRows = staff.map(u => {
    const rows = salesRows.filter(r => Number(r.user_id) === Number(u.id));
    const revenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const bill_count = rows.reduce((s, r) => s + Number(r.bill_count || 0), 0);
    const item_count = rows.reduce((s, r) => s + Number(r.item_count || 0), 0);
    const target = Math.round(proratedTargetForUser(u.id, week_start, endExclusive));
    return { user_id: u.id, full_name: u.full_name, store_id: u.store_id, store_name: store.name, revenue, target, achievement_percent: target ? Math.round((revenue / target) * 10000) / 100 : 0, revenue_percent: 0, bill_count, item_count, upt: bill_count ? Math.round((item_count / bill_count) * 100) / 100 : 0, atv: bill_count ? Math.round(revenue / bill_count) : 0, asp: item_count ? Math.round(revenue / item_count) : 0 };
  }).sort((a, b) => b.revenue - a.revenue);
  const totals = daysRows.reduce((acc, r) => {
    acc.revenue += Number(r.revenue || 0);
    acc.bill_count += Number(r.bill_count || 0);
    acc.item_count += Number(r.item_count || 0);
    acc.customer_count += Number(r.customer_count || 0);
    acc.target_revenue += Number(r.target_revenue || 0);
    return acc;
  }, { revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, target_revenue: 0 });
  const proratedStoreTarget = Math.round(staff.reduce((sum, u) => sum + proratedTargetForUser(u.id, week_start, endExclusive), 0));
  if (!totals.target_revenue) totals.target_revenue = proratedStoreTarget;
  totals.upt = totals.bill_count ? Math.round((totals.item_count / totals.bill_count) * 100) / 100 : 0;
  totals.atv = totals.bill_count ? Math.round(totals.revenue / totals.bill_count) : 0;
  totals.asp = totals.item_count ? Math.round(totals.revenue / totals.item_count) : 0;
  totals.cr = totals.customer_count ? Math.round((totals.bill_count / totals.customer_count) * 10000) / 100 : 0;
  totals.achievement_percent = totals.target_revenue ? Math.round((totals.revenue / totals.target_revenue) * 10000) / 100 : 0;
  employeeRows.forEach(r => { r.revenue_percent = totals.revenue ? Math.round((r.revenue / totals.revenue) * 10000) / 100 : 0; });
  const feedback = weeklyReportRow(storeId, week_start) || { feedback: '', issues: '', action_plan: '', note: '', top_products: [], promotions: [] };
  const top_products = normalizeWeeklyProducts(feedback.top_products || []);
  const promotions = normalizeWeeklyPromotions(feedback.promotions || []);
  return { store_id: storeId, store_name: store.name, week_start, week_end, totals, days: daysRows, employees: employeeRows, top_products, promotions, feedback: { ...feedback, top_products, promotions } };
}

app.post('/api/sales/daily', requireAuth, requireAnyPerm('can_manage_total_sales','can_manage_sales'), (req, res) => {
  const { store_id, sale_date, customer_count, note, entries } = req.body || {};
  const storeId = req.user.role === 'admin' ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (req.user.role !== 'admin' && !userHasStore(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền nhập doanh thu cửa hàng này' });
  if (!Array.isArray(entries) || !entries.length) return res.status(400).json({ error: 'Chưa có dòng nhân viên để nhập doanh thu' });
  const saved = [];
  entries.forEach(entry => {
    const employee = getActiveUser(Number(entry.user_id));
    if (!employee || employee.role !== 'employee' || Number(employee.store_id) !== Number(storeId)) return;
    saved.push(upsertSalesRow(employee, sale_date, entry, req.user.id));
  });
  upsertStoreSalesDay(storeId, sale_date, customer_count, note, req.user.id);
  saveDb();
  res.json({ ok: true, count: saved.length });
});

app.post('/api/sales/targets', requireAuth, requirePerm('can_set_sales_targets'), (req, res) => {
  const { user_id, user_ids, target_month, target, target_revenue, target_upt, target_atv, target_cr, note } = req.body || {};
  const ids = Array.from(new Set((Array.isArray(user_ids) ? user_ids : (user_id ? [user_id] : [])).map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0)));
  if (!ids.length) return res.status(400).json({ error: 'Chọn ít nhất 1 nhân viên để nhập target' });
  if (!/^\d{4}-\d{2}$/.test(String(target_month || ''))) return res.status(400).json({ error: 'Tháng target không hợp lệ' });
  db.sales_targets = db.sales_targets || [];
  const revenueTarget = toNumber(target_revenue ?? target, 0);
  const saved = [];
  for (const id of ids) {
    const employee = getActiveUser(Number(id));
    if (!employee || employee.role !== 'employee') return res.status(400).json({ error: 'Chỉ nhập target cá nhân cho nhân viên bán hàng' });
    const employeeStoreId = getPrimaryStoreId(employee);
    if (req.user.role !== 'admin' && !userHasStore(req.user, employeeStoreId)) return res.status(403).json({ error: `Không có quyền nhập target cho ${employee.full_name}` });
    let row = db.sales_targets.find(t => Number(t.user_id) === Number(employee.id) && String(t.target_month) === String(target_month));
    if (row) {
      row.target = revenueTarget;
      row.target_revenue = revenueTarget;
      row.target_upt = toNumber(target_upt, 0);
      row.target_atv = toNumber(target_atv, 0);
      row.target_cr = toNumber(target_cr, 0);
      row.note = note || '';
      row.store_id = employeeStoreId;
      row.updated_by = req.user.id;
      row.updated_at = nowIso();
    } else {
      row = { id: nextId('sales_targets'), user_id: employee.id, store_id: employeeStoreId, target_month, target: revenueTarget, target_revenue: revenueTarget, target_upt: toNumber(target_upt, 0), target_atv: toNumber(target_atv, 0), target_cr: toNumber(target_cr, 0), note: note || '', created_by: req.user.id, created_at: nowIso(), updated_by: req.user.id, updated_at: nowIso() };
      db.sales_targets.push(row);
    }
    saved.push(row);
  }
  saveDb();
  res.json({ ok: true, count: saved.length, ids: saved.map(r => r.id) });
});


app.post('/api/sales/daily-targets', requireAuth, requirePerm('can_set_sales_targets'), (req, res) => {
  const { store_id, target_date, start_date, end_date, target_revenue, note } = req.body || {};
  let { dates } = req.body || {};
  const storeId = req.user.role === 'admin' ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (req.user.role !== 'admin' && !userHasStore(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền set target cửa hàng này' });

  // V4.42: cho phép chọn nhiều ngày rời rạc, không bắt buộc từ ngày - đến ngày.
  let selectedDates = [];
  if (Array.isArray(dates)) {
    selectedDates = dates;
  } else if (typeof dates === 'string' && dates.trim()) {
    try {
      const parsed = JSON.parse(dates);
      selectedDates = Array.isArray(parsed) ? parsed : String(dates).split(',');
    } catch (_err) {
      selectedDates = String(dates).split(',');
    }
  }

  if (!selectedDates.length) {
    const startInput = start_date || target_date;
    const endInput = end_date || startInput;
    if (!startInput || Number.isNaN(new Date(startInput).getTime())) return res.status(400).json({ error: 'Chọn ít nhất 1 ngày để set target' });
    if (!endInput || Number.isNaN(new Date(endInput).getTime())) return res.status(400).json({ error: 'Ngày kết thúc không hợp lệ' });
    const startD = dateOnly(startInput);
    const endD = dateOnly(endInput);
    if (endD < startD) return res.status(400).json({ error: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu' });
    selectedDates = dateRangeEvery(startD, endD, 1);
  }

  const cleanDates = [...new Set(selectedDates
    .map(d => String(d || '').trim())
    .filter(Boolean)
    .map(d => dateOnly(d))
    .filter(d => d && !Number.isNaN(new Date(d).getTime()))
  )].sort();
  if (!cleanDates.length) return res.status(400).json({ error: 'Chọn ít nhất 1 ngày hợp lệ' });
  if (cleanDates.length > 370) return res.status(400).json({ error: 'Chỉ được set tối đa 370 ngày/lần' });

  db.sales_daily_targets = db.sales_daily_targets || [];
  const saved = [];
  for (const d of cleanDates) {
    let row = db.sales_daily_targets.find(t => Number(t.store_id) === Number(storeId) && String(t.target_date) === d);
    if (row) {
      row.target_revenue = toNumber(target_revenue, 0);
      // UPT / ATV / CR ngày không set riêng nữa; hệ thống dùng target tháng.
      row.target_upt = 0;
      row.target_atv = 0;
      row.target_cr = 0;
      row.note = note || '';
      row.updated_by = req.user.id;
      row.updated_at = nowIso();
    } else {
      row = { id: nextId('sales_daily_targets'), store_id: storeId, target_date: d, target_revenue: toNumber(target_revenue, 0), target_upt: 0, target_atv: 0, target_cr: 0, note: note || '', created_by: req.user.id, created_at: nowIso(), updated_by: req.user.id, updated_at: nowIso() };
      db.sales_daily_targets.push(row);
    }
    saved.push(row);
  }
  saveDb();
  res.json({ ok: true, count: saved.length, dates: cleanDates, ids: saved.map(r => r.id) });
});

app.get('/api/sales/leaderboard', requireAuth, (req, res) => {
  const { period = 'month', date, store_id, scope } = req.query;
  const overviewPercentScope = String(scope || '') === 'overview_percent';
  const storeId = overviewPercentScope ? null : (store_id ? Number(store_id) : null);
  if (storeId) {
    const store = getStore(storeId);
    if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
    if (req.user.role !== 'admin' && !userHasStore(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem doanh thu cửa hàng này' });
  }
  const result = leaderboardRows(req.user, period, date, storeId, { includeAllStores: overviewPercentScope });
  if (overviewPercentScope && req.user.role !== 'admin') {
    // Ở Tổng quan, cửa hàng được xem thứ hạng toàn hệ thống theo %, nhưng không trả số tiền doanh thu/target.
    result.leaderboard = result.leaderboard.map(r => ({ ...r, revenue: 0, target: 0 }));
  }
  res.json(result);
});

app.get('/api/sales/store-summary', requireAuth, (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? String(req.query.month) : dateOnly(new Date()).slice(0, 7);
  const storeId = req.user.role === 'admin' ? Number(req.query.store_id || getPrimaryStoreId(req.user) || db.stores[0]?.id) : Number(getPrimaryStoreId(req.user));
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canViewStoreSales(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem tổng doanh thu cửa hàng' });
  const start = `${month}-01`;
  const nextMonth = new Date(`${start}T00:00:00Z`);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const end = nextMonth.toISOString().slice(0, 10);
  const targetMetrics = aggregateKpiTargetsForStore(storeId, [month]);
  const target = targetMetrics.target;
  const salesRows = (db.sales || []).filter(sa => Number(sa.store_id) === Number(storeId) && dateVal(sa.sale_date) >= start && dateVal(sa.sale_date) < end);
  const dayMap = new Map();
  salesRows.forEach(r => {
    const d = dateVal(r.sale_date);
    const row = dayMap.get(d) || { sale_date: d, revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, upt: 0, atv: 0, asp: 0, cumulative_revenue: 0, achievement_percent: 0 };
    row.revenue += Number(r.revenue || 0);
    row.bill_count += Number(r.bill_count || 0);
    row.item_count += Number(r.item_count || 0);
    dayMap.set(d, row);
  });
  (db.sales_store_days || [])
    .filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.sale_date) >= start && dateVal(x.sale_date) < end)
    .forEach(x => {
      const d = dateVal(x.sale_date);
      const row = dayMap.get(d) || { sale_date: d, revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, upt: 0, atv: 0, asp: 0, cr: 0, cumulative_revenue: 0, achievement_percent: 0 };
      row.customer_count = Number(x.customer_count || 0);
      row.note = x.note || '';
      dayMap.set(d, row);
    });
  (db.sales_daily_targets || [])
    .filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.target_date) >= start && dateVal(x.target_date) < end)
    .forEach(x => {
      const d = dateVal(x.target_date);
      const row = dayMap.get(d) || { sale_date: d, revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, upt: 0, atv: 0, asp: 0, cr: 0, cumulative_revenue: 0, achievement_percent: 0 };
      row.daily_target = Number(x.target_revenue || 0);
      // UPT / ATV / CR dùng mặc định target tháng, không dùng target ngày.
      row.daily_target_upt = targetMetrics.target_upt;
      row.daily_target_atv = targetMetrics.target_atv;
      row.daily_target_cr = targetMetrics.target_cr;
      row.daily_target_note = x.note || '';
      dayMap.set(d, row);
    });
  const rows = Array.from(dayMap.values()).sort((a, b) => a.sale_date.localeCompare(b.sale_date));
  let cumulative = 0;
  rows.forEach(r => {
    const dayTarget = storeDailyTarget(storeId, r.sale_date);
    r.daily_target = Number(r.daily_target || dayTarget.target_revenue || 0);
    r.daily_target_upt = targetMetrics.target_upt;
    r.daily_target_atv = targetMetrics.target_atv;
    r.daily_target_cr = targetMetrics.target_cr;
    r.daily_target_note = r.daily_target_note || dayTarget.note || '';
    r.daily_achievement_percent = r.daily_target ? Math.round((Number(r.revenue || 0) / r.daily_target) * 10000) / 100 : 0;
    cumulative += Number(r.revenue || 0);
    r.upt = r.bill_count ? Math.round((r.item_count / r.bill_count) * 100) / 100 : 0;
    r.atv = r.bill_count ? Math.round(r.revenue / r.bill_count) : 0;
    r.asp = r.item_count ? Math.round(r.revenue / r.item_count) : 0;
    r.cr = r.customer_count ? Math.round((r.bill_count / r.customer_count) * 10000) / 100 : 0;
    r.cumulative_revenue = cumulative;
    r.achievement_percent = target ? Math.round((cumulative / target) * 10000) / 100 : 0;
  });
  const totals = rows.reduce((acc, r) => {
    acc.revenue += Number(r.revenue || 0);
    acc.bill_count += Number(r.bill_count || 0);
    acc.item_count += Number(r.item_count || 0);
    acc.customer_count += Number(r.customer_count || 0);
    acc.daily_target += Number(r.daily_target || 0);
    return acc;
  }, { revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, daily_target: 0 });
  totals.upt = totals.bill_count ? Math.round((totals.item_count / totals.bill_count) * 100) / 100 : 0;
  totals.atv = totals.bill_count ? Math.round(totals.revenue / totals.bill_count) : 0;
  totals.asp = totals.item_count ? Math.round(totals.revenue / totals.item_count) : 0;
  totals.cr = totals.customer_count ? Math.round((totals.bill_count / totals.customer_count) * 10000) / 100 : 0;
  totals.target_upt = targetMetrics.target_upt;
  totals.target_atv = targetMetrics.target_atv;
  totals.target_cr = targetMetrics.target_cr;
  totals.achievement_percent = target ? Math.round((totals.revenue / target) * 10000) / 100 : 0;
  totals.daily_achievement_percent = totals.daily_target ? Math.round((totals.revenue / totals.daily_target) * 10000) / 100 : 0;
  Object.assign(totals, periodPaceMetrics(start, end, target, totals.revenue));
  res.json({ month, store_id: store.id, store_name: store.name, monthly_target: target, target_metrics: targetMetrics, totals, rows });
});




function dailyReportRow(storeId, reportDate) {
  db.daily_reports = db.daily_reports || [];
  return db.daily_reports.find(r => Number(r.store_id) === Number(storeId) && String(r.report_date) === String(dateOnly(reportDate))) || null;
}
function normalizeDailySalesEntries(value) {
  return parseWeeklyList(value).map(item => ({
    user_id: toNumber(item.user_id, 0),
    revenue: toNumber(item.revenue, 0),
    bill_count: toNumber(item.bill_count, 0),
    item_count: toNumber(item.item_count, 0),
    note: String(item.note || '').trim()
  })).filter(item => item.user_id);
}
function normalizeOrderSizeValue(value) {
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean).slice(0, 4).join(', ');
  return String(value || '').split(/[,+/|;]/).map(v => v.trim()).filter(Boolean).slice(0, 4).join(', ');
}
function normalizeMissingSizeItems(value) {
  return parseWeeklyList(value).map(item => ({
    sku: String(item.sku || '').trim(),
    product_name: String(item.product_name || item.name || '').trim(),
    size: normalizeOrderSizeValue(item.sizes || item.size || item.size_note || ''),
    quantity: Math.max(0, Math.round(toNumber(item.quantity || item.qty, 0))),
    note: String(item.note || '').trim()
  })).filter(item => (item.sku || item.product_name) && item.quantity).slice(0, 30);
}
function normalizeDailyFeedbackItems(value) {
  return parseWeeklyList(value).map(item => ({
    sku: String(item.sku || '').trim(),
    product_name: String(item.product_name || item.name || '').trim(),
    product_errors: String(item.product_errors || item.error || '').trim(),
    customer_feedback: String(item.customer_feedback || item.feedback || '').trim(),
    note: String(item.note || '').trim()
  })).filter(item => item.sku || item.product_name || item.product_errors || item.customer_feedback).slice(0, 30);
}
function buildDailyReport(user, rawDate, rawStoreId) {
  const reportDate = dateOnly(rawDate || new Date());
  const storeId = user.role === 'admin' ? Number(rawStoreId || getPrimaryStoreId(user) || db.stores[0]?.id) : Number(getPrimaryStoreId(user));
  const store = getStore(storeId);
  if (!store) throw new Error('Cửa hàng không hợp lệ');
  if (user.role !== 'admin' && !userHasStore(user, storeId)) throw new Error('Không có quyền xem báo cáo ngày cửa hàng này');
  const report = dailyReportRow(storeId, reportDate) || null;
  const salesRows = (db.sales || []).filter(sa => Number(sa.store_id) === Number(storeId) && dateVal(sa.sale_date) === reportDate);
  const storeDay = (db.sales_store_days || []).find(x => Number(x.store_id) === Number(storeId) && dateVal(x.sale_date) === reportDate) || null;
  const staff = salesStaffForStore(storeId);
  const sales_entries = staff.map(u => {
    const r = salesRows.find(x => Number(x.user_id) === Number(u.id));
    return { user_id: u.id, full_name: u.full_name, store_name: store.name, revenue: r ? Number(r.revenue || 0) : 0, bill_count: r ? Number(r.bill_count || 0) : 0, item_count: r ? Number(r.item_count || 0) : 0, note: r ? (r.note || '') : '' };
  });
  const customerCount = storeDay ? Number(storeDay.customer_count || 0) : 0;
  const targetDay = storeDailyTarget(storeId, reportDate);
  const storeTotal = sales_entries.reduce((acc, r) => {
    acc.revenue += Number(r.revenue || 0);
    acc.bill_count += Number(r.bill_count || 0);
    acc.item_count += Number(r.item_count || 0);
    return acc;
  }, { revenue: 0, bill_count: 0, item_count: 0 });
  storeTotal.customer_count = customerCount;
  storeTotal.target_revenue = Number(targetDay.target_revenue || 0);
  storeTotal.achievement_percent = storeTotal.target_revenue ? Math.round((storeTotal.revenue / storeTotal.target_revenue) * 10000) / 100 : 0;
  storeTotal.upt = storeTotal.bill_count ? Math.round((storeTotal.item_count / storeTotal.bill_count) * 100) / 100 : 0;
  storeTotal.atv = storeTotal.bill_count ? Math.round(storeTotal.revenue / storeTotal.bill_count) : 0;
  storeTotal.asp = storeTotal.item_count ? Math.round(storeTotal.revenue / storeTotal.item_count) : 0;
  storeTotal.cr = customerCount ? Math.round((storeTotal.bill_count / customerCount) * 10000) / 100 : 0;
  storeTotal.target_note = targetDay.note || '';
  return {
    store_id: storeId,
    store_name: store.name,
    report_date: reportDate,
    customer_count: customerCount,
    store_note: storeDay ? (storeDay.note || '') : '',
    daily_target: targetDay,
    store_total: storeTotal,
    sales_entries,
    missing_size_items: normalizeMissingSizeItems(report?.missing_size_items || []),
    product_feedback_items: normalizeDailyFeedbackItems(report?.product_feedback_items || []),
    summary_text: report?.summary_text || '',
    report: report ? { id: report.id, updated_at: report.updated_at || report.created_at || '', created_at: report.created_at || '' } : null
  };
}
function dailyReportZaloText(payload) {
  const lines = [];
  lines.push(`BÁO CÁO NGÀY ${dateOnly(payload.report_date)} - ${payload.store_name || ''}`.trim());
  lines.push('');
  lines.push('1. DOANH THU & CHỈ SỐ');
  const sales = normalizeDailySalesEntries(payload.sales_entries || []);
  const total = sales.reduce((acc, r) => {
    acc.revenue += Number(r.revenue || 0);
    acc.bill_count += Number(r.bill_count || 0);
    acc.item_count += Number(r.item_count || 0);
    return acc;
  }, { revenue: 0, bill_count: 0, item_count: 0 });
  const fmt = n => new Intl.NumberFormat('vi-VN').format(Number(n || 0));
  sales.forEach(r => {
    const u = getUser(r.user_id);
    if (!u) return;
    lines.push(`- ${u.full_name}: ${fmt(r.revenue)}đ | Bill ${fmt(r.bill_count)} | Món ${fmt(r.item_count)}${r.note ? ` | ${r.note}` : ''}`);
  });
  lines.push(`Tổng: ${fmt(total.revenue)}đ | Bill ${fmt(total.bill_count)} | Món ${fmt(total.item_count)} | Lượt khách ${fmt(payload.customer_count || 0)}`);
  lines.push(`UPT: ${total.bill_count ? Math.round((total.item_count / total.bill_count) * 100) / 100 : 0} | ATV: ${total.bill_count ? fmt(Math.round(total.revenue / total.bill_count)) + 'đ' : '0đ'} | ASP: ${total.item_count ? fmt(Math.round(total.revenue / total.item_count)) + 'đ' : '0đ'} | CR: ${payload.customer_count ? Math.round((total.bill_count / Number(payload.customer_count || 0)) * 10000) / 100 : 0}%`);
  if (payload.store_note) lines.push(`Ghi chú: ${payload.store_note}`);
  const missing = normalizeMissingSizeItems(payload.missing_size_items || []);
  lines.push('');
  lines.push('2. SẢN PHẨM THIẾU SIZE / CẦN ORDER');
  if (missing.length) missing.forEach((item, i) => lines.push(`- ${i + 1}. ${item.sku ? item.sku + ' - ' : ''}${item.product_name || ''}: ${item.size ? `Size ${item.size} | ` : ''}SL ${fmt(item.quantity)}${item.note ? ` | ${item.note}` : ''}`));
  else lines.push('- Không có');
  const feedback = normalizeDailyFeedbackItems(payload.product_feedback_items || []);
  lines.push('');
  lines.push('3. SẢN PHẨM LỖI / FEEDBACK KHÁCH');
  if (feedback.length) feedback.forEach((item, i) => lines.push(`- ${i + 1}. ${item.sku ? item.sku + ' - ' : ''}${item.product_name || ''}${item.product_errors ? ` | Lỗi: ${item.product_errors}` : ''}${item.customer_feedback ? ` | KH: ${item.customer_feedback}` : ''}${item.note ? ` | ${item.note}` : ''}`));
  else lines.push('- Không có');
  return lines.join('\n');
}


app.get('/api/daily-report', requireAuth, (req, res) => {
  try {
    res.json(buildDailyReport(req.user, req.query.report_date || req.query.date, req.query.store_id));
  } catch (err) {
    res.status(403).json({ error: err.message || 'Không lấy được báo cáo ngày' });
  }
});

app.post('/api/daily-report', requireAuth, requireAnyPerm('can_manage_daily_report','can_manage_sales'), (req, res) => {
  const { store_id, report_date, customer_count, store_note, sales_entries, missing_size_items, product_feedback_items } = req.body || {};
  const storeId = req.user.role === 'admin' ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (req.user.role !== 'admin' && !userHasStore(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền nhập báo cáo ngày cửa hàng này' });
  const d = dateOnly(report_date || new Date());
  const cleanSales = normalizeDailySalesEntries(sales_entries);
  if (!cleanSales.length) return res.status(400).json({ error: 'Chưa có dòng doanh thu nhân viên' });
  const savedSales = [];
  cleanSales.forEach(entry => {
    const employee = getActiveUser(Number(entry.user_id));
    if (!employee || employee.role !== 'employee' || Number(getPrimaryStoreId(employee)) !== Number(storeId)) return;
    savedSales.push(upsertSalesRow(employee, d, entry, req.user.id));
  });
  upsertStoreSalesDay(storeId, d, customer_count, store_note || '', req.user.id);

  const missingItems = normalizeMissingSizeItems(missing_size_items);
  const feedbackItems = normalizeDailyFeedbackItems(product_feedback_items);
  db.daily_reports = db.daily_reports || [];
  let row = dailyReportRow(storeId, d);
  if (row) {
    // Khi sửa báo cáo ngày, đồng bộ lại các dòng tự chuyển để tránh bị nhân đôi.
    (row.generated_order_ids || []).forEach(id => {
      const order = (db.orders || []).find(o => Number(o.id) === Number(id));
      if (order && order.daily_report_id === row.id) { order.status = 'deleted'; order.updated_by = req.user.id; order.updated_at = nowIso(); }
    });
    (row.generated_feedback_ids || []).forEach(id => {
      const fb = (db.product_feedback || []).find(o => Number(o.id) === Number(id));
      if (fb && fb.daily_report_id === row.id) { fb.status = 'deleted'; fb.updated_by = req.user.id; fb.updated_at = nowIso(); }
    });
  } else {
    row = { id: nextId('daily_reports'), store_id: storeId, report_date: d, created_by: req.user.id, created_at: nowIso() };
    db.daily_reports.push(row);
  }

  db.orders = db.orders || [];
  const generatedOrderIds = [];
  if (missingItems.length) {
    const batchName = normalizeOrderBatchName(`Thiếu size ${d}`);
    missingItems.forEach(item => {
      const id = nextId('orders');
      db.orders.push({
        id,
        store_id: storeId,
        order_date: d,
        batch_name: batchName,
        sku: item.sku,
        product_name: item.product_name,
        size: item.size || '',
        quantity: item.quantity,
        order_status: 'new',
        note: item.note ? `Từ báo cáo ngày: ${item.note}` : 'Từ báo cáo ngày - thiếu size',
        status: 'active',
        daily_report_id: row.id,
        created_by: req.user.id,
        created_at: nowIso(),
        updated_by: req.user.id,
        updated_at: nowIso()
      });
      generatedOrderIds.push(id);
    });
  }

  db.product_feedback = db.product_feedback || [];
  const generatedFeedbackIds = [];
  feedbackItems.forEach(item => {
    const id = nextId('product_feedback');
    db.product_feedback.push({
      id,
      store_id: storeId,
      feedback_date: d,
      collection_id: null,
      sku: item.sku,
      product_name: item.product_name,
      style_feedback: '',
      material_feedback: '',
      product_errors: item.product_errors,
      customer_feedback: item.customer_feedback,
      restock_wish: 'Chưa đánh giá',
      note: item.note ? `Từ báo cáo ngày: ${item.note}` : 'Từ báo cáo ngày',
      status: 'active',
      daily_report_id: row.id,
      created_by: req.user.id,
      created_at: nowIso(),
      updated_by: req.user.id,
      updated_at: nowIso()
    });
    generatedFeedbackIds.push(id);
  });

  const summaryPayload = { report_date: d, store_name: store.name, customer_count, store_note, sales_entries: cleanSales, missing_size_items: missingItems, product_feedback_items: feedbackItems };
  row.customer_count = toNumber(customer_count, 0);
  row.store_note = String(store_note || '').trim();
  row.sales_entries = cleanSales;
  row.missing_size_items = missingItems;
  row.product_feedback_items = feedbackItems;
  row.generated_order_ids = generatedOrderIds;
  row.generated_feedback_ids = generatedFeedbackIds;
  row.summary_text = dailyReportZaloText(summaryPayload);
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true, id: row.id, sales_count: savedSales.length, order_count: generatedOrderIds.length, feedback_count: generatedFeedbackIds.length, summary_text: row.summary_text });
});


app.get('/api/weekly-report', requireAuth, (req, res) => {
  try {
    res.json(buildWeeklyReport(req.user, req.query.week_start, req.query.store_id));
  } catch (err) {
    res.status(403).json({ error: err.message || 'Không lấy được báo cáo tuần' });
  }
});

app.post('/api/weekly-report', requireAuth, (req, res) => {
  const { store_id, week_start, feedback, issues, action_plan, note, top_products, promotions } = req.body || {};
  const storeId = req.user.role === 'admin' ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (req.user.role !== 'admin' && (Number(req.user.permissions.can_manage_weekly_report) !== 1 || !userHasStore(req.user, storeId))) return res.status(403).json({ error: 'Không có quyền nhập báo cáo tuần' });
  const ws = weekStartOf(week_start || new Date());
  const cleanTopProducts = normalizeWeeklyProducts(top_products);
  const cleanPromotions = normalizeWeeklyPromotions(promotions);
  db.weekly_reports = db.weekly_reports || [];
  let row = weeklyReportRow(storeId, ws);
  if (row) {
    row.feedback = feedback || '';
    row.issues = issues || '';
    row.action_plan = action_plan || '';
    row.note = note || '';
    row.top_products = cleanTopProducts;
    row.promotions = cleanPromotions;
    row.updated_by = req.user.id;
    row.updated_at = nowIso();
  } else {
    row = { id: nextId('weekly_reports'), store_id: storeId, week_start: ws, feedback: feedback || '', issues: issues || '', action_plan: action_plan || '', note: note || '', top_products: cleanTopProducts, promotions: cleanPromotions, created_by: req.user.id, created_at: nowIso(), updated_by: req.user.id, updated_at: nowIso() };
    db.weekly_reports.push(row);
  }
  saveDb();
  res.json({ ok: true, id: row.id });
});

app.get('/api/weekly-report/export.csv', requireAuth, requirePerm('can_export'), (req, res) => {
  try {
    const data = buildWeeklyReport(req.user, req.query.week_start, req.query.store_id);
    const rows = [];
    rows.push({ phan: 'Tong cua hang', cua_hang: data.store_name, tu_ngay: data.week_start, den_ngay: data.week_end, doanh_thu: data.totals.revenue, target_tuan: data.totals.target_revenue, phan_tram_dat: data.totals.achievement_percent, bill: data.totals.bill_count, so_mon: data.totals.item_count, luot_khach: data.totals.customer_count, upt: data.totals.upt, atv: data.totals.atv, asp: data.totals.asp, cr: data.totals.cr, feedback: data.feedback.feedback || '', van_de: data.feedback.issues || '', hanh_dong_tuan_toi: data.feedback.action_plan || '', ghi_chu: data.feedback.note || '' });
    data.days.forEach(d => rows.push({ phan: 'Theo ngay', cua_hang: data.store_name, ngay: d.sale_date, doanh_thu: d.revenue, target_ngay: d.target_revenue, phan_tram_dat: d.achievement_percent, bill: d.bill_count, so_mon: d.item_count, luot_khach: d.customer_count, upt: d.upt, atv: d.atv, asp: d.asp, cr: d.cr, ghi_chu: d.note || '' }));
    data.employees.forEach(e => rows.push({ phan: 'Ca nhan', cua_hang: data.store_name, nhan_vien: e.full_name, doanh_thu: e.revenue, target_tuan_uoc_tinh: e.target, phan_tram_dat: e.achievement_percent, ty_trong_dt: e.revenue_percent, bill: e.bill_count, so_mon: e.item_count, upt: e.upt, atv: e.atv, asp: e.asp }));
    (data.top_products || []).forEach((p, idx) => rows.push({ phan: 'Top san pham ban chay', top: idx + 1, cua_hang: data.store_name, san_pham: p.name, sku: p.sku || '', so_luong: p.quantity || 0, so_bill: p.bill_count || 0, ghi_chu: p.note || '' }));
    (data.promotions || []).forEach(p => rows.push({ phan: 'CTKM', cua_hang: data.store_name, ten_ctkm: p.name, so_bill_tham_gia: p.bill_count || 0, ghi_chu: p.note || '' }));
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`bao-cao-tuan-${data.store_name}-${data.week_start}.csv`);
    res.send('\uFEFF' + toCsv(rows));
  } catch (err) {
    res.status(403).json({ error: err.message || 'Không tải được báo cáo tuần' });
  }
});

app.get('/api/shifts', requireAuth, (req, res) => {
  const canView = req.user.role === 'admin' || Number(req.user.permissions.can_view_schedule) === 1 || Number(req.user.permissions.can_manage_schedule) === 1 || Number(req.user.permissions.can_manage_shifts) === 1;
  if (!canView) return res.status(403).json({ error: 'Không có quyền xem ca làm' });
  res.json({ shifts: activeShifts() });
});

app.post('/api/shifts', requireAuth, requirePerm('can_manage_shifts'), (req, res) => {
  const { code, name, start_time, end_time, note } = req.body || {};
  if (!name || !start_time || !end_time) return res.status(400).json({ error: 'Thiếu tên ca, giờ bắt đầu hoặc giờ kết thúc' });
  const id = nextId('shifts');
  db.shifts = db.shifts || [];
  db.shifts.push({ id, code: String(code || name).trim().slice(0, 12), name: String(name).trim(), start_time: String(start_time), end_time: String(end_time), note: note || '', status: 'active', created_by: req.user.id, created_at: nowIso(), updated_by: req.user.id, updated_at: nowIso() });
  saveDb();
  res.json({ ok: true, id });
});

app.patch('/api/shifts/:id', requireAuth, requirePerm('can_manage_shifts'), (req, res) => {
  const row = (db.shifts || []).find(s => Number(s.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy ca làm' });
  const { code, name, start_time, end_time, note, status } = req.body || {};
  if (code !== undefined) row.code = String(code || '').trim().slice(0, 12);
  if (name !== undefined) row.name = String(name || '').trim();
  if (start_time !== undefined) row.start_time = String(start_time || '');
  if (end_time !== undefined) row.end_time = String(end_time || '');
  if (note !== undefined) row.note = String(note || '');
  if (status) row.status = status;
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/shifts/:id', requireAuth, requirePerm('can_manage_shifts'), (req, res) => {
  const row = (db.shifts || []).find(s => Number(s.id) === Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Không tìm thấy ca làm' });
  row.status = 'deleted';
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.get('/api/schedules', requireAuth, (req, res) => {
  const storeId = req.user.role === 'admin' ? Number(req.query.store_id || getPrimaryStoreId(req.user) || db.stores[0]?.id) : Number(getPrimaryStoreId(req.user));
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canViewSchedule(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem lịch làm việc' });
  const week_start = scheduleWeekStart(req.query.week_start || new Date());
  const dates = scheduleWeekDates(week_start);
  let employees = db.users.filter(u => u.status === 'active' && Number(u.store_id) === Number(storeId) && u.role !== 'admin');
  if (req.user.role === 'employee') employees = employees.filter(u => Number(u.id) === Number(req.user.id));
  employees = employees.sort((a, b) => a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name, 'vi')).map(publicUser);
  res.json({ store_id: store.id, store_name: store.name, week_start, dates, shifts: activeShifts(), employees, schedules: scheduleRowsForUser(req.user, storeId, dates), can_manage: canManageSchedule(req.user, storeId) });
});

app.post('/api/schedules/bulk', requireAuth, requirePerm('can_manage_schedule'), (req, res) => {
  const { store_id, week_start, entries } = req.body || {};
  const storeId = req.user.role === 'admin' ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canManageSchedule(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền phân lịch cửa hàng này' });
  const wk = scheduleWeekStart(week_start || new Date());
  const dates = scheduleWeekDates(wk);
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'Dữ liệu lịch không hợp lệ' });
  db.work_schedules = db.work_schedules || [];
  let count = 0;
  entries.forEach(item => {
    const user = getActiveUser(Number(item.user_id));
    if (!user || !userHasStore(user, storeId) || user.role === 'admin') return;
    const workDate = dateOnly(item.work_date);
    if (!dates.includes(workDate)) return;
    const shiftId = item.shift_id ? Number(item.shift_id) : null;
    const shift = shiftId ? (db.shifts || []).find(s => Number(s.id) === shiftId && s.status !== 'deleted') : null;
    let row = db.work_schedules.find(x => Number(x.store_id) === Number(storeId) && Number(x.user_id) === Number(user.id) && String(x.work_date) === workDate);
    if (!shiftId) {
      if (row) { row.status = 'deleted'; row.updated_by = req.user.id; row.updated_at = nowIso(); count += 1; }
      return;
    }
    if (!shift) return;
    if (row) {
      row.shift_id = shiftId;
      row.note = item.note || '';
      row.status = 'active';
      row.updated_by = req.user.id;
      row.updated_at = nowIso();
    } else {
      row = { id: nextId('work_schedules'), store_id: storeId, user_id: user.id, work_date: workDate, shift_id: shiftId, note: item.note || '', status: 'active', created_by: req.user.id, created_at: nowIso(), updated_by: req.user.id, updated_at: nowIso() };
      db.work_schedules.push(row);
    }
    count += 1;
  });
  saveDb();
  res.json({ ok: true, count });
});


app.get('/api/orders', requireAuth, (req, res) => {
  const storeId = req.user.role === 'admin' ? (req.query.store_id ? Number(req.query.store_id) : null) : (getPrimaryStoreId(req.user) ? Number(getPrimaryStoreId(req.user)) : (req.query.store_id ? Number(req.query.store_id) : null));
  if (storeId && !canViewOrderScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem order cửa hàng này' });
  res.json({ orders: orderRowsForUser(req.user, storeId) });
});

app.post('/api/orders', requireAuth, requirePerm('can_manage_orders'), (req, res) => {
  const { store_id, order_date, batch_name, items } = req.body || {};
  const storeId = req.user.role === 'admin' ? Number(store_id || getPrimaryStoreId(req.user) || 0) : Number(getPrimaryStoreId(req.user) || store_id || 0);
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canManageOrderScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền tạo order cửa hàng này' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Chưa có dòng SKU cần order' });
  db.orders = db.orders || [];
  const d = dateOnly(order_date || new Date());
  const batchName = normalizeOrderBatchName(batch_name || `Lần ${d}`);
  let count = 0;
  items.forEach(item => {
    const sku = String(item.sku || '').trim();
    const productName = String(item.product_name || '').trim();
    const size = normalizeOrderSizeValue(item.size || item.sizes || '');
    const quantity = Math.max(0, Math.round(toNumber(item.quantity, 0)));
    if (!sku && !productName) return;
    if (!quantity) return;
    db.orders.push({
      id: nextId('orders'),
      store_id: storeId,
      order_date: d,
      batch_name: batchName,
      sku,
      product_name: productName,
      size,
      quantity,
      order_status: 'new',
      note: String(item.note || '').trim(),
      status: 'active',
      created_by: req.user.id,
      created_at: nowIso(),
      updated_by: req.user.id,
      updated_at: nowIso()
    });
    count += 1;
  });
  if (!count) return res.status(400).json({ error: 'Chưa có dòng order hợp lệ. Cần có SKU/Tên SP và số lượng > 0' });
  saveDb();
  res.json({ ok: true, count });
});

app.patch('/api/orders/:id', requireAuth, requirePerm('can_manage_orders'), (req, res) => {
  const row = (db.orders || []).find(o => Number(o.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy order' });
  if (!canManageOrderScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền sửa order này' });
  const { order_status, note, quantity, sku, product_name, size, batch_name } = req.body || {};
  if (order_status && !['new', 'done', 'waiting', 'received', 'cancelled'].includes(order_status)) return res.status(400).json({ error: 'Trạng thái order không hợp lệ' });
  if (order_status) row.order_status = order_status;
  if (note !== undefined) row.note = String(note || '');
  if (quantity !== undefined) row.quantity = Math.max(0, Math.round(toNumber(quantity, 0)));
  if (sku !== undefined) row.sku = String(sku || '').trim();
  if (product_name !== undefined) row.product_name = String(product_name || '').trim();
  if (size !== undefined) row.size = normalizeOrderSizeValue(size);
  if (batch_name !== undefined) row.batch_name = String(batch_name || 'Chưa gắn lần').trim() || 'Chưa gắn lần';
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/orders/:id', requireAuth, requirePerm('can_manage_orders'), (req, res) => {
  const row = (db.orders || []).find(o => Number(o.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy order' });
  if (!canManageOrderScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền xóa order này' });
  row.status = 'deleted';
  row.deleted_by = req.user.id;
  row.deleted_at = nowIso();
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.get('/api/online-orders', requireAuth, (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? String(req.query.month).slice(0, 7) : dateOnly(new Date()).slice(0, 7);
  const storeId = req.user.role === 'admin' ? (req.query.store_id ? Number(req.query.store_id) : null) : Number(getPrimaryStoreId(req.user) || 0);
  if (storeId && !canViewOnlineOrderScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem đơn online cửa hàng này' });
  const rows = onlineOrderRowsForUser(req.user, storeId, month);
  res.json({ month, orders: rows, summary: onlineOrderSummary(rows) });
});

app.post('/api/online-orders', requireAuth, requirePerm('can_manage_online_orders'), (req, res) => {
  const { store_id, order_date, invoice_no, order_value, packer_id, note } = req.body || {};
  const storeId = req.user.role === 'admin' ? Number(store_id || getPrimaryStoreId(req.user) || 0) : Number(getPrimaryStoreId(req.user) || store_id || 0);
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canManageOnlineOrderScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền nhập đơn online cửa hàng này' });
  const packer = getActiveUser(Number(packer_id));
  if (!packer || Number(packer.store_id) !== Number(storeId) || packer.role === 'admin') return res.status(400).json({ error: 'Nhân viên đóng đơn không hợp lệ' });
  const invoice = String(invoice_no || '').trim();
  if (!invoice) return res.status(400).json({ error: 'Chưa nhập số hóa đơn' });
  const value = Math.max(0, toNumber(order_value, 0));
  if (!value) return res.status(400).json({ error: 'Giá trị đơn phải lớn hơn 0' });
  db.online_orders = db.online_orders || [];
  const d = dateOnly(order_date || new Date());
  let row = db.online_orders.find(o => o.status !== 'deleted' && Number(o.store_id) === Number(storeId) && String(o.invoice_no || '').toLowerCase() === invoice.toLowerCase());
  if (row) {
    row.order_date = d;
    row.order_value = value;
    row.benefit_revenue = Math.round(value * 0.3);
    row.packer_id = Number(packer.id);
    row.note = String(note || '');
    row.updated_by = req.user.id;
    row.updated_at = nowIso();
  } else {
    row = { id: nextId('online_orders'), store_id: storeId, order_date: d, invoice_no: invoice, order_value: value, benefit_revenue: Math.round(value * 0.3), packer_id: Number(packer.id), note: String(note || ''), status: 'active', created_by: req.user.id, created_at: nowIso(), updated_by: req.user.id, updated_at: nowIso() };
    db.online_orders.push(row);
  }
  saveDb();
  res.json({ ok: true, id: row.id, benefit_revenue: row.benefit_revenue });
});

app.patch('/api/online-orders/:id', requireAuth, requirePerm('can_manage_online_orders'), (req, res) => {
  const row = (db.online_orders || []).find(o => Number(o.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy đơn online' });
  if (!canManageOnlineOrderScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền sửa đơn online này' });
  const { order_date, invoice_no, order_value, packer_id, note } = req.body || {};
  if (order_date) row.order_date = dateOnly(order_date);
  if (invoice_no !== undefined) row.invoice_no = String(invoice_no || '').trim();
  if (order_value !== undefined) { const value = Math.max(0, toNumber(order_value, 0)); row.order_value = value; row.benefit_revenue = Math.round(value * 0.3); }
  if (packer_id !== undefined) {
    const packer = getActiveUser(Number(packer_id));
    if (!packer || Number(packer.store_id) !== Number(row.store_id) || packer.role === 'admin') return res.status(400).json({ error: 'Nhân viên đóng đơn không hợp lệ' });
    row.packer_id = Number(packer.id);
  }
  if (note !== undefined) row.note = String(note || '');
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/online-orders/:id', requireAuth, requirePerm('can_manage_online_orders'), (req, res) => {
  const row = (db.online_orders || []).find(o => Number(o.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy đơn online' });
  if (!canManageOnlineOrderScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền xóa đơn online này' });
  row.status = 'deleted';
  row.deleted_by = req.user.id;
  row.deleted_at = nowIso();
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.get('/api/documents', requireAuth, (req, res) => {
  res.json({ documents: documentRowsForUser(req.user) });
});

app.post('/api/documents', requireAuth, requirePerm('can_manage_documents'), upload.single('file'), (req, res) => {
  const { title, category, store_id, description, version } = req.body || {};
  if (!req.file) return res.status(400).json({ error: 'Chưa chọn file tài liệu' });
  if (!title) return res.status(400).json({ error: 'Chưa nhập tên tài liệu' });
  const storeId = store_id ? Number(store_id) : null;
  if (storeId && !getStore(storeId)) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canManageDocumentScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền tải tài liệu cho phạm vi này' });
  const stored_name = saveDocumentFile(req.file);
  const id = nextId('documents');
  db.documents = db.documents || [];
  db.documents.push({
    id,
    title: String(title).trim(),
    category: category || 'Quy trình',
    store_id: storeId,
    description: description || '',
    version: version || '',
    original_name: req.file.originalname || '',
    stored_name,
    mime_type: req.file.mimetype || '',
    size: Number(req.file.size || 0),
    download_count: 0,
    status: 'active',
    created_by: req.user.id,
    created_at: nowIso(),
    updated_at: nowIso()
  });
  saveDb();
  res.json({ ok: true, id });
});

app.get('/api/documents/:id/download', requireAuth, (req, res) => {
  const doc = (db.documents || []).find(d => Number(d.id) === Number(req.params.id));
  if (!canAccessDocument(req.user, doc)) return res.status(404).json({ error: 'Không tìm thấy tài liệu hoặc không có quyền tải' });
  const filePath = path.join(DOC_DIR, doc.stored_name || '');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tài liệu không còn tồn tại trên server' });
  doc.download_count = Number(doc.download_count || 0) + 1;
  doc.last_downloaded_at = nowIso();
  saveDb();
  res.download(filePath, doc.original_name || doc.title || 'tai-lieu');
});

app.delete('/api/documents/:id', requireAuth, requirePerm('can_manage_documents'), (req, res) => {
  const doc = (db.documents || []).find(d => Number(d.id) === Number(req.params.id));
  if (!doc || doc.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy tài liệu' });
  if (!canManageDocumentScope(req.user, doc.store_id)) return res.status(403).json({ error: 'Không có quyền xóa tài liệu này' });
  doc.status = 'deleted';
  doc.deleted_at = nowIso();
  doc.deleted_by = req.user.id;
  saveDb();
  res.json({ ok: true });
});



app.get('/api/product-collections', requireAuth, (req, res) => {
  const storeId = req.query.store_id ? Number(req.query.store_id) : null;
  const month = req.query.month ? String(req.query.month).slice(0, 7) : null;
  if (storeId && !canViewProductCollectionScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem BST/List sản phẩm cửa hàng này' });
  res.json({ collections: productCollectionRowsForUser(req.user, storeId, month) });
});

app.post('/api/product-collections', requireAuth, requirePerm('can_manage_product_collections'), (req, res) => {
  const { store_id, collection_month, name, description, items_text, items } = req.body || {};
  const storeId = store_id ? Number(store_id) : null;
  if (storeId && !getStore(storeId)) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canManageProductCollectionScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền set BST/List sản phẩm phạm vi này' });
  const safeMonth = /^\d{4}-\d{2}$/.test(String(collection_month || '')) ? String(collection_month).slice(0, 7) : monthKey(new Date());
  const title = String(name || '').trim();
  if (!title) return res.status(400).json({ error: 'Cần nhập tên BST/List, ví dụ BST 8.1' });
  const parsedItems = Array.isArray(items) ? items : parseCollectionItems(items_text);
  if (!parsedItems.length) return res.status(400).json({ error: 'Cần nhập ít nhất 1 sản phẩm trong BST/List' });
  const id = nextId('product_collections');
  db.product_collections = db.product_collections || [];
  db.product_collection_items = db.product_collection_items || [];
  db.product_collections.push({
    id,
    store_id: storeId,
    collection_month: safeMonth,
    name: title,
    description: String(description || '').trim(),
    status: 'active',
    created_by: req.user.id,
    created_at: nowIso(),
    updated_at: nowIso()
  });
  parsedItems.forEach((item, idx) => {
    db.product_collection_items.push({
      id: nextId('product_collection_items'),
      collection_id: id,
      sku: String(item.sku || '').trim(),
      product_name: String(item.product_name || '').trim(),
      note: String(item.note || '').trim(),
      sort_order: Number(item.sort_order || idx + 1),
      status: 'active',
      created_at: nowIso()
    });
  });
  saveDb();
  res.json({ ok: true, id });
});

app.delete('/api/product-collections/:id', requireAuth, requirePerm('can_manage_product_collections'), (req, res) => {
  const row = (db.product_collections || []).find(c => Number(c.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy BST/List sản phẩm' });
  if (!canManageProductCollectionScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền xóa BST/List này' });
  row.status = 'deleted';
  row.deleted_at = nowIso();
  row.deleted_by = req.user.id;
  (db.product_collection_items || []).filter(i => Number(i.collection_id) === Number(row.id)).forEach(i => { i.status = 'deleted'; i.deleted_at = nowIso(); });
  saveDb();
  res.json({ ok: true });
});

app.get('/api/product-feedback', requireAuth, (req, res) => {
  const storeId = req.query.store_id ? Number(req.query.store_id) : null;
  const collectionId = req.query.collection_id ? Number(req.query.collection_id) : null;
  const month = req.query.month ? String(req.query.month).slice(0, 7) : null;
  if (storeId && !canViewProductFeedbackScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem đánh giá sản phẩm cửa hàng này' });
  res.json({ feedback: productFeedbackRowsForUser(req.user, storeId, collectionId, month), summary: productFeedbackSummaryForUser(req.user, storeId, collectionId, month) });
});

app.post('/api/product-feedback', requireAuth, requirePerm('can_manage_product_feedback'), (req, res) => {
  const { store_id, feedback_date, collection_id, sku, product_name, style_feedback, material_feedback, product_errors, customer_feedback, restock_wish, note } = req.body || {};
  const storeId = req.user.role === 'admin' ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
  if (!storeId || !getStore(storeId)) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canManageProductFeedbackScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền nhập đánh giá sản phẩm cửa hàng này' });
  if (!sku && !product_name) return res.status(400).json({ error: 'Cần nhập SKU hoặc tên sản phẩm' });
  const collectionId = collection_id ? Number(collection_id) : null;
  if (collectionId) {
    const collection = (db.product_collections || []).find(c => Number(c.id) === Number(collectionId) && c.status !== 'deleted');
    if (!collection) return res.status(400).json({ error: 'BST/List sản phẩm không hợp lệ' });
    if (collection.store_id && Number(collection.store_id) !== Number(storeId)) return res.status(400).json({ error: 'Sản phẩm không thuộc BST/List của cửa hàng này' });
    const existsInList = collectionItems(collectionId).some(i => String(i.sku || '').trim().toLowerCase() === String(sku || '').trim().toLowerCase() || String(i.product_name || '').trim().toLowerCase() === String(product_name || '').trim().toLowerCase());
    if (!existsInList) return res.status(400).json({ error: 'Sản phẩm chưa nằm trong BST/List admin set' });
  }
  const id = nextId('product_feedback');
  db.product_feedback = db.product_feedback || [];
  db.product_feedback.push({
    id,
    store_id: storeId,
    feedback_date: feedback_date || dateOnly(new Date()),
    collection_id: collectionId,
    sku: String(sku || '').trim(),
    product_name: String(product_name || '').trim(),
    style_feedback: String(style_feedback || '').trim(),
    material_feedback: String(material_feedback || '').trim(),
    product_errors: String(product_errors || '').trim(),
    customer_feedback: String(customer_feedback || '').trim(),
    restock_wish: restock_wish || 'Chưa đánh giá',
    note: String(note || '').trim(),
    status: 'active',
    created_by: req.user.id,
    created_at: nowIso(),
    updated_at: nowIso()
  });
  saveDb();
  res.json({ ok: true, id });
});

app.patch('/api/product-feedback/:id', requireAuth, requirePerm('can_manage_product_feedback'), (req, res) => {
  const row = (db.product_feedback || []).find(r => Number(r.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy đánh giá sản phẩm' });
  if (!canManageProductFeedbackScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền sửa đánh giá này' });
  const fields = ['feedback_date','collection_id','sku','product_name','style_feedback','material_feedback','product_errors','customer_feedback','restock_wish','note'];
  fields.forEach(k => { if (req.body && req.body[k] !== undefined) row[k] = String(req.body[k] || '').trim(); });
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/product-feedback/:id', requireAuth, requirePerm('can_manage_product_feedback'), (req, res) => {
  const row = (db.product_feedback || []).find(r => Number(r.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy đánh giá sản phẩm' });
  if (!canManageProductFeedbackScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền xóa đánh giá này' });
  row.status = 'deleted';
  row.deleted_at = nowIso();
  row.deleted_by = req.user.id;
  saveDb();
  res.json({ ok: true });
});

app.get('/api/product-trainings', requireAuth, (req, res) => {
  const storeId = req.query.store_id ? Number(req.query.store_id) : null;
  if (storeId && !canViewProductTrainingScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem đào tạo sản phẩm cửa hàng này' });
  res.json({ trainings: productTrainingRowsForUser(req.user, storeId) });
});

app.get('/api/product-trainings/:id/quiz', requireAuth, (req, res) => {
  const row = (db.product_trainings || []).find(r => Number(r.id) === Number(req.params.id) && r.status !== 'deleted');
  if (!row) return res.status(404).json({ error: 'Không tìm thấy bài đào tạo' });
  if (!canViewProductTrainingScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền xem bài đào tạo này' });
  const questions = trainingQuestions(row, false);
  res.json({ training: { id: row.id, product_name: row.product_name || '', sku: row.sku || '', pass_percent: Number(row.pass_percent || 90), due_at: row.due_at || '', is_required: Number(row.is_required || 0) }, questions, progress: trainingProgress(row.id, req.user.id, row.pass_percent || 90) });
});

app.post('/api/product-trainings/:id/submit', requireAuth, (req, res) => {
  const row = (db.product_trainings || []).find(r => Number(r.id) === Number(req.params.id) && r.status !== 'deleted');
  if (!row) return res.status(404).json({ error: 'Không tìm thấy bài đào tạo' });
  if (req.user.role !== 'employee' && req.user.role !== 'manager') return res.status(403).json({ error: 'Chỉ nhân viên/quản lý làm bài kiểm tra' });
  if (!canViewProductTrainingScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền làm bài đào tạo này' });
  const questions = trainingQuestions(row, true);
  if (!questions.length) return res.status(400).json({ error: 'Bài đào tạo chưa có câu hỏi kiểm tra' });
  const answers = Array.isArray(req.body?.answers) ? req.body.answers.map(x => Number(x)) : [];
  let correct = 0;
  questions.forEach((q, idx) => { if (Number(answers[idx]) === Number(q.correct_index)) correct += 1; });
  const scorePercent = Math.round((correct / questions.length) * 10000) / 100;
  const passPercent = Number(row.pass_percent || 90);
  const passed = scorePercent >= passPercent ? 1 : 0;
  const id = nextId('product_training_attempts');
  db.product_training_attempts = db.product_training_attempts || [];
  db.product_training_attempts.push({ id, training_id: row.id, user_id: req.user.id, store_id: req.user.store_id || row.store_id || null, answers, correct_count: correct, total_questions: questions.length, score_percent: scorePercent, pass_percent: passPercent, passed, created_at: nowIso(), status: 'active' });
  saveDb();
  res.json({ ok: true, score_percent: scorePercent, correct_count: correct, total_questions: questions.length, passed: !!passed, pass_percent: passPercent });
});

app.post('/api/product-trainings', requireAuth, requirePerm('can_manage_product_training'), (req, res) => {
  const { store_id, sku, product_name, arrival_date, material, style_info, selling_points, care_instruction, common_errors, training_note, status_label, is_required, due_at, pass_percent, quiz_text } = req.body || {};
  const storeId = store_id ? Number(store_id) : null;
  if (storeId && !getStore(storeId)) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canManageProductTrainingScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền nhập đào tạo sản phẩm phạm vi này' });
  if (!sku && !product_name) return res.status(400).json({ error: 'Cần nhập SKU hoặc tên sản phẩm' });
  const id = nextId('product_trainings');
  db.product_trainings = db.product_trainings || [];
  db.product_trainings.push({
    id,
    store_id: storeId,
    sku: String(sku || '').trim(),
    product_name: String(product_name || '').trim(),
    arrival_date: arrival_date || '',
    material: String(material || '').trim(),
    style_info: String(style_info || '').trim(),
    selling_points: String(selling_points || '').trim(),
    care_instruction: String(care_instruction || '').trim(),
    common_errors: String(common_errors || '').trim(),
    training_note: String(training_note || '').trim(),
    status_label: status_label || 'Sắp về',
    is_required: Number(is_required || 0) ? 1 : 0,
    due_at: due_at || '',
    pass_percent: Number(pass_percent || 90),
    quiz_questions: parseQuizText(quiz_text),
    status: 'active',
    created_by: req.user.id,
    created_at: nowIso(),
    updated_at: nowIso()
  });
  saveDb();
  res.json({ ok: true, id });
});

app.patch('/api/product-trainings/:id', requireAuth, requirePerm('can_manage_product_training'), (req, res) => {
  const row = (db.product_trainings || []).find(r => Number(r.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy bài đào tạo sản phẩm' });
  if (!canManageProductTrainingScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền sửa bài đào tạo này' });
  const fields = ['store_id','sku','product_name','arrival_date','material','style_info','selling_points','care_instruction','common_errors','training_note','status_label','is_required','due_at','pass_percent'];
  fields.forEach(k => {
    if (req.body && req.body[k] !== undefined) {
      if (k === 'store_id') row[k] = req.body[k] ? Number(req.body[k]) : null;
      else if (k === 'is_required') row[k] = Number(req.body[k] || 0) ? 1 : 0;
      else if (k === 'pass_percent') row[k] = Number(req.body[k] || 90);
      else row[k] = String(req.body[k] || '').trim();
    }
  });
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/product-trainings/:id', requireAuth, requirePerm('can_manage_product_training'), (req, res) => {
  const row = (db.product_trainings || []).find(r => Number(r.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy bài đào tạo sản phẩm' });
  if (!canManageProductTrainingScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền xóa bài đào tạo này' });
  row.status = 'deleted';
  row.deleted_at = nowIso();
  row.deleted_by = req.user.id;
  saveDb();
  res.json({ ok: true });
});

app.get('/api/bonuses', requireAuth, (req, res) => {
  const bonuses = bonusRowsForUser(req.user);
  res.json({ bonuses, summary: bonusSummaryForUser(req.user) });
});

app.post('/api/bonuses', requireAuth, requirePerm('can_manage_bonuses'), (req, res) => {
  const { user_id, bonus_date, bonus_type, amount, note } = req.body || {};
  const target = getActiveUser(Number(user_id));
  if (!target) return res.status(400).json({ error: 'Nhân viên không hợp lệ' });
  if (req.user.role !== 'admin' && !userHasStore(req.user, target.store_id)) return res.status(403).json({ error: 'Không có quyền nhập thưởng nhân viên này' });
  const id = nextId('bonuses');
  db.bonuses.push({ id, user_id: target.id, store_id: target.store_id, bonus_date: bonus_date || dateOnly(new Date()), bonus_type: bonus_type || 'Thưởng khác', amount: toNumber(amount, 0), note: note || '', created_by: req.user.id, created_at: nowIso() });
  saveDb();
  res.json({ ok: true, id });
});

app.get('/api/reports/performance', requireAuth, (req, res) => {
  if (req.user.role !== 'employee' && Number(req.user.permissions.can_view_reports) !== 1) return res.status(403).json({ error: 'Không có quyền xem tổng hợp' });
  const performance = computePerformance(req.user).sort((a, b) => b.final_score - a.final_score);
  res.json({ performance, storeSummary: storeSummaryRows(req.user) });
});

app.get('/api/export/:type.csv', requireAuth, requirePerm('can_export'), (req, res) => {
  const type = req.params.type;
  let rows = [];
  if (type === 'tasks') {
    rows = taskRowsForUser(req.user).map(r => ({ task_id: r.id, title: r.title, priority: r.priority, due_at: r.due_at, store_name: r.store_name, assignee_name: r.assignee_name, completed_at: r.completed_at, evidence_path: r.evidence_path, evidence_note: r.evidence_note, points_delta: r.points_delta, status: r.status }));
  } else if (type === 'violations') {
    rows = violationRowsForUser(req.user);
  } else if (type === 'assessments') {
    rows = assessmentRowsForUser(req.user);
  } else if (type === 'sales') {
    rows = db.sales.map(sa => ({ id: sa.id, sale_date: sa.sale_date, store_id: sa.store_id, employee_name: getUser(sa.user_id)?.full_name || '', store_name: getStore(sa.store_id)?.name || '', revenue: Number(sa.revenue || 0), bill_count: Number(sa.bill_count || 0), item_count: Number(sa.item_count || 0), upt: Number(sa.bill_count || 0) ? Math.round((Number(sa.item_count || 0) / Number(sa.bill_count || 0)) * 100) / 100 : 0, atv: Number(sa.bill_count || 0) ? Math.round(Number(sa.revenue || 0) / Number(sa.bill_count || 0)) : 0, note: sa.note || '', created_at: sa.created_at || '', updated_at: sa.updated_at || '' }));
    if (req.user.role !== 'admin') rows = rows.filter(r => userHasStore(req.user, r.store_id));
    rows = rows.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
  } else if (type === 'sales_targets') {
    rows = (db.sales_targets || []).map(t => ({ id: t.id, target_month: t.target_month, store_id: t.store_id, employee_name: getUser(t.user_id)?.full_name || '', store_name: getStore(t.store_id)?.name || '', target: Number(t.target_revenue ?? t.target ?? 0), target_upt: Number(t.target_upt || 0), target_atv: Number(t.target_atv || 0), target_cr: Number(t.target_cr || 0), note: t.note || '', updated_at: t.updated_at || t.created_at || '' }));
    if (req.user.role !== 'admin') rows = rows.filter(r => userHasStore(req.user, r.store_id));
    rows = rows.sort((a, b) => String(b.target_month).localeCompare(String(a.target_month)));
  } else if (type === 'sales_daily_targets') {
    rows = (db.sales_daily_targets || []).map(t => ({ id: t.id, target_date: t.target_date, store_id: t.store_id, store_name: getStore(t.store_id)?.name || '', target_revenue: Number(t.target_revenue || 0), target_upt: Number(t.target_upt || 0), target_atv: Number(t.target_atv || 0), target_cr: Number(t.target_cr || 0), note: t.note || '', updated_at: t.updated_at || t.created_at || '' }));
    if (req.user.role !== 'admin') rows = rows.filter(r => userHasStore(req.user, r.store_id));
    rows = rows.sort((a, b) => String(b.target_date).localeCompare(String(a.target_date)));
  } else if (type === 'shifts') {
    rows = activeShifts().map(s => ({ id: s.id, code: s.code, name: s.name, start_time: s.start_time, end_time: s.end_time, note: s.note || '', updated_at: s.updated_at || s.created_at || '' }));
  } else if (type === 'work_schedules') {
    rows = (db.work_schedules || []).filter(x => x.status !== 'deleted').map(x => ({ id: x.id, work_date: x.work_date, store_id: x.store_id, store_name: getStore(x.store_id)?.name || '', employee_name: getUser(x.user_id)?.full_name || '', role: getUser(x.user_id)?.role || '', shift_code: (db.shifts || []).find(s => Number(s.id) === Number(x.shift_id))?.code || '', shift_name: (db.shifts || []).find(s => Number(s.id) === Number(x.shift_id))?.name || '', start_time: (db.shifts || []).find(s => Number(s.id) === Number(x.shift_id))?.start_time || '', end_time: (db.shifts || []).find(s => Number(s.id) === Number(x.shift_id))?.end_time || '', note: x.note || '', updated_at: x.updated_at || x.created_at || '' }));
    if (req.user.role === 'manager') rows = rows.filter(r => userHasStore(req.user, r.store_id));
    if (req.user.role === 'employee') rows = rows.filter(r => r.employee_name === req.user.full_name);
    rows = rows.sort((a, b) => String(b.work_date).localeCompare(String(a.work_date)) || String(a.store_name).localeCompare(String(b.store_name), 'vi'));
  } else if (type === 'orders') {
    rows = aggregateOrderRows(orderRowsForUser(req.user)).map(o => ({ lan_order: o.batch_name, store_id: o.store_id, store_name: o.store_name, sku: o.sku || '', product_name: o.product_name || '', size: o.size || '', tong_so_luong: Number(o.total_quantity || 0), ngay_dau: o.first_order_date || '', ngay_cuoi: o.last_order_date || '', trang_thai: o.status_label, ghi_chu: o.note || '', so_dong_gop: Number(o.source_count || 0), nguoi_tao: o.created_by_name || '' }));
  } else if (type === 'online_orders') {
    rows = onlineOrderRowsForUser(req.user).map(o => ({ id: o.id, ngay: o.order_date || '', cua_hang: o.store_name || '', so_hoa_don: o.invoice_no || '', gia_tri_don: Number(o.order_value || 0), doanh_thu_huong_30: Number(o.benefit_revenue || 0), nhan_vien_dong: o.packer_name || '', ghi_chu: o.note || '', nguoi_nhap: o.created_by_name || '', ngay_cap_nhat: o.updated_at || o.created_at || '' }));
  } else if (type === 'product_feedback') {
    rows = productFeedbackRowsForUser(req.user).map(r => ({ id: r.id, thang_bst: r.collection_month || '', bst_list: r.collection_name || '', ngay: r.feedback_date || '', cua_hang: r.store_name || '', sku: r.sku || '', ten_sp: r.product_name || '', kieu_dang: r.style_feedback || '', chat_lieu: r.material_feedback || '', loi_san_pham: r.product_errors || '', danh_gia_khach: r.customer_feedback || '', mong_muon_tai_san_pham: r.restock_wish || '', ghi_chu: r.note || '', nguoi_nhap: r.created_by_name || '', ngay_nhap: r.created_at || '' }));
  } else if (type === 'product_feedback_summary') {
    rows = productFeedbackSummaryForUser(req.user).map(r => ({ bst_list: r.collection_name || '', sku: r.sku || '', ten_sp: r.product_name || '', so_lan_danh_gia: Number(r.count || 0), cua_hang: r.stores || '', ngay_dau: r.first_date || '', ngay_cuoi: r.last_date || '', de_xuat_tai: Number(r.restock_yes || 0), khong_tai: Number(r.restock_no || 0), theo_doi_them: Number(r.restock_watch || 0), ket_luan: r.recommend_label || '', tong_hop_kieu_dang: r.style_notes || '', tong_hop_chat_lieu: r.material_notes || '', tong_hop_loi: r.error_notes || '', tong_hop_y_kien_khach: r.customer_notes || '', ghi_chu: r.notes || '' }));
  } else if (type === 'product_collections') {
    rows = productCollectionRowsForUser(req.user).flatMap(c => (c.items || []).map(i => ({ thang: c.collection_month || '', bst_list: c.name || '', pham_vi: c.store_name || '', sku: i.sku || '', ten_sp: i.product_name || '', ghi_chu_sp: i.note || '', ghi_chu_bst: c.description || '', nguoi_tao: c.created_by_name || '', ngay_tao: c.created_at || '' })));
  } else if (type === 'product_trainings') {
    rows = productTrainingRowsForUser(req.user).map(r => ({ id: r.id, pham_vi: r.store_name || '', bat_buoc_hoc: Number(r.is_required || 0) ? 'Có' : 'Không', han_hoc: r.due_at || '', ty_le_dat: Number(r.pass_percent || 90), so_cau_hoi: Number(r.quiz_question_count || 0), sku: r.sku || '', ten_sp: r.product_name || '', ngay_hang_ve: r.arrival_date || '', chat_lieu: r.material || '', kieu_dang_form: r.style_info || '', diem_ban_hang: r.selling_points || '', huong_dan_bao_quan_tu_van: r.care_instruction || '', loi_can_luu_y: r.common_errors || '', ghi_chu_dao_tao: r.training_note || '', trang_thai: r.status_label || '', nguoi_nhap: r.created_by_name || '', ngay_cap_nhat: r.updated_at || r.created_at || '' }));
  } else if (type === 'product_training_attempts') {
    rows = (db.product_training_attempts || []).filter(a => a.status !== 'deleted').map(a => { const t = (db.product_trainings || []).find(x => Number(x.id) === Number(a.training_id)); const u = getUser(a.user_id); return { id: a.id, bai_dao_tao: t ? `${t.sku || ''} ${t.product_name || ''}`.trim() : '', cua_hang: getStore(a.store_id)?.name || getStore(u?.store_id)?.name || '', nhan_vien: u?.full_name || '', diem: Number(a.score_percent || 0), dung: Number(a.correct_count || 0), tong_cau: Number(a.total_questions || 0), ket_qua: Number(a.passed || 0) ? 'Đạt' : 'Chưa đạt', ngay_lam_bai: a.created_at || '' }; });
  } else if (type === 'documents') {
    rows = documentRowsForUser(req.user).map(d => ({ id: d.id, title: d.title, category: d.category, store_name: d.store_name, version: d.version || '', original_name: d.original_name || '', created_by_name: d.created_by_name || '', created_at: d.created_at || '', download_count: Number(d.download_count || 0), description: d.description || '' }));
  } else if (type === 'bonuses') {
    rows = bonusRowsForUser(req.user);
  } else if (type === 'performance') {
    rows = computePerformance(req.user);
  } else {
    return res.status(404).json({ error: 'Loại xuất dữ liệu không hợp lệ' });
  }
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.attachment(`${type}-${dateOnly(new Date())}.csv`);
  res.send('\uFEFF' + toCsv(rows));
});

app.get('*', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log('==========================================');
  console.log('DEZUS STORE OPS WEB IS RUNNING');
  console.log(`Open: http://localhost:${PORT}`);
  console.log('Default login: admin / 123456');
  console.log('Data file: data/store_ops.json');
  console.log('==========================================');
});
