import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Prisma, Transaction } from '@prisma/client';
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

/**
 * Бизнес-логика транзакций (доходы и расходы пользователя).
 *
 * Все методы работают в границах одного пользователя: чужая транзакция
 * неотличима от несуществующей (404).
 */
@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Создаёт транзакцию пользователя.
   *
   * @param userId - идентификатор владельца (из JWT).
   * @param dto - провалидированные данные новой транзакции.
   * @returns созданная транзакция в формате ответа API.
   * @throws {NotFoundException} если категория не существует или принадлежит другому пользователю.
   */
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

  /**
   * Возвращает страницу транзакций пользователя с итогами за весь период.
   *
   * Период (UTC) задаётся `year` (весь год) или `year` + `month` (месяц);
   * без `year` берётся всё время. Порядок: `date desc, createdAt desc, id desc`.
   * `summary` считается по всему периоду, а не только по текущей странице.
   *
   * @param userId - идентификатор владельца (из JWT).
   * @param query - фильтр периода и пагинация (`year`, `month`, `page`, `limit`).
   * @returns `items` (страница), `summary` (доход, расход, баланс) и `pagination`.
   * @throws {PrismaClientKnownRequestError} при ошибке обращения к БД (проявляется как 500).
   */
  async findAll(
    userId: string,
    { year, month, page, limit }: ListTransactionsQuery,
  ): Promise<TransactionsListResponse> {
    // Период [from, to) в UTC: месяц целиком либо весь год.
    // Без year период не ограничивается (за всё время).
    const where: Prisma.TransactionWhereInput = { userId };
    if (year !== undefined) {
      const from = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
      const to = new Date(Date.UTC(month ? year : year + 1, month ?? 0, 1));
      where.date = { gte: from, lt: to };
    }

    const [rows, total, sums] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        // id — тай-брейк: без него порядок строк с равными ключами недетерминирован,
        // и записи могут дублироваться/пропадать на границе страниц.
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
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
      pagination: { page, limit, total },
    };
  }

  /**
   * Возвращает одну транзакцию пользователя по идентификатору.
   *
   * @param userId - идентификатор владельца (из JWT).
   * @param id - идентификатор транзакции.
   * @returns транзакция в формате ответа API.
   * @throws {NotFoundException} если транзакция не найдена или принадлежит другому пользователю.
   */
  async findOne(userId: string, id: string): Promise<TransactionResponse> {
    return this.toResponse(await this.getOwned(userId, id));
  }

  /**
   * Частично обновляет транзакцию пользователя.
   *
   * @param userId - идентификатор владельца (из JWT).
   * @param id - идентификатор транзакции.
   * @param dto - изменяемые поля (хотя бы одно).
   * @returns обновлённая транзакция в формате ответа API.
   * @throws {NotFoundException} если транзакция не найдена/чужая либо новая категория не найдена/чужая.
   */
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

  /**
   * Удаляет транзакцию пользователя.
   *
   * @param userId - идентификатор владельца (из JWT).
   * @param id - идентификатор транзакции.
   * @returns ничего (`void`).
   * @throws {NotFoundException} если транзакция не найдена или принадлежит другому пользователю.
   */
  async remove(userId: string, id: string): Promise<void> {
    await this.getOwned(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  /**
   * Проверяет, что категория существует и принадлежит пользователю.
   * Проверка идёт через CQRS: чужая категория неотличима от несуществующей.
   *
   * @param userId - идентификатор владельца.
   * @param categoryId - идентификатор проверяемой категории.
   * @returns ничего, если категория доступна пользователю.
   * @throws {NotFoundException} если категория не найдена или чужая.
   */
  private async assertCategory(userId: string, categoryId: string) {
    const category: CategoryRef | null = await this.queryBus.execute(
      new GetCategoryByIdQuery(userId, categoryId),
    );
    if (!category) throw new NotFoundException('Категория не найдена');
  }

  /**
   * Загружает транзакцию, принадлежащую пользователю.
   *
   * @param userId - идентификатор владельца.
   * @param id - идентификатор транзакции.
   * @returns запись Prisma `Transaction`.
   * @throws {NotFoundException} если транзакция не найдена или чужая.
   */
  private async getOwned(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!tx) throw new NotFoundException('Транзакция не найдена');
    return tx;
  }

  /**
   * Преобразует запись Prisma в формат ответа API
   * (`amount` Decimal → number, даты → ISO-строки).
   *
   * @param tx - запись `Transaction` из БД.
   * @returns транзакция в формате `TransactionResponse`.
   * @throws не выбрасывает исключений.
   */
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
