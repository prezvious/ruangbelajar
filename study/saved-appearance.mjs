import { withWorkspaceLock, workspaceStorage } from './repository.mjs';
import { getThemeTokens } from './themes.mjs';

export async function applySavedAppearance() {
  let settings = {};
  try {
    const hint = JSON.parse(localStorage.getItem('ruang.account.identity.v1'));
    const key =
      hint?.user?.id &&
      hint.expiresAt > Date.now() &&
      /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(hint.project)
        ? 'ruang.workspace.v3.' +
          new URL(hint.project).hostname +
          '.' +
          hint.user.id
        : 'ruang.workspace.v3.guest';
    await withWorkspaceLock(() => {
      settings = JSON.parse(workspaceStorage.getItem(key))?.settings || {};
    }, [key]);
  } catch {}
  const mode =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light';
  const tokens = getThemeTokens(settings.themeKey || 'olive', mode);
  for (const [key, value] of Object.entries(tokens))
    if (typeof value === 'string')
      document.documentElement.style.setProperty(
        '--' + key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()),
        value,
      );
  document.documentElement.style.colorScheme = mode;
  document.body.dataset.resolvedMode = mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', tokens.paper);
}
export function observeSavedAppearance() {
  window.addEventListener('storage', applySavedAppearance);
  matchMedia('(prefers-color-scheme: dark)').addEventListener(
    'change',
    applySavedAppearance,
  );
}
