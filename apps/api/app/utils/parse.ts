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

export type VideoPlatform = 'douyin' | 'xhs';

/**
 * 简单校验 URL 所属平台：抖音（douyin.com / iesdouyin.com）或小红书（xiaohongshu.com / xhslink.com / xhslink.cn）
 */
export function detectPlatformFromUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    if (hostname.endsWith('douyin.com') || hostname.endsWith('iesdouyin.com')) return 'douyin';
    if (hostname.endsWith('xiaohongshu.com') || hostname.endsWith('xhslink.com') || hostname.endsWith('xhslink.cn')) return 'xhs';
    return null;
  } catch {
    return null;
  }
}
