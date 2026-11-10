const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// shared не знает про сессию (это слой выше), поэтому реакцию на 401
// регистрирует верхний слой (features/auth-guard).
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(0, 'Не удалось связаться с сервером');
  }
  if (!res.ok) {
    // 401 на запрос с токеном — сессия истекла; без токена (логин) это обычная ошибка.
    if (res.status === 401 && token) unauthorizedHandler?.();
    const body = await res.json().catch(() => null);
    throw new ApiError(
      res.status,
      typeof body?.message === 'string' ? body.message : res.statusText,
    );
  }
  return res.json() as Promise<T>;
}
