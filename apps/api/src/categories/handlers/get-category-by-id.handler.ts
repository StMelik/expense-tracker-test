import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  CategoryRef,
  GetCategoryByIdQuery,
} from '../../contracts/categories.contracts';
import { PrismaService } from '../../prisma/prisma.service';

@QueryHandler(GetCategoryByIdQuery)
export class GetCategoryByIdHandler
  implements IQueryHandler<GetCategoryByIdQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCategoryByIdQuery): Promise<CategoryRef | null> {
    return this.prisma.category.findFirst({
      where: { id: query.id, userId: query.userId },
      select: { id: true },
    });
  }
}
