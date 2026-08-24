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
const XLSX = require('xlsx');

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
const SOURCE_CDP_OJTI_CATALOG_PATH = path.join(ROOT, 'data', 'cdp_ojti_catalog.json');
const RUNTIME_CDP_OJTI_CATALOG_PATH = path.join(DATA_DIR, 'cdp_ojti_catalog.json');
if (!fs.existsSync(RUNTIME_CDP_OJTI_CATALOG_PATH) && fs.existsSync(SOURCE_CDP_OJTI_CATALOG_PATH)) {
  fs.copyFileSync(SOURCE_CDP_OJTI_CATALOG_PATH, RUNTIME_CDP_OJTI_CATALOG_PATH);
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
function evidenceMimeType(filePath) {
  const ext = path.extname(filePath || '').toLowerCase();
  const byExt = {
    '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.bmp':'image/bmp','.avif':'image/avif',
    '.pdf':'application/pdf','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.xls':'application/vnd.ms-excel',
    '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.doc':'application/msword',
    '.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','.ppt':'application/vnd.ms-powerpoint','.csv':'text/csv'
  };
  if (byExt[ext]) return byExt[ext];
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(16);
    const read = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const b = buf.subarray(0, read);
    if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
    if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    if (b.length >= 6 && (b.toString('ascii', 0, 6) === 'GIF87a' || b.toString('ascii', 0, 6) === 'GIF89a')) return 'image/gif';
    if (b.length >= 4 && b.toString('ascii', 0, 4) === '%PDF') return 'application/pdf';
  } catch (_err) {}
  return 'application/octet-stream';
}

function evidenceExtensionFromMime(mime) {
  const map = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/bmp': '.bmp', 'image/avif': '.avif',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-powerpoint': '.ppt',
    'text/csv': '.csv'
  };
  return map[String(mime || '').toLowerCase()] || '';
}

function evidenceDownloadName(filename, mime) {
  const clean = path.basename(String(filename || '')).replace(/[\r\n"]/g, '');
  if (path.extname(clean)) return clean;
  const ext = evidenceExtensionFromMime(mime);
  return ext ? `${clean}${ext}` : clean;
}

app.get('/evidence-view/:filename', (req, res) => {
  const filename = path.basename(String(req.params.filename || ''));
  if (!filename || filename !== String(req.params.filename || '')) return res.status(400).send('File không hợp lệ');
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Không tìm thấy chứng từ');
  const mime = evidenceMimeType(filePath);
  const downloadName = evidenceDownloadName(filename, mime);
  res.setHeader('Content-Type', mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=300');
  if (/^(image\/|application\/pdf)/i.test(mime)) {
    res.setHeader('Content-Disposition', `inline; filename="${downloadName}"`);
    return res.sendFile(filePath);
  }
  return res.download(filePath, downloadName);
});

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(ROOT, 'public'), {
  setHeaders: (res, filePath) => {
    if (/\.(html|js|css)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

const ROLE_DEFAULTS = {
  admin: {
    can_assign_tasks: 1, can_edit_tasks: 1, can_delete_users: 1, can_manage_violations: 1, can_grade_checklists: 1,
    can_manage_sales: 1, can_manage_total_sales: 1, can_manage_daily_report: 1, can_set_sales_targets: 1, can_manage_weekly_report: 1, can_view_weekly_report: 1, can_view_reports: 1, can_manage_users: 1, can_export: 1, can_view_sales_target: 1, can_view_store_sales_summary: 1, can_manage_bonuses: 1, can_view_bonuses: 1, can_manage_documents: 1, can_view_documents: 1, can_manage_shifts: 1, can_manage_schedule: 1, can_view_schedule: 1, can_manage_orders: 1, can_view_orders: 1, can_manage_online_orders: 1, can_view_online_orders: 1, can_manage_product_feedback: 1, can_view_product_feedback: 1, can_manage_product_collections: 1, can_manage_product_training: 1, can_view_product_training: 1, can_manage_cdp_ojti: 1, can_view_cdp_ojti: 1, can_manage_cdp: 1, can_view_cdp: 1, can_manage_ojti: 1, can_view_ojti: 1
  },
  manager: {
    can_assign_tasks: 1, can_edit_tasks: 1, can_delete_users: 0, can_manage_violations: 1, can_grade_checklists: 1,
    can_manage_sales: 1, can_manage_total_sales: 1, can_manage_daily_report: 1, can_set_sales_targets: 0, can_manage_weekly_report: 1, can_view_weekly_report: 1, can_view_reports: 1, can_manage_users: 0, can_export: 1, can_view_sales_target: 0, can_view_store_sales_summary: 1, can_manage_bonuses: 0, can_view_bonuses: 1, can_manage_documents: 1, can_view_documents: 1, can_manage_shifts: 0, can_manage_schedule: 1, can_view_schedule: 1, can_manage_orders: 1, can_view_orders: 1, can_manage_online_orders: 1, can_view_online_orders: 1, can_manage_product_feedback: 1, can_view_product_feedback: 1, can_manage_product_collections: 0, can_manage_product_training: 0, can_view_product_training: 1, can_manage_cdp_ojti: 1, can_view_cdp_ojti: 1, can_manage_cdp: 1, can_view_cdp: 1, can_manage_ojti: 1, can_view_ojti: 1
  },
  employee: {
    can_assign_tasks: 0, can_edit_tasks: 0, can_delete_users: 0, can_manage_violations: 0, can_grade_checklists: 0,
    can_manage_sales: 0, can_manage_total_sales: 0, can_manage_daily_report: 0, can_set_sales_targets: 0, can_manage_weekly_report: 0, can_view_weekly_report: 0, can_view_reports: 0, can_manage_users: 0, can_export: 0, can_view_sales_target: 0, can_view_store_sales_summary: 0, can_manage_bonuses: 0, can_view_bonuses: 0, can_manage_documents: 0, can_view_documents: 1, can_manage_shifts: 0, can_manage_schedule: 0, can_view_schedule: 1, can_manage_orders: 0, can_view_orders: 1, can_manage_online_orders: 0, can_view_online_orders: 0, can_manage_product_feedback: 1, can_view_product_feedback: 1, can_manage_product_collections: 0, can_manage_product_training: 0, can_view_product_training: 1, can_manage_cdp_ojti: 0, can_view_cdp_ojti: 1, can_manage_cdp: 0, can_view_cdp: 1, can_manage_ojti: 0, can_view_ojti: 1
  }
};
ROLE_DEFAULTS.office = { ...ROLE_DEFAULTS.manager };

const TASK_PENALTIES = Object.freeze({
  LATE: 5,
  NOT_COMPLETED: 10,
});


const VIOLATION_LEVELS = {
  REMINDER: { label: 'Nhắc nhở', points: 1 },
  M1: { label: 'Ký WN / M1', points: 3 },
  M2: { label: 'M2 - Khiển trách bằng văn bản', points: 5 },
  M3: { label: 'M3 - Ảnh hưởng KPI / thưởng', points: 10 },
  M4: { label: 'M4 - Xử lý nghiêm trọng', points: 20 },
};
const VIOLATION_CATALOG = [
  ['DV01','Dịch vụ & tác phong','Không đảm bảo grooming/đồng phục theo quy định','REMINDER'],
  ['DV02','Dịch vụ & tác phong','Sử dụng điện thoại cá nhân trên sàn bán hàng','M1'],
  ['DV03','Dịch vụ & tác phong','Đi muộn, về sớm hoặc tự ý đổi ca','M1'],
  ['DV04','Dịch vụ & tác phong','Bỏ vị trí, ngồi khuất hoặc ngủ trong ca','M2'],
  ['DV05','Dịch vụ & tác phong','Không tiếp cận, hỗ trợ khách kịp thời','M1'],
  ['DV06','Dịch vụ & tác phong','Thái độ không phù hợp, gây phản hồi xấu về dịch vụ','M2'],
  ['DV07','Dịch vụ & tác phong','Không tuân thủ điều phối hoặc phân công trong ca','M1'],
  ['TN01','Thu ngân & hóa đơn','Không xuất hóa đơn cho khách','M2'],
  ['TN02','Thu ngân & hóa đơn','Gộp/tách hóa đơn hoặc chia turn sai thực tế','M2'],
  ['TN03','Thu ngân & hóa đơn','Hủy đơn hoặc sửa hóa đơn khi chưa được PKD duyệt','M2'],
  ['TN04','Thu ngân & hóa đơn','Trừ điểm thành viên hoặc áp dụng giảm giá sai quy định','M2'],
  ['TN05','Thu ngân & hóa đơn','Nhận thanh toán qua tài khoản/thẻ cá nhân','M4'],
  ['HH01','Hàng hóa & kho','Tự ý xuất/nhập/điều chỉnh phiếu hàng hóa','M2'],
  ['HH02','Hàng hóa & kho','Sai lệch phiếu, mã hàng, số lượng hoặc chứng từ kho','M2'],
  ['HH03','Hàng hóa & kho','Không bàn giao hàng hóa, tiền hoặc vật tư đúng quy trình','M2'],
  ['HH04','Hàng hóa & kho','Kiểm kê sai hoặc không báo cáo chênh lệch kịp thời','M2'],
  ['HH05','Hàng hóa & kho','Gây thất thoát hàng hóa do bất cẩn hoặc không kiểm soát','M3'],
  ['CS01','Đổi trả & dữ liệu khách hàng','Thực hiện đổi/trả sai quy định hoặc thiếu phê duyệt','M2'],
  ['CS02','Đổi trả & dữ liệu khách hàng','Nhập sai, dùng sai hoặc làm sai lệch dữ liệu khách hàng','M2'],
  ['CS03','Đổi trả & dữ liệu khách hàng','Tiết lộ hoặc sử dụng dữ liệu khách hàng sai mục đích','M4'],
  ['BC01','Báo cáo & vận hành','Nộp báo cáo trễ, thiếu hoặc sai số liệu','M1'],
  ['BC02','Báo cáo & vận hành','Không thực hiện checklist mở ca, đóng ca hoặc bàn giao','M1'],
  ['BC03','Báo cáo & vận hành','Không khắc phục lỗi sau khi đã được nhắc nhở','M2'],
  ['GL01','Gian lận & trung thực','Giữ/ghép hóa đơn hoặc thao tác để làm sai KPI','M4'],
  ['GL02','Gian lận & trung thực','Giả mạo chứng từ, báo cáo, hình ảnh hoặc dữ liệu','M4'],
  ['GL03','Gian lận & trung thực','Chiếm dụng tiền, hàng hóa hoặc tài sản công ty','M4'],
  ['GL04','Gian lận & trung thực','Che giấu, bao che hoặc không báo cáo vi phạm nghiêm trọng','M3'],
  ['AT01','An toàn & tài sản','Không tuân thủ quy định an toàn, PCCC hoặc bảo quản tài sản','M2'],
  ['AT02','An toàn & tài sản','Hành vi gây rủi ro nghiêm trọng cho người, hàng hoặc cửa hàng','M3'],
].map(([code, group, name, level]) => ({ code, group, name, level }));
function allViolationCatalog() {
  db.violation_catalog_custom = db.violation_catalog_custom || [];
  return [...VIOLATION_CATALOG, ...db.violation_catalog_custom.filter(x => x && x.status !== 'deleted')];
}
function violationCatalogItem(code) { return allViolationCatalog().find(x => x.code === String(code || '').trim()); }


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

// Decimal KPI values (UPT, CR, etc.) must preserve the decimal separator.
// Unlike money inputs, "2.50" means 2.50, not 250.
function toDecimalNumber(v, fallback = 0) {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  let raw = String(v).trim().replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  if (!raw) return fallback;
  if (raw.includes(',') && raw.includes('.')) {
    // Treat the last separator as the decimal separator.
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandsSep = decimalSep === ',' ? '.' : ',';
    raw = raw.split(thousandsSep).join('');
    if (decimalSep === ',') raw = raw.replace(',', '.');
  } else if (raw.includes(',')) {
    raw = raw.replace(',', '.');
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSavedTargetUpt(v) {
  const n = Number(v || 0);
  // UPT thực tế không thể ở mức hàng trăm; dữ liệu cũ 2.50 từng bị lưu thành 250.
  return n > 20 && n <= 2000 ? n / 100 : n;
}

function normalizeSavedTargetCr(v) {
  const n = Number(v || 0);
  // CR hợp lệ theo % nằm trong 0-100; dữ liệu cũ 35.00 có thể bị lưu thành 3500.
  return n > 100 && n <= 10000 ? n / 100 : n;
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
    nextIds: { stores: 6, users: 7, tasks: 1, task_assignees: 1, violations: 1, violation_catalog_custom: 1, assessments: 1, assessment_items: 1, sales: 1, sales_targets: 1, sales_daily_targets: 1, sales_store_days: 1, bonuses: 1, documents: 1, shifts: 6, work_schedules: 1, orders: 1, online_orders: 1, product_feedback: 1, product_collections: 1, product_collection_items: 1, product_trainings: 1, product_training_attempts: 1, product_training_reads: 1, weekly_reports: 1, daily_reports: 1, cdp_ojti: 1, product_sales_imports: 1, product_inventory_imports: 1, product_import_batches: 1, loyalty_claims: 1, ggnv_claims: 1, bill_cancel_claims: 1 },
    stores, users, permissions, shifts,
    tasks: [], task_assignees: [], violations: [], violation_catalog_custom: [], assessments: [], assessment_items: [], sales: [], sales_targets: [], sales_daily_targets: [], sales_store_days: [], bonuses: [], documents: [], orders: [], online_orders: [], product_feedback: [], product_collections: [], product_collection_items: [], product_trainings: [], product_training_attempts: [], product_training_reads: [], weekly_reports: [], daily_reports: [], cdp_ojti: [], product_sales_imports: [], product_inventory_imports: [], product_import_batches: [], loyalty_claims: [], ggnv_claims: [], bill_cancel_claims: [], work_schedules: []
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
      violation_catalog_custom: parsed.violation_catalog_custom || [],
      assessments: parsed.assessments || [],
      assessment_items: parsed.assessment_items || [],
      sales: parsed.sales || [],
      sales_targets: (parsed.sales_targets || []).map(t => ({ ...t, target_upt: normalizeSavedTargetUpt(t.target_upt), target_cr: normalizeSavedTargetCr(t.target_cr) })),
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
      product_training_reads: parsed.product_training_reads || [],
      weekly_reports: parsed.weekly_reports || [],
      daily_reports: parsed.daily_reports || [],
      cdp_ojti: parsed.cdp_ojti || [],
      product_sales_imports: parsed.product_sales_imports || [],
      product_inventory_imports: parsed.product_inventory_imports || [],
      product_import_batches: parsed.product_import_batches || [],
      loyalty_claims: parsed.loyalty_claims || [],
      ggnv_claims: parsed.ggnv_claims || [],
      bill_cancel_claims: parsed.bill_cancel_claims || [],
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
function isAllStoreRole(user) { return user?.role === 'admin' || user?.role === 'office'; }
function canSelectAssignedStore(user) {
  return isAllStoreRole(user) || (user?.role === 'manager' && getUserStoreIds(user).length > 1);
}
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
  if (isAllStoreRole(user)) return true;
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
    inactive_at: u.inactive_at || u.deleted_at || null,
    inactive_by: u.inactive_by || u.deleted_by || null,
    permissions: getPermissions(u.id, u.role)
  };
}
function canAccessStore(req, storeId) { return userHasStore(req.user, storeId); }


const CDP_OJTI_POSITIONS = [
  { key: 'dskd', label: 'Đại Sứ Kinh Doanh', short: 'ĐSKD' },
  { key: 'dscc', label: 'Đại Sứ Kinh Doanh Cấp Cao', short: 'ĐSCC' },
  { key: 'cht', label: 'Cửa Hàng Trưởng', short: 'CHT' }
];
function cdpOjtiPositionLabel(key) {
  return CDP_OJTI_POSITIONS.find(p => p.key === key)?.label || String(key || 'Chưa phân vị trí');
}
function canViewCdpOjti(user, type = null) {
  if (user?.role === 'admin') return true;
  const p = user?.permissions || {};
  const legacy = Number(p.can_view_cdp_ojti) === 1 || Number(p.can_manage_cdp_ojti) === 1;
  if (type === 'cdp') return legacy || Number(p.can_view_cdp) === 1 || Number(p.can_manage_cdp) === 1;
  if (type === 'ojti') return legacy || Number(p.can_view_ojti) === 1 || Number(p.can_manage_ojti) === 1;
  return legacy || Number(p.can_view_cdp) === 1 || Number(p.can_manage_cdp) === 1 || Number(p.can_view_ojti) === 1 || Number(p.can_manage_ojti) === 1;
}
function canManageCdpOjti(user, type = null) {
  if (user?.role === 'admin') return true;
  const p = user?.permissions || {};
  const legacy = Number(p.can_manage_cdp_ojti) === 1;
  if (type === 'cdp') return legacy || Number(p.can_manage_cdp) === 1;
  if (type === 'ojti') return legacy || Number(p.can_manage_ojti) === 1;
  return legacy || Number(p.can_manage_cdp) === 1 || Number(p.can_manage_ojti) === 1;
}
function normalizeIdArray(list) {
  return Array.from(new Set((Array.isArray(list) ? list : []).map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0)));
}
function cdpOjtiRowsForUser(user, type = null) {
  db.cdp_ojti = db.cdp_ojti || [];
  if (type && ['cdp', 'ojti'].includes(String(type)) && !canViewCdpOjti(user, String(type))) return [];
  let rows = db.cdp_ojti.filter(r => r.status !== 'deleted' && canViewCdpOjti(user, String(r.type || 'cdp')));
  if (type && ['cdp', 'ojti'].includes(String(type))) rows = rows.filter(r => String(r.type) === String(type));
  if (user.role === 'employee') rows = rows.filter(r => normalizeIdArray(r.trainee_ids).includes(Number(user.id)) || Number(r.trainer_id) === Number(user.id));
  else if (user.role === 'manager') rows = rows.filter(r => userHasStore(user, r.store_id));
  return rows.map(r => {
    const trainees = normalizeIdArray(r.trainee_ids).map(getUser).filter(Boolean);
    const trainer = getUser(r.trainer_id);
    const creator = getUser(r.created_by);
    const linkedTask = r.linked_task_id ? db.tasks.find(t => Number(t.id) === Number(r.linked_task_id)) : null;
    return {
      ...r,
      trainee_ids: normalizeIdArray(r.trainee_ids),
      trainee_names: trainees.map(u => u.full_name).join(', '),
      trainer_name: trainer?.full_name || '',
      created_by_name: creator?.full_name || '',
      store_name: getStore(r.store_id)?.name || '',
      position_label: cdpOjtiPositionLabel(r.position_key),
      linked_task_title: linkedTask?.title || '',
      linked_task_due_at: linkedTask?.due_at || ''
    };
  }).sort((a, b) => String(b.plan_date || '').localeCompare(String(a.plan_date || '')) || Number(b.id) - Number(a.id));
}
function upsertOjtiLinkedTask(row, actor) {
  if (!row || row.type !== 'ojti') return null;
  const storeId = Number(row.store_id || getPrimaryStoreId(actor));
  const trainees = normalizeIdArray(row.trainee_ids).filter(uid => {
    const u = getActiveUser(uid);
    return u && u.role !== 'admin' && userHasStore(u, storeId);
  });
  if (!trainees.length) return null;
  const dueDate = dateOnly(row.plan_date || new Date());
  const dueAt = `${dueDate}T${row.due_time || '22:00'}`;
  const trainer = getUser(row.trainer_id);
  const desc = [
    'Tự tạo từ mục OJTI - Đào tạo thường xuyên.',
    `Vị trí: ${cdpOjtiPositionLabel(row.position_key)}`,
    trainer ? `Người đào tạo: ${trainer.full_name}` : '',
    row.objective ? `Mục tiêu: ${row.objective}` : '',
    row.content ? `Nội dung: ${row.content}` : '',
    row.note ? `Ghi chú: ${row.note}` : ''
  ].filter(Boolean).join('\n');
  let task = row.linked_task_id ? db.tasks.find(t => Number(t.id) === Number(row.linked_task_id)) : null;
  if (!task) {
    task = { id: nextId('tasks'), created_by: actor.id, created_at: nowIso() };
    db.tasks.push(task);
  }
  task.title = `[OJTI] ${row.title || cdpOjtiPositionLabel(row.position_key)}`;
  task.description = desc;
  task.priority = row.priority || 'medium';
  task.due_at = dueAt;
  task.task_date = dueDate;
  task.store_id = storeId;
  task.score_value = Number(row.score_value || 5);
  task.category = 'people_training';
  task.shift_ids = [];
  task.shift_label = '';
  task.recurrence_batch = null;
  task.recurrence_label = '';
  task.updated_by = actor.id;
  task.updated_at = nowIso();
  db.task_assignees = (db.task_assignees || []).filter(a => Number(a.task_id) !== Number(task.id));
  const taskUsers = new Set(trainees);
  const trainerUser = getActiveUser(row.trainer_id);
  if (trainerUser && trainerUser.role === 'manager' && userHasStore(trainerUser, storeId)) taskUsers.add(Number(trainerUser.id));
  Array.from(taskUsers).forEach(uid => db.task_assignees.push({ id: nextId('task_assignees'), task_id: task.id, user_id: uid, completed_at: null, evidence_path: null, evidence_note: '', points_delta: 0 }));
  return task.id;
}


function loadCdpOjtiCatalog() {
  const filePath = fs.existsSync(RUNTIME_CDP_OJTI_CATALOG_PATH) ? RUNTIME_CDP_OJTI_CATALOG_PATH : SOURCE_CDP_OJTI_CATALOG_PATH;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return raw && Array.isArray(raw.positions) ? raw : { positions: [] };
  } catch (err) {
    console.error('Không đọc được cdp_ojti_catalog.json:', err.message);
    return { positions: [] };
  }
}
function cdpCatalogPositions() {
  const catalog = loadCdpOjtiCatalog();
  return (catalog.positions || []).map(p => ({ key: p.key, label: p.label, short: p.short || p.key }));
}
function findCdpCatalogPosition(key) {
  const catalog = loadCdpOjtiCatalog();
  return (catalog.positions || []).find(p => String(p.key) === String(key)) || null;
}
function findCdpCatalogItem(positionKey, type, code) {
  const pos = findCdpCatalogPosition(positionKey);
  const bucket = pos ? pos[type === 'ojti' ? 'ojti' : 'cdp'] : null;
  if (!bucket) return null;
  for (const section of (bucket.sections || [])) {
    const item = (section.items || []).find(x => String(x.code) === String(code));
    if (item) return { ...item, section_title: section.title };
  }
  return null;
}
function normalizeCdpItemValues(list) {
  return (Array.isArray(list) ? list : []).map(v => ({
    code: String(v.code || '').trim(),
    score: v.score === '' || v.score === null || v.score === undefined ? '' : String(v.score).slice(0, 12),
    training_start: v.training_start ? dateOnly(v.training_start) : '',
    training_end: v.training_end ? dateOnly(v.training_end) : '',
    note: String(v.note || '').trim().slice(0, 3000),
    result: String(v.result || '').trim().slice(0, 3000),
    task_remark: String(v.task_remark || '').trim().slice(0, 5000),
    task_completed_at: v.task_completed_at ? String(v.task_completed_at).slice(0, 40) : '',
    task_completed_by: v.task_completed_by ? Number(v.task_completed_by) : null,
    task_assignment_id: v.task_assignment_id ? Number(v.task_assignment_id) : null,
    task_points_delta: v.task_points_delta === '' || v.task_points_delta === null || v.task_points_delta === undefined ? '' : Number(v.task_points_delta || 0)
  })).filter(v => v.code);
}
function mergeCdpTaskRemarks(previousValues, nextValues) {
  const oldMap = new Map((Array.isArray(previousValues) ? previousValues : []).map(v => [String(v.code || ''), v]));
  return (Array.isArray(nextValues) ? nextValues : []).map(v => {
    const old = oldMap.get(String(v.code || '')) || {};
    return {
      ...v,
      task_remark: v.task_remark || old.task_remark || '',
      task_completed_at: v.task_completed_at || old.task_completed_at || '',
      task_completed_by: v.task_completed_by || old.task_completed_by || null,
      task_assignment_id: v.task_assignment_id || old.task_assignment_id || null,
      task_points_delta: v.task_points_delta === '' || v.task_points_delta === null || v.task_points_delta === undefined ? (old.task_points_delta ?? '') : v.task_points_delta
    };
  });
}
function syncOjtiTaskRemarkFromAssignment(task, assignment) {
  if (!task || !assignment) return false;
  let changed = false;
  db.cdp_ojti = db.cdp_ojti || [];
  db.cdp_ojti.forEach(row => {
    if (!row || row.status === 'deleted' || row.type !== 'ojti') return;
    const linked = row.linked_task_ids || {};
    let code = task.source_type === 'ojti' && Number(task.source_record_id) === Number(row.id) ? task.source_item_code : null;
    if (!code) {
      code = Object.keys(linked).find(k => Number(linked[k]) === Number(task.id));
    }
    if (!code) return;
    row.item_values = Array.isArray(row.item_values) ? row.item_values : [];
    let item = row.item_values.find(v => String(v.code) === String(code));
    if (!item) {
      item = { code: String(code), score: '', training_start: task.task_date || dateOnly(task.due_at || new Date()), training_end: '', note: '' };
      row.item_values.push(item);
    }
    item.task_remark = String(assignment.evidence_note || '').trim().slice(0, 5000);
    item.task_completed_at = assignment.completed_at || nowIso();
    item.task_completed_by = Number(assignment.user_id || 0) || null;
    item.task_assignment_id = Number(assignment.id || 0) || null;
    item.task_points_delta = Number(assignment.points_delta || 0);
    row.updated_at = nowIso();
    changed = true;
  });
  return changed;
}
function normalizeOpenValues(obj) {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    Object.keys(obj).forEach(k => { out[String(k).slice(0, 80)] = String(obj[k] || '').trim().slice(0, 5000); });
  }
  return out;
}
function upsertOjtiTasksFromRecord(row, actor) {
  if (!row || row.type !== 'ojti') return {};
  const storeId = Number(row.store_id || getPrimaryStoreId(actor));
  const trainees = normalizeIdArray(row.trainee_ids).filter(uid => {
    const u = getActiveUser(uid);
    return u && u.role !== 'admin' && userHasStore(u, storeId);
  });
  if (!trainees.length) return row.linked_task_ids || {};
  const linked = { ...(row.linked_task_ids || {}) };
  const trainer = getUser(row.trainer_id);
  const posLabel = cdpOjtiPositionLabel(row.position_key);
  (row.item_values || []).forEach(v => {
    const dueDate = v.training_end || v.training_start;
    if (!dueDate) return;
    const item = findCdpCatalogItem(row.position_key, 'ojti', v.code) || {};
    const itemTitle = item.competency || item.group || v.code;
    let task = linked[v.code] ? db.tasks.find(t => Number(t.id) === Number(linked[v.code])) : null;
    if (!task) {
      task = { id: nextId('tasks'), created_by: actor.id, created_at: nowIso() };
      db.tasks.push(task);
    }
    task.title = `[OJTI] ${v.code} - ${String(itemTitle).slice(0, 100)}`;
    task.description = [
      'Tự tạo từ ngày training trong mục OJTI.',
      `Vị trí: ${posLabel}`,
      item.section_title ? `Nhóm: ${item.section_title}` : '',
      trainer ? `Người đào tạo: ${trainer.full_name}` : '',
      item.criteria ? `Tiêu chí: ${item.criteria}` : '',
      v.note ? `Ghi chú: ${v.note}` : ''
    ].filter(Boolean).join('\n');
    task.priority = row.priority || 'medium';
    task.due_at = `${dateOnly(dueDate)}T${row.due_time || '22:00'}`;
    task.task_date = dateOnly(dueDate);
    task.store_id = storeId;
    task.score_value = Number(row.score_value || 5);
    task.category = 'people_training';
    task.shift_ids = [];
    task.shift_label = '';
    task.recurrence_batch = null;
    task.recurrence_label = 'Tạo từ OJTI';
    task.source_type = 'ojti';
    task.source_record_id = row.id;
    task.source_item_code = v.code;
    task.updated_by = actor.id;
    task.updated_at = nowIso();
    const existingAssignments = (db.task_assignees || []).filter(a => Number(a.task_id) === Number(task.id));
    db.task_assignees = (db.task_assignees || []).filter(a => Number(a.task_id) !== Number(task.id));
    trainees.forEach(uid => {
      const oldAssignment = existingAssignments.find(a => Number(a.user_id) === Number(uid));
      db.task_assignees.push(oldAssignment || { id: nextId('task_assignees'), task_id: task.id, user_id: uid, completed_at: null, evidence_path: null, evidence_note: '', points_delta: 0 });
    });
    linked[v.code] = task.id;
  });
  return linked;
}

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

// V4.58 - Cho phép dùng link Google Drive/URL thay vì upload file nặng, giúp tiết kiệm dung lượng Disk.
function normalizeExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) return '';
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol)) return '';
    return u.toString();
  } catch (_err) {
    return '';
  }
}
function isSafePublicProductUrl(value) {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) return '';
  try {
    const u = new URL(normalized);
    const host = String(u.hostname || '').toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.local')) return '';
    if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return '';
    if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return '';
    return u.toString();
  } catch (_err) { return ''; }
}
function htmlDecodeBasic(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}
function absoluteProductImageUrl(value, pageUrl) {
  const raw = htmlDecodeBasic(value).trim();
  if (!raw || /^data:/i.test(raw)) return '';
  try { return new URL(raw, pageUrl).toString(); } catch (_err) { return ''; }
}
function productImageFromHtml(html, pageUrl) {
  const text = String(html || '').slice(0, 1200000);
  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image(?::src)?["']/i,
    /"image"\s*:\s*"(https?:\\?\/\\?\/[^"\\]+(?:\\.[^"\\]*)?)"/i,
    /<img[^>]+(?:id|class)=["'][^"']*(?:product|main|featured)[^"']*["'][^>]+src=["']([^"']+)["']/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const candidate = String(match[1] || '').replace(/\\\//g, '/').replace(/\\u0026/gi, '&');
    const absolute = absoluteProductImageUrl(candidate, pageUrl);
    if (absolute) return absolute;
  }
  return '';
}
async function resolveProductImageUrl(productUrl) {
  const safeUrl = isSafePublicProductUrl(productUrl);
  if (!safeUrl) return '';
  if (/\.(?:jpe?g|png|webp|gif|avif)(?:[?#].*)?$/i.test(safeUrl)) return safeUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(safeUrl, {
      redirect: 'follow', signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DezusStoreOps/4.79)', 'Accept': 'text/html,application/xhtml+xml,image/avif,image/webp,*/*;q=0.8' }
    });
    if (!resp.ok) return '';
    const contentType = String(resp.headers.get('content-type') || '').toLowerCase();
    if (contentType.startsWith('image/')) return resp.url || safeUrl;
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) return '';
    const html = await resp.text();
    return productImageFromHtml(html, resp.url || safeUrl);
  } catch (_err) { return ''; }
  finally { clearTimeout(timer); }
}

function externalLinksFromText(value) {
  return String(value || '')
    .split(/[\n,]+/)
    .map(v => normalizeExternalUrl(v))
    .filter(Boolean);
}
function mergeStoredFilesAndLinks(storedJson, linksText) {
  let items = [];
  if (storedJson) {
    try { items = JSON.parse(storedJson); } catch (_err) { items = [storedJson]; }
  }
  const links = externalLinksFromText(linksText);
  const merged = [...items, ...links].filter(Boolean);
  return merged.length ? JSON.stringify(merged) : null;
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
    const items = collectionItems(c.id).map(i => ({ id: i.id, sku: i.sku || '', product_name: i.product_name || '', note: i.note || '', sort_order: Number(i.sort_order || 0), source_training_id: i.source_training_id || null }));
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

function monthFromTraining(row) {
  const candidates = [row.arrival_date, row.due_at, row.updated_at, row.created_at, new Date()];
  for (const c of candidates) {
    const m = monthKey(c || new Date());
    if (/^\d{4}-\d{2}$/.test(String(m || ''))) return m;
  }
  return monthKey(new Date());
}
function autoTrainingCollectionName(month) {
  return `Tự động từ Học SP ${month}`;
}
function syncTrainingProductCollections(actorId = null) {
  db.product_trainings = db.product_trainings || [];
  db.product_collections = db.product_collections || [];
  db.product_collection_items = db.product_collection_items || [];
  const groups = new Map();
  (db.product_trainings || [])
    .filter(r => r.status !== 'deleted' && (r.product_name || r.sku))
    .forEach(r => {
      const month = monthFromTraining(r);
      const key = `${Number(r.store_id || 0)}||${month}`;
      if (!groups.has(key)) groups.set(key, { store_id: r.store_id ? Number(r.store_id) : null, month, items: [] });
      groups.get(key).items.push(r);
    });
  let changed = false;
  groups.forEach(group => {
    const storeId = group.store_id || null;
    const name = autoTrainingCollectionName(group.month);
    let col = db.product_collections.find(c => c.status !== 'deleted' && c.auto_source === 'product_training' && Number(c.store_id || 0) === Number(storeId || 0) && String(c.collection_month || '') === String(group.month));
    if (!col) {
      col = {
        id: nextId('product_collections'),
        store_id: storeId,
        collection_month: group.month,
        name,
        description: 'Danh mục tự động tạo từ Học & Test sản phẩm. Cửa hàng dùng danh mục này để đánh giá sản phẩm đã được học.',
        auto_source: 'product_training',
        status: 'active',
        created_by: actorId || null,
        created_at: nowIso(),
        updated_at: nowIso()
      };
      db.product_collections.push(col);
      changed = true;
    } else {
      if (col.name !== name) { col.name = name; changed = true; }
      if (col.status === 'deleted') { col.status = 'active'; changed = true; }
      col.description = col.description || 'Danh mục tự động tạo từ Học & Test sản phẩm.';
    }
    const existingItems = db.product_collection_items.filter(i => Number(i.collection_id) === Number(col.id));
    const seen = new Set();
    group.items.forEach((tr, idx) => {
      const identity = normalizeTrainingIdentity(tr.product_name || tr.sku);
      if (!identity || seen.has(identity)) return;
      seen.add(identity);
      let item = existingItems.find(i => normalizeTrainingIdentity(i.product_name || i.sku) === identity);
      if (!item) {
        item = {
          id: nextId('product_collection_items'),
          collection_id: col.id,
          sku: String(tr.sku || '').trim(),
          product_name: String(tr.product_name || '').trim(),
          note: [tr.color_options ? `Màu: ${tr.color_options}` : '', tr.product_url ? `Link SP: ${tr.product_url}` : ''].filter(Boolean).join(' | '),
          sort_order: idx + 1,
          source_training_id: tr.id,
          status: 'active',
          created_at: nowIso()
        };
        db.product_collection_items.push(item);
        changed = true;
      } else {
        if (item.status === 'deleted') { item.status = 'active'; changed = true; }
        if (!item.sku && tr.sku) { item.sku = String(tr.sku || '').trim(); changed = true; }
        if (!item.product_name && tr.product_name) { item.product_name = String(tr.product_name || '').trim(); changed = true; }
        const nextNote = [tr.color_options ? `Màu: ${tr.color_options}` : '', tr.product_url ? `Link SP: ${tr.product_url}` : ''].filter(Boolean).join(' | ');
        if (nextNote && item.note !== nextNote && Number(item.source_training_id || tr.id) === Number(tr.id)) { item.note = nextNote; changed = true; }
        if (!item.source_training_id) { item.source_training_id = tr.id; changed = true; }
      }
    });
    col.updated_at = nowIso();
    col.updated_by = actorId || col.updated_by || null;
  });
  if (changed) saveDb();
  return changed;
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
function normalizeTrainingIdentity(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}
function productTrainingIdentity(sku, productName) {
  // V4.76: nhận diện bài training theo TÊN SẢN PHẨM trước, không theo SKU.
  // Một sản phẩm nhiều màu/mã sẽ gom 1 bài học + 1 bài test nếu cùng tên.
  return normalizeTrainingIdentity(productName || sku);
}
function findExistingProductTraining(storeId, sku, productName, ignoreId = null) {
  const key = productTrainingIdentity(sku, productName);
  if (!key) return null;
  return (db.product_trainings || []).find(r => r.status !== 'deleted'
    && (!ignoreId || Number(r.id) !== Number(ignoreId))
    && Number(r.store_id || 0) === Number(storeId || 0)
    && productTrainingIdentity(r.sku, r.product_name) === key);
}
function trainingImageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/IMAGE\(\s*["']([^"']+)["']/i);
  const url = String(match ? match[1] : raw).trim();
  if (/^\/uploads\//i.test(url)) return url;
  return normalizeExternalUrl(url);
}
function trainingApplyPayload(row, payload, userId, isNew = false) {
  const { store_id, sku, product_name, color_options, image_url, product_url, arrival_date, material, style_info, selling_points, care_instruction, common_errors, training_note, status_label, is_required, due_at, pass_percent, quiz_text } = payload || {};
  if (store_id !== undefined) row.store_id = store_id ? Number(store_id) : null;
  if (sku !== undefined) row.sku = String(sku || '').trim();
  if (product_name !== undefined) row.product_name = String(product_name || '').trim();
  if (color_options !== undefined) row.color_options = String(color_options || '').trim();
  if (image_url !== undefined) row.image_url = trainingImageUrl(image_url);
  if (product_url !== undefined) row.product_url = normalizeExternalUrl(product_url);
  if (arrival_date !== undefined) row.arrival_date = arrival_date || '';
  if (material !== undefined) row.material = String(material || '').trim();
  if (style_info !== undefined) row.style_info = String(style_info || '').trim();
  if (selling_points !== undefined) row.selling_points = String(selling_points || '').trim();
  if (care_instruction !== undefined) row.care_instruction = String(care_instruction || '').trim();
  if (common_errors !== undefined) row.common_errors = String(common_errors || '').trim();
  if (training_note !== undefined) row.training_note = String(training_note || '').trim();
  if (status_label !== undefined || isNew) row.status_label = status_label || 'Sắp về';
  if (is_required !== undefined || isNew) row.is_required = Number(is_required || 0) ? 1 : 0;
  if (due_at !== undefined) row.due_at = due_at || '';
  if (pass_percent !== undefined || isNew) row.pass_percent = Number(pass_percent || 90);
  if (quiz_text !== undefined) {
    const parsedQuiz = parseQuizText(quiz_text);
    row.quiz_questions = parsedQuiz.length ? parsedQuiz : buildDefaultTrainingQuiz(row);
  } else if (isNew && !row.quiz_questions) {
    row.quiz_questions = buildDefaultTrainingQuiz(row);
  }
  row.updated_by = userId;
  row.updated_at = nowIso();
  if (isNew) {
    row.created_by = userId;
    row.created_at = nowIso();
    row.status = 'active';
  }
}
function trainingQuizOptionText(value, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text ? (text.length > 140 ? text.slice(0, 137) + '...' : text) : fallback;
}
function buildDefaultTrainingQuiz(row) {
  const make = (question, answer, decoys) => {
    const correct = trainingQuizOptionText(answer);
    if (!correct) return null;
    const options = [correct, ...(decoys || [])].map(x => trainingQuizOptionText(x)).filter(Boolean);
    const unique = [];
    options.forEach(x => { if (!unique.some(y => y.toLowerCase() === x.toLowerCase())) unique.push(x); });
    if (unique.length < 2) return null;
    return { question, options: unique.slice(0, 4), correct_index: 0 };
  };
  return [
    make('Chất liệu/điểm chất liệu chính của sản phẩm là gì?', row.material || row.selling_points, ['Chưa xác định chất liệu', 'Chất liệu không cần tư vấn', 'Không có điểm nổi bật về chất liệu']),
    make('Khách hàng hoặc nhu cầu phù hợp với sản phẩm là gì?', row.training_note || row.selling_points, ['Khách không cần tư vấn', 'Chỉ phù hợp mặc ở nhà', 'Không cần xác định nhu cầu khách']),
    make('Khi tư vấn hoặc thử đồ cần lưu ý gì?', row.common_errors || row.care_instruction, ['Không cần kiểm tra size/form', 'Không cần hướng dẫn bảo quản', 'Không cần lưu ý khi thử đồ'])
  ].filter(Boolean);
}
function trainingQuestions(row, includeAnswers = false) {
  let questions = [];
  try { questions = Array.isArray(row.quiz_questions) ? row.quiz_questions : JSON.parse(row.quiz_questions || '[]'); } catch (_err) { questions = []; }
  questions = questions.filter(q => q && String(q.question || '').trim());
  if (!questions.length && row) questions = buildDefaultTrainingQuiz(row);
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

function trainingLearnRecord(trainingId, userId) {
  db.product_training_reads = db.product_training_reads || [];
  return db.product_training_reads.find(r => Number(r.training_id) === Number(trainingId) && Number(r.user_id) === Number(userId) && r.status !== 'deleted') || null;
}
function markTrainingLearned(row, user) {
  db.product_training_reads = db.product_training_reads || [];
  let record = trainingLearnRecord(row.id, user.id);
  if (!record) {
    record = { id: nextId('product_training_reads'), training_id: row.id, user_id: user.id, store_id: user.store_id || row.store_id || null, status: 'active', created_at: nowIso() };
    db.product_training_reads.push(record);
  }
  record.learned_at = record.learned_at || nowIso();
  record.updated_at = nowIso();
  return record;
}
function trainingProgress(trainingId, userId, passPercent = 90) {
  const attempts = trainingAttemptsFor(trainingId, userId).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const learnedRecord = trainingLearnRecord(trainingId, userId);
  const bestScore = attempts.length ? Math.max(...attempts.map(a => Number(a.score_percent || 0))) : 0;
  const passed = attempts.some(a => Number(a.passed) === 1 || Number(a.score_percent || 0) >= Number(passPercent || 90));
  const passedAttempt = attempts.find(a => Number(a.passed) === 1 || Number(a.score_percent || 0) >= Number(passPercent || 90));
  return { attempts_count: attempts.length, best_score: Math.round(bestScore * 100) / 100, passed, completed_at: passedAttempt ? passedAttempt.created_at : null, last_score: attempts[0] ? Number(attempts[0].score_percent || 0) : null, learned: !!learnedRecord, learned_at: learnedRecord ? learnedRecord.learned_at : null };
}

function trainingAssignees(row) {
  if (!row || Number(row.is_required || 0) !== 1) return [];
  return db.users.filter(u => u.status === 'active' && ['employee','manager'].includes(u.role) && (!row.store_id || Number(u.store_id) === Number(row.store_id)));
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
    const progress = (user.role === 'employee' || user.role === 'manager' || (!Number(user.permissions.can_manage_product_training) && Number(user.permissions.can_view_product_training))) ? trainingProgress(r.id, user.id, r.pass_percent || 90) : null;
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
  return rows.map(x => {
    const emp = getUser(x.user_id);
    const shift = (db.shifts || []).find(s => Number(s.id) === Number(x.shift_id));
    const creator = getUser(x.created_by);
    const updater = getUser(x.updated_by);
    return { ...x, employee_name: emp ? emp.full_name : '', shift_name: shift ? shift.name : '', shift_code: shift ? shift.code : '', shift_start: shift ? shift.start_time : '', shift_end: shift ? shift.end_time : '', created_by_name: creator ? creator.full_name : '', updated_by_name: updater ? updater.full_name : '' };
  }).sort((a, b) => String(a.work_date).localeCompare(String(b.work_date)) || String(a.employee_name).localeCompare(String(b.employee_name), 'vi'));
}

const TASK_CATEGORIES = {
  ops: 'Vận hành / OPS',
  sales_cskh: 'Bán hàng / CSKH',
  inventory: 'Hàng hóa',
  vm: 'VM / Hình ảnh',
  reports: 'Báo cáo / Kiểm soát',
  people_training: 'Quản lý nhân sự / Đào tạo',
  other: 'Khác'
};
const TASK_WORK_STANDARDS = {
  employee: {
    ops: { count: 26, points: 12 },
    sales_cskh: { count: 5, points: 2 },
    inventory: { count: 22, points: 10 },
    vm: { count: 20, points: 9 },
    reports: { count: 5, points: 2 }
  },
  manager: {
    ops: { count: 26, points: 12 },
    people_training: { count: 12, points: 6 },
    inventory: { count: 18, points: 8 },
    vm: { count: 12, points: 5 },
    reports: { count: 10, points: 4 }
  }
};
function normalizeTaskCategory(value) {
  const key = String(value || '').trim();
  return TASK_CATEGORIES[key] ? key : 'ops';
}
function taskScoreCategoryForUser(task, user) {
  let key = normalizeTaskCategory(task?.category);
  if (key === 'other') key = 'ops';
  const standard = TASK_WORK_STANDARDS[user?.role] || TASK_WORK_STANDARDS.employee;
  // Nhóm Quản lý nhân sự / Đào tạo chỉ tính vào 35 điểm của CHT.
  if (!standard[key]) return null;
  return key;
}
function taskCategoryLabel(value) {
  return TASK_CATEGORIES[normalizeTaskCategory(value)] || TASK_CATEGORIES.ops;
}

const TASK_OVERDUE_GRACE_MS = 4 * 60 * 60 * 1000;
function taskStatus(row, refNow) {
  const nowMs = refNow ? new Date(refNow).getTime() : Date.now();
  const dueMs = new Date(row.due_at).getTime();
  if (String(row.resolution_status || '') === 'not_completed') return 'not_completed';
  if (row.completed_at) {
    const completedMs = new Date(row.completed_at).getTime();
    if (completedMs <= dueMs) return 'completed_on_time';
    return completedMs - dueMs > TASK_OVERDUE_GRACE_MS ? 'not_completed' : 'completed_late';
  }
  if (!Number.isFinite(dueMs) || nowMs <= dueMs) return 'assigned';
  return nowMs - dueMs > TASK_OVERDUE_GRACE_MS ? 'not_completed' : 'overdue';
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
  // Tính theo dòng target đã lưu, không phụ thuộc tài khoản còn active hay đã nghỉ.
  // Nhờ vậy khi nhân viên nghỉ/ngưng hoạt động, target lịch sử của cửa hàng vẫn không bị mất.
  const monthSet = new Set((months || []).map(String));
  const targetRows = (db.sales_targets || []).filter(t => Number(t.store_id) === Number(storeId) && monthSet.has(String(t.target_month)));
  const avg = key => {
    const vals = targetRows.map(r => Number(r[key] || 0)).filter(v => v > 0);
    return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100 : 0;
  };
  return {
    target: targetRows.reduce((sum, r) => sum + Number(r.target_revenue ?? r.target ?? 0), 0),
    target_upt: avg('target_upt'),
    target_atv: avg('target_atv'),
    target_cr: avg('target_cr'),
  };
}


function periodPaceMetrics(start, end, target, revenue, _closedDates = []) {
  const startDate = dateOnly(start);
  const endDate = dateOnly(end);
  const startD = new Date(`${startDate}T00:00:00Z`);
  const endD = new Date(`${endDate}T00:00:00Z`);
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((endD - startD) / dayMs));

  // V4.129: Chốt ngày theo mốc 23:00 giờ Việt Nam.
  // Trước 23:00: hôm nay chưa tính là ngày đã qua. Từ 23:00: tính luôn hôm nay.
  // Tháng quá khứ = đủ toàn bộ số ngày; tháng tương lai = 0 ngày.
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  const todayDate = `${parts.year}-${parts.month}-${parts.day}`;
  const currentHour = Number(parts.hour || 0);
  const todayD = new Date(`${todayDate}T00:00:00Z`);

  let elapsedDays = 0;
  if (todayD >= endD) {
    elapsedDays = totalDays;
  } else if (todayD < startD) {
    elapsedDays = 0;
  } else {
    const completedBeforeToday = Math.max(0, Math.round((todayD - startD) / dayMs));
    elapsedDays = completedBeforeToday + (currentHour >= 23 ? 1 : 0);
    elapsedDays = Math.min(totalDays, Math.max(0, elapsedDays));
  }

  const daysRemaining = Math.max(0, totalDays - elapsedDays);
  const rev = toNumber(revenue, 0);
  const tgt = toNumber(target, 0);
  const dailyAverage = elapsedDays > 0 ? rev / elapsedDays : 0;
  const projectedRevenue = elapsedDays > 0 ? Math.round(dailyAverage * totalDays) : 0;
  const pacePercent = tgt ? Math.round((projectedRevenue / tgt) * 10000) / 100 : 0;
  const dailyNeeded = daysRemaining > 0 ? Math.ceil(Math.max(tgt - rev, 0) / daysRemaining) : Math.max(Math.ceil(tgt - rev), 0);
  return { pace_percent: pacePercent, projected_revenue: projectedRevenue, days_elapsed: elapsedDays, days_closed: elapsedDays, days_remaining: daysRemaining, daily_needed: dailyNeeded };
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
    ...periodPaceMetrics(start, end, target, revenue, rows.map(r => r.sale_date)),
    last_update
  };
}

function salesStaffForStore(storeId, opts = {}) {
  const options = typeof opts === 'string' ? { status: opts } : (opts || {});
  const statusMode = ['active', 'inactive', 'all'].includes(String(options.status || 'active')) ? String(options.status || 'active') : 'active';
  const sid = Number(storeId);
  const start = options.start ? dateVal(options.start) : null;
  const end = options.end ? dateVal(options.end) : null;
  const monthSet = start && end ? new Set(monthKeysBetween(start, end).map(String)) : new Set();
  const idsWithData = new Set();
  if (start && end) {
    (db.sales || []).forEach(r => {
      if (Number(r.store_id) === sid && dateVal(r.sale_date) >= start && dateVal(r.sale_date) < end) idsWithData.add(Number(r.user_id));
    });
    (db.sales_targets || []).forEach(r => {
      if (Number(r.store_id) === sid && monthSet.has(String(r.target_month))) idsWithData.add(Number(r.user_id));
    });
    (db.assessments || []).forEach(r => {
      if (Number(r.store_id) === sid && r.template_id === 'GUESTS' && dateVal(r.assessed_at) >= start && dateVal(r.assessed_at) < end) idsWithData.add(Number(r.employee_id));
    });
  }
  let rows = (db.users || []).filter(u => u.status !== 'deleted' && Number(getPrimaryStoreId(u)) === sid && u.role === 'employee');
  if (statusMode === 'active') rows = rows.filter(u => u.status === 'active');
  if (statusMode === 'inactive') rows = rows.filter(u => u.status !== 'active');
  if (start && end) {
    rows = rows.filter(u => u.status === 'active' || idsWithData.has(Number(u.id)) || statusMode === 'inactive');
    if (statusMode === 'inactive') rows = rows.filter(u => idsWithData.has(Number(u.id)));
  }
  return rows.sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')) || a.full_name.localeCompare(b.full_name, 'vi'));
}

function storeMonthlyTarget(storeId, month) {
  // Target cửa hàng/quản lý = tổng target cá nhân đã lưu trong tháng, kể cả nhân viên đã nghỉ/ngưng hoạt động.
  return (db.sales_targets || [])
    .filter(t => Number(t.store_id) === Number(storeId) && String(t.target_month) === String(month))
    .reduce((sum, t) => sum + Number(t.target_revenue ?? t.target ?? 0), 0);
}

function storeSalesProgressForPeriod(storeId, start, end) {
  const months = monthKeysBetween(start, end);
  const rows = (db.sales || []).filter(sa => Number(sa.store_id) === Number(storeId) && dateVal(sa.sale_date) >= start && dateVal(sa.sale_date) < end);
  const revenue = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const bill_count = rows.reduce((sum, r) => sum + Number(r.bill_count || 0), 0);
  const item_count = rows.reduce((sum, r) => sum + Number(r.item_count || 0), 0);
  const targets = aggregateKpiTargetsForStore(storeId, months);
  const target = targets.target;
  const customerMetrics = (db.sales_store_days || [])
    .filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.sale_date) >= start && dateVal(x.sale_date) < end)
    .reduce((acc, x) => {
      const counts = customerCountsFromRow(x);
      acc.customer_new_count += counts.customer_new_count;
      acc.customer_old_count += counts.customer_old_count;
      acc.customer_count += counts.customer_count;
      return acc;
    }, { customer_new_count: 0, customer_old_count: 0, customer_count: 0 });
  const customer_count = customerMetrics.customer_count;
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
    customer_new_count: customerMetrics.customer_new_count,
    customer_old_count: customerMetrics.customer_old_count,
    upt: bill_count ? Math.round((item_count / bill_count) * 100) / 100 : 0,
    atv: bill_count ? Math.round(revenue / bill_count) : 0,
    asp: item_count ? Math.round(revenue / item_count) : 0,
    cr: customer_count ? Math.round((bill_count / customer_count) * 10000) / 100 : 0,
    ...periodPaceMetrics(start, end, target, revenue, [
      ...rows.map(r => r.sale_date),
      ...(db.sales_store_days || [])
        .filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.sale_date) >= start && dateVal(x.sale_date) < end)
        .map(x => x.sale_date)
    ]),
    last_update
  };
}

function canViewStoreSales(user, storeId) {
  if (user.role === 'admin') return true;
  if (!userHasStore(user, storeId)) return false;
  return Number(user.permissions.can_view_store_sales_summary) === 1 || Number(user.permissions.can_manage_sales) === 1 || Number(user.permissions.can_view_sales_target) === 1;
}


function customerCountsFromRow(row) {
  const newCount = toNumber(row?.customer_new_count ?? row?.new_customer_count ?? row?.customer_new ?? row?.new_customers, 0);
  const oldCount = toNumber(row?.customer_old_count ?? row?.old_customer_count ?? row?.customer_old ?? row?.old_customers, 0);
  const totalRaw = toNumber(row?.customer_count ?? row?.customers ?? 0, 0);
  const total = (newCount || oldCount) ? newCount + oldCount : totalRaw;
  return { customer_new_count: newCount, customer_old_count: oldCount, customer_count: total };
}
function customerCountsFromInput(customerCount, customerNewCount, customerOldCount) {
  return customerCountsFromRow({ customer_count: customerCount, customer_new_count: customerNewCount, customer_old_count: customerOldCount });
}

function upsertStoreSalesDay(storeId, saleDate, customerCount, note, actorId, customerNewCount = 0, customerOldCount = 0) {
  db.sales_store_days = db.sales_store_days || [];
  const d = dateOnly(saleDate || new Date());
  const counts = customerCountsFromInput(customerCount, customerNewCount, customerOldCount);
  let row = db.sales_store_days.find(x => Number(x.store_id) === Number(storeId) && String(x.sale_date) === d);
  if (row) {
    row.customer_new_count = counts.customer_new_count;
    row.customer_old_count = counts.customer_old_count;
    row.customer_count = counts.customer_count;
    row.note = note || '';
    row.updated_by = actorId;
    row.updated_at = nowIso();
  } else {
    row = { id: nextId('sales_store_days'), store_id: Number(storeId), sale_date: d, customer_new_count: counts.customer_new_count, customer_old_count: counts.customer_old_count, customer_count: counts.customer_count, note: note || '', created_by: actorId, created_at: nowIso(), updated_by: actorId, updated_at: nowIso() };
    db.sales_store_days.push(row);
  }
  return row;
}

function approvedLoyaltyAmount(userId, saleDate) {
  const d = dateOnly(saleDate || new Date());
  return (db.loyalty_claims || [])
    .filter(x => x.status === 'approved' && Number(x.user_id) === Number(userId) && String(x.sale_date) === d)
    .reduce((sum, x) => sum + Number(x.discount_amount || 0), 0);
}

function recomputeSalesRevenueWithLoyalty(userId, saleDate, actorId = null) {
  const employee = getUser(Number(userId));
  if (!employee) return null;
  const d = dateOnly(saleDate || new Date());
  let row = (db.sales || []).find(sa => Number(sa.user_id) === Number(userId) && String(sa.sale_date) === d);
  const loyalty = approvedLoyaltyAmount(userId, d);
  if (!row && loyalty <= 0) return null;
  if (!row) {
    row = { id: nextId('sales'), user_id: employee.id, store_id: getPrimaryStoreId(employee), sale_date: d, base_revenue: 0, revenue: loyalty, bill_count: 0, item_count: 0, note: '', created_by: actorId, created_at: nowIso(), updated_by: actorId, updated_at: nowIso() };
    db.sales.push(row);
    return row;
  }
  if (row.base_revenue === undefined || row.base_revenue === null) row.base_revenue = Math.max(0, Number(row.revenue || 0) - loyalty);
  row.revenue = Number(row.base_revenue || 0) + loyalty;
  row.updated_by = actorId || row.updated_by;
  row.updated_at = nowIso();
  return row;
}

function upsertSalesRow(employee, saleDate, payload, actorId) {
  const d = dateOnly(saleDate || new Date());
  let row = (db.sales || []).find(sa => Number(sa.user_id) === Number(employee.id) && String(sa.sale_date) === d);
  if (row) {
    row.base_revenue = toNumber(payload.revenue, 0);
    row.revenue = row.base_revenue + approvedLoyaltyAmount(employee.id, d);
    row.bill_count = toNumber(payload.bill_count, 0);
    row.item_count = toNumber(payload.item_count, 0);
    row.note = payload.note || '';
    row.updated_by = actorId;
    row.updated_at = nowIso();
  } else {
    row = { id: nextId('sales'), user_id: employee.id, store_id: employee.store_id, sale_date: d, base_revenue: toNumber(payload.revenue, 0), revenue: toNumber(payload.revenue, 0) + approvedLoyaltyAmount(employee.id, d), bill_count: toNumber(payload.bill_count, 0), item_count: toNumber(payload.item_count, 0), note: payload.note || '', created_by: actorId, created_at: nowIso(), updated_by: actorId, updated_at: nowIso() };
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

function excelHeaderLabel(key) {
  const labels = {
    id:'ID', task_id:'Mã công việc', title:'Tiêu đề', priority:'Ưu tiên', due_at:'Hạn hoàn thành', store_id:'Mã chi nhánh', store_name:'Chi nhánh', cua_hang:'Chi nhánh', assignee_name:'Người thực hiện', completed_at:'Thời gian hoàn thành', evidence_path:'Minh chứng', evidence_note:'Ghi chú minh chứng', points_delta:'Điểm', status:'Trạng thái',
    sale_date:'Ngày', ngay:'Ngày', employee_name:'Nhân viên', nhan_vien:'Nhân viên', revenue:'Doanh thu', doanh_thu:'Doanh thu', bill_count:'Bill', bill:'Bill', item_count:'Số món', so_mon:'Số món', khach_moi:'Khách mới', khach_cu:'Khách cũ', luot_khach_tong:'Lượt khách tổng', upt:'UPT', atv:'ATV', asp:'ASP', cr:'CR', note:'Ghi chú', ghi_chu:'Ghi chú', created_at:'Ngày tạo', updated_at:'Ngày cập nhật', ngay_cap_nhat:'Ngày cập nhật',
    target_month:'Tháng target', target:'Target doanh thu', target_revenue:'Target doanh thu', target_ngay:'Target ngày', target_upt:'Target UPT', target_atv:'Target ATV', target_cr:'Target CR', target_date:'Ngày target',
    code:'Mã', name:'Tên', start_time:'Giờ bắt đầu', end_time:'Giờ kết thúc', work_date:'Ngày làm việc', role:'Vai trò', shift_code:'Mã ca', shift_name:'Tên ca',
    lan_order:'Lần order', sku:'SKU', product_name:'Tên sản phẩm', ten_sp:'Tên sản phẩm', size:'Size', tong_so_luong:'Tổng số lượng', ngay_dau:'Ngày đầu', ngay_cuoi:'Ngày cuối', trang_thai:'Trạng thái', so_dong_gop:'Số dòng gộp', nguoi_tao:'Người tạo',
    so_hoa_don:'Số hóa đơn', gia_tri_don:'Giá trị đơn', doanh_thu_huong_30:'Doanh thu hưởng 30%', nhan_vien_dong:'Nhân viên đóng đơn', nguoi_nhap:'Người nhập',
    thang_bst:'Tháng BST', bst_list:'BST / List', kieu_dang:'Kiểu dáng', chat_lieu:'Chất liệu', loi_san_pham:'Lỗi sản phẩm', danh_gia_khach:'Đánh giá khách', mong_muon_tai_san_pham:'Mong muốn tái sản phẩm',
    so_lan_danh_gia:'Số lần đánh giá', de_xuat_tai:'Đề xuất tái', khong_tai:'Không tái', theo_doi_them:'Theo dõi thêm', ket_luan:'Kết luận', tong_hop_kieu_dang:'Tổng hợp kiểu dáng', tong_hop_chat_lieu:'Tổng hợp chất liệu', tong_hop_loi:'Tổng hợp lỗi', tong_hop_y_kien_khach:'Tổng hợp ý kiến khách',
    thang:'Tháng', pham_vi:'Phạm vi', ghi_chu_sp:'Ghi chú sản phẩm', ghi_chu_bst:'Ghi chú BST', ngay_tao:'Ngày tạo', bat_buoc_hoc:'Bắt buộc học', han_hoc:'Hạn học', ty_le_dat:'Tỷ lệ đạt', so_cau_hoi:'Số câu hỏi', mau_hien_co:'Màu hiện có', anh_san_pham:'Ảnh sản phẩm', link_san_pham:'Link sản phẩm', ngay_hang_ve:'Ngày hàng về', kieu_dang_form:'Kiểu dáng / form', diem_ban_hang:'Điểm bán hàng', huong_dan_bao_quan_tu_van:'Hướng dẫn bảo quản / tư vấn', loi_can_luu_y:'Lỗi cần lưu ý', ghi_chu_dao_tao:'Ghi chú đào tạo',
    bai_dao_tao:'Bài đào tạo', diem:'Điểm', dung:'Số câu đúng', tong_cau:'Tổng câu', ket_qua:'Kết quả', ngay_lam_bai:'Ngày làm bài',
    loai:'Loại', vi_tri:'Vị trí', nhan_su:'Nhân sự', nguoi_dao_tao:'Người đào tạo', ma_tieu_chi:'Mã tiêu chí', nhom:'Nhóm', nang_luc:'Năng lực', tieu_chi:'Tiêu chí', ngay_training:'Ngày training', remark_cong_viec_hang_ngay:'Remark công việc hàng ngày', ngay_hoan_thanh_cong_viec:'Ngày hoàn thành công việc', link_cong_viec:'Link công việc', ghi_chu_training:'Ghi chú training', ghi_chu_chung:'Ghi chú chung', ngay_ke_hoach:'Ngày kế hoạch', gio_han:'Giờ hạn', tieu_de:'Tiêu đề', muc_tieu:'Mục tiêu', noi_dung:'Nội dung',
    category:'Danh mục', version:'Phiên bản', storage_type:'Loại lưu trữ', original_name:'Tên file', external_url:'Link', created_by_name:'Người tạo', download_count:'Lượt tải', description:'Mô tả',
    phan:'Phần', tu_ngay:'Từ ngày', den_ngay:'Đến ngày', target_tuan:'Target tuần', phan_tram_dat:'% đạt', target_tuan_uoc_tinh:'Target tuần ước tính', ty_trong_dt:'% tỷ trọng DT', trang_thai_nhan_su:'Trạng thái nhân sự', feedback:'Feedback', van_de:'Vấn đề', hanh_dong_tuan_toi:'Hành động tuần tới', feedback_san_pham:'Feedback sản phẩm', top:'Top', san_pham:'Sản phẩm', ten_ctkm:'Tên CTKM', so_bill_tham_gia:'Số bill tham gia'
  };
  if (labels[key]) return labels[key];
  return String(key || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function excelCellValue(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' | ');
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}
function toExcelBuffer(rows, sheetName = 'Du lieu') {
  const safeRows = Array.isArray(rows) ? rows : [];
  const keys = [];
  safeRows.forEach(r => Object.keys(r || {}).forEach(k => { if (!keys.includes(k)) keys.push(k); }));
  if (!keys.length) keys.push('noi_dung');
  const aoa = [keys.map(excelHeaderLabel)];
  safeRows.forEach(r => aoa.push(keys.map(k => excelCellValue(r?.[k]))));
  if (!safeRows.length) aoa.push(['Không có dữ liệu']);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = keys.map((k, idx) => {
    let max = String(aoa[0][idx] || '').length;
    for (let i = 1; i < Math.min(aoa.length, 300); i++) max = Math.max(max, String(aoa[i]?.[idx] ?? '').length);
    return { wch: Math.min(Math.max(max + 2, 10), 42) };
  });
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(0,aoa.length-1),c:Math.max(0,keys.length-1)}}) };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(sheetName || 'Du lieu').replace(/[\\/?*\[\]:]/g, ' ').slice(0,31));
  return XLSX.write(wb, { type:'buffer', bookType:'xlsx', compression:true });
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
function normalizeWeekdays(list) {
  const raw = Array.isArray(list) ? list : (list === undefined || list === null ? [] : [list]);
  return Array.from(new Set(raw.map(v => Number(v)).filter(v => Number.isFinite(v) && v >= 0 && v <= 6))).sort((a, b) => a - b);
}
function weekdayLabel(v) {
  return ({1:'T2',2:'T3',3:'T4',4:'T5',5:'T6',6:'T7',0:'CN'})[Number(v)] || '';
}
function dateRangeByWeekdays(start, end, weekdays = []) {
  const selected = new Set(normalizeWeekdays(weekdays));
  if (!selected.size) return dateRangeEvery(start, end, 1);
  const out = [];
  let cur = dateOnly(start);
  const last = dateOnly(end || start);
  let guard = 0;
  while (cur <= last && guard < 370) {
    const d = new Date(`${cur}T00:00:00Z`);
    if (selected.has(d.getUTCDay())) out.push(cur);
    cur = addDaysIso(cur, 1);
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


function taskWorkDate(row) {
  return dateOnly(row.task_date || row.due_at || new Date());
}
function syncFutureShiftTasksForSchedule(storeId, changedDates = [], actorId = null) {
  const today = dateOnly(new Date());
  const targetDates = new Set((changedDates || []).map(dateOnly).filter(d => d && d >= today));
  if (!targetDates.size) return { changed_tasks: 0, added_assignments: 0, removed_assignments: 0 };
  db.tasks = db.tasks || [];
  db.task_assignees = db.task_assignees || [];
  let changedTasks = 0;
  let addedAssignments = 0;
  let removedAssignments = 0;
  db.tasks.forEach(t => {
    if (t.status === 'deleted') return;
    if (Number(t.store_id) !== Number(storeId)) return;
    const workDate = taskWorkDate(t);
    if (!targetDates.has(workDate)) return;
    const shiftIds = Array.isArray(t.shift_ids) ? t.shift_ids.map(Number).filter(Boolean) : [];
    if (!shiftIds.length) return;
    const desired = new Set();
    scheduledUsersByShift(storeId, workDate, shiftIds).forEach(uid => desired.add(Number(uid)));
    normalizeIdArray(t.manual_assignee_ids || []).forEach(uid => desired.add(Number(uid)));
    const desiredUsers = Array.from(desired).filter(uid => {
      const u = getActiveUser(uid);
      return u && u.role !== 'admin' && userHasStore(u, storeId);
    });
    const desiredSet = new Set(desiredUsers);
    const before = db.task_assignees.length;
    db.task_assignees = db.task_assignees.filter(ta => {
      if (Number(ta.task_id) !== Number(t.id)) return true;
      if (ta.completed_at) return true;
      return desiredSet.has(Number(ta.user_id));
    });
    removedAssignments += before - db.task_assignees.length;
    const existing = new Set(db.task_assignees.filter(ta => Number(ta.task_id) === Number(t.id)).map(ta => Number(ta.user_id)));
    desiredUsers.forEach(uid => {
      if (!existing.has(Number(uid))) {
        db.task_assignees.push({ id: nextId('task_assignees'), task_id: t.id, user_id: uid, completed_at: null, evidence_path: null, evidence_note: '', points_delta: 0, created_by_sync: actorId || null, created_at: nowIso() });
        addedAssignments += 1;
      }
    });
    t.shift_synced_at = nowIso();
    t.updated_by = actorId || t.updated_by || null;
    t.updated_at = nowIso();
    changedTasks += 1;
  });
  return { changed_tasks: changedTasks, added_assignments: addedAssignments, removed_assignments: removedAssignments };
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
      resolution_status: ta.resolution_status || '',
      not_completed_at: ta.not_completed_at || null,
      not_completed_reason: ta.not_completed_reason || '',
      points_delta: taskStatus({ ...ta, due_at: t.due_at }) === 'not_completed'
        ? -TASK_PENALTIES.NOT_COMPLETED
        : (['completed_late', 'overdue'].includes(taskStatus({ ...ta, due_at: t.due_at })) ? -TASK_PENALTIES.LATE : 0),
      ...t,
      category: normalizeTaskCategory(t.category),
      category_name: taskCategoryLabel(t.category),
      store_name: s ? s.name : '',
      created_by_name: creator ? creator.full_name : ''
    };
  }).filter(Boolean);
  if (user.role === 'employee') rows = rows.filter(r => Number(r.assignee_id) === Number(user.id));
  else if (user.role === 'manager') rows = rows.filter(r => userHasStore(user, r.store_id));
  const today = dateOnly(new Date());
  const rankDate = (row) => {
    const d = taskWorkDate(row);
    if (d === today) return 0;
    if (d > today) return 1;
    return 2;
  };
  return rows.map(r => ({ ...r, status: taskStatus(r), is_today: taskWorkDate(r) === today }))
    .sort((a, b) => {
      const ra = rankDate(a), rb = rankDate(b);
      if (ra !== rb) return ra - rb;
      const da = taskWorkDate(a), dbb = taskWorkDate(b);
      if (da !== dbb) return ra === 2 ? dbb.localeCompare(da) : da.localeCompare(dbb);
      if (a.status !== b.status) {
        const order = { assigned: 0, overdue: 1, not_completed: 2, completed_late: 3, completed_on_time: 4 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      }
      return new Date(a.due_at) - new Date(b.due_at) || new Date(b.created_at) - new Date(a.created_at);
    });
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
  const statusMode = ['active', 'inactive', 'all'].includes(String(options.userStatus || 'active')) ? String(options.userStatus || 'active') : 'active';
  // Bảng doanh thu chỉ hiển thị nhân viên bán hàng, không đưa quản lý vào bảng này.
  let people = (db.users || []).filter(u => u.status !== 'deleted' && u.role === 'employee');
  if (statusMode === 'active') people = people.filter(u => u.status === 'active');
  if (statusMode === 'inactive') people = people.filter(u => u.status !== 'active');
  const requestedStoreId = storeId ? Number(storeId) : null;
  if (requestedStoreId) {
    people = people.filter(u => Number(getPrimaryStoreId(u)) === Number(requestedStoreId));
  } else if (options.includeAllStores) {
    // Màn Tổng quan: cho phép xem bảng xếp hạng theo % đạt target toàn hệ thống.
    // Không truyền store_id để tránh bị khóa theo cửa hàng ở khu vực này.
  } else if (!isAllStoreRole(user)) {
    const canViewStoreScope = user.role === 'manager' || Number(user.permissions.can_manage_sales) === 1 || Number(user.permissions.can_view_sales_target) === 1 || Number(user.permissions.can_view_store_sales_summary) === 1;
    people = canViewStoreScope ? people.filter(u => userHasStore(user, getPrimaryStoreId(u))) : people.filter(u => Number(u.id) === Number(user.id));
  }
  const rows = people.map(u => {
    const progress = salesProgressForUserPeriod(u.id, start, end);
    const guestsRows = db.assessments.filter(a => a.template_id === 'GUESTS' && Number(a.employee_id) === Number(u.id) && dateVal(a.assessed_at) >= start && dateVal(a.assessed_at) < end);
    const guests_percent = guestsRows.length ? guestsRows.reduce((sum, a) => sum + Number(a.percent || 0), 0) / guestsRows.length : 0;
    const achievement_percent = progress.target ? Math.round((progress.revenue / progress.target) * 10000) / 100 : 0;
    return { user_id: u.id, full_name: u.full_name, role: u.role, user_status: u.status || 'active', is_store_total: false, store_name: getStore(getPrimaryStoreId(u))?.name || '', revenue: progress.revenue, target: progress.target, target_upt: progress.target_upt, target_atv: progress.target_atv, target_cr: progress.target_cr, achievement_percent, bill_count: progress.bill_count, item_count: progress.item_count, upt: progress.upt, atv: progress.atv, asp: progress.asp, cr: progress.cr, pace_percent: progress.pace_percent, projected_revenue: progress.projected_revenue, days_elapsed: progress.days_elapsed, days_remaining: progress.days_remaining, daily_needed: progress.daily_needed, guests_percent, last_update: progress.last_update };
  }).filter(r => statusMode === 'active' || r.user_status === 'active' || Number(r.revenue || 0) || Number(r.target || 0) || Number(r.bill_count || 0) || Number(r.item_count || 0) || Number(r.guests_percent || 0))
    .sort((a, b) => b.achievement_percent - a.achievement_percent || b.revenue - a.revenue || b.guests_percent - a.guests_percent);
  const employeeTotal = rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0);
  return { period, start, end, leaderboard: rows.map((r, idx) => ({ ...r, rank: idx + 1, revenue_percent: employeeTotal ? Math.round((r.revenue / employeeTotal) * 10000) / 100 : 0 })) };
}

function computePerformance(scopeUser, year = null, month = null) {
  const now = new Date();
  const selectedYear = Math.max(2000, Math.min(2100, Number(year) || now.getFullYear()));
  const selectedMonth = Math.max(1, Math.min(12, Number(month) || (now.getMonth() + 1)));
  const periodDate = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
  const { start, end } = periodRange('month', periodDate);
  const periodEndForStatus = end;
  let users = db.users.filter(u => u.status === 'active' && ['employee', 'manager'].includes(u.role));
  if (scopeUser.role === 'manager') users = users.filter(u => userHasStore(scopeUser, u.store_id));
  if (scopeUser.role === 'employee') users = users.filter(u => Number(u.id) === Number(scopeUser.id));
  return users.map(u => {
    const standard = TASK_WORK_STANDARDS[u.role] || TASK_WORK_STANDARDS.employee;
    const monthAssignments = (db.task_assignees || []).filter(ta => Number(ta.user_id) === Number(u.id)).map(ta => {
      const t = db.tasks.find(x => Number(x.id) === Number(ta.task_id));
      if (!t) return null;
      const workDate = dateOnly(t.task_date || t.due_at || t.created_at || new Date());
      if (workDate < start || workDate >= end) return null;
      return { ta, task: t, status: taskStatus({ ...ta, due_at: t.due_at }, periodEndForStatus) };
    }).filter(Boolean);

    const monthSchedules = (db.work_schedules || []).filter(r => Number(r.user_id || r.employee_id) === Number(u.id) && String(r.work_date || '') >= start && String(r.work_date || '') < end);
    const workedShiftDays = new Set(monthSchedules.map(r => String(r.work_date || '')).filter(Boolean)).size;
    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
    const elapsedFallback = isCurrentMonth ? Math.min(26, Math.max(1, Math.ceil((now - new Date(`${start}T00:00:00`)) / 86400000))) : 26;
    const standardShifts = workedShiftDays || elapsedFallback;
    const shiftFactor = Math.min(1, standardShifts / 26);

    const breakdown = [];
    let taskPoints35 = 0;
    let totalCount = 0, onTime = 0, late = 0, overdue = 0, notCompleted = 0;
    Object.entries(standard).forEach(([key, cfg]) => {
      const rows = monthAssignments.filter(x => taskScoreCategoryForUser(x.task, u) === key)
        .sort((a, b) => new Date(a.task.task_date || a.task.created_at || a.task.due_at || 0) - new Date(b.task.task_date || b.task.created_at || b.task.due_at || 0) || Number(a.ta.id || 0) - Number(b.ta.id || 0));
      const assigned = rows.length;
      const expected = Math.max(0.01, Number(cfg.count || 0) * shiftFactor);
      const quotaSlots = Math.max(1, Math.ceil(expected));
      const quotaRows = rows.slice(0, quotaSlots);
      const excessRows = rows.slice(quotaSlots);
      let earnedUnits = 0;
      let excessPenaltyUnits = 0;
      let kOn = 0, kLate = 0, kOpen = 0, kNot = 0;
      rows.forEach(x => {
        if (x.status === 'completed_on_time') kOn += 1;
        else if (x.status === 'completed_late' || x.status === 'overdue') kLate += 1;
        else if (x.status === 'not_completed') kNot += 1;
        else kOpen += 1;
      });
      quotaRows.forEach(x => {
        if (x.status === 'completed_on_time') earnedUnits += 1;
        else if (x.status === 'completed_late' || x.status === 'overdue') earnedUnits += 0.7;
      });
      // Việc vượt quota làm đúng không được bù điểm; trễ/không hoàn thành vẫn kéo điểm xuống.
      excessRows.forEach(x => {
        if (x.status === 'completed_late' || x.status === 'overdue') excessPenaltyUnits += 0.3;
        else if (x.status === 'not_completed') excessPenaltyUnits += 1;
      });
      const scoreUnits = Math.max(0, earnedUnits - excessPenaltyUnits);
      const points = Math.max(0, Math.min(Number(cfg.points || 0), Number(cfg.points || 0) * (scoreUnits / expected)));
      taskPoints35 += points;
      totalCount += assigned; onTime += kOn; late += kLate; overdue += rows.filter(x => x.status === 'overdue').length; notCompleted += kNot;
      breakdown.push({
        key, label: TASK_CATEGORIES[key], standard_count: Math.round(expected * 10) / 10,
        assigned, on_time: kOn, late: kLate, open: kOpen, not_completed: kNot,
        earned_units: Math.round(earnedUnits * 10) / 10,
        excess_count: excessRows.length, excess_penalty_units: Math.round(excessPenaltyUnits * 10) / 10,
        score_units: Math.round(scoreUnits * 10) / 10,
        max_points: cfg.points, points: Math.round(points * 100) / 100,
        coverage_percent: expected ? Math.round((assigned / expected) * 1000) / 10 : 0
      });
    });
    taskPoints35 = Math.round(taskPoints35 * 100) / 100;
    const taskScore = Math.round((taskPoints35 / 35) * 100);

    const vRows = db.violations.filter(v => Number(v.user_id) === Number(u.id) && dateOnly(v.created_at || '') >= start && dateOnly(v.created_at || '') < end);
    const violationDeductions = vRows.reduce((sum, v) => sum + Number(v.points_deducted || 0), 0);
    const violationScore = Math.max(0, 100 - violationDeductions);
    const disciplinePoints15 = Math.round((violationScore * 0.15) * 100) / 100;

    const gRows = db.assessments.filter(a => a.template_id === 'GUESTS' && Number(a.employee_id) === Number(u.id) && dateOnly(a.assessed_at || a.created_at || '') >= start && dateOnly(a.assessed_at || a.created_at || '') < end);
    const guestScore = gRows.length ? Math.round(gRows.reduce((sum, a) => sum + Number(a.percent || 0), 0) / gRows.length) : 0;
    const trainingOverdue = (db.product_trainings || []).filter(r => r.status !== 'deleted' && Number(r.is_required || 0) === 1 && r.due_at && dateOnly(r.due_at) >= start && dateOnly(r.due_at) < end && trainingAssignees(r).some(x => Number(x.id) === Number(u.id)) && !trainingProgress(r.id, u.id, r.pass_percent || 90).passed).length;
    const trainingGuestIndex = Math.max(0, Math.min(100, guestScore - trainingOverdue * 10));
    const trainingGuestPoints20 = Math.round((trainingGuestIndex * 0.20) * 100) / 100;

    // UPT hiệu suất phải khóa theo đúng tháng đang xem trong mục Doanh thu:
    // - Target UPT: lấy từ Target UPT hàng tháng (sales_targets) của đúng YYYY-MM.
    // - UPT đạt: lấy từ doanh thu thực tế của đúng tháng đó (Tổng số món / Tổng số bill).
    // Không dùng target ngày và không lấy UPT của kỳ khác.
    const performanceMonthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    let upt = 0;
    let targetUpt = 0;
    if (u.role === 'manager') {
      const storeRows = (db.sales || []).filter(sa => Number(sa.store_id) === Number(u.store_id) && monthKey(sa.sale_date) === performanceMonthKey);
      const storeBills = storeRows.reduce((sum, r) => sum + Number(r.bill_count || 0), 0);
      const storeItems = storeRows.reduce((sum, r) => sum + Number(r.item_count || 0), 0);
      upt = storeBills ? Math.round((storeItems / storeBills) * 100) / 100 : 0;
      targetUpt = Number(aggregateKpiTargetsForStore(u.store_id, [performanceMonthKey]).target_upt || 0);
    } else {
      const employeeRows = (db.sales || []).filter(sa => Number(sa.user_id) === Number(u.id) && monthKey(sa.sale_date) === performanceMonthKey);
      const employeeBills = employeeRows.reduce((sum, r) => sum + Number(r.bill_count || 0), 0);
      const employeeItems = employeeRows.reduce((sum, r) => sum + Number(r.item_count || 0), 0);
      upt = employeeBills ? Math.round((employeeItems / employeeBills) * 100) / 100 : 0;
      targetUpt = Number(monthlyKpiTargetsForUser(u.id, performanceMonthKey).target_upt || 0);
    }
    const uptAchievementPercent = targetUpt > 0 ? Math.min(120, Math.max(0, (upt / targetUpt) * 100)) : 0;
    const uptPoints30 = Math.round((30 * uptAchievementPercent / 100) * 100) / 100; // tối đa 36 điểm = 120% của 30

    const finalScore = Math.round((taskPoints35 + uptPoints30 + trainingGuestPoints20 + disciplinePoints15) * 100) / 100;
    return {
      user_id: u.id, role: u.role, full_name: u.full_name, store_id: u.store_id,
      store_name: getStore(u.store_id)?.name || '', period_year: selectedYear, period_month: selectedMonth,
      worked_shifts: standardShifts,
      task_standard_total: Math.round(Object.values(standard).reduce((sum, x) => sum + Number(x.count || 0), 0) * shiftFactor * 10) / 10,
      tasks_total: totalCount, tasks_on_time: onTime, tasks_late: late, tasks_overdue: overdue, tasks_not_completed: notCompleted,
      task_score: taskScore, task_points_35: taskPoints35, task_breakdown: breakdown,
      violations_count: vRows.length, violation_deductions: violationDeductions, violation_score: violationScore, discipline_points_15: disciplinePoints15,
      guests_score: guestScore, training_overdue: trainingOverdue, training_guests_index: trainingGuestIndex, training_guests_points_20: trainingGuestPoints20,
      upt, target_upt: targetUpt, upt_achievement_percent: Math.round(uptAchievementPercent * 100) / 100, upt_points_30: uptPoints30,
      upt_source_month: performanceMonthKey, upt_source: 'revenue_monthly',
      final_score: finalScore
    };
  });
}
function storeSummaryRows(user, start = null, end = null) {
  let stores = db.stores.filter(s => s.status === 'active');
  if (user.role === 'manager') stores = stores.filter(s => userHasStore(user, s.id));
  if (user.role === 'employee') stores = stores.filter(s => userHasStore(user, s.id));
  const inPeriod = value => !start || !end || (dateOnly(value || '') >= start && dateOnly(value || '') < end);
  return stores.map(s => {
    const ops = db.assessments.filter(a => Number(a.store_id) === Number(s.id) && a.template_id === 'OPS' && inPeriod(a.assessed_at || a.created_at));
    const vm = db.assessments.filter(a => Number(a.store_id) === Number(s.id) && a.template_id === 'VM' && inPeriod(a.assessed_at || a.created_at));
    const avg = rows => rows.length ? rows.reduce((sum, a) => sum + Number(a.percent || 0), 0) / rows.length : 0;
    const violations = db.violations.filter(v => Number(v.store_id) === Number(s.id) && inPeriod(v.created_at)).length;
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
  const statusMode = ['active', 'inactive', 'all'].includes(String(req.query.status || 'active')) ? String(req.query.status || 'active') : 'active';
  let rows = (db.users || []).filter(u => u.status !== 'deleted');
  if (statusMode === 'active') rows = rows.filter(u => u.status === 'active');
  if (statusMode === 'inactive') rows = rows.filter(u => u.status !== 'active');
  const users = rows
    .slice()
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || Number(getPrimaryStoreId(a) || 0) - Number(getPrimaryStoreId(b) || 0) || a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name, 'vi'))
    .map(publicUser);
  res.json({ users, status: statusMode });
});


app.get('/api/stores', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const statusMode = ['active', 'inactive', 'all'].includes(String(req.query.status || 'active')) ? String(req.query.status || 'active') : 'active';
  let rows = (db.stores || []).slice();
  if (statusMode === 'active') rows = rows.filter(s => String(s.status || 'active') === 'active');
  if (statusMode === 'inactive') rows = rows.filter(s => String(s.status || 'active') !== 'active');
  rows.sort((a, b) => Number(a.id) - Number(b.id));
  const stores = rows.map(s => ({
    ...clone(s),
    users_count: (db.users || []).filter(u => String(u.status || 'active') !== 'deleted' && userHasStore(publicUser(u), s.id)).length
  }));
  res.json({ stores, status: statusMode });
});

app.post('/api/stores', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên chi nhánh' });
  if ((db.stores || []).some(s => String(s.name || '').trim().toLowerCase() === name.toLowerCase() && String(s.status || 'active') !== 'deleted')) {
    return res.status(400).json({ error: 'Chi nhánh đã tồn tại' });
  }
  const id = nextId('stores');
  const store = { id, name, code: slugCode(name), status: 'active', created_at: nowIso(), created_by: req.user.id };
  db.stores.push(store);
  saveDb();
  res.json({ ok: true, store: clone(store) });
});

app.patch('/api/stores/:id', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const id = Number(req.params.id);
  const store = (db.stores || []).find(s => Number(s.id) === id);
  if (!store) return res.status(404).json({ error: 'Không tìm thấy chi nhánh' });
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Vui lòng nhập tên chi nhánh' });
  if ((db.stores || []).some(s => Number(s.id) !== id && String(s.name || '').trim().toLowerCase() === name.toLowerCase() && String(s.status || 'active') !== 'deleted')) {
    return res.status(400).json({ error: 'Tên chi nhánh đã tồn tại' });
  }
  store.name = name;
  store.code = slugCode(name);
  store.updated_at = nowIso();
  store.updated_by = req.user.id;
  saveDb();
  res.json({ ok: true, store: clone(store) });
});

app.delete('/api/stores/:id', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const id = Number(req.params.id);
  const store = (db.stores || []).find(s => Number(s.id) === id);
  if (!store) return res.status(404).json({ error: 'Không tìm thấy chi nhánh' });
  const refs = [];
  const hasRef = (arr, fn) => Array.isArray(arr) && arr.some(fn);
  if (hasRef(db.users, u => String(u.status || 'active') !== 'deleted' && (Number(u.store_id) === id || getUserStoreIds(u).includes(id)))) refs.push('tài khoản');
  if (hasRef(db.tasks, x => Number(x.store_id) === id)) refs.push('công việc');
  if (hasRef(db.violations, x => Number(x.store_id) === id)) refs.push('vi phạm');
  if (hasRef(db.assessments, x => Number(x.store_id) === id)) refs.push('đánh giá');
  if (hasRef(db.sales, x => Number(x.store_id) === id)) refs.push('doanh thu');
  if (hasRef(db.sales_targets, x => Number(x.store_id) === id)) refs.push('target tháng');
  if (hasRef(db.sales_daily_targets, x => Number(x.store_id) === id)) refs.push('target ngày');
  if (hasRef(db.sales_store_days, x => Number(x.store_id) === id)) refs.push('tổng khách/ngày');
  if (hasRef(db.bonuses, x => Number(x.store_id) === id)) refs.push('thưởng');
  if (hasRef(db.documents, x => Number(x.store_id) === id)) refs.push('tài liệu');
  if (hasRef(db.shifts, x => Number(x.store_id) === id)) refs.push('ca làm');
  if (hasRef(db.work_schedules, x => Number(x.store_id) === id)) refs.push('lịch làm việc');
  if (hasRef(db.orders, x => Number(x.store_id) === id)) refs.push('order hàng');
  if (hasRef(db.online_orders, x => Number(x.store_id) === id)) refs.push('đơn online');
  if (hasRef(db.product_feedback, x => Number(x.store_id) === id)) refs.push('đánh giá sản phẩm');
  if (hasRef(db.product_collections, x => Number(x.store_id) === id)) refs.push('bộ sưu tập');
  if (hasRef(db.product_trainings, x => Number(x.store_id) === id)) refs.push('đào tạo sản phẩm');
  if (hasRef(db.weekly_reports, x => Number(x.store_id) === id)) refs.push('báo cáo tuần');
  if (hasRef(db.daily_reports, x => Number(x.store_id) === id)) refs.push('báo cáo ngày');
  if (hasRef(db.cdp_ojti, x => Number(x.store_id) === id)) refs.push('CDP/OJTI');
  if (refs.length) return res.status(400).json({ error: `Không thể xóa chi nhánh vì đang có dữ liệu liên quan: ${refs.join(', ')}` });
  db.stores = (db.stores || []).filter(s => Number(s.id) !== id);
  saveDb();
  res.json({ ok: true, deleted: true });
});


app.post('/api/users', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const { full_name, username, password, role, store_id, store_ids, permissions } = req.body || {};
  if (!full_name || !username || !password || !['admin', 'office', 'manager', 'employee'].includes(role)) return res.status(400).json({ error: 'Thiếu thông tin tài khoản' });
  if (db.users.some(u => String(u.username).toLowerCase() === String(username).trim().toLowerCase())) return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
  const id = nextId('users');
  const normalizedStoreIds = normalizeStoreIds(Array.isArray(store_ids) ? store_ids : (store_id ? [store_id] : []));
  db.users.push({ id, full_name: String(full_name).trim(), username: String(username).trim(), password_hash: bcrypt.hashSync(String(password), 10), role, store_id: normalizedStoreIds[0] || null, store_ids: normalizedStoreIds, status: 'active', created_at: nowIso() });
  const inputPerms = permissions && typeof permissions === 'object' ? permissions : {};
  const hasAnyPerm = Object.values(inputPerms).some(v => Number(v) === 1);
  setPermissions(id, role, role === 'office' && !hasAnyPerm ? ROLE_DEFAULTS.office : inputPerms);
  saveDb();
  res.json({ ok: true, id });
});

app.patch('/api/users/:id', requireAuth, requirePerm('can_manage_users'), (req, res) => {
  const id = Number(req.params.id);
  const existing = getUser(id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
  const { full_name, role, store_id, store_ids, status, password, permissions } = req.body || {};
  if (full_name) existing.full_name = full_name;
  if (role && ['admin', 'office', 'manager', 'employee'].includes(role)) existing.role = role;
  const nextStoreIds = store_ids === undefined ? getUserStoreIds(existing) : normalizeStoreIds(Array.isArray(store_ids) ? store_ids : (store_id ? [store_id] : []));
  existing.store_ids = nextStoreIds;
  existing.store_id = nextStoreIds[0] || null;
  if (status && ['active', 'inactive'].includes(String(status))) {
    existing.status = String(status);
    if (existing.status === 'inactive') {
      existing.inactive_at = existing.inactive_at || nowIso();
      existing.inactive_by = existing.inactive_by || req.user.id;
    } else {
      delete existing.inactive_at;
      delete existing.inactive_by;
      delete existing.deleted_at;
      delete existing.deleted_by;
    }
  }
  if (password) existing.password_hash = bcrypt.hashSync(String(password), 10);
  setPermissions(id, existing.role, permissions || getPermissions(id, existing.role));
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/users/:id', requireAuth, requirePerm('can_delete_users'), (req, res) => {
  const id = Number(req.params.id);
  const existing = getUser(id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
  if (Number(existing.id) === Number(req.user.id)) return res.status(400).json({ error: 'Không thể xóa chính tài khoản đang đăng nhập' });
  if (existing.role === 'admin') {
    const activeAdmins = db.users.filter(u => u.status === 'active' && u.role === 'admin');
    if (activeAdmins.length <= 1) return res.status(400).json({ error: 'Không thể xóa admin cuối cùng của hệ thống' });
  }
  // Xóa vĩnh viễn tài khoản nhập sai và toàn bộ dữ liệu cá nhân gắn trực tiếp với tài khoản.
  db.users = (db.users || []).filter(u => Number(u.id) !== id);
  db.permissions = (db.permissions || []).filter(p => Number(p.user_id) !== id);
  db.task_assignees = (db.task_assignees || []).filter(x => Number(x.user_id) !== id);
  db.work_schedules = (db.work_schedules || []).filter(x => Number(x.user_id) !== id);
  db.violations = (db.violations || []).filter(x => Number(x.user_id) !== id);
  db.assessments = (db.assessments || []).filter(x => Number(x.employee_id) !== id && Number(x.user_id) !== id);
  db.sales = (db.sales || []).filter(x => Number(x.user_id) !== id);
  db.sales_targets = (db.sales_targets || []).filter(x => Number(x.user_id) !== id);
  db.bonuses = (db.bonuses || []).filter(x => Number(x.user_id) !== id);
  db.product_training_attempts = (db.product_training_attempts || []).filter(x => Number(x.user_id) !== id);
  db.product_training_reads = (db.product_training_reads || []).filter(x => Number(x.user_id) !== id);
  db.cdp_ojti = (db.cdp_ojti || []).filter(x => Number(x.user_id) !== id && Number(x.employee_id) !== id && Number(x.trainee_id) !== id);
  // Không xóa công việc/tài liệu chung; chỉ bỏ tham chiếu người tạo nếu có.
  ['tasks','documents','orders','online_orders','product_feedback','product_collections','product_trainings','weekly_reports','daily_reports'].forEach(key => {
    (db[key] || []).forEach(row => {
      if (Number(row.created_by) === id) row.created_by = null;
      if (Number(row.updated_by) === id) row.updated_by = null;
    });
  });
  saveDb();
  res.json({ ok: true, permanently_deleted: true });
});

app.get('/api/tasks', requireAuth, (req, res) => res.json({ tasks: taskRowsForUser(req.user) }));



app.get('/api/cdp-ojti-catalog', requireAuth, (req, res) => {
  if (!canViewCdpOjti(req.user)) return res.status(403).json({ error: 'Không có quyền xem CDP/OJTI' });
  const catalog = loadCdpOjtiCatalog();
  res.json({ ...catalog, positions: catalog.positions || [], can_manage: canManageCdpOjti(req.user), can_manage_cdp: canManageCdpOjti(req.user, 'cdp'), can_manage_ojti: canManageCdpOjti(req.user, 'ojti'), can_view_cdp: canViewCdpOjti(req.user, 'cdp'), can_view_ojti: canViewCdpOjti(req.user, 'ojti') });
});

app.get('/api/cdp-ojti-records', requireAuth, (req, res) => {
  const type = String(req.query.type || 'cdp') === 'ojti' ? 'ojti' : 'cdp';
  if (!canViewCdpOjti(req.user, type)) return res.status(403).json({ error: `Không có quyền xem ${type === 'ojti' ? 'OJTI' : 'CDP'}` });
  let rows = cdpOjtiRowsForUser(req.user, type).filter(r => Number(r.catalog_mode || 0) === 1);
  const storeId = req.query.store_id ? Number(req.query.store_id) : null;
  const pos = req.query.position_key ? String(req.query.position_key) : '';
  const traineeId = req.query.trainee_id ? Number(req.query.trainee_id) : null;
  if (storeId) rows = rows.filter(r => Number(r.store_id) === storeId);
  if (pos) rows = rows.filter(r => String(r.position_key) === pos);
  if (traineeId) rows = rows.filter(r => normalizeIdArray(r.trainee_ids).includes(traineeId));
  res.json({ items: rows, can_manage: canManageCdpOjti(req.user, type) });
});

app.post('/api/cdp-ojti-record', requireAuth, (req, res) => {
  const body = req.body || {};
  const type = String(body.type || 'cdp') === 'ojti' ? 'ojti' : 'cdp';
  if (!canManageCdpOjti(req.user, type)) return res.status(403).json({ error: `Không có quyền nhập ${type === 'ojti' ? 'OJTI' : 'CDP'}` });
  const validPositions = cdpCatalogPositions().map(p => p.key);
  const positionKey = validPositions.includes(String(body.position_key)) ? String(body.position_key) : (validPositions[0] || 'dskd');
  const storeId = isAllStoreRole(req.user) ? Number(body.store_id || getPrimaryStoreId(req.user) || db.stores[0]?.id) : Number(getPrimaryStoreId(req.user));
  if (!storeId || !canAccessStore(req, storeId)) return res.status(403).json({ error: 'Không có quyền nhập cửa hàng này' });
  const id = body.id ? Number(body.id) : null;
  let row = id ? (db.cdp_ojti || []).find(r => Number(r.id) === id && r.status !== 'deleted') : null;
  if (row && !canAccessStore(req, row.store_id)) return res.status(403).json({ error: 'Không có quyền sửa cửa hàng này' });
  const trainees = normalizeIdArray(body.trainee_ids).filter(uid => { const u = getActiveUser(uid); return u && userHasStore(u, storeId); }).slice(0, 1);
  const trainerId = body.trainer_id ? Number(body.trainer_id) : req.user.id;
  let itemValues = normalizeCdpItemValues(body.item_values);
  const openValues = normalizeOpenValues(body.open_values);
  if (!row) {
    row = {
      id: nextId('cdp_ojti'),
      created_by: req.user.id,
      created_at: nowIso(),
      status: 'active',
      linked_task_ids: {}
    };
    db.cdp_ojti = db.cdp_ojti || [];
    db.cdp_ojti.push(row);
  }
  row.catalog_mode = 1;
  row.type = type;
  row.store_id = storeId;
  row.position_key = positionKey;
  row.trainee_ids = trainees;
  row.trainer_id = trainerId;
  row.plan_date = dateOnly(body.plan_date || new Date());
  row.due_time = String(body.due_time || row.due_time || '22:00').slice(0, 5);
  row.title = String(body.title || '').trim() || (type === 'ojti' ? `OJTI ${cdpOjtiPositionLabel(positionKey)}` : `CDP ${cdpOjtiPositionLabel(positionKey)}`);
  row.objective = String(body.objective || '').trim();
  row.content = String(body.content || '').trim();
  row.result = String(body.result || '').trim();
  row.note = String(body.note || '').trim();
  row.status_label = String(body.status_label || row.status_label || 'doing').trim();
  row.priority = String(body.priority || row.priority || 'medium');
  row.item_values = mergeCdpTaskRemarks(row.item_values, itemValues);
  row.open_values = openValues;
  if (type === 'ojti') row.linked_task_ids = upsertOjtiTasksFromRecord(row, req.user);
  row.linked_task_id = row.linked_task_ids ? Object.values(row.linked_task_ids).filter(Boolean)[0] || null : row.linked_task_id || null;
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true, id: row.id, linked_task_ids: row.linked_task_ids || {} });
});

app.get('/api/cdp-ojti', requireAuth, (req, res) => {
  const type = ['cdp', 'ojti'].includes(String(req.query.type || '')) ? String(req.query.type) : null;
  if (!canViewCdpOjti(req.user, type)) return res.status(403).json({ error: 'Không có quyền xem CDP/OJTI' });
  let rows = cdpOjtiRowsForUser(req.user, type);
  const storeId = req.query.store_id ? Number(req.query.store_id) : null;
  if (storeId) rows = rows.filter(r => Number(r.store_id) === Number(storeId));
  res.json({ positions: cdpCatalogPositions(), items: rows, can_manage: canManageCdpOjti(req.user, type) });
});

app.post('/api/cdp-ojti', requireAuth, (req, res) => {
  const body = req.body || {};
  const type = String(body.type || 'cdp') === 'ojti' ? 'ojti' : 'cdp';
  if (!canManageCdpOjti(req.user, type)) return res.status(403).json({ error: `Không có quyền nhập ${type === 'ojti' ? 'OJTI' : 'CDP'}` });
  const storeId = isAllStoreRole(req.user) ? Number(body.store_id || getPrimaryStoreId(req.user) || db.stores[0]?.id) : Number(getPrimaryStoreId(req.user));
  if (!storeId || !canAccessStore(req, storeId)) return res.status(403).json({ error: 'Không có quyền nhập cửa hàng này' });
  const id = nextId('cdp_ojti');
  const row = {
    id,
    type,
    store_id: storeId,
    position_key: CDP_OJTI_POSITIONS.some(p => p.key === body.position_key) ? body.position_key : 'dskd',
    trainee_ids: normalizeIdArray(body.trainee_ids).filter(uid => { const u = getActiveUser(uid); return u && userHasStore(u, storeId); }).slice(0, 1),
    trainer_id: body.trainer_id ? Number(body.trainer_id) : req.user.id,
    plan_date: dateOnly(body.plan_date || new Date()),
    due_time: String(body.due_time || '22:00').slice(0, 5),
    title: String(body.title || '').trim() || (type === 'ojti' ? 'Lịch đào tạo OJTI' : 'Kế hoạch CDP'),
    objective: String(body.objective || '').trim(),
    content: String(body.content || '').trim(),
    result: String(body.result || '').trim(),
    note: String(body.note || '').trim(),
    status_label: String(body.status_label || 'planned').trim(),
    priority: String(body.priority || 'medium'),
    link_task: type === 'ojti' && Number(body.link_task || 0) === 1 ? 1 : 0,
    linked_task_id: null,
    created_by: req.user.id,
    created_at: nowIso(),
    updated_by: req.user.id,
    updated_at: nowIso(),
    status: 'active'
  };
  db.cdp_ojti = db.cdp_ojti || [];
  if (row.link_task) row.linked_task_id = upsertOjtiLinkedTask(row, req.user);
  db.cdp_ojti.push(row);
  saveDb();
  res.json({ ok: true, id, linked_task_id: row.linked_task_id || null });
});

app.patch('/api/cdp-ojti/:id', requireAuth, (req, res) => {
  const row = (db.cdp_ojti || []).find(r => Number(r.id) === Number(req.params.id) && r.status !== 'deleted');
  if (!row) return res.status(404).json({ error: 'Không tìm thấy nội dung CDP/OJTI' });
  if (!canManageCdpOjti(req.user, String(row.type || 'cdp'))) return res.status(403).json({ error: `Không có quyền sửa ${String(row.type) === 'ojti' ? 'OJTI' : 'CDP'}` });
  if (!canAccessStore(req, row.store_id)) return res.status(403).json({ error: 'Không có quyền sửa cửa hàng này' });
  const body = req.body || {};
  const nextStoreId = isAllStoreRole(req.user) ? Number(body.store_id || row.store_id) : Number(row.store_id);
  if (!nextStoreId || !canAccessStore(req, nextStoreId)) return res.status(403).json({ error: 'Không có quyền chuyển cửa hàng này' });
  row.store_id = nextStoreId;
  row.type = String(body.type || row.type) === 'ojti' ? 'ojti' : 'cdp';
  if (CDP_OJTI_POSITIONS.some(p => p.key === body.position_key)) row.position_key = body.position_key;
  row.trainee_ids = normalizeIdArray(body.trainee_ids).filter(uid => { const u = getActiveUser(uid); return u && userHasStore(u, nextStoreId); }).slice(0, 1);
  row.trainer_id = body.trainer_id ? Number(body.trainer_id) : row.trainer_id || req.user.id;
  row.plan_date = dateOnly(body.plan_date || row.plan_date || new Date());
  row.due_time = String(body.due_time || row.due_time || '22:00').slice(0, 5);
  ['title','objective','content','result','note','status_label','priority'].forEach(k => { if (body[k] !== undefined) row[k] = String(body[k] || '').trim(); });
  row.link_task = row.type === 'ojti' && Number(body.link_task || 0) === 1 ? 1 : 0;
  if (row.link_task) row.linked_task_id = upsertOjtiLinkedTask(row, req.user);
  if (row.link_task && row.linked_task_id && String(row.status_label || '') === 'done') {
    const linkedTask = db.tasks.find(t => Number(t.id) === Number(row.linked_task_id));
    const completedAt = nowIso();
    (db.task_assignees || []).filter(a => Number(a.task_id) === Number(row.linked_task_id)).forEach(a => {
      if (!a.completed_at) {
        a.completed_at = completedAt;
        a.resolution_status = linkedTask && new Date(completedAt).getTime() > new Date(linkedTask.due_at).getTime() ? 'completed_late' : 'completed_on_time';
        a.points_delta = a.resolution_status === 'completed_late' ? -TASK_PENALTIES.LATE : 0;
        a.evidence_note = a.evidence_note || 'Tự hoàn thành khi lịch đào tạo được xác nhận Hoàn thành.';
      }
    });
  }
  row.updated_by = req.user.id;
  row.updated_at = nowIso();
  saveDb();
  res.json({ ok: true, id: row.id, linked_task_id: row.linked_task_id || null });
});

app.delete('/api/cdp-ojti/:id', requireAuth, (req, res) => {
  const row = (db.cdp_ojti || []).find(r => Number(r.id) === Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Không tìm thấy nội dung CDP/OJTI' });
  if (!canManageCdpOjti(req.user, String(row.type || 'cdp'))) return res.status(403).json({ error: `Không có quyền xóa ${String(row.type) === 'ojti' ? 'OJTI' : 'CDP'}` });
  if (!canAccessStore(req, row.store_id)) return res.status(403).json({ error: 'Không có quyền xóa cửa hàng này' });
  row.status = 'deleted';
  row.deleted_by = req.user.id;
  row.deleted_at = nowIso();
  saveDb();
  res.json({ ok: true });
});

app.post('/api/tasks', requireAuth, requirePerm('can_assign_tasks'), (req, res) => {
  const { title, description, due_at, priority, store_id, assignee_ids, score_value, start_date, end_date, due_time, repeat_every_days, repeat_mode, weekdays, shift_ids, category } = req.body || {};
  const manualAssignees = Array.isArray(assignee_ids) ? assignee_ids.map(Number).filter(Boolean) : [];
  const selectedShiftIds = Array.isArray(shift_ids) ? shift_ids.map(Number).filter(Boolean) : [];
  const selectedWeekdays = normalizeWeekdays(weekdays);
  const modeLabel = String(repeat_mode || '').trim();
  const useMultiDate = !!(start_date && end_date);
  if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề công việc' });
  if (!useMultiDate && !due_at) return res.status(400).json({ error: 'Vui lòng nhập hạn hoàn thành hoặc chọn khoảng ngày giao việc' });
  if (!manualAssignees.length && !selectedShiftIds.length) return res.status(400).json({ error: 'Vui lòng chọn nhân viên hoặc chọn ca giao việc' });
  const storeId = isAllStoreRole(req.user) ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
  if (!storeId || !canAccessStore(req, storeId)) return res.status(403).json({ error: 'Không có quyền giao việc cửa hàng này' });
  if (useMultiDate && modeLabel === 'weekly2' && selectedWeekdays.length !== 2) return res.status(400).json({ error: 'Vui lòng chọn đúng 2 thứ trong tuần' });
  if (useMultiDate && modeLabel === 'weekly3' && selectedWeekdays.length !== 3) return res.status(400).json({ error: 'Vui lòng chọn đúng 3 thứ trong tuần' });
  if (useMultiDate && modeLabel === 'custom_weekdays' && selectedWeekdays.length < 1) return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 thứ trong tuần' });
  const dates = useMultiDate ? (selectedWeekdays.length ? dateRangeByWeekdays(start_date, end_date, selectedWeekdays) : dateRangeEvery(start_date, end_date, repeat_every_days || 1)) : [dateOnly(due_at)];
  if (!dates.length) return res.status(400).json({ error: 'Khoảng ngày giao việc không có ngày phù hợp. Hãy kiểm tra lại thứ được chọn.' });
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
    if (useMultiDate) {
      const repeatText = selectedWeekdays.length ? `theo thứ trong tuần (${selectedWeekdays.map(weekdayLabel).filter(Boolean).join(', ')})` : `lặp mỗi ${Math.max(1, Number(repeat_every_days || 1))} ngày`;
      extraDesc.push(`Giao cố định/nhiều ngày: ${dateOnly(start_date)} đến ${dateOnly(end_date)}, ${repeatText}.`);
    }
    if (shiftText) extraDesc.push(`Áp dụng ca: ${shiftText}.`);
    db.tasks.push({
      id: taskId,
      title,
      description: [description || '', extraDesc.join(' ')].filter(Boolean).join('\n'),
      priority: priority || 'medium',
      category: normalizeTaskCategory(category),
      due_at: dueAt,
      task_date: workDate,
      shift_ids: selectedShiftIds,
      shift_label: shiftText,
      recurrence_batch: useMultiDate ? batchId : null,
      recurrence_label: useMultiDate ? (selectedWeekdays.length ? `Lặp ${modeLabel || 'theo tuần'}: ${selectedWeekdays.map(weekdayLabel).filter(Boolean).join(', ')}` : `Lặp mỗi ${Math.max(1, Number(repeat_every_days || 1))} ngày`) : '',
      store_id: storeId,
      score_value: TASK_PENALTIES.LATE,
      assignment_mode: selectedShiftIds.length ? 'shift' : (useMultiDate ? 'multi' : 'single'),
      manual_assignee_ids: manualAssignees,
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

app.patch('/api/tasks/:taskId', requireAuth, requirePerm('can_edit_tasks'), (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = db.tasks.find(x => Number(x.id) === taskId);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });
  if (!canAccessStore(req, task.store_id)) return res.status(403).json({ error: 'Không có quyền sửa công việc của cửa hàng này' });
  const body = req.body || {};
  const title = String(body.title || '').trim();
  const dueAt = String(body.due_at || '').trim();
  if (!title) return res.status(400).json({ error: 'Thiếu tiêu đề công việc' });
  if (!dueAt || Number.isNaN(new Date(dueAt).getTime())) return res.status(400).json({ error: 'Hạn hoàn thành không hợp lệ' });
  const requestedIds = Array.isArray(body.assignee_ids) ? [...new Set(body.assignee_ids.map(Number).filter(Boolean))] : null;
  if (requestedIds && !requestedIds.length) return res.status(400).json({ error: 'Vui lòng chọn ít nhất một người nhận việc' });
  if (requestedIds) {
    const validIds = requestedIds.filter(uid => {
      const u = getActiveUser(uid);
      return u && u.role !== 'admin' && userHasStore(u, task.store_id);
    });
    if (!validIds.length) return res.status(400).json({ error: 'Không có nhân sự hợp lệ trong cửa hàng' });
    const completed = db.task_assignees.filter(a => Number(a.task_id) === taskId && a.completed_at);
    const completedIds = new Set(completed.map(a => Number(a.user_id)));
    db.task_assignees = db.task_assignees.filter(a => Number(a.task_id) !== taskId || a.completed_at || validIds.includes(Number(a.user_id)));
    const existingIds = new Set(db.task_assignees.filter(a => Number(a.task_id) === taskId).map(a => Number(a.user_id)));
    validIds.forEach(uid => {
      if (!existingIds.has(uid)) db.task_assignees.push({ id: nextId('task_assignees'), task_id: taskId, user_id: uid, completed_at: null, evidence_path: null, evidence_note: '', points_delta: 0 });
    });
    task.manual_assignee_ids = [...new Set([...validIds, ...completedIds])];
  }
  task.title = title;
  task.description = String(body.description || '').trim();
  task.due_at = dueAt;
  task.task_date = dateOnly(dueAt);
  task.priority = ['low','medium','high'].includes(String(body.priority)) ? String(body.priority) : 'medium';
  task.category = normalizeTaskCategory(body.category || task.category);
  task.score_value = TASK_PENALTIES.LATE;
  task.updated_by = req.user.id;
  task.updated_at = nowIso();
  saveDb();
  res.json({ ok: true, task_id: taskId });
});

app.delete('/api/tasks/:taskId', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ Admin được quyền xóa công việc' });
  const taskId = Number(req.params.taskId);
  const task = db.tasks.find(x => Number(x.id) === taskId);
  if (!task) return res.status(404).json({ error: 'Không tìm thấy công việc' });
  db.task_assignees = db.task_assignees.filter(x => Number(x.task_id) !== taskId);
  db.tasks = db.tasks.filter(x => Number(x.id) !== taskId);
  saveDb();
  res.json({ ok: true, deleted_task_id: taskId });
});

app.post('/api/tasks/:assignmentId/complete', requireAuth, upload.array('evidence', 10), (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const ta = db.task_assignees.find(x => Number(x.id) === assignmentId);
  const t = ta ? db.tasks.find(x => Number(x.id) === Number(ta.task_id)) : null;
  if (!ta || !t) return res.status(404).json({ error: 'Không tìm thấy công việc' });
  const isOwner = Number(ta.user_id) === Number(req.user.id);
  const canManagerAct = req.user.role !== 'employee' && canAccessStore(req, t.store_id);
  if (!isOwner && !canManagerAct) return res.status(403).json({ error: 'Chỉ nhân viên được giao hoặc quản lý cửa hàng được hoàn thành việc này' });
  const evidencePath = mergeStoredFilesAndLinks(saveUploadedFiles(req.files), req.body.evidence_link);
  const completedAt = nowIso();
  const delayMs = new Date(completedAt).getTime() - new Date(t.due_at).getTime();
  if (delayMs > TASK_OVERDUE_GRACE_MS) {
    ta.resolution_status = 'not_completed';
    ta.not_completed_at = completedAt;
    ta.not_completed_reason = 'Hệ thống tự chuyển: quá hạn trên 4 tiếng';
    ta.points_delta = -TASK_PENALTIES.NOT_COMPLETED;
    saveDb();
    return res.status(400).json({ error: 'Công việc đã quá hạn trên 4 tiếng và được hệ thống tính là Không hoàn thành (-10 điểm)' });
  }
  const late = delayMs > 0;
  ta.completed_at = completedAt;
  ta.resolution_status = late ? 'completed_late' : 'completed_on_time';
  delete ta.not_completed_at;
  delete ta.not_completed_by;
  delete ta.not_completed_reason;
  if (evidencePath) ta.evidence_path = evidencePath;
  ta.evidence_note = req.body.note || '';
  ta.points_delta = late ? -TASK_PENALTIES.LATE : 0;
  syncOjtiTaskRemarkFromAssignment(t, ta);
  saveDb();
  res.json({ ok: true, status: late ? 'completed_late' : 'completed_on_time', points_delta: ta.points_delta });
});

app.post('/api/tasks/:assignmentId/not-completed', requireAuth, (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  const ta = db.task_assignees.find(x => Number(x.id) === assignmentId);
  const t = ta ? db.tasks.find(x => Number(x.id) === Number(ta.task_id)) : null;
  if (!ta || !t) return res.status(404).json({ error: 'Không tìm thấy công việc' });
  const canMark = req.user.role === 'admin' || (Number(req.user.permissions?.can_edit_tasks) === 1 && canAccessStore(req, t.store_id));
  if (!canMark) return res.status(403).json({ error: 'Không có quyền đánh dấu không hoàn thành' });
  if (ta.completed_at) return res.status(400).json({ error: 'Công việc đã hoàn thành, không thể chuyển sang không hoàn thành' });
  ta.resolution_status = 'not_completed';
  ta.not_completed_at = nowIso();
  ta.not_completed_by = req.user.id;
  ta.not_completed_reason = String(req.body?.reason || '').trim();
  ta.points_delta = -TASK_PENALTIES.NOT_COMPLETED;
  saveDb();
  res.json({ ok: true, status: 'not_completed', points_delta: ta.points_delta });
});

app.get('/api/violations', requireAuth, (req, res) => res.json({ violations: violationRowsForUser(req.user), catalog: allViolationCatalog() }));

app.post('/api/violation-catalog', requireAuth, requirePerm('can_manage_violations'), (req, res) => {
  const group = String(req.body?.group || '').trim();
  const name = String(req.body?.name || '').trim();
  const levelKey = VIOLATION_LEVELS[req.body?.level] ? req.body.level : 'M1';
  if (!group || !name) return res.status(400).json({ error: 'Cần nhập nhóm và tên danh mục vi phạm' });
  db.violation_catalog_custom = db.violation_catalog_custom || [];
  const duplicate = allViolationCatalog().find(x => String(x.group).toLowerCase() === group.toLowerCase() && String(x.name).toLowerCase() === name.toLowerCase());
  if (duplicate) return res.status(400).json({ error: 'Danh mục vi phạm này đã tồn tại' });
  const id = nextId('violation_catalog_custom');
  const code = `TC${String(id).padStart(3, '0')}`;
  db.violation_catalog_custom.push({ id, code, group, name, level: levelKey, status: 'active', created_by: req.user.id, created_at: nowIso() });
  saveDb();
  res.json({ ok: true, id, code });
});

app.delete('/api/violations/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ Admin được xóa vi phạm' });
  const row = (db.violations || []).find(v => Number(v.id) === Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Không tìm thấy vi phạm' });
  db.violations = db.violations.filter(v => Number(v.id) !== Number(req.params.id));
  saveDb();
  res.json({ ok: true });
});

app.post('/api/violations', requireAuth, requirePerm('can_manage_violations'), upload.array('evidence', 10), (req, res) => {
  const { user_id, violation_code, violation_level, description } = req.body || {};
  const target = getActiveUser(Number(user_id));
  if (!target) return res.status(400).json({ error: 'Nhân viên không hợp lệ' });
  if (req.user.role !== 'admin' && !userHasStore(req.user, target.store_id)) return res.status(403).json({ error: 'Không có quyền ghi nhận vi phạm nhân viên này' });
  const catalog = violationCatalogItem(violation_code);
  if (!catalog) return res.status(400).json({ error: 'Vui lòng chọn đúng danh mục vi phạm trong SOP chế tài' });
  const levelKey = VIOLATION_LEVELS[violation_level] ? violation_level : catalog.level;
  const level = VIOLATION_LEVELS[levelKey];
  const id = nextId('violations');
  db.violations.push({
    id, user_id: target.id, store_id: target.store_id,
    violation_code: catalog.code, violation_group: catalog.group, violation_type: catalog.name,
    violation_level: levelKey, level_label: level.label, points_deducted: level.points,
    description: description || '',
    evidence_path: mergeStoredFilesAndLinks(saveUploadedFiles(req.files), req.body.evidence_link),
    created_by: req.user.id, created_at: nowIso()
  });
  saveDb();
  res.json({ ok: true, id, violation_level: levelKey, points_deducted: level.points });
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


function ggnvPublicRow(x) {
  const emp = getUser(Number(x.user_id));
  const store = getStore(Number(x.store_id));
  return { ...clone(x), employee_name: x.employee_name || emp?.full_name || '', store_name: store?.name || '' };
}
function canSeeGGNV(user, row) {
  if (user?.role === 'admin' || user?.role === 'office') return true;
  return userHasStore(user, row.store_id);
}
app.get('/api/ggnv', requireAuth, (req, res) => {
  db.ggnv_claims = db.ggnv_claims || [];
  const storeId = Number(req.query.store_id || 0);
  let rows = db.ggnv_claims.filter(x => canSeeGGNV(req.user, x));
  if (storeId) {
    if (!(req.user?.role === 'admin' || req.user?.role === 'office') && !userHasStore(req.user, storeId)) return res.status(403).json({ error:'Không có quyền xem GGNV cửa hàng này' });
    rows = rows.filter(x => Number(x.store_id) === storeId);
  }
  rows.sort((a,b) => String(b.sale_date || '').localeCompare(String(a.sale_date || '')) || Number(b.id)-Number(a.id));
  res.json({ rows: rows.map(ggnvPublicRow) });
});
app.post('/api/ggnv', requireAuth, upload.single('evidence'), (req, res) => {
  const storeId = Number(req.body?.store_id || getPrimaryStoreId(req.user));
  if (!storeId || !getStore(storeId)) return res.status(400).json({ error:'Cửa hàng không hợp lệ' });
  if (!(req.user?.role === 'admin' || req.user?.role === 'office') && !userHasStore(req.user, storeId)) return res.status(403).json({ error:'Không có quyền tạo GGNV cửa hàng này' });
  const employeeName = String(req.body?.employee_name || '').trim();
  const saleDate = dateOnly(req.body?.sale_date);
  const orderNumber = String(req.body?.order_number || '').trim();
  const orderValue = toNumber(req.body?.order_value, 0);
  const discountRate = toNumber(req.body?.discount_rate, 0);
  if (!saleDate) return res.status(400).json({ error:'Chọn ngày' });
  if (!employeeName) return res.status(400).json({ error:'Nhập tên nhân viên' });
  if (!orderNumber) return res.status(400).json({ error:'Nhập số đơn' });
  if (!(orderValue > 0)) return res.status(400).json({ error:'Giá trị đơn hàng phải lớn hơn 0' });
  if (!(discountRate >= 0 && discountRate <= 100)) return res.status(400).json({ error:'Mức giảm phải từ 0 đến 100%' });
  if (!req.file) return res.status(400).json({ error:'Vui lòng tải hoặc dán ảnh chứng từ' });
  db.ggnv_claims = db.ggnv_claims || [];
  const row = { id:nextId('ggnv_claims'), store_id:storeId, user_id:null, employee_name:employeeName, sale_date:saleDate, order_number:orderNumber, order_value:orderValue, discount_rate:discountRate, evidence_path:saveUploadedFile(req.file), created_by:req.user.id, created_at:nowIso(), updated_at:nowIso() };
  db.ggnv_claims.push(row); saveDb(); res.json({ ok:true, row:ggnvPublicRow(row) });
});

function billCancelPublicRow(x) {
  const store = getStore(Number(x.store_id));
  return { ...clone(x), store_name: store?.name || '' };
}
function canSeeBillCancel(user, row) {
  if (user?.role === 'admin' || user?.role === 'office') return true;
  return userHasStore(user, row.store_id);
}
app.get('/api/bill-cancel', requireAuth, (req, res) => {
  db.bill_cancel_claims = db.bill_cancel_claims || [];
  const storeId = Number(req.query.store_id || 0);
  let rows = db.bill_cancel_claims.filter(x => canSeeBillCancel(req.user, x));
  if (storeId) {
    if (!(req.user?.role === 'admin' || req.user?.role === 'office') && !userHasStore(req.user, storeId)) return res.status(403).json({ error:'Không có quyền xem Bill hủy cửa hàng này' });
    rows = rows.filter(x => Number(x.store_id) === storeId);
  }
  rows.sort((a,b) => String(b.sale_date || '').localeCompare(String(a.sale_date || '')) || Number(b.id)-Number(a.id));
  res.json({ rows: rows.map(billCancelPublicRow) });
});
app.post('/api/bill-cancel', requireAuth, (req, res) => {
  const storeId = Number(req.body?.store_id || getPrimaryStoreId(req.user));
  if (!storeId || !getStore(storeId)) return res.status(400).json({ error:'Cửa hàng không hợp lệ' });
  if (!(req.user?.role === 'admin' || req.user?.role === 'office') && !userHasStore(req.user, storeId)) return res.status(403).json({ error:'Không có quyền tạo Bill hủy cửa hàng này' });
  const saleDate = dateOnly(req.body?.sale_date);
  const employeeName = String(req.body?.employee_name || '').trim();
  const invoiceNumber = String(req.body?.invoice_number || '').trim();
  const reason = String(req.body?.reason || '').trim();
  const replacementInvoiceNumber = String(req.body?.replacement_invoice_number || '').trim();
  if (!saleDate) return res.status(400).json({ error:'Chọn ngày' });
  if (!employeeName) return res.status(400).json({ error:'Nhập tên nhân viên' });
  if (!invoiceNumber) return res.status(400).json({ error:'Nhập số hóa đơn' });
  if (!reason) return res.status(400).json({ error:'Nhập lý do hủy bill' });
  db.bill_cancel_claims = db.bill_cancel_claims || [];
  const row = { id:nextId('bill_cancel_claims'), store_id:storeId, sale_date:saleDate, employee_name:employeeName, invoice_number:invoiceNumber, reason, replacement_invoice_number:replacementInvoiceNumber, created_by:req.user.id, created_at:nowIso(), updated_at:nowIso() };
  db.bill_cancel_claims.push(row); saveDb(); res.json({ ok:true, row:billCancelPublicRow(row) });
});

function canReviewLoyalty(user) { return user?.role === 'admin' || user?.role === 'office'; }
function loyaltyPublicRow(x) {
  const emp = getUser(Number(x.user_id));
  const store = getStore(Number(x.store_id));
  const reviewer = getUser(Number(x.reviewed_by));
  return { ...clone(x), employee_name: emp?.full_name || '', store_name: store?.name || '', reviewer_name: reviewer?.full_name || '' };
}
function canSeeLoyalty(user, row) {
  if (canReviewLoyalty(user)) return true;
  return userHasStore(user, row.store_id);
}

app.get('/api/loyalty', requireAuth, (req, res) => {
  db.loyalty_claims = db.loyalty_claims || [];
  const storeId = Number(req.query.store_id || 0);
  let rows = db.loyalty_claims.filter(x => canSeeLoyalty(req.user, x));
  if (storeId) {
    if (!canReviewLoyalty(req.user) && !userHasStore(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem Loyalty cửa hàng này' });
    rows = rows.filter(x => Number(x.store_id) === storeId);
  }
  rows.sort((a,b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || String(b.sale_date || '').localeCompare(String(a.sale_date || '')) || Number(b.id)-Number(a.id));
  res.json({ rows: rows.map(loyaltyPublicRow), can_review: canReviewLoyalty(req.user), can_edit: canReviewLoyalty(req.user) });
});


app.get('/api/loyalty/export.xlsx', requireAuth, (req, res) => {
  if (!canReviewLoyalty(req.user)) return res.status(403).json({ error: 'Chỉ Admin/Văn phòng được tải Excel Loyalty' });
  const storeId = Number(req.query.store_id || 0);
  let rows = (db.loyalty_claims || []).filter(x => canSeeLoyalty(req.user, x));
  if (storeId) rows = rows.filter(x => Number(x.store_id) === storeId);
  rows.sort((a,b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || String(b.sale_date || '').localeCompare(String(a.sale_date || '')) || Number(b.id)-Number(a.id));
  const out = rows.map(x => { const r = loyaltyPublicRow(x); return { trang_thai: r.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt', ngay: r.sale_date || '', nhan_vien: r.employee_name || '', cua_hang: r.store_name || '', so_hoa_don: r.invoice_number || '', so_tien_giam: Number(r.discount_amount || 0), chung_tu: r.evidence_path || '', nguoi_duyet: r.reviewer_name || '', ngay_duyet: r.reviewed_at || '', ngay_tao: r.created_at || '' }; });
  const buffer = toExcelBuffer(out, 'Loyalty');
  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment(`loyalty-${storeId ? (getStore(storeId)?.name || storeId) : 'tat-ca-cua-hang'}-${dateOnly(new Date())}.xlsx`);
  res.send(buffer);
});

app.post('/api/loyalty', requireAuth, upload.single('evidence'), (req, res) => {
  const storeId = Number(req.body?.store_id || getPrimaryStoreId(req.user));
  if (!storeId || !getStore(storeId)) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canReviewLoyalty(req.user) && !userHasStore(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền tạo Loyalty cửa hàng này' });
  const employee = getActiveUser(Number(req.body?.user_id));
  if (!employee || employee.role !== 'employee' || Number(getPrimaryStoreId(employee)) !== storeId) return res.status(400).json({ error: 'Nhân viên không thuộc cửa hàng đã chọn' });
  const saleDate = dateOnly(req.body?.sale_date);
  const invoice = String(req.body?.invoice_number || '').trim();
  const amount = toNumber(req.body?.discount_amount, 0);
  if (!invoice) return res.status(400).json({ error: 'Nhập số hóa đơn' });
  if (!(amount > 0)) return res.status(400).json({ error: 'Số tiền giảm phải lớn hơn 0' });
  if (!req.file) return res.status(400).json({ error: 'Vui lòng tải ảnh chứng từ' });
  const evidencePath = saveUploadedFile(req.file);
  db.loyalty_claims = db.loyalty_claims || [];
  const row = { id: nextId('loyalty_claims'), store_id: storeId, user_id: employee.id, sale_date: saleDate, invoice_number: invoice, discount_amount: amount, evidence_path: evidencePath, status: 'pending', created_by: req.user.id, created_at: nowIso(), updated_by: req.user.id, updated_at: nowIso(), reviewed_by: null, reviewed_at: null };
  db.loyalty_claims.push(row);
  saveDb();
  res.json({ ok:true, row: loyaltyPublicRow(row) });
});

app.patch('/api/loyalty/:id', requireAuth, upload.single('evidence'), (req, res) => {
  if (!canReviewLoyalty(req.user)) return res.status(403).json({ error: 'Chỉ Admin/Văn phòng được sửa đơn Loyalty' });
  const row = (db.loyalty_claims || []).find(x => Number(x.id) === Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Không tìm thấy đơn Loyalty' });
  const oldUserId = row.user_id, oldDate = row.sale_date;
  const storeId = Number(req.body?.store_id || row.store_id);
  const employee = getUser(Number(req.body?.user_id || row.user_id));
  if (!getStore(storeId) || !employee || employee.role !== 'employee' || Number(getPrimaryStoreId(employee)) !== storeId) return res.status(400).json({ error: 'Cửa hàng/nhân viên không hợp lệ' });
  const amount = toNumber(req.body?.discount_amount ?? row.discount_amount, 0);
  if (!(amount > 0)) return res.status(400).json({ error: 'Số tiền giảm phải lớn hơn 0' });
  const invoice = String(req.body?.invoice_number ?? row.invoice_number).trim();
  if (!invoice) return res.status(400).json({ error: 'Nhập số hóa đơn' });
  row.store_id = storeId; row.user_id = employee.id; row.sale_date = dateOnly(req.body?.sale_date || row.sale_date); row.invoice_number = invoice; row.discount_amount = amount;
  if (req.file) row.evidence_path = saveUploadedFile(req.file);
  row.updated_by = req.user.id; row.updated_at = nowIso();
  if (row.status === 'approved') {
    recomputeSalesRevenueWithLoyalty(oldUserId, oldDate, req.user.id);
    recomputeSalesRevenueWithLoyalty(row.user_id, row.sale_date, req.user.id);
  }
  saveDb();
  res.json({ ok:true, row: loyaltyPublicRow(row) });
});

app.post('/api/loyalty/:id/approve', requireAuth, (req, res) => {
  if (!canReviewLoyalty(req.user)) return res.status(403).json({ error: 'Chỉ Admin/Văn phòng được duyệt Loyalty' });
  const row = (db.loyalty_claims || []).find(x => Number(x.id) === Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Không tìm thấy đơn Loyalty' });
  row.status = 'approved'; row.reviewed_by = req.user.id; row.reviewed_at = nowIso(); row.updated_by = req.user.id; row.updated_at = nowIso();
  recomputeSalesRevenueWithLoyalty(row.user_id, row.sale_date, req.user.id);
  saveDb();
  res.json({ ok:true, row: loyaltyPublicRow(row) });
});

app.post('/api/sales', requireAuth, requireAnyPerm('can_manage_total_sales','can_manage_sales'), (req, res) => {
  const { user_id, sale_date, revenue, bill_count, item_count, customer_count, customer_new_count, customer_old_count, note } = req.body || {};
  const employee = getActiveUser(Number(user_id));
  if (!employee || employee.role !== 'employee') return res.status(400).json({ error: 'Chỉ nhập doanh thu cho nhân viên bán hàng' });
  if (req.user.role !== 'admin' && !userHasStore(req.user, employee.store_id)) return res.status(403).json({ error: 'Không có quyền nhập doanh thu nhân viên này' });
  const row = upsertSalesRow(employee, sale_date, { revenue, bill_count, item_count, note }, req.user.id);
  if (customer_count !== undefined && customer_count !== null && customer_count !== '') upsertStoreSalesDay(employee.store_id, sale_date, customer_count, '', req.user.id, customer_new_count, customer_old_count);
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


// ==== PRODUCT ANALYTICS / SAPO FILE IMPORT (V4.141) ====
function stripVietnamese(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function normalizeExcelHeader(value) {
  return stripVietnamese(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ');
}
function normalizeProductName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}
function productNameKey(value) { return stripVietnamese(normalizeProductName(value)).toLowerCase(); }
function isAggregateProductName(value) {
  const n = normalizeExcelHeader(value);
  return n === 'tong' || n === 'tong cong' || n === 'total' || n === 'grand total' || n.startsWith('tong cong ');
}
function excelRowValue(row, aliases) {
  const entries = Object.entries(row || {});
  const normalized = entries.map(([k,v]) => [normalizeExcelHeader(k), v]);
  const aliasNorm = aliases.map(normalizeExcelHeader);
  for (const alias of aliasNorm) {
    const exact = normalized.find(([k]) => k === alias);
    if (exact) return exact[1];
  }
  for (const alias of aliasNorm) {
    const partial = normalized.find(([k]) => k.includes(alias) || alias.includes(k));
    if (partial && partial[0].length >= 3) return partial[1];
  }
  return undefined;
}
function parseExcelDateValue(value) {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0,10);
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value);
    if (d && d.y && d.m && d.d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const raw=String(value).trim();
  let m=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  m=raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  const d=new Date(raw);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10);
}
function parseMoneyLoose(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let raw=String(value ?? '').trim().replace(/\s/g,'').replace(/₫|đ|vnd/ig,'').replace(/[^0-9,.-]/g,'');
  if (!raw) return 0;
  if (raw.includes(',') && raw.includes('.')) {
    const lastComma=raw.lastIndexOf(','), lastDot=raw.lastIndexOf('.');
    if (lastComma > lastDot) raw=raw.replace(/\./g,'').replace(',','.'); else raw=raw.replace(/,/g,'');
  } else if (raw.includes(',')) {
    const parts=raw.split(','); raw = parts.length===2 && parts[1].length<=2 ? raw.replace(',','.') : raw.replace(/,/g,'');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(raw)) raw=raw.replace(/\./g,'');
  const n=Number(raw); return Number.isFinite(n)?n:0;
}
function storeFromImportedName(name) {
  const key=normalizeExcelHeader(name);
  if (!key) return null;
  return (db.stores || []).find(st => {
    const sk=normalizeExcelHeader(st.name);
    return sk===key || sk.includes(key) || key.includes(sk);
  }) || null;
}
function effectiveProductStoreId(user, requested) {
  if (isAllStoreRole(user)) {
    if (String(requested||'').toLowerCase()==='all') return 'all';
    const n=Number(requested||0); return n && getStore(n) ? n : 'all';
  }
  return Number(getPrimaryStoreId(user) || 0);
}
function canImportProductFiles(user) { return user?.role === 'admin'; }
function readExcelRows(filePath) {
  const wb=XLSX.readFile(filePath,{cellDates:true,raw:false});
  const rows=[];
  const headerTokens=['san pham','ten san pham','chi nhanh','ten chi nhanh','kenh ban hang','ten kenh ban hang','nguon','so luong','so luong thuc','doanh thu','tong doanh thu','doanh thu thuan'];
  const headerScore=(line)=>{
    const cells=(line||[]).map(v=>normalizeExcelHeader(v)).filter(Boolean);
    let score=0;
    headerTokens.forEach(t=>{if(cells.some(c=>c===t||c.includes(t)||t.includes(c)))score++;});
    if(cells.some(c=>c.includes('san pham')))score+=3;
    if(cells.some(c=>c.includes('chi nhanh')||c==='cua hang'||c==='kho'))score+=2;
    if(cells.some(c=>c.includes('doanh thu')||c.includes('thanh tien')||c.includes('gia tri')))score+=2;
    if(cells.some(c=>c.includes('so luong')))score+=2;
    return score;
  };
  wb.SheetNames.forEach(sheetName => {
    const ws=wb.Sheets[sheetName];
    const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
    if(!matrix.length)return;
    let headerRow=0,best=-1;
    for(let i=0;i<Math.min(matrix.length,50);i++){
      const sc=headerScore(matrix[i]);
      if(sc>best){best=sc;headerRow=i;}
    }
    // Sapo exports often place report title/filter rows before the real table header.
    // If no convincing header is found, keep the old first-row behavior.
    if(best<5){
      const part=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});
      part.forEach(r=>rows.push(r));
      return;
    }
    const h1=matrix[headerRow]||[];
    const h2=matrix[headerRow+1]||[];
    const secondLooksHeader=headerScore(h2)>=4 && h2.filter(v=>String(v??'').trim()!=='').length>=2;
    let group='';
    const headers=h1.map((v,i)=>{
      const top=String(v??'').trim();
      if(top)group=top;
      if(secondLooksHeader){
        const sub=String(h2[i]??'').trim();
        if(sub){
          if(top && normalizeExcelHeader(top)!==normalizeExcelHeader(sub))return `${top} ${sub}`.trim();
          if(!top && group)return `${group} ${sub}`.trim();
          return sub;
        }
      }
      return top || `Cột ${i+1}`;
    });
    const dataStart=headerRow+(secondLooksHeader?2:1);
    for(let r=dataStart;r<matrix.length;r++){
      const line=matrix[r]||[];
      if(!line.some(v=>String(v??'').trim()!==''))continue;
      const obj={};headers.forEach((h,i)=>{obj[h]=line[i]??'';});rows.push(obj);
    }
  });
  return rows;
}

function readInventoryDetailRows(filePath) {
  const wb=XLSX.readFile(filePath,{cellDates:true,raw:false});
  const out=[];
  wb.SheetNames.forEach(sheetName=>{
    const ws=wb.Sheets[sheetName];
    const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
    if(!matrix.length)return;
    let headerRow=-1;
    for(let i=0;i<Math.min(matrix.length,30);i++){
      const line=(matrix[i]||[]).map(v=>normalizeExcelHeader(v));
      const txt=line.join(' | ');
      if(txt.includes('san pham') && txt.includes('ma sku') && (txt.includes('so luong nhap')||txt.includes('dau ky'))){headerRow=i;break;}
    }
    if(headerRow<0){
      // fallback for exported files where first header row is already flattened
      const part=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});
      part.forEach(r=>out.push(r));
      return;
    }
    const h1=matrix[headerRow]||[], h2=matrix[headerRow+1]||[];
    let group='';
    const headers=h1.map((v,i)=>{
      const top=String(v??'').trim();
      const sub=String(h2[i]??'').trim();
      if(top) group=top;
      const topNorm=normalizeExcelHeader(top), groupNorm=normalizeExcelHeader(group), subNorm=normalizeExcelHeader(sub);
      // fixed single columns must not inherit a previous group header
      const single=['stt','san pham','phien ban','ma sku','chi nhanh'];
      if(topNorm && single.includes(topNorm)) return top;
      if(sub && groupNorm && !single.includes(groupNorm)) return `${group} ${sub}`.trim();
      return top || sub || `Cột ${i+1}`;
    });
    const hasSubHeader=(h2||[]).some(v=>['so luong','nhap hang','tra hang ban','chuyen kho','kiem kho','nhap khac','ban hang','tra hang nhap','xuat khac'].includes(normalizeExcelHeader(v)));
    const start=headerRow+(hasSubHeader?2:1);
    for(let r=start;r<matrix.length;r++){
      const arr=matrix[r]||[];
      if(!arr.some(v=>String(v??'').trim()!==''))continue;
      const obj={};headers.forEach((h,i)=>obj[h]=arr[i]);
      out.push(obj);
    }
  });
  return out;
}

function readLedgerRows(filePath) {
  const wb=XLSX.readFile(filePath,{cellDates:true,raw:false});
  const out=[];
  wb.SheetNames.forEach(sheetName=>{
    const ws=wb.Sheets[sheetName];
    const matrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
    if(!matrix.length)return;
    let headerRow=0;
    for(let i=0;i<Math.min(matrix.length,20);i++){
      const txt=(matrix[i]||[]).map(v=>normalizeExcelHeader(v)).join(' | ');
      if(txt.includes('ngay ghi nhan')&&txt.includes('san pham')){headerRow=i;break;}
    }
    const h1=matrix[headerRow]||[], h2=matrix[headerRow+1]||[];
    const headers=h1.map((v,i)=>{
      const a=String(v??'').trim(), b=String(h2[i]??'').trim();
      if(a && b && normalizeExcelHeader(b)!==normalizeExcelHeader(a)) return `${a} ${b}`.trim();
      return a || b || `Cột ${i+1}`;
    });
    const secondLooksHeader=(h2||[]).some(v=>normalizeExcelHeader(v)==='so luong') && (h1||[]).some(v=>['nhap kho','xuat kho','ton kho sau giao dich'].includes(normalizeExcelHeader(v)));
    const start=headerRow+(secondLooksHeader?2:1);
    for(let r=start;r<matrix.length;r++){
      const arr=matrix[r]||[];
      if(!arr.some(v=>String(v??'').trim()!==''))continue;
      const obj={}; headers.forEach((h,i)=>obj[h]=arr[i]); out.push(obj);
    }
  });
  return out;
}
function ledgerMovementType(desc, transaction='') {
  const d=normalizeExcelHeader(desc), t=normalizeExcelHeader(transaction);
  if(d.includes('nhan hang tra lai')||d.includes('tra lai')||d.includes('hoan hang')) return 'return';
  if(d.includes('xuat kho don hang')||d.includes('ban hang')||t.includes('don hang')) return 'sale';
  if(d.includes('nhap kho')||d.includes('nhap hang')||d.includes('nhan chuyen')||d.includes('chuyen kho den')||d.includes('nhan hang')) return 'inbound';
  if(d.includes('xuat kho')||d.includes('chuyen kho')||d.includes('kiem ke')||d.includes('dieu chinh')) return 'outbound';
  return 'other';
}
function ledgerChannel(value){
  const k=normalizeExcelHeader(value);
  if(!k)return 'UNKNOWN';
  return k==='pos'||k.includes('pos')?'POS':'ONLINE';
}
function aggregateProductLedgerAnalytics(user, opts={}) {
  db.product_stock_ledger=db.product_stock_ledger||[];
  const {start,end,endExclusive}=productAnalyticsRange(opts.start,opts.end);
  const scope=effectiveProductStoreId(user,opts.store_id);
  const storeAllowed=id=>scope==='all'?true:Number(id)===Number(scope);
  const searchKey=normalizeExcelHeader(opts.q||'');
  const all=(db.product_stock_ledger||[]).filter(r=>r.status!=='deleted'&&storeAllowed(r.store_id)&&r.record_date<=end);
  const grouped=new Map(), latestSkuStock=new Map();
  const rowFor=(r)=>{
    const key=r.product_key||productNameKey(r.product_name);
    if(!grouped.has(key)) grouped.set(key,{product_key:key,product_name:r.product_name||'',pos_qty:0,online_qty:0,unknown_qty:0,sold_qty:0,return_qty:0,import_qty:0,export_qty:0,non_sale_export_qty:0,revenue:0,value_known:false,stock_qty:0,latest_arrival_date:'',sale_dates:new Set(),stores:new Set()});
    const x=grouped.get(key); if(!x.product_name&&r.product_name)x.product_name=r.product_name; return x;
  };
  all.forEach(r=>{
    const x=rowFor(r); x.stores.add(Number(r.store_id));
    const skuKey=`${r.store_id}|${r.sku||r.variant||r.product_key}`;
    if(r.stock_after!==null&&r.stock_after!==undefined&&r.stock_after!==''){
      const old=latestSkuStock.get(skuKey);
      if(!old||String(r.record_date)>String(old.record_date)||String(r.record_date)===String(old.record_date)&&Number(r.seq||0)>Number(old.seq||0)) latestSkuStock.set(skuKey,r);
    }
    if(r.movement_type==='inbound'&&Number(r.in_qty||0)>0){
      if(!x.latest_arrival_date||String(r.record_date)>x.latest_arrival_date)x.latest_arrival_date=String(r.record_date);
    }
    if(r.record_date<start||r.record_date>=endExclusive)return;
    const inq=Number(r.in_qty||0), outq=Number(r.out_qty||0);
    if(r.movement_type==='return'){x.return_qty+=inq;return;}
    if(r.movement_type==='inbound'){x.import_qty+=inq;return;}
    if(outq>0)x.export_qty+=outq;
    if(r.movement_type==='sale'){
      const ch=r.channel||'UNKNOWN';
      if(ch==='POS')x.pos_qty+=outq; else if(ch==='ONLINE')x.online_qty+=outq; else x.unknown_qty+=outq;
      x.sold_qty+=outq; x.sale_dates.add(r.record_date);
      if(r.value_known){x.value_known=true;x.revenue+=Number(r.value||0);}
    } else if(outq>0) x.non_sale_export_qty+=outq;
  });
  latestSkuStock.forEach(r=>{const x=rowFor(r);x.stock_qty+=Number(r.stock_after||0);});
  const periodDays=Math.max(1,Math.floor((new Date(`${end}T00:00:00Z`)-new Date(`${start}T00:00:00Z`))/86400000)+1);
  let rows=Array.from(grouped.values()).map(x=>{
    const arrival=x.latest_arrival_date||'';
    const speedStart=arrival&&arrival>start?arrival:start;
    const sellingDays=Math.max(1,Math.floor((new Date(`${end}T00:00:00Z`)-new Date(`${speedStart}T00:00:00Z`))/86400000)+1);
    const posVelocity=Math.round((x.pos_qty/sellingDays)*100)/100, onlineVelocity=Math.round((x.online_qty/sellingDays)*100)/100, unknownVelocity=Math.round((x.unknown_qty/sellingDays)*100)/100;
    const velocity=Math.round((x.sold_qty/sellingDays)*100)/100;
    const daysCover=velocity>0?Math.round((x.stock_qty/velocity)*10)/10:null;
    const sellableQty=velocity>0?Math.min(Math.max(0,x.stock_qty),Math.ceil(velocity*periodDays)):0;
    const reserveRecommended=velocity>0?Math.ceil(velocity*7):0;
    const daysSince=arrival?Math.max(0,Math.floor((new Date(`${end}T00:00:00Z`)-new Date(`${arrival}T00:00:00Z`))/86400000)+1):null;
    const slowScore=(daysSince||0)*Math.max(0,x.stock_qty)/Math.max(1,x.sold_qty);
    const netSold=Math.max(0,x.sold_qty-x.return_qty);
    return {product_name:x.product_name,pos_qty:x.pos_qty,online_qty:x.online_qty,unknown_qty:x.unknown_qty,sold_qty:x.sold_qty,net_sold_qty:netSold,return_qty:x.return_qty,import_qty:x.import_qty,export_qty:x.export_qty,non_sale_export_qty:x.non_sale_export_qty,stock_qty:x.stock_qty,revenue:Math.round(x.revenue),value_known:x.value_known,velocity,pos_velocity:posVelocity,online_velocity:onlineVelocity,unknown_velocity:unknownVelocity,selling_days:sellingDays,days_cover:daysCover,sellable_qty:sellableQty,reserve_recommended:reserveRecommended,arrival_date:arrival,days_since_arrival:daysSince,slow_score:Math.round(slowScore*100)/100,active_sale_days:x.sale_dates.size,store_count:x.stores.size};
  });
  if(searchKey)rows=rows.filter(r=>normalizeExcelHeader(r.product_name).includes(searchKey));
  // Zero-value products are excluded from ranking when the ledger contains value/price data.
  const rankingEligible=r=>!r.value_known||Number(r.revenue||0)>0;
  const best=rows.filter(r=>r.sold_qty>0&&rankingEligible(r)).slice().sort((a,b)=>b.sold_qty-a.sold_qty||b.velocity-a.velocity).slice(0,15);
  const stock=rows.filter(r=>r.stock_qty>0&&rankingEligible(r)).slice().sort((a,b)=>b.stock_qty-a.stock_qty||a.velocity-b.velocity);
  const imports=rows.filter(r=>r.import_qty>0||r.stock_qty>0).slice().sort((a,b)=>b.import_qty-a.import_qty||b.stock_qty-a.stock_qty);
  const slow=rows.filter(r=>r.stock_qty>0&&r.days_since_arrival!==null&&rankingEligible(r)).slice().sort((a,b)=>b.slow_score-a.slow_score||b.days_since_arrival-a.days_since_arrival||b.stock_qty-a.stock_qty);
  const speed=rows.filter(r=>rankingEligible(r)).slice().sort((a,b)=>b.velocity-a.velocity||b.sold_qty-a.sold_qty);
  const totals=rows.reduce((a,r)=>{['pos_qty','online_qty','unknown_qty','sold_qty','return_qty','import_qty','export_qty','stock_qty','sellable_qty','reserve_recommended'].forEach(k=>a[k]+=Number(r[k]||0));return a;},{pos_qty:0,online_qty:0,unknown_qty:0,sold_qty:0,return_qty:0,import_qty:0,export_qty:0,stock_qty:0,sellable_qty:0,reserve_recommended:0});
  const channelKnown=all.some(r=>r.channel&&r.channel!=='UNKNOWN');
  const valueKnown=all.some(r=>r.value_known);
  return {source_mode:'ledger',start,end,store_id:scope,store_name:scope==='all'?'Toàn hệ thống':(getStore(scope)?.name||''),period_days:periodDays,search:opts.q||'',channel_known:channelKnown,value_known:valueKnown,totals,rows:speed,best_sellers:best,top_stock:stock.slice(0,100),top_imports:imports.slice(0,100),slow_movers:slow.slice(0,100)};
}
function productAnalyticsRange(rawStart, rawEnd) {
  const today=dateOnly(new Date());
  const start=/^\d{4}-\d{2}-\d{2}$/.test(String(rawStart||''))?String(rawStart):`${today.slice(0,7)}-01`;
  let end=/^\d{4}-\d{2}-\d{2}$/.test(String(rawEnd||''))?String(rawEnd):today;
  if (end < start) end=start;
  return {start,end,endExclusive:addDaysUtc(end,1)};
}
function aggregateProductAnalytics(user, opts={}) {
  db.product_sales_imports=db.product_sales_imports||[];
  db.product_inventory_imports=db.product_inventory_imports||[];
  const {start,end,endExclusive}=productAnalyticsRange(opts.start,opts.end);
  const scope=effectiveProductStoreId(user,opts.store_id);
  const storeAllowed=id => scope==='all' ? true : Number(id)===Number(scope);
  const searchKey=normalizeExcelHeader(opts.q||'');
  const allSales=(db.product_sales_imports||[]).filter(r=>r.status!=='deleted' && storeAllowed(r.store_id) && Number(r.revenue||0)>0);
  const exactPeriodSales=allSales.filter(r=>r.granularity==='period' && dateOnly(r.period_start)===start && dateOnly(r.period_end)===end);
  // A Sapo report exported for one specific day often has no transaction-date column.
  // It is stored as period_start === period_end. Treat those single-day period files as atomic daily data
  // so they roll up correctly when the user switches from Day to Week or Month.
  const trueDailySales=allSales.filter(r=>r.granularity!=='period' && dateOnly(r.sale_date)>=start && dateOnly(r.sale_date)<endExclusive);
  const singleDayPeriodSales=allSales.filter(r=>r.granularity==='period' && dateOnly(r.period_start)===dateOnly(r.period_end) && dateOnly(r.period_start)>=start && dateOnly(r.period_start)<endExclusive);
  const atomicSales=[...trueDailySales,...singleDayPeriodSales];
  // Atomic day data is authoritative for flexible Day/Week/Month views.
  // Fall back to an exact whole-period upload only when no day-level data exists in the selected range.
  const sales=atomicSales.length ? atomicSales : exactPeriodSales;

  const requestedPeriodType=String(opts.period_type||'').toLowerCase();
  const invBase=(db.product_inventory_imports||[]).filter(r=>r.status!=='deleted' && storeAllowed(r.store_id));
  // Inventory is intentionally separated by view type: Week only reads weekly XNT uploads,
  // Month only reads monthly XNT uploads. Never mix weekly data into a month or vice versa.
  const invAll=invBase.filter(r=>{
    if(requestedPeriodType==='week') return String(r.inventory_period_type||'')==='week';
    if(requestedPeriodType==='month') return String(r.inventory_period_type||'')==='month';
    return false; // Day view has sales data only; XNT is uploaded as Week or Month.
  });
  // Match XNT by the selected calendar period, not by the current-to-date display end.
  // Example: on Friday 21/08 the Week view is 17/08→21/08 for sales, while an uploaded weekly XNT
  // is stored as 17/08→23/08. Likewise current-month sales end today while monthly XNT is stored to month-end.
  // Requiring r.period_end===end made current Week/Month inventory appear as 0/0 even after a successful upload.
  let inventoryMatchEnd=end;
  if(requestedPeriodType==='week') inventoryMatchEnd=addDaysUtc(start,6);
  else if(requestedPeriodType==='month'){
    const [yy,mm]=start.slice(0,7).split('-').map(Number);
    inventoryMatchEnd=dateOnly(new Date(Date.UTC(yy,mm,0)));
  }
  const exactInv=invAll.filter(r=>r.period_start===start && r.period_end===inventoryMatchEnd);
  const latestSnapshot=new Map();
  exactInv.forEach(r=>{const k=`${r.store_id}|${r.product_key}`;const old=latestSnapshot.get(k);if(!old||String(r.snapshot_date)>String(old.snapshot_date))latestSnapshot.set(k,r);});
  // Only the exact XNT file for the selected week/month is used.
  const periodInv=exactInv;

  const grouped=new Map();
  function getRow(name,key){
    const k=key||productNameKey(name);
    if(!grouped.has(k))grouped.set(k,{product_key:k,product_name:name||'',pos_qty:0,online_qty:0,sold_qty:0,revenue:0,pos_revenue:0,online_revenue:0,stock_qty:0,opening_qty:0,import_qty:0,purchase_in_qty:0,sales_return_in_qty:0,transfer_in_qty:0,inventory_in_qty:0,other_in_qty:0,export_qty:0,sale_out_qty:0,purchase_return_out_qty:0,transfer_out_qty:0,inventory_out_qty:0,other_out_qty:0,stores:new Set(),saleDates:new Set(),arrival_date:'',latest_stock_date:'',exclude_top_stock:false});
    const x=grouped.get(k);if(!x.product_name&&name)x.product_name=name;return x;
  }
  sales.forEach(r=>{
    const x=getRow(r.product_name,r.product_key);const qty=Number(r.quantity||0),rev=Number(r.revenue||0);
    if(String(r.source)==='POS'){x.pos_qty+=qty;x.pos_revenue+=rev;}else{x.online_qty+=qty;x.online_revenue+=rev;}
    x.sold_qty+=qty;x.revenue+=rev;x.stores.add(Number(r.store_id));if(r.sale_date)x.saleDates.add(r.sale_date);
  });
  latestSnapshot.forEach(r=>{const x=getRow(r.product_name,r.product_key);x.stock_qty+=Number(r.stock_qty||0);x.stores.add(Number(r.store_id));if(r.exclude_top_stock)x.exclude_top_stock=true;if(!x.latest_stock_date||String(r.snapshot_date)>x.latest_stock_date)x.latest_stock_date=String(r.snapshot_date||'');});
  periodInv.forEach(r=>{
    const x=getRow(r.product_name,r.product_key);x.stores.add(Number(r.store_id));
    if(r.exclude_top_stock)x.exclude_top_stock=true;
    x.opening_qty+=Number(r.opening_qty||0);
    x.purchase_in_qty+=Number(r.purchase_in_qty||0);
    x.sales_return_in_qty+=Number(r.sales_return_in_qty||0);
    x.transfer_in_qty+=Number(r.transfer_in_qty||0);
    x.inventory_in_qty+=Number(r.inventory_in_qty||0);
    x.other_in_qty+=Number(r.other_in_qty||0);
    x.sale_out_qty+=Number(r.sale_out_qty||0);
    x.purchase_return_out_qty+=Number(r.purchase_return_out_qty||0);
    x.transfer_out_qty+=Number(r.transfer_out_qty||0);
    x.inventory_out_qty+=Number(r.inventory_out_qty||0);
    x.other_out_qty+=Number(r.other_out_qty||0);
    // DEZUS logic: "Nhập" / "Xuất" trên dashboard chỉ là điều chuyển kho,
    // không dùng Tổng SL nhập / Tổng SL xuất vì các tổng này gồm cả giao dịch khác (đặc biệt bán hàng).
    x.import_qty+=Number(r.transfer_in_qty||0);
    x.export_qty+=Number(r.transfer_out_qty||0);
    if(r.arrival_date && (!x.arrival_date||String(r.arrival_date)>x.arrival_date))x.arrival_date=String(r.arrival_date);
  });
  // If exact period inventory exists, its closing stock is authoritative for the selected period.
  if(exactInv.length){
    const exactStocks=new Map();
    exactInv.forEach(r=>{const k=`${r.store_id}|${r.product_key}`;exactStocks.set(k,r);});
    const stockByProduct=new Map();
    exactStocks.forEach(r=>{const k=r.product_key;stockByProduct.set(k,(stockByProduct.get(k)||0)+Number(r.stock_qty||0));});
    stockByProduct.forEach((qty,key)=>{const x=getRow('',key);x.stock_qty=qty;});
  }
  const periodDays=Math.max(1,Math.floor((new Date(`${end}T00:00:00Z`)-new Date(`${start}T00:00:00Z`))/86400000)+1);
  let fullPeriodEnd=end;
  if(requestedPeriodType==='week') fullPeriodEnd=addDaysUtc(start,6);
  else if(requestedPeriodType==='month'){
    const [fy,fm]=start.slice(0,7).split('-').map(Number);
    fullPeriodEnd=dateOnly(new Date(Date.UTC(fy,fm,0)));
  }
  const remainingDays=Math.max(0,Math.floor((new Date(`${fullPeriodEnd}T00:00:00Z`)-new Date(`${end}T00:00:00Z`))/86400000));
  let rows=Array.from(grouped.values()).map(x=>{
    const sellingDays=x.arrival_date&&x.arrival_date>start?Math.max(1,Math.floor((new Date(`${end}T00:00:00Z`)-new Date(`${x.arrival_date}T00:00:00Z`))/86400000)+1):periodDays;
    const posVelocity=Math.round((x.pos_qty/sellingDays)*100)/100,onlineVelocity=Math.round((x.online_qty/sellingDays)*100)/100,velocity=Math.round((x.sold_qty/sellingDays)*100)/100;
    const daysCover=velocity>0?Math.round((x.stock_qty/velocity)*10)/10:null;
    // Forecast for the unelapsed part of the selected week/month.
    // potential_sell_qty = demand that could be sold if stock were always sufficient.
    // miss_sale_qty = estimated demand that current stock cannot cover.
    const potentialSellQty=velocity>0&&remainingDays>0?Math.ceil(velocity*remainingDays):0;
    const coveredSellQty=Math.min(Math.max(0,x.stock_qty),potentialSellQty);
    const missSaleQty=Math.max(0,potentialSellQty-Math.max(0,x.stock_qty));
    const reserveRecommended=velocity>0?Math.ceil(velocity*7):0;
    const daysSince=x.arrival_date?Math.max(0,Math.floor((new Date(`${end}T00:00:00Z`)-new Date(`${x.arrival_date}T00:00:00Z`))/86400000)+1):null;
    const slowScore=(daysSince||periodDays)*Math.max(0,x.stock_qty)/Math.max(1,x.sold_qty);
    return {...x,pos_qty:Math.round(x.pos_qty*100)/100,online_qty:Math.round(x.online_qty*100)/100,sold_qty:Math.round(x.sold_qty*100)/100,revenue:Math.round(x.revenue),stock_qty:Math.round(x.stock_qty*100)/100,velocity,pos_velocity:posVelocity,online_velocity:onlineVelocity,selling_days:sellingDays,days_cover:daysCover,sellable_qty:Math.round(potentialSellQty*100)/100,potential_sell_qty:Math.round(potentialSellQty*100)/100,covered_sell_qty:Math.round(coveredSellQty*100)/100,miss_sale_qty:Math.round(missSaleQty*100)/100,remaining_days:remainingDays,reserve_recommended:Math.round(reserveRecommended*100)/100,days_since_arrival:daysSince,slow_score:Math.round(slowScore*100)/100};
  });
  rows=rows.filter(r=>!isAggregateProductName(r.product_name));
  if(searchKey)rows=rows.filter(r=>normalizeExcelHeader(r.product_name).includes(searchKey));
  db.product_zero_value_exclusions=db.product_zero_value_exclusions||[];
  const zeroExcluded=new Set((db.product_zero_value_exclusions||[]).filter(z=>{
    if(z.status==='deleted'||!storeAllowed(z.store_id))return false;
    if(z.granularity==='daily')return dateOnly(z.sale_date)>=start&&dateOnly(z.sale_date)<endExclusive;
    if(z.granularity==='period'){
      const ps=dateOnly(z.period_start),pe=dateOnly(z.period_end);
      return (ps===start&&pe===end)||(ps===pe&&ps>=start&&ps<endExclusive);
    }
    return false;
  }).map(z=>z.product_key));
  const eligible=r=>!zeroExcluded.has(r.product_key);
  const best=rows.filter(r=>eligible(r)&&r.sold_qty>0&&r.revenue>0).slice().sort((a,b)=>b.sold_qty-a.sold_qty||b.revenue-a.revenue).slice(0,15);
  const stock=rows.filter(r=>eligible(r)&&r.stock_qty>0&&!r.exclude_top_stock).slice().sort((a,b)=>b.stock_qty-a.stock_qty||a.velocity-b.velocity);
  const imports=rows.filter(r=>eligible(r)&&(r.import_qty>0||r.stock_qty>0)).slice().sort((a,b)=>b.import_qty-a.import_qty||b.stock_qty-a.stock_qty);
  const slow=rows.filter(r=>eligible(r)&&r.stock_qty>0&&r.revenue>0).slice().sort((a,b)=>b.slow_score-a.slow_score||b.stock_qty-a.stock_qty||a.velocity-b.velocity);
  const speed=rows.filter(r=>eligible(r)&&(r.revenue>0||r.stock_qty>0||r.import_qty>0)).slice().sort((a,b)=>b.velocity-a.velocity||b.sold_qty-a.sold_qty);
  const totals=rows.reduce((a,r)=>{['pos_qty','online_qty','sold_qty','import_qty','export_qty','stock_qty','sellable_qty','potential_sell_qty','covered_sell_qty','miss_sale_qty','reserve_recommended'].forEach(k=>a[k]+=Number(r[k]||0));a.revenue+=Number(r.revenue||0);return a;},{pos_qty:0,online_qty:0,sold_qty:0,import_qty:0,export_qty:0,stock_qty:0,sellable_qty:0,potential_sell_qty:0,covered_sell_qty:0,miss_sale_qty:0,reserve_recommended:0,revenue:0});
  return {source_mode:'sales_inventory',inventory_period_type:requestedPeriodType,inventory_period_found:exactInv.length>0,start,end,full_period_end:fullPeriodEnd,remaining_days:remainingDays,store_id:scope,store_name:scope==='all'?'Toàn hệ thống':(getStore(scope)?.name||''),period_days:periodDays,search:opts.q||'',totals,rows:speed,best_sellers:best,top_stock:stock.slice(0,100),top_imports:imports.slice(0,100),slow_movers:slow.slice(0,100)};
}

function weeklyAutoBestSellers(storeId,start,endExclusive) {
  db.product_sales_imports=db.product_sales_imports||[];
  const map=new Map();
  const weekEnd=addDaysUtc(endExclusive,-1);
  const scoped=(db.product_sales_imports||[]).filter(r=>r.status!=='deleted' && Number(r.store_id)===Number(storeId) && Number(r.revenue||0)>0);
  const exactPeriod=scoped.filter(r=>r.granularity==='period' && r.period_start===start && r.period_end===weekEnd);
  const containedPeriods=scoped.filter(r=>r.granularity==='period' && r.period_start>=start && r.period_end<=weekEnd);
  const dailyRows=scoped.filter(r=>r.granularity!=='period' && r.sale_date>=start && r.sale_date<endExclusive);
  const sourceRows=dailyRows.length ? dailyRows : (exactPeriod.length ? exactPeriod : containedPeriods);
  sourceRows.forEach(r=>{if(isAggregateProductName(r.product_name))return;const key=r.product_key||productNameKey(r.product_name);const x=map.get(key)||{name:r.product_name,quantity:0,revenue:0};x.quantity+=Number(r.quantity||0);x.revenue+=Number(r.revenue||0);map.set(key,x);});
  return Array.from(map.values()).filter(x=>x.revenue>0&&!isAggregateProductName(x.name)).sort((a,b)=>b.quantity-a.quantity||b.revenue-a.revenue).slice(0,5).map(x=>({name:x.name,sku:'',quantity:Math.round(x.quantity*100)/100,bill_count:0,note:'Tự động từ Báo cáo doanh thu theo sản phẩm'}));
}


app.get('/api/product-analytics/uploads', requireAuth, (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({error:'Chỉ Admin được xem dữ liệu đã upload'});
  db.product_sales_imports=db.product_sales_imports||[];
  db.product_inventory_imports=db.product_inventory_imports||[];
  db.product_import_batches=db.product_import_batches||[];
  const activeBatchIds=new Set([
    ...db.product_sales_imports.filter(r=>r.status!=='deleted').map(r=>Number(r.batch_id||0)),
    ...db.product_inventory_imports.filter(r=>r.status!=='deleted').map(r=>Number(r.batch_id||0))
  ]);
  const batches=(db.product_import_batches||[]).filter(b=>b.status!=='deleted'&&activeBatchIds.has(Number(b.id))).map(b=>{
    const bid=Number(b.id);
    const sourceRows=b.type==='sales'
      ? db.product_sales_imports.filter(r=>r.status!=='deleted'&&Number(r.batch_id)===bid)
      : db.product_inventory_imports.filter(r=>r.status!=='deleted'&&Number(r.batch_id)===bid);
    const storeIds=[...new Set(sourceRows.map(r=>Number(r.store_id)).filter(Boolean))];
    return {
      id:b.id,type:b.type,inventory_period_type:b.inventory_period_type||'',file_name:b.file_name||'',period_start:b.period_start||'',period_end:b.period_end||'',granularity:b.granularity||'',rows_valid:Number(b.rows_valid||0),created_at:b.created_at||'',created_by_name:getUser(b.created_by)?.full_name||'',
      store_ids:storeIds,store_names:storeIds.map(id=>getStore(id)?.name||`CH ${id}`)
    };
  }).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  const salesMap=new Map();
  db.product_sales_imports.filter(r=>r.status!=='deleted').forEach(r=>{
    const sid=Number(r.store_id); const st=getStore(sid)?.name||`CH ${sid}`;
    const start=r.granularity==='period'?dateOnly(r.period_start):dateOnly(r.sale_date);
    const end=r.granularity==='period'?dateOnly(r.period_end):dateOnly(r.sale_date);
    if(!start)return; const k=`${sid}|${start}|${end}`; salesMap.set(k,{store_id:sid,store_name:st,start,end});
  });
  const invMap=new Map();
  db.product_inventory_imports.filter(r=>r.status!=='deleted').forEach(r=>{
    const sid=Number(r.store_id); const st=getStore(sid)?.name||`CH ${sid}`; const start=dateOnly(r.period_start||r.snapshot_date), end=dateOnly(r.period_end||r.snapshot_date); if(!start)return;
    const ipt=String(r.inventory_period_type||''); const k=`${sid}|${ipt}|${start}|${end}`; invMap.set(k,{store_id:sid,store_name:st,start,end,inventory_period_type:ipt});
  });
  res.json({sales:Array.from(salesMap.values()).sort((a,b)=>String(b.start).localeCompare(String(a.start))||a.store_name.localeCompare(b.store_name,'vi')),inventory:Array.from(invMap.values()).sort((a,b)=>String(b.start).localeCompare(String(a.start))||a.store_name.localeCompare(b.store_name,'vi')),batches:batches.slice(0,100)});
});

app.delete('/api/product-analytics/uploads/:batchId', requireAuth, (req,res)=>{
  if(req.user.role!=='admin') return res.status(403).json({error:'Chỉ Admin được xóa dữ liệu đã upload'});
  const batchId=Number(req.params.batchId||0);
  if(!batchId) return res.status(400).json({error:'Batch dữ liệu không hợp lệ'});
  db.product_import_batches=db.product_import_batches||[];
  db.product_sales_imports=db.product_sales_imports||[];
  db.product_inventory_imports=db.product_inventory_imports||[];
  db.product_zero_value_exclusions=db.product_zero_value_exclusions||[];
  const batch=db.product_import_batches.find(b=>Number(b.id)===batchId&&b.status!=='deleted');
  if(!batch) return res.status(404).json({error:'Không tìm thấy dữ liệu upload này hoặc dữ liệu đã bị xóa'});
  let deletedRows=0;
  [db.product_sales_imports,db.product_inventory_imports,db.product_zero_value_exclusions].forEach(list=>list.forEach(r=>{
    if(r.status!=='deleted'&&Number(r.batch_id)===batchId){r.status='deleted';r.deleted_at=nowIso();r.deleted_by=req.user.id;deletedRows++;}
  }));
  batch.status='deleted';batch.deleted_at=nowIso();batch.deleted_by=req.user.id;
  saveDb();
  res.json({ok:true,deleted_rows:deletedRows,message:`Đã xóa lần upload ${batch.file_name||('#'+batchId)} (${deletedRows} dòng dữ liệu).`});
});

app.get('/api/product-analytics/export.xlsx', requireAuth, (req,res)=>{
  try{
    const data=aggregateProductAnalytics(req.user,{store_id:req.query.store_id,start:req.query.start,end:req.query.end,q:req.query.q,period_type:req.query.period_type});
    const rows=(data.rows||[]).map((r,i)=>({
      stt:i+1,
      ten_san_pham:r.product_name||'',
      ban_pos:Number(r.pos_qty||0),
      ban_online:Number(r.online_qty||0),
      tong_ban:Number(r.sold_qty||0),
      doanh_thu:Number(r.revenue||0),
      tong_nhap:Number(r.import_qty||0),
      tong_xuat:Number(r.export_qty||0),
      ton_cuoi_ky:Number(r.stock_qty||0),
      toc_do_pos_ngay:Number(r.pos_velocity||0),
      toc_do_online_ngay:Number(r.online_velocity||0),
      toc_do_tong_ngay:Number(r.velocity||0),
      co_the_ban_them_neu_du_hang:Number(r.potential_sell_qty??r.sellable_qty??0),
      miss_sale_uoc_tinh:Number(r.miss_sale_qty||0),
      so_ngay_con_lai:Number(r.remaining_days||0),
      du_tru_de_xuat:Number(r.reserve_recommended||0),
      days_of_cover:r.days_cover==null?'':Number(r.days_cover),
      ngay_nhap_gan_nhat:r.arrival_date||''
    }));
    const buffer=toExcelBuffer(rows,'Phan tich hang hoa');
    res.header('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`phan-tich-hang-hoa-${data.start}-${data.end}.xlsx`);res.send(buffer);
  }catch(err){res.status(400).json({error:err.message||'Không thể tải Excel phân tích hàng hóa'});}
});

app.get('/api/product-analytics', requireAuth, (req,res)=>{
  try { res.json(aggregateProductAnalytics(req.user,{store_id:req.query.store_id,start:req.query.start,end:req.query.end,q:req.query.q,period_type:req.query.period_type})); }
  catch(err){ res.status(400).json({error:err.message||'Không thể tổng hợp hàng hóa'}); }
});


app.post('/api/product-analytics/import-ledger', requireAuth, upload.single('file'), (req,res)=>{
  if(!canImportProductFiles(req.user))return res.status(403).json({error:'Chỉ Admin được upload Sổ kho Sapo'});
  if(!req.file)return res.status(400).json({error:'Chưa chọn file Sổ kho'});
  try{
    const selected=effectiveProductStoreId(req.user,req.body.store_id);
    const rawRows=readLedgerRows(req.file.path); const parsed=[]; let skippedName=0,skippedStore=0,skippedDate=0;
    rawRows.forEach((row,idx)=>{
      const date=parseExcelDateValue(excelRowValue(row,['Ngày ghi nhận','Ngày','Ngày giao dịch','Thời gian']));if(!date){skippedDate++;return;}
      const name=normalizeProductName(excelRowValue(row,['Sản phẩm','Tên sản phẩm','Tên hàng hóa','Tên hàng']));if(!name){skippedName++;return;}
      const branch=String(excelRowValue(row,['Chi nhánh','Tên chi nhánh','Cửa hàng','Kho'])??'').trim();const st=storeFromImportedName(branch);let sid;
      if(selected==='all'){if(!st){skippedStore++;return;}sid=st.id;}else{if(st&&Number(st.id)!==Number(selected)){skippedStore++;return;}sid=Number(selected);}
      const desc=String(excelRowValue(row,['Mô tả','Diễn giải','Loại giao dịch'])??'').trim();
      const transaction=String(excelRowValue(row,['Giao dịch','Mã giao dịch','Chứng từ'])??'').trim();
      const sku=String(excelRowValue(row,['Mã SKU','SKU','Mã hàng'])??'').trim();const variant=String(excelRowValue(row,['Phiên bản','Biến thể','Size','Màu sắc'])??'').trim();
      const inQty=Math.abs(parseMoneyLoose(excelRowValue(row,['Nhập kho Số lượng','Nhập kho','Số lượng nhập','SL nhập','Nhập']))||0);
      const outQty=Math.abs(parseMoneyLoose(excelRowValue(row,['Xuất kho Số lượng','Xuất kho','Số lượng xuất','SL xuất','Xuất']))||0);
      const stockRaw=excelRowValue(row,['Tồn kho sau giao dịch Số lượng','Tồn kho sau giao dịch','Tồn sau giao dịch','Tồn kho','Tồn']);
      const stockAfter=stockRaw===''||stockRaw===undefined?null:parseMoneyLoose(stockRaw);
      const channelRaw=excelRowValue(row,['Tên kênh bán hàng','Kênh bán hàng','Nguồn đơn','Nguồn','Kênh','Channel']);
      const channel=ledgerChannel(channelRaw);
      let valueRaw=excelRowValue(row,['Tổng doanh thu','Doanh thu','Giá trị','Thành tiền','Giá bán','Đơn giá','Value','Revenue']);
      const valueKnown=!(valueRaw===undefined||valueRaw===null||String(valueRaw).trim()==='');
      const value=valueKnown?parseMoneyLoose(valueRaw):0;
      parsed.push({store_id:sid,record_date:date,seq:idx+1,transaction,description:desc,movement_type:ledgerMovementType(desc,transaction),product_key:productNameKey(name),product_name:name,variant,sku,in_qty:inQty,out_qty:outQty,stock_after:stockAfter,channel,value_known:valueKnown,value,status:'active'});
    });
    db.product_stock_ledger=db.product_stock_ledger||[]; db.product_import_batches=db.product_import_batches||[];
    const touchedStores=new Set(parsed.map(r=>Number(r.store_id))); const dates=parsed.map(r=>r.record_date).sort(); const minDate=dates[0]||'',maxDate=dates[dates.length-1]||'';
    // Replace overlapping ledger data for touched stores/date range, avoiding duplicate uploads.
    if(minDate&&maxDate)db.product_stock_ledger.forEach(r=>{if(r.status!=='deleted'&&touchedStores.has(Number(r.store_id))&&r.record_date>=minDate&&r.record_date<=maxDate){r.status='deleted';r.deleted_at=nowIso();r.deleted_by=req.user.id;}});
    const batchId=nextId('product_import_batches');parsed.forEach(r=>db.product_stock_ledger.push({id:nextId('product_stock_ledger'),...r,batch_id:batchId,created_at:nowIso(),created_by:req.user.id}));
    const channelKnown=parsed.filter(r=>r.movement_type==='sale').some(r=>r.channel!=='UNKNOWN');const valueKnown=parsed.filter(r=>r.movement_type==='sale').some(r=>r.value_known);
    db.product_import_batches.push({id:batchId,type:'ledger',file_name:req.file.originalname||'',period_start:minDate,period_end:maxDate,rows_raw:rawRows.length,rows_valid:parsed.length,skipped_name:skippedName,skipped_store:skippedStore,skipped_date:skippedDate,channel_known:channelKnown,value_known:valueKnown,created_at:nowIso(),created_by:req.user.id});saveDb();
    const warnings=[];if(!channelKnown)warnings.push('File chưa có cột Kênh/Nguồn đơn nên chưa thể tách POS và Online chính xác.');if(!valueKnown)warnings.push('File chưa có cột Giá trị/Doanh thu nên chưa thể tự loại sản phẩm giá trị 0 khỏi Top.');
    res.json({ok:true,raw_rows:rawRows.length,valid_rows:parsed.length,period_start:minDate,period_end:maxDate,channel_known:channelKnown,value_known:valueKnown,message:`Đã nhập ${parsed.length} dòng Sổ kho (${minDate||'-'} → ${maxDate||'-'}). ${warnings.join(' ')}`});
  }catch(err){res.status(400).json({error:err.message||'Không đọc được file Sổ kho Sapo'});}finally{try{fs.unlinkSync(req.file.path)}catch{}}
});

app.post('/api/product-analytics/import-sales', requireAuth, upload.single('file'), (req,res)=>{
  if (!canImportProductFiles(req.user)) return res.status(403).json({error:'Chỉ Admin được upload file bán hàng Sapo'});
  if (!req.file) return res.status(400).json({error:'Chưa chọn file bán hàng'});
  try {
    const selected=effectiveProductStoreId(req.user,req.body.store_id);
    const reportStart=/^\d{4}-\d{2}-\d{2}$/.test(String(req.body.report_start||''))?String(req.body.report_start):'';
    const reportEnd=/^\d{4}-\d{2}-\d{2}$/.test(String(req.body.report_end||''))?String(req.body.report_end):'';
    if(!reportStart||!reportEnd||reportEnd<reportStart) return res.status(400).json({error:'Vui lòng chọn đúng Từ ngày / Đến ngày của báo cáo Sapo trước khi upload'});
    const rawRows=readExcelRows(req.file.path);
    const hasDateColumn=rawRows.some(row=>!!parseExcelDateValue(excelRowValue(row,['Ngày','Ngày tạo','Ngày bán','Ngày đơn hàng','Thời gian','Created at','Order date','Ngày ghi nhận'])));
    const granularity=hasDateColumn?'daily':'period';
    const agg=new Map(); const zeroCandidates=[]; let skippedSource=0,skippedZero=0,skippedName=0,skippedStore=0,skippedDate=0;
    rawRows.forEach(row=>{
      const sourceRaw=String(excelRowValue(row,['Tên kênh bán hàng','Nguồn','Nguồn đơn','Kênh bán hàng','Nguồn bán hàng','Source','Kênh','Kênh bán','Tên kênh'])??'').trim();
      const source=normalizeExcelHeader(sourceRaw)==='pos'?'POS':'ONLINE';
      const name=normalizeProductName(excelRowValue(row,['Tên sản phẩm','Sản phẩm','Tên hàng hóa','Tên hàng','Product name','Tên SP','Tên sản phẩm/ dịch vụ','Tên sản phẩm dịch vụ']));
      if (!name){skippedName++;return;}
      if (isAggregateProductName(name)) return;
      const qty=Math.abs(parseMoneyLoose(excelRowValue(row,['Số lượng thực','Số lượng','SL hàng thực bán','Số lượng bán','SL bán','Quantity','Qty','Số SP bán','SL sản phẩm','Số lượng sản phẩm','Số lượng bán thực tế']))||0);
      let revenue=parseMoneyLoose(excelRowValue(row,['Tổng doanh thu','Doanh thu thuần','Doanh thu','Thành tiền','Giá trị','Tổng tiền','Net sales','Revenue','Giá trị hàng bán','Doanh số','Giá trị đơn hàng']));
      if (!revenue){const price=parseMoneyLoose(excelRowValue(row,['Giá bán','Đơn giá','Price'])); if(price&&qty) revenue=price*qty;}
      const parsedDate=parseExcelDateValue(excelRowValue(row,['Ngày','Ngày tạo','Ngày bán','Ngày đơn hàng','Thời gian','Created at','Order date','Ngày ghi nhận']));
      const d=granularity==='daily'?parsedDate:reportEnd;
      if(granularity==='daily'&&!d){skippedDate++;return;}
      const importedStoreName=String(excelRowValue(row,['Tên chi nhánh','Chi nhánh','Cửa hàng','Kho','Location','Branch'])??'').trim();
      const importedStore=storeFromImportedName(importedStoreName);
      let sid;
      if(selected==='all') { if(!importedStore){skippedStore++;return;} sid=importedStore.id; }
      else { if(importedStore && Number(importedStore.id)!==Number(selected)){skippedStore++;return;} sid=Number(selected); }
      const key=productNameKey(name);
      if (!(revenue>0)){skippedZero++;zeroCandidates.push({store_id:sid,product_key:key,product_name:name,granularity,period_start:granularity==='period'?reportStart:'',period_end:granularity==='period'?reportEnd:'',sale_date:granularity==='daily'?d:''});return;}
      const aggKey=granularity==='period'?`${sid}|${reportStart}|${reportEnd}|${source}|${key}`:`${sid}|${d}|${source}|${key}`;
      const x=agg.get(aggKey)||{store_id:sid,sale_date:d,source,product_key:key,product_name:name,quantity:0,revenue:0,granularity,period_start:granularity==='period'?reportStart:'',period_end:granularity==='period'?reportEnd:''};
      x.quantity+=qty; x.revenue+=revenue; agg.set(aggKey,x);
    });
    db.product_sales_imports=db.product_sales_imports||[]; db.product_import_batches=db.product_import_batches||[]; db.product_zero_value_exclusions=db.product_zero_value_exclusions||[];
    const batchId=nextId('product_import_batches');
    let replaced=0, inserted=0;
    if(granularity==='period'){
      const touchedStores=new Set(Array.from(agg.values()).map(x=>Number(x.store_id)));
      db.product_sales_imports.forEach(r=>{if(r.status!=='deleted'&&r.granularity==='period'&&r.period_start===reportStart&&r.period_end===reportEnd&&touchedStores.has(Number(r.store_id))){r.status='deleted';r.deleted_at=nowIso();r.deleted_by=req.user.id;}});
    }
    agg.forEach(x=>{
      if(granularity==='period'){
        db.product_sales_imports.push({id:nextId('product_sales_imports'),...x,batch_id:batchId,quantity:Math.round(x.quantity*100)/100,revenue:Math.round(x.revenue),status:'active',created_at:nowIso(),created_by:req.user.id});inserted++;
      } else {
        const existing=db.product_sales_imports.find(r=>r.status!=='deleted'&&r.granularity!=='period'&&Number(r.store_id)===Number(x.store_id)&&r.sale_date===x.sale_date&&r.source===x.source&&r.product_key===x.product_key);
        if(existing){existing.product_name=x.product_name;existing.quantity=Math.round(x.quantity*100)/100;existing.revenue=Math.round(x.revenue);existing.batch_id=batchId;existing.updated_at=nowIso();existing.updated_by=req.user.id;replaced++;}
        else{db.product_sales_imports.push({id:nextId('product_sales_imports'),...x,batch_id:batchId,quantity:Math.round(x.quantity*100)/100,revenue:Math.round(x.revenue),status:'active',created_at:nowIso(),created_by:req.user.id});inserted++;}
      }
    });
    const touchedStoresForZero=new Set([...Array.from(agg.values()).map(x=>Number(x.store_id)),...zeroCandidates.map(x=>Number(x.store_id))]);
    db.product_zero_value_exclusions.forEach(z=>{if(z.status!=='deleted'&&touchedStoresForZero.has(Number(z.store_id))&&((granularity==='period'&&z.granularity==='period'&&z.period_start===reportStart&&z.period_end===reportEnd)||(granularity==='daily'&&z.granularity==='daily'&&z.sale_date>=reportStart&&z.sale_date<=reportEnd))){z.status='deleted';z.deleted_at=nowIso();z.deleted_by=req.user.id;}});
    const positiveKeys=new Set(Array.from(agg.values()).map(x=>`${x.store_id}|${x.product_key}`));
    const zeroSeen=new Set();
    zeroCandidates.forEach(z=>{const zk=`${z.store_id}|${z.product_key}`;if(positiveKeys.has(zk)||zeroSeen.has(zk))return;zeroSeen.add(zk);db.product_zero_value_exclusions.push({id:nextId('product_zero_value_exclusions'),...z,batch_id:batchId,status:'active',created_at:nowIso(),created_by:req.user.id});});
    db.product_import_batches.push({id:batchId,type:'sales',file_name:req.file.originalname||'',period_start:reportStart,period_end:reportEnd,granularity,rows_raw:rawRows.length,rows_valid:agg.size,inserted,replaced,skipped_source:skippedSource,skipped_zero:skippedZero,skipped_name:skippedName,skipped_store:skippedStore,skipped_date:skippedDate,created_at:nowIso(),created_by:req.user.id});
    saveDb();
    const note=granularity==='period'?'File Sapo không có cột ngày: dữ liệu được lưu đúng theo kỳ báo cáo đã chọn. Khi xem, hãy chọn đúng kỳ này.':'File có ngày giao dịch: có thể lọc linh hoạt theo ngày.';
    if(!agg.size){return res.status(400).json({error:`Không tìm thấy dòng bán hàng hợp lệ trong file. Đã đọc ${rawRows.length} dòng; bỏ ${skippedName} dòng thiếu tên SP, ${skippedStore} dòng không nhận được chi nhánh, ${skippedZero} dòng giá trị = 0. Hãy kiểm tra đúng file Báo cáo doanh thu/OPS theo sản phẩm.`});}
    res.json({ok:true,file:req.file.originalname,raw_rows:rawRows.length,valid_rows:agg.size,inserted,replaced,skipped_source:skippedSource,skipped_zero:skippedZero,skipped_name:skippedName,skipped_store:skippedStore,granularity,period_start:reportStart,period_end:reportEnd,message:`Đã lấy ${agg.size} dòng gộp theo tên sản phẩm. POS được tách riêng; mọi nguồn khác được tính Online. Chỉ tính sản phẩm có giá trị > 0. ${note}`});
  } catch(err){res.status(400).json({error:err.message||'Không đọc được file Sapo'});} finally {try{fs.unlinkSync(req.file.path)}catch{}}
});

app.post('/api/product-analytics/import-inventory', requireAuth, upload.single('file'), (req,res)=>{
  if (!canImportProductFiles(req.user)) return res.status(403).json({error:'Chỉ Admin được upload Báo cáo xuất nhập tồn Sapo'});
  if (!req.file) return res.status(400).json({error:'Chưa chọn file Xuất nhập tồn'});
  try {
    const selected=effectiveProductStoreId(req.user,req.body.store_id);
    const inventoryPeriodType=String(req.body.inventory_period_type||'').toLowerCase();
    let reportStart='', reportEnd='';
    if(inventoryPeriodType==='week'){
      const ws=/^\d{4}-\d{2}-\d{2}$/.test(String(req.body.week_start||''))?String(req.body.week_start):'';
      if(!ws)return res.status(400).json({error:'Vui lòng chọn ngày đầu tuần cho file XNT tuần'});
      reportStart=ws; reportEnd=addDaysUtc(ws,6);
    }else if(inventoryPeriodType==='month'){
      const mk=/^\d{4}-\d{2}$/.test(String(req.body.month||''))?String(req.body.month):'';
      if(!mk)return res.status(400).json({error:'Vui lòng chọn tháng cho file XNT tháng'});
      reportStart=`${mk}-01`;
      const [yy,mm]=mk.split('-').map(Number); reportEnd=dateOnly(new Date(Date.UTC(yy,mm,0)));
    }else{
      return res.status(400).json({error:'Vui lòng chọn loại XNT theo Tuần hoặc theo Tháng'});
    }
    const rawRows=readInventoryDetailRows(req.file.path);const agg=new Map();let skippedName=0,skippedStore=0;
    rawRows.forEach(row=>{
      const name=normalizeProductName(excelRowValue(row,['Sản phẩm','Tên sản phẩm','Tên hàng hóa','Tên hàng','Product name']));if(!name){skippedName++;return;}
      if(isAggregateProductName(name))return;
      const importedStoreName=String(excelRowValue(row,['Chi nhánh','Tên chi nhánh','Cửa hàng','Kho','Location','Branch'])??'').trim();const importedStore=storeFromImportedName(importedStoreName);
      let sid;if(selected==='all'){if(!importedStore){skippedStore++;return;}sid=importedStore.id;}else{if(importedStore&&Number(importedStore.id)!==Number(selected)){skippedStore++;return;}sid=Number(selected);}
      const sku=String(excelRowValue(row,['Mã SKU','SKU','Mã hàng','Mã sản phẩm'])??'').trim();
      const excludeTopStock=sku.toUpperCase().startsWith('TUIDEZUS');
      const n=(aliases)=>Math.abs(parseMoneyLoose(excelRowValue(row,aliases))||0);
      const opening=n(['Đầu kỳ Số lượng','Đầu kỳ','Tồn đầu kỳ','Opening stock']);
      const purchaseIn=n(['Số lượng nhập Nhập hàng','Nhập hàng']);
      const salesReturnIn=n(['Số lượng nhập Trả hàng bán','Trả hàng bán']);
      const transferIn=n(['Số lượng nhập Chuyển kho','Nhập chuyển kho','Chuyển kho nhập']);
      const inventoryIn=n(['Số lượng nhập Kiểm kho','Nhập kiểm kho']);
      const otherIn=n(['Số lượng nhập Nhập khác','Nhập khác']);
      let totalIn=n(['Số lượng nhập Tổng SL nhập','Tổng SL nhập','Tổng số lượng nhập','Tổng nhập']);
      if(!totalIn)totalIn=purchaseIn+salesReturnIn+transferIn+inventoryIn+otherIn;
      const saleOut=n(['Số lượng xuất Bán hàng','Xuất bán hàng','Bán hàng']);
      const purchaseReturnOut=n(['Số lượng xuất Trả hàng nhập','Trả hàng nhập']);
      const transferOut=n(['Số lượng xuất Chuyển kho','Xuất chuyển kho','Chuyển kho xuất']);
      const inventoryOut=n(['Số lượng xuất Kiểm kho','Xuất kiểm kho']);
      const otherOut=n(['Số lượng xuất Xuất khác','Xuất khác']);
      let totalOut=n(['Số lượng xuất Tổng SL xuất','Tổng SL xuất','Tổng số lượng xuất','Tổng xuất']);
      if(!totalOut)totalOut=saleOut+purchaseReturnOut+transferOut+inventoryOut+otherOut;
      let closing=n(['Cuối kỳ Số lượng','Tồn kho cuối kỳ Số lượng','Tồn cuối kỳ','Tồn cuối','Closing stock','Tồn kho']);
      if(!closing && opening+totalIn-totalOut!==0)closing=Math.max(0,opening+totalIn-totalOut);
      const key=productNameKey(name),k=`${sid}|${reportStart}|${reportEnd}|${key}`;
      const x=agg.get(k)||{store_id:sid,snapshot_date:reportEnd,period_start:reportStart,period_end:reportEnd,inventory_period_type:inventoryPeriodType,product_key:key,product_name:name,stock_qty:0,opening_qty:0,import_qty:0,purchase_in_qty:0,sales_return_in_qty:0,transfer_in_qty:0,inventory_in_qty:0,other_in_qty:0,export_qty:0,sale_out_qty:0,purchase_return_out_qty:0,transfer_out_qty:0,inventory_out_qty:0,other_out_qty:0,arrival_date:'',exclude_top_stock:false};
      if(excludeTopStock)x.exclude_top_stock=true;
      x.opening_qty+=opening;x.purchase_in_qty+=purchaseIn;x.sales_return_in_qty+=salesReturnIn;x.transfer_in_qty+=transferIn;x.inventory_in_qty+=inventoryIn;x.other_in_qty+=otherIn;
      // Chỉ lấy điều chuyển kho cho 2 cột Nhập / Xuất hiển thị trên web.
      x.import_qty+=transferIn;
      x.sale_out_qty+=saleOut;x.purchase_return_out_qty+=purchaseReturnOut;x.transfer_out_qty+=transferOut;x.inventory_out_qty+=inventoryOut;x.other_out_qty+=otherOut;
      x.export_qty+=transferOut;
      x.stock_qty+=closing;
      // XNT is period-level, so arrival date is only safe when there was no opening stock and purchase receipt occurred in this period.
      if(opening<=0&&transferIn>0)x.arrival_date=reportStart;
      agg.set(k,x);
    });
    db.product_inventory_imports=db.product_inventory_imports||[];db.product_import_batches=db.product_import_batches||[];
    const touchedStores=new Set(Array.from(agg.values()).map(x=>Number(x.store_id)));
    db.product_inventory_imports.forEach(r=>{if(r.status!=='deleted'&&String(r.inventory_period_type||'')===inventoryPeriodType&&r.period_start===reportStart&&r.period_end===reportEnd&&touchedStores.has(Number(r.store_id))){r.status='deleted';r.deleted_at=nowIso();r.deleted_by=req.user.id;}});
    const batchId=nextId('product_import_batches');let inserted=0;
    agg.forEach(x=>{db.product_inventory_imports.push({id:nextId('product_inventory_imports'),...x,batch_id:batchId,status:'active',created_at:nowIso(),created_by:req.user.id});inserted++;});
    db.product_import_batches.push({id:batchId,type:'inventory_detail',inventory_period_type:inventoryPeriodType,file_name:req.file.originalname||'',period_start:reportStart,period_end:reportEnd,rows_raw:rawRows.length,rows_valid:agg.size,inserted,skipped_name:skippedName,skipped_store:skippedStore,created_at:nowIso(),created_by:req.user.id});saveDb();
    res.json({ok:true,raw_rows:rawRows.length,valid_rows:agg.size,inserted,message:`Đã cập nhật ${agg.size} sản phẩm XNT theo ${inventoryPeriodType==='week'?'tuần':'tháng'}. Cột Nhập/Xuất trên phân tích chỉ lấy Số lượng nhập - Chuyển kho và Số lượng xuất - Chuyển kho.`});
  }catch(err){res.status(400).json({error:err.message||'Không đọc được Báo cáo xuất nhập tồn Sapo'});}finally{try{fs.unlinkSync(req.file.path)}catch{}}
});

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
    quantity: toNumber(item.quantity ?? item.qty ?? item.item_count ?? item.so_mon, 0),
    bill_count: toNumber(item.bill_count ?? item.bills, 0),
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
function buildWeeklyReport(user, rawWeekStart, rawStoreId, rawUserStatus = 'active') {
  const week_start = weekStartOf(rawWeekStart || new Date());
  const week_end = addDaysUtc(week_start, 6);
  const endExclusive = addDaysUtc(week_start, 7);
  const storeId = isAllStoreRole(user) ? Number(rawStoreId || getPrimaryStoreId(user) || db.stores[0]?.id) : Number(getPrimaryStoreId(user));
  const store = getStore(storeId);
  if (!store) throw new Error('Cửa hàng không hợp lệ');
  if (user.role !== 'admin' && Number(user.permissions.can_view_weekly_report) !== 1 && Number(user.permissions.can_manage_weekly_report) !== 1) throw new Error('Không có quyền xem báo cáo tuần');
  const days = datesBetween(week_start, endExclusive);
  const employeeStatusMode = ['active', 'inactive', 'all'].includes(String(rawUserStatus || 'active')) ? String(rawUserStatus || 'active') : 'active';
  const salesRows = (db.sales || []).filter(sa => Number(sa.store_id) === Number(storeId) && dateVal(sa.sale_date) >= week_start && dateVal(sa.sale_date) < endExclusive);
  const dailyMap = new Map(days.map(d => [d, { sale_date: d, revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, customer_new_count: 0, customer_old_count: 0, target_revenue: 0, upt: 0, atv: 0, asp: 0, cr: 0, achievement_percent: 0, note: '' }]));
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
    const counts = customerCountsFromRow(x);
    row.customer_new_count = counts.customer_new_count;
    row.customer_old_count = counts.customer_old_count;
    row.customer_count = counts.customer_count;
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
  const staff = salesStaffForStore(storeId, { status: employeeStatusMode, start: week_start, end: endExclusive });
  const employeeRows = staff.map(u => {
    const rows = salesRows.filter(r => Number(r.user_id) === Number(u.id));
    const revenue = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const bill_count = rows.reduce((s, r) => s + Number(r.bill_count || 0), 0);
    const item_count = rows.reduce((s, r) => s + Number(r.item_count || 0), 0);
    const target = Math.round(proratedTargetForUser(u.id, week_start, endExclusive));
    return { user_id: u.id, full_name: u.full_name, user_status: u.status || 'active', store_id: getPrimaryStoreId(u), store_name: store.name, revenue, target, achievement_percent: target ? Math.round((revenue / target) * 10000) / 100 : 0, revenue_percent: 0, bill_count, item_count, upt: bill_count ? Math.round((item_count / bill_count) * 100) / 100 : 0, atv: bill_count ? Math.round(revenue / bill_count) : 0, asp: item_count ? Math.round(revenue / item_count) : 0 };
  }).sort((a, b) => b.revenue - a.revenue);
  const totals = daysRows.reduce((acc, r) => {
    acc.revenue += Number(r.revenue || 0);
    acc.bill_count += Number(r.bill_count || 0);
    acc.item_count += Number(r.item_count || 0);
    acc.customer_count += Number(r.customer_count || 0);
    acc.customer_new_count += Number(r.customer_new_count || 0);
    acc.customer_old_count += Number(r.customer_old_count || 0);
    acc.target_revenue += Number(r.target_revenue || 0);
    return acc;
  }, { revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, customer_new_count: 0, customer_old_count: 0, target_revenue: 0 });
  const staffForTarget = salesStaffForStore(storeId, { status: 'all', start: week_start, end: endExclusive });
  const proratedStoreTarget = Math.round(staffForTarget.reduce((sum, u) => sum + proratedTargetForUser(u.id, week_start, endExclusive), 0));
  if (!totals.target_revenue) totals.target_revenue = proratedStoreTarget;
  totals.upt = totals.bill_count ? Math.round((totals.item_count / totals.bill_count) * 100) / 100 : 0;
  totals.atv = totals.bill_count ? Math.round(totals.revenue / totals.bill_count) : 0;
  totals.asp = totals.item_count ? Math.round(totals.revenue / totals.item_count) : 0;
  totals.cr = totals.customer_count ? Math.round((totals.bill_count / totals.customer_count) * 10000) / 100 : 0;
  totals.achievement_percent = totals.target_revenue ? Math.round((totals.revenue / totals.target_revenue) * 10000) / 100 : 0;
  employeeRows.forEach(r => { r.revenue_percent = totals.revenue ? Math.round((r.revenue / totals.revenue) * 10000) / 100 : 0; });
  const feedback = weeklyReportRow(storeId, week_start) || { feedback: '', issues: '', action_plan: '', note: '', top_products: [], promotions: [] };
  const autoTopProducts = weeklyAutoBestSellers(storeId, week_start, endExclusive);
  const top_products = autoTopProducts.length ? autoTopProducts : normalizeWeeklyProducts(feedback.top_products || []);
  const promotions = normalizeWeeklyPromotions(feedback.promotions || []);
  return { store_id: storeId, store_name: store.name, week_start, week_end, totals, days: daysRows, employees: employeeRows, top_products, promotions, feedback: { ...feedback, top_products, promotions } };
}

app.post('/api/sales/daily', requireAuth, requireAnyPerm('can_manage_total_sales','can_manage_sales'), (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ Admin được nhập doanh thu từng ngày' });
  const { store_id, sale_date, customer_count, customer_new_count, customer_old_count, note, entries } = req.body || {};
  const storeId = canSelectAssignedStore(req.user) ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
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
  upsertStoreSalesDay(storeId, sale_date, customer_count, note, req.user.id, customer_new_count, customer_old_count);
  saveDb();
  res.json({ ok: true, count: saved.length });
});

app.post('/api/sales/targets', requireAuth, requirePerm('can_set_sales_targets'), (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ Admin được set target đầu tháng' });
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
      row.target_upt = toDecimalNumber(target_upt, 0);
      row.target_atv = toNumber(target_atv, 0);
      row.target_cr = toDecimalNumber(target_cr, 0);
      row.note = note || '';
      row.store_id = employeeStoreId;
      row.updated_by = req.user.id;
      row.updated_at = nowIso();
    } else {
      row = { id: nextId('sales_targets'), user_id: employee.id, store_id: employeeStoreId, target_month, target: revenueTarget, target_revenue: revenueTarget, target_upt: toDecimalNumber(target_upt, 0), target_atv: toNumber(target_atv, 0), target_cr: toDecimalNumber(target_cr, 0), note: note || '', created_by: req.user.id, created_at: nowIso(), updated_by: req.user.id, updated_at: nowIso() };
      db.sales_targets.push(row);
    }
    saved.push(row);
  }
  saveDb();
  res.json({ ok: true, count: saved.length, ids: saved.map(r => r.id) });
});


app.post('/api/sales/daily-targets', requireAuth, requirePerm('can_set_sales_targets'), (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ Admin được set target doanh thu theo ngày' });
  const { store_id, target_date, start_date, end_date, target_revenue, note } = req.body || {};
  let { dates } = req.body || {};
  const storeId = canSelectAssignedStore(req.user) ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
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
  const userStatus = ['active', 'inactive', 'all'].includes(String(req.query.user_status || 'active')) ? String(req.query.user_status || 'active') : 'active';
  const result = leaderboardRows(req.user, period, date, storeId, { includeAllStores: overviewPercentScope, userStatus });
  if (overviewPercentScope && req.user.role !== 'admin') {
    // Ở Tổng quan, cửa hàng được xem thứ hạng toàn hệ thống theo %, nhưng không trả số tiền doanh thu/target.
    result.leaderboard = result.leaderboard.map(r => ({ ...r, revenue: 0, target: 0 }));
  }
  res.json(result);
});

app.get('/api/sales/store-summary', requireAuth, (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? String(req.query.month) : dateOnly(new Date()).slice(0, 7);
  const storeId = canSelectAssignedStore(req.user) ? Number(req.query.store_id || getPrimaryStoreId(req.user) || db.stores[0]?.id) : Number(getPrimaryStoreId(req.user));
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
    const row = dayMap.get(d) || { sale_date: d, revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, customer_new_count: 0, customer_old_count: 0, upt: 0, atv: 0, asp: 0, cumulative_revenue: 0, achievement_percent: 0 };
    row.revenue += Number(r.revenue || 0);
    row.bill_count += Number(r.bill_count || 0);
    row.item_count += Number(r.item_count || 0);
    dayMap.set(d, row);
  });
  (db.sales_store_days || [])
    .filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.sale_date) >= start && dateVal(x.sale_date) < end)
    .forEach(x => {
      const d = dateVal(x.sale_date);
      const row = dayMap.get(d) || { sale_date: d, revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, customer_new_count: 0, customer_old_count: 0, upt: 0, atv: 0, asp: 0, cr: 0, cumulative_revenue: 0, achievement_percent: 0 };
      const counts = customerCountsFromRow(x);
      row.customer_new_count = counts.customer_new_count;
      row.customer_old_count = counts.customer_old_count;
      row.customer_count = counts.customer_count;
      row.note = x.note || '';
      dayMap.set(d, row);
    });
  (db.sales_daily_targets || [])
    .filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.target_date) >= start && dateVal(x.target_date) < end)
    .forEach(x => {
      const d = dateVal(x.target_date);
      const row = dayMap.get(d) || { sale_date: d, revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, customer_new_count: 0, customer_old_count: 0, upt: 0, atv: 0, asp: 0, cr: 0, cumulative_revenue: 0, achievement_percent: 0 };
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
    acc.customer_new_count += Number(r.customer_new_count || 0);
    acc.customer_old_count += Number(r.customer_old_count || 0);
    acc.daily_target += Number(r.daily_target || 0);
    return acc;
  }, { revenue: 0, bill_count: 0, item_count: 0, customer_count: 0, customer_new_count: 0, customer_old_count: 0, daily_target: 0 });
  totals.upt = totals.bill_count ? Math.round((totals.item_count / totals.bill_count) * 100) / 100 : 0;
  totals.atv = totals.bill_count ? Math.round(totals.revenue / totals.bill_count) : 0;
  totals.asp = totals.item_count ? Math.round(totals.revenue / totals.item_count) : 0;
  totals.cr = totals.customer_count ? Math.round((totals.bill_count / totals.customer_count) * 10000) / 100 : 0;
  totals.target_upt = targetMetrics.target_upt;
  totals.target_atv = targetMetrics.target_atv;
  totals.target_cr = targetMetrics.target_cr;
  totals.achievement_percent = target ? Math.round((totals.revenue / target) * 10000) / 100 : 0;
  totals.daily_achievement_percent = totals.daily_target ? Math.round((totals.revenue / totals.daily_target) * 10000) / 100 : 0;
  Object.assign(totals, periodPaceMetrics(start, end, target, totals.revenue, [
    ...salesRows.map(r => r.sale_date),
    ...(db.sales_store_days || [])
      .filter(x => Number(x.store_id) === Number(storeId) && dateVal(x.sale_date) >= start && dateVal(x.sale_date) < end)
      .map(x => x.sale_date)
  ]));
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
  const storeId = isAllStoreRole(user) ? Number(rawStoreId || getPrimaryStoreId(user) || db.stores[0]?.id) : Number(getPrimaryStoreId(user));
  const store = getStore(storeId);
  if (!store) throw new Error('Cửa hàng không hợp lệ');
  if (user.role !== 'admin' && !userHasStore(user, storeId)) throw new Error('Không có quyền xem báo cáo ngày cửa hàng này');
  const report = dailyReportRow(storeId, reportDate) || null;
  const salesRows = (db.sales || []).filter(sa => Number(sa.store_id) === Number(storeId) && dateVal(sa.sale_date) === reportDate);
  const storeDay = (db.sales_store_days || []).find(x => Number(x.store_id) === Number(storeId) && dateVal(x.sale_date) === reportDate) || null;
  const staff = salesStaffForStore(storeId, { status: 'all', start: reportDate, end: addDaysUtc(reportDate, 1) });
  const sales_entries = staff.map(u => {
    const r = salesRows.find(x => Number(x.user_id) === Number(u.id));
    return { user_id: u.id, full_name: u.full_name, store_name: store.name, revenue: r ? Number(r.revenue || 0) : 0, bill_count: r ? Number(r.bill_count || 0) : 0, item_count: r ? Number(r.item_count || 0) : 0, note: r ? (r.note || '') : '' };
  });
  const customerMetrics = storeDay ? customerCountsFromRow(storeDay) : { customer_new_count: 0, customer_old_count: 0, customer_count: 0 };
  const customerCount = customerMetrics.customer_count;
  const targetDay = storeDailyTarget(storeId, reportDate);
  const storeTotal = sales_entries.reduce((acc, r) => {
    acc.revenue += Number(r.revenue || 0);
    acc.bill_count += Number(r.bill_count || 0);
    acc.item_count += Number(r.item_count || 0);
    return acc;
  }, { revenue: 0, bill_count: 0, item_count: 0 });
  storeTotal.customer_count = customerCount;
  storeTotal.customer_new_count = customerMetrics.customer_new_count;
  storeTotal.customer_old_count = customerMetrics.customer_old_count;
  storeTotal.target_revenue = Number(targetDay.target_revenue || 0);
  storeTotal.achievement_percent = storeTotal.target_revenue ? Math.round((storeTotal.revenue / storeTotal.target_revenue) * 10000) / 100 : 0;
  storeTotal.upt = storeTotal.bill_count ? Math.round((storeTotal.item_count / storeTotal.bill_count) * 100) / 100 : 0;
  storeTotal.atv = storeTotal.bill_count ? Math.round(storeTotal.revenue / storeTotal.bill_count) : 0;
  storeTotal.asp = storeTotal.item_count ? Math.round(storeTotal.revenue / storeTotal.item_count) : 0;
  storeTotal.cr = customerCount ? Math.round((storeTotal.bill_count / customerCount) * 10000) / 100 : 0;
  storeTotal.target_note = targetDay.note || '';
  const legacyStoreNote = report ? String(report.store_note || '').trim() : (storeDay ? String(storeDay.note || '').trim() : '');
  const morningSituation = report && report.store_situation_morning !== undefined ? String(report.store_situation_morning || '').trim() : (!report && legacyStoreNote ? legacyStoreNote : '');
  const eveningSituation = report && report.store_situation_evening !== undefined ? String(report.store_situation_evening || '').trim() : '';
  const hasShiftCustomers = !!(report && ['customer_new_morning','customer_old_morning','customer_new_afternoon','customer_old_afternoon'].some(k => report[k] !== undefined));
  const customerNewMorning = hasShiftCustomers ? toNumber(report.customer_new_morning, 0) : customerMetrics.customer_new_count;
  const customerOldMorning = hasShiftCustomers ? toNumber(report.customer_old_morning, 0) : customerMetrics.customer_old_count;
  const customerNewAfternoon = hasShiftCustomers ? toNumber(report.customer_new_afternoon, 0) : 0;
  const customerOldAfternoon = hasShiftCustomers ? toNumber(report.customer_old_afternoon, 0) : 0;
  return {
    store_id: storeId,
    store_name: store.name,
    report_date: reportDate,
    customer_count: customerCount,
    customer_new_count: customerMetrics.customer_new_count,
    customer_old_count: customerMetrics.customer_old_count,
    customer_new_morning: customerNewMorning,
    customer_old_morning: customerOldMorning,
    customer_new_afternoon: customerNewAfternoon,
    customer_old_afternoon: customerOldAfternoon,
    store_note: legacyStoreNote,
    store_situation_morning: morningSituation,
    store_situation_evening: eveningSituation,
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
  const customerNew = Number(payload.customer_new_count || 0);
  const customerOld = Number(payload.customer_old_count || 0);
  const customerTotal = (customerNew || customerOld) ? customerNew + customerOld : Number(payload.customer_count || 0);
  const newMorning = Number(payload.customer_new_morning || 0);
  const oldMorning = Number(payload.customer_old_morning || 0);
  const newAfternoon = Number(payload.customer_new_afternoon || 0);
  const oldAfternoon = Number(payload.customer_old_afternoon || 0);
  lines.push(`Khách ca sáng: Mới ${fmt(newMorning)} | Cũ ${fmt(oldMorning)}`);
  lines.push(`Khách ca chiều: Mới ${fmt(newAfternoon)} | Cũ ${fmt(oldAfternoon)}`);
  lines.push(`Tổng: ${fmt(total.revenue)}đ | Bill ${fmt(total.bill_count)} | Món ${fmt(total.item_count)} | Khách mới ${fmt(customerNew)} | Khách cũ ${fmt(customerOld)} | Lượt khách tổng ${fmt(customerTotal)}`);
  lines.push(`UPT: ${total.bill_count ? Math.round((total.item_count / total.bill_count) * 100) / 100 : 0} | ATV: ${total.bill_count ? fmt(Math.round(total.revenue / total.bill_count)) + 'đ' : '0đ'} | ASP: ${total.item_count ? fmt(Math.round(total.revenue / total.item_count)) + 'đ' : '0đ'} | CR: ${customerTotal ? Math.round((total.bill_count / customerTotal) * 10000) / 100 : 0}%`);
  if (payload.store_situation_morning || payload.store_situation_evening || payload.store_note) {
    lines.push('Tình hình cửa hàng:');
    if (payload.store_situation_morning) lines.push(`- Ca sáng: ${payload.store_situation_morning}`);
    if (payload.store_situation_evening) lines.push(`- Ca tối: ${payload.store_situation_evening}`);
    if (!payload.store_situation_morning && !payload.store_situation_evening && payload.store_note) lines.push(`- ${payload.store_note}`);
  }
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
  const { store_id, report_date, customer_count, customer_new_count, customer_old_count, customer_new_morning, customer_old_morning, customer_new_afternoon, customer_old_afternoon, store_note, store_situation_morning, store_situation_evening, sales_entries, missing_size_items, product_feedback_items } = req.body || {};
  const storeId = isAllStoreRole(req.user) ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
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
  const morningSituation = String(store_situation_morning || '').trim();
  const eveningSituation = String(store_situation_evening || '').trim();
  const combinedStoreNote = String(store_note || [morningSituation ? `Ca sáng: ${morningSituation}` : '', eveningSituation ? `Ca tối: ${eveningSituation}` : ''].filter(Boolean).join('\n')).trim();
  const shiftNewMorning = Math.max(0, toNumber(customer_new_morning, 0));
  const shiftOldMorning = Math.max(0, toNumber(customer_old_morning, 0));
  const shiftNewAfternoon = Math.max(0, toNumber(customer_new_afternoon, 0));
  const shiftOldAfternoon = Math.max(0, toNumber(customer_old_afternoon, 0));
  const hasShiftCustomerInput = [customer_new_morning, customer_old_morning, customer_new_afternoon, customer_old_afternoon].some(v => v !== undefined && v !== null && v !== '');
  const dailyCustomerCounts = hasShiftCustomerInput
    ? customerCountsFromInput(shiftNewMorning + shiftOldMorning + shiftNewAfternoon + shiftOldAfternoon, shiftNewMorning + shiftNewAfternoon, shiftOldMorning + shiftOldAfternoon)
    : customerCountsFromInput(customer_count, customer_new_count, customer_old_count);
  upsertStoreSalesDay(storeId, d, dailyCustomerCounts.customer_count, combinedStoreNote, req.user.id, dailyCustomerCounts.customer_new_count, dailyCustomerCounts.customer_old_count);

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

  const summaryPayload = { report_date: d, store_name: store.name, customer_count: dailyCustomerCounts.customer_count, customer_new_count: dailyCustomerCounts.customer_new_count, customer_old_count: dailyCustomerCounts.customer_old_count, customer_new_morning: shiftNewMorning, customer_old_morning: shiftOldMorning, customer_new_afternoon: shiftNewAfternoon, customer_old_afternoon: shiftOldAfternoon, store_note: combinedStoreNote, store_situation_morning: morningSituation, store_situation_evening: eveningSituation, sales_entries: cleanSales, missing_size_items: missingItems, product_feedback_items: feedbackItems };
  row.customer_new_count = dailyCustomerCounts.customer_new_count;
  row.customer_old_count = dailyCustomerCounts.customer_old_count;
  row.customer_count = dailyCustomerCounts.customer_count;
  row.customer_new_morning = shiftNewMorning;
  row.customer_old_morning = shiftOldMorning;
  row.customer_new_afternoon = shiftNewAfternoon;
  row.customer_old_afternoon = shiftOldAfternoon;
  row.store_note = combinedStoreNote;
  row.store_situation_morning = morningSituation;
  row.store_situation_evening = eveningSituation;
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
    res.json(buildWeeklyReport(req.user, req.query.week_start, req.query.store_id, req.query.user_status));
  } catch (err) {
    res.status(403).json({ error: err.message || 'Không lấy được báo cáo tuần' });
  }
});

app.post('/api/weekly-report', requireAuth, (req, res) => {
  const { store_id, week_start, feedback, issues, action_plan, note, top_products, promotions } = req.body || {};
  const storeId = isAllStoreRole(req.user) ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
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

app.get('/api/weekly-report/export.xlsx', requireAuth, requirePerm('can_export'), (req, res) => {
  try {
    const data = buildWeeklyReport(req.user, req.query.week_start, req.query.store_id, req.query.user_status);
    const rows = [];
    rows.push({ phan: 'Tong cua hang', cua_hang: data.store_name, tu_ngay: data.week_start, den_ngay: data.week_end, doanh_thu: data.totals.revenue, target_tuan: data.totals.target_revenue, phan_tram_dat: data.totals.achievement_percent, bill: data.totals.bill_count, so_mon: data.totals.item_count, khach_moi: data.totals.customer_new_count, khach_cu: data.totals.customer_old_count, luot_khach_tong: data.totals.customer_count, upt: data.totals.upt, atv: data.totals.atv, asp: data.totals.asp, cr: data.totals.cr, feedback: data.feedback.feedback || '', van_de: data.feedback.issues || '', hanh_dong_tuan_toi: data.feedback.action_plan || '', feedback_san_pham: data.feedback.note || '' });
    data.days.forEach(d => rows.push({ phan: 'Theo ngay', cua_hang: data.store_name, ngay: d.sale_date, doanh_thu: d.revenue, target_ngay: d.target_revenue, phan_tram_dat: d.achievement_percent, bill: d.bill_count, so_mon: d.item_count, khach_moi: d.customer_new_count, khach_cu: d.customer_old_count, luot_khach_tong: d.customer_count, upt: d.upt, atv: d.atv, asp: d.asp, cr: d.cr, ghi_chu: d.note || '' }));
    data.employees.forEach(e => rows.push({ phan: 'Ca nhan', cua_hang: data.store_name, nhan_vien: e.full_name, trang_thai_nhan_su: e.user_status === 'active' ? 'Dang lam' : 'Da nghi/ngung hoat dong', doanh_thu: e.revenue, target_tuan_uoc_tinh: e.target, phan_tram_dat: e.achievement_percent, ty_trong_dt: e.revenue_percent, bill: e.bill_count, so_mon: e.item_count, upt: e.upt, atv: e.atv, asp: e.asp }));
    (data.top_products || []).forEach((p, idx) => rows.push({ phan: 'Top san pham ban chay', top: idx + 1, cua_hang: data.store_name, san_pham: p.name, so_mon: p.quantity || 0, feedback_san_pham: p.note || '' }));
    (data.promotions || []).forEach(p => rows.push({ phan: 'CTKM', cua_hang: data.store_name, ten_ctkm: p.name, so_bill_tham_gia: p.bill_count || 0, ghi_chu: p.note || '' }));
    const buffer = toExcelBuffer(rows, 'Bao cao tuan');
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`bao-cao-tuan-${data.store_name}-${data.week_start}.xlsx`);
    res.send(buffer);
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
  const storeId = isAllStoreRole(req.user) ? Number(req.query.store_id || getPrimaryStoreId(req.user) || db.stores[0]?.id) : Number(getPrimaryStoreId(req.user));
  const store = getStore(storeId);
  if (!store) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canViewSchedule(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem lịch làm việc' });
  const week_start = scheduleWeekStart(req.query.week_start || new Date());
  const dates = scheduleWeekDates(week_start);
  let employees = db.users.filter(u => u.status === 'active' && Number(u.store_id) === Number(storeId) && u.role !== 'admin');
  employees = employees.sort((a, b) => a.role.localeCompare(b.role) || a.full_name.localeCompare(b.full_name, 'vi')).map(publicUser);
  res.json({ store_id: store.id, store_name: store.name, week_start, dates, shifts: activeShifts(), employees, schedules: scheduleRowsForUser(req.user, storeId, dates), can_manage: canManageSchedule(req.user, storeId) });
});

app.post('/api/schedules/bulk', requireAuth, requirePerm('can_manage_schedule'), (req, res) => {
  const { store_id, week_start, entries } = req.body || {};
  const storeId = isAllStoreRole(req.user) ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
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
  const shiftSync = syncFutureShiftTasksForSchedule(storeId, dates, req.user.id);
  saveDb();
  res.json({ ok: true, count, shift_sync: shiftSync });
});


app.get('/api/orders', requireAuth, (req, res) => {
  const storeId = isAllStoreRole(req.user) ? (req.query.store_id ? Number(req.query.store_id) : null) : (getPrimaryStoreId(req.user) ? Number(getPrimaryStoreId(req.user)) : (req.query.store_id ? Number(req.query.store_id) : null));
  if (storeId && !canViewOrderScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem order cửa hàng này' });
  res.json({ orders: orderRowsForUser(req.user, storeId) });
});

app.post('/api/orders', requireAuth, requirePerm('can_manage_orders'), (req, res) => {
  const { store_id, order_date, batch_name, items } = req.body || {};
  const requestedStoreId = Number(store_id || 0);
  const storeId = isAllStoreRole(req.user) ? (requestedStoreId || Number(getPrimaryStoreId(req.user) || 0)) : (requestedStoreId || Number(getPrimaryStoreId(req.user) || 0));
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
  const storeId = isAllStoreRole(req.user) ? (req.query.store_id ? Number(req.query.store_id) : null) : Number(getPrimaryStoreId(req.user) || 0);
  if (storeId && !canViewOnlineOrderScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem đơn online cửa hàng này' });
  const rows = onlineOrderRowsForUser(req.user, storeId, month);
  res.json({ month, orders: rows, summary: onlineOrderSummary(rows) });
});

app.post('/api/online-orders', requireAuth, requirePerm('can_manage_online_orders'), (req, res) => {
  const { store_id, order_date, invoice_no, order_value, packer_id, note } = req.body || {};
  const requestedStoreId = Number(store_id || 0);
  const storeId = requestedStoreId || Number(getPrimaryStoreId(req.user) || 0);
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
  const { title, category, store_id, description, version, external_url } = req.body || {};
  const link = normalizeExternalUrl(external_url);
  if (!req.file && !link) return res.status(400).json({ error: 'Chưa chọn file hoặc dán link Google Drive/tài liệu' });
  if (external_url && !link) return res.status(400).json({ error: 'Link tài liệu chưa đúng. Link cần bắt đầu bằng http:// hoặc https://' });
  if (!title) return res.status(400).json({ error: 'Chưa nhập tên tài liệu' });
  const storeId = store_id ? Number(store_id) : null;
  if (storeId && !getStore(storeId)) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canManageDocumentScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền tải tài liệu cho phạm vi này' });
  const stored_name = req.file ? saveDocumentFile(req.file) : null;
  const id = nextId('documents');
  db.documents = db.documents || [];
  db.documents.push({
    id,
    title: String(title).trim(),
    category: category || 'Quy trình',
    store_id: storeId,
    description: description || '',
    version: version || '',
    original_name: req.file ? (req.file.originalname || '') : (link ? 'Google Drive / Link' : ''),
    stored_name,
    external_url: link || '',
    storage_type: link && !req.file ? 'link' : 'file',
    mime_type: req.file ? (req.file.mimetype || '') : 'link',
    size: req.file ? Number(req.file.size || 0) : 0,
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
  if (doc.external_url) {
    doc.download_count = Number(doc.download_count || 0) + 1;
    doc.last_downloaded_at = nowIso();
    saveDb();
    return res.json({ external_url: doc.external_url });
  }
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
  syncTrainingProductCollections(req.user.id);
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
  const storeId = isAllStoreRole(req.user) ? Number(store_id || getPrimaryStoreId(req.user)) : Number(getPrimaryStoreId(req.user));
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

app.post('/api/product-trainings/resolve-image', requireAuth, requirePerm('can_manage_product_training'), async (req, res) => {
  const productUrl = normalizeExternalUrl(req.body && req.body.product_url);
  if (!productUrl) return res.status(400).json({ error: 'Link sản phẩm không hợp lệ' });
  const imageUrl = await resolveProductImageUrl(productUrl);
  res.json({ ok: true, image_url: imageUrl || '', product_url: productUrl });
});

app.post('/api/product-trainings/image', requireAuth, requirePerm('can_manage_product_training'), upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Chưa có ảnh sản phẩm để upload' });
  if (!/^image\//i.test(req.file.mimetype || '')) {
    try { fs.unlinkSync(req.file.path); } catch (_err) {}
    return res.status(400).json({ error: 'File ảnh không hợp lệ' });
  }
  const imageUrl = saveUploadedFile(req.file);
  res.json({ ok: true, image_url: imageUrl });
});

app.get('/api/product-trainings', requireAuth, (req, res) => {
  const storeId = req.query.store_id ? Number(req.query.store_id) : null;
  if (storeId && !canViewProductTrainingScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền xem đào tạo sản phẩm cửa hàng này' });
  res.json({ trainings: productTrainingRowsForUser(req.user, storeId) });
});

app.post('/api/product-trainings/:id/learned', requireAuth, (req, res) => {
  const row = (db.product_trainings || []).find(r => Number(r.id) === Number(req.params.id) && r.status !== 'deleted');
  if (!row) return res.status(404).json({ error: 'Không tìm thấy bài đào tạo' });
  if (!canViewProductTrainingScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền xem bài đào tạo này' });
  markTrainingLearned(row, req.user);
  saveDb();
  res.json({ ok: true, progress: trainingProgress(row.id, req.user.id, row.pass_percent || 90) });
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
  if (!trainingLearnRecord(row.id, req.user.id)) return res.status(400).json({ error: 'Cần bấm “Tôi đã học xong” trước khi làm bài test' });
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
  const { store_id, sku, product_name } = req.body || {};
  const storeId = store_id ? Number(store_id) : null;
  if (storeId && !getStore(storeId)) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  if (!canManageProductTrainingScope(req.user, storeId)) return res.status(403).json({ error: 'Không có quyền nhập đào tạo sản phẩm phạm vi này' });
  if (!sku && !product_name) return res.status(400).json({ error: 'Cần nhập SKU hoặc tên sản phẩm' });
  db.product_trainings = db.product_trainings || [];
  const existing = findExistingProductTraining(storeId, sku, product_name);
  if (existing) {
    trainingApplyPayload(existing, { ...req.body, store_id: storeId }, req.user.id, false);
    saveDb();
    syncTrainingProductCollections(req.user.id);
    return res.json({ ok: true, id: existing.id, updated_existing: true });
  }
  const id = nextId('product_trainings');
  const row = { id, store_id: storeId };
  trainingApplyPayload(row, { ...req.body, store_id: storeId }, req.user.id, true);
  db.product_trainings.push(row);
  saveDb();
  syncTrainingProductCollections(req.user.id);
  res.json({ ok: true, id });
});

app.patch('/api/product-trainings/:id', requireAuth, requirePerm('can_manage_product_training'), (req, res) => {
  const row = (db.product_trainings || []).find(r => Number(r.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy bài đào tạo sản phẩm' });
  if (!canManageProductTrainingScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền sửa bài đào tạo này' });
  const nextStoreId = req.body && req.body.store_id !== undefined ? (req.body.store_id ? Number(req.body.store_id) : null) : row.store_id;
  if (nextStoreId && !canManageProductTrainingScope(req.user, nextStoreId)) return res.status(403).json({ error: 'Không có quyền chuyển phạm vi bài đào tạo này' });
  const duplicate = findExistingProductTraining(nextStoreId, req.body?.sku !== undefined ? req.body.sku : row.sku, req.body?.product_name !== undefined ? req.body.product_name : row.product_name, row.id);
  if (duplicate) return res.status(400).json({ error: 'Đã có bài đào tạo cho SKU/Mã cha này, không tạo trùng bài test' });
  trainingApplyPayload(row, req.body || {}, req.user.id, false);
  saveDb();
  syncTrainingProductCollections(req.user.id);
  res.json({ ok: true });
});

app.post('/api/product-trainings/delete-all', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ Admin được xóa tất cả bài học' });
  const requestedStoreId = req.body?.store_id ? Number(req.body.store_id) : null;
  if (requestedStoreId && !getStore(requestedStoreId)) return res.status(400).json({ error: 'Cửa hàng không hợp lệ' });
  const rows = (db.product_trainings || []).filter(r => r.status !== 'deleted' && (!requestedStoreId || Number(r.store_id) === requestedStoreId));
  const deletedAt = nowIso();
  rows.forEach(row => {
    row.status = 'deleted';
    row.deleted_at = deletedAt;
    row.deleted_by = req.user.id;
  });
  if (rows.length) {
    saveDb();
    syncTrainingProductCollections(req.user.id);
  }
  res.json({ ok: true, deleted_count: rows.length, store_id: requestedStoreId });
});

app.delete('/api/product-trainings/:id', requireAuth, requirePerm('can_manage_product_training'), (req, res) => {
  const row = (db.product_trainings || []).find(r => Number(r.id) === Number(req.params.id));
  if (!row || row.status === 'deleted') return res.status(404).json({ error: 'Không tìm thấy bài đào tạo sản phẩm' });
  if (!canManageProductTrainingScope(req.user, row.store_id)) return res.status(403).json({ error: 'Không có quyền xóa bài đào tạo này' });
  row.status = 'deleted';
  row.deleted_at = nowIso();
  row.deleted_by = req.user.id;
  saveDb();
  syncTrainingProductCollections(req.user.id);
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
  const now = new Date();
  const year = Math.max(2000, Math.min(2100, Number(req.query.year) || now.getFullYear()));
  const month = Math.max(1, Math.min(12, Number(req.query.month) || (now.getMonth() + 1)));
  const { start, end } = periodRange('month', new Date(Date.UTC(year, month - 1, 1)));
  const performance = computePerformance(req.user, year, month).sort((a, b) => b.final_score - a.final_score);
  res.json({ performance, storeSummary: storeSummaryRows(req.user, start, end), year, month });
});

app.get('/api/export/:type.xlsx', requireAuth, requirePerm('can_export'), (req, res) => {
  const type = req.params.type;
  let rows = [];
  if (type === 'tasks') {
    rows = taskRowsForUser(req.user).map(r => ({ task_id: r.id, title: r.title, priority: r.priority, due_at: r.due_at, store_name: r.store_name, assignee_name: r.assignee_name, completed_at: r.completed_at, evidence_path: r.evidence_path, evidence_note: r.evidence_note, points_delta: r.points_delta, status: r.status }));
  } else if (type === 'violations') {
    rows = violationRowsForUser(req.user);
  } else if (type === 'assessments') {
    rows = assessmentRowsForUser(req.user);
  } else if (type === 'sales') {
    rows = db.sales.map(sa => { const sd = (db.sales_store_days || []).find(x => Number(x.store_id) === Number(sa.store_id) && String(x.sale_date) === String(sa.sale_date)); const cc = customerCountsFromRow(sd || {}); return { id: sa.id, sale_date: sa.sale_date, store_id: sa.store_id, employee_name: getUser(sa.user_id)?.full_name || '', store_name: getStore(sa.store_id)?.name || '', revenue: Number(sa.revenue || 0), bill_count: Number(sa.bill_count || 0), item_count: Number(sa.item_count || 0), khach_moi: cc.customer_new_count, khach_cu: cc.customer_old_count, luot_khach_tong: cc.customer_count, upt: Number(sa.bill_count || 0) ? Math.round((Number(sa.item_count || 0) / Number(sa.bill_count || 0)) * 100) / 100 : 0, atv: Number(sa.bill_count || 0) ? Math.round(Number(sa.revenue || 0) / Number(sa.bill_count || 0)) : 0, note: sa.note || '', created_at: sa.created_at || '', updated_at: sa.updated_at || '' }; });
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
    rows = productTrainingRowsForUser(req.user).map(r => ({ id: r.id, pham_vi: r.store_name || '', bat_buoc_hoc: Number(r.is_required || 0) ? 'Có' : 'Không', han_hoc: r.due_at || '', ty_le_dat: Number(r.pass_percent || 90), so_cau_hoi: Number(r.quiz_question_count || 0), sku: r.sku || '', ten_sp: r.product_name || '', mau_hien_co: r.color_options || '', anh_san_pham: r.image_url || '', link_san_pham: r.product_url || '', ngay_hang_ve: r.arrival_date || '', chat_lieu: r.material || '', kieu_dang_form: r.style_info || '', diem_ban_hang: r.selling_points || '', huong_dan_bao_quan_tu_van: r.care_instruction || '', loi_can_luu_y: r.common_errors || '', ghi_chu_dao_tao: r.training_note || '', trang_thai: r.status_label || '', nguoi_nhap: r.created_by_name || '', ngay_cap_nhat: r.updated_at || r.created_at || '' }));
  } else if (type === 'product_training_attempts') {
    rows = (db.product_training_attempts || []).filter(a => a.status !== 'deleted').map(a => { const t = (db.product_trainings || []).find(x => Number(x.id) === Number(a.training_id)); const u = getUser(a.user_id); return { id: a.id, bai_dao_tao: t ? `${t.sku || ''} ${t.product_name || ''}`.trim() : '', cua_hang: getStore(a.store_id)?.name || getStore(u?.store_id)?.name || '', nhan_vien: u?.full_name || '', diem: Number(a.score_percent || 0), dung: Number(a.correct_count || 0), tong_cau: Number(a.total_questions || 0), ket_qua: Number(a.passed || 0) ? 'Đạt' : 'Chưa đạt', ngay_lam_bai: a.created_at || '' }; });
  } else if (type === 'cdp_ojti') {
    rows = [];
    cdpOjtiRowsForUser(req.user).forEach(r => {
      const linked = r.linked_task_ids || {};
      if (Number(r.catalog_mode || 0) === 1 && Array.isArray(r.item_values) && r.item_values.length) {
        r.item_values.forEach(v => {
          const item = findCdpCatalogItem(r.position_key, r.type, v.code) || {};
          const hasData = v.score || v.note || v.training_start || v.training_end || v.task_remark;
          if (!hasData) return;
          rows.push({
            id: r.id,
            loai: r.type === 'ojti' ? 'OJTI' : 'CDP',
            cua_hang: r.store_name || '',
            vi_tri: r.position_label || '',
            nhan_su: r.trainee_names || '',
            nguoi_dao_tao: r.trainer_name || '',
            ma_tieu_chi: v.code || '',
            nhom: item.section_title || item.group || '',
            nang_luc: item.competency || '',
            tieu_chi: item.criteria || '',
            diem: v.score || '',
            ngay_training: v.training_end || v.training_start || '',
            remark_cong_viec_hang_ngay: v.task_remark || '',
            ngay_hoan_thanh_cong_viec: v.task_completed_at || '',
            link_cong_viec: linked[v.code] || '',
            ghi_chu_training: v.note || '',
            trang_thai: r.status_label || '',
            ghi_chu_chung: r.note || '',
            nguoi_nhap: r.created_by_name || '',
            ngay_cap_nhat: r.updated_at || r.created_at || ''
          });
        });
      } else {
        rows.push({ id: r.id, loai: r.type === 'ojti' ? 'OJTI' : 'CDP', cua_hang: r.store_name || '', vi_tri: r.position_label || '', nhan_su: r.trainee_names || '', nguoi_dao_tao: r.trainer_name || '', ngay_ke_hoach: r.plan_date || '', gio_han: r.due_time || '', tieu_de: r.title || '', muc_tieu: r.objective || '', noi_dung: r.content || '', ket_qua: r.result || '', trang_thai: r.status_label || '', link_cong_viec: r.linked_task_id || '', ghi_chu: r.note || '', nguoi_nhap: r.created_by_name || '', ngay_cap_nhat: r.updated_at || r.created_at || '' });
      }
    });
  } else if (type === 'documents') {
    rows = documentRowsForUser(req.user).map(d => ({ id: d.id, title: d.title, category: d.category, store_name: d.store_name, version: d.version || '', storage_type: d.storage_type || (d.external_url ? 'link' : 'file'), original_name: d.original_name || '', external_url: d.external_url || '', created_by_name: d.created_by_name || '', created_at: d.created_at || '', download_count: Number(d.download_count || 0), description: d.description || '' }));
  } else if (type === 'bonuses') {
    rows = bonusRowsForUser(req.user);
  } else if (type === 'performance') {
    rows = computePerformance(req.user);
  } else {
    return res.status(404).json({ error: 'Loại xuất dữ liệu không hợp lệ' });
  }
  const buffer = toExcelBuffer(rows, type);
  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment(`${type}-${dateOnly(new Date())}.xlsx`);
  res.send(buffer);
});


// V4.57.3 - Luôn trả lỗi API dạng JSON, tránh hiện nguyên trang HTML Internal Server Error trên giao diện.
app.use((err, req, res, _next) => {
  const rawMessage = err && err.message ? String(err.message) : '';
  console.error('[DEZUS_API_ERROR]', req.method, req.originalUrl, err && (err.stack || err.message || err));
  let status = Number(err && (err.status || err.statusCode)) || 500;
  let message = rawMessage || 'Lỗi server, vui lòng thử lại.';
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      message = 'File quá nặng. Vui lòng chọn file dưới 12MB hoặc tải file lên Google Drive rồi dán link vào ô Link Drive.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      status = 400;
      message = 'Trường upload file không hợp lệ. Vui lòng tải lại trang và thử lại.';
    } else {
      status = 400;
      message = 'Lỗi upload file: ' + (rawMessage || err.code || 'không xác định');
    }
  } else if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    status = 413;
    message = 'Nội dung gửi lên quá lớn. Vui lòng giảm dung lượng file/nội dung rồi thử lại.';
  }
  if (status >= 500 && /ENOENT|EACCES|permission|rename|copyfile|mkdir/i.test(rawMessage)) {
    message = 'Lỗi lưu dữ liệu/file trên server. Kiểm tra lại Disk/Storage trên Render hoặc báo PKD.';
  }
  res.status(status).json({ error: message });
});

app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('==========================================');
  console.log('DEZUS STORE OPS WEB IS RUNNING');
  console.log(`Open: http://localhost:${PORT}`);
  console.log('Default login: admin / 123456');
  console.log('Data file: data/store_ops.json');
  console.log('==========================================');
});
