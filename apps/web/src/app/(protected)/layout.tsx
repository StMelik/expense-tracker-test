import type { ReactNode } from 'react';

import { RequireSession } from '@/features/auth-guard';
import { Header } from '@/widgets/header';

// Общий каркас для страниц, доступных только после входа.
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSession>
      <Header />
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </RequireSession>
  );
}
