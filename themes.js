(() => {
  const key = 'ruang-belajar-theme-v1';
  const names = ['olive', 'ocean', 'terracotta', 'plum'];
  let selected = 'olive';
  try {
    const stored = localStorage.getItem(key);
    if (names.includes(stored)) selected = stored;
  } catch {}

  function apply(value) {
    selected = names.includes(value) ? value : 'olive';
    document.documentElement.dataset.theme = selected;
    const control = document.getElementById('theme-select');
    if (control) control.value = selected;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = { olive: '#f8f9f5', ocean: '#f5f8fa', terracotta: '#faf7f3', plum: '#faf7fa' }[selected];
  }

  apply(selected);
  document.addEventListener('DOMContentLoaded', () => apply(selected));
  document.addEventListener('change', event => {
    if (event.target.id !== 'theme-select') return;
    apply(event.target.value);
    try { localStorage.setItem(key, selected); } catch {
      if (typeof notify === 'function') notify('Warna berubah, tetapi pilihan belum bisa disimpan di browser.');
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(event.newValue);
  });
})();
