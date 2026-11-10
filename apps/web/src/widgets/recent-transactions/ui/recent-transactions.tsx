'use client';

import { useState } from 'react';

import { useSession } from '@/entities/session';
import { TransactionItem } from '@/entities/transaction';
import { CreateTransactionForm } from '@/features/transaction-create';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import { PAGE_SIZE, useRecentTransactions } from '../model/use-recent-transactions';

export function RecentTransactions() {
  const { session } = useSession();
  const token = session?.accessToken;
  const [creating, setCreating] = useState(false);
  const {
    page,
    setPage,
    data,
    categories,
    categoriesFailed,
    error,
    loading,
    total,
    totalPages,
    reload,
  } = useRecentTransactions(token);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Последние транзакции</CardTitle>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            Добавить
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {creating && categoriesFailed && (
          <p role="alert" className="mb-6 rounded-lg border p-4 text-sm text-destructive">
            Не удалось загрузить категории. Обновите страницу и попробуйте снова.
          </p>
        )}
        {creating && !categoriesFailed && token && categories.size === 0 && (
          <p className="mb-6 rounded-lg border p-4 text-sm text-muted-foreground">
            Сначала создайте хотя бы одну категорию — транзакция привязывается к категории.
          </p>
        )}
        {creating && token && categories.size > 0 && (
          <CreateTransactionForm
            token={token}
            categories={[...categories.values()]}
            onCancel={() => setCreating(false)}
            onCreated={() => {
              setCreating(false);
              reload();
            }}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!error && loading && !data && <p className="text-sm text-muted-foreground">Загрузка…</p>}
        {!error && data && data.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Транзакций пока нет</p>
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y" aria-busy={loading}>
            {data.items.map((t) => (
              <TransactionItem
                key={t.id}
                transaction={t}
                categoryName={categories.get(t.categoryId)?.name}
                categoryColor={categories.get(t.categoryId)?.color}
              />
            ))}
          </ul>
        )}
        {data && total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Назад
            </Button>
            <span className="text-sm text-muted-foreground">
              Стр. {page} из {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Вперёд
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
