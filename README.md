# Ruang Belajar

**Agenda belajar, tracker materi, dan catatan tryout untuk persiapan UTBK SNBT 2027.**

Ruang Belajar menyatukan jadwal dan progres belajar dalam satu aplikasi web ringan.
Materi tersusun per minggu, setiap submateri memiliki tahap Belajar, Latihan, dan
Review, sementara hasil tryout dapat dicatat untuk melihat perkembangan nilai.

Dibangun dengan **HTML, CSS, dan JavaScript biasa**: tanpa framework, backend,
atau proses build. Data pengguna disimpan di browser melalui `localStorage`.

## Sekilas

| Agenda | Tracker | Tahap belajar | Pilihan warna |
| --- | --- | --- | --- |
| 12 minggu / 84 sesi | 116 submateri | 348 tahap | 4 palet |

## Fitur

- **Agenda mingguan** — pilih minggu dan hari, lihat topik beserta referensinya,
  tandai sesi selesai, dan tampilkan hanya sesi yang belum selesai.
- **Dasbor belajar** — ringkasan progres, capaian per subtes, profil, tujuan
  perguruan tinggi dan jurusan, serta target tanggal selesai belajar.
- **Pencarian materi** — temukan topik berdasarkan nama materi, subtes, atau minggu.
- **Tracker materi** — catat Belajar, Latihan, dan Review secara terpisah;
  filter berdasarkan subtes, kata kunci, dan status ketuntasan.
- **Riwayat tryout** — tambah, edit, dan hapus hasil dengan konfirmasi;
  lihat grafik hingga 12 hasil terakhir dari nilai yang benar-benar dicatat.
- **Panduan awal** — referensi cara belajar, jalur masuk perguruan tinggi,
  KIP Kuliah, dan penggunaan tracker.
- **Tampilan responsif** — empat palet warna: Olive, Ocean, Terracotta, dan Plum;
  pilihan warna tersimpan untuk kunjungan berikutnya.
- **URL bersih** — navigasi berbasis path, tautan langsung ke halaman, dan
  dukungan tombol Back/Forward browser tanpa `#agenda`.

## Menjalankan Secara Lokal

Prasyarat: **Node.js dan npm** untuk menjalankan server statis lokal.
Aplikasi sendiri tidak memerlukan instalasi dependensi atau kompilasi.

~~~sh
git clone https://github.com/prezvious/ruangbelajar.git
cd ruangbelajar
npx serve . --single --listen 5173
~~~

Buka **http://localhost:5173**. Pada penggunaan pertama, `npx` dapat meminta
izin mengunduh paket `serve`. Opsi `--single` menyediakan fallback ke
`index.html` saat membuka atau me-refresh halaman seperti `/tracker`.

> Gunakan server HTTP, bukan membuka `index.html` melalui `file://`.
> Navigasi berbasis path memerlukan server yang melayani halaman aplikasi.

## Mulai Menggunakan

1. Buka **Dasbor**, lalu isi profil dan target belajar jika diperlukan.
2. Pilih sesi di **Agenda belajar**, buka referensinya, lalu tandai sesi selesai.
3. Gunakan **Tracker materi** untuk mencatat tahap belajar setiap submateri.
4. Tambahkan hasil di **Tryout** untuk memantau perkembangan tujuh subtes.

Agenda pertama kali menampilkan **minggu 2**, yaitu awal kurikulum utama.
Minggu 1 tetap tersedia untuk pendahuluan. Nomor minggu bukan perhitungan
minggu kalender, dan agenda tidak menetapkan durasi atau tanggal ujian.

## Halaman Dan URL

| Path | Halaman |
| --- | --- |
| `/` | Agenda belajar |
| `/dasbor` | Ringkasan progres, profil, dan target |
| `/materi` | Pencarian seluruh materi |
| `/tracker` | Tracker tahap belajar |
| `/tryout` | Riwayat dan grafik hasil tryout |
| `/panduan` | Referensi pendahuluan dan petunjuk penggunaan |

Tautan `/tracker?subject=PK` membuka tracker dengan filter Pengetahuan
Kuantitatif. Filter menggunakan query parameter, bukan hash.
Tautan lama seperti `/#tracker?subject=PK` otomatis diganti menjadi path
baru saat aplikasi dibuka. `/agenda` dan `/index.html` diarahkan ke `/`.
Tautan aksesibilitas `#main` tetap digunakan untuk melompat ke konten utama;
ini bukan routing halaman dan tidak ditambahkan ke URL ketika diklik.

## Deploy Ke Vercel

1. Push proyek ke GitHub, lalu pilih **Add New Project** di Vercel.
2. Impor repository **prezvious/ruangbelajar**.
3. Pilih **Framework Preset: Other** dan **Root Directory: `.`**.
4. Biarkan **Build Command** kosong dan gunakan direktori proyek (`.`)
   sebagai **Output Directory**. Tidak ada langkah `npm install` yang diperlukan.
5. Klik **Deploy**.

Konfigurasi `vercel.json` menyertakan rewrite untuk lima halaman selain
agenda, sehingga tautan langsung dan refresh tetap memuat `index.html`.
Aset CSS, JavaScript, dan favicon memakai path absolut dari root domain.
Proyek ditujukan untuk root domain, bukan subfolder seperti `/aplikasi/`.

Sesudah deploy, periksa `/tracker?subject=PK` dan refresh halaman tersebut.
Alamat produksi mengikuti domain yang diberikan atau dikonfigurasi di Vercel;
repository ini tidak menetapkan domain produksi tertentu.

## Penyimpanan Dan Privasi

Semua progres disimpan di **browser dan origin yang sama**, bukan di server.
Tidak ada akun pengguna atau sinkronisasi antarperangkat.

| Kunci localStorage | Isi |
| --- | --- |
| `ruang-belajar-v1` | Minggu pilihan dan sesi agenda yang selesai |
| `ruang-belajar-tracker-v1` | Profil, progres tahap materi, dan hasil tryout |
| `ruang-belajar-theme-v1` | Pilihan palet warna |

- Menghapus data situs/browser dapat menghapus progres. Fitur ekspor/impor
  cadangan belum tersedia.
- Data di localhost tidak otomatis berpindah ke domain Vercel. Domain preview,
  domain produksi, serta browser berbeda mempunyai penyimpanan terpisah.
- Menyelesaikan sesi agenda **tidak otomatis** menyelesaikan tahap pada tracker.
- Dua belas materi gabungan PK/PM memakai progres bersama agar tidak dihitung ganda.
- Jika browser menolak penyimpanan, perubahan tidak dapat diandalkan untuk
  kunjungan berikutnya.
- Font dimuat dari Google Fonts dan tautan materi mengarah ke layanan eksternal.
  Aplikasi belum memiliki service worker; jangan menganggapnya sepenuhnya offline.
  Font memakai fallback jika koneksi font gagal.

## Sumber Dan Catatan Akademik

Agenda menggunakan kurikulum **TTL Indonesia untuk persiapan SNBT 2027**,
dengan 37 URL referensi asli tetap dipertahankan. Tracker berasal dari delapan
ekspor HTML sumber berlabel **SNBT 2026**, lalu digabung ke `tracker-data.js`.
Berkas ekspor mentah tidak diperlukan untuk menjalankan aplikasi.

Tanggal target lama tidak diimpor; pengguna menentukan targetnya sendiri.
Riwayat tryout dimulai kosong, tanpa nilai contoh. **Rata-rata tujuh subtes
bukan skor gabungan resmi UTBK.** Materi dan tautan sumber adalah referensi
belajar, bukan pengumuman resmi jadwal atau ketentuan seleksi.

## Struktur Proyek

| Berkas | Fungsi |
| --- | --- |
| `index.html` | Kerangka halaman dan navigasi |
| `app.js` | Routing, agenda, pencarian, dan progres sesi |
| `data.js` | Kurikulum agenda dan referensi literasi |
| `tracker.js` | Dasbor, profil, tracker materi, dan tryout |
| `tracker-data.js` | Submateri, kelompok, referensi, dan asal data |
| `styles.css`, `tracker.css` | Layout responsif dan tampilan fitur |
| `themes.js`, `themes.css` | Pilihan, penyimpanan, dan token palet warna |
| `icons.js`, `favicon.svg` | Ikon Lucide lokal dan ikon situs |
| `vercel.json` | Rewrite dan redirect untuk clean URL |
| `DESIGN.md` | Arah visual dan panduan desain |
| `third_party/` | Lisensi aset pihak ketiga |

## Kontribusi

Perubahan dapat diajukan melalui issue atau pull request. Untuk perubahan routing,
periksa navigasi menu, Back/Forward, pembukaan tautan langsung, refresh halaman,
dan filter subtes. Untuk perubahan data, pertahankan asal sumber serta konsistensi
jumlah sesi, submateri, dan progres bersama PK/PM.

Tidak ada test runner atau build pipeline yang dikonfigurasi. Pemeriksaan sintaks
JavaScript dapat dijalankan dengan `node --check app.js` dan
`node --check tracker.js`, lalu lanjutkan pengujian melalui browser.

## Lisensi Dan Kredit

Kode proyek menggunakan [Lisensi MIT](LICENSE).
Kurikulum dan referensi belajar dikreditkan kepada **TTL Indonesia**; lisensi kode
proyek tidak dimaksudkan untuk melisensikan ulang materi milik pihak ketiga.

Ikon memakai koleksi [Lucide melalui Iconify](https://icon-sets.iconify.design/lucide/),
disimpan lokal tanpa CDN runtime. Lisensi upstream tersedia di
[third_party/lucide-LICENSE](third_party/lucide-LICENSE).
Tipografi menggunakan **DM Sans** dan **Lora** dari Google Fonts.
