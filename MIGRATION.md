# Memindahkan Sela Study ke Ruang Belajar

Ruang Belajar adalah aplikasi tujuan. Akun dan database tujuan memakai proyek Supabase Ruang Belajar. Folder Sela tidak diperlukan untuk menjalankan aplikasi gabungan.

## 1. Cadangkan Sela sebelum menghapusnya

1. Buka Sela pada alamat dan browser yang biasa dipakai.
2. Jika memakai akun, masuk ke akun Sela yang berisi data Anda. Pastikan sinkronisasinya selesai. Akun Sela berbeda dari akun Ruang Belajar.
3. Selesaikan timer aktif atau terjeda. Buka **Pengaturan → Data → Ekspor JSON** dan simpan berkasnya.
4. Jika juga memakai mode tamu, keluar ke workspace tamu dan ekspor data tamu secara terpisah.
5. Simpan berkas tersebut sampai data hasil pemindahan sudah diperiksa.

Ekspor Sela berisi mata pelajaran, nama/warna/status arsipnya, tugas, catatan waktu, target harian, dan pengaturan tampilan. Akun, kata sandi, dan token tidak ikut dipindahkan. Statistik dan heatmap dihitung kembali dari catatan waktu.

## 2. Impor ke Ruang Belajar

1. Jalankan `npm run dev` atau buka aplikasi Ruang Belajar yang sudah diperbarui.
2. Data Ruang lama pada origin yang sama otomatis dibaca sekali ke workspace baru. Kunci sumbernya tetap ada.
3. Bila ingin menyimpan semuanya ke akun, masuk dengan **akun Ruang Belajar**, lalu buka **Akun → Tambahkan catatan tamu** untuk membawa progres Ruang lokal. Ini tindakan eksplisit karena browser mungkin dipakai bersama.
4. Buka **Migrasi data → Gabungkan cadangan Sela / Ruang**.
5. Pilih JSON Sela, periksa jumlah data dalam pratinjau, lalu pilih **Cadangkan & gabungkan**. Cadangan workspace tujuan diunduh sebelum penerapan. Pengaturan tampilan dan profil dapat dipilih secara terpisah.
6. Periksa profil, tracker materi, tryout, tugas, dan statistik. Impor berkas identik sekali lagi tidak menggandakan catatan.
7. Tunggu status tersimpan ke akun sebelum mengandalkan perangkat lain.

Nama mata pelajaran yang sama tidak otomatis berarti identitas yang sama. Gunakan **Migrasi data → Hubungkan mata pelajaran ke subtes** untuk mengaitkan pelajaran hasil impor dengan kode UTBK. ID bentrok dengan isi berbeda dipetakan ulang agar kedua catatan dipertahankan.

Data waktu yang bertumpuk ditolak agar durasi tidak dihitung dua kali. Aplikasi mempertahankan workspace tujuan dan menampilkan kesalahan; jangan mengedit berkas sumber tanpa menyimpan cadangan aslinya. Bila datanya benar-benar mencatat dua timer pada waktu yang sama, ekspor keduanya untuk diperiksa dan tentukan catatan yang ingin dipertahankan sebelum mengimpor ulang.

## Data Ruang dari alamat/browser yang berbeda

localStorage terpisah berdasarkan protokol, hostname, dan port. Data `localhost`, `127.0.0.1`, domain preview, dan domain produksi tidak bisa dibaca silang otomatis.

Jika aplikasi pada alamat lama belum mempunyai tombol ekspor, buka aplikasi **Ruang Belajar lama pada alamat asalnya**, buka Developer Tools → Console, lalu jalankan kode berikut. Kode hanya mengunduh tiga kunci data belajar; tidak mengambil kredensial atau token.

```js
(() => {
  const keys = ['ruang-belajar-v1', 'ruang-belajar-tracker-v1', 'ruang-belajar-theme-v1'];
  const backup = {
    format: 'ruang-belajar-legacy-v1',
    storage: Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ruang-belajar-data-lama.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
})();
```

Impor berkas tersebut melalui **Migrasi data**, sama seperti berkas Sela. Data lama yang rusak tidak diganti kosong secara diam-diam; unduh data asal melalui kontrol pemulihan sebelum memulai workspace baru.

## 3. Aktifkan sinkronisasi gabungan di Supabase Ruang Belajar

1. Pada proyek Supabase Ruang Belajar yang dikonfigurasi server, buka **SQL Editor**.
2. Jalankan seluruh `supabase-schema.sql` dari repositori Ruang Belajar. Berkas ini membuat tabel `ruang_workspaces`, RLS, dan RPC revisi. Berkas boleh dijalankan ulang dan tidak menghapus data Sela.
3. Pertahankan environment `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AUTH_COOKIE_SECRET`, dan `PUBLIC_SITE_URL` Ruang Belajar.
4. Tambahkan callback `/auth/verify` sesuai `AUTH.md` pada allowlist Supabase. Reset sandi menggunakan callback yang sama lalu menuju `/akun?password-reset=1`.
5. Uji login akun Ruang, impor, tunggu status tersimpan, lalu buka akun yang sama pada perangkat lain.

SQL dan API disiapkan di repositori. Pengujian mencakup fixture akun/HTTP serta SQL pada PostgreSQL tertanam dengan role terisolasi; autentikasi Supabase produksi belum diverifikasi. SQL belum otomatis diterapkan pada proyek Supabase Anda.

## Setelah pemindahan

Sela dapat dihentikan setelah cadangan disimpan, jumlah/isi data tujuan diperiksa, dan penyimpanan akun tujuan dikonfirmasi. Folder Sela kemudian telah dihapus permanen atas permintaan pengguna. Database asal tidak diubah oleh integrasi ini.

Data offline tersimpan di cache akun yang bersangkutan dan dicoba lagi saat tersambung. Bila perubahan dua perangkat berbenturan, ekspor kedua versi dan pilih versi yang dipertahankan. Anggaran workspace akun adalah 3 MiB JSON UTF-8, dengan body API maksimal 4 MiB; ekspor/impor lokal mendukung sampai 128 MiB sesuai batas skema. Data lokal yang lebih besar tetap bisa diekspor.


Workspace v3 lokal berpindah ke IndexedDB secara otomatis. Tutup tab aplikasi versi lama sebelum memperbarui. Catatan, sumber, aturan pengulangan, status kejadian dan audit waktu disertakan dalam ekspor/gabungan JSON. Snapshot pemulihan tetap khusus perangkat, sepuluh per workspace.
