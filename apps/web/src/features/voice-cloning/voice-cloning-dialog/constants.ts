export const mediaKindOptions = [
  { label: '音频', value: 'audio' },
  { label: '视频', value: 'video' },
];

export const sourceModeOptions = [
  { label: '本地文件', value: 'file' },
  { label: '网络地址(URL)', value: 'url' },
];

export const providerOptions = [
  { label: '阿里云百炼', value: 'bailian' },
  { label: 'MiniMax', value: 'minimaxi' },
];

export const BAILIAN_MODELS = [
  'qwen-audio-3.0-tts-plus',
  'qwen-audio-3.0-tts-flash',
  'cosyvoice-v3.5-plus',
  'cosyvoice-v3.5-flash',
  'cosyvoice-v3-plus',
  'cosyvoice-v3-flash',
  'cosyvoice-v2',
] as const;
export const MINIMAXI_MODELS = ['speech-2.8-turbo', 'speech-2.8-hd'] as const;
export const MODEL_OPTIONS = { bailian: BAILIAN_MODELS, minimaxi: MINIMAXI_MODELS } as const;
