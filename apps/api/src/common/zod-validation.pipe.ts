import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Pipe валидации данных запроса (body/query) Zod-схемой из `@expense/shared`.
 */
export class ZodValidationPipe implements PipeTransform {
  /**
   * @param schema - Zod-схема, по которой проверяется входное значение.
   */
  constructor(private readonly schema: ZodSchema) {}

  /**
   * Валидирует и преобразует значение схемой (coerce, default, trim и т. д.).
   *
   * @param value - исходное значение из запроса.
   * @returns разобранные данные `result.data`.
   * @throws {BadRequestException} если значение не прошло схему (в ответе — `error.flatten()`).
   */
  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
