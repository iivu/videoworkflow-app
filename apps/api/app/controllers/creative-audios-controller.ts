import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { CreativeAudioService } from '#services/creative-audio-service';
import CreativeAudioTransformer from '#transformers/creative-audio-transformer';
import { listCreativeAudioValidator, synthesizeCreativeAudioValidator } from '#validators/creative-audio';

@inject()
export default class CreativeAudiosController {
  constructor(private readonly creativeAudioService: CreativeAudioService) {}

  async create(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(synthesizeCreativeAudioValidator);
    const audio = await this.creativeAudioService.synthesize({ userId: user.id, payload });
    return ctx.ok(await ctx.serialize.withoutWrapping(CreativeAudioTransformer.transform(audio)));
  }

  async list(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listCreativeAudioValidator);
    const result = await this.creativeAudioService.list({ userId: user.id, payload });
    const list = await ctx.serialize.withoutWrapping(CreativeAudioTransformer.transform(result.list));
    return ctx.ok({ meta: result.meta, list });
  }
}
