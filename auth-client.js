const accountAuth = (() => {
  let currentUser = null;
  let timer;
  let sessionRequest;
  let deadline = 0;

  function svg(name) {
    const body = iconSet.icons[name]?.body || '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  }

  async function request(action, fields = {}) {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, ...fields }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Layanan akun belum tersedia. Coba lagi nanti.');
    return data;
  }

  function showAccount(user) {
    const control = document.getElementById('account-control');
    if (!control) return;
    control.replaceChildren();
    if (!user) {
      const link = document.createElement('a');
      link.href = '/sign-in';
      link.innerHTML = `${svg('log-in')}<span>Masuk ke akun</span>`;
      control.append(link);
      return;
    }
    const copy = document.createElement('div');
    copy.className = 'account-copy';
    const name = document.createElement('strong');
    name.textContent = user.fullName || 'Akun belajar';
    const email = document.createElement('span');
    email.textContent = user.email;
    copy.append(name, email);
    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Keluar dari akun';
    button.setAttribute('aria-label', 'Keluar dari akun');
    button.innerHTML = svg('log-out');
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const result = await request('sign-out');
        if (result.warning) {
          currentUser = null;
          showAccount(null);
          if (typeof notify === 'function') notify(result.warning);
          return;
        }
        location.assign('/sign-in');
      } catch {
        button.disabled = false;
        if (typeof notify === 'function') notify('Belum berhasil keluar. Periksa koneksi dan coba lagi.');
      }
    });
    control.append(copy, button);
  }

  async function session() {
    if (sessionRequest) return sessionRequest;
    sessionRequest = request('session').then(data => {
      const previouslySignedIn = Boolean(currentUser);
      currentUser = data.user;
      showAccount(currentUser);
      deadline = data.expiresAt || 0;
      if (!currentUser && previouslySignedIn) location.assign('/sign-in?expired=1');
      return data;
    }).finally(() => {
      sessionRequest = null;
      clearTimeout(timer);
      if (currentUser) timer = setTimeout(() => {
        if (Date.now() >= deadline) {
          currentUser = null;
          request('sign-out').catch(() => {});
          location.assign('/sign-in?expired=1');
        } else session().catch(() => {});
      }, Math.max(1000, Math.min(60000, deadline - Date.now())));
    });
    return sessionRequest;
  }

  if (document.getElementById('account-control')) session().catch(() => {
    showAccount(null);
    const control = document.getElementById('account-control');
    if (control) control.title = 'Layanan akun belum dapat dihubungi. Klik untuk mencoba masuk.';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentUser) session().catch(() => {});
  });
  return { request, session, svg };
})();
