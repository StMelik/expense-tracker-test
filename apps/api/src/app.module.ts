import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    TransactionsModule,
    CategoriesModule,
  ],
})
export class AppModule {}
