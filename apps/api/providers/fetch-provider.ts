import type { ApplicationService } from '@adonisjs/core/types';

import BusinessException from '#exceptions/business-exception';

type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];
const ERROR_PREFIX = '[FetchClient]';

export interface FetchClient {
  <T = unknown>(input: FetchInput, init?: FetchInit): Promise<T>;
  json<T = unknown>(input: FetchInput, init?: FetchInit): Promise<T>;
  text(input: FetchInput, init?: FetchInit): Promise<string>;
  stream(input: FetchInput, init?: FetchInit): Promise<ReadableStream<Uint8Array>>;
  formData<T = unknown>(input: FetchInput, init?: FetchInit): Promise<T>;
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    fetch: FetchClient;
  }
}

async function toBusinessException(response: Response) {
  const fallbackMessage = response.statusText || `Request failed with status ${response.status}`;
  const body = await response.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return new BusinessException(`${ERROR_PREFIX} ${fallbackMessage}`, response.status);
  }

  const error = body as { message?: unknown; code?: unknown; data?: unknown };
  const message = typeof error.message === 'string' ? error.message : fallbackMessage;
  const code = typeof error.code === 'string' || typeof error.code === 'number' ? error.code : response.status;

  return new BusinessException(`${ERROR_PREFIX} ${message}`, code, error.data ?? body);
}

export function createFetchClient(nativeFetch: typeof globalThis.fetch = globalThis.fetch): FetchClient {
  async function request(input: FetchInput, init?: FetchInit) {
    const response = await nativeFetch(input, init);
    if (response.status !== 200) {
      throw await toBusinessException(response);
    }
    return response;
  }

  async function json<T = unknown>(input: FetchInput, init?: FetchInit) {
    const response = await request(input, init);
    return (await response.json()) as T;
  }

  return Object.assign(json, {
    json,
    async text(input: FetchInput, init?: FetchInit) {
      const response = await request(input, init);
      return response.text();
    },
    async stream(input: FetchInput, init?: FetchInit) {
      const response = await request(input, init);
      if (!response.body) {
        throw new BusinessException(`${ERROR_PREFIX} Response body is empty`);
      }
      return response.body;
    },
    async formData<T = unknown>(input: FetchInput, init?: FetchInit) {
      const response = await request(input, init);
      return (await response.json()) as T;
    },
  });
}

export default class FetchProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton('fetch', () => createFetchClient());
  }
}
