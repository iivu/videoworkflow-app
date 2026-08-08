import type { Infer } from '@vinejs/vine/types';
import { customAlphabet } from 'nanoid';
import BusinessException from '#exceptions/business-exception';
import VideoToVoiceJob, { QUEUE_NAME, VIDEO_TO_VOICE_TASK_STATUS } from '#jobs/video-to-voice-job';
import VideoToVoiceTask from '#models/video-to-voice-task';
import Voice from '#models/voice';
import { type BailianCloneVoiceParams, BailianVoiceService, isBailianVoiceModel } from '#services/bailian-voice-service';
import { isMinimaxiCloneModel, type MinimaxiCloneVoiceParams, MinimaxiService } from '#services/minimaxi-service';
import type { cloneAudioVoiceValidator, cloneVideoVoiceValidator, listVoiceValidator, VoiceCloneOptions } from '#validators/voice';

export type VoiceCloneProvider = 'bailian' | 'minimaxi';

type InternalVoiceCloneConfig = Omit<BailianCloneVoiceParams, 'audioUrl'> | Omit<MinimaxiCloneVoiceParams, 'fileId'>;

const BAILIAN_OPTION_KEYS = new Set(['languageHints', 'maxPromptAudioLength', 'enablePreprocess']);
const MINIMAXI_OPTION_KEYS = new Set(['text', 'languageBoost', 'needNoiseReduction', 'needVolumeNormalization', 'aigcWatermark']);
const ALPHANUMERIC_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const createBailianPrefix = customAlphabet(ALPHANUMERIC_ALPHABET, 10);
const createMinimaxiVoiceId = customAlphabet(ALPHANUMERIC_ALPHABET, 24);

export function buildVoiceCloneConfig(params: { provider: VoiceCloneProvider; model: string; config?: VoiceCloneOptions }): InternalVoiceCloneConfig {
  const config = removeUndefined(params.config || {});
  const allowedKeys = params.provider === 'bailian' ? BAILIAN_OPTION_KEYS : MINIMAXI_OPTION_KEYS;
  if (Object.keys(config).some((key) => !allowedKeys.has(key))) {
    throw new BusinessException('声音克隆配置与 provider 不匹配');
  }

  if (params.provider === 'bailian') {
    if (!isBailianVoiceModel(params.model)) throw new BusinessException('声音克隆模型与 provider 不匹配');
    return { ...config, targetModel: params.model, prefix: createBailianPrefix() } as Omit<BailianCloneVoiceParams, 'audioUrl'>;
  }

  if (!isMinimaxiCloneModel(params.model)) throw new BusinessException('声音克隆模型与 provider 不匹配');
  return { ...config, model: params.model, voiceId: createMinimaxiVoiceId() } as Omit<MinimaxiCloneVoiceParams, 'fileId'>;
}

function removeUndefined(config: VoiceCloneOptions): VoiceCloneOptions {
  return Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined));
}

export class VoiceService {
  constructor(
    private readonly bailian: BailianVoiceService,
    private readonly minimaxi: MinimaxiService,
  ) {}

  async list(params: { userId: string; payload: Infer<typeof listVoiceValidator> }) {
    const { source, provider, page = 1, size = 20 } = params.payload;
    if (source === 'user') {
      const paginated = await Voice.query().where('user_id', params.userId).orderBy('created_at', 'desc').paginate(page, size);
      return { meta: { total: paginated.total, currentPage: paginated.currentPage }, list: paginated.all(), source };
    }
    if (!provider) throw new BusinessException('查询系统音色时必须指定 provider');
    const list = provider === 'bailian' ? await this.bailian.listVoices({ page, size }) : await this.minimaxi.listVoices({ page, size });
    return { meta: list.meta, list: list.list, source };
  }

  async cloneAudio(params: { userId: string; payload: Infer<typeof cloneAudioVoiceValidator> }) {
    const sourceUrl = params.payload.audioUrl;
    const config = buildVoiceCloneConfig(params.payload);
    let result: { voiceId: string; model: string; demoUrl?: string | null };
    if (params.payload.provider === 'bailian') {
      const cloned = await this.bailian.cloneVoice({ ...(config as unknown as Omit<BailianCloneVoiceParams, 'audioUrl'>), audioUrl: sourceUrl });
      result = { voiceId: cloned.voiceId, model: cloned.targetModel, demoUrl: null };
    } else {
      const upload = await this.minimaxi.uploadCloneAudioUrl(sourceUrl);
      const cloned = await this.minimaxi.cloneVoice({ ...(config as unknown as Omit<MinimaxiCloneVoiceParams, 'fileId'>), fileId: upload.fileId });
      result = { voiceId: cloned.voiceId, model: params.payload.model, demoUrl: cloned.demoAudio };
    }
    return await Voice.create({
      userId: params.userId,
      provider: params.payload.provider,
      model: result.model,
      voiceId: result.voiceId,
      name: result.voiceId,
      config: JSON.stringify(config),
      demoUrl: result.demoUrl || null,
    });
  }

  async cloneVideo(params: { userId: string; payload: Infer<typeof cloneVideoVoiceValidator> }) {
    const videoUrl = params.payload.videoUrl;
    const config = buildVoiceCloneConfig(params.payload);
    const task = await VideoToVoiceTask.create({
      userId: params.userId,
      videoId: 0,
      provider: params.payload.provider,
      status: VIDEO_TO_VOICE_TASK_STATUS.PROCESSING,
      config: JSON.stringify(config),
    });
    try {
      await VideoToVoiceJob.dispatch({ taskId: task.id, videoUrl, userId: params.userId, provider: params.payload.provider, config }).toQueue(QUEUE_NAME);
    } catch (error) {
      await task.merge({ status: VIDEO_TO_VOICE_TASK_STATUS.FAILED, reason: error instanceof Error ? error.message.slice(0, 512) : String(error) }).save();
      throw error;
    }
    return task;
  }

  async getCloneTask(params: { userId: string; id: number }) {
    return await VideoToVoiceTask.query().where('id', params.id).where('user_id', params.userId).first();
  }
}
