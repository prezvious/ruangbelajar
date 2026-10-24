import { assertCloudCapacity } from './learning-model.mjs';
import { LocalisedError, message } from './i18n.mjs';
import { requestJSON as request } from './http.mjs';
let project = globalThis.location?.origin || 'http://localhost',
  user = null,
  epoch = 0;
const listeners = new Set();
const IDENTITY_KEY = 'ruang.account.identity.v1';
function cacheIdentity(result) {
  try {
    if (result.user && Number.isFinite(result.expiresAt))
      localStorage.setItem(
        IDENTITY_KEY,
        JSON.stringify({
          user: result.user,
          project,
          expiresAt: result.expiresAt,
        }),
      );
    else localStorage.removeItem(IDENTITY_KEY);
  } catch {}
}
function cachedIdentity() {
  try {
    const hint = JSON.parse(localStorage.getItem(IDENTITY_KEY));
    if (
      hint &&
      typeof hint.user?.id === 'string' &&
      typeof hint.project === 'string' &&
      /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(hint.project) &&
      Number.isFinite(hint.expiresAt) &&
      hint.expiresAt > Date.now()
    )
      return hint;
  } catch {}
  return null;
}
export const getConfig = () => ({ url: project });
export async function refreshAuth() {
  const requestEpoch = epoch;
  try {
    const result = await request('/api/auth', { action: 'session' });
    if (epoch !== requestEpoch) return null;
    if (
      !result ||
      typeof result !== 'object' ||
      !Object.hasOwn(result, 'user') ||
      (result.user !== null &&
        (typeof result.user?.id !== 'string' || !result.user.id))
    )
      throw new LocalisedError('error.cloudNetwork');
    if (user?.id !== result.user?.id) epoch++;
    user = result.user || null;
    if (result.project) project = result.project.replace(/\/$/, '');
    cacheIdentity(result);
    for (const listener of listeners)
      listener({ user, project, event: 'SESSION' });
    return result;
  } catch (error) {
    if (epoch !== requestEpoch) return null;
    const hint = !user ? cachedIdentity() : null;
    if (hint) {
      epoch++;
      user = hint.user;
      project = hint.project;
      for (const listener of listeners)
        listener({ user, project, event: 'CACHED_SESSION' });
    }
    for (const listener of listeners)
      listener({ user, project, event: 'ERROR', error });
    return null;
  }
}
export function watchAuth(listener) {
  listeners.add(listener);
  refreshAuth();
  return () => listeners.delete(listener);
}
export function assertCurrentContext(context) {
  if (
    !context ||
    context.userId !== user?.id ||
    context.project !== project ||
    context.epoch !== epoch
  )
    throw new LocalisedError('error.accountChanged');
}
export async function checkContext(context) {
  assertCurrentContext(context);
  return context;
}
export async function load(knownRevision) {
  const before = epoch,
    id = user?.id;
  if (!id) throw new LocalisedError('error.cloudSignIn');
  let result;
  if (Number.isSafeInteger(knownRevision) && knownRevision > 0) {
    const probe = await request('/api/workspace', {
      action: 'revision',
      expectedUserId: id,
    });
    if (!Number.isSafeInteger(probe.revision) || probe.revision < 0)
      throw new LocalisedError('http.workspace');
    if (probe.context?.userId !== id || before !== epoch)
      throw new LocalisedError('error.accountChanged');
    if (probe.revision === knownRevision)
      result = { ...probe, notModified: true };
  }
  if (!result)
    result = await request('/api/workspace', {
      action: 'read',
      expectedUserId: id,
    });
  if (before !== epoch || result.context?.userId !== id)
    throw new LocalisedError('error.accountChanged');
  const context = { ...result.context, epoch: before };
  assertCurrentContext(context);
  return { ...result, context };
}
export async function save(data, revision, context) {
  assertCurrentContext(context);
  assertCloudCapacity(data);
  const result = await request('/api/workspace', {
    action: 'save',
    data,
    revision,
    expectedUserId: context.userId,
  });
  assertCurrentContext(context);
  if (result.context?.userId !== context.userId)
    throw new LocalisedError('error.accountChanged');
  return result.revision;
}
export async function signOut() {
  const result = await request('/api/auth', { action: 'sign-out' });
  epoch++;
  user = null;
  try {
    localStorage.removeItem(IDENTITY_KEY);
    localStorage.setItem('ruang.account.event.v1', String(Date.now()));
  } catch {}
  for (const listener of listeners)
    listener({ user: null, project, event: 'SIGNED_OUT' });
  return result;
}
export async function requestReset(email) {
  await request('/api/auth', { action: 'request-reset', email });
  return message('account.resetSent');
}
export async function updatePassword(password) {
  await request('/api/auth', { action: 'update-password', password });
  return message('account.passwordUpdated');
}
export async function authenticate(email, password, mode, fields = {}) {
  const result = await request('/api/auth', {
    action: mode === 'signup' ? 'sign-up' : 'sign-in',
    email,
    password,
    ...fields,
  });
  if (result.confirmationRequired) return message('cloud.confirmEmail');
  const session = await refreshAuth();
  if (!session?.user) throw new LocalisedError('error.cloudSignIn');
  try {
    localStorage.setItem('ruang.account.event.v1', String(Date.now()));
  } catch {}
  return message('cloud.signedIn', { email });
}
export function configure() {
  throw new LocalisedError('http.serverConfig');
}
globalThis.window?.addEventListener('storage', (e) => {
  if (e.key === 'ruang.account.event.v1' || e.key === null) {
    epoch++;
    refreshAuth();
  }
});
globalThis.window?.addEventListener('focus', () => refreshAuth());
if (globalThis.window)
  setInterval(() => {
    if (document.visibilityState !== 'hidden') refreshAuth();
  }, 60000);
