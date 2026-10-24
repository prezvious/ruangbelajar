# Verifikasi integrasi lokal

Tanggal: 21 Oktober 2026. Pemeriksaan berdasarkan kode dan berkas saat ini; data browser pengujian bersifat sintetis.

## Hasil

- `npm test` lulus: delapan skrip untuk timer, storage, migrasi, rekonsiliasi akademik, sinkronisasi, API, cadangan, dan katalog bahasa.
- `tests/browser.test.mjs` lulus pada Microsoft Edge headless. Server fixture terisolasi: port 5197. Memeriksa 13 rute dalam enam bahasa, jadwal bertanggal, progres, timer setelah navigasi/refresh/jeda, profil, tryout, tugas, kalender, 63 tema, mode gelap/terang, pratinjau impor, unduhan cadangan, preservasi data Ruang dan deduplikasi berkas Sela.
- Semua 13 rute juga diperiksa pada lebar 390px, tanpa overflow dokumen atau kesalahan JavaScript halaman.
- `tests/account-browser.test.mjs` lulus pada Edge dengan port 5198 dan fixture server akun. Memeriksa migrasi kunci Ruang lama, signup dengan nama/Remember me, pelestarian draf ketika bahasa berubah, sign-in, impor tamu eksplisit termasuk data akademik, penyimpanan akun dan isolasi setelah sign-out. Pemeriksaan tambahan filter query tracker, Back, dan skip-link keyboard juga lulus.
- API diuji memakai cookie terenkripsi dan upstream tiruan: tidak mengekspos token, pemeriksaan origin, pemisahan akun, validasi schema 3, revisi/CAS, cookie rusak, dan batas 4 MiB.
- Cadangan lokal diuji sampai 100.000 interval dan 20.000 tugas; contoh maksimum bidang sekitar 88 MB, di bawah batas 128 MiB. Overlap ditolak.
- Empat berkas tema vendor dibandingkan byte demi byte dengan sumber Sela; seluruhnya identik. Semua import relatif aplikasi dapat diselesaikan di dalam repositori Ruang.
- Pemeriksaan sintaks pada 36 berkas JavaScript aplikasi dan pengujian lulus. Regresi akhir memastikan konteks materi dipertahankan pada catatan waktu yang selesai dan dikosongkan untuk sesi timer umum berikutnya.
- `git diff --check` lulus. Detektor mekanis Impeccable pada entry point dan kode UI mengembalikan `[]`.
- Screenshot desktop dan ponsel diperiksa secara visual. Perbaikan satu batch menangani kontras sidebar, navigasi ponsel, dan format tanggal lokal. Konfirmasi visual setelah perbaikan selesai.

## Review

Tinjauan dilakukan sendiri, tanpa reviewer independen. Fokusnya preservasi data lama, isolasi akun, konflik revisi, interval tumpang tindih, penghitungan unik PK/PM, rute lama, dependensi lokal, dan akses keyboard. Tidak ada kode yang membutuhkan folder Sela untuk runtime. Berkas Ruang generasi lama tetap ada untuk referensi.

## Batas verifikasi dan keputusan pengguna

- Pengguna memilih menyelesaikan integrasi lokal dahulu dan menjalankan `supabase-schema.sql` kemudian. SQL belum diterapkan atau dieksekusi pada database produksi dalam pekerjaan ini.
- Akun/Supabase Ruang adalah tujuan; akun dan kata sandi Sela tidak digabung.
- Data pribadi pada browser/origin dan akun asal tidak dibaca atau dipindahkan selama pengujian. Jalur migrasi dan panduannya sudah tersedia; ekspor/import aktual dilakukan dari workspace yang bersangkutan.
- Pengiriman email, callback produksi, RLS/RPC database nyata, dan sinkronisasi dua perangkat nyata masih memerlukan pemeriksaan setelah konfigurasi Supabase.
- Browser pengujian memblokir pengunduhan font eksternal. Screenshot memeriksa tata letak dengan font fallback; Google Fonts tetap menjadi sumber font pada aplikasi.
- Folder Sela dan database asal tidak dihapus; tidak ada commit, push, atau deploy.
- Pratinjau lokal pada `http://127.0.0.1:5199` merespons HTTP 200 dengan entry point gabungan. Origin pratinjau ini mempunyai localStorage sendiri; data asal tetap memerlukan migrasi melalui jalur yang didokumentasikan.

Panduan operasional: [README.md](../../../README.md) dan [AUTH.md](../../../AUTH.md).
