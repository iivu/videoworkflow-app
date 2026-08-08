import type { Route } from '@tuyau/core/types';

export type Video = Route.Response<'videos.list'>['data']['list'][number];
