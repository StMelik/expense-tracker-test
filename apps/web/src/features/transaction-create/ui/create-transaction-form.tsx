'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createTransactionSchema, type CategoryResponse } from '@expense/shared';

import { ApiError } from '@/shared/api';
import { Button, Input, Label, Select } from '@/shared/ui';
import { createTransaction } from '../api/create-transaction';

// Поле date в форме — YYYY-MM-DD из <input type="date">; в ISO переводим при отправке.
const formSchema = createTransactionSchema.extend({
  date: z.string().min(1),
  description: z.string().trim().max(255).optional(),
});
type FormValues = z.infer<typeof formSchema>;

// Локальная дата пользователя (toISOString дал бы UTC и «вчера» ночью в часовых поясах восточнее).
const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type Props = {
  token: string;
  categories: CategoryResponse[];
  onCreated: () => void;
  onCancel: () => void;
};

export function CreateTransactionForm({ token, categories, onCreated, onCancel }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: 'expense', date: today(), categoryId: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await createTransaction(token, {
        ...values,
        description: values.description || undefined,
        date: new Date(`${values.date}T00:00:00.000Z`).toISOString(),
      });
      onCreated();
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Что-то пошло не так');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 grid gap-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="type">Тип</Label>
          <Select id="type" {...register('type')}>
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="amount">Сумма</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            inputMode="decimal"
            aria-invalid={!!errors.amount}
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-sm text-destructive">Введите сумму больше 0 (до 2 знаков)</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="categoryId">Категория</Label>
          <Select id="categoryId" aria-invalid={!!errors.categoryId} {...register('categoryId')}>
            <option value="">Выберите…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {errors.categoryId && <p className="text-sm text-destructive">Выберите категорию</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="date">Дата</Label>
          <Input id="date" type="date" aria-invalid={!!errors.date} {...register('date')} />
          {errors.date && <p className="text-sm text-destructive">Укажите дату</p>}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Описание</Label>
        <Input id="description" maxLength={255} {...register('description')} />
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}
