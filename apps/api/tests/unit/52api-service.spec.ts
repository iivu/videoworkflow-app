import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import { _52ApiService } from '#services/52api-service';
import env from '#start/env';

type Request = { input: unknown; init?: Parameters<FetchClient['json']>[1] };

class Test52ApiService extends _52ApiService {
  readonly requests: Request[] = [];

  constructor(private readonly responses: unknown[]) {
    super();
  }

  protected override async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return {
      json: async <T>(input: unknown, init?: Parameters<FetchClient['json']>[1]) => {
        this.requests.push({ input, init });
        return this.responses.shift() as T;
      },
    };
  }
}

const douyinVideoData = {
  music: {
    author: 'Artist',
    avatar: 'https://cdn.example.com/music-avatar.jpg',
    cover: 'https://cdn.example.com/music-cover.jpg',
    name: 'Original sound',
    url: 'https://cdn.example.com/music.mp3',
  },
  work_author: 'Author',
  work_author_age: 23,
  work_author_signature: 'Signature',
  work_avatar: 'https://cdn.example.com/avatar.jpg',
  work_collect_count: 14320,
  work_comment_count: 10755,
  work_cover: 'https://cdn.example.com/cover.jpg',
  work_digg_count: 166744,
  work_download_count: 2516,
  work_duration: '18秒',
  work_share_count: 14143,
  work_time: '2022-11-12 18:01:34',
  work_title: 'Video title',
  work_type: 'video',
  work_uid: 'author-id',
  work_url: 'https://cdn.example.com/video.mp4',
};

const sphVideoData = {
  video_author: 'Author',
  video_avatar: 'https://cdn.example.com/avatar.jpg',
  video_commentNum: '199',
  video_cover: 'https://cdn.example.com/cover.jpg',
  video_createtime: '2026-04-10 16:30:00',
  video_favNum: '3.4万',
  video_forwardNum: '5842',
  video_likeNum: '4.3万',
  video_title: 'Video title',
  video_url: 'https://cdn.example.com/video.mp4',
};

test.group('52API service', () => {
  for (const scenario of [
    { method: 'douyin' as const, path: '/douyin', data: douyinVideoData },
    { method: 'sph' as const, path: '/sph', data: sphVideoData },
  ]) {
    test(`fetches ${scenario.method} video data`, async ({ assert }) => {
      const service = new Test52ApiService([{ code: 200, msg: 'success', data: scenario.data, exec_time: 1.2, ip: '127.0.0.1' }]);
      const sourceUrl = 'https://example.com/share?id=1&from=app';

      assert.strictEqual(await service[scenario.method](sourceUrl), scenario.data);

      const request = service.requests[0];
      const requestUrl = new URL(request.input as URL);
      const baseUrl = new URL(env.get('API_52API_BASE_URL'));
      assert.equal(requestUrl.origin, baseUrl.origin);
      assert.equal(requestUrl.pathname, `${baseUrl.pathname.replace(/\/+$/, '')}${scenario.path}`);
      assert.equal(requestUrl.searchParams.get('key'), env.get('API_52API_KEY'));
      assert.equal(requestUrl.searchParams.get('url'), sourceUrl);
      assert.deepEqual(request.init?.headers, { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' });
    });
  }

  test('accepts zero as a successful response code', async ({ assert }) => {
    const service = new Test52ApiService([{ code: 0, msg: 'success', data: douyinVideoData }]);

    assert.strictEqual(await service.douyin('https://example.com/share'), douyinVideoData);
  });

  test('throws the remote message and code for an unsuccessful response', async ({ assert }) => {
    const service = new Test52ApiService([{ code: 401, msg: 'Invalid API key' }]);

    const error = await service.sph('https://example.com/share').catch((caught) => caught);

    assert.instanceOf(error, BusinessException);
    assert.equal((error as BusinessException).message, 'Invalid API key');
    assert.equal((error as BusinessException).code, '401');
  });

  for (const scenario of [
    { name: 'empty response body', response: null, message: '52API response body is empty' },
    { name: 'empty response data', response: { code: 200, msg: 'success' }, message: '52API response data is empty' },
  ]) {
    test(`rejects ${scenario.name}`, async ({ assert }) => {
      const service = new Test52ApiService([scenario.response]);

      const error = await service.douyin('https://example.com/share').catch((caught) => caught);

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
    });
  }
});
