import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import { buildVoiceCloneConfig } from '#services/voice-service';

test.group('Voice clone config', () => {
  test('builds Bailian config with a generated provider identifier', ({ assert }) => {
    const config = buildVoiceCloneConfig({
      provider: 'bailian',
      model: 'cosyvoice-v3-flash',
      config: { languageHints: ['zh'], maxPromptAudioLength: 10, enablePreprocess: false },
    });

    assert.deepInclude(config, { targetModel: 'cosyvoice-v3-flash', languageHints: ['zh'], maxPromptAudioLength: 10, enablePreprocess: false });
    assert.match('prefix' in config ? config.prefix : '', /^[A-Za-z0-9]{10}$/);
  });

  test('builds MiniMax config with a generated provider identifier', ({ assert }) => {
    const config = buildVoiceCloneConfig({
      provider: 'minimaxi',
      model: 'speech-2.8-hd',
      config: { text: '示例', languageBoost: 'auto', needNoiseReduction: false },
    });

    assert.deepInclude(config, { model: 'speech-2.8-hd', text: '示例', languageBoost: 'auto', needNoiseReduction: false });
    assert.match('voiceId' in config ? config.voiceId : '', /^Voice-[A-Za-z0-9]{24}$/);
  });

  test('rejects unsupported and cross-provider models', ({ assert }) => {
    assert.throws(() => buildVoiceCloneConfig({ provider: 'bailian', model: 'speech-2.8-turbo' }), BusinessException);
    assert.throws(() => buildVoiceCloneConfig({ provider: 'minimaxi', model: 'cosyvoice-v2' }), BusinessException);
    assert.throws(() => buildVoiceCloneConfig({ provider: 'minimaxi', model: 'unknown-model' }), BusinessException);
  });

  test('rejects options owned by another provider', ({ assert }) => {
    assert.throws(() => buildVoiceCloneConfig({ provider: 'bailian', model: 'cosyvoice-v2', config: { needNoiseReduction: true } }), '声音克隆配置与 provider 不匹配');
    assert.throws(() => buildVoiceCloneConfig({ provider: 'minimaxi', model: 'speech-2.8-turbo', config: { languageHints: ['zh'] } }), '声音克隆配置与 provider 不匹配');
  });

  test('omits undefined options and generates unique identifiers', ({ assert }) => {
    const first = buildVoiceCloneConfig({ provider: 'bailian', model: 'cosyvoice-v2', config: { languageHints: undefined } });
    const second = buildVoiceCloneConfig({ provider: 'bailian', model: 'cosyvoice-v2' });
    const firstMinimaxi = buildVoiceCloneConfig({ provider: 'minimaxi', model: 'speech-2.8-turbo' });
    const secondMinimaxi = buildVoiceCloneConfig({ provider: 'minimaxi', model: 'speech-2.8-turbo' });

    assert.notProperty(first, 'languageHints');
    assert.notEqual('prefix' in first ? first.prefix : '', 'prefix' in second ? second.prefix : '');
    assert.notEqual('voiceId' in firstMinimaxi ? firstMinimaxi.voiceId : '', 'voiceId' in secondMinimaxi ? secondMinimaxi.voiceId : '');
  });
});
