import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import type { Infer } from '@vinejs/vine/types';
import BusinessException from '#exceptions/business-exception';
import Video from '#models/video';
import type { createVideoValidator, listVideoValidator, updateVideoValidator } from '#validators/video';

export class VideoService {
  async createVideos(params: { payload: Infer<typeof createVideoValidator>['videos']; userId: string }) {
    const videos = await Video.createMany(params.payload.map((video) => ({ userId: params.userId, ...video })));
    return videos;
  }

  async updateVideo(params: { videoId: number; userId: string; payload: Infer<typeof updateVideoValidator> }) {
    const { videoId, userId, payload } = params;
    const video = await Video.findBy({ id: videoId, userId: userId });
    if (!video) throw new BusinessException('视频不存在');
    const { params: _, ...rest } = payload;
    await video.merge(rest).save();
    return video;
  }

  async deleteVideos(params: { videoIds: number[]; userId: string }) {
    const { videoIds, userId } = params;
    const userVideos = await Video.query().whereIn('id', videoIds).where('user_id', userId).exec();
    // 没有视频需要删除
    if (userVideos.length <= 0) return [];
    const oss = await app.container.make('oss');
    await Promise.all(userVideos.map((v) => v.delete()));
    const ossKeys = userVideos
      .map((v) => {
        const parts = v.fileUrl.split('/');
        const dir = parts[parts.length - 2];
        const key = parts[parts.length - 1];
        if (!dir || !key) return null;
        return `${dir}/${key}`;
      })
      .filter((v) => v !== null);
    try {
      await Promise.all(ossKeys.map((v) => oss.delete(v)));
    } catch (e: any) {
      logger.error({ videoIds, userId, ossKeys, err: e.message }, 'delete oss video files failed');
      throw new BusinessException(e.message);
    }
    return userVideos.map((v) => v.id);
  }

  async listVideo(params: { payload: Infer<typeof listVideoValidator>; userId: string }) {
    const { payload, userId } = params;
    const query = Video.query().where('user_id', userId);
    if (payload.publishAt) query.where('publishAt', payload.publishAt.toSQLDate() || '');
    if (payload.minLikeCount) query.where('likeCount', '>=', payload.minLikeCount);
    if (payload.maxLikeCount) query.where('likeCount', '<=', payload.maxLikeCount);
    if (payload.minPlayCount) query.where('playCount', '>=', payload.minPlayCount);
    if (payload.maxPlayCount) query.where('playCount', '<=', payload.maxPlayCount);
    if (payload.minShareCount) query.where('shareCount', '>=', payload.minShareCount);
    if (payload.maxShareCount) query.where('shareCount', '<=', payload.maxShareCount);
    if (payload.minFavoriteCount) query.where('favoriteCount', '>=', payload.minFavoriteCount);
    if (payload.maxFavoriteCount) query.where('favoriteCount', '<=', payload.maxFavoriteCount);
    if (payload.minCommentCount) query.where('commentCount', '>=', payload.minCommentCount);
    if (payload.maxCommentCount) query.where('commentCount', '<=', payload.maxCommentCount);
    if (payload.author) query.whereILike('author', `%${payload.author}%`);
    if (payload.title) query.whereILike('title', `%${payload.title}%`);
    query.orderBy('created_at', 'desc');
    return await query.paginate(payload.page, payload.size);
  }

  async getVideoById(params: { id: number; userId: string }) {
    const { id, userId } = params;
    return await Video.query().where('user_id', userId).where('id', id).first();
  }

  async getVideosByIds(params: { ids: number[]; userId: string }) {
    const { ids, userId } = params;
    return await Video.query().where('user_id', userId).whereIn('id', ids).exec();
  }
}
