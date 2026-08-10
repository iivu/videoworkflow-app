import type { AudioHistoryItem, ModelOption, VoiceOption } from './types';

export const MAX_TEXT_LENGTH = 2000;

export const MODEL_OPTIONS: ModelOption[] = [
  { label: 'speech-2.8-hd（高保真）', value: 'speech-2.8-hd' },
  { label: 'speech-2.8-turbo（极速生成）', value: 'speech-2.8-turbo' },
  { label: 'cosyvoice-2（情感丰富）', value: 'cosyvoice-2' },
];

export const EMOTION_OPTIONS: ModelOption[] = [
  { label: '自然', value: 'natural' },
  { label: '开心', value: 'happy' },
  { label: '温柔', value: 'gentle' },
  { label: '严肃', value: 'serious' },
  { label: '悲伤', value: 'sad' },
];

export const FORMAT_OPTIONS: ModelOption[] = [
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' },
];

export const MOCK_VOICES: VoiceOption[] = [
  { id: 'zhiran', name: '知然', description: '温和知性的女声，适合叙事与知识讲解', tags: ['女声', '叙事'] },
  { id: 'yunhao', name: '云浩', description: '沉稳磁性的男声，适合纪录片与资讯播报', tags: ['男声', '播报'] },
  { id: 'qingling', name: '青柠', description: '清亮活泼的女声，适合短视频与广告口播', tags: ['女声', '活泼'] },
  { id: 'moyan', name: '墨言', description: '低沉有质感的男声，适合有声书与电台', tags: ['男声', '磁性'] },
  { id: 'xiaotong', name: '小童', description: '天真可爱的童声，适合儿童故事与动画', tags: ['童声', '可爱'] },
  { id: 'wanwan', name: '婉婉', description: '柔美细腻的女声，适合情感文案与睡前故事', tags: ['女声', '温柔'] },
];

export const MOCK_HISTORY: AudioHistoryItem[] = [
  {
    id: 'mock-1',
    text: '夜幕降临，城市的灯火次第亮起。每一条街道都藏着故事，等待被温柔地讲述。',
    title: '城市夜话',
    voiceId: 'zhiran',
    voiceName: '知然',
    modelName: 'cosyvoice-2',
    createdAt: Date.now() - 1000 * 60 * 12,
    duration: 0,
  },
  {
    id: 'mock-2',
    text: '本周科技资讯：新一代人工智能助手正式发布，支持多模态交互，覆盖办公、创作与学习场景。',
    voiceId: 'yunhao',
    voiceName: '云浩',
    modelName: 'speech-2.8-turbo',
    createdAt: Date.now() - 1000 * 60 * 58,
    duration: 0,
  },
  {
    id: 'mock-3',
    text: '夏天就是要喝一杯冰爽的柠檬气泡水！清爽青柠，气泡十足，限时第二杯半价，快来尝鲜吧！',
    voiceId: 'qingling',
    voiceName: '青柠',
    modelName: 'speech-2.8-turbo',
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    duration: 0,
  },
  {
    id: 'mock-4',
    text: '他合上书本，望向窗外。雨声渐歇，远处的山峦在雾气中若隐若现，仿佛一幅未完成的水墨画。',
    voiceId: 'moyan',
    voiceName: '墨言',
    modelName: 'speech-2.8-hd',
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    duration: 0,
  },
].map((item) => ({ ...item, speechRate: 1, duration: estimateDuration(item.text) }));

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** 根据文本长度与语速估算音频时长（秒） */
export function estimateDuration(text: string, speechRate = 1) {
  let units = 0.4;
  for (const ch of text) {
    if (/\s/.test(ch)) units += 0.05;
    else if (/[，。！？；：,.!?;:]/.test(ch)) units += 0.3;
    else units += 0.18;
  }
  return Math.min(Math.max(units / speechRate, 1.5), 60);
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const TYPO_MAP: Record<string, string> = {
  帐号: '账号',
  帐户: '账户',
  按装: '安装',
  按排: '安排',
  做为: '作为',
  其它: '其他',
  名子: '名字',
  在次: '再次',
  以经: '已经',
  因该: '应该',
  时侯: '时候',
  编缉: '编辑',
};

/** Mock 错别字修正：基于常见错别字映射替换 */
export function fixTypos(text: string) {
  let result = text;
  let count = 0;
  for (const [wrong, right] of Object.entries(TYPO_MAP)) {
    const occurrences = result.split(wrong).length - 1;
    if (occurrences > 0) {
      result = result.split(wrong).join(right);
      count += occurrences;
    }
  }
  return { text: result, count };
}

/** Mock AI 润色：整理标点与空白，让文案更适合口播 */
export function polishCopy(text: string) {
  let result = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[,，、]{2,}/g, '，')
    .replace(/[.。]{2,}/g, '。')
    .replace(/[!！]{2,}/g, '！')
    .replace(/[?？]{2,}/g, '？')
    .replace(/\n{2,}/g, '\n')
    .trim();
  // 换行转成停顿标点，更适合朗读
  result = result.replace(/\n/g, '。').replace(/。{2,}/g, '。');
  // 保证结尾有终止标点
  if (result && !/[。！？.!?…~]$/.test(result)) result += '。';
  return result;
}

// ---------- Mock 音频合成：生成可播放的 WAV 提示音序列 ----------

const SAMPLE_RATE = 8000;

export function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  return hash;
}

function encodeWav(samples: Int16Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) view.setInt16(offset, samples[i], true);
  return buffer;
}

/** 根据文案、音色与语速合成一段可播放的 mock 音频，返回 blob URL */
export function createMockAudioUrl(text: string, voiceId: string, speechRate = 1) {
  const duration = estimateDuration(text, speechRate);
  const total = Math.floor(duration * SAMPLE_RATE);
  const samples = new Int16Array(total);
  const baseFreq = 160 + (hashString(voiceId) % 8) * 30;
  let cursor = 0;
  for (const ch of text) {
    if (cursor >= total) break;
    const isPause = /[，。！？；：,.!?;:\n]/.test(ch);
    const isBlank = /\s/.test(ch);
    const length = Math.floor((SAMPLE_RATE * (isPause ? 0.28 : 0.16)) / speechRate);
    if (!isPause && !isBlank) {
      const freq = baseFreq + ((ch.codePointAt(0) ?? 0) % 24) * 12;
      const count = Math.min(length, total - cursor);
      for (let i = 0; i < count; i++) {
        const envelope = Math.sin((Math.PI * i) / length);
        samples[cursor + i] = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * envelope * 0.35 * 32767;
      }
    }
    cursor += length + Math.floor((SAMPLE_RATE * 0.02) / speechRate);
  }
  return URL.createObjectURL(new Blob([encodeWav(samples, SAMPLE_RATE)], { type: 'audio/wav' }));
}
