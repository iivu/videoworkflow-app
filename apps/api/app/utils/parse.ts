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
