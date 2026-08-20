import { createTuyau, type TuyauError } from '@tuyau/core/client';
import { createTuyauReactQueryClient } from '@tuyau/react-query';
import { registry } from 'api/registry';

import { getToken } from '#/shared/token';

type ApiFailed = { code: number; message: string; data?: any };

const asApiFailed = (error: TuyauError) => error as TuyauError<{ response: ApiFailed }>;

export const client = createTuyau({
  baseUrl: import.meta.env.VITE_API_URL,
  timeout: 1000 * 60 * 5,
  registry,
  headers: { Accept: 'application/json' },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = getToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
  },
});

export const query = createTuyauReactQueryClient({ client });

export const normalizeApiFailedMessage = (error?: TuyauError | null) => {
  if (!error) return '';
  if (error.kind === 'network') return '网络错误，请检查网络连接';
  return asApiFailed(error)?.response?.message;
};

export const normalizeApiFailedResponse = (error?: TuyauError | null) => {
  if (!error) return null;
  if (error.kind === 'network') return { code: -1, message: '网络错误，请检查网络连接' };
  return asApiFailed(error)?.response;
};
