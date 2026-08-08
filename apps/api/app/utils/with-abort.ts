import type { HttpContext } from '@adonisjs/core/http';

export function withAbort(response: HttpContext['response']): AbortSignal {
  const abortController = new AbortController();

  response.onFinish((_error, rawResponse) => {
    if (!rawResponse.writableEnded) {
      abortController.abort();
    }
  });

  return abortController.signal;
}
