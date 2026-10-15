(() => {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  const verification = location.pathname === '/auth/verify';
  const signup = location.pathname === '/sign-up';
  const callback = {
    tokenHash: query.get('token_hash'),
    type: query.get('type'),
    accessToken: fragment.get('access_token'),
    refreshToken: fragment.get('refresh_token'),
    remember: query.get('remember') === '1',
  };
  const callbackError = fragment.has('error') || query.has('error');
  if (verification) history.replaceState(null, '', '/auth/verify' + (callback.remember ? '?remember=1' : ''));
  const title = document.getElementById('auth-title');
  const description = document.getElementById('auth-description');
  const content = document.getElementById('auth-content');
  const footer = document.getElementById('auth-footer');
  const message = document.getElementById('auth-message');
  const svg = accountAuth.svg;

  function showMessage(text, error = false) {
    message.textContent = text;
    message.dataset.error = String(error);
    message.setAttribute('role', error ? 'alert' : 'status');
    message.hidden = false;
  }

  function pendingEmail() {
    try { return sessionStorage.getItem('ruang-pending-email') || ''; } catch { return ''; }
  }

  function setHeading(heading, text, symbol) {
    title.textContent = heading;
    document.title = `${heading} — Ruang Belajar`;
    description.textContent = text;
    const symbolElement = document.getElementById('auth-symbol');
    if (verification) {
      symbolElement.hidden = false;
      symbolElement.innerHTML = svg(symbol);
    } else symbolElement?.remove();
  }

  function emailField() {
    return '<label class="auth-field" for="email">Email<input id="email" name="email" type="email" autocomplete="email" placeholder="nama@email.com" maxlength="254" required></label>';
  }

  function resendForm() {
    content.innerHTML = `<form class="auth-form" id="resend-form">${emailField()}<button class="auth-submit" type="submit">${svg('mail')}Kirim ulang tautan verifikasi</button></form>`;
    document.getElementById('email').value = pendingEmail();
    document.getElementById('resend-form').addEventListener('submit', async event => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button');
      button.disabled = true;
      try {
        await accountAuth.request('resend', { email: event.currentTarget.elements.email.value, remember: callback.remember });
        showMessage('Jika alamat ini memerlukan verifikasi, tautan baru akan dikirim. Periksa kotak masuk dan folder spam.');
      } catch (error) {
        showMessage(error.message || 'Email belum dapat dikirim. Coba lagi nanti.', true);
      } finally {
        button.disabled = false;
      }
    });
  }

  if (verification) {
    footer.innerHTML = 'Sudah terverifikasi? <a href="/sign-in">Masuk ke akun</a>';
    if (callback.accessToken || callback.tokenHash) {
      setHeading('Memverifikasi email', 'Tunggu sebentar, kami sedang memeriksa tautan verifikasi akunmu.', 'shield-check');
      accountAuth.request('verify', callback).then(() => {
        setHeading('Email terverifikasi', 'Akunmu sudah siap digunakan. Kamu juga sudah masuk di browser ini.', 'shield-check');
        content.innerHTML = '<a class="auth-submit" href="/">Buka agenda belajar</a>';
        try { sessionStorage.removeItem('ruang-pending-email'); } catch {}
        footer.textContent = 'Progres belajar tetap tersimpan secara lokal di browser.';
      }).catch(error => {
        setHeading('Tautan belum berhasil', 'Tautan mungkin sudah digunakan atau kedaluwarsa. Minta tautan verifikasi yang baru.', 'mail');
        showMessage(error.message, true);
        resendForm();
      });
    } else {
      setHeading('Periksa email kamu', 'Buka tautan dari Supabase di email untuk memverifikasi akun. Periksa folder spam jika email belum terlihat.', 'mail');
      resendForm();
      if (callbackError) showMessage('Tautan verifikasi ditolak atau sudah kedaluwarsa. Silakan minta tautan baru.', true);
      else if (!query.has('sent')) showMessage('Halaman ini belum menerima tautan verifikasi. Buka tautan dari email, bukan menyalinnya sebagian.');
    }
    return;
  }

  setHeading(signup ? 'Buat akun belajar' : 'Selamat datang kembali', signup ? 'Daftar dengan nama, email, dan kata sandi.' : 'Masuk dengan email dan kata sandi.');
  footer.innerHTML = signup ? 'Sudah punya akun? <a href="/sign-in">Masuk</a>' : 'Belum punya akun? <a href="/sign-up">Buat akun</a>';
  content.innerHTML = `<form class="auth-form" id="account-form">
    ${signup ? '<label class="auth-field" for="full-name">Nama lengkap<input id="full-name" name="fullName" autocomplete="name" placeholder="Nama lengkap kamu" minlength="2" maxlength="120" required></label>' : ''}
    ${emailField()}
    <label class="auth-field" for="password">Kata sandi<span class="auth-password"><input id="password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'Minimal 8 karakter' : 'Masukkan kata sandi'}" ${signup ? 'minlength="8"' : ''} maxlength="128" required><button type="button" id="toggle-password" aria-label="Tampilkan kata sandi" aria-pressed="false">${svg('eye')}</button></span></label>
    <label class="auth-remember"><input type="checkbox" name="remember">Remember me <span>· 12 bulan</span></label>
    <p class="auth-session-note">Sesi berakhir setelah 6 bulan, atau 12 bulan dengan Remember me.</p>
    <button class="auth-submit" type="submit">${svg(signup ? 'user-round' : 'log-in')}${signup ? 'Buat akun' : 'Masuk'}</button>
  </form>`;
  const toggle = document.getElementById('toggle-password');
  toggle.addEventListener('click', () => {
    const password = document.getElementById('password');
    const reveal = password.type === 'password';
    password.type = reveal ? 'text' : 'password';
    toggle.setAttribute('aria-label', reveal ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    toggle.setAttribute('aria-pressed', String(reveal));
    toggle.innerHTML = svg(reveal ? 'eye-off' : 'eye');
  });
  document.getElementById('account-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const email = form.elements.email.value.trim();
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    message.hidden = true;
    try {
      const result = await accountAuth.request(signup ? 'sign-up' : 'sign-in', {
        email,
        password: form.elements.password.value,
        fullName: signup ? form.elements.fullName.value.trim() : undefined,
        remember: form.elements.remember.checked,
      });
      form.elements.password.value = '';
      if (result.confirmationRequired) {
        try { sessionStorage.setItem('ruang-pending-email', email); } catch {}
        location.assign(`/auth/verify?sent=1${form.elements.remember.checked ? '&remember=1' : ''}`);
      } else location.assign('/');
    } catch (error) {
      showMessage(error.message || 'Periksa koneksi lalu coba lagi.', true);
      message.focus();
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });
  if (query.has('expired')) showMessage('Sesi telah berakhir. Silakan masuk kembali.');
  accountAuth.session().then(result => {
    if (result.user) location.replace('/');
  }).catch(() => {});
})();
