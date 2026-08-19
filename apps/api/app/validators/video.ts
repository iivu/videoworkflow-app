import vine from '@vinejs/vine';

const videoSchema = vine.object({
  title: vine.string().trim(),
  author: vine.string().trim(),
  platform: vine.string().trim().maxLength(32),
  coverUrl: vine.string().url().optional(),
  fileUrl: vine.string().url(),
  publishAt: vine.date({ formats: ['iso8601'] }).transform((value) => value.setZone('utc')),
  likeCount: vine.number().min(0).optional(),
  playCount: vine.number().min(0).optional(),
  shareCount: vine.number().min(0).optional(),
  favoriteCount: vine.number().min(0).optional(),
  commentCount: vine.number().min(0).optional(),
});

const videosSchema = vine.array(videoSchema).maxLength(10);

export const createVideoValidator = vine.create({ videos: videosSchema });

export const listVideoValidator = vine.create({
  page: vine.number().positive(),
  size: vine.number().positive(),
  author: vine.string().optional(),
  title: vine.string().optional(),
  publishAt: vine
    .date({ formats: ['iso8601'] })
    .transform((value) => value.setZone('utc'))
    .optional(),
  minLikeCount: vine.number().optional(),
  maxLikeCount: vine.number().optional(),
  minPlayCount: vine.number().optional(),
  maxPlayCount: vine.number().optional(),
  minShareCount: vine.number().optional(),
  maxShareCount: vine.number().optional(),
  minFavoriteCount: vine.number().optional(),
  maxFavoriteCount: vine.number().optional(),
  minCommentCount: vine.number().optional(),
  maxCommentCount: vine.number().optional(),
});

export const checkVideoValidator = vine.create({
  params: vine.object({ id: vine.number().positive() }),
});

export const updateVideoValidator = vine.create({
  params: vine.object({ id: vine.number().positive() }),
  title: vine.string().trim().optional(),
  author: vine.string().trim().optional(),
  likeCount: vine.number().min(0).optional(),
  playCount: vine.number().min(0).optional(),
  shareCount: vine.number().min(0).optional(),
  favoriteCount: vine.number().min(0).optional(),
  commentCount: vine.number().min(0).optional(),
});

export const deleteVideoValidator = vine.create({
  ids: vine.array(vine.number().positive()),
});
