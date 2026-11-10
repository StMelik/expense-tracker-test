'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CategoryResponse, TransactionsListResponse } from '@expense/shared';

import { listCategories } from '@/entities/category';
import { listTransactions } from '@/entities/transaction';
import { ApiError } from '@/shared/api';

// Должен совпадать с дефолтным limit на сервере (listTransactionsQuerySchema).
export const PAGE_SIZE = 10;

export function useRecentTransactions(token: string | undefined) {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<TransactionsListResponse | null>(null);
  const [categories, setCategories] = useState<Map<string, CategoryResponse>>(new Map());
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoriesFailed, setCategoriesFailed] = useState(false);
  const [categoriesKey, setCategoriesKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setCategories(new Map());
    setCategoriesLoaded(false);
    setCategoriesFailed(false);
    listCategories(token)
      .then((list) => {
        if (cancelled) return;
        setCategories(new Map(list.map((c) => [c.id, c])));
        setCategoriesLoaded(true);
      })
      .catch(() => !cancelled && setCategoriesFailed(true));
    return () => {
      cancelled = true;
    };
  }, [token, categoriesKey]);

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

  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Если total уменьшился и текущая страница вышла за пределы — возвращаемся на последнюю.
  useEffect(() => {
    if (data && page > totalPages) setPage(totalPages);
  }, [data, page, totalPages]);

  // После создания возвращаемся на первую страницу и перезагружаем список.
  const reload = useCallback(() => {
    setPage(1);
    setReloadKey((k) => k + 1);
  }, []);

  const reloadCategories = useCallback(() => setCategoriesKey((k) => k + 1), []);

  return {
    page,
    setPage,
    data,
    categories,
    categoriesLoaded,
    categoriesFailed,
    reloadCategories,
    error,
    loading,
    total,
    totalPages,
    reload,
  };
}
