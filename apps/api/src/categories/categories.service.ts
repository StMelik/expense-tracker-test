import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import type { CreateCategoryDto, UpdateCategoryDto } from '@expense/shared';
import { GetUserByIdQuery, PublicUser } from '../contracts/users.contracts';
import { CountTransactionsByCategoryQuery } from '../contracts/transactions.contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async create(userId: string, dto: CreateCategoryDto) {
    // Владелец проверяется через CQRS, без прямой зависимости от UsersModule.
    const user: PublicUser | null = await this.queryBus.execute(
      new GetUserByIdQuery(userId),
    );
    if (!user) throw new UnauthorizedException();

    try {
      return await this.prisma.category.create({ data: { ...dto, userId } });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.getOwned(userId, id);
    try {
      return await this.prisma.category.update({ where: { id }, data: dto });
    } catch (e) {
      throw this.mapError(e);
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    const used: number = await this.queryBus.execute(
      new CountTransactionsByCategoryQuery(id),
    );
    if (used > 0) {
      throw new ConflictException('Категория используется в транзакциях');
    }
    await this.prisma.category.delete({ where: { id } });
  }

  // Чужая категория неотличима от несуществующей: не раскрываем чужие id.
  private async getOwned(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) throw new NotFoundException('Категория не найдена');
    return category;
  }

  private mapError(e: unknown): unknown {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException('Категория с таким именем уже существует');
    }
    return e;
  }
}
