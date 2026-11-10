'use client';

import Link from 'next/link';

import { useSession } from '@/entities/session';
import { LogoutButton } from '@/features/logout';

const MENU = [
  { href: '/transactions', label: 'Транзакции' },
  { href: '/categories', label: 'Категории' },
];

export function Header() {
  const { session } = useSession();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            Expense Tracker
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            {MENU.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{session?.user.name}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
