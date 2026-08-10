import { test } from '@japa/runner';

import { cloneAudioVoiceValidator, cloneVideoVoiceValidator } from '#validators/voice';

const audioPayload = {
  provider: 'bailian',
  model: 'cosyvoice-v2',
  audioUrl: 'https://example.com/sample.mp3',
};

const videoPayload = {
  provider: 'minimaxi',
  model: 'speech-2.8-turbo',
  videoUrl: 'https://example.com/sample.mp4',
};

test.group('Voice clone validators', () => {
  test('requires a voice name for audio cloning', async ({ assert }) => {
    await assert.rejects(() => cloneAudioVoiceValidator.validate(audioPayload));
    await assert.rejects(() => cloneAudioVoiceValidator.validate({ ...audioPayload, name: '   ' }));

    const parsed = await cloneAudioVoiceValidator.validate({ ...audioPayload, name: ' 我的音色 ' });
    assert.equal(parsed.name, '我的音色');
  });

  test('requires a voice name for video cloning', async ({ assert }) => {
    await assert.rejects(() => cloneVideoVoiceValidator.validate(videoPayload));
    await assert.rejects(() => cloneVideoVoiceValidator.validate({ ...videoPayload, name: '   ' }));

    const parsed = await cloneVideoVoiceValidator.validate({ ...videoPayload, name: '讲解音色' });
    assert.equal(parsed.name, '讲解音色');
  });
});
