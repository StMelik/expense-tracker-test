import type { CreateTransactionDto, TransactionResponse } from '@expense/shared';

import { apiFetch } from '@/shared/api';

export const createTransaction = (token: string, dto: CreateTransactionDto) =>
  apiFetch<TransactionResponse>('/transactions', {
    method: 'POST',
    body: JSON.stringify(dto),
    token,
  });
