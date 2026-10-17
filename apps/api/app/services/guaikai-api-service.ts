import app from '@adonisjs/core/services/app';

import BusinessException from '#exceptions/business-exception';
import type { FetchClient } from '#providers/fetch-provider';
import env from '#start/env';

export type DouyinGeneralSearchParams = {
  keyword: string;
  sort_type?: number;
  publish_time?: number;
  filter_duration?: number;
  content_type?: number;
  limit?: number;
};

export type DouyinGeneralSearchItem = {
  aweme_id?: string;
  desc?: string;
  create_time?: number;
  caption?: string;
  author_uid?: string;
  author_nickname?: string;
  author_avatar?: string;
  author_sec_uid?: string;
  author_signature?: string;
  comment_count?: number;
  digg_count?: number;
  share_count?: number;
  collect_count?: number;
  play_count?: number;
  forward_count?: number;
  recommend_count?: number;
  share_url?: string;
  url?: string;
  dynamic_cover?: string[];
  images?: string[];
  play_addr?: string;
  play_uri?: string;
  duration?: number;
  music_id?: string;
  music_title?: string;
  music_author?: string;
  music_play_url?: string;
  tags?: string[];
  suggest_words?: string[];
};

export type DouyinPostParams = {
  url: string;
  limit?: number;
};

export type DouyinPostItem = {
  aweme_id?: string;
  desc?: string;
  create_time?: number;
  caption?: string;
  recommend_count?: number;
  comment_count?: number;
  digg_count?: number;
  share_count?: number;
  collect_count?: number;
  share_url?: string;
  video_url?: string[];
  video_cover?: string;
  video_duration?: number;
  music_title?: string;
  music_author?: string;
  music_duration?: number;
  music_play_url?: string;
  tags?: string[];
  suggest_words?: string[];
};

export type DouyinUser = {
  nickname?: string;
  sec_uid?: string;
  signature?: string;
  uid?: string;
  unique_id?: string;
  avatar?: string;
  ip_location?: string;
  aweme_count?: number;
  favoriting_count?: number;
  follower_count?: number;
  following_count?: number;
  max_follower_count?: number;
  total_favorited?: number;
};

export type DouyinPostResult = {
  post?: DouyinPostItem[];
  user?: DouyinUser;
};

export type DouyinCommentParams = {
  url: string;
  limit?: number;
};

export type DouyinComment = {
  cid?: string;
  text?: string;
  create_time?: number;
  ip_label?: string;
  digg_count?: number;
  reply_comment_total?: number;
  user_uid?: string;
  user_nickname?: string;
  user_sec_uid?: string;
  reply_comment?: DouyinComment[];
};

type GuaikaiResponse<T> = {
  errcode: number;
  errmsg: string;
  data?: T;
};

type GuaikaiApiOptions = {
  baseUrl?: string;
  token?: string;
  now?: () => number;
};

const DOUYIN_GENERAL_SEARCH_CREATE_PATH = '/api/douyin/general-search/keyword';
const DOUYIN_GENERAL_SEARCH_RESULT_PATH = '/api/douyin/general-search/info';
const DOUYIN_POST_CREATE_PATH = '/api/douyin/post/url';
const DOUYIN_POST_RESULT_PATH = '/api/douyin/post/info';
const DOUYIN_COMMENT_CREATE_PATH = '/api/douyin/comment/url';
const DOUYIN_COMMENT_RESULT_PATH = '/api/douyin/comment/info';

export class GuaikaiApiService {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly now: () => number;

  constructor(options: GuaikaiApiOptions = {}) {
    this.baseUrl = options.baseUrl ?? env.get('GUAIKAI_API_BASE_URL');
    this.token = options.token ?? env.get('GUAIKAI_API_TOKEN') ?? '';
    this.now = options.now ?? (() => Math.floor(Date.now() / 1000));
  }

  protected async getFetchClient(): Promise<Pick<FetchClient, 'json'>> {
    return app.container.make('fetch');
  }

  async createDouyinGeneralSearchTask(params: DouyinGeneralSearchParams, timestamp = this.now()) {
    await this.createTask(DOUYIN_GENERAL_SEARCH_CREATE_PATH, params, timestamp);
    return timestamp;
  }

  getDouyinGeneralSearchResult(params: DouyinGeneralSearchParams, timestamp: number) {
    return this.getTask<DouyinGeneralSearchItem[]>(DOUYIN_GENERAL_SEARCH_RESULT_PATH, params, timestamp);
  }

  async createDouyinPostTask(params: DouyinPostParams, timestamp = this.now()) {
    await this.createTask(DOUYIN_POST_CREATE_PATH, params, timestamp);
    return timestamp;
  }

  getDouyinPostResult(params: DouyinPostParams, timestamp: number) {
    return this.getTask<DouyinPostResult>(DOUYIN_POST_RESULT_PATH, params, timestamp);
  }

  async createDouyinCommentTask(params: DouyinCommentParams, timestamp = this.now()) {
    await this.createTask(DOUYIN_COMMENT_CREATE_PATH, params, timestamp);
    return timestamp;
  }

  getDouyinCommentResult(params: DouyinCommentParams, timestamp: number) {
    return this.getTask<DouyinComment[]>(DOUYIN_COMMENT_RESULT_PATH, params, timestamp);
  }

  private async createTask(path: string, params: object, timestamp: number) {
    await this.request(path, 'POST', params, timestamp);
  }

  private async getTask<T>(path: string, params: object, timestamp: number) {
    return this.request<T>(path, 'GET', params, timestamp);
  }

  private async request<T>(path: string, method: 'GET' | 'POST', params: object, timestamp: number): Promise<T | undefined> {
    if (!this.token) throw new BusinessException('Guaikai API token is not configured');
    if (!Number.isInteger(timestamp) || timestamp < 1_000_000_000 || timestamp >= 100_000_000_000) {
      throw new BusinessException('Guaikai API timestamp must be a 10-digit Unix timestamp');
    }

    const endpoint = new URL(path, this.baseUrl);
    endpoint.searchParams.set('_', timestamp.toString());
    if (method === 'GET') {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) endpoint.searchParams.set(key, value.toString());
      }
    }

    const response = await (await this.getFetchClient()).json<GuaikaiResponse<T> | null>(endpoint, {
      method,
      signal: AbortSignal.timeout(30000),
      headers: {
        TOKEN: this.token,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : { Accept: 'application/json' }),
      },
      ...(method === 'POST' ? { body: JSON.stringify(params) } : {}),
    });

    if (!response) throw new BusinessException('Guaikai API response body is empty');
    if (response.errcode !== 0) throw new BusinessException(response.errmsg || 'Guaikai API request failed', response.errcode);
    if (method === 'GET' && response.data === undefined) throw new BusinessException('Guaikai API response data is empty');

    return response.data;
  }
}
