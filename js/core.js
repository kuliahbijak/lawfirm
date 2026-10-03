/* ============================================================
   SIMLAWFIRM — core.js
   Lapisan inti SPA (gas-instant-ux-pro): api() dengan timeout/retry/reqId,
   SWR + batas kesegaran + namespace per user, router hash dengan halaman
   yang "hidup", sesi, shell (rail + subpanel), toast/modal/drawer.
   ============================================================ */
'use strict';
var CFG = window.APP_CONFIG || {};
var GAS_URL = CFG.GAS_URL;
var AppState = { token: '', user: null, schema: null, refs: {}, settings: {}, badges: {}, dash: null, portal: null, route: '', param: '', online: true };

// ---------------- Penyimpanan lokal (P2) ----------------
var LS_PREFIX = 'slaw:v4:';
var Store = {
  get: function (k, d) { try { var v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) {
    var s = JSON.stringify(v);
    try { localStorage.setItem(LS_PREFIX + k, s); }
    catch (e) {
      try { Object.keys(localStorage).filter(function (x) { return x.indexOf(LS_PREFIX + 'u:') === 0 && x.indexOf(LS_PREFIX + userKey('')) !== 0; }).forEach(function (x) { localStorage.removeItem(x); }); localStorage.setItem(LS_PREFIX + k, s); } catch (e2) {}
    }
  },
  del: function (k) { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) {} },
  clearUser: function () { try { var p = LS_PREFIX + userKey(''); Object.keys(localStorage).filter(function (x) { return x.indexOf(p) === 0; }).forEach(function (x) { localStorage.removeItem(x); }); } catch (e) {} }
};
function userKey(k) { return 'u:' + ((AppState.user && AppState.user.email) || 'anon') + ':' + k; }
function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }

// ---------------- Pengukur performa (P0) ----------------
var Perf = { rows: [], add: function (a, total, server) { this.rows.push({ action: a, total: total, server: server == null ? null : server, net: server == null ? null : total - server, at: new Date().toLocaleTimeString() }); if (this.rows.length > 200) this.rows.shift(); }, table: function () { console.table(this.rows.slice(-30)); } };
window.Perf = Perf;

// ---------------- API (P6, P8) ----------------
var READ_ACTIONS = /^(auth\.boot|batch|crud\.list|crud\.get|refs|dashboard|calendar|perkara\.detail|klien\.detail|rapat\.detail|surat\.stats|nomor\.preview|finance\.summary|workload|portal|rbac\.get|logs|settings\.get|system\.status|backup\.list|notif\.config|notif\.queue|wa\.audience|wa\.blastList|wa\.device|crm\.list|crm\.stats|crm\.detail|crm\.duplikat|de\.templates|de\.pejabat|de\.dokumen|de\.inbox|de\.massalStatus|mig\.scan|mig\.export|file\.get|de\.unduh)$/;
function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); }
async function apiOnce(action, data, timeout, reqId) {
  var ctrl = new AbortController(), timer = setTimeout(function () { ctrl.abort(); }, timeout), t0 = performance.now();
  try {
    var res = await fetch(GAS_URL, { method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // hindari CORS preflight
      body: JSON.stringify({ action: action, token: AppState.token || '', reqId: reqId, data: data || {} }) });
    var text = await res.text();
    try { var j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429 || res.status === 200, message: 'Server membalas HTTP ' + res.status + ' (bukan JSON). Periksa URL GAS & deployment.' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus.' };
  } finally { clearTimeout(timer); }
}
async function api(action, data, opt) {
  opt = opt || {};
  var isRead = READ_ACTIONS.test(action);
  var reqId = isRead ? '' : (opt.reqId || uuid());
  var tries = isRead ? 3 : 2, res;
  for (var i = 0; i < tries; i++) {
    if (i) { await new Promise(function (r) { setTimeout(r, 1200 * i); }); if (navigator.onLine === false) await waitOnline(15000); }
    res = await apiOnce(action, data, isRead ? (i ? 40000 : 25000) : 90000, reqId);
    if (res.success || !res.retryable) break;
  }
  if (!res.success && res.data && res.data.code === 'AUTH' && action.indexOf('auth.') !== 0) onSessionExpired();
  return res;
}
function waitOnline(ms) { return new Promise(function (r) { if (navigator.onLine !== false) return r(); var t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); }); }
function warmUpServer() { if (!GAS_URL || /GANTI_DENGAN/.test(GAS_URL)) return; fetch(GAS_URL + '?action=ping&t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(function () {}); }
async function apiGet(params) {
  var q = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  try { var r = await fetch(GAS_URL + '?' + q, { redirect: 'follow', cache: 'no-store' }); return await r.json(); }
  catch (e) { return { success: false, message: 'Tidak dapat menghubungi server.' }; }
}

/** Stale-while-revalidate: render dari cache seketika, segarkan di latar bila lewat batas kesegaran. */
async function swr(key, action, payload, render, opt) {
  opt = opt || {};
  var fresh = opt.fresh == null ? 60000 : opt.fresh, c = Store.get(userKey(key), null);
  if (c && render) render(c.data, true);
  if (c && !opt.force && Date.now() - c.t < fresh) return { success: true, data: c.data, cached: true };
  var res = await api(action, payload);
  if (res.success) {
    var h = hashStr(JSON.stringify(res.data));
    Store.set(userKey(key), { t: Date.now(), h: h, data: res.data });
    if ((!c || c.h !== h) && render) render(res.data, false);
  } else if (!c && opt.onError) opt.onError(res);
  else if (!c && render) render(null, false, res);
  return res;
}
function cacheGet(key) { var c = Store.get(userKey(key), null); return c ? c.data : null; }
function cacheSet(key, data) { Store.set(userKey(key), { t: Date.now(), h: hashStr(JSON.stringify(data)), data: data }); }
function cacheStale(key) { var c = Store.get(userKey(key), null); if (c) { c.t = 0; Store.set(userKey(key), c); } }

// ---------------- Data tabel (cache per tabel + mutasi lokal) ----------------
var Data = {
  rows: function (t) { var d = cacheGet('t:' + t); return d ? d.rows : null; },
  load: function (t, render, opt) { return swr('t:' + t, 'crud.list', { t: t }, function (d, fromCache, err) { render && render(d ? d.rows : null, fromCache, err); }, opt); },
  upsert: function (t, row) {
    var d = cacheGet('t:' + t) || { t: t, rows: [] }, i = d.rows.findIndex(function (r) { return r.id === row.id; });
    if (i > -1) d.rows[i] = row; else d.rows.push(row);
    cacheSet('t:' + t, d); Data.refUpdate(t, row); Data.stale(t);
  },
  remove: function (t, id) { var d = cacheGet('t:' + t); if (!d) return; d.rows = d.rows.filter(function (r) { return r.id !== id; }); cacheSet('t:' + t, d); },
  stale: function (t) { cacheStale('t:' + t); },
  /** Setelah tulis, tabel lain bisa berubah lewat hook server (riwayat, kas, timeline…) */
  touch: function (tables) { (tables || []).forEach(function (t) { cacheStale('t:' + t); }); cacheStale('dash'); cacheStale('cal'); cacheStale('fin'); cacheStale('wl'); },
  refUpdate: function (t, r) {
    var lab = { Klien: r.nama, Personel: r.nama, Perkara: (r.noPerkara ? r.noPerkara + ' — ' : '') + r.judul, Leads: r.nama, Rapat: r.judul + ' (' + r.tanggal + ')', Surat: (r.nomor || r.arah) + ' — ' + r.perihal, Invoice: r.nomor || r.id, Sidang: r.tanggal + ' — ' + r.agenda, Pelatihan: r.judul, Task: (r.kode || '') + ' ' + r.judul }[t];
    if (lab === undefined) return;
    var arr = AppState.refs[t] = AppState.refs[t] || [], i = arr.findIndex(function (x) { return x[0] === r.id; });
    var row = [r.id, lab]; if (t === 'Personel') row.push(r.kategori, r.jabatan, r.status); if (t === 'Perkara') row.push(r.klienId, r.status); if (t === 'Klien') row.push(r.status);
    if (i > -1) arr[i] = row; else arr.push(row);
    Store.set(userKey('refs'), AppState.refs);
  }
};
var RELASI = { Pembayaran: ['Invoice', 'Kas', 'RiwayatKlien'], Invoice: ['RiwayatKlien'], Perkara: ['Timeline', 'RiwayatKlien'], Sidang: ['RiwayatKlien'], Klien: ['RiwayatKlien'],
  Konsultasi: ['RiwayatKlien'], TindakLanjut: ['Task'], Task: ['TindakLanjut'], Disposisi: ['Surat'], LaporanSidang: ['Sidang', 'Timeline'], Dokumen: ['RiwayatKlien'], Surat: ['RiwayatKlien'], PesertaRapat: [] };
function refLabel(t, id) { if (!id) return ''; var a = AppState.refs[t] || []; for (var i = 0; i < a.length; i++) if (a[i][0] === id) return a[i][1]; return id; }
function refRow(t, id) { var a = AppState.refs[t] || []; for (var i = 0; i < a.length; i++) if (a[i][0] === id) return a[i]; return null; }

// ---------------- Utilitas tampilan ----------------
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function rp(n) { return 'Rp ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function rpS(n) { n = Number(n) || 0; var a = Math.abs(n); if (a >= 1e9) return 'Rp ' + (n / 1e9).toFixed(a >= 1e10 ? 0 : 2).replace('.', ',') + ' M'; if (a >= 1e6) return 'Rp ' + (n / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace('.', ',') + ' Jt'; if (a >= 1e3) return 'Rp ' + Math.round(n / 1e3) + ' rb'; return rp(n); }
function nf(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function pd(s) { if (!s) return null; var d = new Date(String(s).length === 10 ? s + 'T00:00:00' : s); return isNaN(d) ? null : d; }
function tgl(s, full) { var d = pd(s); if (!d) return s || '—'; return d.getDate() + ' ' + (full ? BULAN : BLN)[d.getMonth()] + ' ' + d.getFullYear(); }
function tglJam(s) { var d = pd(s); if (!d) return s || '—'; return tgl(s) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function ymd(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function today() { return ymd(new Date()); }
function addDays(s, n) { var d = pd(s) || new Date(); d.setDate(d.getDate() + n); return ymd(d); }
function diffDays(s) { var d = pd(s); if (!d) return null; return Math.round((d - pd(today())) / 864e5); }
function relTime(s) { var d = pd(s); if (!d) return ''; var m = Math.round((Date.now() - d) / 60000); if (m < 1) return 'baru saja'; if (m < 60) return m + ' mnt lalu'; var h = Math.round(m / 60); if (h < 24) return h + ' jam lalu'; var dd = Math.round(h / 24); return dd < 30 ? dd + ' hari lalu' : tgl(s); }
function initials(n) {
  var w = String(n || '?').replace(/^(dr|ir|prof|h|hj)\.?\s+/i, '').split(/[\s,]+/).filter(function (x) { return x && /^[A-Za-z]/.test(x) && !/^(S\.?H|M\.?H|S\.?E|M\.?Hum|M\.?Kn|PT|CV|Tbk)\.?$/i.test(x); });
  if (!w.length) return '?';
  return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
}
function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
function strip(h) { var d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent || ''; }
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function on(el, ev, sel, fn) { el.addEventListener(ev, function (e) { var t = e.target.closest(sel); if (t && el.contains(t)) fn(e, t); }); }
function canEdit() { return AppState.user && AppState.user.role === 'SUPER_ADMIN'; }
function isRole(r) { return AppState.user && AppState.user.role === r; }
function fileB64(file, maxMB) {
  return new Promise(function (res, rej) {
    if (file.size > (maxMB || 10) * 1048576) return rej(new Error('Ukuran berkas maksimal ' + (maxMB || 10) + ' MB.'));
    var r = new FileReader(); r.onload = function () { res({ name: file.name, mime: file.type || 'application/octet-stream', data: String(r.result).split(',')[1] }); }; r.onerror = rej; r.readAsDataURL(file);
  });
}
function b64Blob(b64, mime) { var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime || 'application/octet-stream' }); }
function saveBlob(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
function openBlob(blob) { var u = URL.createObjectURL(blob); var w = window.open(u, '_blank'); if (!w) saveBlob(blob, 'dokumen.pdf'); setTimeout(function () { URL.revokeObjectURL(u); }, 60000); }

// ---------------- Toast, modal, drawer, konfirmasi ----------------
function toast(msg, type, title) {
  var box = $('#toasts'); if (!box) return;
  var el = document.createElement('div'); el.className = 'toast ' + (type || 'ok');
  el.innerHTML = ic(type === 'bad' ? 'circle-alert' : type === 'warn' ? 'triangle-alert' : 'circle-check') + '<div>' + (title ? '<b>' + esc(title) + '</b>' : '') + esc(msg) + '</div>';
  box.appendChild(el); setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 300); }, type === 'bad' ? 6000 : 3200);
}
var OVERLAYS = [];
function overlay(cls, html, onClose) {
  var veil = document.createElement('div'); veil.className = 'veil';
  var box = document.createElement('div'); box.className = cls; box.innerHTML = html; box.setAttribute('role', 'dialog');
  document.body.appendChild(veil); document.body.appendChild(box);
  var closed = false;
  var close = function () { if (closed) return; closed = true; veil.remove(); box.remove(); document.removeEventListener('keydown', key); OVERLAYS.splice(OVERLAYS.indexOf(close), 1); onClose && onClose(); };
  OVERLAYS.push(close);
  var key = function (e) { if (e.key === 'Escape') close(); };
  veil.addEventListener('click', close); document.addEventListener('keydown', key);
  on(box, 'click', '[data-close]', close);
  setTimeout(function () { var f = box.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea,[contenteditable]'); if (f && window.innerWidth > 768) f.focus(); }, 60);
  return { el: box, close: close };
}
function drawer(title, body, foot, opt) {
  opt = opt || {};
  return overlay('drawer' + (opt.wide ? ' wide' : ''), '<div class="drawer-h"><div class="grow">' + (opt.kicker ? '<div class="lbl" style="color:var(--primary-800)">' + esc(opt.kicker) + '</div>' : '') +
    '<h3 class="h-md">' + title + '</h3>' + (opt.sub ? '<div class="small muted">' + opt.sub + '</div>' : '') + '</div><button class="btn ghost icon" data-close aria-label="Tutup">' + ic('x') + '</button></div>' +
    '<div class="drawer-b">' + body + '</div>' + (foot ? '<div class="drawer-f">' + foot + '</div>' : ''), opt.onClose);
}
function modal(html, opt) { return overlay('modal' + (opt && opt.wide ? ' wide' : ''), html, opt && opt.onClose); }
function confirmBox(msg, opt) {
  opt = opt || {};
  return new Promise(function (res) {
    var m = modal('<h3 class="h-md">' + esc(opt.title || 'Konfirmasi') + '</h3><p class="t2" style="margin:10px 0 18px">' + esc(msg) + '</p>' +
      (opt.input ? '<div class="field mb"><label>' + esc(opt.input) + '</label><textarea class="input" id="cf-in" rows="3"></textarea></div>' : '') +
      '<div class="row" style="justify-content:flex-end"><button class="btn" data-close>Batal</button><button class="btn ' + (opt.danger ? 'danger solid' : 'primary') + '" id="cf-ok">' + esc(opt.ok || 'Ya, lanjutkan') + '</button></div>', { onClose: function () { res(false); } });
    $('#cf-ok', m.el).onclick = function () { var v = opt.input ? $('#cf-in', m.el).value.trim() : true; if (opt.input && v.length < (opt.min || 1)) { toast('Mohon isi ' + opt.input.toLowerCase() + '.', 'warn'); return; } res(v); m.close(); };
  });
}
async function withBusy(btn, fn) {
  if (btn) btn.classList.add('busy');
  try { return await fn(); } finally { if (btn) btn.classList.remove('busy'); }
}
async function act(btn, action, data, okMsg) {
  return withBusy(btn, async function () {
    var r = await api(action, data);
    if (r.success) toast(okMsg || r.message || 'Berhasil.'); else toast(r.message || 'Gagal.', 'bad');
    return r;
  });
}

// ---------------- Router SPA (P1) ----------------
var Pages = {};
function registerPage(name, def) { Pages[name] = def; }
function go(name, param) { var h = '#/' + name + (param ? '/' + encodeURIComponent(param) : ''); if (location.hash === h) route(); else location.hash = h; }
function route() {
  if (!AppState.user) return;
  var parts = location.hash.replace(/^#\/?/, '').split('/'), name = parts[0], param = parts[1] ? decodeURIComponent(parts[1]) : '';
  var home = AppState.user.role === 'KLIEN' ? 'portal' : 'dashboard';
  if (!Pages[name] || !routeAllowed(name)) { history.replaceState(null, '', '#/' + home); name = home; param = ''; }
  AppState.route = name; AppState.param = param;
  OVERLAYS.slice().forEach(function (c) { c(); });   // tutup drawer/modal saat pindah halaman
  var host = $('#view'); if (!host) return;
  var el = host.querySelector('.page[data-page="' + name + '"]');
  if (!el) { el = document.createElement('section'); el.className = 'page'; el.dataset.page = name; host.appendChild(el); }
  $$('.page', host).forEach(function (p) { p.hidden = p !== el; });
  try { Pages[name].show(el, param); } catch (e) { console.error(e); el.innerHTML = errorBox('Halaman gagal dimuat: ' + e.message); }
  renderNav();
  $('.shell') && $('.shell').classList.remove('sub-open');
  if (!Pages[name].keepScroll) window.scrollTo(0, 0);
  document.title = (Pages[name].title || 'SIMLAWFIRM') + ' · ' + (AppState.settings.appName || 'SIMLAWFIRM');
}
function refreshView() { if (AppState.route && Pages[AppState.route]) { var el = $('.page[data-page="' + AppState.route + '"]'); if (el) Pages[AppState.route].show(el, AppState.param, true); } }
function errorBox(msg, retry) { return '<div class="card empty">' + ic('cloud-off') + '<b>Belum dapat memuat data</b><div class="small">' + esc(msg || '') + '</div>' + (retry ? '<button class="btn sm mt-s" onclick="refreshView()">' + ic('refresh-cw') + 'Coba lagi</button>' : '') + '</div>'; }

// ---------------- Menu (sesuai PRD + RBAC) ----------------
var MENU = [
  { g: 'dashboard', ic: 'layout-grid', label: 'Dashboard', sec: 'Modul Aktif', items: [{ r: 'dashboard', label: 'Ringkasan Eksekutif', ic: 'layout-dashboard' }] },
  { g: 'client', ic: 'users', label: 'Client Management', items: [{ r: 'leads', label: 'Calon Klien / Leads', b: 'leads' }, { r: 'klien', label: 'Data Klien' }, { r: 'konsultasi', label: 'Data Konsultasi' }, { r: 'riwayat', label: 'Riwayat Klien' }] },
  { g: 'case', ic: 'scale', label: 'Case / Perkara', items: [{ r: 'perkara', label: 'Data Kasus / Perkara' }, { r: 'sidang', label: 'Jadwal Sidang' }, { r: 'timeline', label: 'Timeline Perkara' }, { r: 'laporan', label: 'Laporan Sidang' }, { r: 'dokumen', label: 'Manajemen Dokumen' }] },
  { g: 'workspace', ic: 'calendar-days', label: 'Workspace', items: [{ r: 'kalender', label: 'Calendar' }, { r: 'meeting', label: 'Meeting Hub' },
    { r: 'rapat', label: 'Jadwal Rapat', sub: 1 }, { r: 'agenda', label: 'Agenda', sub: 1 }, { r: 'peserta', label: 'Peserta', sub: 1 }, { r: 'notulensi', label: 'Notulensi', sub: 1 }, { r: 'keputusan', label: 'Keputusan', sub: 1 }, { r: 'tindaklanjut', label: 'Tindak Lanjut', sub: 1 },
    { r: 'task', label: 'Task & Deadline', b: 'taskTelat' }] },
  { g: 'surat', ic: 'mail', label: 'Administrasi Surat', items: [{ r: 'surat', label: 'Semua Surat' }, { r: 'surat-masuk', label: 'Surat Masuk', b: 'suratMasuk' }, { r: 'surat-keluar', label: 'Surat Keluar' }, { r: 'surat-draft', label: 'Draft' },
    { r: 'disposisi', label: 'Disposisi', b: 'disposisi' }, { r: 'penomoran', label: 'Penomoran' }, { r: 'approval', label: 'Approval Pimpinan', b: 'inboxTtd', approve: 1 }, { r: 'arsip', label: 'Arsip Digital' }] },
  { g: 'finance', ic: 'wallet', label: 'Finance & Akuntansi', items: [{ r: 'invoice', label: 'Invoice', b: 'invoiceTelat' }, { r: 'pembayaran', label: 'Pembayaran' }, { r: 'piutang', label: 'Piutang (Aging)' }, { r: 'keuangan', label: 'Laporan Keuangan' }, { r: 'kas', label: 'Arus Kas' }] },
  { g: 'people', ic: 'briefcase', label: 'People Management', items: [{ r: 'advokat', label: 'Advokat & Partner' }, { r: 'paralegal', label: 'Paralegal' }, { r: 'staff', label: 'Staff' }, { r: 'workload', label: 'Workload / Beban Perkara' }] },
  { g: 'knowledge', ic: 'book-open', label: 'Knowledge Management', items: [{ r: 'library', label: 'Legal Library' }, { r: 'template', label: 'Template Dokumen' }, { r: 'sop', label: 'SOP' }] },
  { g: 'bizdev', ic: 'megaphone', label: 'Business Development', items: [{ r: 'konten', label: 'Content Planner' }, { r: 'pelatihan', label: 'Database Pelatihan' }, { r: 'partnership', label: 'Partnership' }, { r: 'peluang', label: 'CRM / Leads Bisnis' }, { r: 'crm', label: 'CRM Kontak (WA & Email)', sa: 1 }] },
  { g: 'admin', ic: 'shield-check', label: 'Administration & Security', items: [{ r: 'admin', label: 'Ringkasan Keamanan', sa: 1 }, { r: 'users', label: 'User Management', sa: 1 }, { r: 'rbac', label: 'RBAC / Hak Akses', sa: 1 }, { r: 'logs', label: 'Log Aktivitas', sa: 1 },
    { r: 'settings', label: 'Pengaturan Sistem', sa: 1 }, { r: 'backup', label: 'Backup / Keamanan', sa: 1 }, { r: 'notifikasi', label: 'Notifikasi WA & Email', sa: 1 }, { r: 'doc-engine', label: 'Doc Engine & TTD', sa: 1 }, { r: 'migrasi', label: 'Migrasi Database', sa: 1 }] }
];
var ROUTE_GROUP = {};
MENU.forEach(function (m) { m.items.forEach(function (it) { ROUTE_GROUP[it.r] = m.g; }); });
ROUTE_GROUP['perkara-detail'] = 'case'; ROUTE_GROUP['klien-detail'] = 'client'; ROUTE_GROUP['akun'] = '';
function groupAllowed(g) {
  var u = AppState.user; if (!u) return false;
  if (u.role === 'SUPER_ADMIN') return true;
  if (u.role === 'KLIEN') return false;
  var m = (AppState.settings.rbac || {})[g];
  if (g === 'admin') return false;
  return m !== 'none';
}
function itemAllowed(it, g) {
  var u = AppState.user;
  if (u.role === 'SUPER_ADMIN') return true;
  if (it.sa) return false;
  if (it.approve) return (AppState.settings.rbac || {}).surat === 'approve' || u.pejabat;
  return groupAllowed(g);
}
function routeAllowed(name) {
  var u = AppState.user;
  if (u.role === 'KLIEN') return name === 'portal' || name === 'akun';
  if (name === 'portal') return false;
  if (name === 'akun') return true;
  var g = ROUTE_GROUP[name]; if (!g) return true;
  var m = MENU.filter(function (x) { return x.g === g; })[0], it = m && m.items.filter(function (x) { return x.r === name; })[0];
  return it ? itemAllowed(it, g) : groupAllowed(g);
}
function badgeOf(k) { var n = (AppState.badges || {})[k] || 0; return n ? '<span class="count' + (/Telat|inbox/.test(k) ? ' bad' : '') + '">' + n + '</span>' : ''; }
function renderNav() {
  var rail = $('#rail-nav'), sub = $('#subnav'); if (!rail || !sub) return;
  var g = ROUTE_GROUP[AppState.route] || 'dashboard', groups = MENU.filter(function (m) { return groupAllowed(m.g) || m.items.some(function (it) { return itemAllowed(it, m.g); }); });
  rail.innerHTML = groups.map(function (m) {
    var pip = m.items.some(function (it) { return it.b && (AppState.badges || {})[it.b]; });
    return '<button class="' + (m.g === g ? 'on' : '') + '" data-g="' + m.g + '" aria-label="' + esc(m.label) + '">' + ic(m.ic) + (pip ? '<i class="pip"></i>' : '') + '<span class="tip">' + esc(m.label) + '</span></button>';
  }).join('');
  var cur = MENU.filter(function (m) { return m.g === (AppState.navGroup || g); })[0] || MENU[0];
  var items = cur.items.filter(function (it) { return itemAllowed(it, cur.g); });
  var inMeeting = /^(meeting|rapat|agenda|peserta|notulensi|keputusan|tindaklanjut)$/.test(AppState.route);
  sub.innerHTML = '<div class="nav-sec">' + esc(cur.sec || cur.label) + '<small>' + items.filter(function (i) { return !i.sub; }).length + ' Sub</small></div>' +
    items.filter(function (it) { return !it.sub || inMeeting; }).map(function (it) {
      return '<a class="nav-item' + (it.sub ? ' sub' : '') + (it.r === AppState.route ? ' on' : '') + '" href="#/' + it.r + '">' + (it.ic ? ic(it.ic) : '') + '<span class="grow">' + esc(it.label) + '</span>' + (it.b ? badgeOf(it.b) : '') + '</a>';
    }).join('');
  AppState.navGroup = null;
}

// ---------------- Sesi & bootstrap ----------------
function applyBoot(b) {
  if (!b) return;
  if (b.schema) { AppState.schema = b.schema; Store.set('schema', b.schema); }
  if (b.settings) { AppState.settings = b.settings; Store.set(userKey('settings'), b.settings); }
  if (b.refs) { AppState.refs = b.refs; Store.set(userKey('refs'), b.refs); }
  if (b.badges) { AppState.badges = b.badges; }
  if (b.dashboard) cacheSet('dash', b.dashboard);
  if (b.portal) cacheSet('portal', b.portal);
}
function startSession(data) {
  AppState.token = data.token; AppState.user = data.user;
  Store.set('session', { token: data.token, user: data.user });
  applyBoot(data.boot);
  mountApp();
}
function restoreSession() {
  var s = Store.get('session', null);
  if (!s || !s.token) return false;
  AppState.token = s.token; AppState.user = s.user;
  AppState.schema = Store.get('schema', null);
  AppState.settings = Store.get(userKey('settings'), {}) || {};
  AppState.refs = Store.get(userKey('refs'), {}) || {};
  return !!AppState.schema;
}
function logout(all) {
  if (all) api('auth.logoutAll', {});
  Store.clearUser(); Store.del('session');
  AppState.token = ''; AppState.user = null;
  location.hash = ''; renderLogin();
}
function onSessionExpired() { if (!AppState.user) return; toast('Sesi berakhir. Silakan masuk kembali.', 'warn'); logout(); }
async function revalidateBoot() {
  var r = await api('auth.boot', { schemaV: AppState.schema ? AppState.schema.v : 0 });
  if (r.success) { applyBoot(r.data); renderNav(); renderUserChip(); if (AppState.route === 'dashboard' || AppState.route === 'portal') refreshView(); }
}
function prefetchAdmin() {
  if (AppState.user.role === 'KLIEN') return;
  var run = function () {
    var tbls = ['Klien', 'Perkara', 'Sidang', 'Task', 'Surat', 'Invoice', 'Personel', 'Leads', 'Rapat', 'Pembayaran'];
    var calls = tbls.filter(function (t) { var c = Store.get(userKey('t:' + t), null); return !c || Date.now() - c.t > 60000; }).slice(0, 10).map(function (t) { return { action: 'crud.list', data: { t: t } }; });
    if (!calls.length) return;
    api('batch', { calls: calls }).then(function (res) {
      if (!res.success) return;
      Object.keys(res.data).forEach(function (k) { var r = res.data[k]; if (r.success && r.data && r.data.t) cacheSet('t:' + r.data.t, r.data); });
    });
  };
  if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 2500 }); else setTimeout(run, 1200);
}
function refreshBadges() { if (AppState.user && AppState.user.role !== 'KLIEN') api('auth.boot', { schemaV: AppState.schema.v }).then(function (r) { if (r.success) { applyBoot(r.data); renderNav(); } }); }

// ---------------- Shell ----------------
function renderUserChip() {
  var u = AppState.user, el = $('#user-chip'); if (!el || !u) return;
  var roleLbl = { SUPER_ADMIN: 'Super Admin', MANAGING_PARTNER: 'Managing Partner', KLIEN: 'Klien' }[u.role];
  el.innerHTML = '<div class="who" style="text-align:right"><b>' + esc(u.nama) + '</b><span class="badge pri">' + roleLbl + '</span></div><div class="avatar">' + esc(initials(u.nama)) + '</div>' + ic('chevron-down');
}
function mountApp() {
  var u = AppState.user;
  if (u.role === 'KLIEN') { mountPortal(); return; }
  document.body.innerHTML = '<div class="shell" id="shell">' +
    '<nav class="rail" aria-label="Modul"><div class="logo"><img src="assets/logo.png" alt="SIMLAWFIRM"></div><div id="rail-nav" class="col" style="gap:6px;align-items:center"></div><div class="sp"></div>' +
    '<button id="btn-logout" aria-label="Keluar">' + ic('log-out') + '<span class="tip">Keluar</span></button></nav>' +
    '<aside class="subpanel"><div class="brand"><img src="assets/logo.png" alt=""><div><b>' + esc(AppState.settings.appName || 'SIMLAWFIRM') + '</b><span>Legal Management</span></div></div>' +
    '<div id="subnav"></div><div class="secure mt"><b>Sistem Enkripsi <i></i></b><span class="mono">Token HMAC • TLS 1.3</span></div></aside>' +
    '<div class="main"><header class="topbar"><button class="tb-btn menu-toggle" id="btn-menu" aria-label="Menu">' + ic('menu') + '</button>' +
    '<div class="search input-ic">' + ic('search') + '<input class="input" id="gsearch" placeholder="Cari perkara, klien, surat, atau jadwal…" autocomplete="off"></div><div class="sp"></div>' +
    '<span class="tb-chip hide-m">' + ic('globe') + 'ID</span>' +
    '<button class="tb-btn hide-m" aria-label="Approval" onclick="go(\'approval\')">' + ic('mail') + '</button>' +
    '<button class="tb-btn" id="btn-bell" aria-label="Notifikasi">' + ic('bell') + '<i class="pip" id="bell-pip" hidden></i></button>' +
    '<button class="user-btn" id="user-chip"></button></header><main class="content" id="view"></main></div></div><div class="toasts" id="toasts"></div>';
  renderUserChip();
  on($('#rail-nav'), 'click', 'button', function (e, b) {
    var m = MENU.filter(function (x) { return x.g === b.dataset.g; })[0];
    var first = m.items.filter(function (it) { return itemAllowed(it, m.g) && !it.sub; })[0];
    if (window.innerWidth <= 1100 && ROUTE_GROUP[AppState.route] !== m.g) { AppState.navGroup = m.g; renderNav(); $('#shell').classList.add('sub-open'); return; }
    if (first) go(first.r);
  });
  $('#btn-menu').onclick = function () { $('#shell').classList.toggle('sub-open'); };
  $('#btn-logout').onclick = async function () { if (await confirmBox('Keluar dari aplikasi di perangkat ini?', { ok: 'Keluar' })) logout(); };
  $('#user-chip').onclick = function () { go('akun'); };
  $('#btn-bell').onclick = openNotifPanel;
  $('.content').addEventListener('click', function () { $('#shell').classList.remove('sub-open'); });
  initGlobalSearch();
  window.onhashchange = route;
  route();
  updateBell();
  prefetchAdmin();
  revalidateBoot();
}
function updateBell() { var b = AppState.badges || {}, n = (b.inboxTtd || 0) + (b.taskTelat || 0) + (b.invoiceTelat || 0) + (b.suratMasuk || 0); var p = $('#bell-pip'); if (p) p.hidden = !n; }
function openNotifPanel() {
  var b = AppState.badges || {};
  var items = [['inboxTtd', 'file-signature', 'Dokumen menunggu tanda tangan', 'approval'], ['suratMasuk', 'inbox', 'Surat masuk belum didisposisi', 'surat-masuk'], ['disposisi', 'forward', 'Disposisi baru', 'disposisi'],
    ['taskTelat', 'alarm-clock', 'Task melewati tenggat', 'task'], ['invoiceTelat', 'receipt', 'Invoice lewat jatuh tempo', 'piutang'], ['leads', 'user-plus', 'Calon klien baru', 'leads']]
    .filter(function (x) { return b[x[0]]; });
  var d = drawer('Notifikasi', items.length ? items.map(function (x) {
    return '<a class="soft row mb" style="text-decoration:none;color:inherit" href="#/' + x[3] + '" data-close>' + ic(x[1]) + '<span class="grow">' + x[2] + '</span><span class="count bad">' + b[x[0]] + '</span></a>';
  }).join('') : '<div class="empty">' + ic('bell-off') + '<b>Semua beres</b>Tidak ada hal yang perlu ditindaklanjuti.</div>', '', { kicker: 'Pusat Tindakan' });
  on(d.el, 'click', 'a', function () { d.close(); });
}
function initGlobalSearch() {
  var inp = $('#gsearch'), box = null;
  var close = function () { if (box) { box.remove(); box = null; } };
  inp.addEventListener('input', debounce(function () {
    var q = inp.value.trim().toLowerCase(); close(); if (q.length < 2) return;
    var hits = [];
    [['Perkara', 'perkara-detail', 'scale'], ['Klien', 'klien-detail', 'building-2'], ['Surat', 'surat', 'mail'], ['Sidang', 'sidang', 'gavel'], ['Invoice', 'invoice', 'receipt'], ['Leads', 'leads', 'user-plus'], ['Personel', 'advokat', 'user'], ['Task', 'task', 'list-checks']].forEach(function (x) {
      (AppState.refs[x[0]] || []).forEach(function (r) { if (String(r[1]).toLowerCase().indexOf(q) > -1 && hits.length < 12) hits.push({ t: x[0], id: r[0], label: r[1], page: x[1], ic: x[2] }); });
    });
    box = document.createElement('div'); box.className = 'card pad-0'; box.style.cssText = 'position:absolute;top:48px;left:0;right:0;z-index:50;max-height:380px;overflow:auto;box-shadow:var(--e3)';
    box.innerHTML = hits.length ? hits.map(function (h, i) { return '<a class="row" style="padding:10px 14px;color:inherit;border-bottom:1px solid var(--line)" href="#/' + h.page + (/detail/.test(h.page) ? '/' + h.id : '') + '" data-i="' + i + '">' + ic(h.ic) + '<span class="grow ellip">' + esc(h.label) + '</span><span class="badge">' + h.t + '</span></a>'; }).join('')
      : '<div class="empty small">Tidak ada hasil untuk "' + esc(q) + '"</div>';
    inp.parentNode.style.position = 'relative'; inp.parentNode.appendChild(box);
    box.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a) { var h = hits[a.dataset.i]; if (!/detail/.test(h.page)) sessionStorage.setItem('slaw-open', h.t + ':' + h.id); inp.value = ''; close(); } });
  }, 220));
  inp.addEventListener('blur', function () { setTimeout(close, 200); });
}

// ---------------- Login ----------------
function renderLogin(msg) {
  document.body.innerHTML = '<div class="login"><div class="login-card">' +
    '<section class="login-art"><div class="lg"><img src="assets/logo.png" alt=""><div><b>' + esc(CFG.APP_NAME || 'SIMLAWFIRM') + '</b><span class="badge">V' + esc((CFG.VERSION || '4.2').slice(0, 3)) + '</span><div style="font-size:14px;opacity:.85">Sistem Informasi Manajemen Kantor Hukum</div></div></div>' +
    '<h1>Kelola Kantor Hukum Lebih Rapi, Terintegrasi &amp; Terukur.</h1><p>Platform terpusat untuk mendigitalisasi perkara, jadwal sidang, rapat, manajemen surat, hingga keuangan dan client portal.</p>' +
    '<div class="float-cards"><div class="fc glass" style="left:0;top:20px;width:220px"><div class="row" style="justify-content:space-between"><span class="lbl" style="color:#fff;opacity:.85">Tingkat Menang</span>' + ic('trending-up') + '</div><div class="row mt-s"><b style="font-size:22px">88%</b><div><b>142 Perkara</b><div class="xs" style="opacity:.8">Inkracht</div></div></div></div>' +
    '<div class="fc white" style="left:250px;top:56px;width:270px;transform:rotate(2deg)"><div class="row"><span class="badge bad"><span class="dot"></span>Sidang Hari Ini</span><span class="mono right">10:00 WIB</span></div><b style="display:block;margin:8px 0 2px">Pembuktian Surat &amp; Saksi</b><div class="small t2">PN Jakarta Pusat • R. Kartika</div></div>' +
    '<div class="fc glass" style="left:20px;top:150px;width:380px"><div class="row">' + ic('circle-check') + '<div><span class="lbl" style="color:#fff;opacity:.8">Disposisi Gugatan</span><div style="font-weight:800;color:#8EF0B5">APPROVED BY MANAGING PARTNER</div></div></div></div></div>' +
    '<div class="login-feat"><span>' + ic('circle-check') + 'Google Workspace Sync</span><span>' + ic('shield-check') + 'Role-Based Access Control</span><span>' + ic('bell-ring') + 'Otomasi Notifikasi Sidang</span></div></section>' +
    '<section class="login-form"><div class="login-box"><div class="seal">' + ic('scale') + '</div><h2>Masuk ke Sistem</h2><p class="lead">Silakan masukkan kredensial akun kantor hukum Anda untuk melanjutkan.</p>' +
    '<div class="seg sq" style="width:100%;display:flex" id="role-tabs"><button class="on" data-r="SUPER_ADMIN" style="flex:1;justify-content:center">Super Admin</button><button data-r="MANAGING_PARTNER" style="flex:1;justify-content:center">Partner</button><button data-r="KLIEN" style="flex:1;justify-content:center">Portal Klien</button></div>' +
    '<div class="mt" id="gsi-slot"></div><div class="or">ATAU EMAIL KANTOR</div>' + (msg ? '<div class="err-box">' + esc(msg) + '</div>' : '') + '<div id="login-err"></div>' +
    '<form id="login-form" class="col" style="gap:14px" novalidate><div class="field"><label for="lg-email">Email Kantor</label><div class="input-ic">' + ic('mail') + '<input class="input" id="lg-email" type="email" autocomplete="username" placeholder="advokat@lawfirm.co.id" required></div></div>' +
    '<div class="field"><label for="lg-pass">Kata Sandi</label><div class="input-ic">' + ic('lock') + '<input class="input" id="lg-pass" type="password" autocomplete="current-password" placeholder="••••••••" required style="padding-right:44px"><button type="button" class="btn ghost sm icon" id="lg-eye" style="position:absolute;right:4px;top:5px" aria-label="Tampilkan sandi">' + ic('eye') + '</button></div></div>' +
    '<div class="row"><label class="check"><input type="checkbox" id="lg-remember" checked> Ingat perangkat ini</label><a class="right small" href="#" id="lg-forgot" style="font-weight:600">Lupa sandi?</a></div>' +
    '<button class="btn primary block" style="height:48px;font-size:15px" id="lg-btn">Masuk ke Dashboard ' + ic('arrow-right') + '</button></form>' +
    '<p class="small t2" style="text-align:center;margin:14px 0 0">Belum memiliki akses terdaftar? <a href="#" id="lg-admin" style="font-weight:700">Hubungi Administrator</a></p>' +
    '<div class="login-note">' + ic('lock') + '<span>Dilindungi enkripsi Google Cloud &amp; Kebijakan Kerahasiaan Klien Advokat (Sesuai UU Advokat No. 18/2003 &amp; Standar ISO 27001).</span></div></div></section></div></div><div class="toasts" id="toasts"></div>';
  if (!GAS_URL || /GANTI_DENGAN/.test(GAS_URL)) $('#login-err').innerHTML = '<div class="err-box">GAS_URL belum diisi di <b>js/config.js</b>. Tempel URL Web App Apps Script (/exec) lalu muat ulang.</div>';
  on($('#role-tabs'), 'click', 'button', function (e, b) { $$('#role-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); }); });
  $('#lg-eye').onclick = function () { var p = $('#lg-pass'); p.type = p.type === 'password' ? 'text' : 'password'; };
  $('#lg-forgot').onclick = $('#lg-admin').onclick = function (e) { e.preventDefault(); toast('Hubungi Super Admin kantor untuk reset kata sandi atau pendaftaran akun.', 'warn'); };
  $('#login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('#lg-btn'), email = $('#lg-email').value.trim(), pass = $('#lg-pass').value;
    if (!email || !pass) { $('#login-err').innerHTML = '<div class="err-box">Email dan kata sandi wajib diisi.</div>'; return; }
    await withBusy(btn, async function () {
      var r = await api('auth.login', { email: email, password: pass, remember: $('#lg-remember').checked });
      if (!r.success) { $('#login-err').innerHTML = '<div class="err-box">' + esc(r.message) + '</div>'; return; }
      startSession(r.data);
    });
  });
  initGoogleLogin();
}
async function initGoogleLogin() {
  var c = Store.get('pubcfg', null), slot = $('#gsi-slot');
  var render = function (cfg) {
    if (!slot || !cfg || !cfg.googleClientId) { if (slot) slot.innerHTML = '<button class="gbtn" type="button" id="g-off">' + googleG() + 'Masuk dengan Akun Google</button>'; var b = $('#g-off'); if (b) b.onclick = function () { toast('Login Google belum dikonfigurasi. Super Admin: isi GOOGLE_CLIENT_ID di Pengaturan Sistem.', 'warn'); }; return; }
    var go2 = function () {
      try {
        google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: async function (resp) {
          var r = await api('auth.google', { credential: resp.credential, remember: $('#lg-remember') ? $('#lg-remember').checked : true });
          if (!r.success) { $('#login-err').innerHTML = '<div class="err-box">' + esc(r.message) + '</div>'; return; }
          startSession(r.data);
        } });
        slot.innerHTML = ''; google.accounts.id.renderButton(slot, { theme: 'outline', size: 'large', shape: 'pill', width: Math.min(380, slot.clientWidth || 360), text: 'signin_with', locale: 'id' });
      } catch (e) { console.warn(e); }
    };
    if (window.google && google.accounts) go2();
    else { var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true; s.onload = go2; document.head.appendChild(s); }
  };
  render(c);
  if (!GAS_URL || /GANTI_DENGAN/.test(GAS_URL)) return;
  var r = await apiGet({ action: 'config' });
  if (r.success) { Store.set('pubcfg', r.data); if (!c || c.googleClientId !== r.data.googleClientId) render(r.data); }
}
function googleG() { return '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>'; }

// ---------------- Mulai ----------------
document.addEventListener('DOMContentLoaded', function () {
  warmUpServer();
  addEventListener('online', function () { AppState.online = true; var b = $('.offline-bar'); if (b) b.remove(); });
  addEventListener('offline', function () { AppState.online = false; if (!$('.offline-bar')) { var b = document.createElement('div'); b.className = 'offline-bar'; b.textContent = 'Anda sedang offline — data dari cache perangkat ditampilkan.'; document.body.appendChild(b); } });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && AppState.user && Date.now() - (AppState.hiddenAt || Date.now()) > 120000) { warmUpServer(); refreshBadges(); } if (document.visibilityState === 'hidden') AppState.hiddenAt = Date.now(); });
  if (restoreSession()) mountApp(); else renderLogin();
});
window.addEventListener('error', function (e) { if (e && e.message && !/ResizeObserver/.test(e.message)) console.error(e.message); });
