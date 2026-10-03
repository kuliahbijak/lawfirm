# 📋 Panduan Instalasi — SIMLAWFIRM v4.2

Sistem Informasi Manajemen Kantor Hukum: **frontend di GitHub Pages** + **Google Apps Script sebagai REST API** + **Google Sheets (database) & Drive (berkas)**.

```
Browser (GitHub Pages)  ──fetch JSON──►  Apps Script /exec  ──►  Google Sheets • Drive • Gmail • Fonnte (WA)
index.html, css/, js/                     9 berkas .gs                43 sheet, folder per klien/perkara
```

---

## 0. Berkas yang Anda terima

| Berkas | Untuk | Cara pakai |
|---|---|---|
| `Schema.gs` `Kode.gs` `Modul.gs` `Notifikasi.gs` `CRM.gs` `Migrasi.gs` `DocEngine.gs` `DE_QrLib.gs` `DataContoh.gs` | Backend Apps Script | Salin-tempel satu per satu ke editor Apps Script |
| `appsscript.json` | Manifest (izin & zona waktu) | Tempel ke berkas manifest proyek |
| `simlawfirm-frontend.zip` | Frontend GitHub Pages | Ekstrak → folder hasil ekstrak **itulah** folder yang di-`git init` |

> Isi ZIP: `index.html` (di root), `verifikasi.html`, `css/`, `js/`, `assets/`, `README.md`, panduan ini. Tidak ada berkas `.gs` di dalamnya.

---

## 1. Backend — Google Apps Script

Gunakan **akun Google kantor yang akan menjadi pemilik data** (semua Sheet & Drive dibuat di akun ini).

1. Buka <https://script.google.com> → **Proyek baru** → beri nama `SIMLAWFIRM Backend`.
2. Buat 9 berkas skrip (ikon **＋ → Skrip**) dengan nama **persis**: `Schema`, `Kode`, `Modul`, `Notifikasi`, `CRM`, `Migrasi`, `DocEngine`, `DE_QrLib`, `DataContoh`. Hapus isi bawaan `Kode.gs`, lalu tempel isi masing-masing berkas.
3. Manifest: **⚙ Setelan Proyek** → centang **Tampilkan file manifes "appsscript.json"** → buka `appsscript.json` di editor → ganti seluruh isinya dengan berkas `appsscript.json` yang diberikan → **Simpan** (Ctrl+S).
4. Pilih fungsi **`setupAppEnvironment`** di dropdown → **▶ Jalankan** → **Tinjau izin** → pilih akun → *Lanjutan* → *Buka (tidak aman)* → **Izinkan**.
5. Buka **Log eksekusi**. Pastikan muncul `✅ Setup selesai!` dan **catat**:
   - URL Spreadsheet & Folder Drive
   - **Email & kata sandi Super Admin darurat** (ganti setelah login pertama)
6. *(Opsional, disarankan untuk mencoba)* Jalankan **`isiDataContoh`** → data demo (klien, perkara, sidang, invoice, dll.) + akun demo:
   - Partner: `partner@demo.simlaw.id` / `Partner-Demo1`
   - Klien: `klien@demo.simlaw.id` / `Klien-Demo1`
   Hapus kapan saja dengan **`hapusDataContoh`**.
7. **Terapkan → Deployment baru** → ikon ⚙ pilih **Aplikasi web**:
   - *Jalankan sebagai*: **Saya**
   - *Siapa yang memiliki akses*: **Siapa saja**
   → **Terapkan** → salin **URL aplikasi web** (berakhiran `/exec`).

> `setupAppEnvironment` aman dijalankan ulang: bila sudah pernah di-setup, ia hanya menambah sheet/kolom yang kurang (migrasi skema) dan memasang trigger.
> Trigger yang dipasang otomatis: `pekerjaMenit` (tiap 1 menit: tulis log, kirim antrean WA/Email, generate dokumen massal), `pekerjaHarian` (pengingat sidang/rapat/invoice/task), `backupHarian`.

---

## 2. Frontend — GitHub Pages

### 2a. Isi alamat backend
Ekstrak `simlawfirm-frontend.zip` → buka `js/config.js` → tempel URL `/exec` tadi:
```js
GAS_URL: 'https://script.google.com/macros/s/AKfycb....../exec',
```

### 2b. Upload lewat terminal (jangan pakai "Upload files" di web GitHub — struktur folder bisa rusak)
1. Install Git: <https://git-scm.com> (Windows: pakai pengaturan default). Cek: `git --version`.
2. Identitas (sekali saja):
   ```bash
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@contoh.com"
   ```
3. Di github.com: **＋ → New repository** → nama mis. `simlawfirm` → **Public** → **jangan** centang README → *Create*.
4. Buka terminal **di folder hasil ekstrak** (yang langsung berisi `index.html`). Verifikasi dulu:
   ```bash
   dir        # Windows   |   ls   (Mac/Linux)
   ```
   Harus terlihat `index.html`, `css`, `js`, `assets`. Kalau yang terlihat folder lain, masuk dulu ke folder yang benar.
5. Kirim ke GitHub (satu per satu):
   ```bash
   git init
   git add .
   git commit -m "Upload pertama SIMLAWFIRM"
   git branch -M main
   git remote add origin https://github.com/USERNAME/simlawfirm.git
   git push -u origin main
   ```
   Saat diminta *Password*, tempel **Personal Access Token** (bukan sandi akun): <https://github.com/settings/tokens> → *Generate new token (classic)* → centang **repo** → salin `ghp_...`. Layar memang kosong saat menempel — itu normal.
6. Repo → **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **main** / **(root)** → *Save*. Centang **Enforce HTTPS**.
7. 1–2 menit kemudian situs aktif di `https://USERNAME.github.io/simlawfirm/`.

**Update berikutnya:** `git add .` → `git commit -m "update"` → `git push`. Tekan **Ctrl+Shift+R** bila browser masih menampilkan versi lama.

---

## 3. Konfigurasi setelah online

1. Buka situs → login dengan email & sandi Super Admin darurat dari Log eksekusi → menu **Akun Saya** → ganti sandi.
2. **Administration → Pengaturan Sistem**:
   - `APP_URL` = alamat GitHub Pages Anda (dipakai di tautan notifikasi & QR verifikasi).
   - Identitas kantor (`INSTITUSI_*`), rekening escrow (`REKENING_*`), PPN/PPh default, jam pengingat & backup.
3. **Login dengan Google** (opsional tetapi disarankan):
   1. <https://console.cloud.google.com> → buat/pilih proyek → **APIs & Services → OAuth consent screen** (External, isi nama aplikasi & email).
   2. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   3. *Authorized JavaScript origins*: `https://USERNAME.github.io` (tanpa garis miring di akhir).
   4. Salin **Client ID** → tempel ke `GOOGLE_CLIENT_ID` di Pengaturan Sistem → Simpan. Tombol "Masuk dengan Akun Google" langsung aktif. Pengguna hanya bisa masuk bila emailnya terdaftar di **User Management**.
4. **User Management** → tambah Managing Partner (peran `MANAGING_PARTNER`) dan staf. Akun klien dibuat dari halaman klien (**Buat Akun Portal**) atau saat **Konversi Lead**.
5. **RBAC / Hak Akses** → atur modul mana yang boleh dilihat Managing Partner (diterapkan di server).

---

## 4. Notifikasi WhatsApp & Email

1. Daftar di <https://fonnte.com> → **Device** → tambah perangkat → scan QR dengan nomor WhatsApp kantor → salin **Token**.
2. **Administration → Notifikasi WA & Email → Konfigurasi**: tempel token → **Cek Perangkat** (status `connect`) → **Kirim Tes WA** → nyalakan saklar WhatsApp. Nyalakan saklar Email → **Kirim Tes Email**.
3. Atur **Matriks Notifikasi Otomatis** (sidang dijadwalkan, pengingat H-n, update perkara, laporan sidang, invoice + PDF terlampir, pengingat jatuh tempo, pembayaran diterima, disposisi, approval, undangan rapat, task…). Klik **Ubah** untuk menyunting isi pesan dan variabelnya.
4. **Blast WA**: muat penerima dari **CRM Kontak** → (opsional) **Deteksi Nomor WA** → tulis pesan → batch **10/20/50** + jeda (mis. `3-8` detik) → **Mulai Blast**. Server tetap mengirim 1 batch per menit walau halaman ditutup.
   - Tips anti-banned: pakai nomor yang "hangat", mulai batch 10, jeda acak ≥5 detik, jangan kirim tautan yang sama ke ratusan orang dalam 1 jam.
5. **CRM Kontak** (Business Development): sinkron otomatis tiap 30 menit dari Klien, Calon Klien, Tim, Peserta Pelatihan, Prospek, Mitra. Tersedia tag, opt-out, gabung duplikat, import CSV, ekspor.

Kuota: Gmail biasa ±100 email/hari (Workspace ±1.500). Sisa kuota tampil di menu Konfigurasi.

---

## 5. Doc Engine — Dokumen Cetak ber-QR & Tanda Tangan Elektronik

Saat setup, 5 template contoh dibuat otomatis di folder **📂 Template Dokumen** (bila gagal, klik **Buat Template Contoh** di menu *Doc Engine & TTD*):

| Template | Dipakai di | Nomor | Persetujuan |
|---|---|---|---|
| Faktur Tagihan (Invoice) | Finance → Invoice → *Terbitkan Faktur / Kirim Invoice* | Nomor invoice | Langsung terbit (QR) |
| Surat Keluar (Somasi/LO/SKK) | Administrasi → Surat → *Ajukan Approval & TTD* | Otomatis per jenis surat | **Managing Partner + PIN** |
| Laporan / Berita Acara Sidang | Perkara → Laporan Sidang → *Terbitkan PDF* | Nomor BAS | Langsung terbit |
| Kwitansi | Finance → Pembayaran → *Kwitansi* | KWT | Langsung terbit |
| Sertifikat Pelatihan (Slides) | Business Dev → Pelatihan → *Generate Sertifikat* (massal) | SRT-PLT | Langsung terbit |

**Langkah:**
1. **Doc Engine & TTD → Pejabat Penanda Tangan** → tambah Managing Partner (email Google harus sama dengan akun loginnya). Opsional unggah spesimen TTD (PNG).
2. Pejabat login → **Akun Saya → PIN Tanda Tangan** → atur PIN 6 digit.
3. Alur surat: Draft → *Ajukan Approval* → pejabat buka **Approval Pimpinan** → *Berikan Approval & TTD* (PIN) → nomor surat terbit otomatis, PDF ber-QR tersimpan di Drive & arsip. Super Admin dapat **Bypass** (alasan wajib, tercatat permanen).
4. Siapa pun bisa memindai QR → `verifikasi.html` menampilkan status **SAH / DITARIK**, penanda tangan, dan cek keutuhan PDF (SHA-256).
5. Ubah desain template langsung di Google Docs/Slides (tombol **Buka**), lalu **Pindai ulang**. Template baru: buat dokumen ber-placeholder → **Pindai Template Baru** → tempel URL. Lihat tab **Panduan Placeholder**.

> QR + Google login + PIN = tanda tangan elektronik **tidak tersertifikasi** (PP 71/2019): cocok untuk invoice, kwitansi, surat kantor, laporan sidang, dan sertifikat. Untuk dokumen yang membutuhkan kekuatan pembuktian penuh, gunakan TTE tersertifikasi (PSrE berinduk Komdigi). Ini bukan nasihat hukum.

---

## 6. Migrasi Database (data dari aplikasi / spreadsheet lama)

**Administration → Migrasi Database**
1. Tempel URL spreadsheet lama (harus bisa dibuka oleh akun pemilik Apps Script; spreadsheet lama **hanya dibaca**).
2. **Pindai Struktur** → sistem menyarankan tabel tujuan & peta kolom **berdasarkan nama header**. Periksa/ubah peta dan **kunci pencocokan** (mis. email klien, nomor perkara).
3. **Pindai (Dry-run)** → lihat jumlah *ditambah / diperbarui / dilewati* + peringatan (referensi yang tidak ditemukan, kunci ganda) — belum ada yang ditulis.
4. **Jalankan Import**. Nilai referensi boleh berupa **nama** (mis. kolom "Klien" berisi "PT Mega Graha") — otomatis dicocokkan ke ID. Nomor WA diperbaiki (0 di depan), email di-lowercase, tanggal dinormalisasi.
5. Aman diulang: import kedua tidak menggandakan data. **Jalankan sekali lagi tepat sebelum pindah** (delta sync).
6. Data dari luar Google Sheets: pilih tabel → **Impor CSV/Excel** (unduh template agar nama kolom cocok). Tombol **Ekspor** menghasilkan CSV/Excel per tabel.

**Cutover:** pindai → import → cek data & uji 1 akun tiap peran → import ulang (delta) → umumkan alamat baru. Sesi login lama tidak ikut pindah (pengguna cukup login ulang).

---

## 7. Memperbarui backend tanpa mengganti URL

Setelah mengubah kode `.gs`: **Terapkan → Kelola deployment → ✏ Edit → Versi: Versi baru → Terapkan**.
❗ Jangan membuat *Deployment baru* — URL `/exec` akan berubah dan frontend berhenti terhubung.
Bila skema bertambah (versi baru), jalankan `setupAppEnvironment` sekali lagi (aman).

---

## 8. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Login: "GAS_URL belum diisi" | `js/config.js` belum diubah | Isi URL `/exec`, push ulang |
| "Server membalas HTTP … (bukan JSON)" | Deployment akses bukan *Siapa saja* / URL salah | Kelola deployment → akses **Siapa saja**, eksekusi **Saya** |
| "Aplikasi belum di-setup" | `setupAppEnvironment` belum dijalankan | Jalankan dari editor |
| Tombol Google tidak muncul / "bukan untuk aplikasi ini" | `GOOGLE_CLIENT_ID` kosong / origin salah | Isi Client ID; origins = `https://USERNAME.github.io` |
| "Akun … belum terdaftar" | Email belum ada di User Management | Tambahkan pengguna |
| Notifikasi menumpuk di antrean | Trigger mati / token Fonnte / perangkat putus | Backup/Keamanan → **Pasang Ulang Trigger**; cek perangkat Fonnte |
| PDF gagal terbit | Template dihapus/dipindah | Doc Engine → Pindai ulang / Buat Template Contoh |
| Lupa sandi Super Admin | — | Editor Apps Script → jalankan `resetSandiSuperAdmin` → lihat Log |
| Situs 404 di GitHub Pages | `index.html` tidak di root repo | `git init` harus di folder yang langsung berisi `index.html` |
| Tampilan versi lama | Cache browser | Ctrl+Shift+R |

**Performa:** aplikasi menampilkan data dari cache perangkat seketika lalu menyegarkan di latar; login sudah membawa data dashboard (1 panggilan). Di console browser, ketik `Perf.table()` untuk melihat waktu server (`server`) vs jaringan (`net`) tiap aksi.

**Batasan jujur:** Google Sheets ideal hingga puluhan ribu baris per tabel; kuota Apps Script (6 menit/eksekusi, email harian, UrlFetch ±20.000/hari) berlaku; pengiriman WA bergantung status perangkat Fonnte; balasan WA masuk tidak tercatat (perlu webhook Fonnte — tahap lanjutan).
