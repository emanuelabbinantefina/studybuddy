// chiavi usate per salvare i dati nel browser (localStorage o sessionStorage)
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const REMEMBER_ME_KEY = 'auth_remember_me';

// controlla se in questo storage c'è già una sessione salvata
function storageHasSession(storage: Storage): boolean {
  return !!storage.getItem(AUTH_TOKEN_KEY) || !!storage.getItem(USER_DATA_KEY);
}

// capisce quale storage usare: prima guarda sessionStorage, poi localStorage,
// e se non c'è niente usa la preferenza "ricordami" per decidere.
// l'ordine non è casuale: sessionStorage ha priorità perché se l'utente ha
// scelto di NON essere ricordato, ma poi durante la stessa sessione qualcosa
// scrive, deve restare nello stesso "barattolo" temporaneo
function getActiveSessionStorage(): Storage {
  if (storageHasSession(sessionStorage)) return sessionStorage;
  if (storageHasSession(localStorage)) return localStorage;
  return getRememberMePreference() ? localStorage : sessionStorage;
}

// restituisce l'altro storage rispetto a quello attivo (serve per pulire quello inattivo)
function getInactiveSessionStorage(activeStorage: Storage): Storage {
  return activeStorage === localStorage ? sessionStorage : localStorage;
}

// legge la preferenza "ricordami" dal localStorage (è sempre lì, indipendentemente dalla sessione)
export function getRememberMePreference(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
}

export function setRememberMePreference(value: boolean): void {
  localStorage.setItem(REMEMBER_ME_KEY, value ? 'true' : 'false');
}

// cerca il token JWT prima in sessionStorage poi in localStorage,
// così funziona sia con "ricordami" attivo che no
export function getAuthToken(): string {
  return sessionStorage.getItem(AUTH_TOKEN_KEY)
    || localStorage.getItem(AUTH_TOKEN_KEY)
    || '';
}

// legge i dati utente salvati (nome, email, ecc.) e li deserializza dal JSON
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

// salva token e dati utente dopo login/registrazione.
// se rememberMe è true usa localStorage (persiste anche dopo aver chiuso il browser),
// altrimenti sessionStorage (si cancella alla chiusura della tab)
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

// aggiorna i dati utente nello storage attivo e pulisce quello inattivo
// (evita di avere dati duplicati o inconsistenti tra i due storage)
export function writeSessionUserData(user: any): void {
  const activeStorage = getActiveSessionStorage();
  const inactiveStorage = getInactiveSessionStorage(activeStorage);

  activeStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  inactiveStorage.removeItem(USER_DATA_KEY);
}

// pulizia totale: rimuove tutto sia da localStorage che da sessionStorage
// viene chiamata al logout o prima di salvare una nuova sessione
export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(USER_DATA_KEY);
}
