import type { TransactionResponse } from '@expense/shared';

import { cn, formatDate, formatMoney } from '@/shared/lib';

type Props = {
  transaction: TransactionResponse;
  categoryName?: string;
  categoryColor?: string | null;
};

export function TransactionItem({ transaction, categoryName, categoryColor }: Props) {
  const isIncome = transaction.type === 'income';

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full bg-muted-foreground"
          style={categoryColor ? { backgroundColor: categoryColor } : undefined}
        />
        <div className="min-w-0">
          <p className="truncate font-medium">
            {transaction.description || categoryName || 'Без описания'}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {categoryName ?? 'Без категории'} · {formatDate(transaction.date)}
          </p>
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 font-medium tabular-nums',
          isIncome ? 'text-emerald-600' : 'text-foreground',
        )}
      >
        {isIncome ? '+' : '−'}
        {formatMoney(transaction.amount)}
      </span>
    </li>
  );
}
