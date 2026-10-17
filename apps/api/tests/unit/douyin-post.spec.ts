import { test } from '@japa/runner';
import { filterPosts, firstWorkingVideo, normalizePostResult, type PostItem, postCacheKey, postLimit, publicMediaUrl, validatePostFilters } from '#utils/douyin-post';

const sample = (overrides: Partial<PostItem> = {}): PostItem => ({
  awemeId: '123',
  title: '作品',
  publishedAt: 1792166400,
  likes: 10,
  collects: 5,
  comments: 2,
  duration: 60000,
  shareUrl: 'https://www.douyin.com/video/123',
  videoUrls: ['https://v.douyinvod.com/test.mp4'],
  coverUrl: null,
  ...overrides,
});

test.group('Douyin post filtering and cache identity', () => {
  test('caps the provider limit without accidentally requesting profile data for invalid counts', ({ assert }) => {
    assert.equal(postLimit(12345), 10000);
    assert.equal(postLimit(123.9), 123);
    assert.equal(postLimit(-1), 0);
    assert.equal(postLimit(Number.NaN), 0);
  });
  test('cache key is stable and separates creator identities and limits', ({ assert }) => {
    assert.equal(postCacheKey('creator', 100), postCacheKey('creator', 100));
    assert.notEqual(postCacheKey('creator', 100), postCacheKey('other', 100));
    assert.notEqual(postCacheKey('creator', 100), postCacheKey('creator', 101));
  });
  test('applies all thresholds with inclusive minimums and descending publication dates', ({ assert }) => {
    const posts = [sample(), sample({ awemeId: '456', publishedAt: 1792166500 }), sample({ likes: 9 }), sample({ collects: 4 }), sample({ comments: 1 })];
    assert.deepEqual(
      filterPosts(posts, { minLikes: 10, minCollects: 5, minComments: 2 }).map((post) => post.awemeId),
      ['456', '123'],
    );
  });
  test('includes both complete Beijing calendar days and excludes missing dates', ({ assert }) => {
    const start = Date.parse('2026-10-17T00:00:00+08:00') / 1000;
    const posts = [
      sample({ awemeId: 'start', publishedAt: start }),
      sample({ awemeId: 'end', publishedAt: start + 86399 }),
      sample({ publishedAt: start - 1 }),
      sample({ publishedAt: start + 86400 }),
      sample({ publishedAt: 0 }),
    ];
    assert.deepEqual(
      filterPosts(posts, { startDate: '2026-10-17', endDate: '2026-10-17' }).map((post) => post.awemeId),
      ['end', 'start'],
    );
  });
  test('rejects inverted and invalid dates', ({ assert }) => {
    assert.throws(() => validatePostFilters({ startDate: '2026-10-18', endDate: '2026-10-17' }));
    assert.throws(() => validatePostFilters({ startDate: '2026-02-30' }));
    assert.throws(() => validatePostFilters({ endDate: 'invalid' }));
  });
  test('does not mutate the cached result while sorting', ({ assert }) => {
    const posts = [sample({ awemeId: 'old', publishedAt: 1 }), sample({ awemeId: 'new', publishedAt: 2 })];
    filterPosts(posts, {});
    assert.equal(posts[0].awemeId, 'old');
  });
});

test.group('Douyin provider normalization and download fallback', () => {
  test('keeps valid empty results but rejects malformed responses', ({ assert }) => {
    assert.deepEqual(normalizePostResult({ post: [] }), []);
    assert.throws(() => normalizePostResult(undefined));
    assert.throws(() => normalizePostResult({}));
  });
  test('normalizes missing fields and deduplicates IDs and download links', ({ assert }) => {
    const posts = normalizePostResult({
      post: [{ aweme_id: '123', video_url: ['https://v.douyinvod.com/a', 'https://v.douyinvod.com/a', 'http://127.0.0.1/a'] }, { aweme_id: '123' }, {}],
    });
    assert.lengthOf(posts, 2);
    assert.deepEqual(posts[0].videoUrls, ['https://v.douyinvod.com/a']);
    assert.equal(posts[0].likes, 0);
    assert.equal(posts[1].awemeId, '');
  });
  test('preserves every distinct fallback URL in provider order', ({ assert }) => {
    const urls = Array.from({ length: 25 }, (_, index) => `https://v.douyinvod.com/${index}.mp4`);
    assert.deepEqual(normalizePostResult({ post: [{ aweme_id: '123', video_url: urls }] })[0].videoUrls, urls);
  });
  for (const url of ['http://127.0.0.1/a', 'https://douyinvod.com.evil.com/a', 'file:///etc/passwd', 'https://user:pass@v.douyinvod.com/a', 'https://v.douyinvod.com:8080/a']) {
    test(`rejects untrusted media address ${url}`, ({ assert }) => assert.isNull(publicMediaUrl(url)));
  }
  test('tries URLs sequentially, stopping after the first successful upload', async ({ assert }) => {
    const calls: string[] = [];
    const result = await firstWorkingVideo(['first', 'second', 'third'], async (url) => {
      calls.push(url);
      if (url === 'first') throw new Error('failed');
      return 'oss-url';
    });
    assert.deepEqual(calls, ['first', 'second']);
    assert.equal(result, 'oss-url');
  });
  test('fails only after exhausting every URL', async ({ assert }) => {
    const calls: string[] = [];
    await assert.rejects(
      () =>
        firstWorkingVideo(['first', 'second'], async (url) => {
          calls.push(url);
          throw new Error('failed');
        }),
      /所有视频地址均下载失败/,
    );
    assert.deepEqual(calls, ['first', 'second']);
  });
});
