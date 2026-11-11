import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Guard авторизации: требует заголовок `Authorization: Bearer <JWT>`
 * и кладёт идентификатор пользователя в `req.user.id`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Проверяет JWT из заголовка `Authorization`.
   *
   * @param context - контекст выполнения запроса.
   * @returns `true`, если токен валиден (`req.user = { id: sub }`).
   * @throws {UnauthorizedException} если заголовок отсутствует/не Bearer либо токен невалиден или просрочен.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const [type, token] = header?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
