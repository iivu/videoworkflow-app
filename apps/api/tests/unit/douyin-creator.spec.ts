import { test } from '@japa/runner';
import BusinessException from '#exceptions/business-exception';
import { douyinCreatorSnapshot, isDouyinCreatorPending, normalizeDouyinCreatorInput } from '#utils/douyin-creator';

test.group('Douyin creator input', () => {
  for (const source of ['MS4wLjABAAAA_test', 'https://www.douyin.com/user/MS4wLjABAAAA_test/?from=share', 'https://douyin.com/user/MS4wLjABAAAA_test']) {
    test(`normalizes ${source}`, ({ assert }) => {
      assert.equal(normalizeDouyinCreatorInput(source), 'MS4wLjABAAAA_test');
    });
  }

  test('normalizes a short share link without inventing an identity', ({ assert }) => {
    assert.equal(normalizeDouyinCreatorInput(' https://v.douyin.com/abc123/?from=share '), 'https://v.douyin.com/abc123/');
  });

  for (const source of [
    '',
    '12345',
    'https://www.douyin.com/video/123',
    'http://www.douyin.com/user/MS4wLjABC',
    'https://evildouyin.com/user/MS4wLjABC',
    'https://v.douyin.com.evil.com/abc/',
    'https://user:pass@v.douyin.com/abc/',
    'https://v.douyin.com:8080/abc/',
    'https://v.douyin.com/',
    `MS4wLj${'a'.repeat(128)}`,
  ]) {
    test(`rejects unsupported input ${source.slice(0, 60)}`, ({ assert }) => {
      assert.throws(() => normalizeDouyinCreatorInput(source), '请输入有效的抖音博主主页链接');
    });
  }
});

test.group('Douyin creator snapshot', () => {
  test('requires the provider to return a valid identity', ({ assert }) => {
    assert.throws(() => douyinCreatorSnapshot({ nickname: '未知博主' }), '未获取到有效的博主身份');
    assert.throws(() => douyinCreatorSnapshot({ sec_uid: '../unsafe' }), '未获取到有效的博主身份');
  });

  test('maps provider fields, defaults omitted counts and leaves local fields untouched', ({ assert }) => {
    const snapshot = douyinCreatorSnapshot({ sec_uid: 'MS4wLjABAAAA_test', nickname: '测试博主', unique_id: 'creator01', follower_count: 1286000, total_favorited: 21435000 });
    assert.equal(snapshot.secUid, 'MS4wLjABAAAA_test');
    assert.equal(snapshot.nickname, '测试博主');
    assert.equal(snapshot.uniqueId, 'creator01');
    assert.equal(snapshot.followerCount, 1286000);
    assert.equal(snapshot.totalFavorited, 21435000);
    assert.equal(snapshot.awemeCount, 0);
    assert.isNull(snapshot.signature);
    assert.notProperty(snapshot, 'avatarUrl');
    assert.notProperty(snapshot, 'downloadedCount');
    assert.notProperty(snapshot, 'createdAt');
  });

  test('normalizes invalid numeric data', ({ assert }) => {
    const snapshot = douyinCreatorSnapshot({
      sec_uid: 'MS4wLjABAAAA_test',
      aweme_count: -1,
      follower_count: Number.NaN,
      total_favorited: Number.POSITIVE_INFINITY,
      following_count: 12.9,
    });
    assert.equal(snapshot.awemeCount, 0);
    assert.equal(snapshot.followerCount, 0);
    assert.equal(snapshot.totalFavorited, 0);
    assert.equal(snapshot.followingCount, 12);
  });

  test('only retries documented temporary provider error codes', ({ assert }) => {
    for (const code of [1, 5, 9]) assert.isTrue(isDouyinCreatorPending(new BusinessException('稍后重试', code)));
    for (const code of [0, 10, 401, 40000]) assert.isFalse(isDouyinCreatorPending(new BusinessException('失败', code)));
    assert.isFalse(isDouyinCreatorPending(new Error('网络错误')));
  });
});
