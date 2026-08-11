import type { Route } from '@tuyau/core/types';

export type BusyAction = 'generate' | null;

export type AudioProvider = 'bailian' | 'minimaxi';

/** 后端生成历史记录 */
export type CreativeAudioItem = Route.Response<'creative_audios.list'>['data']['list'][number];

/** 音色列表记录 */
export type VoiceItem = Route.Response<'voices.list'>['data']['list'][number];

export type ModelOption = {
  label: string;
  value: string;
  provider: AudioProvider;
};

/** 百炼合成配置，字段与后端 BAILIAN_CONFIG_KEYS 一一对齐 */
export type BailianAudioConfigs = {
  sampleRate: number;
  /** 音量 0-100 */
  volume: number;
  /** 语速 0.5-2 */
  rate: number;
  /** 比特率 kbps，6-510 */
  bitRate: number;
  /** 音调倍率 0.5-2 */
  pitch: number;
  enableSsml: boolean;
  /** 目标语言提示，空数组表示不指定（后端映射为 language_hints，仅首个元素生效） */
  languageHints: string[];
};

/** Minimaxi 合成配置，字段与后端 MINIMAXI_CONFIG_KEYS 一一对齐 */
export type MinimaxiAudioConfigs = {
  sampleRate: number;
  /** 语速 0.5-2 */
  speed: number;
  /** 音量倍率 0.1-3 */
  vol: number;
  emotion: string;
  /** 比特率 bps */
  bitrate: number;
  /** 声道数 1/2 */
  channel: number;
  subtitleEnable: boolean;
  /** 音调倍率 0.5-2 */
  pitch: number;
};
