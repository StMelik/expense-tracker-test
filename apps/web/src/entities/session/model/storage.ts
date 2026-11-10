import type { AuthResponse } from '@expense/shared';

const KEY = 'expense.session';

export function saveSession(session: AuthResponse): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // хранилище недоступно — сессия живёт только до перезагрузки
  }
}

export function loadSession(): AuthResponse | null {
  try {
    const raw = localStorage.getItem(KEY);
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
}
