// Единственная точка связи между модулями при работе с пользователями.
// Модули импортируют только этот файл, но не друг друга.

// Commands — меняют состояние (CommandBus)
export class CreateUserCommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly passwordHash: string,
  ) {}
}

// Queries — только чтение (QueryBus)
export class GetUserByEmailQuery {
  constructor(public readonly email: string) {}
}

export class GetUserByIdQuery {
  constructor(public readonly id: string) {}
}

// Events — факт случившегося (EventBus)
export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}

// Результаты
export type PublicUser = { id: string; name: string; email: string };
export type UserWithHash = PublicUser & { passwordHash: string };
