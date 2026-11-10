import type { AuthResponse, LoginDto } from '@expense/shared';
import { apiFetch } from '@/shared/api';

export const login = (dto: LoginDto) =>
  apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(dto) });
