import { randomUUID } from 'node:crypto';
import app from '@adonisjs/core/services/app';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import type { OssClient } from '#providers/oss-provider';
import env from '#start/env';
import { asRecord, type JsonRecord, optionalString } from '#utils/type-guards';

const API_PATH = '/api/v1/services/audio/tts';
const ENROLLMENT_MODELS = 'voice-enrollment' as const;
export const BAILIAN_VOICE_MODELS = [
  'qwen-audio-3.0-tts-plus',
  'qwen-audio-3.0-tts-flash',
  'cosyvoice-v3.5-plus',
  'cosyvoice-v3.5-flash',
  'cosyvoice-v3-plus',
  'cosyvoice-v3-flash',
  'cosyvoice-v2',
] as const;
export type BailianVoiceModel = (typeof BAILIAN_VOICE_MODELS)[number];

export type BailianCloneVoiceParams = {
  targetModel: BailianVoiceModel;
  prefix: string;
  audioUrl: string;
  languageHints?: string[];
  maxPromptAudioLength?: number;
  enablePreprocess?: boolean;
};

export type BailianSynthesizeParams = {
  model: BailianVoiceModel;
  text: string;
  voice: string;
  format?: 'mp3' | 'pcm' | 'wav' | 'opus';
  sampleRate?: number;
  volume?: number;
  rate?: number;
  bitRate?: number;
  pitch?: number;
  enableSsml?: boolean;
  languageHints?: string[];
  instruction?: string;
  enableAigcTag?: boolean;
  aigcPropagator?: string;
  aigcPropagateId?: string;
  key?: string;
};

function providerError(message: string): BusinessException {
  return new BusinessException(`阿里云百炼语音服务失败: ${message}`);
}

export class BailianVoiceService {
  protected async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return app.container.make('fetch');
  }

  protected async getOssClient(): Promise<OssClient> {
    return app.container.make('oss');
  }

  async cloneVoice(params: BailianCloneVoiceParams) {
    if (!/^[A-Za-z0-9]{1,10}$/.test(params.prefix)) throw providerError('prefix 格式无效');
    if (!isBailianVoiceModel(params.targetModel)) throw providerError('不支持的语音模型');
    const input: JsonRecord = {
      action: 'create_voice',
      target_model: params.targetModel,
      prefix: params.prefix,
      url: params.audioUrl,
      ...(params.languageHints !== undefined && { language_hints: params.languageHints }),
      ...(params.maxPromptAudioLength !== undefined && { max_prompt_audio_length: params.maxPromptAudioLength }),
      ...(params.enablePreprocess !== undefined && { enable_preprocess: params.enablePreprocess }),
    };
    const response = await (await this.getFetchClient()).json<unknown>(this.endpoint('/customization'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: ENROLLMENT_MODELS, input }),
    });
    const output = asRecord(asRecord(response)?.output);
    const voiceId = optionalString(output, 'voice_id');
    if (!voiceId) throw providerError('声音复刻响应格式无效');
    return { voiceId, targetModel: params.targetModel, requestId: optionalString(asRecord(response), 'request_id') || null };
  }

  async listVoices(params: { page: number; size: number }) {
    const response = await (await this.getFetchClient()).json<unknown>(this.endpoint('/customization'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: ENROLLMENT_MODELS, input: { action: 'list_voice', page_index: params.page - 1, page_size: params.size } }),
    });
    const output = asRecord(asRecord(response)?.output);
    const rawList = output?.voice_list;
    if (!Array.isArray(rawList)) throw providerError('音色列表响应格式无效');
    const list = rawList.flatMap((item) => {
      const record = asRecord(item);
      const voiceId = optionalString(record, 'voice_id') || optionalString(record, 'voice');
      if (!voiceId) return [];
      return [
        {
          provider: 'bailian' as const,
          model: optionalString(record, 'target_model') || 'voice-enrollment',
          voiceId,
          name: voiceId,
          demoUrl: null,
          createdAt: optionalString(record, 'gmt_create') || null,
          updatedAt: optionalString(record, 'gmt_modified') || null,
          status: optionalString(record, 'status') || null,
        },
      ];
    });
    const total = typeof output?.total_count === 'number' ? output.total_count : list.length;
    return { meta: { total, currentPage: params.page }, list };
  }

  async synthesize(params: BailianSynthesizeParams) {
    if (!isBailianVoiceModel(params.model)) throw providerError('不支持的语音模型');
    const input: JsonRecord = {
      text: params.text,
      voice: params.voice,
      ...(params.format !== undefined && { format: params.format }),
      ...(params.sampleRate !== undefined && { sample_rate: params.sampleRate }),
      ...(params.volume !== undefined && { volume: params.volume }),
      ...(params.rate !== undefined && { rate: params.rate }),
      ...(params.bitRate !== undefined && { bit_rate: params.bitRate }),
      ...(params.pitch !== undefined && { pitch: params.pitch }),
      ...(params.enableSsml !== undefined && { enable_ssml: params.enableSsml }),
      ...(params.languageHints !== undefined && { language_hints: params.languageHints }),
      ...(params.instruction !== undefined && { instruction: params.instruction }),
      ...(params.enableAigcTag !== undefined && { enable_aigc_tag: params.enableAigcTag }),
      ...(params.aigcPropagator !== undefined && { aigc_propagator: params.aigcPropagator }),
      ...(params.aigcPropagateId !== undefined && { aigc_propagate_id: params.aigcPropagateId }),
    };
    const response = await (await this.getFetchClient()).json<unknown>(this.endpoint('/SpeechSynthesizer'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: params.model, input }),
    });
    const output = asRecord(asRecord(response)?.output);
    const audio = asRecord(output?.audio);
    const remoteAudioUrl = optionalString(audio, 'url');
    if (!remoteAudioUrl) throw providerError('语音合成响应缺少音频地址');
    const format = params.format || 'mp3';
    const key = params.key || `audio/voice/${randomUUID()}.${format}`;
    const oss = await this.getOssClient();
    let ossResponse: Awaited<ReturnType<OssClient['putURL']>>;
    try {
      ossResponse = await oss.putURL(remoteAudioUrl, key);
    } catch (error) {
      throw providerError(`音频转存 OSS 失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    return {
      model: params.model,
      voice: params.voice,
      remoteAudioUrl,
      ossUrl: ossResponse.url,
      audioId: optionalString(audio, 'id') || null,
      expiresAt: typeof audio?.expires_at === 'number' ? audio.expires_at : null,
      requestId: optionalString(asRecord(response), 'request_id') || null,
    };
  }

  private endpoint(path: string) {
    return `https://${env.get('ALIYUN_BAILIAN_WORKSPACE_ID')}.cn-beijing.maas.aliyuncs.com${API_PATH}${path}`;
  }

  private headers() {
    return { Authorization: `Bearer ${env.get('ALIYUN_BAILIAN_KEY')}`, 'Content-Type': 'application/json' };
  }
}

export function isBailianVoiceModel(value: string): value is BailianVoiceModel {
  return (BAILIAN_VOICE_MODELS as readonly string[]).includes(value);
}
