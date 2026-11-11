import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
  type CreateTransactionDto,
  type ListTransactionsQuery,
  type UpdateTransactionDto,
} from '@expense/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TransactionsService } from './transactions.service';

/** Запрос после `JwtAuthGuard`: в `user.id` лежит идентификатор из JWT (`sub`). */
type AuthedRequest = { user: { id: string } };

/**
 * HTTP-слой транзакций: `/transactions`.
 * Все эндпоинты защищены `JwtAuthGuard` (иначе 401).
 */
@ApiTags('transactions')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Нет или невалиден JWT' })
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  /**
   * `POST /transactions` — создаёт транзакцию.
   *
   * @param req - запрос с авторизованным пользователем.
   * @param dto - тело запроса, провалидированное `createTransactionSchema`.
   * @returns созданная транзакция.
   * @throws {BadRequestException} 400 — тело не прошло Zod-валидацию.
   * @throws {UnauthorizedException} 401 — нет или невалиден JWT.
   * @throws {NotFoundException} 404 — категория не найдена или чужая.
   */
  @ApiOperation({ summary: 'Создать транзакцию' })
  @ApiResponse({ status: 201, description: 'Транзакция создана' })
  @ApiResponse({ status: 400, description: 'Тело запроса не прошло валидацию' })
  @ApiResponse({
    status: 404,
    description: 'Категория не найдена или принадлежит другому пользователю',
  })
  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createTransactionSchema))
    dto: CreateTransactionDto,
  ) {
    return this.transactions.create(req.user.id, dto);
  }

  /**
   * `GET /transactions` — страница транзакций с итогами за период.
   *
   * @param req - запрос с авторизованным пользователем.
   * @param query - query-параметры `year`, `month`, `page`, `limit`
   *   (валидируются `listTransactionsQuerySchema`).
   * @returns `{ items, summary, pagination }`.
   * @throws {BadRequestException} 400 — невалидные параметры (например, `month` без `year`).
   * @throws {UnauthorizedException} 401 — нет или невалиден JWT.
   */
  @ApiOperation({
    summary: 'Список транзакций с итогами за период',
    description:
      'Фильтр по year/month (UTC), без year — за всё время. Порядок: date desc, createdAt desc, id desc. summary считается по всему периоду, items — страница.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Ответ вида { items, summary: { income, expense, balance }, pagination: { page, limit, total } }',
  })
  @ApiResponse({
    status: 400,
    description: 'Невалидные параметры (например, month без year)',
  })
  @Get()
  findAll(
    @Req() req: AuthedRequest,
    @Query(new ZodValidationPipe(listTransactionsQuerySchema))
    query: ListTransactionsQuery,
  ) {
    return this.transactions.findAll(req.user.id, query);
  }

  /**
   * `GET /transactions/:id` — одна транзакция.
   *
   * @param req - запрос с авторизованным пользователем.
   * @param id - идентификатор транзакции из пути.
   * @returns найденная транзакция.
   * @throws {UnauthorizedException} 401 — нет или невалиден JWT.
   * @throws {NotFoundException} 404 — транзакция не найдена или чужая.
   */
  @ApiOperation({ summary: 'Получить транзакцию по id' })
  @ApiResponse({ status: 200, description: 'Транзакция найдена' })
  @ApiResponse({
    status: 404,
    description: 'Транзакция не найдена или принадлежит другому пользователю',
  })
  @Get(':id')
  findOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.transactions.findOne(req.user.id, id);
  }

  /**
   * `PATCH /transactions/:id` — частичное обновление транзакции.
   *
   * @param req - запрос с авторизованным пользователем.
   * @param id - идентификатор транзакции из пути.
   * @param dto - изменяемые поля, провалидированные `updateTransactionSchema`.
   * @returns обновлённая транзакция.
   * @throws {BadRequestException} 400 — пустое тело или невалидные поля.
   * @throws {UnauthorizedException} 401 — нет или невалиден JWT.
   * @throws {NotFoundException} 404 — транзакция или новая категория не найдена/чужая.
   */
  @ApiOperation({ summary: 'Частично обновить транзакцию' })
  @ApiResponse({ status: 200, description: 'Транзакция обновлена' })
  @ApiResponse({
    status: 400,
    description: 'Пустое тело или невалидные поля',
  })
  @ApiResponse({
    status: 404,
    description: 'Транзакция или новая категория не найдена/чужая',
  })
  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTransactionSchema))
    dto: UpdateTransactionDto,
  ) {
    return this.transactions.update(req.user.id, id, dto);
  }

  /**
   * `DELETE /transactions/:id` — удаляет транзакцию.
   *
   * @param req - запрос с авторизованным пользователем.
   * @param id - идентификатор транзакции из пути.
   * @returns пустой ответ со статусом 204.
   * @throws {UnauthorizedException} 401 — нет или невалиден JWT.
   * @throws {NotFoundException} 404 — транзакция не найдена или чужая.
   */
  @ApiOperation({ summary: 'Удалить транзакцию' })
  @ApiResponse({ status: 204, description: 'Транзакция удалена' })
  @ApiResponse({
    status: 404,
    description: 'Транзакция не найдена или принадлежит другому пользователю',
  })
  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.transactions.remove(req.user.id, id);
  }
}
