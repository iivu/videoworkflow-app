import { test } from '@japa/runner';

import { detectPlatformFromUrl, extractUrl } from '#utils/parse';

test.group('detectPlatformFromUrl', () => {
  for (const scenario of [
    { url: 'https://www.douyin.com/video/123', expected: 'douyin' },
    { url: 'https://v.douyin.com/abc123/', expected: 'douyin' },
    { url: 'https://www.iesdouyin.com/share/video/123/', expected: 'douyin' },
    { url: 'https://channels.weixin.qq.com/sph/abc123', expected: 'sph' },
    { url: 'https://weixin.qq.com/sph/abc123', expected: 'sph' },
    { url: 'https://www.bilibili.com/video/BV123', expected: null },
    { url: 'not-a-url', expected: null },
    { url: '', expected: null },
  ]) {
    test(`detects ${scenario.url} as ${scenario.expected}`, ({ assert }) => {
      assert.equal(detectPlatformFromUrl(scenario.url), scenario.expected);
    });
  }
});

test.group('extractUrl', () => {
  test('extracts the first URL from shared text', ({ assert }) => {
    const text = '8.88 复制打开抖音 https://v.douyin.com/abc123/ 更多内容';
    assert.equal(extractUrl(text), 'https://v.douyin.com/abc123');
  });

  test('returns null when no URL is present', ({ assert }) => {
    assert.isNull(extractUrl('没有链接的文本'));
  });
});
