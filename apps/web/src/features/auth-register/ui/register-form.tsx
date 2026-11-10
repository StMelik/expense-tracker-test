'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerSchema } from '@expense/shared';

import { saveSession } from '@/entities/session';
import { ApiError } from '@/shared/api';
import { Button, Checkbox, Input, Label } from '@/shared/ui';
import { register as registerUser } from '../api/register';

// `agree` — только клиентское поле, на сервер не отправляется
const formSchema = registerSchema.extend({
  agree: z.literal(true, { errorMap: () => ({ message: 'agree' }) }),
});
type FormValues = z.input<typeof formSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { agree: false as unknown as true },
  });

  const onSubmit = handleSubmit(async ({ agree: _agree, ...values }) => {
    setServerError(null);
    try {
      saveSession(await registerUser(values));
      router.push('/');
    } catch (e) {
      setServerError(
        e instanceof ApiError && e.status === 409
          ? 'Пользователь с таким email уже существует'
          : e instanceof ApiError
            ? e.message
            : 'Что-то пошло не так',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Имя</Label>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">Введите имя</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className="text-sm text-destructive">Введите корректный email</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && <p className="text-sm text-destructive">Минимум 8 символов</p>}
      </div>
      <div className="grid gap-2">
        <div className="flex items-start gap-2">
          <Controller
            name="agree"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="agree"
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                onBlur={field.onBlur}
                aria-invalid={!!errors.agree}
                className="mt-0.5"
              />
            )}
          />
          <Label htmlFor="agree" className="inline text-sm leading-snug font-normal">
            Согласен с{' '}
            <Link
              href="/terms"
              target="_blank"
              className="text-foreground underline underline-offset-4"
            >
              пользовательским соглашением
            </Link>{' '}
            и{' '}
            <Link
              href="/privacy"
              target="_blank"
              className="text-foreground underline underline-offset-4"
            >
              политикой обработки данных
            </Link>
          </Label>
        </div>
        {errors.agree && (
          <p className="text-sm text-destructive">Необходимо принять условия</p>
        )}
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Создание…' : 'Зарегистрироваться'}
      </Button>
    </form>
  );
}
