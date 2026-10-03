/* ============================================================
   SIMLAWFIRM — ui.js
   Komponen generik: format sel, tabel (cari/filter/urut/halaman/aksi massal),
   form otomatis dari skema server, editor naskah, item invoice, unggah berkas,
   grafik SVG (batang + tooltip), cincin progres, ekspor/impor CSV & Excel.
   ============================================================ */
'use strict';
function T(t) { return (AppState.schema && AppState.schema.tables[t]) || { fields: [], label: t }; }
function fieldsOf(t) { return T(t).fields; }
function fieldDef(t, k) { return fieldsOf(t).filter(function (f) { return f[0] === k; })[0]; }

// ---------------- Badge status otomatis ----------------
function statusTone(v) {
  var s = String(v || '').toLowerCase();
  if (/^(aktif|selesai|lunas|terverifikasi|hadir|terbit|disetujui|berlaku|menang|lulus|terkirim|final|sah|deal|closing \(menang\)|ya|terdaftar|mou)/.test(s) || /menang|damai/.test(s)) return 'ok';
  if (/(gagal|batal|ditolak|kalah|telat|overdue|mendesak|urgent|dicabut|nonaktif|tidak hadir|ditarik|macet|tidak terdaftar)/.test(s)) return 'bad';
  if (/(menunggu|follow|review|draft|sebagian|revisi|proses|dikerjakan|negosiasi|tinggi|cuti|pitching|proposal|belum|ditunda|sedang)/.test(s)) return 'warn';
  if (/(terjadwal|baru|berjalan|diterima|didisposisi|pendaftaran|rencana|konsultasi|prospek|ide|dibaca|terdaftar)/.test(s)) return 'info';
  return '';
}
function badge(v, tone) { if (v === '' || v == null) return '<span class="muted">—</span>'; return '<span class="badge ' + (tone || statusTone(v)) + '"><span class="dot"></span>' + esc(v) + '</span>'; }
function parseFile(v) { if (!v) return null; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch (e) { return /^https?:/.test(v) ? { url: v, name: v } : null; } }

function fmtCell(f, v, row) {
  var type = f[2], o = f[3] || {};
  if (v === '' || v == null) return '<span class="muted">—</span>';
  switch (type) {
    case 'money': return '<span class="nowrap">' + rp(v) + '</span>';
    case 'number': return nf(v);
    case 'date': return '<span class="nowrap">' + tgl(v) + '</span>';
    case 'time': return '<span class="mono">' + esc(v) + '</span>';
    case 'select': return /status|tahap|prioritas|kehadiran|hasil/i.test(f[0]) ? badge(v) : esc(v);
    case 'bool': return v === 'YA' ? '<span class="badge ok">' + ic('check') + 'Ya</span>' : '<span class="muted xs">Tidak</span>';
    case 'ref': return esc(refLabel(o.r, v));
    case 'refs': return esc(String(v).split(',').filter(String).map(function (x) { return refLabel(o.r, x); }).join(', '));
    case 'wa': return '<span class="mono nowrap">' + esc(v) + '</span> <a href="https://wa.me/' + esc(String(v).replace(/^0/, '62')) + '" target="_blank" rel="noopener" title="Chat WhatsApp" onclick="event.stopPropagation()">' + ic('message-circle') + '</a>';
    case 'email': return '<span class="ellip" style="max-width:220px;display:inline-block;vertical-align:bottom">' + esc(v) + '</span>';
    case 'naskah': return esc(strip(v).slice(0, 120));
    case 'area': return esc(String(v).slice(0, 140));
    case 'json': try { var a = JSON.parse(v); return Array.isArray(a) ? a.length + ' item' : '—'; } catch (e) { return '—'; }
    case 'file': var fl = parseFile(v); return fl ? '<button class="btn xs" data-file=\'' + esc(JSON.stringify(fl)) + '\' onclick="event.stopPropagation();bukaBerkas(this)">' + ic('paperclip') + esc(String(fl.name || 'Berkas').slice(0, 24)) + '</button>' : '—';
    case 'url': return '<a href="' + esc(v) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + ic('external-link') + '</a>';
    default: return esc(v);
  }
}
function fmtPlain(f, v) {
  if (v === '' || v == null) return '';
  var o = f[3] || {};
  if (f[2] === 'ref') return refLabel(o.r, v);
  if (f[2] === 'refs') return String(v).split(',').filter(String).map(function (x) { return refLabel(o.r, x); }).join(', ');
  if (f[2] === 'naskah') return strip(v);
  if (f[2] === 'file') { var fl = parseFile(v); return fl ? fl.name || fl.url || '' : ''; }
  return v;
}
async function bukaBerkas(btn) {
  var f = JSON.parse(btn.dataset.file);
  if (f.url && !f.id) { window.open(f.url, '_blank'); return; }
  await withBusy(btn, async function () {
    var r = await api('file.get', { id: f.id });
    if (!r.success) return toast(r.message, 'bad');
    if (r.data.big) return window.open(r.data.url, '_blank');
    var blob = b64Blob(r.data.data, r.data.mime);
    if (/pdf|image/.test(r.data.mime)) openBlob(blob); else saveBlob(blob, r.data.name);
  });
}
async function unduhDok(btn, dokumenId, format) {
  await withBusy(btn, async function () {
    var r = await api('de.unduh', { dokumenId: dokumenId, format: format || 'pdf' });
    if (!r.success) return toast(r.message, 'bad');
    var blob = b64Blob(r.data.data, r.data.mime || 'application/pdf');
    if ((format || 'pdf') === 'pdf') openBlob(blob); else saveBlob(blob, r.data.nama);
  });
}

// ---------------- Komponen kecil ----------------
/** Wadah anak baru agar listener delegasi tidak menumpuk saat dirender ulang. */
function fresh(h) { h.innerHTML = ''; var d = document.createElement('div'); h.appendChild(d); return d; }
function kpi(o) {
  return '<div class="card kpi' + (o.click ? ' click' : '') + '"' + (o.click ? ' data-kpi="' + esc(o.click) + '"' : '') + '><div class="top"><div><div class="lbl">' + esc(o.label) + '</div></div>' +
    (o.icon ? '<div class="ico ' + (o.tone || '') + '">' + ic(o.icon) + '</div>' : '') + '</div><div class="val">' + o.value + (o.unit ? '<small>' + esc(o.unit) + '</small>' : '') + '</div>' +
    (o.bar != null ? '<div class="bar"><i style="width:' + Math.min(100, Math.max(0, o.bar)) + '%"></i></div>' : '') + (o.foot ? '<div class="foot">' + o.foot + '</div>' : '') + '</div>';
}
function pageHead(o) {
  return '<div class="page-h"><div class="grow"><div class="crumb">' + (o.crumb || '') + '</div><h1 class="h-xl">' + o.title + '</h1>' + (o.desc ? '<p>' + o.desc + '</p>' : '') + '</div>' +
    (o.acts ? '<div class="acts">' + o.acts + '</div>' : '') + '</div>';
}
function emptyState(title, sub, icn) { return '<div class="empty">' + ic(icn || 'inbox') + '<b>' + esc(title) + '</b>' + esc(sub || '') + '</div>'; }
function skeleton(n) { var s = ''; for (var i = 0; i < (n || 5); i++) s += '<div class="skel" style="height:44px;margin:10px 16px"></div>'; return s; }
function ring(pct, size, color) {
  size = size || 64; var r = size / 2 - 6, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
  var col = color || (p > 85 ? 'var(--bad)' : p >= 60 ? 'var(--primary-800)' : 'var(--ok)');
  return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px"><svg width="' + size + '" height="' + size + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#EEF0F4" stroke-width="6"/>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + (c * p / 100) + ' ' + c + '"/></svg><b>' + Math.round(p) + '%</b></div>';
}
function meter(p, tone) { return '<div class="meter ' + (tone || '') + '"><i style="width:' + Math.max(0, Math.min(100, p)) + '%"></i></div>'; }

/** Grafik batang berkelompok (SVG). Bar ≤24px, ujung membulat 4px, celah 2px, label di ujung, tooltip hover, legenda. */
function barChart(host, o) {
  var cats = o.cats || [], series = o.series || [], H = o.height || 220, padL = 8, padB = 30, padT = 22, W = Math.max(320, host.clientWidth || 600);
  var max = Math.max.apply(null, [1].concat(series.reduce(function (a, s) { return a.concat(s.values); }, [])));
  var step = niceStep(max), top = Math.ceil(max / step) * step, innerH = H - padB - padT, band = (W - padL * 2) / Math.max(1, cats.length);
  var bw = Math.min(24, (band * 0.62) / series.length), fmt = o.fmt || function (v) { return nf(v); };
  var y = function (v) { return padT + innerH - (v / top) * innerH; };
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Grafik') + '">';
  for (var g = 0; g <= top; g += step) svg += '<line class="grid-l" x1="' + padL + '" x2="' + (W - padL) + '" y1="' + y(g) + '" y2="' + y(g) + '"/>';
  cats.forEach(function (c, i) {
    var x0 = padL + band * i + (band - bw * series.length - 2 * (series.length - 1)) / 2;
    series.forEach(function (s, j) {
      var v = s.values[i] || 0, x = x0 + j * (bw + 2), yy = y(v), h = Math.max(0, padT + innerH - yy), r = Math.min(4, h, bw / 2);
      if (h > 0) svg += '<path d="M' + x + ',' + (padT + innerH) + 'V' + (yy + r) + 'Q' + x + ',' + yy + ' ' + (x + r) + ',' + yy + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + yy + ' ' + (x + bw) + ',' + (yy + r) + 'V' + (padT + innerH) + 'Z" fill="' + s.color + '"/>';
      if (o.labels !== false && (j === 0 || o.labelAll) && v) svg += '<text class="val-t" x="' + (x + bw / 2) + '" y="' + (yy - 6) + '" text-anchor="middle">' + esc(o.short ? o.short(v) : fmt(v)) + '</text>';
    });
    var lab = String(c), maxCh = Math.max(3, Math.floor(band / 6.2));
    if (lab.length > maxCh) lab = lab.slice(0, maxCh - 1) + '…';
    svg += '<text class="axis-t" x="' + (padL + band * i + band / 2) + '" y="' + (H - 8) + '" text-anchor="middle"><title>' + esc(c) + '</title>' + esc(lab) + '</text>';
    svg += '<rect class="bar-hit" data-i="' + i + '" x="' + (padL + band * i) + '" y="' + padT + '" width="' + band + '" height="' + innerH + '"/>';
  });
  svg += '</svg>';
  host.innerHTML = '<div class="chart">' + (series.length > 1 ? '<div class="legend mb">' + series.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</div>' : '') + svg + '<div class="chart-tip"></div></div>';
  var tip = host.querySelector('.chart-tip'), wrap = host.querySelector('.chart');
  host.querySelectorAll('.bar-hit').forEach(function (r) {
    r.addEventListener('mouseenter', function () {
      var i = +r.dataset.i, box = r.getBoundingClientRect(), wb = wrap.getBoundingClientRect();
      tip.innerHTML = '<b>' + esc(cats[i]) + '</b>' + series.map(function (s) { return '<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + s.color + ';margin-right:6px"></span>' + esc(s.name) + ': ' + esc(fmt(s.values[i] || 0)) + '</div>'; }).join('');
      tip.style.display = 'block'; tip.style.left = (box.left - wb.left + box.width / 2) + 'px'; tip.style.top = (box.top - wb.top + 20) + 'px';
      r.style.fill = 'rgba(91,115,217,.06)';
    });
    r.addEventListener('mouseleave', function () { tip.style.display = 'none'; r.style.fill = ''; });
  });
}
function niceStep(max) { var raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }

// ---------------- Tabel generik ----------------
/**
 * renderTable(host, {t, rows, cols, state, onRow, rowActs, bulk, empty})
 * state: {q, sort, dir, page, per, sel:{}} — disimpan oleh pemanggil agar bertahan antar render.
 */
function renderTable(host, o) {
  var st = o.state, cols = o.cols, rows = o.rows || [];
  if (st.sort) {
    var f = cols.filter(function (c) { return c.k === st.sort; })[0], dir = st.dir === 'desc' ? -1 : 1;
    rows = rows.slice().sort(function (a, b) {
      var va = f && f.sortVal ? f.sortVal(a) : a[st.sort], vb = f && f.sortVal ? f.sortVal(b) : b[st.sort];
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb), 'id', { numeric: true }) * dir;
    });
  }
  var per = st.per || 15, pages = Math.max(1, Math.ceil(rows.length / per)); st.page = Math.min(st.page || 1, pages);
  var slice = rows.slice((st.page - 1) * per, st.page * per), sel = st.sel || (st.sel = {}), nSel = Object.keys(sel).filter(function (k) { return sel[k]; }).length;
  var bulk = o.bulk && canEdit();
  var html = (bulk && nSel ? '<div class="bulkbar">' + nSel + ' dipilih' + o.bulk(nSel) + '<button class="btn xs ghost" data-bulk-clear>Batal pilih</button></div>' : '') +
    '<div class="tbl-wrap"><table class="tbl cards"><thead><tr>' + (bulk ? '<th class="chk"><input type="checkbox" data-all aria-label="Pilih semua"></th>' : '') +
    cols.map(function (c) { return '<th class="' + (c.num ? 'num ' : '') + (c.nosort ? '' : 'sort') + '" data-sort="' + (c.nosort ? '' : c.k) + '">' + esc(c.l) + (st.sort === c.k ? ' <span class="arr">' + (st.dir === 'desc' ? '▼' : '▲') + '</span>' : '') + '</th>'; }).join('') +
    (o.rowActs ? '<th class="num">Aksi</th>' : '') + '</tr></thead><tbody>' +
    (slice.length ? slice.map(function (r) {
      return '<tr class="' + (o.onRow ? 'click ' : '') + (sel[r.id] || st.active === r.id ? 'sel' : '') + '" data-id="' + esc(r.id) + '">' + (bulk ? '<td class="chk"><input type="checkbox" data-sel="' + esc(r.id) + '"' + (sel[r.id] ? ' checked' : '') + ' aria-label="Pilih"></td>' : '') +
        cols.map(function (c) { return '<td class="' + (c.num ? 'num' : '') + '" data-l="' + esc(c.l) + '">' + c.render(r) + '</td>'; }).join('') +
        (o.rowActs ? '<td class="acts">' + o.rowActs(r) + '</td>' : '') + '</tr>';
    }).join('') : '<tr><td colspan="99">' + (o.empty || emptyState('Belum ada data', 'Tambahkan data baru atau ubah filter.')) + '</td></tr>') +
    '</tbody></table></div><div class="tbl-foot"><span>Menampilkan ' + (rows.length ? (st.page - 1) * per + 1 : 0) + '–' + Math.min(st.page * per, rows.length) + ' dari ' + rows.length + '</span>' +
    '<select class="input sm" style="width:auto" data-per>' + [10, 15, 25, 50, 100].map(function (n) { return '<option' + (n === per ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>' +
    '<div class="pager">' + pagerBtns(st.page, pages) + '</div></div>';
  host.innerHTML = html;
  if (host._bound) return;
  host._bound = true;
  host.addEventListener('click', function (e) {
    var th = e.target.closest('th[data-sort]'); if (th && th.dataset.sort) { if (st.sort === th.dataset.sort) st.dir = st.dir === 'desc' ? 'asc' : 'desc'; else { st.sort = th.dataset.sort; st.dir = 'asc'; } host._o.redraw(); return; }
    var pg = e.target.closest('[data-pg]'); if (pg) { st.page = +pg.dataset.pg; host._o.redraw(); host.scrollIntoView({ block: 'nearest' }); return; }
    if (e.target.closest('[data-bulk-clear]')) { st.sel = {}; host._o.redraw(); return; }
    if (e.target.matches('input[data-sel], input[data-all]') || e.target.closest('.acts, button, a, .chk')) return;
    var tr = e.target.closest('tbody tr[data-id]'); if (tr && host._o.onRow) host._o.onRow(tr.dataset.id);
  });
  host.addEventListener('change', function (e) {
    if (e.target.matches('[data-per]')) { st.per = +e.target.value; st.page = 1; host._o.redraw(); }
    if (e.target.matches('[data-sel]')) { st.sel[e.target.dataset.sel] = e.target.checked; host._o.redraw(); }
    if (e.target.matches('[data-all]')) { host._o.visible().forEach(function (id) { st.sel[id] = e.target.checked; }); host._o.redraw(); }
  });
}
function pagerBtns(p, n) {
  var out = '<button data-pg="' + Math.max(1, p - 1) + '"' + (p <= 1 ? ' disabled' : '') + ' aria-label="Sebelumnya">‹</button>', seen = {};
  [1, p - 1, p, p + 1, n].forEach(function (i) { if (i >= 1 && i <= n && !seen[i]) { seen[i] = 1; out += '<button data-pg="' + i + '" class="' + (i === p ? 'on' : '') + '">' + i + '</button>'; } });
  return out + '<button data-pg="' + Math.min(n, p + 1) + '"' + (p >= n ? ' disabled' : '') + ' aria-label="Berikutnya">›</button>';
}

// ---------------- Form otomatis dari skema ----------------
function inputFor(t, f, v) {
  var k = f[0], type = f[2], o = f[3] || {}, id = 'f_' + k, req = o.req ? ' required' : '';
  v = v == null ? (o.def != null ? o.def : '') : v;
  switch (type) {
    case 'area': return '<textarea class="input" id="' + id + '" name="' + k + '" rows="3"' + req + '>' + esc(v) + '</textarea>';
    case 'naskah': return '<div class="editor" data-ed="' + k + '"><div class="tb">' + ['bold:B', 'italic:I', 'underline:U', 'insertUnorderedList:list', 'insertOrderedList:list-ordered'].map(function (x) { var p = x.split(':'); return '<button type="button" data-cmd="' + p[0] + '" title="' + p[0] + '">' + (p[1].length === 1 ? '<b style="font-style:' + (p[1] === 'I' ? 'italic' : 'normal') + ';text-decoration:' + (p[1] === 'U' ? 'underline' : 'none') + '">' + p[1] + '</b>' : ic(p[1])) + '</button>'; }).join('') + '</div><div class="ed" contenteditable="true" id="' + id + '">' + (v || '') + '</div></div>';
    case 'select': return '<select class="input" id="' + id + '" name="' + k + '"' + req + '><option value="">— Pilih —</option>' + (o.o || []).map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>';
    case 'ref': return '<select class="input" id="' + id + '" name="' + k + '"' + req + '><option value="">— Pilih ' + esc(T(o.r).label || o.r) + ' —</option>' + (AppState.refs[o.r] || []).filter(function (r) { return r[0] === v || !/Nonaktif|Selesai/.test(r[r.length - 1] || '') || o.r !== 'Personel'; }).map(function (r) { return '<option value="' + esc(r[0]) + '"' + (r[0] === v ? ' selected' : '') + '>' + esc(r[1]) + '</option>'; }).join('') + '</select>';
    case 'refs': var set = String(v || '').split(','); return '<div class="refs-box" data-refs="' + k + '">' + (AppState.refs[o.r] || []).map(function (r) { return '<label class="check small"><input type="checkbox" value="' + esc(r[0]) + '"' + (set.indexOf(r[0]) > -1 ? ' checked' : '') + '> ' + esc(r[1]) + '</label>'; }).join('') + '</div>';
    case 'bool': return '<label class="switch"><input type="checkbox" id="' + id + '" name="' + k + '"' + (v === 'YA' ? ' checked' : '') + '><span></span></label>';
    case 'money': return '<div class="input-ic"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:13px">Rp</span><input class="input" style="padding-left:36px" id="' + id + '" name="' + k + '" inputmode="numeric" data-money value="' + (v === '' ? '' : nf(v)) + '"' + req + '></div>';
    case 'number': return '<input class="input" type="number" id="' + id + '" name="' + k + '" value="' + esc(v) + '"' + req + '>';
    case 'date': return '<input class="input" type="date" id="' + id + '" name="' + k + '" value="' + esc(v) + '"' + req + '>';
    case 'time': return '<input class="input" type="time" id="' + id + '" name="' + k + '" value="' + esc(v) + '"' + req + '>';
    case 'email': return '<input class="input" type="email" id="' + id + '" name="' + k + '" value="' + esc(v) + '"' + req + '>';
    case 'wa': return '<input class="input" type="tel" id="' + id + '" name="' + k + '" value="' + esc(v) + '" placeholder="08xxxxxxxxxx"' + req + '>';
    case 'file': var fl = parseFile(v); return '<div data-filebox="' + k + '"><input type="file" id="' + id + '" hidden><div class="file-drop" data-pick>' + ic('upload-cloud') + ' <span data-fname>' + (fl ? esc(fl.name || fl.url) : 'Klik / tarik berkas ke sini (maks 10 MB) atau tempel URL di bawah') + '</span></div><input class="input sm mt-s" data-furl placeholder="https://… (opsional)" value="' + esc(fl && fl.url && !fl.id ? fl.url : '') + '"></div>';
    case 'json': return itemsEditor(v);
    default: return '<input class="input" id="' + id + '" name="' + k + '" value="' + esc(v) + '"' + req + '>';
  }
}
function formHtml(t, row, opt) {
  opt = opt || {};
  var fs = fieldsOf(t).filter(function (f) { return !(f[3] || {}).ro && (!opt.only || opt.only.indexOf(f[0]) > -1) && (!opt.hideF || opt.hideF.indexOf(f[0]) < 0); });
  return '<div class="err-slot"></div><form class="form-grid" data-form="' + t + '" novalidate>' + fs.map(function (f) {
    var wide = /area|naskah|json|refs|file/.test(f[2]) || (opt.full || []).indexOf(f[0]) > -1;
    return '<div class="field' + (wide ? ' full' : '') + '"><label for="f_' + f[0] + '">' + esc(f[1]) + (f[3].req ? ' <span class="req">*</span>' : '') + '</label>' + inputFor(t, f, row ? row[f[0]] : (opt.defaults || {})[f[0]]) + '</div>';
  }).join('') + '</form>';
}
function bindForm(root) {
  on(root, 'click', '[data-cmd]', function (e, b) { e.preventDefault(); document.execCommand(b.dataset.cmd, false, null); });
  $$('.ed', root).forEach(function (ed) {
    ed.addEventListener('paste', function (e) {
      var h = e.clipboardData.getData('text/html'), tx = e.clipboardData.getData('text/plain'); e.preventDefault();
      if (h) { var d = document.createElement('div'); d.innerHTML = h; $$('*', d).forEach(function (n) { n.removeAttribute('style'); n.removeAttribute('class'); n.removeAttribute('id'); }); $$('span,font,meta,style,script', d).forEach(function (n) { n.replaceWith.apply(n, Array.from(n.childNodes)); }); document.execCommand('insertHTML', false, d.innerHTML); }
      else document.execCommand('insertText', false, tx);
    });
  });
  $$('[data-money]', root).forEach(function (i) { i.addEventListener('input', function () { var d = i.value.replace(/\D/g, ''); i.value = d ? nf(d) : ''; }); });
  $$('[data-filebox]', root).forEach(function (box) {
    var inp = $('input[type=file]', box), drop = $('[data-pick]', box);
    drop.onclick = function () { inp.click(); };
    var take = async function (file) { try { box._file = await fileB64(file, 10); $('[data-fname]', box).textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)'; } catch (err) { toast(err.message, 'bad'); } };
    inp.onchange = function () { if (inp.files[0]) take(inp.files[0]); };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('drag'); }; drop.ondragleave = function () { drop.classList.remove('drag'); };
    drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('drag'); if (e.dataTransfer.files[0]) take(e.dataTransfer.files[0]); };
  });
  bindItemsEditor(root);
}
function readForm(root, t) {
  var out = {}, errs = [];
  fieldsOf(t).forEach(function (f) {
    var k = f[0], type = f[2], o = f[3] || {}, el = root.querySelector('#f_' + k);
    if (o.ro) return;
    if (type === 'naskah') { if (el) out[k] = el.innerHTML; }
    else if (type === 'refs') { var b = root.querySelector('[data-refs="' + k + '"]'); if (b) out[k] = $$('input:checked', b).map(function (x) { return x.value; }).join(','); }
    else if (type === 'bool') { if (el) out[k] = el.checked ? 'YA' : 'TIDAK'; }
    else if (type === 'money') { if (el) out[k] = el.value.replace(/\D/g, ''); }
    else if (type === 'file') { var fb = root.querySelector('[data-filebox="' + k + '"]'); if (fb) { if (fb._file) out[k] = fb._file; else if ($('[data-furl]', fb).value.trim()) out[k] = $('[data-furl]', fb).value.trim(); } }
    else if (type === 'json') { var ie = root.querySelector('[data-items]'); if (ie) out[k] = readItems(ie); }
    else if (el) out[k] = el.value.trim();
    if (!el && type !== 'refs' && type !== 'file' && type !== 'json') return;
    var v = out[k];
    if (o.req && (v === '' || v == null)) errs.push(f[1] + ' wajib diisi');
    if (type === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) errs.push(f[1] + ' tidak valid');
    if (type === 'wa' && v && !/^(\+?62|0)8\d{7,12}$/.test(String(v).replace(/[\s-]/g, ''))) errs.push(f[1] + ' tidak valid (contoh 0812xxxxxxx)');
  });
  return { row: out, errs: errs };
}

// ---------------- Editor rincian invoice ----------------
function itemsEditor(v) {
  var items = []; try { items = typeof v === 'string' ? JSON.parse(v || '[]') : (v || []); } catch (e) {}
  if (!items.length) items = [{ uraian: '', keterangan: '', jumlah: '' }];
  return '<div data-items><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Uraian Pekerjaan / Honorarium</th><th>Keterangan</th><th class="num" style="width:170px">Nominal (Rp)</th><th></th></tr></thead><tbody>' +
    items.map(itemRow).join('') + '</tbody></table></div><div class="row mt-s"><button type="button" class="btn sm" data-item-add>' + ic('plus') + 'Tambah baris</button><div class="right small" data-items-sum></div></div></div>';
}
function itemRow(x) { return '<tr><td><input class="input sm" data-iu value="' + esc(x.uraian || '') + '" placeholder="mis. Drafting Gugatan & Sidang"></td><td><input class="input sm" data-ik value="' + esc(x.keterangan || '') + '"></td><td><input class="input sm" style="text-align:right" data-ij inputmode="numeric" value="' + (x.jumlah ? nf(x.jumlah) : '') + '"></td><td><button type="button" class="btn xs ghost icon" data-item-del aria-label="Hapus">' + ic('trash-2') + '</button></td></tr>'; }
function readItems(box) { return $$('tbody tr', box).map(function (tr) { return { uraian: $('[data-iu]', tr).value.trim(), keterangan: $('[data-ik]', tr).value.trim(), jumlah: Number($('[data-ij]', tr).value.replace(/\D/g, '')) || 0 }; }).filter(function (x) { return x.uraian || x.jumlah; }); }
function bindItemsEditor(root) {
  var box = root.querySelector('[data-items]'); if (!box) return;
  var sum = function () {
    var it = readItems(box), sub = it.reduce(function (a, x) { return a + x.jumlah; }, 0);
    var ppnEl = root.querySelector('#f_ppnPersen'), pphEl = root.querySelector('#f_pphPersen');
    var ppn = Math.round(sub * (Number(ppnEl && ppnEl.value) || 0) / 100), pph = Math.round(sub * (Number(pphEl && pphEl.value) || 0) / 100);
    $('[data-items-sum]', box).innerHTML = 'Subtotal <b>' + rp(sub) + '</b> • PPN ' + rp(ppn) + ' • PPh −' + rp(pph) + ' • <b style="color:var(--primary-800)">Total ' + rp(sub + ppn - pph) + '</b>';
  };
  box.addEventListener('input', function (e) { if (e.target.matches('[data-ij]')) { var d = e.target.value.replace(/\D/g, ''); e.target.value = d ? nf(d) : ''; } sum(); });
  root.addEventListener('input', function (e) { if (e.target.matches('#f_ppnPersen,#f_pphPersen')) sum(); });
  on(box, 'click', '[data-item-add]', function () { $('tbody', box).insertAdjacentHTML('beforeend', itemRow({})); });
  on(box, 'click', '[data-item-del]', function (e, b) { if ($$('tbody tr', box).length > 1) b.closest('tr').remove(); sum(); });
  sum();
}

// ---------------- Form drawer: tambah / ubah ----------------
function openForm(t, row, opt) {
  opt = opt || {};
  var title = (row && row.id ? 'Ubah ' : 'Tambah ') + (opt.label || T(t).label);
  var d = drawer(esc(title), formHtml(t, row, opt), '<button class="btn" data-close>Batal</button><button class="btn primary" data-save>' + ic('save') + 'Simpan</button>', { kicker: row && row.id ? row.id : 'Data baru', wide: opt.wide || fieldsOf(t).some(function (f) { return f[2] === 'json' || f[2] === 'naskah'; }) });
  bindForm(d.el);
  if (opt.afterOpen) opt.afterOpen(d.el);
  $('[data-save]', d.el).onclick = async function () {
    var r = readForm(d.el, t);
    if (r.errs.length) { $('.err-slot', d.el).innerHTML = '<div class="err-box">' + r.errs.map(esc).join('<br>') + '</div>'; $('.drawer-b', d.el).scrollTop = 0; return; }
    var payload = Object.assign({}, opt.defaults || {}, r.row); if (row && row.id) payload.id = row.id;
    if (opt.beforeSave) payload = opt.beforeSave(payload) || payload;
    await withBusy(this, async function () {
      var res = await api('crud.save', { t: t, row: payload });
      if (!res.success) { $('.err-slot', d.el).innerHTML = '<div class="err-box">' + esc(res.message) + '</div>'; $('.drawer-b', d.el).scrollTop = 0; return; }
      Data.upsert(t, res.data); Data.touch(RELASI[t] || []); toast(res.message);
      d.close(); if (opt.onSaved) opt.onSaved(res.data); refreshView(); setTimeout(refreshBadges, 400);
    });
  };
  return d;
}
async function hapusRow(t, row, after) {
  var ok = await confirmBox('Hapus "' + (row[T(t).title] || row.id) + '"? Tindakan ini tidak dapat dibatalkan.', { danger: true, ok: 'Hapus', title: 'Hapus data' });
  if (!ok) return;
  var r = await api('crud.delete', { t: t, id: row.id });
  if (!r.success) return toast(r.message, 'bad');
  Data.remove(t, row.id); Data.touch(RELASI[t] || []); toast('Data dihapus.'); after && after(); refreshView();
}
/** Drawer detail generik semua kolom + tombol ubah/hapus. */
function openDetail(t, row, opt) {
  opt = opt || {};
  var fs = fieldsOf(t).filter(function (f) { return f[2] !== 'naskah' && f[2] !== 'json'; }), rich = fieldsOf(t).filter(function (f) { return f[2] === 'naskah'; });
  var body = (opt.top || '') + '<dl class="dl">' + fs.map(function (f) { return '<dt>' + esc(f[1]) + '</dt><dd>' + fmtCell(f, row[f[0]], row) + '</dd>'; }).join('') +
    '<dt>Dibuat</dt><dd class="small muted">' + tglJam(row.createdAt) + ' • ' + esc(row.createdBy || '') + '</dd></dl>' +
    rich.map(function (f) { return row[f[0]] ? '<div class="sec-t">' + esc(f[1]) + '</div><div class="soft richtext">' + row[f[0]] + '</div>' : ''; }).join('') + (opt.extra || '');
  var foot = (opt.foot || '') + (canEdit() && !opt.noEdit ? '<button class="btn danger" data-del>' + ic('trash-2') + 'Hapus</button><button class="btn primary" data-edit>' + ic('pencil') + 'Ubah</button>' : '<button class="btn" data-close>Tutup</button>');
  var d = drawer(esc(row[T(t).title] || row.id), body, foot, { kicker: T(t).label + ' • ' + row.id, wide: opt.wide });
  var e = $('[data-edit]', d.el); if (e) e.onclick = function () { d.close(); openForm(t, row, opt.formOpt); };
  var x = $('[data-del]', d.el); if (x) x.onclick = function () { hapusRow(t, row, d.close); };
  if (opt.bind) opt.bind(d.el, d);
  return d;
}

// ---------------- Ekspor / impor ----------------
function toCsv(rows, headers) {
  var q = function (v) { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '﻿' + [headers.map(q).join(',')].concat(rows.map(function (r) { return headers.map(function (h) { return q(r[h]); }).join(','); })).join('\n');
}
function exportRows(t, rows, nama) {
  var fs = fieldsOf(t).filter(function (f) { return f[2] !== 'json'; }), heads = ['id'].concat(fs.map(function (f) { return f[1]; }));
  var data = rows.map(function (r) { var o = { id: r.id }; fs.forEach(function (f) { o[f[1]] = fmtPlain(f, r[f[0]]); }); return o; });
  var m = modal('<h3 class="h-md">Ekspor ' + esc(T(t).label) + '</h3><p class="t2 small">' + rows.length + ' baris (sesuai filter aktif).</p><div class="row mt"><button class="btn" data-x="csv">' + ic('file-text') + 'CSV</button><button class="btn primary" data-x="xlsx">' + ic('sheet') + 'Excel (.xlsx)</button></div>');
  on(m.el, 'click', '[data-x]', async function (e, b) {
    var fn = (nama || T(t).label).replace(/[^\w]+/g, '_') + '_' + today();
    if (b.dataset.x === 'csv') saveBlob(new Blob([toCsv(data, heads)], { type: 'text/csv' }), fn + '.csv');
    else await withBusy(b, async function () { await loadXlsx(); var ws = XLSX.utils.json_to_sheet(data, { header: heads }), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, String(t).slice(0, 30)); XLSX.writeFile(wb, fn + '.xlsx'); });
    m.close();
  });
}
function loadXlsx() {
  if (window.XLSX) return Promise.resolve();
  return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = function () { rej(new Error('Gagal memuat pustaka Excel.')); }; document.head.appendChild(s); });
}
function parseCsv(text) {
  var rows = [], row = [], cur = '', q = false, sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  text = text.replace(/^﻿/, '');
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  var h = (rows.shift() || []).map(function (x) { return x.trim(); });
  return rows.filter(function (r) { return r.join('').trim(); }).map(function (r) { var o = {}; h.forEach(function (k, i) { if (k) o[k] = (r[i] || '').trim(); }); return o; });
}
async function readSheetFile(file) {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
  await loadXlsx();
  var wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }), ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
}
/** Impor CSV/Excel ke satu tabel: unduh template → pilih berkas → pindai → impor. */
function importDialog(t) {
  var fs = fieldsOf(t).filter(function (f) { return !f[3].ro && f[2] !== 'json' && f[2] !== 'file'; });
  var m = modal('<h3 class="h-md">Impor ' + esc(T(t).label) + '</h3><p class="t2 small mt-s">Gunakan template agar nama kolom cocok. Referensi (klien, advokat, perkara) boleh diisi <b>nama</b> — sistem mencocokkan otomatis. Data yang sama (email / nomor / nama) diperbarui, bukan digandakan.</p>' +
    '<div class="row mt wrap"><button class="btn sm" data-tpl>' + ic('download') + 'Unduh template CSV</button><label class="check small"><input type="checkbox" id="imp-ow"> Timpa data yang sudah ada</label></div>' +
    '<div class="file-drop mt" data-pick>' + ic('upload-cloud') + ' <span data-fname>Pilih berkas .csv / .xlsx</span></div><input type="file" accept=".csv,.xlsx,.xls" hidden id="imp-f"><div id="imp-res" class="mt"></div>' +
    '<div class="row mt" style="justify-content:flex-end"><button class="btn" data-close>Tutup</button><button class="btn" id="imp-dry" disabled>Pindai (dry-run)</button><button class="btn primary" id="imp-run" disabled>Jalankan Impor</button></div>', { wide: true });
  var rows = null;
  $('[data-tpl]', m.el).onclick = function () { var h = fs.map(function (f) { return f[0]; }); saveBlob(new Blob([toCsv([], h)], { type: 'text/csv' }), 'template_' + t + '.csv'); };
  $('[data-pick]', m.el).onclick = function () { $('#imp-f', m.el).click(); };
  $('#imp-f', m.el).onchange = async function () {
    var f = this.files[0]; if (!f) return;
    try { rows = await readSheetFile(f); $('[data-fname]', m.el).textContent = f.name + ' — ' + rows.length + ' baris'; $('#imp-dry', m.el).disabled = $('#imp-run', m.el).disabled = !rows.length; }
    catch (e) { toast(e.message, 'bad'); }
  };
  var jalan = async function (btn, dry) {
    await withBusy(btn, async function () {
      var r = await api('mig.csv', { t: t, rows: rows, dryRun: dry, overwrite: $('#imp-ow', m.el).checked });
      if (!r.success) { $('#imp-res', m.el).innerHTML = '<div class="err-box">' + esc(r.message) + '</div>'; return; }
      var p = r.data.report;
      $('#imp-res', m.el).innerHTML = '<div class="tint"><b>' + (dry ? 'Hasil pindai (belum ditulis)' : 'Impor selesai') + '</b><div class="row mt-s wrap"><span class="badge info">Sumber ' + p.sumber + '</span><span class="badge ok">Ditambah ' + p.ditambah + '</span><span class="badge warn">Diperbarui ' + p.diperbarui + '</span><span class="badge">Dilewati ' + p.dilewati + '</span><span class="badge pri">Kunci: ' + esc(r.data.kunci) + '</span></div>' +
        (r.data.warnings.length ? '<ul class="small t2" style="margin:8px 0 0;padding-left:18px">' + r.data.warnings.slice(0, 10).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
      if (!dry) { Data.stale(t); refreshView(); }
    });
  };
  $('#imp-dry', m.el).onclick = function () { jalan(this, true); };
  $('#imp-run', m.el).onclick = function () { jalan(this, false); };
}

// ---------------- Halaman CRUD generik ----------------
/**
 * crudPage({ t, title, crumb, desc, filter, defaults, cols, kpis(rows), tabs:[{l,f}], rowActs(r), onRow(r), acts, extraTop(rows), hideNew, formOpt })
 * Render dari cache seketika → revalidasi di latar (SWR) → hanya render ulang bila data berubah.
 */
function crudPage(def) {
  var st = { q: '', tab: 0, page: 1, per: 15, sel: {}, f: {} }, S = { all: [], draw: function () {} };
  var draw = function () { S.draw(); };
  return {
    title: def.title,
    show: function (el, param, re) {
      if (!el._init) {
        el._init = true;
        var filters = (def.filterBy || fieldsOf(def.t).filter(function (f) { return f[2] === 'select' && (f[3] || {}).list; }).map(function (f) { return f[0]; })).slice(0, 3);
        el.innerHTML = pageHead({ crumb: def.crumb || '', title: def.title, desc: def.desc, acts: (def.acts ? def.acts() : '') +
          '<button class="btn" data-exp>' + ic('download') + 'Ekspor</button>' + (canEdit() ? '<button class="btn" data-imp>' + ic('upload') + 'Impor</button>' : '') +
          (canEdit() && !def.hideNew ? '<button class="btn primary" data-new>' + ic('plus') + (def.newLabel || 'Tambah Data') + '</button>' : '') }) +
          '<div data-kpis></div><div data-top></div><div class="card pad-0">' + (def.tabs ? '<div style="padding:14px 16px 0"><div class="seg" data-tabs></div></div>' : '') +
          '<div class="toolbar"><div class="input-ic">' + ic('search') + '<input class="input" data-q placeholder="Cari ' + esc(strip(def.title).toLowerCase()) + '…"></div>' +
          filters.map(function (k) { var f = fieldDef(def.t, k); return f ? '<select class="input" data-f="' + k + '"><option value="">' + esc(f[1]) + ': Semua</option>' + (f[2] === 'ref' ? (AppState.refs[f[3].r] || []).map(function (r) { return '<option value="' + esc(r[0]) + '">' + esc(r[1]) + '</option>'; }) : (f[3].o || []).map(function (o) { return '<option>' + esc(o) + '</option>'; })).join('') + '</select>' : ''; }).join('') +
          '</div><div data-tbl>' + skeleton(6) + '</div></div><div data-bottom class="mt"></div>';
        $('[data-q]', el).addEventListener('input', debounce(function (e) { st.q = e.target.value.trim().toLowerCase(); st.page = 1; draw(); }, 250));
        on(el, 'change', '[data-f]', function (e, s) { st.f[s.dataset.f] = s.value; st.page = 1; draw(); });
        on(el, 'click', '[data-tabs] button', function (e, b) { st.tab = +b.dataset.i; st.page = 1; draw(); });
        on(el, 'click', '[data-new]', function () { openForm(def.t, null, Object.assign({ defaults: typeof def.defaults === 'function' ? def.defaults() : def.defaults }, def.formOpt || {})); });
        on(el, 'click', '[data-imp]', function () { importDialog(def.t); });
        on(el, 'click', '[data-exp]', function () { exportRows(def.t, el._rows || [], def.title); });
        on(el, 'click', '[data-kpi]', function (e, k) { var i = (def.tabs || []).findIndex(function (x) { return x.l === k.dataset.kpi; }); if (i > -1) { st.tab = i; draw(); } });
        if (def.bind) def.bind(el, st, function () { draw(); });
      }
      S.draw = function () {
        var all = S.all;
        var base = def.filter ? all.filter(def.filter) : all;
        if (def.kpis) $('[data-kpis]', el).innerHTML = def.kpis(base, all);
        if (def.extraTop) $('[data-top]', el).innerHTML = def.extraTop(base, all, st);
        if (def.tabs) $('[data-tabs]', el).innerHTML = def.tabs.map(function (tb, i) { return '<button data-i="' + i + '" class="' + (i === st.tab ? 'on' : '') + '">' + esc(tb.l) + ' <span class="count">' + base.filter(tb.f).length + '</span></button>'; }).join('');
        var rows = base.filter(function (r) {
          if (def.tabs && !def.tabs[st.tab].f(r)) return false;
          for (var k in st.f) if (st.f[k] && String(r[k]) !== st.f[k]) return false;
          if (st.q) { var s = fieldsOf(def.t).map(function (f) { return fmtPlain(f, r[f[0]]); }).join(' ') + ' ' + r.id; if (s.toLowerCase().indexOf(st.q) < 0) return false; }
          return true;
        });
        el._rows = rows;
        var cols = (def.cols || fieldsOf(def.t).filter(function (f) { return (f[3] || {}).list; }).map(function (f) { return f[0]; })).map(function (c) {
          if (typeof c === 'object') return c;
          var f = fieldDef(def.t, c); return { k: c, l: f ? f[1] : c, num: f && /money|number/.test(f[2]), render: function (r) { return fmtCell(f || [c, c, 'text', {}], r[c], r); }, sortVal: f && f[2] === 'ref' ? function (r) { return refLabel(f[3].r, r[c]); } : null };
        });
        var host = $('[data-tbl]', el);
        host._o = { redraw: draw, visible: function () { return rows.map(function (r) { return r.id; }); }, onRow: function (id) { var r = all.filter(function (x) { return x.id === id; })[0]; if (r) (def.onRow || function (row) { openDetail(def.t, row, def.detailOpt ? def.detailOpt(row) : {}); })(r); } };
        renderTable(host, { t: def.t, rows: rows, cols: cols, state: st, onRow: true, rowActs: def.rowActs, bulk: def.noBulk ? null : function () {
          var sf = fieldsOf(def.t).filter(function (f) { return f[2] === 'select' && /status|tahap|prioritas/.test(f[0]); })[0];
          return (sf ? '<select class="input sm" style="width:auto" data-bset="' + sf[0] + '"><option value="">Ubah ' + esc(sf[1]) + '…</option>' + sf[3].o.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select>' : '') +
            '<button class="btn xs" data-bexp>' + ic('download') + 'Ekspor</button><button class="btn xs danger" data-bdel>' + ic('trash-2') + 'Hapus</button>';
        } });
        if (def.after) def.after(el, rows, all);
      };
      if (!el._bulkBound) {
        el._bulkBound = true;
        el.addEventListener('change', async function (e) {
          if (!e.target.matches('[data-bset]') || !e.target.value) return;
          var ids = Object.keys(st.sel).filter(function (k) { return st.sel[k]; }), v = e.target.value, kol = e.target.dataset.bset;
          var r = await api('crud.bulk', { t: def.t, ids: ids, aksi: 'set', kolom: kol, nilai: v });
          if (r.success) { S.all.forEach(function (x) { if (ids.indexOf(x.id) > -1) { x[kol] = v; Data.upsert(def.t, x); } }); st.sel = {}; Data.touch(RELASI[def.t]); toast(r.message); draw(); } else toast(r.message, 'bad');
        });
        on(el, 'click', '[data-bdel]', async function () {
          var ids = Object.keys(st.sel).filter(function (k) { return st.sel[k]; });
          if (!(await confirmBox('Hapus ' + ids.length + ' data terpilih?', { danger: true, ok: 'Hapus' }))) return;
          var r = await api('crud.bulk', { t: def.t, ids: ids, aksi: 'hapus' });
          if (r.success) { ids.forEach(function (id) { Data.remove(def.t, id); }); S.all = S.all.filter(function (x) { return ids.indexOf(x.id) < 0; }); st.sel = {}; toast(r.message); draw(); } else toast(r.message, 'bad');
        });
        on(el, 'click', '[data-bexp]', function () { var ids = Object.keys(st.sel).filter(function (k) { return st.sel[k]; }); exportRows(def.t, S.all.filter(function (r) { return ids.indexOf(r.id) > -1; }), def.title); });
      }
      (def.deps || []).forEach(function (dt) { Data.load(dt, function (r, fromCache) { if (r && !fromCache && S.all.length) S.draw(); }); });
      Data.load(def.t, function (rows, fromCache, err) {
        if (!rows) { $('[data-tbl]', el).innerHTML = errorBox(err && err.message, true); return; }
        S.all = rows; S.draw();
        var open = sessionStorage.getItem('slaw-open');
        if (open && open.split(':')[0] === def.t) { sessionStorage.removeItem('slaw-open'); var r = rows.filter(function (x) { return x.id === open.split(':')[1]; })[0]; if (r) el.querySelector('[data-tbl]')._o.onRow(r.id); }
      }, { force: !!re && false });
    }
  };
}
