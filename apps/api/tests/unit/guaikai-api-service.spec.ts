import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import { GuaikaiApiService } from '#services/guaikai-api-service';

type Request = { input: unknown; init?: Parameters<FetchClient['json']>[1] };

class TestGuaikaiApiService extends GuaikaiApiService {
  readonly requests: Request[] = [];

  constructor(private readonly responses: unknown[]) {
    super({ baseUrl: 'https://www.guaikei.com', token: 'test-token', now: () => 1_792_143_798 });
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

test.group('Guaikai API service', () => {
  test('creates and fetches a general search task with the same timestamp', async ({ assert }) => {
    const service = new TestGuaikaiApiService([
      { errcode: 0, errmsg: 'success' },
      { errcode: 0, errmsg: 'success', data: [{ aweme_id: 'aweme-1' }] },
    ]);
    const params = { keyword: 'AI', sort_type: 1, limit: 10 };

    const timestamp = await service.createDouyinGeneralSearchTask(params);
    assert.deepEqual(await service.getDouyinGeneralSearchResult(params, timestamp), [{ aweme_id: 'aweme-1' }]);

    const createRequest = service.requests[0];
    const createUrl = new URL(createRequest.input as URL);
    assert.equal(createUrl.pathname, '/api/douyin/general-search/keyword');
    assert.equal(createUrl.searchParams.get('_'), '1792143798');
    assert.deepEqual(createRequest.init?.headers, { TOKEN: 'test-token', 'Content-Type': 'application/json' });
    assert.equal(createRequest.init?.body, JSON.stringify(params));

    const resultUrl = new URL(service.requests[1].input as URL);
    assert.equal(resultUrl.pathname, '/api/douyin/general-search/info');
    assert.equal(resultUrl.searchParams.get('_'), '1792143798');
    assert.equal(resultUrl.searchParams.get('keyword'), 'AI');
    assert.equal(resultUrl.searchParams.get('sort_type'), '1');
    assert.equal(resultUrl.searchParams.get('limit'), '10');
    assert.deepEqual(service.requests[1].init?.headers, { TOKEN: 'test-token', Accept: 'application/json' });
  });

  test('uses the documented endpoints for author and comment tasks', async ({ assert }) => {
    const service = new TestGuaikaiApiService([
      { errcode: 0, errmsg: 'success' },
      { errcode: 0, errmsg: 'success', data: { post: [], user: { uid: 'user-1' } } },
      { errcode: 0, errmsg: 'success' },
      { errcode: 0, errmsg: 'success', data: [] },
    ]);

    const postTimestamp = await service.createDouyinPostTask({ url: 'MS4wLjA*', limit: 10 });
    await service.getDouyinPostResult({ url: 'MS4wLjA*', limit: 10 }, postTimestamp);
    const commentTimestamp = await service.createDouyinCommentTask({ url: '76*', limit: 10 });
    await service.getDouyinCommentResult({ url: '76*', limit: 10 }, commentTimestamp);

    assert.deepEqual(
      service.requests.map(({ input }) => new URL(input as URL).pathname),
      ['/api/douyin/post/url', '/api/douyin/post/info', '/api/douyin/comment/url', '/api/douyin/comment/info'],
    );
  });

  test('throws remote errors with their error code', async ({ assert }) => {
    const service = new TestGuaikaiApiService([{ errcode: 401, errmsg: 'Invalid token' }]);
    const error = await service.createDouyinPostTask({ url: 'user-id' }).catch((caught) => caught);

    assert.instanceOf(error, BusinessException);
    assert.equal((error as BusinessException).message, 'Invalid token');
    assert.equal((error as BusinessException).code, '401');
  });

  test('rejects empty response data for result requests', async ({ assert }) => {
    const service = new TestGuaikaiApiService([{ errcode: 0, errmsg: 'success' }]);
    const error = await service.getDouyinCommentResult({ url: '76*' }, 1_792_143_798).catch((caught) => caught);

    assert.instanceOf(error, BusinessException);
    assert.equal((error as Error).message, 'Guaikai API response data is empty');
  });
});
