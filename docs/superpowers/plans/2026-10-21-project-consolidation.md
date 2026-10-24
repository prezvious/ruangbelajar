# Rencana implementasi penggabungan

**Tujuan:** seluruh fitur kedua aplikasi tersedia di Ruang Belajar dengan akun Ruang, jadwal bertanggal, dan jalur migrasi yang mempertahankan data.

**Spesifikasi:** [rancangan](../specs/2026-10-21-project-consolidation-design.md).

**Eksekusi:** langsung dalam sesi ini, tanpa commit/deploy/penghapusan proyek.

## 1. Model dan migrasi

- [x] Pindahkan modul Sela yang relevan ke `study/`, katalog Ruang ke `study/catalog.mjs`, serta lisensi sumber ke `third_party/`.
- [x] Tambahkan model akademik, tanggal agenda, konteks timer, dan workspace versi 3 tanpa kehilangan kompatibilitas cadangan Sela versi 2.
- [x] Tambahkan migrasi kunci Ruang lama, impor gabungan Sela, pratinjau, penanganan ID, dan cadangan sebelum penerapan.
- [x] Uji migrasi berulang, profil/tryout/progres bersama, tanggal akhir bulan/tahun, timer terjeda, dan interval bentrok.

## 2. Akun dan sinkronisasi

- [x] Pertahankan cookie HttpOnly; tambahkan `/api/workspace` untuk baca/simpan menggunakan revisi dan akun yang diverifikasi server.
- [x] Perluas rekonsiliasi Sela ke profil, agenda, progres per tahap, jadwal, dan tryout. Hapus ketergantungan pada SDK/token browser Sela.
- [x] Siapkan `supabase-schema.sql` dengan tabel/RLS/RPC khusus Ruang dan dokumentasi penerapan.
- [x] Uji akun berganti saat permintaan tertunda, konflik revisi, request lintas origin, dan data akademik yang diubah dari dua perangkat.

## 3. Tampilan dan alur belajar

- [x] Satu shell Ruang, clean URLs lama dan baru, navigasi akademik dan waktu belajar, timer bertahan saat pindah halaman.
- [x] Pertahankan agenda, materi, tracker, profil, tryout, dan panduan; hubungkan timer dari agenda/tracker.
- [x] Tambahkan tugas/kalender/statistik/mata pelajaran/pengaturan Sela, pengaturan jadwal, pemetaan subtes, dan pusat migrasi.
- [x] Pertahankan 59 tema vendor dan dua gaya, tambah empat palet Ruang, perluas enam katalog bahasa.
- [x] Verifikasi semua rute di server lokal dan browser pada desktop/mobile, termasuk pergantian tema/bahasa serta impor/ekspor.

## 4. Penyelesaian

- [x] Jalankan suite regresi yang relevan dan tes integrasi baru.
- [x] Perbarui README, AUTH, desain, dan panduan migrasi; cantumkan batas verifikasi produksi.
- [x] Tinjau diff dan pastikan aplikasi tidak membutuhkan folder `sela-study` lagi.

Risiko utama yang harus diuji: data lintas origin tidak bisa dibaca otomatis; impor berulang tidak menggandakan sesi; konflik timer tidak membuat interval tumpang tindih; perubahan tanggal tidak menghapus penyelesaian agenda; respons akun lama tidak masuk ke akun baru.

Status akhir: integrasi lokal selesai dan diverifikasi. Pengguna memilih menerapkan SQL kemudian. Migrasi data pribadi dari origin/akun asal dan verifikasi produksi belum dilakukan.
