import { createHash } from 'node:crypto';
import BusinessException from '#exceptions/business-exception';
import type { DouyinPostItem, DouyinPostResult } from '#services/guaikai-api-service';

export const SEARCH_TIMEOUT_MS = 30 * 60 * 1000;
export const DOWNLOAD_TIMEOUT_MS = 20 * 60 * 1000;
export const CACHE_DAYS = 7;
export type PostFilters = { startDate?: string; endDate?: string; minLikes?: number; minCollects?: number; minComments?: number };
export type PostItem = {
  awemeId: string;
  title: string;
  publishedAt: number;
  likes: number;
  collects: number;
  comments: number;
  duration: number;
  shareUrl: string | null;
  videoUrls: string[];
  coverUrl: string | null;
};

export function postCacheKey(secUid: string, limit: number) {
  return createHash('sha256')
    .update(JSON.stringify(['/api/douyin/post/url', secUid, limit]))
    .digest('hex');
}

export function postLimit(count: number) {
  return Math.min(10000, Math.max(0, Math.floor(Number.isFinite(count) ? count : 0)));
}

export function publicMediaUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    const domains = ['douyinvod.com', 'zjcdn.com', 'amemv.com', 'douyinpic.com', 'douyinstatic.com', 'byteimg.com', 'pstatp.com', 'ibytedtos.com', 'bytecdn.cn'];
    if (!domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function count(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function normalizePostResult(result: DouyinPostResult | undefined): PostItem[] {
  if (!result || typeof result !== 'object' || !Array.isArray(result.post)) throw new BusinessException('作品返回格式异常，请稍后重试');
  const seen = new Set<string>();
  return result.post.flatMap((entry: DouyinPostItem) => {
    if (!entry || typeof entry !== 'object') return [];
    const awemeId = typeof entry.aweme_id === 'string' && /^[\w-]{1,128}$/.test(entry.aweme_id) ? entry.aweme_id : '';
    if (awemeId && seen.has(awemeId)) return [];
    if (awemeId) seen.add(awemeId);
    return [
      {
        awemeId,
        title: typeof entry.desc === 'string' ? entry.desc : typeof entry.caption === 'string' ? entry.caption : '',
        publishedAt: count(entry.create_time),
        likes: count(entry.digg_count),
        collects: count(entry.collect_count),
        comments: count(entry.comment_count),
        duration: count(entry.video_duration),
        shareUrl: awemeId ? `https://www.douyin.com/video/${awemeId}` : null,
        videoUrls: Array.isArray(entry.video_url) ? [...new Set(entry.video_url.map(publicMediaUrl).filter((url): url is string => Boolean(url)))] : [],
        coverUrl: publicMediaUrl(entry.video_cover),
      },
    ];
  });
}

export function filterPosts(posts: PostItem[], filters: PostFilters) {
  const start = filters.startDate ? Date.parse(`${filters.startDate}T00:00:00+08:00`) / 1000 : null;
  const end = filters.endDate ? Date.parse(`${filters.endDate}T00:00:00+08:00`) / 1000 + 86400 : null;
  return posts
    .filter(
      (post) =>
        (start === null || (post.publishedAt > 0 && post.publishedAt >= start)) &&
        (end === null || (post.publishedAt > 0 && post.publishedAt < end)) &&
        post.likes >= (filters.minLikes ?? 0) &&
        post.collects >= (filters.minCollects ?? 0) &&
        post.comments >= (filters.minComments ?? 0),
    )
    .sort((left, right) => right.publishedAt - left.publishedAt || right.awemeId.localeCompare(left.awemeId));
}

export function validatePostFilters(filters: PostFilters) {
  for (const date of [filters.startDate, filters.endDate]) {
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00+08:00`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)
    ) {
      throw new BusinessException('请输入有效的发布日期');
    }
  }
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) throw new BusinessException('开始日期不能晚于结束日期');
  return filters;
}

export async function firstWorkingVideo(urls: string[], upload: (url: string) => Promise<string>) {
  for (const url of urls) {
    try {
      return await upload(url);
    } catch {}
  }
  throw new BusinessException('所有视频地址均下载失败，链接可能已失效；请检查缓存到期时间后重试');
}
