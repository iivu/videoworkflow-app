import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import type { OssClient } from '#providers/oss-provider';
import { MinimaxiService } from '#services/minimaxi-service';
import env from '#start/env';

type Request = { input: unknown; init?: Parameters<FetchClient['json']>[1] };

class TestMinimaxiService extends MinimaxiService {
  readonly requests: Request[] = [];
  readonly uploads: Array<{ url: string; key: string }> = [];

  constructor(
    private readonly responses: unknown[],
    private readonly ossError = false,
  ) {
    super();
  }

  protected override async getFetchClient(): Promise<Pick<FetchClient, 'json' | 'formData'>> {
    return {
      json: async <T>(input: unknown, init?: Parameters<FetchClient['json']>[1]) => {
        this.requests.push({ input, init });
        const response = this.responses.shift();
        if (response instanceof Error) throw response;
        return response as T;
      },
      formData: async <T>() => {
        const response = this.responses.shift();
        if (response instanceof Error) throw response;
        return response as T;
      },
    };
  }

  protected override async getOssClient(): Promise<OssClient> {
    return {
      putURL: async (url, key) => {
        this.uploads.push({ url, key });
        if (this.ossError) throw new Error('oss unavailable');
        return { url: `https://cdn.example.com/${key}`, name: key, res: {} as never };
      },
      putStream: async () => ({ url: '', name: '', res: {} as never }),
      delete: async () => undefined,
    };
  }
}

async function caught(promise: Promise<unknown>) {
  return promise.catch((error) => error);
}

test.group('Minimaxi service', () => {
  test('clones a voice with the expected request and response projection', async ({ assert }) => {
    const service = new TestMinimaxiService([
      {
        demo_audio: 'https://cdn.example.com/demo.mp3',
        input_sensitive: { type: 0 },
        extra_info: { audio_size: 123 },
        base_resp: { status_code: 0, status_msg: 'success' },
      },
    ]);

    const result = await service.cloneVoice({
      fileId: 123,
      voiceId: 'Voice_123',
      text: '试听',
      model: 'speech-2.8-hd',
      languageBoost: 'auto',
      needNoiseReduction: true,
      needVolumeNormalization: false,
      aigcWatermark: true,
    });

    assert.deepEqual(result, {
      voiceId: 'Voice_123',
      demoAudio: 'https://cdn.example.com/demo.mp3',
      inputSensitive: { type: 0 },
      extraInfo: { audio_size: 123 },
      baseResp: { statusCode: 0, statusMsg: 'success' },
    });
    assert.equal(String(service.requests[0].input), `https://api.minimaxi.com/v1/voice_clone?GroupId=${env.get('MINIMAXI_GROUP_ID')}`);
    assert.deepEqual(service.requests[0].init?.headers, {
      Authorization: `Bearer ${env.get('MINIMAXI_API_KEY')}`,
      'Content-Type': 'application/json',
    });
    assert.deepEqual(JSON.parse(String(service.requests[0].init?.body)), {
      file_id: 123,
      voice_id: 'Voice_123',
      text: '试听',
      model: 'speech-2.8-hd',
      language_boost: 'auto',
      need_noise_reduction: true,
      need_volume_normalization: false,
      aigc_watermark: true,
    });
  });

  test('uploads clone audio as multipart form data and returns file id', async ({ assert }) => {
    const service = new TestMinimaxiService([{ file: { file_id: 987 }, base_resp: { status_code: 0 } }]);
    const result = await service.uploadCloneAudio({ file: new Blob(['audio']), filename: 'sample.wav' });
    assert.deepEqual(result, { fileId: 987 });
  });

  test('synthesizes non-streaming audio, transfers the audio URL to OSS and maps metadata', async ({ assert }) => {
    const service = new TestMinimaxiService([
      {
        data: { audio: 'https://minimax.example.com/audio.mp3', status: 2 },
        trace_id: 'trace-1',
        extra_info: { audio_length: 100 },
        base_resp: { status_code: 0 },
      },
    ]);

    const result = await service.synthesize({
      model: 'speech-2.8-turbo',
      text: '你好',
      voiceSetting: { voiceId: 'Voice_123', speed: 1.1 },
      audioSetting: { format: 'mp3', sampleRate: 32000 },
    });

    assert.deepEqual(result, {
      audio: 'https://minimax.example.com/audio.mp3',
      ossUrl: `https://cdn.example.com/${service.uploads[0].key}`,
      status: 2,
      traceId: 'trace-1',
      extraInfo: { audio_length: 100 },
      baseResp: { statusCode: 0 },
    });
    assert.deepEqual(service.uploads, [{ url: 'https://minimax.example.com/audio.mp3', key: service.uploads[0].key }]);
    assert.match(service.uploads[0].key, /^creative-audio\/.+\.mp3$/);
    assert.deepEqual(JSON.parse(String(service.requests[0].init?.body)), {
      model: 'speech-2.8-turbo',
      text: '你好',
      stream: false,
      output_format: 'url',
      voice_setting: { voice_id: 'Voice_123', speed: 1.1 },
      audio_setting: { format: 'mp3', sample_rate: 32000 },
    });
  });

  test('falls back to the original audio URL when OSS transfer fails', async ({ assert }) => {
    const service = new TestMinimaxiService([{ data: { audio: 'https://minimax.example.com/audio.mp3', status: 2 }, base_resp: { status_code: 0 } }], true);

    const result = await service.synthesize({ model: 'speech-2.8-turbo', text: '你好', voiceSetting: { voiceId: 'Voice_123' } });

    assert.equal(result.ossUrl, 'https://minimax.example.com/audio.mp3');
  });

  for (const response of [null, { base_resp: { status_code: 1004, status_msg: 'auth failed' } }, { base_resp: { status_code: 0 }, data: {} }]) {
    test('rejects unsuccessful or malformed responses', async ({ assert }) => {
      const error = await caught(
        new TestMinimaxiService([response]).synthesize({
          model: 'speech-2.8-hd',
          text: 'test',
          voiceSetting: { voiceId: 'Voice_123' },
        }),
      );
      assert.instanceOf(error, BusinessException);
      assert.notInclude((error as Error).message, env.get('MINIMAXI_API_KEY'));
    });
  }
});
