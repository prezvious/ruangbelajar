# Fitur belajar dan ketahanan data

Implementasi lokal, 23 Oktober 2026. Tidak menerapkan SQL, menerbitkan deployment, atau mengubah data pribadi di origin aplikasi pengguna.

## Alur yang ditambahkan

| Halaman | Perilaku |
| --- | --- |
| `/hari-ini` | Antrean tugas dan sesi kurikulum bertanggal hari ini atau sebelumnya yang belum selesai. Mulai timer kurikulum, selesaikan, pindahkan pekerjaan, edit/hapus tugas, serta buat rutinitas. Untuk seri berulang ditampilkan kejadian tertua yang belum selesai dan kejadian hari ini. |
| `/rencana` | Hari belajar, kapasitas menit harian, perkiraan umum/per sesi, tanggal mulai dan target. Pratinjau menghitung beban tugas pribadi yang memiliki estimasi; sesi selesai dipertahankan. Tidak ada perubahan tanggal sebelum tombol Terapkan. Perubahan rencana dari tab lain membuat pratinjau lama ditolak. Sesi yang melebihi kapasitas tidak dijadwalkan diam-diam. |
| `/catatan` | Catatan dan sumber pribadi terkait topik, pencarian/filter, edit/hapus, impor/ekspor Markdown/TXT UTF-8. Teks dibatasi 64 KiB per entri. Markdown memakai Marked dan DOMPurify yang dibundel; HTML mentah dan gambar dinonaktifkan. Tautan sumber hanya HTTP(S). Daftar catatan menampilkan 25 entri per halaman. |
| `/catatan-waktu` | Tambah, koreksi, hapus interval, pratinjau durasi, alasan wajib dan 500 koreksi terakhir. Menolak waktu terbalik/masa depan/tumpang tindih serta perubahan pada run timer aktif atau jeda. Halaman berisi 100 interval. Pengarsipan mengekspor cadangan lengkap sebelum mengeluarkan interval lama dari workspace aktif. |

Pengulangan harian/mingguan/bulanan menyimpan aturan dan pengecualian penyelesaian, bukan menulis kejadian tak terbatas. Tanggal bulanan yang tidak ada dilewati sesuai RFC 5545. Kalender dan daftar tugas harian menghitung kejadian dari aturan yang sama. Penyelesaian dan pelewatan disimpan terpisah.

Pengingat berjalan dalam aplikasi ketika halaman terbuka. Pilihan pengguna adalah pengingat aplikasi + ekspor `.ics`. Ekspor berisi kejadian dalam rentang pilihan sampai 366 hari, maksimal 10.000 kejadian, UID stabil, escaping/folding UTF-8, dan VALARM. Waktu kalender bersifat floating dan mengikuti zona kalender penerima. Impor `.ics` bukan langganan otomatis; setelah mengubah jadwal, ekspor/import kembali. Pengiriman saat aplikasi ditutup bergantung pada aplikasi kalender beserta izin/alarmnya. Tidak ada klaim server Web Push/email atau cold-start offline.

## Penyimpanan dan efisiensi

- Workspace dan metadata konflik berpindah ke database IndexedDB `ruang-workspaces`; localStorage hanya dipakai untuk preferensi/petunjuk akun dan penanda polling kecil. Migrasi sumber workspace lama dihapus dari localStorage hanya setelah transaksi IDB berhasil. Tiga key Ruang v1 sebagai sumber migrasi tetap dipertahankan.
- Mutasi membaca ulang scope aktif di dalam transaksi; Web Locks menambah koordinasi origin, sementara transaksi readwrite IDB tetap memberi eksklusi saat Web Locks tidak tersedia. UI/sync baru mengakui simpan pada event transaksi `complete`. Abort mempertahankan cache committed dan sumber migrasi.
- Hanya scope aktif dimuat saat mutasi; scope tamu dimuat khusus ketika diimpor atau dibuka kembali; seluruh akun lain tidak dibaca ulang untuk setiap edit. BroadcastChannel memuat ulang cache tab lain sebelum mengirim pemberitahuan perubahan.
- Cache tersinkron yang `doc` dan `base` sama menyimpan satu salinan. Ketika terdapat edit lokal, base tetap disimpan untuk penggabungan tiga arah. Penghapusan dan benturan satu kolom tetap diperlakukan sebagai perubahan.
- Polling terlihat setiap 60 detik; lease Web Locks + timestamp membatasi probe periodik antar-tab per workspace. Probe hanya meminta revisi. Dokumen diambil penuh jika revisi berubah; perubahan masih ditulis sebagai dokumen penuh. Ini belum protokol delta atau penyimpanan per-record di cloud.
- Anggaran workspace akun adalah **3 MiB JSON UTF-8 kanonis**, diperiksa sebelum mutasi akun, impor tamu, dan upload. Body API tetap maksimal 4 MiB. Batas database 4 MiB teks JSONB memberi ruang bagi separator PostgreSQL. Cadangan lokal sampai 128 MiB merupakan envelope pemulihan, bukan janji kapasitas cloud. API/RPC menolak penulisan tanpa ekstensi learning v1 sehingga tab versi lama tidak dapat menghapus fitur baru. Cadangan lama tetap dinormalisasi saat dibaca oleh aplikasi terbaru. Data besar lama tetap dapat dibaca dan diekspor; gunakan pengarsipan eksplisit untuk mengurangi workspace aktif. Tidak ada pemotongan riwayat diam-diam.
- Sepuluh snapshot per workspace tersimpan lokal sebelum penghapusan/penggantian/perubahan jadwal. Pemulihan mengekspor keadaan kini dan membekukan timer snapshot pada saat snapshot dibuat. Snapshot tidak disinkronkan dan bukan pengganti cadangan eksternal.
- Pengaturan menyediakan diagnostik kuota, permintaan persistent storage (keputusan browser), pemulihan, serta keluar + hapus cache/snapshot akun pada perangkat setelah sinkronisasi. Logout normal mempertahankan pekerjaan offline. Peringatan revokasi server yang gagal diteruskan secara terjemahan.

## Kontrak database dan proses rilis

`supabase-schema.sql` sama persis dengan `supabase/migrations/202610230001_workspace_contract.sql`. Jalankan seluruh berkas pada Supabase Ruang Belajar setelah mencadangkan data. Migrasi dapat dijalankan ulang, mencabut INSERT/UPDATE langsung dari `authenticated`, mempertahankan SELECT dengan RLS pemilik, dan memindahkan elevasi izin ke fungsi di schema privat dengan search_path kosong, pemeriksaan auth.uid(), serta CAS revisi atomik. RPC publik memakai invoker. NOT VALID menjaga baris historis sambil memeriksa penulisan baru.

Database menegakkan batas ukuran, bentuk utama, jumlah record, ID, beberapa batas teks dan interval. API tetap bertanggung jawab atas validasi domain lengkap, termasuk referensi katalog, tanggal sipil, overlap dan invariant timer. Jangan menganggap pemeriksaan bentuk DB sebagai duplikat lengkap validator JavaScript. Request ID dan logging kesalahan server hanya mencatat kode/status, tanpa isi catatan atau token. CSP deployment membatasi skrip/koneksi ke origin sendiri; font Google yang sudah dipakai tetap diizinkan.

Workflow `.github/workflows/checks.yml` menetapkan Node 22, `npm ci`, pemeriksaan vendor/format, unit, PostgreSQL tertanam, HTTP, dan lima suite browser Chromium. Dependency dikunci dalam package-lock; browser tidak lagi membutuhkan path paket eksternal. SQL tertanam menggunakan PostgreSQL PGlite dengan role/JWT-claim fixture; ini bukan verifikasi Supabase Auth/PostgREST produksi.

## Batas kesiapan publik yang masih memerlukan bukti eksternal

1. Terapkan migrasi pada staging Supabase, uji JWT nyata, Data API/RPC, dua akun, race, dan restore provider. SQL produksi belum dijalankan oleh pekerjaan ini.
2. Verifikasi SMTP, domain callback, rate limits dan CAPTCHA/bot protection dengan provider nyata. Pipeline CAPTCHA frontend/provider belum ditambahkan; jangan mengaktifkannya tanpa integrasi token yang sesuai. Tidak memakai limiter Map dalam memori sebagai proteksi serverless.
3. Hapus akun cloud, cabut seluruh perangkat, backup cloud historis, pemetaan ID katalog saat konten berubah, delta/per-record cloud dan cold-start offline tetap pekerjaan lanjutan. Metadata schema learning v1 menjaga perluasan data saat ini; ini belum sistem migrasi katalog lengkap.
4. CI dikonfigurasi di repo dan perintahnya diuji lokal. Run GitHub Actions dan kapasitas produksi belum diamati. Pengukuran 20.000 interval membuktikan simpan–reload pada browser penguji, bukan jaminan kuota seluruh perangkat.

## Dokumentasi resmi yang dipakai

- [MDN — IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), [transaksi dan durability](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction), [persistent storage](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).
- [Supabase — database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database testing](https://supabase.com/docs/guides/local-development/testing/overview).
- [RFC 5545 — iCalendar](https://www.rfc-editor.org/rfc/rfc5545), [Marked](https://marked.js.org/using_advanced), [DOMPurify](https://github.com/cure53/DOMPurify).
- [PGlite — PostgreSQL tertanam](https://pglite.dev/docs/), [Playwright — CI](https://playwright.dev/docs/ci-intro).

Hasil pemeriksaan akhir dicatat pada `docs/analysis/2026-10-23-verification.md` setelah seluruh perintah selesai.
