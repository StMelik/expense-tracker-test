'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { clearSession, useSession } from '@/entities/session';
import { setUnauthorizedHandler } from '@/shared/api';

export function RequireSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, ready } = useSession();

  // Нет сессии (или она очищена выходом / в другой вкладке) — на /login.
  useEffect(() => {
    if (ready && !session) router.replace('/login');
  }, [ready, session, router]);

  // Токен истёк: API ответил 401 — сбрасываем сессию, эффект выше сделает редирект.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, []);

  if (!ready || !session) return null;
  return <>{children}</>;
}
