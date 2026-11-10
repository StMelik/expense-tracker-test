import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { AuthResponse, LoginDto, RegisterDto } from '@expense/shared';
import {
  CreateUserCommand,
  GetUserByEmailQuery,
  GetUserByIdQuery,
  PublicUser,
  UserWithHash,
} from '../contracts/users.contracts';

@Injectable()
export class AuthService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user: PublicUser = await this.commandBus.execute(
      new CreateUserCommand(dto.name, dto.email, passwordHash),
    );
    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const found: UserWithHash | null = await this.queryBus.execute(
      new GetUserByEmailQuery(dto.email),
    );
    const valid =
      found && (await bcrypt.compare(dto.password, found.passwordHash));
    if (!found || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { passwordHash: _omit, ...user } = found;
    return this.issueToken(user);
  }

  async me(userId: string): Promise<PublicUser> {
    const user: PublicUser | null = await this.queryBus.execute(
      new GetUserByIdQuery(userId),
    );
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueToken(user: PublicUser): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return { accessToken, user };
  }
}
