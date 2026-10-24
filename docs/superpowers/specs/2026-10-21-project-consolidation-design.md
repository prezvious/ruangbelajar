# Penggabungan Ruang Belajar dan Sela Study

Keputusan pengguna, 21 Oktober 2026: Ruang Belajar menjadi aplikasi utama; gunakan akun dan proyek Supabase Ruang Belajar. Kurikulum diberi tanggal mulai yang dapat diatur. Pertahankan data pribadi dari kedua aplikasi dan sediakan migrasinya. Pengguna berencana menghapus Sela Study setelah pemindahan.

## Cakupan fitur

| Area | Hasil penggabungan |
| --- | --- |
| Kurikulum | Pertahankan 12 minggu, 84 sesi, referensi, pencarian, dan panduan TTL Indonesia. |
| Tracker materi | Pertahankan 116 materi unik, 348 tahap Belajar/Latihan/Review, serta 12 materi PK/PM dengan progres bersama. |
| Jadwal | Tanggal mulai opsional, penjadwalan tiap sesi, tugas pribadi bertanggal, dan kalender gabungan. Mengubah tanggal tidak menghapus progres. |
| Waktu belajar | Timer mulai/jeda/lanjut/selesai, mode fokus, pemulihan setelah refresh, serta hubungan dengan sesi atau materi. |
| Statistik | Durasi harian/mingguan/bulanan, per mata pelajaran, streak, fokus terlama, heatmap, dan riwayat sesi. |
| Mata pelajaran | Nama/warna, arsip/pulihkan, serta pengaitan mata pelajaran impor dengan subtes UTBK. |
| Profil dan tryout | Profil, kampus/jurusan/target, hasil tujuh subtes, edit/hapus, dan grafik hasil nyata. |
| Akun | Akun Ruang Belajar, cookie HttpOnly, verifikasi, reset sandi, cache terpisah per akun, sinkronisasi otomatis, retry offline, dan penanganan konflik. |
| Data | Ekspor/impor seluruh workspace, impor gabungan Sela tanpa mengganti data Ruang, pratinjau migrasi, deduplikasi berdasarkan ID dan isi, cadangan sebelum perubahan. |
| Tampilan | Empat palet Ruang ditambah 59 tema Sela, mode terang/gelap/sistem, Studio/Opaline, enam bahasa. Konten kurikulum asli dipertahankan dalam bahasa sumber. |

## Arsitektur

Tetap HTML/CSS/JavaScript tanpa build frontend. Mesin waktu, kalender, validasi, penguncian tab, lokalisasi, dan rekonsiliasi Sela dipindahkan ke `study/` di repositori Ruang Belajar. Renderer akademik menggunakan katalog Ruang yang sudah ada. Satu workspace versi 3 mencakup data waktu dan data akademik. Semua halaman memakai routing path yang sama; tautan lama tetap tersedia.

Autentikasi tetap melalui server Ruang Belajar. Transport sinkronisasi mengakses endpoint server dengan cookie; token tidak dipindahkan ke localStorage. Tabel baru `ruang_workspaces` terpisah dari tabel Sela, dengan revisi dan RLS per akun. SQL disiapkan sebagai artefak yang dapat dijalankan pemilik proyek; keberhasilan lokal tidak membuktikan konfigurasi database produksi.

## Aturan data

- Selesai timer tidak otomatis menuntaskan agenda atau tiga tahap materi. Ketiganya mewakili hal berbeda.
- Nomor minggu kurikulum tidak berubah mengikuti pengaturan hari pertama kalender pada locale.
- Tanggal mulai memetakan 84 sesi berurutan; tanggal per sesi dapat diubah tanpa membuat tugas duplikat.
- Timer hanya satu; interval yang bertumpuk ditolak. Waktu melintasi tengah malam dibagi menurut tanggal lokal.
- ID materi dan progres PK/PM dipertahankan. Hubungan topik tidak ditebak menggunakan kemiripan nama.
- Migrasi browser Ruang membaca kunci lama pada origin yang sama, menyimpannya sebagai sumber, dan menulis workspace baru satu kali. Data rusak tidak diam-diam diganti kosong.
- Impor Sela menerima cadangan versi 2; pratinjau dan cadangan diwajibkan sebelum penerapan. Mata pelajaran bernama sama tidak otomatis dianggap sama; ID yang berbenturan dengan isi berbeda dipetakan ulang.
- Migrasi tidak memindahkan akun atau sandi lintas proyek. Pengguna mengekspor workspace Sela dari akun lamanya lalu mengimpornya ke akun Ruang.
- Data tamu tidak otomatis dilampirkan ke akun yang baru masuk. Pengguna memilih tindakan impor ke akun.
- Sumber data lama tidak dihapus oleh integrasi. Aplikasi gabungan tidak bergantung pada folder Sela.

## Verifikasi

Tes timer dan sinkronisasi Sela pada sumber awal sudah lulus. Integrasi harus menambahkan tes tanggal/penjadwalan, progres bersama, pelestarian data lama, impor ulang, benturan ID, cadangan, konflik data akademik, isolasi akun, dan API revisi. Periksa halaman lama dan baru, refresh/back/forward, desktop/mobile, timer saat navigasi, dan ekspor/impor melalui browser.

Sertakan lisensi dan atribusi sumber: LICENSE Ruang (MIT), berkas tema Sela beserta `third_party/SELA-THEME-LICENSE` (GPLv3), Lucide, dan kredit kurikulum TTL Indonesia. Jangan mengubah berkas vendor tema yang disalin.
