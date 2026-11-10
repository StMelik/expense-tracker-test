import type { AuthResponse } from '@expense/shared';

const KEY = 'expense.session';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveSession(session: AuthResponse): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // хранилище недоступно — сессия живёт только до перезагрузки
  }
  notify();
}

export function loadSession(): AuthResponse | null {
  try {
    const raw = readRaw();
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // noop
  }
  notify();
}

// --- Подписка для useSyncExternalStore: единый источник правды для всех компонентов ---

let cachedRaw: string | null | undefined;
let cachedSession: AuthResponse | null = null;

// Ссылка на объект должна быть стабильной между вызовами, пока данные не менялись.
export function getSessionSnapshot(): AuthResponse | null {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = loadSession();
  }
  return cachedSession;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  // 'storage' срабатывает при изменении сессии в другой вкладке
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
