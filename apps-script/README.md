# Backend Apps Script — SMART PUSBEKMATAU

Situs di GitHub Pages itu statis, jadi login, baca/tulis spreadsheet, manajemen pengguna, dan log audit
dikerjakan oleh satu Google Apps Script Web App (`Code.gs`). Semua pemeriksaan hak akses dilakukan **di sini**,
bukan di browser: setiap permintaan membawa token bertanda tangan (HMAC) yang diverifikasi ulang terhadap daftar pengguna.

## Pasang (sekali, ± 10 menit)

1. Buka <https://script.google.com> → **Proyek baru**. Hapus isi `Code.gs` bawaan, tempel seluruh isi
   [`Code.gs`](./Code.gs) dari folder ini, simpan.
2. Pilih fungsi **`setup`** di toolbar → **Jalankan**. Setujui izin (Spreadsheet + Drive).
   Buka **Log eksekusi**: di sana tertulis kata sandi awal untuk `admin`, `operator`, `viewer`
   (acak, hanya muncul sekali). Catat, lalu ganti lewat menu *Manajemen Pengguna* setelah masuk.
   Setup juga membuat spreadsheet DB `SMART PUSBEKMATAU - DB` (tab USERS dan AUDIT) di Drive akun yang sama — jangan dihapus atau dibagikan.
3. (Opsional) Jalankan **`checkSources`** untuk memastikan akun ini bisa membuka semua spreadsheet sumber.
4. **Deploy → Deployment baru → Jenis: Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   Salin **URL aplikasi web** (berakhiran `/exec`).
5. Di GitHub: **Settings → Secrets and variables → Actions → tab Variables → New repository variable**
   - Name: `APPS_SCRIPT_URL`, Value: URL `/exec` tadi.
6. **Settings → Pages → Source: GitHub Actions**, lalu jalankan ulang workflow *Deploy to GitHub Pages*.

Setiap kali `Code.gs` diubah: **Deploy → Kelola deployment → ✏️ → Versi baru → Deploy** (URL tetap sama).

## Catatan penting

- Akun yang menjalankan script harus punya **hak edit** di semua spreadsheet sumber.
- File `.xlsx` yang hanya diunggah (bukan Google Spreadsheet) tidak bisa dibuka Apps Script. Buka file itu →
  **File → Simpan sebagai Google Spreadsheet**, lalu ganti ID-nya di `DATA_SOURCES` (`Code.gs`) dan deploy versi baru.
  Dari daftar lama, yang kemungkinan berupa .xlsx: Monitoring 2026, Data Warranty, Data FMS, dan SIMMAT 2021–2026.
- ID spreadsheet ada di `Code.gs` (repo). ID saja tidak memberi akses ke data, tetapi jika repo publik, jangan
  membagikan spreadsheet sumber lewat "siapa saja yang punya link".
- Batas Apps Script untuk akun Google biasa: ±90 menit total waktu eksekusi/hari dan ±30 eksekusi bersamaan.
  Ringkasan Eksekutif membuka 25 modul sekaligus (di-cache 5 menit); modul yang sangat besar bisa terasa lambat.
- Nilai yang diedit lewat situs ditulis seperti ketikan manual di Sheets (angka tetap jadi angka). Teks yang diawali
  `= + - @` atau angka 0 di depan disimpan sebagai teks agar tidak jadi rumus / kehilangan nol.
