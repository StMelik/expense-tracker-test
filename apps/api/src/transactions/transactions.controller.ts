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

type AuthedRequest = { user: { id: string } };

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body(new ZodValidationPipe(createTransactionSchema))
    dto: CreateTransactionDto,
  ) {
    return this.transactions.create(req.user.id, dto);
  }

  @Get()
  findAll(
    @Req() req: AuthedRequest,
    @Query(new ZodValidationPipe(listTransactionsQuerySchema))
    query: ListTransactionsQuery,
  ) {
    return this.transactions.findAll(req.user.id, query);
  }

  @Get(':id')
  findOne(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.transactions.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTransactionSchema))
    dto: UpdateTransactionDto,
  ) {
    return this.transactions.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.transactions.remove(req.user.id, id);
  }
}
