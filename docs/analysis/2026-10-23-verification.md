# Verifikasi implementasi 23 Oktober 2026

Lingkungan lokal: Windows, Node **v24.18.0**, Playwright **1.64.1**, Edge headless. CI dikonfigurasi untuk Node 22 + Chromium; job GitHub Actions belum dijalankan dari pekerjaan ini.

| Pemeriksaan | Hasil yang diamati |
| --- | --- |
| `npm test` | **18 suite lulus**: learning, efficiency, repository, core, storage, consolidation, academic-sync, sync, api, backup, locales, localisation-audit, merge-boundaries, topic-timer, parity, audit-regressions, api-audit, stress. |
| `npm run test:database` | **Lulus** pada PostgreSQL PGlite: migrasi dapat diulang, baris lama tanpa ekstensi tetap terbaca dan dapat di-upgrade, penulisan klien lama ditolak, dua akun terisolasi, anon/penulisan langsung ditolak, identitas pemilik diperiksa, revisi lama gagal, hanya satu dari dua write dengan revisi sama berhasil, bentuk/ukuran tidak valid ditolak. |
| `npm run test:http` | **Lulus**: paket UTF-8 terpisah, encoding rusak, dan unggahan terputus tidak merusak server. |
| `npm run test:browser` | **Lulus**: antrean, kejadian berulang, Markdown/TXT import/export, penolakan script/gambar/link JavaScript, planner dan penerapan, pilihan hari tetap benar setelah perubahan bahasa/pratinjau, koreksi/hapus waktu, pemulihan snapshot, ekspor sebelum pengarsipan, alarm ICS, empat halaman baru × enam bahasa pada 390px. |
| `node tests/browser.test.mjs` | **Lulus**: 13 halaman lama × enam bahasa, timer/progres/profil/tryout/tugas/kalender, 63 tema, migrasi dan cadangan, semua halaman pada 390px, tidak ada page error. |
| `node tests/account-browser.test.mjs` | **Lulus**: migrasi tamu, draft daftar/masuk, impor tamu eksplisit, save cloud, logout terisolasi, dan penghapusan cache perangkat setelah sinkronisasi. |
| `node tests/audit-browser.test.mjs` | **Lulus**: pembuangan draft saat pindah akun, konflik tryout/profil dua tab, cache akun saat offline, kegagalan simpan tanpa pesan sukses palsu. |
| `node tests/support-browser.test.mjs` | **Lulus**: verifikasi, 403/404 dengan status HTTP benar, panduan publik terkini, enam bahasa, fokus/draft/validasi, pembersihan fragmen token dan resend recovery. |
| `npm run format:check` / `npm run vendor:check` | **Lulus**. Bundle Marked/DOMPurify dan lisensinya sama dengan dependency yang dikunci. Hash vendor tema lama tetap diuji oleh parity suite. |
| Sintaks dan konsistensi | **37 modul runtime** lolos `node --check`; berkas SQL root sama dengan migrasi bernomor; dependency package.json sesuai package-lock. `git diff --check` tidak menemukan error whitespace. |
| `npm audit --omit=dev --json` | **0 advisori** yang dilaporkan untuk dependency produksi pada pemeriksaan ini. Bukan pembuktian bebas kerentanan atau uji penetrasi. |

## Bukti kapasitas dan durabilitas yang dicakup

- Browser menulis workspace sintetis berisi **20.000 interval**, reload, lalu membandingkan **seluruh array interval** dengan sumber menggunakan deep equality. Ini pengujian IndexedDB lokal, **bukan** pembuktian bahwa 20.000 interval tersebut berada di bawah anggaran cloud 3 MiB.
- Repository diuji dengan dua instance modul, IndexedDB sintetis yang sama, dan Web Locks dinonaktifkan. Empat puluh increment tidak hilang. Abort sebelum commit tidak menjalankan callback keberhasilan, tidak menghapus sumber migrasi, dan mempertahankan nilai committed. Snapshot dibatasi sepuluh; penghapusan dengan expectedRaw basi ditolak.
- Probe revisi yang sama tidak membaca dokumen penuh atau menulis ulang cache. Cache acknowledged memakai `baseIsDoc`, tanpa salinan base kedua. Lease polling diuji per workspace.
- Cadangan besar tetap diuji hingga **100.000 interval / 20.000 tugas**. Sampel ekspor standar sekitar 26 MB dan sampel kolom maksimum sekitar 88 MB tetap di bawah envelope cadangan 128 MiB. Tidak ada pemotongan riwayat otomatis.
- Suite stress mencakup 1.800 aksi timer, 144 kasus cadangan/korupsi, serta oracle menit pada tujuh zona waktu. Ini tidak mensimulasikan kapasitas trafik produksi.

## Perbaikan yang ditemukan saat verifikasi

Pengakuan simpan/publikasi menunggu `complete` transaksi IDB; checkbox hari belajar mempunyai identitas unik agar draft tidak tertukar; koreksi dapat menghapus interval lama berdurasi nol; identitas kalender stabil ketika aktivitas tunggal dipindah tanggal dan terpisah per workspace; label ekspor teks tidak menyebut JSON; API/RPC menolak penulisan klien lama yang tidak membawa ekstensi learning v1.

Predikat tunggu browser memeriksa kondisi secara sinkron terhadap façade repository. Helper tes dibatasi ke HTTP(S), sehingga halaman internal download Edge tidak menjalankan import aplikasi.

Tidak ada deployment, penerapan SQL produksi, pembacaan database pribadi, atau pengujian SMTP/JWT/CAPTCHA produksi. Data browser uji memakai origin/port terisolasi dan API akun tiruan. Batas eksternal dan daftar dokumentasi resmi terdapat di `IMPLEMENTATION-2026-10-23.md`.
