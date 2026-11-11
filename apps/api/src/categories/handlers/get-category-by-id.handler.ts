import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  CategoryRef,
  GetCategoryByIdQuery,
} from '../../contracts/categories.contracts';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Handler запроса `GetCategoryByIdQuery`: ищет категорию среди категорий пользователя.
 * Используется модулем транзакций для проверки `categoryId`.
 */
@QueryHandler(GetCategoryByIdQuery)
export class GetCategoryByIdHandler
  implements IQueryHandler<GetCategoryByIdQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Находит категорию по `id` в границах пользователя.
   *
   * @param query - запрос с `userId` и `id` категории.
   * @returns `{ id }` найденной категории или `null`, если её нет либо она чужая.
   * @throws {PrismaClientKnownRequestError} при ошибке обращения к БД.
   */
  async execute(query: GetCategoryByIdQuery): Promise<CategoryRef | null> {
    return this.prisma.category.findFirst({
      where: { id: query.id, userId: query.userId },
      select: { id: true },
    });
  }
}
