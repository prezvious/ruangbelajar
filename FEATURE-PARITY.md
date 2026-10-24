# Pemindahan Sela Study ke Ruang Belajar

Audit lokal 22 Oktober 2026. Sumber yang dibandingkan adalah modul terpelihara di `sela-study/dist/`, pengujiannya, serta data Ruang Belajar semula. Folder Sela masih ada dan tidak dihapus oleh pekerjaan ini. Runtime dan tes Ruang tidak memerlukan folder tersebut.

## Cakupan fitur dan sistem

| Fitur sumber | Implementasi tujuan | Bukti lokal |
| --- | --- | --- |
| Stopwatch, mulai/jeda/lanjut/selesai, fokus layar, durasi selama navigasi/reload | `study/core.mjs`, `app.mjs`; dapat dimulai dari materi atau sesi agenda | Core, stress, browser |
| Pemisahan waktu per tanggal lokal, satu sesi dengan beberapa interval, jeda tidak dihitung | `sessionParts`, `aggregate`; konteks materi melekat pada interval | Core, consolidation, backup; oracle tujuh zona waktu |
| Mata pelajaran: tambah, edit, warna, arsip/pulihkan, larangan mengarsipkan timer aktif | Halaman Mata pelajaran; pemetaan opsional ke subtes UTBK | Core, browser, konsistensi istilah arsip |
| Tugas bertanggal, asosiasi mata pelajaran, selesai, edit, hapus, filter | Halaman Timer dan rencana Kalender | Browser; penulisan dengan mutex tab |
| Kalender 90 hari/minggu/bulan, heatmap, detail hari | Halaman Kalender; ditambah jadwal 84 sesi dan tugas pribadi | Browser enam bahasa/390px; stress timezone |
| Statistik harian/mingguan/bulanan, rata-rata, fokus terlama, total per pelajaran, histori | Halaman Statistik | Core, stress; jumlah sesi dibedakan dari jumlah interval |
| Target belajar harian 15–1.440 menit dan rangkaian hari belajar | Ringkasan harian dan Pengaturan | Core, stress, validasi formulir |
| Ekspor/impor JSON, snapshot timer aktif tanpa mengubah aslinya, pemulihan data rusak | Pengaturan, `core.mjs`; cadangan Sela versi 1/2 dibaca ke versi 3 | Backup hingga 100.000 interval/20.000 tugas, stress |
| Sinkronisasi otomatis, retry, polling/focus/reconnect, timer aktif, rekonsiliasi tiga arah | `sync.mjs`, `cloud.mjs`, `api/workspace.js`; data akademik ikut disinkronkan | Sync, academic-sync, API; upstream tiruan |
| Cache terpisah per akun, cache offline, impor tamu eksplisit, konflik dua perangkat dan ekspor kedua versi | Halaman Akun dan banner sinkronisasi | Sync, account-browser, audit-browser |
| Penguncian antar-tab dan fallback IndexedDB, perlindungan kuota/metadata cache rusak | `storage.mjs`, penulisan workspace di `app.mjs` | Storage, sync, audit-browser |
| Daftar/masuk, konfirmasi email, kirim ulang, lupa/ganti sandi, keluar | Akun Ruang dan cookie server HttpOnly; callback `/auth/verify` | API, account-browser, support-browser; HTTP Unicode |
| 59 tema, Studio/Opaline, terang/gelap/sistem | 59 tema sumber + 4 palet Ruang; empat berkas vendor identik byte demi byte | Hash vendor, parity; browser |
| Enam bahasa, tanggal/angka/jam/durasi lokal, UK/US berbeda, bentuk jamak Rusia | Katalog tetap; validasi dan pesan API memakai kunci terjemahan | 3.114 pesan; placeholder, plural, format tanggal/jam; browser |
| Panduan Supabase dan halaman kesalahan lokal | Panduan dalam shell, verifikasi dan 403/404; mengikuti bahasa dan tema tersimpan | Support-browser; HTTP 403/404 sebenarnya pada server lokal |

## Integrasi yang ditambahkan

Kurikulum Ruang tetap memuat 12 minggu/84 sesi dan tracker tetap memuat 116 materi unik, termasuk 12 topik bersama PK/PM. Konten dan tautan dibandingkan dengan `data.js`/`tracker-data.js` semula. Profil, target, tujuh nilai tryout, progres tiga tahap, penyelesaian agenda, dan penjadwalan memakai satu workspace versi 3 bersama catatan Sela.

Tanggal mulai kurikulum dapat diatur; tanggal sesi dapat diganti sendiri. Jadwal muncul bersama tugas pribadi. Penyelesaian timer, sesi agenda, dan tahap materi dicatat terpisah. Rata-rata tujuh subtes bukan skor gabungan resmi UTBK.

Migrasi menjaga kunci sumber lama, menyediakan pratinjau dan unduhan cadangan sebelum penggabungan, menolak interval waktu yang tumpang tindih, memetakan ulang ID bentrok, dan mencegah impor ulang cadangan yang sama. Pengujian termasuk benturan ID panjang dan ID timer tujuan yang belum dipakai.

## Penyesuaian arsitektur sesuai keputusan pengguna

- Akun dan Supabase Ruang Belajar menjadi tujuan. Akun/kata sandi Sela tidak dipindahkan; data belajar dipindahkan melalui ekspor/impor setelah masuk ke akun tujuan.
- Konfigurasi proyek yang sebelumnya dapat diubah di browser Sela digantikan konfigurasi server Ruang. URL/key frontend Sela dan SDK autentikasi browser tidak dibawa menjadi sistem akun kedua.
- Tabel `study_data` Sela digantikan `ruang_workspaces` di proyek Ruang. SQL baru tidak membaca, menghapus, atau memindahkan baris dari proyek Sela.
- Tautan source guide ke skema/konfigurasi lama disesuaikan dengan tabel, callback, dan environment server yang benar. Dokumen ekspor teknis berbahasa Indonesia diberi label bahasa; panduan aplikasi tersedia dalam keenam bahasa.

## Batas pembuktian

SQL produksi belum dijalankan, sesuai keputusan pengguna. Tes akun, RPC, dan sinkronisasi menggunakan fixture. Pengiriman email nyata, RLS/RPC produksi, redirect domain produksi, dan sinkronisasi dua perangkat nyata masih perlu diperiksa setelah konfigurasi Supabase.

Data pribadi belum diekspor atau digabung pada browser pengguna. Pastikan hasil migrasi aktual dan cadangan dapat dibaca sebelum menghapus Sela atau data situs lama. Berkas sumber Sela tetap ada. Tidak ada commit, push, deploy, atau penghapusan database.

Judul materi, teks pribadi, dan sumber pendidikan dipertahankan dalam bahasa asal. Audit bahasa mencakup antarmuka, pesan, dan format regional; tidak melakukan terjemahan mesin terhadap materi atau verifikasi ulang isi/tautan eksternal pendidikan. Tidak ada reviewer independen dalam audit ini.


Pembaruan 23 Oktober 2026: folder Sela sudah dihapus permanen atas permintaan pengguna. Workspace kini disimpan dalam IndexedDB transaksional (`repository.mjs`), dengan antrean, planner kapasitas, koreksi waktu, catatan/sumber, rutinitas, pengingat dan ICS. Lihat `IMPLEMENTATION-2026-10-23.md` untuk keadaan terkini; tabel di atas merekam audit penggabungan sebelumnya.
