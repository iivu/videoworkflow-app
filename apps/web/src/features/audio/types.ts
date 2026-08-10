export type BusyAction = 'polish' | 'typo' | 'generate' | null;

export type VoiceOption = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

export type ModelOption = {
  label: string;
  value: string;
};

export type AudioConfig = {
  /** 语速倍率 */
  speechRate: number;
  /** 音量 0-100 */
  volume: number;
  emotion: string;
  format: string;
  /** 音频标题，留空则自动生成 */
  title: string;
  bgm: boolean;
  autoplay: boolean;
};

export type AudioHistoryItem = {
  id: string;
  text: string;
  title?: string;
  voiceId: string;
  voiceName: string;
  modelName: string;
  createdAt: number;
  /** 生成时使用的语速倍率 */
  speechRate: number;
  /** 时长（秒） */
  duration: number;
  /** 懒生成，首次播放时合成 */
  audioUrl?: string;
};
