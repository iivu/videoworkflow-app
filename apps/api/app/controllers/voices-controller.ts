import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { VoiceService } from '#services/voice-service';
import VideoToVoiceTaskTransformer from '#transformers/video-to-voice-task-transformer';
import VoiceTransformer from '#transformers/voice-transformer';
import { cloneAudioVoiceValidator, cloneVideoVoiceValidator, cloneVoiceTaskValidator, listCloneVoiceTasksValidator, listVoiceValidator } from '#validators/voice';

@inject()
export default class VoicesController {
  constructor(private readonly voiceService: VoiceService) {}

  async list(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listVoiceValidator);
    const result = await this.voiceService.list({ userId: user.id, payload });
    const serialized = result.source === 'user' ? await ctx.serialize.withoutWrapping(VoiceTransformer.transform(result.list)) : result.list;
    const list = serialized.map((voice) => ({ ...voice, source: result.source }));
    return ctx.ok({ meta: result.meta, list });
  }

  async cloneAudio(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(cloneAudioVoiceValidator);
    const voice = await this.voiceService.cloneAudio({ userId: user.id, payload });
    return ctx.ok(await ctx.serialize.withoutWrapping(VoiceTransformer.transform(voice)));
  }

  async cloneVideo(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(cloneVideoVoiceValidator);
    const task = await this.voiceService.cloneVideo({ userId: user.id, payload });
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoToVoiceTaskTransformer.transform(task)));
  }

  async cloneTask(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(cloneVoiceTaskValidator);
    const task = await this.voiceService.getCloneTask({ userId: user.id, id: payload.params.id });
    if (!task) return ctx.error('任务不存在');
    return ctx.ok(await ctx.serialize.withoutWrapping(VideoToVoiceTaskTransformer.transform(task)));
  }

  async listCloneTasks(ctx: HttpContext) {
    const user = await ctx.auth.getUserOrFail();
    const payload = await ctx.request.validateUsing(listCloneVoiceTasksValidator);
    const result = await this.voiceService.listCloneTasks({ userId: user.id, payload });
    return ctx.ok({ meta: result.meta, list: await ctx.serialize.withoutWrapping(VideoToVoiceTaskTransformer.transform(result.list)) });
  }
}
