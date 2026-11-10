import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { CountTransactionsByCategoryHandler } from './handlers/count-transactions-by-category.handler';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, CountTransactionsByCategoryHandler],
})
export class TransactionsModule {}
