import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserByIdQuery, PublicUser } from '../../contracts/users.contracts';
import { PrismaService } from '../../prisma/prisma.service';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserByIdQuery): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id: query.id },
      select: { id: true, name: true, email: true },
    });
  }
}
