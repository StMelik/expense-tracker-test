import { ConflictException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@prisma/client';
import {
  CreateUserCommand,
  PublicUser,
  UserCreatedEvent,
} from '../../contracts/users.contracts';
import { PrismaService } from '../../prisma/prisma.service';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateUserCommand): Promise<PublicUser> {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: command.name,
          email: command.email.toLowerCase(),
          passwordHash: command.passwordHash,
        },
        select: { id: true, name: true, email: true },
      });
      this.eventBus.publish(new UserCreatedEvent(user.id, user.email));
      return user;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw e;
    }
  }
}
