import vine from '@vinejs/vine';
import type { Infer } from '@vinejs/vine/types';
import { BAILIAN_VOICE_MODELS } from '#services/bailian-audio-service';
import { MINIMAXI_CLONE_MODELS } from '#services/minimaxi-service';

export const listVoiceValidator = vine.create({
  source: vine.enum(['user', 'system'] as const),
  provider: vine.enum(['bailian', 'minimaxi'] as const).optional(),
  page: vine.number().positive().optional(),
  size: vine.number().positive().optional(),
});

export const voiceCloneConfig = vine
  .object({
    languageHints: vine.array(vine.string()).optional(),
    maxPromptAudioLength: vine.number().min(3).max(30).optional(),
    enablePreprocess: vine.boolean().optional(),
    text: vine.string().maxLength(1000).optional(),
    languageBoost: vine.string().optional(),
    needNoiseReduction: vine.boolean().optional(),
    needVolumeNormalization: vine.boolean().optional(),
    aigcWatermark: vine.boolean().optional(),
  })
  .optional();

export type VoiceCloneOptions = NonNullable<Infer<typeof voiceCloneConfig>>;

export const cloneAudioVoiceValidator = vine.create({
  provider: vine.enum(['bailian', 'minimaxi'] as const),
  model: vine.enum([...BAILIAN_VOICE_MODELS, ...MINIMAXI_CLONE_MODELS]),
  name: vine.string().trim().minLength(1).maxLength(128),
  audioUrl: vine.string().url(),
  config: voiceCloneConfig,
});

export const cloneVideoVoiceValidator = vine.create({
  provider: vine.enum(['bailian', 'minimaxi'] as const),
  model: vine.enum([...BAILIAN_VOICE_MODELS, ...MINIMAXI_CLONE_MODELS]),
  name: vine.string().trim().minLength(1).maxLength(128),
  videoUrl: vine.string().url(),
  config: voiceCloneConfig,
});

export const listCloneVoiceTasksValidator = vine.create({
  page: vine.number().positive().optional(),
  size: vine.number().positive().optional(),
});

export const cloneVoiceTaskValidator = vine.create({
  params: vine.object({ id: vine.number().positive().withoutDecimals() }),
});
