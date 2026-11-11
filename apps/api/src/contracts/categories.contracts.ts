// Связь с модулем категорий для других модулей (через QueryBus).

// Queries
/**
 * Запрос: найти категорию пользователя по идентификатору.
 * Обрабатывается `GetCategoryByIdHandler` в модуле категорий.
 */
export class GetCategoryByIdQuery {
  /**
   * @param userId - идентификатор владельца категории.
   * @param id - идентификатор категории.
   */
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {}
}

// Результаты
/** Минимальная ссылка на категорию: достаточно, чтобы подтвердить её существование. */
export type CategoryRef = { id: string };
