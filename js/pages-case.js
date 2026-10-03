/* ============================================================
   SIMLAWFIRM — pages-case.js
   Client Management (Leads + konversi, Klien + detail, Konsultasi, Riwayat)
   Case / Perkara (daftar, detail ber-timeline, Sidang, Timeline, Laporan Sidang, Dokumen)
   ============================================================ */
'use strict';
function cntBy(rows, f) { return rows.filter(f).length; }
function waBtn(hp, label) { return hp ? '<a class="btn xs' + (label ? '' : ' icon') + '" href="https://wa.me/' + esc(String(hp).replace(/^0/, '62')) + '" target="_blank" rel="noopener" title="Hubungi via WhatsApp" aria-label="WhatsApp" onclick="event.stopPropagation()">' + ic('message-circle') + (label || '') + '</a>' : ''; }

// ============================================================ LEADS + KONVERSI
var LeadSel = { id: '' };
registerPage('leads', crudPage({
  t: 'Leads', title: 'Client Management &amp; Leads', crumb: 'Client Management <span class="badge pri">Calon Klien</span>',
  desc: 'Kelola prospek calon klien, konversi otomatis ke klien aktif tanpa input ulang, serta pemantauan riwayat konsultasi.',
  deps: ['Klien', 'Konsultasi', 'RiwayatKlien'], newLabel: 'Tambah Calon Klien / Leads', defaults: function () { return { tglMasuk: today(), status: 'Baru Masuk' }; },
  cols: ['nama', 'kategori', 'sumber', { k: 'picId', l: 'Tanggal Masuk & PIC', render: function (r) { return '<div class="row gap-s"><div class="avatar sm soft">' + esc(initials(refLabel('Personel', r.picId))) + '</div><div><div class="small">' + esc(refLabel('Personel', r.picId) || '—') + '</div><div class="xs muted">' + tgl(r.tglMasuk) + '</div></div></div>'; } }, 'status'],
  kpis: function (rows) {
    var klien = Data.rows('Klien') || [], ks = Data.rows('Konsultasi') || [], mg = addDays(today(), -7), b30 = addDays(today(), -30);
    var konv = cntBy(rows, function (r) { return r.status === 'Klien Aktif'; }), tot = rows.filter(function (r) { return r.status !== 'Arsip / Batal'; }).length;
    var ksMinggu = ks.filter(function (k) { return k.tanggal >= mg && k.tanggal <= addDays(today(), 7); });
    return '<div class="grid g4 keep mb">' + kpi({ label: 'Total Calon Klien (Leads)', value: rows.length, unit: '+' + cntBy(rows, function (r) { return r.tglMasuk >= b30; }) + ' bulan ini', icon: 'user-plus', bar: Math.min(100, rows.length * 4) }) +
      kpi({ label: 'Tingkat Konversi (Deal)', value: (tot ? Math.round(konv / tot * 1000) / 10 : 0) + '%', unit: konv + ' Klien Aktif', icon: 'badge-check', tone: 'ok', bar: tot ? konv / tot * 100 : 0 }) +
      kpi({ label: 'Konsultasi Pekan Ini', value: ksMinggu.length, unit: cntBy(ksMinggu, function (k) { return /Meet|Zoom/.test(k.media); }) + ' Meet • ' + cntBy(ksMinggu, function (k) { return /Offline/.test(k.media); }) + ' Offline', icon: 'calendar-check', foot: '<a href="#/konsultasi">Agenda terjadwal rapi</a>' }) +
      kpi({ label: 'Total Korporasi & Retainer', value: cntBy(klien, function (k) { return /Badan/.test(k.jenis); }), unit: 'Entitas Terdaftar', icon: 'building-2', foot: ic('circle-check') + ' ' + cntBy(klien, function (k) { return k.status === 'Aktif'; }) + ' kontrak legal aktif' }) + '</div>';
  },
  tabs: [{ l: 'Semua Leads', f: function () { return true; } }, { l: 'Perlu Follow-up', f: function (r) { return r.status === 'Follow-up' || r.status === 'Baru Masuk'; } }, { l: 'Jadwal Konsultasi', f: function (r) { return r.status === 'Konsultasi Terjadwal'; } },
         { l: 'Deal / Siap Konversi', f: function (r) { return r.status === 'Deal / Siap Konversi'; } }, { l: 'Klien Aktif', f: function (r) { return r.status === 'Klien Aktif'; } }, { l: 'Arsip / Batal', f: function (r) { return r.status === 'Arsip / Batal'; } }],
  rowActs: function (r) {
    if (r.klienId) return '<a class="btn xs" href="#/klien-detail/' + r.klienId + '" onclick="event.stopPropagation()">' + ic('external-link') + 'Profil Klien</a>';
    return (canEdit() && /Deal/.test(r.status) ? '<button class="btn xs primary" data-conv="' + r.id + '">' + ic('repeat') + 'Konversi Klien</button> ' : '') + waBtn(r.wa);
  },
  onRow: function (r) { LeadSel.id = r.id; refreshView(); setTimeout(function () { var b = $('.page[data-page="leads"] [data-bottom]'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); },
  bind: function (el) {
    on(el, 'click', '[data-conv]', function (e, b) { e.stopPropagation(); LeadSel.id = b.dataset.conv; refreshView(); setTimeout(function () { var f = $('[data-convf]', el); if (f) f.scrollIntoView({ behavior: 'smooth' }); }, 60); });
  },
  after: function (el, rows, all) {
    var host = $('[data-bottom]', el), l = all.filter(function (x) { return x.id === LeadSel.id; })[0] || all.filter(function (x) { return /Deal/.test(x.status); })[0];
    if (!l) { host.innerHTML = ''; return; }
    var riw = (Data.rows('RiwayatKlien') || []).filter(function (x) { return x.leadId === l.id || (l.klienId && x.klienId === l.klienId); }).slice(-6).reverse();
    var ks = (Data.rows('Konsultasi') || []).filter(function (x) { return x.leadId === l.id; });
    host.innerHTML = '<div class="split wide"><div class="card"><div class="row" style="align-items:flex-start"><div class="avatar lg">' + esc(initials(l.nama)) + '</div><div class="grow"><div class="row wrap"><h3 class="h-md">' + esc(l.nama) + '</h3>' + badge(l.status) + '</div><div class="small t2">' + esc(l.jenis || '') + ' • ' + esc(l.keterangan || l.kategori || '') + '</div>' +
      '<div class="xs muted mono mt-s">' + esc(l.email || '') + ' • ' + esc(l.wa || '') + '</div></div>' + (canEdit() ? '<button class="btn sm" data-editlead>' + ic('pencil') + 'Ubah</button>' : '') + '</div>' +
      '<div class="tint mt"><div class="row"><span class="lbl" style="color:var(--primary-800)">Ringkasan Perkara Utama</span><span class="small t2 right">Estimasi: <b>' + (l.nilaiPerkara ? rp(l.nilaiPerkara) : '—') + '</b></span></div><p class="small" style="margin:8px 0">' + esc(l.ringkasan || 'Belum ada ringkasan masalah.') + '</p>' +
      '<div class="xs"><b style="color:var(--primary-800)">Lawyer Lead:</b> ' + esc(refLabel('Personel', l.picId) || '—') + ' • <b style="color:var(--primary-800)">Sumber:</b> ' + esc(l.sumber || '—') + '</div></div>' +
      '<div class="sec-t">' + ic('activity') + 'Riwayat &amp; Jejak Langkah Calon Klien</div><div class="tl">' + ks.map(function (k) { return '<div class="tl-item"><div class="tl-card"><h4>' + esc(k.topik) + '<span class="xs muted right">' + tgl(k.tanggal) + ' ' + esc(k.jam || '') + '</span></h4><p>' + esc(k.catatan || k.media || '') + '</p>' + (k.hasil ? '<span class="badge ok mt-s">' + esc(k.hasil) + '</span>' : '') + '</div></div>'; }).join('') +
      riw.map(function (x) { return '<div class="tl-item"><div class="tl-card"><h4>' + esc(x.jenis) + '<span class="xs muted right">' + tgl(x.tanggal) + '</span></h4><p>' + esc(x.ringkasan) + '</p></div></div>'; }).join('') +
      '<div class="tl-item"><div class="tl-card"><h4>Leads terdaftar &amp; inisiasi dossier<span class="xs muted right">' + tgl(l.tglMasuk) + '</span></h4><p>' + esc(l.sumber || '') + '</p></div></div></div>' +
      (canEdit() ? '<button class="btn sm mt-s" data-ksl>' + ic('calendar-plus') + 'Jadwalkan Konsultasi</button>' : '') + '</div>' +
      (l.klienId ? '<div class="card"><div class="empty">' + ic('badge-check') + '<b>Sudah menjadi klien aktif</b><a class="btn sm mt-s" href="#/klien-detail/' + l.klienId + '">Buka profil klien</a></div></div>' :
      '<div class="card" data-convf><div class="row" style="align-items:flex-start"><div class="kpi" style="padding:0"><div class="ico">' + ic('user-check') + '</div></div><div class="grow"><h3 class="h-sm">Konversi Cepat ke Klien Aktif</h3><div class="xs muted">Generate berkas perkara &amp; buka akses portal</div></div><span class="badge ok">Tahap Akhir</span></div>' +
      '<div class="col mt" style="gap:12px"><div class="field"><label>Tipe Entitas Legal</label><div class="seg sq" data-jenis style="width:100%;display:flex">' + ['Badan Usaha (PT/CV)', 'Perorangan'].map(function (j) { return '<button type="button" style="flex:1;justify-content:center" class="' + ((l.jenis || 'Badan Usaha (PT/CV)') === j ? 'on' : '') + '">' + j + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label>Nomor Induk Klien <span class="xs muted">(Sistem ID otomatis)</span></label><div class="input-ic">' + ic('lock') + '<input class="input mono" value="KL-' + new Date().getFullYear() + '-otomatis" disabled></div></div>' +
      '<div class="form-grid"><div class="field"><label>PIC / Direksi</label><input class="input" data-k="pic"></div><div class="field"><label>NPWP</label><input class="input" data-k="npwp"></div></div>' +
      '<div class="field"><label>Alamat</label><input class="input" data-k="alamat"></div>' +
      '<div class="form-grid"><div class="field"><label>Metode Retainer</label><select class="input" data-k="retainer">' + ['Success Fee + Termin', 'Retainer Bulanan', 'Lumpsum', 'Per Jam (Hourly)', 'Pro Bono'].map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label>Lawyer Lead</label><select class="input" data-k="picId">' + (AppState.refs.Personel || []).map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === l.picId ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select></div></div>' +
      '<label class="check small"><input type="checkbox" data-o="perkara" checked> Buat berkas perkara baru</label><input class="input sm" data-k="judul" value="' + esc((l.kategori || 'Perkara') + ' — ' + l.nama) + '" aria-label="Judul perkara">' +
      '<label class="check small"><input type="checkbox" data-o="portal"' + (l.email ? ' checked' : ' disabled') + '> Kirimkan kredensial Client Portal via WhatsApp &amp; Email PIC</label>' +
      '<label class="check small"><input type="checkbox" data-o="folder" checked> Otomatis buat Folder Dossier di Google Drive</label>' +
      '<button class="btn primary block" data-doconv>' + ic('circle-check') + 'Konfirmasi Menjadi Klien &amp; Buat Berkas Perkara</button>' +
      '<div class="soft xs t2">' + ic('info') + ' Setelah dikonfirmasi, perkara langsung muncul pada menu <b>Case / Perkara → Daftar Perkara</b> dan PIC Advokat menerima notifikasi pendelegasian.</div></div></div>') + '</div>';
    var eb = $('[data-editlead]', host); if (eb) eb.onclick = function () { openForm('Leads', l); };
    var kb = $('[data-ksl]', host); if (kb) kb.onclick = function () { openForm('Konsultasi', null, { defaults: { leadId: l.id, tanggal: addDays(today(), 1), advokatId: l.picId, status: 'Terjadwal', topik: 'Konsultasi awal — ' + (l.kategori || '') } }); };
    on(host, 'click', '[data-jenis] button', function (e, b) { $$('[data-jenis] button', host).forEach(function (x) { x.classList.toggle('on', x === b); }); });
    var cb = $('[data-doconv]', host);
    if (cb) cb.onclick = async function () {
      var g = function (k) { var x = $('[data-k="' + k + '"]', host); return x ? x.value.trim() : ''; }, o = function (k) { var x = $('[data-o="' + k + '"]', host); return x && x.checked; };
      var jenis = ($('[data-jenis] button.on', host) || {}).textContent;
      var r = await act(cb, 'lead.convert', { leadId: l.id, klien: { jenis: jenis, pic: g('pic'), npwp: g('npwp'), alamat: g('alamat'), retainer: g('retainer'), picId: g('picId') }, buatPerkara: o('perkara'), perkara: { judul: g('judul'), advokatId: g('picId') }, portal: o('portal'), buatFolder: o('folder') });
      if (!r.success) return;
      Data.upsert('Klien', r.data.klien); if (r.data.perkara) Data.upsert('Perkara', r.data.perkara); Data.touch(['Leads', 'Klien', 'Perkara', 'Users', 'RiwayatKlien', 'Konsultasi']);
      go('klien-detail', r.data.klien.id);
      if (r.data.akun) setTimeout(function () { modal('<h3 class="h-md">Akun Client Portal dibuat</h3><p class="t2 small">Kredensial dikirim ke klien bila notifikasi aktif. Simpan sandi sementara ini:</p><div class="soft mono mt">' + esc(r.data.akun.email) + '<br>Sandi: <b>' + esc(r.data.akun.password) + '</b></div><div class="row mt" style="justify-content:flex-end"><button class="btn primary" data-close>Selesai</button></div>'); }, 50);
    };
  }
}));

// ============================================================ KLIEN
registerPage('klien', crudPage({
  t: 'Klien', title: 'Data Klien', crumb: 'Client Management', desc: 'Profil dan kontak klien aktif kantor hukum. Klik baris untuk membuka dossier klien lengkap.',
  newLabel: 'Tambah Klien', defaults: { status: 'Aktif' }, deps: ['Perkara'],
  cols: [{ k: 'nama', l: 'Klien / Instansi', render: function (r) { return '<div class="row"><div class="avatar sm">' + esc(initials(r.nama)) + '</div><div><div class="t-main">' + esc(r.nama) + '</div><div class="t-sub mono">' + esc(r.kode || '') + '</div></div></div>'; } }, 'jenis', 'email', 'wa', 'picId', 'status'],
  kpis: function (rows) {
    var pr = Data.rows('Perkara') || [];
    return '<div class="grid g4 keep mb">' + kpi({ label: 'Klien Aktif', value: cntBy(rows, function (r) { return r.status === 'Aktif'; }), icon: 'users' }) + kpi({ label: 'Badan Usaha', value: cntBy(rows, function (r) { return /Badan/.test(r.jenis); }), icon: 'building-2' }) +
      kpi({ label: 'Akses Portal Aktif', value: cntBy(rows, function (r) { return r.portalAkses === 'YA'; }), icon: 'key-round', tone: 'ok' }) + kpi({ label: 'Perkara Berjalan', value: cntBy(pr, function (p) { return /Berjalan|Banding/.test(p.status); }), icon: 'scale' }) + '</div>';
  },
  tabs: [{ l: 'Semua', f: function () { return true; } }, { l: 'Aktif', f: function (r) { return r.status === 'Aktif'; } }, { l: 'Nonaktif', f: function (r) { return r.status !== 'Aktif'; } }],
  onRow: function (r) { go('klien-detail', r.id); }
}));
registerPage('klien-detail', {
  title: 'Dossier Klien',
  show: function (el, id) {
    el.innerHTML = '<div class="skel" style="height:160px;border-radius:20px"></div>';
    swr('klien:' + id, 'klien.detail', { id: id }, function (d, c, err) {
      if (!d) { el.innerHTML = errorBox(err && err.message, true); return; }
      var k = d.klien, aktif = d.perkara.filter(function (p) { return /Berjalan|Banding/.test(p.status); });
      var sisa = d.invoice.reduce(function (a, i) { return a + (i.status !== 'Batal' && i.status !== 'Draft' ? Number(i.sisa) || 0 : 0); }, 0);
      el.innerHTML = '<div class="row mb"><a class="btn sm ghost" href="#/klien">' + ic('arrow-left') + 'Data Klien</a></div>' +
        '<div class="card mb"><div class="row wrap" style="align-items:flex-start"><div class="avatar lg">' + esc(initials(k.nama)) + '</div><div class="grow"><div class="row wrap"><h2 class="h-lg">' + esc(k.nama) + '</h2><span class="badge info">' + ic('badge-check') + 'Terverifikasi</span>' + badge(k.status) + '</div>' +
        '<div class="small t2">' + esc(k.jenis || '') + (k.bidang ? ' • ' + esc(k.bidang) : '') + '</div><div class="xs muted mono mt-s">' + esc(k.kode || '') + (k.npwp ? ' • NPWP ' + esc(k.npwp) : '') + (k.pic ? ' • PIC ' + esc(k.pic) : '') + '</div></div>' +
        '<div class="soft" style="min-width:220px"><div class="lbl">Client Portal Access</div>' + (d.akun.length ? '<div class="row mt-s small"><span class="badge ok"><span class="dot"></span>Workspace Active</span><span class="xs muted right">' + esc(d.akun[0].email) + '</span></div>' : (canEdit() ? '<button class="btn sm primary mt-s" data-portal>' + ic('key-round') + 'Buat Akun Portal</button>' : '<div class="xs muted mt-s">Belum ada akun</div>')) + '</div></div>' +
        '<div class="row wrap mt">' + waBtn(k.wa, 'WhatsApp') + (k.email ? '<a class="btn xs" href="mailto:' + esc(k.email) + '">' + ic('mail') + 'Email</a>' : '') + (canEdit() ? '<button class="btn xs" data-edit>' + ic('pencil') + 'Ubah Profil</button><button class="btn xs" data-newp>' + ic('plus') + 'Perkara Baru</button><button class="btn xs" data-newinv>' + ic('receipt') + 'Buat Invoice</button>' : '') + '</div></div>' +
        '<div class="grid g4 keep mb">' + kpi({ label: 'Perkara Aktif', value: aktif.length, icon: 'scale' }) + kpi({ label: 'Total Perkara', value: d.perkara.length, icon: 'folder' }) + kpi({ label: 'Konsultasi', value: d.konsultasi.length, icon: 'message-square' }) + kpi({ label: 'Sisa Tagihan', value: '<span style="font-size:22px">' + rpS(sisa) + '</span>', icon: 'receipt', tone: sisa ? 'warn' : 'ok' }) + '</div>' +
        '<div class="split wide"><div class="card"><div class="seg mb" data-tabs>' + ['Perkara', 'Riwayat', 'Konsultasi', 'Invoice', 'Dokumen'].map(function (t, i) { return '<button class="' + (i ? '' : 'on') + '" data-t="' + t + '">' + t + '</button>'; }).join('') + '</div><div data-tc></div></div>' +
        '<div class="card"><h3 class="h-sm mb">Profil</h3><dl class="dl">' + fieldsOf('Klien').filter(function (f) { return f[2] !== 'url'; }).map(function (f) { return '<dt>' + esc(f[1]) + '</dt><dd>' + fmtCell(f, k[f[0]], k) + '</dd>'; }).join('') + '</dl>' +
        (d.lead ? '<div class="soft xs mt">' + ic('repeat') + ' Hasil konversi lead ' + esc(d.lead.id) + ' (' + esc(d.lead.sumber || '') + ')</div>' : '') + '</div></div>';
      var tabs = {
        Perkara: function () { return d.perkara.map(function (p) { return '<a class="soft row mb" style="color:inherit" href="#/perkara-detail/' + p.id + '">' + ic('scale') + '<div class="grow"><b class="small">' + esc(p.judul) + '</b><div class="xs muted">' + esc(p.noPerkara || '') + ' • ' + esc(p.pengadilan || '') + '</div></div>' + badge(p.tahap) + badge(p.status) + '</a>'; }).join('') || emptyState('Belum ada perkara', ''); },
        Riwayat: function () { return '<div class="tl">' + (d.riwayat.map(function (r) { return '<div class="tl-item"><div class="tl-card"><h4>' + badge(r.jenis, 'pri') + '<span class="xs muted right">' + tgl(r.tanggal) + ' • ' + esc(r.oleh || '') + '</span></h4><p>' + esc(r.ringkasan) + '</p></div></div>'; }).join('') || emptyState('Belum ada riwayat', '')) + '</div>' + (canEdit() ? '<button class="btn sm" data-addrw>' + ic('plus') + 'Catat interaksi</button>' : ''); },
        Konsultasi: function () { return d.konsultasi.map(function (x) { return '<div class="soft mb"><div class="row"><b class="small">' + esc(x.topik) + '</b><span class="right">' + badge(x.status) + '</span></div><div class="xs muted">' + tgl(x.tanggal) + ' ' + esc(x.jam || '') + ' • ' + esc(x.media || '') + ' • ' + esc(refLabel('Personel', x.advokatId)) + '</div>' + (x.catatan ? '<p class="small t2" style="margin:6px 0 0">' + esc(x.catatan) + '</p>' : '') + '</div>'; }).join('') || emptyState('Belum ada konsultasi', ''); },
        Invoice: function () { return d.invoice.map(function (i) { return '<div class="soft row mb"><div class="grow"><b class="small mono">' + esc(i.nomor) + '</b><div class="xs muted">' + esc(i.tipe || '') + ' • jatuh tempo ' + tgl(i.jatuhTempo) + '</div></div><div style="text-align:right"><b class="small">' + rp(i.total) + '</b><div class="xs">Sisa ' + rp(i.sisa) + '</div></div>' + badge(i.status) + '</div>'; }).join('') || emptyState('Belum ada invoice', ''); },
        Dokumen: function () { return '<div class="doclist">' + (d.dokumen.map(function (x) { var f = parseFile(x.file); return '<div class="it"><div class="ic">' + ic('file-text') + '</div><div class="grow"><b class="small">' + esc(x.nama) + '</b><div class="xs muted">' + esc(x.jenis || '') + ' • ' + esc(x.ukuran || '') + ' • ' + tgl(x.tanggal) + '</div></div>' + (f ? '<button class="btn xs" data-file=\'' + esc(JSON.stringify(f)) + '\' onclick="bukaBerkas(this)">' + ic('download') + '</button>' : '') + '</div>'; }).join('') || emptyState('Belum ada dokumen', '')) + '</div>'; }
      };
      var showTab = function (t) { $$('[data-tabs] button', el).forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); }); $('[data-tc]', el).innerHTML = tabs[t](); var a = $('[data-addrw]', el); if (a) a.onclick = function () { openForm('RiwayatKlien', null, { defaults: { klienId: k.id, tanggal: today() }, onSaved: function () { cacheStale('klien:' + id); } }); }; };
      el._showTab = showTab; if (!el._tb) { el._tb = 1; on(el, 'click', '[data-tabs] button', function (e, b) { el._showTab(b.dataset.t); }); }
      showTab('Perkara');
      var after = function () { cacheStale('klien:' + id); };
      var b1 = $('[data-edit]', el); if (b1) b1.onclick = function () { openForm('Klien', k, { onSaved: after }); };
      var b2 = $('[data-newp]', el); if (b2) b2.onclick = function () { openForm('Perkara', null, { defaults: { klienId: k.id, advokatId: k.picId, kategori: k.kategori, tglDaftar: today() }, onSaved: after }); };
      var b3 = $('[data-newinv]', el); if (b3) b3.onclick = function () { openForm('Invoice', null, { defaults: { klienId: k.id, tanggal: today() }, onSaved: after }); };
      var b4 = $('[data-portal]', el); if (b4) b4.onclick = async function () { var r = await act(b4, 'users.portal', { klienId: k.id }); if (r.success) { after(); modal('<h3 class="h-md">Akun portal dibuat</h3><div class="soft mono mt">' + esc(r.data.email) + '<br>Sandi sementara: <b>' + esc(r.data.password) + '</b></div><div class="row mt" style="justify-content:flex-end"><button class="btn primary" data-close>Selesai</button></div>'); refreshView(); } };
    }, { fresh: 20000 });
  }
});
registerPage('konsultasi', crudPage({ t: 'Konsultasi', title: 'Data Konsultasi', crumb: 'Client Management', desc: 'Riwayat konsultasi klien & calon klien beserta catatan pertemuan.', defaults: function () { return { tanggal: today(), status: 'Terjadwal' }; },
  tabs: [{ l: 'Semua', f: function () { return true; } }, { l: 'Terjadwal', f: function (r) { return r.status === 'Terjadwal'; } }, { l: 'Selesai', f: function (r) { return r.status === 'Selesai'; } }] }));
registerPage('riwayat', crudPage({ t: 'RiwayatKlien', title: 'Riwayat Klien', crumb: 'Client Management', desc: 'Rekam jejak historis interaksi & layanan ke klien — tercatat otomatis dari konsultasi, sidang, invoice, pembayaran, surat, dan dokumen.', defaults: function () { return { tanggal: today() }; } }));

// ============================================================ PERKARA
function aktifP(p) { return p.status === 'Berjalan' || p.status === 'Banding / Kasasi'; }
registerPage('perkara', crudPage({
  t: 'Perkara', title: 'Data Kasus / Perkara (Litigasi &amp; Non-Litigasi)', crumb: '<span class="badge pri">Modul Perkara</span> <span class="muted">• e-Court Sync Ready</span>',
  desc: 'Pusat monitoring berkas perkara, jadwal sidang pengadilan, pelaporan sidang, dan repositori dokumen hukum.', newLabel: 'Daftarkan Perkara Baru', defaults: function () { return { tglDaftar: today(), status: 'Berjalan', tahap: 'Pendaftaran', jenis: 'Litigasi' }; },
  filterBy: ['kategori', 'advokatId'], deps: ['Sidang', 'Task'],
  cols: [{ k: 'judul', l: 'Perkara', render: function (r) { return '<div class="t-main" style="max-width:360px">' + esc(r.judul) + '</div><div class="t-sub mono">' + esc(r.noPerkara || '—') + '</div>'; } }, 'klienId', 'kategori', 'pengadilan', 'advokatId', 'tahap', 'status'],
  kpis: function (rows) {
    var aktif = rows.filter(aktifP), sel = rows.filter(function (r) { return !aktifP(r); }), menang = cntBy(sel, function (r) { return /Menang|Damai/.test(r.status); });
    var sdg = Data.rows('Sidang') || [], mg = addDays(today(), 7), dekat = sdg.filter(function (s) { return s.tanggal >= today() && s.tanggal <= mg && s.status === 'Terjadwal'; });
    var task = (Data.rows('Task') || []).filter(function (t) { return t.status !== 'Selesai' && t.perkaraId; });
    return '<div class="grid g4 keep mb">' + kpi({ label: 'Total Perkara Aktif', value: aktif.length, unit: 'Perkara Berjalan', icon: 'scale', foot: '<span class="badge pri">' + cntBy(aktif, function (r) { return r.jenis !== 'Non-Litigasi'; }) + ' Litigasi</span><span class="badge">' + cntBy(aktif, function (r) { return r.jenis === 'Non-Litigasi'; }) + ' Non-Litigasi</span>' }) +
      kpi({ label: 'Jadwal Sidang Mendatang', value: dekat.length, unit: 'Agenda Pekan Ini', icon: 'bell-ring', tone: 'bad', foot: '<span class="badge bad">' + cntBy(dekat, function (s) { return s.tanggal === today(); }) + ' Sidang Hari Ini</span>' }) +
      kpi({ label: 'Tingkat Kemenangan (Inkracht)', value: (sel.length ? Math.round(menang / sel.length * 1000) / 10 : 0) + '%', unit: 'Kemenangan Final', icon: 'badge-check', foot: '<span>' + sel.length + ' perkara selesai</span>' }) +
      kpi({ label: 'Task Berkas Perkara', value: task.length, unit: 'Terbuka', icon: 'circle-alert', foot: '<span class="badge warn">' + cntBy(task, function (t) { return t.tenggat < today(); }) + ' lewat tenggat</span>' }) + '</div>';
  },
  extraTop: function (rows) {
    var sdg = (Data.rows('Sidang') || []).filter(function (s) { return s.tanggal >= today() && s.status === 'Terjadwal'; }).sort(function (a, b) { return (a.tanggal + a.jamMulai).localeCompare(b.tanggal + b.jamMulai); })[0];
    var p = sdg && rows.filter(function (r) { return r.id === sdg.perkaraId; })[0];
    return p ? caseHero(p, sdg, true) : '';
  },
  tabs: [{ l: 'Semua Kasus', f: function () { return true; } }, { l: 'Sedang Berjalan', f: function (r) { return r.status === 'Berjalan'; } }, { l: 'Tahap Pembuktian', f: function (r) { return r.tahap === 'Pembuktian' && aktifP(r); } },
         { l: 'Tahap Banding / Kasasi', f: function (r) { return r.status === 'Banding / Kasasi' || /Banding|Kasasi|PK/.test(r.tahap); } }, { l: 'Selesai / Inkracht', f: function (r) { return !aktifP(r); } }],
  onRow: function (r) { go('perkara-detail', r.id); }
}));
function caseHero(p, sdg, link) {
  var tim = String(p.timIds || '').split(',').filter(String).map(function (i) { return refLabel('Personel', i); });
  return '<div class="hero dark case-hero mb"' + (link ? ' style="cursor:pointer" onclick="go(\'perkara-detail\',\'' + p.id + '\')"' : '') + '><div class="row wrap gap-s"><span class="badge mono">' + esc(p.noPerkara && p.noPerkara !== '-' ? 'E-COURT: ' + p.noPerkara.toUpperCase() : p.id) + '</span><span class="badge" style="background:#fff;color:var(--navy)">' + esc(p.kategori || '') + '</span><span class="badge" style="background:var(--primary-100);color:var(--primary-800)"><span class="dot"></span>' + esc(p.status) + ' — ' + esc(p.tahap || '') + '</span></div>' +
    '<h2 style="margin-top:14px;font-size:22px;line-height:1.3">' + esc(p.judul) + '</h2><p style="margin:6px 0 0;font-size:13.5px">' + esc(p.pengadilan || '') + (p.tglDaftar ? ' • Terdaftar ' + tgl(p.tglDaftar, true) : '') + (p.majelis ? ' • Majelis Hakim Ketua: ' + esc(p.majelis) : '') + '</p>' +
    '<div class="meta"><span>' + ic('building-2') + ' Klien: <b>' + esc(refLabel('Klien', p.klienId)) + '</b></span><span>' + ic('briefcase') + ' Tim Advokat PIC: <b>' + esc([refLabel('Personel', p.advokatId)].concat(tim).filter(String).join(' & ')) + '</b></span>' +
    (sdg ? '<span class="right">' + ic('clock') + ' Jadwal Sidang Berikutnya: <b class="badge" style="background:rgba(255,255,255,.16);color:#fff">' + (sdg.tanggal === today() ? 'Hari Ini' : tgl(sdg.tanggal)) + ', ' + esc(sdg.jamMulai || '') + ' WIB</b></span>' : '') + '</div></div>';
}
registerPage('perkara-detail', {
  title: 'Detail Perkara',
  show: function (el, id) {
    el._tab = el._id === id ? el._tab || 'Kronologi' : 'Kronologi'; el._id = id;
    if (!el._k || el._k !== id) el.innerHTML = '<div class="skel" style="height:200px;border-radius:20px"></div>';
    el._k = id;
    swr('perkara:' + id, 'perkara.detail', { id: id }, function (d, c, err) {
      if (!d) { el.innerHTML = errorBox(err && err.message, true); return; }
      var p = d.perkara, next = d.sidang.filter(function (s) { return s.tanggal >= today() && s.status === 'Terjadwal'; })[0], e = canEdit();
      var tahap = AppState.schema.ops.tahapPerkara.slice(0, 9), idx = tahap.indexOf(p.tahap);
      el.innerHTML = '<div class="row mb wrap"><a class="btn sm ghost" href="#/perkara">' + ic('arrow-left') + 'Daftar Perkara</a><div class="sp"></div>' + (e ? '<button class="btn sm" data-edit>' + ic('pencil') + 'Ubah Perkara</button><button class="btn sm" data-tahap>' + ic('git-commit-horizontal') + 'Update Tahap</button>' : '') + '</div>' +
        caseHero(p, next) +
        '<div class="card mb"><div class="row mb"><span class="small t2">' + ic('git-branch') + ' Progres Litigasi</span><b class="small right" style="color:var(--primary-800)">Tahap ' + (idx + 1) + ' dari ' + tahap.length + '</b></div><div class="stepper">' + tahap.map(function (t, i) { return '<div class="st ' + (i < idx ? 'done' : i === idx ? 'cur' : '') + '"><i>' + (i < idx ? '✓' : i + 1) + '</i>' + esc(t) + '</div>'; }).join('') + '</div></div>' +
        '<div class="split"><div class="card"><div class="seg mb" data-tabs>' + ['Kronologi', 'Jadwal Sidang', 'Laporan Sidang', 'Dokumen Bukti', 'Task', 'Keuangan'].map(function (t) { return '<button data-t="' + t + '">' + t + '</button>'; }).join('') + '</div><div data-tc></div></div>' +
        '<div class="col" style="gap:16px">' + (next ? '<div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('calendar') + ' Sidang Terdekat</h3><span class="badge bad">' + (next.tanggal === today() ? 'Hari Ini' : 'H-' + diffDays(next.tanggal)) + '</span></div><div class="soft"><div class="row"><span class="btn primary sm" style="pointer-events:none">' + pd(next.tanggal).getDate() + ' ' + BLN[pd(next.tanggal).getMonth()] + '</span><div class="right" style="text-align:right"><b class="small">' + esc(next.jamMulai || '') + (next.jamSelesai ? ' — ' + esc(next.jamSelesai) : '') + ' WIB</b><div class="xs muted">' + esc(next.lokasi || '') + '</div></div></div>' +
          '<div class="small t2 mt-s">' + ic('landmark') + ' ' + esc(next.ruang || '-') + '<br>' + ic('user') + ' Hakim: ' + esc(next.hakim || p.majelis || '-') + '<br>' + ic('file-text') + ' Agenda: ' + esc(next.agenda) + '</div>' + (e ? '<button class="btn sm block mt" data-bas="' + next.id + '">' + ic('notebook-pen') + 'Buat Berita Acara Sidang</button>' : '') + '</div></div>' : '') +
        '<div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('folder-open') + ' Dokumen Perkara</h3><span class="xs muted">Google Drive Sync</span></div><div class="doclist">' + d.dokumen.slice(0, 6).map(function (x) {
          var f = parseFile(x.file), ext = f && /\.(docx?|txt)$/i.test(f.name || '') ? 'doc' : f && /\.xlsx?$/i.test(f.name || '') ? 'xls' : '';
          return '<div class="it"><div class="ic ' + ext + '">' + ic(ext === 'doc' ? 'file-text' : 'file') + '</div><div class="grow" style="min-width:0"><b class="small ellip" style="display:block">' + esc(x.nama) + '</b><div class="xs muted">' + esc(x.ukuran || '') + ' • ' + tgl(x.tanggal) + (x.bagikanKlien === 'YA' ? ' • <span class="ok">dibagikan</span>' : '') + '</div></div>' + (f ? '<button class="btn xs ghost icon" data-file=\'' + esc(JSON.stringify(f)) + '\' onclick="bukaBerkas(this)" aria-label="Unduh">' + ic('download') + '</button>' : '') + '</div>';
        }).join('') + '</div>' + (e ? '<div class="file-drop" data-up>' + ic('upload') + '<div><b>Tarik &amp; lepas berkas perkara ke sini</b></div><span class="mono xs">atau klik untuk memilih (maks 10 MB)</span></div><input type="file" hidden data-upf>' : '') + '</div></div></div>';
      var tabs = {
        'Kronologi': function () {
          return (e ? '<button class="btn sm mb" data-addtl>' + ic('plus') + 'Tambahkan Catatan Tahapan Baru</button>' : '') + '<div class="tl">' + (d.timeline.map(function (t, i) {
            return '<div class="tl-item' + (i === 0 ? ' now' : '') + '"><div class="tl-card"><h4>' + tgl(t.tanggal) + ' — ' + esc(t.judul) + (t.label ? ' ' + badge(t.label, i === 0 ? 'pri' : /Gagal/.test(t.label) ? 'bad' : 'info') : '') + '</h4>' + (t.deskripsi ? '<p>' + esc(t.deskripsi) + '</p>' : '') +
              '<div class="row xs muted mt-s">' + (t.bagikanKlien === 'YA' ? ic('eye') + ' Terlihat di portal klien' : ic('eye-off') + ' Internal') + (e ? '<button class="btn xs ghost right" data-tl="' + t.id + '">' + ic('pencil') + '</button>' : '') + '</div></div></div>';
          }).join('') || emptyState('Belum ada kronologi', '')) + '</div><div class="xs muted mono">Audit log: diperbarui ' + relTime(p.updatedAt) + '</div>';
        },
        'Jadwal Sidang': function () { return (e ? '<button class="btn sm mb" data-addsd>' + ic('plus') + 'Jadwalkan Sidang</button>' : '') + d.sidang.map(function (s) { return '<div class="soft row mb" data-sd="' + s.id + '" style="cursor:pointer"><div class="btn sm" style="pointer-events:none;min-width:70px">' + tgl(s.tanggal).replace(/ \d{4}$/, '') + '</div><div class="grow"><b class="small">' + esc(s.agenda) + '</b><div class="xs muted">' + esc(s.jenis || '') + ' • ' + esc(s.jamMulai || '') + ' WIB • ' + esc([s.lokasi, s.ruang].filter(String).join(' — ')) + '</div></div>' + badge(s.status) + '</div>'; }).join('') || emptyState('Belum ada jadwal sidang', ''); },
        'Laporan Sidang': function () { return (e ? '<button class="btn sm mb" data-bas="">' + ic('plus') + 'Buat Laporan / Berita Acara</button>' : '') + d.laporan.map(function (l) { return '<div class="soft mb"><div class="row wrap"><b class="small mono">' + esc(l.nomor) + '</b>' + badge(l.status) + (l.bagikanKlien === 'YA' ? '<span class="badge info">Portal Klien</span>' : '') + '<span class="xs muted right">' + tgl(l.tanggal) + '</span></div><div class="small mt-s"><b>' + esc(l.agenda || '') + '</b></div><p class="small t2" style="margin:4px 0">' + esc(l.temuan || '') + '</p><div class="row gap-s">' + (e ? '<button class="btn xs" data-lp="' + l.id + '">' + ic('pencil') + 'Ubah</button>' : '') + '<button class="btn xs" data-bapdf="' + l.id + '" data-doc="' + esc(l.docId || '') + '">' + ic('file-down') + (l.docId ? 'Unduh PDF' : 'Terbitkan PDF') + '</button></div></div>'; }).join('') || emptyState('Belum ada laporan sidang', ''); },
        'Dokumen Bukti': function () { return (e ? '<button class="btn sm mb" data-adddok>' + ic('plus') + 'Unggah Dokumen</button>' : '') + '<div class="doclist">' + (d.dokumen.map(function (x) { var f = parseFile(x.file); return '<div class="it"><div class="ic">' + ic('file') + '</div><div class="grow"><b class="small">' + esc(x.nama) + '</b><div class="xs muted">' + esc(x.jenis || '') + ' • ' + esc(x.ukuran || '') + '</div></div>' + (x.bagikanKlien === 'YA' ? '<span class="badge info">Klien</span>' : '') + (f ? '<button class="btn xs" data-file=\'' + esc(JSON.stringify(f)) + '\' onclick="bukaBerkas(this)">' + ic('download') + '</button>' : '') + '</div>'; }).join('') || emptyState('Belum ada dokumen', '')) + '</div>' + (d.deDokumen.length ? '<div class="sec-t">Dokumen Resmi Terbit</div>' + d.deDokumen.map(function (x) { return '<div class="soft row mb small">' + ic('file-badge') + '<span class="grow">' + esc(x.judul) + '</span>' + badge(x.status) + '</div>'; }).join('') : ''); },
        'Task': function () { return (e ? '<button class="btn sm mb" data-addtask>' + ic('plus') + 'Task Baru</button>' : '') + d.tasks.map(function (t) { return '<div class="soft row mb small"><span class="mono xs muted">' + esc(t.kode || '') + '</span><span class="grow">' + esc(t.judul) + '</span><span class="xs muted">' + esc(refLabel('Personel', t.picId)) + ' • ' + tgl(t.tenggat) + '</span>' + badge(t.status) + '</div>'; }).join('') || emptyState('Belum ada task', ''); },
        'Keuangan': function () { return d.invoice.map(function (i) { return '<div class="soft row mb small"><b class="mono">' + esc(i.nomor) + '</b><span class="grow">' + esc(i.tipe || '') + '</span><span>' + rp(i.total) + '</span>' + badge(i.status) + '</div>'; }).join('') || emptyState('Belum ada invoice', 'Invoice yang dikaitkan ke perkara ini tampil di sini.'); }
      };
      var showTab = function (t) { el._tab = t; $$('[data-tabs] button', el).forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); }); $('[data-tc]', el).innerHTML = tabs[t](); };
      showTab(el._tab);
      var after = function () { cacheStale('perkara:' + id); };
      el._showTab = showTab; if (!el._tb) { el._tb = 1; on(el, 'click', '[data-tabs] button', function (e, b) { el._showTab(b.dataset.t); }); }
      var bind = function (sel, fn) { var x = $(sel, el); if (x) x.onclick = fn; };
      el.onclick = function (ev) {
        var t = ev.target.closest('[data-addtl],[data-tl],[data-addsd],[data-sd],[data-bas],[data-lp],[data-bapdf],[data-adddok],[data-addtask],[data-up]'); if (!t) return;
        if (t.matches('[data-addtl]')) openForm('Timeline', null, { defaults: { perkaraId: p.id, tanggal: today(), bagikanKlien: 'YA' }, hideF: ['perkaraId'], onSaved: after });
        else if (t.matches('[data-tl]')) openForm('Timeline', d.timeline.filter(function (x) { return x.id === t.dataset.tl; })[0], { onSaved: after });
        else if (t.matches('[data-addsd]')) openForm('Sidang', null, { defaults: { perkaraId: p.id, tanggal: addDays(today(), 7), lokasi: p.pengadilan, hakim: p.majelis, advokatId: p.advokatId, status: 'Terjadwal', pengingatH: 1 }, hideF: ['perkaraId'], onSaved: after });
        else if (t.matches('[data-sd]')) { var s = d.sidang.filter(function (x) { return x.id === t.dataset.sd; })[0]; openDetail('Sidang', s, { formOpt: { onSaved: after } }); }
        else if (t.matches('[data-bas]')) { var sd = d.sidang.filter(function (x) { return x.id === t.dataset.bas; })[0]; openForm('LaporanSidang', null, { defaults: { perkaraId: p.id, sidangId: sd ? sd.id : '', tanggal: sd ? sd.tanggal : today(), agenda: sd ? sd.agenda : '', advokatHadir: refLabel('Personel', (sd && sd.advokatId) || p.advokatId), status: 'Draft' }, hideF: ['perkaraId'], onSaved: after }); }
        else if (t.matches('[data-lp]')) openForm('LaporanSidang', d.laporan.filter(function (x) { return x.id === t.dataset.lp; })[0], { onSaved: after });
        else if (t.matches('[data-bapdf]')) terbitkanBA(t, t.dataset.bapdf, after);
        else if (t.matches('[data-adddok]')) openForm('Dokumen', null, { defaults: { perkaraId: p.id, klienId: p.klienId, tanggal: today() }, hideF: ['perkaraId', 'klienId'], onSaved: after });
        else if (t.matches('[data-addtask]')) openForm('Task', null, { defaults: { perkaraId: p.id, picId: p.advokatId, tenggat: addDays(today(), 3) }, onSaved: after });
        else if (t.matches('[data-up]')) $('[data-upf]', el).click();
      };
      var upf = $('[data-upf]', el);
      if (upf) {
        var kirim = async function (file) { try { var f = await fileB64(file, 10); var r = await api('crud.save', { t: 'Dokumen', row: { nama: file.name.replace(/\.[^.]+$/, ''), perkaraId: p.id, klienId: p.klienId, jenis: 'Lainnya', file: f, tanggal: today(), bagikanKlien: 'TIDAK' } }); if (r.success) { toast('Berkas diunggah ke Google Drive.'); Data.upsert('Dokumen', r.data); after(); refreshView(); } else toast(r.message, 'bad'); } catch (er) { toast(er.message, 'bad'); } };
        upf.onchange = function () { if (upf.files[0]) kirim(upf.files[0]); };
        var dz = $('[data-up]', el);
        dz.ondragover = function (ev) { ev.preventDefault(); dz.classList.add('drag'); }; dz.ondragleave = function () { dz.classList.remove('drag'); };
        dz.ondrop = function (ev) { ev.preventDefault(); dz.classList.remove('drag'); if (ev.dataTransfer.files[0]) kirim(ev.dataTransfer.files[0]); };
      }
      bind('[data-edit]', function () { openForm('Perkara', p, { onSaved: after }); });
      bind('[data-tahap]', function () {
        var m = modal('<h3 class="h-md">Update tahap perkara</h3><p class="small t2">Perubahan tahap otomatis tercatat di timeline & dikirim sebagai update ke klien.</p><div class="field mt"><label>Tahap</label><select class="input" id="tp">' + AppState.schema.ops.tahapPerkara.map(function (t) { return '<option' + (t === p.tahap ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div><div class="field mt-s"><label>Status</label><select class="input" id="tps">' + AppState.schema.ops.statusPerkara.map(function (t) { return '<option' + (t === p.status ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div><div class="row mt" style="justify-content:flex-end"><button class="btn" data-close>Batal</button><button class="btn primary" id="tpok">Simpan</button></div>');
        $('#tpok', m.el).onclick = async function () { var r = await act(this, 'crud.save', { t: 'Perkara', row: Object.assign({}, p, { tahap: $('#tp', m.el).value, status: $('#tps', m.el).value }) }); if (r.success) { Data.upsert('Perkara', r.data); Data.touch(['Timeline']); after(); m.close(); refreshView(); } };
      });
    }, { fresh: 15000 });
  }
});
async function terbitkanBA(btn, lapId, after) {
  if (btn.dataset.doc) return unduhDok(btn, btn.dataset.doc);
  if (!canEdit()) return toast('PDF belum diterbitkan.', 'warn');
  var r = await act(btn, 'de.generate', { templateKode: 'BA_SIDANG', sumber: { t: 'LaporanSidang', id: lapId } });
  if (r.success) { Data.touch(['LaporanSidang']); after && after(); refreshView(); if (r.data.status === 'TERBIT') unduhDok(null, r.data.id); }
}
registerPage('sidang', crudPage({ t: 'Sidang', title: 'Jadwal Sidang', crumb: 'Case / Perkara', desc: 'Jadwal sidang seluruh perkara. Notifikasi otomatis dikirim ke klien & advokat saat dijadwalkan dan H-n sebelum sidang.', newLabel: 'Jadwalkan Sidang',
  defaults: function () { return { tanggal: addDays(today(), 7), status: 'Terjadwal', pengingatH: 1 }; },
  cols: ['tanggal', 'jamMulai', { k: 'perkaraId', l: 'Perkara', render: function (r) { return '<div class="t-main ellip" style="max-width:300px">' + esc(refLabel('Perkara', r.perkaraId)) + '</div>'; }, sortVal: function (r) { return refLabel('Perkara', r.perkaraId); } }, 'jenis', 'agenda', 'lokasi', 'status'],
  kpis: function (rows) { var h = today(), m = addDays(h, 7); return '<div class="grid g4 keep mb">' + kpi({ label: 'Sidang Hari Ini', value: cntBy(rows, function (r) { return r.tanggal === h && r.status === 'Terjadwal'; }), icon: 'gavel', tone: 'bad' }) + kpi({ label: '7 Hari ke Depan', value: cntBy(rows, function (r) { return r.tanggal > h && r.tanggal <= m && r.status === 'Terjadwal'; }), icon: 'calendar-clock' }) + kpi({ label: 'Ditunda', value: cntBy(rows, function (r) { return r.status === 'Ditunda'; }), icon: 'pause', tone: 'warn' }) + kpi({ label: 'Selesai', value: cntBy(rows, function (r) { return r.status === 'Selesai'; }), icon: 'circle-check', tone: 'ok' }) + '</div>'; },
  tabs: [{ l: 'Mendatang', f: function (r) { return r.tanggal >= today() && r.status !== 'Selesai'; } }, { l: 'Semua', f: function () { return true; } }, { l: 'Lewat', f: function (r) { return r.tanggal < today(); } }],
  rowActs: function (r) { return '<a class="btn xs" href="#/perkara-detail/' + r.perkaraId + '" onclick="event.stopPropagation()">' + ic('folder-open') + 'Berkas</a>'; } }));
registerPage('timeline', crudPage({ t: 'Timeline', title: 'Timeline Perkara', crumb: 'Case / Perkara', desc: 'Riwayat kronologis perkembangan tiap perkara. Entri bertanda "Tampilkan di Portal" langsung terlihat & dikirim ke klien.', defaults: function () { return { tanggal: today(), bagikanKlien: 'YA' }; } }));
registerPage('laporan', crudPage({ t: 'LaporanSidang', title: 'Laporan Sidang', crumb: 'Case / Perkara', desc: 'Ringkasan hasil setiap sidang. Status Final + "Bagikan ke Portal" → klien dapat membaca & menerima notifikasi. Terbitkan PDF berita acara ber-QR dari Doc Engine.',
  defaults: function () { return { tanggal: today(), status: 'Draft' }; },
  tabs: [{ l: 'Semua', f: function () { return true; } }, { l: 'Draft', f: function (r) { return r.status === 'Draft'; } }, { l: 'Final', f: function (r) { return r.status === 'Final'; } }],
  rowActs: function (r) { return '<button class="btn xs" data-bapdf="' + r.id + '" data-doc="' + esc(r.docId || '') + '">' + ic('file-down') + (r.docId ? 'PDF' : 'Terbitkan') + '</button>'; },
  bind: function (el) { on(el, 'click', '[data-bapdf]', function (e, b) { e.stopPropagation(); terbitkanBA(b, b.dataset.bapdf); }); } }));
registerPage('dokumen', crudPage({ t: 'Dokumen', title: 'Manajemen Dokumen', crumb: 'Case / Perkara', desc: 'Berkas perkara (kontrak, bukti, surat) tersimpan di Google Drive dalam folder per klien/perkara. Atur akses klien per dokumen.', newLabel: 'Unggah Dokumen',
  defaults: function () { return { tanggal: today(), bagikanKlien: 'TIDAK' }; },
  tabs: [{ l: 'Semua', f: function () { return true; } }, { l: 'Dibagikan ke Klien', f: function (r) { return r.bagikanKlien === 'YA'; } }, { l: 'Internal', f: function (r) { return r.bagikanKlien !== 'YA'; } }] }));
