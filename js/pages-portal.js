/* ============================================================
   SIMLAWFIRM — pages-portal.js
   Client Portal (peran KLIEN): hanya data miliknya (row-level di server).
   Ringkasan, Perkara Saya, Jadwal Sidang, Laporan Sidang, Dokumen, Tagihan, Tim Advokat.
   ============================================================ */
'use strict';
var PORTAL_NAV = [['beranda', 'house', 'Ringkasan & Beranda'], ['perkara', 'scale', 'Perkara Saya'], ['jadwal', 'calendar-days', 'Jadwal Sidang'], ['laporan', 'clipboard-list', 'Laporan Sidang'], ['dokumen', 'folder-open', 'Dokumen Legal Dibagikan'], ['tagihan', 'receipt', 'Tagihan & Invoice'], ['tim', 'contact', 'Kontak Tim Advokat PIC']];
function mountPortal() {
  var u = AppState.user;
  document.body.innerHTML = '<header class="portal-top"><div class="brand"><img src="assets/logo.png" alt=""><div><b>' + esc(AppState.settings.appName || 'SIMLAWFIRM') + ' <span class="badge pri">PORTAL KLIEN</span></b><span>Sistem Informasi Manajemen Litigasi &amp; Konsultasi Hukum</span></div></div><div class="sp"></div>' +
    '<a class="btn sm hide-m" href="#/portal/tim" style="border-radius:999px">' + ic('headset') + 'Hubungi PIC Advokat</a><button class="user-btn" id="pu"><div class="who" style="text-align:right"><b>' + esc(u.nama) + '</b><span class="xs muted" id="pu-k"></span></div><div class="avatar">' + esc(initials(u.nama)) + '</div></button></header>' +
    '<div class="portal-shell"><nav class="portal-nav" id="pnav"></nav><main class="portal-main" id="view"></main></div><div class="toasts" id="toasts"></div>';
  $('#pu').onclick = function () { go('akun'); };
  window.onhashchange = route;
  route();
}
function renderPortalNav(sec) {
  var n = $('#pnav'); if (!n) return;
  n.innerHTML = '<div class="soft mb" style="background:#fff"><div class="lbl">Akses Khusus Klien</div><b class="small">Dossier &amp; Pelacakan Mandiri</b></div>' + PORTAL_NAV.map(function (x) { return '<a class="nav-item' + (x[0] === sec ? ' on' : '') + '" href="#/portal/' + x[0] + '">' + ic(x[1]) + '<span>' + esc(x[2]) + '</span></a>'; }).join('') +
    '<a class="nav-item" href="#/akun">' + ic('user-cog') + '<span>Akun &amp; Sandi</span></a><a class="nav-item" href="#" id="plo">' + ic('log-out') + '<span>Keluar</span></a>' +
    '<div class="secure mt" style="background:#fff;color:var(--text-2);border-color:var(--line)"><b style="color:var(--text)">' + ic('shield-check') + ' Enkripsi Terproteksi</b><div class="xs mt-s">Data Anda hanya dapat diakses oleh akun Anda dan tim advokat penanggung jawab (kerahasiaan hubungan advokat-klien).</div><div class="xs ok mt-s">● Status Sesi: Terverifikasi Aman</div></div>';
  $('#plo').onclick = async function (e) { e.preventDefault(); if (await confirmBox('Keluar dari Client Portal?', { ok: 'Keluar' })) logout(); };
}
registerPage('portal', {
  title: 'Portal Klien',
  show: function (el, sec) {
    sec = sec || 'beranda';
    renderPortalNav(sec);
    if (!cacheGet('portal')) el.innerHTML = skeleton(5);
    swr('portal', 'portal', {}, function (d, c, err) {
      if (!d) { el.innerHTML = errorBox(err && err.message, true); return; }
      if (d.error) { el.innerHTML = errorBox(d.error); return; }
      var k = $('#pu-k'); if (k) k.textContent = d.klien.nama + ' • ' + d.klien.kode;
      el.innerHTML = PORTAL_SEC[sec] ? PORTAL_SEC[sec](d) : PORTAL_SEC.beranda(d);
      bindPortal(el, d);
    }, { fresh: 30000 });
  }
});
function pSidangNext(d) { return d.sidang.filter(function (s) { return s.tanggal >= today() && s.status !== 'Batal' && s.status !== 'Selesai'; })[0]; }
function pPerkaraCard(d, p) {
  var tahap = AppState.schema.ops.tahapPerkara.slice(0, 9), idx = Math.max(0, tahap.indexOf(p.tahap));
  return '<div class="card mb"><div class="row wrap"><span class="badge pri">' + esc(p.kategori || 'Perkara') + '</span><span class="mono xs" style="color:var(--primary-800)">' + esc(p.noPerkara || '') + '</span></div><h3 class="h-sm" style="margin:8px 0">' + esc(p.judul) + '</h3>' + badge('Tahap: ' + p.tahap, 'info') +
    '<div class="soft mt grid g3 small"><div><div class="xs muted">' + esc(p.posisiKlien === 'Tergugat' ? 'Tergugat (Klien Anda)' : 'Penggugat (Klien Anda)') + '</div><b>' + esc(d.klien.nama) + '</b><div class="xs muted">Diwakili: ' + esc(d.klien.pic || '-') + '</div></div><div><div class="xs muted">Pihak Lawan</div><b>' + esc(p.pihakLawan || '-') + '</b><div class="xs muted">Kuasa: ' + esc(p.kuasaLawan || '-') + '</div></div><div><div class="xs muted">Majelis Hakim / Forum</div><b>' + esc(p.majelis || '-') + '</b><div class="xs muted">' + esc(p.pengadilan || '') + '</div></div></div>' +
    '<div class="row mt"><span class="small t2">' + ic('git-branch') + ' Progres Litigasi</span><b class="small right" style="color:var(--primary-800)">Tahap ' + (idx + 1) + ' dari ' + tahap.length + ' (' + Math.round((idx + 1) / tahap.length * 100) + '%)</b></div><div class="stepper">' + tahap.map(function (t, i) { return '<div class="st ' + (i < idx ? 'done' : i === idx ? 'cur' : '') + '"><i>' + (i < idx ? '✓' : i + 1) + '</i>' + esc(t) + '</div>'; }).join('') + '</div></div>';
}
function pTimeline(d, n) {
  return '<div class="tl">' + (d.timeline.slice(0, n || 50).map(function (t, i) { return '<div class="tl-item' + (i === 0 ? ' now' : '') + '"><div class="tl-card"><div class="row wrap">' + (i === 0 ? '<span class="badge pri">TERBARU</span>' : '') + '<span class="xs muted">' + tgl(t.tanggal) + '</span>' + (t.label ? '<span class="badge right">' + esc(t.label) + '</span>' : '') + '</div><h4 style="margin-top:6px">' + esc(t.judul) + '</h4>' + (t.deskripsi ? '<p>' + esc(t.deskripsi) + '</p>' : '') + '</div></div>'; }).join('') || emptyState('Belum ada update', 'Tim advokat akan memperbarui perkembangan perkara di sini.', 'history')) + '</div>';
}
function pDokumen(d, n) {
  var docs = d.dokumen.map(function (x) { return '<div class="it"><div class="ic">' + ic('file-text') + '</div><div class="grow" style="min-width:0"><b class="small ellip" style="display:block">' + esc(x.nama) + '</b><div class="xs muted">' + esc(x.ukuran || '') + ' • ' + esc(x.jenis || '') + ' • ' + tgl(x.tanggal) + '</div></div>' + (x.file ? '<button class="btn xs ghost icon" aria-label="Unduh" data-file=\'' + esc(typeof x.file === 'string' ? x.file : JSON.stringify(x.file)) + '\' onclick="bukaBerkas(this)">' + ic('download') + '</button>' : '') + '</div>'; })
    .concat(d.deDokumen.map(function (x) { return '<div class="it"><div class="ic doc">' + ic('file-badge') + '</div><div class="grow" style="min-width:0"><b class="small ellip" style="display:block">' + esc(x.judul) + '</b><div class="xs muted">' + esc(x.nomor || '') + ' • Dokumen resmi ber-QR</div></div><button class="btn xs ghost icon" aria-label="Unduh" data-de="' + x.id + '">' + ic('download') + '</button></div>'; }));
  return '<div class="doclist">' + (docs.slice(0, n || 99).join('') || emptyState('Belum ada dokumen dibagikan', '', 'folder')) + '</div>';
}
function pTagihan(d) {
  var aktif = d.invoice.filter(function (i) { return Number(i.sisa) > 0; })[0];
  return aktif ? '<div class="soft"><div class="row"><b class="mono small" style="color:var(--primary-800)">' + esc(aktif.nomor) + '</b><span class="right xs">Jatuh Tempo <b class="bad">' + tgl(aktif.jatuhTempo) + '</b></span></div><div class="small">' + esc(aktif.tipe || '') + '</div>' +
    '<table class="small mt-s" style="width:100%"><tr><td class="muted">Total Nilai Penanganan</td><td style="text-align:right">' + rp(aktif.total) + '</td></tr><tr><td class="muted">Telah Dibayarkan</td><td style="text-align:right">(' + rp(aktif.dibayar) + ')</td></tr><tr><td><b>Sisa Tagihan Bersih</b></td><td style="text-align:right"><b style="color:var(--primary-800);font-size:16px">' + rp(aktif.sisa) + '</b></td></tr></table>' +
    '<div class="tint mt-s"><div class="row"><span class="lbl">Rekening Escrow</span><b class="right small">' + esc(d.rekening.bank) + '</b></div><div class="row"><b class="mono">' + esc(d.rekening.nomor) + '</b><button class="btn xs right" data-copy="' + esc(d.rekening.nomor) + '">Salin</button></div><div class="xs muted">a.n. ' + esc(d.rekening.nama) + '</div></div>' +
    '<div class="row mt-s"><button class="btn sm primary grow" data-bayar="' + aktif.id + '">Konfirmasi Pembayaran</button>' + (aktif.docId ? '<button class="btn sm" data-de="' + aktif.docId + '">' + ic('file-down') + 'Faktur</button>' : '') + '</div></div>'
    : emptyState('Tidak ada tagihan aktif', 'Terima kasih, seluruh tagihan sudah lunas.', 'badge-check');
}
function pTim(d) {
  return d.tim.map(function (t) { return '<div class="soft mb"><div class="row" style="align-items:flex-start"><div class="avatar">' + esc(initials(t.nama)) + '</div><div class="grow"><b class="small">' + esc(t.nama) + '</b><div class="xs" style="color:var(--primary-800)">' + esc(t.jabatan || '') + '</div><div class="xs muted">' + esc(t.spesialisasi || '') + (t.izin ? ' • Izin ' + esc(t.izin) : '') + '</div></div><div class="row gap-s">' + (t.wa ? '<a class="btn xs icon" aria-label="WhatsApp" target="_blank" rel="noopener" href="https://wa.me/' + esc(String(t.wa).replace(/^0/, '62')) + '">' + ic('message-circle') + '</a>' : '') + (t.email ? '<a class="btn xs icon" aria-label="Email" href="mailto:' + esc(t.email) + '">' + ic('mail') + '</a>' : '') + '</div></div></div>'; }).join('') +
    '<div class="row small t2">' + ic('phone') + ' Sekretariat: <b class="mono">' + esc(d.kantor.telepon || '') + '</b></div>';
}
var PORTAL_SEC = {
  beranda: function (d) {
    var next = pSidangNext(d), sisa = d.invoice.reduce(function (a, i) { return a + Number(i.sisa || 0); }, 0), inv = d.invoice.filter(function (i) { return Number(i.sisa) > 0; })[0];
    return '<div class="crumb small muted mb">' + ic('house') + ' Portal Klien › Ringkasan &amp; Perkembangan Perkara <span class="badge info right">Pembaruan: ' + tglJam(new Date().toISOString()) + '</span></div>' +
      '<div class="hero mb"><div class="row wrap"><div class="grow"><div class="row wrap gap-s"><span class="badge">' + ic('badge-check') + 'KLIEN TERVERIFIKASI</span><span class="badge">ID Klien: #' + esc(d.klien.kode) + '</span></div><h2 style="margin-top:10px">Selamat Datang, ' + esc(AppState.user.nama) + '</h2><p style="margin:6px 0 0">' + esc(d.klien.nama) + ' • Portofolio Litigasi Aktif • Penasihat Hukum Utama: ' + esc(d.tim.slice(0, 2).map(function (t) { return t.nama; }).join(' & ')) + '</p></div>' +
      '<div class="row wrap"><button class="btn" data-print>' + ic('file-down') + 'Unduh Laporan Ringkas</button><a class="btn" href="#/portal/tim" style="background:var(--navy);color:#fff;border-color:var(--navy)">' + ic('message-square') + 'Hubungi Tim Advokat</a></div></div></div>' +
      '<div class="grid g4 keep mb">' + kpi({ label: 'Perkara Aktif', value: d.perkara.filter(function (p) { return /Berjalan|Banding/.test(p.status); }).length + ' <small>Perkara</small>', icon: 'scale', foot: d.perkara[0] ? esc(d.perkara[0].noPerkara || '') : '' }) +
      kpi({ label: 'Jadwal Sidang Terdekat', value: '<span style="font-size:20px">' + (next ? (next.tanggal === today() ? 'Hari Ini' : tgl(next.tanggal)) : '—') + '</span>', icon: 'calendar', foot: next ? esc(next.jamMulai || '') + ' WIB • ' + esc(next.lokasi || '') : 'Belum dijadwalkan' }) +
      kpi({ label: 'Dokumen Diberi Akses', value: (d.dokumen.length + d.deDokumen.length) + ' <small>Berkas</small>', icon: 'folder-open', foot: ic('lock') + ' Akses read-only terenkripsi' }) +
      kpi({ label: 'Sisa Tagihan', value: '<span style="font-size:20px">' + rp(sisa) + '</span>', icon: 'receipt', tone: sisa ? 'bad' : 'ok', foot: inv ? 'Jatuh tempo ' + tgl(inv.jatuhTempo) + ' <span class="badge bad">Belum Lunas</span>' : '<span class="badge ok">Lunas</span>' }) + '</div>' +
      '<div class="split wide"><div class="col" style="gap:0">' + (d.perkara[0] ? pPerkaraCard(d, d.perkara[0]) : '') +
      '<div class="card mb"><div class="card-h"><h3 class="h-sm grow">' + ic('history') + ' Update Kronologis &amp; Catatan Litigasi</h3><span class="badge">' + d.timeline.length + ' catatan</span></div>' + pTimeline(d, 4) + '<a class="btn sm" href="#/portal/perkara">Lihat semua</a></div>' +
      (d.laporan[0] ? '<div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('clipboard-list') + ' Laporan Hasil Sidang Resmi</h3><span class="badge pri mono">' + esc(d.laporan[0].nomor) + '</span></div>' + pLaporan(d.laporan[0]) + '</div>' : '') + '</div>' +
      '<div class="col" style="gap:16px"><div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('folder-open') + ' Pusat Dokumen Resmi</h3></div>' + pDokumen(d, 5) + '<div class="xs muted mt-s">' + ic('lock') + ' Dilindungi enkripsi & izin unduh khusus ' + esc(d.klien.nama) + '.</div></div>' +
      '<div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('receipt') + ' Ringkasan Tagihan &amp; Escrow</h3>' + (inv ? '<span class="badge bad">Invoice Aktif</span>' : '') + '</div>' + pTagihan(d) + '</div>' +
      '<div class="card"><div class="card-h"><h3 class="h-sm grow">' + ic('users') + ' Tim Advokat Penanggung Jawab</h3></div>' + pTim(d) + '</div></div></div>';
  },
  perkara: function (d) { return '<h2 class="h-lg mb">Perkara Saya</h2>' + (d.perkara.map(function (p) { return pPerkaraCard(d, p) + '<div class="card mb"><h3 class="h-sm mb">Kronologi</h3>' + pTimeline({ timeline: d.timeline.filter(function (t) { return t.perkaraId === p.id; }) }) + '</div>'; }).join('') || '<div class="card">' + emptyState('Belum ada perkara', '') + '</div>'); },
  jadwal: function (d) { return '<h2 class="h-lg mb">Jadwal Sidang</h2><div class="card">' + (d.sidang.map(function (s) { var p = d.perkara.filter(function (x) { return x.id === s.perkaraId; })[0]; return '<div class="soft row mb" style="align-items:flex-start"><div class="btn primary sm" style="pointer-events:none;min-width:74px">' + pd(s.tanggal).getDate() + ' ' + BLN[pd(s.tanggal).getMonth()] + '</div><div class="grow"><b class="small">' + esc(s.agenda) + '</b><div class="xs muted">' + esc(s.jamMulai || '') + ' WIB • ' + esc([s.lokasi, s.ruang].filter(String).join(' — ')) + '</div><div class="xs">' + esc(p ? p.judul : '') + '</div></div>' + badge(s.tanggal < today() && s.status === 'Terjadwal' ? 'Selesai' : s.status) + '</div>'; }).join('') || emptyState('Belum ada jadwal', '', 'calendar')) + '</div>'; },
  laporan: function (d) { return '<h2 class="h-lg mb">Laporan Sidang</h2>' + (d.laporan.map(function (l) { return '<div class="card mb"><div class="card-h"><h3 class="h-sm grow">' + esc(l.agenda || 'Laporan sidang') + '</h3><span class="badge pri mono">' + esc(l.nomor) + '</span></div>' + pLaporan(l) + '</div>'; }).join('') || '<div class="card">' + emptyState('Belum ada laporan', 'Laporan resmi akan muncul setelah difinalisasi tim advokat.', 'clipboard') + '</div>'); },
  dokumen: function (d) { return '<h2 class="h-lg mb">Dokumen Legal Dibagikan</h2><div class="card">' + pDokumen(d) + '</div>'; },
  tagihan: function (d) {
    return '<h2 class="h-lg mb">Tagihan &amp; Invoice</h2><div class="split"><div class="card pad-0"><div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Invoice</th><th>Jenis</th><th class="num">Total</th><th class="num">Sisa</th><th>Status</th><th></th></tr></thead><tbody>' + (d.invoice.map(function (i) { return '<tr><td data-l="Invoice" class="mono">' + esc(i.nomor) + '<div class="xs muted">' + tgl(i.tanggal) + '</div></td><td data-l="Jenis">' + esc(i.tipe || '') + '</td><td data-l="Total" class="num">' + rp(i.total) + '</td><td data-l="Sisa" class="num"><b>' + rp(i.sisa) + '</b></td><td data-l="Status">' + badge(i.status) + '</td><td class="acts">' + (i.docId ? '<button class="btn xs" data-de="' + i.docId + '">' + ic('file-down') + 'PDF</button> ' : '') + (Number(i.sisa) > 0 ? '<button class="btn xs primary" data-bayar="' + i.id + '">Konfirmasi Bayar</button>' : '') + '</td></tr>'; }).join('') || '<tr><td colspan="9">' + emptyState('Belum ada invoice', '') + '</td></tr>') + '</tbody></table></div></div>' +
      '<div class="card"><h3 class="h-sm mb">Riwayat Pembayaran</h3>' + (d.pembayaran.map(function (p) { return '<div class="soft row mb small"><span class="grow">' + tgl(p.tanggal) + ' • ' + esc(p.metode || '') + '</span><b>' + rp(p.jumlah) + '</b>' + badge(p.status) + '</div>'; }).join('') || '<div class="muted small">Belum ada pembayaran.</div>') + '</div></div>';
  },
  tim: function (d) { return '<h2 class="h-lg mb">Kontak Tim Advokat PIC</h2><div class="card">' + pTim(d) + '</div>'; }
};
function pLaporan(l) {
  return '<div class="small"><b>Sidang Tanggal:</b> ' + tgl(l.tanggal, true) + ' • <b>Agenda:</b> ' + esc(l.agenda || '-') + '</div><div class="xs muted">Advokat Hadir: ' + esc(l.advokatHadir || '-') + '</div>' +
    '<div class="soft mt-s small"><div class="row" style="align-items:flex-start">' + ic('circle-check') + '<div><b>Temuan Kunci Persidangan:</b> ' + esc(l.temuan || '-') + '</div></div>' + (l.agendaBerikut ? '<div class="row mt-s" style="align-items:flex-start">' + ic('clock') + '<div><b>Jadwal Agenda Selanjutnya:</b> ' + esc(l.agendaBerikut) + '</div></div>' : '') + (l.rekomendasi ? '<div class="row mt-s" style="align-items:flex-start">' + ic('lightbulb') + '<div><b>Rekomendasi Tindakan:</b> ' + esc(l.rekomendasi) + '</div></div>' : '') + '</div>' +
    '<div class="xs muted mt-s">' + ic('pen-line') + ' Ditandatangani digital oleh advokat penanggung jawab perkara.</div>' + (l.docId ? '<button class="btn sm mt-s" data-de="' + l.docId + '">' + ic('file-down') + 'Unduh Berita Acara Sidang (PDF)</button>' : '');
}
function bindPortal(el, d) {
  if (el._pb) return; el._pb = 1;
  on(el, 'click', '[data-de]', function (e, b) { unduhDok(b, b.dataset.de); });
  on(el, 'click', '[data-copy]', function (e, b) { navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy); toast('Nomor rekening disalin.'); });
  on(el, 'click', '[data-print]', function () { window.print(); });
  on(el, 'click', '[data-bayar]', function (e, b) {
    var p = cacheGet('portal') || d, inv = p.invoice.filter(function (i) { return i.id === b.dataset.bayar; })[0];
    var m = modal('<h3 class="h-md">Konfirmasi pembayaran</h3><p class="small t2">Invoice <b class="mono">' + esc(inv.nomor) + '</b> • sisa ' + rp(inv.sisa) + '</p><div class="form-grid mt"><div class="field"><label>Tanggal bayar</label><input class="input" type="date" id="tg" value="' + today() + '"></div><div class="field"><label>Jumlah (Rp)</label><input class="input" id="jm" inputmode="numeric" value="' + nf(inv.sisa) + '"></div><div class="field full"><label>No. referensi transfer</label><input class="input" id="rf"></div><div class="field full"><label>Bukti transfer (gambar/PDF, maks 5 MB)</label><input type="file" id="bk" accept="image/*,application/pdf"></div></div><div class="row mt" style="justify-content:flex-end"><button class="btn" data-close>Batal</button><button class="btn primary" id="kb">Kirim Konfirmasi</button></div>');
    $('#jm', m.el).oninput = function () { var v = this.value.replace(/\D/g, ''); this.value = v ? nf(v) : ''; };
    $('#kb', m.el).onclick = async function () {
      var f = $('#bk', m.el).files[0], bukti = null; if (f) { try { bukti = await fileB64(f, 5); } catch (er) { return toast(er.message, 'bad'); } }
      var r = await act(this, 'portal.confirmPay', { invoiceId: inv.id, tanggal: $('#tg', m.el).value, jumlah: $('#jm', m.el).value.replace(/\D/g, ''), referensi: $('#rf', m.el).value, bukti: bukti });
      if (r.success) { m.close(); cacheStale('portal'); refreshView(); }
    };
  });
}
