# Akun Dan Supabase

## Yang Tersedia

- `/sign-up`: nama lengkap, email, kata sandi, dan pilihan Remember me.
- `/sign-in`: email, kata sandi, dan pilihan Remember me.
- `/auth/verify`: proses tautan konfirmasi email, status berhasil/gagal, dan
  permintaan kirim ulang email. Tidak ada login Google atau Apple.
- Tautan akun pada sidebar; tombol keluar tersedia di halaman Akun.
- Pengunjung tetap dapat memakai workspace tamu tanpa akun. Workspace akun
  disimpan terpisah dan disinkronkan melalui API setelah skema SQL diterapkan.

## Konfigurasi Lokal

1. Gunakan Node.js 22 atau lebih baru.
2. Salin `.env.example` menjadi `.env.local`.
3. Buat secret acak dengan perintah berikut, lalu masukkan hasilnya ke
   `AUTH_COOKIE_SECRET`. Jangan bagikan nilainya atau memasukkannya ke Git.

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

4. Jalankan `npm run dev` dan buka `http://localhost:5174`.

`SUPABASE_URL` dan `SUPABASE_PUBLISHABLE_KEY` tersedia pada contoh konfigurasi.
Keduanya bukan kredensial admin. **Jangan gunakan secret key atau service_role**
di frontend, file publik, atau repository. Jika kunci admin pernah terpapar,
rotasi melalui Supabase Dashboard dan periksa pemakaian yang tidak dikenal.

## Konfigurasi Vercel

Tambahkan environment berikut di **Project Settings → Environment Variables**:

| Variable | Nilai |
| --- | --- |
| `AUTH_COOKIE_SECRET` | Secret acak minimal 32 karakter, berbeda dari contoh/kunci API |
| `PUBLIC_SITE_URL` | Origin produksi HTTPS tanpa garis miring terakhir |
| `SUPABASE_URL` | URL proyek Supabase, opsional jika memakai proyek bawaan |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key, opsional jika memakai proyek bawaan |

Redeploy setelah mengubah environment. Jika secret belum diisi, API menolak
autentikasi dengan HTTP 503; tidak ada secret default yang tidak aman.
Jangan mengganti secret rutin tanpa alasan: perubahan secret mengakhiri cookie
yang sudah diterbitkan. Preview Vercel memakai environment dan callback yang
sesuai; jangan mengarahkan verifikasi preview ke domain produksi tanpa sengaja.

## Konfigurasi Supabase Dashboard

1. Pada **Authentication → Sign In / Providers**, aktifkan Email dan konfirmasi
   email. Pendaftaran baru harus mengonfirmasi email sebelum masuk.
2. Pada **Authentication → URL Configuration**, isi **Site URL** dengan origin
   produksi. Tambahkan **Redirect URLs** untuk domain yang benar-benar digunakan:
   - `http://localhost:5174/auth/verify`
   - `http://localhost:5174/auth/verify?remember=1`
   - `https://DOMAIN-PRODUKSI/auth/verify`
   - `https://DOMAIN-PRODUKSI/auth/verify?remember=1`
3. Template **Confirm signup** bawaan dengan `{{ .ConfirmationURL }}` didukung.
   Supabase memvalidasi tautan lalu kembali ke halaman verifikasi dengan token
   di fragment. Halaman menghapus fragment, memvalidasi token melalui API,
   dan menukarnya menjadi cookie sesi. Tidak ada token yang disimpan di browser
   storage atau dikembalikan API kepada kode aplikasi.
4. Untuk template kustom, halaman juga menerima parameter `token_hash` dan
   `type=email`. Pertahankan `remember=1` jika menggunakan durasi 12 bulan.
   Gunakan template bawaan jika tidak memerlukan penyesuaian; implementasi
   ini tidak memakai flow PKCE atau kode OTP manual.
5. Konfigurasikan SMTP sendiri untuk penggunaan publik. Pengirim bawaan
   Supabase memiliki pembatasan penerima dan rate limit; email ke sembarang
   alamat belum tentu terkirim sebelum SMTP diatur.

Kunci publishable tidak bisa mengubah pengaturan Dashboard. Konfigurasi URL,
SMTP, dan kebijakan Auth harus diselesaikan oleh pengelola proyek.

## Durasi Sesi

- Default: 6 bulan kalender sejak sign-in atau verifikasi email berhasil.
- Remember me: 12 bulan kalender sejak sign-in atau verifikasi berhasil.
- Perhitungan bulan mempertahankan tanggal jika tersedia, atau memakai hari
  terakhir bulan tujuan. Contoh: 31 Agustus + 6 bulan berakhir pada akhir Februari.
- Deadline disimpan di cookie AES-256-GCM yang tidak dapat diubah pengguna
  tanpa membatalkan autentikasinya. API memeriksa deadline sebelum refresh.
- Access token tetap berumur pendek sesuai konfigurasi Supabase. Refresh token
  dipakai hanya oleh server, tidak memperpanjang deadline cookie.
- Browser yang sedang aktif memeriksa sesi berkala dan saat tab aktif kembali.
  Setelah deadline, tampilan diarahkan ke halaman masuk. Jika browser ditutup,
  sesi akan ditolak ketika aplikasi diakses lagi; tidak ada proses JavaScript
  yang berjalan pada browser yang tertutup.
- Ini adalah batas sesi **aplikasi ini**, bukan perubahan global masa hidup
  sesi Supabase. Cookie yang sudah kedaluwarsa tidak diterima meskipun sesi
  provider belum dibersihkan. Keluar manual mencoba mencabut sesi provider juga.
- Penghapusan data browser, revokasi, gangguan jaringan, dan kebijakan Supabase
  dapat mengakhiri akses lebih awal. Tidak ada jaminan browser mempertahankan
  cookie selama 6 atau 12 bulan jika pengguna menghapusnya.

## Keamanan Dan Batasan

- Cookie produksi memakai `__Host-`, `Secure`, `HttpOnly`, dan `SameSite=Lax`.
- Semua aksi API memakai POST JSON serta memeriksa same-origin untuk CSRF.
- Response API tidak di-cache dan tidak mengirim access/refresh token ke klien.
- Tautan konfirmasi dihapus dari address bar setelah diterima. Jangan mencatat
  cookie, password, token, atau URL verifikasi lengkap ke log.
- Validasi pengguna dilakukan melalui Supabase, bukan mempercayai data cookie
  atau metadata frontend sebagai bukti autentikasi.
- Supabase tetap mengatur kebijakan password, rate limit, SMTP, dan pencabutan.
- Jika nantinya progres dipindah ke database, tambahkan kebijakan RLS berdasarkan
  user ID dan akses data lewat endpoint yang memvalidasi sesi ini. Sistem akun
  ini belum memberikan penyimpanan progres cloud.
- Pemulihan kata sandi dan login sosial belum tersedia pada implementasi ini.

## Checklist Verifikasi

1. Daftar dengan alamat email yang kamu kontrol; buka link dari email terbaru.
2. Pastikan callback sukses dan tombol agenda membuka aplikasi sebagai akunmu.
3. Muat ulang halaman dan tutup/buka browser: akun tetap masuk jika cookie ada.
4. Keluar, lalu masuk dengan Remember me aktif/nonaktif; periksa Max-Age cookie.
5. Periksa gagal login, email belum terverifikasi, tautan lama, dan kirim ulang.
6. Uji refresh token dan deadline dengan clock terkontrol pada pengujian lokal,
   bukan dengan memperpanjang masa hidup JWT menjadi 6 atau 12 bulan.

Tidak ada akun uji nyata dibuat otomatis oleh implementasi ini. Pengiriman email
dan klik tautan nyata perlu diverifikasi menggunakan inbox milik pengelola.

## Workspace gabungan (21 Oktober 2026)

Entry point aplikasi akun kini tersedia dalam enam bahasa melalui `study/app.mjs`; `/auth/verify` tetap memakai halaman callback khusus. Nama lengkap dan pilihan Ingat saya tetap diteruskan ke API autentikasi. Halaman akun menambahkan reset/ganti kata sandi.

Progres kini dipisahkan per akun dan disinkronkan melalui `/api/workspace`. Token tetap di cookie HttpOnly; kode browser tidak menerima access/refresh token. Endpoint memverifikasi akun server, menolak origin lain, memvalidasi schema v3, dan memeriksa revisi melalui RPC `save_ruang_workspace`.

Jalankan seluruh `supabase-schema.sql` di Supabase Ruang untuk menyiapkan `ruang_workspaces`, RLS, dan RPC. Data tamu diimpor secara eksplisit dari halaman Akun. Tabel `study_data` dan akun Sela tidak dipindahkan otomatis.

Reset kata sandi dikirim melalui `/api/auth` dengan aksi `request-reset`. Callback menggunakan `/auth/verify` yang sama dengan konfirmasi email. Tautan recovery membuka `/akun?password-reset=1`; kata sandi diperbarui melalui sesi server dengan aksi `update-password`. Pastikan template, redirect allowlist, dan SMTP mendukung alur ini.

Suite API lokal memverifikasi cookie, isolasi akun, pemeriksaan origin, validasi data, dan konflik revisi dengan upstream tiruan. SQL produksi, pengiriman email, serta sinkronisasi akun nyata dua perangkat memerlukan pemeriksaan pemilik proyek setelah SQL diterapkan.


Pembaruan 23 Oktober 2026: deploy `supabase-schema.sql` terbaru (sama dengan migrasi bernomor) untuk menutup penulisan langsung dan memakai RPC privat yang memeriksa identitas/revisi. Dukungan lokal tidak membuktikan SMTP, CAPTCHA, rate limit atau JWT produksi; periksa gerbang rilis di `IMPLEMENTATION-2026-10-23.md`. Jangan mengaktifkan CAPTCHA provider sebelum integrasi token frontend/provider tersedia.
