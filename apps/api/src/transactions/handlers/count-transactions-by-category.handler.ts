import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CountTransactionsByCategoryQuery } from '../../contracts/transactions.contracts';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Handler запроса `CountTransactionsByCategoryQuery`: считает транзакции категории.
 * Нужен модулю категорий, чтобы запретить удаление категории с транзакциями.
 */
@QueryHandler(CountTransactionsByCategoryQuery)
export class CountTransactionsByCategoryHandler
  implements IQueryHandler<CountTransactionsByCategoryQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Считает транзакции указанной категории (по всем пользователям).
   *
   * @param query - запрос с `categoryId`.
   * @returns количество транзакций в категории.
   * @throws {PrismaClientKnownRequestError} при ошибке обращения к БД.
   */
  execute(query: CountTransactionsByCategoryQuery): Promise<number> {
    return this.prisma.transaction.count({
      where: { categoryId: query.categoryId },
    });
  }
}
