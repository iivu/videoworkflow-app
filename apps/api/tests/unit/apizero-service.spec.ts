import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import { ApizeroService, type ApizeroVideoData } from '#services/apizero-service';
import env from '#start/env';

type Request = { input: unknown; init?: Parameters<FetchClient['json']>[1] };

class TestApizeroService extends ApizeroService {
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

const videoData: ApizeroVideoData = {
  platform: 'douyin',
  type: '视频',
  title: 'Video title',
  desc: 'Video desc',
  work_id: 'work-id',
  video_url: 'https://cdn.example.com/video.mp4',
  cover_url: 'https://cdn.example.com/cover.jpg',
  audio_url: '',
  imagelist: [],
  stats: {
    author_name: 'Author',
    author_avatar: 'https://cdn.example.com/avatar.jpg',
    author_account: '',
    author_id: 'author-id',
    like_count: 166744,
    comment_count: 10755,
    share_count: 14143,
    play_count: 0,
    collect_count: 14320,
    publish_time: '2022-11-12 18:01:34',
  },
  video_list: [],
  source: {
    platform: 'douyin',
    platform_label: '抖音',
    original_url: 'https://example.com/share',
    work_id: 'work-id',
    author_name: 'Author',
    author_account: '',
    author_id: 'author-id',
    copyright_notice: '',
    usage_restriction: '',
    disclaimer_url: '',
    dmca_contact: '',
  },
  duration_ms: 18000,
  duration: 18,
};

test.group('ApiZero service', () => {
  test('fetches video data with flat=2 and bearer authorization', async ({ assert }) => {
    const service = new TestApizeroService([{ code: 0, msg: '成功', data: videoData, request_id: 'req-1', tips: '极数本源 · https://apizero.cn' }]);
    const sourceUrl = 'https://example.com/share?id=1&from=app';

    assert.strictEqual(await service.videoParse(sourceUrl), videoData);

    const request = service.requests[0];
    const requestUrl = new URL(request.input as URL);
    const baseUrl = new URL(env.get('API_ZERO_BASE_URL'));
    assert.equal(requestUrl.origin, baseUrl.origin);
    assert.equal(requestUrl.pathname, `${baseUrl.pathname.replace(/\/+$/, '')}/api/video-parse`);
    assert.equal(requestUrl.searchParams.get('flat'), '2');
    assert.equal(requestUrl.searchParams.get('url'), sourceUrl);
    assert.deepEqual(request.init?.headers, { Authorization: `Bearer ${env.get('API_ZERO_KEY')}` });
  });

  test('throws the remote message and code for a non-zero response code', async ({ assert }) => {
    const service = new TestApizeroService([{ code: 4011, msg: 'API Key 无效' }]);

    const error = await service.videoParse('https://example.com/share').catch((caught) => caught);

    assert.instanceOf(error, BusinessException);
    assert.equal((error as BusinessException).message, 'API Key 无效');
    assert.equal((error as BusinessException).code, '4011');
  });

  for (const scenario of [
    { name: 'empty response body', response: null, message: 'ApiZero response body is empty' },
    { name: 'empty response data', response: { code: 0, msg: '成功' }, message: 'ApiZero response data is empty' },
  ]) {
    test(`rejects ${scenario.name}`, async ({ assert }) => {
      const service = new TestApizeroService([scenario.response]);

      const error = await service.videoParse('https://example.com/share').catch((caught) => caught);

      assert.instanceOf(error, BusinessException);
      assert.equal((error as Error).message, scenario.message);
    });
  }
});
