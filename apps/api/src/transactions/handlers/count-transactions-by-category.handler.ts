import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CountTransactionsByCategoryQuery } from '../../contracts/transactions.contracts';
import { PrismaService } from '../../prisma/prisma.service';

@QueryHandler(CountTransactionsByCategoryQuery)
export class CountTransactionsByCategoryHandler
  implements IQueryHandler<CountTransactionsByCategoryQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  execute(query: CountTransactionsByCategoryQuery): Promise<number> {
    return this.prisma.transaction.count({
      where: { categoryId: query.categoryId },
    });
  }
}
