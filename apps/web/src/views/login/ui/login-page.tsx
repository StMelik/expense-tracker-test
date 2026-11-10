import Link from 'next/link';

import { LoginForm } from '@/features/auth-login';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/ui';

export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Вход</CardTitle>
          <CardDescription>Войдите в свой аккаунт Expense Tracker</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Нет аккаунта?&nbsp;
          <Link href="/register" className="text-foreground underline underline-offset-4">
            Зарегистрироваться
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
