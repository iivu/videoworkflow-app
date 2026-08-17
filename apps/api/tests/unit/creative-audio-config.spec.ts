import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import { assertBailianVoiceModelMatch, BAILIAN_DEFAULT_CONFIGS, buildCreativeAudioSynthesizeConfig, MINIMAXI_DEFAULT_CONFIGS } from '#services/creative-audio-service';

test.group('Creative audio synthesize config', () => {
  test('falls back to backend default configs', ({ assert }) => {
    const bailian = buildCreativeAudioSynthesizeConfig({ provider: 'bailian', model: 'cosyvoice-v3-flash' });
    const minimaxi = buildCreativeAudioSynthesizeConfig({ provider: 'minimaxi', model: 'speech-2.8-turbo' });

    assert.deepEqual(bailian, BAILIAN_DEFAULT_CONFIGS);
    assert.deepEqual(minimaxi, MINIMAXI_DEFAULT_CONFIGS);
  });

  test('merges client configs over backend defaults', ({ assert }) => {
    const config = buildCreativeAudioSynthesizeConfig({
      provider: 'bailian',
      model: 'qwen-audio-3.0-tts-flash',
      configs: { format: 'wav', volume: 80 },
    });

    assert.deepEqual(config, { ...BAILIAN_DEFAULT_CONFIGS, format: 'wav', volume: 80 });
  });

  test('omits undefined config values', ({ assert }) => {
    const config = buildCreativeAudioSynthesizeConfig({
      provider: 'minimaxi',
      model: 'speech-2.8-hd',
      configs: { emotion: undefined },
    });

    assert.notProperty(config, 'emotion');
  });

  test('rejects unsupported and cross-provider models', ({ assert }) => {
    assert.throws(() => buildCreativeAudioSynthesizeConfig({ provider: 'bailian', model: 'speech-2.8-turbo' }), BusinessException);
    assert.throws(() => buildCreativeAudioSynthesizeConfig({ provider: 'minimaxi', model: 'cosyvoice-v2' }), BusinessException);
    assert.throws(() => buildCreativeAudioSynthesizeConfig({ provider: 'bailian', model: 'unknown-model' }), BusinessException);
  });

  test('rejects configs owned by another provider', ({ assert }) => {
    assert.throws(() => buildCreativeAudioSynthesizeConfig({ provider: 'bailian', model: 'cosyvoice-v2', configs: { speed: 1.5 } }), '音频合成配置与 provider 不匹配');
    assert.throws(() => buildCreativeAudioSynthesizeConfig({ provider: 'minimaxi', model: 'speech-2.8-turbo', configs: { enableSsml: true } }), '音频合成配置与 provider 不匹配');
  });
});

test.group('Bailian voice-model match', () => {
  test('requires the synthesize model to be exactly the voice model', ({ assert }) => {
    assert.doesNotThrow(() => assertBailianVoiceModelMatch('cosyvoice-v3-flash', 'cosyvoice-v3-flash'));
    assert.doesNotThrow(() => assertBailianVoiceModelMatch('qwen-audio-3.0-tts-plus', 'qwen-audio-3.0-tts-plus'));
  });

  test('rejects a different model even within the same family', ({ assert }) => {
    assert.throws(() => assertBailianVoiceModelMatch('cosyvoice-v3-flash', 'cosyvoice-v2'), '语音合成模型必须与音色所属模型一致');
    assert.throws(() => assertBailianVoiceModelMatch('cosyvoice-v2', 'cosyvoice-v3-plus'), BusinessException);
    assert.throws(() => assertBailianVoiceModelMatch('qwen-audio-3.0-tts-flash', 'qwen-audio-3.0-tts-plus'), BusinessException);
  });
});
