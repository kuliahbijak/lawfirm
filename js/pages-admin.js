/* ============================================================
   SIMLAWFIRM — pages-admin.js  (khusus Super Admin)
   Administration & Security Hub, User Management, RBAC, Log Aktivitas, Pengaturan,
   Backup, Notifikasi WA & Email (blast/antrean/konfigurasi), CRM Kontak,
   Doc Engine & TTD (template, pejabat, dokumen), Migrasi Database.
   ============================================================ */
'use strict';
var ROLE_LBL = { SUPER_ADMIN: 'Super Admin', MANAGING_PARTNER: 'Managing Partner', KLIEN: 'Klien Portal' };
function roleBadge(r) { return '<span class="badge ' + (r === 'SUPER_ADMIN' ? 'pri' : r === 'MANAGING_PARTNER' ? 'dark' : '') + '">' + esc(ROLE_LBL[r] || r) + '</span>'; }
function logList(rows, n) {
  return rows.slice(0, n || 8).map(function (l) {
    var tone = /LOGIN|AUTH/.test(l.aksi) ? 'info' : /DELETE|HAPUS|TARIK|BYPASS/.test(l.aksi) ? 'bad' : /save|SAVE|IMPORT|BACKUP|TTD/.test(l.aksi) ? 'ok' : '';
    return '<div class="soft mb"><div class="row xs"><span class="mono muted">' + esc(String(l.waktu).slice(11, 19)) + ' WIB</span><span class="badge ' + tone + ' right">' + esc(String(l.aksi).toUpperCase().replace(/\./g, ' ')) + '</span></div><div class="small mt-s"><b>' + esc(l.email || 'Sistem') + '</b> ' + esc(l.tabel ? '• ' + l.tabel : '') + ' ' + esc(l.refId || '') + '</div>' + (l.detail ? '<div class="xs muted ellip">' + esc(l.detail) + '</div>' : '') + '</div>';
  }).join('') || '<div class="muted small">Belum ada aktivitas.</div>';
}

// ============================================================ HUB
registerPage('admin', {
  title: 'Administration & Security',
  show: function (el) {
    el.innerHTML = pageHead({ crumb: 'Kantor Hukum • Pusat Kontrol Sistem • Administrasi &amp; Keamanan <span class="badge ok">Token HMAC • Sandi ber-salt</span>', title: 'Administration &amp; Security Hub', desc: 'Pusat tata kelola otentikasi pengguna, konfigurasi matriks peran (RBAC), jejak audit aktivitas, serta manajemen pencadangan data berkala Google Sheets & Drive.',
      acts: '<button class="btn" data-exp>' + ic('download') + 'Ekspor Audit Trail</button><button class="btn primary" data-bk>' + ic('zap') + 'Backup Sistem Sekarang</button><button class="btn dark" data-nu>' + ic('user-plus') + 'Tambah Pengguna Baru</button>' }) + '<div data-c>' + skeleton(5) + '</div>';
    $('[data-bk]', el).onclick = async function () { var r = await act(this, 'backup.now', {}); if (r.success) cacheStale('sys'); };
    $('[data-nu]', el).onclick = function () { userForm(null); };
    $('[data-exp]', el).onclick = (function () { var l = cacheGet('logs'); if (l) saveBlob(new Blob([toCsv(l.rows, ['waktu', 'email', 'role', 'aksi', 'tabel', 'refId', 'detail'])], { type: 'text/csv' }), 'audit_trail_' + today() + '.csv'); else toast('Muat Log Aktivitas dahulu.', 'warn'); });
    Promise.all([swr('sys', 'system.status', {}, null, { fresh: 60000 }), swr('logs', 'logs', { limit: 200 }, null, { fresh: 15000 }), Data.load('Users', null), swr('rbac', 'rbac.get', {}, null, { fresh: 120000 })]).then(function () {
      var s = cacheGet('sys'), lg = cacheGet('logs') || { rows: [], hariIni: 0 }, us = Data.rows('Users') || [], rb = cacheGet('rbac');
      if (!s) { $('[data-c]', el).innerHTML = errorBox('Status sistem tidak dapat dimuat.', true); return; }
      var aktif = us.filter(function (u) { return u.status === 'Aktif'; }).length;
      $('[data-c]', el).innerHTML = '<div class="grid g4 keep mb">' + kpi({ label: 'Total Pengguna Terdaftar', value: us.length, unit: 'Akun', icon: 'users', foot: cntBy(us, function (u) { return u.role !== 'KLIEN'; }) + ' Staf • ' + cntBy(us, function (u) { return u.role === 'KLIEN'; }) + ' Klien Portal <span class="badge pri">' + aktif + ' Aktif</span>' }) +
        kpi({ label: 'Matriks Hak Akses (RBAC)', value: '3 Peran Utama', icon: 'key-round', foot: 'Admin • Partner • <span class="badge info">Row-Level Klien</span>' }) +
        kpi({ label: 'Log Aktivitas Hari Ini', value: lg.hariIni, unit: 'Event', icon: 'scroll-text', foot: s.notifAntre + ' notifikasi antre' }) +
        kpi({ label: 'Status Backup Terakhir', value: s.backupTerakhir ? relTime(s.backupTerakhir.tanggal) : 'Belum ada', icon: 'cloud-upload', tone: s.backupTerakhir ? 'ok' : 'warn', foot: 'Sheets &amp; Drive <span class="badge ok">Terverifikasi</span>' }) + '</div>' +
        '<div class="card pad-s mb"><div class="seg">' + [['users', 'users', 'Manajemen Pengguna'], ['rbac', 'shield-check', 'Konfigurasi Peran (RBAC)'], ['logs', 'scroll-text', 'Jejak Audit & Log'], ['backup', 'database', 'Pencadangan Data'], ['settings', 'plug', 'Integrasi Google Workspace']].map(function (x) { return '<button onclick="go(\'' + x[0] + '\')">' + ic(x[1]) + x[2] + '</button>'; }).join('') + '</div></div>' +
        '<div class="split"><div class="col" style="gap:18px"><div class="card pad-0"><div class="toolbar"><h3 class="h-sm grow">Direktori Pengguna &amp; Akses Sistem</h3><a class="btn sm" href="#/users">Kelola</a></div><div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Nama &amp; Email</th><th>Peran</th><th>Status</th><th>Login Terakhir</th></tr></thead><tbody>' + us.slice(0, 8).map(function (u) {
          return '<tr><td data-l="Pengguna"><div class="row"><div class="avatar sm soft">' + esc(initials(u.nama)) + '</div><div><div class="t-main">' + esc(u.nama) + '</div><div class="t-sub">' + esc(u.email) + '</div></div></div></td><td data-l="Peran">' + roleBadge(u.role) + (u.klienId ? '<div class="xs muted">' + esc(refLabel('Klien', u.klienId)) + '</div>' : '') + '</td><td data-l="Status">' + badge(u.status) + '</td><td data-l="Login" class="small">' + (u.lastLogin ? relTime(u.lastLogin) : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>' +
        (rb ? '<div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('shield-check') + ' Matriks Hak Akses Peran (RBAC)</h3><a class="btn sm" href="#/rbac">' + ic('sliders-horizontal') + 'Ubah Kebijakan Matriks</a></div>' + rbacTable(rb, false) + '</div>' : '') + '</div>' +
        '<div class="col" style="gap:18px"><div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('activity') + ' Jejak Audit Real-Time</h3><span class="badge info">Live</span></div>' + logList(lg.rows, 6) + '<a class="btn sm block" href="#/logs">Buka Semua Log Aktivitas</a></div>' +
        '<div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('database-backup') + ' Pencadangan &amp; Keamanan</h3><span class="badge ok">Mirroring: ON</span></div><dl class="dl"><dt>Jadwal Auto-Backup</dt><dd>Harian</dd><dt>Snapshot terakhir</dt><dd class="mono xs">' + esc(s.backupTerakhir ? s.backupTerakhir.nama : '—') + '</dd><dt>Trigger aktif</dt><dd class="small">' + esc(s.triggers.join(', ') || '—') + '</dd><dt>Kuota email</dt><dd>' + s.emailQuota + ' tersisa hari ini</dd></dl><a class="btn sm block mt" href="#/backup">' + ic('download') + 'Kelola Backup</a></div></div></div>' +
        '<div class="card pad-s row wrap mt small"><span class="badge ok"><span class="dot"></span>SIMLAWFIRM Infrastructure</span><span>Skema v' + s.schema + '</span><span>Pengguna ' + s.users + '</span><span>Properties ' + s.propsKB + ' KB / 500 KB</span><a class="right" href="' + esc(s.spreadsheetUrl) + '" target="_blank" rel="noopener">' + ic('sheet') + ' Buka Database</a><a href="' + esc(s.folderUrl) + '" target="_blank" rel="noopener">' + ic('folder') + ' Folder Drive</a></div>';
    });
  }
});

// ============================================================ USERS
function userForm(u) {
  u = u || {};
  var d = drawer(u.id ? 'Ubah Pengguna' : 'Tambah Pengguna', '<div class="err-slot"></div><form class="form-grid"><div class="field"><label>Nama <span class="req">*</span></label><input class="input" name="nama" value="' + esc(u.nama || '') + '"></div><div class="field"><label>Email login (Google) <span class="req">*</span></label><input class="input" name="email" type="email" value="' + esc(u.email || '') + '"></div>' +
    '<div class="field"><label>Peran</label><select class="input" name="role">' + Object.keys(ROLE_LBL).map(function (r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + ROLE_LBL[r] + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label>Status</label><select class="input" name="status"><option' + (u.status !== 'Nonaktif' ? ' selected' : '') + '>Aktif</option><option' + (u.status === 'Nonaktif' ? ' selected' : '') + '>Nonaktif</option></select></div>' +
    '<div class="field" data-kl><label>Klien terhubung (peran Klien)</label><select class="input" name="klienId"><option value="">—</option>' + (AppState.refs.Klien || []).map(function (k) { return '<option value="' + k[0] + '"' + (u.klienId === k[0] ? ' selected' : '') + '>' + esc(k[1]) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label>Personel terkait</label><select class="input" name="personelId"><option value="">—</option>' + (AppState.refs.Personel || []).map(function (k) { return '<option value="' + k[0] + '"' + (u.personelId === k[0] ? ' selected' : '') + '>' + esc(k[1]) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label>No. WhatsApp</label><input class="input" name="wa" value="' + esc(u.wa || '') + '"></div>' +
    '<div class="field"><label>' + (u.id ? 'Sandi baru (kosongkan bila tetap)' : 'Kata sandi (kosongkan = dibuat otomatis)') + '</label><input class="input" name="password" type="text" autocomplete="new-password"></div></form>' +
    '<div class="soft xs t2 mt">' + ic('info') + ' Pengguna dapat login dengan tombol Google (email harus sama) atau email + sandi. Mengubah peran/status/sandi otomatis mengakhiri semua sesi pengguna tersebut.</div>',
    '<button class="btn" data-close>Batal</button><button class="btn primary" data-sv>' + ic('save') + 'Simpan</button>', { kicker: 'User Management' });
  var f = $('form', d.el), sync = function () { $('[data-kl]', d.el).style.display = f.role.value === 'KLIEN' ? '' : 'none'; }; f.role.onchange = sync; sync();
  $('[data-sv]', d.el).onclick = async function () {
    var fd = new FormData(f), x = {}; fd.forEach(function (v, k) { x[k] = String(v).trim(); });
    var pass = x.password; delete x.password; if (u.id) x.id = u.id;
    var r = await withBusy(this, function () { return api('users.save', { user: x, password: pass }); });
    if (!r.success) { $('.err-slot', d.el).innerHTML = '<div class="err-box">' + esc(r.message) + '</div>'; return; }
    toast(r.message); d.close(); Data.stale('Users'); refreshView();
    if (r.data.password) modal('<h3 class="h-md">Kredensial pengguna</h3><p class="small t2">Sampaikan secara aman. Sandi hanya ditampilkan sekali.</p><div class="soft mono mt">' + esc(x.email) + '<br>Sandi: <b>' + esc(r.data.password) + '</b></div><div class="row mt" style="justify-content:flex-end"><button class="btn primary" data-close>Selesai</button></div>');
  };
}
registerPage('users', {
  title: 'User Management',
  show: function (el) {
    if (!el._init) {
      el._init = true; el._st = { q: '', page: 1, per: 15, sel: {} }; el._role = '';
      el.innerHTML = pageHead({ crumb: 'Administration &amp; Security', title: 'User Management', desc: 'Daftar pengguna aplikasi: Super Admin (kelola penuh), Managing Partner (baca-saja + approval), Klien (portal, hanya data miliknya).', acts: '<button class="btn primary" data-nu>' + ic('user-plus') + 'Tambah Pengguna</button>' }) +
        '<div class="card pad-0"><div class="toolbar"><div class="input-ic">' + ic('search') + '<input class="input" data-q placeholder="Cari nama / email…"></div><select class="input" data-r><option value="">Semua Peran</option>' + Object.keys(ROLE_LBL).map(function (r) { return '<option value="' + r + '">' + ROLE_LBL[r] + '</option>'; }).join('') + '</select></div><div data-t></div></div>';
      on(el, 'click', '[data-nu]', function () { userForm(null); });
      $('[data-q]', el).oninput = debounce(function (e) { el._st.q = e.target.value.toLowerCase(); el._draw(); }, 250);
      $('[data-r]', el).onchange = function (e) { el._role = e.target.value; el._draw(); };
      on(el, 'click', '[data-rp]', async function (e, b) { e.stopPropagation(); if (!(await confirmBox('Buat sandi baru untuk pengguna ini? Semua sesinya diakhiri.'))) return; var r = await act(b, 'users.resetPass', { id: b.dataset.rp, kirim: true }); if (r.success) modal('<h3 class="h-md">Sandi baru</h3><div class="soft mono mt">' + esc(r.data.password) + '</div><p class="xs muted">Juga dikirim via WA/Email bila notifikasi aktif.</p><div class="row mt" style="justify-content:flex-end"><button class="btn primary" data-close>Selesai</button></div>'); });
      on(el, 'click', '[data-del]', function (e, b) { e.stopPropagation(); var u = (Data.rows('Users') || []).filter(function (x) { return x.id === b.dataset.del; })[0]; if (u) hapusRow('Users', u); });
    }
    el._draw = function () {
      var rows = (Data.rows('Users') || []).filter(function (u) { return (!el._role || u.role === el._role) && (!el._st.q || (u.nama + ' ' + u.email).toLowerCase().indexOf(el._st.q) > -1); });
      var host = $('[data-t]', el);
      host._o = { redraw: el._draw, visible: function () { return rows.map(function (r) { return r.id; }); }, onRow: function (id) { userForm(rows.filter(function (x) { return x.id === id; })[0]); } };
      renderTable(host, { rows: rows, state: el._st, onRow: true, cols: [
        { k: 'nama', l: 'Nama & Email', render: function (u) { return '<div class="row"><div class="avatar sm soft">' + esc(initials(u.nama)) + '</div><div><div class="t-main">' + esc(u.nama) + '</div><div class="t-sub">' + esc(u.email) + '</div></div></div>'; } },
        { k: 'role', l: 'Peran & Entitas', render: function (u) { return roleBadge(u.role) + (u.klienId ? '<div class="xs muted">' + esc(refLabel('Klien', u.klienId)) + ' (Row #' + esc(u.klienId) + ')</div>' : ''); } },
        { k: 'status', l: 'Status', render: function (u) { return badge(u.status); } }, { k: 'lastLogin', l: 'Login Terakhir', render: function (u) { return u.lastLogin ? '<span class="small">' + relTime(u.lastLogin) + '</span>' : '—'; } }],
        rowActs: function (u) { return '<button class="btn xs" data-rp="' + u.id + '">' + ic('key-round') + 'Reset Sandi</button> <button class="btn xs danger icon" data-del="' + u.id + '" aria-label="Hapus">' + ic('trash-2') + '</button>'; } });
    };
    Data.load('Users', function (rows, c, err) { if (!rows) { $('[data-t]', el).innerHTML = errorBox(err && err.message, true); return; } el._draw(); });
  }
});

// ============================================================ RBAC
var RBAC_GRUP = { dashboard: '1. Dashboard & KPI Eksekutif', client: '2. Client Management & Leads', case: '3. Case / Perkara & Jadwal Sidang', workspace: '4. Workspace: Calendar & Meeting', surat: '5. Administrasi Surat & Penomoran', finance: '6. Finance: Tagihan, Billing & Faktur', people: '7. People Management', knowledge: '8. Knowledge Management', bizdev: '9. Business Development', admin: '11. Administration & Security' };
function rbacTable(rb, edit) {
  var m = rb.matriks;
  var mp = function (g) {
    if (!edit) return '<span class="badge ' + (m[g] === 'none' ? 'bad' : m[g] === 'approve' ? 'warn' : 'info') + '">' + ({ view: 'View Only', none: 'Tidak Ada Akses', approve: 'View + Approval Khusus' }[m[g]] || m[g]) + '</span>';
    if (g === 'dashboard') return '<span class="badge info">View Only (wajib)</span>';
    var ops = g === 'surat' ? ['view', 'approve', 'none'] : g === 'admin' ? ['none'] : ['view', 'none'];
    return '<select class="input sm" data-g="' + g + '">' + ops.map(function (o) { return '<option value="' + o + '"' + (m[g] === o ? ' selected' : '') + '>' + { view: 'View Only', none: 'Tidak Ada Akses', approve: 'View + Approval' }[o] + '</option>'; }).join('') + '</select>';
  };
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Modul Aplikasi</th><th>Super Admin</th><th>Managing Partner</th><th>Klien Portal</th></tr></thead><tbody>' + Object.keys(RBAC_GRUP).map(function (g) {
    return '<tr><td class="small"><b>' + RBAC_GRUP[g] + '</b></td><td><span class="badge pri">' + (g === 'admin' ? 'Akses Penuh Pengaturan' : 'Full Access (C/R/U/D)') + '</span></td><td>' + mp(g) + '</td><td><span class="badge ' + (g === 'case' || g === 'finance' ? 'warn' : '') + '">' + (g === 'case' ? 'Row-Level: Perkara Sendiri' : g === 'finance' ? 'Invoice Milik Sendiri (View/Pay)' : g === 'admin' ? 'Akses Ditolak (403)' : 'Tidak Ada Akses') + '</span></td></tr>';
  }).join('') + '<tr><td class="small"><b>10. Client Portal</b></td><td><span class="badge">Kelola akun</span></td><td><span class="badge">—</span></td><td><span class="badge ok">Data miliknya sendiri</span></td></tr></tbody></table></div>';
}
registerPage('rbac', {
  title: 'RBAC',
  show: function (el) {
    el.innerHTML = pageHead({ crumb: 'Administration &amp; Security', title: 'RBAC / Hak Akses', desc: 'Penetapan batas wewenang per peran. Super Admin selalu penuh; Klien selalu dibatasi row-level ke ID kliennya. Akses Managing Partner per modul dapat diatur di sini (diterapkan di server, bukan hanya menyembunyikan menu).' }) + '<div class="card" data-c>' + skeleton(4) + '</div>';
    swr('rbac', 'rbac.get', {}, function (rb, c, err) {
      if (!rb) { $('[data-c]', el).innerHTML = errorBox(err && err.message, true); return; }
      $('[data-c]', el).innerHTML = rbacTable(rb, true) + '<div class="row mt"><span class="small t2">Pengguna: ' + rb.pengguna.SUPER_ADMIN + ' Super Admin • ' + rb.pengguna.MANAGING_PARTNER + ' Partner • ' + rb.pengguna.KLIEN + ' Klien</span><button class="btn primary right" data-sv>' + ic('save') + 'Simpan Kebijakan</button></div>';
      $('[data-sv]', el).onclick = async function () { var m = {}; $$('[data-g]', el).forEach(function (s) { m[s.dataset.g] = s.value; }); var r = await act(this, 'rbac.save', { matriks: m }); if (r.success) cacheStale('rbac'); };
    }, { fresh: 0 });
  }
});

// ============================================================ LOGS (polling sadar visibilitas, P10)
registerPage('logs', {
  title: 'Log Aktivitas',
  show: function (el) {
    if (!el._init) {
      el._init = true; el._st = { page: 1, per: 25, sel: {} };
      el.innerHTML = pageHead({ crumb: 'Administration &amp; Security', title: 'Log Aktivitas (Audit Trail)', desc: 'Jejak siapa mengubah data apa dan kapan. Log non-kritis ditulis per menit (antre) agar aplikasi tetap cepat; antrean yang belum ditulis tetap tampil.', acts: '<label class="check small"><input type="checkbox" data-live checked> Live (15 dtk)</label><button class="btn" data-csv>' + ic('download') + 'CSV</button>' }) +
        '<div class="card pad-0"><div class="toolbar"><div class="input-ic">' + ic('search') + '<input class="input" data-q placeholder="Cari pengguna, aksi, ID…"></div></div><div data-t></div></div>';
      $('[data-q]', el).oninput = debounce(function (e) { el._q = e.target.value.toLowerCase(); el._draw(); }, 250);
      on(el, 'click', '[data-csv]', function () { saveBlob(new Blob([toCsv(el._rows || [], ['waktu', 'email', 'role', 'aksi', 'tabel', 'refId', 'detail'])], { type: 'text/csv' }), 'log_' + today() + '.csv'); });
    }
    el._draw = function () {
      var rows = (el._rows || []).filter(function (r) { return !el._q || JSON.stringify(r).toLowerCase().indexOf(el._q) > -1; }), host = $('[data-t]', el);
      host._o = { redraw: el._draw, visible: function () { return []; } };
      renderTable(host, { rows: rows, state: el._st, cols: [{ k: 'waktu', l: 'Waktu', render: function (r) { return '<span class="mono xs">' + esc(String(r.waktu).replace('T', ' ').slice(0, 19)) + '</span>' + (r.antre ? ' <span class="badge">antre</span>' : ''); } },
        { k: 'email', l: 'Pengguna', render: function (r) { return '<span class="small">' + esc(r.email) + '</span>'; } }, { k: 'role', l: 'Peran', render: function (r) { return r.role ? roleBadge(r.role) : '—'; } },
        { k: 'aksi', l: 'Aksi', render: function (r) { return '<span class="mono xs">' + esc(r.aksi) + '</span>'; } }, { k: 'tabel', l: 'Data', render: function (r) { return esc(r.tabel || '') + ' <span class="mono xs muted">' + esc(r.refId || '') + '</span>'; } },
        { k: 'detail', l: 'Detail', nosort: 1, render: function (r) { return '<span class="xs muted ellip" style="display:inline-block;max-width:320px">' + esc(r.detail || '') + '</span>'; } }] });
    };
    var load = function (force) { swr('logs', 'logs', { limit: 400 }, function (d) { if (d) { el._rows = d.rows; el._draw(); } }, { fresh: force ? 0 : 15000 }); };
    load();
    clearTimeout(el._poll);
    var tick = function () { if (AppState.route !== 'logs') return; if (document.visibilityState === 'visible' && $('[data-live]', el).checked) load(true); el._poll = setTimeout(tick, 15000); };
    el._poll = setTimeout(tick, 15000);
  }
});

// ============================================================ PENGATURAN
registerPage('settings', {
  title: 'Pengaturan Sistem',
  show: function (el) {
    el.innerHTML = pageHead({ crumb: 'Administration &amp; Security', title: 'Pengaturan Sistem', desc: 'Konfigurasi umum: identitas kantor (kop & faktur), rekening, format nomor, login Google, URL aplikasi, jadwal backup & pengingat.', acts: '<button class="btn primary" data-sv>' + ic('save') + 'Simpan Perubahan</button>' }) +
      '<div class="tint mb small">' + ic('info') + ' <b>Login Google:</b> buat OAuth Client ID (Web) di Google Cloud Console → Authorized JavaScript origins = alamat GitHub Pages Anda (mis. https://username.github.io) → tempel di <b>GOOGLE_CLIENT_ID</b>. <b>APP_URL</b> = alamat frontend (dipakai tautan notifikasi & QR verifikasi).</div><div class="card pad-0" data-c>' + skeleton(6) + '</div>';
    swr('settings', 'settings.get', {}, function (rows, c, err) {
      if (!rows) { $('[data-c]', el).innerHTML = errorBox(err && err.message, true); return; }
      var grp = function (k) { return /^INSTITUSI|^REKENING|APP_NAME/.test(k) ? 'Identitas Kantor' : /NOTIF|WA_|EMAIL_|CRM/.test(k) ? 'Notifikasi (lihat menu Notifikasi)' : /GOOGLE|APP_URL|VERIFIKASI|SESSION/.test(k) ? 'Login & Integrasi' : 'Operasional'; };
      var groups = {}; rows.forEach(function (r) { (groups[grp(r.key)] = groups[grp(r.key)] || []).push(r); });
      $('[data-c]', el).innerHTML = Object.keys(groups).map(function (g) { return '<div class="toolbar"><b>' + g + '</b></div><div style="padding:6px 16px 14px" class="form-grid">' + groups[g].map(function (r) { return '<div class="field"><label class="mono" style="font-size:11.5px">' + esc(r.key) + '</label><input class="input" data-k="' + esc(r.key) + '" value="' + esc(r.value) + '"' + (/NOTIF_(WA|EMAIL)_AKTIF/.test(r.key) ? ' disabled' : '') + '><div class="help">' + esc(r.keterangan || '') + '</div></div>'; }).join('') + '</div>'; }).join('');
      el._orig = {}; rows.forEach(function (r) { el._orig[r.key] = String(r.value); });
    }, { fresh: 0 });
    $('[data-sv]', el).onclick = async function () {
      var items = {}; $$('[data-k]', el).forEach(function (i) { if (!i.disabled && i.value !== el._orig[i.dataset.k]) items[i.dataset.k] = i.value; });
      if (!Object.keys(items).length) return toast('Tidak ada perubahan.', 'warn');
      var r = await act(this, 'settings.save', { items: items }); if (r.success) { cacheStale('settings'); Store.del('pubcfg'); revalidateBoot(); }
    };
  }
});

// ============================================================ BACKUP
registerPage('backup', {
  title: 'Backup / Keamanan',
  show: function (el) {
    el.innerHTML = pageHead({ crumb: 'Administration &amp; Security', title: 'Backup &amp; Keamanan', desc: 'Salinan spreadsheet database dibuat otomatis tiap hari ke folder Backup di Google Drive (retensi sesuai pengaturan). Pulihkan dengan membuka salinan lalu mengganti SPREADSHEET_ID bila diperlukan.',
      acts: '<button class="btn" data-int>' + ic('stethoscope') + 'Uji Integritas Basis Data</button><button class="btn" data-trg>' + ic('timer') + 'Pasang Ulang Trigger</button><button class="btn primary" data-bk>' + ic('cloud-upload') + 'Backup Sekarang</button>' }) + '<div class="split"><div class="card pad-0" data-l>' + skeleton(4) + '</div><div class="col" style="gap:16px"><div class="card" data-s></div><div data-i></div></div></div>';
    var load = function () {
      swr('bk', 'backup.list', {}, function (rows) {
        if (!rows) return;
        $('[data-l]', el).innerHTML = '<div class="toolbar"><b>Arsip Snapshot</b><span class="count right">' + rows.length + '</span></div>' + (rows.map(function (b) { return '<div class="row" style="padding:12px 16px;border-bottom:1px solid var(--line)">' + ic('file-spreadsheet') + '<div class="grow"><b class="small mono">' + esc(b.nama) + '</b><div class="xs muted">' + tglJam(b.tanggal) + '</div></div><a class="btn xs" target="_blank" rel="noopener" href="' + esc(b.url) + '">' + ic('external-link') + 'Buka</a></div>'; }).join('') || emptyState('Belum ada backup', 'Klik Backup Sekarang.', 'database'));
      }, { fresh: 0 });
      swr('sys', 'system.status', {}, function (s) {
        if (!s) return;
        $('[data-s]', el).innerHTML = '<h3 class="h-sm mb">Status Sistem</h3><dl class="dl"><dt>Skema database</dt><dd>v' + s.schema + (s.schema !== s.schemaKode ? ' <span class="badge warn">Kode v' + s.schemaKode + ' — jalankan setupAppEnvironment()</span>' : ' <span class="badge ok">Terbaru</span>') + '</dd><dt>Trigger</dt><dd class="small">' + (s.triggers.map(function (t) { return '<span class="badge ok">' + esc(t) + '</span>'; }).join(' ') || '<span class="badge bad">Tidak ada</span>') + '</dd><dt>Kuota email</dt><dd>' + s.emailQuota + '</dd><dt>Script Properties</dt><dd>' + s.propsKB + ' KB / 500 KB</dd><dt>Database</dt><dd><a target="_blank" rel="noopener" href="' + esc(s.spreadsheetUrl) + '">Buka Spreadsheet</a></dd><dt>Folder Drive</dt><dd><a target="_blank" rel="noopener" href="' + esc(s.folderUrl) + '">Buka Folder</a></dd></dl>' +
          '<div class="sec-t">Jumlah baris per tabel</div><div class="row wrap gap-s">' + Object.keys(s.counts).map(function (t) { return '<span class="badge">' + esc(t) + ' ' + s.counts[t] + '</span>'; }).join('') + '</div>';
      }, { fresh: 0 });
    };
    load();
    $('[data-bk]', el).onclick = async function () { var r = await act(this, 'backup.now', {}); if (r.success) load(); };
    $('[data-trg]', el).onclick = function () { act(this, 'system.triggers', {}).then(load); };
    $('[data-int]', el).onclick = async function () { var r = await withBusy(this, function () { return api('system.integrity', {}); }); if (!r.success) return toast(r.message, 'bad'); $('[data-i]', el).innerHTML = '<div class="card"><h3 class="h-sm">' + (r.data.ok ? ic('circle-check') + ' Struktur valid' : ic('circle-alert') + ' Ditemukan masalah') + '</h3><div class="xs muted mb">' + r.data.dicek + ' tabel dicek</div>' + (r.data.masalah.map(function (m) { return '<div class="small mb">' + badge(m.tingkat === 'error' ? 'Error' : 'Peringatan', m.tingkat === 'error' ? 'bad' : 'warn') + ' ' + esc(m.pesan) + '</div>'; }).join('') || '<div class="small ok">Tidak ada referensi yatim atau ID ganda.</div>') + '</div>'; };
  }
});

// ============================================================ NOTIFIKASI WA & EMAIL (3 tab)
var NotifSt = { tab: 'blast', aud: null, blastId: '', auto: false };
registerPage('notifikasi', {
  title: 'Notifikasi WA & Email',
  show: function (el) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = pageHead({ crumb: 'Administration • Notifikasi', title: 'WhatsApp &amp; Notifikasi', desc: 'Notifikasi otomatis (sidang, invoice, disposisi, approval…) lewat antrean; blast WhatsApp per batch anti-banned; konfigurasi Fonnte & email.' }) +
        '<div class="seg mb" data-tab><button data-k="blast">📣 Blast WhatsApp</button><button data-k="queue">📬 Antrean &amp; Riwayat</button><button data-k="config">⚙️ Konfigurasi</button></div><div data-c></div>';
      on(el, 'click', '[data-tab] button', function (e, b) { NotifSt.tab = b.dataset.k; refreshView(); });
    }
    $$('[data-tab] button', el).forEach(function (b) { b.classList.toggle('on', b.dataset.k === NotifSt.tab); });
    var host = $('[data-c]', el);
    if (NotifSt.tab === 'config') return notifConfig(host);
    if (NotifSt.tab === 'queue') return notifQueue(host);
    notifBlast(host);
  }
});
function notifConfig(host) {
  host = fresh(host);
  host.innerHTML = skeleton(4);
  api('notif.config', {}).then(function (r) {
    if (!r.success) { host.innerHTML = errorBox(r.message, true); return; }
    var c = r.data, grup = {};
    Object.keys(c.matriks).forEach(function (k) { var m = c.matriks[k]; (grup[m.grup] = grup[m.grup] || []).push(m); });
    host.innerHTML = '<div class="grid g2 mb"><div class="card"><div class="row"><h3 class="h-sm grow">' + ic('message-circle') + ' WhatsApp (Fonnte)</h3><label class="switch ok"><input type="checkbox" id="waOn"' + (c.waAktif ? ' checked' : '') + '><span></span></label></div><div class="xs muted mb">Saklar utama — ' + (c.waAktif ? '<b class="ok">AKTIF</b>' : 'NONAKTIF') + '</div>' +
      '<div class="field"><label>Token Fonnte</label><input class="input mono" id="tok" type="password" placeholder="' + esc(c.tokenMask || 'Tempel token dari fonnte.com → Device') + '" autocomplete="off"><div class="help">Disimpan di Script Properties (tidak di sheet, tidak dikirim ke browser). Kosongkan = tidak diubah.' + (c.adaToken ? ' <a href="#" id="hapusTok">Hapus token</a>' : '') + '</div></div>' +
      '<div class="row mt-s wrap"><button class="btn sm" id="dev">' + ic('radio-tower') + 'Cek Perangkat</button><input class="input sm" id="tnum" placeholder="08xxxx" style="width:140px"><button class="btn sm" id="twa">Kirim Tes WA</button></div><div id="devinfo" class="xs mt-s"></div>' +
      '<div class="form-grid mt"><div class="field"><label>Ukuran batch blast</label><div class="seg" id="bd">' + [10, 20, 50].map(function (n) { return '<button type="button" data-n="' + n + '" class="' + (c.batchDefault === n ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div></div><div class="field"><label>Jeda antarpesan (detik)</label><input class="input" id="jeda" value="' + esc(c.jeda) + '" placeholder="5 atau 3-8"></div></div>' +
      '<label class="check small mt">' + '<input type="checkbox" id="det"' + (c.deteksiOtomatis ? ' checked' : '') + '> Deteksi otomatis nomor terdaftar WhatsApp (tiap ±10 menit)</label></div>' +
      '<div class="card"><div class="row"><h3 class="h-sm grow">' + ic('mail') + ' Email</h3><label class="switch ok"><input type="checkbox" id="emOn"' + (c.emailAktif ? ' checked' : '') + '><span></span></label></div><div class="xs muted mb">Sisa kuota hari ini: <b>' + c.emailQuota + '</b> (Gmail biasa ±100/hari, Workspace ±1.500/hari)</div>' +
      '<div class="field"><label>Nama pengirim</label><input class="input" id="np" value="' + esc(c.namaPengirim) + '"></div><div class="row mt-s"><input class="input sm" id="tem" placeholder="email@contoh.com"><button class="btn sm" id="tes">Kirim Tes Email</button></div>' +
      '<div class="field mt"><label>URL aplikasi (untuk {link})</label><input class="input" id="url" value="' + esc(c.appUrl) + '" placeholder="https://username.github.io/simlawfirm/"></div><div class="xs mt-s">Trigger pemroses antrean: ' + (c.trigger ? '<span class="badge ok">aktif tiap 1 menit</span>' : '<span class="badge bad">belum terpasang — simpan konfigurasi</span>') + '</div></div></div>' +
      '<div class="card pad-0"><div class="toolbar"><h3 class="h-sm grow">Matriks Notifikasi Otomatis</h3><span class="xs muted">Kolom kanal nonaktif bila saklar utamanya mati</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th style="width:80px">WA</th><th style="width:80px">Email</th><th style="width:90px"></th></tr></thead><tbody>' +
      Object.keys(grup).map(function (g) { return '<tr><td colspan="4" class="lbl" style="background:var(--surface-2)">' + esc(g) + '</td></tr>' + grup[g].map(function (m) {
        return '<tr data-ev="' + m.kode + '"><td><b class="small">' + esc(m.label) + '</b><div class="mono xs muted">' + m.kode + '</div></td><td><label class="switch"><input type="checkbox" data-wa' + (m.wa ? ' checked' : '') + '><span></span></label></td><td><label class="switch"><input type="checkbox" data-em' + (m.email ? ' checked' : '') + '><span></span></label></td><td><button class="btn xs" data-edit>' + ic('pencil') + 'Ubah</button></td></tr>' +
          '<tr data-tpl="' + m.kode + '" hidden><td colspan="4"><div class="form-grid"><div class="field full"><label>Subjek email</label><input class="input sm" data-subj value="' + esc(m.subjek) + '"></div><div class="field"><label>Isi pesan</label><textarea class="input" data-pesan rows="6">' + esc(m.pesan) + '</textarea><div class="help">Variabel: ' + m.vars.map(function (v) { return '<code>' + esc(v) + '</code>'; }).join(' ') + '</div></div><div class="field"><label>Pratinjau</label><div class="wa-preview" data-prev></div><button class="btn xs mt-s" data-reset>↺ Kembalikan bawaan</button></div></div></td></tr>';
      }).join(''); }).join('') + '</tbody></table></div></div><div class="row mt"><button class="btn primary right" id="save">' + ic('save') + 'Simpan Konfigurasi</button></div>';
    var prev = function (tr) { var p = $('[data-pesan]', tr).value.replace(/\{nama\}/g, 'Bapak Bambang').replace(/\{institusi\}/g, AppState.settings.institusi || 'SIMLAWFIRM').replace(/\{link\}/g, c.appUrl || 'https://…'); $('[data-prev]', tr).textContent = p; };
    on(host, 'click', '[data-edit]', function (e, b) { var k = b.closest('tr').dataset.ev, tr = $('[data-tpl="' + k + '"]', host); tr.hidden = !tr.hidden; prev(tr); });
    on(host, 'input', '[data-pesan]', function (e, t) { prev(t.closest('tr')); });
    on(host, 'click', '[data-reset]', function (e, b) { var tr = b.closest('tr'), m = c.matriks[tr.dataset.tpl]; $('[data-pesan]', tr).value = m.pesanDefault; $('[data-subj]', tr).value = m.subjekDefault; prev(tr); });
    on(host, 'click', '#bd button', function (e, b) { $$('#bd button', host).forEach(function (x) { x.classList.toggle('on', x === b); }); });
    var syncSw = function () { $$('[data-wa]', host).forEach(function (i) { i.disabled = !$('#waOn', host).checked; }); $$('[data-em]', host).forEach(function (i) { i.disabled = !$('#emOn', host).checked; }); };
    $('#waOn', host).onchange = $('#emOn', host).onchange = syncSw; syncSw();
    var ht = $('#hapusTok', host); if (ht) ht.onclick = async function (e) { e.preventDefault(); if (await confirmBox('Hapus token Fonnte? WhatsApp otomatis nonaktif.', { danger: true })) { await act(null, 'notif.configSave', { token: '__HAPUS__', waAktif: false, emailAktif: $('#emOn', host).checked }); notifConfig(host); } };
    $('#dev', host).onclick = async function () { var r = await withBusy(this, function () { return api('wa.device', {}); }); $('#devinfo', host).innerHTML = r.success ? '<span class="badge ' + (r.data.device_status === 'connect' ? 'ok' : 'bad') + '">' + esc(r.data.device_status || '?') + '</span> ' + esc(r.data.device || '') + ' • paket ' + esc(r.data.package || '-') + ' • kuota ' + esc(r.data.quota || '-') : '<span class="bad">' + esc(r.message) + '</span>'; };
    $('#twa', host).onclick = function () { act(this, 'wa.test', { nomor: $('#tnum', host).value }); };
    $('#tes', host).onclick = function () { act(this, 'email.test', { email: $('#tem', host).value }); };
    $('#save', host).onclick = async function () {
      var mat = {}; $$('tr[data-ev]', host).forEach(function (tr) { var k = tr.dataset.ev, t = $('[data-tpl="' + k + '"]', host); mat[k] = { wa: $('[data-wa]', tr).checked, email: $('[data-em]', tr).checked, pesan: $('[data-pesan]', t).value, subjek: $('[data-subj]', t).value }; });
      var r = await act(this, 'notif.configSave', { waAktif: $('#waOn', host).checked, emailAktif: $('#emOn', host).checked, token: $('#tok', host).value.trim(), batchDefault: +(($('#bd button.on', host) || {}).dataset || {}).n || 20, jeda: $('#jeda', host).value.trim(), deteksiOtomatis: $('#det', host).checked, namaPengirim: $('#np', host).value, appUrl: $('#url', host).value.trim(), matriks: mat });
      if (r.success) notifConfig(host);
    };
  });
}
function notifQueue(host) {
  host = fresh(host);
  host.innerHTML = skeleton(4);
  var load = function (f) {
    api('notif.queue', f || {}).then(function (r) {
      if (!r.success) { host.innerHTML = errorBox(r.message, true); return; }
      var k = r.data.ringkas;
      host.innerHTML = '<div class="grid g4 keep mb">' + kpi({ label: 'Menunggu', value: k.Antri || 0, icon: 'hourglass' }) + kpi({ label: 'Terkirim', value: k.Terkirim || 0, icon: 'circle-check', tone: 'ok' }) + kpi({ label: 'Gagal', value: k.Gagal || 0, icon: 'circle-x', tone: 'bad' }) + kpi({ label: 'Dibatalkan', value: k.Batal || 0, icon: 'ban' }) + '</div>' +
        '<div class="card pad-0"><div class="toolbar"><select class="input" id="fs"><option value="">Semua status</option><option>Antri</option><option>Terkirim</option><option>Gagal</option><option>Batal</option></select><select class="input" id="fk"><option value="">Semua kanal</option><option>WA</option><option>EMAIL</option></select><div class="sp"></div><button class="btn sm" id="pn">' + ic('play') + 'Proses Sekarang</button><button class="btn sm" id="rt">' + ic('rotate-ccw') + 'Ulangi yang Gagal</button></div>' +
        '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Waktu</th><th>Kanal</th><th>Tujuan</th><th>Event</th><th>Pesan</th><th>Status</th></tr></thead><tbody>' + (r.data.rows.map(function (x) {
          return '<tr><td data-l="Waktu" class="mono xs">' + esc(String(x.DikirimPada || x.DibuatPada).replace('T', ' ').slice(0, 16)) + '</td><td data-l="Kanal"><span class="badge ' + (x.Kanal === 'WA' ? 'ok' : 'info') + '">' + x.Kanal + '</span></td><td data-l="Tujuan"><div class="small">' + esc(x.NamaPenerima || '') + '</div><div class="mono xs muted">' + esc(x.Tujuan) + '</div></td><td data-l="Event" class="mono xs">' + esc(x.Event) + '</td><td data-l="Pesan" class="xs t2" style="max-width:300px">' + esc(x.Pesan) + '</td><td data-l="Status">' + badge(x.Status) + (x.Respon ? '<div class="xs muted">' + esc(x.Respon) + '</div>' : '') + '</td></tr>';
        }).join('') || '<tr><td colspan="9">' + emptyState('Antrean kosong', 'Belum ada notifikasi.', 'send') + '</td></tr>') + '</tbody></table></div></div>';
      $('#fs', host).value = (f || {}).status || ''; $('#fk', host).value = (f || {}).kanal || '';
      $('#fs', host).onchange = $('#fk', host).onchange = function () { load({ status: $('#fs', host).value, kanal: $('#fk', host).value }); };
      $('#pn', host).onclick = async function () { await act(this, 'notif.processNow', {}); load(f); };
      $('#rt', host).onclick = async function () { await act(this, 'notif.retry', {}); load(f); };
    });
  };
  load();
}
function notifBlast(host) {
  host = fresh(host);
  var cfgBatch = 20, cfgJeda = '5';
  host.innerHTML = '<div class="grid g2 mb"><div class="card"><h3 class="h-sm mb">1. Pilih Sasaran</h3><div class="form-grid"><div class="field"><label>Sumber</label><select class="input" id="src"><option value="crm">CRM Kontak</option><option value="manual">Manual (tempel nomor)</option></select></div><div class="field" id="segf"><label>Segmen</label><select class="input" id="seg"><option value="">Semua segmen</option></select></div></div>' +
    '<textarea class="input mt-s" id="man" rows="4" hidden placeholder="08123456789|Nama Penerima (satu per baris)"></textarea><div class="row mt-s wrap"><button class="btn sm primary" id="load">' + ic('users') + 'Muat Penerima</button><button class="btn sm" id="det">' + ic('smartphone') + 'Deteksi Nomor WA</button><span class="xs muted" id="detp"></span></div>' +
    '<div class="row wrap gap-s mt" id="ring"></div><label class="check small mt-s"><input type="checkbox" id="onlywa"> Kirim hanya ke nomor terdeteksi WhatsApp</label><div id="tbl" class="mt-s" style="max-height:320px;overflow:auto"></div></div>' +
    '<div class="card"><h3 class="h-sm mb">2. Tulis Pesan</h3><div class="field"><label>Judul internal</label><input class="input" id="jud" placeholder="mis. Undangan Webinar Arbitrase"></div><div class="row wrap gap-s mt-s">' + ['{nama}', '{institusi}', '{link}'].map(function (v) { return '<button class="chip" data-ins="' + v + '">' + v + '</button>'; }).join('') + '</div>' +
    '<textarea class="input mt-s" id="psn" rows="6" placeholder="Yth. {nama}, …"></textarea><div class="lbl mt">Pratinjau</div><div class="wa-preview mt-s" id="prv">—</div>' +
    '<h3 class="h-sm mt mb">3. Ukuran Batch &amp; Jeda</h3><div class="row wrap"><div class="seg" id="ub">' + [10, 20, 50].map(function (n) { return '<button data-n="' + n + '">' + n + '</button>'; }).join('') + '</div><input class="input sm" id="jd" style="width:110px" placeholder="jeda 5 / 3-8"></div><div class="small t2 mt-s" id="est"></div><button class="btn primary block mt" id="go">' + ic('rocket') + 'Mulai Blast</button></div></div>' +
    '<div id="active"></div><div class="card pad-0"><div class="toolbar"><h3 class="h-sm grow">Riwayat Blast</h3><button class="btn sm" id="rl">' + ic('refresh-cw') + '</button></div><div id="hist">' + skeleton(2) + '</div></div>';
  var aud = NotifSt.aud;
  api('notif.config', {}).then(function (r) { if (r.success) { cfgBatch = r.data.batchDefault; cfgJeda = r.data.jeda; $('#jd', host).value = cfgJeda; $$('#ub button', host).forEach(function (b) { b.classList.toggle('on', +b.dataset.n === cfgBatch); }); est(); } });
  var penerima = function () { if (!aud) return []; var only = $('#onlywa', host).checked; return aud.rows.filter(function (r) { return r.valid && !r.ganda && !r.optOut && r.pilih !== false && (!only || r.statusWA === 'Terdaftar'); }); };
  var est = function () { var n = penerima().length, b = +(($('#ub button.on', host) || {}).dataset || { n: cfgBatch }).n, j = String($('#jd', host).value || cfgJeda).split('-').map(Number), rata = j.length > 1 ? (j[0] + j[1]) / 2 : j[0] || 5; $('#est', host).textContent = n + ' penerima → ' + Math.ceil(n / b) + ' batch • ±' + Math.max(1, Math.round(n * rata / 60)) + ' menit'; $('#go', host).innerHTML = ic('rocket') + 'Mulai Blast (' + n + ' nomor)'; };
  var prv = function () { var p = penerima()[0] || { nama: 'Bapak/Ibu' }; $('#prv', host).textContent = ($('#psn', host).value || '—').replace(/\{nama\}/g, p.nama || 'Bapak/Ibu').replace(/\{institusi\}/g, AppState.settings.institusi || '').replace(/\{link\}/g, AppState.settings.appUrl || ''); };
  var drawAud = function () {
    if (!aud) return; var k = aud.ringkas;
    $('#seg', host).innerHTML = '<option value="">Semua segmen</option>' + aud.segmen.map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
    $('#ring', host).innerHTML = ['total', 'valid', 'tidakValid', 'ganda', 'terdaftarWA', 'optOut'].map(function (x) { return '<span class="badge ' + (x === 'valid' || x === 'terdaftarWA' ? 'ok' : x === 'tidakValid' || x === 'ganda' ? 'bad' : '') + '">' + { total: 'Total', valid: 'Valid', tidakValid: 'Tidak valid', ganda: 'Ganda', terdaftarWA: 'Terdaftar WA', optOut: 'Opt-out' }[x] + ' ' + k[x] + '</span>'; }).join('');
    $('#tbl', host).innerHTML = '<table class="tbl"><tbody>' + aud.rows.slice(0, 500).map(function (r, i) { return '<tr style="' + (!r.valid || r.ganda || r.optOut ? 'opacity:.45' : '') + '"><td class="chk"><input type="checkbox" data-pi="' + i + '"' + (r.pilih !== false && r.valid && !r.ganda && !r.optOut ? ' checked' : '') + (!r.valid || r.ganda || r.optOut ? ' disabled' : '') + '></td><td class="small">' + esc(r.nama || '-') + '</td><td class="mono xs">' + esc(r.hp) + '</td><td>' + (r.statusWA === 'Terdaftar' ? '<span class="badge ok">✓ WA</span>' : r.statusWA === 'Tidak Terdaftar' ? '<span class="badge bad">✕ bukan WA</span>' : '<span class="badge">? belum dicek</span>') + '</td></tr>'; }).join('') + '</tbody></table>';
    est(); prv();
  };
  drawAud();
  $('#src', host).onchange = function () { var m = this.value === 'manual'; $('#man', host).hidden = !m; $('#segf', host).style.visibility = m ? 'hidden' : ''; };
  $('#load', host).onclick = async function () { var r = await withBusy(this, function () { return api('wa.audience', { sumber: $('#src', host).value, segmen: $('#seg', host).value, manual: $('#man', host).value }); }); if (!r.success) return toast(r.message, 'bad'); var seg = $('#seg', host).value; aud = NotifSt.aud = r.data; drawAud(); $('#seg', host).value = seg; };
  $('#det', host).onclick = async function () {
    if (!aud) return toast('Muat penerima dahulu.', 'warn');
    var nums = aud.rows.filter(function (r) { return r.valid && !r.statusWA; }).map(function (r) { return r.hp; }), b = this;
    b.classList.add('busy');
    for (var i = 0; i < nums.length; i += 50) {
      $('#detp', host).textContent = 'Mengecek ' + Math.min(i + 50, nums.length) + '/' + nums.length;
      var r = await api('wa.validate', { nomor: nums.slice(i, i + 50) });
      if (!r.success) { toast(r.message, 'bad'); break; }
      aud.rows.forEach(function (x) { if (r.data.hasil[x.hp]) x.statusWA = r.data.hasil[x.hp]; });
    }
    b.classList.remove('busy'); aud.ringkas.terdaftarWA = aud.rows.filter(function (x) { return x.statusWA === 'Terdaftar'; }).length; drawAud();
  };
  on(host, 'change', '[data-pi]', function (e, c) { aud.rows[+c.dataset.pi].pilih = c.checked; est(); });
  $('#onlywa', host).onchange = est;
  on(host, 'click', '[data-ins]', function (e, b) { var t = $('#psn', host), p = t.selectionStart || t.value.length; t.value = t.value.slice(0, p) + b.dataset.ins + t.value.slice(p); t.focus(); prv(); });
  $('#psn', host).oninput = prv;
  on(host, 'click', '#ub button', function (e, b) { $$('#ub button', host).forEach(function (x) { x.classList.toggle('on', x === b); }); est(); });
  $('#jd', host).oninput = est;
  $('#go', host).onclick = async function () {
    var list = penerima(); if (!list.length) return toast('Belum ada penerima valid.', 'warn');
    if (!(await confirmBox('Mulai blast ke ' + list.length + ' nomor? Server mengirim 1 batch per menit walau halaman ditutup.', { ok: 'Mulai Blast' }))) return;
    var r = await act(this, 'wa.blastCreate', { judul: $('#jud', host).value, pesan: $('#psn', host).value, ukuranBatch: +($('#ub button.on', host) || { dataset: { n: 20 } }).dataset.n, jeda: $('#jd', host).value || cfgJeda, sasaran: $('#seg', host).value || $('#src', host).value, penerima: list.map(function (x) { return { id: x.id, hp: x.hp, nama: x.nama }; }) });
    if (r.success) { NotifSt.blastId = r.data.blastId; hist(); }
  };
  var hist = function () {
    api('wa.blastList', {}).then(function (r) {
      if (!r.success) return;
      var act0 = r.data.filter(function (b) { return b.Status === 'Berjalan'; })[0];
      $('#active', host).innerHTML = act0 ? '<div class="card mb"><div class="row wrap"><h3 class="h-sm grow">' + ic('rocket') + ' Blast berjalan: ' + esc(act0.Judul) + '</h3><span class="small">' + act0.Terkirim + ' terkirim • ' + act0.Gagal + ' gagal • ' + act0.sisa + ' sisa</span></div>' + meter(act0.persen) +
        '<div class="row wrap mt"><button class="btn sm primary" data-next="' + act0.BlastID + '">' + ic('play') + 'Kirim Batch Berikutnya Sekarang</button><label class="check small"><input type="checkbox" id="auto"' + (NotifSt.auto ? ' checked' : '') + '> Otomatis</label><button class="btn sm danger" data-stop="' + act0.BlastID + '">' + ic('square') + 'Hentikan</button></div><div class="xs muted mt-s">Server tetap mengirim 1 batch/menit walau halaman ditutup.</div></div>' : '';
      $('#hist', host).innerHTML = '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Judul</th><th>Sasaran</th><th>Batch • Jeda</th><th>Progres</th><th>Status</th><th></th></tr></thead><tbody>' + (r.data.map(function (b) { return '<tr><td data-l="Judul"><b class="small">' + esc(b.Judul) + '</b><div class="xs muted">' + tglJam(b.Tanggal) + '</div></td><td data-l="Sasaran" class="small">' + esc(b.Sasaran || '-') + '</td><td data-l="Batch" class="small">' + b.UkuranBatch + ' • ' + esc(b.JedaDetik) + ' dtk</td><td data-l="Progres" style="min-width:140px">' + meter(b.persen, b.Gagal ? 'warn' : 'ok') + '<div class="xs">' + b.Terkirim + '/' + b.Total + '</div></td><td data-l="Status">' + badge(b.Status) + '</td><td class="acts">' + (b.Status === 'Berjalan' ? '<button class="btn xs danger" data-stop="' + b.BlastID + '">Hentikan</button>' : '') + '</td></tr>'; }).join('') || '<tr><td colspan="9">' + emptyState('Belum ada blast', '') + '</td></tr>') + '</tbody></table></div>';
      var au = $('#auto', host); if (au) au.onchange = function () { NotifSt.auto = au.checked; if (au.checked) autoTick(); };
    });
  };
  var autoTick = async function () { if (!NotifSt.auto || AppState.route !== 'notifikasi') return; var b = $('[data-next]', host); if (!b) { NotifSt.auto = false; return; } await api('wa.blastProcess', { blastId: b.dataset.next }); hist(); setTimeout(autoTick, 45000); };
  on(host, 'click', '[data-next]', async function (e, b) { await act(b, 'wa.blastProcess', { blastId: b.dataset.next }); hist(); });
  on(host, 'click', '[data-stop]', async function (e, b) { if (await confirmBox('Hentikan blast? Pesan yang belum terkirim dibatalkan.', { danger: true })) { await act(b, 'wa.blastStop', { blastId: b.dataset.stop }); hist(); } });
  $('#rl', host).onclick = hist;
  hist();
}

// ============================================================ CRM KONTAK
var CrmSt = { hal: 1, f: {}, sel: {} };
registerPage('crm', {
  title: 'CRM Kontak',
  show: function (el) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = pageHead({ crumb: 'Business Development • CRM', title: 'CRM Kontak', desc: 'Satu layar untuk memonitor seluruh kontak (Nama · Email · WhatsApp) dari klien, calon klien, tim, peserta pelatihan, prospek, dan mitra — kualitas data, status WA, dan riwayat dihubungi.',
        acts: '<span class="xs muted" data-sync-t></span><button class="btn" data-sync>' + ic('refresh-cw') + 'Sinkron Sekarang</button><button class="btn" data-dup>' + ic('copy') + 'Periksa Duplikat</button><button class="btn" data-imp>' + ic('upload') + 'Import CSV</button><button class="btn" data-exp>' + ic('download') + 'Ekspor</button>' }) +
        '<div data-kpi class="mb"></div><div class="card pad-0"><div class="toolbar"><div class="input-ic">' + ic('search') + '<input class="input" data-q placeholder="Cari nama, email, nomor…"></div><select class="input" data-f="segmen"><option value="">Semua segmen</option></select><select class="input" data-f="statusWA"><option value="">Status WA</option><option>Terdaftar</option><option>Tidak Terdaftar</option><option>Belum Dicek</option></select><select class="input" data-f="optOut"><option value="">Opt-out: semua</option><option value="YA">Opt-out</option><option value="TIDAK">Aktif</option></select></div><div data-bulk></div><div data-t>' + skeleton(6) + '</div></div>';
      $('[data-q]', el).oninput = debounce(function (e) { CrmSt.f.cari = e.target.value; CrmSt.hal = 1; el._load(); }, 350);
      on(el, 'change', '[data-f]', function (e, s) { CrmSt.f[s.dataset.f] = s.value; CrmSt.hal = 1; el._load(); });
      on(el, 'click', '[data-kf]', function (e, k) { CrmSt.f = JSON.parse(k.dataset.kf); CrmSt.hal = 1; el._load(); });
      on(el, 'click', '[data-pg]', function (e, b) { CrmSt.hal = +b.dataset.pg; el._load(); });
      on(el, 'change', '[data-cs]', function (e, c) { CrmSt.sel[c.dataset.cs] = c.checked; el._bulk(); });
      on(el, 'click', '[data-sync]', async function (e, b) { var r = await act(b, 'crm.sync', {}); if (r.success) el._load(true); });
      on(el, 'click', '[data-ba]', async function (e, b) {
        var ids = Object.keys(CrmSt.sel).filter(function (k) { return CrmSt.sel[k]; }), a = b.dataset.ba, nilai = '';
        if (a === 'blast') { NotifSt.tab = 'blast'; NotifSt.aud = { rows: (el._rows || []).filter(function (r) { return ids.indexOf(r.KontakID) > -1; }).map(function (r) { return { id: r.KontakID, nama: r.Nama, hp: r.NoWA, statusWA: r.StatusWA, valid: /^08\d{8,12}$/.test(r.NoWA), ganda: false, optOut: r.OptOut === 'YA' }; }), ringkas: { total: ids.length, valid: 0, tidakValid: 0, ganda: 0, terdaftarWA: 0, optOut: 0 }, segmen: [] }; return go('notifikasi'); }
        if (a === 'tag') { nilai = await confirmBox('Beri tag pada ' + ids.length + ' kontak.', { input: 'Nama tag', ok: 'Terapkan' }); if (!nilai) return; }
        var r = await act(b, 'crm.bulk', { ids: ids, aksi: a, nilai: nilai }); if (r.success) { CrmSt.sel = {}; el._load(true); }
      });
      on(el, 'click', '[data-kt]', function (e, tr) { if (e.target.closest('input,a,button')) return; crmDetail(tr.dataset.kt, function () { el._load(true); }); });
      on(el, 'click', '[data-imp]', function () { crmImport(function () { el._load(true); }); });
      on(el, 'click', '[data-exp]', async function (e, b) { var r = await withBusy(b, function () { return api('crm.export', CrmSt.f); }); if (r.success) saveBlob(new Blob([toCsv(r.data, ['Nama', 'Email', 'WhatsApp', 'Segmen', 'StatusWA', 'Tag', 'OptOut', 'JumlahPesan', 'TerakhirDihubungi'])], { type: 'text/csv' }), 'crm_kontak_' + today() + '.csv'); });
      on(el, 'click', '[data-dup]', function () { crmDuplikat(function () { el._load(true); }); });
    }
    el._bulk = function () {
      var n = Object.keys(CrmSt.sel).filter(function (k) { return CrmSt.sel[k]; }).length;
      $('[data-bulk]', el).innerHTML = n ? '<div class="bulkbar">' + n + ' dipilih <button class="btn xs" data-ba="deteksiWA">' + ic('smartphone') + 'Deteksi WA</button><button class="btn xs" data-ba="tag">' + ic('tag') + 'Beri Tag</button><button class="btn xs" data-ba="blast">' + ic('megaphone') + 'Blast ke Terpilih</button><button class="btn xs" data-ba="optout">' + ic('ban') + 'Opt-out</button><button class="btn xs" data-ba="optin">Opt-in</button></div>' : '';
    };
    el._load = function (force) {
      if (force) cacheStale('crmstats');
      swr('crmstats', 'crm.stats', {}, function (s) {
        if (!s) return;
        $('[data-kpi]', el).innerHTML = '<div class="grid g3 keep">' + [['Total Kontak', s.total, 'contact', '{}'], ['WA Terverifikasi', s.terdaftarWA, 'badge-check', '{"statusWA":"Terdaftar"}'], ['Email Valid', s.emailValid, 'mail-check', '{"emailValid":"YA"}'], ['Belum Dicek WA', s.belumCek, 'smartphone', '{"statusWA":"Belum Dicek"}'], ['Opt-out', s.optOut, 'ban', '{"optOut":"YA"}'], ['Duplikat', s.duplikat, 'copy', '{"duplikat":true}']].map(function (x) { return kpi({ label: x[0], value: x[1], icon: x[2], click: 'x' }).replace('data-kpi="x"', "data-kf='" + x[3] + "'"); }).join('') + '</div>' +
          '<div class="row wrap gap-s mt">' + Object.keys(s.segmen).map(function (g) { return '<button class="chip' + (CrmSt.f.segmen === g ? ' on' : '') + '" data-kf=\'{"segmen":"' + esc(g) + '"}\'>' + esc(g) + ' <b>' + s.segmen[g] + '</b></button>'; }).join('') + '</div>';
        var seg = $('[data-f="segmen"]', el); if (seg.options.length <= 1) seg.innerHTML = '<option value="">Semua segmen</option>' + Object.keys(s.segmen).map(function (g) { return '<option>' + esc(g) + '</option>'; }).join('');
      }, { fresh: force ? 0 : 60000 });
      api('crm.list', Object.assign({ halaman: CrmSt.hal, per: 50 }, CrmSt.f)).then(function (r) {
        if (!r.success) { $('[data-t]', el).innerHTML = errorBox(r.message, true); return; }
        var d = r.data; el._rows = d.rows;
        $('[data-sync-t]', el).textContent = d.sinkron ? 'Sinkron ' + relTime(new Date(d.sinkron).toISOString()) : '';
        $$('[data-f]', el).forEach(function (s) { s.value = CrmSt.f[s.dataset.f] || ''; });
        $('[data-t]', el).innerHTML = '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th class="chk"></th><th>Kontak</th><th>Email</th><th>WhatsApp</th><th>Tag</th><th>Terakhir dihubungi</th><th class="num">Pesan</th></tr></thead><tbody>' + (d.rows.map(function (k) {
          var masalah = !/^08\d{8,12}$/.test(k.NoWA) || k.EmailValid === 'TIDAK' || k.duplikat;
          return '<tr class="click" data-kt="' + k.KontakID + '" style="' + (masalah ? 'background:#FFFBEB' : '') + '"><td class="chk"><input type="checkbox" data-cs="' + k.KontakID + '"' + (CrmSt.sel[k.KontakID] ? ' checked' : '') + '></td><td data-l="Kontak"><div class="row"><div class="avatar sm soft">' + esc(initials(k.Nama)) + '</div><div><div class="t-main">' + esc(k.Nama) + '</div><span class="badge">' + esc(k.Segmen) + '</span>' + (k.OptOut === 'YA' ? ' <span class="badge bad">opt-out</span>' : '') + (k.duplikat ? ' <span class="badge warn">duplikat</span>' : '') + '</div></div></td>' +
            '<td data-l="Email" class="small">' + (k.Email ? esc(k.Email) + ' ' + (k.EmailValid === 'YA' ? '<span class="ok">' + ic('check') + '</span>' : '<span class="warn">' + ic('triangle-alert') + '</span>') : '<span class="muted">—</span>') + '</td>' +
            '<td data-l="WhatsApp"><span class="mono xs">' + esc(k.NoWA || '—') + '</span> ' + (k.StatusWA === 'Terdaftar' ? '<span class="badge ok">✓ WA</span>' : k.StatusWA === 'Tidak Terdaftar' ? '<span class="badge bad">✕</span>' : k.NoWA ? '<span class="badge">?</span>' : '') + (k.NoWA ? ' <a href="https://wa.me/' + esc(k.NoWA.replace(/^0/, '62')) + '" target="_blank" rel="noopener">' + ic('external-link') + '</a>' : '') + '</td>' +
            '<td data-l="Tag" class="xs">' + esc(k.Tag || '') + '</td><td data-l="Terakhir" class="small">' + (k.TerakhirDihubungi ? relTime(k.TerakhirDihubungi) : '—') + '</td><td data-l="Pesan" class="num">' + (k.JumlahPesan || 0) + '</td></tr>';
        }).join('') || '<tr><td colspan="9">' + emptyState('Belum ada kontak', 'Klik "Sinkron Sekarang" untuk menarik kontak dari seluruh modul.', 'contact') + '</td></tr>') + '</tbody></table></div>' +
          '<div class="tbl-foot"><span>' + d.total + ' kontak</span><div class="pager">' + pagerBtns(d.halaman, Math.max(1, Math.ceil(d.total / d.per))) + '</div></div>';
        el._bulk();
      });
    };
    el._load();
  }
});
function crmDetail(id, after) {
  api('crm.detail', { kontakId: id }).then(function (r) {
    if (!r.success) return toast(r.message, 'bad');
    var k = r.data.kontak, s = r.data.sumber;
    var d = drawer(esc(k.Nama), '<div class="row wrap mb"><span class="badge pri">' + esc(k.Segmen) + '</span>' + (s ? '<span class="xs muted">Sumber: ' + esc(T(s.tabel).label) + ' ' + esc(s.id) + '</span>' : '') + '</div>' +
      '<div class="form-grid"><div class="field"><label>Nama</label><input class="input" id="cn" value="' + esc(k.Nama) + '"></div><div class="field"><label>Email</label><input class="input" id="ce" value="' + esc(k.Email) + '"></div><div class="field"><label>WhatsApp</label><input class="input" id="cw" value="' + esc(k.NoWA) + '"></div><div class="field"><label>Tag (pisah koma)</label><input class="input" id="ct" value="' + esc(k.Tag) + '"></div>' +
      '<div class="field full"><label>Catatan</label><textarea class="input" id="cc" rows="2">' + esc(k.Catatan) + '</textarea></div><label class="check small"><input type="checkbox" id="co"' + (k.OptOut === 'YA' ? ' checked' : '') + '> Opt-out (tidak menerima blast)</label></div>' +
      '<div class="row wrap mt">' + (k.NoWA ? '<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(k.NoWA.replace(/^0/, '62')) + '">' + ic('message-circle') + 'WhatsApp</a>' : '') + (k.Email ? '<a class="btn sm" href="mailto:' + esc(k.Email) + '">' + ic('mail') + 'Email</a>' : '') + '</div>' +
      '<div class="sec-t">Catat interaksi</div><div class="row"><select class="input sm" id="ik" style="width:auto"><option>Telepon</option><option>WA Manual</option><option>Kunjungan</option><option>Catatan</option></select><input class="input sm" id="ir" placeholder="Ringkasan…"><button class="btn sm" id="ib">Catat</button></div>' +
      '<div class="sec-t">Timeline</div><div class="tl">' + r.data.interaksi.map(function (x) { return '<div class="tl-item"><div class="tl-card"><h4>' + esc(x.Kanal) + '<span class="xs muted right">' + tglJam(x.Tanggal) + '</span></h4><p>' + esc(x.Ringkasan) + '</p></div></div>'; }).join('') +
      r.data.pesan.map(function (x) { return '<div class="tl-item"><div class="tl-card"><h4><span class="badge ' + (x.kanal === 'WA' ? 'ok' : 'info') + '">' + x.kanal + '</span> <span class="mono xs">' + esc(x.event) + '</span><span class="right">' + badge(x.status) + '</span></h4><p class="xs">' + esc(x.ringkas) + '</p></div></div>'; }).join('') + '</div>',
      '<button class="btn" data-close>Tutup</button><button class="btn primary" id="cs">' + ic('save') + 'Simpan</button>', { kicker: 'CRM Kontak • ' + k.KontakID });
    $('#cs', d.el).onclick = async function () { var x = await act(this, 'crm.save', { kontak: { KontakID: k.KontakID, Nama: $('#cn', d.el).value, Email: $('#ce', d.el).value, NoWA: $('#cw', d.el).value, Tag: $('#ct', d.el).value, Catatan: $('#cc', d.el).value, OptOut: $('#co', d.el).checked ? 'YA' : 'TIDAK' } }); if (x.success) { d.close(); after && after(); } };
    $('#ib', d.el).onclick = async function () { var x = await act(this, 'crm.interaksi', { kontakId: k.KontakID, kanal: $('#ik', d.el).value, ringkasan: $('#ir', d.el).value }); if (x.success) { d.close(); crmDetail(id, after); } };
  });
}
function crmImport(after) {
  var m = modal('<h3 class="h-md">Import kontak (CSV/Excel)</h3><p class="small t2">Kolom: <code>nama, email, wa, segmen, tag</code>. Nomor/email yang sudah ada dilewati.</p><button class="btn sm" id="tpl">' + ic('download') + 'Template</button><div class="file-drop mt" id="pk">Pilih berkas</div><input type="file" hidden id="ff" accept=".csv,.xlsx"><div id="rs" class="mt"></div><div class="row mt" style="justify-content:flex-end"><button class="btn" data-close>Tutup</button><button class="btn primary" id="go" disabled>Import</button></div>');
  var rows = null;
  $('#tpl', m.el).onclick = function () { saveBlob(new Blob([toCsv([{ nama: 'Contoh Nama', email: 'contoh@mail.com', wa: '081234567890', segmen: 'Peserta Seminar', tag: 'seminar-2026' }], ['nama', 'email', 'wa', 'segmen', 'tag'])], { type: 'text/csv' }), 'template_kontak.csv'); };
  $('#pk', m.el).onclick = function () { $('#ff', m.el).click(); };
  $('#ff', m.el).onchange = async function () { rows = await readSheetFile(this.files[0]); $('#pk', m.el).textContent = this.files[0].name + ' — ' + rows.length + ' baris'; $('#go', m.el).disabled = !rows.length; };
  $('#go', m.el).onclick = async function () { var r = await act(this, 'crm.import', { rows: rows }); if (r.success) { m.close(); after && after(); } };
}
function crmDuplikat(after) {
  api('crm.duplikat', {}).then(function (r) {
    if (!r.success) return toast(r.message, 'bad');
    var d = drawer('Periksa Duplikat', r.data.length ? r.data.map(function (g, i) { return '<div class="soft mb"><b class="small">' + esc(g.kunci) + '</b>' + g.kontak.map(function (k, j) { return '<label class="row small mt-s"><input type="radio" name="u' + i + '" value="' + k.KontakID + '"' + (j ? '' : ' checked') + '> <span class="grow">' + esc(k.Nama) + ' <span class="badge">' + esc(k.Segmen) + '</span></span><span class="mono xs muted">' + k.KontakID + '</span></label>'; }).join('') + '<button class="btn xs mt-s" data-merge="' + i + '">Gabungkan ke yang dipilih</button></div>'; }).join('') : emptyState('Tidak ada duplikat', 'Semua kontak unik.', 'check'), '', { kicker: 'CRM' });
    on(d.el, 'click', '[data-merge]', async function (e, b) { var i = +b.dataset.merge, g = r.data[i], u = $('input[name="u' + i + '"]:checked', d.el).value; var x = await act(b, 'crm.merge', { utama: u, gabung: g.kontak.map(function (k) { return k.KontakID; }).filter(function (k) { return k !== u; }) }); if (x.success) { b.closest('.soft').remove(); after && after(); } });
  });
}

// ============================================================ DOC ENGINE & TTD (admin)
var DeSt = { tab: 'template' };
registerPage('doc-engine', {
  title: 'Doc Engine & TTD',
  show: function (el) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = pageHead({ crumb: 'Administration • Doc Engine', title: 'Doc Engine &amp; Tanda Tangan Elektronik', desc: 'Template Google Docs/Sheets/Slides → pindai placeholder {{...}} → form otomatis → approval pejabat (Google + PIN) → nomor otomatis → PDF/DOCX/XLSX/PNG ber-QR → verifikasi publik.',
        acts: '<button class="btn" data-contoh>' + ic('sparkles') + 'Buat Template Contoh</button><button class="btn primary" data-scan>' + ic('scan-line') + 'Pindai Template Baru</button>' }) +
        '<div class="seg mb" data-tab><button data-k="template">Template</button><button data-k="pejabat">Pejabat Penanda Tangan</button><button data-k="dokumen">Dokumen Terbit</button><button data-k="panduan">Panduan Placeholder</button></div><div data-c></div>';
      on(el, 'click', '[data-tab] button', function (e, b) { DeSt.tab = b.dataset.k; refreshView(); });
      on(el, 'click', '[data-contoh]', async function (e, b) { var r = await act(b, 'de.buatContoh', {}); if (r.success) { cacheStale('tpl'); refreshView(); } });
      on(el, 'click', '[data-scan]', function () { scanForm(); });
    }
    $$('[data-tab] button', el).forEach(function (b) { b.classList.toggle('on', b.dataset.k === DeSt.tab); });
    var host = fresh($('[data-c]', el));
    if (DeSt.tab === 'dokumen') return dokumenTerbit(host);
    if (DeSt.tab === 'pejabat') return pejabatTab(host);
    if (DeSt.tab === 'panduan') { host.innerHTML = panduanPlaceholder(); return; }
    swr('tpl', 'de.templates', {}, function (rows, c, err) {
      if (!rows) { host.innerHTML = errorBox(err && err.message, true); return; }
      host.innerHTML = '<div class="card pad-0"><div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Template</th><th>Engine</th><th>Isian / TTD</th><th>Penomoran</th><th>Sumber</th><th>Status</th><th class="num">Aksi</th></tr></thead><tbody>' + (rows.map(function (t) {
        return '<tr><td data-l="Template"><div class="t-main">' + esc(t.nama) + '</div><div class="t-sub mono">' + esc(t.kode) + ' • v' + t.versi + '</div></td><td data-l="Engine">' + esc(t.engine) + '</td><td data-l="Isian">' + t.bidang.length + ' kolom • ' + t.slotTtd.length + ' slot' + (t.qrPerPenandatangan ? ' <span class="badge info">QR/TTD</span>' : '') + '</td><td data-l="Nomor" class="mono xs">' + esc(t.penomoran || '—') + '</td><td data-l="Sumber">' + esc(t.sumberTabel || 'manual') + '</td><td data-l="Status">' + badge(t.aktif ? 'Aktif' : 'Nonaktif') + '</td>' +
          '<td class="acts"><a class="btn xs" target="_blank" rel="noopener" href="' + esc(t.url) + '">' + ic('external-link') + 'Buka</a> <button class="btn xs" data-set="' + t.id + '">' + ic('settings-2') + 'Atur</button> <button class="btn xs" data-rescan="' + esc(t.kode) + '">' + ic('scan-line') + 'Pindai ulang</button></td></tr>';
      }).join('') || '<tr><td colspan="9">' + emptyState('Belum ada template', 'Klik "Buat Template Contoh" (Invoice, Surat, Berita Acara, Kwitansi, Sertifikat).', 'file-plus') + '</td></tr>') + '</tbody></table></div></div>';
      on(host, 'click', '[data-set]', function (e, b) { templateSetting(rows.filter(function (t) { return t.id === b.dataset.set; })[0]); });
      on(host, 'click', '[data-rescan]', async function (e, b) { var t = rows.filter(function (x) { return x.kode === b.dataset.rescan; })[0]; var r = await act(b, 'de.scan', { kode: t.kode, url: t.url }); if (r.success) { cacheStale('tpl'); refreshView(); } });
    }, { fresh: 0 });
  }
});
function scanForm() {
  var m = modal('<h3 class="h-md">Pindai template</h3><p class="small t2">Buat dokumen di Google Docs/Sheets/Slides (akun pemilik script) dengan placeholder seperti <code>{{PERIHAL}}</code>, <code>{{NAMA_PEJABAT_1}}</code>, <code>{{TTD_1}}</code>, <code>{{QR}}</code>, lalu tempel URL-nya.</p>' +
    '<div class="form-grid mt"><div class="field"><label>Kode template</label><input class="input mono" id="kd" placeholder="SURAT_KUASA"></div><div class="field"><label>Nama</label><input class="input" id="nm" placeholder="Surat Kuasa Khusus"></div><div class="field full"><label>URL Google Docs/Sheets/Slides</label><input class="input" id="ur" placeholder="https://docs.google.com/document/d/…"></div>' +
    '<div class="field"><label>Sumber data</label><select class="input" id="sb"><option value="">Isian manual</option><option>Surat</option><option>Invoice</option><option>LaporanSidang</option><option>Pembayaran</option><option>PesertaPelatihan</option></select></div><div class="field"><label>Penomoran</label><select class="input" id="pn"><option value="">Tanpa nomor</option><option value="OTOMATIS">Otomatis (jenis surat)</option><option value="SUMBER">Ikuti nomor data sumber</option>' + (AppState.refs.Penomoran || []).map(function () { return ''; }).join('') + '<option>SK-SOM</option><option>LO</option><option>SKK</option><option>SP</option><option>PK</option><option>UMM</option><option>KWT</option><option>SRT-PLT</option></select></div></div>' +
    '<div class="row mt" style="justify-content:flex-end"><button class="btn" data-close>Batal</button><button class="btn primary" id="go">' + ic('scan-line') + 'Pindai &amp; Simpan</button></div>', { wide: true });
  $('#go', m.el).onclick = async function () { var r = await act(this, 'de.scan', { kode: $('#kd', m.el).value, nama: $('#nm', m.el).value, url: $('#ur', m.el).value, sumberTabel: $('#sb', m.el).value, penomoran: $('#pn', m.el).value }); if (r.success) { m.close(); cacheStale('tpl'); refreshView(); templateSetting(r.data.template); } };
}
function templateSetting(t) {
  var pj = cacheGet('pejabat');
  var d = drawer('Atur: ' + esc(t.nama), '<div class="form-grid"><div class="field"><label>Nama</label><input class="input" id="tn" value="' + esc(t.nama) + '"></div><div class="field"><label>Penomoran</label><input class="input mono" id="tp" value="' + esc(t.penomoran) + '"><div class="help">kosong / OTOMATIS / SUMBER / kode penomoran</div></div>' +
    '<div class="field"><label>Keluaran</label><div class="row wrap">' + ['pdf', 'docx', 'xlsx', 'png'].map(function (k) { return '<label class="check small"><input type="checkbox" data-out="' + k + '"' + (t.keluaran.indexOf(k) > -1 ? ' checked' : '') + '> ' + k.toUpperCase() + '</label>'; }).join('') + '</div></div><div class="field"><label>Opsi</label><label class="check small"><input type="checkbox" id="qr"' + (t.qrPerPenandatangan ? ' checked' : '') + '> QR per penanda tangan menggantikan {{TTD_n}}</label><label class="check small"><input type="checkbox" id="ak"' + (t.aktif ? ' checked' : '') + '> Template aktif</label></div></div>' +
    '<div class="sec-t">Kolom Isian (hasil pindai)</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kunci</th><th>Label</th><th>Tipe</th><th>Wajib</th></tr></thead><tbody>' + t.bidang.map(function (b, i) { return '<tr data-b="' + i + '"><td class="mono xs">' + esc(b.kunci) + '</td><td><input class="input sm" data-l value="' + esc(b.label) + '"></td><td><select class="input sm" data-t>' + ['teks', 'area', 'naskah', 'tanggal', 'angka', 'pilihan', 'daftar', 'gambar'].map(function (x) { return '<option' + (x === b.tipe ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></td><td><input type="checkbox" data-w' + (b.wajib ? ' checked' : '') + '></td></tr>'; }).join('') + '</tbody></table></div>' +
    '<div class="sec-t">Slot Penanda Tangan</div>' + t.slotTtd.map(function (s, i) {
      return '<div class="soft mb" data-s="' + i + '"><div class="row"><b class="small">Slot ' + s.slot + '</b><span class="xs muted">' + esc(s.penanda.join(', ')) + '</span></div><div class="form-grid mt-s"><div class="field"><label>Label</label><input class="input sm" data-sl value="' + esc(s.label) + '"></div><div class="field"><label>Cara pilih pejabat</label><select class="input sm" data-sc>' + [['pilih', 'Dipilih saat ajukan'], ['tetap', 'Pejabat tetap'], ['jabatan', 'Sesuai jabatan aktif']].map(function (o) { return '<option value="' + o[0] + '"' + (s.cara === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Pejabat tetap</label><select class="input sm" data-sp><option value="">—</option>' + ((pj && pj.rows) || []).map(function (p) { return '<option value="' + p.id + '"' + (s.pejabatId === p.id ? ' selected' : '') + '>' + esc(p.nama) + '</option>'; }).join('') + '</select></div><div class="field"><label>Jabatan</label><input class="input sm" data-sj value="' + esc(s.jabatan || '') + '"></div>' +
        '<div class="field"><label>Tanda</label><select class="input sm" data-st>' + ['qr', 'spesimen', 'qr+spesimen', 'kosong'].map(function (o) { return '<option' + (s.tanda === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div><div class="field"><label>Urutan</label><input class="input sm" type="number" data-su value="' + (s.urutan || s.slot) + '"></div>' +
        '<label class="check small full"><input type="checkbox" data-sw' + (s.wajibSetuju ? ' checked' : '') + '> Wajib persetujuan pejabat (PIN) — bila tidak, dokumen langsung terbit</label></div></div>';
    }).join(''), '<button class="btn" data-close>Batal</button><button class="btn primary" id="sv">' + ic('save') + 'Simpan</button>', { kicker: 'Template ' + t.kode, wide: true });
  if (!pj) swr('pejabat', 'de.pejabat', {}, null, { fresh: 0 });
  $('#sv', d.el).onclick = async function () {
    var bidang = t.bidang.map(function (b, i) { var tr = $('[data-b="' + i + '"]', d.el); return Object.assign({}, b, { label: $('[data-l]', tr).value, tipe: $('[data-t]', tr).value, wajib: $('[data-w]', tr).checked }); });
    var slot = t.slotTtd.map(function (s, i) { var x = $('[data-s="' + i + '"]', d.el); return Object.assign({}, s, { label: $('[data-sl]', x).value, cara: $('[data-sc]', x).value, pejabatId: $('[data-sp]', x).value, jabatan: $('[data-sj]', x).value, tanda: $('[data-st]', x).value, urutan: +$('[data-su]', x).value, wajibSetuju: $('[data-sw]', x).checked }); });
    var r = await act(this, 'de.templateSave', { id: t.id, nama: $('#tn', d.el).value, penomoran: $('#tp', d.el).value.trim(), keluaran: $$('[data-out]', d.el).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.out; }), qrPerPenandatangan: $('#qr', d.el).checked, aktif: $('#ak', d.el).checked, bidang: bidang, slotTtd: slot });
    if (r.success) { d.close(); cacheStale('tpl'); refreshView(); }
  };
}
function pejabatTab(host) {
  host = fresh(host);
  swr('pejabat', 'de.pejabat', {}, function (d, c, err) {
    if (!d) { host.innerHTML = errorBox(err && err.message, true); return; }
    host.innerHTML = '<div class="row mb"><span class="small t2 grow">Pejabat menyetujui dokumen dengan login Google (email harus sama) + PIN 6 digit (diatur sendiri di menu Akun).</span><button class="btn primary" data-np>' + ic('user-plus') + 'Tambah Pejabat</button></div><div class="grid g3">' + (d.rows.map(function (p) {
      return '<div class="card"><div class="row"><div class="avatar">' + esc(initials(p.nama)) + '</div><div class="grow"><b>' + esc(p.nama) + (p.gelar ? ', ' + esc(p.gelar) : '') + '</b><div class="xs muted">' + esc(p.jabatan) + '</div></div>' + badge(p.aktif ? 'Aktif' : 'Nonaktif') + '</div><div class="xs mono muted mt-s">' + esc(p.email) + '</div><div class="row wrap gap-s mt-s">' + (p.adaPin ? '<span class="badge ok">PIN diatur</span>' : '<span class="badge warn">PIN belum diatur</span>') + (p.adaSpesimen ? '<span class="badge info">Spesimen TTD</span>' : '') + '</div><button class="btn sm block mt" data-ep="' + p.id + '">' + ic('pencil') + 'Ubah</button></div>';
    }).join('') || '<div class="card">' + emptyState('Belum ada pejabat', 'Tambahkan Managing Partner sebagai penanda tangan.', 'pen-line') + '</div>') + '</div>';
    var form = function (p) {
      p = p || {};
      var m = drawer(p.id ? 'Ubah Pejabat' : 'Tambah Pejabat', '<div class="form-grid"><div class="field"><label>Nama</label><input class="input" id="pn" value="' + esc(p.nama || '') + '"></div><div class="field"><label>Gelar</label><input class="input" id="pg" value="' + esc(p.gelar || '') + '"></div><div class="field"><label>Jabatan</label><input class="input" id="pjb" value="' + esc(p.jabatan || 'Managing Partner') + '"></div><div class="field"><label>NIP / No. Izin</label><input class="input" id="pnip" value="' + esc(p.nip || '') + '"></div><div class="field full"><label>Email Google (login)</label><input class="input" id="pe" value="' + esc(p.email || '') + '"></div><div class="field"><label>Mulai menjabat</label><input class="input" type="date" id="pm" value="' + esc(p.mulai || '') + '"></div><div class="field"><label>Selesai</label><input class="input" type="date" id="ps" value="' + esc(p.selesai || '') + '"></div>' +
        '<div class="field full"><label>Spesimen tanda tangan (PNG transparan, opsional)</label><input type="file" accept="image/png,image/jpeg" id="pf"></div><label class="check small"><input type="checkbox" id="pa"' + (p.aktif !== false ? ' checked' : '') + '> Aktif</label>' + (p.id && p.adaPin ? '<label class="check small"><input type="checkbox" id="pr"> Reset PIN (pejabat atur ulang)</label>' : '') + '</div>', '<button class="btn" data-close>Batal</button><button class="btn primary" id="psv">Simpan</button>', { kicker: 'Doc Engine' });
      $('#psv', m.el).onclick = async function () {
        var f = $('#pf', m.el).files[0], sp = null; if (f) { try { sp = await fileB64(f, 2); } catch (e) { return toast(e.message, 'bad'); } }
        var r = await act(this, 'de.pejabatSave', { pejabat: { id: p.id, nama: $('#pn', m.el).value, gelar: $('#pg', m.el).value, jabatan: $('#pjb', m.el).value, nip: $('#pnip', m.el).value, email: $('#pe', m.el).value, mulai: $('#pm', m.el).value, selesai: $('#ps', m.el).value, aktif: $('#pa', m.el).checked, spesimen: sp, resetPin: $('#pr', m.el) && $('#pr', m.el).checked } });
        if (r.success) { m.close(); cacheStale('pejabat'); pejabatTab(host); }
      };
    };
    $('[data-np]', host).onclick = function () { form(); };
    on(host, 'click', '[data-ep]', function (e, b) { form(d.rows.filter(function (p) { return p.id === b.dataset.ep; })[0]); });
  }, { fresh: 0 });
}
function panduanPlaceholder() {
  var rows = [['{{PERIHAL}} {{TUJUAN}} {{ISI}}', 'Kolom baku (form otomatis). {{ISI}} = editor naskah (paragraf rata kanan-kiri, daftar)'], ['{{NAMA_KLIEN}} {{TGL_SIDANG}} {{JUMLAH}}', 'Kolom kustom — tipe ditebak dari nama (TGL_ → tanggal, JUMLAH → angka)'], ['{{NOMOR}} {{TANGGAL}} {{TAHUN}} {{BULAN_ROMAWI}}', 'Diisi server saat terbit (nomor dikunci)'],
    ['{{INSTITUSI_NAMA}} {{INSTITUSI_ALAMAT}} {{REKENING_NOMOR}}', 'Diambil dari Pengaturan Sistem'], ['{{NAMA_PEJABAT_1}} {{JABATAN_1}} {{TTD_1}}', 'Slot penanda tangan 1 (akhiran _2, _3 untuk slot berikutnya). {{TTD_n}} = QR eTTD / spesimen'], ['{{QR}} {{KODE_VERIFIKASI}}', 'QR & kode verifikasi publik dokumen'],
    ['{{#ITEM}} … {{ITEM.URAIAN}} {{ITEM.JUMLAH|ribuan}}', 'Baris tabel berulang (letakkan {{#ITEM}} di baris tabel)'], ['{{?TEMBUSAN}} … {{/TEMBUSAN}}', 'Blok dihapus bila TEMBUSAN kosong'], ['{{JUMLAH|rupiah}} {{JUMLAH|terbilang:rupiah}} {{NAMA|kapital}} {{TGL|tanggal}} {{X|bawaan:-}}', 'Pengubah tampilan (data tersimpan tetap mentah)']];
  return '<div class="card pad-0"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Placeholder</th><th>Arti</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td class="mono xs" style="color:var(--primary-800)">' + esc(r[0]) + '</td><td class="small">' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
    '<div class="tint mt small">' + ic('scale') + ' <b>Catatan hukum:</b> QR + Google login + PIN termasuk tanda tangan elektronik <i>tidak tersertifikasi</i> (PP 71/2019) — cukup untuk dokumen internal, surat keterangan, invoice, dan sertifikat kegiatan karena keasliannya dapat dicek. Untuk dokumen yang menuntut kekuatan pembuktian penuh, gunakan TTE tersertifikasi melalui PSrE berinduk Komdigi (tahap integrasi lanjutan). Ini bukan nasihat hukum.</div>';
}

// ============================================================ MIGRASI DATABASE
var MigSt = { src: '', scan: null, plans: {} };
registerPage('migrasi', {
  title: 'Migrasi Database',
  show: function (el) {
    el.innerHTML = pageHead({ crumb: 'Administration • Migrasi', title: 'Migrasi Database', desc: 'Pindahkan data dari spreadsheet aplikasi lama (hanya DIBACA, tidak diubah) atau CSV/Excel. Aman diulang: data yang sama diperbarui, bukan digandakan. Jalankan sekali lagi tepat sebelum pindah (delta sync).' }) +
      '<div class="grid g2 mb"><div class="card"><h3 class="h-sm mb">' + ic('sheet') + ' Dari Spreadsheet Lama</h3><div class="field"><label>URL / ID spreadsheet lama</label><input class="input" id="src" value="' + esc(MigSt.src) + '" placeholder="https://docs.google.com/spreadsheets/d/…"><div class="help">Harus dapat dibuka oleh akun pemilik Apps Script (akun yang sama → ID file Drive lama tetap valid).</div></div><button class="btn primary mt" id="scan">' + ic('scan-search') + 'Pindai Struktur</button></div>' +
      '<div class="card"><h3 class="h-sm mb">' + ic('file-spreadsheet') + ' Dari CSV / Excel &amp; Ekspor</h3><div class="field"><label>Tabel tujuan</label><select class="input" id="tt">' + Object.keys(AppState.schema.tables).filter(function (t) { return !AppState.schema.tables[t].system && t !== 'Users'; }).map(function (t) { return '<option value="' + t + '">' + esc(AppState.schema.tables[t].label) + '</option>'; }).join('') + '</select></div><div class="row mt wrap"><button class="btn" id="imp">' + ic('upload') + 'Impor CSV/Excel</button><button class="btn" id="exp">' + ic('download') + 'Ekspor Tabel (CSV/Excel)</button></div>' +
      '<div class="soft xs t2 mt">' + ic('list-checks') + ' <b>Cutover:</b> 1) Pindai → 2) Jalankan Import → 3) Cek data & uji 1 akun → 4) Import sekali lagi tepat sebelum pindah → 5) Umumkan alamat baru. Sesi login lama tidak ikut pindah.</div></div></div><div id="res"></div>';
    $('#imp', el).onclick = function () { importDialog($('#tt', el).value); };
    $('#exp', el).onclick = async function () { var t = $('#tt', el).value, r = await withBusy(this, function () { return api('mig.export', { t: t }); }); if (!r.success) return toast(r.message, 'bad'); await loadXlsx().catch(function () {}); if (window.XLSX) { var ws = XLSX.utils.json_to_sheet(r.data.rows, { header: r.data.headers }), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, t.slice(0, 30)); XLSX.writeFile(wb, t + '_' + today() + '.xlsx'); } else saveBlob(new Blob([toCsv(r.data.rows, r.data.headers)], { type: 'text/csv' }), t + '.csv'); };
    $('#scan', el).onclick = async function () {
      MigSt.src = $('#src', el).value.trim();
      var r = await withBusy(this, function () { return api('mig.scan', { source: MigSt.src }); });
      if (!r.success) return toast(r.message, 'bad');
      MigSt.scan = r.data; MigSt.plans = {};
      r.data.sheets.forEach(function (s) { MigSt.plans[s.nama] = { on: !!s.target, target: s.target, peta: s.peta, kunci: s.kunci, overwrite: false }; });
      drawMig(el);
    };
    if (MigSt.scan) drawMig(el);
  }
});
function drawMig(el) {
  var d = MigSt.scan, host = fresh($('#res', el)), tgt = {}; d.targets.forEach(function (t) { tgt[t.t] = t; });
  host.innerHTML = '<div class="card mb"><div class="row wrap"><h3 class="h-sm grow">Sumber: ' + esc(d.source.nama) + '</h3><span class="badge">' + d.sheets.length + ' sheet</span></div><div class="xs muted">Centang sheet yang diimpor, pilih tabel tujuan, cek peta kolom (berdasarkan NAMA header), dan kunci pencocokan.</div></div>' +
    d.sheets.map(function (s, i) {
      var p = MigSt.plans[s.nama], T2 = tgt[p.target];
      return '<div class="card mb" data-sh="' + i + '"><div class="row wrap"><label class="check"><input type="checkbox" data-on' + (p.on ? ' checked' : '') + '> <b>' + esc(s.nama) + '</b></label><span class="badge">' + s.baris + ' baris</span><span class="sp"></span>' + ic('arrow-right') + '<select class="input sm" style="width:auto" data-tg><option value="">— Lewati —</option>' + d.targets.map(function (t) { return '<option value="' + t.t + '"' + (t.t === p.target ? ' selected' : '') + '>' + esc(t.label) + '</option>'; }).join('') + '</select></div>' +
        (T2 ? '<div class="tbl-wrap mt-s"><table class="tbl"><thead><tr><th>Kolom sumber</th><th>Contoh</th><th>→ Kolom tujuan</th></tr></thead><tbody>' + s.headers.map(function (h, j) { return '<tr><td class="small"><b>' + esc(h) + '</b></td><td class="xs muted ellip" style="max-width:200px">' + esc((s.contoh[0] || [])[j] || '') + '</td><td><select class="input sm" data-map="' + esc(h) + '"><option value="">— abaikan —</option>' + T2.fields.map(function (f) { return '<option value="' + f[0] + '"' + (p.peta[h] === f[0] ? ' selected' : '') + '>' + esc(f[1]) + ' (' + f[0] + ')</option>'; }).join('') + '</select></td></tr>'; }).join('') + '</tbody></table></div>' +
          '<div class="row wrap mt-s"><span class="small">Kunci pencocokan:</span><select class="input sm" style="width:auto" data-key>' + T2.fields.map(function (f) { return '<option value="' + f[0] + '"' + (p.kunci === f[0] ? ' selected' : '') + '>' + esc(f[1]) + '</option>'; }).join('') + '</select><label class="check small"><input type="checkbox" data-ow' + (p.overwrite ? ' checked' : '') + '> Timpa data yang sudah ada</label></div>' : '') + '</div>';
    }).join('') +
    '<div class="row mb"><button class="btn" id="dry">' + ic('scan-eye') + 'Pindai (Dry-run)</button><button class="btn primary" id="run">' + ic('database-zap') + 'Jalankan Import</button></div><div id="rep"></div>';
  on(host, 'change', '[data-sh] select, [data-sh] input', function (e, x) {
    var card = x.closest('[data-sh]'), s = d.sheets[+card.dataset.sh], p = MigSt.plans[s.nama];
    if (x.matches('[data-on]')) p.on = x.checked;
    if (x.matches('[data-tg]')) { p.target = x.value; p.peta = {}; p.on = !!x.value; drawMig(el); return; }
    if (x.matches('[data-map]')) { if (x.value) p.peta[x.dataset.map] = x.value; else delete p.peta[x.dataset.map]; }
    if (x.matches('[data-key]')) p.kunci = x.value;
    if (x.matches('[data-ow]')) p.overwrite = x.checked;
  });
  var jalan = async function (btn, dry) {
    var plans = d.sheets.filter(function (s) { var p = MigSt.plans[s.nama]; return p.on && p.target; }).map(function (s) { var p = MigSt.plans[s.nama]; return { sheet: s.nama, target: p.target, peta: p.peta, kunci: p.kunci, overwrite: p.overwrite }; });
    if (!plans.length) return toast('Pilih minimal satu sheet.', 'warn');
    if (!dry && !(await confirmBox('Jalankan import ' + plans.length + ' sheet ke database aplikasi?', { ok: 'Jalankan Import' }))) return;
    var r = await withBusy(btn, function () { return api('mig.run', { source: MigSt.src, plans: plans, dryRun: dry }); });
    if (!r.success) return toast(r.message, 'bad');
    $('#rep', host).innerHTML = '<div class="card pad-0"><div class="toolbar"><b>' + (dry ? 'Hasil Pindai (belum ada yang ditulis)' : 'Import selesai') + '</b></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th class="num">Di app lama</th><th class="num">Ditambah</th><th class="num">Diperbarui</th><th class="num">Dilewati</th></tr></thead><tbody>' + Object.keys(r.data.report).map(function (k) { var x = r.data.report[k]; return '<tr><td>' + esc(k) + '</td><td class="num">' + x.sumber + '</td><td class="num ok"><b>' + x.ditambah + '</b></td><td class="num warn">' + x.diperbarui + '</td><td class="num">' + x.dilewati + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (r.data.warnings.length ? '<div style="padding:12px 16px"><b class="small">Peringatan</b><ul class="small t2" style="margin:6px 0 0;padding-left:18px">' + r.data.warnings.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div>' : '') + '</div>';
    if (!dry) { Object.keys(AppState.schema.tables).forEach(function (t) { Data.stale(t); }); revalidateBoot(); toast('Import selesai. Data aplikasi diperbarui.'); }
  };
  $('#dry', host).onclick = function () { jalan(this, true); };
  $('#run', host).onclick = function () { jalan(this, false); };
}
