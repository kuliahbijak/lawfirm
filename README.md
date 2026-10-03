# SIMLAWFIRM — Sistem Informasi Manajemen Kantor Hukum

Frontend statis (HTML/CSS/JS murni) untuk GitHub Pages. Backend: Google Apps Script (REST API JSON) + Google Sheets + Drive + Gmail + Fonnte.

- `index.html` — aplikasi (SPA hash router): Dashboard, Client Management, Perkara, Workspace, Surat, Finance, People, Knowledge, Business Development, Client Portal, Administration & Security, Notifikasi WA/Email, CRM Kontak, Doc Engine & TTD, Migrasi Database.
- `verifikasi.html` — halaman publik verifikasi QR dokumen.
- `js/config.js` — **isi `GAS_URL`** dengan URL Web App Apps Script (`/exec`).

Peran: **Super Admin** (kelola penuh) • **Managing Partner** (baca-saja + approval TTD) • **Klien** (Client Portal, hanya datanya sendiri).

Lihat `PANDUAN-INSTALASI.md` untuk langkah lengkap.
