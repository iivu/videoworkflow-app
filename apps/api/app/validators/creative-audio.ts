import vine from '@vinejs/vine';
import type { Infer } from '@vinejs/vine/types';
import { BAILIAN_VOICE_MODELS } from '#services/bailian-audio-service';
import { MINIMAXI_CLONE_MODELS } from '#services/minimaxi-service';

export const creativeAudioConfigs = vine
  .object({
    format: vine.enum(['mp3', 'pcm', 'wav', 'opus'] as const).optional(),
    sampleRate: vine.number().positive().optional(),
    volume: vine.number().min(0).max(100).optional(),
    rate: vine.number().min(0.5).max(2).optional(),
    bitRate: vine.number().min(6).max(510).optional(),
    pitch: vine.number().optional(),
    enableSsml: vine.boolean().optional(),
    languageHints: vine.array(vine.string()).optional(),
    speed: vine.number().min(0.5).max(2).optional(),
    vol: vine.number().positive().optional(),
    emotion: vine.string().optional(),
    bitrate: vine.number().positive().optional(),
    channel: vine.number().positive().optional(),
    subtitleEnable: vine.boolean().optional(),
  })
  .optional();

export type CreativeAudioConfigOptions = NonNullable<Infer<typeof creativeAudioConfigs>>;

export const synthesizeCreativeAudioValidator = vine.create({
  provider: vine.enum(['bailian', 'minimaxi'] as const),
  model: vine.enum([...BAILIAN_VOICE_MODELS, ...MINIMAXI_CLONE_MODELS]),
  text: vine.string().trim().minLength(1),
  voiceId: vine.string().trim().minLength(1),
  configs: creativeAudioConfigs,
});

export const listCreativeAudioValidator = vine.create({
  page: vine.number().positive().optional(),
  size: vine.number().positive().optional(),
});
