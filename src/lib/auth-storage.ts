// Browser retention is separate from authorization: Supabase still requires AAL2.
export const authStorageKey = 'careflow-auth-v2';
export const rememberedSessionKey = `${authStorageKey}-remembered`;
export const rememberDuration = 30 * 24 * 60 * 60 * 1000;
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionId(value: string): string | null {
  try {
    const token = JSON.parse(value).access_token;
    const claims = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')));
    return claims.aal === 'aal2' && typeof claims.session_id === 'string' ? claims.session_id : null;
  } catch { return null; }
}

export function createAuthStorage(tab: Store, device: Store, now = Date.now) {
  function remembered() {
    try {
      const value = JSON.parse(device.getItem(rememberedSessionKey) || 'null');
      return value && typeof value.sessionId === 'string' && Number.isFinite(value.expiresAt) ? value : null;
    } catch { return null; }
  }
  function forget() {
    for (const key of [authStorageKey, rememberedSessionKey]) {
      try { device.removeItem(key); } catch { /* Shared sessions still work when persistent storage is blocked. */ }
    }
  }
  return {
    expiresAt: () => remembered()?.expiresAt as number | undefined,
    getItem(key: string) {
      if (key !== authStorageKey) return tab.getItem(key);
      const trust = remembered();
      if (trust && trust.expiresAt <= now()) {
        device.removeItem(key); tab.removeItem(key);
        // Keep the deadline until sign-out so open tabs also expire.
        return null;
      }
      const value = trust ? device.getItem(key) : null;
      if (value && sessionId(value) === trust.sessionId) return value;
      return tab.getItem(key);
    },
    setItem(key: string, value: string) {
      const trust = remembered();
      if (key === authStorageKey && trust && trust.expiresAt <= now() && sessionId(value) === trust.sessionId) {
        // A refresh that started before the deadline must not resurrect the session.
        device.removeItem(key); tab.removeItem(key); return;
      }
      if (key === authStorageKey && trust && trust.expiresAt > now() && sessionId(value) === trust.sessionId) {
        device.setItem(key, value); tab.removeItem(key);
      } else {
        if (key === authStorageKey) forget();
        tab.setItem(key, value);
      }
    },
    removeItem(key: string) {
      tab.removeItem(key);
      if (key === authStorageKey) forget();
    },
    remember() {
      const value = this.getItem(authStorageKey);
      const id = value && sessionId(value);
      if (!id) throw new Error('Verify your authenticator before remembering this browser.');
      const existing = remembered();
      // Refreshes and repeat visits never move the original deadline.
      const expiresAt = existing?.sessionId === id ? existing.expiresAt : now() + rememberDuration;
      try {
        device.setItem(authStorageKey, value!);
        device.setItem(rememberedSessionKey, JSON.stringify({sessionId:id, expiresAt}));
        tab.removeItem(authStorageKey);
      } catch (error) { forget(); throw error; }
    },
  };
}

function browserStorage() {
  let device: Store;
  try { device = window.localStorage; }
  catch { device = {getItem:()=>null, removeItem:()=>{}, setItem:()=>{throw new Error('Persistent browser storage is unavailable.');}}; }
  return createAuthStorage(window.sessionStorage, device);
}
export const authStorage = {
  getItem: (key: string) => browserStorage().getItem(key),
  setItem: (key: string, value: string) => browserStorage().setItem(key, value),
  removeItem: (key: string) => browserStorage().removeItem(key),
};
export function rememberVerifiedSession() { browserStorage().remember(); }
export function rememberedUntil() { return browserStorage().expiresAt(); }
