import { errors, symbols } from '@adonisjs/auth';
import type { AuthClientResponse, GuardContract } from '@adonisjs/auth/types';
import type { HttpContext } from '@adonisjs/core/http';
import jwt, { type SignOptions } from 'jsonwebtoken';

export type JwtGuardUser<U> = {
  getId(): string | number | BigInt;

  getOriginal(): U;
};

export interface JwtUserProviderContract<U> {
  [symbols.PROVIDER_REAL_USER]: U;

  createUserForGuard(user: U): Promise<JwtGuardUser<U>>;

  findById(id: string | number | BigInt): Promise<JwtGuardUser<U> | null>;
}

export type JwtGuardOptions = {
  secret: string;
  options: SignOptions;
};

export class JwtGuard<UserProvider extends JwtUserProviderContract<unknown>> implements GuardContract<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
  #userProvider: UserProvider;
  #options: JwtGuardOptions;
  #ctx: HttpContext;

  declare [symbols.GUARD_KNOWN_EVENTS]: {};

  driverName: 'jwt' = 'jwt';

  authenticationAttempted: boolean = false;

  isAuthenticated: boolean = false;

  user?: UserProvider[typeof symbols.PROVIDER_REAL_USER];

  userId?: string | number;

  token?: string;

  constructor(userProvider: UserProvider, options: JwtGuardOptions, ctx: HttpContext) {
    this.#userProvider = userProvider;
    this.#options = options;
    this.#ctx = ctx;
  }

  /**
   * 生成 jwt token
   * @param user
   * @returns
   */
  async generate(user: UserProvider[typeof symbols.PROVIDER_REAL_USER]) {
    const providerUser = await this.#userProvider.createUserForGuard(user);
    const payload = { userId: providerUser.getId() };
    const token = jwt.sign(payload, this.#options.secret, this.#options.options);
    return { type: 'bearer', token };
  }

  async authenticate(): Promise<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
    if (this.authenticationAttempted) return await this.getUserOrFail();
    this.authenticationAttempted = true;
    const bearer = this.#ctx.request.header('authorization') || this.#ctx.request.input('authorization', '');
    if (!bearer) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Miss authorization field', {
        guardDriverName: this.driverName,
      });
    }
    const [, token] = bearer.split(' ');
    if (!token) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Miss token', {
        guardDriverName: this.driverName,
      });
    }
    const payload = jwt.verify(token, this.#options.secret);
    if (typeof payload !== 'object' || !('userId' in payload)) {
      throw new errors.E_UNAUTHORIZED_ACCESS('Invalid token#1', {
        guardDriverName: this.driverName,
      });
    }
    this.userId = payload.userId;
    this.token = token;
    this.isAuthenticated = true;
  }

  async check(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }

  async getUserOrFail(): Promise<UserProvider[typeof symbols.PROVIDER_REAL_USER]> {
    if (this.user) {
      return this.user;
    }
    // const cachedUser = await redis.get(`user:${this.userId!}`);
    // if (cachedUser) return (this.user = JSON.parse(cachedUser));
    const providerUser = await this.#userProvider.findById(this.userId!);
    if (!providerUser) {
      throw new errors.E_UNAUTHORIZED_ACCESS('User not found', {
        guardDriverName: this.driverName,
      });
    }
    this.user = providerUser.getOriginal();
    // await redis.setex(`user:${this.userId!}`, 30 * 24 * 60 * 60, JSON.stringify(this.user));
    return this.user;
  }

  async authenticateAsClient(user: UserProvider[typeof symbols.PROVIDER_REAL_USER], ..._args: any[]): Promise<AuthClientResponse> {
    const token = await this.generate(user);
    return {
      headers: {
        Authorization: `Bearer ${token.token}`,
      },
    };
  }
}
