import { test } from '@japa/runner';
import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import { ShanhaiApiService } from '#services/shanhai-api-service';
import env from '#start/env';

type Request = { input: unknown; init?: Parameters<FetchClient['json']>[1] };

class TestShanhaiApiService extends ShanhaiApiService {
  readonly requests: Request[] = [];

  constructor(private readonly responses: unknown[]) {
    super();
  }

  protected override async getFetchClient(): Promise<Pick<FetchClient, 'json' | 'formData'>> {
    return {
      json: async <T>(input: unknown, init?: Parameters<FetchClient['json']>[1]) => {
        this.requests.push({ input, init });
        const response = this.responses.shift();
        if (response instanceof Error) throw response;
        return response as T;
      },
      formData: async <T>() => {
        const response = this.responses.shift();
        if (response instanceof Error) throw response;
        return response as T;
      },
    };
  }
}

test.group('Shanhai API service', () => {
  test('requests the configured endpoint and returns the smallest video', async ({ assert }) => {
    const service = new TestShanhaiApiService([
      {
        code: 200,
        data: {
          code: 200,
          data: { title: 'Video title', video_url: 'https://cdn.example.com/fallback.mp4' },
          stats: { author_name: 'Author', like_count: 12, play_count: 34, share_count: 5, collect_count: 6, comment_count: 7 },
          video_list: [
            { url: 'https://cdn.example.com/large.mp4', size: '1.2GB' },
            { url: 'https://cdn.example.com/small.mp4', size: '850 MB' },
            { url: 'https://cdn.example.com/medium.mp4', size: '0.9GB' },
          ],
        },
      },
    ]);
    const sourceUrl = 'https://example.com/watch?id=1&from=share';

    const result = await service.fetchVideoInfo(sourceUrl);

    assert.equal(result.videoUrl, 'https://cdn.example.com/small.mp4');
    assert.deepEqual(result, {
      title: 'Video title',
      videoUrl: 'https://cdn.example.com/small.mp4',
      author: 'Author',
      stats: { likeCount: 12, playCount: 34, shareCount: 5, collectCount: 6, commentCount: 7 },
    });
    const parsedRequestUrl = new URL(service.requests[0].input as string);
    const configuredBaseUrl = new URL(env.get('SHANHAI_API_HOST'));
    const configuredPath = [configuredBaseUrl.pathname, env.get('SHANHAI_API_PREFIX'), 'video6']
      .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
    assert.equal(parsedRequestUrl.origin, configuredBaseUrl.origin);
    assert.equal(parsedRequestUrl.pathname, `/${configuredPath}`);
    assert.isTrue(parsedRequestUrl.searchParams.get('key') === env.get('SHANHAI_API_KEY'));
    assert.equal(parsedRequestUrl.searchParams.get('url'), sourceUrl);
  });

  test('falls back to data.video_url and applies defaults when video_list is unavailable', async ({ assert }) => {
    const service = new TestShanhaiApiService([
      {
        code: 200,
        data: {
          code: 200,
          data: { title: 'Fallback title', video_url: 'https://cdn.example.com/fallback.mp4' },
          video_list: [],
        },
      },
    ]);

    assert.deepEqual(await service.fetchVideoInfo('https://example.com/video'), {
      title: 'Fallback title',
      videoUrl: 'https://cdn.example.com/fallback.mp4',
      author: 'Unknown',
      stats: { likeCount: 0, playCount: 0, shareCount: 0, collectCount: 0, commentCount: 0 },
    });
  });

  test('preserves an empty title when falling back to data.video_url', async ({ assert }) => {
    const service = new TestShanhaiApiService([
      {
        code: 200,
        data: {
          code: 200,
          data: { title: '', video_url: 'https://cdn.example.com/fallback.mp4' },
        },
      },
    ]);

    assert.equal((await service.fetchVideoInfo('https://example.com/video')).title, '');
  });

  test('propagates HTTP failures from the shared fetch client', async ({ assert }) => {
    const httpError = new BusinessException('[FetchClient] Request failed with status 503', 503);
    const service = new TestShanhaiApiService([httpError]);

    assert.strictEqual(await service.fetchVideoInfo('https://example.com/video').catch((error) => error), httpError);
  });

  for (const scenario of [
    { name: 'empty response', response: null, message: 'Response body is empty' },
    { name: 'level one API error', response: { code: 401, msg: 'Invalid API key' }, message: 'Invalid API key' },
    { name: 'empty response data', response: { code: 200 }, message: 'Response data is empty' },
    { name: 'level two API error', response: { code: 200, data: { code: 422, message: 'Unsupported URL' } }, message: 'Unsupported URL' },
    { name: 'missing video data', response: { code: 200, data: { code: 200, data: { title: 'No video' } } }, message: 'Video URL is empty' },
  ]) {
    test(`throws a diagnostic error for ${scenario.name}`, async ({ assert }) => {
      const service = new TestShanhaiApiService([scenario.response]);

      const error = await service.fetchVideoInfo('https://example.com/video').catch((caught) => caught);

      assert.instanceOf(error, Error);
      assert.equal((error as Error).message, scenario.message);
    });
  }
});
