# Ruang Belajar

Agenda, tracker materi, timer, tugas, kalender, statistik, dan catatan tryout untuk persiapan UTBK SNBT 2027.

## Penambahan fitur baru

- **Hari ini dan tertinggal:** antrean sesi, tugas, dan rutinitas yang perlu dikerjakan.
- **Rencana kapasitas:** atur waktu tersedia, estimasi durasi, lalu tinjau jadwal sebelum menerapkannya.
- **Catatan dan sumber:** simpan catatan Markdown atau TXT serta referensi pribadi per topik.
- **Catatan waktu:** koreksi durasi dengan alasan, riwayat perubahan, serta pengarsipan dan pemulihan catatan.
- **Rutinitas dan pengingat:** tugas berulang, pengingat dalam aplikasi, dan ekspor kalender.
- **Sinkronisasi akun:** penyimpanan per akun, pemulihan koneksi, serta penanganan konflik perubahan antarperangkat.
- **Pengaturan profil dan target:** ubah nama, kampus, jurusan, dan target selesai belajar melalui Settings. Dasbor hanya menampilkan ringkasan **Profil & target**, tanpa garis pemisah atau breadcrumb.
- **Pilihan tampilan:** 63 palet warna, mode terang/gelap/sistem, dua gaya antarmuka, serta enam pilihan bahasa.

## Fitur

| Area | Fitur |
| --- | --- |
| Agenda | Kurikulum TTL Indonesia 12 minggu / 84 sesi, tanggal mulai yang dapat diatur, tanggal per sesi, referensi, dan filter belum selesai. |
| Materi | Pencarian sesi, subtes, topik, dan referensi literasi. |
| Tracker | 116 materi unik dengan 348 tahap Belajar/Latihan/Review; 12 materi PK/PM memakai progres bersama. |
| Timer | Mulai, jeda, lanjut, selesai, mode fokus, pulih setelah refresh, tampil selama navigasi, dan terhubung ke sesi/materi. |
| Tugas dan kalender | Tugas bertanggal, rutinitas, edit/selesai/hapus, kalender waktu belajar, serta agenda dan tugas pada tanggal pilihan. |
| Statistik | Durasi harian/mingguan/bulanan, rata-rata, distribusi mata pelajaran, streak, fokus terlama, heatmap, dan riwayat. |
| Mata pelajaran | Tambah, edit nama/warna, arsip/pulihkan, total durasi, serta pemetaan ke subtes UTBK. |
| Profil dan target | Ringkasan nama, kampus, jurusan, dan target selesai di Dasbor; pengeditan dan penyimpanan di Settings. |
| Tryout | Hasil tujuh subtes, edit/hapus, dan grafik 12 hasil terakhir. |
| Akun | Daftar/masuk/verifikasi/reset sandi, cookie HttpOnly, cache per akun, sinkronisasi otomatis, dan penanganan konflik. |
| Data | Ekspor/impor cadangan JSON, pratinjau sebelum penerapan, cadangan otomatis, deduplikasi impor, dan pemulihan lokal. |
| Tampilan | 63 palet, mode terang/gelap/sistem, Studio/Opaline, bahasa Indonesia, Inggris UK/US, Spanyol, Prancis, dan Rusia. |

Waktu timer, penyelesaian agenda, dan tahap materi merupakan catatan terpisah. Menyelesaikan timer tidak otomatis menandai materi tuntas. Rata-rata tujuh nilai tryout bukan skor gabungan resmi UTBK. Konten kurikulum dan nama materi asli tetap dalam bahasa sumber.

Tanggal mulai adalah tanggal sesi pertama minggu 1. Ke-84 sesi mengikuti tanggal tersebut secara berurutan. Tanggal khusus per sesi mengesampingkan perhitungan awal; mengubah tanggal mulai tidak menghapus progres atau tanggal khusus. Aplikasi tidak mengasumsikan tanggal ujian resmi.

## Menjalankan secara lokal

Prasyarat: **Node.js 22+**. Salin `.env.example` menjadi `.env.local`, lalu isi konfigurasi sesuai [AUTH.md](AUTH.md), termasuk `AUTH_COOKIE_SECRET` minimal 32 karakter.

```sh
npm ci
npm run dev
```

Buka [localhost:5174](http://localhost:5174). Server lokal diperlukan agar autentikasi dan sinkronisasi API berjalan. Membuka HTML melalui `file://` tidak didukung.

Tidak diperlukan build frontend atau koneksi CDN JavaScript. Runtime Markdown dan sanitizer disertakan dari versi dependency yang dikunci; `npm run vendor:check` memeriksa kesesuaian berkasnya.

## Akun dan sinkronisasi

Untuk mengaktifkan sinkronisasi, jalankan [supabase-schema.sql](supabase-schema.sql) pada SQL Editor proyek Supabase yang digunakan aplikasi. Tabel `ruang_workspaces` memakai RLS dan revisi untuk mencegah penimpaan perubahan. Konfigurasi environment, cookie, dan callback email dijelaskan di [AUTH.md](AUTH.md). Skema SQL perlu diterapkan secara terpisah pada lingkungan produksi.

Sesi akun memakai cookie terenkripsi HttpOnly, SameSite=Lax, dan Secure pada Vercel. Token autentikasi tidak disimpan dalam localStorage atau cadangan. Durasi sesi adalah 6 bulan kalender atau 12 bulan dengan pilihan **Ingat saya**.

Data tamu tidak otomatis masuk ke akun. Gunakan **Akun → Tambahkan catatan tamu** untuk menambahkannya. Untuk memulihkan cadangan JSON, buka **Migrasi data**, pilih berkas, lalu periksa pratinjau sebelum menerapkannya. Cadangan data saat ini diunduh sebelum penerapan.

## Halaman

| Path | Isi |
| --- | --- |
| `/` | Agenda belajar |
| `/hari-ini` | Antrean hari ini dan tertinggal, tugas, dan rutinitas |
| `/rencana` | Kapasitas, estimasi, pratinjau, dan penerapan jadwal |
| `/catatan` | Catatan dan sumber pribadi Markdown/TXT per topik |
| `/catatan-waktu` | Koreksi, riwayat perubahan, pengarsipan, dan pemulihan waktu |
| `/dasbor` | Ringkasan profil dan target selesai belajar |
| `/materi` | Materi dan referensi |
| `/tracker?subject=PK` | Tracker dengan filter subtes opsional |
| `/tryout` | Hasil dan grafik tryout |
| `/belajar` | Timer, tugas, dan ringkasan hari ini |
| `/statistik` | Statistik dan riwayat waktu |
| `/kalender` | Kalender waktu dan rencana belajar |
| `/mata-pelajaran` | Kelola mata pelajaran dan pemetaan subtes |
| `/pengaturan` | Profil dan target, tampilan, bahasa, target harian, ekspor/impor, dan akun |
| `/akun`, `/sign-in`, `/sign-up` | Pengelolaan akun |
| `/auth/verify` | Callback verifikasi/reset sandi |
| `/migrasi` | Impor cadangan dan pemetaan subtes |
| `/panduan` | Panduan dan sumber kurikulum |

Tautan berbasis hash diterjemahkan ke path; `/agenda` dan `/index.html` diarahkan ke `/`. Back/Forward, tautan langsung, dan refresh dilayani server lokal serta rewrite Vercel.

## Penyimpanan dan pemulihan

Workspace dan cache akun disimpan di IndexedDB `ruang-workspaces`. Pilihan bahasa dan petunjuk akun terakhir disimpan dalam localStorage; petunjuk akun tidak berisi token. Akses server tetap memerlukan cookie yang valid.

Perubahan antar-tab memakai transaksi IndexedDB dan Web Locks bila tersedia. Sepuluh snapshot lokal per workspace melindungi penghapusan, penggantian data, dan perubahan jadwal. Polling revisi setiap 60 detik dikoordinasikan antar-tab. Perubahan yang belum tersinkron tetap tersedia setelah keluar dan dicoba kembali saat akun yang sama dibuka.

Jika permintaan akun gagal karena koneksi, cache akun terakhir dapat dibuka selama petunjuk sesinya belum kedaluwarsa. Keluar menghapus petunjuk ini. Draf formulir dibuang ketika workspace/akun berubah. Perubahan pada kolom yang sama dari tab berbeda memerlukan pemeriksaan; perubahan pada kolom berbeda dapat digabung.

Waktu yang melintasi tengah malam dibagi menurut tanggal lokal. Jeda tidak dihitung; fokus terlama memakai satu segmen tanpa jeda. Timer menyinkronkan timestamp, bukan mengunggah data setiap detik. Perangkat membutuhkan jam yang benar dan koneksi untuk menyimpan ke server.

Impor lokal dibatasi 128 MiB, 100 mata pelajaran, 20.000 tugas, 100.000 interval waktu, dan 20.000 tryout. Workspace akun dibatasi 3 MiB JSON UTF-8 kanonis, dengan body API maksimal 4 MiB. Impor akun memeriksa kapasitas sebelum penerapan.

Jika penyimpanan browser penuh atau ditolak, aplikasi meminta ekspor. Simpan cadangan sebelum menutup tab. Belum ada service worker atau jaminan aplikasi dapat dimuat offline. Data lokal terkait alamat situs; cadangkan sebelum menghapus data situs atau mengganti alamat aplikasi.

## Pengujian

```sh
npm run vendor:check
npm run format:check
npm test
npm run test:database
npm run test:http
npm run test:browser
node tests/browser.test.mjs
node tests/account-browser.test.mjs
node tests/audit-browser.test.mjs
node tests/support-browser.test.mjs
```

Playwright terpasang melalui npm. Pada Linux/CI, jalankan `npx playwright install --with-deps chromium` sebelum tes browser. Pada Windows, tes memakai Edge secara default; `PW_CHANNEL` dapat mengubah kanal.

Suite mencakup timer dan batas hari, transaksi antar-tab, cadangan besar, impor idempoten, progres PK/PM, konflik perubahan, isolasi akun, offline/reconnect, validasi API, cookie, database, serta enam katalog bahasa. Tes browser memakai server dan akun tiruan, memeriksa alur fitur pada desktop dan ponsel, serta tidak mengubah data produksi.

Pengujian stres mencakup 1.800 aksi timer, 144 kasus cadangan buatan, serta penghitung menit pembanding di tujuh zona waktu. Pengujian HTTP mencakup batas paket UTF-8, encoding rusak, dan unggahan terputus. GitHub Actions menjalankan pemeriksaan otomatis pada push dan pull request.

Gunakan `npm run format` untuk merapikan sumber aktif. Berkas vendor dan data kurikulum sumber tidak diformat ulang.

## Struktur

- `study/app.mjs`: shell, navigasi, timer, tugas, statistik, mata pelajaran, dan akun.
- `study/academic-ui.mjs`, `academic-model.mjs`, `catalog.mjs`: agenda, materi, tracker, ringkasan profil, tryout, dan jadwal.
- `study/profile-settings.mjs`: formulir profil dan target, validasi, serta penyimpanan dari Settings.
- `study/core.mjs`, `migration.mjs`, `repository.mjs`: skema data, waktu, validasi, impor, transaksi IndexedDB, dan pemulihan.
- `study/learning-model.mjs`, `learning-ui.mjs`, `calendar-export.mjs`: antrean, kapasitas, koreksi, catatan/sumber, rutinitas, dan pengingat.
- `study/sync.mjs`, `cloud.mjs`: rekonsiliasi dan transport API dengan cookie.
- `study/http.mjs`, `forms.mjs`, `support-pages.mjs`: pesan API, validasi formulir, verifikasi email, dan halaman kesalahan.
- `study/locales/`, `academic-locales.mjs`, `learning-locales.mjs`, `themes.mjs`, `vendor/`: bahasa, palet, dan aset tampilan.
- `api/auth.js`, `api/workspace.js`: autentikasi server dan penyimpanan akun.
- `supabase-schema.sql`, `supabase/migrations/`: skema database dan migrasi SQL.
- `tests/`, `.github/workflows/checks.yml`: pengujian dan integrasi berkelanjutan.
- `dev-server.js`, `vercel.json`: rute lokal dan deployment.

Entry point aplikasi adalah `study/app.mjs`. Berkas JavaScript/CSS generasi sebelumnya dipertahankan sebagai referensi.

## Deploy

Impor repositori ke Vercel dengan preset **Other**, tanpa build, dan output root `.`. Atur environment sesuai [AUTH.md](AUTH.md), jalankan SQL pada Supabase, dan pastikan redirect email mengizinkan domain produksi beserta `/auth/verify`. Periksa login, sinkronisasi dua perangkat, tautan langsung, dan refresh setelah deploy.

## Sumber dan lisensi

Kurikulum dan referensi dikreditkan kepada TTL Indonesia. Lisensi kode aplikasi tersedia di [LICENSE](LICENSE). Katalog 59 tema dan tiga CSS vendor bersumber dari `mental-math-trainer`; teks lisensi GPLv3 dipertahankan dalam [lisensi tema](third_party/SELA-THEME-LICENSE). Ikon Lucide memakai [lisensi upstream](third_party/lucide-LICENSE). Lisensi Markdown dan sanitizer disertakan di `study/lib/`. Kredit dan lisensi masing-masing sumber tetap disertakan dalam distribusi.
