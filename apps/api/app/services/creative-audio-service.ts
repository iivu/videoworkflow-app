import { inject } from '@adonisjs/core';
import type { Infer } from '@vinejs/vine/types';
import BusinessException from '#exceptions/business-exception';
import CreativeAudio from '#models/creative-audio';
import Voice from '#models/voice';
import { BailianAudioService, type BailianVoiceModel, isBailianVoiceModel } from '#services/bailian-audio-service';
import { isMinimaxiCloneModel, MinimaxiService } from '#services/minimaxi-service';
import type { CreativeAudioConfigOptions, listCreativeAudioValidator, synthesizeCreativeAudioValidator } from '#validators/creative-audio';

export type CreativeAudioProvider = 'bailian' | 'minimaxi';

export const BAILIAN_DEFAULT_CONFIGS = { format: 'mp3', sampleRate: 22050, volume: 50, rate: 1, pitch: 1 } as const;
export const MINIMAXI_DEFAULT_CONFIGS = { speed: 1, vol: 1, format: 'mp3', sampleRate: 32000, bitrate: 128000, channel: 1 } as const;

const BAILIAN_CONFIG_KEYS = new Set(['format', 'sampleRate', 'volume', 'rate', 'bitRate', 'pitch', 'enableSsml', 'languageHints']);
const MINIMAXI_CONFIG_KEYS = new Set(['speed', 'vol', 'emotion', 'format', 'sampleRate', 'bitrate', 'channel', 'subtitleEnable', 'pitch']);

export function buildCreativeAudioSynthesizeConfig(params: { provider: CreativeAudioProvider; model: string; configs?: CreativeAudioConfigOptions }) {
  const configs = removeUndefined(params.configs || {});
  const allowedKeys = params.provider === 'bailian' ? BAILIAN_CONFIG_KEYS : MINIMAXI_CONFIG_KEYS;
  if (Object.keys(configs).some((key) => !allowedKeys.has(key))) {
    throw new BusinessException('音频合成配置与 provider 不匹配');
  }

  if (params.provider === 'bailian') {
    if (!isBailianVoiceModel(params.model)) throw new BusinessException('语音合成模型与 provider 不匹配');
    return { ...BAILIAN_DEFAULT_CONFIGS, ...configs };
  }

  if (!isMinimaxiCloneModel(params.model)) throw new BusinessException('语音合成模型与 provider 不匹配');
  return { ...MINIMAXI_DEFAULT_CONFIGS, ...configs };
}

function removeUndefined(configs: CreativeAudioConfigOptions): CreativeAudioConfigOptions {
  return Object.fromEntries(Object.entries(configs).filter(([, value]) => value !== undefined));
}

/** 百炼音色约束：合成模型必须与生成音色的模型完全一致（qwen/cosyvoice 系列） */
export function assertBailianVoiceModelMatch(voiceModel: string, model: string) {
  if (voiceModel !== model) {
    throw new BusinessException('语音合成模型必须与音色所属模型一致');
  }
}

@inject()
export class CreativeAudioService {
  constructor(
    private readonly bailian: BailianAudioService,
    private readonly minimaxi: MinimaxiService,
  ) {}

  async synthesize(params: { userId: string; payload: Infer<typeof synthesizeCreativeAudioValidator> }) {
    const { provider, model, text, voiceId } = params.payload;
    const configs = buildCreativeAudioSynthesizeConfig({ provider, model, configs: params.payload.configs });
    let audioUrl: string;
    if (provider === 'bailian') {
      const voice = await Voice.query().where('voice_id', voiceId).first();
      if (!voice) throw new BusinessException('音色不存在');
      // 百炼限制：合成模型必须与生成音色的模型完全一致（qwen/cosyvoice 系列）
      assertBailianVoiceModelMatch(voice.model, model);
      const result = await this.bailian.synthesize({ model: model as BailianVoiceModel, text, voice: voiceId, ...configs });
      audioUrl = result.ossUrl;
    } else {
      const result = await this.minimaxi.synthesize({
        model,
        text,
        voiceSetting: { voiceId, speed: configs.speed, vol: configs.vol, pitch: configs.pitch, emotion: configs.emotion },
        audioSetting: { sampleRate: configs.sampleRate, bitrate: configs.bitrate, format: configs.format, channel: configs.channel },
        subtitleEnable: configs.subtitleEnable,
      });
      audioUrl = result.ossUrl;
    }
    return await CreativeAudio.create({ userId: params.userId, provider, model, voiceId, text, configs: JSON.stringify(configs), audioUrl });
  }

  async list(params: { userId: string; payload: Infer<typeof listCreativeAudioValidator> }) {
    const { page = 1, size = 20 } = params.payload;
    const paginated = await CreativeAudio.query().where('user_id', params.userId).orderBy('created_at', 'desc').paginate(page, size);
    return { meta: { total: paginated.total, currentPage: paginated.currentPage }, list: paginated.all() };
  }
}
