/* ==========================================================
   RS CHATRABASH - Mess Monitoring & Rent Management
   Postpaid rent accounting PWA. All data stored in localStorage.
   ========================================================== */

const STORAGE_KEY = 'rs_chatrabash_v3';

/* ---------------------- Bengali helpers ---------------------- */
const BN_DIGIT_MAP = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' };
function toBnNum(n) { return String(n).split('').map(c => BN_DIGIT_MAP[c] || c).join(''); }
function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function formatMoney(n) {
  const val = Math.round(Number(n) || 0);
  return '৳' + Math.abs(val).toLocaleString('en-US');
}
function formatSignedMoney(n) {
  const val = Math.round(Number(n) || 0);
  return (val < 0 ? '-' : '') + '৳' + Math.abs(val).toLocaleString('en-US');
}

const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

function buildPeriods() {
  const periods = [];
  let year = 2026, month = 0; // Jan 2026
  for (let i = 0; i < 13; i++) {
    let rentMonth = month - 1, rentYear = year;
    if (rentMonth < 0) { rentMonth = 11; rentYear = year - 1; }
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    periods.push({
      key,
      collYear: year, collMonth: month,
      rentYear, rentMonth,
      collectionLabel: `${BN_MONTHS[month]} ${toBnNum(year)}`,
      rentLabel: `${BN_MONTHS[rentMonth]} ${toBnNum(rentYear)}`
    });
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return periods;
}
const PERIODS = buildPeriods();
function periodIndexByKey(key) { return PERIODS.findIndex(p => p.key === key); }

/* ---------------------- Initial member data ---------------------- */
const INITIAL_MEMBERS_RAW = [
  ['101','ইয়াহিয়া',1100], ['101','জিন্নুর',1100],
  ['102','আরিফ',1100], ['102','হেলাল',1100],
  ['103','মেহেদী হাসান',1100], ['103','মোরসালিন',1100],
  ['104','বখতিয়ার',1100], ['104','আবু বক্কর সিদ্দিক',1100],
  ['105','মুরাদ',1100], ['105','সোহান রানা',1100],
  ['106','সিয়াম',1100], ['106','হাস্নাত',1100],
  ['107','লাভলু',1100], ['107','মেহেদি',1100],
  ['108','নাাজিম',1100], ['108','মজিবুল',1100],
  ['109','সোহাগ',1100], ['109','রিয়াদ',1100],
  ['110','রাশেদ',0],
  ['111','সাগর',1260], ['111','মজনু',1260],
  ['112','সুজন',1160], ['112','জিহাদ',1160],
  ['113','শাহরিয়ার',1160], ['113','তাকাব্বির',1160],
  ['114','মুন্না',1160], ['114','মমিন',1160],
  ['115','সোহেল',1160], ['115','সজীব বাবু',1160],
  ['116','প্রান্ত',1160], ['116','লিমন',1160],
  ['117','আরিফ',1160], ['117','রিফাত',1160],
  ['118','জাহিদ',1230],
  ['119','আবু সাইদ',1230],
  ['120','অর্ণব',1230],
  ['121','রবিউল',1230],
];

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getDefaultData() {
  const members = INITIAL_MEMBERS_RAW.map((row, i) => ({
    id: 'm_' + (i + 1),
    name: row[1],
    room: row[0],
    rent: row[2],
    deposit: 0,
    mobile: '',
    address: '',
    upazila: '',
    district: '',
    joiningDate: '',
    leavingDate: '',
    status: 'active', // active | former
    wifiFee: 0
  }));
  return {
    version: 3,
    messInfo: {
      name: 'RS Chatrabash',
      location: 'Park Mor, Rangpur',
      address: '',
      monitor: '',
      mobile: ''
    },
    members,
    transactions: [],       // {id, memberId, period, date, amount, note, type:'payment'|'adjustment'}
    wifiTransactions: [],   // {id, memberId, date, amount, note}
    settings: {
      lastPeriodKey: PERIODS[0].key
    }
  };
}

/* ---------------------- Storage layer ---------------------- */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = getDefaultData();
      saveData(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.members)) throw new Error('bad shape');
    if (!Array.isArray(parsed.transactions)) parsed.transactions = [];
    if (!Array.isArray(parsed.wifiTransactions)) parsed.wifiTransactions = [];
    if (!parsed.messInfo) parsed.messInfo = getDefaultData().messInfo;
    if (!parsed.settings) parsed.settings = { lastPeriodKey: PERIODS[0].key };
    return parsed;
  } catch (e) {
    console.error('Load failed, starting fresh', e);
    const fresh = getDefaultData();
    saveData(fresh);
    return fresh;
  }
}
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------------------- Global state ---------------------- */
const state = {
  data: loadData(),
  view: 'dashboard',
  currentPeriodIndex: 0,
  memberFilter: 'active',
  memberSearch: '',
  modal: null // {type, ...}
};
(function initPeriodIndex() {
  const idx = periodIndexByKey(state.data.settings.lastPeriodKey);
  state.currentPeriodIndex = idx >= 0 ? idx : 0;
})();

function persist() {
  saveData(state.data);
}
function getMember(id) {
  return state.data.members.find(m => m.id === id);
}
function activeMembers() {
  return state.data.members.filter(m => m.status === 'active');
}

/* ---------------------- Accounting engine ---------------------- */
function sumRentTransactions(memberId, periodKey) {
  return state.data.transactions
    .filter(t => t.memberId === memberId && t.period === periodKey)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

// Returns array of 13 results (one per period, in order) for a member.
// Each: { period, rent, prevDue, prevAdvance, payment, due, advance, balance }
function computeAllPeriodsForMember(memberId) {
  const member = getMember(memberId);
  const results = [];
  let prevDue = 0, prevAdvance = 0;
  if (!member) return results;
  PERIODS.forEach((p) => {
    const payment = sumRentTransactions(memberId, p.key);
    const rent = Number(member.rent) || 0;
    const balance = rent + prevDue - prevAdvance - payment;
    let due = 0, advance = 0;
    if (balance > 0) due = balance;
    else if (balance < 0) advance = -balance;
    results.push({ period: p, rent, prevDue, prevAdvance, payment, due, advance, balance });
    prevDue = due;
    prevAdvance = advance;
  });
  return results;
}
function calculateMemberBalance(memberId, periodIndex) {
  const all = computeAllPeriodsForMember(memberId);
  return all[periodIndex] || null;
}
function calculatePreviousBalance(memberId, periodIndex) {
  if (periodIndex <= 0) return { prevDue: 0, prevAdvance: 0 };
  const all = computeAllPeriodsForMember(memberId);
  const prev = all[periodIndex - 1];
  return { prevDue: prev.due, prevAdvance: prev.advance };
}
function calculateTotalPayments(memberId) {
  return state.data.transactions
    .filter(t => t.memberId === memberId)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}
function calculateWifiBalance(memberId) {
  const member = getMember(memberId);
  const fee = member ? Number(member.wifiFee) || 0 : 0;
  const paid = state.data.wifiTransactions
    .filter(t => t.memberId === memberId)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const balance = fee - paid;
  return { fee, paid, due: balance > 0 ? balance : 0, advance: balance < 0 ? -balance : 0 };
}

function balanceTagHTML(due, advance) {
  if (due > 0) return `<span class="balance-tag due">বকেয়া ${formatMoney(due)}</span>`;
  if (advance > 0) return `<span class="balance-tag advance">অগ্রিম ${formatMoney(advance)}</span>`;
  return `<span class="balance-tag zero">হিসাব সমান</span>`;
}

/* ---------------------- Toast ---------------------- */
let toastTimer = null;
function showToast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------------- Router / render ---------------------- */
function setView(view) {
  state.view = view;
  state.modal = null;
  render();
}
function render() {
  const app = document.getElementById('view');
  switch (state.view) {
    case 'dashboard': app.innerHTML = renderDashboard(); wireDashboard(); break;
    case 'members': app.innerHTML = renderMembers(); wireMembers(); break;
    case 'rent': app.innerHTML = renderRent(); wireRent(); break;
    case 'wifi': app.innerHTML = renderWifi(); wireWifi(); break;
    case 'reports': app.innerHTML = renderReports(); wireReports(); break;
    case 'settings': app.innerHTML = renderSettings(); wireSettings(); break;
    default: app.innerHTML = renderDashboard(); wireDashboard();
  }
  renderTopbar();
  renderBottomNav();
  renderModal();
}

function renderTopbar() {
  const bar = document.getElementById('topbar');
  const p = PERIODS[state.currentPeriodIndex];
  bar.innerHTML = `
    <div>
      <h1>RS Chatrabash</h1>
      <div class="subtitle">মেস মনিটরিং ও ভাড়া ব্যবস্থাপনা</div>
    </div>
    <button class="period-chip" id="periodChipBtn" type="button">${p.collectionLabel} ▾</button>
  `;
  document.getElementById('periodChipBtn').addEventListener('click', openPeriodPicker);
}

function renderBottomNav() {
  const nav = document.getElementById('bottomNav');
  const items = [
    ['dashboard', '🏠', 'ড্যাশবোর্ড'],
    ['members', '👥', 'বর্ডার'],
    ['rent', '৳', 'ভাড়া'],
    ['wifi', '📶', 'WiFi'],
    ['reports', '📊', 'রিপোর্ট'],
    ['settings', '⚙️', 'সেটিংস'],
  ];
  nav.innerHTML = items.map(([key, icon, label]) => `
    <button class="nav-btn ${state.view === key ? 'active' : ''}" data-nav="${key}" type="button">
      <span class="icon">${icon}</span><span>${label}</span>
    </button>
  `).join('');
  nav.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.getAttribute('data-nav')));
  });
}

/* ==========================================================
   DASHBOARD
   ========================================================== */
function renderDashboard() {
  const p = PERIODS[state.currentPeriodIndex];
  const active = activeMembers();
  const occupiedRooms = new Set(active.map(m => m.room)).size;
  const monthlyTotalRent = active.reduce((s, m) => s + Number(m.rent || 0), 0);

  let currentCollection = 0, totalDue = 0, totalAdvance = 0;
  const dueList = [];
  active.forEach(m => {
    const bal = calculateMemberBalance(m.id, state.currentPeriodIndex);
    currentCollection += bal.payment;
    totalDue += bal.due;
    totalAdvance += bal.advance;
    if (bal.due > 0) dueList.push({ member: m, due: bal.due });
  });
  dueList.sort((a, b) => b.due - a.due);

  const totalDeposits = state.data.members.reduce((s, m) => s + Number(m.deposit || 0), 0);
  const totalWifiCollection = state.data.wifiTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);

  return `
    <div class="card" style="background:var(--primary);color:#fff;">
      <div style="font-size:0.78rem;opacity:0.85;">ভাড়া তোলা</div>
      <div style="font-size:1.2rem;font-weight:700;">${p.collectionLabel}</div>
      <div style="font-size:0.78rem;opacity:0.85;margin-top:8px;">ভাড়া মাস</div>
      <div style="font-size:1rem;font-weight:600;">${p.rentLabel}</div>
    </div>

    <div class="grid-stats">
      <div class="stat"><div class="label">সক্রিয় বর্ডার</div><div class="value">${toBnNum(active.length)}</div></div>
      <div class="stat"><div class="label">দখলকৃত রুম</div><div class="value">${toBnNum(occupiedRooms)}</div></div>
      <div class="stat"><div class="label">মাসিক মোট ভাড়া</div><div class="value">${formatMoney(monthlyTotalRent)}</div></div>
      <div class="stat"><div class="label">বর্তমান আদায়</div><div class="value">${formatMoney(currentCollection)}</div></div>
      <div class="stat due"><div class="label">মোট বকেয়া</div><div class="value">${formatMoney(totalDue)}</div></div>
      <div class="stat advance"><div class="label">মোট অগ্রিম</div><div class="value">${formatMoney(totalAdvance)}</div></div>
      <div class="stat"><div class="label">মোট জামানত</div><div class="value">${formatMoney(totalDeposits)}</div></div>
      <div class="stat"><div class="label">মোট WiFi আদায়</div><div class="value">${formatMoney(totalWifiCollection)}</div></div>
    </div>

    <div class="quick-actions">
      <button data-qa="add-member" type="button">+ বর্ডার যোগ</button>
      <button data-qa="payment" type="button">পেমেন্ট দিন</button>
      <button data-qa="wifi" type="button">WiFi</button>
      <button data-qa="reports" type="button">রিপোর্ট</button>
    </div>

    <div class="card">
      <h3>বকেয়া বর্ডারগণ</h3>
      ${dueList.length === 0 ? '<div class="empty-state">কোনো বকেয়া নেই 🎉</div>' :
        dueList.slice(0, 15).map(({ member, due }) => `
          <div class="member-row" data-open-member="${member.id}">
            <div>
              <div class="member-name">${escapeHTML(member.name)}</div>
              <div class="member-meta">রুম ${toBnNum(member.room)}</div>
            </div>
            <span class="balance-tag due">${formatMoney(due)}</span>
          </div>
        `).join('')
      }
    </div>
  `;
}
function wireDashboard() {
  document.querySelectorAll('[data-qa]').forEach(btn => {
    btn.addEventListener('click', () => {
      const qa = btn.getAttribute('data-qa');
      if (qa === 'add-member') { setView('members'); openAddMemberModal(); }
      else if (qa === 'payment') setView('rent');
      else if (qa === 'wifi') setView('wifi');
      else if (qa === 'reports') setView('reports');
    });
  });
  document.querySelectorAll('[data-open-member]').forEach(row => {
    row.addEventListener('click', () => openMemberProfile(row.getAttribute('data-open-member')));
  });
}

/* ==========================================================
   MEMBERS VIEW
   ========================================================== */
function filteredMembers() {
  let list = state.data.members.slice();
  if (state.memberFilter === 'active') list = list.filter(m => m.status === 'active');
  else if (state.memberFilter === 'former') list = list.filter(m => m.status === 'former');
  const q = state.memberSearch.trim().toLowerCase();
  if (q) {
    list = list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      String(m.room).toLowerCase().includes(q) ||
      String(m.mobile || '').toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => String(a.room).localeCompare(String(b.room), 'bn'));
  return list;
}
function renderMembers() {
  const list = filteredMembers();
  return `
    <div class="btn-row" style="margin-bottom:10px;">
      <button class="btn btn-primary" id="btnAddMember" type="button">+ বর্ডার যোগ</button>
    </div>
    <div class="search-box">
      <input type="text" id="memberSearch" placeholder="নাম, রুম বা মোবাইল দিয়ে খুঁজুন" value="${escapeHTML(state.memberSearch)}">
    </div>
    <div class="filter-tabs">
      <button data-filter="active" class="${state.memberFilter === 'active' ? 'active' : ''}" type="button">সক্রিয়</button>
      <button data-filter="former" class="${state.memberFilter === 'former' ? 'active' : ''}" type="button">সাবেক</button>
      <button data-filter="all" class="${state.memberFilter === 'all' ? 'active' : ''}" type="button">সবাই</button>
    </div>
    <div class="card">
      ${list.length === 0 ? '<div class="empty-state">কোনো বর্ডার পাওয়া যায়নি</div>' :
        list.map(m => {
          const bal = calculateMemberBalance(m.id, state.currentPeriodIndex);
          return `
          <div class="member-row" data-open-member="${m.id}">
            <div>
              <div class="member-name">${escapeHTML(m.name)}
                <span class="pill ${m.status === 'active' ? 'active' : 'former'}">${m.status === 'active' ? 'সক্রিয়' : 'সাবেক'}</span>
              </div>
              <div class="member-meta">রুম ${toBnNum(m.room)} · ভাড়া ${formatMoney(m.rent)}</div>
            </div>
            ${balanceTagHTML(bal.due, bal.advance)}
          </div>`;
        }).join('')
      }
    </div>
  `;
}
function wireMembers() {
  document.getElementById('btnAddMember').addEventListener('click', openAddMemberModal);
  const search = document.getElementById('memberSearch');
  search.addEventListener('input', () => {
    state.memberSearch = search.value;
    const app = document.getElementById('view');
    app.innerHTML = renderMembers();
    wireMembers();
    document.getElementById('memberSearch').focus();
    document.getElementById('memberSearch').selectionStart = document.getElementById('memberSearch').value.length;
  });
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => { state.memberFilter = btn.getAttribute('data-filter'); render(); });
  });
  document.querySelectorAll('[data-open-member]').forEach(row => {
    row.addEventListener('click', () => openMemberProfile(row.getAttribute('data-open-member')));
  });
}

/* ==========================================================
   RENT / PAYMENT VIEW
   ========================================================== */
function renderRent() {
  const p = PERIODS[state.currentPeriodIndex];
  const list = filteredMembers().filter(m => m.status === 'active');
  return `
    <div class="notice info">
      <strong>ভাড়া তোলা: ${p.collectionLabel}</strong><br>
      ${p.rentLabel} মাসের ভাড়া
    </div>
    <div class="search-box">
      <input type="text" id="rentSearch" placeholder="নাম বা রুম দিয়ে খুঁজুন" value="${escapeHTML(state.memberSearch)}">
    </div>
    <div class="card">
      ${list.length === 0 ? '<div class="empty-state">কোনো সক্রিয় বর্ডার নেই</div>' :
        list.map(m => {
          const bal = calculateMemberBalance(m.id, state.currentPeriodIndex);
          return `
          <div class="member-row">
            <div style="flex:1;">
              <div class="member-name">${escapeHTML(m.name)}</div>
              <div class="member-meta">
                রুম ${toBnNum(m.room)} · ভাড়া ${formatMoney(bal.rent)}<br>
                পূর্ববর্তী: ${bal.prevDue > 0 ? 'বকেয়া ' + formatMoney(bal.prevDue) : (bal.prevAdvance > 0 ? 'অগ্রিম ' + formatMoney(bal.prevAdvance) : 'সমান')}
                &nbsp;·&nbsp; জমা: ${formatMoney(bal.payment)}
              </div>
              <div style="margin-top:6px;">${balanceTagHTML(bal.due, bal.advance)}</div>
            </div>
            <button class="btn btn-primary btn-sm" data-pay="${m.id}" type="button">পেমেন্ট যোগ/সম্পাদনা</button>
          </div>`;
        }).join('')
      }
    </div>
  `;
}
function wireRent() {
  const search = document.getElementById('rentSearch');
  search.addEventListener('input', () => {
    state.memberSearch = search.value;
    const app = document.getElementById('view');
    app.innerHTML = renderRent();
    wireRent();
    const s = document.getElementById('rentSearch');
    s.focus(); s.selectionStart = s.value.length;
  });
  document.querySelectorAll('[data-pay]').forEach(btn => {
    btn.addEventListener('click', () => openPaymentModal(btn.getAttribute('data-pay')));
  });
}

/* ==========================================================
   WIFI VIEW
   ========================================================== */
function renderWifi() {
  const list = filteredMembers().filter(m => m.status === 'active');
  return `
    <div class="search-box">
      <input type="text" id="wifiSearch" placeholder="নাম বা রুম দিয়ে খুঁজুন" value="${escapeHTML(state.memberSearch)}">
    </div>
    <div class="card">
      ${list.length === 0 ? '<div class="empty-state">কোনো সক্রিয় বর্ডার নেই</div>' :
        list.map(m => {
          const w = calculateWifiBalance(m.id);
          return `
          <div class="member-row">
            <div style="flex:1;">
              <div class="member-name">${escapeHTML(m.name)}</div>
              <div class="member-meta">রুম ${toBnNum(m.room)} · ফি ${formatMoney(w.fee)} · জমা ${formatMoney(w.paid)}</div>
              <div style="margin-top:6px;">${balanceTagHTML(w.due, w.advance)}</div>
            </div>
            <button class="btn btn-outline btn-sm" data-wifi="${m.id}" type="button">WiFi পরিচালনা</button>
          </div>`;
        }).join('')
      }
    </div>
  `;
}
function wireWifi() {
  const search = document.getElementById('wifiSearch');
  search.addEventListener('input', () => {
    state.memberSearch = search.value;
    const app = document.getElementById('view');
    app.innerHTML = renderWifi();
    wireWifi();
    const s = document.getElementById('wifiSearch');
    s.focus(); s.selectionStart = s.value.length;
  });
  document.querySelectorAll('[data-wifi]').forEach(btn => {
    btn.addEventListener('click', () => openWifiModal(btn.getAttribute('data-wifi')));
  });
}

/* ==========================================================
   REPORTS VIEW
   ========================================================== */
function renderReports() {
  const p = PERIODS[state.currentPeriodIndex];
  const active = activeMembers();

  // Monthly report across all periods
  const monthlyRows = PERIODS.map(period => {
    let totalRent = 0, totalPayment = 0, totalDue = 0, totalAdvance = 0;
    active.forEach(m => {
      const idx = periodIndexByKey(period.key);
      const bal = calculateMemberBalance(m.id, idx);
      totalRent += bal.rent; totalPayment += bal.payment; totalDue += bal.due; totalAdvance += bal.advance;
    });
    return { period, totalRent, totalPayment, totalDue, totalAdvance };
  });

  const depositTotal = state.data.members.reduce((s, m) => s + Number(m.deposit || 0), 0);
  const wifiTotal = state.data.wifiTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);

  return `
    <div class="notice info">প্রতিবেদনের সময়কাল: <strong>${p.collectionLabel}</strong> (${p.rentLabel} মাসের ভাড়া)</div>

    <div class="btn-row" style="margin-bottom:14px;">
      <button class="btn btn-primary" id="btnExportCsv" type="button">CSV রিপোর্ট এক্সপোর্ট</button>
    </div>

    <div class="card">
      <h3>বর্তমান বকেয়া ও অগ্রিম</h3>
      <div class="table-scroll"><table>
        <thead><tr><th>নাম</th><th>রুম</th><th>বকেয়া</th><th>অগ্রিম</th></tr></thead>
        <tbody>
          ${active.map(m => {
            const bal = calculateMemberBalance(m.id, state.currentPeriodIndex);
            if (bal.due === 0 && bal.advance === 0) return '';
            return `<tr><td>${escapeHTML(m.name)}</td><td>${toBnNum(m.room)}</td><td>${bal.due ? formatMoney(bal.due) : '-'}</td><td>${bal.advance ? formatMoney(bal.advance) : '-'}</td></tr>`;
          }).join('') || '<tr><td colspan="4">কোনো তথ্য নেই</td></tr>'}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <h3>মাসিক ভাড়া আদায় প্রতিবেদন</h3>
      <div class="table-scroll"><table>
        <thead><tr><th>তোলার মাস</th><th>ভাড়া মাস</th><th>মোট ভাড়া</th><th>মোট আদায়</th><th>মোট বকেয়া</th><th>মোট অগ্রিম</th></tr></thead>
        <tbody>
          ${monthlyRows.map(r => `<tr><td>${r.period.collectionLabel}</td><td>${r.period.rentLabel}</td><td>${formatMoney(r.totalRent)}</td><td>${formatMoney(r.totalPayment)}</td><td>${formatMoney(r.totalDue)}</td><td>${formatMoney(r.totalAdvance)}</td></tr>`).join('')}
        </tbody>
      </table></div>
    </div>

    <div class="card">
      <h3>বর্ডার-ভিত্তিক পেমেন্ট হিস্ট্রি</h3>
      ${active.map(m => {
        const txns = state.data.transactions.filter(t => t.memberId === m.id).sort((a, b) => (a.date < b.date ? 1 : -1));
        if (txns.length === 0) return '';
        return `<div style="margin-bottom:10px;">
          <div class="member-name">${escapeHTML(m.name)} <span class="member-meta">(মোট: ${formatMoney(calculateTotalPayments(m.id))})</span></div>
          <div class="member-meta">${txns.slice(0,5).map(t => `${t.date}: ${formatSignedMoney(t.amount)}`).join(' · ')}</div>
        </div>`;
      }).join('') || '<div class="empty-state">কোনো পেমেন্ট নেই</div>'}
    </div>

    <div class="card">
      <h3>জামানত প্রতিবেদন</h3>
      <div class="table-scroll"><table>
        <thead><tr><th>নাম</th><th>রুম</th><th>জামানত</th></tr></thead>
        <tbody>
          ${state.data.members.map(m => `<tr><td>${escapeHTML(m.name)}</td><td>${toBnNum(m.room)}</td><td>${formatMoney(m.deposit)}</td></tr>`).join('')}
        </tbody>
      </table></div>
      <div class="member-meta" style="margin-top:8px;">মোট জামানত: <strong>${formatMoney(depositTotal)}</strong></div>
    </div>

    <div class="card">
      <h3>WiFi প্রতিবেদন</h3>
      <div class="table-scroll"><table>
        <thead><tr><th>নাম</th><th>ফি</th><th>জমা</th><th>বকেয়া/অগ্রিম</th></tr></thead>
        <tbody>
          ${activeMembers().map(m => {
            const w = calculateWifiBalance(m.id);
            return `<tr><td>${escapeHTML(m.name)}</td><td>${formatMoney(w.fee)}</td><td>${formatMoney(w.paid)}</td><td>${w.due ? 'বকেয়া ' + formatMoney(w.due) : (w.advance ? 'অগ্রিম ' + formatMoney(w.advance) : 'সমান')}</td></tr>`;
          }).join('')}
        </tbody>
      </table></div>
      <div class="member-meta" style="margin-top:8px;">মোট WiFi আদায়: <strong>${formatMoney(wifiTotal)}</strong></div>
    </div>
  `;
}
function wireReports() {
  document.getElementById('btnExportCsv').addEventListener('click', exportCsv);
}

function exportCsv() {
  const p = PERIODS[state.currentPeriodIndex];
  const headers = ['নাম','রুম','তোলার মাস','ভাড়া মাস','মাসিক ভাড়া','পূর্ববর্তী বকেয়া','পূর্ববর্তী অগ্রিম','জমা','বর্তমান বকেয়া','বর্তমান অগ্রিম','জামানত','WiFi ফি','WiFi জমা','WiFi বকেয়া'];
  const rows = [headers];
  state.data.members.forEach(m => {
    const bal = calculateMemberBalance(m.id, state.currentPeriodIndex);
    const w = calculateWifiBalance(m.id);
    rows.push([
      m.name, m.room, p.collectionLabel, p.rentLabel,
      bal.rent, bal.prevDue, bal.prevAdvance, bal.payment, bal.due, bal.advance,
      m.deposit, w.fee, w.paid, w.due
    ]);
  });
  const csvContent = rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rs-chatrabash-report-${p.key}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV রিপোর্ট ডাউনলোড হয়েছে');
}

/* ==========================================================
   SETTINGS VIEW
   ========================================================== */
function renderSettings() {
  const info = state.data.messInfo;
  return `
    <div class="card">
      <h3>মেস তথ্য</h3>
      <label>মেসের নাম</label>
      <input type="text" id="setName" value="${escapeHTML(info.name)}">
      <label>অবস্থান</label>
      <input type="text" id="setLocation" value="${escapeHTML(info.location)}">
      <label>ঠিকানা</label>
      <input type="text" id="setAddress" value="${escapeHTML(info.address)}">
      <label>মনিটরের নাম</label>
      <input type="text" id="setMonitor" value="${escapeHTML(info.monitor)}">
      <label>মোবাইল</label>
      <input type="text" id="setMobile" value="${escapeHTML(info.mobile)}">
      <div class="btn-row" style="margin-top:14px;">
        <button class="btn btn-primary" id="btnSaveSettings" type="button">সংরক্ষণ</button>
      </div>
    </div>

    <div class="card">
      <h3>ব্যাকআপ ও পুনরুদ্ধার</h3>
      <div class="btn-row">
        <button class="btn btn-outline" id="btnBackup" type="button">ব্যাকআপ ডাউনলোড</button>
        <label class="btn btn-outline" style="margin:0;cursor:pointer;">
          ব্যাকআপ পুনরুদ্ধার
          <input type="file" id="restoreFile" accept="application/json" style="display:none;">
        </label>
      </div>
    </div>

    <div class="card">
      <h3>PWA ইনস্টল নির্দেশনা</h3>
      <p class="member-meta">
        Chrome ব্রাউজারে এই অ্যাপ খুলুন, তারপর মেনু (⋮) থেকে "Add to Home screen" / "Install app" নির্বাচন করুন।
        একবার ইনস্টল করলে অ্যাপটি অফলাইনেও কাজ করবে।
      </p>
    </div>

    <div class="card">
      <h3 style="color:var(--danger);">বিপজ্জনক এলাকা</h3>
      <button class="btn btn-danger btn-block" id="btnWipe" type="button">সব ডাটা মুছুন</button>
    </div>
  `;
}
function wireSettings() {
  document.getElementById('btnSaveSettings').addEventListener('click', () => {
    state.data.messInfo = {
      name: document.getElementById('setName').value.trim(),
      location: document.getElementById('setLocation').value.trim(),
      address: document.getElementById('setAddress').value.trim(),
      monitor: document.getElementById('setMonitor').value.trim(),
      mobile: document.getElementById('setMobile').value.trim(),
    };
    persist();
    showToast('তথ্য সংরক্ষণ হয়েছে');
  });
  document.getElementById('btnBackup').addEventListener('click', downloadBackup);
  document.getElementById('restoreFile').addEventListener('change', handleRestoreFile);
  document.getElementById('btnWipe').addEventListener('click', () => {
    if (confirm('আপনি কি নিশ্চিত? সব ডাটা স্থায়ীভাবে মুছে যাবে এবং পুনরুদ্ধার করা যাবে না।')) {
      if (confirm('চূড়ান্ত নিশ্চিতকরণ: সত্যিই সব ডাটা মুছে ফেলতে চান?')) {
        localStorage.removeItem(STORAGE_KEY);
        state.data = getDefaultData();
        saveData(state.data);
        state.currentPeriodIndex = 0;
        showToast('সব ডাটা মুছে ফেলা হয়েছে');
        setView('dashboard');
      }
    }
  });
}
function downloadBackup() {
  const payload = { app: 'rs_chatrabash', version: 3, exportedAt: new Date().toISOString(), data: state.data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rs-chatrabash-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('ব্যাকআপ ডাউনলোড হয়েছে');
}
function handleRestoreFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = parsed && parsed.data ? parsed.data : parsed;
      if (!incoming || !Array.isArray(incoming.members) || !incoming.messInfo) {
        throw new Error('invalid');
      }
      if (!Array.isArray(incoming.transactions)) incoming.transactions = [];
      if (!Array.isArray(incoming.wifiTransactions)) incoming.wifiTransactions = [];
      if (!incoming.settings) incoming.settings = { lastPeriodKey: PERIODS[0].key };
      state.data = incoming;
      saveData(state.data);
      showToast('ব্যাকআপ সফলভাবে পুনরুদ্ধার হয়েছে।');
      setView('dashboard');
    } catch (err) {
      alert('ভুল ব্যাকআপ ফাইল।');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

/* ==========================================================
   MODALS
   ========================================================== */
function renderModal() {
  const root = document.getElementById('modalRoot');
  if (!state.modal) { root.innerHTML = ''; return; }
  const m = state.modal;
  let inner = '';
  if (m.type === 'period-picker') inner = modalPeriodPicker();
  else if (m.type === 'member-profile') inner = modalMemberProfile(m.memberId);
  else if (m.type === 'member-form') inner = modalMemberForm(m.memberId || null);
  else if (m.type === 'payment') inner = modalPayment(m.memberId);
  else if (m.type === 'wifi') inner = modalWifi(m.memberId);
  else if (m.type === 'leave') inner = modalLeave(m.memberId);

  root.innerHTML = `<div class="modal-backdrop" id="modalBackdrop"><div class="modal">${inner}</div></div>`;
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
  wireModal(m);
}
function closeModal() { state.modal = null; renderModal(); }
function openModal(modalObj) { state.modal = modalObj; renderModal(); }

/* -- Period picker -- */
function openPeriodPicker() { openModal({ type: 'period-picker' }); }
function modalPeriodPicker() {
  return `
    <div class="modal-header"><h3>সময়কাল নির্বাচন করুন</h3><button class="close-btn" id="modalClose" type="button">✕</button></div>
    <div>
      ${PERIODS.map((p, idx) => `
        <div class="member-row" data-period-idx="${idx}" style="cursor:pointer;">
          <div>
            <div class="member-name">${p.collectionLabel} তোলা</div>
            <div class="member-meta">${p.rentLabel} মাসের ভাড়া</div>
          </div>
          ${idx === state.currentPeriodIndex ? '<span class="balance-tag advance">নির্বাচিত</span>' : ''}
        </div>
      `).join('')}
    </div>
  `;
}

/* -- Member profile -- */
function openMemberProfile(memberId) { openModal({ type: 'member-profile', memberId }); }
function modalMemberProfile(memberId) {
  const m = getMember(memberId);
  if (!m) return '<div class="empty-state">বর্ডার পাওয়া যায়নি</div>';
  const bal = calculateMemberBalance(memberId, state.currentPeriodIndex);
  const w = calculateWifiBalance(memberId);
  const txns = state.data.transactions.filter(t => t.memberId === memberId).sort((a, b) => (a.date < b.date ? 1 : -1));
  return `
    <div class="modal-header">
      <h3>${escapeHTML(m.name)}</h3>
      <button class="close-btn" id="modalClose" type="button">✕</button>
    </div>
    <div class="member-meta">
      রুম ${toBnNum(m.room)}
      <span class="pill ${m.status === 'active' ? 'active' : 'former'}">${m.status === 'active' ? 'সক্রিয়' : 'সাবেক সদস্য'}</span>
    </div>
    <div class="summary-grid">
      <div><span>মাসিক ভাড়া</span>${formatMoney(m.rent)}</div>
      <div><span>বর্তমান অবস্থা</span>${bal.due > 0 ? 'বকেয়া ' + formatMoney(bal.due) : (bal.advance > 0 ? 'অগ্রিম ' + formatMoney(bal.advance) : 'হিসাব সমান')}</div>
      <div><span>জামানত</span>${formatMoney(m.deposit)}</div>
      <div><span>WiFi বকেয়া</span>${w.due ? formatMoney(w.due) : (w.advance ? 'অগ্রিম ' + formatMoney(w.advance) : formatMoney(0))}</div>
      <div><span>মোট পেমেন্ট</span>${formatMoney(calculateTotalPayments(memberId))}</div>
      <div><span>মোবাইল</span>${escapeHTML(m.mobile) || '-'}</div>
    </div>
    <div class="member-meta">
      ঠিকানা: ${escapeHTML(m.address) || '-'} ${m.upazila ? ', ' + escapeHTML(m.upazila) : ''} ${m.district ? ', ' + escapeHTML(m.district) : ''}<br>
      যোগদান: ${escapeHTML(m.joiningDate) || '-'} ${m.leavingDate ? '· ত্যাগ: ' + escapeHTML(m.leavingDate) : ''}
    </div>

    <div class="btn-row" style="margin:12px 0;">
      <button class="btn btn-outline btn-sm" id="btnEditMember" type="button">এডিট</button>
      <button class="btn btn-outline btn-sm" id="btnPayFromProfile" type="button">পেমেন্ট</button>
      <button class="btn btn-outline btn-sm" id="btnWifiFromProfile" type="button">WiFi</button>
      ${m.status === 'active' ? '<button class="btn btn-danger btn-sm" id="btnLeaveMember" type="button">সদস্য ত্যাগ</button>' : ''}
    </div>

    <div class="section-title">সম্পূর্ণ পেমেন্ট হিস্ট্রি</div>
    ${txns.length === 0 ? '<div class="empty-state">কোনো পেমেন্ট নেই</div>' :
      txns.map(t => `
        <div class="txn-item">
          <div>${t.date} ${t.note ? '· ' + escapeHTML(t.note) : ''} ${t.amount < 0 ? '<span class="pill due">সমন্বয়</span>' : ''}</div>
          <div class="txn-amount ${t.amount < 0 ? 'negative' : 'positive'}">${formatSignedMoney(t.amount)}</div>
        </div>
      `).join('')
    }
  `;
}

/* -- Add / Edit member -- */
function openAddMemberModal() { openModal({ type: 'member-form', memberId: null }); }
function openEditMemberModal(memberId) { openModal({ type: 'member-form', memberId }); }
function modalMemberForm(memberId) {
  const m = memberId ? getMember(memberId) : null;
  const isEdit = !!m;
  return `
    <div class="modal-header">
      <h3>${isEdit ? 'বর্ডার এডিট করুন' : 'নতুন বর্ডার যোগ করুন'}</h3>
      <button class="close-btn" id="modalClose" type="button">✕</button>
    </div>
    <label>নাম *</label>
    <input type="text" id="fName" value="${escapeHTML(m?.name || '')}">
    <div class="field-row">
      <div><label>রুম *</label><input type="text" id="fRoom" value="${escapeHTML(m?.room || '')}"></div>
      <div><label>মাসিক ভাড়া *</label><input type="number" id="fRent" value="${m?.rent ?? ''}"></div>
    </div>
    <div class="field-row">
      <div><label>জামানত</label><input type="number" id="fDeposit" value="${m?.deposit ?? 0}"></div>
      <div><label>মোবাইল</label><input type="text" id="fMobile" value="${escapeHTML(m?.mobile || '')}"></div>
    </div>
    <label>ঠিকানা</label>
    <input type="text" id="fAddress" value="${escapeHTML(m?.address || '')}">
    <div class="field-row">
      <div><label>উপজেলা</label><input type="text" id="fUpazila" value="${escapeHTML(m?.upazila || '')}"></div>
      <div><label>জেলা</label><input type="text" id="fDistrict" value="${escapeHTML(m?.district || '')}"></div>
    </div>
    <label>যোগদানের তারিখ</label>
    <input type="date" id="fJoining" value="${m?.joiningDate || ''}">
    <div class="btn-row" style="margin-top:16px;">
      <button class="btn btn-primary btn-block" id="btnSaveMember" type="button">সংরক্ষণ</button>
    </div>
  `;
}

/* -- Payment modal -- */
function openPaymentModal(memberId) { openModal({ type: 'payment', memberId }); }
function modalPayment(memberId) {
  const m = getMember(memberId);
  const p = PERIODS[state.currentPeriodIndex];
  const bal = calculateMemberBalance(memberId, state.currentPeriodIndex);
  const txns = state.data.transactions
    .filter(t => t.memberId === memberId && t.period === p.key)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return `
    <div class="modal-header">
      <h3>${escapeHTML(m.name)} — পেমেন্ট</h3>
      <button class="close-btn" id="modalClose" type="button">✕</button>
    </div>
    <div class="member-meta">রুম ${toBnNum(m.room)} · তোলা: ${p.collectionLabel} · ভাড়া মাস: ${p.rentLabel}</div>
    <div class="summary-grid">
      <div><span>মাসিক ভাড়া</span>${formatMoney(bal.rent)}</div>
      <div><span>পূর্ববর্তী বকেয়া</span>${formatMoney(bal.prevDue)}</div>
      <div><span>পূর্ববর্তী অগ্রিম</span>${formatMoney(bal.prevAdvance)}</div>
      <div><span>মোট জমা (এই মাসে)</span>${formatMoney(bal.payment)}</div>
      <div><span>বর্তমান বকেয়া</span>${formatMoney(bal.due)}</div>
      <div><span>বর্তমান অগ্রিম</span>${formatMoney(bal.advance)}</div>
    </div>

    <div class="section-title">এই মাসের লেনদেন</div>
    <div id="txnList">
      ${txns.length === 0 ? '<div class="empty-state">এখনো কোনো পেমেন্ট যোগ করা হয়নি</div>' :
        txns.map(t => `
          <div class="txn-item">
            <div>${t.date} ${t.note ? '· ' + escapeHTML(t.note) : ''} ${t.amount < 0 ? '<span class="pill due">সমন্বয়</span>' : ''}</div>
            <div style="display:flex;align-items:center;">
              <span class="txn-amount ${t.amount < 0 ? 'negative' : 'positive'}">${formatSignedMoney(t.amount)}</span>
              <span class="txn-actions">
                <button class="btn btn-ghost btn-sm" data-edit-txn="${t.id}" type="button">এডিট</button>
                <button class="btn btn-danger btn-sm" data-del-txn="${t.id}" type="button">মুছুন</button>
              </span>
            </div>
          </div>
        `).join('')
      }
    </div>

    <div class="section-title">${state.modal.editTxnId ? 'পেমেন্ট এডিট করুন' : 'নতুন পেমেন্ট যোগ করুন'}</div>
    <div class="field-row">
      <div><label>তারিখ</label><input type="date" id="txnDate" value="${state.modal.formDate || new Date().toISOString().slice(0,10)}"></div>
      <div><label>পরিমাণ (সমন্বয়ের জন্য ঋণাত্মক ব্যবহার করুন)</label><input type="number" id="txnAmount" value="${state.modal.formAmount ?? ''}" placeholder="যেমন 1100 অথবা -500"></div>
    </div>
    <label>নোট (ঐচ্ছিক)</label>
    <input type="text" id="txnNote" value="${escapeHTML(state.modal.formNote || '')}" placeholder="যেমন নগদ পেমেন্ট">
    <div class="btn-row" style="margin-top:12px;">
      <button class="btn btn-primary btn-block" id="btnSaveTxn" type="button">${state.modal.editTxnId ? 'হালনাগাদ করুন' : 'পেমেন্ট যোগ করুন'}</button>
      ${state.modal.editTxnId ? '<button class="btn btn-ghost" id="btnCancelEditTxn" type="button">বাতিল</button>' : ''}
    </div>
  `;
}

/* -- WiFi modal -- */
function openWifiModal(memberId) { openModal({ type: 'wifi', memberId }); }
function modalWifi(memberId) {
  const m = getMember(memberId);
  const w = calculateWifiBalance(memberId);
  const txns = state.data.wifiTransactions.filter(t => t.memberId === memberId).sort((a, b) => (a.date < b.date ? 1 : -1));
  return `
    <div class="modal-header">
      <h3>${escapeHTML(m.name)} — WiFi</h3>
      <button class="close-btn" id="modalClose" type="button">✕</button>
    </div>
    <div class="field-row">
      <div><label>WiFi সংযোগ ফি</label><input type="number" id="wifiFee" value="${m.wifiFee ?? 0}"></div>
      <div style="display:flex;align-items:flex-end;"><button class="btn btn-outline btn-block" id="btnSaveWifiFee" type="button">ফি সংরক্ষণ</button></div>
    </div>
    <div class="summary-grid">
      <div><span>মোট ফি</span>${formatMoney(w.fee)}</div>
      <div><span>মোট জমা</span>${formatMoney(w.paid)}</div>
      <div><span>বকেয়া</span>${formatMoney(w.due)}</div>
      <div><span>অগ্রিম</span>${formatMoney(w.advance)}</div>
    </div>

    <div class="section-title">WiFi পেমেন্ট হিস্ট্রি</div>
    ${txns.length === 0 ? '<div class="empty-state">কোনো WiFi পেমেন্ট নেই</div>' :
      txns.map(t => `
        <div class="txn-item">
          <div>${t.date} ${t.note ? '· ' + escapeHTML(t.note) : ''}</div>
          <div style="display:flex;align-items:center;">
            <span class="txn-amount positive">${formatSignedMoney(t.amount)}</span>
            <span class="txn-actions">
              <button class="btn btn-danger btn-sm" data-del-wifi-txn="${t.id}" type="button">মুছুন</button>
            </span>
          </div>
        </div>
      `).join('')
    }

    <div class="section-title">নতুন WiFi পেমেন্ট</div>
    <div class="field-row">
      <div><label>তারিখ</label><input type="date" id="wifiTxnDate" value="${new Date().toISOString().slice(0,10)}"></div>
      <div><label>পরিমাণ</label><input type="number" id="wifiTxnAmount" placeholder="যেমন 300"></div>
    </div>
    <label>নোট (ঐচ্ছিক)</label>
    <input type="text" id="wifiTxnNote">
    <div class="btn-row" style="margin-top:12px;">
      <button class="btn btn-primary btn-block" id="btnAddWifiTxn" type="button">পেমেন্ট যোগ করুন</button>
    </div>
  `;
}

/* -- Leave / settlement modal -- */
function modalLeave(memberId) {
  const m = getMember(memberId);
  const bal = calculateMemberBalance(memberId, state.currentPeriodIndex);
  const due = bal.due;
  const deposit = Number(m.deposit) || 0;
  const diff = deposit - due;
  let settlementText;
  if (diff > 0) settlementText = `ফেরতযোগ্য জামানত: ${formatMoney(diff)}`;
  else if (diff < 0) settlementText = `অবশিষ্ট প্রদেয়: ${formatMoney(-diff)}`;
  else settlementText = 'হিসাব সমান, কোনো অর্থ বাকি নেই';
  return `
    <div class="modal-header">
      <h3>সদস্য ত্যাগের নিষ্পত্তি</h3>
      <button class="close-btn" id="modalClose" type="button">✕</button>
    </div>
    <div class="member-meta">${escapeHTML(m.name)} · রুম ${toBnNum(m.room)}</div>
    <div class="summary-grid">
      <div><span>বর্তমান বকেয়া</span>${formatMoney(due)}</div>
      <div><span>জামানত</span>${formatMoney(deposit)}</div>
    </div>
    <div class="notice ${diff < 0 ? 'warn' : 'info'}"><strong>${settlementText}</strong></div>
    <label>ত্যাগের তারিখ</label>
    <input type="date" id="leaveDate" value="${new Date().toISOString().slice(0,10)}">
    <div class="btn-row" style="margin-top:14px;">
      <button class="btn btn-danger btn-block" id="btnConfirmLeave" type="button">সদস্য ত্যাগ নিশ্চিত করুন</button>
    </div>
  `;
}

/* ---------------------- Modal wiring ---------------------- */
function wireModal(m) {
  const closeBtn = document.getElementById('modalClose');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  if (m.type === 'period-picker') {
    document.querySelectorAll('[data-period-idx]').forEach(row => {
      row.addEventListener('click', () => {
        state.currentPeriodIndex = Number(row.getAttribute('data-period-idx'));
        state.data.settings.lastPeriodKey = PERIODS[state.currentPeriodIndex].key;
        persist();
        closeModal();
        render();
      });
    });
  }

  if (m.type === 'member-profile') {
    document.getElementById('btnEditMember').addEventListener('click', () => openEditMemberModal(m.memberId));
    document.getElementById('btnPayFromProfile').addEventListener('click', () => openPaymentModal(m.memberId));
    document.getElementById('btnWifiFromProfile').addEventListener('click', () => openWifiModal(m.memberId));
    const leaveBtn = document.getElementById('btnLeaveMember');
    if (leaveBtn) leaveBtn.addEventListener('click', () => openModal({ type: 'leave', memberId: m.memberId }));
  }

  if (m.type === 'member-form') {
    document.getElementById('btnSaveMember').addEventListener('click', () => {
      const name = document.getElementById('fName').value.trim();
      const room = document.getElementById('fRoom').value.trim();
      const rent = Number(document.getElementById('fRent').value);
      if (!name || !room || isNaN(rent)) {
        alert('নাম, রুম এবং মাসিক ভাড়া অবশ্যই দিতে হবে।');
        return;
      }
      const fields = {
        name, room, rent,
        deposit: Number(document.getElementById('fDeposit').value) || 0,
        mobile: document.getElementById('fMobile').value.trim(),
        address: document.getElementById('fAddress').value.trim(),
        upazila: document.getElementById('fUpazila').value.trim(),
        district: document.getElementById('fDistrict').value.trim(),
        joiningDate: document.getElementById('fJoining').value,
      };
      if (m.memberId) {
        const existing = getMember(m.memberId);
        Object.assign(existing, fields);
        showToast('বর্ডারের তথ্য হালনাগাদ হয়েছে');
      } else {
        state.data.members.push({
          id: uid('m'),
          ...fields,
          leavingDate: '',
          status: 'active',
          wifiFee: 0
        });
        showToast('নতুন বর্ডার যোগ করা হয়েছে');
      }
      persist();
      closeModal();
      render();
    });
  }

  if (m.type === 'payment') {
    document.getElementById('btnSaveTxn').addEventListener('click', () => {
      const date = document.getElementById('txnDate').value;
      const amountRaw = document.getElementById('txnAmount').value;
      const note = document.getElementById('txnNote').value.trim();
      if (amountRaw === '' || amountRaw === null) {
        alert('পরিমাণ লিখুন।');
        return;
      }
      const amount = Number(amountRaw);
      if (isNaN(amount) || amount === 0) {
        alert('সঠিক পরিমাণ লিখুন।');
        return;
      }
      if (!date) { alert('তারিখ নির্বাচন করুন।'); return; }
      const p = PERIODS[state.currentPeriodIndex];

      if (state.modal.editTxnId) {
        const t = state.data.transactions.find(x => x.id === state.modal.editTxnId);
        if (t) { t.date = date; t.amount = amount; t.note = note; t.type = amount < 0 ? 'adjustment' : 'payment'; }
        showToast('পেমেন্ট হালনাগাদ হয়েছে');
      } else {
        state.data.transactions.push({
          id: uid('t'), memberId: m.memberId, period: p.key,
          date, amount, note, type: amount < 0 ? 'adjustment' : 'payment'
        });
        showToast('পেমেন্ট যোগ করা হয়েছে');
      }
      persist();
      state.modal.editTxnId = null;
      state.modal.formDate = null; state.modal.formAmount = null; state.modal.formNote = null;
      renderModal();
      render();
    });

    const cancelEdit = document.getElementById('btnCancelEditTxn');
    if (cancelEdit) cancelEdit.addEventListener('click', () => {
      state.modal.editTxnId = null;
      state.modal.formDate = null; state.modal.formAmount = null; state.modal.formNote = null;
      renderModal();
    });

    document.querySelectorAll('[data-edit-txn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = state.data.transactions.find(x => x.id === btn.getAttribute('data-edit-txn'));
        if (!t) return;
        state.modal.editTxnId = t.id;
        state.modal.formDate = t.date;
        state.modal.formAmount = t.amount;
        state.modal.formNote = t.note;
        renderModal();
      });
    });
    document.querySelectorAll('[data-del-txn]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('এই পেমেন্টটি মুছে ফেলতে চান?')) return;
        state.data.transactions = state.data.transactions.filter(x => x.id !== btn.getAttribute('data-del-txn'));
        persist();
        showToast('পেমেন্ট মুছে ফেলা হয়েছে');
        renderModal();
        render();
      });
    });
  }

  if (m.type === 'wifi') {
    document.getElementById('btnSaveWifiFee').addEventListener('click', () => {
      const fee = Number(document.getElementById('wifiFee').value) || 0;
      getMember(m.memberId).wifiFee = fee;
      persist();
      showToast('WiFi ফি সংরক্ষণ হয়েছে');
      renderModal();
      render();
    });
    document.getElementById('btnAddWifiTxn').addEventListener('click', () => {
      const date = document.getElementById('wifiTxnDate').value;
      const amountRaw = document.getElementById('wifiTxnAmount').value;
      const note = document.getElementById('wifiTxnNote').value.trim();
      if (amountRaw === '' ) { alert('পরিমাণ লিখুন।'); return; }
      const amount = Number(amountRaw);
      if (isNaN(amount) || amount === 0) { alert('সঠিক পরিমাণ লিখুন।'); return; }
      if (!date) { alert('তারিখ নির্বাচন করুন।'); return; }
      state.data.wifiTransactions.push({ id: uid('w'), memberId: m.memberId, date, amount, note });
      persist();
      showToast('WiFi পেমেন্ট যোগ করা হয়েছে');
      renderModal();
      render();
    });
    document.querySelectorAll('[data-del-wifi-txn]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('এই WiFi পেমেন্টটি মুছে ফেলতে চান?')) return;
        state.data.wifiTransactions = state.data.wifiTransactions.filter(x => x.id !== btn.getAttribute('data-del-wifi-txn'));
        persist();
        renderModal();
        render();
      });
    });
  }

  if (m.type === 'leave') {
    document.getElementById('btnConfirmLeave').addEventListener('click', () => {
      const leaveDate = document.getElementById('leaveDate').value;
      if (!leaveDate) { alert('তারিখ নির্বাচন করুন।'); return; }
      const member = getMember(m.memberId);
      member.status = 'former';
      member.leavingDate = leaveDate;
      persist();
      showToast('সদস্য ত্যাগ নিবন্ধিত হয়েছে');
      closeModal();
      setView('members');
    });
  }
}

/* ==========================================================
   INIT
   ========================================================== */
function init() {
  render();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
}
document.addEventListener('DOMContentLoaded', init);
