const $ = (sel, root = document) => root ? root.querySelector(sel) : null;
const $$ = (sel, root = document) => root ? Array.from(root.querySelectorAll(sel)) : [];

const state = {
  token: localStorage.getItem('dezus_ops_token') || '',
  user: null,
  boot: { stores: [], users: [] },
  templates: [],
  route: localStorage.getItem('dezus_ops_route') || 'dashboard',
  checklistType: 'OPS',
  leaderboardPeriod: 'month',
  salesMonth: new Date().toISOString().slice(0, 7),
  salesStoreId: '',
  salesUserStatus: localStorage.getItem('dezus_ops_sales_user_status') || 'active',
  scheduleDate: isoDateLocal(new Date()),
  scheduleMonth: currentMonthLocal(),
  scheduleStoreId: '',
  orderStoreId: '',
  feedbackStoreId: '',
  feedbackMonth: new Date().toISOString().slice(0, 7),
  feedbackCollectionId: '',
  trainingStoreId: '',
  trainingQuiz: null,
  trainingCombinedQuiz: null,
  trainingStudyReady: {},
  cdpOjtiType: 'cdp',
  cdpOjtiPosition: 'all',
  cdpOjtiStoreId: '',
  cdpOjtiEditId: null,
  weeklyWeekStart: mondayOf(isoDateLocal(new Date())),
  weeklyStoreId: '',
  weeklyUserStatus: localStorage.getItem('dezus_ops_weekly_user_status') || 'active',
  weeklyEditMode: false,
  dailyReportDate: isoDateLocal(new Date()),
  dailyReportStoreId: '',
  onlineOrderStoreId: '',
  onlineOrderMonth: new Date().toISOString().slice(0, 7),
  scheduleEditMode: false,
  navOpenGroup: localStorage.getItem('dezus_ops_nav_group') || 'overview',
  adminEditUserId: null,
};

const app = $('#app');

const VIOLATION_LEVELS = {
  REMINDER: { label: 'Nhắc nhở', points: 1 },
  M1: { label: 'Ký WN / M1', points: 3 },
  M2: { label: 'M2 - Khiển trách bằng văn bản', points: 5 },
  M3: { label: 'M3 - Ảnh hưởng KPI / thưởng', points: 10 },
  M4: { label: 'M4 - Xử lý nghiêm trọng', points: 20 },
};

const VIOLATION_CATALOG = [
  { code:'DV01', group:'Dịch vụ & tác phong', name:'Không đảm bảo grooming/đồng phục theo quy định', level:'REMINDER' },
  { code:'DV02', group:'Dịch vụ & tác phong', name:'Sử dụng điện thoại cá nhân trên sàn bán hàng', level:'M1' },
  { code:'DV03', group:'Dịch vụ & tác phong', name:'Đi muộn, về sớm hoặc tự ý đổi ca', level:'M1' },
  { code:'DV04', group:'Dịch vụ & tác phong', name:'Bỏ vị trí, ngồi khuất hoặc ngủ trong ca', level:'M2' },
  { code:'DV05', group:'Dịch vụ & tác phong', name:'Không tiếp cận, hỗ trợ khách kịp thời', level:'M1' },
  { code:'DV06', group:'Dịch vụ & tác phong', name:'Thái độ không phù hợp, gây phản hồi xấu về dịch vụ', level:'M2' },
  { code:'DV07', group:'Dịch vụ & tác phong', name:'Không tuân thủ điều phối hoặc phân công trong ca', level:'M1' },
  { code:'TN01', group:'Thu ngân & hóa đơn', name:'Không xuất hóa đơn cho khách', level:'M2' },
  { code:'TN02', group:'Thu ngân & hóa đơn', name:'Gộp/tách hóa đơn hoặc chia turn sai thực tế', level:'M2' },
  { code:'TN03', group:'Thu ngân & hóa đơn', name:'Hủy đơn hoặc sửa hóa đơn khi chưa được PKD duyệt', level:'M2' },
  { code:'TN04', group:'Thu ngân & hóa đơn', name:'Trừ điểm thành viên hoặc áp dụng giảm giá sai quy định', level:'M2' },
  { code:'TN05', group:'Thu ngân & hóa đơn', name:'Nhận thanh toán qua tài khoản/thẻ cá nhân', level:'M4' },
  { code:'HH01', group:'Hàng hóa & kho', name:'Tự ý xuất/nhập/điều chỉnh phiếu hàng hóa', level:'M2' },
  { code:'HH02', group:'Hàng hóa & kho', name:'Sai lệch phiếu, mã hàng, số lượng hoặc chứng từ kho', level:'M2' },
  { code:'HH03', group:'Hàng hóa & kho', name:'Không bàn giao hàng hóa, tiền hoặc vật tư đúng quy trình', level:'M2' },
  { code:'HH04', group:'Hàng hóa & kho', name:'Kiểm kê sai hoặc không báo cáo chênh lệch kịp thời', level:'M2' },
  { code:'HH05', group:'Hàng hóa & kho', name:'Gây thất thoát hàng hóa do bất cẩn hoặc không kiểm soát', level:'M3' },
  { code:'CS01', group:'Đổi trả & dữ liệu khách hàng', name:'Thực hiện đổi/trả sai quy định hoặc thiếu phê duyệt', level:'M2' },
  { code:'CS02', group:'Đổi trả & dữ liệu khách hàng', name:'Nhập sai, dùng sai hoặc làm sai lệch dữ liệu khách hàng', level:'M2' },
  { code:'CS03', group:'Đổi trả & dữ liệu khách hàng', name:'Tiết lộ hoặc sử dụng dữ liệu khách hàng sai mục đích', level:'M4' },
  { code:'BC01', group:'Báo cáo & vận hành', name:'Nộp báo cáo trễ, thiếu hoặc sai số liệu', level:'M1' },
  { code:'BC02', group:'Báo cáo & vận hành', name:'Không thực hiện checklist mở ca, đóng ca hoặc bàn giao', level:'M1' },
  { code:'BC03', group:'Báo cáo & vận hành', name:'Không khắc phục lỗi sau khi đã được nhắc nhở', level:'M2' },
  { code:'GL01', group:'Gian lận & trung thực', name:'Giữ/ghép hóa đơn hoặc thao tác để làm sai KPI', level:'M4' },
  { code:'GL02', group:'Gian lận & trung thực', name:'Giả mạo chứng từ, báo cáo, hình ảnh hoặc dữ liệu', level:'M4' },
  { code:'GL03', group:'Gian lận & trung thực', name:'Chiếm dụng tiền, hàng hóa hoặc tài sản công ty', level:'M4' },
  { code:'GL04', group:'Gian lận & trung thực', name:'Che giấu, bao che hoặc không báo cáo vi phạm nghiêm trọng', level:'M3' },
  { code:'AT01', group:'An toàn & tài sản', name:'Không tuân thủ quy định an toàn, PCCC hoặc bảo quản tài sản', level:'M2' },
  { code:'AT02', group:'An toàn & tài sản', name:'Hành vi gây rủi ro nghiêm trọng cho người, hàng hoặc cửa hàng', level:'M3' },
];

function violationCatalogOptions(catalog = VIOLATION_CATALOG) {
  const rows = Array.isArray(catalog) ? catalog : VIOLATION_CATALOG;
  const groups = [...new Set(rows.map(x => x.group))];
  return '<option value="">Chọn lỗi theo SOP chế tài</option>' + groups.map(group => `<optgroup label="${esc(group)}">${rows.filter(x => x.group === group).map(x => `<option value="${x.code}">${esc(x.code)} - ${esc(x.name)}</option>`).join('')}</optgroup>`).join('');
}


const PERM_LABELS = {
  can_assign_tasks: 'Giao việc',
  can_edit_tasks: 'Sửa công việc',
  can_manage_violations: 'Ghi vi phạm',
  can_grade_checklists: 'Chấm checklist',
  can_manage_sales: 'Nhập doanh thu chung',
  can_manage_total_sales: 'Nhập doanh thu tổng',
  can_manage_daily_report: 'Nhập báo cáo ngày',
  can_set_sales_targets: 'Set target doanh thu',
  can_manage_weekly_report: 'Nhập báo cáo tuần',
  can_view_weekly_report: 'Xem báo cáo tuần',
  can_view_sales_target: 'Xem % đạt target toàn hệ thống',
  can_view_store_sales_summary: 'Xem tổng doanh thu cửa hàng',
  can_manage_bonuses: 'Nhập tiền công/thưởng',
  can_view_bonuses: 'Xem tiền công/thưởng toàn hệ thống',
  can_manage_documents: 'Tải/sửa tài liệu quy trình',
  can_view_documents: 'Xem/tải tài liệu quy trình',
  can_manage_shifts: 'Set ca và giờ ca',
  can_manage_schedule: 'Phân lịch làm việc',
  can_view_schedule: 'Xem lịch làm việc',
  can_manage_orders: 'Tạo/sửa order hàng',
  can_view_orders: 'Xem order hàng',
  can_manage_online_orders: 'Nhập đơn online',
  can_view_online_orders: 'Xem đơn online',
  can_manage_product_feedback: 'Nhập đánh giá sản phẩm',
  can_view_product_feedback: 'Xem đánh giá sản phẩm',
  can_manage_product_collections: 'Set BST/List sản phẩm đánh giá',
  can_manage_product_training: 'Nhập đào tạo sản phẩm',
  can_view_product_training: 'Xem đào tạo sản phẩm',
  can_manage_cdp_ojti: 'Nhập CDP/OJTI chung',
  can_view_cdp_ojti: 'Xem CDP/OJTI chung',
  can_manage_cdp: 'Nhập CDP',
  can_view_cdp: 'Xem CDP',
  can_manage_ojti: 'Nhập OJTI',
  can_view_ojti: 'Xem OJTI',
  can_view_reports: 'Xem tổng hợp',
  can_manage_users: 'Quản lý TK',
  can_export: 'Tải dữ liệu',
};


const ROLE_PERMISSION_PRESETS = {
  employee: {},
  manager: {
    can_assign_tasks: 1, can_edit_tasks: 1, can_manage_violations: 1, can_grade_checklists: 1,
    can_manage_sales: 1, can_manage_total_sales: 1, can_manage_daily_report: 1,
    can_manage_weekly_report: 1, can_view_weekly_report: 1, can_view_reports: 1,
    can_export: 1, can_view_store_sales_summary: 1, can_view_bonuses: 1,
    can_manage_documents: 1, can_view_documents: 1, can_manage_schedule: 1,
    can_view_schedule: 1, can_manage_orders: 1, can_view_orders: 1,
    can_manage_online_orders: 1, can_view_online_orders: 1,
    can_manage_product_feedback: 1, can_view_product_feedback: 1,
    can_view_product_training: 1, can_manage_cdp_ojti: 1, can_view_cdp_ojti: 1,
    can_manage_cdp: 1, can_view_cdp: 1, can_manage_ojti: 1, can_view_ojti: 1
  },
  office: {
    can_assign_tasks: 1, can_edit_tasks: 1, can_manage_violations: 1, can_grade_checklists: 1,
    can_manage_sales: 1, can_manage_total_sales: 1, can_manage_daily_report: 1,
    can_manage_weekly_report: 1, can_view_weekly_report: 1, can_view_reports: 1,
    can_export: 1, can_view_store_sales_summary: 1, can_view_bonuses: 1,
    can_manage_documents: 1, can_view_documents: 1, can_manage_schedule: 1,
    can_view_schedule: 1, can_manage_orders: 1, can_view_orders: 1,
    can_manage_online_orders: 1, can_view_online_orders: 1,
    can_manage_product_feedback: 1, can_view_product_feedback: 1,
    can_view_product_training: 1, can_manage_cdp_ojti: 1, can_view_cdp_ojti: 1,
    can_manage_cdp: 1, can_view_cdp: 1, can_manage_ojti: 1, can_view_ojti: 1
  },
  admin: Object.fromEntries(Object.keys(PERM_LABELS).map(k => [k, 1]))
};

function applyRolePermissionPreset(form) {
  if (!form) return;
  const role = form.querySelector('[name="role"]')?.value || 'employee';
  const preset = ROLE_PERMISSION_PRESETS[role] || {};
  Object.keys(PERM_LABELS).forEach(k => {
    const el = form.querySelector(`[name="${k}"]`);
    if (el) el.checked = Number(preset[k] || 0) === 1;
  });
}

function toast(message, type = 'ok') {
  const el = $('#toast');
  el.textContent = message;
  el.className = `toast ${type}`;
  setTimeout(() => el.classList.add('hidden'), 3200);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[m]));
}

function money(v) {
  return new Intl.NumberFormat('vi-VN').format(Number(v || 0));
}

function cleanNumberInput(v) {
  const raw = String(v ?? '').trim();
  if (!raw) return 0;
  const normalized = raw.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatIntegerDots(v) {
  const digits = String(v ?? '').replace(/\D/g, '');
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
}

function setupNumberFormat(root = document) {
  $$('input[data-number-format]', root).forEach(input => {
    if (input.dataset.numberFormatReady === '1') return;
    input.dataset.numberFormatReady = '1';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.value = formatIntegerDots(input.value);
    input.addEventListener('focus', () => {
      if (input.readOnly || input.disabled) return;
      if (cleanNumberInput(input.value) === 0) input.value = '';
    });
    input.addEventListener('input', () => {
      input.value = formatIntegerDots(input.value);
    });
    input.addEventListener('blur', () => {
      input.value = formatIntegerDots(input.value);
    });
  });
  $$('input[type="number"]', root).forEach(input => {
    if (input.dataset.clearZeroReady === '1') return;
    input.dataset.clearZeroReady = '1';
    input.addEventListener('focus', () => {
      if (input.readOnly || input.disabled) return;
      if (String(input.value).trim() === '0') input.value = '';
    });
  });
}

function customerTotalValue(newVal, oldVal, fallbackVal = 0) {
  const n = cleanNumberInput(newVal);
  const o = cleanNumberInput(oldVal);
  const fallback = cleanNumberInput(fallbackVal);
  return (n || o) ? n + o : fallback;
}

function attachCustomerTotalSync(root = document) {
  const customerNew = $('[name="customer_new_count"]', root);
  const customerOld = $('[name="customer_old_count"]', root);
  const customerTotal = $('[name="customer_count"]', root);
  if (!customerNew || !customerOld || !customerTotal) return;
  const initialTotal = cleanNumberInput(customerTotal.value);
  let edited = false;
  const updateTotal = () => {
    const n = cleanNumberInput(customerNew.value);
    const o = cleanNumberInput(customerOld.value);
    const total = (!edited && !n && !o) ? initialTotal : n + o;
    customerTotal.value = formatIntegerDots(total);
  };
  const markEdited = () => { edited = true; updateTotal(); };
  customerNew.addEventListener('input', markEdited);
  customerOld.addEventListener('input', markEdited);
  updateTotal();
}

function setupAutoResizeTextareas(root = document) {
  $$('textarea[data-auto-resize]', root).forEach(textarea => {
    const resize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(88, textarea.scrollHeight)}px`;
    };
    resize();
    if (textarea.dataset.autoResizeReady === '1') return;
    textarea.dataset.autoResizeReady = '1';
    textarea.addEventListener('input', resize);
  });
}

function dt(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return esc(v);
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function parseLocalDate(v) {
  const raw = String(v || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function dOnly(v) {
  if (!v) return '';
  const raw = String(v).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return esc(v);
  return d.toLocaleDateString('vi-VN');
}

function isoDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function currentMonthLocal() {
  return isoDateLocal(new Date()).slice(0, 7);
}

function addDays(dateStr, days) {
  const d = parseLocalDate(dateStr) || new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return isoDateLocal(d);
}

function weekLabel(dateStr) {
  const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const d = parseLocalDate(dateStr);
  if (!d) return '';
  const day = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  return `${labels[d.getDay()]}<br><span class="hint">${day}</span>`;
}

function mondayOf(dateStr) {
  const d = parseLocalDate(dateStr) || new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return isoDateLocal(d);
}

function scheduleMonthWeeks(monthStr) {
  const safe = /^\d{4}-\d{2}$/.test(monthStr || '') ? monthStr : currentMonthLocal();
  const [year, month] = safe.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  let weekStart = mondayOf(isoDateLocal(first));
  const weeks = [];
  while (true) {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    if (dates.some(d => d.startsWith(safe))) weeks.push({ week_start: weekStart, dates });
    const next = addDays(weekStart, 7);
    if ((parseLocalDate(next) > last) && !dates.some(d => d.startsWith(safe))) break;
    if (parseLocalDate(weekStart) > last) break;
    weekStart = next;
    if (weeks.length > 6) break;
  }
  return weeks;
}

function monthLabel(monthStr) {
  const safe = /^\d{4}-\d{2}$/.test(monthStr || '') ? monthStr : currentMonthLocal();
  const [y, m] = safe.split('-');
  return `Tháng ${Number(m)}/${y}`;
}

function timeRange(shift) {
  if (!shift) return '';
  return `${esc(shiftCode(shift))} <span class="hint">${esc(shift.start_time || '')}–${esc(shift.end_time || '')}</span>`;
}

function shiftCode(shift) {
  return String((shift && (shift.code || shift.name)) || '').replace(/^Ca\s+/i, '').trim() || 'Ca';
}

function shiftTone(code) {
  const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!c) return 'off';
  if (c.startsWith('S')) return 's';
  if (c.startsWith('C')) return 'c';
  if (c.startsWith('G')) return 'g';
  if (c.startsWith('F')) return 'f';
  return 'other';
}

function shiftChip(shift, note = '') {
  if (!shift) return '<span class="shift-chip off">OFF</span>';
  const code = shiftCode(shift);
  return `<span class="shift-chip ${shiftTone(code)}">${esc(code)}</span>${note ? `<div class="schedule-note-view">${esc(note)}</div>` : ''}`;
}

function applyScheduleSelectTone(sel) {
  if (!sel) return;
  const opt = sel.options[sel.selectedIndex];
  const code = opt ? (opt.dataset.code || '') : '';
  sel.classList.remove('tone-s', 'tone-c', 'tone-g', 'tone-f', 'tone-other', 'tone-off');
  sel.classList.add(`tone-${shiftTone(code)}`);
}

function renderFiles(value) {
  if (!value) return '';
  let files = [];
  try {
    files = JSON.parse(value);
  } catch (_err) {
    files = [value];
  }
  return files.filter(Boolean).map((file, index) => {
    const label = /^https?:\/\//i.test(String(file || '')) ? `Link Drive ${index + 1}` : `File ${index + 1}`;
    return `<a class="filelink" href="${esc(file)}" target="_blank" rel="noopener">${label}</a>`;
  }).join(' • ');
}

function fmt2(v) {
  return Number(v || 0).toFixed(2);
}

function fmtKpi(v, suffix = '', decimals = 0) {
  const n = Number(v || 0);
  if (suffix === 'đ') return money(n) + suffix;
  if (decimals > 0) return n.toFixed(decimals) + suffix;
  return money(n) + suffix;
}

function targetBadge(actual, target, suffix = '', decimals = 0) {
  actual = Number(actual || 0);
  target = Number(target || 0);
  if (!target) return '<span class="badge">Chưa set</span>';
  const ok = actual >= target;
  return `<span class="badge ${ok ? 'ok' : 'danger'}">${fmtKpi(actual, suffix, decimals)} / ${fmtKpi(target, suffix, decimals)}</span>`;
}

function percentBadge(percent) {
  percent = Number(percent || 0);
  return `<span class="badge ${percent >= 100 ? 'ok' : 'danger'}"><b>${percent}%</b></span>`;
}

function apiUrl(path) { return path; }

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(apiUrl(path), { ...opts, headers });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    let message = data?.error || data || 'Có lỗi xảy ra';
    if (typeof message === 'string' && /<!DOCTYPE|<html|Internal Server Error|<pre>/i.test(message)) {
      message = 'Lỗi server khi lưu/lấy dữ liệu. Vui lòng tải lại trang và thử lại. Nếu vẫn lỗi, kiểm tra Render Logs.';
    }
    throw new Error(message);
  }
  return data;
}

async function downloadExport(type) {
  try {
    const res = await fetch(`/api/export/${type}.csv`, { headers: { Authorization: `Bearer ${state.token}` } });
    if (!res.ok) throw new Error('Không tải được dữ liệu');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) { toast(err.message, 'danger'); }
}

function statusBadge(status) {
  const map = {
    assigned: ['Đang mở', 'dark'],
    overdue: ['Không hoàn thành đúng hạn', 'danger'],
    completed_on_time: ['Hoàn thành đúng hạn', 'ok'],
    completed_late: ['Hoàn thành trễ hạn / bị trừ điểm', 'warn'],
  };
  const [label, cls] = map[status] || [status, ''];
  return `<span class="badge ${cls}">${label}</span>`;
}

function roleLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'office') return 'Khối văn phòng';
  if (role === 'manager') return 'Quản lý';
  return 'Nhân viên';
}

function userStatusLabel(status) {
  return status === 'active' ? 'Đang làm' : 'Đã nghỉ / ngưng hoạt động';
}
function userStatusBadge(status) {
  return `<span class="badge ${status === 'active' ? 'ok' : 'danger'}">${userStatusLabel(status)}</span>`;
}
function userDisplayName(u) {
  return `${esc(u.full_name || '')}${u.user_status && u.user_status !== 'active' ? ' <span class="badge danger">Đã nghỉ</span>' : ''}`;
}

function isAllStoreUser(user = state.user) {
  return user?.role === 'admin' || user?.role === 'office';
}

function storeName(id) {
  return state.boot.stores.find(s => Number(s.id) === Number(id))?.name || '';
}

function userStoreText(user) {
  const names = Array.isArray(user?.store_names) && user.store_names.length ? user.store_names : (user?.store_name ? [user.store_name] : []);
  return names.length ? names.join(' • ') : 'Toàn hệ thống';
}

function selectedValues(selectEl) {
  return Array.from(selectEl?.selectedOptions || []).map(opt => Number(opt.value)).filter(Boolean);
}

function renderStoreMultiOptions(selectedIds = []) {
  const selected = new Set((selectedIds || []).map(Number));
  return state.boot.stores.map(s => `<option value="${s.id}" ${selected.has(Number(s.id)) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
}

function employees() {
  return state.boot.users.filter(u => u.role !== 'admin' && u.role !== 'office');
}

function usersInStore(storeId) {
  const sid = Number(storeId || 0);
  return employees().filter(u => !sid || Number(u.store_id) === sid || (Array.isArray(u.store_ids) && u.store_ids.map(Number).includes(sid)));
}

function salesStaffInStore(storeId) {
  return state.boot.users.filter(u => u.role === 'employee' && (!storeId || Number(u.store_id) === Number(storeId)));
}

function can(p) {
  return state.user?.role === 'admin' || Number(state.user?.permissions?.[p]) === 1;
}
function canAny(...perms) {
  return state.user?.role === 'admin' || perms.some(p => Number(state.user?.permissions?.[p]) === 1);
}

function navItems() {
  const items = [
    ['dashboard', 'Tổng quan', '◆', 'overview'],
    ['sales', 'Doanh thu', '%', 'revenue'],
    ['daily_report', 'Báo cáo ngày', 'DR', 'revenue'],
    ['weekly_report', 'Báo cáo tuần', 'WK', 'revenue'],
    ['online_orders', 'Đơn online', 'OL', 'revenue'],
    ['bonuses', 'Tiền thưởng', '₫', 'revenue'],
    ['orders', 'Order hàng', 'SKU', 'product'],
    ['product_feedback', 'Đánh giá SP', 'FB', 'product'],
    ['product_training', 'Học & Test SP', 'EDU', 'product'],
    ['cdp_ojti', 'CDP / OJTI', 'OJTI', 'work'],
    ['tasks', 'Công việc', '✓', 'work'],
    ['checklists', 'Checklist', '★', 'work'],
    ['schedule', 'Lịch làm việc', '↗', 'work'],
    ['violations', 'Vi phạm', '!', 'work'],
    ['documents', 'Tài liệu', '☰', 'more'],
    ['reports', 'Tổng hợp điểm', '100', 'more'],
    ['account', 'Đổi MK', 'KEY', 'system'],
    ['admin', 'Admin', '⚙', 'system'],
  ];
  return items.filter(([id]) => {
    if (id === 'dashboard' || id === 'account' || id === 'tasks' || id === 'violations' || id === 'checklists' || id === 'sales') return true;
    if (id === 'daily_report') return canAny('can_manage_daily_report','can_manage_sales','can_view_store_sales_summary','can_view_weekly_report','can_manage_weekly_report');
    if (id === 'weekly_report') return can('can_view_weekly_report') || can('can_manage_weekly_report');
    if (id === 'online_orders') return can('can_view_online_orders') || can('can_manage_online_orders');
    if (id === 'orders') return can('can_view_orders') || can('can_manage_orders');
    if (id === 'product_feedback') return can('can_view_product_feedback') || can('can_manage_product_feedback');
    if (id === 'product_training') return can('can_view_product_training') || can('can_manage_product_training');
    if (id === 'cdp_ojti') return canAny('can_view_cdp_ojti','can_manage_cdp_ojti','can_view_cdp','can_manage_cdp','can_view_ojti','can_manage_ojti');
    if (id === 'schedule') return can('can_view_schedule') || can('can_manage_schedule') || can('can_manage_shifts');
    if (id === 'documents') return can('can_view_documents') || can('can_manage_documents');
    if (id === 'bonuses') return can('can_manage_bonuses') || can('can_view_bonuses') || state.user?.role !== 'employee';
    if (id === 'reports') return state.user?.role !== 'employee' || can('can_view_reports');
    if (id === 'admin') return can('can_manage_users');
    return false;
  });
}


function appUiIcon(name) {
  const attrs = 'class="app-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  const icons = {
    home: `<svg ${attrs}><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h5v-6h3v6h5V9.5"/></svg>`,
    tasks: `<svg ${attrs}><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M9 3v3h6V3"/><path d="m8.2 12.2 1.8 1.8 4-4"/><path d="M8 17h8"/></svg>`,
    checklist: `<svg ${attrs}><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 8h8"/><path d="m8 12 1.2 1.2L11 11.4"/><path d="M13 12h3"/><path d="m8 16 1.2 1.2L11 15.4"/><path d="M13 16h3"/></svg>`,
    calendar: `<svg ${attrs}><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3.5v3"/><path d="M16 3.5v3"/><path d="M3.5 9h17"/><path d="M8 13h3"/><path d="M13 13h3"/><path d="M8 17h3"/></svg>`,
    alert: `<svg ${attrs}><path d="M12 3.5 21 19H3L12 3.5Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    revenue: `<svg ${attrs}><path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="12" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="9" rx="1"/><rect x="17" y="5" width="3" height="12" rx="1"/></svg>`,
    weekly: `<svg ${attrs}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8"/><path d="M8 13h3"/><path d="M8 17h6"/><path d="M16 13l2 2 3-4"/></svg>`,
    online: `<svg ${attrs}><path d="M4 5h2l1.4 9.2A2 2 0 0 0 9.4 16H17a2 2 0 0 0 1.9-1.4L20 9H7"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M12 5h6"/><path d="M15 2v6"/></svg>`,
    bonus: `<svg ${attrs}><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M4 13h16"/><path d="M12 9v11"/><path d="M12 9s-3.5-.8-3.5-3A2 2 0 0 1 12 4.8"/><path d="M12 9s3.5-.8 3.5-3A2 2 0 0 0 12 4.8"/></svg>`,
    product: `<svg ${attrs}><path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2L12 3Z"/><path d="m4.5 7.5 7.5 4 7.5-4"/><path d="M12 11.5V21"/></svg>`,
    feedback: `<svg ${attrs}><path d="M5 5h14v10H8l-3 3V5Z"/><path d="M9 9h6"/><path d="M9 12h4"/><path d="m17.5 17.5 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3 1-2Z" transform="scale(.75) translate(7 4)"/></svg>`,
    training: `<svg ${attrs}><path d="M4 5.5A3 3 0 0 1 7 3h13v16H7a3 3 0 0 0-3 2V5.5Z"/><path d="M8 7h8"/><path d="M8 11h7"/><path d="M8 15h5"/></svg>`,
    people: `<svg ${attrs}><path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3.5"/><path d="M22 20v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.6a3.5 3.5 0 0 1 0 6.8"/></svg>`,
    document: `<svg ${attrs}><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z"/><path d="M14 3.5V8h4"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>`,
    score: `<svg ${attrs}><path d="M4 19h16"/><path d="M6 17V9"/><path d="M12 17V5"/><path d="M18 17v-6"/><path d="M8 5h8"/><path d="M12 3v4"/></svg>`,
    key: `<svg ${attrs}><circle cx="8" cy="15" r="4"/><path d="M11 12 20 3"/><path d="M16 7l2 2"/><path d="M14 9l2 2"/></svg>`,
    admin: `<svg ${attrs}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2.1.4l-.1.1a1.7 1.7 0 0 0-.4 1.2H9a1.7 1.7 0 0 0-.4-1.2l-.1-.1a1.7 1.7 0 0 0-2.1-.4l-.2.1-2-3.4.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.1-1.5H3.3V10h.2a1.7 1.7 0 0 0 1.1-1.5 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2.1-.4l.1-.1A1.7 1.7 0 0 0 9 1.5h6a1.7 1.7 0 0 0 .4 1.2l.1.1a1.7 1.7 0 0 0 2.1.4l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 20.5 10h.2v3.5h-.2A1.7 1.7 0 0 0 19.4 15Z" opacity=".28"/></svg>`,
    more: `<svg ${attrs}><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>`,
  };
  return icons[name] || icons.more;
}

function navGroups() {
  return [
    { key:'overview', label:'Tổng quan', icon:appUiIcon('home'), ids:['dashboard'] },
    { key:'work', label:'Công việc', icon:appUiIcon('checklist'), ids:['tasks','cdp_ojti','checklists','schedule','violations'] },
    { key:'revenue', label:'Doanh thu', icon:appUiIcon('revenue'), ids:['sales','daily_report','weekly_report','online_orders','bonuses'] },
    { key:'product', label:'Sản phẩm', icon:appUiIcon('product'), ids:['orders','product_feedback','product_training'] },
    { key:'more', label:'Tài liệu', icon:appUiIcon('document'), ids:['documents','reports'] },
    { key:'system', label:'Hệ thống', icon:appUiIcon('admin'), ids:['account','admin'] },
  ];
}

function mobileNavGroups() {
  return [
    { key:'overview', label:'Tổng quan', icon:appUiIcon('home'), ids:['dashboard'] },
    { key:'work', label:'Công việc', icon:appUiIcon('tasks'), ids:['tasks','cdp_ojti','checklists','schedule','violations'] },
    { key:'revenue', label:'Doanh thu', icon:appUiIcon('revenue'), ids:['sales','daily_report','weekly_report','online_orders','bonuses'] },
    { key:'product', label:'Sản phẩm', icon:appUiIcon('product'), ids:['orders','product_feedback','product_training'] },
    { key:'more', label:'Thêm', icon:appUiIcon('more'), ids:['documents','reports','account','admin'] },
  ];
}

function mobileIconFor(id) {
  return ({
    dashboard:appUiIcon('home'),
    tasks:appUiIcon('tasks'),
    cdp_ojti:appUiIcon('people'),
    checklists:appUiIcon('checklist'),
    schedule:appUiIcon('calendar'),
    violations:appUiIcon('alert'),
    sales:appUiIcon('revenue'),
    daily_report:appUiIcon('weekly'),
    weekly_report:appUiIcon('weekly'),
    online_orders:appUiIcon('online'),
    bonuses:appUiIcon('bonus'),
    orders:appUiIcon('product'),
    product_feedback:appUiIcon('feedback'),
    product_training:appUiIcon('training'),
    documents:appUiIcon('document'),
    reports:appUiIcon('score'),
    account:appUiIcon('key'),
    admin:appUiIcon('admin'),
  })[id] || appUiIcon('more');
}

function availableGroupItems(group, items = navItems()) {
  return group.ids.map(id => items.find(item => item[0] === id)).filter(Boolean);
}

function firstRouteInGroup(group, items = navItems()) {
  return availableGroupItems(group, items)[0]?.[0] || 'dashboard';
}

function activeGroupKey(items = navItems()) {
  const found = items.find(item => item[0] === state.route);
  return found?.[3] || 'overview';
}

function shell(content, title = 'Tổng quan', subtitle = 'Vận hành cửa hàng Dezus') {
  const items = navItems();
  const groups = navGroups();
  const activeGroup = activeGroupKey(items);
  if (!groups.find(g => g.key === state.navOpenGroup && availableGroupItems(g, items).length)) state.navOpenGroup = activeGroup;
  const sideNav = groups.map(group => {
    const groupItems = availableGroupItems(group, items);
    if (!groupItems.length) return '';
    const open = state.navOpenGroup === group.key || activeGroup === group.key;
    return `<div class="nav-group ${open ? 'open' : ''} group-${group.key}"><button class="nav-group-btn group-${group.key} ${activeGroup === group.key ? 'active' : ''}" data-group="${group.key}"><span class="nav-group-main"><b>${group.icon}</b><strong>${group.label}</strong></span><span class="nav-group-caret">${open ? '−' : '+'}</span></button><div class="nav-sub ${open ? 'show' : ''}">${groupItems.map(([id, label, dot]) => `<button class="nav-btn ${state.route === id ? 'active' : ''}" data-route="${id}"><span>${label}</span><span class="nav-dot">${dot}</span></button>`).join('')}</div></div>`;
  }).join('');
  const mobileGroups = mobileNavGroups();
  const mobileActiveGroup = mobileGroups.find(g => g.ids.includes(state.route) && availableGroupItems(g, items).length)?.key || activeGroup;
  const bottomGroups = mobileGroups.filter(g => availableGroupItems(g, items).length);
  const mobileBottom = bottomGroups.map(group => `<button class="mobile-tab group-${group.key} ${mobileActiveGroup === group.key ? 'active' : ''}" data-group="${group.key}"><span class="mobile-tab-icon">${group.icon}</span><span>${group.label}</span></button>`).join('');
  const mobileCats = '';
  const openGroup = groups.find(g => g.key === state.navOpenGroup) || groups.find(g => g.key === activeGroup) || groups[0];
  const mobileOpenGroup = mobileGroups.find(g => g.key === state.navOpenGroup && availableGroupItems(g, items).length) || mobileGroups.find(g => g.key === mobileActiveGroup && availableGroupItems(g, items).length) || mobileGroups[0];
  const mobileTitle = mobileOpenGroup?.label || title;
  const mobileSubnav = mobileOpenGroup ? `<div class="mobile-subnav mobile-menu-list">${availableGroupItems(mobileOpenGroup, items).map(([id,label,,groupKey]) => `<button class="mobile-subitem group-${groupKey || mobileOpenGroup.key} route-${id} ${state.route === id ? 'active' : ''}" data-route="${id}"><span class="mobile-subitem-icon">${mobileIconFor(id)}</span><span class="mobile-subitem-label">${label}</span><span class="mobile-subitem-arrow">›</span></button>`).join('')}</div>` : '';
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="logo">
          <div class="mark">DZ</div>
          <div><h1>Dezus Store Ops</h1><p>Store Operations</p></div>
        </div>
        <nav class="side-nav">${sideNav}</nav>
        <div class="side-bottom">
          <div class="user-pill"><b>${esc(state.user.full_name)}</b><span>${roleLabel(state.user.role)} • ${esc(userStoreText(state.user))}</span></div>
          <button class="btn secondary" id="logoutBtn">Đăng xuất</button>
        </div>
      </aside>
      <main class="main">
        <div class="mobile-app-head">
          <div class="mobile-logo"><div class="mark">DZ</div><div><b>Dezus Ops</b><span>${esc(userStoreText(state.user))}</span></div></div>
          <button class="mobile-icon-btn" id="logoutBtn2" title="Đăng xuất">↗</button>
        </div>
        <div class="topbar">
          <div class="page-title"><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
          <div class="row mobile-top"><button class="btn secondary" id="logoutBtn3">Đăng xuất</button></div>
        </div>
        <div class="mobile-page-title"><h2>${esc(mobileTitle)}</h2></div>
        <div class="mobile-cats">${mobileCats}</div>
        ${mobileSubnav}
        ${content}
      </main>
      <nav class="mobile-bottom-nav">${mobileBottom}</nav>
    </div>`;
  $$('[data-route]').forEach(btn => btn.onclick = () => { state.route = btn.dataset.route; localStorage.setItem('dezus_ops_route', state.route); render(); });
  $$('[data-group]').forEach(btn => btn.onclick = () => {
    const key = btn.dataset.group;
    state.navOpenGroup = key;
    localStorage.setItem('dezus_ops_nav_group', key);
    const group = groups.find(g => g.key === key);
    const firstRoute = firstRouteInGroup(group, items);
    if (firstRoute) {
      state.route = firstRoute;
      localStorage.setItem('dezus_ops_route', state.route);
    }
    render();
  });
  $('#logoutBtn')?.addEventListener('click', logout);
  $('#logoutBtn2')?.addEventListener('click', logout);
  $('#logoutBtn3')?.addEventListener('click', logout);
  $$('[data-export]').forEach(btn => btn.addEventListener('click', () => downloadExport(btn.dataset.export)));
  setupNumberFormat(app);
}

function logout() {
  localStorage.removeItem('dezus_ops_token');
  state.token = '';
  state.user = null;
  renderLogin();
}

function renderLogin() {
  app.innerHTML = `
    <div class="login-wrap">
      <form class="login-card" id="loginForm">
        <section class="login-form-panel">
          <div class="logo"><div class="mark">DZ</div><div><h1>Dezus Store Ops</h1><p>Store Operations</p></div></div>
          <div class="login-copy">
            <h2>Đăng nhập hệ thống</h2>
          </div>
          <div class="field"><label>Tài khoản</label><input class="input" name="username" placeholder="Nhập tài khoản" autocomplete="username" required></div>
          <div class="field"><label>Mật khẩu</label><input class="input" name="password" type="password" placeholder="Mật khẩu" autocomplete="current-password" required></div>
          <button class="btn" style="width:100%;margin-top:8px">Đăng nhập</button>
          
        </section>
        <section class="login-art-panel">
          <div class="glass-badge">DEZUS STORE OPS</div>
          <h3>Vận hành cửa hàng</h3>
          <p>Giao việc • Checklist • Vi phạm • KPI 100 điểm</p>
          <div class="mini-metrics">
            <div><b>100</b><span>Điểm tổng</span></div>
            <div><b>3</b><span>Checklist</span></div>
            <div><b>CSV</b><span>Tải dữ liệu</span></div>
          </div>
        </section>
      </form>
    </div>`;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd)) });
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('dezus_ops_token', data.token);
      await loadBase();
      render();
    } catch (err) { toast(err.message, 'danger'); }
  };
}

async function loadBase() {
  const boot = await api('/api/bootstrap');
  state.user = boot.currentUser;
  state.boot = boot;
  const t = await api('/api/checklist/templates');
  state.templates = t.templates;
}

async function start() {
  if (!state.token) return renderLogin();
  try { await loadBase(); render(); } catch (_err) { logout(); }
}

async function render() {
  if (!state.user) return renderLogin();
  const active = navItems().some(([id]) => id === state.route) ? state.route : 'dashboard';
  state.route = active;
  if (active === 'dashboard') return renderDashboard();
  if (active === 'account') return renderAccount();
  if (active === 'tasks') return renderTasks();
  if (active === 'violations') return renderViolations();
  if (active === 'checklists') return renderChecklists();
  if (active === 'sales') return renderSales();
  if (active === 'daily_report') return renderDailyReport();
  if (active === 'weekly_report') return renderWeeklyReport();
  if (active === 'online_orders') return renderOnlineOrders();
  if (active === 'orders') return renderOrders();
  if (active === 'product_feedback') return renderProductFeedback();
  if (active === 'product_training') return renderProductTraining();
  if (active === 'cdp_ojti') return renderCdpOjti();
  if (active === 'schedule') return renderSchedule();
  if (active === 'documents') return renderDocuments();
  if (active === 'bonuses') return renderBonuses();
  if (active === 'reports') return renderReports();
  if (active === 'admin') return renderAdmin();
}

function renderAccount() {
  const user = state.user || {};
  shell(`
    <div class="card account-card">
      <h3>Tài khoản của tôi</h3>
      <div class="mini-grid" style="margin-bottom:16px">
        <div class="stat"><span>Họ tên</span><b>${esc(user.full_name || '')}</b></div>
        <div class="stat"><span>Tài khoản</span><b>${esc(user.username || '')}</b></div>
        <div class="stat"><span>Vai trò</span><b>${roleLabel(user.role)}</b></div>
        <div class="stat"><span>Cửa hàng</span><b>${esc(user.store_name || 'Toàn hệ thống')}</b></div>
      </div>
      <h3>Đổi mật khẩu</h3>
      <p class="hint">Nhập mật khẩu hiện tại, mật khẩu mới và nhập lại mật khẩu mới. Sau khi đổi xong, hệ thống sẽ đăng xuất để bạn đăng nhập lại bằng mật khẩu mới.</p>
      <form id="changePasswordForm" class="grid three">
        <div class="field"><label>Mật khẩu hiện tại</label><input class="input" name="current_password" type="password" autocomplete="current-password" required></div>
        <div class="field"><label>Mật khẩu mới</label><input class="input" name="new_password" type="password" autocomplete="new-password" minlength="6" required></div>
        <div class="field"><label>Nhập lại mật khẩu mới</label><input class="input" name="confirm_password" type="password" autocomplete="new-password" minlength="6" required></div>
        <div style="grid-column:1/-1"><button class="btn">Lưu mật khẩu mới</button></div>
      </form>
    </div>
  `, 'Đổi mật khẩu', 'Tài khoản cá nhân và bảo mật đăng nhập');
  $('#changePasswordForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      current_password: fd.get('current_password'),
      new_password: fd.get('new_password'),
      confirm_password: fd.get('confirm_password')
    };
    if (String(payload.new_password || '').length < 6) return toast('Mật khẩu mới cần tối thiểu 6 ký tự', 'danger');
    if (payload.new_password !== payload.confirm_password) return toast('Mật khẩu mới và nhập lại chưa khớp', 'danger');
    try {
      await api('/api/me/password', { method: 'PATCH', body: JSON.stringify(payload) });
      toast('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
      setTimeout(logout, 900);
    } catch (err) { toast(err.message, 'danger'); }
  });
}

async function renderDashboard() {
  const [tasksData, violationsData, leaderboardData, reportData] = await Promise.all([
    api('/api/tasks'),
    api('/api/violations'),
    api('/api/sales/leaderboard?period=month&scope=overview_percent'),
    (state.user.role !== 'employee' || can('can_view_reports')) ? api('/api/reports/performance').catch(() => ({ performance: [], storeSummary: [] })) : Promise.resolve({ performance: [], storeSummary: [] }),
  ]);
  const tasks = tasksData.tasks;
  const open = tasks.filter(t => t.status === 'assigned').length;
  const late = tasks.filter(t => t.status === 'overdue' || t.status === 'completed_late').length;
  const done = tasks.filter(t => t.status === 'completed_on_time').length;
  const total = Math.max(tasks.length, 1);
  const onTimeRate = Math.round((done / total) * 100);
  const myPerf = reportData.performance.find(p => Number(p.user_id) === Number(state.user.id)) || reportData.performance[0] || {};
  const top = leaderboardData.leaderboard.slice(0, 5);
  const today = new Date().toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });
  shell(`
    <section class="card hero-card">
      <div>
        <span class="badge dark">${esc(today)}</span>
        <h3>Xin chào, ${esc(state.user.full_name)}</h3>
      </div>
      <div class="hero-score">
        <span>Điểm tổng hợp</span>
        <b>${myPerf.final_score ?? '-'}</b>
        <small>/100</small>
      </div>
    </section>
    <section class="grid four dash-kpis">
      <div class="card kpi dashboard-kpi kpi-open"><div class="label">Việc đang mở</div><div class="num">${open}</div><div class="hint">Cần xử lý trong hạn</div></div>
      <div class="card kpi dashboard-kpi kpi-done"><div class="label">Đúng hạn</div><div class="num ok-text">${done}</div><div class="hint">Tỷ lệ đúng hạn ${onTimeRate}%</div></div>
      <div class="card kpi dashboard-kpi kpi-late"><div class="label">Trễ / quá hạn</div><div class="num danger-text">${late}</div><div class="hint">Tự ghi nhận trừ điểm</div></div>
      <div class="card kpi top-month-kpi"><div class="top-month-head"><div><div class="label">Top tháng</div><div class="num top-month-name">${top[0] ? esc(top[0].full_name) : '-'}</div><div class="hint top-month-store">${top[0] ? esc(top[0].store_name || '') : 'Chưa có dữ liệu'}</div></div><div class="top-month-cup" aria-hidden="true">🏆</div></div></div>
    </section>
    <section class="grid two overview-bottom-grid" style="margin-top:17px">
      <div class="card overview-leaderboard-card"><div class="section-title"><h3>Top % đạt target doanh thu tháng này</h3><span class="badge">Cạnh tranh</span></div>${tableLeaderboard(top)}</div>
      <div class="card overview-violations-card"><div class="section-title"><h3>Vi phạm gần đây</h3><span class="badge danger">Kiểm soát</span></div>${violationsData.violations.slice(0, 6).map(v => `<div class="activity-item"><div><b>${esc(v.employee_name)}</b><span>${esc(v.store_name || '')} • ${dt(v.created_at)}</span><p>${esc(v.description || '')}</p></div><span class="badge danger">-${v.points_deducted}</span></div>`).join('') || '<div class="empty">Chưa có vi phạm</div>'}</div>
    </section>
  `, 'Tổng quan', '');
}

function tableLeaderboard(rows, showAmounts = false) {
  if (!rows.length) return '<div class="empty">Chưa có dữ liệu doanh thu/target</div>';
  const moneyColsHead = showAmounts ? '<th>Doanh thu thực đạt</th><th>Target DT</th><th>Timeline dự kiến</th><th>Cần bán/ngày</th>' : '';
  const moneyColsBody = r => showAmounts ? `<td><b>${money(r.revenue || 0)}đ</b></td><td>${money(r.target || 0)}đ</td><td>${percentBadge(r.pace_percent || 0)}</td><td><b>${money(r.daily_needed || 0)}đ</b></td>` : '';
  // V4.57-1: Tổng quan không hiển thị % tỷ trọng DT, nhưng trang Doanh thu vẫn giữ.
  const revenueShareHead = showAmounts ? '<th>% tỷ trọng DT</th>' : '';
  const revenueShareBody = r => showAmounts ? `<td>${Number(r.revenue_percent || 0)}%</td>` : '';
  const rankCupHtml = r => r.rank === 1 ? `<div class="rank-cup rank-cup-gold" aria-label="Cúp vàng hạng 1">🏆</div>` : (r.rank === 2 ? `<div class="rank-cup rank-cup-silver" aria-label="Huy chương bạc hạng 2">🥈</div>` : (r.rank === 3 ? `<div class="rank-cup rank-cup-bronze" aria-label="Huy chương đồng hạng 3">🥉</div>` : ''));
  const podium = rows.slice(0, 3).map(r => `<div class="rank-card rank-${r.rank}">${rankCupHtml(r)}<div class="rank-no">Top ${r.rank}</div><b class="employee-name-line">${userDisplayName(r)}</b><span>${esc(r.store_name || '')}</span><strong>${Number(r.achievement_percent || 0)}%</strong></div>`).join('');
  return `<div class="leaderboard-premium">${podium}</div><div class="table-wrap leaderboard-wrap"><table class="leaderboard-table"><thead><tr><th>Top</th><th>Nhân viên</th><th>Cửa hàng</th><th>% đạt target</th>${moneyColsHead}${revenueShareHead}<th>Bill</th><th>Món</th><th>UPT</th><th>ATV</th><th>ASP</th><th>GUESTS</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="badge dark">Top ${r.rank}</span></td><td class="employee-name-cell"><b>${userDisplayName(r)}</b></td><td class="store-name-cell">${esc(r.store_name || '')}</td><td>${percentBadge(r.achievement_percent || 0)}</td>${moneyColsBody(r)}${revenueShareBody(r)}<td>${money(r.bill_count || 0)}</td><td>${money(r.item_count || 0)}</td><td class="metric-badge-cell">${targetBadge(r.upt || 0, r.target_upt || 0, '', 2)}</td><td class="metric-badge-cell">${targetBadge(r.atv || 0, r.target_atv || 0, 'đ')}</td><td>${money(r.asp || 0)}đ</td><td>${Math.round(r.guests_percent || 0)}%</td></tr>`).join('')}</tbody></table></div>`;
}

function tableStoreSalesSummary(summary) {
  if (!summary || !summary.rows?.length) return '<div class="empty">Chưa có dữ liệu doanh thu ngày trong tháng này</div>';
  const t = summary.totals || {};
  const kpis = `<div class="grid four dash-kpis" style="margin-bottom:14px"><div class="card kpi"><div class="label">Doanh thu thực đạt</div><div class="num">${money(t.revenue || 0)}đ</div><div class="hint">Target tháng: ${money(summary.monthly_target || 0)}đ • ${percentBadge(t.achievement_percent || 0)}</div></div><div class="card kpi"><div class="label">Timeline dự kiến</div><div class="num">${Number(t.pace_percent || 0)}%</div><div class="hint">Dự kiến về: ${money(t.projected_revenue || 0)}đ</div></div><div class="card kpi"><div class="label">Cần bán/ngày</div><div class="num">${money(t.daily_needed || 0)}đ</div><div class="hint">Còn ${money(t.days_remaining || 0)} ngày để về 100%</div></div><div class="card kpi"><div class="label">Target ngày đã set</div><div class="num">${money(t.daily_target || 0)}đ</div><div class="hint">Theo tổng target ngày trong tháng • ${percentBadge(t.daily_achievement_percent || 0)}</div></div><div class="card kpi"><div class="label">UPT</div><div class="num">${fmt2(t.upt || 0)}</div><div class="hint">${targetBadge(t.upt || 0, t.target_upt || 0, '', 2)}</div></div><div class="card kpi"><div class="label">ATV</div><div class="num">${money(t.atv || 0)}đ</div><div class="hint">${targetBadge(t.atv || 0, t.target_atv || 0, 'đ')}</div></div><div class="card kpi"><div class="label">ASP</div><div class="num">${money(t.asp || 0)}đ</div><div class="hint">Doanh thu / số món</div></div><div class="card kpi"><div class="label">CR</div><div class="num">${Number(t.cr || 0)}%</div><div class="hint">${targetBadge(t.cr || 0, t.target_cr || 0, '%', 2)}</div></div><div class="card kpi"><div class="label">Khách mới</div><div class="num">${money(t.customer_new_count || 0)}</div><div class="hint">TF khách mới trong tháng</div></div><div class="card kpi"><div class="label">Khách cũ</div><div class="num">${money(t.customer_old_count || 0)}</div><div class="hint">TF khách cũ trong tháng</div></div><div class="card kpi"><div class="label">Lượt khách tổng</div><div class="num">${money(t.customer_count || 0)}</div><div class="hint">Khách mới + khách cũ</div></div></div>`;
  const rows = summary.rows.map(r => `<tr><td><b>${dOnly(r.sale_date)}</b></td><td>${money(r.revenue || 0)}</td><td>${money(r.daily_target || 0)}</td><td>${percentBadge(r.daily_achievement_percent || 0)}</td><td>${money(r.bill_count || 0)}</td><td>${money(r.item_count || 0)}</td><td>${money(r.customer_new_count || 0)}</td><td>${money(r.customer_old_count || 0)}</td><td>${money(r.customer_count || 0)}</td><td>${targetBadge(r.upt || 0, r.daily_target_upt || r.target_upt || 0, '', 2)}</td><td>${targetBadge(r.atv || 0, r.daily_target_atv || r.target_atv || 0, 'đ')}</td><td>${money(r.asp || 0)}đ</td><td>${targetBadge(r.cr || 0, r.daily_target_cr || r.target_cr || 0, '%', 2)}</td><td>${percentBadge(r.achievement_percent || 0)}</td><td>${esc(r.note || r.daily_target_note || '')}</td></tr>`).join('');
  return `${kpis}<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Doanh thu ngày</th><th>Target ngày</th><th>% ngày</th><th>Bill</th><th>Món</th><th>Khách mới</th><th>Khách cũ</th><th>Lượt khách tổng</th><th>UPT</th><th>ATV</th><th>ASP</th><th>CR</th><th>% lũy kế tháng</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function tableWeeklyDays(rows) {
  if (!rows?.length) return '<div class="empty">Chưa có dữ liệu ngày trong tuần này</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Doanh thu</th><th>Target ngày</th><th>% đạt</th><th>Bill</th><th>Món</th><th>Khách mới</th><th>Khách cũ</th><th>Lượt khách tổng</th><th>UPT</th><th>ATV</th><th>ASP</th><th>CR</th><th>Ghi chú</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${dOnly(r.sale_date)}</b></td><td>${money(r.revenue || 0)}đ</td><td>${money(r.target_revenue || 0)}đ</td><td>${percentBadge(r.achievement_percent || 0)}</td><td>${money(r.bill_count || 0)}</td><td>${money(r.item_count || 0)}</td><td>${money(r.customer_new_count || 0)}</td><td>${money(r.customer_old_count || 0)}</td><td>${money(r.customer_count || 0)}</td><td>${fmt2(r.upt || 0)}</td><td>${money(r.atv || 0)}đ</td><td>${money(r.asp || 0)}đ</td><td>${fmt2(r.cr || 0)}%</td><td>${esc(r.note || '')}</td></tr>`).join('')}</tbody></table></div>`;
}

function tableWeeklyEmployees(rows) {
  if (!rows?.length) return '<div class="empty">Chưa có dữ liệu cá nhân trong tuần này</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Nhân viên</th><th>Doanh thu</th><th>Target tuần ước tính</th><th>% đạt</th><th>% tỷ trọng DT</th><th>Bill</th><th>Món</th><th>UPT</th><th>ATV</th><th>ASP</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${userDisplayName(r)}</b></td><td>${money(r.revenue || 0)}đ</td><td>${money(r.target || 0)}đ</td><td>${percentBadge(r.achievement_percent || 0)}</td><td>${Number(r.revenue_percent || 0)}%</td><td>${money(r.bill_count || 0)}</td><td>${money(r.item_count || 0)}</td><td>${fmt2(r.upt || 0)}</td><td>${money(r.atv || 0)}đ</td><td>${money(r.asp || 0)}đ</td></tr>`).join('')}</tbody></table></div>`;
}

function tableWeeklyProducts(rows) {
  if (!rows.length) return '<div class="empty">Chưa nhập top sản phẩm bán chạy</div>';
  return `<div class="weekly-product-list">${rows.slice(0,5).map((r, i) => {
    const qty = Number(r.quantity ?? r.qty ?? r.item_count ?? 0) || 0;
    return `<div class="weekly-product-card"><div class="weekly-product-main"><span class="badge dark">Top ${i + 1}</span><b>${esc(r.name || r.product_name || '')}</b>${r.note ? `<small>${esc(r.note)}</small>` : ''}</div><div class="weekly-product-qty-view"><span>Số món</span><strong>${money(qty)}</strong></div></div>`;
  }).join('')}</div>`;
}

function tableWeeklyPromotions(rows) {
  rows = Array.isArray(rows) ? rows : [];
  if (!rows.length) return '<div class="empty">Chưa nhập bill tham gia CTKM</div>';
  return `<div class="table-wrap weekly-read-table-wrap"><table class="weekly-read-table"><thead><tr><th>CTKM</th><th>Số bill tham gia</th><th>Ghi chú</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name || '')}</b></td><td>${money(r.bill_count || 0)}</td><td>${esc(r.note || '')}</td></tr>`).join('')}</tbody></table></div>`;
}

function weeklyProductInputRows(rows = []) {
  const base = [...rows];
  while (base.length < 5) base.push({});
  return base.slice(0,5).map((r, i) => `<div class="weekly-product-row weekly-product-form-row"><div class="weekly-product-top"><span class="badge dark">Top ${i + 1}</span><b>Sản phẩm bán chạy</b></div><div class="field"><label>Tên sản phẩm</label><input class="input weekly-product-name" value="${esc(r.name || r.product_name || '')}" placeholder="Tên sản phẩm"></div><div class="field weekly-product-qty-field"><label>Số món</label><input class="input weekly-product-qty" type="text" inputmode="numeric" data-number-format value="${money(r.quantity ?? r.qty ?? r.item_count ?? 0)}"></div><div class="field"><label>Feedback sản phẩm</label><input class="input weekly-product-note" value="${esc(r.note || '')}" placeholder="VD: bán tốt do dễ phối, khách hỏi size, màu, chất liệu..."></div></div>`).join('');
}

function weeklyPromotionInputRows(rows = []) {
  const base = Array.isArray(rows) && rows.length ? rows.slice(0,10) : [{ name:'Mua 3 giảm 5%', bill_count:0 }, { name:'Mua 5 giảm 10%', bill_count:0 }];
  return base.map((r, i) => `<tr class="weekly-promo-row"><td><input class="input weekly-promo-name" value="${esc(r.name || '')}" placeholder="VD: Mua 3 giảm 5%"></td><td><input class="input weekly-promo-bill" type="text" inputmode="numeric" data-number-format value="${money(r.bill_count || 0)}"></td><td><input class="input weekly-promo-note" value="${esc(r.note || '')}" placeholder="Ghi chú"><button type="button" class="btn ghost small weeklyRemovePromoBtn" style="margin-left:6px">Xóa</button></td></tr>`).join('');
}


async function downloadWeeklyReport() {
  const storeId = isAllStoreUser() ? (state.weeklyStoreId || state.boot.stores[0]?.id || '') : state.user.store_id;
  const weekStart = state.weeklyWeekStart || mondayOf(new Date().toISOString().slice(0, 10));
  try {
    const userStatus = state.weeklyUserStatus || 'active';
    const res = await fetch(`/api/weekly-report/export.csv?week_start=${encodeURIComponent(weekStart)}${storeId ? `&store_id=${encodeURIComponent(storeId)}` : ''}&user_status=${encodeURIComponent(userStatus)}`, { headers: { Authorization: `Bearer ${state.token}` } });
    if (!res.ok) throw new Error('Không tải được báo cáo tuần');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-tuan-${weekStart}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) { toast(err.message, 'danger'); }
}


function splitSizes(value) {
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  return String(value || '').split(/[,+/|;]/).map(v => v.trim()).filter(Boolean);
}
function dailySizeInputs(item = {}) {
  const sizes = splitSizes(item.size || item.sizes || '').slice(0, 4);
  while (sizes.length < 4) sizes.push('');
  return `<div class="daily-size-boxes">${sizes.map(v => `<input class="input daily-missing-size" value="${esc(v)}" maxlength="4" placeholder="Size">`).join('')}</div>`;
}
function dailyMissingRows(items = [], minRows = 2) {
  const rows = [...items];
  while (rows.length < minRows) rows.push({ sku:'', product_name:'', quantity:'', size:'', sizes:[], note:'' });
  return rows.map((item, i) => `<tr class="daily-missing-row">
    <td><input class="input daily-missing-sku" value="${esc(item.sku || '')}" placeholder="SKU"></td>
    <td><input class="input daily-missing-name" value="${esc(item.product_name || '')}" placeholder="Tên sản phẩm thiếu size"></td>
    <td>${dailySizeInputs(item)}</td>
    <td><input class="input daily-missing-qty" type="text" inputmode="numeric" data-number-format value="${item.quantity ? money(item.quantity) : ''}" placeholder="SL"></td>
    <td><input class="input daily-missing-note" value="${esc(item.note || '')}" placeholder="Ghi chú"></td>
  </tr>`).join('');
}

function dailyFeedbackRows(items = [], minRows = 2) {
  const rows = [...items];
  while (rows.length < minRows) rows.push({ sku:'', product_name:'', product_errors:'', customer_feedback:'', note:'' });
  return rows.map((item, i) => `<tr class="daily-feedback-row">
    <td><input class="input daily-feedback-sku" value="${esc(item.sku || '')}" placeholder="SKU"></td>
    <td><input class="input daily-feedback-name" value="${esc(item.product_name || '')}" placeholder="Tên sản phẩm"></td>
    <td><input class="input daily-feedback-error" value="${esc(item.product_errors || '')}" placeholder="VD: bung chỉ, lỗi khóa..."></td>
    <td><input class="input daily-feedback-customer" value="${esc(item.customer_feedback || '')}" placeholder="VD: khách chê chất vải..."></td>
    <td><input class="input daily-feedback-note" value="${esc(item.note || '')}" placeholder="Ghi chú"></td>
  </tr>`).join('');
}

function dailyReportOverviewBox(data = {}) {
  const total = data.store_total || {};
  const sales = (data.sales_entries || []).filter(r => Number(r.revenue || 0) || Number(r.bill_count || 0) || Number(r.item_count || 0) || r.note);
  const missing = (data.missing_size_items || []).filter(x => x.sku || x.product_name || Number(x.quantity || 0) || x.size || x.note);
  const feedback = (data.product_feedback_items || []).filter(x => x.sku || x.product_name || x.product_errors || x.customer_feedback || x.note);
  const morningSituation = data.store_situation_morning || '';
  const eveningSituation = data.store_situation_evening || '';
  const hasSituation = morningSituation || eveningSituation || data.store_note;
  const hasContent = data.report || Number(total.revenue || 0) || sales.length || missing.length || feedback.length || hasSituation;
  if (!hasContent) return '<div id="dailyReportSummaryBox"></div>';
  const target = Number(total.target_revenue || data.daily_target?.target_revenue || 0);
  const percent = target ? Math.round((Number(total.revenue || 0) / target) * 10000) / 100 : 0;
  const customerNew = Number(total.customer_new_count || data.customer_new_count || 0);
  const customerOld = Number(total.customer_old_count || data.customer_old_count || 0);
  const customerTotal = customerTotalValue(customerNew, customerOld, total.customer_count || data.customer_count || 0);
  const salesHtml = sales.length ? sales.map(r => `<div class="daily-overview-row"><div><b>${esc(r.full_name || '')}</b><small>${esc(r.note || '')}</small></div><div class="daily-overview-numbers"><strong>${money(r.revenue || 0)}đ</strong><span>Bill ${money(r.bill_count || 0)} • Món ${money(r.item_count || 0)}</span></div></div>`).join('') : '<div class="daily-overview-empty">Chưa có doanh thu nhân viên</div>';
  const missingHtml = missing.length ? missing.map((item, i) => `<div class="daily-overview-chip"><b>${i + 1}. ${esc(item.sku || '')}${item.sku && item.product_name ? ' - ' : ''}${esc(item.product_name || '')}</b><span>${item.size ? `Size ${esc(item.size)} • ` : ''}SL ${money(item.quantity || 0)}${item.note ? ` • ${esc(item.note)}` : ''}</span></div>`).join('') : '<div class="daily-overview-empty">Không có sản phẩm thiếu size</div>';
  const feedbackHtml = feedback.length ? feedback.map((item, i) => `<div class="daily-overview-chip"><b>${i + 1}. ${esc(item.sku || '')}${item.sku && item.product_name ? ' - ' : ''}${esc(item.product_name || '')}</b><span>${item.product_errors ? `Lỗi: ${esc(item.product_errors)}` : ''}${item.product_errors && item.customer_feedback ? ' • ' : ''}${item.customer_feedback ? `KH: ${esc(item.customer_feedback)}` : ''}${item.note ? ` • ${esc(item.note)}` : ''}</span></div>`).join('') : '<div class="daily-overview-empty">Không có sản phẩm lỗi / feedback khách</div>';
  return `<section id="dailyReportSummaryBox" class="card daily-overview-card" style="margin-top:16px">
    <div class="daily-overview-title"><div><span class="badge ok">Chụp màn hình gửi nhóm</span><h3>Tổng quan báo cáo ngày</h3><p>${esc(data.store_name || '')} • ${dOnly(data.report_date || '')}</p></div><div class="daily-overview-percent"><b>${percent}%</b><span>về target ngày</span></div></div>
    <div class="daily-overview-kpis">
      <div><span>Tổng doanh thu cửa hàng</span><b>${money(total.revenue || 0)}đ</b></div>
      <div><span>Target ngày</span><b>${target ? money(target) + 'đ' : 'Chưa set'}</b></div>
      <div><span>Bill / Món</span><b>${money(total.bill_count || 0)} / ${money(total.item_count || 0)}</b></div>
      <div><span>Khách mới</span><b>${money(customerNew)}</b></div>
      <div><span>Khách cũ</span><b>${money(customerOld)}</b></div>
      <div><span>Lượt khách tổng</span><b>${money(customerTotal)}</b></div>
      <div><span>UPT</span><b>${fmt2(total.upt || 0)}</b></div>
      <div><span>ATV</span><b>${money(total.atv || 0)}đ</b></div>
      <div><span>ASP</span><b>${money(total.asp || 0)}đ</b></div>
      <div><span>CR</span><b>${fmt2(total.cr || 0)}%</b></div>
    </div>
    ${hasSituation ? `<div class="daily-overview-note daily-situation-overview"><b>Tình hình cửa hàng</b><div class="daily-situation-notes">${morningSituation ? `<p><strong>Ca sáng:</strong> ${esc(morningSituation)}</p>` : ''}${eveningSituation ? `<p><strong>Ca tối:</strong> ${esc(eveningSituation)}</p>` : ''}${(!morningSituation && !eveningSituation && data.store_note) ? `<p>${esc(data.store_note)}</p>` : ''}</div></div>` : ''}
    <div class="daily-overview-grid">
      <div class="daily-overview-section"><h4>Doanh thu cá nhân</h4>${salesHtml}</div>
      <div class="daily-overview-section"><h4>Sản phẩm thiếu size / cần order</h4>${missingHtml}</div>
      <div class="daily-overview-section"><h4>Sản phẩm lỗi / feedback khách</h4>${feedbackHtml}</div>
    </div>
  </section>`;
}

async function renderDailyReport() {
  const reportDate = state.dailyReportDate || isoDateLocal(new Date());
  const defaultStoreId = isAllStoreUser() ? (state.dailyReportStoreId || state.boot.stores[0]?.id || '') : state.user.store_id;
  state.dailyReportStoreId = defaultStoreId;
  state.dailyReportDate = reportDate;
  const data = await api(`/api/daily-report?report_date=${encodeURIComponent(reportDate)}${defaultStoreId ? `&store_id=${encodeURIComponent(defaultStoreId)}` : ''}`);
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(data.store_id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const storeFilter = isAllStoreUser() ? `<div class="field"><label>Cửa hàng</label><select class="input" id="dailyReportStoreFilter" name="store_id">${storeOptions}</select></div>` : `<input type="hidden" name="store_id" value="${esc(data.store_id)}">`;
  const canEdit = canAny('can_manage_daily_report','can_manage_sales');
  const salesRows = (data.sales_entries || []).map(r => `<tr class="daily-sales-row" data-user="${r.user_id}">
    <td class="daily-sticky-name"><b>${esc(r.full_name || '')}</b><div class="hint">${esc(r.store_name || data.store_name || '')}</div></td>
    <td><input class="input daily-sale-revenue" type="text" inputmode="numeric" data-number-format value="${r.revenue ? money(r.revenue) : '0'}" ${canEdit ? '' : 'disabled'}></td>
    <td><input class="input daily-sale-bill" type="text" inputmode="numeric" data-number-format value="${r.bill_count ? money(r.bill_count) : '0'}" ${canEdit ? '' : 'disabled'}></td>
    <td><input class="input daily-sale-item" type="text" inputmode="numeric" data-number-format value="${r.item_count ? money(r.item_count) : '0'}" ${canEdit ? '' : 'disabled'}></td>
    <td><input class="input daily-sale-note" value="${esc(r.note || '')}" placeholder="Ghi chú NV" ${canEdit ? '' : 'disabled'}></td>
  </tr>`).join('') || '<tr><td colspan="5"><div class="empty">Chưa có nhân viên bán hàng</div></td></tr>';
  const form = `<form id="dailyReportForm">
    <div class="card daily-report-head"><div class="toolbar"><div class="field"><label>Ngày báo cáo</label><input class="input" id="dailyReportDateFilter" name="report_date" type="date" value="${esc(data.report_date || reportDate)}" required></div>${storeFilter}<div class="field"><label>Khách mới</label><input class="input" type="text" inputmode="numeric" data-number-format name="customer_new_count" value="${money(data.customer_new_count || 0)}"></div><div class="field"><label>Khách cũ</label><input class="input" type="text" inputmode="numeric" data-number-format name="customer_old_count" value="${money(data.customer_old_count || 0)}"></div><div class="field"><label>Lượt khách tổng</label><input class="input readonly" type="text" inputmode="numeric" data-number-format name="customer_count" value="${money(customerTotalValue(data.customer_new_count || 0, data.customer_old_count || 0, data.customer_count || 0))}" readonly></div></div><p class="hint">Lưu báo cáo ngày sẽ tự cập nhật vào Doanh thu tháng, tự chuyển thiếu size sang Order hàng và chuyển lỗi/feedback khách sang Đánh giá sản phẩm.</p></div>
    <div class="card daily-situation-card" style="margin-top:16px"><div class="section-title"><h3>Tình hình cửa hàng</h3><span class="badge ok">Theo ca</span></div><div class="grid two daily-situation-grid"><div class="field"><label>Ca sáng</label><textarea class="input daily-situation-input" name="store_situation_morning" placeholder="VD: TF sáng, khách hỏi size, tình trạng sàn..." ${canEdit ? '' : 'disabled'}>${esc(data.store_situation_morning || '')}</textarea></div><div class="field"><label>Ca tối</label><textarea class="input daily-situation-input" name="store_situation_evening" placeholder="VD: TF tối, thời tiết, khách phản hồi..." ${canEdit ? '' : 'disabled'}>${esc(data.store_situation_evening || '')}</textarea></div></div></div>
    <div class="card" style="margin-top:16px"><div class="section-title"><h3>1. Doanh thu & chỉ số trong ngày</h3><span class="badge">Tự về báo cáo tháng</span></div><div class="table-wrap revenue-sticky-name daily-report-table-wrap"><table><thead><tr><th>Nhân viên</th><th>Doanh thu</th><th>Số bill</th><th>Số món</th><th>Ghi chú</th></tr></thead><tbody>${salesRows}</tbody></table></div></div>
    <div class="card" style="margin-top:16px"><div class="section-title"><h3>2. Sản phẩm thiếu size / cần order</h3><span class="badge warn">Tự chuyển Order hàng</span></div><div class="table-wrap daily-report-table-wrap"><table><thead><tr><th>SKU</th><th>Tên sản phẩm</th><th>Size thiếu</th><th>SL cần order</th><th>Ghi chú</th></tr></thead><tbody id="dailyMissingBody">${dailyMissingRows(data.missing_size_items || [], 2)}</tbody></table></div><button type="button" class="btn secondary small" id="dailyAddMissingBtn" style="margin-top:10px">Thêm dòng thiếu size</button></div>
    <div class="card" style="margin-top:16px"><div class="section-title"><h3>3. Sản phẩm lỗi / feedback từ khách</h3><span class="badge">Tự chuyển Feedback SP</span></div><div class="table-wrap daily-report-table-wrap"><table><thead><tr><th>SKU</th><th>Tên sản phẩm</th><th>Sản phẩm lỗi</th><th>Feedback khách</th><th>Ghi chú</th></tr></thead><tbody id="dailyFeedbackBody">${dailyFeedbackRows(data.product_feedback_items || [], 2)}</tbody></table></div><button type="button" class="btn secondary small" id="dailyAddFeedbackBtn" style="margin-top:10px">Thêm dòng feedback</button></div>
    ${canEdit ? '<div style="margin-top:16px"><button class="btn daily-save-btn">Lưu báo cáo ngày</button></div>' : '<div class="empty" style="margin-top:16px">Tài khoản này chỉ được xem báo cáo ngày.</div>'}
  </form>`;
  shell(`${form}${dailyReportOverviewBox(data)}`, 'Báo cáo ngày', `Nhập báo cáo ngày ${dOnly(data.report_date || reportDate)} - ${esc(data.store_name || '')}`);
  attachCustomerTotalSync($('#dailyReportForm'));
  $('#dailyReportDateFilter')?.addEventListener('change', e => { state.dailyReportDate = e.target.value; renderDailyReport(); });
  $('#dailyReportStoreFilter')?.addEventListener('change', e => { state.dailyReportStoreId = e.target.value; renderDailyReport(); });
  $('#dailyAddMissingBtn')?.addEventListener('click', () => { $('#dailyMissingBody')?.insertAdjacentHTML('beforeend', dailyMissingRows([{}], 0)); setupNumberFormat($('#dailyMissingBody')); });
  $('#dailyAddFeedbackBtn')?.addEventListener('click', () => { $('#dailyFeedbackBody')?.insertAdjacentHTML('beforeend', dailyFeedbackRows([{}], 0)); });
  $('#dailyReportForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const sales_entries = $$('.daily-sales-row', e.target).map(row => ({
      user_id: Number(row.dataset.user),
      revenue: cleanNumberInput($('.daily-sale-revenue', row)?.value),
      bill_count: cleanNumberInput($('.daily-sale-bill', row)?.value),
      item_count: cleanNumberInput($('.daily-sale-item', row)?.value),
      note: $('.daily-sale-note', row)?.value || ''
    }));
    const missing_size_items = $$('.daily-missing-row', e.target).map(row => {
      const sizes = $$('.daily-missing-size', row).map(inp => inp.value.trim()).filter(Boolean);
      return {
        sku: $('.daily-missing-sku', row)?.value || '',
        product_name: $('.daily-missing-name', row)?.value || '',
        size: sizes.join(', '),
        sizes,
        quantity: cleanNumberInput($('.daily-missing-qty', row)?.value),
        note: $('.daily-missing-note', row)?.value || ''
      };
    }).filter(x => (x.sku || x.product_name) && x.quantity);
    const product_feedback_items = $$('.daily-feedback-row', e.target).map(row => ({
      sku: $('.daily-feedback-sku', row)?.value || '',
      product_name: $('.daily-feedback-name', row)?.value || '',
      product_errors: $('.daily-feedback-error', row)?.value || '',
      customer_feedback: $('.daily-feedback-customer', row)?.value || '',
      note: $('.daily-feedback-note', row)?.value || ''
    })).filter(x => x.sku || x.product_name || x.product_errors || x.customer_feedback);
    const morningSituation = fd.get('store_situation_morning') || '';
    const eveningSituation = fd.get('store_situation_evening') || '';
    const payload = { store_id: fd.get('store_id') || data.store_id, report_date: fd.get('report_date'), customer_new_count: cleanNumberInput(fd.get('customer_new_count')), customer_old_count: cleanNumberInput(fd.get('customer_old_count')), customer_count: cleanNumberInput(fd.get('customer_count')), store_situation_morning: morningSituation, store_situation_evening: eveningSituation, store_note: [morningSituation ? `Ca sáng: ${morningSituation}` : '', eveningSituation ? `Ca tối: ${eveningSituation}` : ''].filter(Boolean).join('\n'), sales_entries, missing_size_items, product_feedback_items };
    try {
      const res = await api('/api/daily-report', { method:'POST', body: JSON.stringify(payload) });
      toast(`Đã lưu báo cáo ngày • Order ${res.order_count || 0} • Feedback ${res.feedback_count || 0}`);
      state.dailyReportDate = payload.report_date;
      renderDailyReport();
    } catch (err) { toast(err.message, 'danger'); }
  });
}

async function renderWeeklyReport() {
  const defaultStoreId = isAllStoreUser() ? (state.weeklyStoreId || state.boot.stores[0]?.id || '') : state.user.store_id;
  state.weeklyStoreId = defaultStoreId;
  const weekStart = state.weeklyWeekStart || mondayOf(new Date().toISOString().slice(0, 10));
  state.weeklyWeekStart = weekStart;
  const weeklyUserStatus = state.weeklyUserStatus || 'active';
  const data = await api(`/api/weekly-report?week_start=${encodeURIComponent(weekStart)}${defaultStoreId ? `&store_id=${encodeURIComponent(defaultStoreId)}` : ''}&user_status=${encodeURIComponent(weeklyUserStatus)}`);
  state.weeklyWeekStart = data.week_start || weekStart;
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(data.store_id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const storeFilter = isAllStoreUser() ? `<div class="field"><label>Cửa hàng</label><select class="input" id="weeklyStoreFilter">${storeOptions}</select></div>` : '';
  const weeklyStatusFilter = `<div class="field"><label>Nhân sự hiển thị</label><select class="input" id="weeklyUserStatusFilter"><option value="active" ${weeklyUserStatus === 'active' ? 'selected' : ''}>Nhân sự đang làm</option><option value="inactive" ${weeklyUserStatus === 'inactive' ? 'selected' : ''}>Nhân sự đã nghỉ</option><option value="all" ${weeklyUserStatus === 'all' ? 'selected' : ''}>Tất cả nhân sự</option></select></div>`;
  const t = data.totals || {};
  const kpis = `<section class="grid four dash-kpis weekly-kpis"><div class="card kpi weekly-kpi weekly-revenue"><div class="label">Doanh thu tuần</div><div class="num">${money(t.revenue || 0)}đ</div><div class="hint">Target tuần: ${money(t.target_revenue || 0)}đ • ${percentBadge(t.achievement_percent || 0)}</div></div><div class="card kpi weekly-kpi weekly-bill"><div class="label">Bill / Món</div><div class="num">${money(t.bill_count || 0)} / ${money(t.item_count || 0)}</div><div class="hint">Tổng toàn cửa hàng</div></div><div class="card kpi weekly-kpi weekly-upt"><div class="label">UPT</div><div class="num">${fmt2(t.upt || 0)}</div><div class="hint">Số món / bill</div></div><div class="card kpi weekly-kpi weekly-atv"><div class="label">ATV</div><div class="num">${money(t.atv || 0)}đ</div><div class="hint">Doanh thu / bill</div></div><div class="card kpi weekly-kpi weekly-asp"><div class="label">ASP</div><div class="num">${money(t.asp || 0)}đ</div><div class="hint">Doanh thu / số món</div></div><div class="card kpi weekly-kpi weekly-cr"><div class="label">CR</div><div class="num">${fmt2(t.cr || 0)}%</div><div class="hint">Bill / lượt khách</div></div><div class="card kpi weekly-kpi weekly-customer"><div class="label">Khách mới / cũ</div><div class="num">${money(t.customer_new_count || 0)} / ${money(t.customer_old_count || 0)}</div><div class="hint">Theo TF cửa hàng</div></div><div class="card kpi weekly-kpi weekly-customer"><div class="label">Lượt khách tổng</div><div class="num">${money(t.customer_count || 0)}</div><div class="hint">Khách mới + khách cũ</div></div></section>`;
  const feedback = data.feedback || {};
  const hasWeeklyExtra = !!((feedback.top_products || data.top_products || []).length || (feedback.promotions || data.promotions || []).length);
  const hasFeedback = !!(feedback.id || feedback.feedback || feedback.issues || feedback.action_plan || feedback.note || hasWeeklyExtra);
  const canEditFeedback = can('can_manage_weekly_report');
  const weeklyProducts = feedback.top_products || data.top_products || [];
  const weeklyPromotions = feedback.promotions || data.promotions || [];
  const feedbackView = `<div class="card weekly-feedback-card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Feedback tuần</h3>${canEditFeedback ? `<button class="btn secondary" id="weeklyEditFeedbackBtn">Sửa feedback</button>` : ''}</div>${hasFeedback ? `<div class="weekly-feedback-view"><div class="weekly-feedback-block"><b>Nhận xét tuần</b><div class="weekly-feedback-content">${esc(feedback.feedback || 'Chưa nhập')}</div></div><div class="weekly-feedback-block"><b>Vấn đề phát sinh</b><div class="weekly-feedback-content">${esc(feedback.issues || 'Chưa nhập')}</div></div><div class="weekly-feedback-block"><b>Việc cần làm tuần tới</b><div class="weekly-feedback-content">${esc(feedback.action_plan || 'Chưa nhập')}</div></div><div class="weekly-feedback-block"><b>Feedback sản phẩm</b><div class="weekly-feedback-content">${esc(feedback.note || 'Chưa nhập')}</div></div></div>` : '<div class="empty">Chưa lưu feedback tuần này. Bấm <b>Sửa feedback</b> để nhập/cập nhật.</div>'}</div>
    <section class="weekly-extra-grid weekly-extra-grid-vertical" style="margin-top:16px"><div class="card"><h3>Top 5 sản phẩm bán chạy</h3>${tableWeeklyProducts(weeklyProducts)}</div><div class="card"><h3>Tổng hợp bill CTKM</h3>${tableWeeklyPromotions(weeklyPromotions)}</div></section>`;
  const feedbackForm = canEditFeedback ? `<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">${hasFeedback ? 'Sửa feedback tuần' : 'Nhập feedback tuần'}</h3><button type="button" class="btn secondary" id="weeklyCancelFeedbackBtn">Hủy sửa</button></div><form id="weeklyFeedbackForm" class="weekly-feedback-form-vertical"><input type="hidden" name="store_id" value="${esc(data.store_id)}"><input type="hidden" name="week_start" value="${esc(data.week_start)}"><div class="field" style="grid-column:1/-1"><label>Nhận xét/feedback tuần này</label><textarea name="feedback" data-auto-resize placeholder="VD: TF tăng cuối tuần, khách hỏi nhiều size L/XL...">${esc(feedback.feedback || '')}</textarea></div><div class="field"><label>Vấn đề phát sinh</label><textarea name="issues" data-auto-resize placeholder="VD: Thiếu size, khách chê chất liệu, nhân sự thiếu ca...">${esc(feedback.issues || '')}</textarea></div><div class="field"><label>Việc cần làm tuần tới</label><textarea name="action_plan" data-auto-resize placeholder="VD: Đẩy combo, bổ sung hàng, đào tạo lại UPT...">${esc(feedback.action_plan || '')}</textarea></div><div class="field" style="grid-column:1/-1"><label>Feedback sản phẩm</label><textarea name="note" data-auto-resize placeholder="VD: khách thích/chê chất liệu, form, màu, size; sản phẩm cần theo dõi...">${esc(feedback.note || '')}</textarea></div><div class="field weekly-product-input-section"><label>Top 5 sản phẩm bán chạy</label><div class="weekly-product-form-list">${weeklyProductInputRows(weeklyProducts)}</div></div><div class="field" style="grid-column:1/-1"><label>Bill chạy CTKM</label><div class="row" style="margin-bottom:8px"><button type="button" class="btn secondary small" id="weeklyAddPromoBtn">Thêm CTKM</button><span class="hint">VD: Mua 3 giảm 5%, Mua 5 giảm 10%</span></div><div class="table-wrap"><table class="weekly-extra-input-table"><thead><tr><th>Tên CTKM</th><th>Số bill tham gia</th><th>Ghi chú</th></tr></thead><tbody id="weeklyPromoRows">${weeklyPromotionInputRows(weeklyPromotions)}</tbody></table></div></div><div style="grid-column:1/-1"><button class="btn">Lưu báo cáo tuần</button></div></form></div>` : '';
  const feedbackSection = canEditFeedback && state.weeklyEditMode ? feedbackForm : feedbackView;
  shell(`<div class="card"><div class="toolbar"><div class="field"><label>Chọn ngày trong tuần</label><input class="input" id="weeklyDateFilter" type="date" value="${esc(data.week_start)}"></div>${storeFilter}${weeklyStatusFilter}<div class="field"><label>Tuần đang xem</label><div class="input readonly">${dOnly(data.week_start)} - ${dOnly(data.week_end)}</div></div><div style="align-self:end">${can('can_export') ? '<button class="btn secondary" id="weeklyExportBtn">Tải CSV báo cáo tuần</button>' : ''}</div></div><p class="hint">Chọn bất kỳ ngày trong tuần, hệ thống tự gom từ T2 đến CN. Lưu báo cáo xong sẽ hiện dạng bảng, bấm Sửa feedback để chỉnh lại.</p></div>${kpis}<section class="grid two" style="margin-top:16px"><div class="card"><h3>Doanh thu theo ngày</h3>${tableWeeklyDays(data.days || [])}</div><div class="card"><h3>Doanh thu cá nhân</h3>${tableWeeklyEmployees(data.employees || [])}</div></section>${feedbackSection}`, 'Báo cáo tuần', `Tổng hợp tuần ${dOnly(data.week_start)} - ${dOnly(data.week_end)}`);
  setupAutoResizeTextareas($('#weeklyFeedbackForm'));
  $('#weeklyDateFilter')?.addEventListener('change', e => { state.weeklyWeekStart = mondayOf(e.target.value); renderWeeklyReport(); });
  $('#weeklyStoreFilter')?.addEventListener('change', e => { state.weeklyStoreId = e.target.value; state.weeklyEditMode = false; renderWeeklyReport(); });
  $('#weeklyUserStatusFilter')?.addEventListener('change', e => { state.weeklyUserStatus = e.target.value; localStorage.setItem('dezus_ops_weekly_user_status', state.weeklyUserStatus); renderWeeklyReport(); });
  $('#weeklyEditFeedbackBtn')?.addEventListener('click', () => { state.weeklyEditMode = true; renderWeeklyReport(); });
  $('#weeklyCancelFeedbackBtn')?.addEventListener('click', () => { state.weeklyEditMode = false; renderWeeklyReport(); });
  $('#weeklyExportBtn')?.addEventListener('click', downloadWeeklyReport);
  $('#weeklyAddPromoBtn')?.addEventListener('click', () => {
    const body = $('#weeklyPromoRows');
    if (!body) return;
    body.insertAdjacentHTML('beforeend', `<tr class="weekly-promo-row"><td><input class="input weekly-promo-name" placeholder="VD: Mua 3 giảm 5%"></td><td><input class="input weekly-promo-bill" type="text" inputmode="numeric" data-number-format value="0"></td><td><input class="input weekly-promo-note" placeholder="Ghi chú"><button type="button" class="btn ghost small weeklyRemovePromoBtn" style="margin-left:6px">Xóa</button></td></tr>`);
    setupNumberFormat(body);
  });
  $('#weeklyFeedbackForm')?.addEventListener('click', ev => {
    if (!ev.target?.classList?.contains('weeklyRemovePromoBtn')) return;
    ev.preventDefault();
    ev.target.closest('tr')?.remove();
  });
  $('#weeklyFeedbackForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target));
    payload.top_products = $$('.weekly-product-row', e.target).map(row => ({
      name: $('.weekly-product-name', row)?.value || '',
      sku: '',
      quantity: cleanNumberInput($('.weekly-product-qty', row)?.value),
      bill_count: 0,
      note: $('.weekly-product-note', row)?.value || ''
    })).filter(x => x.name || cleanNumberInput(x.quantity)).slice(0,5);
    payload.promotions = $$('.weekly-promo-row', e.target).map(row => ({
      name: $('.weekly-promo-name', row)?.value || '',
      bill_count: cleanNumberInput($('.weekly-promo-bill', row)?.value),
      note: $('.weekly-promo-note', row)?.value || ''
    })).filter(x => x.name || cleanNumberInput(x.bill_count));
    try { await api('/api/weekly-report', { method: 'POST', body: JSON.stringify(payload) }); toast('Đã lưu báo cáo tuần'); state.weeklyEditMode = false; renderWeeklyReport(); } catch (err) { toast(err.message, 'danger'); }
  });
}

async function renderTasks() {
  const data = await api('/api/tasks');
  const tasks = data.tasks;
  state.taskRows = tasks;
  let shiftData = { shifts: [] };
  if (can('can_assign_tasks')) {
    try { shiftData = await api('/api/shifts'); } catch (_err) { shiftData = { shifts: [] }; }
  }
  const shifts = shiftData.shifts || [];
  const userStoreIds = Array.isArray(state.user.store_ids) && state.user.store_ids.length ? state.user.store_ids.map(Number) : (state.user.store_id ? [Number(state.user.store_id)] : []);
  const allowedStores = isAllStoreUser() ? state.boot.stores : state.boot.stores.filter(s => userStoreIds.includes(Number(s.id)));
  const storeId = allowedStores[0]?.id || state.user.store_id || state.boot.stores[0]?.id || '';
  const storeOptions = allowedStores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(storeId) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const shiftOptions = shifts.map(sh => `<option value="${sh.id}">${esc(sh.code || sh.name)} • ${esc(sh.start_time || '')}-${esc(sh.end_time || '')}</option>`).join('');
  const taskUserPicker = (id, users, hint = '') => `<div class="task-user-picker" id="${id}" role="group" aria-label="Chọn nhân viên">${users.map(u => `<label class="task-user-option"><input type="checkbox" value="${u.id}"><span class="task-user-dot" aria-hidden="true"></span><span class="task-user-info"><b>${esc(u.full_name)}</b><small>${esc(u.store_name || '')}</small></span></label>`).join('') || '<div class="empty compact">Chưa có nhân viên trong cửa hàng này</div>'}</div>${hint ? `<span class="hint">${hint}</span>` : ''}`;
  const assignForm = can('can_assign_tasks') ? `
    <div class="card task-create-card"><div class="section-title"><h3>Giao việc mới</h3><span class="badge">Chọn loại trước</span></div>
      <form id="taskForm" class="task-advanced-form">
        <input type="hidden" name="task_mode" id="taskMode" value="single">
        <div class="task-mode-chooser" role="tablist" aria-label="Chọn cách giao việc">
          <button type="button" class="taskModeBtn active" data-mode="single"><b>⏱</b><span>Thời gian cụ thể</span><small>Giao một lần theo hạn ngày/giờ</small></button>
          <button type="button" class="taskModeBtn" data-mode="multi"><b>🔁</b><span>Việc lặp lại</span><small>Tự tạo việc theo nhiều ngày</small></button>
          <button type="button" class="taskModeBtn" data-mode="shift"><b>🗓</b><span>Theo ca làm</span><small>Lấy nhân viên theo ca đã xếp</small></button>
        </div>

        <div class="grid two task-basic-grid">
          <div class="field"><label>Tiêu đề công việc</label><input class="input" name="title" required placeholder="VD: Kiểm tra VM đầu ca"></div>
          <div class="field"><label>Cửa hàng</label><select name="store_id" id="taskStore" ${allowedStores.length <= 1 ? 'disabled' : ''}>${storeOptions}</select></div>
          <div class="field"><label>Mức độ</label><select name="priority"><option value="low">Thấp</option><option value="medium" selected>Trung bình</option><option value="high">Cao</option></select></div>
          <div class="field"><label>Điểm trừ nếu trễ</label><input class="input" name="score_value" type="number" value="10" min="0" max="100"></div>
        </div>

        <div class="task-mode-panel active" data-task-panel="single">
          <div class="grid two">
            <div class="field"><label>Hạn hoàn thành cụ thể</label><input class="input" name="due_at" type="datetime-local"><span class="hint">Dùng cho việc giao 1 lần.</span></div>
            <div class="field"><label>Nhân viên nhận việc</label>${taskUserPicker('assigneeSelect', usersInStore(storeId), 'Tick tròn để chọn 1 hoặc nhiều nhân viên.')}</div>
          </div>
        </div>

        <div class="task-mode-panel" data-task-panel="multi">
          <div class="grid three">
            <div class="field"><label>Từ ngày</label><input class="input" name="multi_start_date" type="date"></div>
            <div class="field"><label>Đến ngày</label><input class="input" name="multi_end_date" type="date"></div>
            <div class="field"><label>Hạn hoàn thành mỗi ngày</label><input class="input" name="multi_due_time" type="time" value="22:00"></div>
            <div class="field"><label>Kiểu giao cố định</label><select name="multi_repeat_mode" class="taskRepeatMode"><option value="daily">Hàng ngày trong khoảng ngày</option><option value="weekly2">2 ngày / tuần</option><option value="weekly3">3 ngày / tuần</option><option value="custom_weekdays">Tự chọn thứ trong tuần</option><option value="every_n_days">Lặp mỗi N ngày</option></select><span class="hint">Khoảng ngày là thời gian áp dụng; chọn thứ để hệ thống tự tạo đúng ngày.</span></div>
            <div class="field taskEveryNDaysField"><label>N ngày/lần</label><select name="multi_repeat_every_days"><option value="1">1 ngày/lần</option><option value="2">2 ngày/lần</option><option value="3">3 ngày/lần</option><option value="7">7 ngày/lần</option></select></div>
            <div class="field taskWeekdayField" style="grid-column:span 2"><label>Chọn thứ giao việc</label><div class="task-weekday-picker" id="multiWeekdays"><label><input type="checkbox" value="1"><span>T2</span></label><label><input type="checkbox" value="2"><span>T3</span></label><label><input type="checkbox" value="3"><span>T4</span></label><label><input type="checkbox" value="4"><span>T5</span></label><label><input type="checkbox" value="5"><span>T6</span></label><label><input type="checkbox" value="6"><span>T7</span></label><label><input type="checkbox" value="0"><span>CN</span></label></div><span class="hint taskWeekdayHint">VD 2 ngày/tuần: chọn T3 và T6. 3 ngày/tuần: chọn T2, T4, T6.</span></div>
            <div class="field" style="grid-column:span 2"><label>Nhân viên nhận việc</label>${taskUserPicker('multiAssigneeSelect', usersInStore(storeId), 'Tick tròn để chọn người nhận việc lặp lại.')}</div>
          </div>
        </div>

        <div class="task-mode-panel" data-task-panel="shift">
          <div class="grid three">
            <div class="field"><label>Từ ngày</label><input class="input" name="shift_start_date" type="date"></div>
            <div class="field"><label>Đến ngày</label><input class="input" name="shift_end_date" type="date"></div>
            <div class="field"><label>Hạn hoàn thành mỗi ngày</label><input class="input" name="shift_due_time" type="time" value="22:00"></div>
            <div class="field"><label>Kiểu giao cố định</label><select name="shift_repeat_mode" class="taskRepeatMode"><option value="daily">Hàng ngày trong khoảng ngày</option><option value="weekly2">2 ngày / tuần</option><option value="weekly3">3 ngày / tuần</option><option value="custom_weekdays">Tự chọn thứ trong tuần</option><option value="every_n_days">Lặp mỗi N ngày</option></select><span class="hint">Khoảng ngày là thời gian áp dụng; chọn thứ để hệ thống tự tạo đúng ngày.</span></div>
            <div class="field taskEveryNDaysField"><label>N ngày/lần</label><select name="shift_repeat_every_days"><option value="1">1 ngày/lần</option><option value="2">2 ngày/lần</option><option value="3">3 ngày/lần</option><option value="7">7 ngày/lần</option></select></div>
            <div class="field taskWeekdayField"><label>Chọn thứ giao việc</label><div class="task-weekday-picker" id="shiftWeekdays"><label><input type="checkbox" value="1"><span>T2</span></label><label><input type="checkbox" value="2"><span>T3</span></label><label><input type="checkbox" value="3"><span>T4</span></label><label><input type="checkbox" value="4"><span>T5</span></label><label><input type="checkbox" value="5"><span>T6</span></label><label><input type="checkbox" value="6"><span>T7</span></label><label><input type="checkbox" value="0"><span>CN</span></label></div><span class="hint taskWeekdayHint">Chỉ tạo việc vào các thứ được chọn và lấy nhân viên đúng ca ngày đó.</span></div>
            <div class="field"><label>Chọn ca</label><select name="shift_ids" id="taskShiftSelect" multiple size="5">${shiftOptions}</select><span class="hint">Hệ thống tự lấy nhân viên đã được phân lịch ca đó. Nếu đổi ca trong tương lai, công việc theo ca sẽ tự chuyển sang đúng người mới; ngày quá khứ giữ nguyên.</span></div>
            <div class="field"><label>Thêm nhân viên thủ công nếu cần</label>${taskUserPicker('shiftAssigneeSelect', usersInStore(storeId), 'Có thể để trống nếu chỉ giao theo ca.')}</div>
          </div>
        </div>

        <div class="field" style="margin-top:12px"><label>Mô tả / yêu cầu</label><textarea name="description" placeholder="Nội dung, tiêu chuẩn hoàn thành, chứng từ cần đính kèm..."></textarea></div>
        <div class="task-submit-row"><button class="btn">Tạo & giao việc</button></div>
      </form>
    </div>` : '';
  const todayKey = new Date().toISOString().slice(0, 10);
  const taskDayKey = (t) => String(t.task_date || (t.due_at || '').slice(0, 10) || '');
  const todayTasks = tasks.filter(t => taskDayKey(t) === todayKey || String(t.due_at || '').slice(0, 10) === todayKey);
  const otherTasks = tasks.filter(t => !todayTasks.some(x => Number(x.assignment_id) === Number(t.assignment_id)));
  const todayBlock = todayTasks.length ? `<div class="card task-today-wrap" style="margin-top:16px"><div class="toolbar"><div><p class="eyebrow">Hạn hôm nay / việc trong ngày</p><h3>${todayTasks.length} công việc cần nhìn ngay hôm nay</h3></div></div><div class="grid">${todayTasks.map(t => taskCard(t)).join('')}</div></div>` : '';
  const grouped = otherTasks.map(t => taskCard(t)).join('') || '<div class="empty">Không còn công việc khác</div>';
  shell(`${assignForm}${todayBlock}<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Danh sách công việc theo ngày gần nhất</h3>${can('can_export') ? '<button class="btn secondary" data-export="tasks">Tải CSV</button>' : ''}</div><p class="hint">Hệ thống tự đưa công việc hôm nay lên đầu, sau đó tới các ngày gần nhất sắp tới. Việc theo ca sẽ tự cập nhật theo lịch ca tương lai khi đổi ca.</p><div class="grid">${grouped}</div></div>`, 'Công việc', 'Giao việc 1 lần, giao nhiều ngày, giao theo ca hoặc nhiều nhân viên cùng lúc');
  function refreshTaskAssignees(storeValue) {
    const users = usersInStore(storeValue);
    const renderOptions = () => users.map(u => `<label class="task-user-option"><input type="checkbox" value="${u.id}"><span class="task-user-dot" aria-hidden="true"></span><span class="task-user-info"><b>${esc(u.full_name)}</b><small>${esc(u.store_name || '')}</small></span></label>`).join('') || '<div class="empty compact">Chưa có nhân viên trong cửa hàng này</div>';
    ['assigneeSelect', 'multiAssigneeSelect', 'shiftAssigneeSelect'].forEach(id => { const el = $('#' + id); if (el) el.innerHTML = renderOptions(); });
  }
  function setTaskMode(mode) {
    const input = $('#taskMode');
    if (!input) return;
    input.value = mode;
    $$('.taskModeBtn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    $$('.task-mode-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.taskPanel === mode));
  }
  $('#taskStore')?.addEventListener('change', e => refreshTaskAssignees(e.target.value));
  $$('.taskModeBtn').forEach(btn => btn.addEventListener('click', () => setTaskMode(btn.dataset.mode)));
  setTaskMode($('#taskMode')?.value || 'single');
  function selectedWeekdaysFrom(id) {
    const box = $('#' + id);
    return box ? $$('input[type="checkbox"]:checked', box).map(o => Number(o.value)).filter(v => Number.isFinite(v)) : [];
  }
  function updateTaskRepeatUi() {
    $$('.task-mode-panel').forEach(panel => {
      const modeSelect = $('.taskRepeatMode', panel);
      if (!modeSelect) return;
      const value = modeSelect.value;
      const weekdayField = $('.taskWeekdayField', panel);
      const everyField = $('.taskEveryNDaysField', panel);
      if (weekdayField) weekdayField.style.display = ['weekly2','weekly3','custom_weekdays'].includes(value) ? '' : 'none';
      if (everyField) everyField.style.display = value === 'every_n_days' ? '' : 'none';
    });
  }
  $$('.taskRepeatMode').forEach(sel => sel.addEventListener('change', updateTaskRepeatUi));
  updateTaskRepeatUi();
  $('#taskForm')?.addEventListener('submit', submitTask);
  $$('.completeForm').forEach(f => f.addEventListener('submit', submitCompleteTask));
  $$('.editTaskBtn').forEach(btn => btn.addEventListener('click', openTaskEditor));
  $$('.deleteTaskBtn').forEach(btn => btn.addEventListener('click', deleteTask));
}

async function deleteTask(e) {
  const btn = e.currentTarget;
  const title = btn.dataset.taskTitle || 'công việc này';
  if (!confirm(`Xóa toàn bộ công việc \"${title}\" và tất cả người được giao? Thao tác này không thể hoàn tác.`)) return;
  btn.disabled = true;
  try {
    await api(`/api/tasks/${btn.dataset.taskId}`, { method: 'DELETE' });
    toast('Đã xóa công việc');
    renderTasks();
  } catch (err) {
    btn.disabled = false;
    toast(err.message, 'danger');
  }
}

function taskCard(t) {
  const canComplete = (Number(t.assignee_id) === Number(state.user.id) || state.user.role !== 'employee') && !t.completed_at;
  const todayKey = new Date().toISOString().slice(0, 10);
  const dueDay = String(t.due_at || '').slice(0, 10);
  const workDay = String(t.task_date || dueDay || '');
  const isToday = dueDay === todayKey || workDay === todayKey || Number(t.is_today || 0) === 1;
  const isLate = !t.completed_at && t.due_at && new Date(t.due_at).getTime() < Date.now();
  const priorityLabel = t.priority === 'high' ? 'Cao' : (t.priority === 'low' ? 'Thấp' : 'Trung bình');
  const priorityIcon = t.priority === 'high' ? '!' : (t.priority === 'low' ? '↓' : '•');
  const todayBadges = isToday ? `<span class="badge warning">${dueDay === todayKey ? 'Hạn hôm nay' : 'Việc hôm nay'}</span>` : '';
  const lateBadge = isLate ? '<span class="badge danger">Đã quá hạn</span>' : '';
  const shiftSyncBadge = t.shift_ids && t.shift_ids.length ? '<span class="badge dark">Theo ca</span>' : '';
  return `<article class="card task-card ${isToday ? 'task-card-today' : ''} ${isLate ? 'task-card-late' : ''}">
    <div class="task-card-topline">
      <div class="task-badge-row">${todayBadges}${lateBadge}${shiftSyncBadge}<span class="task-priority priority-${esc(t.priority || 'medium')}"><b>${priorityIcon}</b> ${priorityLabel}</span></div>
      ${statusBadge(t.status)}
    </div>
    <div class="task-card-main">
      <div class="task-title-block"><h4>${esc(t.title)}</h4>${t.description ? `<p class="task-description">${esc(t.description)}</p>` : ''}</div>
      <div class="task-info-grid">
        <div class="task-info-item"><span>Cửa hàng</span><b>${esc(t.store_name || '-')}</b></div>
        <div class="task-info-item"><span>Người nhận</span><b>${esc(t.assignee_name || '-')}</b></div>
        ${t.task_date ? `<div class="task-info-item"><span>Ngày việc</span><b>${dOnly(t.task_date)}</b></div>` : ''}
        <div class="task-info-item task-due-item"><span>Hạn hoàn thành</span><b>${dt(t.due_at)}</b></div>
        ${t.shift_label ? `<div class="task-info-item"><span>Ca</span><b>${esc(t.shift_label)}</b></div>` : ''}
        <div class="task-info-item"><span>Điểm trừ</span><b>${Number(t.score_value || 0)} điểm</b></div>
      </div>
      ${t.recurrence_label ? `<div class="task-repeat-note">↻ ${esc(t.recurrence_label)}</div>` : ''}
      ${t.evidence_path ? `<div class="task-evidence"><b>Chứng từ đã nộp</b><div>${renderFiles(t.evidence_path)} ${t.evidence_note ? `• ${esc(t.evidence_note)}` : ''}</div></div>` : ''}
    </div>
    ${canComplete ? `<form class="completeForm task-complete-form" data-id="${t.assignment_id}" enctype="multipart/form-data"><input class="input" name="note" placeholder="Ghi chú hoàn thành"><input class="input" name="evidence" type="file" accept="image/*,.pdf,.xlsx,.docx" multiple><input class="input" name="evidence_link" placeholder="Link Drive nếu file lớn"><button class="btn small">Hoàn thành</button></form>` : ''}
    ${(can('can_edit_tasks') || state.user.role === 'admin') ? `<div class="task-admin-actions"><button type="button" class="btn secondary small editTaskBtn" data-task-id="${t.id}">Sửa công việc</button>${state.user.role === 'admin' ? `<button type="button" class="btn danger small deleteTaskBtn" data-task-id="${t.id}" data-task-title="${esc(t.title)}">Xóa công việc</button>` : ''}</div>` : ''}
  </article>`;
}

function closeTaskEditor() {
  document.querySelector('.task-edit-overlay')?.remove();
}

function openTaskEditor(e) {
  const taskId = Number(e.currentTarget.dataset.taskId);
  const rows = (state.taskRows || []).filter(x => Number(x.id) === taskId);
  const t = rows[0];
  if (!t) return toast('Không tìm thấy công việc', 'danger');
  const storeUsers = (state.users || []).filter(u => Number(u.active ?? 1) === 1 && u.role !== 'admin' && Number(u.store_id) === Number(t.store_id));
  const selectedIds = new Set(rows.map(x => Number(x.assignee_id)));
  const dueLocal = String(t.due_at || '').slice(0, 16);
  const overlay = document.createElement('div');
  overlay.className = 'task-edit-overlay';
  overlay.innerHTML = `<div class="task-edit-modal card"><div class="toolbar"><div><p class="eyebrow">Chỉnh sửa công việc</p><h3>${esc(t.title)}</h3></div><button type="button" class="btn secondary small taskEditClose">Đóng</button></div>
    <form id="taskEditForm" data-id="${t.id}" class="task-advanced-form">
      <div class="grid two">
        <div class="field" style="grid-column:span 2"><label>Tiêu đề</label><input name="title" value="${esc(t.title)}" required></div>
        <div class="field" style="grid-column:span 2"><label>Nội dung / hướng dẫn</label><textarea name="description" rows="4">${esc(t.description || '')}</textarea></div>
        <div class="field"><label>Hạn hoàn thành</label><input type="datetime-local" name="due_at" value="${esc(dueLocal)}" required></div>
        <div class="field"><label>Mức ưu tiên</label><select name="priority"><option value="low" ${t.priority==='low'?'selected':''}>Thấp</option><option value="medium" ${!t.priority||t.priority==='medium'?'selected':''}>Trung bình</option><option value="high" ${t.priority==='high'?'selected':''}>Cao</option></select></div>
        <div class="field"><label>Điểm trừ khi trễ</label><input type="number" name="score_value" min="0" max="100" value="${Number(t.score_value || 10)}"></div>
        <div class="field"><label>Cửa hàng</label><input value="${esc(t.store_name || '')}" disabled></div>
        <div class="field" style="grid-column:span 2"><label>Người nhận việc</label><div class="task-user-picker">${storeUsers.map(u => `<label class="task-user-option"><input type="checkbox" name="assignee_ids" value="${u.id}" ${selectedIds.has(Number(u.id))?'checked':''}><span class="task-user-dot"></span><span class="task-user-info"><b>${esc(u.full_name)}</b><small>${esc(u.store_name || t.store_name || '')}</small></span></label>`).join('') || '<div class="empty compact">Chưa có nhân sự trong cửa hàng</div>'}</div><span class="hint">Lượt đã hoàn thành được giữ nguyên để bảo toàn minh chứng.</span></div>
      </div>
      <div class="task-submit-row"><button class="btn">Lưu thay đổi</button></div>
    </form></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.taskEditClose')?.addEventListener('click', closeTaskEditor);
  overlay.addEventListener('click', ev => { if (ev.target === overlay) closeTaskEditor(); });
  overlay.querySelector('#taskEditForm')?.addEventListener('submit', saveTaskEdit);
}

async function saveTaskEdit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const payload = Object.fromEntries(new FormData(form));
  payload.assignee_ids = [...form.querySelectorAll('input[name="assignee_ids"]:checked')].map(x => Number(x.value));
  if (!payload.assignee_ids.length) return toast('Vui lòng chọn ít nhất một người nhận việc', 'danger');
  button.disabled = true; button.textContent = 'Đang lưu...';
  try {
    await api(`/api/tasks/${form.dataset.id}`, { method:'PATCH', body:JSON.stringify(payload) });
    toast('Đã cập nhật công việc');
    closeTaskEditor();
    renderTasks();
  } catch (err) {
    toast(err.message, 'danger');
    button.disabled = false; button.textContent = 'Lưu thay đổi';
  }
}

async function submitTask(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd);
  const mode = payload.task_mode || 'single';
  payload.store_id = $('#taskStore')?.value || state.user.store_id;

  const selectedFrom = (id) => {
    const box = $('#' + id);
    if (!box) return [];
    const checked = $$('input[type="checkbox"]:checked', box).map(o => Number(o.value)).filter(Boolean);
    if (checked.length || box.matches('.task-user-picker')) return checked;
    return $$('#' + id + ' option:checked').map(o => Number(o.value)).filter(Boolean);
  };
  payload.shift_ids = [];

  if (mode === 'single') {
    payload.assignee_ids = selectedFrom('assigneeSelect');
    delete payload.start_date; delete payload.end_date; delete payload.due_time; delete payload.repeat_every_days;
  } else if (mode === 'multi') {
    payload.assignee_ids = selectedFrom('multiAssigneeSelect');
    payload.start_date = payload.multi_start_date;
    payload.end_date = payload.multi_end_date;
    payload.due_time = payload.multi_due_time || '22:00';
    payload.repeat_mode = payload.multi_repeat_mode || 'daily';
    payload.repeat_every_days = payload.multi_repeat_every_days || '1';
    payload.weekdays = ['weekly2','weekly3','custom_weekdays'].includes(payload.repeat_mode) ? selectedWeekdaysFrom('multiWeekdays') : [];
    delete payload.due_at;
  } else if (mode === 'shift') {
    payload.assignee_ids = selectedFrom('shiftAssigneeSelect');
    payload.shift_ids = selectedFrom('taskShiftSelect');
    payload.start_date = payload.shift_start_date;
    payload.end_date = payload.shift_end_date;
    payload.due_time = payload.shift_due_time || '22:00';
    payload.repeat_mode = payload.shift_repeat_mode || 'daily';
    payload.repeat_every_days = payload.shift_repeat_every_days || '1';
    payload.weekdays = ['weekly2','weekly3','custom_weekdays'].includes(payload.repeat_mode) ? selectedWeekdaysFrom('shiftWeekdays') : [];
    delete payload.due_at;
  }

  ['task_mode','multi_start_date','multi_end_date','multi_due_time','multi_repeat_mode','multi_repeat_every_days','shift_start_date','shift_end_date','shift_due_time','shift_repeat_mode','shift_repeat_every_days'].forEach(k => delete payload[k]);


  if (payload.repeat_mode === 'weekly2' && (!payload.weekdays || payload.weekdays.length !== 2)) return toast('Vui lòng chọn đúng 2 thứ trong tuần', 'danger');
  if (payload.repeat_mode === 'weekly3' && (!payload.weekdays || payload.weekdays.length !== 3)) return toast('Vui lòng chọn đúng 3 thứ trong tuần', 'danger');
  if (payload.repeat_mode === 'custom_weekdays' && (!payload.weekdays || !payload.weekdays.length)) return toast('Vui lòng chọn ít nhất 1 thứ trong tuần', 'danger');

  try {
    const res = await api('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
    const count = Number(res.created_assignments || 0);
    toast(count ? `Đã giao ${count} đầu việc cho nhân viên` : 'Đã giao việc thành công');
    renderTasks();
  } catch (err) { toast(err.message, 'danger'); }
}

async function submitCompleteTask(e) {
  e.preventDefault();
  const form = e.target;
  if (hasFileOverLimit(form)) return;
  const fd = new FormData(form);
  try { const res = await api(`/api/tasks/${form.dataset.id}/complete`, { method: 'POST', body: fd }); toast(res.status === 'completed_late' ? 'Hoàn thành nhưng đã trễ hạn, hệ thống tự trừ điểm' : 'Đã hoàn thành đúng hạn'); renderTasks(); } catch (err) { toast(err.message, 'danger'); }
}

async function renderViolations() {
  const data = await api('/api/violations');
  const catalog = Array.isArray(data.catalog) && data.catalog.length ? data.catalog : VIOLATION_CATALOG;
  const levelOptions = Object.entries(VIOLATION_LEVELS).map(([key, item]) => `<option value="${key}">${esc(item.label)} (-${item.points} điểm)</option>`).join('');
  const form = can('can_manage_violations') ? `
    <div class="card"><h3>Ghi nhận vi phạm theo SOP chế tài</h3>
      <form id="violationForm" class="grid two" enctype="multipart/form-data">
        <div class="field"><label>Nhân viên</label><select name="user_id" required>${usersInStore(isAllStoreUser() ? '' : state.user.store_id).map(u => `<option value="${u.id}">${esc(u.full_name)} - ${esc(u.store_name || '')}</option>`).join('')}</select></div>
        <div class="field"><label>Danh mục vi phạm</label><select name="violation_code" id="violationCode" required>${violationCatalogOptions(catalog)}</select></div>
        <div class="field"><label>Mức vi phạm</label><select name="violation_level" id="violationLevel" required>${levelOptions}</select><span class="hint">Hệ thống tự gợi ý theo SOP; có thể nâng mức khi tái phạm.</span></div>
        <div class="field"><label>Điểm trừ tương ứng</label><input class="input" id="violationPoints" name="points_deducted" value="1" readonly><span class="hint">Điểm được khóa theo mức vi phạm.</span></div>
        <div class="field"><label>Ảnh/chứng từ dưới 12MB</label><input class="input" type="file" name="evidence" accept="image/*,.pdf,.xlsx,.docx" multiple></div>
        <div class="field"><label>Link Google Drive</label><input class="input" name="evidence_link" placeholder="Dán link nếu file nặng / video"></div>
        <div class="field" style="grid-column:1/-1"><label>Nội dung vi phạm</label><textarea name="description" required placeholder="Mô tả thời gian, tình huống, bằng chứng, lần tái phạm và yêu cầu khắc phục"></textarea></div>
        <div style="grid-column:1/-1"><button class="btn danger">Lưu vi phạm</button></div>
      </form>
    </div>
    <div class="card" style="margin-top:16px"><details><summary><b>+ Thêm danh mục vi phạm mới</b></summary>
      <form id="violationCatalogForm" class="grid three" style="margin-top:14px">
        <div class="field"><label>Nhóm vi phạm</label><input class="input" name="group" required placeholder="VD: Dịch vụ & tác phong"></div>
        <div class="field"><label>Tên lỗi vi phạm</label><input class="input" name="name" required placeholder="Nhập nội dung lỗi"></div>
        <div class="field"><label>Mức mặc định</label><select name="level" required>${levelOptions}</select></div>
        <div style="grid-column:1/-1"><button class="btn secondary">Thêm vào danh mục</button></div>
      </form>
    </details></div>` : '';
  const actionHead = state.user?.role === 'admin' ? '<th>Thao tác</th>' : '';
  const list = data.violations.length ? `<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Nhân viên</th><th>Cửa hàng</th><th>Danh mục SOP</th><th>Mức xử lý</th><th>Điểm trừ</th><th>Nội dung</th><th>Chứng từ</th>${actionHead}</tr></thead><tbody>${data.violations.map(v => `<tr><td>${dt(v.created_at)}</td><td><b>${esc(v.employee_name)}</b></td><td>${esc(v.store_name || '')}</td><td><b>${esc(v.violation_code || '')}</b>${v.violation_group ? `<br><span class="hint">${esc(v.violation_group)}</span>` : ''}<br>${esc(v.violation_type)}</td><td><span class="badge danger">${esc(v.level_label || v.violation_level || 'Chưa phân mức')}</span></td><td><span class="badge danger">-${v.points_deducted}</span></td><td>${esc(v.description || '')}</td><td>${v.evidence_path ? renderFiles(v.evidence_path) : ''}</td>${state.user?.role === 'admin' ? `<td><button class="btn small danger violationDeleteBtn" data-id="${v.id}" type="button">Xóa</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có vi phạm</div>';
  shell(`${form}<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Danh sách vi phạm</h3>${can('can_export') ? '<button class="btn secondary" data-export="violations">Tải CSV</button>' : ''}</div>${list}</div>`, 'Vi phạm', 'Danh mục và mức xử lý theo SOP chế tài; nhân viên chỉ xem vi phạm của mình');
  const formEl = $('#violationForm');
  const syncViolation = (preferCatalog = false) => {
    if (!formEl) return;
    const item = catalog.find(x => x.code === $('#violationCode')?.value);
    if (preferCatalog && item && $('#violationLevel')) $('#violationLevel').value = item.level;
    const level = VIOLATION_LEVELS[$('#violationLevel')?.value] || VIOLATION_LEVELS.REMINDER;
    if ($('#violationPoints')) $('#violationPoints').value = level.points;
  };
  $('#violationCode')?.addEventListener('change', () => syncViolation(true));
  $('#violationLevel')?.addEventListener('change', () => syncViolation(false));
  syncViolation(false);
  formEl?.addEventListener('submit', async e => { e.preventDefault(); if (hasFileOverLimit(e.target)) return; try { await api('/api/violations', { method: 'POST', body: new FormData(e.target) }); toast('Đã lưu vi phạm theo SOP'); renderViolations(); } catch (err) { toast(err.message, 'danger'); } });
  $('#violationCatalogForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.group = String(payload.group || '').trim();
    payload.name = String(payload.name || '').trim();
    payload.level = String(payload.level || '').trim();
    if (!payload.group || !payload.name || !payload.level) {
      toast('Vui lòng nhập đủ nhóm, tên lỗi và mức mặc định', 'danger');
      return;
    }
    const submitBtn = form.querySelector('button[type="submit"], button:not([type])');
    const oldText = submitBtn?.textContent;
    try {
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang lưu...'; }
      await api('/api/violation-catalog', { method: 'POST', body: JSON.stringify(payload) });
      toast('Đã thêm danh mục vi phạm');
      form.reset();
      await renderViolations();
    } catch (err) {
      toast(err.message || 'Không thể thêm danh mục vi phạm', 'danger');
    } finally {
      if (submitBtn && document.body.contains(submitBtn)) { submitBtn.disabled = false; submitBtn.textContent = oldText || 'Thêm vào danh mục'; }
    }
  });
  $$('.violationDeleteBtn').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('Xóa vi phạm này? Điểm trừ liên quan cũng sẽ được loại khỏi tổng hợp.')) return; try { await api(`/api/violations/${btn.dataset.id}`, { method: 'DELETE' }); toast('Đã xóa vi phạm'); renderViolations(); } catch (err) { toast(err.message, 'danger'); } }));
}

async function renderChecklists() {
  const [history] = await Promise.all([api('/api/checklist/assessments')]);
  const templates = state.templates || [];
  const selected = templates.find(t => t.id === state.checklistType) || templates[0];
  if (!selected) return shell('<div class="card empty">Chưa có dữ liệu checklist.</div>', 'Checklist');
  const tabs = `<div class="pillbar">${templates.map(t => `<button data-checklist="${t.id}" class="${selected.id === t.id ? 'active' : ''}">${esc(t.id)}</button>`).join('')}</div>`;
  const canGrade = can('can_grade_checklists');
  const form = canGrade ? checklistForm(selected) : '<div class="empty">Tài khoản này chỉ được xem lại phiếu đã chấm.</div>';
  const rows = history.assessments || [];
  const recent = rows.slice(0, 12);
  const historyCards = recent.length ? recent.map(a => `<div class="simple-record-card checklist-record-card">
    <div class="record-card-main">
      <div><span class="badge dark">${esc(a.template_id)}</span><h4>${esc(a.employee_name || 'Cửa hàng')}</h4><p>${esc(a.store_name || '')} • ${dt(a.assessed_at)}</p></div>
      <div class="record-score"><b>${a.total_score}/${a.max_score}</b><span>${a.percent}%</span></div>
    </div>
    ${a.general_note ? `<p class="record-note"><b>Nhận xét:</b> ${esc(a.general_note)}</p>` : ''}
    <div class="row"><button class="btn small secondary viewAssessmentBtn" data-id="${a.id}">Xem nội dung</button></div>
  </div>`).join('') : '<div class="empty">Chưa có phiếu chấm</div>';
  const quick = `<div class="quick-action-grid">
    ${canGrade ? `<button class="quick-action-card" data-jump="#checklistCreate"><span>Tạo mới</span><b>Chấm checklist</b><em>${esc(selected.id)}</em></button>` : ''}
    <button class="quick-action-card" data-jump="#checklistHistory"><span>Đã chấm</span><b>${rows.length}</b><em>Xem lại nhanh</em></button>
    <button class="quick-action-card" data-jump="#assessmentDetail"><span>Chi tiết</span><b>Xem nội dung</b><em>Bấm ở từng phiếu</em></button>
  </div>`;
  const exportBtn = can('can_export') ? '<button class="btn secondary" data-export="assessments">Tải CSV</button>' : '';
  shell(`${quick}<div id="checklistHistory" class="card"><div class="toolbar"><h3 style="margin-right:auto">Lịch sử đã chấm</h3>${exportBtn}</div><div class="record-card-list">${historyCards}</div></div><div id="assessmentDetail" style="margin-top:16px"></div><div id="checklistCreate" class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Tạo mới / chấm checklist</h3>${tabs}</div>${form}</div>`, 'Checklist', 'Dễ xem lại phiếu đã chấm, bấm Xem nội dung để kiểm tra chi tiết');
  $$('.pillbar button').forEach(b => b.onclick = () => { state.checklistType = b.dataset.checklist; renderChecklists(); });
  $('#checklistForm')?.addEventListener('submit', submitChecklist);
  $$('.viewAssessmentBtn').forEach(btn => btn.addEventListener('click', () => renderAssessmentDetail(btn.dataset.id)));
  $$('[data-jump]').forEach(btn => btn.addEventListener('click', () => $(btn.dataset.jump)?.scrollIntoView({ behavior:'smooth', block:'start' })));
}

async function renderAssessmentDetail(id) {
  try {
    const data = await api(`/api/checklist/assessments/${id}`);
    const grouped = {};
    data.items.forEach(item => {
      const key = item.section_title || 'Nội dung chấm';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    const body = Object.entries(grouped).map(([section, items]) => `<details class="check-section" open><summary>${esc(section)}</summary>${items.map(item => `<div class="check-item"><div><b>${esc(item.title)}</b><div class="max">${item.score}/${item.max_score} điểm</div></div><div class="hint" style="grid-column:span 2">${esc(item.note || 'Không có ghi chú')}</div></div>`).join('')}</details>`).join('');
    $('#assessmentDetail').innerHTML = `<div class="card"><div class="toolbar"><h3 style="margin-right:auto">Chi tiết phiếu chấm ${esc(data.assessment.template_id)}</h3><span class="badge dark">${data.assessment.total_score}/${data.assessment.max_score} điểm • ${data.assessment.percent}%</span></div><p class="hint"><b>Đối tượng:</b> ${esc(data.assessment.employee_name || 'Cửa hàng')} • <b>Cửa hàng:</b> ${esc(data.assessment.store_name || '')} • <b>Ngày chấm:</b> ${dt(data.assessment.assessed_at)}</p>${data.assessment.general_note ? `<p class="hint"><b>Nhận xét tổng quan:</b> ${esc(data.assessment.general_note)}</p>` : ''}${body || '<div class="empty">Không có chi tiết</div>'}</div>`;
    $('#assessmentDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) { toast(err.message, 'danger'); }
}

function checklistForm(t) {
  const sections = t.sections || [];
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(state.user.store_id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const target = t.target_type === 'employee' ? `<div class="field"><label>Đại sứ kinh doanh</label><select name="employee_id" id="checkEmployee" required>${usersInStore(isAllStoreUser() ? '' : state.user.store_id).map(u => `<option value="${u.id}">${esc(u.full_name)} - ${esc(u.store_name || '')}</option>`).join('')}</select></div>` : '';
  const sectionHtml = sections.map(sec => {
    const items = t.items.filter(i => i.section_id === sec.id);
    if (!items.length) return '';
    return `<details class="check-section" open><summary>${esc(sec.title)}</summary>${items.map(i => `<div class="check-item"><div><b>${esc(i.title)}</b><div class="max">Tối đa ${i.max_score} điểm</div></div><input class="input score-input" type="number" min="0" max="${i.max_score}" step="0.5" name="score_${i.id}" value="${i.max_score}"><input class="input" name="note_${i.id}" placeholder="Ghi chú mục này"></div>`).join('')}</details>`;
  }).join('');
  return `<form id="checklistForm" data-template="${t.id}">
    <div class="grid three">
      <div class="field"><label>Cửa hàng</label><select name="store_id" id="checkStore" ${!isAllStoreUser() ? 'disabled' : ''}>${storeOptions}</select></div>
      ${target}
      <div class="field"><label>Ngày chấm</label><input class="input" type="datetime-local" name="assessed_at" value="${new Date().toISOString().slice(0,16)}"></div>
    </div>
    <div class="hint">Checklist này có ${t.items.length} tiêu chí, tổng tối đa ${t.max_score} điểm. Mặc định đang để full điểm, người chấm chỉ cần giảm điểm và ghi chú ở mục chưa đạt.</div>
    ${sectionHtml}
    <div class="field"><label>Nhận xét tổng quan</label><textarea name="general_note" placeholder="Tổng quan điểm mạnh, điểm cần cải thiện, deadline khắc phục..."></textarea></div>
    <button class="btn">Lưu phiếu chấm</button>
  </form>`;
}

async function submitChecklist(e) {
  e.preventDefault();
  const form = e.target;
  const t = state.templates.find(x => x.id === form.dataset.template);
  const fd = new FormData(form);
  const scores = {};
  t.items.forEach(i => scores[i.id] = { score: Number(fd.get(`score_${i.id}`) || 0), note: fd.get(`note_${i.id}`) || '' });
  const payload = {
    template_id: t.id,
    store_id: isAllStoreUser() ? fd.get('store_id') : state.user.store_id,
    employee_id: fd.get('employee_id') || null,
    assessed_at: fd.get('assessed_at'),
    general_note: fd.get('general_note'),
    scores,
  };
  try { const res = await api('/api/checklist/assessments', { method: 'POST', body: JSON.stringify(payload) }); toast(`Đã lưu phiếu: ${res.total_score}/${res.max_score} điểm (${res.percent}%)`); renderChecklists(); } catch (err) { toast(err.message, 'danger'); }
}

async function renderSales() {
  const currentMonth = state.salesMonth || new Date().toISOString().slice(0,7);
  state.salesMonth = currentMonth;
  const defaultStoreId = isAllStoreUser() ? (state.salesStoreId || state.boot.stores[0]?.id || '') : state.user.store_id;
  state.salesStoreId = defaultStoreId;
  const salesUserStatus = state.salesUserStatus || 'active';
  const [data, summary] = await Promise.all([
    api(`/api/sales/leaderboard?period=${state.leaderboardPeriod}&date=${currentMonth}-15${defaultStoreId ? `&store_id=${defaultStoreId}` : ''}&user_status=${encodeURIComponent(salesUserStatus)}`),
    api(`/api/sales/store-summary?month=${currentMonth}${defaultStoreId ? `&store_id=${defaultStoreId}` : ''}`).catch(() => null)
  ]);
  const storeIdForForms = isAllStoreUser() ? defaultStoreId : state.user.store_id;
  const salesStaff = salesStaffInStore(storeIdForForms);
  const employeesOptions = salesStaff.map(u => `<option value="${u.id}">${esc(u.full_name)} - ${esc(u.store_name || '')}</option>`).join('');
  const targetEmployeeChecks = salesStaff.map(u => `<label class="target-employee-check"><input type="checkbox" name="user_ids" value="${u.id}"><span><b>${esc(u.full_name)}</b><small>${esc(u.store_name || '')}</small></span></label>`).join('') || '<div class="empty">Chưa có nhân viên bán hàng trong cửa hàng này</div>';
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(defaultStoreId) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const storeSelect = isAllStoreUser() ? `<div class="field"><label>Cửa hàng</label><select class="input" id="salesStoreFilter" name="store_id">${storeOptions}</select></div>` : `<input type="hidden" name="store_id" value="${esc(state.user.store_id)}">`;
  const storeSelectTarget = isAllStoreUser() ? `<div class="field"><label>Cửa hàng</label><select class="input" id="dailyTargetStoreFilter" name="store_id">${storeOptions}</select></div>` : `<input type="hidden" name="store_id" value="${esc(state.user.store_id)}">`;
  const targetForm = can('can_set_sales_targets') ? `<div class="card"><h3>Set target đầu tháng nhiều nhân viên</h3><p class="hint">Có thể chọn một hoặc nhiều nhân viên cùng lúc để set chung target tháng. Nếu nhân viên đã có target tháng này, hệ thống sẽ cập nhật lại thay vì tạo trùng.</p><form id="targetForm" class="grid four"><div class="field target-employee-field" style="grid-column:1/-1"><label>Chọn nhân viên bán hàng</label><div class="row target-multi-actions"><button type="button" class="btn secondary small" id="targetSelectAllBtn">Chọn tất cả</button><button type="button" class="btn ghost small" id="targetClearAllBtn">Bỏ chọn</button><span class="hint">Chọn nhiều nhân viên để lưu target nhanh trong 1 lần.</span></div><div class="target-employee-grid">${targetEmployeeChecks}</div></div><div class="field"><label>Tháng target</label><input class="input" type="month" name="target_month" value="${currentMonth}" required></div><div class="field"><label>Target doanh thu tháng</label><input class="input" type="text" inputmode="numeric" data-number-format name="target_revenue" required placeholder="VD: 80.000.000"></div><div class="field"><label>Target UPT</label><input class="input" type="number" step="0.01" name="target_upt" min="0" placeholder="VD: 2.50"></div><div class="field"><label>Target ATV</label><input class="input" type="text" inputmode="numeric" data-number-format name="target_atv" placeholder="VD: 1.500.000"></div><div class="field"><label>Target CR %</label><input class="input" type="number" step="0.01" name="target_cr" min="0" placeholder="VD: 35"></div><div class="field" style="grid-column:span 2"><label>Ghi chú target</label><input class="input" name="note" placeholder="VD: Target tháng 7 / target điều chỉnh"></div><div class="field" style="align-self:end"><button class="btn">Lưu target đã chọn</button></div></form></div>` : '';
  const todayIso = new Date().toISOString().slice(0,10);
  const dailyTargetForm = can('can_set_sales_targets') ? `<div class="card" style="margin-top:16px"><h3>Set target doanh thu theo ngày - tổng cửa hàng</h3><p class="hint">Chọn từng ngày muốn set target, có thể chọn nhiều ngày không liền nhau. UPT / ATV / CR tự lấy theo target tháng, không cần set riêng từng ngày.</p><form id="dailyTargetForm" class="grid four daily-target-pick-form">${storeSelectTarget}<div class="field" style="grid-column:span 2"><label>Chọn ngày cần set</label><div class="row daily-date-add-row"><input class="input" type="date" id="dailyTargetDatePicker" value="${todayIso}"><button type="button" class="btn secondary" id="dailyTargetAddDateBtn">Thêm ngày</button></div></div><div class="field"><label>Target doanh thu/ngày</label><input class="input" type="text" inputmode="numeric" data-number-format name="target_revenue" required placeholder="VD: 10.000.000"></div><div class="field" style="grid-column:1/-1"><label>Ngày đã chọn</label><div class="row daily-target-actions"><button type="button" class="btn secondary small" id="dailyTargetAddTodayBtn">Thêm hôm nay</button><button type="button" class="btn ghost small" id="dailyTargetClearDatesBtn">Xóa chọn</button><span class="hint">Bấm Thêm ngày nhiều lần để chọn các ngày rời rạc.</span></div><div id="dailyTargetDateList" class="daily-date-list"></div></div><div class="field" style="grid-column:span 3"><label>Ghi chú target ngày</label><input class="input" name="note" placeholder="VD: Target cuối tuần / ngày sale"></div><div class="field" style="align-self:end"><button class="btn">Lưu target ngày đã chọn</button></div></form></div>` : '';
  const rowsInputs = salesStaff.map(u => `<tr data-user="${u.id}"><td><b>${esc(u.full_name)}</b><div class="hint">${esc(u.store_name || '')}</div></td><td><input class="input" name="revenue_${u.id}" type="text" inputmode="numeric" data-number-format value="0"></td><td><input class="input" name="bill_${u.id}" type="text" inputmode="numeric" data-number-format value="0"></td><td><input class="input" name="item_${u.id}" type="text" inputmode="numeric" data-number-format value="0"></td><td><input class="input" name="note_${u.id}" placeholder="Ghi chú NV"></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Chưa có nhân viên bán hàng trong cửa hàng này</div></td></tr>';
  const salesForm = canAny('can_manage_total_sales','can_manage_sales') ? `<div class="card" style="margin-top:16px"><h3>Nhập doanh thu từng ngày</h3><p class="hint">Mỗi ngày cửa hàng nhập doanh thu từng nhân viên: doanh thu, số bill, số món. TF nhập theo khách mới/khách cũ, hệ thống tự cộng lượt khách tổng. Nếu nhập lại cùng ngày, hệ thống sẽ cập nhật thay vì cộng trùng.</p><form id="dailySalesForm"><div class="grid four">${storeSelect}<div class="field"><label>Ngày bán</label><input class="input" type="date" name="sale_date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field"><label>Khách mới</label><input class="input" type="text" inputmode="numeric" data-number-format name="customer_new_count" value="0"></div><div class="field"><label>Khách cũ</label><input class="input" type="text" inputmode="numeric" data-number-format name="customer_old_count" value="0"></div><div class="field"><label>Lượt khách tổng</label><input class="input readonly" type="text" inputmode="numeric" data-number-format name="customer_count" value="0" readonly></div><div class="field"><label>Ghi chú cửa hàng</label><input class="input" name="note" placeholder="VD: Cuối ngày / ca tối"></div></div><div class="table-wrap revenue-sticky-name" style="margin-top:12px"><table><thead><tr><th>Nhân viên</th><th>Doanh thu</th><th>Số bill</th><th>Số món</th><th>Ghi chú</th></tr></thead><tbody>${rowsInputs}</tbody></table></div><div style="margin-top:12px"><button class="btn">Lưu doanh thu ngày</button></div></form></div>` : '';
  const tabs = `<div class="pillbar"><button data-period="month" class="${state.leaderboardPeriod === 'month' ? 'active' : ''}">Tháng</button><button data-period="quarter" class="${state.leaderboardPeriod === 'quarter' ? 'active' : ''}">Quý</button><button data-period="year" class="${state.leaderboardPeriod === 'year' ? 'active' : ''}">Năm</button></div>`;
  const salesUserStatusFilter = `<div class="field"><label>Nhân sự hiển thị</label><select class="input" id="salesUserStatusFilter"><option value="active" ${salesUserStatus === 'active' ? 'selected' : ''}>Nhân sự đang làm</option><option value="inactive" ${salesUserStatus === 'inactive' ? 'selected' : ''}>Nhân sự đã nghỉ</option><option value="all" ${salesUserStatus === 'all' ? 'selected' : ''}>Tất cả nhân sự</option></select></div>`;
  const monthFilter = `<div class="toolbar" style="margin-bottom:12px"><div class="field"><label>Tháng xem tổng hợp</label><input class="input" id="salesMonthFilter" type="month" value="${currentMonth}"></div>${isAllStoreUser() ? `<div class="field"><label>Cửa hàng xem tổng</label><select class="input" id="salesStoreSummaryFilter">${storeOptions}</select></div>` : ''}${salesUserStatusFilter}</div>`;
  const summaryBlock = summary ? `<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Tổng hợp doanh thu tháng ${esc(summary.month)} - ${esc(summary.store_name)}</h3></div><p class="hint">Bảng này cộng từng ngày đã nhập để theo dõi doanh thu ngày; UPT, ATV, ASP, CR mặc định so với target tháng. Timeline dự kiến tính theo tốc độ doanh thu hiện tại và số ngày còn lại trong kỳ.</p>${tableStoreSalesSummary(summary)}</div>` : '<div class="card" style="margin-top:16px"><h3>Tổng hợp doanh thu cửa hàng</h3><div class="empty">Tài khoản này chưa được cấp quyền xem tổng doanh thu cửa hàng</div></div>';
  shell(`${targetForm}${dailyTargetForm}${salesForm}<div class="card" style="margin-top:16px">${monthFilter}<div class="toolbar"><h3 style="margin-right:auto">Bảng doanh thu thực đạt ${state.leaderboardPeriod === 'month' ? 'tháng' : state.leaderboardPeriod === 'quarter' ? 'quý' : 'năm'}</h3>${tabs}${can('can_export') ? '<button class="btn secondary" data-export="sales">Tải CSV doanh thu</button>' : ''}</div><p class="hint">Mục Doanh thu được phép xem doanh thu thực đạt. Riêng màn Tổng quan chỉ hiển thị % đạt target, không hiển thị số tiền bán.</p>${tableLeaderboard(data.leaderboard, true)}</div>${summaryBlock}`, 'Doanh thu', 'Nhập doanh thu ngày, target cá nhân, target ngày và tổng hợp target cửa hàng');
  $$('.pillbar button').forEach(b => b.onclick = () => { state.leaderboardPeriod = b.dataset.period; renderSales(); });
  $('#salesMonthFilter')?.addEventListener('change', e => { state.salesMonth = e.target.value; renderSales(); });
  $('#salesStoreSummaryFilter')?.addEventListener('change', e => { state.salesStoreId = e.target.value; renderSales(); });
  $('#salesStoreFilter')?.addEventListener('change', e => { state.salesStoreId = e.target.value; renderSales(); });
  $('#salesUserStatusFilter')?.addEventListener('change', e => { state.salesUserStatus = e.target.value; localStorage.setItem('dezus_ops_sales_user_status', state.salesUserStatus); renderSales(); });
  $('#dailyTargetStoreFilter')?.addEventListener('change', e => { state.salesStoreId = e.target.value; renderSales(); });
  const dailyTargetDates = new Set([todayIso]);
  const renderDailyTargetDates = () => {
    const box = $('#dailyTargetDateList');
    if (!box) return;
    const dates = [...dailyTargetDates].sort();
    box.innerHTML = dates.length ? dates.map(d => `<button type="button" class="daily-date-chip" data-date="${esc(d)}"><b>${dOnly(d)}</b><span>×</span></button>`).join('') : '<div class="empty small-empty">Chưa chọn ngày</div>';
    $$('.daily-date-chip', box).forEach(chip => chip.onclick = () => { dailyTargetDates.delete(chip.dataset.date); renderDailyTargetDates(); });
  };
  const addDailyTargetDate = (dateValue) => {
    if (!dateValue) return toast('Chọn ngày trước khi thêm', 'danger');
    dailyTargetDates.add(String(dateValue).slice(0,10));
    renderDailyTargetDates();
  };
  renderDailyTargetDates();
  $('#dailyTargetAddDateBtn')?.addEventListener('click', () => addDailyTargetDate($('#dailyTargetDatePicker')?.value));
  $('#dailyTargetAddTodayBtn')?.addEventListener('click', () => addDailyTargetDate(todayIso));
  $('#dailyTargetClearDatesBtn')?.addEventListener('click', () => { dailyTargetDates.clear(); renderDailyTargetDates(); });
  $('#targetSelectAllBtn')?.addEventListener('click', () => { $$('input[name="user_ids"]', $('#targetForm')).forEach(cb => cb.checked = true); });
  $('#targetClearAllBtn')?.addEventListener('click', () => { $$('input[name="user_ids"]', $('#targetForm')).forEach(cb => cb.checked = false); });
  $('#targetForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const userIds = $$('input[name="user_ids"]:checked', e.target).map(cb => Number(cb.value)).filter(Boolean);
    if (!userIds.length) return toast('Chọn ít nhất 1 nhân viên để lưu target', 'danger');
    const payload = Object.fromEntries(fd);
    payload.user_ids = userIds;
    payload.target_revenue = cleanNumberInput(payload.target_revenue);
    payload.target_atv = cleanNumberInput(payload.target_atv);
    delete payload.user_id;
    try {
      const res = await api('/api/sales/targets', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Đã lưu target cho ${res.count || userIds.length} nhân viên`);
      renderSales();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $('#dailyTargetForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target));
    payload.target_revenue = cleanNumberInput(payload.target_revenue);
    payload.dates = [...dailyTargetDates].sort();
    if (!payload.dates.length) return toast('Chọn ít nhất 1 ngày để lưu target', 'danger');
    try {
      const res = await api('/api/sales/daily-targets', { method: 'POST', body: JSON.stringify(payload) });
      toast(`Đã lưu target doanh thu cho ${res.count || payload.dates.length} ngày`);
      renderSales();
    } catch (err) { toast(err.message, 'danger'); }
  });
  attachCustomerTotalSync($('#dailySalesForm'));
  $('#dailySalesForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const entries = $$('tbody tr[data-user]', e.target).map(tr => {
      const uid = tr.dataset.user;
      return { user_id: uid, revenue: cleanNumberInput(fd.get(`revenue_${uid}`)), bill_count: cleanNumberInput(fd.get(`bill_${uid}`)), item_count: cleanNumberInput(fd.get(`item_${uid}`)), note: fd.get(`note_${uid}`) || '' };
    });
    const payload = { store_id: fd.get('store_id') || state.user.store_id, sale_date: fd.get('sale_date'), customer_new_count: cleanNumberInput(fd.get('customer_new_count')), customer_old_count: cleanNumberInput(fd.get('customer_old_count')), customer_count: cleanNumberInput(fd.get('customer_count')), note: fd.get('note') || '', entries };
    try { await api('/api/sales/daily', { method: 'POST', body: JSON.stringify(payload) }); toast('Đã lưu doanh thu ngày'); renderSales(); } catch (err) { toast(err.message, 'danger'); }
  });
}


function fileSizeLabel(bytes) {
  const n = Number(bytes || 0);
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  if (n >= 1024) return Math.round(n / 1024) + ' KB';
  return n + ' B';
}

function hasFileOverLimit(form, maxMb = 12) {
  const limit = maxMb * 1024 * 1024;
  const inputs = [...form.querySelectorAll('input[type="file"]')];
  for (const input of inputs) {
    for (const file of [...(input.files || [])]) {
      if (file.size > limit) {
        toast(`File ${file.name} quá ${maxMb}MB. Hãy tải file lên Google Drive rồi dán link Drive để không tốn kho lưu trữ.`, 'danger');
        return true;
      }
    }
  }
  return false;
}

async function downloadDocument(id, name = 'tai-lieu') {
  try {
    const res = await fetch(`/api/documents/${id}/download`, { headers: { Authorization: `Bearer ${state.token}` } });
    const type = res.headers.get('content-type') || '';
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Không tải được tài liệu');
    }
    if (type.includes('application/json')) {
      const data = await res.json();
      if (data.external_url) {
        window.open(data.external_url, '_blank', 'noopener');
        return;
      }
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'tai-lieu';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) { toast(err.message, 'danger'); }
}




function orderStatusBadge(status) {
  const map = {
    new: ['Chờ xử lý', 'dark'],
    done: ['Đã làm', 'ok'],
    waiting: ['Chờ hàng nhập', 'warn'],
    received: ['Đã nhập hàng', 'ok'],
    cancelled: ['Hủy', 'danger'],
    mixed: ['Nhiều trạng thái', 'warn'],
  };
  const [label, cls] = map[status || 'new'] || [status || 'Chờ xử lý', ''];
  return `<span class="badge ${cls}">${label}</span>`;
}

function orderBatchName(order) {
  const raw = String((order && (order.batch_name || order.order_batch)) || 'Chưa gắn lần').trim() || 'Chưa gắn lần';
  return raw.replace(/^Đợt\b/i, 'Lần');
}

function orderInputRows(count = 8) {
  return Array.from({ length: count }, (_, i) => `<tr>
    <td><input class="input orderSku" placeholder="SKU ${i + 1}"></td>
    <td><input class="input orderName" placeholder="Tên sản phẩm"></td>
    <td><input class="input orderSize size-mini-input" placeholder="Size"></td>
    <td><input class="input orderQty" type="text" inputmode="numeric" data-number-format value="0"></td>
    <td><input class="input orderNote" placeholder="Ghi chú dòng"></td>
  </tr>`).join('');
}

function groupOrdersByBatch(orders) {
  const batchMap = new Map();
  (orders || []).forEach(o => {
    const batchName = orderBatchName(o);
    const groupKey = `${o.store_id || ''}||${batchName.toLowerCase()}`;
    if (!batchMap.has(groupKey)) {
      batchMap.set(groupKey, {
        key: groupKey,
        batch_name: batchName,
        store_id: o.store_id,
        store_name: o.store_name || '',
        total_quantity: 0,
        first_date: o.order_date || '',
        last_date: o.order_date || '',
        rows: [],
        ids: [],
        statuses: new Set(),
        notes: new Set(),
      });
    }
    const g = batchMap.get(groupKey);
    g.total_quantity += Number(o.quantity || 0);
    g.ids.push(Number(o.id));
    if (o.order_date && (!g.first_date || String(o.order_date) < String(g.first_date))) g.first_date = o.order_date;
    if (o.order_date && (!g.last_date || String(o.order_date) > String(g.last_date))) g.last_date = o.order_date;
    if (o.order_status) g.statuses.add(o.order_status);
    if (o.note) g.notes.add(o.note);

    const itemKey = `${String(o.sku || '').toLowerCase()}||${String(o.product_name || '').toLowerCase()}||${String(o.size || '').toLowerCase()}`;
    let item = g.rows.find(x => x.key === itemKey);
    if (!item) {
      item = {
        key: itemKey,
        sku: o.sku || '',
        product_name: o.product_name || '',
        size: o.size || '',
        quantity: 0,
        ids: [],
        first_date: o.order_date || '',
        last_date: o.order_date || '',
        statuses: new Set(),
        notes: new Set(),
        created_by_names: new Set(),
        updated_at: o.updated_at || '',
      };
      g.rows.push(item);
    }
    item.quantity += Number(o.quantity || 0);
    item.ids.push(Number(o.id));
    if (o.order_date && (!item.first_date || String(o.order_date) < String(item.first_date))) item.first_date = o.order_date;
    if (o.order_date && (!item.last_date || String(o.order_date) > String(item.last_date))) item.last_date = o.order_date;
    if (o.order_status) item.statuses.add(o.order_status);
    if (o.note) item.notes.add(o.note);
    if (o.created_by_name) item.created_by_names.add(o.created_by_name);
    if (o.updated_at && (!item.updated_at || String(o.updated_at) > String(item.updated_at))) item.updated_at = o.updated_at;
  });
  return Array.from(batchMap.values()).map(g => {
    const statusList = Array.from(g.statuses);
    g.status = statusList.length === 1 ? statusList[0] : 'mixed';
    g.note = Array.from(g.notes).join(' | ');
    g.rows = g.rows.map(item => {
      const s = Array.from(item.statuses);
      return {
        ...item,
        status: s.length === 1 ? s[0] : 'mixed',
        note: Array.from(item.notes).join(' | '),
        created_by_name: Array.from(item.created_by_names).join(' | '),
      };
    }).sort((a, b) => String(a.sku || '').localeCompare(String(b.sku || ''), 'vi') || String(a.product_name || '').localeCompare(String(b.product_name || ''), 'vi'));
    return g;
  }).sort((a, b) => String(b.last_date || '').localeCompare(String(a.last_date || '')) || String(a.batch_name || '').localeCompare(String(b.batch_name || ''), 'vi'));
}

function dateRangeText(first, last) {
  if (!first && !last) return '';
  if (!last || first === last) return dOnly(first);
  return `${dOnly(first)} → ${dOnly(last)}`;
}

async function patchOrderIds(ids, body, successMsg = 'Đã cập nhật order') {
  const list = String(ids || '').split(',').map(x => Number(x)).filter(Boolean);
  if (!list.length) return;
  for (const id of list) {
    await api(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  }
  toast(successMsg);
  renderOrders();
}

async function deleteOrderIds(ids) {
  const list = String(ids || '').split(',').map(x => Number(x)).filter(Boolean);
  if (!list.length) return;
  for (const id of list) await api(`/api/orders/${id}`, { method: 'DELETE' });
  toast('Đã xóa order');
  renderOrders();
}


async function renderOnlineOrders() {
  const allScope = isAllStoreUser() || (!state.user.store_id && (can('can_manage_online_orders') || can('can_view_online_orders')));
  const defaultStoreId = allScope ? (state.onlineOrderStoreId || state.boot.stores[0]?.id || '') : (state.user.store_id || '');
  state.onlineOrderStoreId = defaultStoreId;
  const month = state.onlineOrderMonth || new Date().toISOString().slice(0, 7);
  state.onlineOrderMonth = month;
  const data = await api(`/api/online-orders?month=${encodeURIComponent(month)}${defaultStoreId ? `&store_id=${encodeURIComponent(defaultStoreId)}` : ''}`);
  const orders = data.orders || [];
  const summary = data.summary || { totals: {}, stores: [], employees: [] };
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(defaultStoreId) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const staff = salesStaffInStore(defaultStoreId);
  const employeeOptions = staff.map(u => `<option value="${u.id}">${esc(u.full_name)}</option>`).join('');
  const storeField = allScope ? `<div class="field"><label>Cửa hàng</label><select class="input" id="onlineOrderStoreFilter" name="store_id">${storeOptions}</select></div>` : `<input type="hidden" name="store_id" value="${esc(defaultStoreId)}">`;
  const t = summary.totals || {};
  const kpis = `<section class="grid four dash-kpis"><div class="card kpi"><div class="label">Số đơn online</div><div class="num">${money(t.order_count || 0)}</div><div class="hint">Theo tháng đang lọc</div></div><div class="card kpi"><div class="label">Tổng giá trị đơn</div><div class="num">${money(t.order_value || 0)}đ</div><div class="hint">Giá trị hóa đơn online</div></div><div class="card kpi"><div class="label">Doanh thu hưởng 30%</div><div class="num">${money(t.benefit_revenue || 0)}đ</div><div class="hint">Tự tính = giá trị đơn × 30%</div></div></section>`;
  const form = can('can_manage_online_orders') ? `<div class="card"><h3>Nhập đơn online</h3><p class="hint">Cửa hàng nhập số hóa đơn, giá trị đơn, nhân viên đóng đơn. Doanh thu hưởng sẽ tự tính 30% giá trị đơn.</p><form id="onlineOrderForm" class="grid three">${storeField}<div class="field"><label>Ngày hóa đơn</label><input class="input" type="date" name="order_date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field"><label>Số hóa đơn</label><input class="input" name="invoice_no" placeholder="VD: OL12345" required></div><div class="field"><label>Giá trị đơn</label><input class="input" type="text" inputmode="numeric" data-number-format name="order_value" placeholder="1.000.000" required></div><div class="field"><label>Nhân viên đóng đơn</label><select class="input" name="packer_id" required>${employeeOptions}</select></div><div class="field"><label>Ghi chú</label><input class="input" name="note" placeholder="VD: đơn livestream, đơn web..."></div><div style="align-self:end"><button class="btn">Lưu đơn online</button></div></form></div>` : '';
  const storeSummary = summary.stores?.length ? `<div class="table-wrap"><table><thead><tr><th>Cửa hàng</th><th>Số đơn</th><th>Tổng giá trị</th><th>Doanh thu hưởng 30%</th></tr></thead><tbody>${summary.stores.map(r => `<tr><td><b>${esc(r.store_name || '')}</b></td><td>${money(r.order_count || 0)}</td><td>${money(r.order_value || 0)}đ</td><td><b>${money(r.benefit_revenue || 0)}đ</b></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có tổng hợp cửa hàng</div>';
  const employeeSummary = summary.employees?.length ? `<div class="table-wrap"><table><thead><tr><th>Nhân viên đóng đơn</th><th>Cửa hàng</th><th>Số đơn</th><th>Tổng giá trị</th><th>Doanh thu hưởng 30%</th></tr></thead><tbody>${summary.employees.map(r => `<tr><td><b>${esc(r.full_name || '')}</b></td><td>${esc(r.store_name || '')}</td><td>${money(r.order_count || 0)}</td><td>${money(r.order_value || 0)}đ</td><td><b>${money(r.benefit_revenue || 0)}đ</b></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có tổng hợp cá nhân</div>';
  const detailRows = orders.length ? `<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Cửa hàng</th><th>Số hóa đơn</th><th>Giá trị</th><th>NV đóng</th><th>Doanh thu hưởng 30%</th><th>Ghi chú</th><th>Thao tác</th></tr></thead><tbody>${orders.map(o => `<tr><td>${dOnly(o.order_date)}</td><td>${esc(o.store_name || '')}</td><td><b>${esc(o.invoice_no || '')}</b></td><td>${money(o.order_value || 0)}đ</td><td>${esc(o.packer_name || '')}</td><td><b>${money(o.benefit_revenue || 0)}đ</b></td><td>${esc(o.note || '')}</td><td>${can('can_manage_online_orders') ? `<button class="btn small secondary onlineOrderEditBtn" data-id="${o.id}" data-order="${encodeURIComponent(JSON.stringify({ order_date: o.order_date || '', invoice_no: o.invoice_no || '', order_value: o.order_value || 0, packer_id: o.packer_id || '', note: o.note || '' }))}">Sửa</button><button class="btn small danger onlineOrderDeleteBtn" data-id="${o.id}">Xóa</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có đơn online trong tháng này</div>';
  const filters = `<div class="card"><div class="toolbar"><div class="field"><label>Tháng</label><input class="input" type="month" id="onlineOrderMonthFilter" value="${esc(month)}"></div>${allScope ? `<div class="field"><label>Lọc cửa hàng</label><select class="input" id="onlineOrderStoreFilter2">${storeOptions}</select></div>` : ''}<div style="align-self:end">${can('can_export') ? '<button class="btn secondary" data-export="online_orders">Tải CSV đơn online</button>' : ''}</div></div></div>`;
  shell(`${form}${filters}${kpis}<section class="grid two" style="margin-top:16px"><div class="card"><h3>Tổng hợp cửa hàng</h3>${storeSummary}</div><div class="card"><h3>Tổng hợp cá nhân</h3>${employeeSummary}</div></section><div class="card" style="margin-top:16px"><h3>Chi tiết đơn online</h3>${detailRows}</div>`, 'Đơn online', 'Nhập hóa đơn online, tự tính doanh thu hưởng 30% và tổng hợp theo cửa hàng/cá nhân');
  $('#onlineOrderMonthFilter')?.addEventListener('change', e => { state.onlineOrderMonth = e.target.value; renderOnlineOrders(); });
  $('#onlineOrderStoreFilter')?.addEventListener('change', e => { state.onlineOrderStoreId = e.target.value; renderOnlineOrders(); });
  $('#onlineOrderStoreFilter2')?.addEventListener('change', e => { state.onlineOrderStoreId = e.target.value; renderOnlineOrders(); });
  $('#onlineOrderForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target));
    payload.order_value = cleanNumberInput(payload.order_value);
    try { await api('/api/online-orders', { method: 'POST', body: JSON.stringify(payload) }); toast('Đã lưu đơn online'); renderOnlineOrders(); } catch (err) { toast(err.message, 'danger'); }
  });
  $$('.onlineOrderDeleteBtn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Xóa đơn online này?')) return;
    try { await api(`/api/online-orders/${btn.dataset.id}`, { method: 'DELETE' }); toast('Đã xóa đơn online'); renderOnlineOrders(); } catch (err) { toast(err.message, 'danger'); }
  }));
  $$('.onlineOrderEditBtn').forEach(btn => btn.addEventListener('click', async () => {
    let current = {};
    try { current = JSON.parse(decodeURIComponent(btn.dataset.order || '%7B%7D')); } catch (_err) {}
    const invoice_no = prompt('Số hóa đơn', current.invoice_no || '');
    if (invoice_no === null) return;
    const order_value = prompt('Giá trị đơn', current.order_value || 0);
    if (order_value === null) return;
    const note = prompt('Ghi chú', current.note || '');
    try { await api(`/api/online-orders/${btn.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ invoice_no, order_value: cleanNumberInput(order_value), note }) }); toast('Đã sửa đơn online'); renderOnlineOrders(); } catch (err) { toast(err.message, 'danger'); }
  }));
}

async function renderOrders() {
  const allScope = isAllStoreUser() || (!state.user.store_id && (can('can_manage_orders') || can('can_view_orders')));
  const defaultStoreId = allScope ? (state.orderStoreId || state.boot.stores[0]?.id || '') : (state.user.store_id || '');
  state.orderStoreId = defaultStoreId;
  const data = await api(`/api/orders${defaultStoreId ? `?store_id=${defaultStoreId}` : ''}`);
  const orders = data.orders || [];
  const batches = [...new Set(orders.map(orderBatchName))].sort((a, b) => a.localeCompare(b, 'vi'));
  const groups = groupOrdersByBatch(orders);
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(defaultStoreId) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const batchOptions = batches.map(b => `<option value="${esc(b)}"></option>`).join('');
  const storeSelect = allScope ? `<div class="field"><label>Cửa hàng</label><select class="input" id="orderStoreFilter" name="store_id">${storeOptions}</select></div>` : `<input type="hidden" name="store_id" value="${esc(defaultStoreId)}">`;
  const form = can('can_manage_orders') ? `<div class="card"><h3>Tạo order hàng theo lần</h3><p class="hint">Nhập cùng một tên lần/tag để gom order nhiều ngày vào chung 1 lần. Ví dụ: <b>Lần 1 - Tuần 31</b>. Nếu ngày 1 nhập 1, ngày 2 nhập 1 cùng SKU và cùng lần, bảng sẽ cộng thành tổng 2 sản phẩm trong tag đó.</p><form id="orderForm"><div class="grid four">${storeSelect}<div class="field"><label>Lần / tag order</label><input class="input" name="batch_name" list="orderBatchList" placeholder="VD: Lần 1 - Tuần 31" required><datalist id="orderBatchList">${batchOptions}</datalist></div><div class="field"><label>Ngày order</label><input class="input" type="date" name="order_date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field" style="align-self:end"><button class="btn">Lưu vào lần</button></div></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>SKU</th><th>Tên SP</th><th>Size</th><th>Số lượng</th><th>Ghi chú</th></tr></thead><tbody>${orderInputRows(8)}</tbody></table></div></form></div>` : '';
  const filters = `<div class="toolbar"><h3 style="margin-right:auto">Danh sách order hàng theo lần</h3>${allScope ? `<div class="field"><label>Lọc cửa hàng</label><select class="input" id="orderStoreFilter2">${storeOptions}</select></div>` : ''}${can('can_export') ? '<button class="btn secondary" data-export="orders">Tải CSV order tổng theo lần</button>' : ''}</div>`;
  const rows = groups.length ? groups.map(g => `<div class="order-batch-card">
    <div class="order-batch-head">
      <div><span class="order-batch-tag">${esc(g.batch_name)}</span><div class="hint">${esc(g.store_name || '')} • ${dateRangeText(g.first_date, g.last_date)} • ${g.rows.length} SKU/SP</div></div>
      <div class="order-batch-kpis"><span><b>${money(g.total_quantity)}</b><small>Tổng SL</small></span>${orderStatusBadge(g.status)}</div>
      ${can('can_manage_orders') ? `<div class="row order-batch-actions"><button class="btn small secondary orderStatusBtn" data-ids="${g.ids.join(',')}" data-status="done">Đã làm lần</button><button class="btn small secondary orderStatusBtn" data-ids="${g.ids.join(',')}" data-status="waiting">Chờ hàng nhập</button><button class="btn small secondary orderStatusBtn" data-ids="${g.ids.join(',')}" data-status="received">Đã nhập</button><button class="btn small secondary orderNoteBtn" data-ids="${g.ids.join(',')}" data-note="${esc(g.note || '')}">Ghi chú lần</button><button class="btn small danger orderDeleteBtn" data-ids="${g.ids.join(',')}">Xóa lần</button></div>` : ''}
    </div>
    <div class="table-wrap order-batch-table-wrap"><table class="order-batch-table"><thead><tr><th>SKU</th><th>Tên SP</th><th>Size</th><th>Tổng SL trong lần</th><th>Ngày nhập</th><th>Trạng thái</th><th>Ghi chú</th><th>Người tạo</th><th>Thao tác</th></tr></thead><tbody>${g.rows.map(item => `<tr><td><b>${esc(item.sku || '')}</b></td><td>${esc(item.product_name || '')}</td><td><span class="size-badge">${esc(item.size || '')}</span></td><td><b>${money(item.quantity || 0)}</b></td><td>${dateRangeText(item.first_date, item.last_date)}</td><td>${orderStatusBadge(item.status)}</td><td>${esc(item.note || '')}</td><td>${esc(item.created_by_name || '')}</td><td>${can('can_manage_orders') ? `<div class="row"><button class="btn small secondary orderStatusBtn" data-ids="${item.ids.join(',')}" data-status="done">Đã làm</button><button class="btn small secondary orderStatusBtn" data-ids="${item.ids.join(',')}" data-status="waiting">Chờ hàng nhập</button><button class="btn small secondary orderStatusBtn" data-ids="${item.ids.join(',')}" data-status="received">Đã nhập</button><button class="btn small secondary orderNoteBtn" data-ids="${item.ids.join(',')}" data-note="${esc(item.note || '')}">Ghi chú</button><button class="btn small danger orderDeleteBtn" data-ids="${item.ids.join(',')}">Xóa</button></div>` : ''}</td></tr>`).join('')}</tbody></table></div>
  </div>`).join('') : '<div class="empty">Chưa có order hàng</div>';
  shell(`${form}<div class="card" style="margin-top:16px">${filters}${rows}</div>`, 'Order hàng', 'Tạo order theo lần/tag, tự cộng số lượng trong cùng lần và tải dữ liệu tổng để xử lý nhập hàng');
  $('#orderStoreFilter')?.addEventListener('change', e => { state.orderStoreId = e.target.value; renderOrders(); });
  $('#orderStoreFilter2')?.addEventListener('change', e => { state.orderStoreId = e.target.value; renderOrders(); });
  $('#orderForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const items = $$('#orderForm tbody tr').map(tr => ({
      sku: $('.orderSku', tr)?.value || '',
      product_name: $('.orderName', tr)?.value || '',
      size: $('.orderSize', tr)?.value || '',
      quantity: cleanNumberInput($('.orderQty', tr)?.value),
      note: $('.orderNote', tr)?.value || '',
    })).filter(x => (x.sku || x.product_name) && Number(x.quantity || 0) > 0);
    try {
      await api('/api/orders', { method: 'POST', body: JSON.stringify({ store_id: fd.get('store_id') || state.orderStoreId, order_date: fd.get('order_date'), batch_name: fd.get('batch_name'), items }) });
      toast(`Đã lưu ${items.length} dòng vào ${fd.get('batch_name')}`);
      renderOrders();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $$('.orderStatusBtn').forEach(btn => btn.addEventListener('click', async () => {
    try { await patchOrderIds(btn.dataset.ids, { order_status: btn.dataset.status }, 'Đã cập nhật trạng thái order'); } catch (err) { toast(err.message, 'danger'); }
  }));
  $$('.orderNoteBtn').forEach(btn => btn.addEventListener('click', async () => {
    const note = prompt('Nhập ghi chú order', btn.dataset.note || '');
    if (note === null) return;
    try { await patchOrderIds(btn.dataset.ids, { note }, 'Đã cập nhật ghi chú'); } catch (err) { toast(err.message, 'danger'); }
  }));
  $$('.orderDeleteBtn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Xóa order này?')) return;
    try { await deleteOrderIds(btn.dataset.ids); } catch (err) { toast(err.message, 'danger'); }
  }));
}


async function renderProductFeedback() {
  const allScope = isAllStoreUser() || (!state.user.store_id && (can('can_manage_product_feedback') || can('can_view_product_feedback')));
  const defaultStoreId = allScope ? (state.feedbackStoreId || state.boot.stores[0]?.id || '') : (state.user.store_id || '');
  state.feedbackStoreId = defaultStoreId;
  const month = state.feedbackMonth || new Date().toISOString().slice(0, 7);
  state.feedbackMonth = month;
  const collectionData = await api(`/api/product-collections?month=${month}${defaultStoreId ? `&store_id=${defaultStoreId}` : ''}`);
  const collections = collectionData.collections || [];
  if (state.feedbackCollectionId && !collections.some(c => Number(c.id) === Number(state.feedbackCollectionId))) state.feedbackCollectionId = '';
  const selectedCollection = collections.find(c => Number(c.id) === Number(state.feedbackCollectionId)) || collections[0] || null;
  const data = await api(`/api/product-feedback?month=${month}${defaultStoreId ? `&store_id=${defaultStoreId}` : ''}${state.feedbackCollectionId ? `&collection_id=${state.feedbackCollectionId}` : ''}`);
  const rowsData = data.feedback || [];
  const summaryData = data.summary || [];
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(defaultStoreId) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const storeField = allScope ? `<div class="field"><label>Cửa hàng</label><select class="input" id="feedbackStoreFilter" name="store_id">${storeOptions}</select></div>` : `<input type="hidden" name="store_id" value="${esc(defaultStoreId)}">`;
  const collectionOptions = collections.map(c => `<option value="${c.id}" ${Number(c.id) === Number(state.feedbackCollectionId) ? 'selected' : ''}>${esc(c.name)}${c.store_name && c.store_name !== 'Toàn hệ thống' ? ' • ' + esc(c.store_name) : ''}</option>`).join('');
  const productOptions = selectedCollection?.items?.length ? selectedCollection.items.map(i => `<option value="${esc(JSON.stringify({ sku: i.sku || '', product_name: i.product_name || '' }))}">${esc(i.sku || '')}${i.sku ? ' - ' : ''}${esc(i.product_name || '')}</option>`).join('') : '';
  const collectionManager = can('can_manage_product_collections') ? `<div class="card product-list-card"><h3>Admin set BST/List sản phẩm theo tháng</h3><p class="hint">Tạo danh sách sản phẩm theo BST 8.1, BST 8.2... Cửa hàng sẽ chỉ đánh giá sản phẩm nằm trong list này.</p><form id="productCollectionForm" class="grid three">
    <div class="field"><label>Tháng BST</label><input class="input" type="month" name="collection_month" value="${esc(month)}" required></div>
    <div class="field"><label>Tên BST/List</label><input class="input" name="name" placeholder="VD: BST 8.1 / BST 8.2" required></div>
    <div class="field"><label>Áp dụng</label><select class="input" name="store_id"><option value="">Toàn hệ thống</option>${storeOptions}</select></div>
    <div class="field" style="grid-column:1/-1"><label>Danh sách SKU / Tên SP</label><textarea class="input" name="items_text" placeholder="Mỗi dòng 1 sản phẩm. VD:\nSKU001 | Đầm linen cổ vuông\nSKU002 | Áo kiểu tay phồng" required></textarea></div>
    <div class="field" style="grid-column:1/-1"><label>Ghi chú BST</label><input class="input" name="description" placeholder="VD: hàng đi lần 1, hàng test chất liệu, nhóm sản phẩm cần feedback kỹ..."></div>
    <div style="grid-column:1/-1"><button class="btn">Lưu BST/List sản phẩm</button></div>
  </form></div>` : '';
  const form = can('can_manage_product_feedback') ? `<div class="card"><h3>Nhập đánh giá sản phẩm hằng ngày</h3><p class="hint">Sản phẩm đã tạo trong Học & Test SP sẽ tự đẩy sang danh mục đánh giá, cửa hàng không cần set lại thủ công.</p>${collections.length ? `<form id="productFeedbackForm" class="grid three">
    ${storeField}
    <div class="field"><label>Tháng BST</label><input class="input" type="month" id="feedbackMonthPicker" value="${esc(month)}"></div>
    <div class="field"><label>BST/List sản phẩm</label><select class="input" id="feedbackCollectionFilter" name="collection_id" required>${collectionOptions}</select></div>
    <div class="field"><label>Ngày ghi nhận</label><input class="input" type="date" name="feedback_date" value="${new Date().toISOString().slice(0,10)}" required></div>
    <div class="field"><label>Sản phẩm</label><select class="input" name="product_pick" required>${productOptions}</select></div>
    <div class="field"><label>Mong muốn tái sản phẩm</label><select class="input" name="restock_wish"><option value="Đề xuất tái">Đề xuất tái</option><option value="Không tái">Không tái</option><option value="Cần theo dõi thêm">Cần theo dõi thêm</option></select></div>
    <div class="field"><label>Kiểu dáng / form</label><textarea class="input" name="style_feedback" placeholder="VD: form rộng, dài tay, khách thích dáng eo..."></textarea></div>
    <div class="field"><label>Chất liệu</label><textarea class="input" name="material_feedback" placeholder="VD: dày/mỏng, nóng, nhăn, co giãn..."></textarea></div>
    <div class="field"><label>Lỗi sản phẩm</label><textarea class="input" name="product_errors" placeholder="VD: bung chỉ, xù vải, lệch khóa..."></textarea></div>
    <div class="field"><label>Đánh giá/ý kiến khách hàng</label><textarea class="input" name="customer_feedback" placeholder="Khách phản hồi gì khi thử/mua/sử dụng"></textarea></div>
    <div class="field"><label>Ghi chú nội bộ</label><textarea class="input" name="note" placeholder="Đề xuất size/màu/số lượng hoặc lưu ý khác"></textarea></div>
    <div style="grid-column:1/-1"><button class="btn">Lưu đánh giá sản phẩm</button></div>
  </form>` : `<div class="empty">Chưa có BST/List sản phẩm trong tháng này. Admin cần set BST 8.1 / 8.2 trước, sau đó cửa hàng mới đánh giá được.</div>`}</div>` : '';
  const filter = `<div class="toolbar feedback-filter"><div class="field"><label>Tháng</label><input class="input" type="month" id="feedbackMonthFilter" value="${esc(month)}"></div>${allScope ? `<div class="field"><label>Lọc cửa hàng</label><select class="input" id="feedbackStoreFilter2">${storeOptions}</select></div>` : ''}<div class="field"><label>Lọc BST/List</label><select class="input" id="feedbackCollectionFilter2"><option value="">Tất cả BST/List</option>${collectionOptions}</select></div>${can('can_export') ? '<button class="btn secondary" data-export="product_feedback_summary">Tải CSV tổng hợp SP</button><button class="btn secondary" data-export="product_feedback">Tải CSV chi tiết</button><button class="btn secondary" data-export="product_collections">Tải list BST</button>' : ''}</div>`;
  const collectionCards = collections.length ? `<div class="collection-grid">${collections.map(c => `<div class="collection-card ${Number(c.id) === Number(state.feedbackCollectionId) ? 'active' : ''}"><div class="collection-card-head"><div><span class="badge dark">${esc(c.collection_month || '')}</span>${c.auto_source === 'product_training' ? '<span class="badge ok">Tự động từ bài học</span>' : ''}<h4>${esc(c.name || '')}</h4><p class="hint">${esc(c.store_name || 'Toàn hệ thống')} • ${Number(c.items?.length || 0)} sản phẩm</p></div>${can('can_manage_product_collections') ? `<button class="btn small danger collectionDeleteBtn" data-id="${c.id}">Xóa</button>` : ''}</div><div class="collection-products">${(c.items || []).slice(0, 8).map(i => `<span>${esc(i.sku || '')}${i.sku ? ' - ' : ''}${esc(i.product_name || '')}</span>`).join('')}${(c.items || []).length > 8 ? `<span>+${(c.items || []).length - 8} SP khác</span>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">Chưa có BST/List sản phẩm theo tháng đang chọn</div>';
  const summaryRows = summaryData.length ? `<div class="table-wrap"><table><thead><tr><th>BST/List</th><th>SKU</th><th>Tên SP</th><th>Số lần đánh giá</th><th>Tái SP</th><th>Kiểu dáng</th><th>Chất liệu</th><th>Lỗi SP</th><th>Ý kiến khách</th><th>Cửa hàng</th></tr></thead><tbody>${summaryData.map(r => `<tr><td>${esc(r.collection_name || '')}</td><td><b>${esc(r.sku || '')}</b></td><td>${esc(r.product_name || '')}</td><td><span class="badge dark">${Number(r.count || 0)} lần</span></td><td><span class="badge ${r.recommend_label === 'Đề xuất tái' ? 'ok' : r.recommend_label === 'Không tái' ? 'danger' : 'warn'}">${esc(r.recommend_label || '')}</span><div class="hint">Tái: ${Number(r.restock_yes || 0)} • Không: ${Number(r.restock_no || 0)} • Theo dõi: ${Number(r.restock_watch || 0)}</div></td><td>${esc(r.style_notes || '')}</td><td>${esc(r.material_notes || '')}</td><td>${esc(r.error_notes || '')}</td><td>${esc(r.customer_notes || '')}</td><td>${esc(r.stores || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có dữ liệu tổng hợp theo sản phẩm</div>';
  const detailRows = rowsData.length ? `<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>BST/List</th><th>Cửa hàng</th><th>SKU</th><th>Tên SP</th><th>Kiểu dáng</th><th>Chất liệu</th><th>Lỗi SP</th><th>Đánh giá khách</th><th>Tái SP</th><th>Ghi chú</th><th>Người nhập</th><th>Thao tác</th></tr></thead><tbody>${rowsData.map(r => `<tr><td>${dOnly(r.feedback_date)}</td><td>${esc(r.collection_name || '')}</td><td>${esc(r.store_name || '')}</td><td><b>${esc(r.sku || '')}</b></td><td>${esc(r.product_name || '')}</td><td>${esc(r.style_feedback || '')}</td><td>${esc(r.material_feedback || '')}</td><td>${esc(r.product_errors || '')}</td><td>${esc(r.customer_feedback || '')}</td><td><span class="badge ${r.restock_wish === 'Đề xuất tái' ? 'ok' : r.restock_wish === 'Không tái' ? 'danger' : 'warn'}">${esc(r.restock_wish || '')}</span></td><td>${esc(r.note || '')}</td><td>${esc(r.created_by_name || '')}</td><td>${can('can_manage_product_feedback') ? `<button class="btn small danger feedbackDeleteBtn" data-id="${r.id}">Xóa</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có đánh giá sản phẩm hằng ngày</div>';
  shell(`${collectionManager}${form}<div class="card" style="margin-top:16px"><div class="section-title"><h3>Danh mục đánh giá đang áp dụng</h3></div>${filter}${collectionCards}</div><div class="card" style="margin-top:16px"><h3>Tổng hợp đánh giá theo tên sản phẩm</h3><p class="hint">Dữ liệu hằng ngày của cửa hàng sẽ được gom lại theo SKU/Tên SP để PKD xem nhanh sản phẩm nào nên tái, không tái hoặc cần theo dõi thêm.</p>${summaryRows}</div><div class="card" style="margin-top:16px"><h3>Chi tiết đánh giá hằng ngày</h3>${detailRows}</div>`, 'Đánh giá sản phẩm', 'Cửa hàng đánh giá theo BST/List do admin set, hệ thống tự tổng hợp theo sản phẩm');
  $('#feedbackStoreFilter')?.addEventListener('change', e => { state.feedbackStoreId = e.target.value; state.feedbackCollectionId = ''; renderProductFeedback(); });
  $('#feedbackStoreFilter2')?.addEventListener('change', e => { state.feedbackStoreId = e.target.value; state.feedbackCollectionId = ''; renderProductFeedback(); });
  $('#feedbackMonthPicker')?.addEventListener('change', e => { state.feedbackMonth = e.target.value; state.feedbackCollectionId = ''; renderProductFeedback(); });
  $('#feedbackMonthFilter')?.addEventListener('change', e => { state.feedbackMonth = e.target.value; state.feedbackCollectionId = ''; renderProductFeedback(); });
  $('#feedbackCollectionFilter')?.addEventListener('change', e => { state.feedbackCollectionId = e.target.value; renderProductFeedback(); });
  $('#feedbackCollectionFilter2')?.addEventListener('change', e => { state.feedbackCollectionId = e.target.value; renderProductFeedback(); });
  $('#productCollectionForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target));
    try {
      await api('/api/product-collections', { method: 'POST', body: JSON.stringify(payload) });
      toast('Đã lưu BST/List sản phẩm');
      state.feedbackMonth = payload.collection_month || state.feedbackMonth;
      state.feedbackCollectionId = '';
      renderProductFeedback();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $('#productFeedbackForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd);
    try {
      const picked = JSON.parse(payload.product_pick || '{}');
      payload.sku = picked.sku || '';
      payload.product_name = picked.product_name || '';
      delete payload.product_pick;
      await api('/api/product-feedback', { method: 'POST', body: JSON.stringify(payload) });
      toast('Đã lưu đánh giá sản phẩm');
      renderProductFeedback();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $$('.collectionDeleteBtn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Xóa BST/List này? Các đánh giá cũ vẫn giữ nhưng list sẽ không còn hiển thị để nhập mới.')) return;
    try { await api(`/api/product-collections/${btn.dataset.id}`, { method: 'DELETE' }); toast('Đã xóa BST/List'); state.feedbackCollectionId = ''; renderProductFeedback(); } catch (err) { toast(err.message, 'danger'); }
  }));
  $$('.feedbackDeleteBtn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Xóa đánh giá sản phẩm này?')) return;
    try { await api(`/api/product-feedback/${btn.dataset.id}`, { method: 'DELETE' }); toast('Đã xóa đánh giá'); renderProductFeedback(); } catch (err) { toast(err.message, 'danger'); }
  }));
}

async function renderProductTraining() {
  const allScope = isAllStoreUser() || (!state.user.store_id && (can('can_manage_product_training') || can('can_view_product_training')));
  const defaultStoreId = allScope ? (state.trainingStoreId || '') : (state.user.store_id || '');
  state.trainingStoreId = defaultStoreId;
  const data = await api(`/api/product-trainings${defaultStoreId ? `?store_id=${defaultStoreId}` : ''}`);
  const rowsData = data.trainings || [];
  const storeOptions = `<option value="">Toàn hệ thống</option>${state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(defaultStoreId) ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}`;
  const quizHelp = `Mỗi dòng 1 câu theo mẫu: Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | A. Ví dụ: Chất liệu chính là gì? | Cotton | Linen | Denim | Kate | A`;
  const quickPaste = can('can_manage_product_training') ? `<div class="training-quick-fill"><div class="toolbar"><div><h3>Điền nhanh từ file training BST</h3><p class="hint">Copy bảng từ Excel/Google Sheets rồi dán vào đây. Hệ thống tự gom theo TÊN SẢN PHẨM, không lấy SKU làm khóa; nhiều màu/mã cùng tên chỉ giữ 1 bài học + 1 bài test. Cột “Link ảnh sản phẩm” sẽ tự đổ vào đúng ô ảnh và hiển thị trực tiếp trên web.</p></div></div><textarea class="input" id="trainingQuickPaste" rows="5" placeholder="Dán bảng training ở đây. Dòng đầu nên là tiêu đề cột."></textarea><div class="toolbar"><button class="btn secondary" type="button" id="trainingFillFirstBtn">Đổ sản phẩm đầu vào form</button><button class="btn" type="button" id="trainingSaveAllBtn">Lưu nhanh sau khi gom màu</button><button class="btn secondary" type="button" id="trainingTemplateBtn">Tải mẫu copy</button><span class="hint" id="trainingQuickHint"></span></div></div>` : '';
  const adminTrainingGuide = can('can_manage_product_training') ? `<div class="card training-flow-guide training-flow-guide-soft"><h3>Luồng học mới cho nhân viên</h3><div class="training-flow-steps"><div><b>1. Học theo từng sản phẩm</b><p>Nhân viên xem ảnh, màu hiện có, chất liệu, form và cách tư vấn trong từng thẻ bài học.</p></div><div><b>2. Xác nhận đã học</b><p>Mỗi bài học chỉ cần bấm Đã học xong. Không làm test ngay trong thẻ sản phẩm.</p></div><div><b>3. Làm bài test tổng</b><p>Sau khi học xong toàn bộ bài đang áp dụng, nhân viên làm 1 bài test tổng chung.</p></div></div></div>` : '';
  const employeeTrainingGuide = !can('can_manage_product_training') ? `<div class="card training-student-hero"><div><p class="eyebrow">Học sản phẩm mới</p><h3>Học hết bài trước, test tổng sau</h3><p class="hint">Mở từng sản phẩm để xem ảnh và nội dung cần nhớ. Sau khi đã bấm Đã học xong cho toàn bộ bài học, nút Làm bài test tổng sẽ mở.</p></div></div>` : '';
  const form = can('can_manage_product_training') ? `<div class="card"><h3>Nhập đào tạo sản phẩm + bài test tổng</h3><p class="hint">Admin nhập bài học trước. Nhân viên sẽ học từng sản phẩm, sau đó làm 1 bài test tổng chung cho toàn bộ bài học đang áp dụng.</p>${quickPaste}<form id="productTrainingForm" class="grid three">
    <div class="field"><label>Áp dụng cho</label><select class="input" name="store_id">${storeOptions}</select></div>
    <div class="field"><label>SKU / Mã cha tham khảo</label><input class="input" name="sku" placeholder="Mã tham khảo nếu có"></div>
    <div class="field"><label>Tên SP</label><input class="input" name="product_name" placeholder="Tên sản phẩm" required></div>
    <div class="field"><label>Màu hiện có</label><input class="input" name="color_options" placeholder="VD: ĐEN, BE, GHI"></div>
    <div class="field"><label>Link ảnh sản phẩm</label><input class="input" name="image_url" placeholder="Dán link ảnh trực tiếp hoặc link Google Drive có quyền xem"><input class="input training-image-file" type="file" name="image_file" accept="image/*"><div class="hint">Upload ảnh trực tiếp hoặc dán link Drive có quyền xem để hiện trong bài học.</div><div id="trainingImagePreview" class="training-image-preview"></div></div>
    <div class="field"><label>Link sản phẩm</label><input class="input" name="product_url" placeholder="Dán link sản phẩm trên web/sàn nếu có"><div class="hint">Nhân viên có thể bấm mở link sản phẩm để xem thêm.</div></div>
    <div class="field"><label>Dự kiến hàng về</label><input class="input" type="date" name="arrival_date"></div>
    <div class="field"><label>Trạng thái</label><select class="input" name="status_label"><option value="Sắp về">Sắp về</option><option value="Đang bán">Đang bán</option><option value="Tạm ngưng">Tạm ngưng</option></select></div>
    <div class="field"><label>Yêu cầu học</label><select class="input" name="is_required"><option value="1">Bắt buộc học</option><option value="0">Không bắt buộc</option></select></div>
    <div class="field"><label>Thời hạn hoàn thành</label><input class="input" type="datetime-local" name="due_at"></div>
    <div class="field"><label>Điểm đạt (%)</label><input class="input" type="number" name="pass_percent" value="90" min="1" max="100"></div>
    <div class="field"><label>Chất liệu</label><textarea class="input" name="material" placeholder="Thành phần vải, độ co giãn, độ dày, cảm giác mặc..."></textarea></div>
    <div class="field"><label>Kiểu dáng / form</label><textarea class="input" name="style_info" placeholder="Dáng ôm/rộng, chiều dài, phù hợp body nào..."></textarea></div>
    <div class="field"><label>Điểm bán hàng</label><textarea class="input" name="selling_points" placeholder="Điểm nổi bật để tư vấn cho khách"></textarea></div>
    <div class="field"><label>Cách tư vấn / bảo quản</label><textarea class="input" name="care_instruction" placeholder="Cách phối, cách giặt/ủi, lưu ý khi bảo quản"></textarea></div>
    <div class="field"><label>Lỗi / điểm cần lưu ý</label><textarea class="input" name="common_errors" placeholder="VD: dễ nhăn, cần thử size, cần kiểm tra khóa..."></textarea></div>
    <div class="field"><label>Ghi chú đào tạo</label><textarea class="input" name="training_note" placeholder="Thông tin thêm cho cửa hàng"></textarea></div>
    <div class="field" style="grid-column:1/-1"><label>Câu hỏi cho bài test tổng</label><textarea class="input" name="quiz_text" rows="5" placeholder="${esc(quizHelp)}"></textarea><p class="hint">${esc(quizHelp)}. Các câu hỏi của từng sản phẩm sẽ được gom vào 1 bài test tổng cho nhân viên.</p></div>
    <div class="toolbar" style="grid-column:1/-1"><button class="btn" id="trainingFormSaveBtn">Lưu bài đào tạo</button><button class="btn secondary" id="trainingFormCancelBtn" type="button" style="display:none">Hủy sửa</button><span class="hint" id="trainingEditHint"></span></div>
  </form></div>` : '';
  const filter = allScope ? `<div class="field"><label>Lọc phạm vi</label><select class="input" id="trainingStoreFilter">${storeOptions}</select></div>` : '';
  const combinedQuizBlock = () => {
    const qz = state.trainingCombinedQuiz;
    if (!qz) return '';
    if (qz.loading) return `<div class="training-combined-quiz card"><div class="empty">Đang tải bài test tổng...</div></div>`;
    if (qz.error) return `<div class="training-combined-quiz card"><div class="empty">${esc(qz.error)}</div><button class="btn secondary" id="trainingCloseCombinedBtn" type="button">Đóng</button></div>`;
    const questions = qz.questions || [];
    if (!questions.length) return `<div class="training-combined-quiz card"><div class="empty">Chưa có câu hỏi test cho các bài học đang áp dụng.</div><button class="btn secondary" id="trainingCloseCombinedBtn" type="button">Đóng</button></div>`;
    let currentProduct = '';
    const qs = questions.map((q, idx) => {
      const productHeader = currentProduct !== q.product_name ? (currentProduct = q.product_name, `<div class="training-test-product-title">${esc(q.product_name || 'Sản phẩm')}</div>`) : '';
      return `${productHeader}<div class="quiz-question training-total-question"><b>Câu ${idx + 1}. ${esc(q.question)}</b>${(q.options || []).map((op, oi) => `<label class="quiz-option"><input type="radio" name="q_${idx}" value="${oi}" required> ${String.fromCharCode(65 + oi)}. ${esc(op)}</label>`).join('')}</div>`;
    }).join('');
    return `<form class="training-combined-quiz card" id="trainingCombinedQuizForm"><div class="toolbar training-combined-head"><div><p class="eyebrow">Bài test tổng</p><h3>${questions.length} câu • ${qz.trainingCount || 0} sản phẩm</h3><p class="hint">Bài test này gom câu hỏi từ toàn bộ bài học đã học. Không làm test riêng trong từng thẻ sản phẩm.</p></div><button class="btn secondary" id="trainingCloseCombinedBtn" type="button">Đóng test</button></div>${qs}<button class="btn training-submit-total">Nộp bài test tổng</button></form>`;
  };
  const progressBadge = (r) => {
    const p = r.progress || {};
    if (p.passed) return `<span class="badge ok">Đã đạt ${Number(p.best_score || 0).toFixed(2)}%</span>`;
    if (p.attempts_count) return `<span class="badge danger">Chưa đạt • cao nhất ${Number(p.best_score || 0).toFixed(2)}%</span>`;
    if (p.learned) return `<span class="badge ok">Đã học xong</span>`;
    return `<span class="badge warning">Chưa học</span>`;
  };
  const trainingRawImageUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/IMAGE\(\s*["']([^"']+)["']/i);
    return String(match ? match[1] : raw).trim();
  };
  const trainingDriveId = (url) => {
    const raw = String(url || '').trim();
    let m = raw.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (m) return m[1];
    m = raw.match(/[?&]id=([^&#]+)/i);
    if (/drive\.google\.com|docs\.google\.com/i.test(raw) && m) return m[1];
    m = raw.match(/drive\.google\.com\/thumbnail\?id=([^&#]+)/i);
    if (m) return m[1];
    return '';
  };
  const trainingImageCandidatesForView = (value) => {
    const url = trainingRawImageUrl(value);
    if (!url) return [];
    if (/^\/uploads\//i.test(url)) return [url];
    if (!/^https?:\/\//i.test(url)) return [];
    const id = trainingDriveId(url);
    if (id) return [`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`, `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`, `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w1200`, url];
    return [url];
  };
  const trainingOpenImageUrl = (value) => {
    const url = trainingRawImageUrl(value);
    const id = trainingDriveId(url);
    if (id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
    return /^https?:\/\//i.test(url) ? url : '';
  };
  const assigneeTable = (r) => (can('can_manage_product_training') && Number(r.is_required || 0) === 1 && r.assignees && r.assignees.length)
    ? `<details class="training-progress"><summary>Tiến độ học (${r.assignees.filter(a => a.passed).length}/${r.assignees.length} đạt • ${r.assignees.filter(a => a.learned).length}/${r.assignees.length} đã học)</summary><div class="table-wrap"><table><thead><tr><th>Nhân viên</th><th>Cửa hàng</th><th>Đã học</th><th>Điểm cao nhất</th><th>Trạng thái test</th><th>Lần làm</th></tr></thead><tbody>${r.assignees.map(a => `<tr><td>${esc(a.full_name)}</td><td>${esc(a.store_name)}</td><td>${a.learned ? '<span class="badge ok">Đã học</span>' : '<span class="badge warning">Chưa học</span>'}</td><td>${Number(a.best_score || 0).toFixed(2)}%</td><td>${a.passed ? '<span class="badge ok">Đạt</span>' : '<span class="badge danger">Chưa đạt</span>'}</td><td>${Number(a.attempts_count || 0)}</td></tr>`).join('')}</tbody></table></div></details>` : '';
  const canStudentAction = (Number(state.user?.permissions?.can_view_product_training || 0) === 1 || Number(state.user?.permissions?.can_manage_product_training || 0) === 1) && ['employee','manager'].includes(state.user.role);
  const visibleLessons = rowsData;
  const learnedLessons = visibleLessons.filter(r => r.progress && r.progress.learned);
  const passedLessons = visibleLessons.filter(r => r.progress && r.progress.passed);
  const pendingLessons = visibleLessons.filter(r => !(r.progress && r.progress.learned));
  const testableLessons = visibleLessons.filter(r => Number(r.quiz_question_count || 0) > 0);
  const canStartTotalTest = canStudentAction && visibleLessons.length > 0 && pendingLessons.length === 0 && testableLessons.length > 0;
  const trainingStats = canStudentAction ? `<div class="training-student-status card"><div><p class="eyebrow">Tiến độ học</p><h3>${learnedLessons.length}/${visibleLessons.length} bài đã học</h3><p class="hint">Học xong toàn bộ bài đang áp dụng mới mở bài test tổng.</p></div><div class="training-stat-pills"><span class="badge ${pendingLessons.length ? 'warning' : 'ok'}">${pendingLessons.length ? `Còn ${pendingLessons.length} bài chưa học` : 'Đã học đủ'}</span><span class="badge ${passedLessons.length === visibleLessons.length && visibleLessons.length ? 'ok' : 'dark'}">${passedLessons.length}/${visibleLessons.length} bài đã đạt</span></div><button class="btn training-total-test-btn" id="trainingStartCombinedBtn" type="button" ${canStartTotalTest ? '' : 'disabled'}>${canStartTotalTest ? 'Làm bài test tổng' : 'Chưa mở bài test tổng'}</button></div>${combinedQuizBlock()}` : '';
  const lessonSection = (title, body, icon = '') => {
    const text = String(body || '').trim();
    return text ? `<section class="training-lesson-section"><b>${icon ? `${icon} ` : ''}${esc(title)}</b><p>${esc(text)}</p></section>` : '';
  };
  const lessonImageHtml = (r, compact = false) => {
    const imageCandidates = trainingImageCandidatesForView(r.image_url);
    const openImage = trainingOpenImageUrl(r.image_url);
    if (imageCandidates.length) return `<div class="${compact ? 'training-lesson-thumb' : 'training-product-image training-lesson-image'}"><img class="training-view-image" src="${esc(imageCandidates[0])}" data-fallbacks="${esc(JSON.stringify(imageCandidates.slice(1)))}" alt="${esc(r.product_name || '')}" loading="lazy"><div class="training-image-fallback">Không tải được ảnh trực tiếp.${openImage ? ` <a class="link" href="${esc(openImage)}" target="_blank" rel="noopener">Mở ảnh sản phẩm</a>` : ''}</div></div>`;
    return `<div class="${compact ? 'training-lesson-thumb image-empty' : 'training-product-image training-lesson-image image-empty'}"><span>Chưa có ảnh</span></div>`;
  };
  const rows = rowsData.length ? rowsData.map((r, idx) => {
    const dueBad = r.due_at && new Date(r.due_at) < new Date() && !(r.progress && r.progress.passed);
    const quizCount = Number(r.quiz_question_count || 0);
    const learned = !!(r.progress && r.progress.learned);
    const passed = !!(r.progress && r.progress.passed);
    const openAttr = (canStudentAction && !learned && idx < 2) ? ' open' : '';
    const meta = `${r.color_options ? `Màu: ${esc(r.color_options)} • ` : ''}${esc(r.store_name || 'Toàn hệ thống')} • Hàng về: ${r.arrival_date ? dOnly(r.arrival_date) : 'Chưa có ngày'}${r.due_at ? ` • Hạn học: ${dt(r.due_at)}` : ''}`;
    const studentAction = canStudentAction ? (learned ? `<span class="badge ok">Đã học xong</span>` : `<button class="btn small trainingReadyBtn" data-id="${r.id}" type="button">Đã học xong bài này</button>`) : '';
    const editBtn = can('can_manage_product_training') ? `<button class="btn small secondary trainingEditBtn" data-id="${r.id}" type="button">Sửa</button>` : '';
    const deleteBtn = can('can_manage_product_training') ? `<button class="btn small danger trainingDeleteBtn" data-id="${r.id}" type="button">Xóa</button>` : '';
    return `<details class="training-lesson-card ${learned ? 'is-learned' : 'is-pending'}"${openAttr}>
      <summary class="training-lesson-summary">
        ${lessonImageHtml(r, true)}
        <div class="training-lesson-main"><div class="training-lesson-badges"><span class="badge dark">${esc(r.status_label || 'Sắp về')}</span>${Number(r.is_required || 0) ? `<span class="badge ${dueBad ? 'danger' : 'warning'}">Bắt buộc học</span>` : ''}${passed ? '<span class="badge ok">Đã đạt test</span>' : (learned ? '<span class="badge ok">Đã học</span>' : '<span class="badge warning">Chưa học</span>')}</div><h3>${esc(r.product_name || '')}</h3><p class="hint">${meta}</p></div>
        <div class="training-lesson-arrow">⌄</div>
      </summary>
      <div class="training-lesson-body">
        ${lessonImageHtml(r)}
        <div class="training-lesson-top-actions">${r.product_url ? `<a class="btn small secondary" href="${esc(r.product_url)}" target="_blank" rel="noopener">Mở link sản phẩm</a>` : ''}${editBtn}${deleteBtn}</div>
        <div class="training-quick-facts"><span>${esc(r.sku || 'Chưa có mã tham khảo')}</span>${r.color_options ? `<span>${esc(r.color_options)}</span>` : ''}<span>${quizCount} câu trong test tổng</span></div>
        <div class="training-lesson-sections">
          ${lessonSection('Chất liệu', r.material, '01')}
          ${lessonSection('Kiểu dáng / form', r.style_info, '02')}
          ${lessonSection('Điểm bán hàng', r.selling_points, '03')}
          ${lessonSection('Cách tư vấn / bảo quản', r.care_instruction, '04')}
          ${lessonSection('Lỗi cần lưu ý', r.common_errors, '05')}
          ${lessonSection('Ghi chú đào tạo', r.training_note, '06')}
        </div>
        <div class="toolbar training-actions"><span class="badge">${quizCount} câu test</span>${canStudentAction ? progressBadge(r) : ''}${studentAction}</div>
        ${assigneeTable(r)}
      </div>
    </details>`;
  }).join('') : '<div class="empty">Chưa có bài đào tạo sản phẩm</div>';
  const exportBtns = can('can_export') ? '<button class="btn secondary" data-export="product_trainings">Tải CSV đào tạo SP</button><button class="btn secondary" data-export="product_training_attempts">Tải CSV kết quả kiểm tra</button>' : '';
  const listTitle = can('can_manage_product_training') ? 'Thư viện đào tạo sản phẩm' : 'Bài học sản phẩm cần học';
  shell(`${adminTrainingGuide}${employeeTrainingGuide}${form}${trainingStats}<div class="card training-lesson-list-card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">${listTitle}</h3>${filter}${exportBtns}</div>${rows}</div>`, 'Học & Test sản phẩm', 'Học từng bài trước, sau đó làm 1 bài test tổng chung cho toàn bộ bài học');
  $$('.training-view-image').forEach(img => img.addEventListener('error', () => {
    let fallbacks = [];
    try { fallbacks = JSON.parse(img.dataset.fallbacks || '[]'); } catch (_err) { fallbacks = []; }
    const next = fallbacks.shift();
    if (next) {
      img.dataset.fallbacks = JSON.stringify(fallbacks);
      img.src = next;
      return;
    }
    const box = img.closest('.training-product-image');
    if (box) box.classList.add('image-error');
    img.remove();
  }));
  const normalizeTrainingKey = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').trim();
  const pickTrainingValue = (row, keys) => {
    const entries = Object.keys(row || {}).map(k => [k, normalizeTrainingKey(k)]);
    const wanted = (keys || []).map(normalizeTrainingKey);
    // Ưu tiên khớp chính xác tiêu đề để tránh nhầm "Ảnh sản phẩm" với "Link sản phẩm".
    for (const target of wanted) {
      const exact = entries.find(([, nk]) => nk === target);
      if (exact && String(row[exact[0]] || '').trim()) return row[exact[0]] || '';
    }
    // Sau đó mới cho phép khớp gần với các tiêu đề dài hơn.
    for (const target of wanted) {
      const fuzzy = entries.find(([, nk]) => nk.includes(target) || target.includes(nk));
      if (fuzzy && String(row[fuzzy[0]] || '').trim()) return row[fuzzy[0]] || '';
    }
    return '';
  };
  const uniqText = (items) => Array.from(new Set((items || []).map(x => String(x || '').trim()).filter(Boolean)));
  const cleanImageUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const formulaMatch = raw.match(/(?:IMAGE|HYPERLINK)\(\s*["']([^"']+)["']/i);
    const urlMatch = raw.match(/https?:\/\/[^\s"']+/i);
    const url = formulaMatch ? formulaMatch[1] : (urlMatch ? urlMatch[0] : raw);
    if (/^\/uploads\//i.test(url)) return url;
    return /^https?:\/\//i.test(url) ? url : '';
  };
  const trainingImageDisplaySrc = (value) => {
    const url = cleanImageUrl(value);
    if (!url) return '';
    const m1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
    const m2 = url.match(/[?&]id=([^&]+)/i);
    if (/drive\.google\.com/i.test(url) && m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
    return url;
  };
  const parseTrainingPaste = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return [];
    const firstLine = (text.match(/^[^\r\n]*/) || [''])[0];
    const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');
    const table = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') { cell += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (!inQuotes && ch === delimiter) {
        row.push(cell.trim());
        cell = '';
      } else if (!inQuotes && (ch === '\n' || ch === '\r')) {
        row.push(cell.trim());
        if (row.some(Boolean)) table.push(row);
        row = [];
        cell = '';
        if (ch === '\r' && next === '\n') i++;
      } else {
        cell += ch;
      }
    }
    row.push(cell.trim());
    if (row.some(Boolean)) table.push(row);
    if (!table.length) return [];
    let headers = table[0].map(x => String(x || '').trim());
    const headerText = headers.map(normalizeTrainingKey).join(' ');
    const hasHeader = /sku|ma sp|ma cha|san pham|ten sp|chat lieu|form|kieu dang|diem ban|bao quan|quiz|cau hoi|hinh anh|anh san pham|mau/.test(headerText);
    if (!hasHeader) headers = ['sku','product_name','color_options','image_url','arrival_date','status_label','material','style_info','selling_points','care_instruction','common_errors','training_note','quiz_text'];
    const start = hasHeader ? 1 : 0;
    return table.slice(start).map(cols => {
      const rowObj = {};
      headers.forEach((h, i) => rowObj[h || `col_${i}`] = cols[i] || '');
      rowObj.__cols = cols;
      rowObj.__headers = headers;
      return rowObj;
    }).filter(rowObj => Object.values(rowObj).some(Boolean));
  };
  const rowToTrainingPayload = (row) => {
    const formEl = $('#productTrainingForm');
    const fd = formEl ? Object.fromEntries(new FormData(formEl)) : {};
    const cols = Array.isArray(row?.__cols) ? row.__cols : [];
    const positional = (index) => String(cols[index] || '').trim();
    // Thứ tự chuẩn của sheet UPLOAD_WEB_TRAINING_BST: A:P.
    const sheetLooksStandard = cols.length >= 14;
    return {
      ...fd,
      sku: pickTrainingValue(row, ['sku','ma sp','ma san pham','ma cha','code']) || (sheetLooksStandard ? positional(0) : '') || fd.sku || '',
      product_name: pickTrainingValue(row, ['ten sp','ten san pham','san pham','product name','product']) || (sheetLooksStandard ? positional(1) : '') || fd.product_name || '',
      color_options: pickTrainingValue(row, ['mau hien co','mau','color','colour']) || fd.color_options || '',
      image_url: cleanImageUrl(pickTrainingValue(row, ['link anh san pham','url anh san pham','link hinh anh san pham','image url','link anh','url anh']) || (sheetLooksStandard && cols.length >= 17 ? positional(16) : '') || pickTrainingValue(row, ['anh san pham','anh sp','hinh anh','image','photo']) || (sheetLooksStandard ? positional(4) : '')) || fd.image_url || '',
      product_url: cleanImageUrl(pickTrainingValue(row, ['link san pham','url san pham','product url','product link','link sp','duong dan san pham']) || (sheetLooksStandard && cols.length >= 16 ? positional(14) : '')) || fd.product_url || '',
      arrival_date: pickTrainingValue(row, ['ngay hang ve','du kien hang ve','arrival']) || fd.arrival_date || '',
      status_label: pickTrainingValue(row, ['trang thai','status']) || fd.status_label || 'Sắp về',
      material: pickTrainingValue(row, ['chat lieu','thanh phan vai','material','fabric']) || fd.material || '',
      style_info: pickTrainingValue(row, ['kieu dang','form','phom','dang','style']) || fd.style_info || '',
      selling_points: pickTrainingValue(row, ['diem ban hang','diem noi bat','usp','selling']) || fd.selling_points || '',
      care_instruction: pickTrainingValue(row, ['cach tu van','bao quan','care','phoi do','giat']) || fd.care_instruction || '',
      common_errors: pickTrainingValue(row, ['loi','luu y loi','diem can luu y','common error']) || fd.common_errors || '',
      training_note: pickTrainingValue(row, ['ghi chu dao tao','ghi chu','note','feedback']) || fd.training_note || '',
      quiz_text: pickTrainingValue(row, ['bai kiem tra','quiz','cau hoi','test']) || fd.quiz_text || '',
      is_required: fd.is_required || '1',
      pass_percent: fd.pass_percent || '90',
      due_at: pickTrainingValue(row, ['han hoan thanh','thoi han hoan thanh','han hoc','deadline','due at','due date']) || (sheetLooksStandard && cols.length >= 16 ? positional(15) : '') || fd.due_at || '',
      store_id: fd.store_id || ''
    };
  };
  const groupTrainingPayloads = (rows) => {
    const grouped = new Map();
    rows.forEach(row => {
      const payload = rowToTrainingPayload(row);
      const key = normalizeTrainingKey(payload.product_name || payload.sku);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, { ...payload, _colors: [], _images: [], _productLinks: [], _notes: [] });
      const base = grouped.get(key);
      base._colors.push(payload.color_options);
      base._images.push(payload.image_url);
      base._productLinks.push(payload.product_url);
      base._notes.push(payload.training_note);
      ['arrival_date','status_label','material','style_info','selling_points','care_instruction','common_errors','quiz_text','product_url','store_id','due_at','pass_percent','is_required'].forEach(k => {
        if (!base[k] && payload[k]) base[k] = payload[k];
      });
    });
    return Array.from(grouped.values()).map(payload => {
      const colors = uniqText(payload._colors.flatMap(v => String(v || '').split(/[,;\n]+/))).join(', ');
      const image = uniqText(payload._images)[0] || payload.image_url || '';
      const productLink = uniqText(payload._productLinks)[0] || payload.product_url || '';
      const notes = uniqText(payload._notes);
      delete payload._colors; delete payload._images; delete payload._productLinks; delete payload._notes;
      payload.color_options = colors || payload.color_options || '';
      payload.image_url = image;
      payload.product_url = productLink;
      if (colors && !String(payload.selling_points || '').toLowerCase().includes('màu hiện có')) {
        payload.selling_points = `${payload.selling_points || ''}${payload.selling_points ? '\n' : ''}Màu hiện có: ${colors}`;
      }
      if (!payload.training_note && notes.length) payload.training_note = notes.join('\n---\n');
      return payload;
    });
  };
  const fillTrainingForm = (payload) => {
    const formEl = $('#productTrainingForm');
    if (!formEl) return;
    Object.keys(payload || {}).forEach(k => {
      const el = formEl.elements[k];
      if (el) el.value = payload[k] || '';
    });
  };
  $('#trainingFillFirstBtn')?.addEventListener('click', () => {
    const rows = parseTrainingPaste($('#trainingQuickPaste')?.value || '');
    if (!rows.length) return toast('Chưa có dữ liệu để đổ vào form', 'danger');
    const payloads = groupTrainingPayloads(rows);
    fillTrainingForm(payloads[0]);
    updateTrainingImagePreview();
    resolveTrainingImageFromProductLink($('#productTrainingForm'), true);
    $('#trainingQuickHint').textContent = `Đã đổ sản phẩm đầu. ${rows.length} dòng đã gom thành ${payloads.length} sản phẩm.`;
    toast('Đã đổ thông tin vào form');
  });
  $('#trainingSaveAllBtn')?.addEventListener('click', async () => {
    const rows = parseTrainingPaste($('#trainingQuickPaste')?.value || '');
    if (!rows.length) return toast('Chưa có dữ liệu để lưu nhanh', 'danger');
    const payloads = groupTrainingPayloads(rows);
    if (!payloads.length) return toast('Không tìm thấy SKU/Tên SP để lưu', 'danger');
    if (!confirm(`Lưu nhanh ${payloads.length} sản phẩm sau khi gom màu? Dữ liệu dán có ${rows.length} dòng.`)) return;
    let ok = 0;
    try {
      for (const payload of payloads) {
        if (!payload.sku && !payload.product_name) continue;
        await resolveTrainingPayloadImage(payload);
        await api('/api/product-trainings', { method: 'POST', body: JSON.stringify(payload) });
        ok++;
      }
      toast(`Đã lưu nhanh ${ok} bài đào tạo sản phẩm sau khi gom màu`);
      renderProductTraining();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $('#trainingTemplateBtn')?.addEventListener('click', () => {
    const header = ['Tên SP / Tên sản phẩm','SKU tham khảo / Mã cha','BST','Màu hiện có','Ảnh sản phẩm','Link sản phẩm','Ngày hàng về','Trạng thái','Hạn hoàn thành','Chất liệu','Kiểu dáng / form','Điểm bán hàng / USP','Cách tư vấn / bảo quản','Lỗi / điểm cần lưu ý','Ghi chú đào tạo','Bài kiểm tra / quiz','Link ảnh sản phẩm'].join('\t');
    const sample = ['Tên sản phẩm mẫu','SKU001','BST 8.1','ĐEN, BE','','https://dezus.vn/...','2026-08-10','Sắp về','2026-08-12 22:00','Chất liệu / thành phần vải','Form / dáng mặc','Điểm nổi bật để tư vấn','Cách phối, cách bảo quản','Lưu ý lỗi/size/form','Ghi chú thêm','Câu hỏi | A | B | C | D | A','https://.../anh-san-pham.jpg'].join('\t');
    const blob = new Blob([header + '\n' + sample], { type:'text/tab-separated-values;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Mau_copy_training_BST.tsv'; a.click(); URL.revokeObjectURL(a.href);
  });
  const resolveTrainingImageFromProductLink = async (formEl, silent = false) => {
    const productUrl = cleanImageUrl(formEl?.elements?.product_url?.value || '');
    const currentImage = cleanImageUrl(formEl?.elements?.image_url?.value || '');
    if (!productUrl || currentImage) return currentImage;
    try {
      const data = await api('/api/product-trainings/resolve-image', { method:'POST', body: JSON.stringify({ product_url: productUrl }) });
      if (data.image_url && formEl.elements.image_url) {
        formEl.elements.image_url.value = data.image_url;
        updateTrainingImagePreview();
        if (!silent) toast('Đã tự lấy ảnh từ link sản phẩm');
      } else if (!silent) {
        toast('Trang sản phẩm không cho lấy ảnh tự động. Có thể dán link ảnh hoặc upload ảnh.', 'warning');
      }
      return data.image_url || '';
    } catch (err) {
      if (!silent) toast(err.message || 'Không lấy được ảnh từ link sản phẩm', 'danger');
      return '';
    }
  };
  const resolveTrainingPayloadImage = async (payload) => {
    if (cleanImageUrl(payload.image_url || '') || !cleanImageUrl(payload.product_url || '')) return payload;
    try {
      const data = await api('/api/product-trainings/resolve-image', { method:'POST', body: JSON.stringify({ product_url: payload.product_url }) });
      if (data.image_url) payload.image_url = data.image_url;
    } catch (_err) {}
    return payload;
  };
  const updateTrainingImagePreview = () => {
    const formEl = $('#productTrainingForm');
    if (!formEl) return;
    const preview = $('#trainingImagePreview');
    if (!preview) return;
    const fileInput = formEl.elements.image_file;
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (file) {
      const localSrc = URL.createObjectURL(file);
      preview.innerHTML = `<img src="${localSrc}" alt="Ảnh sản phẩm" onload="URL.revokeObjectURL(this.src)">`;
      return;
    }
    const url = cleanImageUrl(formEl.elements.image_url?.value || '');
    const src = trainingImageDisplaySrc(url);
    preview.innerHTML = src ? `<img src="${esc(src)}" alt="Ảnh sản phẩm" onerror="this.parentElement.innerHTML='<span>Không tải được ảnh/link ảnh</span>'">` : '';
  };
  const uploadTrainingImageIfNeeded = async (formEl) => {
    const fileInput = formEl?.elements?.image_file;
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return formEl?.elements?.image_url?.value || '';
    const fdImg = new FormData();
    fdImg.append('image', file);
    const resp = await fetch('/api/product-trainings/image', { method:'POST', headers: state.token ? { Authorization: 'Bearer ' + state.token } : {}, body: fdImg });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data.error || 'Không upload được ảnh sản phẩm');
    if (formEl.elements.image_url) formEl.elements.image_url.value = data.image_url || '';
    if (fileInput) fileInput.value = '';
    updateTrainingImagePreview();
    return data.image_url || '';
  };
  $('#productTrainingForm input[name="image_url"]')?.addEventListener('input', updateTrainingImagePreview);
  $('#productTrainingForm input[name="image_file"]')?.addEventListener('change', updateTrainingImagePreview);
  $('#productTrainingForm input[name="product_url"]')?.addEventListener('change', e => resolveTrainingImageFromProductLink(e.target.form));
  $('#productTrainingForm input[name="product_url"]')?.addEventListener('blur', e => resolveTrainingImageFromProductLink(e.target.form, true));
  $('#trainingStoreFilter')?.addEventListener('change', e => { state.trainingStoreId = e.target.value; state.trainingQuiz = null; renderProductTraining(); });
  const resetTrainingEditForm = () => {
    const formEl = $('#productTrainingForm');
    if (!formEl) return;
    formEl.reset();
    delete formEl.dataset.editId;
    const saveBtn = $('#trainingFormSaveBtn');
    const cancelBtn = $('#trainingFormCancelBtn');
    const hint = $('#trainingEditHint');
    if (saveBtn) saveBtn.textContent = 'Lưu bài đào tạo';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (hint) hint.textContent = '';
    updateTrainingImagePreview();
  };
  $('#trainingFormCancelBtn')?.addEventListener('click', resetTrainingEditForm);
  $$('.trainingEditBtn').forEach(btn => btn.addEventListener('click', () => {
    const row = rowsData.find(x => Number(x.id) === Number(btn.dataset.id));
    const formEl = $('#productTrainingForm');
    if (!row || !formEl) return;
    const fields = ['store_id','sku','product_name','color_options','image_url','product_url','arrival_date','status_label','is_required','due_at','pass_percent','material','style_info','selling_points','care_instruction','common_errors','training_note','quiz_text'];
    fields.forEach(k => {
      const el = formEl.elements[k];
      if (!el) return;
      let value = row[k] ?? '';
      if (k === 'due_at' && value) value = String(value).slice(0,16);
      if (k === 'arrival_date' && value) value = String(value).slice(0,10);
      el.value = value;
    });
    formEl.dataset.editId = row.id;
    $('#trainingFormSaveBtn').textContent = 'Lưu thay đổi';
    $('#trainingFormCancelBtn').style.display = '';
    $('#trainingEditHint').textContent = `Đang sửa: ${row.product_name || row.sku || ''}`;
    updateTrainingImagePreview();
    formEl.scrollIntoView({ behavior:'smooth', block:'start' });
  }));
  $('#productTrainingForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await uploadTrainingImageIfNeeded(e.target);
      await resolveTrainingImageFromProductLink(e.target, true);
      const payload = Object.fromEntries(new FormData(e.target));
      delete payload.image_file;
      const editId = e.target.dataset.editId;
      await api(editId ? `/api/product-trainings/${editId}` : '/api/product-trainings', { method: editId ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      toast(editId ? 'Đã lưu thay đổi bài học' : 'Đã lưu bài đào tạo sản phẩm');
      resetTrainingEditForm();
      renderProductTraining();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $$('.trainingReadyBtn').forEach(btn => btn.addEventListener('click', async () => {
    try {
      await api(`/api/product-trainings/${btn.dataset.id}/learned`, { method: 'POST' });
      toast('Đã xác nhận học xong');
      state.trainingQuiz = null;
      renderProductTraining();
    } catch (err) { toast(err.message, 'danger'); }
  }));
  $('#trainingCloseCombinedBtn')?.addEventListener('click', () => {
    state.trainingCombinedQuiz = null;
    renderProductTraining();
  });
  $('#trainingStartCombinedBtn')?.addEventListener('click', async () => {
    try {
      const lessons = rowsData.filter(r => Number(r.quiz_question_count || 0) > 0);
      const pending = lessons.filter(r => !(r.progress && r.progress.learned));
      if (pending.length) return toast(`Còn ${pending.length} bài chưa bấm Đã học xong`, 'danger');
      if (!lessons.length) return toast('Chưa có câu hỏi test để làm bài tổng', 'danger');
      state.trainingCombinedQuiz = { loading: true };
      renderProductTraining();
      const allQuestions = [];
      for (const lesson of lessons) {
        const qz = await api(`/api/product-trainings/${lesson.id}/quiz`);
        (qz.questions || []).forEach((q, qIndex) => allQuestions.push({ ...q, qIndex, training_id: lesson.id, product_name: lesson.product_name || qz.training?.product_name || '' }));
      }
      state.trainingCombinedQuiz = { questions: allQuestions, trainingCount: lessons.length };
      renderProductTraining();
      setTimeout(() => $('#trainingCombinedQuizForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      state.trainingCombinedQuiz = { error: err.message || 'Không tải được bài test tổng' };
      renderProductTraining();
    }
  });
  $('#trainingCombinedQuizForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const qz = state.trainingCombinedQuiz || {};
    const questions = qz.questions || [];
    const byTraining = new Map();
    questions.forEach((q, idx) => {
      if (!byTraining.has(q.training_id)) byTraining.set(q.training_id, []);
      const answers = byTraining.get(q.training_id);
      answers[Number(q.qIndex || 0)] = Number($(`input[name="q_${idx}"]:checked`, e.target)?.value);
    });
    try {
      let totalCorrect = 0, totalQuestions = 0, passedGroups = 0, totalGroups = 0;
      for (const [trainingId, answers] of byTraining.entries()) {
        const result = await api(`/api/product-trainings/${trainingId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
        totalCorrect += Number(result.correct_count || 0);
        totalQuestions += Number(result.total_questions || 0);
        passedGroups += result.passed ? 1 : 0;
        totalGroups += 1;
      }
      const score = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 10000) / 100 : 0;
      toast(`${passedGroups === totalGroups ? 'Đạt bài test tổng' : 'Chưa đạt đủ bài'}: ${score}% (${totalCorrect}/${totalQuestions} câu đúng)`, passedGroups === totalGroups ? 'ok' : 'danger');
      state.trainingCombinedQuiz = null;
      renderProductTraining();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $$('.trainingDeleteBtn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Xóa bài đào tạo sản phẩm này?')) return;
    try { await api(`/api/product-trainings/${btn.dataset.id}`, { method: 'DELETE' }); toast('Đã xóa bài đào tạo'); renderProductTraining(); } catch (err) { toast(err.message, 'danger'); }
  }));
}



async function renderCdpOjti() {
  const catalog = await api('/api/cdp-ojti-catalog');
  const positions = catalog.positions || [];
  if (!positions.length) return shell('<div class="card empty">Chưa có dữ liệu CDP/OJTI trong file đào tạo.</div>', 'CDP / OJTI');

  const canViewType = (t) => t === 'ojti'
    ? (Number(catalog.can_view_ojti || 0) === 1 || canAny('can_view_ojti','can_manage_ojti','can_view_cdp_ojti','can_manage_cdp_ojti'))
    : (Number(catalog.can_view_cdp || 0) === 1 || canAny('can_view_cdp','can_manage_cdp','can_view_cdp_ojti','can_manage_cdp_ojti'));
  const canManageType = (t) => t === 'ojti'
    ? (Number(catalog.can_manage_ojti || 0) === 1 || canAny('can_manage_ojti','can_manage_cdp_ojti'))
    : (Number(catalog.can_manage_cdp || 0) === 1 || canAny('can_manage_cdp','can_manage_cdp_ojti'));
  const viewTypes = [
    { key:'cdp', label:'CDP - Bảng chấm năng lực' },
    { key:'ojti', label:'OJTI - Đào tạo thường xuyên' }
  ].filter(t => canViewType(t.key));
  if (!viewTypes.length) return shell('<div class="card empty">Tài khoản này chưa được phân quyền xem CDP/OJTI.</div>', 'CDP / OJTI');

  let type = state.cdpOjtiType === 'ojti' ? 'ojti' : 'cdp';
  if (!viewTypes.some(t => t.key === type)) type = state.cdpOjtiType = viewTypes[0].key;
  const isCdp = type === 'cdp';
  if (!positions.some(p => p.key === state.cdpOjtiPosition)) state.cdpOjtiPosition = positions[0].key;
  const posKey = state.cdpOjtiPosition;
  const pos = positions.find(p => p.key === posKey) || positions[0];
  const bucket = pos[type] || { sections: [], open_fields: [] };
  const selectedStoreId = state.cdpOjtiStoreId || (isAllStoreUser() ? (state.boot.stores[0]?.id || '') : (state.user?.store_id || ''));
  const recordQuery = new URLSearchParams({ type, position_key: posKey });
  if (selectedStoreId) recordQuery.set('store_id', selectedStoreId);
  const recordData = await api(`/api/cdp-ojti-records?${recordQuery.toString()}`);
  const records = recordData.items || [];
  const canManage = Number(recordData.can_manage || 0) === 1 || canManageType(type);
  const edit = records.find(r => Number(r.id) === Number(state.cdpOjtiEditId));
  const itemMap = new Map((edit?.item_values || []).map(v => [String(v.code), v]));
  const openValues = edit?.open_values || {};
  const selectedTraineeId = Number((edit?.trainee_ids || [])[0] || (state.user?.role === 'employee' ? state.user.id : '') || 0);
  const storeOptions = state.boot.stores.map(st => `<option value="${st.id}" ${Number(st.id) === Number(selectedStoreId) ? 'selected' : ''}>${esc(st.name)}</option>`).join('');
  const people = usersInStore(selectedStoreId);
  const traineeOptions = ['<option value="">Chọn 1 nhân sự</option>'].concat(people.map(u => `<option value="${u.id}" ${Number(selectedTraineeId) === Number(u.id) ? 'selected' : ''}>${esc(u.full_name)} - ${roleLabel(u.role)}</option>`)).join('');
  const trainerOptions = ['<option value="">Chọn người đào tạo</option>'].concat(people.map(u => `<option value="${u.id}" ${Number(edit?.trainer_id || state.user?.id) === Number(u.id) ? 'selected' : ''}>${esc(u.full_name)}</option>`)).join('');
  const typeTabs = `<div class="pillbar">${viewTypes.map(t => `<button class="cdpTypeBtn ${type === t.key ? 'active' : ''}" data-type="${t.key}">${esc(t.label)}</button>`).join('')}</div>`;
  const positionTabs = `<div class="row wrap cdp-position-tabs">${positions.map(p => `<button class="btn small secondary cdpPosBtn ${posKey === p.key ? 'active' : ''}" data-pos="${esc(p.key)}">${esc(p.short || p.label)}</button>`).join('')}</div>`;
  const editStatusForSelect = type === 'ojti' && edit ? ojtiDisplayStatus(edit) : (edit?.status_label || 'doing');
  const statusOptions = [['doing','Chưa lên lịch'],['planned','Đã lên lịch training'],['follow','Đang theo dõi sau training'],['done','Hoàn thành']].map(([v,l]) => `<option value="${v}" ${editStatusForSelect === v ? 'selected' : ''}>${l}</option>`).join('');
  const defaultLevels = [
    'Mức 1: Chưa đạt / cần hướng dẫn sát, chưa tự thực hiện ổn định.',
    'Mức 2: Đạt cơ bản, làm được phần chính nhưng vẫn cần theo dõi và nhắc lại.',
    'Mức 3: Thành thạo, thực hiện ổn định và xử lý được phần lớn tình huống.',
    'Mức 4: Xuất sắc, chủ động làm chuẩn và có thể hướng dẫn lại cho người khác.'
  ];
  const renderLevelLine = (levels) => {
    const clean = (levels || []).map(v => String(v || '').trim()).filter(Boolean);
    const trivial = clean.length && clean.every(v => /^đạt\s*được\s*\d+$/i.test(v.replace(/\s+/g, ' ')) || /^đạt\s*được\d+$/i.test(v.replace(/\s+/g, '')));
    const use = (!clean.length || trivial) ? defaultLevels : clean;
    return use.map((lv, idx) => `<div class="cdp-level-line"><span>${idx + 1}</span><p>${esc(lv)}</p></div>`).join('');
  };
  const catalogLookup = new Map();
  (bucket.sections || []).forEach(section => (section.items || []).forEach(item => catalogLookup.set(String(item.code), { ...item, section_title: section.title })));
  const hasValue = (v) => !!(v && (v.score || v.note || v.training_start || v.training_end || v.task_remark));
  const itemCount = (bucket.sections || []).reduce((a,s)=>a+(s.items||[]).length,0);
  const scoreStats = (r) => {
    const vals = (r.item_values || []).filter(v => v.score !== '' && v.score !== null && v.score !== undefined && !Number.isNaN(Number(v.score)));
    const total = vals.reduce((a,v)=>a+Number(v.score || 0),0);
    const max = itemCount ? itemCount * 4 : vals.length * 4;
    const percent = max ? Math.round(total / max * 100) : 0;
    return { total, max, percent, count: vals.length };
  };
  const recordFilledCount = (r) => (r.item_values || []).filter(hasValue).length;
  const sectionHtml = (bucket.sections || []).map(section => {
    const rows = (section.items || []).map(item => {
      const val = itemMap.get(String(item.code)) || {};
      const remarkHtml = type === 'ojti' && val.task_remark
        ? `<div class="cdp-task-remark"><b>Remark từ công việc hằng ngày:</b><p>${esc(val.task_remark)}</p>${val.task_completed_at ? `<span>${dOnly(val.task_completed_at)}</span>` : ''}</div>`
        : '';
      const noteField = type === 'ojti'
        ? `<div class="cdp-ojti-inputs"><div class="field mini"><label>Ngày training</label><input class="input cdp-training-start" type="date" value="${esc(val.training_start || val.training_end || '')}" title="Ngày training"><input class="cdp-training-end" type="hidden" value="${esc(val.training_end || '')}"></div><div class="field grow"><label>Ghi chú training</label><textarea class="cdp-note" data-auto-resize placeholder="Ghi chú / kết quả training">${esc(val.note || '')}</textarea></div></div>${remarkHtml}`
        : `<div class="field grow cdp-assess-note"><label>Nhận xét</label><textarea class="cdp-note" data-auto-resize placeholder="Nhận xét / minh chứng / điểm cần follow">${esc(val.note || val.result || '')}</textarea></div>`;
      return `<div class="cdpItemRow cdp-check-row ${isCdp ? 'cdp-assessment-row' : ''}" data-code="${esc(item.code)}">
        <div class="cdp-check-top">
          <div class="cdp-check-code"><b>${esc(item.code)}</b><span>${esc(item.group || '')}</span></div>
          <div class="cdp-check-title"><b>${esc(item.competency || '')}</b>${item.criteria ? `<p>${esc(item.criteria)}</p>` : ''}</div>
          <div class="cdp-check-score"><label>Mức</label><select class="cdp-score"><option value=""></option>${[1,2,3,4].map(n => `<option value="${n}" ${String(val.score || '') === String(n) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        </div>
        <details class="cdp-level-details"><summary>Xem mô tả mức 1 - 4</summary><div class="cdp-level-grid">${renderLevelLine(item.levels)}</div></details>
        ${noteField}
      </div>`;
    }).join('');
    return `<details class="check-section cdp-template-section" open><summary>${esc(section.title)} <span class="badge dark">${(section.items || []).length}</span></summary><div class="cdp-check-list">${rows}</div></details>`;
  }).join('') || '<div class="empty">File chưa có nội dung cho vị trí này</div>';
  const openFields = (bucket.open_fields || []).map(f => `<div class="field" style="grid-column:1/-1"><label>${esc(f.label)}</label><textarea class="cdp-open-field" data-key="${esc(f.key)}" data-auto-resize placeholder="Nhập ${esc(String(f.label).toLowerCase())}">${esc(openValues[f.key] || '')}</textarea></div>`).join('');

  const renderRecordContent = (r) => {
    const values = (r.item_values || []).filter(hasValue);
    const open = r.open_values || {};
    const openHtml = Object.keys(open).filter(k => String(open[k] || '').trim()).map(k => `<div class="record-open-line"><b>${esc(k.replaceAll('_',' '))}</b><p>${esc(open[k])}</p></div>`).join('');
    const valuesHtml = values.length ? values.map(v => {
      const item = catalogLookup.get(String(v.code)) || {};
      return `<div class="record-detail-line">
        <div><b>${esc(v.code || '')} ${esc(item.competency || '')}</b><p>${esc(item.criteria || '')}</p></div>
        <div class="record-detail-meta">
          ${v.score ? `<span class="badge dark">Mức ${esc(v.score)}</span>` : ''}
          ${type === 'ojti' && (v.training_start || v.training_end) ? `<span class="badge warning">Training ${dOnly(v.training_end || v.training_start)}</span>` : ''}
        </div>
        ${v.note ? `<p class="record-note"><b>${type === 'ojti' ? 'Ghi chú training' : 'Nhận xét'}:</b> ${esc(v.note)}</p>` : ''}
        ${v.task_remark ? `<p class="record-note record-remark"><b>Remark công việc:</b> ${esc(v.task_remark)}${v.task_completed_at ? ` • ${dOnly(v.task_completed_at)}` : ''}</p>` : ''}
      </div>`;
    }).join('') : '<div class="empty">Bản này chưa có dòng nào được nhập.</div>';
    return `<div class="record-detail-box">${r.note ? `<p class="record-note"><b>Ghi chú chung:</b> ${esc(r.note)}</p>` : ''}${openHtml}${valuesHtml}</div>`;
  };
  const renderRecordCard = (r) => {
    const traineeNames = r.trainee_names || 'Chưa chọn nhân sự';
    const linkedCount = Object.keys(r.linked_task_ids || {}).length || (r.linked_task_id ? 1 : 0);
    const stats = scoreStats(r);
    return `<div class="simple-record-card cdp-record-card">
      <div class="record-card-main">
        <div><span class="badge dark">${type.toUpperCase()}</span><h4>${esc(traineeNames)}</h4><p>${esc(r.store_name || '')} • ${esc(r.position_label || pos.label)} • ${isCdp ? 'Ngày chấm' : 'Cập nhật'} ${dOnly(r.plan_date || r.updated_at || r.created_at)}</p></div>
        <div class="record-score"><b>${isCdp ? `${stats.percent}%` : recordFilledCount(r)}</b><span>${isCdp ? `${stats.total}/${stats.max || 0}` : 'dòng nhập'}</span></div>
      </div>
      <div class="record-card-meta">${isCdp ? `<span class="badge ok">Đã chấm</span><span class="badge dark">${stats.count}/${itemCount} tiêu chí</span>` : `${statusCdpLabel(ojtiDisplayStatus(r))} <span class="badge ${linkedCount ? 'ok' : 'dark'}">${linkedCount} việc</span> ${r.trainer_name ? `<span class="badge dark">Trainer: ${esc(r.trainer_name)}</span>` : ''}`}</div>
      <details class="record-content-details"><summary>Xem nội dung</summary>${renderRecordContent(r)}</details>
      ${canManage ? `<div class="row"><button class="btn small secondary editCdpBtn" data-id="${r.id}">Sửa</button><button class="btn small danger delCdpBtn" data-id="${r.id}">Xóa</button></div>` : ''}
    </div>`;
  };

  const summary = `<div class="grid four"><div class="card"><div class="kpi"><span class="label">Vị trí</span><span class="num small-num">${esc(pos.short || pos.label)}</span></div></div><div class="card"><div class="kpi"><span class="label">Số nhóm</span><span class="num">${(bucket.sections || []).length}</span></div></div><div class="card"><div class="kpi"><span class="label">Tiêu chí</span><span class="num">${itemCount}</span></div></div><div class="card"><div class="kpi"><span class="label">Bản đã lưu</span><span class="num">${records.length}</span></div></div></div>`;

  let mainContent = '';
  if (isCdp) {
    const historyCards = records.length ? records.map(renderRecordCard).join('') : '<div class="empty">Chưa có bản chấm CDP.</div>';
    const quick = `<div class="quick-action-grid cdp-quick-grid cdp-checklist-quick">
      ${canManage ? `<button class="quick-action-card" data-jump="#cdpCreate"><span>Tạo mới</span><b>Chấm CDP</b><em>Lưu / sửa giống checklist</em></button>` : ''}
      <button class="quick-action-card" data-jump="#cdpHistory"><span>Đã chấm</span><b>${records.length}</b><em>Xem lại nội dung</em></button>
    </div>`;
    const form = canManage ? `<div id="cdpCreate" class="card cdp-form-card">
      <div class="toolbar"><h3 style="margin-right:auto">${edit ? 'Sửa bản chấm CDP' : 'Tạo mới / chấm CDP'}</h3>${edit ? '<button class="btn secondary" id="cancelCdpEditBtn">Hủy sửa</button>' : ''}</div>
      <form id="cdpOjtiForm" class="grid three">
        <input type="hidden" name="id" value="${edit?.id || ''}"><input type="hidden" name="type" value="cdp"><input type="hidden" name="position_key" value="${esc(posKey)}"><input type="hidden" name="status_label" value="done">
        <div class="field"><label>Cửa hàng</label><select name="store_id" id="cdpStoreSelect" ${!isAllStoreUser() ? 'disabled' : ''}>${storeOptions}</select></div>
        <div class="field"><label>Vị trí</label><input class="input" value="${esc(pos.label)}" disabled></div>
        <div class="field"><label>Ngày chấm</label><input class="input" type="date" name="plan_date" value="${esc(edit?.plan_date || isoDateLocal(new Date()))}"></div>
        <div class="field"><label>Nhân sự được chấm</label><select name="trainee_id" required>${traineeOptions}</select><div class="hint">CDP là bản chấm năng lực, không tạo việc đào tạo.</div></div>
        <div class="field" style="grid-column:span 2"><label>Nhận xét chung</label><textarea name="note" data-auto-resize placeholder="Nhận xét tổng quan sau khi chấm">${esc(edit?.note || '')}</textarea></div>
        <div class="cdp-source-note" style="grid-column:1/-1">CDP dùng như một phiếu checklist để chấm năng lực theo vị trí. Chọn mức 1 - 4 ở từng tiêu chí, có thể bấm <b>Xem mô tả mức 1 - 4</b> để đối chiếu trước khi chấm.</div>
        <div style="grid-column:1/-1">${sectionHtml}</div>
        ${openFields}
        <div style="grid-column:1/-1" class="row"><button class="btn">${edit ? 'Lưu sửa' : 'Lưu bản chấm'}</button></div>
      </form>
    </div>` : `<div id="cdpCreate" class="card empty">Tài khoản này chỉ được xem CDP, chưa có quyền thao tác. Admin cần bật quyền <b>Nhập CDP</b>.</div>`;
    mainContent = `${quick}<div style="height:12px"></div>${summary}<div style="height:12px"></div><div id="cdpHistory" class="card"><div class="toolbar"><h3 style="margin-right:auto">Lịch sử đã chấm CDP</h3><span class="badge dark">${records.length}</span></div><div class="record-card-list">${historyCards}</div></div><div style="height:12px"></div>${form}`;
  } else {
    const statusGroups = [
      ['doing','Chưa lên lịch'],
      ['planned','Đã lên lịch training'],
      ['follow','Đang theo dõi sau training'],
      ['done','Hoàn thành']
    ];
    const groupCards = statusGroups.map(([key, label]) => {
      const list = records.filter(r => ojtiDisplayStatus(r) === key);
      return `<div class="card cdp-status-card" id="cdpStatus_${key}"><div class="toolbar"><h3 style="margin-right:auto">${esc(label)}</h3><span class="badge dark">${list.length}</span></div><div class="record-card-list">${list.length ? list.map(renderRecordCard).join('') : '<div class="empty">Chưa có dữ liệu</div>'}</div></div>`;
    }).join('');
    const quick = `<div class="quick-action-grid cdp-quick-grid">
      ${canManage ? `<button class="quick-action-card" data-jump="#cdpCreate"><span>Tạo mới</span><b>OJTI</b><em>Lưu / sửa tại đây</em></button>` : ''}
      ${statusGroups.map(([key, label]) => `<button class="quick-action-card" data-jump="#cdpStatus_${key}"><span>${esc(label)}</span><b>${records.filter(r => ojtiDisplayStatus(r) === key).length}</b><em>Xem nhanh</em></button>`).join('')}
    </div>`;
    const form = canManage ? `<div id="cdpCreate" class="card cdp-form-card">
      <div class="toolbar"><h3 style="margin-right:auto">${edit ? 'Sửa' : 'Tạo mới / Lưu'} OJTI theo file đào tạo</h3>${edit ? '<button class="btn secondary" id="cancelCdpEditBtn">Hủy sửa</button>' : ''}</div>
      <form id="cdpOjtiForm" class="grid three">
        <input type="hidden" name="id" value="${edit?.id || ''}"><input type="hidden" name="type" value="ojti"><input type="hidden" name="position_key" value="${esc(posKey)}">
        <div class="field"><label>Cửa hàng</label><select name="store_id" id="cdpStoreSelect" ${!isAllStoreUser() ? 'disabled' : ''}>${storeOptions}</select></div>
        <div class="field"><label>Vị trí</label><input class="input" value="${esc(pos.label)}" disabled></div>
        <div class="field"><label>Trạng thái</label><select name="status_label">${statusOptions}</select></div>
        <div class="field"><label>Nhân sự đào tạo</label><select name="trainee_id">${traineeOptions}</select><div class="hint">Chỉ chọn 1 nhân sự cho mỗi bản OJTI.</div></div>
        <div class="field"><label>Người đào tạo / quản lý theo dõi</label><select name="trainer_id">${trainerOptions}</select></div>
        <div class="field"><label>Giờ hạn công việc OJTI</label><input class="input" type="time" name="due_time" value="${esc(edit?.due_time || '22:00')}"><div class="hint">Ngày lấy theo ô Ngày training bên dưới.</div></div>
        <div class="field" style="grid-column:1/-1"><label>Ghi chú chung</label><textarea name="note" data-auto-resize>${esc(edit?.note || '')}</textarea></div>
        <div class="cdp-source-note" style="grid-column:1/-1">Dữ liệu hiển thị theo sheet <b>${esc(bucket.sheet || '')}</b> trong file CDP/OJTI. Nhập ngày training ở từng dòng, bấm Lưu là hệ thống tự tạo/cập nhật công việc hằng ngày. Trạng thái sẽ tự hiểu: chưa có ngày là <b>Chưa lên lịch</b>, có ngày là <b>Đã lên lịch training</b>.</div>
        <div style="grid-column:1/-1">${sectionHtml}</div>
        ${openFields}
        <div style="grid-column:1/-1" class="row"><button class="btn">${edit ? 'Lưu sửa' : 'Lưu'}</button></div>
      </form>
    </div>` : `<div id="cdpCreate" class="card empty">Tài khoản này chỉ được xem OJTI, chưa có quyền thao tác. Admin cần bật quyền <b>Nhập OJTI</b>.</div>`;
    mainContent = `${quick}<div style="height:12px"></div>${summary}<div style="height:12px"></div><div class="cdp-status-layout">${groupCards}</div><div style="height:12px"></div>${form}`;
  }

  shell(`${typeTabs}<div style="height:12px"></div><div class="card"><div class="toolbar"><h3 style="margin-right:auto">Danh mục vị trí</h3><div class="field" style="min-width:220px;margin:0"><select id="cdpStoreFilter">${storeOptions}</select></div></div>${positionTabs}<div class="hint" style="margin-top:8px">Phân quyền: ${canViewType('cdp') ? 'được xem CDP' : 'không xem CDP'} • ${canManageType('cdp') ? 'được nhập CDP' : 'không nhập CDP'} • ${canViewType('ojti') ? 'được xem OJTI' : 'không xem OJTI'} • ${canManageType('ojti') ? 'được nhập OJTI' : 'không nhập OJTI'}</div></div><div style="height:12px"></div>${mainContent}`, 'CDP / OJTI', isCdp ? 'CDP là bản chấm năng lực giống checklist. OJTI giữ luồng đào tạo và tự tạo công việc theo ngày training.' : 'OJTI nhập ngày training sẽ tự sinh công việc hằng ngày.' );
  setupAutoResizeTextareas();
  $$('.cdpTypeBtn').forEach(btn => btn.onclick = () => { state.cdpOjtiType = btn.dataset.type; state.cdpOjtiEditId = null; renderCdpOjti(); });
  $$('.cdpPosBtn').forEach(btn => btn.onclick = () => { state.cdpOjtiPosition = btn.dataset.pos; state.cdpOjtiEditId = null; renderCdpOjti(); });
  $('#cdpStoreFilter')?.addEventListener('change', e => { state.cdpOjtiStoreId = e.target.value; state.cdpOjtiEditId = null; renderCdpOjti(); });
  $('#cdpStoreSelect')?.addEventListener('change', e => { state.cdpOjtiStoreId = e.target.value; state.cdpOjtiEditId = null; renderCdpOjti(); });
  $('#cancelCdpEditBtn')?.addEventListener('click', () => { state.cdpOjtiEditId = null; renderCdpOjti(); });
  $$('[data-jump]').forEach(btn => btn.addEventListener('click', () => $(btn.dataset.jump)?.scrollIntoView({ behavior:'smooth', block:'start' })));
  $$('.editCdpBtn').forEach(btn => btn.onclick = async () => { state.cdpOjtiEditId = Number(btn.dataset.id); await renderCdpOjti(); $('#cdpCreate')?.scrollIntoView({ behavior:'smooth', block:'start' }); });
  $$('.delCdpBtn').forEach(btn => btn.onclick = async () => { if (!confirm('Xóa bản CDP/OJTI này?')) return; try { await api(`/api/cdp-ojti/${btn.dataset.id}`, { method: 'DELETE' }); toast('Đã xóa'); state.cdpOjtiEditId = null; renderCdpOjti(); } catch (err) { toast(err.message, 'danger'); } });
  $('#cdpOjtiForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const item_values = $$('.cdpItemRow', e.target).map(row => ({
      code: row.dataset.code,
      score: $('.cdp-score', row)?.value || '',
      training_start: $('.cdp-training-start', row)?.value || '',
      training_end: $('.cdp-training-end', row)?.value || '',
      note: $('.cdp-note', row)?.value || ''
    }));
    const open_values = {};
    $$('.cdp-open-field', e.target).forEach(el => { open_values[el.dataset.key] = el.value || ''; });
    const hasTrainingDate = item_values.some(v => String(v.training_start || v.training_end || '').trim());
    const rawStatus = fd.get('status_label') || (type === 'cdp' ? 'done' : 'doing');
    const finalStatus = type === 'ojti' && rawStatus === 'doing' && hasTrainingDate ? 'planned' : rawStatus;
    const payload = {
      id: fd.get('id') || undefined,
      type,
      store_id: fd.get('store_id') || selectedStoreId,
      position_key: posKey,
      trainee_ids: fd.get('trainee_id') ? [Number(fd.get('trainee_id'))] : [],
      trainer_id: fd.get('trainer_id') || state.user?.id,
      plan_date: fd.get('plan_date') || isoDateLocal(new Date()),
      due_time: fd.get('due_time') || '22:00',
      status_label: finalStatus,
      note: fd.get('note'),
      item_values,
      open_values
    };
    try {
      const resp = await api('/api/cdp-ojti-record', { method: 'POST', body: JSON.stringify(payload) });
      const linkedCount = Object.keys(resp.linked_task_ids || {}).length;
      toast(type === 'ojti' ? `Đã lưu OJTI và cập nhật ${linkedCount} công việc` : 'Đã lưu bản chấm CDP');
      state.cdpOjtiEditId = null;
      renderCdpOjti();
    } catch (err) { toast(err.message, 'danger'); }
  });
}

function ojtiDisplayStatus(r) {
  if (!r || typeof r === 'string') return String(r || 'doing');
  const raw = String(r.status_label || 'doing');
  if (raw === 'doing') {
    const hasTrainingDate = (r.item_values || []).some(v => String(v.training_start || v.training_end || '').trim());
    if (hasTrainingDate) return 'planned';
  }
  return raw;
}

function statusCdpLabel(v) {
  const map = { planned:['Đã lên lịch training','dark'], doing:['Chưa lên lịch','warn'], done:['Hoàn thành','ok'], follow:['Đang theo dõi sau training','danger'] };
  const [label, cls] = map[v] || [v || 'Chưa lên lịch', 'dark'];
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

async function renderSchedule() {
  const month = state.scheduleMonth || currentMonthLocal();
  const weeks = scheduleMonthWeeks(month);
  const firstWeek = weeks[0]?.week_start || mondayOf(`${month}-01`);
  const storeId = isAllStoreUser() ? (state.scheduleStoreId || state.boot.stores[0]?.id || '') : state.user.store_id;
  const makeQuery = (weekStart) => {
    const q = new URLSearchParams({ week_start: weekStart });
    if (storeId) q.set('store_id', storeId);
    return q.toString();
  };
  const weekDatas = await Promise.all(weeks.map(w => api('/api/schedules?' + makeQuery(w.week_start))));
  const base = weekDatas[0] || await api('/api/schedules?' + makeQuery(firstWeek));
  state.scheduleStoreId = String(base.store_id || storeId || '');
  state.scheduleMonth = month;
  const shifts = base.shifts || [];
  const allSchedules = weekDatas.flatMap(d => d.schedules || []);
  const scheduleMap = new Map(allSchedules.map(x => [`${x.user_id}_${x.work_date}`, x]));
  const canManage = Number(base.can_manage) === 1 || can('can_manage_schedule');
  const isEditing = canManage && state.scheduleEditMode;
  const storeSelect = isAllStoreUser()
    ? `<div class="field"><label>Cửa hàng</label><select class="input" id="scheduleStoreFilter">${state.boot.stores.map(st => `<option value="${st.id}" ${Number(st.id) === Number(base.store_id) ? 'selected' : ''}>${esc(st.name)}</option>`).join('')}</select></div>`
    : `<div class="field"><label>Cửa hàng</label><input class="input" value="${esc(base.store_name || state.user.store_name || '')}" disabled></div>`;
  const actions = canManage
    ? (isEditing
      ? `<button class="btn" type="submit" form="scheduleForm">Lưu lịch</button><button class="btn secondary" type="button" id="cancelScheduleEditBtn">Hủy sửa</button>`
      : `<button class="btn" type="button" id="editScheduleBtn">Sửa lịch</button>`)
    : '';
  const filter = `<div class="card"><div class="toolbar"><h3 style="margin-right:auto">Lịch làm việc ${monthLabel(month)}</h3>${actions}${can('can_export') ? '<button class="btn secondary" data-export="work_schedules">Tải CSV lịch</button>' : ''}</div><div class="grid three">${storeSelect}<div class="field"><label>Chọn tháng</label><input class="input" type="month" id="scheduleMonthInput" value="${esc(month)}"></div><div class="field"><label>Chế độ</label><input class="input" value="${isEditing ? 'Đang sửa: chọn ca và thêm ghi chú' : 'Đang xem: bảng ca gọn, chỉ hiện mã ca'}" disabled></div></div><p class="hint">Hiển thị toàn bộ các tuần của tháng. Ngày gối sang tháng khác sẽ để trống để tháng nào xem tháng đó.</p></div>`;
  const shiftOptions = (selected) => `<option value="" data-code="">OFF</option>${shifts.map(sh => `<option value="${sh.id}" data-code="${esc(shiftCode(sh))}" ${Number(sh.id) === Number(selected) ? 'selected' : ''}>${esc(shiftCode(sh))}</option>`).join('')}`;
  const makeRows = (week) => (base.employees || []).map(emp => {
    const cells = week.dates.map((day) => {
      if (!day.startsWith(month)) return `<td class="schedule-blank"></td>`;
      const row = scheduleMap.get(`${emp.id}_${day}`) || {};
      const shift = shifts.find(sh => Number(sh.id) === Number(row.shift_id));
      if (isEditing) {
        return `<td class="schedule-cell"><select class="input scheduleShift tone-${shiftTone(shiftCode(shift))}" data-week="${week.week_start}" data-user="${emp.id}" data-date="${day}">${shiftOptions(row.shift_id || '')}</select><input class="input scheduleNote" data-user="${emp.id}" data-date="${day}" value="${esc(row.note || '')}" placeholder="Ghi chú"></td>`;
      }
      return `<td class="schedule-view-cell">${shift ? shiftChip(shift, row.note || '') : '<span class="shift-chip off">OFF</span>'}</td>`;
    }).join('');
    return `<tr><td class="schedule-person"><b>${esc(emp.full_name)}</b><span>${roleLabel(emp.role)}</span></td>${cells}</tr>`;
  }).join('') || `<tr><td colspan="8"><div class="empty">Chưa có nhân sự trong cửa hàng</div></td></tr>`;
  const legend = `<div class="schedule-legend">${shifts.map(sh => `<span>${shiftChip(sh)} <small>${esc(sh.start_time || '')}-${esc(sh.end_time || '')}</small></span>`).join('')}<span><span class="shift-chip off">OFF</span><small>Nghỉ/chưa phân ca</small></span></div>`;
  const weekTables = weeks.map((week, idx) => `<div class="schedule-week-block"><div class="schedule-week-title">Tuần ${idx + 1} <span>${week.dates.filter(d => d.startsWith(month)).map(dOnly).join(' - ')}</span></div><div class="table-wrap schedule-wrap"><table class="schedule-table"><thead><tr><th>Nhân sự</th>${week.dates.map((d) => `<th class="${d.startsWith(month) ? '' : 'schedule-out-month'}">${d.startsWith(month) ? weekLabel(d) : ''}</th>`).join('')}</tr></thead><tbody>${makeRows(week)}</tbody></table></div></div>`).join('');
  const scheduleTable = `<div class="card" style="margin-top:16px"><form id="scheduleForm"><div class="toolbar"><h3 style="margin-right:auto">Bảng phân ca theo tháng</h3>${isEditing ? '<span class="badge warning">Đang sửa</span>' : '<span class="badge ok">Đang xem</span>'}</div>${legend}${weekTables}</form></div>`;
  const shiftForm = can('can_manage_shifts') ? `<div class="card" style="margin-top:16px"><h3>Admin set ca và giờ của ca</h3><form id="shiftForm" class="grid three simple-shift-form"><div class="field"><label>Mã ca</label><input class="input" name="code" placeholder="S / C / G1" required></div><div class="field"><label>Giờ bắt đầu</label><input class="input" type="time" name="start_time" required></div><div class="field"><label>Giờ kết thúc</label><input class="input" type="time" name="end_time" required></div><input type="hidden" name="name"><div style="grid-column:1/-1"><button class="btn">Thêm ca</button></div></form><div class="shift-admin-list">${shifts.map(sh => `<div class="shift-admin-card"><div class="shift-admin-code">${shiftChip(sh)}</div><div class="grid three"><div class="field"><label>Mã ca</label><input class="input shiftField" data-id="${sh.id}" data-field="code" value="${esc(shiftCode(sh))}"></div><div class="field"><label>Bắt đầu</label><input class="input shiftField" data-id="${sh.id}" data-field="start_time" type="time" value="${esc(sh.start_time || '')}"></div><div class="field"><label>Kết thúc</label><input class="input shiftField" data-id="${sh.id}" data-field="end_time" type="time" value="${esc(sh.end_time || '')}"></div><input type="hidden" class="shiftField" data-id="${sh.id}" data-field="name" value="Ca ${esc(shiftCode(sh))}"><div class="row" style="grid-column:1/-1"><button type="button" class="btn small secondary saveShiftBtn" data-id="${sh.id}">Lưu</button><button type="button" class="btn small danger deleteShiftBtn" data-id="${sh.id}" data-name="${esc(shiftCode(sh))}">Xóa</button></div></div></div>`).join('')}</div></div>` : '';
  shell(`${filter}${scheduleTable}${shiftForm}`, 'Lịch làm việc', 'Ấn Sửa lịch mới hiện ô chọn ca/ghi chú; sau khi lưu quay về bảng xem gọn');
  $('#scheduleMonthInput')?.addEventListener('change', e => { state.scheduleMonth = e.target.value; state.scheduleDate = `${e.target.value}-01`; state.scheduleEditMode = false; renderSchedule(); });
  $('#scheduleStoreFilter')?.addEventListener('change', e => { state.scheduleStoreId = e.target.value; state.scheduleEditMode = false; renderSchedule(); });
  $('#editScheduleBtn')?.addEventListener('click', () => { state.scheduleEditMode = true; renderSchedule(); });
  $('#cancelScheduleEditBtn')?.addEventListener('click', () => { state.scheduleEditMode = false; renderSchedule(); });
  $$('.scheduleShift').forEach(sel => {
    applyScheduleSelectTone(sel);
    sel.addEventListener('change', () => applyScheduleSelectTone(sel));
  });
  $('#scheduleForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!isEditing) return;
    const grouped = new Map();
    $$('.scheduleShift').forEach(sel => {
      const note = $(`.scheduleNote[data-user="${sel.dataset.user}"][data-date="${sel.dataset.date}"]`)?.value || '';
      const entry = { user_id: sel.dataset.user, work_date: sel.dataset.date, shift_id: sel.value || null, note };
      if (!grouped.has(sel.dataset.week)) grouped.set(sel.dataset.week, []);
      grouped.get(sel.dataset.week).push(entry);
    });
    try {
      await Promise.all(Array.from(grouped.entries()).map(([week_start, entries]) => api('/api/schedules/bulk', { method: 'POST', body: JSON.stringify({ store_id: base.store_id, week_start, entries }) })));
      toast('Đã lưu lịch làm việc');
      state.scheduleEditMode = false;
      renderSchedule();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $('#shiftForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(e.target));
      payload.code = String(payload.code || '').trim().toUpperCase();
      payload.name = `Ca ${payload.code}`;
      await api('/api/shifts', { method: 'POST', body: JSON.stringify(payload) });
      toast('Đã thêm ca làm');
      renderSchedule();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $$('.saveShiftBtn').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.dataset.id;
    const payload = {};
    $$(`.shiftField[data-id="${id}"]`).forEach(inp => payload[inp.dataset.field] = inp.value);
    payload.code = String(payload.code || '').trim().toUpperCase();
    payload.name = `Ca ${payload.code}`;
    try {
      await api(`/api/shifts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      toast('Đã cập nhật ca');
      renderSchedule();
    } catch (err) { toast(err.message, 'danger'); }
  }));
  $$('.deleteShiftBtn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm(`Xóa ${btn.dataset.name}? Các lịch đã gắn ca này có thể không còn hiển thị đúng.`)) return;
    try {
      await api(`/api/shifts/${btn.dataset.id}`, { method: 'DELETE' });
      toast('Đã xóa ca');
      renderSchedule();
    } catch (err) { toast(err.message, 'danger'); }
  }));
}

async function renderDocuments() {
  const data = await api('/api/documents');
  const docs = data.documents || [];
  const categoryOptions = ['Quy trình', 'Biểu mẫu', 'Đào tạo', 'Thông báo', 'Khác'].map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const storeOptions = `<option value="">Toàn hệ thống</option>${state.boot.stores.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}`;
  const uploadForm = can('can_manage_documents') ? `
    <div class="card"><h3>Tải tài liệu / quy trình lên hệ thống</h3>
      <form id="documentForm" class="grid three" enctype="multipart/form-data">
        <div class="field"><label>Tên tài liệu</label><input class="input" name="title" required placeholder="VD: Quy trình hủy đơn tại cửa hàng"></div>
        <div class="field"><label>Nhóm tài liệu</label><select class="input" name="category">${categoryOptions}</select></div>
        <div class="field"><label>Áp dụng cho</label>${isAllStoreUser() ? `<select class="input" name="store_id">${storeOptions}</select>` : `<input type="hidden" name="store_id" value="${esc(state.user.store_id || '')}"><input class="input" value="${esc(state.user.store_name || '')}" disabled>`}</div>
        <div class="field"><label>Phiên bản / ngày hiệu lực</label><input class="input" name="version" placeholder="VD: V1 - 30/07/2026"></div>
        <div class="field"><label>File tài liệu dưới 12MB</label><input class="input" name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"><span class="hint">File nặng nên đưa lên Google Drive rồi dán link để không tốn kho lưu trữ.</span></div>
        <div class="field"><label>Hoặc link Google Drive</label><input class="input" name="external_url" placeholder="https://drive.google.com/..."></div>
        <div class="field"><label>Ghi chú</label><input class="input" name="description" placeholder="Nội dung chính / lưu ý khi áp dụng"></div>
        <div style="grid-column:1/-1"><button class="btn">Lưu tài liệu / link</button></div>
      </form>
    </div>` : '';
  const docCategoryNames = ['Quy trình', 'Biểu mẫu', 'Đào tạo', 'Thông báo', 'Khác'];
  const docCategoryOf = d => docCategoryNames.includes(d.category || '') ? d.category : 'Quy trình';
  const docRow = d => {
    const searchText = [d.title, d.description, d.category, d.store_name, d.version, d.original_name, d.created_by_name].filter(Boolean).join(' ');
    return `<tr class="doc-row" data-doc-text="${esc(searchText).toLowerCase()}"><td><b>${esc(d.title)}</b><br><span class="hint">${esc(d.description || '')}</span></td><td>${esc(d.store_name || 'Toàn hệ thống')}</td><td>${esc(d.version || '-')}</td><td>${d.external_url ? '<b>Link Google Drive</b>' : `${esc(d.original_name || '')}<br><span class="hint">${fileSizeLabel(d.size)}</span>`}</td><td>${money(d.download_count || 0)}</td><td>${esc(d.created_by_name || '')}</td><td>${dt(d.updated_at || d.created_at)}</td><td><div class="row"><button class="btn small docDownloadBtn" data-id="${d.id}" data-name="${esc(d.original_name || d.title || 'tai-lieu')}">${d.external_url ? 'Mở link' : 'Tải về'}</button>${can('can_manage_documents') ? `<button class="btn small danger docDeleteBtn" data-id="${d.id}" data-name="${esc(d.title)}">Xóa</button>` : ''}</div></td></tr>`;
  };
  const renderDocGroup = (cat, list) => `<section class="doc-category-section" id="doc-cat-${cat.replace(/\s+/g, '-').toLowerCase()}"><div class="doc-category-head"><div><h3>${esc(cat)}</h3><p>${money(list.length)} tài liệu</p></div><span class="doc-category-badge">${esc(cat)}</span></div><div class="table-wrap doc-category-table"><table><thead><tr><th>Tài liệu</th><th>Phạm vi</th><th>Phiên bản</th><th>File / Link</th><th>Lượt tải</th><th>Người tải lên</th><th>Ngày cập nhật</th><th>Thao tác</th></tr></thead><tbody>${list.map(docRow).join('')}</tbody></table></div></section>`;
  const groupedRows = docCategoryNames.map(cat => ({ cat, list: docs.filter(d => docCategoryOf(d) === cat) })).filter(g => g.list.length);
  const categoryTabs = docs.length ? `<div class="doc-filter-card"><div class="field doc-search-field"><label>Tìm nhanh tài liệu</label><input class="input" id="docSearch" placeholder="Nhập tên tài liệu, ghi chú, cửa hàng..."></div><div class="doc-category-tabs">${docCategoryNames.map(cat => { const count = docs.filter(d => docCategoryOf(d) === cat).length; return `<a class="doc-category-tab" href="#doc-cat-${cat.replace(/\s+/g, '-').toLowerCase()}"><span>${esc(cat)}</span><b>${money(count)}</b></a>`; }).join('')}</div></div>` : '';
  const rows = docs.length ? `${categoryTabs}${groupedRows.map(g => renderDocGroup(g.cat, g.list)).join('')}` : '<div class="empty">Chưa có tài liệu/quy trình nào</div>';
  shell(`${uploadForm}<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Thư viện tài liệu / quy trình</h3>${can('can_export') ? '<button class="btn secondary" data-export="documents">Tải CSV danh sách</button>' : ''}</div>${rows}</div>`, 'Tài liệu / Quy trình', 'Tài liệu được chia theo nhóm: Quy trình, Biểu mẫu, Đào tạo, Thông báo để cửa hàng tìm nhanh hơn');
  $('#documentForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (hasFileOverLimit(e.target)) return;
    const fd = new FormData(e.target);
    const hasFile = [...(e.target.querySelector('input[name="file"]')?.files || [])].length > 0;
    const hasLink = String(fd.get('external_url') || '').trim();
    if (!hasFile && !hasLink) { toast('Anh chọn file dưới 12MB hoặc dán link Google Drive nhé.', 'danger'); return; }
    try {
      await api('/api/documents', { method: 'POST', body: fd });
      toast('Đã tải tài liệu lên hệ thống');
      renderDocuments();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $('#docSearch')?.addEventListener('input', e => {
    const keyword = String(e.target.value || '').trim().toLowerCase();
    $$('.doc-row').forEach(row => {
      const matched = !keyword || String(row.dataset.docText || '').includes(keyword);
      row.style.display = matched ? '' : 'none';
    });
    $$('.doc-category-section').forEach(section => {
      const hasVisible = $$('.doc-row', section).some(row => row.style.display !== 'none');
      section.style.display = hasVisible ? '' : 'none';
    });
  });
  $$('.docDownloadBtn').forEach(btn => btn.addEventListener('click', () => downloadDocument(btn.dataset.id, btn.dataset.name)));
  $$('.docDeleteBtn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm(`Xóa tài liệu ${btn.dataset.name || ''}?`)) return;
    try {
      await api(`/api/documents/${btn.dataset.id}`, { method: 'DELETE' });
      toast('Đã xóa tài liệu');
      renderDocuments();
    } catch (err) { toast(err.message, 'danger'); }
  }));
}

async function renderBonuses() {
  const data = await api('/api/bonuses');
  const bonusPeople = salesStaffInStore(isAllStoreUser() ? '' : state.user.store_id);
  const form = can('can_manage_bonuses') ? `<div class="card"><h3>Nhập tiền công/thưởng nhân viên</h3><p class="hint">Mỗi lần nhập thêm sẽ cộng vào tổng tiền công/thưởng của nhân viên. Bảng bên dưới hiển thị tổng theo nhân viên, không tách từng ngày.</p><form id="bonusForm" class="grid three"><div class="field"><label>Nhân viên</label><select name="user_id" required>${bonusPeople.map(u => `<option value="${u.id}">${esc(u.full_name)} - ${esc(u.store_name || '')}</option>`).join('')}</select></div><div class="field"><label>Ngày ghi nhận</label><input class="input" type="date" name="bonus_date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field"><label>Loại tiền công/thưởng</label><select name="bonus_type"><option value="Hotbill">Hotbill</option><option value="Thưởng tuần">Thưởng tuần</option><option value="Thưởng KPI">Thưởng KPI</option><option value="Thưởng khác">Thưởng khác</option></select></div><div class="field"><label>Số tiền cộng thêm</label><input class="input" type="text" inputmode="numeric" data-number-format name="amount" required placeholder="100.000"></div><div class="field" style="grid-column:span 2"><label>Ghi chú</label><input class="input" name="note" placeholder="VD: Hotbill / thưởng tuần W30"></div><div style="grid-column:1/-1"><button class="btn">Cộng tiền</button></div></form></div>` : '';
  const rows = data.summary || [];
  const list = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Nhân viên</th><th>Cửa hàng</th><th>Tổng tiền công/thưởng</th><th>Hotbill</th><th>Thưởng tuần</th><th>Thưởng KPI</th><th>Khác</th><th>Số lần nhập</th><th>Cập nhật gần nhất</th><th>Ghi chú gần nhất</th></tr></thead><tbody>${rows.map(b => `<tr><td><b>${esc(b.employee_name)}</b></td><td>${esc(b.store_name || '')}</td><td><b>${money(b.total_amount)}đ</b></td><td>${money(b.hotbill_amount)}đ</td><td>${money(b.week_amount)}đ</td><td>${money(b.kpi_amount)}đ</td><td>${money(b.other_amount)}đ</td><td>${money(b.entries_count || 0)}</td><td>${dOnly(b.latest_date)}</td><td>${esc(b.latest_note || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có dữ liệu tiền công/thưởng</div>';
  shell(`${form}<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Tổng tiền công/thưởng theo nhân viên</h3>${can('can_export') ? '<button class="btn secondary" data-export="bonuses">Tải CSV chi tiết</button>' : ''}</div>${list}</div>`, 'Tiền công/thưởng', 'Cộng tiền hotbill, thưởng tuần, thưởng KPI vào tổng tiền công của nhân viên');
  $('#bonusForm')?.addEventListener('submit', async e => { e.preventDefault(); try { await api('/api/bonuses', { method: 'POST', body: JSON.stringify((() => { const payload = Object.fromEntries(new FormData(e.target)); payload.amount = cleanNumberInput(payload.amount); return payload; })()) }); toast('Đã cộng tiền công/thưởng'); renderBonuses(); } catch (err) { toast(err.message, 'danger'); } });
}

async function renderReports() {
  const data = await api('/api/reports/performance');
  const rows = data.performance;
  const perfTable = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Top</th><th>Nhân viên</th><th>Cửa hàng</th><th>Điểm tổng</th><th>Công việc</th><th>Vi phạm</th><th>GUESTS</th><th>% đạt target</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td><span class="badge dark">#${i + 1}</span></td><td><b>${esc(r.full_name)}</b></td><td>${esc(r.store_name || '')}</td><td><b>${r.final_score}/100</b></td><td>${r.task_score}%<br><span class="hint">Đúng hạn ${r.tasks_on_time}/${r.tasks_total}, trễ ${r.tasks_late}, quá hạn ${r.tasks_overdue}</span></td><td>${r.violation_score}%<br><span class="hint">${r.violations_count} lỗi, -${r.violation_deductions} điểm</span></td><td>${r.guests_score}%</td><td>${Number(r.achievement_percent || 0)}%<br><span class="hint">Index ${r.revenue_score}%</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có dữ liệu tổng hợp</div>';
  const storeTable = data.storeSummary?.length ? `<div class="table-wrap"><table><thead><tr><th>Cửa hàng</th><th>OPS</th><th>VM</th><th>Vi phạm</th></tr></thead><tbody>${data.storeSummary.map(s => `<tr><td><b>${esc(s.store_name)}</b></td><td>${Math.round(s.ops_score || 0)}%</td><td>${Math.round(s.vm_score || 0)}%</td><td>${s.violations}</td></tr>`).join('')}</tbody></table></div>` : '';
  shell(`<div class="card"><div class="toolbar"><h3 style="margin-right:auto">Hiệu suất nhân viên</h3>${can('can_export') ? '<button class="btn secondary" data-export="performance">Tải CSV</button>' : ''}</div>${perfTable}</div><div class="card" style="margin-top:16px"><h3>Hiệu suất cửa hàng</h3>${storeTable || '<div class="empty">Chưa có điểm OPS/VM</div>'}</div><div class="card" style="margin-top:16px"><h3>Cách tính điểm tổng</h3><p class="hint">Điểm tổng tối đa 100 = 35% hiệu suất công việc + 20% điểm không vi phạm + 25% GUESTS checklist + 20% index doanh thu. Công việc trễ hạn/quá hạn tự bị ghi nhận không hoàn thành đúng hạn và trừ điểm.</p></div>`, 'Tổng hợp điểm', 'Hiệu suất cửa hàng và nhân viên, chuẩn hóa về thang 100 điểm');
}

async function renderAdmin() {
  const data = await api('/api/users?status=all');
  const permBoxes = Object.entries(PERM_LABELS).map(([key, label]) => `<label><input type="checkbox" name="${key}"> ${label}</label>`).join(' ');
  const form = `<div class="card"><h3>Cấp tài khoản / phân quyền</h3><form id="userForm" class="grid three"><div class="field"><label>Họ tên</label><input class="input" name="full_name" required></div><div class="field"><label>Tài khoản</label><input class="input" name="username" required></div><div class="field"><label>Mật khẩu</label><input class="input" name="password" value="123456" required></div><div class="field"><label>Vai trò</label><select name="role"><option value="employee">Nhân viên</option><option value="manager">Quản lý</option><option value="office">Khối văn phòng</option><option value="admin">Admin</option></select></div><div class="field"><label>Cửa hàng áp dụng (chọn nhiều)</label><select name="store_ids" multiple size="5">${renderStoreMultiOptions([])}</select><div class="hint">Giữ Ctrl hoặc chọn nhiều trên máy tính. Trên điện thoại có thể chọn lần lượt.</div></div><div class="field"><label>Quyền mở rộng</label><div class="hint perm-check-grid">${permBoxes}</div></div><div style="grid-column:1/-1"><button class="btn">Tạo tài khoản</button></div></form></div>`;
  const editUser = data.users.find(u => Number(u.id) === Number(state.adminEditUserId));
  const editBoxes = editUser ? Object.entries(PERM_LABELS).map(([key, label]) => `<label><input type="checkbox" name="${key}" ${Number(editUser.permissions?.[key]) === 1 ? 'checked' : ''}> ${label}</label>`).join(' ') : '';
  const editCard = editUser ? `<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Sửa quyền / thông tin tài khoản</h3><button class="btn secondary" id="cancelEditUserBtn">Đóng</button></div><form id="editUserForm" class="grid three"><input type="hidden" name="id" value="${editUser.id}"><div class="field"><label>Họ tên</label><input class="input" name="full_name" value="${esc(editUser.full_name)}" required></div><div class="field"><label>Vai trò</label><select name="role"><option value="employee" ${editUser.role === 'employee' ? 'selected' : ''}>Nhân viên</option><option value="manager" ${editUser.role === 'manager' ? 'selected' : ''}>Quản lý</option><option value="office" ${editUser.role === 'office' ? 'selected' : ''}>Khối văn phòng</option><option value="admin" ${editUser.role === 'admin' ? 'selected' : ''}>Admin</option></select></div><div class="field"><label>Cửa hàng áp dụng (chọn nhiều)</label><select name="store_ids" multiple size="5">${renderStoreMultiOptions(editUser.store_ids || (editUser.store_id ? [editUser.store_id] : []))}</select><div class="hint">Có thể cấp cùng lúc nhiều cửa hàng, ví dụ Quận 1 và Quận 7.</div></div><div class="field"><label>Trạng thái tài khoản</label><select class="input" name="status"><option value="active" ${editUser.status === 'active' ? 'selected' : ''}>Đang làm / đang dùng</option><option value="inactive" ${editUser.status !== 'active' ? 'selected' : ''}>Đã nghỉ / ngưng hoạt động</option></select></div><div class="field"><label>Reset mật khẩu (không bắt buộc)</label><input class="input" name="password" placeholder="Để trống nếu không đổi"></div><div class="field" style="grid-column:span 2"><label>Quyền chi tiết</label><div class="hint perm-check-grid">${editBoxes}</div></div><div style="grid-column:1/-1" class="row"><button class="btn">Lưu quyền</button><button class="btn secondary" type="button" id="cancelEditUserBtn2">Hủy</button></div></form></div>` : '';
  const table = `<div class="table-wrap"><table><thead><tr><th>Họ tên</th><th>Tài khoản</th><th>Vai trò</th><th>Cửa hàng áp dụng</th><th>Trạng thái</th><th>Quyền</th><th>Thao tác</th></tr></thead><tbody>${data.users.map(u => { const hasView = Number(u.permissions.can_view_sales_target) === 1 && Number(u.permissions.can_view_store_sales_summary) === 1 && Number(u.permissions.can_view_bonuses) === 1; const hasTarget = Number(u.permissions.can_set_sales_targets) === 1; const inactive = u.status !== 'active'; const action = Number(u.id) === Number(state.user.id) ? '<span class="hint">Tài khoản hiện tại</span>' : `<div class="row wrap"><button class="btn small secondary editUserBtn" data-id="${u.id}">Sửa quyền</button><button class="btn small secondary quickPermBtn" data-id="${u.id}" data-mode="${hasView ? 'revoke' : 'grant'}">${hasView ? 'Thu hồi xem %/thưởng' : 'Cấp xem %/thưởng'}</button><button class="btn small secondary quickTargetBtn" data-id="${u.id}" data-mode="${hasTarget ? 'revoke' : 'grant'}">${hasTarget ? 'Thu hồi set target' : 'Cấp set target'}</button>${inactive ? `<button class="btn small ok restoreUserBtn" data-id="${u.id}" data-name="${esc(u.full_name)}">Mở lại</button>` : `<button class="btn small danger deleteUserBtn" data-id="${u.id}" data-name="${esc(u.full_name)}">Ngưng hoạt động / Nghỉ việc</button>`}</div>`; return `<tr class="${inactive ? 'user-inactive-row' : ''}"><td><b>${esc(u.full_name)}</b>${inactive ? '<div class="hint">Dữ liệu cũ vẫn được giữ trong báo cáo</div>' : ''}</td><td>${esc(u.username)}</td><td>${roleLabel(u.role)}</td><td>${esc((u.store_names && u.store_names.length ? u.store_names.join(' • ') : (u.store_name || '')))}</td><td>${userStatusBadge(u.status)}</td><td>${Object.entries(PERM_LABELS).filter(([k]) => Number(u.permissions[k]) === 1).map(([,l]) => `<span class="badge">${esc(l)}</span>`).join(' ')}</td><td>${action}</td></tr>`; }).join('')}</tbody></table></div>`;
  const exports = `<div class="card" style="margin-top:16px"><h3>Tải dữ liệu</h3><div class="export-grid"><button class="btn secondary" data-export="tasks">Công việc</button><button class="btn secondary" data-export="violations">Vi phạm</button><button class="btn secondary" data-export="assessments">Checklist</button><button class="btn secondary" data-export="sales">Doanh thu cập nhật</button><button class="btn secondary" data-export="sales_targets">Target tháng</button><button class="btn secondary" data-export="sales_daily_targets">Target ngày</button><button class="btn secondary" data-export="bonuses">Tiền thưởng</button><button class="btn secondary" data-export="documents">Tài liệu</button><button class="btn secondary" data-export="orders">Order hàng</button><button class="btn secondary" data-export="online_orders">Đơn online</button><button class="btn secondary" data-export="product_feedback_summary">Tổng hợp đánh giá SP</button><button class="btn secondary" data-export="product_feedback">Chi tiết đánh giá SP</button><button class="btn secondary" data-export="product_collections">List BST/SKU</button><button class="btn secondary" data-export="product_trainings">Đào tạo SP</button><button class="btn secondary" data-export="product_training_attempts">Kết quả kiểm tra SP</button><button class="btn secondary" data-export="cdp_ojti">CDP/OJTI</button><button class="btn secondary" data-export="shifts">Ca làm</button><button class="btn secondary" data-export="work_schedules">Lịch làm việc</button><button class="btn secondary" data-export="performance">Tổng hợp điểm</button></div></div>`;
  shell(`${form}${editCard}<div class="card" style="margin-top:16px"><h3>Danh sách tài khoản</h3>${table}</div>${exports}`, 'Admin', 'Cấp quyền, phân quyền xem và tải dữ liệu');
  const createUserForm = $('#userForm');
  createUserForm?.querySelector('[name="role"]')?.addEventListener('change', () => applyRolePermissionPreset(createUserForm));
  $('#userForm')?.addEventListener('submit', async e => { e.preventDefault(); const fd = new FormData(e.target); const permissions = {}; Object.keys(PERM_LABELS).forEach(k => permissions[k] = fd.get(k) ? 1 : 0); const payload = { full_name: fd.get('full_name'), username: fd.get('username'), password: fd.get('password'), role: fd.get('role'), store_ids: selectedValues(e.target.querySelector('[name="store_ids"]')), permissions }; try { await api('/api/users', { method: 'POST', body: JSON.stringify(payload) }); toast('Đã tạo tài khoản'); await loadBase(); renderAdmin(); } catch (err) { toast(err.message, 'danger'); } });
  $$('.editUserBtn').forEach(btn => btn.addEventListener('click', () => { state.adminEditUserId = Number(btn.dataset.id); renderAdmin(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  $('#cancelEditUserBtn')?.addEventListener('click', () => { state.adminEditUserId = null; renderAdmin(); });
  $('#cancelEditUserBtn2')?.addEventListener('click', () => { state.adminEditUserId = null; renderAdmin(); });
  $('#editUserForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const permissions = {};
    Object.keys(PERM_LABELS).forEach(k => permissions[k] = fd.get(k) ? 1 : 0);
    const payload = { full_name: fd.get('full_name'), role: fd.get('role'), status: fd.get('status'), store_ids: selectedValues(e.target.querySelector('[name="store_ids"]')), permissions };
    if (String(fd.get('password') || '').trim()) payload.password = String(fd.get('password')).trim();
    try {
      await api(`/api/users/${fd.get('id')}`, { method: 'PATCH', body: JSON.stringify(payload) });
      toast('Đã cập nhật tài khoản / quyền');
      state.adminEditUserId = null;
      await loadBase();
      renderAdmin();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $$('.quickPermBtn').forEach(btn => btn.addEventListener('click', async () => {
    const u = data.users.find(x => Number(x.id) === Number(btn.dataset.id));
    if (!u) return;
    const grant = btn.dataset.mode === 'grant';
    const permissions = { ...u.permissions, can_view_sales_target: grant ? 1 : 0, can_view_store_sales_summary: grant ? 1 : 0, can_view_bonuses: grant ? 1 : 0 };
    try {
      await api(`/api/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ full_name: u.full_name, role: u.role, store_ids: u.store_ids || (u.store_id ? [u.store_id] : []), permissions }) });
      toast(grant ? 'Đã cấp quyền xem % target, tổng cửa hàng và tiền thưởng' : 'Đã thu hồi quyền xem % target, tổng cửa hàng và tiền thưởng');
      await loadBase();
      renderAdmin();
    } catch (err) { toast(err.message, 'danger'); }
  }));
  $$('.quickTargetBtn').forEach(btn => btn.addEventListener('click', async () => {
    const u = data.users.find(x => Number(x.id) === Number(btn.dataset.id));
    if (!u) return;
    const grant = btn.dataset.mode === 'grant';
    const permissions = { ...u.permissions, can_set_sales_targets: grant ? 1 : 0 };
    try {
      await api(`/api/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ full_name: u.full_name, role: u.role, store_ids: u.store_ids || (u.store_id ? [u.store_id] : []), permissions }) });
      toast(grant ? 'Đã cấp quyền set target' : 'Đã thu hồi quyền set target');
      await loadBase();
      renderAdmin();
    } catch (err) { toast(err.message, 'danger'); }
  }));
  $$('.deleteUserBtn').forEach(btn => btn.addEventListener('click', async () => {
    const name = btn.dataset.name || 'tài khoản này';
    if (!confirm(`Ngưng hoạt động / đánh dấu nghỉ việc cho ${name}? Tài khoản này sẽ không đăng nhập được nữa, nhưng dữ liệu cũ vẫn được giữ trong báo cáo.`)) return;
    try {
      await api(`/api/users/${btn.dataset.id}`, { method: 'DELETE' });
      toast('Đã chuyển tài khoản sang trạng thái đã nghỉ / ngưng hoạt động');
      await loadBase();
      renderAdmin();
    } catch (err) { toast(err.message, 'danger'); }
  }));
  $$('.restoreUserBtn').forEach(btn => btn.addEventListener('click', async () => {
    const u = data.users.find(x => Number(x.id) === Number(btn.dataset.id));
    if (!u) return;
    const name = btn.dataset.name || 'tài khoản này';
    if (!confirm(`Mở lại tài khoản cho ${name}?`)) return;
    try {
      await api(`/api/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ full_name: u.full_name, role: u.role, status: 'active', store_ids: u.store_ids || (u.store_id ? [u.store_id] : []), permissions: u.permissions }) });
      toast('Đã mở lại tài khoản');
      await loadBase();
      renderAdmin();
    } catch (err) { toast(err.message, 'danger'); }
  }));
}

start();
