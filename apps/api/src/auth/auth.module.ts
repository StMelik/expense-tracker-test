import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Модуль авторизации. Экспортирует `JwtModule` и `JwtAuthGuard`,
 * чтобы другие модули (в т. ч. транзакции) защищали эндпоинты через `@UseGuards(JwtAuthGuard)`.
 */
@Module({
  imports: [
    CqrsModule,
    JwtModule.registerAsync({
      /**
       * Собирает настройки JWT из окружения.
       *
       * @returns `secret` из `JWT_SECRET` и `expiresIn` из `JWT_EXPIRES_IN` (по умолчанию `1h`).
       * @throws {Error} если `JWT_SECRET` не задан (API не стартует).
       */
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is not set');
        return {
          secret,
          signOptions: {
            expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
