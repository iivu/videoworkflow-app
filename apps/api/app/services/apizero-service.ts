import app from '@adonisjs/core/services/app';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import env from '#start/env';

export type ApizeroVideoType = '视频' | '图集' | '实况图集';

export type ApizeroVideoStats = {
  author_name: string;
  author_avatar: string;
  author_account: string;
  author_id: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  play_count: number;
  collect_count: number;
  publish_time: string;
};

export type ApizeroVideoListItem = {
  quality: string;
  url: string;
  size: string;
  resolution: string;
};

export type ApizeroVideoSource = {
  platform: string;
  platform_label: string;
  original_url: string;
  work_id: string;
  author_name: string;
  author_account: string;
  author_id: string;
  copyright_notice: string;
  usage_restriction: string;
  disclaimer_url: string;
  dmca_contact: string;
};

export type ApizeroVideoData = {
  platform: string;
  type: ApizeroVideoType;
  title: string;
  desc: string;
  work_id: string;
  video_url: string;
  cover_url: string;
  audio_url: string;
  imagelist: string[];
  stats: ApizeroVideoStats;
  video_list: ApizeroVideoListItem[];
  source: ApizeroVideoSource;
  duration_ms: number | null;
  duration: number | null;
};

type ApizeroResponse<T> = {
  code: number;
  msg: string;
  data?: T;
  request_id?: string;
  tips?: string;
};

export class ApizeroService {
  protected async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return app.container.make('fetch');
  }

  videoParse(url: string): Promise<ApizeroVideoData> {
    return this.fetchVideo<ApizeroVideoData>(url);
  }

  private async fetchVideo<T>(url: string): Promise<T> {
    const endpoint = new URL(env.get('API_ZERO_BASE_URL'));
    endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, '')}/api/video-parse`;
    endpoint.search = '';
    endpoint.searchParams.set('flat', '2');
    endpoint.searchParams.set('url', url);

    const response = await (await this.getFetchClient()).json<ApizeroResponse<T> | null>(endpoint, {
      headers: { Authorization: `Bearer ${env.get('API_ZERO_KEY')}` },
    });

    if (!response) throw new BusinessException('ApiZero response body is empty');
    if (response.code !== 0) {
      throw new BusinessException(response.msg || 'ApiZero request failed', response.code);
    }
    if (!response.data) throw new BusinessException('ApiZero response data is empty');

    return response.data;
  }
}
