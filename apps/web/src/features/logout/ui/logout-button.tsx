'use client';

import { useRouter } from 'next/navigation';

import { clearSession } from '@/entities/session';
import { Button } from '@/shared/ui';

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        clearSession();
        router.replace('/login');
      }}
    >
      Выйти
    </Button>
  );
}
