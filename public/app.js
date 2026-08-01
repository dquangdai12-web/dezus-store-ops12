const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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
  scheduleDate: isoDateLocal(new Date()),
  scheduleMonth: currentMonthLocal(),
  scheduleStoreId: '',
  orderStoreId: '',
  feedbackStoreId: '',
  feedbackMonth: new Date().toISOString().slice(0, 7),
  feedbackCollectionId: '',
  trainingStoreId: '',
  trainingQuiz: null,
  weeklyWeekStart: mondayOf(isoDateLocal(new Date())),
  weeklyStoreId: '',
  weeklyEditMode: false,
  onlineOrderStoreId: '',
  onlineOrderMonth: new Date().toISOString().slice(0, 7),
  scheduleEditMode: false,
  navOpenGroup: localStorage.getItem('dezus_ops_nav_group') || 'overview',
  adminEditUserId: null,
};

const app = $('#app');

const PERM_LABELS = {
  can_assign_tasks: 'Giao việc',
  can_manage_violations: 'Ghi vi phạm',
  can_grade_checklists: 'Chấm checklist',
  can_manage_sales: 'Nhập doanh thu',
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
  can_view_reports: 'Xem tổng hợp',
  can_manage_users: 'Quản lý TK',
  can_export: 'Tải dữ liệu',
};

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
    input.addEventListener('input', () => {
      input.value = formatIntegerDots(input.value);
    });
    input.addEventListener('blur', () => {
      input.value = formatIntegerDots(input.value);
    });
  });
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
  return files.filter(Boolean).map((file, index) => `<a class="filelink" href="${esc(file)}" target="_blank">File ${index + 1}</a>`).join(' • ');
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
  if (!res.ok) throw new Error(data.error || data || 'Có lỗi xảy ra');
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
  return role === 'admin' ? 'Admin' : role === 'manager' ? 'Quản lý' : 'Nhân viên';
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
  return state.boot.users.filter(u => u.role !== 'admin');
}

function usersInStore(storeId) {
  return employees().filter(u => !storeId || Number(u.store_id) === Number(storeId));
}

function salesStaffInStore(storeId) {
  return state.boot.users.filter(u => u.role === 'employee' && (!storeId || Number(u.store_id) === Number(storeId)));
}

function can(p) {
  return state.user?.role === 'admin' || Number(state.user?.permissions?.[p]) === 1;
}

function navItems() {
  const items = [
    ['dashboard', 'Tổng quan', '◆', 'overview'],
    ['sales', 'Doanh thu', '%', 'revenue'],
    ['weekly_report', 'Báo cáo tuần', 'WK', 'revenue'],
    ['online_orders', 'Đơn online', 'OL', 'revenue'],
    ['bonuses', 'Tiền thưởng', '₫', 'revenue'],
    ['orders', 'Order hàng', 'SKU', 'product'],
    ['product_feedback', 'Đánh giá SP', 'FB', 'product'],
    ['product_training', 'Đào tạo SP', 'EDU', 'product'],
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
    if (id === 'weekly_report') return can('can_view_weekly_report') || can('can_manage_weekly_report');
    if (id === 'online_orders') return can('can_view_online_orders') || can('can_manage_online_orders');
    if (id === 'orders') return can('can_view_orders') || can('can_manage_orders');
    if (id === 'product_feedback') return can('can_view_product_feedback') || can('can_manage_product_feedback');
    if (id === 'product_training') return can('can_view_product_training') || can('can_manage_product_training');
    if (id === 'schedule') return can('can_view_schedule') || can('can_manage_schedule') || can('can_manage_shifts');
    if (id === 'documents') return can('can_view_documents') || can('can_manage_documents');
    if (id === 'bonuses') return can('can_manage_bonuses') || can('can_view_bonuses') || state.user?.role !== 'employee';
    if (id === 'reports') return state.user?.role !== 'employee' || can('can_view_reports');
    if (id === 'admin') return can('can_manage_users');
    return false;
  });
}

function navGroups() {
  return [
    { key:'overview', label:'Tổng quan', icon:'⌂', ids:['dashboard'] },
    { key:'work', label:'Công việc', icon:'☑', ids:['tasks','checklists','schedule','violations'] },
    { key:'revenue', label:'Doanh thu', icon:'₫', ids:['sales','weekly_report','online_orders','bonuses'] },
    { key:'product', label:'▣', icon:'▣', ids:['orders','product_feedback','product_training'], navLabel:'Sản phẩm' },
    { key:'more', label:'Tài liệu', icon:'☷', ids:['documents','reports'] },
    { key:'system', label:'Hệ thống', icon:'⚙', ids:['account','admin'] },
  ].map(g => ({...g, label: g.navLabel || g.label }));
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
  const bottomGroups = ['overview','work','revenue','product','system'].map(key => groups.find(g => g.key === key)).filter(Boolean);
  const mobileBottom = bottomGroups.map(group => {
    const count = availableGroupItems(group, items).length;
    return `<button class="mobile-tab group-${group.key} ${activeGroup === group.key ? 'active' : ''}" data-group="${group.key}"><span class="mobile-tab-icon">${group.icon}</span><span>${group.key === 'system' ? 'Thêm' : group.label}</span>${count > 1 ? `<small>${count}</small>` : ''}</button>`;
  }).join('');
  const mobileCats = groups.map(group => {
    const count = availableGroupItems(group, items).length;
    if (!count) return '';
    return `<button class="mobile-cat group-${group.key} ${activeGroup === group.key ? 'active' : ''}" data-group="${group.key}"><b>${group.icon}</b><span>${group.label}</span><small>${count} mục</small></button>`;
  }).join('');
  const openGroup = groups.find(g => g.key === state.navOpenGroup) || groups.find(g => g.key === activeGroup) || groups[0];
  const mobileSubnav = openGroup ? `<div class="mobile-subnav">${availableGroupItems(openGroup, items).map(([id,label]) => `<button class="mobile-subitem ${state.route === id ? 'active' : ''}" data-route="${id}">${label}</button>`).join('')}</div>` : '';
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
  if (active === 'weekly_report') return renderWeeklyReport();
  if (active === 'online_orders') return renderOnlineOrders();
  if (active === 'orders') return renderOrders();
  if (active === 'product_feedback') return renderProductFeedback();
  if (active === 'product_training') return renderProductTraining();
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
      <div class="card overview-leaderboard-card"><div class="section-title"><h3>Top % đạt target tháng này</h3><span class="badge">Cạnh tranh</span></div>${tableLeaderboard(top)}</div>
      <div class="card overview-violations-card"><div class="section-title"><h3>Vi phạm gần đây</h3><span class="badge danger">Kiểm soát</span></div>${violationsData.violations.slice(0, 6).map(v => `<div class="activity-item"><div><b>${esc(v.employee_name)}</b><span>${esc(v.store_name || '')} • ${dt(v.created_at)}</span><p>${esc(v.description || '')}</p></div><span class="badge danger">-${v.points_deducted}</span></div>`).join('') || '<div class="empty">Chưa có vi phạm</div>'}</div>
    </section>
  `, 'Tổng quan', '');
}

function tableLeaderboard(rows, showAmounts = false) {
  if (!rows.length) return '<div class="empty">Chưa có dữ liệu doanh thu/target</div>';
  const moneyColsHead = showAmounts ? '<th>Doanh thu thực đạt</th><th>Target DT</th><th>Timeline dự kiến</th><th>Cần bán/ngày</th>' : '';
  const moneyColsBody = r => showAmounts ? `<td><b>${money(r.revenue || 0)}đ</b></td><td>${money(r.target || 0)}đ</td><td>${percentBadge(r.pace_percent || 0)}</td><td><b>${money(r.daily_needed || 0)}đ</b></td>` : '';
  const podium = rows.slice(0, 3).map(r => `<div class="rank-card rank-${r.rank}">${r.rank === 1 ? `<div class="rank-cup" aria-hidden="true">🏆</div>` : ""}<div class="rank-no">Top ${r.rank}</div><b class="employee-name-line">${esc(r.full_name)}</b><span>${esc(r.store_name || '')}</span><strong>${Number(r.achievement_percent || 0)}%</strong></div>`).join('');
  return `<div class="leaderboard-premium">${podium}</div><div class="table-wrap leaderboard-wrap"><table class="leaderboard-table"><thead><tr><th>Top</th><th>Nhân viên</th><th>Cửa hàng</th><th>% đạt target</th>${moneyColsHead}<th>% tỷ trọng DT</th><th>Bill</th><th>Món</th><th>UPT</th><th>ATV</th><th>ASP</th><th>GUESTS</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="badge dark">Top ${r.rank}</span></td><td class="employee-name-cell"><b>${esc(r.full_name)}</b></td><td class="store-name-cell">${esc(r.store_name || '')}</td><td>${percentBadge(r.achievement_percent || 0)}</td>${moneyColsBody(r)}<td>${Number(r.revenue_percent || 0)}%</td><td>${money(r.bill_count || 0)}</td><td>${money(r.item_count || 0)}</td><td class="metric-badge-cell">${targetBadge(r.upt || 0, r.target_upt || 0, '', 2)}</td><td class="metric-badge-cell">${targetBadge(r.atv || 0, r.target_atv || 0, 'đ')}</td><td>${money(r.asp || 0)}đ</td><td>${Math.round(r.guests_percent || 0)}%</td></tr>`).join('')}</tbody></table></div>`;
}

function tableStoreSalesSummary(summary) {
  if (!summary || !summary.rows?.length) return '<div class="empty">Chưa có dữ liệu doanh thu ngày trong tháng này</div>';
  const t = summary.totals || {};
  const kpis = `<div class="grid four dash-kpis" style="margin-bottom:14px"><div class="card kpi"><div class="label">Doanh thu thực đạt</div><div class="num">${money(t.revenue || 0)}đ</div><div class="hint">Target tháng: ${money(summary.monthly_target || 0)}đ • ${percentBadge(t.achievement_percent || 0)}</div></div><div class="card kpi"><div class="label">Timeline dự kiến</div><div class="num">${Number(t.pace_percent || 0)}%</div><div class="hint">Dự kiến về: ${money(t.projected_revenue || 0)}đ</div></div><div class="card kpi"><div class="label">Cần bán/ngày</div><div class="num">${money(t.daily_needed || 0)}đ</div><div class="hint">Còn ${money(t.days_remaining || 0)} ngày để về 100%</div></div><div class="card kpi"><div class="label">Target ngày đã set</div><div class="num">${money(t.daily_target || 0)}đ</div><div class="hint">Theo tổng target ngày trong tháng • ${percentBadge(t.daily_achievement_percent || 0)}</div></div><div class="card kpi"><div class="label">UPT</div><div class="num">${fmt2(t.upt || 0)}</div><div class="hint">${targetBadge(t.upt || 0, t.target_upt || 0, '', 2)}</div></div><div class="card kpi"><div class="label">ATV</div><div class="num">${money(t.atv || 0)}đ</div><div class="hint">${targetBadge(t.atv || 0, t.target_atv || 0, 'đ')}</div></div><div class="card kpi"><div class="label">ASP</div><div class="num">${money(t.asp || 0)}đ</div><div class="hint">Doanh thu / số món</div></div><div class="card kpi"><div class="label">CR</div><div class="num">${Number(t.cr || 0)}%</div><div class="hint">${targetBadge(t.cr || 0, t.target_cr || 0, '%', 2)}</div></div><div class="card kpi"><div class="label">Lượt khách cửa hàng</div><div class="num">${money(t.customer_count || 0)}</div><div class="hint">CR = bill / lượt khách</div></div></div>`;
  const rows = summary.rows.map(r => `<tr><td><b>${dOnly(r.sale_date)}</b></td><td>${money(r.revenue || 0)}</td><td>${money(r.daily_target || 0)}</td><td>${percentBadge(r.daily_achievement_percent || 0)}</td><td>${money(r.bill_count || 0)}</td><td>${money(r.item_count || 0)}</td><td>${money(r.customer_count || 0)}</td><td>${targetBadge(r.upt || 0, r.daily_target_upt || r.target_upt || 0, '', 2)}</td><td>${targetBadge(r.atv || 0, r.daily_target_atv || r.target_atv || 0, 'đ')}</td><td>${money(r.asp || 0)}đ</td><td>${targetBadge(r.cr || 0, r.daily_target_cr || r.target_cr || 0, '%', 2)}</td><td>${percentBadge(r.achievement_percent || 0)}</td><td>${esc(r.note || r.daily_target_note || '')}</td></tr>`).join('');
  return `${kpis}<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Doanh thu ngày</th><th>Target ngày</th><th>% ngày</th><th>Bill</th><th>Món</th><th>Lượt khách CH</th><th>UPT</th><th>ATV</th><th>ASP</th><th>CR</th><th>% lũy kế tháng</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function tableWeeklyDays(rows) {
  if (!rows?.length) return '<div class="empty">Chưa có dữ liệu ngày trong tuần này</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Doanh thu</th><th>Target ngày</th><th>% đạt</th><th>Bill</th><th>Món</th><th>Lượt khách</th><th>UPT</th><th>ATV</th><th>ASP</th><th>CR</th><th>Ghi chú</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${dOnly(r.sale_date)}</b></td><td>${money(r.revenue || 0)}đ</td><td>${money(r.target_revenue || 0)}đ</td><td>${percentBadge(r.achievement_percent || 0)}</td><td>${money(r.bill_count || 0)}</td><td>${money(r.item_count || 0)}</td><td>${money(r.customer_count || 0)}</td><td>${fmt2(r.upt || 0)}</td><td>${money(r.atv || 0)}đ</td><td>${money(r.asp || 0)}đ</td><td>${fmt2(r.cr || 0)}%</td><td>${esc(r.note || '')}</td></tr>`).join('')}</tbody></table></div>`;
}

function tableWeeklyEmployees(rows) {
  if (!rows?.length) return '<div class="empty">Chưa có dữ liệu cá nhân trong tuần này</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Nhân viên</th><th>Doanh thu</th><th>Target tuần ước tính</th><th>% đạt</th><th>% tỷ trọng DT</th><th>Bill</th><th>Món</th><th>UPT</th><th>ATV</th><th>ASP</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.full_name)}</b></td><td>${money(r.revenue || 0)}đ</td><td>${money(r.target || 0)}đ</td><td>${percentBadge(r.achievement_percent || 0)}</td><td>${Number(r.revenue_percent || 0)}%</td><td>${money(r.bill_count || 0)}</td><td>${money(r.item_count || 0)}</td><td>${fmt2(r.upt || 0)}</td><td>${money(r.atv || 0)}đ</td><td>${money(r.asp || 0)}đ</td></tr>`).join('')}</tbody></table></div>`;
}

function tableWeeklyProducts(rows) {
  rows = Array.isArray(rows) ? rows : [];
  if (!rows.length) return '<div class="empty">Chưa nhập top sản phẩm bán chạy</div>';
  return `<div class="table-wrap weekly-read-table-wrap"><table class="weekly-read-table"><thead><tr><th>Top</th><th>Sản phẩm</th><th>SKU</th><th>Số lượng</th><th>Số bill</th><th>Ghi chú</th></tr></thead><tbody>${rows.slice(0,5).map((r, i) => `<tr><td><span class="badge dark">Top ${i + 1}</span></td><td><b>${esc(r.name || '')}</b></td><td>${esc(r.sku || '')}</td><td>${money(r.quantity || 0)}</td><td>${money(r.bill_count || 0)}</td><td>${esc(r.note || '')}</td></tr>`).join('')}</tbody></table></div>`;
}

function tableWeeklyPromotions(rows) {
  rows = Array.isArray(rows) ? rows : [];
  if (!rows.length) return '<div class="empty">Chưa nhập bill tham gia CTKM</div>';
  return `<div class="table-wrap weekly-read-table-wrap"><table class="weekly-read-table"><thead><tr><th>CTKM</th><th>Số bill tham gia</th><th>Ghi chú</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name || '')}</b></td><td>${money(r.bill_count || 0)}</td><td>${esc(r.note || '')}</td></tr>`).join('')}</tbody></table></div>`;
}

function weeklyProductInputRows(rows = []) {
  const base = Array.isArray(rows) && rows.length ? rows.slice(0,5) : [{}, {}, {}, {}, {}];
  while (base.length < 5) base.push({});
  return base.slice(0,5).map((r, i) => `<tr class="weekly-product-row"><td><span class="badge dark">Top ${i + 1}</span></td><td><input class="input weekly-product-name" value="${esc(r.name || '')}" placeholder="Tên sản phẩm"></td><td><input class="input weekly-product-sku" value="${esc(r.sku || '')}" placeholder="SKU"></td><td><input class="input weekly-product-qty" type="text" inputmode="numeric" data-number-format value="${money(r.quantity || 0)}"></td><td><input class="input weekly-product-bill" type="text" inputmode="numeric" data-number-format value="${money(r.bill_count || 0)}"></td><td><input class="input weekly-product-note" value="${esc(r.note || '')}" placeholder="Ghi chú"></td></tr>`).join('');
}

function weeklyPromotionInputRows(rows = []) {
  const base = Array.isArray(rows) && rows.length ? rows.slice(0,10) : [{ name:'Mua 3 giảm 5%', bill_count:0 }, { name:'Mua 5 giảm 10%', bill_count:0 }];
  return base.map((r, i) => `<tr class="weekly-promo-row"><td><input class="input weekly-promo-name" value="${esc(r.name || '')}" placeholder="VD: Mua 3 giảm 5%"></td><td><input class="input weekly-promo-bill" type="text" inputmode="numeric" data-number-format value="${money(r.bill_count || 0)}"></td><td><input class="input weekly-promo-note" value="${esc(r.note || '')}" placeholder="Ghi chú"><button type="button" class="btn ghost small weeklyRemovePromoBtn" style="margin-left:6px">Xóa</button></td></tr>`).join('');
}


async function downloadWeeklyReport() {
  const storeId = state.user.role === 'admin' ? (state.weeklyStoreId || state.boot.stores[0]?.id || '') : state.user.store_id;
  const weekStart = state.weeklyWeekStart || mondayOf(new Date().toISOString().slice(0, 10));
  try {
    const res = await fetch(`/api/weekly-report/export.csv?week_start=${encodeURIComponent(weekStart)}${storeId ? `&store_id=${encodeURIComponent(storeId)}` : ''}`, { headers: { Authorization: `Bearer ${state.token}` } });
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

async function renderWeeklyReport() {
  const defaultStoreId = state.user.role === 'admin' ? (state.weeklyStoreId || state.boot.stores[0]?.id || '') : state.user.store_id;
  state.weeklyStoreId = defaultStoreId;
  const weekStart = state.weeklyWeekStart || mondayOf(new Date().toISOString().slice(0, 10));
  state.weeklyWeekStart = weekStart;
  const data = await api(`/api/weekly-report?week_start=${encodeURIComponent(weekStart)}${defaultStoreId ? `&store_id=${encodeURIComponent(defaultStoreId)}` : ''}`);
  state.weeklyWeekStart = data.week_start || weekStart;
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(data.store_id) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const storeFilter = state.user.role === 'admin' ? `<div class="field"><label>Cửa hàng</label><select class="input" id="weeklyStoreFilter">${storeOptions}</select></div>` : '';
  const t = data.totals || {};
  const kpis = `<section class="grid four dash-kpis weekly-kpis"><div class="card kpi weekly-kpi weekly-revenue"><div class="label">Doanh thu tuần</div><div class="num">${money(t.revenue || 0)}đ</div><div class="hint">Target tuần: ${money(t.target_revenue || 0)}đ • ${percentBadge(t.achievement_percent || 0)}</div></div><div class="card kpi weekly-kpi weekly-bill"><div class="label">Bill / Món</div><div class="num">${money(t.bill_count || 0)} / ${money(t.item_count || 0)}</div><div class="hint">Tổng toàn cửa hàng</div></div><div class="card kpi weekly-kpi weekly-upt"><div class="label">UPT</div><div class="num">${fmt2(t.upt || 0)}</div><div class="hint">Số món / bill</div></div><div class="card kpi weekly-kpi weekly-atv"><div class="label">ATV</div><div class="num">${money(t.atv || 0)}đ</div><div class="hint">Doanh thu / bill</div></div><div class="card kpi weekly-kpi weekly-asp"><div class="label">ASP</div><div class="num">${money(t.asp || 0)}đ</div><div class="hint">Doanh thu / số món</div></div><div class="card kpi weekly-kpi weekly-cr"><div class="label">CR</div><div class="num">${fmt2(t.cr || 0)}%</div><div class="hint">Bill / lượt khách</div></div><div class="card kpi weekly-kpi weekly-customer"><div class="label">Lượt khách</div><div class="num">${money(t.customer_count || 0)}</div><div class="hint">Theo tổng cửa hàng</div></div></section>`;
  const feedback = data.feedback || {};
  const hasWeeklyExtra = !!((feedback.top_products || data.top_products || []).length || (feedback.promotions || data.promotions || []).length);
  const hasFeedback = !!(feedback.id || feedback.feedback || feedback.issues || feedback.action_plan || feedback.note || hasWeeklyExtra);
  const canEditFeedback = can('can_manage_weekly_report');
  const weeklyProducts = feedback.top_products || data.top_products || [];
  const weeklyPromotions = feedback.promotions || data.promotions || [];
  const feedbackView = `<div class="card weekly-feedback-card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Feedback tuần</h3>${canEditFeedback ? `<button class="btn secondary" id="weeklyEditFeedbackBtn">Sửa feedback</button>` : ''}</div>${hasFeedback ? `<div class="weekly-feedback-view"><div class="weekly-feedback-block"><b>Nhận xét tuần</b><div class="weekly-feedback-content">${esc(feedback.feedback || 'Chưa nhập')}</div></div><div class="weekly-feedback-block"><b>Vấn đề phát sinh</b><div class="weekly-feedback-content">${esc(feedback.issues || 'Chưa nhập')}</div></div><div class="weekly-feedback-block"><b>Việc cần làm tuần tới</b><div class="weekly-feedback-content">${esc(feedback.action_plan || 'Chưa nhập')}</div></div><div class="weekly-feedback-block"><b>Ghi chú</b><div class="weekly-feedback-content">${esc(feedback.note || 'Chưa nhập')}</div></div></div>` : '<div class="empty">Chưa lưu feedback tuần này</div>'}</div>
    <section class="grid two weekly-extra-grid" style="margin-top:16px"><div class="card"><h3>Top 5 sản phẩm bán chạy</h3>${tableWeeklyProducts(weeklyProducts)}</div><div class="card"><h3>Tổng hợp bill CTKM</h3>${tableWeeklyPromotions(weeklyPromotions)}</div></section>`;
  const feedbackForm = canEditFeedback ? `<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">${hasFeedback ? 'Sửa báo cáo tuần' : 'Nhập báo cáo tuần'}</h3>${hasFeedback ? '<button type="button" class="btn secondary" id="weeklyCancelFeedbackBtn">Hủy sửa</button>' : ''}</div><form id="weeklyFeedbackForm" class="grid two"><input type="hidden" name="store_id" value="${esc(data.store_id)}"><input type="hidden" name="week_start" value="${esc(data.week_start)}"><div class="field" style="grid-column:1/-1"><label>Nhận xét/feedback tuần này</label><textarea name="feedback" data-auto-resize placeholder="VD: TF tăng cuối tuần, khách hỏi nhiều size L/XL...">${esc(feedback.feedback || '')}</textarea></div><div class="field"><label>Vấn đề phát sinh</label><textarea name="issues" data-auto-resize placeholder="VD: Thiếu size, khách chê chất liệu, nhân sự thiếu ca...">${esc(feedback.issues || '')}</textarea></div><div class="field"><label>Việc cần làm tuần tới</label><textarea name="action_plan" data-auto-resize placeholder="VD: Đẩy combo, bổ sung hàng, đào tạo lại UPT...">${esc(feedback.action_plan || '')}</textarea></div><div class="field" style="grid-column:1/-1"><label>Ghi chú thêm</label><textarea name="note" data-auto-resize>${esc(feedback.note || '')}</textarea></div><div class="field" style="grid-column:1/-1"><label>Top 5 sản phẩm bán chạy</label><div class="table-wrap"><table class="weekly-extra-input-table"><thead><tr><th>Top</th><th>Sản phẩm</th><th>SKU</th><th>Số lượng</th><th>Số bill</th><th>Ghi chú</th></tr></thead><tbody>${weeklyProductInputRows(weeklyProducts)}</tbody></table></div></div><div class="field" style="grid-column:1/-1"><label>Bill chạy CTKM</label><div class="row" style="margin-bottom:8px"><button type="button" class="btn secondary small" id="weeklyAddPromoBtn">Thêm CTKM</button><span class="hint">VD: Mua 3 giảm 5%, Mua 5 giảm 10%</span></div><div class="table-wrap"><table class="weekly-extra-input-table"><thead><tr><th>Tên CTKM</th><th>Số bill tham gia</th><th>Ghi chú</th></tr></thead><tbody id="weeklyPromoRows">${weeklyPromotionInputRows(weeklyPromotions)}</tbody></table></div></div><div style="grid-column:1/-1"><button class="btn">Lưu báo cáo tuần</button></div></form></div>` : '';
  const feedbackSection = canEditFeedback && (state.weeklyEditMode || !hasFeedback) ? feedbackForm : feedbackView;
  shell(`<div class="card"><div class="toolbar"><div class="field"><label>Chọn ngày trong tuần</label><input class="input" id="weeklyDateFilter" type="date" value="${esc(data.week_start)}"></div>${storeFilter}<div class="field"><label>Tuần đang xem</label><div class="input readonly">${dOnly(data.week_start)} - ${dOnly(data.week_end)}</div></div><div style="align-self:end">${can('can_export') ? '<button class="btn secondary" id="weeklyExportBtn">Tải CSV báo cáo tuần</button>' : ''}</div></div><p class="hint">Chọn bất kỳ ngày trong tuần, hệ thống tự gom từ T2 đến CN. Lưu báo cáo xong sẽ hiện dạng bảng, bấm Sửa feedback để chỉnh lại.</p></div>${kpis}<section class="grid two" style="margin-top:16px"><div class="card"><h3>Doanh thu theo ngày</h3>${tableWeeklyDays(data.days || [])}</div><div class="card"><h3>Doanh thu cá nhân</h3>${tableWeeklyEmployees(data.employees || [])}</div></section>${feedbackSection}`, 'Báo cáo tuần', `Tổng hợp tuần ${dOnly(data.week_start)} - ${dOnly(data.week_end)}`);
  setupAutoResizeTextareas($('#weeklyFeedbackForm'));
  $('#weeklyDateFilter')?.addEventListener('change', e => { state.weeklyWeekStart = mondayOf(e.target.value); renderWeeklyReport(); });
  $('#weeklyStoreFilter')?.addEventListener('change', e => { state.weeklyStoreId = e.target.value; state.weeklyEditMode = false; renderWeeklyReport(); });
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
      sku: $('.weekly-product-sku', row)?.value || '',
      quantity: cleanNumberInput($('.weekly-product-qty', row)?.value),
      bill_count: cleanNumberInput($('.weekly-product-bill', row)?.value),
      note: $('.weekly-product-note', row)?.value || ''
    })).filter(x => x.name || x.sku || cleanNumberInput(x.quantity) || cleanNumberInput(x.bill_count)).slice(0,5);
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
  let shiftData = { shifts: [] };
  if (can('can_assign_tasks')) {
    try { shiftData = await api('/api/shifts'); } catch (_err) { shiftData = { shifts: [] }; }
  }
  const shifts = shiftData.shifts || [];
  const userStoreIds = Array.isArray(state.user.store_ids) && state.user.store_ids.length ? state.user.store_ids.map(Number) : (state.user.store_id ? [Number(state.user.store_id)] : []);
  const allowedStores = state.user.role === 'admin' ? state.boot.stores : state.boot.stores.filter(s => userStoreIds.includes(Number(s.id)));
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
            <div class="field"><label>Lặp lại</label><select name="multi_repeat_every_days"><option value="1">Mỗi ngày</option><option value="2">2 ngày/lần</option><option value="3">3 ngày/lần</option><option value="7">Mỗi tuần</option></select></div>
            <div class="field" style="grid-column:span 2"><label>Nhân viên nhận việc</label>${taskUserPicker('multiAssigneeSelect', usersInStore(storeId), 'Tick tròn để chọn người nhận việc lặp lại.')}</div>
          </div>
        </div>

        <div class="task-mode-panel" data-task-panel="shift">
          <div class="grid three">
            <div class="field"><label>Từ ngày</label><input class="input" name="shift_start_date" type="date"></div>
            <div class="field"><label>Đến ngày</label><input class="input" name="shift_end_date" type="date"></div>
            <div class="field"><label>Hạn hoàn thành mỗi ngày</label><input class="input" name="shift_due_time" type="time" value="22:00"></div>
            <div class="field"><label>Lặp lại</label><select name="shift_repeat_every_days"><option value="1">Mỗi ngày</option><option value="2">2 ngày/lần</option><option value="3">3 ngày/lần</option><option value="7">Mỗi tuần</option></select></div>
            <div class="field"><label>Chọn ca</label><select name="shift_ids" id="taskShiftSelect" multiple size="5">${shiftOptions}</select><span class="hint">Hệ thống tự lấy nhân viên đã được phân lịch ca đó.</span></div>
            <div class="field"><label>Thêm nhân viên thủ công nếu cần</label>${taskUserPicker('shiftAssigneeSelect', usersInStore(storeId), 'Có thể để trống nếu chỉ giao theo ca.')}</div>
          </div>
        </div>

        <div class="field" style="margin-top:12px"><label>Mô tả / yêu cầu</label><textarea name="description" placeholder="Nội dung, tiêu chuẩn hoàn thành, chứng từ cần đính kèm..."></textarea></div>
        <div class="task-submit-row"><button class="btn">Tạo & giao việc</button></div>
      </form>
    </div>` : '';
  const grouped = tasks.map(t => taskCard(t)).join('') || '<div class="empty">Chưa có công việc</div>';
  shell(`${assignForm}<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Danh sách công việc</h3>${can('can_export') ? '<button class="btn secondary" data-export="tasks">Tải CSV</button>' : ''}</div><div class="grid">${grouped}</div></div>`, 'Công việc', 'Giao việc 1 lần, giao nhiều ngày, giao theo ca hoặc nhiều nhân viên cùng lúc');
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
  $('#taskForm')?.addEventListener('submit', submitTask);
  $$('.completeForm').forEach(f => f.addEventListener('submit', submitCompleteTask));
}

function taskCard(t) {
  const canComplete = (Number(t.assignee_id) === Number(state.user.id) || state.user.role !== 'employee') && !t.completed_at;
  return `<div class="card task-card">
    <div class="task-head">
      <div><h4>${esc(t.title)}</h4><div class="meta"><span>${esc(t.store_name || '')}</span>${t.task_date ? `<span>Ngày việc: ${dOnly(t.task_date)}</span>` : ''}${t.shift_label ? `<span>Ca: ${esc(t.shift_label)}</span>` : ''}${t.recurrence_label ? `<span>${esc(t.recurrence_label)}</span>` : ''}<span>Giao cho: ${esc(t.assignee_name)}</span><span>Hạn: ${dt(t.due_at)}</span><span>Điểm trừ: ${t.score_value}</span></div></div>
      ${statusBadge(t.status)}
    </div>
    ${t.description ? `<p>${esc(t.description)}</p>` : ''}
    ${t.evidence_path ? `<div class="hint">Chứng từ: ${renderFiles(t.evidence_path)} • ${esc(t.evidence_note || '')}</div>` : ''}
    ${canComplete ? `<form class="completeForm row" data-id="${t.assignment_id}" enctype="multipart/form-data"><input class="input" name="note" placeholder="Ghi chú hoàn thành"><input class="input" name="evidence" type="file" accept="image/*,.pdf,.xlsx,.docx" multiple><button class="btn small">Hoàn thành</button></form>` : ''}
  </div>`;
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
    payload.repeat_every_days = payload.multi_repeat_every_days || '1';
    delete payload.due_at;
  } else if (mode === 'shift') {
    payload.assignee_ids = selectedFrom('shiftAssigneeSelect');
    payload.shift_ids = selectedFrom('taskShiftSelect');
    payload.start_date = payload.shift_start_date;
    payload.end_date = payload.shift_end_date;
    payload.due_time = payload.shift_due_time || '22:00';
    payload.repeat_every_days = payload.shift_repeat_every_days || '1';
    delete payload.due_at;
  }

  ['task_mode','multi_start_date','multi_end_date','multi_due_time','multi_repeat_every_days','shift_start_date','shift_end_date','shift_due_time','shift_repeat_every_days'].forEach(k => delete payload[k]);

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
  const fd = new FormData(form);
  try { const res = await api(`/api/tasks/${form.dataset.id}/complete`, { method: 'POST', body: fd }); toast(res.status === 'completed_late' ? 'Hoàn thành nhưng đã trễ hạn, hệ thống tự trừ điểm' : 'Đã hoàn thành đúng hạn'); renderTasks(); } catch (err) { toast(err.message, 'danger'); }
}

async function renderViolations() {
  const data = await api('/api/violations');
  const form = can('can_manage_violations') ? `
    <div class="card"><h3>Ghi nhận vi phạm</h3>
      <form id="violationForm" class="grid two" enctype="multipart/form-data">
        <div class="field"><label>Nhân viên</label><select name="user_id" required>${usersInStore(state.user.role === 'admin' ? '' : state.user.store_id).map(u => `<option value="${u.id}">${esc(u.full_name)} - ${esc(u.store_name || '')}</option>`).join('')}</select></div>
        <div class="field"><label>Loại vi phạm</label><input class="input" name="violation_type" placeholder="VD: Quy trình thu ngân / Grooming / Hàng hóa" required></div>
        <div class="field"><label>Điểm trừ</label><input class="input" type="number" name="points_deducted" value="5" min="0" max="100"></div>
        <div class="field"><label>Ảnh/chứng từ</label><input class="input" type="file" name="evidence" accept="image/*,.pdf,.xlsx,.docx" multiple></div>
        <div class="field" style="grid-column:1/-1"><label>Nội dung vi phạm</label><textarea name="description" required placeholder="Mô tả lỗi, thời gian, tình huống, yêu cầu khắc phục"></textarea></div>
        <div style="grid-column:1/-1"><button class="btn danger">Lưu vi phạm</button></div>
      </form>
    </div>` : '';
  const list = data.violations.length ? `<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Nhân viên</th><th>Cửa hàng</th><th>Loại</th><th>Điểm trừ</th><th>Nội dung</th><th>Chứng từ</th></tr></thead><tbody>${data.violations.map(v => `<tr><td>${dt(v.created_at)}</td><td><b>${esc(v.employee_name)}</b></td><td>${esc(v.store_name || '')}</td><td>${esc(v.violation_type)}</td><td><span class="badge danger">-${v.points_deducted}</span></td><td>${esc(v.description || '')}</td><td>${v.evidence_path ? renderFiles(v.evidence_path) : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có vi phạm</div>';
  shell(`${form}<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Danh sách vi phạm</h3>${can('can_export') ? '<button class="btn secondary" data-export="violations">Tải CSV</button>' : ''}</div>${list}</div>`, 'Vi phạm', 'Quản lý ghi nhận; nhân viên chỉ xem vi phạm của mình');
  $('#violationForm')?.addEventListener('submit', async e => { e.preventDefault(); try { await api('/api/violations', { method: 'POST', body: new FormData(e.target) }); toast('Đã lưu vi phạm'); renderViolations(); } catch (err) { toast(err.message, 'danger'); } });
}

async function renderChecklists() {
  const [history] = await Promise.all([api('/api/checklist/assessments')]);
  const templates = state.templates;
  const selected = templates.find(t => t.id === state.checklistType) || templates[0];
  const tabs = `<div class="pillbar">${templates.map(t => `<button data-checklist="${t.id}" class="${selected.id === t.id ? 'active' : ''}">${esc(t.id)}</button>`).join('')}</div>`;
  const form = can('can_grade_checklists') ? checklistForm(selected) : '<div class="empty">Tài khoản này chỉ được xem lại phiếu đã chấm.</div>';
  const list = history.assessments.length ? `<div class="table-wrap"><table><thead><tr><th>Ngày chấm</th><th>Checklist</th><th>Đối tượng</th><th>Cửa hàng</th><th>Điểm</th><th>Người chấm</th><th>Ghi chú</th><th>Chi tiết</th></tr></thead><tbody>${history.assessments.map(a => `<tr><td>${dt(a.assessed_at)}</td><td><span class="badge dark">${esc(a.template_id)}</span></td><td>${esc(a.employee_name || 'Cửa hàng')}</td><td>${esc(a.store_name || '')}</td><td><b>${a.total_score}/${a.max_score}</b> (${a.percent}%)</td><td>${esc(a.created_by_name || '')}</td><td>${esc(a.general_note || '')}</td><td><button class="btn small secondary viewAssessmentBtn" data-id="${a.id}">Xem ghi chú</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có phiếu chấm</div>';
  shell(`<div class="card"><div class="toolbar"><h3 style="margin-right:auto">Chọn checklist</h3>${tabs}</div>${form}</div><div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Lịch sử chấm</h3>${can('can_export') ? '<button class="btn secondary" data-export="assessments">Tải CSV</button>' : ''}</div>${list}</div><div id="assessmentDetail" style="margin-top:16px"></div>`, 'Checklist', 'OPS/VM theo cửa hàng; GUESTS theo từng đại sứ kinh doanh');
  $$('.pillbar button').forEach(b => b.onclick = () => { state.checklistType = b.dataset.checklist; renderChecklists(); });
  $('#checklistForm')?.addEventListener('submit', submitChecklist);
  $$('.viewAssessmentBtn').forEach(btn => btn.addEventListener('click', () => renderAssessmentDetail(btn.dataset.id)));
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
  const target = t.target_type === 'employee' ? `<div class="field"><label>Đại sứ kinh doanh</label><select name="employee_id" id="checkEmployee" required>${usersInStore(state.user.role === 'admin' ? '' : state.user.store_id).map(u => `<option value="${u.id}">${esc(u.full_name)} - ${esc(u.store_name || '')}</option>`).join('')}</select></div>` : '';
  const sectionHtml = sections.map(sec => {
    const items = t.items.filter(i => i.section_id === sec.id);
    if (!items.length) return '';
    return `<details class="check-section" open><summary>${esc(sec.title)}</summary>${items.map(i => `<div class="check-item"><div><b>${esc(i.title)}</b><div class="max">Tối đa ${i.max_score} điểm</div></div><input class="input score-input" type="number" min="0" max="${i.max_score}" step="0.5" name="score_${i.id}" value="${i.max_score}"><input class="input" name="note_${i.id}" placeholder="Ghi chú mục này"></div>`).join('')}</details>`;
  }).join('');
  return `<form id="checklistForm" data-template="${t.id}">
    <div class="grid three">
      <div class="field"><label>Cửa hàng</label><select name="store_id" id="checkStore" ${state.user.role !== 'admin' ? 'disabled' : ''}>${storeOptions}</select></div>
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
    store_id: state.user.role === 'admin' ? fd.get('store_id') : state.user.store_id,
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
  const defaultStoreId = state.user.role === 'admin' ? (state.salesStoreId || state.boot.stores[0]?.id || '') : state.user.store_id;
  state.salesStoreId = defaultStoreId;
  const [data, summary] = await Promise.all([
    api(`/api/sales/leaderboard?period=${state.leaderboardPeriod}&date=${currentMonth}-15${defaultStoreId ? `&store_id=${defaultStoreId}` : ''}`),
    api(`/api/sales/store-summary?month=${currentMonth}${defaultStoreId ? `&store_id=${defaultStoreId}` : ''}`).catch(() => null)
  ]);
  const storeIdForForms = state.user.role === 'admin' ? defaultStoreId : state.user.store_id;
  const salesStaff = salesStaffInStore(storeIdForForms);
  const employeesOptions = salesStaff.map(u => `<option value="${u.id}">${esc(u.full_name)} - ${esc(u.store_name || '')}</option>`).join('');
  const targetEmployeeChecks = salesStaff.map(u => `<label class="target-employee-check"><input type="checkbox" name="user_ids" value="${u.id}"><span><b>${esc(u.full_name)}</b><small>${esc(u.store_name || '')}</small></span></label>`).join('') || '<div class="empty">Chưa có nhân viên bán hàng trong cửa hàng này</div>';
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(defaultStoreId) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const storeSelect = state.user.role === 'admin' ? `<div class="field"><label>Cửa hàng</label><select class="input" id="salesStoreFilter" name="store_id">${storeOptions}</select></div>` : `<input type="hidden" name="store_id" value="${esc(state.user.store_id)}">`;
  const storeSelectTarget = state.user.role === 'admin' ? `<div class="field"><label>Cửa hàng</label><select class="input" id="dailyTargetStoreFilter" name="store_id">${storeOptions}</select></div>` : `<input type="hidden" name="store_id" value="${esc(state.user.store_id)}">`;
  const targetForm = can('can_set_sales_targets') ? `<div class="card"><h3>Set target đầu tháng nhiều nhân viên</h3><p class="hint">Có thể chọn một hoặc nhiều nhân viên cùng lúc để set chung target tháng. Nếu nhân viên đã có target tháng này, hệ thống sẽ cập nhật lại thay vì tạo trùng.</p><form id="targetForm" class="grid four"><div class="field target-employee-field" style="grid-column:1/-1"><label>Chọn nhân viên bán hàng</label><div class="row target-multi-actions"><button type="button" class="btn secondary small" id="targetSelectAllBtn">Chọn tất cả</button><button type="button" class="btn ghost small" id="targetClearAllBtn">Bỏ chọn</button><span class="hint">Chọn nhiều nhân viên để lưu target nhanh trong 1 lần.</span></div><div class="target-employee-grid">${targetEmployeeChecks}</div></div><div class="field"><label>Tháng target</label><input class="input" type="month" name="target_month" value="${currentMonth}" required></div><div class="field"><label>Target doanh thu tháng</label><input class="input" type="text" inputmode="numeric" data-number-format name="target_revenue" required placeholder="VD: 80.000.000"></div><div class="field"><label>Target UPT</label><input class="input" type="number" step="0.01" name="target_upt" min="0" placeholder="VD: 2.50"></div><div class="field"><label>Target ATV</label><input class="input" type="text" inputmode="numeric" data-number-format name="target_atv" placeholder="VD: 1.500.000"></div><div class="field"><label>Target CR %</label><input class="input" type="number" step="0.01" name="target_cr" min="0" placeholder="VD: 35"></div><div class="field" style="grid-column:span 2"><label>Ghi chú target</label><input class="input" name="note" placeholder="VD: Target tháng 7 / target điều chỉnh"></div><div class="field" style="align-self:end"><button class="btn">Lưu target đã chọn</button></div></form></div>` : '';
  const todayIso = new Date().toISOString().slice(0,10);
  const dailyTargetForm = can('can_set_sales_targets') ? `<div class="card" style="margin-top:16px"><h3>Set target doanh thu theo ngày - tổng cửa hàng</h3><p class="hint">Chọn từng ngày muốn set target, có thể chọn nhiều ngày không liền nhau. UPT / ATV / CR tự lấy theo target tháng, không cần set riêng từng ngày.</p><form id="dailyTargetForm" class="grid four daily-target-pick-form">${storeSelectTarget}<div class="field" style="grid-column:span 2"><label>Chọn ngày cần set</label><div class="row daily-date-add-row"><input class="input" type="date" id="dailyTargetDatePicker" value="${todayIso}"><button type="button" class="btn secondary" id="dailyTargetAddDateBtn">Thêm ngày</button></div></div><div class="field"><label>Target doanh thu/ngày</label><input class="input" type="text" inputmode="numeric" data-number-format name="target_revenue" required placeholder="VD: 10.000.000"></div><div class="field" style="grid-column:1/-1"><label>Ngày đã chọn</label><div class="row daily-target-actions"><button type="button" class="btn secondary small" id="dailyTargetAddTodayBtn">Thêm hôm nay</button><button type="button" class="btn ghost small" id="dailyTargetClearDatesBtn">Xóa chọn</button><span class="hint">Bấm Thêm ngày nhiều lần để chọn các ngày rời rạc.</span></div><div id="dailyTargetDateList" class="daily-date-list"></div></div><div class="field" style="grid-column:span 3"><label>Ghi chú target ngày</label><input class="input" name="note" placeholder="VD: Target cuối tuần / ngày sale"></div><div class="field" style="align-self:end"><button class="btn">Lưu target ngày đã chọn</button></div></form></div>` : '';
  const rowsInputs = salesStaff.map(u => `<tr data-user="${u.id}"><td><b>${esc(u.full_name)}</b><div class="hint">${esc(u.store_name || '')}</div></td><td><input class="input" name="revenue_${u.id}" type="text" inputmode="numeric" data-number-format value="0"></td><td><input class="input" name="bill_${u.id}" type="text" inputmode="numeric" data-number-format value="0"></td><td><input class="input" name="item_${u.id}" type="text" inputmode="numeric" data-number-format value="0"></td><td><input class="input" name="note_${u.id}" placeholder="Ghi chú NV"></td></tr>`).join('') || '<tr><td colspan="5"><div class="empty">Chưa có nhân viên bán hàng trong cửa hàng này</div></td></tr>';
  const salesForm = can('can_manage_sales') ? `<div class="card" style="margin-top:16px"><h3>Nhập doanh thu từng ngày</h3><p class="hint">Mỗi ngày cửa hàng nhập doanh thu từng nhân viên: doanh thu, số bill, số món. Lượt khách nhập 1 lần theo tổng cửa hàng. Nếu nhập lại cùng ngày, hệ thống sẽ cập nhật thay vì cộng trùng.</p><form id="dailySalesForm"><div class="grid four">${storeSelect}<div class="field"><label>Ngày bán</label><input class="input" type="date" name="sale_date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field"><label>Lượt khách tổng cửa hàng</label><input class="input" type="text" inputmode="numeric" data-number-format name="customer_count" value="0"></div><div class="field"><label>Ghi chú cửa hàng</label><input class="input" name="note" placeholder="VD: Cuối ngày / ca tối"></div></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Nhân viên</th><th>Doanh thu</th><th>Số bill</th><th>Số món</th><th>Ghi chú</th></tr></thead><tbody>${rowsInputs}</tbody></table></div><div style="margin-top:12px"><button class="btn">Lưu doanh thu ngày</button></div></form></div>` : '';
  const tabs = `<div class="pillbar"><button data-period="month" class="${state.leaderboardPeriod === 'month' ? 'active' : ''}">Tháng</button><button data-period="quarter" class="${state.leaderboardPeriod === 'quarter' ? 'active' : ''}">Quý</button><button data-period="year" class="${state.leaderboardPeriod === 'year' ? 'active' : ''}">Năm</button></div>`;
  const monthFilter = `<div class="toolbar" style="margin-bottom:12px"><div class="field"><label>Tháng xem tổng hợp</label><input class="input" id="salesMonthFilter" type="month" value="${currentMonth}"></div>${state.user.role === 'admin' ? `<div class="field"><label>Cửa hàng xem tổng</label><select class="input" id="salesStoreSummaryFilter">${storeOptions}</select></div>` : ''}</div>`;
  const summaryBlock = summary ? `<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Tổng hợp doanh thu tháng ${esc(summary.month)} - ${esc(summary.store_name)}</h3></div><p class="hint">Bảng này cộng từng ngày đã nhập để theo dõi doanh thu ngày; UPT, ATV, ASP, CR mặc định so với target tháng. Timeline dự kiến tính theo tốc độ doanh thu hiện tại và số ngày còn lại trong kỳ.</p>${tableStoreSalesSummary(summary)}</div>` : '<div class="card" style="margin-top:16px"><h3>Tổng hợp doanh thu cửa hàng</h3><div class="empty">Tài khoản này chưa được cấp quyền xem tổng doanh thu cửa hàng</div></div>';
  shell(`${targetForm}${dailyTargetForm}${salesForm}<div class="card" style="margin-top:16px">${monthFilter}<div class="toolbar"><h3 style="margin-right:auto">Bảng doanh thu thực đạt ${state.leaderboardPeriod === 'month' ? 'tháng' : state.leaderboardPeriod === 'quarter' ? 'quý' : 'năm'}</h3>${tabs}${can('can_export') ? '<button class="btn secondary" data-export="sales">Tải CSV doanh thu</button>' : ''}</div><p class="hint">Mục Doanh thu được phép xem doanh thu thực đạt. Riêng màn Tổng quan chỉ hiển thị % đạt target, không hiển thị số tiền bán.</p>${tableLeaderboard(data.leaderboard, true)}</div>${summaryBlock}`, 'Doanh thu', 'Nhập doanh thu ngày, target cá nhân, target ngày và tổng hợp target cửa hàng');
  $$('.pillbar button').forEach(b => b.onclick = () => { state.leaderboardPeriod = b.dataset.period; renderSales(); });
  $('#salesMonthFilter')?.addEventListener('change', e => { state.salesMonth = e.target.value; renderSales(); });
  $('#salesStoreSummaryFilter')?.addEventListener('change', e => { state.salesStoreId = e.target.value; renderSales(); });
  $('#salesStoreFilter')?.addEventListener('change', e => { state.salesStoreId = e.target.value; renderSales(); });
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
  $('#dailySalesForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const entries = $$('tbody tr[data-user]', e.target).map(tr => {
      const uid = tr.dataset.user;
      return { user_id: uid, revenue: cleanNumberInput(fd.get(`revenue_${uid}`)), bill_count: cleanNumberInput(fd.get(`bill_${uid}`)), item_count: cleanNumberInput(fd.get(`item_${uid}`)), note: fd.get(`note_${uid}`) || '' };
    });
    const payload = { store_id: fd.get('store_id') || state.user.store_id, sale_date: fd.get('sale_date'), customer_count: cleanNumberInput(fd.get('customer_count')), note: fd.get('note') || '', entries };
    try { await api('/api/sales/daily', { method: 'POST', body: JSON.stringify(payload) }); toast('Đã lưu doanh thu ngày'); renderSales(); } catch (err) { toast(err.message, 'danger'); }
  });
}


function fileSizeLabel(bytes) {
  const n = Number(bytes || 0);
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  if (n >= 1024) return Math.round(n / 1024) + ' KB';
  return n + ' B';
}

async function downloadDocument(id, name = 'tai-lieu') {
  try {
    const res = await fetch(`/api/documents/${id}/download`, { headers: { Authorization: `Bearer ${state.token}` } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Không tải được tài liệu');
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

    const itemKey = `${String(o.sku || '').toLowerCase()}||${String(o.product_name || '').toLowerCase()}`;
    let item = g.rows.find(x => x.key === itemKey);
    if (!item) {
      item = {
        key: itemKey,
        sku: o.sku || '',
        product_name: o.product_name || '',
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
  const allScope = state.user.role === 'admin' || (!state.user.store_id && (can('can_manage_online_orders') || can('can_view_online_orders')));
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
  const allScope = state.user.role === 'admin' || (!state.user.store_id && (can('can_manage_orders') || can('can_view_orders')));
  const defaultStoreId = allScope ? (state.orderStoreId || state.boot.stores[0]?.id || '') : (state.user.store_id || '');
  state.orderStoreId = defaultStoreId;
  const data = await api(`/api/orders${defaultStoreId ? `?store_id=${defaultStoreId}` : ''}`);
  const orders = data.orders || [];
  const batches = [...new Set(orders.map(orderBatchName))].sort((a, b) => a.localeCompare(b, 'vi'));
  const groups = groupOrdersByBatch(orders);
  const storeOptions = state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(defaultStoreId) ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  const batchOptions = batches.map(b => `<option value="${esc(b)}"></option>`).join('');
  const storeSelect = allScope ? `<div class="field"><label>Cửa hàng</label><select class="input" id="orderStoreFilter" name="store_id">${storeOptions}</select></div>` : `<input type="hidden" name="store_id" value="${esc(defaultStoreId)}">`;
  const form = can('can_manage_orders') ? `<div class="card"><h3>Tạo order hàng theo lần</h3><p class="hint">Nhập cùng một tên lần/tag để gom order nhiều ngày vào chung 1 lần. Ví dụ: <b>Lần 1 - Tuần 31</b>. Nếu ngày 1 nhập 1, ngày 2 nhập 1 cùng SKU và cùng lần, bảng sẽ cộng thành tổng 2 sản phẩm trong tag đó.</p><form id="orderForm"><div class="grid four">${storeSelect}<div class="field"><label>Lần / tag order</label><input class="input" name="batch_name" list="orderBatchList" placeholder="VD: Lần 1 - Tuần 31" required><datalist id="orderBatchList">${batchOptions}</datalist></div><div class="field"><label>Ngày order</label><input class="input" type="date" name="order_date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field" style="align-self:end"><button class="btn">Lưu vào lần</button></div></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>SKU</th><th>Tên SP</th><th>Số lượng</th><th>Ghi chú</th></tr></thead><tbody>${orderInputRows(8)}</tbody></table></div></form></div>` : '';
  const filters = `<div class="toolbar"><h3 style="margin-right:auto">Danh sách order hàng theo lần</h3>${allScope ? `<div class="field"><label>Lọc cửa hàng</label><select class="input" id="orderStoreFilter2">${storeOptions}</select></div>` : ''}${can('can_export') ? '<button class="btn secondary" data-export="orders">Tải CSV order tổng theo lần</button>' : ''}</div>`;
  const rows = groups.length ? groups.map(g => `<div class="order-batch-card">
    <div class="order-batch-head">
      <div><span class="order-batch-tag">${esc(g.batch_name)}</span><div class="hint">${esc(g.store_name || '')} • ${dateRangeText(g.first_date, g.last_date)} • ${g.rows.length} SKU/SP</div></div>
      <div class="order-batch-kpis"><span><b>${money(g.total_quantity)}</b><small>Tổng SL</small></span>${orderStatusBadge(g.status)}</div>
      ${can('can_manage_orders') ? `<div class="row order-batch-actions"><button class="btn small secondary orderStatusBtn" data-ids="${g.ids.join(',')}" data-status="done">Đã làm lần</button><button class="btn small secondary orderStatusBtn" data-ids="${g.ids.join(',')}" data-status="waiting">Chờ hàng nhập</button><button class="btn small secondary orderStatusBtn" data-ids="${g.ids.join(',')}" data-status="received">Đã nhập</button><button class="btn small secondary orderNoteBtn" data-ids="${g.ids.join(',')}" data-note="${esc(g.note || '')}">Ghi chú lần</button><button class="btn small danger orderDeleteBtn" data-ids="${g.ids.join(',')}">Xóa lần</button></div>` : ''}
    </div>
    <div class="table-wrap order-batch-table-wrap"><table class="order-batch-table"><thead><tr><th>SKU</th><th>Tên SP</th><th>Tổng SL trong lần</th><th>Ngày nhập</th><th>Trạng thái</th><th>Ghi chú</th><th>Người tạo</th><th>Thao tác</th></tr></thead><tbody>${g.rows.map(item => `<tr><td><b>${esc(item.sku || '')}</b></td><td>${esc(item.product_name || '')}</td><td><b>${money(item.quantity || 0)}</b></td><td>${dateRangeText(item.first_date, item.last_date)}</td><td>${orderStatusBadge(item.status)}</td><td>${esc(item.note || '')}</td><td>${esc(item.created_by_name || '')}</td><td>${can('can_manage_orders') ? `<div class="row"><button class="btn small secondary orderStatusBtn" data-ids="${item.ids.join(',')}" data-status="done">Đã làm</button><button class="btn small secondary orderStatusBtn" data-ids="${item.ids.join(',')}" data-status="waiting">Chờ hàng nhập</button><button class="btn small secondary orderStatusBtn" data-ids="${item.ids.join(',')}" data-status="received">Đã nhập</button><button class="btn small secondary orderNoteBtn" data-ids="${item.ids.join(',')}" data-note="${esc(item.note || '')}">Ghi chú</button><button class="btn small danger orderDeleteBtn" data-ids="${item.ids.join(',')}">Xóa</button></div>` : ''}</td></tr>`).join('')}</tbody></table></div>
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
  const allScope = state.user.role === 'admin' || (!state.user.store_id && (can('can_manage_product_feedback') || can('can_view_product_feedback')));
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
  const form = can('can_manage_product_feedback') ? `<div class="card"><h3>Nhập đánh giá sản phẩm hằng ngày</h3><p class="hint">Chọn tháng + BST/List do admin set, sau đó cửa hàng đánh giá sản phẩm trong danh sách đó.</p>${collections.length ? `<form id="productFeedbackForm" class="grid three">
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
  const collectionCards = collections.length ? `<div class="collection-grid">${collections.map(c => `<div class="collection-card ${Number(c.id) === Number(state.feedbackCollectionId) ? 'active' : ''}"><div class="collection-card-head"><div><span class="badge dark">${esc(c.collection_month || '')}</span><h4>${esc(c.name || '')}</h4><p class="hint">${esc(c.store_name || 'Toàn hệ thống')} • ${Number(c.items?.length || 0)} sản phẩm</p></div>${can('can_manage_product_collections') ? `<button class="btn small danger collectionDeleteBtn" data-id="${c.id}">Xóa</button>` : ''}</div><div class="collection-products">${(c.items || []).slice(0, 8).map(i => `<span>${esc(i.sku || '')}${i.sku ? ' - ' : ''}${esc(i.product_name || '')}</span>`).join('')}${(c.items || []).length > 8 ? `<span>+${(c.items || []).length - 8} SP khác</span>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">Chưa có BST/List sản phẩm theo tháng đang chọn</div>';
  const summaryRows = summaryData.length ? `<div class="table-wrap"><table><thead><tr><th>BST/List</th><th>SKU</th><th>Tên SP</th><th>Số lần đánh giá</th><th>Tái SP</th><th>Kiểu dáng</th><th>Chất liệu</th><th>Lỗi SP</th><th>Ý kiến khách</th><th>Cửa hàng</th></tr></thead><tbody>${summaryData.map(r => `<tr><td>${esc(r.collection_name || '')}</td><td><b>${esc(r.sku || '')}</b></td><td>${esc(r.product_name || '')}</td><td><span class="badge dark">${Number(r.count || 0)} lần</span></td><td><span class="badge ${r.recommend_label === 'Đề xuất tái' ? 'ok' : r.recommend_label === 'Không tái' ? 'danger' : 'warn'}">${esc(r.recommend_label || '')}</span><div class="hint">Tái: ${Number(r.restock_yes || 0)} • Không: ${Number(r.restock_no || 0)} • Theo dõi: ${Number(r.restock_watch || 0)}</div></td><td>${esc(r.style_notes || '')}</td><td>${esc(r.material_notes || '')}</td><td>${esc(r.error_notes || '')}</td><td>${esc(r.customer_notes || '')}</td><td>${esc(r.stores || '')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có dữ liệu tổng hợp theo sản phẩm</div>';
  const detailRows = rowsData.length ? `<div class="table-wrap"><table><thead><tr><th>Ngày</th><th>BST/List</th><th>Cửa hàng</th><th>SKU</th><th>Tên SP</th><th>Kiểu dáng</th><th>Chất liệu</th><th>Lỗi SP</th><th>Đánh giá khách</th><th>Tái SP</th><th>Ghi chú</th><th>Người nhập</th><th>Thao tác</th></tr></thead><tbody>${rowsData.map(r => `<tr><td>${dOnly(r.feedback_date)}</td><td>${esc(r.collection_name || '')}</td><td>${esc(r.store_name || '')}</td><td><b>${esc(r.sku || '')}</b></td><td>${esc(r.product_name || '')}</td><td>${esc(r.style_feedback || '')}</td><td>${esc(r.material_feedback || '')}</td><td>${esc(r.product_errors || '')}</td><td>${esc(r.customer_feedback || '')}</td><td><span class="badge ${r.restock_wish === 'Đề xuất tái' ? 'ok' : r.restock_wish === 'Không tái' ? 'danger' : 'warn'}">${esc(r.restock_wish || '')}</span></td><td>${esc(r.note || '')}</td><td>${esc(r.created_by_name || '')}</td><td>${can('can_manage_product_feedback') ? `<button class="btn small danger feedbackDeleteBtn" data-id="${r.id}">Xóa</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có đánh giá sản phẩm hằng ngày</div>';
  shell(`${collectionManager}${form}<div class="card" style="margin-top:16px"><div class="section-title"><h3>BST/List sản phẩm đang áp dụng</h3></div>${filter}${collectionCards}</div><div class="card" style="margin-top:16px"><h3>Tổng hợp đánh giá theo tên sản phẩm</h3><p class="hint">Dữ liệu hằng ngày của cửa hàng sẽ được gom lại theo SKU/Tên SP để PKD xem nhanh sản phẩm nào nên tái, không tái hoặc cần theo dõi thêm.</p>${summaryRows}</div><div class="card" style="margin-top:16px"><h3>Chi tiết đánh giá hằng ngày</h3>${detailRows}</div>`, 'Đánh giá sản phẩm', 'Cửa hàng đánh giá theo BST/List do admin set, hệ thống tự tổng hợp theo sản phẩm');
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
  const allScope = state.user.role === 'admin' || (!state.user.store_id && (can('can_manage_product_training') || can('can_view_product_training')));
  const defaultStoreId = allScope ? (state.trainingStoreId || '') : (state.user.store_id || '');
  state.trainingStoreId = defaultStoreId;
  const data = await api(`/api/product-trainings${defaultStoreId ? `?store_id=${defaultStoreId}` : ''}`);
  const rowsData = data.trainings || [];
  const storeOptions = `<option value="">Toàn hệ thống</option>${state.boot.stores.map(s => `<option value="${s.id}" ${Number(s.id) === Number(defaultStoreId) ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}`;
  const quizHelp = `Mỗi dòng 1 câu theo mẫu: Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | A. Ví dụ: Chất liệu chính là gì? | Cotton | Linen | Denim | Kate | A`;
  const form = can('can_manage_product_training') ? `<div class="card"><h3>Nhập đào tạo sản phẩm + bài kiểm tra</h3><p class="hint">Admin nhập thông tin sản phẩm, set yêu cầu học cho toàn hệ thống/cửa hàng, đặt hạn học và bài kiểm tra trắc nghiệm. Nhân viên đạt từ 90% trở lên mới tính là đạt.</p><form id="productTrainingForm" class="grid three">
    <div class="field"><label>Áp dụng cho</label><select class="input" name="store_id">${storeOptions}</select></div>
    <div class="field"><label>SKU</label><input class="input" name="sku" placeholder="SKU sản phẩm"></div>
    <div class="field"><label>Tên SP</label><input class="input" name="product_name" placeholder="Tên sản phẩm" required></div>
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
    <div class="field" style="grid-column:1/-1"><label>Bài kiểm tra trắc nghiệm</label><textarea class="input" name="quiz_text" rows="5" placeholder="${esc(quizHelp)}"></textarea><p class="hint">${esc(quizHelp)}</p></div>
    <div style="grid-column:1/-1"><button class="btn">Lưu bài đào tạo</button></div>
  </form></div>` : '';
  const filter = allScope ? `<div class="field"><label>Lọc phạm vi</label><select class="input" id="trainingStoreFilter">${storeOptions}</select></div>` : '';
  const quizBlock = (r) => {
    if (!state.trainingQuiz || Number(state.trainingQuiz.id) !== Number(r.id)) return '';
    const qz = state.trainingQuiz;
    if (!qz.questions || !qz.questions.length) return `<div class="quiz-box"><div class="empty">Bài này chưa có câu hỏi kiểm tra</div></div>`;
    const qs = qz.questions.map((q, idx) => `<div class="quiz-question"><b>Câu ${idx + 1}. ${esc(q.question)}</b>${(q.options || []).map((op, oi) => `<label class="quiz-option"><input type="radio" name="q_${idx}" value="${oi}" required> ${String.fromCharCode(65 + oi)}. ${esc(op)}</label>`).join('')}</div>`).join('');
    return `<form class="quiz-box" id="trainingQuizForm" data-id="${r.id}"><div class="toolbar"><h3 style="margin-right:auto">Bài kiểm tra</h3><span class="badge dark">Đạt từ ${Number(qz.training?.pass_percent || r.pass_percent || 90)}%</span></div>${qs}<button class="btn">Nộp bài</button></form>`;
  };
  const progressBadge = (r) => {
    const p = r.progress || {};
    if (p.passed) return `<span class="badge ok">Đã đạt ${Number(p.best_score || 0).toFixed(2)}%</span>`;
    if (p.attempts_count) return `<span class="badge danger">Chưa đạt • cao nhất ${Number(p.best_score || 0).toFixed(2)}%</span>`;
    return `<span class="badge warning">Chưa làm bài</span>`;
  };
  const assigneeTable = (r) => (can('can_manage_product_training') && Number(r.is_required || 0) === 1 && r.assignees && r.assignees.length)
    ? `<details class="training-progress"><summary>Tiến độ học (${r.assignees.filter(a => a.passed).length}/${r.assignees.length} đạt)</summary><div class="table-wrap"><table><thead><tr><th>Nhân viên</th><th>Cửa hàng</th><th>Điểm cao nhất</th><th>Trạng thái</th><th>Lần làm</th></tr></thead><tbody>${r.assignees.map(a => `<tr><td>${esc(a.full_name)}</td><td>${esc(a.store_name)}</td><td>${Number(a.best_score || 0).toFixed(2)}%</td><td>${a.passed ? '<span class="badge ok">Đạt</span>' : '<span class="badge danger">Chưa đạt</span>'}</td><td>${Number(a.attempts_count || 0)}</td></tr>`).join('')}</tbody></table></div></details>` : '';
  const rows = rowsData.length ? rowsData.map(r => {
    const dueBad = r.due_at && new Date(r.due_at) < new Date() && !(r.progress && r.progress.passed);
    return `<div class="training-card">
      <div class="training-head"><div><span class="badge dark">${esc(r.status_label || 'Sắp về')}</span>${Number(r.is_required || 0) ? `<span class="badge ${dueBad ? 'danger' : 'warning'}">Bắt buộc học</span>` : ''}<h3>${esc(r.product_name || '')}</h3><p class="hint">${esc(r.sku || '')} • ${esc(r.store_name || 'Toàn hệ thống')} • Hàng về: ${r.arrival_date ? dOnly(r.arrival_date) : 'Chưa có ngày'}${r.due_at ? ` • Hạn học: ${dt(r.due_at)}` : ''}</p></div>${can('can_manage_product_training') ? `<button class="btn small danger trainingDeleteBtn" data-id="${r.id}">Xóa</button>` : ''}</div>
      <div class="training-grid"><div><b>Chất liệu</b><p>${esc(r.material || '')}</p></div><div><b>Kiểu dáng / form</b><p>${esc(r.style_info || '')}</p></div><div><b>Điểm bán hàng</b><p>${esc(r.selling_points || '')}</p></div><div><b>Cách tư vấn / bảo quản</b><p>${esc(r.care_instruction || '')}</p></div><div><b>Lỗi cần lưu ý</b><p>${esc(r.common_errors || '')}</p></div><div><b>Ghi chú</b><p>${esc(r.training_note || '')}</p></div></div>
      <div class="toolbar training-actions"><span class="badge">${Number(r.quiz_question_count || 0)} câu hỏi</span>${state.user.role === 'employee' || state.user.role === 'manager' ? progressBadge(r) : ''}${Number(r.quiz_question_count || 0) ? `<button class="btn small startQuizBtn" data-id="${r.id}">${(r.progress && r.progress.passed) ? 'Làm lại' : 'Làm bài kiểm tra'}</button>` : ''}</div>
      ${quizBlock(r)}${assigneeTable(r)}
    </div>`;
  }).join('') : '<div class="empty">Chưa có bài đào tạo sản phẩm</div>';
  const exportBtns = can('can_export') ? '<button class="btn secondary" data-export="product_trainings">Tải CSV đào tạo SP</button><button class="btn secondary" data-export="product_training_attempts">Tải CSV kết quả kiểm tra</button>' : '';
  shell(`${form}<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Thư viện đào tạo sản phẩm</h3>${filter}${exportBtns}</div>${rows}</div>`, 'Đào tạo sản phẩm', 'Admin set bài học, thời hạn và bài kiểm tra; nhân viên đạt 90% mới tính hoàn thành');
  $('#trainingStoreFilter')?.addEventListener('change', e => { state.trainingStoreId = e.target.value; state.trainingQuiz = null; renderProductTraining(); });
  $('#productTrainingForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target));
    try {
      await api('/api/product-trainings', { method: 'POST', body: JSON.stringify(payload) });
      toast('Đã lưu bài đào tạo sản phẩm');
      e.target.reset();
      renderProductTraining();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $$('.startQuizBtn').forEach(btn => btn.addEventListener('click', async () => {
    try {
      const qz = await api(`/api/product-trainings/${btn.dataset.id}/quiz`);
      state.trainingQuiz = { id: Number(btn.dataset.id), ...qz };
      renderProductTraining();
    } catch (err) { toast(err.message, 'danger'); }
  }));
  $('#trainingQuizForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const answers = [];
    $$('.quiz-question', e.target).forEach((q, idx) => answers[idx] = Number($(`input[name="q_${idx}"]:checked`, q)?.value));
    try {
      const result = await api(`/api/product-trainings/${e.target.dataset.id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
      toast(result.passed ? `Đạt: ${result.score_percent}%` : `Chưa đạt: ${result.score_percent}% - làm lại`, result.passed ? 'ok' : 'danger');
      state.trainingQuiz = null;
      renderProductTraining();
    } catch (err) { toast(err.message, 'danger'); }
  });
  $$('.trainingDeleteBtn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Xóa bài đào tạo sản phẩm này?')) return;
    try { await api(`/api/product-trainings/${btn.dataset.id}`, { method: 'DELETE' }); toast('Đã xóa bài đào tạo'); renderProductTraining(); } catch (err) { toast(err.message, 'danger'); }
  }));
}

async function renderSchedule() {
  const month = state.scheduleMonth || currentMonthLocal();
  const weeks = scheduleMonthWeeks(month);
  const firstWeek = weeks[0]?.week_start || mondayOf(`${month}-01`);
  const storeId = state.user.role === 'admin' ? (state.scheduleStoreId || state.boot.stores[0]?.id || '') : state.user.store_id;
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
  const storeSelect = state.user.role === 'admin'
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
        <div class="field"><label>Áp dụng cho</label>${state.user.role === 'admin' ? `<select class="input" name="store_id">${storeOptions}</select>` : `<input type="hidden" name="store_id" value="${esc(state.user.store_id || '')}"><input class="input" value="${esc(state.user.store_name || '')}" disabled>`}</div>
        <div class="field"><label>Phiên bản / ngày hiệu lực</label><input class="input" name="version" placeholder="VD: V1 - 30/07/2026"></div>
        <div class="field"><label>File tài liệu</label><input class="input" name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp" required></div>
        <div class="field"><label>Ghi chú</label><input class="input" name="description" placeholder="Nội dung chính / lưu ý khi áp dụng"></div>
        <div style="grid-column:1/-1"><button class="btn">Tải tài liệu lên</button></div>
      </form>
    </div>` : '';
  const rows = docs.length ? `<div class="table-wrap"><table><thead><tr><th>Tài liệu</th><th>Nhóm</th><th>Phạm vi</th><th>Phiên bản</th><th>File</th><th>Lượt tải</th><th>Người tải lên</th><th>Ngày cập nhật</th><th>Thao tác</th></tr></thead><tbody>${docs.map(d => `<tr><td><b>${esc(d.title)}</b><br><span class="hint">${esc(d.description || '')}</span></td><td><span class="badge dark">${esc(d.category || 'Quy trình')}</span></td><td>${esc(d.store_name || 'Toàn hệ thống')}</td><td>${esc(d.version || '-')}</td><td>${esc(d.original_name || '')}<br><span class="hint">${fileSizeLabel(d.size)}</span></td><td>${money(d.download_count || 0)}</td><td>${esc(d.created_by_name || '')}</td><td>${dt(d.updated_at || d.created_at)}</td><td><div class="row"><button class="btn small docDownloadBtn" data-id="${d.id}" data-name="${esc(d.original_name || d.title || 'tai-lieu')}">Tải về</button>${can('can_manage_documents') ? `<button class="btn small danger docDeleteBtn" data-id="${d.id}" data-name="${esc(d.title)}">Xóa</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Chưa có tài liệu/quy trình nào</div>';
  shell(`${uploadForm}<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Thư viện tài liệu / quy trình</h3>${can('can_export') ? '<button class="btn secondary" data-export="documents">Tải CSV danh sách</button>' : ''}</div>${rows}</div>`, 'Tài liệu / Quy trình', 'Lưu quy trình, biểu mẫu, file đào tạo để cửa hàng tải về khi cần');
  $('#documentForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/api/documents', { method: 'POST', body: fd });
      toast('Đã tải tài liệu lên hệ thống');
      renderDocuments();
    } catch (err) { toast(err.message, 'danger'); }
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
  const bonusPeople = salesStaffInStore(state.user.role === 'admin' ? '' : state.user.store_id);
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
  const data = await api('/api/users');
  const permBoxes = Object.entries(PERM_LABELS).map(([key, label]) => `<label><input type="checkbox" name="${key}"> ${label}</label>`).join(' ');
  const form = `<div class="card"><h3>Cấp tài khoản / phân quyền</h3><form id="userForm" class="grid three"><div class="field"><label>Họ tên</label><input class="input" name="full_name" required></div><div class="field"><label>Tài khoản</label><input class="input" name="username" required></div><div class="field"><label>Mật khẩu</label><input class="input" name="password" value="123456" required></div><div class="field"><label>Vai trò</label><select name="role"><option value="employee">Nhân viên</option><option value="manager">Quản lý</option><option value="admin">Admin</option></select></div><div class="field"><label>Cửa hàng áp dụng (chọn nhiều)</label><select name="store_ids" multiple size="5">${renderStoreMultiOptions([])}</select><div class="hint">Giữ Ctrl hoặc chọn nhiều trên máy tính. Trên điện thoại có thể chọn lần lượt.</div></div><div class="field"><label>Quyền mở rộng</label><div class="hint perm-check-grid">${permBoxes}</div></div><div style="grid-column:1/-1"><button class="btn">Tạo tài khoản</button></div></form></div>`;
  const editUser = data.users.find(u => Number(u.id) === Number(state.adminEditUserId));
  const editBoxes = editUser ? Object.entries(PERM_LABELS).map(([key, label]) => `<label><input type="checkbox" name="${key}" ${Number(editUser.permissions?.[key]) === 1 ? 'checked' : ''}> ${label}</label>`).join(' ') : '';
  const editCard = editUser ? `<div class="card" style="margin-top:16px"><div class="toolbar"><h3 style="margin-right:auto">Sửa quyền / thông tin tài khoản</h3><button class="btn secondary" id="cancelEditUserBtn">Đóng</button></div><form id="editUserForm" class="grid three"><input type="hidden" name="id" value="${editUser.id}"><div class="field"><label>Họ tên</label><input class="input" name="full_name" value="${esc(editUser.full_name)}" required></div><div class="field"><label>Vai trò</label><select name="role"><option value="employee" ${editUser.role === 'employee' ? 'selected' : ''}>Nhân viên</option><option value="manager" ${editUser.role === 'manager' ? 'selected' : ''}>Quản lý</option><option value="admin" ${editUser.role === 'admin' ? 'selected' : ''}>Admin</option></select></div><div class="field"><label>Cửa hàng áp dụng (chọn nhiều)</label><select name="store_ids" multiple size="5">${renderStoreMultiOptions(editUser.store_ids || (editUser.store_id ? [editUser.store_id] : []))}</select><div class="hint">Có thể cấp cùng lúc nhiều cửa hàng, ví dụ Quận 1 và Quận 7.</div></div><div class="field"><label>Reset mật khẩu (không bắt buộc)</label><input class="input" name="password" placeholder="Để trống nếu không đổi"></div><div class="field" style="grid-column:span 2"><label>Quyền chi tiết</label><div class="hint perm-check-grid">${editBoxes}</div></div><div style="grid-column:1/-1" class="row"><button class="btn">Lưu quyền</button><button class="btn secondary" type="button" id="cancelEditUserBtn2">Hủy</button></div></form></div>` : '';
  const table = `<div class="table-wrap"><table><thead><tr><th>Họ tên</th><th>Tài khoản</th><th>Vai trò</th><th>Cửa hàng áp dụng</th><th>Trạng thái</th><th>Quyền</th><th>Thao tác</th></tr></thead><tbody>${data.users.map(u => { const hasView = Number(u.permissions.can_view_sales_target) === 1 && Number(u.permissions.can_view_store_sales_summary) === 1 && Number(u.permissions.can_view_bonuses) === 1; const hasTarget = Number(u.permissions.can_set_sales_targets) === 1; const action = Number(u.id) === Number(state.user.id) ? '<span class="hint">Tài khoản hiện tại</span>' : `<div class="row wrap"><button class="btn small secondary editUserBtn" data-id="${u.id}">Sửa quyền</button><button class="btn small secondary quickPermBtn" data-id="${u.id}" data-mode="${hasView ? 'revoke' : 'grant'}">${hasView ? 'Thu hồi xem %/thưởng' : 'Cấp xem %/thưởng'}</button><button class="btn small secondary quickTargetBtn" data-id="${u.id}" data-mode="${hasTarget ? 'revoke' : 'grant'}">${hasTarget ? 'Thu hồi set target' : 'Cấp set target'}</button><button class="btn small danger deleteUserBtn" data-id="${u.id}" data-name="${esc(u.full_name)}">Xóa</button></div>`; return `<tr><td><b>${esc(u.full_name)}</b></td><td>${esc(u.username)}</td><td>${roleLabel(u.role)}</td><td>${esc((u.store_names && u.store_names.length ? u.store_names.join(' • ') : (u.store_name || '')))}</td><td><span class="badge ok">Đang dùng</span></td><td>${Object.entries(PERM_LABELS).filter(([k]) => Number(u.permissions[k]) === 1).map(([,l]) => `<span class="badge">${esc(l)}</span>`).join(' ')}</td><td>${action}</td></tr>`; }).join('')}</tbody></table></div>`;
  const exports = `<div class="card" style="margin-top:16px"><h3>Tải dữ liệu</h3><div class="export-grid"><button class="btn secondary" data-export="tasks">Công việc</button><button class="btn secondary" data-export="violations">Vi phạm</button><button class="btn secondary" data-export="assessments">Checklist</button><button class="btn secondary" data-export="sales">Doanh thu cập nhật</button><button class="btn secondary" data-export="sales_targets">Target tháng</button><button class="btn secondary" data-export="sales_daily_targets">Target ngày</button><button class="btn secondary" data-export="bonuses">Tiền thưởng</button><button class="btn secondary" data-export="documents">Tài liệu</button><button class="btn secondary" data-export="orders">Order hàng</button><button class="btn secondary" data-export="online_orders">Đơn online</button><button class="btn secondary" data-export="product_feedback_summary">Tổng hợp đánh giá SP</button><button class="btn secondary" data-export="product_feedback">Chi tiết đánh giá SP</button><button class="btn secondary" data-export="product_collections">List BST/SKU</button><button class="btn secondary" data-export="product_trainings">Đào tạo SP</button><button class="btn secondary" data-export="product_training_attempts">Kết quả kiểm tra SP</button><button class="btn secondary" data-export="shifts">Ca làm</button><button class="btn secondary" data-export="work_schedules">Lịch làm việc</button><button class="btn secondary" data-export="performance">Tổng hợp điểm</button></div></div>`;
  shell(`${form}${editCard}<div class="card" style="margin-top:16px"><h3>Danh sách tài khoản</h3>${table}</div>${exports}`, 'Admin', 'Cấp quyền, phân quyền xem và tải dữ liệu');
  $('#userForm')?.addEventListener('submit', async e => { e.preventDefault(); const fd = new FormData(e.target); const permissions = {}; Object.keys(PERM_LABELS).forEach(k => permissions[k] = fd.get(k) ? 1 : 0); const payload = { full_name: fd.get('full_name'), username: fd.get('username'), password: fd.get('password'), role: fd.get('role'), store_ids: selectedValues(e.target.querySelector('[name="store_ids"]')), permissions }; try { await api('/api/users', { method: 'POST', body: JSON.stringify(payload) }); toast('Đã tạo tài khoản'); await loadBase(); renderAdmin(); } catch (err) { toast(err.message, 'danger'); } });
  $$('.editUserBtn').forEach(btn => btn.addEventListener('click', () => { state.adminEditUserId = Number(btn.dataset.id); renderAdmin(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  $('#cancelEditUserBtn')?.addEventListener('click', () => { state.adminEditUserId = null; renderAdmin(); });
  $('#cancelEditUserBtn2')?.addEventListener('click', () => { state.adminEditUserId = null; renderAdmin(); });
  $('#editUserForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const permissions = {};
    Object.keys(PERM_LABELS).forEach(k => permissions[k] = fd.get(k) ? 1 : 0);
    const payload = { full_name: fd.get('full_name'), role: fd.get('role'), store_ids: selectedValues(e.target.querySelector('[name="store_ids"]')), permissions };
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
    if (!confirm(`Xóa ${name}? Tài khoản này sẽ không đăng nhập được nữa, nhưng dữ liệu cũ vẫn được giữ để xem báo cáo.`)) return;
    try {
      await api(`/api/users/${btn.dataset.id}`, { method: 'DELETE' });
      toast('Đã xóa tài khoản');
      await loadBase();
      renderAdmin();
    } catch (err) { toast(err.message, 'danger'); }
  }));
}

start();
