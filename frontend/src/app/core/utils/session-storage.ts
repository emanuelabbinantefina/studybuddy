const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const REMEMBER_ME_KEY = 'auth_remember_me';

function storageHasSession(storage: Storage): boolean {
  return !!storage.getItem(AUTH_TOKEN_KEY) || !!storage.getItem(USER_DATA_KEY);
}

function getActiveSessionStorage(): Storage {
  if (storageHasSession(sessionStorage)) return sessionStorage;
  if (storageHasSession(localStorage)) return localStorage;
  return getRememberMePreference() ? localStorage : sessionStorage;
}

function getInactiveSessionStorage(activeStorage: Storage): Storage {
  return activeStorage === localStorage ? sessionStorage : localStorage;
}

export function getRememberMePreference(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
}

export function setRememberMePreference(value: boolean): void {
  localStorage.setItem(REMEMBER_ME_KEY, value ? 'true' : 'false');
}

export function getAuthToken(): string {
  return sessionStorage.getItem(AUTH_TOKEN_KEY)
    || localStorage.getItem(AUTH_TOKEN_KEY)
    || '';
}

export function readSessionUserData<T = any>(): T | null {
  const raw =
    sessionStorage.getItem(USER_DATA_KEY)
    || localStorage.getItem(USER_DATA_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function persistAuthSession(
  response: { token?: string; user?: any },
  rememberMe: boolean
): void {
  if (!response?.token) return;

  clearAuthSession();
  setRememberMePreference(rememberMe);

  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(AUTH_TOKEN_KEY, response.token);

  if (response.user) {
    storage.setItem(USER_DATA_KEY, JSON.stringify(response.user));
  }
}

export function writeSessionUserData(user: any): void {
  const activeStorage = getActiveSessionStorage();
  const inactiveStorage = getInactiveSessionStorage(activeStorage);

  activeStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  inactiveStorage.removeItem(USER_DATA_KEY);
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(USER_DATA_KEY);
}
