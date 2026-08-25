import app from '@adonisjs/core/services/app';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import env from '#start/env';

export type Api52DouyinMusic = {
  author: string;
  avatar: string;
  cover: string;
  name: string;
  url: string;
};

export type Api52DouyinVideoData = {
  music: Api52DouyinMusic;
  work_author: string;
  work_author_age: number;
  work_author_signature: string;
  work_avatar: string;
  work_collect_count: number;
  work_comment_count: number;
  work_cover: string;
  work_digg_count: number;
  work_download_count: number;
  work_duration: string;
  work_share_count: number;
  work_time: string;
  work_title: string;
  work_type: string;
  work_uid: string;
  work_url: string;
};

export type Api52SphVideoData = {
  video_author: string;
  video_avatar: string;
  video_commentNum: string;
  video_cover: string;
  video_createtime: string;
  video_favNum: string;
  video_forwardNum: string;
  video_likeNum: string;
  video_title: string;
  video_url: string;
};

type Api52Response<T> = {
  code: number;
  msg: string;
  data?: T;
  debug?: string | unknown[];
  exec_time?: number;
  ip?: string;
  user_ip?: string;
};

export class _52ApiService {
  protected async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return app.container.make('fetch');
  }

  douyin(url: string): Promise<Api52DouyinVideoData> {
    return this.fetchVideo<Api52DouyinVideoData>('douyin', url);
  }

  sph(url: string): Promise<Api52SphVideoData> {
    return this.fetchVideo<Api52SphVideoData>('sph', url);
  }

  private async fetchVideo<T>(path: string, url: string): Promise<T> {
    const endpoint = new URL(env.get('API_52API_BASE_URL'));
    endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, '')}/${path}`;
    endpoint.search = '';
    endpoint.searchParams.set('key', env.get('API_52API_KEY'));
    endpoint.searchParams.set('url', url);

    const response = await (await this.getFetchClient()).json<Api52Response<T> | null>(endpoint, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    });

    if (!response) throw new BusinessException('52API response body is empty');
    if (response.code !== 200 && response.code !== 0) {
      throw new BusinessException(response.msg || '52API request failed', response.code);
    }
    if (!response.data) throw new BusinessException('52API response data is empty');

    return response.data;
  }
}
