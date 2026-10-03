/* ============================================================
   SIMLAWFIRM — pages-main.js
   Dashboard eksekutif, Kalender terpadu, Meeting Hub, Task & Deadline (kanban), Akun.
   ============================================================ */
'use strict';
var C1 = '#3B54B8', C2 = '#9AA9F0';
function salam() { var h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }
function jamSekarang() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function evIcon(e) { return { sidang: 'gavel', rapat: 'video', internal: 'users', task: 'list-checks' }[e.tipe] || 'calendar'; }
function agendaItem(e, hero) {
  return '<div class="ag ' + e.tipe + (hero ? ' hero' : '') + '" data-ev="' + esc(e.t + ':' + e.id) + '" style="cursor:pointer"><div class="row"><span class="time">' + esc(e.jam || 'Sepanjang hari') + (e.jam ? ' WIB' : '') + (e.tipe === 'sidang' ? ' • SIDANG RESMI' : '') + '</span><span class="right" style="opacity:.8">' + ic(evIcon(e)) + '</span></div>' +
    '<b>' + esc(e.judul) + '</b><div class="s">' + esc(e.sub || '') + (e.oleh ? ' • ' + esc(e.oleh) : '') + '</div></div>';
}
function bukaEvent(key) {
  var p = key.split(':'), t = p[0], id = p[1];
  if (t === 'Sidang') { var s = (Data.rows('Sidang') || []).filter(function (x) { return x.id === id; })[0]; if (s) return go('perkara-detail', s.perkaraId); }
  if (t === 'Rapat') { sessionStorage.setItem('slaw-rapat', id); return go('meeting'); }
  var rows = Data.rows(t) || [], r = rows.filter(function (x) { return x.id === id; })[0];
  if (r) openDetail(t, r); else Data.load(t, function (rs) { var x = (rs || []).filter(function (y) { return y.id === id; })[0]; if (x) openDetail(t, x); }, { fresh: 0 });
}

// ============================================================ DASHBOARD
registerPage('dashboard', {
  title: 'Ringkasan Eksekutif',
  show: function (el) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = '<div class="split"><div class="col" style="gap:18px" data-main>' + skeleton(4) + '</div><div class="col" style="gap:18px" data-side></div></div>';
      on(el, 'click', '[data-ev]', function (e, a) { bukaEvent(a.dataset.ev); });
      on(el, 'click', '[data-go]', function (e, a) { go(a.dataset.go, a.dataset.p); });
    }
    swr('dash', 'dashboard', {}, function (d, c, err) { if (!d) { $('[data-main]', el).innerHTML = errorBox(err && err.message, true); return; } drawDash(el, d); }, { fresh: 60000 });
  }
});
function drawDash(el, d) {
  var u = AppState.user, k = d.kpi, sp = AppState.user.role === 'SUPER_ADMIN';
  var hero = '<div class="hero"><div class="row wrap gap-s"><span class="badge">EXECUTIVE PORTAL</span><span class="badge"><span class="dot" style="color:#4ADE80"></span>Sistem Terhubung Real-Time</span></div>' +
    '<h2 style="margin-top:12px">Halo, ' + esc(u.nama) + '!</h2><p>' + salam() + '. Hari ini terdapat <b><u>' + k.sidangHari + ' agenda sidang pengadilan</u></b> dan <b><u>' + k.disposisiPending + ' disposisi tugas</u></b> yang perlu ditindaklanjuti' + (k.taskTelat ? ', serta ' + k.taskTelat + ' task melewati tenggat.' : '.') + '</p>' +
    '<div class="row wrap"><button class="btn" data-go="kalender">Lihat Seluruh Jadwal Hari Ini ' + ic('arrow-right') + '</button><span class="badge" style="padding:6px 12px">' + ic('refresh-cw') + 'Drive &amp; Sheets Sinkron</span></div></div>';
  var kpis = '<div class="grid g4 keep">' +
    kpi({ label: 'Perkara Aktif', value: k.perkaraAktif, unit: 'Perkara', icon: 'scale', foot: '<span class="badge ok">+' + k.perkaraBaruBulan + ' bulan ini</span>' + (k.perkaraTren ? '<span>' + (k.perkaraTren > 0 ? '+' : '') + k.perkaraTren + '% vs bln lalu</span>' : ''), click: '' }) +
    kpi({ label: 'Sidang Minggu Ini', value: k.sidangMinggu, unit: 'Agenda', icon: 'calendar-clock', foot: '<span class="badge ' + (k.sidangHari ? 'bad' : '') + '">' + k.sidangHari + ' sidang hari ini</span>' }) +
    kpi({ label: 'Piutang / Outstanding', value: '<span style="font-size:24px">' + rpS(k.piutang) + '</span>', icon: 'receipt', foot: '<span class="badge pri">' + k.nPiutang + ' tagihan</span><span>' + k.piutangJatuh14 + ' jatuh tempo &lt; 14 hari</span>' }) +
    kpi({ label: 'Task Menunggak', value: k.taskTelat, unit: 'Task', icon: 'alarm-clock', tone: k.taskTelat ? 'bad' : 'ok', foot: '<span>' + k.disposisiPending + ' disposisi belum selesai</span>' }) + '</div>';
  var stat = '<div class="card"><div class="card-h"><div class="grow"><div class="row"><h3 class="h-md">Statistik Perkara Berjalan</h3><span class="badge pri">' + k.totalPerkara + ' Total Kasus</span></div><div class="sub">Distribusi perkara aktif dan terselesaikan menurut klasifikasi hukum peradilan.</div></div><button class="btn sm primary" data-go="perkara">Semua Perkara</button></div>' +
    '<div class="soft row wrap small" style="justify-content:space-between"><span>Berjalan aktif: <b>' + k.perkaraAktif + '</b> • Terselesaikan: <b>' + k.totalSelesai + '</b></span><span style="color:var(--primary-800);font-weight:600">' + ic('circle-check') + ' Win rate ' + k.winRate + '% • ' + k.selesaiTahunIni + ' selesai tahun ini</span></div><div class="mt" data-ch1></div></div>';
  var wl = '<div class="card"><div class="card-h"><div class="grow"><h3 class="h-md">Beban &amp; Progres Perkara Tim Advokat</h3><div class="sub">Pemantauan beban kerja per Person In Charge (PIC) terhadap kapasitas.</div></div><button class="btn sm ghost icon" data-go="workload" aria-label="Workload">' + ic('sliders-horizontal') + '</button></div>' +
    '<div class="grid g3">' + (d.workload || []).map(function (w) {
      return '<div class="soft row" style="gap:12px">' + ring(w.beban, 58) + '<div class="grow" style="min-width:0"><b class="ellip" style="display:block;font-size:13px">' + esc(w.nama) + '</b><div class="xs muted ellip">' + esc(w.jabatan || '') + '</div><div class="xs" style="color:var(--primary-800);font-weight:600;margin-top:2px">' + w.perkara + ' Perkara Aktif</div></div></div>';
    }).join('') + '</div></div>';
  var fin = '<div class="card"><div class="card-h"><div class="grow"><h3 class="h-md">Honorarium Masuk vs Operasional Kantor</h3><div class="sub">Komparasi arus kas penagihan retainer &amp; success fee vs pengeluaran operasional.</div></div></div><div data-ch2></div>' +
    '<a class="soft row mt" href="#/keuangan" style="color:inherit"><span class="small">Net Profit Margin (periode): <b class="' + (d.margin >= 0 ? 'ok' : 'bad') + '">' + (d.margin >= 0 ? '+' : '') + d.margin + '%</b></span><span class="right small" style="color:var(--primary-800);font-weight:600">Buka Laporan Finance Lengkap ' + ic('chevron-right') + '</span></a></div>';
  $('[data-main]', el).innerHTML = hero + kpis + stat + wl + fin;
  var cats = (d.statKategori || []).slice(0, 7);
  barChart($('[data-ch1]', el), { cats: cats.map(function (c) { return c.kategori.replace(' / Merek', ''); }), series: [{ name: 'Berjalan Aktif', color: C1, values: cats.map(function (c) { return c.aktif; }) }, { name: 'Terselesaikan', color: C2, values: cats.map(function (c) { return c.selesai; }) }], height: 230, labelAll: true, label: 'Statistik perkara per kategori' });
  barChart($('[data-ch2]', el), { cats: (d.arus || []).map(function (a) { var m = +a.bulan.slice(5) - 1; return BULAN[m]; }), series: [{ name: 'Pemasukan (Fee)', color: C1, values: d.arus.map(function (a) { return a.masuk; }) }, { name: 'Pengeluaran Ops', color: C2, values: d.arus.map(function (a) { return a.keluar; }) }], fmt: rp, short: function (v) { return Math.round(v / 1e6) + 'M'; }, labelAll: true, height: 230, label: 'Pemasukan vs pengeluaran' });
  // ---- kolom kanan
  var now = jamSekarang(), ag = d.agendaHari || [], html = '', sisip = false;
  ag.forEach(function (e, i) { if (!sisip && e.jam && e.jam > now) { html += '<div class="now-line">Sekarang (' + now + ' WIB)</div>'; sisip = true; } html += agendaItem(e, i === 0 && e.tipe === 'sidang'); });
  if (!sisip && ag.length) html += '<div class="now-line">Sekarang (' + now + ' WIB)</div>';
  var side = '<div class="mode-card"><div class="avatar" style="background:rgba(255,255,255,.12)">' + ic('shield-check') + '</div><div class="grow"><b style="font-size:13px">' + (sp ? 'Executive Mode' : 'Partner View') + '</b><div class="xs" style="opacity:.75">' + (sp ? 'Akses Audit Menyeluruh' : 'Akses baca-saja ringkasan kantor') + '</div></div><span class="badge pri">' + (sp ? 'Super Admin' : 'Partner') + '</span></div>' +
    '<div class="card"><div class="card-h"><div class="grow"><h3 class="h-sm">Agenda Hari Ini</h3><div class="sub">' + ag.length + ' agenda penting kantor</div></div><span class="badge">' + tgl(d.hari) + '</span></div>' + (html || emptyState('Tidak ada agenda', 'Hari ini kosong dari sidang & rapat.', 'calendar-check')) + '</div>' +
    '<div class="card"><div class="card-h"><h3 class="h-sm grow">Sidang &amp; Rapat Mendatang</h3><a class="small" href="#/kalender">Semua</a></div>' + ((d.mendatang || []).map(function (e) {
      return '<div class="soft row mb" data-ev="' + esc(e.t + ':' + e.id) + '" style="cursor:pointer;align-items:flex-start"><div class="kpi" style="padding:0"><div class="ico">' + ic(evIcon(e)) + '</div></div><div class="grow" style="min-width:0"><div class="row"><span class="badge bad">H-' + e.h + '</span><span class="xs muted right">' + HARI[pd(e.tanggal).getDay()] + ', ' + tgl(e.tanggal) + '</span></div><b class="ellip" style="display:block;font-size:13px;margin-top:4px">' + esc(e.judul) + '</b><div class="xs muted ellip">' + esc(e.sub || '') + '</div></div></div>';
    }).join('') || emptyState('Belum ada jadwal', '14 hari ke depan kosong.', 'calendar')) + '</div>' +
    (sp ? '<div class="card pad-s row" style="cursor:pointer" data-quick><div class="kpi" style="padding:0"><div class="ico">' + ic('send') + '</div></div><div class="grow"><b style="font-size:13px">Disposisi Cepat</b><div class="xs muted">Tugaskan berkas ke advokat</div></div><button class="btn primary sm icon" aria-label="Buat task">' + ic('plus') + '</button></div>' : '') +
    '<div class="card"><div class="card-h"><h3 class="h-sm grow">Task Terdekat</h3><a class="small" href="#/task">Kanban</a></div>' + ((d.tasks || []).map(function (t) {
      var dd = diffDays(t.tenggat); return '<div class="row mb small" data-ev="Task:' + t.id + '" style="cursor:pointer"><span class="badge ' + (dd < 0 ? 'bad' : dd <= 1 ? 'warn' : '') + '">' + (dd < 0 ? 'Telat ' + -dd + 'h' : dd === 0 ? 'Hari ini' : 'H-' + dd) + '</span><span class="grow ellip">' + esc(t.judul) + '</span></div>';
    }).join('') || '<div class="muted small">Tidak ada task terbuka.</div>') + '</div>';
  $('[data-side]', el).innerHTML = side;
  var q = $('[data-quick]', el); if (q) q.onclick = function () { openForm('Task', null, { defaults: { prioritas: 'Tinggi', tenggat: addDays(today(), 2) } }); };
}

// ============================================================ KALENDER
var CalSt = { view: 'Bulan', cur: today(), kat: '', pic: '', sel: today() };
registerPage('kalender', {
  title: 'Kalender',
  show: function (el) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = pageHead({ crumb: 'Litigasi &amp; Agenda Kantor <span class="muted">• Kalender Terpadu</span>', title: 'Workspace, Kalender &amp; Meeting Hub', desc: 'Pusat jadwal terpadu sidang peradilan, siklus rapat klien/internal kantor, serta monitoring tindak lanjut & task deadline tim advokat.',
        acts: '<button class="btn" data-ics>' + ic('calendar-arrow-down') + 'Ekspor Kalender (.ics)</button>' + (canEdit() ? '<button class="btn primary" data-new>' + ic('circle-plus') + 'Buat Agenda / Rapat Baru</button>' : '') }) +
        '<div data-kpis class="mb"></div><div class="card pad-s row wrap mb"><div class="seg sq"><button class="on">' + ic('calendar') + 'Kalender Terpadu</button><button data-goto="meeting">' + ic('users') + 'Meeting Hub</button><button data-goto="task">' + ic('list-checks') + 'Task &amp; Deadline</button></div><div class="sp"></div>' +
        '<div class="seg" data-view>' + ['Bulan', 'Minggu', 'Hari'].map(function (v) { return '<button data-v="' + v + '">' + v + '</button>'; }).join('') + '</div><select class="input sm" style="width:auto" data-kat><option value="">Semua Kategori</option><option value="sidang">Sidang Peradilan</option><option value="rapat">Rapat Klien / Online</option><option value="internal">Rapat Internal</option><option value="task">Task / Tenggat</option></select></div>' +
        '<div class="split"><div class="card"><div class="row mb wrap"><h3 class="h-lg" data-title></h3><div class="row gap-s"><button class="btn sm icon" data-nav="-1" aria-label="Sebelumnya">' + ic('chevron-left') + '</button><button class="btn sm" data-nav="0">Hari Ini</button><button class="btn sm icon" data-nav="1" aria-label="Berikutnya">' + ic('chevron-right') + '</button></div></div><div data-cal></div>' +
        '<div class="legend mt"><span><i style="background:var(--primary-800)"></i>Sidang Peradilan</span><span><i style="background:#C9D2FF"></i>Rapat Klien / Online</span><span><i style="background:#BBF7D0"></i>Rapat Internal / Pelatihan</span><span><i style="background:#FED7AA"></i>Task / Tenggat Berkas</span></div></div>' +
        '<div class="col" style="gap:16px"><div class="card" data-day></div><div data-remind></div></div></div>';
      on(el, 'click', '[data-goto]', function (e, b) { go(b.dataset.goto); });
      on(el, 'click', '[data-v]', function (e, b) { CalSt.view = b.dataset.v; el._draw(); });
      on(el, 'change', '[data-kat]', function (e, s) { CalSt.kat = s.value; el._draw(); });
      on(el, 'click', '[data-nav]', function (e, b) {
        var n = +b.dataset.nav, d = pd(CalSt.cur);
        if (!n) CalSt.cur = CalSt.sel = today();
        else if (CalSt.view === 'Bulan') { d.setDate(1); d.setMonth(d.getMonth() + n); CalSt.cur = ymd(d); }
        else CalSt.cur = addDays(CalSt.cur, n * (CalSt.view === 'Minggu' ? 7 : 1));
        if (CalSt.view === 'Hari') CalSt.sel = CalSt.cur;
        el._load(true);
      });
      on(el, 'click', '[data-d]', function (e, c) { CalSt.sel = c.dataset.d; if (CalSt.view === 'Hari') CalSt.cur = c.dataset.d; el._draw(); });
      on(el, 'click', '[data-ev]', function (e, a) { e.stopPropagation(); bukaEvent(a.dataset.ev); });
      on(el, 'click', '[data-new]', function () { pilihAgendaBaru(); });
      on(el, 'click', '[data-ics]', function () { eksporIcs(el._ev || []); });
    }
    var ev = [], ring2 = {};
    var draw = function () {
      var evs = ev.filter(function (e) { return !CalSt.kat || e.tipe === CalSt.kat; });
      $$('[data-v]', el).forEach(function (b) { b.classList.toggle('on', b.dataset.v === CalSt.view); });
      var c = pd(CalSt.cur), byDay = {}; evs.forEach(function (e) { (byDay[e.tanggal] = byDay[e.tanggal] || []).push(e); });
      var hari = today(), html = '';
      if (CalSt.view === 'Bulan') {
        $('[data-title]', el).textContent = BULAN[c.getMonth()] + ' ' + c.getFullYear();
        var first = new Date(c.getFullYear(), c.getMonth(), 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
        html = '<div class="cal">' + ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'].map(function (d) { return '<div class="dow">' + d + '</div>'; }).join('');
        for (var i = 0; i < 42; i++) {
          var d = new Date(start); d.setDate(start.getDate() + i); var k = ymd(d), list = byDay[k] || [];
          if (i === 35 && d.getMonth() !== c.getMonth()) break;
          html += '<div class="day' + (d.getMonth() !== c.getMonth() ? ' out' : '') + (k === hari ? ' today' : '') + '" data-d="' + k + '" style="' + (k === CalSt.sel && k !== hari ? 'border-color:var(--primary)' : '') + '"><div class="n"><span>' + d.getDate() + '</span>' + (list.length > 3 ? '<em class="xs muted">+' + (list.length - 3) + '</em>' : '') + '</div>' +
            list.slice(0, 3).map(function (e) { return '<div class="ev ' + e.tipe + '" data-ev="' + esc(e.t + ':' + e.id) + '" title="' + esc(e.judul) + '">' + esc((e.jam ? e.jam + ' ' : '') + e.judul) + '</div>'; }).join('') + '</div>';
        }
        html += '</div>';
      } else {
        var dari = CalSt.view === 'Minggu' ? addDays(CalSt.cur, -((c.getDay() + 6) % 7)) : CalSt.cur, n = CalSt.view === 'Minggu' ? 7 : 1;
        $('[data-title]', el).textContent = CalSt.view === 'Minggu' ? 'Pekan ' + tgl(dari) + ' – ' + tgl(addDays(dari, 6)) : HARI[c.getDay()] + ', ' + tgl(CalSt.cur, true);
        for (var j = 0; j < n; j++) {
          var kk = addDays(dari, j), l = byDay[kk] || [];
          html += '<div class="mb"><div class="row" data-d="' + kk + '" style="cursor:pointer"><b class="' + (kk === hari ? '' : 't2') + '" style="' + (kk === hari ? 'color:var(--primary-800)' : '') + '">' + HARI[pd(kk).getDay()] + ', ' + tgl(kk) + '</b>' + (kk === hari ? '<span class="badge pri">Hari ini</span>' : '') + '<span class="right count">' + l.length + '</span></div><div class="mt-s">' +
            (l.map(function (e) { return agendaItem(e); }).join('') || '<div class="xs muted" style="padding:6px 0 4px">Tidak ada jadwal.</div>') + '</div></div>';
        }
      }
      $('[data-cal]', el).innerHTML = html;
      var sel = byDay[CalSt.sel] || [];
      $('[data-day]', el).innerHTML = '<div class="card-h"><div class="grow"><div class="lbl">' + (CalSt.sel === hari ? 'Hari ini' : HARI[pd(CalSt.sel).getDay()]) + '</div><h3 class="h-sm">' + tgl(CalSt.sel, true) + '</h3></div><span class="count">' + sel.length + '</span></div>' +
        (sel.map(function (e) { return agendaItem(e); }).join('') || emptyState('Tidak ada agenda', 'Pilih tanggal lain pada kalender.', 'calendar-x'));
      var next = ev.filter(function (e) { return e.tipe === 'sidang' && e.tanggal >= hari; })[0];
      $('[data-remind]', el).innerHTML = next ? '<div class="tint row" style="align-items:flex-start"><div class="kpi" style="padding:0"><div class="ico">' + ic('bell-ring') + '</div></div><div class="grow"><b class="small">Pengingat Berkas Sidang: ' + esc(next.jam || '') + ' ' + (next.tanggal === hari ? 'Hari Ini' : tgl(next.tanggal)) + '</b><div class="xs t2">' + esc(next.judul) + '. Pastikan alat bukti asli telah dilegalisir.</div><button class="btn xs mt-s" data-ev="' + esc(next.t + ':' + next.id) + '">Buka Berkas</button></div></div>' : '';
      el._ev = evs;
    };
    var load = function (force) {
      var c = pd(CalSt.cur), dari = ymd(new Date(c.getFullYear(), c.getMonth() - 1, 20)), sampai = ymd(new Date(c.getFullYear(), c.getMonth() + 2, 10));
      swr('cal:' + dari, 'calendar', { dari: dari, sampai: sampai }, function (d, x, err) {
        if (!d) { $('[data-cal]', el).innerHTML = errorBox(err && err.message, true); return; }
        ev = d.events; ring2 = d.ringkas;
        $('[data-kpis]', el).innerHTML = '<div class="grid g4 keep">' + kpi({ label: 'Total Agenda Pekan Ini', value: ring2.agendaMinggu, unit: 'Agenda', icon: 'calendar-days', foot: '<span class="badge pri">' + ring2.sidang + ' Sidang</span><span class="badge">' + ring2.rapat + ' Rapat</span><span class="badge">' + ring2.task + ' Task</span>' }) +
          kpi({ label: 'Sidang Peradilan Mendatang', value: ring2.sidangMendatang, unit: 'Sidang', icon: 'gavel', foot: '<span class="badge warn">' + ring2.sidangHariIni + ' hari ini</span>' }) +
          kpi({ label: 'Tindak Lanjut Meeting', value: ring2.tlTotal, unit: 'Item', icon: 'circle-check', tone: 'ok', bar: ring2.tlTotal ? ring2.tlSelesai / ring2.tlTotal * 100 : 0, foot: ring2.tlSelesai + ' selesai • ' + (ring2.tlTotal - ring2.tlSelesai) + ' berjalan' }) +
          kpi({ label: 'Task Mendekati Deadline', value: ring2.taskDekat, unit: 'Berkas', icon: 'alarm-clock', tone: ring2.taskDekat ? 'bad' : 'ok', foot: '<span class="badge bad">Jatuh tempo ≤ 48 jam</span>' }) + '</div>';
        draw();
      }, { fresh: force ? 30000 : 60000 });
    };
    el._draw = draw; el._load = load;
    load();
  }
});
function pilihAgendaBaru() {
  var m = modal('<h3 class="h-md">Buat agenda baru</h3><p class="t2 small">Pilih jenis agenda yang akan dijadwalkan.</p><div class="grid g2 mt">' +
    [['Sidang', 'gavel', 'Jadwal Sidang'], ['Rapat', 'users', 'Rapat / Meeting'], ['Konsultasi', 'message-square', 'Konsultasi Klien'], ['Task', 'list-checks', 'Task / Tenggat']].map(function (x) { return '<button class="card hov pad-s row" data-t="' + x[0] + '" style="text-align:left">' + ic(x[1]) + '<b class="small">' + x[2] + '</b></button>'; }).join('') + '</div>');
  on(m.el, 'click', '[data-t]', function (e, b) { m.close(); openForm(b.dataset.t, null, { defaults: { tanggal: CalSt.sel || today(), tenggat: CalSt.sel || today() } }); });
}
function eksporIcs(ev) {
  var esc2 = function (s) { return String(s || '').replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n'); };
  var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SIMLAWFIRM//ID'];
  ev.forEach(function (e) {
    var d = e.tanggal.replace(/-/g, ''), j = (e.jam || '').replace(':', '');
    lines.push('BEGIN:VEVENT', 'UID:' + e.id + '@simlawfirm', 'SUMMARY:' + esc2(e.judul), 'LOCATION:' + esc2(e.sub), j ? 'DTSTART;TZID=Asia/Jakarta:' + d + 'T' + j + '00' : 'DTSTART;VALUE=DATE:' + d, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  saveBlob(new Blob([lines.join('\r\n')], { type: 'text/calendar' }), 'kalender_simlawfirm.ics');
}

// ============================================================ MEETING HUB
registerPage('meeting', {
  title: 'Meeting Hub',
  show: function (el) {
    if (!el._init) {
      el._init = true;
      el.innerHTML = pageHead({ crumb: 'Workspace • Meeting Hub', title: 'Meeting Hub', desc: 'Kelola siklus rapat penuh: jadwal → agenda → peserta → notulensi → keputusan → tindak lanjut (otomatis menjadi Task).',
        acts: canEdit() ? '<button class="btn primary" data-new>' + ic('circle-plus') + 'Jadwalkan Rapat</button>' : '' }) +
        '<div class="split wide"><div class="card pad-0"><div class="toolbar"><div class="seg" data-tab><button class="on" data-k="up">Mendatang</button><button data-k="past">Selesai / Lalu</button></div></div><div data-list style="padding:12px"></div></div><div data-det></div></div>';
      on(el, 'click', '[data-new]', function () { openForm('Rapat', null, { defaults: { tanggal: today() } }); });
      on(el, 'click', '[data-tab] button', function (e, b) { $$('[data-tab] button', el).forEach(function (x) { x.classList.toggle('on', x === b); }); el._tab = b.dataset.k; el._list(); });
      on(el, 'click', '[data-rp]', function (e, c) { el._sel = c.dataset.rp; el._list(); el._detail(); });
    }
    var rows = [];
    var list = function () {
      var hari = today(), past = el._tab === 'past';
      var rs = rows.filter(function (r) { return past ? r.tanggal < hari || r.status === 'Selesai' : r.tanggal >= hari && r.status !== 'Selesai'; }).sort(function (a, b) { return past ? b.tanggal.localeCompare(a.tanggal) : (a.tanggal + a.jamMulai).localeCompare(b.tanggal + b.jamMulai); });
      if (!el._sel && rs[0]) el._sel = rs[0].id;
      $('[data-list]', el).innerHTML = rs.map(function (r) {
        return '<div class="soft mb" data-rp="' + r.id + '" style="cursor:pointer;' + (r.id === el._sel ? 'border-color:var(--primary);background:var(--primary-50)' : '') + '"><div class="row"><span class="badge ' + (r.jenis === 'Rapat Internal' ? 'ok' : 'info') + '">' + esc(r.jenis || 'Rapat') + '</span><span class="xs muted right">' + tgl(r.tanggal) + ' • ' + esc(r.jamMulai || '') + '</span></div>' +
          '<b style="display:block;margin:6px 0 2px;font-size:14px">' + esc(r.judul) + '</b><div class="xs muted">' + ic('map-pin') + ' ' + esc(r.lokasi || r.media || '-') + (r.perkaraId ? ' • ' + esc(refLabel('Perkara', r.perkaraId)) : '') + '</div></div>';
      }).join('') || emptyState('Belum ada rapat', 'Jadwalkan rapat baru.', 'users');
    };
    var detail = function () {
      var id = el._sel, host = $('[data-det]', el); if (!id) { host.innerHTML = ''; return; }
      swr('rapat:' + id, 'rapat.detail', { id: id }, function (d, c, err) { if (!d) { host.innerHTML = errorBox(err && err.message, true); return; } host.innerHTML = rapatPanel(d); bindRapatPanel(host, d); }, { fresh: 20000 });
    };
    el._list = list; el._detail = detail;
    var pre = sessionStorage.getItem('slaw-rapat'); if (pre) { el._sel = pre; sessionStorage.removeItem('slaw-rapat'); }
    Data.load('Rapat', function (rs, c, err) { if (!rs) { $('[data-list]', el).innerHTML = errorBox(err && err.message, true); return; } rows = rs; list(); detail(); });
  }
});
function rapatPanel(d) {
  var r = d.rapat, e = canEdit(), hadir = d.peserta.filter(function (p) { return p.kehadiran === 'Hadir'; }).length, tunggu = d.peserta.filter(function (p) { return p.kehadiran === 'Menunggu' || p.kehadiran === 'Diundang'; }).length;
  var stg = function (n, title, done, body, add) { return '<div class="stg ' + (done ? 'done' : '') + '"><i>' + (done ? ic('check') : n) + '</i><div class="grow" style="min-width:0"><div class="row"><b class="small">' + n + '. ' + title + '</b>' + (e && add ? '<button class="btn xs ghost right" data-add="' + add + '">' + ic('plus') + 'Tambah</button>' : '') + '</div><div class="mt-s">' + body + '</div></div></div>'; };
  return '<div class="card"><div class="row"><span class="badge ' + (r.tanggal === today() ? 'ok' : 'pri') + '"><span class="dot"></span>' + (r.tanggal === today() ? 'Hari Ini' : tgl(r.tanggal)) + ' • ' + esc(r.jamMulai || '') + ' WIB</span><span class="mono xs muted right">' + esc(r.id) + '</span></div>' +
    '<h3 class="h-md" style="margin:10px 0 4px">' + esc(r.judul) + '</h3><div class="small t2">' + ic('scale') + ' ' + esc(r.perkaraId ? refLabel('Perkara', r.perkaraId) : (r.klienId ? refLabel('Klien', r.klienId) : r.jenis)) + '</div>' +
    '<div class="soft row mt-s small">' + ic('users') + '<span>' + hadir + ' hadir, ' + tunggu + ' menunggu</span><span class="right">' + esc(r.lokasi || r.media || '') + '</span></div>' +
    '<div class="lbl mt mb">Siklus Dokumentasi Rapat (5 Tahap)</div><div class="stages">' +
    stg(1, 'Agenda Pembahasan', d.agenda.length > 0, d.agenda.map(function (a) { return '<div class="small mb" data-sub="AgendaRapat:' + a.id + '" style="cursor:pointer">' + esc(a.urutan || '•') + '. ' + esc(a.topik) + ' ' + badge(a.status) + '</div>'; }).join('') || '<div class="xs muted">Belum ada agenda.</div>', 'AgendaRapat') +
    stg(2, 'Konfirmasi Kehadiran', hadir > 0, d.peserta.map(function (p) { return '<div class="row small mb" data-sub="PesertaRapat:' + p.id + '" style="cursor:pointer"><div class="avatar sm soft">' + esc(initials(p.nama)) + '</div><span class="grow ellip">' + esc(p.nama) + '</span>' + badge(p.kehadiran) + '</div>'; }).join('') || '<div class="xs muted">Belum ada peserta.</div>', 'PesertaRapat') +
    stg(3, 'Notulensi Ringkas', d.notulensi.length > 0, d.notulensi.map(function (n) { return '<div class="soft small richtext mb" data-sub="Notulensi:' + n.id + '" style="cursor:pointer"><b>' + esc(n.ringkasan || 'Catatan') + '</b>' + (n.catatan || '') + '</div>'; }).join('') || '<div class="xs muted">Belum ada notulensi.</div>', 'Notulensi') +
    stg(4, 'Keputusan Rapat', d.keputusan.length > 0, d.keputusan.map(function (k) { return '<div class="small mb" data-sub="Keputusan:' + k.id + '" style="cursor:pointer;background:var(--ok-bg);border:1px solid #BBF7D0;border-radius:10px;padding:8px 10px">' + esc(k.keputusan) + '</div>'; }).join('') || '<div class="xs muted">Belum ada keputusan.</div>', 'Keputusan') +
    stg(5, 'Tindak Lanjut / Task', d.tindakLanjut.length > 0 && d.tindakLanjut.every(function (t) { return t.status === 'Selesai'; }), d.tindakLanjut.map(function (t) { return '<div class="soft row small mb" data-sub="TindakLanjut:' + t.id + '" style="cursor:pointer"><div class="grow"><b>' + esc(t.tugas) + '</b><div class="xs muted">PIC: ' + esc(refLabel('Personel', t.picId)) + (t.tenggat ? ' • ' + tgl(t.tenggat) : '') + (t.taskId ? ' • ' + esc(refLabel('Task', t.taskId)) : '') + '</div></div>' + badge(t.status) + '</div>'; }).join('') || '<div class="xs muted">Belum ada tindak lanjut.</div>', 'TindakLanjut') +
    '</div><div class="row mt wrap"><button class="btn sm" data-print>' + ic('printer') + 'Cetak Notulensi</button>' + (e ? '<button class="btn sm" data-edit-rapat>' + ic('pencil') + 'Ubah Rapat</button>' : '') + '</div></div>';
}
function bindRapatPanel(host, d) {
  var refresh = function () { cacheStale('rapat:' + d.rapat.id); refreshView(); };
  on(host, 'click', '[data-add]', function (e, b) { openForm(b.dataset.add, null, { defaults: { rapatId: d.rapat.id, tanggal: d.rapat.tanggal, urutan: d.agenda.length + 1 }, hideF: ['rapatId'], onSaved: refresh }); });
  on(host, 'click', '[data-sub]', function (e, b) { var p = b.dataset.sub.split(':'), list = { AgendaRapat: d.agenda, PesertaRapat: d.peserta, Notulensi: d.notulensi, Keputusan: d.keputusan, TindakLanjut: d.tindakLanjut }[p[0]]; var row = list.filter(function (x) { return x.id === p[1]; })[0]; if (row) openDetail(p[0], row, { formOpt: { onSaved: refresh } }); });
  var ed = $('[data-edit-rapat]', host); if (ed) ed.onclick = function () { openForm('Rapat', d.rapat, { onSaved: refresh }); };
  $('[data-print]', host).onclick = function () { cetakHtml('Notulensi — ' + d.rapat.judul, rapatPanel(d).replace(/<button[\s\S]*?<\/button>/g, '')); };
}
function cetakHtml(judul, html) {
  var w = window.open('', '_blank'); if (!w) return toast('Izinkan pop-up untuk mencetak.', 'warn');
  var css = Array.prototype.map.call(document.querySelectorAll('link[rel=stylesheet]'), function (l) { return '<link rel="stylesheet" href="' + l.href + '">'; }).join('');
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(judul) + '</title>' + css + '<style>body{background:#fff;padding:24px}</style></head><body><div class="paper"><div class="kop"><b>' + esc(AppState.settings.institusi || 'SIMLAWFIRM') + '</b></div>' + html + '</div><script>setTimeout(function(){print()},500)<\/script></body></html>');
  w.document.close();
}

// Sub-entitas meeting hub sebagai halaman CRUD generik (menu PRD)
registerPage('rapat', crudPage({ t: 'Rapat', title: 'Jadwal Rapat', crumb: 'Workspace • Meeting Hub', desc: 'Penjadwalan rapat internal & eksternal.', defaults: function () { return { tanggal: today() }; },
  onRow: function (r) { sessionStorage.setItem('slaw-rapat', r.id); go('meeting'); } }));
registerPage('agenda', crudPage({ t: 'AgendaRapat', title: 'Agenda Rapat', crumb: 'Workspace • Meeting Hub', desc: 'Daftar agenda pembahasan tiap rapat.' }));
registerPage('peserta', crudPage({ t: 'PesertaRapat', title: 'Peserta Rapat', crumb: 'Workspace • Meeting Hub', desc: 'Peserta yang diundang & konfirmasi kehadiran. Peserta baru otomatis menerima undangan (bila notifikasi aktif).' }));
registerPage('notulensi', crudPage({ t: 'Notulensi', title: 'Notulensi', crumb: 'Workspace • Meeting Hub', desc: 'Catatan hasil rapat.' }));
registerPage('keputusan', crudPage({ t: 'Keputusan', title: 'Keputusan Rapat', crumb: 'Workspace • Meeting Hub', desc: 'Keputusan yang diambil dalam rapat.' }));
registerPage('tindaklanjut', crudPage({ t: 'TindakLanjut', title: 'Tindak Lanjut', crumb: 'Workspace • Meeting Hub', desc: 'Tindak lanjut pasca-rapat. Setiap item ber-PIC otomatis menjadi Task & statusnya tersinkron.',
  tabs: [{ l: 'Semua', f: function () { return true; } }, { l: 'Belum', f: function (r) { return r.status === 'Belum Dikerjakan'; } }, { l: 'Sedang', f: function (r) { return r.status === 'Sedang Dikerjakan'; } }, { l: 'Selesai', f: function (r) { return r.status === 'Selesai'; } }] }));

// ============================================================ TASK & DEADLINE (KANBAN)
var KOL = [['Menunggu Dikerjakan', '#8A90A2'], ['Sedang Diproses', '#F59E0B'], ['Selesai', '#16A34A']];
registerPage('task', {
  title: 'Task & Deadline',
  show: function (el) {
    if (!el._init) {
      el._init = true; el._pic = '';
      el.innerHTML = pageHead({ crumb: 'Workspace • Task &amp; Deadline', title: 'Task &amp; Deadline Berjalan', desc: 'Distribusi penugasan draft memori, eksepsi, dan pembuktian perkara aktif. Seret kartu antar kolom untuk mengubah status.',
        acts: '<select class="input" style="width:auto" data-pic><option value="">PIC: Semua Advokat</option>' + (AppState.refs.Personel || []).map(function (p) { return '<option value="' + p[0] + '">' + esc(p[1]) + '</option>'; }).join('') + '</select><button class="btn" data-list>' + ic('table') + 'Tampilan Tabel</button>' + (canEdit() ? '<button class="btn primary" data-new>' + ic('plus') + 'Task Baru</button>' : '') }) + '<div class="kanban" data-kb></div>';
      on(el, 'change', '[data-pic]', function (e, s) { el._pic = s.value; el._draw(); });
      on(el, 'click', '[data-new]', function () { openForm('Task', null, { defaults: { tenggat: addDays(today(), 3) } }); });
      on(el, 'click', '[data-list]', function () { go('task-tabel'); });
      on(el, 'click', '[data-tk]', function (e, c) { if (e.target.closest('[data-mv]')) return; var r = (el._rows || []).filter(function (x) { return x.id === c.dataset.tk; })[0]; if (r) openDetail('Task', r); });
      on(el, 'click', '[data-mv]', function (e, b) { e.stopPropagation(); el._pindah(b.dataset.id, b.dataset.mv); });
      el.addEventListener('dragstart', function (e) { var c = e.target.closest('[data-tk]'); if (c) e.dataTransfer.setData('text/plain', c.dataset.tk); });
      el.addEventListener('dragover', function (e) { var k = e.target.closest('.kcol'); if (k && canEdit()) { e.preventDefault(); k.classList.add('drop'); } });
      el.addEventListener('dragleave', function (e) { var k = e.target.closest('.kcol'); if (k) k.classList.remove('drop'); });
      el.addEventListener('drop', function (e) { var k = e.target.closest('.kcol'); if (!k) return; e.preventDefault(); k.classList.remove('drop'); el._pindah(e.dataTransfer.getData('text/plain'), k.dataset.st); });
    }
    var rows = el._rows || [];
    var draw = function () {
      var rs = rows.filter(function (r) { return !el._pic || r.picId === el._pic; });
      $('[data-kb]', el).innerHTML = KOL.map(function (k, ki) {
        var l = rs.filter(function (r) { return r.status === k[0]; }).sort(function (a, b) { return String(a.tenggat).localeCompare(b.tenggat); });
        return '<div class="kcol" data-st="' + k[0] + '"><div class="kcol-h"><i style="background:' + k[1] + '"></i>' + k[0] + '<span class="count right">' + l.length + '</span></div>' + l.map(function (t) {
          var dd = diffDays(t.tenggat), tone = /Mendesak|Tinggi/.test(t.prioritas) ? 'bad' : t.prioritas === 'Sedang' ? 'warn' : '';
          return '<div class="kcard' + (t.status === 'Selesai' ? ' done' : '') + '" draggable="' + canEdit() + '" data-tk="' + t.id + '"><div class="row"><span class="badge ' + tone + '">Prioritas ' + esc(t.prioritas) + '</span><span class="mono xs muted right">' + esc(t.kode || '') + '</span></div><b>' + esc(t.judul) + '</b>' +
            '<div class="row xs"><span class="' + (dd < 0 && t.status !== 'Selesai' ? 'bad' : 'muted') + '">' + ic('calendar') + ' ' + tgl(t.tenggat) + (t.jam ? ', ' + t.jam : '') + '</span><span class="right muted ellip" style="max-width:50%">PIC: ' + esc(refLabel('Personel', t.picId)) + '</span></div>' +
            (canEdit() ? '<div class="row mt-s gap-s">' + (ki > 0 ? '<button class="btn xs" data-mv="' + KOL[ki - 1][0] + '" data-id="' + t.id + '">' + ic('chevron-left') + '</button>' : '') + (ki < 2 ? '<button class="btn xs right" data-mv="' + KOL[ki + 1][0] + '" data-id="' + t.id + '">' + (ki === 1 ? 'Selesai' : 'Proses') + ic('chevron-right') + '</button>' : '') + '</div>' : '') + '</div>';
        }).join('') + '</div>';
      }).join('');
    };
    var pindah = async function (id, st) {
      var r = rows.filter(function (x) { return x.id === id; })[0]; if (!r || r.status === st || !canEdit()) return;
      var prev = r.status; r.status = st; draw();                                  // optimistic UI
      var res = await api('crud.save', { t: 'Task', row: Object.assign({}, r) });
      if (!res.success) { r.status = prev; draw(); toast(res.message, 'bad'); } else { Data.upsert('Task', res.data); Data.touch(['TindakLanjut']); }
    };
    el._draw = draw; el._pindah = pindah;
    Data.load('Task', function (rs, c, err) { if (!rs) { $('[data-kb]', el).innerHTML = errorBox(err && err.message, true); return; } rows = el._rows = rs; draw(); });
  }
});
registerPage('task-tabel', crudPage({ t: 'Task', title: 'Task & Deadline (Tabel)', crumb: 'Workspace', desc: 'Tampilan tabel seluruh task.', acts: function () { return '<a class="btn" href="#/task">' + ic('kanban') + 'Kanban</a>'; } }));
ROUTE_GROUP['task-tabel'] = 'workspace';

// ============================================================ AKUN SAYA
registerPage('akun', {
  title: 'Akun Saya',
  show: function (el) {
    var u = AppState.user;
    el.innerHTML = (u.role === 'KLIEN' ? '' : pageHead({ crumb: 'Akun', title: 'Akun Saya', desc: 'Profil, keamanan sesi, dan PIN tanda tangan elektronik.' })) +
      '<div class="grid g2"><div class="card"><div class="row"><div class="avatar lg">' + esc(initials(u.nama)) + '</div><div><h3 class="h-md">' + esc(u.nama) + '</h3><div class="small muted">' + esc(u.email) + '</div><span class="badge pri mt-s">' + esc(u.role) + '</span></div></div>' +
      '<div class="sec-t">Ganti Kata Sandi</div><form class="col" data-pw><div class="field"><label>Kata sandi lama</label><input class="input" type="password" name="lama" autocomplete="current-password"></div><div class="field"><label>Kata sandi baru (min. 8)</label><input class="input" type="password" name="baru" autocomplete="new-password"></div><button class="btn primary">Simpan Sandi</button></form>' +
      '<div class="sec-t">Sesi</div><div class="row wrap"><button class="btn" data-out>' + ic('log-out') + 'Keluar</button><button class="btn danger" data-outall>' + ic('shield-off') + 'Keluar dari semua perangkat</button></div></div>' +
      (u.role !== 'KLIEN' ? '<div class="card" data-pin><div class="skel" style="height:120px"></div></div>' : '') + '</div>';
    $('[data-pw]', el).onsubmit = async function (e) { e.preventDefault(); var f = new FormData(this); var r = await act(this.querySelector('button'), 'auth.changePass', { lama: f.get('lama'), baru: f.get('baru') }); if (r.success) this.reset(); };
    $('[data-out]', el).onclick = function () { logout(); };
    $('[data-outall]', el).onclick = async function () { if (await confirmBox('Akhiri sesi di semua perangkat (termasuk yang ini)?', { danger: true, ok: 'Ya, keluar semua' })) logout(true); };
    var pin = $('[data-pin]', el);
    if (pin) swr('pejabat', 'de.pejabat', {}, function (d) {
      if (!d) return;
      pin.innerHTML = '<div class="card-h"><div class="kpi" style="padding:0"><div class="ico">' + ic('file-signature') + '</div></div><div class="grow"><h3 class="h-sm">PIN Tanda Tangan Elektronik</h3><div class="sub">Dipakai saat menyetujui dokumen (Google login + PIN 6 digit).</div></div></div>' +
        (d.saya ? '<div class="soft small mb">Anda terdaftar sebagai pejabat: <b>' + esc(d.saya.nama) + '</b> — ' + esc(d.saya.jabatan) + '. PIN ' + (d.saya.adaPin ? '<span class="badge ok">sudah diatur</span>' : '<span class="badge warn">belum diatur</span>') + '</div>' +
          '<form class="col" data-pinf>' + (d.saya.adaPin ? '<div class="field"><label>PIN lama</label><input class="input" name="lama" inputmode="numeric" maxlength="6" type="password"></div>' : '') + '<div class="field"><label>PIN baru (6 angka)</label><input class="input" name="baru" inputmode="numeric" maxlength="6" type="password"></div><button class="btn primary">Simpan PIN</button></form>'
          : emptyState('Bukan pejabat penanda tangan', 'Super Admin dapat mendaftarkan email Anda di menu Doc Engine & TTD → Pejabat.', 'pen-off'));
      var f = $('[data-pinf]', pin); if (f) f.onsubmit = async function (e) { e.preventDefault(); var fd = new FormData(f); var r = await act(f.querySelector('button'), 'de.setPin', { pinLama: fd.get('lama'), pinBaru: fd.get('baru') }); if (r.success) { cacheStale('pejabat'); refreshView(); } };
    }, { fresh: 0 });
  }
});
