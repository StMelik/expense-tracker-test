import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './handlers/create-user.handler';
import { GetUserByEmailHandler } from './handlers/get-user-by-email.handler';
import { GetUserByIdHandler } from './handlers/get-user-by-id.handler';

@Module({
  imports: [CqrsModule],
  providers: [CreateUserHandler, GetUserByEmailHandler, GetUserByIdHandler],
})
export class UsersModule {}
