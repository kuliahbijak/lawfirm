/* ============================================================
   SIMLAWFIRM — pages-office.js
   Administrasi Surat (alur draft → approval PIN → nomor → arsip), Approval Pimpinan,
   Penomoran (smart formatter), Finance (invoice, pembayaran, piutang aging, laporan),
   People & Workload, Knowledge (library, template doc engine, SOP), Business Development.
   ============================================================ */
'use strict';
// ============================================================ SURAT
function suratKpi(rows) {
  var bln = today().slice(0, 7), mg = addDays(today(), -7);
  var masuk = rows.filter(function (r) { return r.arah === 'Masuk' && !/Diarsip|Selesai/.test(r.status); });
  var keluar = rows.filter(function (r) { return r.arah === 'Keluar' && String(r.tanggal).slice(0, 7) === bln && /Disetujui|Terkirim|Diarsip/.test(r.status); });
  var appr = rows.filter(function (r) { return r.status === 'Menunggu Approval'; }), nom = rows.filter(function (r) { return r.arah === 'Keluar' && r.nomor; }).length;
  return '<div class="grid g4 keep mb">' + kpi({ label: 'Surat Masuk Aktif', value: masuk.length, unit: 'Surat', icon: 'inbox', foot: '<span>+' + cntBy(rows, function (r) { return r.arah === 'Masuk' && r.tanggal >= mg; }) + ' surat minggu ini</span><span class="badge warn">' + cntBy(masuk, function (r) { return r.status === 'Diterima'; }) + ' perlu disposisi</span>', click: 'Surat Masuk' }) +
    kpi({ label: 'Menunggu Approval', value: appr.length, unit: 'Berkas', icon: 'file-clock', tone: appr.length ? 'bad' : 'ok', foot: '<span>Prioritas review partner</span>' + (appr.some(function (r) { return r.batasWaktu && r.batasWaktu <= addDays(today(), 1); }) ? '<span class="badge bad">Urgent &lt; 24 jam</span>' : ''), click: 'Menunggu Approval' }) +
    kpi({ label: 'Surat Keluar Bulan Ini', value: keluar.length, unit: 'Dokumen', icon: 'send', tone: 'ok', foot: '<span class="badge ok">Tersinkron Drive</span>', click: 'Surat Keluar' }) +
    kpi({ label: 'Penomoran Otomatis Terbit', value: '<span style="color:var(--primary-800)">No. ' + nom + '</span>', icon: 'hash', foot: '<a href="#/penomoran">Buku Agenda</a>' }) + '</div>';
}
var SURAT_TABS = [{ l: 'Semua Surat', f: function () { return true; } }, { l: 'Surat Masuk', f: function (r) { return r.arah === 'Masuk'; } }, { l: 'Surat Keluar', f: function (r) { return r.arah === 'Keluar' && !/Draft|Revisi/.test(r.status); } },
  { l: 'Draft', f: function (r) { return r.arah === 'Keluar' && /Draft|Revisi/.test(r.status); } }, { l: 'Menunggu Approval', f: function (r) { return r.status === 'Menunggu Approval'; } }, { l: 'Didisposisi', f: function (r) { return r.status === 'Didisposisi' || r.status === 'Diproses'; } }, { l: 'Arsip Digital', f: function (r) { return /Diarsip|Selesai/.test(r.status); } }];
function suratCols() {
  return [{ k: 'nomor', l: 'Tipe & No. Surat', render: function (r) { return '<div class="row gap-s"><span class="badge ' + (r.arah === 'Masuk' ? 'info' : 'ok') + '" title="' + r.arah + '">' + ic(r.arah === 'Masuk' ? 'arrow-down' : 'arrow-up') + '</span><div><div class="mono" style="color:var(--primary-800);font-weight:600">' + esc(r.nomor || '(belum bernomor)') + '</div><div class="t-sub">' + tgl(r.tanggal) + '</div></div></div>'; } },
    { k: 'perihal', l: 'Perihal & Kaitan Perkara', render: function (r) { return '<div class="t-main ellip" style="max-width:280px">' + esc(r.perihal) + '</div><div class="t-sub ellip" style="max-width:280px;color:var(--primary-800)">' + esc(r.perkaraId ? refLabel('Perkara', r.perkaraId) : (r.klienId ? refLabel('Klien', r.klienId) : r.jenis || '')) + '</div>'; } },
    { k: 'pihak', l: 'Instansi / Pihak', render: function (r) { return '<span class="small">' + esc(r.pihak || '—') + '</span>'; } }, { k: 'status', l: 'Status', render: function (r) { return badge(r.status); } }];
}
function suratPage(mode) {
  var tabIdx = { all: 0, masuk: 1, keluar: 2, draft: 3, arsip: 6 }[mode] || 0;
  var def = crudPage({
    t: 'Surat', title: 'Administrasi &amp; Manajemen Surat', crumb: 'Administrasi Kantor <span class="muted">• Modul Manajemen Surat</span> <span class="badge ok"><span class="dot"></span>Sinkronisasi Google Drive Aktif</span>',
    desc: 'Pusat tata kelola persuratan hukum kantor: registrasi surat masuk/keluar, otomatisasi penomoran surat, alur disposisi advokat, serta approval bertingkat Managing Partner.',
    newLabel: 'Buat Draft Surat Baru', defaults: function () { return { arah: mode === 'masuk' ? 'Masuk' : 'Keluar', tanggal: today(), sifat: 'Biasa', status: mode === 'masuk' ? 'Diterima' : 'Draft' }; },
    acts: function () { return '<a class="btn" href="#/penomoran">' + ic('hash') + 'Format Penomoran Surat</a>' + (canEdit() && mode !== 'masuk' ? '<button class="btn" data-newmasuk>' + ic('inbox') + 'Catat Surat Masuk</button>' : ''); },
    filterBy: ['jenis', 'sifat'], deps: ['Disposisi'], cols: suratCols(), kpis: suratKpi, tabs: SURAT_TABS, noBulk: false,
    rowActs: function (r) { return r.status === 'Menunggu Approval' ? '<span class="badge warn">' + ic('pen-line') + 'Approval</span>' : r.docId ? '<button class="btn xs" data-pdf="' + esc(r.docId) + '">' + ic('file-down') + 'PDF</button>' : ''; },
    onRow: function (r) { suratDrawer(r); },
    bind: function (el, st) {
      st.tab = tabIdx;
      on(el, 'click', '[data-newmasuk]', function () { openForm('Surat', null, { defaults: { arah: 'Masuk', tanggal: today(), status: 'Diterima' } }); });
      on(el, 'click', '[data-pdf]', function (e, b) { e.stopPropagation(); unduhDok(b, b.dataset.pdf); });
    },
    after: function (el, rows, all) {
      var host = $('[data-bottom]', el), sel = all.filter(function (r) { return r.arah === 'Keluar'; }).sort(function (a, b) { return String(b.updatedAt).localeCompare(a.updatedAt); })[0];
      host.innerHTML = '<div class="grid g2"><div class="card" data-smart>' + skeleton(2) + '</div><div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('file-text') + ' Pratinjau Lembar Surat (Watermarked)</h3><span class="badge">Halaman 1</span></div>' + (sel ? suratPaper(sel) : emptyState('Belum ada surat keluar', '')) + '</div></div>';
      smartFormatter($('[data-smart]', host));
    }
  });
  return def;
}
function suratPaper(s) {
  var st = AppState.settings;
  return '<div class="paper"><div class="wm">' + esc((st.appName || 'SIMLAWFIRM').toUpperCase()) + '</div><div class="kop"><b>' + esc((st.institusi || 'SIMLAWFIRM ADVOCATES & LEGAL CONSULTANTS').toUpperCase()) + '</b></div>' +
    '<table><tr><td style="width:70px">Nomor</td><td>: <b>' + esc(s.nomor || '(otomatis saat disetujui)') + '</b></td><td style="text-align:right">' + tgl(s.tanggal, true) + '</td></tr><tr><td>Lampiran</td><td>: ' + esc(s.lampiran || '-') + '</td><td style="text-align:right">Sifat: <b>' + esc((s.sifat || '').toUpperCase()) + '</b></td></tr><tr><td>Perihal</td><td colspan="2">: <b style="color:var(--primary-800)">' + esc((s.perihal || '').toUpperCase()) + '</b></td></tr></table>' +
    '<p style="margin:12px 0 4px">Kepada Yth.<br><b>' + esc(s.pihak || '') + '</b><br>' + esc(s.alamatTujuan || '') + '</p><p>Dengan hormat,</p><div class="richtext" style="text-align:justify">' + (s.isi || '<span class="muted">(isi surat belum ditulis)</span>') + '</div>' +
    '<div class="row mt" style="align-items:flex-end"><div class="xs muted">' + ic('shield-check') + (s.docId ? ' VERIFIED • SECURE QR CODE AUDIT' : ' DRAFT • belum ditandatangani') + '</div><div class="right" style="text-align:center"><div class="small">Hormat kami,</div><div style="height:46px"></div><b class="small">Managing Partner</b></div></div></div>';
}
async function smartFormatter(box, kode) {
  var r = await api('nomor.preview', { kode: kode || box._kode || 'SK-SOM' }); if (!r.success) { box.innerHTML = errorBox(r.message); return; }
  var d = r.data; box._kode = d.kode;
  box.innerHTML = '<div class="row" style="align-items:flex-start"><div class="kpi" style="padding:0"><div class="ico">' + ic('wand-sparkles') + '</div></div><div class="grow"><h3 class="h-sm">Sistem Otomasi Penomoran Surat Kantor (Smart Formatter)</h3><div class="xs muted">Penomoran terpusat terintegrasi format legal drafting baku.</div><span class="badge ok mt-s"><span class="dot"></span>Tercatat Resmi di Database Google Sheets</span></div></div>' +
    '<div class="soft mt"><div class="lbl">Pola Baku Nomenklatur</div><div class="mono mt-s" style="color:var(--primary-800);word-break:break-all">' + esc(d.format) + '</div></div>' +
    '<div class="row mt soft"><div class="kpi" style="padding:0"><div class="ico">' + ic('hash') + '</div></div><div class="grow"><div class="xs muted">Nomor urut berikutnya yang tersedia:</div><b class="mono" style="font-size:17px">' + esc(d.berikut) + '</b></div><button class="btn sm" data-copy>' + ic('copy') + 'Salin</button>' + (canEdit() ? '<button class="btn sm primary" data-klaim>' + ic('lock') + 'Klaim Nomor</button>' : '') + '</div>' +
    '<div class="xs muted mt">Ganti tipe cepat:</div><div class="row wrap mt-s gap-s">' + d.daftar.filter(function (x) { return !/^(INV|KL|T|BAS|KWT|SRT-PLT)$/.test(x.kode); }).map(function (x) { return '<button class="chip' + (x.kode === d.kode ? ' on' : '') + '" data-kd="' + esc(x.kode) + '">' + esc(x.kode) + ' (' + esc(x.nama) + ')</button>'; }).join('') + '</div>';
  on(box, 'click', '[data-kd]', function (e, b) { smartFormatter(box, b.dataset.kd); });
  $('[data-copy]', box).onclick = function () { navigator.clipboard && navigator.clipboard.writeText(d.berikut); toast('Nomor disalin.'); };
  var k = $('[data-klaim]', box); if (k) k.onclick = async function () { if (!(await confirmBox('Klaim nomor ' + d.berikut + '? Nomor akan tercatat terpakai di buku agenda.'))) return; var x = await act(k, 'nomor.klaim', { kode: d.kode }); if (x.success) smartFormatter(box, d.kode); };
}
function suratDrawer(s) {
  var e = canEdit(), st = s.status, masuk = s.arah === 'Masuk';
  var stage = function (n, label, sub, state) { return '<div class="stg ' + state + '"><i>' + (state === 'done' ? ic('check') : n) + '</i><div class="grow"><div class="row"><b class="small">' + label + '</b>' + (state === 'done' ? '<span class="badge ok right">Selesai</span>' : state === 'cur' ? '<span class="badge warn right">Berjalan</span>' : '') + '</div><div class="xs muted">' + sub + '</div></div></div>'; };
  var stages = masuk
    ? stage(1, 'Registrasi Surat Masuk', 'Diterima ' + tgl(s.tanggal) + ' dari ' + esc(s.pihak || '-'), 'done') + stage(2, 'Disposisi ke Advokat', st === 'Diterima' ? 'Belum didisposisi' : 'Sudah didisposisi', st === 'Diterima' ? 'cur' : 'done') + stage(3, 'Tindak Lanjut', st === 'Diproses' ? 'Sedang diproses' : /Selesai|Diarsip/.test(st) ? 'Selesai' : 'Menunggu', /Selesai|Diarsip/.test(st) ? 'done' : st === 'Diproses' ? 'cur' : '') + stage(4, 'Arsip Digital', st === 'Diarsip' ? 'Tersimpan di arsip' : '—', st === 'Diarsip' ? 'done' : '')
    : stage(1, 'Penyusunan Draft', 'Disusun oleh ' + esc(s.createdBy || '-'), 'done') + stage(2, 'Review Legal & Klausul', st === 'Revisi' ? 'Perlu revisi: ' + esc(s.catatanApproval || '') : 'Siap diajukan', st === 'Draft' || st === 'Revisi' ? 'cur' : 'done') +
      stage(3, 'Approval Final & Tanda Tangan Digital', 'Otoritas: Managing Partner • Google login + PIN', st === 'Menunggu Approval' ? 'cur' : /Disetujui|Terkirim|Diarsip/.test(st) ? 'done' : '') + stage(4, 'Penomoran, Kirim & Arsip', s.nomor ? 'No. ' + esc(s.nomor) : 'Nomor terbit otomatis setelah disetujui', /Terkirim|Diarsip/.test(st) ? 'done' : st === 'Disetujui' ? 'cur' : '');
  var acts = '';
  if (e && masuk && st === 'Diterima') acts += '<button class="btn primary" data-a="disposisi">' + ic('forward') + 'Disposisi</button>';
  if (e && masuk && /Didisposisi|Diproses/.test(st)) acts += '<button class="btn" data-st="Diproses">Tandai Diproses</button><button class="btn ok solid" data-st="Selesai">Selesai</button>';
  if (e && masuk && st === 'Selesai') acts += '<button class="btn" data-st="Diarsip">' + ic('archive') + 'Arsipkan</button>';
  if (e && !masuk && /Draft|Revisi/.test(st)) acts += '<button class="btn" data-a="preview">' + ic('eye') + 'Pratinjau PDF</button><button class="btn primary" data-a="ajukan">' + ic('send') + 'Ajukan Approval &amp; TTD</button>';
  if (!masuk && st === 'Menunggu Approval') acts += '<a class="btn primary" href="#/approval">' + ic('pen-line') + 'Buka Approval Pimpinan</a>';
  if (!masuk && s.docId) acts += '<button class="btn" data-a="pdf">' + ic('file-down') + 'Unduh PDF</button>';
  if (e && !masuk && st === 'Disetujui') acts += '<button class="btn ok solid" data-st="Terkirim">' + ic('send') + 'Tandai Terkirim</button>';
  if (e && !masuk && st === 'Terkirim') acts += '<button class="btn" data-st="Diarsip">' + ic('archive') + 'Arsipkan</button>';
  var disp = (Data.rows('Disposisi') || []).filter(function (x) { return x.suratId === s.id; });
  var d = drawer(esc(s.perihal), '<div class="row wrap mb"><span class="badge ' + (masuk ? 'info' : 'ok') + '">Surat ' + s.arah + '</span>' + badge(st) + '<span class="mono small" style="color:var(--primary-800)">' + esc(s.nomor || '') + '</span>' + (s.batasWaktu ? '<span class="badge bad right">Batas: ' + tgl(s.batasWaktu) + '</span>' : '') + '</div>' +
    '<div class="lbl mb">Workflow Panel — Detail Approval &amp; Alur Disposisi</div><div class="stages">' + stages + '</div>' +
    (disp.length ? '<div class="tint mt"><b class="small">' + ic('quote') + ' Catatan Disposisi</b>' + disp.map(function (x) { return '<div class="small mt-s"><i>"' + esc(x.instruksi) + '"</i><div class="xs muted">— ' + esc(x.dari || '') + ' → ' + esc(refLabel('Personel', x.kepadaId)) + ' • ' + badge(x.status) + '</div></div>'; }).join('') + '</div>' : '') +
    (s.catatanApproval ? '<div class="err-box mt">' + ic('message-square-warning') + ' ' + esc(s.catatanApproval) + '</div>' : '') +
    '<div class="sec-t">Data Surat</div><dl class="dl">' + fieldsOf('Surat').filter(function (f) { return !/isi|catatanApproval|docId/.test(f[0]); }).map(function (f) { return '<dt>' + esc(f[1]) + '</dt><dd>' + fmtCell(f, s[f[0]], s) + '</dd>'; }).join('') + '</dl>' +
    (!masuk ? '<div class="sec-t">Pratinjau</div>' + suratPaper(s) : ''),
    acts + (e && !/Menunggu|Disetujui|Terkirim|Diarsip/.test(st) ? '<button class="btn" data-a="edit">' + ic('pencil') + 'Ubah</button>' : ''), { kicker: 'Surat • ' + s.id, wide: true });
  on(d.el, 'click', '[data-st]', async function (ev, b) { var r = await act(b, 'surat.status', { id: s.id, status: b.dataset.st }); if (r.success) { s.status = b.dataset.st; Data.upsert('Surat', s); d.close(); refreshView(); } });
  on(d.el, 'click', '[data-a]', async function (ev, b) {
    var a = b.dataset.a;
    if (a === 'edit') { d.close(); openForm('Surat', s); }
    if (a === 'disposisi') { d.close(); openForm('Disposisi', null, { defaults: { suratId: s.id, batas: addDays(today(), 3) }, hideF: ['suratId'] }); }
    if (a === 'pdf') unduhDok(b, s.docId);
    if (a === 'preview') await withBusy(b, async function () { var r = await api('de.preview', { templateKode: 'SURAT_KELUAR', sumber: { t: 'Surat', id: s.id } }); if (r.success) openBlob(b64Blob(r.data.data, 'application/pdf')); else toast(r.message, 'bad'); });
    if (a === 'ajukan') {
      var pj = await api('de.pejabat', {});
      var opsi = pj.success ? pj.data.rows.filter(function (p) { return p.aktif; }) : [];
      var m = modal('<h3 class="h-md">Ajukan approval &amp; tanda tangan</h3><p class="small t2">Dokumen dikunci & dikirim ke pejabat. Nomor surat terbit otomatis setelah disetujui dengan PIN.</p><div class="field mt"><label>Pejabat penanda tangan</label><select class="input" id="pj">' + opsi.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nama + (p.gelar ? ', ' + p.gelar : '')) + ' — ' + esc(p.jabatan) + (p.adaPin ? '' : ' (PIN belum diatur)') + '</option>'; }).join('') + '</select>' + (opsi.length ? '' : '<div class="help bad">Belum ada pejabat. Tambahkan di menu Doc Engine &amp; TTD → Pejabat.</div>') + '</div><div class="row mt" style="justify-content:flex-end"><button class="btn" data-close>Batal</button><button class="btn primary" id="ajok"' + (opsi.length ? '' : ' disabled') + '>' + ic('send') + 'Ajukan</button></div>');
      $('#ajok', m.el).onclick = async function () { var r = await act(this, 'surat.ajukan', { id: s.id, pejabatId: $('#pj', m.el).value }); if (r.success) { Data.touch(['Surat']); m.close(); d.close(); refreshView(); setTimeout(refreshBadges, 500); } };
    }
  });
}
registerPage('surat', suratPage('all'));
registerPage('surat-masuk', suratPage('masuk'));
registerPage('surat-keluar', suratPage('keluar'));
registerPage('surat-draft', suratPage('draft'));
registerPage('arsip', suratPage('arsip'));
registerPage('disposisi', crudPage({ t: 'Disposisi', title: 'Disposisi Surat', crumb: 'Administrasi Surat', desc: 'Penerusan/instruksi tindak lanjut atas surat ke advokat & staf. Penerima mendapat notifikasi WA/Email bila diaktifkan.', defaults: function () { return { batas: addDays(today(), 3), status: 'Baru' }; },
  tabs: [{ l: 'Semua', f: function () { return true; } }, { l: 'Baru', f: function (r) { return r.status === 'Baru'; } }, { l: 'Dikerjakan', f: function (r) { return r.status === 'Dikerjakan' || r.status === 'Dibaca'; } }, { l: 'Selesai', f: function (r) { return r.status === 'Selesai'; } }] }));
registerPage('penomoran', crudPage({ t: 'Penomoran', title: 'Penomoran Surat &amp; Dokumen', crumb: 'Administrasi Surat', desc: 'Format penomoran baku per jenis dokumen. Placeholder: {URUT} {KODE} {BULAN} (romawi) {BULAN2} {TAHUN}. Nomor urut otomatis reset tiap tahun.', hideNew: false,
  extraTop: function () { return '<div class="card mb" data-smart2></div>'; }, after: function (el) { var b = $('[data-smart2]', el); if (b && !b._done) { b._done = 1; smartFormatter(b); } } }));

// ============================================================ APPROVAL PIMPINAN (Doc Engine inbox)
registerPage('approval', {
  title: 'Approval Pimpinan',
  show: function (el) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = pageHead({ crumb: 'Administrasi • Approval Bertingkat', title: 'Approval &amp; Tanda Tangan Elektronik', desc: 'Dokumen yang menunggu persetujuan Anda. Persetujuan memakai login Google + PIN 6 digit; QR verifikasi & nomor resmi terbit otomatis.', acts: '<a class="btn" href="#/akun">' + ic('key-round') + 'Atur PIN Saya</a>' }) +
        '<div class="seg mb" data-tab><button class="on" data-k="inbox">Menunggu Persetujuan</button><button data-k="riwayat">Riwayat Dokumen Terbit</button></div><div data-c>' + skeleton(3) + '</div>';
      on(el, 'click', '[data-tab] button', function (e, b) { $$('[data-tab] button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); el._k = b.dataset.k; refreshView(); });
    }
    var host = $('[data-c]', el);
    if (el._k === 'riwayat') return dokumenTerbit(host);
    swr('inbox', 'de.inbox', {}, function (d, c, err) {
      if (!d) { host.innerHTML = errorBox(err && err.message, true); return; }
      host.innerHTML = (d.pejabat && !d.pejabat.adaPin ? '<div class="tint row mb">' + ic('triangle-alert') + '<span class="grow small">PIN tanda tangan Anda belum diatur.</span><a class="btn sm primary" href="#/akun">Atur PIN</a></div>' : '') +
        (d.rows.length ? '<div class="grid g2">' + d.rows.map(function (r) {
          var giliran = r.penandatangan.filter(function (s) { return s.status === 'MENUNGGU'; });
          return '<div class="card"><div class="row wrap"><span class="badge warn"><span class="dot"></span>Menunggu TTD</span><span class="badge">' + esc(r.template) + '</span><span class="xs muted right">' + relTime(r.dibuat) + '</span></div><h3 class="h-sm" style="margin:10px 0 4px">' + esc(r.judul) + '</h3>' +
            (r.ringkas.tujuan ? '<div class="small t2">Kepada: <b>' + esc(r.ringkas.tujuan) + '</b></div>' : '') + (r.ringkas.isi ? '<div class="soft small t2 mt-s" style="max-height:120px;overflow:auto">' + esc(r.ringkas.isi) + '</div>' : '') +
            '<div class="stages mt">' + r.penandatangan.map(function (s) { return '<div class="stg ' + (s.status === 'SETUJU' ? 'done' : s.status === 'MENUNGGU' ? 'cur' : '') + '"><i>' + (s.status === 'SETUJU' ? ic('check') : s.slot) + '</i><div class="grow small"><b>' + esc(s.label) + '</b><div class="xs muted">' + esc(s.nama || '-') + ' • ' + esc(s.jabatan || '') + (s.metode ? ' • ' + esc(s.metode) : '') + '</div></div></div>'; }).join('') + '</div>' +
            '<div class="row wrap mt"><button class="btn sm" data-prev="' + r.id + '" data-src="' + esc(r.sumberTabel + ':' + r.sumberId) + '" data-tpl="' + esc(r.templateKode) + '">' + ic('eye') + 'Pratinjau</button><button class="btn sm danger" data-tolak="' + r.id + '" data-slot="' + (giliran[0] ? giliran[0].slot : 1) + '">' + ic('x') + 'Minta Revisi</button>' +
            (d.pejabat ? '<button class="btn sm primary right" data-setuju="' + r.id + '" data-slot="' + (giliran[0] ? giliran[0].slot : 1) + '">' + ic('pen-line') + 'Berikan Approval &amp; TTD</button>' : '') +
            (d.bisaBypass ? '<button class="btn sm" data-bypass="' + r.id + '" data-slot="' + (giliran[0] ? giliran[0].slot : 1) + '" title="Super Admin — wajib alasan">' + ic('shield-alert') + 'Bypass</button>' : '') + '</div></div>';
        }).join('') + '</div>' : '<div class="card">' + emptyState('Tidak ada dokumen menunggu', 'Semua dokumen sudah ditandatangani.', 'file-check') + '</div>');
    }, { fresh: 10000 });
    if (!el._b) {
      el._b = 1;
      var selesai = function (r) { if (r.success) { cacheStale('inbox'); Data.touch(['Surat', 'Invoice', 'LaporanSidang']); refreshView(); setTimeout(refreshBadges, 400); } };
      on(el, 'click', '[data-prev]', async function (e, b) { var src = b.dataset.src.split(':'); await withBusy(b, async function () { var r = await api('de.preview', { templateKode: b.dataset.tpl, sumber: { t: src[0], id: src[1] } }); if (r.success) openBlob(b64Blob(r.data.data, 'application/pdf')); else toast(r.message, 'bad'); }); });
      on(el, 'click', '[data-setuju]', function (e, b) {
        var m = modal('<div class="seal" style="width:54px;height:54px;border-radius:16px;background:var(--primary-100);color:var(--primary-800);display:grid;place-items:center;margin:0 auto 10px">' + ic('file-signature') + '</div><h3 class="h-md" style="text-align:center">Tanda tangan elektronik</h3><p class="small t2" style="text-align:center">Masukkan PIN 6 digit Anda. Tindakan ini tercatat di log audit & halaman verifikasi.</p>' +
          '<input class="input mono" id="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="text-align:center;font-size:22px;letter-spacing:.5em;height:54px" placeholder="••••••"><div class="field mt-s"><label>Catatan (opsional)</label><input class="input" id="cat"></div><div class="row mt" style="justify-content:flex-end"><button class="btn" data-close>Batal</button><button class="btn primary" id="ok">' + ic('check') + 'Setujui &amp; Tandatangani</button></div>');
        $('#ok', m.el).onclick = async function () { var r = await act(this, 'de.setujui', { dokumenId: b.dataset.setuju, slot: +b.dataset.slot, pin: $('#pin', m.el).value, catatan: $('#cat', m.el).value }); if (r.success) { m.close(); selesai(r); } };
        $('#pin', m.el).addEventListener('keydown', function (ev) { if (ev.key === 'Enter') $('#ok', m.el).click(); });
      });
      on(el, 'click', '[data-tolak]', async function (e, b) { var c = await confirmBox('Kembalikan dokumen ini untuk revisi?', { input: 'Catatan revisi', min: 3, ok: 'Minta Revisi', danger: true }); if (c) selesai(await act(b, 'de.tolak', { dokumenId: b.dataset.tolak, slot: +b.dataset.slot, catatan: c })); });
      on(el, 'click', '[data-bypass]', async function (e, b) { var c = await confirmBox('Bypass persetujuan pejabat sebagai Super Admin? Metode BYPASS tercatat permanen & tampil di halaman verifikasi.', { input: 'Alasan bypass (wajib)', min: 5, ok: 'Bypass & Terbitkan' }); if (c) selesai(await act(b, 'de.setujui', { dokumenId: b.dataset.bypass, slot: +b.dataset.slot, bypass: true, catatan: c })); });
    }
  }
});
function dokumenTerbit(host) {
  host = fresh(host);
  swr('dedok', 'de.dokumen', {}, function (rows, c, err) {
    if (!rows) { host.innerHTML = errorBox(err && err.message, true); return; }
    host.innerHTML = '<div class="card pad-0"><div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Dokumen</th><th>Nomor</th><th>Template</th><th>Penanda tangan</th><th>Status</th><th class="num">Aksi</th></tr></thead><tbody>' + (rows.map(function (r) {
      return '<tr><td data-l="Dokumen"><div class="t-main">' + esc(r.judul) + '</div><div class="t-sub">' + tglJam(r.terbit || r.dibuat) + '</div></td><td data-l="Nomor" class="mono">' + esc(r.nomor || '—') + '</td><td data-l="Template">' + esc(r.template) + '</td><td data-l="TTD" class="small">' + r.penandatangan.map(function (s) { return esc(s.nama || '-') + ' <span class="xs muted">' + esc(s.metode || s.status) + '</span>'; }).join('<br>') + '</td><td data-l="Status">' + badge(r.status === 'TERBIT' ? 'Terbit' : r.status === 'MENUNGGU_TTD' ? 'Menunggu TTD' : r.status === 'DITARIK' ? 'Ditarik' : r.status) + '</td>' +
        '<td class="acts">' + (r.berkas.indexOf('pdf') > -1 ? '<button class="btn xs" data-dl="' + r.id + '">' + ic('file-down') + 'PDF</button> ' : '') + (r.berkas.indexOf('docx') > -1 ? '<button class="btn xs" data-dlx="' + r.id + '">DOCX</button> ' : '') + (r.kodeVerifikasi ? '<a class="btn xs" target="_blank" href="verifikasi.html?k=' + esc(r.kodeVerifikasi) + '">' + ic('qr-code') + '</a> ' : '') + (canEdit() && r.status === 'TERBIT' ? '<button class="btn xs danger" data-tarik="' + r.id + '">Tarik</button>' : '') + '</td></tr>';
    }).join('') || '<tr><td colspan="9">' + emptyState('Belum ada dokumen', '') + '</td></tr>') + '</tbody></table></div></div>';
    on(host, 'click', '[data-dl]', function (e, b) { unduhDok(b, b.dataset.dl); });
    on(host, 'click', '[data-dlx]', function (e, b) { unduhDok(b, b.dataset.dlx, 'docx'); });
    on(host, 'click', '[data-tarik]', async function (e, b) { var c = await confirmBox('Tarik dokumen ini? Halaman verifikasi akan menampilkan status DITARIK.', { input: 'Alasan penarikan', min: 5, danger: true, ok: 'Tarik Dokumen' }); if (c) { var r = await act(b, 'de.tarik', { dokumenId: b.dataset.tarik, alasan: c }); if (r.success) { cacheStale('dedok'); dokumenTerbit(host); } } });
  }, { fresh: 15000 });
}

// ============================================================ FINANCE
function finKpi(f) {
  return '<div class="grid g4 keep mb">' + kpi({ label: 'Total Ditagihkan (Bulan Ini)', value: '<span style="font-size:22px">' + rp(f.ditagihBulanIni) + '</span>', icon: 'file-text', foot: '<span>Dari ' + f.nDitagih + ' berkas tagihan terbit</span>' }) +
    kpi({ label: 'Realisasi Terbayar', value: '<span style="font-size:22px">' + rp(f.terbayarBulanIni) + '</span>', icon: 'landmark', tone: 'ok', foot: '<span>Kolektibilitas: ' + f.kolektibilitas + '%</span><span class="badge ok">' + f.nLunas + ' invoice lunas</span>' }) +
    kpi({ label: 'Piutang / Outstanding', value: '<span style="font-size:22px">' + rp(f.outstanding) + '</span>', icon: 'clipboard-list', tone: 'warn', foot: '<span>' + f.klienOutstanding + ' klien</span><span class="badge warn">' + f.nOutstanding + ' perlu reminder</span>' }) +
    kpi({ label: 'Jatuh Tempo (< 7 Hari)', value: '<span style="font-size:22px;color:var(--bad)">' + rp(f.jatuhTempo7) + '</span>', icon: 'siren', tone: 'bad', foot: '<span>' + f.nJatuhTempo7 + ' invoice mendesak</span>' }) + '</div>';
}
function agingCards(f) {
  var tone = ['info', 'warn', 'bad', ''], lbl = ['Status Normal', 'Follow-up Ringan', 'Peringatan Somasi', 'Nihil'];
  return '<div class="row mb"><h3 class="h-sm">' + ic('chart-line') + ' Analisis Aging Buckets Piutang Klien</h3><span class="badge">Real-time Calculation</span></div><div class="grid g4 keep mb">' + f.aging.map(function (b, i) {
    return '<div class="card" style="border-top:3px solid ' + ['var(--primary-800)', 'var(--warn-c)', 'var(--bad)', 'var(--ok)'][i] + '"><div class="row"><span class="lbl">' + esc(b.l) + '</span><span class="badge ' + tone[i] + ' right">' + (i === 3 && !b.n ? lbl[3] : lbl[i]) + '</span></div><div class="row mt-s"><b style="font-size:20px">' + rp(b.total) + '</b><span class="xs muted right">(' + b.n + ' invoice)</span></div>' +
      '<div class="soft xs mt-s"><b>Rincian Debitur Aktif:</b><br>' + (b.debitur.map(function (x) { return esc(x.klien) + ' (' + rpS(x.sisa) + ')'; }).join(', ') || '<span class="muted">Tidak ada</span>') + '</div></div>';
  }).join('') + '</div>';
}
function muatFin() {
  if (muatFin._busy) return; muatFin._busy = true;
  swr('fin', 'finance.summary', {}, function (f, fromCache) { var k = $('.page[data-page="invoice"] [data-kpis]'); if (f && k && !fromCache) k.innerHTML = finKpi(f) + agingCards(f); }, { fresh: 60000 }).then(function () { muatFin._busy = false; });
}
function invoicePaper(i) {
  var st = AppState.settings, items = []; try { items = JSON.parse(i.items || '[]'); } catch (e) {}
  return '<div class="paper"><div class="wm">OFFICIAL</div><div class="row" style="align-items:flex-start"><div><b style="color:var(--primary-800);font-size:15px">' + esc(st.appName || 'SIMLAWFIRM') + '</b><div class="xs muted">ADVOCATES &amp; LEGAL CONSULTANTS</div></div><div class="right" style="text-align:right"><div class="xs muted">FAKTUR TAGIHAN RESMI</div><b class="mono" style="color:var(--primary-800)">' + esc(i.nomor || '(otomatis)') + '</b><div>' + badge(i.status) + '</div></div></div>' +
    '<div class="soft mt row" style="align-items:flex-start"><div class="grow small"><div class="xs muted">KEPADA YTH:</div><b>' + esc(refLabel('Klien', i.klienId)) + '</b></div><div style="text-align:right" class="small"><div class="xs muted">JATUH TEMPO</div><b class="bad">' + tgl(i.jatuhTempo, true) + '</b></div></div>' +
    (i.perkaraId ? '<div class="xs mt-s">Kaitan Perkara: <a href="#/perkara-detail/' + i.perkaraId + '">' + esc(refLabel('Perkara', i.perkaraId)) + '</a></div>' : '') +
    '<div class="lbl mt">Komponen Jasa &amp; Operasional</div><table class="items">' + items.map(function (x, n) { return '<tr><td>' + (n + 1) + '. <b>' + esc(x.uraian) + '</b><div class="xs muted">' + esc(x.keterangan || '') + '</div></td><td style="text-align:right" class="mono">' + nf(x.jumlah) + '</td></tr>'; }).join('') + '</table>' +
    '<table class="tot mt-s"><tr><td>Subtotal Biaya Hukum</td><td style="text-align:right">' + rp(i.subtotal) + '</td></tr><tr><td>PPN ' + esc(i.ppnPersen) + '%</td><td style="text-align:right">+ ' + rp(i.ppn) + '</td></tr><tr><td>PPh 23 (dipotong klien)</td><td style="text-align:right">− ' + rp(i.pph) + '</td></tr><tr><td><b>Total Tagihan Bruto</b></td><td style="text-align:right"><b>' + rp(i.total) + '</b></td></tr><tr><td>Telah Dibayar</td><td style="text-align:right">− ' + rp(i.dibayar) + '</td></tr><tr class="big"><td>SISA TAGIHAN BERSIH</td><td style="text-align:right">' + rp(i.sisa) + '</td></tr></table></div>';
}
function invoiceDrawer(i) {
  var e = canEdit();
  var d = drawer(esc(i.nomor), invoicePaper(i) + (i.catatan ? '<div class="soft small mt">' + esc(i.catatan) + '</div>' : ''),
    (e && i.status !== 'Batal' ? '<button class="btn primary" data-a="kirim">' + ic('send') + 'Kirim Invoice &amp; Link Bayar (Email/WA)</button>' : '') + '<button class="btn" data-a="pdf">' + ic('file-down') + (i.docId ? 'Unduh Faktur PDF' : 'Terbitkan Faktur PDF') + '</button>' +
    (e && Number(i.sisa) > 0 && i.status !== 'Draft' ? '<button class="btn" data-a="bayar">' + ic('wallet') + 'Catat Pembayaran</button>' : '') + (e ? '<button class="btn" data-a="edit">' + ic('pencil') + 'Ubah</button><button class="btn danger" data-a="del">' + ic('trash-2') + '</button>' : ''), { kicker: 'Invoice • ' + esc(i.tipe || ''), wide: true });
  on(d.el, 'click', '[data-a]', async function (ev, b) {
    var a = b.dataset.a;
    if (a === 'kirim') { var r = await act(b, 'invoice.kirim', { id: i.id }); if (r.success) { Data.touch(['Invoice']); d.close(); refreshView(); } }
    if (a === 'pdf') { if (i.docId) return unduhDok(b, i.docId); if (!e) return toast('Faktur belum diterbitkan.', 'warn'); var g = await act(b, 'de.generate', { templateKode: 'INVOICE', sumber: { t: 'Invoice', id: i.id } }); if (g.success) { i.docId = g.data.id; Data.upsert('Invoice', i); unduhDok(null, g.data.id); } }
    if (a === 'bayar') { d.close(); openForm('Pembayaran', null, { defaults: { invoiceId: i.id, tanggal: today(), jumlah: i.sisa, status: 'Terverifikasi', metode: 'Transfer Bank' } }); }
    if (a === 'edit') { d.close(); openForm('Invoice', i, { wide: true }); }
    if (a === 'del') { hapusRow('Invoice', i, d.close); }
  });
}
registerPage('invoice', crudPage({
  t: 'Invoice', title: 'Keuangan, Invoice &amp; Piutang', crumb: '<span class="badge pri"><span class="dot"></span>Keuangan &amp; Penagihan Kantor</span> <span class="muted">• Modul Finance</span>',
  desc: 'Pusat tata kelola penagihan jasa hukum, tracking realisasi pembayaran retainer & success fee, analisis aging piutang klien, serta laporan arus kas operasional kantor.', newLabel: 'Terbitkan Invoice Baru',
  defaults: function () { return { tanggal: today(), status: 'Terbit', ppnPersen: 11, pphPersen: 2 }; }, formOpt: { wide: true },
  acts: function () { return canEdit() ? '<button class="btn" data-remind>' + ic('send') + 'Kirim Pengingat Masal</button>' : ''; },
  filterBy: ['status', 'tipe', 'klienId'], deps: ['Pembayaran'],
  cols: [{ k: 'nomor', l: 'No. Invoice & Tgl', render: function (r) { return '<div class="mono" style="color:' + (r.status !== 'Lunas' && r.jatuhTempo < today() && r.status !== 'Draft' ? 'var(--bad)' : 'var(--primary-800)') + ';font-weight:600">' + esc(r.nomor) + '</div><div class="t-sub">' + tgl(r.tanggal) + '</div>'; } },
    { k: 'klienId', l: 'Klien & No. Perkara', render: function (r) { return '<div class="t-main">' + esc(refLabel('Klien', r.klienId)) + '</div><div class="t-sub ellip" style="max-width:240px">' + esc(r.perkaraId ? refLabel('Perkara', r.perkaraId) : '') + '</div><div class="xs" style="color:var(--primary-800)">' + esc(r.tipe || '') + '</div>'; }, sortVal: function (r) { return refLabel('Klien', r.klienId); } },
    { k: 'total', l: 'Nominal & Sisa', num: 1, render: function (r) { return '<b>' + rp(r.total) + '</b><div class="xs ' + (Number(r.sisa) > 0 ? 'bad' : 'ok') + '">' + (Number(r.sisa) > 0 ? 'Sisa ' + rp(r.sisa) : 'Lunas 100%') + '</div>'; } },
    { k: 'jatuhTempo', l: 'Jatuh Tempo', render: function (r) { var dd = diffDays(r.jatuhTempo); return tgl(r.jatuhTempo) + (Number(r.sisa) > 0 && r.status !== 'Draft' && dd < 0 ? '<div class="xs bad">Terlambat ' + -dd + ' hari</div>' : ''); } }, 'status'],
  kpis: function () { setTimeout(muatFin, 0); var f = cacheGet('fin'); return f ? finKpi(f) + agingCards(f) : '<div class="skel mb" style="height:120px"></div>'; },
  tabs: [{ l: 'Daftar Invoice', f: function () { return true; } }, { l: 'Invoice Terlambat (Overdue)', f: function (r) { return Number(r.sisa) > 0 && r.status !== 'Draft' && r.status !== 'Batal' && r.jatuhTempo < today(); } }, { l: 'Jatuh Tempo < 7 Hari', f: function (r) { var d = diffDays(r.jatuhTempo); return Number(r.sisa) > 0 && d >= 0 && d <= 7; } },
    { l: 'Draft', f: function (r) { return r.status === 'Draft'; } }, { l: 'Lunas', f: function (r) { return r.status === 'Lunas'; } }],
  onRow: function (r) { invoiceDrawer(r); },
  bind: function (el) {
    on(el, 'click', '[data-remind]', async function (e, b) { if (await confirmBox('Kirim pengingat ke semua klien dengan invoice outstanding yang jatuh tempo ≤ 7 hari / terlambat?')) act(b, 'invoice.reminder', {}); });
  }
}));
registerPage('pembayaran', crudPage({ t: 'Pembayaran', title: 'Pembayaran', crumb: 'Finance', desc: 'Catatan & verifikasi pembayaran. Pembayaran terverifikasi otomatis memperbarui sisa invoice, arus kas, riwayat klien, dan mengirim tanda terima.',
  defaults: function () { return { tanggal: today(), status: 'Terverifikasi', metode: 'Transfer Bank' }; },
  tabs: [{ l: 'Semua', f: function () { return true; } }, { l: 'Menunggu Verifikasi', f: function (r) { return r.status === 'Menunggu Verifikasi'; } }, { l: 'Terverifikasi', f: function (r) { return r.status === 'Terverifikasi'; } }, { l: 'Ditolak', f: function (r) { return r.status === 'Ditolak'; } }],
  rowActs: function (r) { return (canEdit() && r.status === 'Menunggu Verifikasi' ? '<button class="btn xs ok solid" data-verif="' + r.id + '">' + ic('check') + 'Verifikasi</button> ' : '') + (r.status === 'Terverifikasi' ? '<button class="btn xs" data-kw="' + r.id + '" data-doc="' + esc(r.docId || '') + '">' + ic('receipt') + 'Kwitansi</button>' : ''); },
  bind: function (el) {
    on(el, 'click', '[data-verif]', async function (e, b) { e.stopPropagation(); var r = (Data.rows('Pembayaran') || []).filter(function (x) { return x.id === b.dataset.verif; })[0]; var res = await act(b, 'crud.save', { t: 'Pembayaran', row: Object.assign({}, r, { status: 'Terverifikasi' }) }); if (res.success) { Data.upsert('Pembayaran', res.data); Data.touch(RELASI.Pembayaran); refreshView(); } });
    on(el, 'click', '[data-kw]', async function (e, b) { e.stopPropagation(); if (b.dataset.doc) return unduhDok(b, b.dataset.doc); var g = await act(b, 'de.generate', { templateKode: 'KWITANSI', sumber: { t: 'Pembayaran', id: b.dataset.kw } }); if (g.success) { Data.stale('Pembayaran'); unduhDok(null, g.data.id); refreshView(); } });
  } }));
registerPage('piutang', {
  title: 'Piutang (Aging)',
  show: function (el) {
    el.innerHTML = pageHead({ crumb: 'Finance', title: 'Piutang &amp; Aging Buckets', desc: 'Tagihan yang belum terbayar, dikelompokkan menurut umur invoice. Kirim pengingat per klien atau massal.', acts: canEdit() ? '<button class="btn primary" data-rem>' + ic('send') + 'Kirim Pengingat Masal</button>' : '' }) + '<div data-a>' + skeleton(3) + '</div><div class="card pad-0" data-t></div>';
    swr('fin', 'finance.summary', {}, function (f) { if (f) $('[data-a]', el).innerHTML = finKpi(f) + agingCards(f); }, { fresh: 60000 });
    Data.load('Invoice', function (rows) {
      if (!rows) return;
      var out = rows.filter(function (r) { return Number(r.sisa) > 0 && r.status !== 'Draft' && r.status !== 'Batal'; }).sort(function (a, b) { return String(a.tanggal).localeCompare(b.tanggal); });
      $('[data-t]', el).innerHTML = '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Invoice</th><th>Klien</th><th class="num">Sisa</th><th>Umur</th><th>Jatuh Tempo</th><th class="num">Aksi</th></tr></thead><tbody>' + (out.map(function (r) {
        var umur = -diffDays(r.tanggal), dd = diffDays(r.jatuhTempo);
        return '<tr data-id="' + r.id + '" class="click"><td data-l="Invoice" class="mono">' + esc(r.nomor) + '</td><td data-l="Klien">' + esc(refLabel('Klien', r.klienId)) + '</td><td data-l="Sisa" class="num"><b>' + rp(r.sisa) + '</b></td><td data-l="Umur">' + badge(umur + ' hari', umur > 90 ? 'bad' : umur > 60 ? 'bad' : umur > 30 ? 'warn' : 'info') + '</td><td data-l="Jatuh tempo">' + tgl(r.jatuhTempo) + (dd < 0 ? ' <span class="xs bad">(' + -dd + ' hari lewat)</span>' : '') + '</td><td class="acts">' + (canEdit() ? '<button class="btn xs" data-r1="' + r.id + '">' + ic('bell') + 'Ingatkan</button>' : '') + '</td></tr>';
      }).join('') || '<tr><td colspan="9">' + emptyState('Tidak ada piutang', 'Semua invoice terbit sudah lunas.', 'party-popper') + '</td></tr>') + '</tbody></table></div>';
    });
    if (!el._b) {
      el._b = 1;
      on(el, 'click', '[data-rem]', function (e, b) { act(b, 'invoice.reminder', {}); });
      on(el, 'click', '[data-r1]', function (e, b) { e.stopPropagation(); act(b, 'invoice.reminder', { ids: [b.dataset.r1] }); });
      on(el, 'click', 'tr[data-id]', function (e, tr) { if (e.target.closest('button')) return; var r = (Data.rows('Invoice') || []).filter(function (x) { return x.id === tr.dataset.id; })[0]; if (r) invoiceDrawer(r); });
    }
  }
});
registerPage('keuangan', {
  title: 'Laporan Keuangan',
  show: function (el) {
    el.innerHTML = pageHead({ crumb: 'Finance • Laporan', title: 'Laporan Keuangan Kantor', desc: 'Pemasukan vs pengeluaran 6 bulan terakhir, komposisi per kategori, dan margin. Data juga menjadi sumber grafik Dashboard Managing Partner.', acts: '<button class="btn" onclick="window.print()">' + ic('printer') + 'Cetak</button><a class="btn" href="#/kas">' + ic('table') + 'Buku Kas</a>' }) + '<div data-c>' + skeleton(4) + '</div>';
    swr('fin', 'finance.summary', {}, function (f, c, err) {
      if (!f) { $('[data-c]', el).innerHTML = errorBox(err && err.message, true); return; }
      var kat = Object.keys(f.perKategori).map(function (k) { var p = k.split('|'); return { jenis: p[0], kat: p[1], n: f.perKategori[k] }; }).sort(function (a, b) { return b.n - a.n; });
      $('[data-c]', el).innerHTML = '<div class="grid g4 keep mb">' + kpi({ label: 'Pemasukan (6 bln)', value: '<span style="font-size:22px">' + rpS(f.totalMasuk) + '</span>', icon: 'trending-up', tone: 'ok' }) + kpi({ label: 'Pengeluaran (6 bln)', value: '<span style="font-size:22px">' + rpS(f.totalKeluar) + '</span>', icon: 'trending-down', tone: 'bad' }) +
        kpi({ label: 'Laba Bersih', value: '<span style="font-size:22px">' + rpS(f.totalMasuk - f.totalKeluar) + '</span>', icon: 'wallet' }) + kpi({ label: 'Net Profit Margin', value: f.margin + '%', icon: 'percent', tone: f.margin >= 0 ? 'ok' : 'bad' }) + '</div>' +
        '<div class="card mb"><div class="card-h"><div class="grow"><h3 class="h-md">Arus Kas Bulanan</h3><div class="sub">Pemasukan honorarium/fee vs pengeluaran operasional.</div></div></div><div data-ch></div></div>' +
        '<div class="grid g2"><div class="card pad-0"><div class="toolbar"><b>Rekap Bulanan</b></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Bulan</th><th class="num">Pemasukan</th><th class="num">Pengeluaran</th><th class="num">Net</th></tr></thead><tbody>' + f.arus.map(function (a) { return '<tr><td>' + BULAN[+a.bulan.slice(5) - 1] + ' ' + a.bulan.slice(0, 4) + '</td><td class="num">' + rp(a.masuk) + '</td><td class="num">' + rp(a.keluar) + '</td><td class="num ' + (a.net >= 0 ? 'ok' : 'bad') + '"><b>' + rp(a.net) + '</b></td></tr>'; }).join('') + '</tbody></table></div></div>' +
        '<div class="card pad-0"><div class="toolbar"><b>Per Kategori (tahun berjalan)</b></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kategori</th><th>Jenis</th><th class="num">Jumlah</th></tr></thead><tbody>' + kat.map(function (k) { return '<tr><td>' + esc(k.kat) + '</td><td>' + badge(k.jenis, k.jenis === 'Pemasukan' ? 'ok' : 'bad') + '</td><td class="num">' + rp(k.n) + '</td></tr>'; }).join('') + '</tbody></table></div></div></div>';
      barChart($('[data-ch]', el), { cats: f.arus.map(function (a) { return BLN[+a.bulan.slice(5) - 1]; }), series: [{ name: 'Pemasukan', color: C1, values: f.arus.map(function (a) { return a.masuk; }) }, { name: 'Pengeluaran', color: C2, values: f.arus.map(function (a) { return a.keluar; }) }], fmt: rp, short: function (v) { return Math.round(v / 1e6) + 'M'; }, height: 260, labelAll: true });
    }, { fresh: 60000 });
  }
});
registerPage('kas', crudPage({ t: 'Kas', title: 'Arus Kas', crumb: 'Finance', desc: 'Buku kas pemasukan & pengeluaran kantor. Pembayaran terverifikasi tercatat otomatis.', defaults: function () { return { tanggal: today(), jenis: 'Pengeluaran' }; },
  tabs: [{ l: 'Semua', f: function () { return true; } }, { l: 'Pemasukan', f: function (r) { return r.jenis === 'Pemasukan'; } }, { l: 'Pengeluaran', f: function (r) { return r.jenis === 'Pengeluaran'; } }],
  kpis: function (rows) { var bln = today().slice(0, 7), m = rows.filter(function (r) { return String(r.tanggal).slice(0, 7) === bln; }); var sum = function (j) { return m.filter(function (r) { return r.jenis === j; }).reduce(function (a, r) { return a + Number(r.jumlah || 0); }, 0); };
    return '<div class="grid g3 keep mb">' + kpi({ label: 'Pemasukan bulan ini', value: '<span style="font-size:22px">' + rpS(sum('Pemasukan')) + '</span>', icon: 'arrow-down-left', tone: 'ok' }) + kpi({ label: 'Pengeluaran bulan ini', value: '<span style="font-size:22px">' + rpS(sum('Pengeluaran')) + '</span>', icon: 'arrow-up-right', tone: 'bad' }) + kpi({ label: 'Saldo bulan ini', value: '<span style="font-size:22px">' + rpS(sum('Pemasukan') - sum('Pengeluaran')) + '</span>', icon: 'wallet' }) + '</div>'; } }));

// ============================================================ PEOPLE
function personelPage(kat, title) {
  return crudPage({ t: 'Personel', title: title, crumb: 'People Management', desc: 'Profil, spesialisasi, izin praktik, dan kapasitas penanganan perkara.', filter: function (r) { return r.kategori === kat; }, defaults: { kategori: kat, status: 'Aktif', kapasitas: 12 },
    cols: [{ k: 'nama', l: 'Nama', render: function (r) { return '<div class="row"><div class="avatar sm">' + esc(initials(r.nama)) + '</div><div><div class="t-main">' + esc(r.nama) + '</div><div class="t-sub">' + esc(r.jabatan || '') + '</div></div></div>'; } }, 'spesialisasi', 'email', 'wa', 'status'] });
}
registerPage('advokat', personelPage('Advokat & Partner', 'Advokat &amp; Partner'));
registerPage('paralegal', personelPage('Paralegal', 'Paralegal'));
registerPage('staff', personelPage('Staff', 'Staff Pendukung'));
registerPage('workload', {
  title: 'Workload',
  show: function (el) {
    if (!el._init) { el._init = true; el.innerHTML = pageHead({ crumb: 'Kantor Hukum • Strategic Operations • People, Knowledge &amp; BD', title: 'People, Knowledge &amp; Business Development', desc: 'Manajemen kapasitas tim advokat & paralegal, repositori preseden & template hukum kantor, serta akselerasi kemitraan strategis.', acts: canEdit() ? '<button class="btn" data-exp>' + ic('download') + 'Ekspor Data SDM</button><button class="btn primary" data-new>' + ic('user-plus') + 'Tambah Advokat / Personel</button>' : '' }) + '<div data-c>' + skeleton(5) + '</div>';
      on(el, 'click', '[data-new]', function () { openForm('Personel', null, { defaults: { status: 'Aktif', kapasitas: 12 } }); });
      on(el, 'click', '[data-exp]', function () { exportRows('Personel', Data.rows('Personel') || [], 'SDM'); });
      on(el, 'click', '[data-prof]', function (e, b) { var r = (Data.rows('Personel') || []).filter(function (x) { return x.id === b.dataset.prof; })[0]; if (r) openDetail('Personel', r); else Data.load('Personel', function (rs) { var x = (rs || []).filter(function (y) { return y.id === b.dataset.prof; })[0]; if (x) openDetail('Personel', x); }); });
      on(el, 'click', '[data-tugas]', function (e, b) { openForm('Task', null, { defaults: { picId: b.dataset.tugas, tenggat: addDays(today(), 3), prioritas: 'Sedang' } }); });
    }
    swr('wl', 'workload', {}, function (d, c, err) {
      if (!d) { $('[data-c]', el).innerHTML = errorBox(err && err.message, true); return; }
      var r = d.ringkas;
      $('[data-c]', el).innerHTML = '<div class="grid g4 keep mb">' + kpi({ label: 'Total Personel Hukum', value: r.total, unit: 'Personel', icon: 'users', foot: r.advokat + ' Advokat, ' + r.paralegal + ' Paralegal, ' + r.staff + ' Staff' }) +
        kpi({ label: 'Rata-rata Workload', value: r.rataBeban + '%', icon: 'gauge', tone: r.overload ? 'bad' : 'ok', bar: r.rataBeban, foot: r.overload ? '<span class="badge bad">' + r.overload + ' Overload</span>' : 'Optimal terdistribusi' }) +
        kpi({ label: 'Aset Pengetahuan & Template', value: r.library + r.template + r.sop, unit: 'Dokumen', icon: 'library', foot: r.library + ' referensi • ' + r.template + ' template • ' + r.sop + ' SOP' }) +
        kpi({ label: 'Pipeline Bisnis & Pelatihan', value: '<span style="font-size:24px">' + rpS(r.pipeline) + '</span>', icon: 'circle-dollar-sign', foot: r.nPeluang + ' peluang aktif • ' + r.pelatihanAktif + ' workshop' }) + '</div>' +
        '<div class="row mb"><h3 class="h-md grow">Monitoring Kapasitas &amp; Distribusi Perkara Tim</h3><div class="legend"><span><i style="background:var(--bad)"></i>Overload (&gt;85%)</span><span><i style="background:var(--primary-800)"></i>Optimal (60–85%)</span><span><i style="background:var(--ok)"></i>Tersedia (&lt;60%)</span></div></div>' +
        '<div class="grid g3">' + d.rows.map(function (w) {
          var tone = w.level === 'Overload' ? 'bad' : w.level === 'Optimal' ? 'pri' : 'ok';
          return '<div class="card pcard"><div class="row" style="align-items:flex-start"><div class="avatar soft">' + esc(initials(w.nama)) + '</div><div class="grow" style="min-width:0"><b class="ellip" style="display:block">' + esc(w.nama) + '</b><div class="xs muted">' + esc(w.jabatan || '') + (w.spesialisasi ? ' • ' + esc(w.spesialisasi) : '') + '</div></div><span class="badge ' + tone + '">' + (w.level === 'Overload' ? ic('triangle-alert') : '') + w.level + ' ' + w.beban + '%</span></div>' +
            '<div class="stats"><div><b>' + w.perkara + '</b><span>Perkara Aktif</span></div><div><b class="' + (w.sidang >= 3 ? 'bad' : '') + '">' + w.sidang + '</b><span>Sidang Pekan Ini</span></div><div><b>' + w.task + '</b><span>Task Terbuka</span></div></div>' +
            '<div><div class="row xs"><span class="muted">Indeks Beban Kerja</span><span class="right ' + (tone === 'bad' ? 'bad' : '') + '">' + w.beban + '% (' + w.perkara + '/' + w.kapasitas + ')</span></div>' + meter(w.beban, tone === 'bad' ? 'bad' : tone === 'ok' ? 'ok' : '') + '</div>' +
            '<div class="soft xs"><div class="lbl">Perkara Utama</div>' + (w.utama.map(function (u) { return '• ' + esc(u); }).join('<br>') || '<span class="muted">—</span>') + '</div>' +
            '<div class="row"><button class="btn sm grow" data-prof="' + w.id + '">Detail Profil</button>' + (canEdit() ? '<button class="btn sm ' + (w.level === 'Overload' ? 'danger solid' : 'primary') + ' grow" data-tugas="' + w.id + '">' + (w.level === 'Overload' ? 'Alihkan Beban' : '+ Tugaskan') + '</button>' : '') + '</div></div>';
        }).join('') + '</div>';
    }, { fresh: 60000 });
  }
});

// ============================================================ KNOWLEDGE
registerPage('library', crudPage({ t: 'Library', title: 'Legal Library', crumb: 'Knowledge Management', desc: 'Kumpulan referensi hukum: peraturan, yurisprudensi, putusan, dan artikel.', filterBy: ['jenis', 'kategori'] }));
registerPage('sop', crudPage({ t: 'SOP', title: 'Standard Operating Procedure', crumb: 'Knowledge Management', desc: 'SOP kantor agar prosedur kerja konsisten & mudah diakses staf.', defaults: function () { return { tanggal: today(), status: 'Berlaku', versi: '1.0' }; } }));
registerPage('template', {
  title: 'Template Dokumen',
  show: function (el) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = pageHead({ crumb: 'Knowledge Management • Doc Engine', title: 'Template Dokumen', desc: 'Template Google Docs/Sheets/Slides dengan placeholder {{...}}. Sistem memindai placeholder → form otomatis → terbit PDF/DOCX ber-QR verifikasi.',
        acts: canEdit() ? '<a class="btn" href="#/doc-engine">' + ic('settings-2') + 'Kelola Template &amp; Pejabat</a>' : '' }) + '<div data-c>' + skeleton(4) + '</div>';
      on(el, 'click', '[data-pakai]', function (e, b) { var t = (el._tpl || []).filter(function (x) { return x.kode === b.dataset.pakai; })[0]; if (t) pakaiTemplate(t); });
    }
    swr('tpl', 'de.templates', {}, function (rows, c, err) {
      if (!rows) { $('[data-c]', el).innerHTML = errorBox(err && err.message, true); return; }
      el._tpl = rows;
      $('[data-c]', el).innerHTML = rows.length ? '<div class="grid g3">' + rows.map(function (t) {
        return '<div class="card"><div class="row" style="align-items:flex-start"><div class="kpi" style="padding:0"><div class="ico">' + ic(t.engine === 'slides' ? 'presentation' : t.engine === 'sheets' ? 'sheet' : 'file-text') + '</div></div><div class="grow"><b>' + esc(t.nama) + '</b><div class="xs muted">' + esc(t.modul || '') + ' • ' + esc(t.engine.toUpperCase()) + '</div></div><span class="badge pri">v' + t.versi + '</span></div>' +
          '<div class="row wrap gap-s mt-s"><span class="badge">' + t.bidang.length + ' kolom isian</span><span class="badge">' + t.slotTtd.length + ' slot TTD</span>' + t.keluaran.map(function (k) { return '<span class="badge info">' + k.toUpperCase() + '</span>'; }).join('') + (t.slotTtd.some(function (s) { return s.wajibSetuju; }) ? '<span class="badge warn">Approval PIN</span>' : '') + (t.aktif ? '' : '<span class="badge bad">Nonaktif</span>') + '</div>' +
          '<div class="row mt"><span class="xs muted">Sumber data: ' + esc(t.sumberTabel ? T(t.sumberTabel).label : 'isian manual') + '</span>' + (canEdit() && t.aktif ? '<button class="btn sm primary right" data-pakai="' + esc(t.kode) + '">Pakai Template</button>' : '') + '</div></div>';
      }).join('') + '</div>' : '<div class="card">' + emptyState('Belum ada template', 'Super Admin: buka Doc Engine & TTD → "Buat Template Contoh" atau pindai template Anda.', 'file-plus') + '</div>';
    }, { fresh: 60000 });
  }
});
/** Form "Pakai Template": pilih data sumber atau isi formulir dari skema hasil pindai → pratinjau / terbitkan. */
function pakaiTemplate(t) {
  var src = t.sumberTabel, rows = src ? (Data.rows(src) || []) : [];
  var manual = t.bidang.filter(function (b) { return b.tipe !== 'gambar'; });
  var body = (src ? '<div class="field mb"><label>Data sumber (' + esc(T(src).label) + ')</label><select class="input" id="srcid"><option value="">— isi manual —</option>' + rows.slice(-300).reverse().map(function (r) { return '<option value="' + r.id + '">' + esc(r[T(src).title] || r.id) + ' (' + r.id + ')</option>'; }).join('') + '</select><div class="help">Pilih data untuk mengisi otomatis seluruh placeholder. Kolom di bawah hanya untuk menimpa nilai.</div></div>' : '') +
    '<div class="form-grid">' + manual.map(function (b) {
      var id = 'de_' + b.kunci, lab = '<label for="' + id + '">' + esc(b.label) + (b.wajib && !src ? ' <span class="req">*</span>' : '') + '</label>';
      if (b.tipe === 'daftar') return '<div class="field full">' + lab + '<textarea class="input" id="' + id + '" rows="3" placeholder="Satu baris per item; kolom dipisah | (' + esc(b.kolom.map(function (k) { return k.kunci; }).join(' | ')) + ')"></textarea></div>';
      if (b.tipe === 'naskah') return '<div class="field full">' + lab + '<div class="editor"><div class="ed" contenteditable="true" id="' + id + '"></div></div></div>';
      if (b.tipe === 'area') return '<div class="field full">' + lab + '<textarea class="input" id="' + id + '" rows="2"></textarea></div>';
      return '<div class="field">' + lab + '<input class="input" id="' + id + '" type="' + ({ tanggal: 'date', angka: 'number' }[b.tipe] || 'text') + '"></div>';
    }).join('') + '</div>';
  var d = drawer('Pakai Template: ' + esc(t.nama), body, '<button class="btn" data-close>Batal</button><button class="btn" data-prev>' + ic('eye') + 'Pratinjau PDF</button><button class="btn primary" data-gen>' + ic('file-badge') + (t.slotTtd.some(function (s) { return s.wajibSetuju; }) ? 'Ajukan untuk TTD' : 'Terbitkan Dokumen') + '</button>', { kicker: 'Doc Engine • ' + t.kode, wide: true });
  var kumpul = function () {
    var o = {};
    manual.forEach(function (b) {
      var x = $('#de_' + b.kunci, d.el); if (!x) return;
      if (b.tipe === 'naskah') { if (x.innerHTML.trim()) o[b.kunci] = x.innerHTML; return; }
      var v = x.value.trim(); if (v === '') return;
      if (b.tipe === 'daftar') o[b.kunci] = v.split('\n').filter(String).map(function (l) { var p = l.split('|'), it = {}; b.kolom.forEach(function (k, i) { it[k.kunci] = (p[i] || '').trim(); }); return it; });
      else o[b.kunci] = b.tipe === 'angka' ? Number(v) : v;
    });
    return o;
  };
  var srcSel = function () { var s = $('#srcid', d.el); return s && s.value ? { t: src, id: s.value } : null; };
  $('[data-prev]', d.el).onclick = async function () { var b = this; await withBusy(b, async function () { var r = await api('de.preview', { templateKode: t.kode, sumber: srcSel(), isian: kumpul() }); if (r.success) openBlob(b64Blob(r.data.data, 'application/pdf')); else toast(r.message, 'bad'); }); };
  $('[data-gen]', d.el).onclick = async function () { var r = await act(this, 'de.generate', { templateKode: t.kode, sumber: srcSel(), isian: kumpul() }); if (r.success) { d.close(); cacheStale('dedok'); if (src) Data.stale(src); if (r.data.status === 'TERBIT') unduhDok(null, r.data.id); else go('approval'); } };
}

// ============================================================ BUSINESS DEVELOPMENT
registerPage('konten', crudPage({ t: 'Konten', title: 'Content Planner', crumb: 'Business Development', desc: 'Perencanaan & penjadwalan konten publikasi / marketing kantor.', defaults: function () { return { tanggalTerbit: addDays(today(), 7), status: 'Ide' }; },
  tabs: [{ l: 'Semua', f: function () { return true; } }].concat(['Ide', 'Draft', 'Review', 'Terjadwal', 'Terbit'].map(function (s) { return { l: s, f: function (r) { return r.status === s; } }; })) }));
registerPage('partnership', crudPage({ t: 'Partnership', title: 'Partnership', crumb: 'Business Development', desc: 'Kerja sama/kemitraan kantor dengan institusi publik, korporasi, perbankan, dan universitas.' }));
registerPage('peluang', crudPage({ t: 'Peluang', title: 'CRM / Leads Bisnis', crumb: 'Business Development', desc: 'Pipeline peluang bisnis (retainer, pelatihan, kemitraan) beserta nilai & probabilitas closing.', defaults: { tahap: 'Prospek', probabilitas: 20 },
  kpis: function (rows) { var aktif = rows.filter(function (r) { return !/Closing/.test(r.tahap); }), w = aktif.reduce(function (a, r) { return a + Number(r.nilai || 0) * Number(r.probabilitas || 0) / 100; }, 0);
    return '<div class="grid g4 keep mb">' + kpi({ label: 'Pipeline Aktif', value: '<span style="font-size:22px">' + rpS(aktif.reduce(function (a, r) { return a + Number(r.nilai || 0); }, 0)) + '</span>', icon: 'circle-dollar-sign', foot: aktif.length + ' peluang' }) + kpi({ label: 'Nilai Tertimbang', value: '<span style="font-size:22px">' + rpS(w) + '</span>', icon: 'scale' }) +
      kpi({ label: 'Closing Menang', value: cntBy(rows, function (r) { return r.tahap === 'Closing (Menang)'; }), icon: 'trophy', tone: 'ok' }) + kpi({ label: 'Closing Kalah', value: cntBy(rows, function (r) { return r.tahap === 'Closing (Kalah)'; }), icon: 'circle-x', tone: 'bad' }) + '</div>'; },
  tabs: [{ l: 'Semua', f: function () { return true; } }, { l: 'Aktif', f: function (r) { return !/Closing/.test(r.tahap); } }, { l: 'Menang', f: function (r) { return r.tahap === 'Closing (Menang)'; } }] }));
registerPage('pelatihan', crudPage({ t: 'Pelatihan', title: 'Database Pelatihan', crumb: 'Business Development', desc: 'Pelatihan/workshop beserta daftar peserta. Sertifikat ber-QR dapat dibuat massal.', defaults: function () { return { tanggal: addDays(today(), 30), status: 'Rencana' }; },
  onRow: function (p) { pelatihanDrawer(p); } }));
function pelatihanDrawer(p) {
  var render = function (ps) {
    return '<dl class="dl"><dt>Tanggal</dt><dd>' + tgl(p.tanggal, true) + '</dd><dt>Lokasi</dt><dd>' + esc(p.lokasi || '-') + '</dd><dt>Pembicara</dt><dd>' + esc(p.pembicara || '-') + '</dd><dt>Kuota</dt><dd>' + ps.length + ' / ' + esc(p.kuota || '-') + '</dd><dt>Status</dt><dd>' + badge(p.status) + '</dd></dl>' + (p.deskripsi ? '<p class="small t2">' + esc(p.deskripsi) + '</p>' : '') +
      '<div class="sec-t">Peserta (' + ps.length + ')' + (canEdit() ? '<button class="btn xs right" data-addp>' + ic('plus') + 'Peserta</button>' : '') + '</div>' + (ps.map(function (x) { return '<div class="soft row mb small"><div class="avatar sm soft">' + esc(initials(x.nama)) + '</div><div class="grow"><b>' + esc(x.nama) + '</b><div class="xs muted">' + esc(x.instansi || '') + ' • ' + esc(x.email || '') + '</div></div>' + badge(x.status) + (x.docId ? '<button class="btn xs" data-sert="' + x.docId + '">' + ic('award') + '</button>' : '') + '</div>'; }).join('') || '<div class="muted small">Belum ada peserta.</div>') +
      '<div class="tint mt" data-mass><b class="small">' + ic('award') + ' Sertifikat massal</b><div class="xs t2">Membuat sertifikat PDF ber-QR untuk peserta berstatus Hadir/Lulus (atau semua bila belum ditandai) lewat antrean di server.</div><div class="row mt-s"><button class="btn sm primary" data-gen>Generate Sertifikat</button><span class="xs muted" data-ms></span></div></div>';
  };
  var ps = (Data.rows('PesertaPelatihan') || []).filter(function (x) { return x.pelatihanId === p.id; });
  var d = drawer(esc(p.judul), render(ps), canEdit() ? '<button class="btn" data-ed>' + ic('pencil') + 'Ubah</button>' : '', { kicker: 'Pelatihan • ' + p.id });
  Data.load('PesertaPelatihan', function (rows) { if (rows) { ps = rows.filter(function (x) { return x.pelatihanId === p.id; }); $('.drawer-b', d.el).innerHTML = render(ps); } });
  on(d.el, 'click', '[data-addp]', function () { openForm('PesertaPelatihan', null, { defaults: { pelatihanId: p.id, status: 'Terdaftar' }, hideF: ['pelatihanId'], onSaved: function () { d.close(); pelatihanDrawer(p); } }); });
  on(d.el, 'click', '[data-ed]', function () { d.close(); openForm('Pelatihan', p); });
  on(d.el, 'click', '[data-sert]', function (e, b) { unduhDok(b, b.dataset.sert); });
  on(d.el, 'click', '[data-gen]', async function (e, b) {
    var target = ps.filter(function (x) { return /Hadir|Lulus/.test(x.status) && !x.docId; }); if (!target.length) target = ps.filter(function (x) { return !x.docId; });
    if (!target.length) return toast('Semua peserta sudah memiliki sertifikat.', 'warn');
    var r = await act(b, 'de.massal', { templateKode: 'SERTIFIKAT', sumberTabel: 'PesertaPelatihan', ids: target.map(function (x) { return x.id; }) });
    if (r.success) { var ms = $('[data-ms]', d.el), tick = async function () { var s = await api('de.massalStatus', { batch: r.data.batch }); if (s.success && ms) { ms.textContent = s.data.SELESAI + ' selesai • ' + s.data.MENUNGGU + ' antre • ' + s.data.GAGAL + ' gagal'; if (s.data.MENUNGGU && document.body.contains(ms)) setTimeout(tick, 15000); else Data.stale('PesertaPelatihan'); } }; tick(); }
  });
}
