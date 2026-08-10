import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';

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
};

type ShanhaiVideoData = {
  title: string;
  video_url?: string;
};

type ShanhaiApiData = {
  code: number;
  msg?: string;
  message?: string;
  data?: ShanhaiVideoData;
  stats?: ShanhaiStats;
  video_list?: VideoItem[];
};

type ShanhaiApiResponse = {
  code: number;
  msg?: string;
  message?: string;
  data?: ShanhaiApiData;
};

export type ShanhaiVideoInfo = {
  title: string;
  videoUrl: string;
  author: string;
  stats: {
    likeCount: number;
    playCount: number;
    shareCount: number;
    collectCount: number;
    commentCount: number;
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

function mapVideoInfo(data: ShanhaiApiData, videoUrl: string, title: string): ShanhaiVideoInfo {
  const stats = data.stats;
  return {
    title,
    videoUrl,
    author: stats?.author_name || 'Unknown',
    stats: {
      likeCount: stats?.like_count || 0,
      playCount: stats?.play_count || 0,
      shareCount: stats?.share_count || 0,
      collectCount: stats?.collect_count || 0,
      commentCount: stats?.comment_count || 0,
    },
  };
}

export class ShanhaiApiService {
  protected async getFetchClient(): Promise<Pick<FetchClient, 'json' | 'formData'>> {
    return app.container.make('fetch');
  }

  async fetchVideoInfo(url: string): Promise<ShanhaiVideoInfo> {
    const apiUrl = new URL(env.get('SHANHAI_API_HOST'));
    const path = [apiUrl.pathname, env.get('SHANHAI_API_PREFIX'), 'video6']
      .map((segment) => segment.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
    apiUrl.pathname = `/${path}`;
    apiUrl.search = '';
    apiUrl.searchParams.set('key', env.get('SHANHAI_API_KEY'));
    apiUrl.searchParams.set('url', url);
    const fetchClient = await this.getFetchClient();
    const response = await fetchClient.json<ShanhaiApiResponse | null>(apiUrl);

    if (!response) throw new Error('Response body is empty');
    if (response.code !== 200) throw new Error(response.msg || response.message || 'API error (level 1)');
    if (!response.data) throw new Error('Response data is empty');
    if (response.data.code !== 200) throw new Error(response.data.msg || response.data.message || 'API error (level 2)');

    const videoList = response.data.video_list;
    if (Array.isArray(videoList) && videoList.length > 0) {
      const smallestVideo = videoList.reduce((smallest, video) => (parseSizeToBytes(video.size) < parseSizeToBytes(smallest.size) ? video : smallest));
      if (smallestVideo.url) {
        const result = mapVideoInfo(response.data, smallestVideo.url, response.data.data?.title || 'Unknown');
        logger.info({ source: 'video_list', title: result.title }, 'Shanhai video info retrieved');
        return result;
      }
    }

    const fallbackData = response.data.data;
    const fallbackUrl = fallbackData?.video_url;
    if (!fallbackUrl) throw new Error('Video URL is empty');

    const result = mapVideoInfo(response.data, fallbackUrl, fallbackData.title);
    logger.info({ source: 'data', title: result.title }, 'Shanhai video info retrieved');
    return result;
  }
}
