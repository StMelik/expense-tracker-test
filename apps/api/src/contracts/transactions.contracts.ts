// Связь с модулем транзакций для других модулей (через QueryBus).

// Queries
export class CountTransactionsByCategoryQuery {
  constructor(public readonly categoryId: string) {}
}
