import type { TransactionsListResponse } from '@expense/shared';

import { apiFetch } from '@/shared/api';

export function listTransactions(
  token: string,
  { page, limit }: { page: number; limit: number },
): Promise<TransactionsListResponse> {
  return apiFetch<TransactionsListResponse>(`/transactions?page=${page}&limit=${limit}`, {
    token,
  });
}
