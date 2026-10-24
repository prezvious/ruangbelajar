// Only the periodic background probe is leased. User edits, login and explicit
// refresh still reconcile immediately through the normal sync/CAS protocol.
export async function pollWorkspace(
  key,
  flush,
  {
    storage = globalThis.localStorage,
    locks = globalThis.navigator?.locks,
    now = Date.now,
  } = {},
) {
  const run = async () => {
    const stampKey = 'ruang.pollAt.' + key,
      time = now();
    try {
      const previous = Number(storage.getItem(stampKey));
      if (previous > 0 && previous <= time && time - previous < 55000) return;
      storage.setItem(stampKey, String(time));
    } catch {}
    return flush();
  };
  if (locks)
    return locks.request(
      'ruang.cloud.poll.' + key,
      { ifAvailable: true },
      (lock) => (lock ? run() : undefined),
    );
  return run();
}
