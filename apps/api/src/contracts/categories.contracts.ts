// Связь с модулем категорий для других модулей (через QueryBus).

// Queries
export class GetCategoryByIdQuery {
  constructor(
    public readonly userId: string,
    public readonly id: string,
  ) {}
}

// Результаты
export type CategoryRef = { id: string };
