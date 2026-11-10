import type { CategoryResponse } from '@expense/shared';

import { apiFetch } from '@/shared/api';

export function listCategories(token: string): Promise<CategoryResponse[]> {
  return apiFetch<CategoryResponse[]>('/categories', { token });
}
