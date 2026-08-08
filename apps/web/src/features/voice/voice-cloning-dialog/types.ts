import type { VoiceCloningOpenPayload } from '#/shared/mitt';
import { createUuid } from '#/shared/uuid';

import { BAILIAN_MODELS, MINIMAXI_MODELS, MODEL_OPTIONS } from './constants';

export type VoiceCloneModel = (typeof BAILIAN_MODELS)[number] | (typeof MINIMAXI_MODELS)[number];
export type Provider = keyof typeof MODEL_OPTIONS;
export type MediaKind = 'audio' | 'video';
export type SourceMode = 'file' | 'url';
export type Draft = {
  mediaKind: MediaKind;
  sourceMode: SourceMode;
  provider: '' | Provider;
  model: string;
  selectedFile?: File[] | null;
  url?: string;
  languageHints?: string;
  maxPromptAudioLength?: string;
  enablePreprocess?: boolean;
  text?: string;
  languageBoost?: string;
  needNoiseReduction?: boolean;
  needVolumeNormalization?: boolean;
  aigcWatermark?: boolean;
};
export const EMPTY_DRAFT: Draft = {
  mediaKind: 'audio',
  sourceMode: 'file',
  selectedFile: null,
  url: '',
  provider: '',
  model: '',
  languageHints: 'zh',
  maxPromptAudioLength: '10.0',
  text: '来潮汕别只知道在市区里面逛哈。广东的最美村寨之一龙湖古寨，古香古色，非常原生态，还有汕头的陈思红故居，用900万银元打造的潮汕小故宫也非常值得一看。我是大麦，更多潮汕实用攻略记得关注我哟。',
  languageBoost: 'auto',
  enablePreprocess: true,
  needNoiseReduction: true,
  needVolumeNormalization: true,
  aigcWatermark: false,
};
export function createDraft(payload?: VoiceCloningOpenPayload): Draft {
  if (!payload) return { ...EMPTY_DRAFT };
  if (payload.audio) return { ...EMPTY_DRAFT, selectedFile: [payload.audio] };
  if (payload.video) return { ...EMPTY_DRAFT, mediaKind: 'video', selectedFile: [payload.video] };
  if (payload.audioUrl) return { ...EMPTY_DRAFT, sourceMode: 'url', url: payload.audioUrl };
  if (payload.videoUrl) return { ...EMPTY_DRAFT, mediaKind: 'video', sourceMode: 'url', url: payload.videoUrl };
  return { ...EMPTY_DRAFT };
}

export function createUploadKey(kind: MediaKind, filename: string) {
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, '_');
  return `voice-cloning/${kind}/${createUuid()}-${safeName}`;
}

export function isVoiceCloneModel(value: string): value is VoiceCloneModel {
  return [...BAILIAN_MODELS, ...MINIMAXI_MODELS].includes(value as VoiceCloneModel);
}
