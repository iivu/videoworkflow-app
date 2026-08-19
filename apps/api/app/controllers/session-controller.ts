import type { HttpContext } from '@adonisjs/core/http';

import User from '#models/user';
import UserTransformer from '#transformers/user-transformer';
import { createSessionValidator } from '#validators/session';

export default class SessionController {
  async create(ctx: HttpContext) {
    const { username, password } = await ctx.request.validateUsing(createSessionValidator);
    const user = await User.verifyCredentials(username, password);
    await user.load((preloader) => preloader.load('role'));
    const token = await ctx.auth.use('jwt').generate(user);
    return ctx.ok({ ...token, user: await ctx.serialize.withoutWrapping(UserTransformer.transform(user)) });
  }

  async validate(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    await user.load((preloader) => preloader.load('role'));
    return ctx.ok(await ctx.serialize.withoutWrapping(UserTransformer.transform(user)));
  }
}
