import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GetUserByEmailQuery,
  UserWithHash,
} from '../../contracts/users.contracts';
import { PrismaService } from '../../prisma/prisma.service';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler
  implements IQueryHandler<GetUserByEmailQuery>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserByEmailQuery): Promise<UserWithHash | null> {
    return this.prisma.user.findUnique({
      where: { email: query.email.toLowerCase() },
      select: { id: true, name: true, email: true, passwordHash: true },
    });
  }
}
