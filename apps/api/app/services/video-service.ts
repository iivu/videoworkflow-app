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

  async updateVideo(params: { videoId: number; payload: Infer<typeof updateVideoValidator> }) {
    const { videoId, payload } = params;
    const video = await Video.find(videoId);
    if (!video) throw new BusinessException('视频不存在');
    const { params: _, ...rest } = payload;
    await video.merge(rest).save();
    return video;
  }

  async deleteVideos(params: { videoIds: number[] }) {
    const { videoIds } = params;
    const videos = await Video.query().whereIn('id', videoIds).exec();
    // 没有视频需要删除
    if (videos.length <= 0) return [];
    const oss = await app.container.make('oss');
    await Promise.all(videos.map((v) => v.delete()));
    const ossKeys = videos
      .map((v) => {
        const url = new URL(v.fileUrl);
        return url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
      })
      .filter((v) => v !== null);
    try {
      await Promise.all(ossKeys.map((v) => oss.delete(v)));
    } catch (e: any) {
      logger.error({ videoIds, ossKeys, err: e.message }, 'delete oss video files failed');
      throw new BusinessException(e.message);
    }
    return videos.map((v) => v.id);
  }

  async listVideo(params: { payload: Infer<typeof listVideoValidator> }) {
    const { payload } = params;
    const query = Video.query();
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

  async getVideoById(params: { id: number }) {
    const { id } = params;
    return await Video.find(id);
  }

  async getVideosByIds(params: { ids: number[] }) {
    const { ids } = params;
    return await Video.query().whereIn('id', ids).exec();
  }
}
