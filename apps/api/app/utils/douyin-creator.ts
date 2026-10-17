import BusinessException from '#exceptions/business-exception';
import type { DouyinUser } from '#services/guaikai-api-service';

export const DOUYIN_CREATOR_TASK_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
} as const;

export function normalizeDouyinCreatorInput(input: string) {
  const value = input.trim();
  if (/^MS4wLj[A-Za-z0-9_-]+$/.test(value) && value.length <= 128) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error();
    if (url.hostname === 'www.douyin.com' || url.hostname === 'douyin.com') {
      const match = url.pathname.match(/^\/user\/(MS4wLj[A-Za-z0-9_-]+)\/?$/);
      if (match && match[1].length <= 128) return match[1];
    }
    if (url.hostname === 'v.douyin.com' && /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
      const normalized = `https://v.douyin.com/${url.pathname.split('/')[1]}/`;
      if (normalized.length <= 255) return normalized;
    }
  } catch {}
  throw new BusinessException('请输入有效的抖音博主主页链接、分享链接或 sec_uid');
}

function count(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function douyinCreatorSnapshot(user: DouyinUser) {
  if (!user.sec_uid || !/^MS4wLj[A-Za-z0-9_-]+$/.test(user.sec_uid) || user.sec_uid.length > 128) {
    throw new BusinessException('未获取到有效的博主身份，请检查主页链接后重试');
  }
  return {
    secUid: user.sec_uid,
    uid: user.uid || null,
    uniqueId: user.unique_id || null,
    nickname: user.nickname || null,
    signature: user.signature || null,
    ipLocation: user.ip_location || null,
    awemeCount: count(user.aweme_count),
    favoritingCount: count(user.favoriting_count),
    followerCount: count(user.follower_count),
    followingCount: count(user.following_count),
    maxFollowerCount: count(user.max_follower_count),
    totalFavorited: count(user.total_favorited),
  };
}

export function isDouyinCreatorPending(error: unknown) {
  return error instanceof BusinessException && Number(error.code) > 0 && Number(error.code) < 10;
}
