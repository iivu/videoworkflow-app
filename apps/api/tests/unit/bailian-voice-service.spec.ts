import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import type { OssClient } from '#providers/oss-provider';
import { BailianVoiceService } from '#services/bailian-voice-service';
import env from '#start/env';

class TestBailianVoiceService extends BailianVoiceService {
  readonly requests: Array<{ input: unknown; init?: Parameters<FetchClient['json']>[1] }> = [];
  readonly uploads: Array<{ url: string; key: string }> = [];

  constructor(
    private readonly response: unknown,
    private readonly ossError = false,
  ) {
    super();
  }

  protected override async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return {
      json: async <T>(input: unknown, init?: Parameters<FetchClient['json']>[1]) => {
        this.requests.push({ input, init });
        return this.response as T;
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

test.group('Bailian voice service', () => {
  test('clones a Qwen-Audio-TTS/CosyVoice voice', async ({ assert }) => {
    const service = new TestBailianVoiceService({ output: { voice_id: 'cosyvoice-v3-flash-demo' }, request_id: 'req-1' });
    const result = await service.cloneVoice({
      targetModel: 'cosyvoice-v3-flash',
      prefix: 'demo1',
      audioUrl: 'https://cdn.example.com/sample.wav',
      languageHints: ['zh'],
      enablePreprocess: true,
    });
    assert.deepEqual(result, { voiceId: 'cosyvoice-v3-flash-demo', targetModel: 'cosyvoice-v3-flash', requestId: 'req-1' });
    assert.equal(String(service.requests[0].input), `https://${env.get('ALIYUN_BAILIAN_WORKSPACE_ID')}.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/customization`);
    assert.deepEqual(service.requests[0].init?.headers, {
      Authorization: `Bearer ${env.get('ALIYUN_BAILIAN_KEY')}`,
      'Content-Type': 'application/json',
    });
    assert.deepEqual(JSON.parse(String(service.requests[0].init?.body)), {
      model: 'voice-enrollment',
      input: {
        action: 'create_voice',
        target_model: 'cosyvoice-v3-flash',
        prefix: 'demo1',
        url: 'https://cdn.example.com/sample.wav',
        language_hints: ['zh'],
        enable_preprocess: true,
      },
    });
  });

  test('synthesizes non-streaming audio and transfers the temporary URL to OSS', async ({ assert }) => {
    const service = new TestBailianVoiceService({
      request_id: 'req-2',
      output: { audio: { url: 'https://dashscope.example.com/audio.wav?sig=secret', id: 'audio-1', expires_at: 1772697707 } },
    });
    const result = await service.synthesize({
      model: 'qwen-audio-3.0-tts-flash',
      text: '你好',
      voice: 'longanhuan_v3.6',
      format: 'wav',
      sampleRate: 24000,
      key: 'voices/demo.wav',
    });
    assert.deepEqual(result, {
      model: 'qwen-audio-3.0-tts-flash',
      voice: 'longanhuan_v3.6',
      remoteAudioUrl: 'https://dashscope.example.com/audio.wav?sig=secret',
      ossUrl: 'https://cdn.example.com/voices/demo.wav',
      audioId: 'audio-1',
      expiresAt: 1772697707,
      requestId: 'req-2',
    });
    assert.deepEqual(JSON.parse(String(service.requests[0].init?.body)), {
      model: 'qwen-audio-3.0-tts-flash',
      input: { text: '你好', voice: 'longanhuan_v3.6', format: 'wav', sample_rate: 24000 },
    });
    assert.deepEqual(service.uploads, [{ url: 'https://dashscope.example.com/audio.wav?sig=secret', key: 'voices/demo.wav' }]);
  });

  test('rejects unsupported models and malformed audio responses', async ({ assert }) => {
    const unsupported = await new TestBailianVoiceService({}).synthesize({ model: 'qwen3-tts-vc-realtime-2026-01-15' as never, text: 'x', voice: 'v' }).catch((error) => error);
    assert.instanceOf(unsupported, BusinessException);
    const malformed = await new TestBailianVoiceService({ output: { audio: {} } }).synthesize({ model: 'cosyvoice-v2', text: 'x', voice: 'v' }).catch((error) => error);
    assert.instanceOf(malformed, BusinessException);
  });

  test('converts OSS failures to a business error', async ({ assert }) => {
    const error = await new TestBailianVoiceService({ output: { audio: { url: 'https://example.com/a.mp3' } } }, true)
      .synthesize({ model: 'cosyvoice-v2', text: 'x', voice: 'v' })
      .catch((caught) => caught);
    assert.instanceOf(error, BusinessException);
    assert.notInclude((error as Error).message, env.get('ALIYUN_BAILIAN_KEY'));
  });
});
