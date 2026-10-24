import { validateForm } from './forms.mjs';
import {
  LANGUAGES,
  getLocale,
  setLocale,
  onLocaleChange,
  t,
  applyDocumentLocale,
  message,
  messageText,
  LocalisedError,
} from './i18n.mjs';
import { esc } from './core.mjs';
import { requestJSON } from './http.mjs';
import {
  applySavedAppearance,
  observeSavedAppearance,
} from './saved-appearance.mjs';

const page = document.querySelector('#support-page'),
  verification = document.body.dataset.page === 'verify';
const query = new URLSearchParams(location.search),
  fragment = new URLSearchParams(location.hash.slice(1));
const callback = {
  tokenHash: query.get('token_hash'),
  type: query.get('type') || fragment.get('type'),
  accessToken: fragment.get('access_token'),
  refreshToken: fragment.get('refresh_token'),
  remember: query.get('remember') === '1',
};
const callbackError = fragment.has('error') || query.has('error');
if (verification)
  history.replaceState(
    null,
    '',
    '/auth/verify' + (callback.remember ? '?remember=1' : ''),
  );
let stage = callback.tokenHash || callback.accessToken ? 'wait' : 'check',
  notice = callbackError
    ? message('verify.rejected')
    : query.has('sent')
      ? null
      : message('verify.incomplete'),
  pending = false,
  email = '';
try {
  email = sessionStorage.getItem('ruang-pending-email') || '';
} catch {}
const text = (key) => esc(t(key));
function render() {
  const focused = document.activeElement;
  const focusEmail = focused?.name === 'email';
  const focusLanguage = focused?.id === 'support-language';
  const invalidEmail =
    page.querySelector('[name="email"]')?.getAttribute('aria-invalid') ===
    'true';
  applyDocumentLocale();
  applySavedAppearance();
  const code = document.body.dataset.errorCode === '403' ? '403' : '404';
  const heading = verification
    ? 'verify.' +
      {
        wait: 'waitTitle',
        check: 'checkTitle',
        success: 'successTitle',
        failed: 'failedTitle',
      }[stage]
    : 'errorPage.title' + code;
  document.title = t(heading) + ' — Ruang Belajar';
  page.innerHTML = `<div class="support-toolbar"><a href="/">${text('guide.back')}</a><label>${text('settings.language')}<select id="support-language">${LANGUAGES.map((l) => `<option value="${l.code}" lang="${l.code}" ${l.code === getLocale() ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label></div><h1>${text(heading)}</h1><p>${text(verification ? 'verify.' + { wait: 'waitText', check: 'checkText', success: 'successText', failed: 'failedText' }[stage] : 'errorPage.text' + code)}</p>${verification ? `${stage === 'success' ? `<a class="btn primary" href="/">${text('verify.open')}</a>` : stage === 'wait' ? '' : `<form novalidate id="resend-form"><label class="field">${text('cloud.email')}<input type="email" name="email" autocomplete="email" maxlength="254" value="${esc(email)}" required></label><button class="btn primary" type="submit" ${pending ? 'disabled aria-busy="true"' : ''}>${text(pending ? 'cloud.processing' : callback.type === 'recovery' ? 'account.sendReset' : 'verify.resend')}</button></form>`}<p id="support-message" role="${notice instanceof Error ? 'alert' : 'status'}" aria-live="polite">${notice ? esc(messageText(notice)) : ''}</p><p class="small">${text('verify.footer')}</p><a href="/sign-in">${text('cloud.login')}</a>` : ''}`;
  if (invalidEmail)
    page.querySelector('[name="email"]')?.setAttribute('aria-invalid', 'true');
  if (focusEmail)
    page.querySelector('[name="email"]')?.focus({ preventScroll: true });
  else if (focusLanguage)
    page.querySelector('#support-language')?.focus({ preventScroll: true });
}
page.addEventListener('change', (event) => {
  if (event.target.id === 'support-language') setLocale(event.target.value);
});
page.addEventListener('input', (event) => {
  if (event.target.name === 'email') email = event.target.value;
});
page.addEventListener('submit', async (event) => {
  if (event.target.id !== 'resend-form') return;
  event.preventDefault();
  if (pending) return;
  try {
    validateForm(event.target);
  } catch (error) {
    notice = error;
    render();
    return;
  }
  pending = true;
  notice = null;
  render();
  try {
    const result = await requestJSON('/api/auth', {
      action: callback.type === 'recovery' ? 'request-reset' : 'resend',
      email,
      remember: callback.remember,
    });
    if (result.sent !== true) throw new LocalisedError('error.cloudNetwork');
    notice = message(
      callback.type === 'recovery' ? 'account.resetSent' : 'verify.resent',
    );
  } catch (error) {
    notice = error;
  } finally {
    pending = false;
    render();
  }
});
onLocaleChange(render);
observeSavedAppearance();
render();
if (verification && stage === 'wait') {
  try {
    const result = await requestJSON('/api/auth', {
      action: 'verify',
      ...callback,
    });
    if (typeof result.user?.id !== 'string' || !result.user.id)
      throw new LocalisedError('error.cloudNetwork');
    if (callback.type === 'recovery')
      location.replace('/akun?password-reset=1');
    else {
      stage = 'success';
      notice = null;
      try {
        sessionStorage.removeItem('ruang-pending-email');
        localStorage.setItem('ruang.account.event.v1', String(Date.now()));
      } catch {}
      render();
    }
  } catch (error) {
    stage = 'failed';
    notice = error;
    render();
  }
}
