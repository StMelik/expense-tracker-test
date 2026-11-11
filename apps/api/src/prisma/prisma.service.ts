import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma-клиент как провайдер NestJS: подключается к БД при старте модуля.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  /**
   * Открывает соединение с БД при инициализации модуля.
   *
   * @returns промис, который завершается после подключения.
   * @throws {PrismaClientInitializationError} если БД недоступна или `DATABASE_URL` неверен.
   */
  async onModuleInit() {
    await this.$connect();
  }
}
