// Связь с модулем транзакций для других модулей (через QueryBus).

// Queries
/**
 * Запрос: сколько транзакций относится к категории.
 * Обрабатывается `CountTransactionsByCategoryHandler` в модуле транзакций.
 */
export class CountTransactionsByCategoryQuery {
  /**
   * @param categoryId - идентификатор категории.
   */
  constructor(public readonly categoryId: string) {}
}
