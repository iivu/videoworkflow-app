export function stringifyQuery(data?: Record<string, any>) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data !== 'object' || Object.keys(data).length === 0) return '';
  return Object.keys(data)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&');
}

export function stringifyBody(data?: Record<string, any> | string) {
  if (data && typeof data === 'object' && Object.keys(data).length > 0) return JSON.stringify(data);
  if (typeof data === 'string') return data;
  return '';
}

export function safeJsonParse(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function extractUrl(content: string) {
  const urlRegex = /\bhttps?:\/\/[^\s/$.?#].[^\s]*\b/gi;
  const match = content.match(urlRegex);
  return match ? match[0] : null;
}

export type VideoPlatform = 'douyin' | 'sph';

/**
 * 简单校验 URL 所属平台：抖音（douyin.com / iesdouyin.com）或微信视频号（weixin.qq.com）
 */
export function detectPlatformFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.endsWith('douyin.com') || hostname.endsWith('iesdouyin.com')) return 'douyin';
    if (hostname.endsWith('weixin.qq.com')) return 'sph';
    return null;
  } catch {
    return null;
  }
}
