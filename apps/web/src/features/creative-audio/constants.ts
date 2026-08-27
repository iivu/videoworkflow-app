import type { BailianAudioConfigs, MinimaxiAudioConfigs, ModelOption } from './types';

export const MAX_TEXT_LENGTH = 5000;

/** 与后端 bailian-audio-service.ts 的 BAILIAN_VOICE_MODELS 保持一致 */
export const BAILIAN_VOICE_MODELS = [
  'qwen-audio-3.0-tts-plus',
  'qwen-audio-3.0-tts-flash',
  'cosyvoice-v3.5-plus',
  'cosyvoice-v3.5-flash',
  'cosyvoice-v3-plus',
  'cosyvoice-v3-flash',
  'cosyvoice-v2',
] as const;

/** 与后端 minimaxi-service.ts 的 MINIMAXI_CLONE_MODELS 保持一致 */
export const MINIMAXI_CLONE_MODELS = ['speech-2.8-turbo', 'speech-2.8-hd'] as const;

export type AudioModelValue = (typeof BAILIAN_VOICE_MODELS)[number] | (typeof MINIMAXI_CLONE_MODELS)[number];

export const MODEL_OPTIONS: ModelOption[] = [
  { label: 'qwen-audio-3.0-tts-plus（千问高质量）', value: 'qwen-audio-3.0-tts-plus', provider: 'bailian' },
  { label: 'qwen-audio-3.0-tts-flash（千问极速）', value: 'qwen-audio-3.0-tts-flash', provider: 'bailian' },
  { label: 'cosyvoice-v3.5-plus（高保真）', value: 'cosyvoice-v3.5-plus', provider: 'bailian' },
  { label: 'cosyvoice-v3.5-flash（极速生成）', value: 'cosyvoice-v3.5-flash', provider: 'bailian' },
  { label: 'cosyvoice-v3-plus（情感丰富）', value: 'cosyvoice-v3-plus', provider: 'bailian' },
  { label: 'cosyvoice-v3-flash（轻量快速）', value: 'cosyvoice-v3-flash', provider: 'bailian' },
  { label: 'cosyvoice-v2（经典稳定）', value: 'cosyvoice-v2', provider: 'bailian' },
  { label: 'speech-2.8-hd（高保真）', value: 'speech-2.8-hd', provider: 'minimaxi' },
  { label: 'speech-2.8-turbo（极速生成）', value: 'speech-2.8-turbo', provider: 'minimaxi' },
];

export const EMOTION_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '高兴', value: 'happy' },
  { label: '悲伤', value: 'sad' },
  { label: '愤怒', value: 'angry' },
  { label: '害怕', value: 'fearful' },
  { label: '厌恶', value: 'disgusted' },
  { label: '惊讶', value: 'surprised' },
  { label: '平静', value: 'calm' },
  { label: '生动', value: 'fluent' },
  { label: '低语', value: 'whisper' },
];

/** 与后端 BAILIAN_DEFAULT_CONFIGS 对齐，UI 侧补齐可选字段的默认值 */
export const BAILIAN_DEFAULT_CONFIGS: BailianAudioConfigs = {
  sampleRate: 22050,
  volume: 50,
  rate: 1,
  bitRate: 128,
  pitch: 1,
  enableSsml: false,
  languageHints: [],
};

/** 百炼 language_hints 可选语言（与文档取值范围一致） */
export const LANGUAGE_HINT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '中文', value: 'zh' },
  { label: '英语', value: 'en' },
  { label: '法语', value: 'fr' },
  { label: '德语', value: 'de' },
  { label: '日语', value: 'ja' },
  { label: '韩语', value: 'ko' },
  { label: '俄语', value: 'ru' },
  { label: '葡萄牙语', value: 'pt' },
  { label: '泰语', value: 'th' },
  { label: '印尼语', value: 'id' },
  { label: '越南语', value: 'vi' },
  { label: '西班牙语', value: 'es' },
  { label: '意大利语', value: 'it' },
  { label: '马来西亚语', value: 'ms' },
  { label: '菲律宾语', value: 'fil' },
  { label: '阿拉伯语', value: 'ar' },
];

/** 与后端 MINIMAXI_DEFAULT_CONFIGS 对齐，UI 侧补齐可选字段的默认值 */
export const MINIMAXI_DEFAULT_CONFIGS: MinimaxiAudioConfigs = {
  sampleRate: 32000,
  speed: 1,
  vol: 1,
  emotion: 'calm',
  bitrate: 128000,
  channel: 1,
  subtitleEnable: false,
  pitch: 1,
};

export const BAILIAN_SAMPLE_RATE_OPTIONS = [8000, 16000, 22050, 24000, 44100, 48000];
export const MINIMAXI_SAMPLE_RATE_OPTIONS = [8000, 16000, 22050, 24000, 32000, 44100];
/** 百炼比特率选项（kbps，后端范围 6-510） */
export const BAILIAN_BIT_RATE_OPTIONS = [32, 64, 96, 128, 192, 256, 320];
/** Minimaxi 比特率选项（bps） */
export const MINIMAXI_BIT_RATE_OPTIONS = [32000, 64000, 128000, 256000];

export const CHANNEL_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '单声道', value: '1' },
  { label: '双声道', value: '2' },
];

export function providerOfModel(model: string): 'bailian' | 'minimaxi' {
  return (BAILIAN_VOICE_MODELS as readonly string[]).includes(model) ? 'bailian' : 'minimaxi';
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 容错解析后端记录上的 configs（JSON string） */
export function parseAudioConfigs(configs: string | null | undefined): Record<string, unknown> {
  if (!configs) return {};
  try {
    const parsed = JSON.parse(configs);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
