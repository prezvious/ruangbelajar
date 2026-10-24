# Audit kelengkapan materi Ruang Belajar

21 Oktober 2026 · Hasil riset dan usulan, belum diterapkan ke aplikasi.

**Penilaian: daftar materi belum lengkap untuk Cambridge AS/A Level. Untuk SNBT, tujuh subtesnya sudah terwakili, tetapi beberapa keterampilan masih tersembunyi di judul besar dan beberapa topik belum tercantum secara khusus.**

Fokus laporan adalah melengkapi daftar topik/submateri. Jumlah berkas Drive dan tersedianya tautan tidak digunakan sebagai ukuran kelengkapan kurikulum.

## Hasil yang dapat langsung ditinjau

- [Daftar 59 unit usulan](DAFTAR-USULAN.md): 18 pelengkap basis SNBT, 30 matematika, 7 English Language, 4 Thinking Skills. Bedakan tindakan **Tambah** dan **Rinci**.
- [Matriks pembandingan Cambridge](cambridge-matrix.csv): seluruh 38 bagian bernomor Mathematics 9709, 15 subbagian Thinking Skills 9694, dan 6 kelompok materi/komponen English Language 9093.
- [Daftar 116 materi yang sudah ada](existing-topics.csv), untuk memeriksa duplikasi.
- [Inventaris 59 entri silabus Cambridge](cambridge-subject-scope.csv), dengan kedalaman audit masing-masing.
- [Indeks Drive dalam CSV](drive-index.csv), disertai [ringkasan terhitung](drive-summary.json). JSON mentah, log Rclone, dan PDF berada di `D:\rclone\research\ruang-belajar-2026-10-21`.

## 1. Batas audit dan cara membaca hasil

Cambridge AS/A Level menawarkan pilihan mata pelajaran, bukan satu paket wajib berisi seluruh mapel. Audit bab dilakukan pada tiga bidang yang beririsan dengan proyek: Mathematics, Thinking Skills, dan English Language. Seluruh entri direktori diperiksa pada tingkat keberadaan jalur mata pelajaran. Sains, ekonomi, komputer, dan bidang lain juga ditinjau sebagai kebutuhan cabang baru, **bukan diklaim sudah diaudit sampai setiap learning outcome**. [Direktori Cambridge](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/subjects/).

Kategori penilaian:

- **Belum tercantum**: tidak ada judul khusus yang menunjukkan topik tersebut.
- **Judul umum terkait**: ada payung materi yang beririsan, tetapi rincian/kedalaman tidak dapat dipastikan dari katalog.
- **Belum ada jalur mata pelajaran**: perlu katalog terpisah jika mapel itu dipilih.

Ini audit kelengkapan daftar, bukan pengukuran kemampuan pengguna atau sertifikasi kesetaraan Cambridge. Keberadaan satu judul tidak membuktikan seluruh kompetensinya terpenuhi. Ketiadaan judul khusus juga tidak membuktikan topik itu tidak pernah muncul dalam seluruh tautan lama.

## 2. Kondisi katalog proyek

Snapshot akhir diperiksa melalui `index.html`, `study/app.mjs`, `study/academic-ui.mjs`, `study/academic-model.mjs`, dan `study/catalog.mjs`. Entry point beralih ke modul gabungan selama riset berlangsung. Perbandingan terprogram memastikan katalog akademik aktif sama dengan `data.js` dan `tracker-data.js` lama, sehingga temuan topiknya tetap berlaku.

| Subtes | Entri tracker |
| --- | ---: |
| PU | 21 |
| PBM | 15 |
| PPU | 16 |
| PK | 27 |
| PM | 24 |
| LBI | 8 |
| LBE | 17 |

Jumlah per subtes 128; ada 12 materi PK/PM bersama sehingga total uniknya **116**, dengan **348 tahap**. Agenda berisi **84 sesi dalam 12 minggu**; **33 sesi** hanya berjudul kegiatan “Latihan Soal”. Itu belum menjelaskan keterampilan mana yang dilatih pada sesi tersebut.

“Semua materi” dibangun dari agenda dan referensi literasi, sedangkan tracker dibangun dari daftar 116 topik. Karena itu, kelengkapan daftar perlu diperiksa pada keduanya; label “Semua materi” saat ini belum berarti katalog seluruh kompetensi.

Tujuh subtes sesuai struktur [UTBK yang dipublikasikan SNPMB](https://www.snpmb.id/utbk-snbt/informasi-umum). Namun, struktur tujuh subtes tidak memberikan persentase kelengkapan bab. Kerangka yang tersedia saat riset masih menyebut 2026, sementara proyek menargetkan 2027.

## 3. Hasil pembandingan Cambridge

| Bidang | Unit audit | Judul umum terkait | Belum tercantum |
| --- | ---: | ---: | ---: |
| Mathematics 9709 | 38 bagian | 18 | 20 |
| Thinking Skills 9694 | 15 subbagian | 11 | 4 |
| English Language 9093 | 6 kelompok | 1 | 5 |

Angka ini hasil klasifikasi editorial terhadap daftar proyek. Unit antarbidang berbeda dan beberapa komponen matematika merupakan alternatif rute; **jangan menjumlahkannya menjadi persentase kelengkapan**.

Untuk matematika, daftar sekarang sudah memberi fondasi sejumlah bagian. Kekosongan paling jelas muncul pada integrasi, metode numerik, vektor, persamaan diferensial, bilangan kompleks, distribusi peluang, inferensi statistik, dan mekanika. Rincian pemenuhan tiap bagian tercatat dalam matriks. A Level memakai P1, P3, P5, serta P4 atau P6; P2 adalah pilihan AS saja. Menambahkan semua komponen ke daftar belajar diperbolehkan, tetapi tidak berarti semuanya diwajibkan dalam satu rute. [Mathematics 9709, 2026–2027, versi 4](https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf).

Untuk Thinking Skills, PU sudah memiliki deduksi, generalisasi, analogi, sebab-akibat, evaluasi bukti, dan simpulan. Yang perlu dibuat eksplisit adalah penelusuran solusi berbatasan, pengembangan model, perubahan skenario, serta konstruksi argumen. Asumsi dan mutu bukti juga memerlukan rincian agar dapat dilatih terpisah. [Thinking Skills 9694, 2026–2027, versi 2](https://www.cambridgeinternational.org/Images/697412-2026-2027-syllabus.pdf).

Untuk English Language, LBE memberi sebagian fondasi membaca. Produksi tulisan, komentar analitis, perubahan bahasa, pemerolehan bahasa anak, penggunaan bahasa Inggris global, dan hubungan bahasa dengan identitas belum mempunyai jalur khusus. [English Language 9093, 2027–2028, versi 1](https://www.cambridgeinternational.org/Images/721359-2027-2028-syllabus.pdf). Versi 2029–2031 tidak dipakai sebagai acuan audit ini.

Katalog juga belum mempunyai jalur Physics, Chemistry, Biology, Computer Science, Economics, serta mapel pilihan lainnya. Contoh kebutuhan cabang baru ada di bagian E daftar usulan. Riset ini tidak menganggap semuanya harus ditambahkan ke jalur SNBT.

## 4. Indeks Drive

Folder yang diperiksa: [folder sumber pengguna](https://drive.google.com/drive/folders/1ZSaGixqJ28Q9J9gb0CDdS5ypq6YeEtIp?usp=sharing).

Indeks rekursif Rclone selesai dengan exit code 0, pada 21 Oktober 2026 pukul 07.43 SGT. Hasil:

| Ukuran | Hasil |
| --- | ---: |
| Entri total | 1.124 |
| Folder | 134 |
| Berkas | 990 |
| PDF | 778 |
| Ukuran metadata berkas | 3.723.439.572 byte, sekitar 3,47 GiB |
| Kelompok MD5 berulang | 23 |
| Shortcut dangling yang dilaporkan | 0 |

Ukuran tersebut adalah jumlah ukuran seluruh berkas yang terindeks, bukan ukuran unduhan riset. Hash berulang menunjukkan sebagian berkas memiliki isi identik; banyaknya PDF tidak setara banyaknya topik unik.

Cabang UTBK memuat 396 berkas, UM UGM 188, SM UNS 116, paket Sukses SM ITB 93, SM IPB 88, SIMAK UI 53, dan cabang lain sisanya. Tidak ditemukan nama berkas/folder yang menyebut Cambridge atau kode 9709/9694/9093. Itu hasil pemeriksaan nama, **bukan bukti bahwa tidak ada materi yang beririsan di dalamnya**. Isinya dominan persiapan seleksi Indonesia.

Percobaan pertama menggunakan remote `public_download` mendapat 403 kuota API. Indeks berhasil melalui koneksi `gshared` yang sudah dikonfigurasi, dengan folder sumber yang sama. Tidak ada konfigurasi/kredensial yang dimasukkan ke artefak riset.

## 5. PDF yang benar-benar dibaca

Sembilan PDF Drive diunduh dan seluruh **41 halamannya** diperiksa secara visual. Semuanya berupa scan tanpa lapisan teks yang dapat diekstrak. Tiga silabus resmi juga diunduh; bagian cakupan, isi materi, dan asesmennya digunakan untuk pembandingan. **778 PDF diindeks, bukan semuanya dibaca.**

| Sampel Drive | Halaman | Nilai untuk audit |
| --- | ---: | --- |
| [Integral](https://drive.google.com/file/d/1pFbasXpNfvPQpitORXDgt89E4pPk56_9/view) | 5 | Ringkasan beberapa teknik beserta contoh; menunjukkan unit yang belum tercantum. |
| [Vektor](https://drive.google.com/file/d/1q5mY_51Pcesr_vp6ZsybEBc1HbmUQfrN/view) | 4 | Pengantar operasi dan hasil kali; belum merupakan seluruh unit vektor Cambridge. |
| [Polinomial](https://drive.google.com/file/d/10P-JkjEY7MU5h6rvGamzlSB1Yp1A8KeV/view) | 3 | Dasar pembagian dan sisa; kandidat bab tambahan. |
| [Lingkaran](https://drive.google.com/file/d/1YrFpmJlTKzaQxWKkhee8KrlTI5ZxW4li/view) | 3 | Memperjelas perlunya rincian geometri analitik, di luar judul bangun datar umum. |
| [Data dan Ketidakpastian](https://drive.google.com/file/d/1KBQ_YjWs5t6q6mdb4hY2FDKBNc59KS7x/view) | 12 | Cakupan deskriptif/peluang cukup luas sebagai bahan penentuan rincian tracker. |
| [Materi Bahasa Inggris](https://drive.google.com/file/d/1Z_RYcZmOyhWONV9IhxDQkZmF3o2ODkXR/view) | 6 | Menunjukkan rincian kohesi/koherensi dan organisasi teks yang bisa diperjelas. |
| [Paragraph Following and Preceding](https://drive.google.com/file/d/1baMByMcsdtHEax-W9XJRKTPgv8kig_o8/view) | 3 | Topik layak ditambahkan; satu contoh soal tidak konsisten. |
| [Evaluasi dan Refleksi](https://drive.google.com/file/d/15loxSUKc0Nsfl2H8KuQcszdSLi4ZjGNx/view) | 2 | Cocok untuk merinci kemampuan menilai dan menerapkan isi bacaan. |
| [Bahasa Buatan dan Pola Bilangan](https://drive.google.com/file/d/12Y8X36fvnwQ9WzwFVAVk8bgmMzFjHB0G/view) | 3 | Bahasa buatan sudah ada pada PPU; pola nonrutin perlu diperjelas di bawah penalaran pola. |

Sampel yang menarik untuk daftar tambahan adalah Integral, Polinomial, Vektor, serta Data dan Ketidakpastian. Ini ringkasan bab, **bukan paket ajar Cambridge lengkap**. Penggunaan sebagai bahan utama masih memerlukan latihan dan asesmen yang sesuai.

Catatan mutu yang teramati: soal kedua pada PDF Paragraph Following and Preceding memakai bacaan kendaraan listrik, tetapi opsi jawabannya tentang media sosial. Pada PDF Data dan Ketidakpastian, penjelasan populasi/sampel berdasarkan ambang ukuran 30 pada halaman 7–8 perlu dikoreksi sebelum dijadikan rujukan rumus. Dalam unit vektor, adanya hasil kali silang di ringkasan tidak berarti itu wajib untuk 9709; silabus justru tidak mensyaratkannya.

## 6. Keputusan yang disarankan

Mulai dengan 18 usulan basis SNBT agar judul umum berubah menjadi daftar kompetensi yang jelas. Setelah itu, buat jalur pengayaan berdasarkan mata pelajaran Cambridge yang dipilih. Tinjau tindakan **Rinci** bersama entri induknya sehingga progres tidak dihitung ganda.

Kriteria kelengkapan berikutnya sebaiknya per capaian: topik tercantum, prasyarat jelas, penjelasan tersedia, latihan sesuai, dan ada bukti penguasaan. Daftar yang lebih panjang saja belum membuktikan materi sudah lengkap. Hasil saat ini cukup untuk menyatakan **belum lengkap**, tetapi tidak mendukung klaim persentase kelengkapan SNBT atau kesetaraan penuh AS/A Level.

## Reproduksi dan artefak

`audit-catalog.mjs` menghitung katalog lokal dan mengekspor indeks; `build-matrix.mjs` memvalidasi ID materi serta bagian audit; `audit-subjects.py` mengekstrak direktori resmi; `download-samples.ps1` mencatat sumber unduhan; `inspect-pdfs.py` mencatat jumlah halaman dan halaman yang dirender. Koneksi/kredensial tetap memakai konfigurasi Rclone lokal dan tidak disalin.

JSON indeks utama: `D:\rclone\research\ruang-belajar-2026-10-21\index.json`. Status keberhasilan: `index-status.json`. Sumber unduhan: `pdf-manifest.json`. Semua sembilan PDF Drive cocok dengan MD5 sumber; hasilnya tersimpan dalam `download-verification.json`. Render dan teks kerja berada dalam subfolder `rendered` di direktori riset D. Pemeriksaan PDF: [pdf-inspection.json](pdf-inspection.json). Hasil klasifikasi mesin: [cambridge-matrix.json](cambridge-matrix.json). Pemeriksaan konsistensi artefak: [verification.json](verification.json).
