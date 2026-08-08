import { defineConfig } from '@adonisjs/auth';
import { tokensGuard, tokensUserProvider } from '@adonisjs/auth/access_tokens';
import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session';
import type { Authenticators, InferAuthEvents, InferAuthenticators } from '@adonisjs/auth/types';
import type { SignOptions } from 'jsonwebtoken';

import { JwtGuard } from '#guards/jwt-guard';
import env from '#start/env';

const jwtUserProvider = sessionUserProvider({
  model: () => import('#models/user'),
});

const authConfig = defineConfig({
  /**
   * Default guard used when no guard is explicitly specified.
   */
  default: 'jwt',

  guards: {
    /**
     * Token-based guard for stateless API authentication.
     */
    api: tokensGuard({
      provider: tokensUserProvider({
        tokens: 'accessTokens',
        model: () => import('#models/user'),
      }),
    }),

    /**
     * Session-based guard for browser authentication.
     */
    web: sessionGuard({
      /**
       * Enable persistent login using remember-me tokens.
       */
      useRememberMeTokens: false,

      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),
    jwt: (ctx) =>
      new JwtGuard(
        jwtUserProvider,
        {
          secret: env.get('JWT_SECRET_KEY'),
          options: {
            algorithm: env.get('JWT_ALGORITHM') as SignOptions['algorithm'],
            expiresIn: env.get('JWT_EXPIRES_AT') as SignOptions['expiresIn'],
          },
        },
        ctx,
      ),
  },
});

export default authConfig;

/**
 * Inferring types from the configured auth
 * guards.
 */
declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<Authenticators> {}
}
