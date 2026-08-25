import { createUuid } from '#/shared/uuid';

export const MAX_VIDEO_COUNT = 10;

export const VIDEO_PLATFORMS = [
  { value: 'douyin', label: '抖音' },
  { value: 'sph', label: '视频号' },
] as const;

export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number]['value'];

export const COUNT_FIELDS = [
  ['likeCount', '点赞数', '赞'],
  ['playCount', '播放数', '播'],
  ['shareCount', '分享数', '享'],
  ['favoriteCount', '收藏数', '藏'],
  ['commentCount', '评论数', '评'],
] as const;

type CountField = (typeof COUNT_FIELDS)[number][0];
type CountValue = number | '';

export type VideoDraft = {
  id: string;
  objectKey: string;
  file: File;
  uploadedUrl?: string;
  title: string;
  author: string;
  platform: VideoPlatform;
  publishAt?: Date;
  likeCount: CountValue;
  playCount: CountValue;
  shareCount: CountValue;
  favoriteCount: CountValue;
  commentCount: CountValue;
};

export type DraftErrors = Partial<Record<'title' | 'author' | 'platform' | 'publishAt' | CountField, string>>;

export function createDraft(file: File): VideoDraft {
  const id = createUuid();
  const extension = file.name.match(/\.[^.]+$/)?.[0].toLowerCase() ?? '';
  return {
    id,
    objectKey: `videos/${id}${extension}`,
    file,
    title: file.name.replace(/\.[^.]+$/, ''),
    author: '',
    platform: 'douyin',
    publishAt: undefined,
    likeCount: 0,
    playCount: 0,
    shareCount: 0,
    favoriteCount: 0,
    commentCount: 0,
  };
}

export function validateDraft(draft: VideoDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.title.trim()) errors.title = '请输入视频标题';
  if (!draft.author.trim()) errors.author = '请输入视频作者';
  else if (draft.author.trim().length > 24) errors.author = '作者不能超过 24 个字符';
  if (!VIDEO_PLATFORMS.some((option) => option.value === draft.platform)) errors.platform = '请选择视频平台';
  if (!draft.publishAt) errors.publishAt = '请选择发布日期';

  for (const [field, label] of COUNT_FIELDS) {
    const value = draft[field];
    if (value !== '' && (!Number.isFinite(value) || !Number.isInteger(value) || value < 0)) {
      errors[field] = `${label}必须是非负整数`;
    }
  }
  return errors;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
