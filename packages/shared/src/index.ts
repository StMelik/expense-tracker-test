import { z } from 'zod';

/** Тип транзакции: доход (`income`) или расход (`expense`). */
export const transactionTypeSchema = z.enum(['income', 'expense']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

/**
 * Схема создания транзакции: `amount` > 0, до 2 знаков после запятой, не более 9 999 999 999.99;
 * `description` до 255 символов (trim); `date` — ISO 8601 datetime; `categoryId` непустой.
 */
export const createTransactionSchema = z.object({
  amount: z
    .number()
    .positive()
    .max(9_999_999_999.99)
    .refine((v) => Math.round(v * 100) / 100 === v, {
      message: 'Не более 2 знаков после запятой',
    }),
  type: transactionTypeSchema,
  description: z.string().trim().max(255).optional(),
  date: z.string().datetime(),
  categoryId: z.string().min(1),
});
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

/** Схема частичного обновления транзакции: все поля опциональны, но нужно передать хотя бы одно. */
export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Нужно передать хотя бы одно поле',
  });
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;

/**
 * Схема query-параметров списка транзакций: `year` (1970–9999), `month` (1–12, только вместе с `year`),
 * `page` (по умолчанию 1, макс. 100000), `limit` (по умолчанию 10, макс. 100). Числа приводятся из строк.
 */
export const listTransactionsQuerySchema = z
  .object({
    year: z.coerce.number().int().min(1970).max(9999).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    // Верхняя граница защищает от переполнения Int32 в skip у Prisma.
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  })
  // month без year иначе молча игнорировался бы и отдавал данные за всё время.
  .refine((q) => q.month === undefined || q.year !== undefined, {
    message: 'month требует year',
    path: ['month'],
  });
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

/** Транзакция в ответе API: `amount` — number, даты — ISO-строки. */
export type TransactionResponse = {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  date: string;
  categoryId: string;
  createdAt: string;
};

/**
 * Ответ `GET /transactions`: `items` — текущая страница, `summary` — итоги по всему периоду (UTC),
 * `pagination` — номер страницы, размер и общее число записей.
 */
export type TransactionsListResponse = {
  items: TransactionResponse[];
  summary: { income: number; expense: number; balance: number };
  pagination: { page: number; limit: number; total: number };
};

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export type AuthResponse = {
  accessToken: string;
  user: { id: string; name: string; email: string };
};

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Ожидается HEX-цвет вида #RRGGBB')
    .optional(),
  icon: z.string().max(50).optional(),
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Нужно передать хотя бы одно поле',
  });
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

export type CategoryResponse = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
};
