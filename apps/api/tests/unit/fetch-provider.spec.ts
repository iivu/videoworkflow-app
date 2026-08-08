import { ReadableStream } from 'node:stream/web';

import { test } from '@japa/runner';

import BusinessException from '#exceptions/business-exception';
import { createFetchClient } from '#providers/fetch-provider';

function mockFetch(response: Response) {
  return (async () => response) as typeof globalThis.fetch;
}

test.group('Fetch provider', () => {
  test('parses JSON responses by default', async ({ assert }) => {
    const fetch = createFetchClient(mockFetch(Response.json({ id: 1 })));

    assert.deepEqual(await fetch<{ id: number }>('https://example.com'), { id: 1 });
  });

  test('supports explicit JSON responses', async ({ assert }) => {
    const fetch = createFetchClient(mockFetch(Response.json({ id: 1 })));

    assert.deepEqual(await fetch.json<{ id: number }>('https://example.com'), { id: 1 });
  });

  test('supports text responses', async ({ assert }) => {
    const fetch = createFetchClient(mockFetch(new Response('content')));

    assert.equal(await fetch.text('https://example.com'), 'content');
  });

  test('supports stream responses', async ({ assert }) => {
    const body = new ReadableStream<Uint8Array>();
    const fetch = createFetchClient(mockFetch(new Response(body)));

    assert.strictEqual(await fetch.stream('https://example.com'), body);
  });

  test('throws BusinessException for unsuccessful responses', async ({ assert }) => {
    const response = Response.json({ message: 'Remote request failed', code: 41001, data: { reason: 'expired' } }, { status: 400 });
    const fetch = createFetchClient(mockFetch(response));

    const error = await fetch('https://example.com').catch((caught) => caught);

    assert.instanceOf(error, BusinessException);
    const businessError = error as BusinessException;
    assert.equal(businessError.message, '[FetchClient] Remote request failed');
    assert.equal(businessError.code, '41001');
  });
});
