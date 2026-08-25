import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import BusinessException from '#exceptions/business-exception';

import type { FetchClient } from '#providers/fetch-provider';
import env from '#start/env';

type VideoItem = {
  url: string;
  size: string;
  quality?: string;
  resolution?: string;
};

type ShanhaiStats = {
  like_count?: number;
  play_count?: number;
  author_name?: string;
  share_count?: number;
  collect_count?: number;
  comment_count?: number;
  publish_time?: string;
};

type ShanhaiApiData = {
  title: string;
  video_url?: string;
  stats?: ShanhaiStats;
  video_list?: VideoItem[];
  platform?: string;
};

type ShanhaiApiResponse = {
  code: number;
  msg?: string;
  message?: string;
  data?: ShanhaiApiData;
};

export type ShanhaiVideoInfo = {
  title: string;
  /** 候选视频地址，按大小从小到大排列，兜底视频（video_url）在最后 */
  videoUrls: string[];
  author: string;
  platform: string;
  stats: {
    likeCount: number;
    playCount: number;
    shareCount: number;
    collectCount: number;
    commentCount: number;
    publishTime?: string;
  };
};

const SIZE_UNITS = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
} as const;

function parseSizeToBytes(size: string) {
  const match = size.trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) return 0;

  const value = Number.parseFloat(match[1]);
  const unit = match[2].toUpperCase() as keyof typeof SIZE_UNITS;
  return value * SIZE_UNITS[unit];
}

function mapVideoInfo(data: ShanhaiApiData, videoUrls: string[], title: string): ShanhaiVideoInfo {
  const stats = data.stats;
  return {
    title,
    videoUrls,
    author: stats?.author_name || 'Unknown',
    platform: data.platform || 'unknown',
    stats: {
      likeCount: stats?.like_count || 0,
      playCount: stats?.play_count || 0,
      shareCount: stats?.share_count || 0,
      collectCount: stats?.collect_count || 0,
      commentCount: stats?.comment_count || 0,
      publishTime: stats?.publish_time,
    },
  };
}

export class ShanhaiApiService {
  protected async getFetchClient(): Promise<Pick<FetchClient, 'json' | 'formData'>> {
    return app.container.make('fetch');
  }

  async fetchVideoInfo(url: string): Promise<ShanhaiVideoInfo> {
    const apiUrl = new URL(env.get('SHANHAI_API_HOST'));
    const path = [apiUrl.pathname, env.get('SHANHAI_API_PREFIX'), 'video-parse']
      .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
    apiUrl.pathname = `/${path}`;
    apiUrl.search = '';
    apiUrl.searchParams.set('key', env.get('SHANHAI_API_KEY'));
    apiUrl.searchParams.set('url', url);
    apiUrl.searchParams.set('flat', '1');
    const fetchClient = await this.getFetchClient();
    const response = await fetchClient.json<ShanhaiApiResponse | null>(apiUrl);
    if (!response) throw new BusinessException('Response body is empty');
    if (response.code !== 200 && response.code !== 0) throw new BusinessException(response.msg || response.message || 'API error (level 1)');
    if (!response.data) throw new BusinessException('Response data is empty');

    const data = response.data;
    const videoList = Array.isArray(data.video_list) ? data.video_list : [];
    const videoUrls = videoList
      .filter((video) => Boolean(video.url))
      .sort((a, b) => parseSizeToBytes(a.size) - parseSizeToBytes(b.size))
      .map((video) => video.url);

    if (data.video_url && !videoUrls.includes(data.video_url)) {
      videoUrls.push(data.video_url);
    }

    if (videoUrls.length === 0) throw new BusinessException('Video URL is empty');

    const result = mapVideoInfo(data, videoUrls, data.title ?? 'Unknown');
    logger.info({ source: 'video_list', title: result.title, candidates: videoUrls.length }, 'Shanhai video info retrieved');
    return result;
  }
}
