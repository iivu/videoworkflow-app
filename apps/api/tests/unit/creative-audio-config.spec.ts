import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import { BAILIAN_DEFAULT_CONFIGS, buildCreativeAudioSynthesizeConfig, MINIMAXI_DEFAULT_CONFIGS } from '#services/creative-audio-service';

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
