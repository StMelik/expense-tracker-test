import type { AuthResponse, RegisterDto } from '@expense/shared';
import { apiFetch } from '@/shared/api';

export const register = (dto: RegisterDto) =>
  apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(dto) });
