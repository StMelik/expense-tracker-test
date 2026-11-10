import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Transaction } from '@prisma/client';
import type {
  CreateTransactionDto,
  ListTransactionsQuery,
  TransactionResponse,
  TransactionsListResponse,
  UpdateTransactionDto,
} from '@expense/shared';
import {
  CategoryRef,
  GetCategoryByIdQuery,
} from '../contracts/categories.contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResponse> {
    await this.assertCategory(userId, dto.categoryId);
    const created = await this.prisma.transaction.create({
      data: { ...dto, date: new Date(dto.date), userId },
    });
    return this.toResponse(created);
  }

  async findAll(
    userId: string,
    { year, month }: ListTransactionsQuery,
  ): Promise<TransactionsListResponse> {
    // Период [from, to) в UTC: месяц целиком либо весь год.
    const from = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
    const to = new Date(Date.UTC(month ? year : year + 1, month ?? 0, 1));
    const where = { userId, date: { gte: from, lt: to } };

    const [rows, sums] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
    ]);

    const sumOf = (type: 'income' | 'expense') =>
      Number(sums.find((s) => s.type === type)?._sum.amount ?? 0);
    const income = sumOf('income');
    const expense = sumOf('expense');

    return {
      items: rows.map((r) => this.toResponse(r)),
      summary: {
        income,
        expense,
        balance: Math.round((income - expense) * 100) / 100,
      },
    };
  }

  async findOne(userId: string, id: string): Promise<TransactionResponse> {
    return this.toResponse(await this.getOwned(userId, id));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionResponse> {
    await this.getOwned(userId, id);
    if (dto.categoryId) await this.assertCategory(userId, dto.categoryId);
    const updated = await this.prisma.transaction.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
    return this.toResponse(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  // Категория проверяется через CQRS: чужая неотличима от несуществующей.
  private async assertCategory(userId: string, categoryId: string) {
    const category: CategoryRef | null = await this.queryBus.execute(
      new GetCategoryByIdQuery(userId, categoryId),
    );
    if (!category) throw new NotFoundException('Категория не найдена');
  }

  private async getOwned(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!tx) throw new NotFoundException('Транзакция не найдена');
    return tx;
  }

  private toResponse(tx: Transaction): TransactionResponse {
    return {
      id: tx.id,
      amount: Number(tx.amount),
      type: tx.type,
      description: tx.description,
      date: tx.date.toISOString(),
      categoryId: tx.categoryId,
      createdAt: tx.createdAt.toISOString(),
    };
  }
}
