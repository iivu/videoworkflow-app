import { createWriteStream, openAsBlob } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import app from '@adonisjs/core/services/app';
import { v4 as uuidv4 } from 'uuid';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import env from '#start/env';
import { asRecord, type JsonRecord, optionalArray, optionalString } from '#utils/type-guards';

const API_BASE_URL = env.get('MINIMAXI_BASE_URL');
export const MINIMAXI_CLONE_MODELS = ['speech-2.8-turbo', 'speech-2.8-hd'] as const;
export type MinimaxiCloneModel = (typeof MINIMAXI_CLONE_MODELS)[number];

export type MinimaxiCloneVoiceParams = {
  fileId: number;
  voiceId: string;
  text?: string;
  model: MinimaxiCloneModel;
  languageBoost?: string;
  needNoiseReduction?: boolean;
  needVolumeNormalization?: boolean;
  aigcWatermark?: boolean;
};

export type MinimaxiSynthesizeParams = {
  model: string;
  text: string;
  voiceSetting: {
    voiceId: string;
    speed?: number;
    vol?: number;
    pitch?: number;
    emotion?: string;
  };
  audioSetting?: {
    sampleRate?: number;
    bitrate?: number;
    format?: string;
    channel?: number;
  };
  pronunciationDict?: { tone?: string[] };
  subtitleEnable?: boolean;
};

export type MinimaxiBaseResponse = { statusCode: number; statusMsg?: string };

export type MinimaxiCloneVoiceResult = {
  voiceId: string;
  demoAudio: string | null;
  inputSensitive: unknown;
  extraInfo: Record<string, unknown> | null;
  baseResp: MinimaxiBaseResponse;
};

export type MinimaxiSynthesizeResult = {
  audio: string;
  status: number;
  traceId: string | null;
  extraInfo: Record<string, unknown> | null;
  baseResp: MinimaxiBaseResponse;
};

export type MinimaxiUploadedFile = { fileId: number };

function parseBaseResponse(response: unknown): { record: JsonRecord; baseResp: MinimaxiBaseResponse } {
  const record = asRecord(response);
  const base = asRecord(record?.base_resp);
  const statusCode = base?.status_code;
  if (!record || !base || typeof statusCode !== 'number') {
    throw new BusinessException('MiniMax 服务响应格式无效');
  }
  const statusMsg = optionalString(base, 'status_msg');
  const baseResp = { statusCode, ...(statusMsg !== undefined && { statusMsg }) };
  if (statusCode !== 0) {
    throw new BusinessException(`MiniMax 请求失败: ${baseResp.statusMsg || statusCode}`, statusCode);
  }
  return { record, baseResp };
}

export function isMinimaxiCloneModel(value: string): value is MinimaxiCloneModel {
  return (MINIMAXI_CLONE_MODELS as readonly string[]).includes(value);
}

export class MinimaxiService {
  protected async getFetchClient(): Promise<Pick<FetchClient, 'json' | 'formData'>> {
    return app.container.make('fetch');
  }

  async uploadCloneAudio(params: { file: Blob; filename: string }): Promise<MinimaxiUploadedFile> {
    const body = new FormData();
    body.append('purpose', 'voice_clone');
    body.append('file', params.file, params.filename);
    const response = await (await this.getFetchClient()).formData<unknown>(`${API_BASE_URL}/v1/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.get('MINIMAXI_API_KEY')}` },
      body,
    });
    const { record } = parseBaseResponse(response);
    const file = asRecord(record.file);
    const fileId = file?.file_id;
    if (typeof fileId !== 'number' || !Number.isSafeInteger(fileId)) {
      throw new BusinessException('MiniMaxi 音频上传响应格式无效');
    }
    return { fileId };
  }

  async uploadCloneAudioUrl(url: string): Promise<MinimaxiUploadedFile> {
    const stream = await (await app.container.make('fetch')).stream(url);
    const tempDir = app.tmpPath(`minimaxi-voice/${uuidv4()}`);
    const filePath = join(tempDir, 'voice-sample');
    let total = 0;
    const limited = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        total += chunk.byteLength;
        if (total >= 20 * 1024 * 1024) {
          controller.error(new BusinessException('音频文件必须小于 20MB'));
          return;
        }
        controller.enqueue(chunk);
      },
    });
    try {
      await mkdir(tempDir, { recursive: true });
      await pipeline(Readable.fromWeb(stream.pipeThrough(limited)), createWriteStream(filePath));
      const file = await openAsBlob(filePath, { type: 'audio/mpeg' });
      return await this.uploadCloneAudio({ file, filename: 'voice-sample' });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  async cloneVoice(params: MinimaxiCloneVoiceParams): Promise<MinimaxiCloneVoiceResult> {
    const body: JsonRecord = {
      file_id: params.fileId,
      voice_id: params.voiceId,
      ...(params.text !== undefined && { text: params.text }),
      ...(params.model !== undefined && { model: params.model }),
      ...(params.languageBoost !== undefined && { language_boost: params.languageBoost }),
      ...(params.needNoiseReduction !== undefined && { need_noise_reduction: params.needNoiseReduction }),
      ...(params.needVolumeNormalization !== undefined && { need_volume_normalization: params.needVolumeNormalization }),
      ...(params.aigcWatermark !== undefined && { aigc_watermark: params.aigcWatermark }),
    };
    const response = await (await this.getFetchClient()).json<unknown>(this.endpoint('/v1/voice_clone'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const { record, baseResp } = parseBaseResponse(response);
    return {
      voiceId: params.voiceId,
      demoAudio: optionalString(record, 'demo_audio') || null,
      inputSensitive: record.input_sensitive ?? null,
      extraInfo: asRecord(record.extra_info),
      baseResp,
    };
  }

  async listVoices(params: { page: number; size: number }) {
    const response = await (await this.getFetchClient()).json<unknown>(this.endpoint('/v1/get_voice'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.get('MINIMAXI_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_type: 'system' }),
    });
    const record = asRecord(response);
    const base = asRecord(record?.base_resp);
    if (base && typeof base.status_code === 'number' && base.status_code !== 0) {
      throw new BusinessException(`MiniMaxi 请求失败: ${optionalString(base, 'status_msg') || base.status_code}`);
    }
    const rawList = record?.system_voice ?? asRecord(record?.data)?.system_voice;
    if (!Array.isArray(rawList)) throw new BusinessException('MiniMax 音色列表响应格式无效');
    const pageList = rawList.flatMap((item) => {
      const voice = asRecord(item);
      const voiceId = optionalString(voice, 'voice_id') || optionalString(voice, 'voiceId');
      if (!voiceId) return [];
      return [
        {
          provider: 'minimaxi' as const,
          model: optionalString(voice, 'model') || 'speech-2.8-turbo',
          voiceId,
          description: optionalArray<string>(voice, 'description').join(';'),
          name: optionalString(voice, 'voice_name') || optionalString(voice, 'name') || voiceId,
          demoUrl: optionalString(voice, 'demo_audio') || null,
          createdAt: optionalString(voice, 'created_at') || null,
          updatedAt: optionalString(voice, 'updated_at') || null,
        },
      ];
    });
    const total = typeof record?.total === 'number' ? record.total : rawList.length;
    return { meta: { total, currentPage: params.page }, list: pageList };
  }

  async synthesize(params: MinimaxiSynthesizeParams): Promise<MinimaxiSynthesizeResult> {
    const voiceSetting = {
      voice_id: params.voiceSetting.voiceId,
      ...(params.voiceSetting.speed !== undefined && { speed: params.voiceSetting.speed }),
      ...(params.voiceSetting.vol !== undefined && { vol: params.voiceSetting.vol }),
      ...(params.voiceSetting.pitch !== undefined && { pitch: params.voiceSetting.pitch }),
      ...(params.voiceSetting.emotion !== undefined && { emotion: params.voiceSetting.emotion }),
    };
    const body: JsonRecord = {
      model: params.model,
      text: params.text,
      stream: false,
      voice_setting: voiceSetting,
      ...(params.audioSetting && {
        audio_setting: {
          ...(params.audioSetting.sampleRate !== undefined && { sample_rate: params.audioSetting.sampleRate }),
          ...(params.audioSetting.bitrate !== undefined && { bitrate: params.audioSetting.bitrate }),
          ...(params.audioSetting.format !== undefined && { format: params.audioSetting.format }),
          ...(params.audioSetting.channel !== undefined && { channel: params.audioSetting.channel }),
        },
      }),
      ...(params.pronunciationDict && { pronunciation_dict: { tone: params.pronunciationDict.tone } }),
      ...(params.subtitleEnable !== undefined && { subtitle_enable: params.subtitleEnable }),
    };
    const response = await (await this.getFetchClient()).json<unknown>(this.endpoint('/v1/t2a_v2'), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const { record, baseResp } = parseBaseResponse(response);
    const data = asRecord(record.data);
    const audio = optionalString(data, 'audio');
    const status = data?.status;
    if (!data || !audio || typeof status !== 'number') {
      throw new BusinessException('MiniMaxi 语音合成响应格式无效');
    }
    return {
      audio,
      status,
      traceId: optionalString(record, 'trace_id') || null,
      extraInfo: asRecord(record.extra_info),
      baseResp,
    };
  }

  private endpoint(path: string) {
    return `${API_BASE_URL}${path}?GroupId=${encodeURIComponent(env.get('MINIMAXI_GROUP_ID'))}`;
  }

  private headers() {
    return { Authorization: `Bearer ${env.get('MINIMAXI_API_KEY')}`, 'Content-Type': 'application/json' };
  }
}
