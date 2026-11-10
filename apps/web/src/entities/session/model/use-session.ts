'use client';

import { useSyncExternalStore } from 'react';
import type { AuthResponse } from '@expense/shared';

import { getSessionSnapshot, subscribeSession } from './storage';

const noopSubscribe = () => () => {};

// На сервере и при гидратации сессии нет (localStorage — только в браузере),
// поэтому ready = false до первого клиентского рендера; так HTML не расходится.
export function useSession(): { session: AuthResponse | null; ready: boolean } {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, () => null);
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return { session, ready };
}
