'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CategoryResponse, TransactionsListResponse } from '@expense/shared';

import { listCategories } from '@/entities/category';
import { listTransactions } from '@/entities/transaction';
import { ApiError } from '@/shared/api';

export const PAGE_SIZE = 10;

export function useRecentTransactions(token: string | undefined) {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<TransactionsListResponse | null>(null);
  const [categories, setCategories] = useState<Map<string, CategoryResponse>>(new Map());
  const [categoriesFailed, setCategoriesFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setCategoriesFailed(false);
    listCategories(token)
      .then((list) => setCategories(new Map(list.map((c) => [c.id, c]))))
      .catch(() => setCategoriesFailed(true));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listTransactions(token, { page, limit: PAGE_SIZE })
      .then((res) => !cancelled && setData(res))
      .catch(
        (e) =>
          !cancelled && setError(e instanceof ApiError ? e.message : 'Не удалось загрузить данные'),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, page, reloadKey]);

  // После создания возвращаемся на первую страницу и перезагружаем список.
  const reload = useCallback(() => {
    setPage(1);
    setReloadKey((k) => k + 1);
  }, []);

  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return { page, setPage, data, categories, categoriesFailed, error, loading, total, totalPages, reload };
}
