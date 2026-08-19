import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import { Job } from '@adonisjs/queue';
import type { JobOptions } from '@adonisjs/queue/types';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { TASK_STATUS } from '#models/crawler-video-task';
import { CrawlerVideoTaskService } from '#services/crawler-video-task-service';
import { ShanhaiApiService } from '#services/shanhai-api-service';
import { VideoService } from '#services/video-service';

interface CrawlerVideoPayload {
  taskId: number;
  videoUrl: string;
  userId: string;
}

export const QUEUE_NAME = 'crawler-video-queue';

@inject()
export default class CrawlerVideoJob extends Job<CrawlerVideoPayload> {
  static options: JobOptions = {
    queue: QUEUE_NAME,
  };

  constructor(
    private readonly shanhaiApiService: ShanhaiApiService,
    private readonly crawlerVideoTaskService: CrawlerVideoTaskService,
    private readonly videoService: VideoService,
  ) {
    super();
  }

  async execute() {
    const { taskId, videoUrl, userId } = this.payload;
    logger.info(`Executing CrawlerVideoJob for taskId: ${taskId}, videoUrl: ${videoUrl}, userId: ${userId}`);
    // 1. 从山海 API 获取视频信息
    const videoInfo = await this.shanhaiApiService.fetchVideoInfo(videoUrl);
    const oss = await app.container.make('oss');
    const ossKey = `cv/${uuidv4()}.mp4`;
    const ossResp = await oss.putURL(videoInfo.videoUrl, ossKey);
    await this.videoService.createVideos({
      userId,
      payload: [
        {
          author: videoInfo.author,
          platform: videoInfo.platform,
          fileUrl: ossResp.url,
          likeCount: videoInfo.stats.likeCount ?? 0,
          playCount: videoInfo.stats.playCount ?? 0,
          shareCount: videoInfo.stats.shareCount ?? 0,
          favoriteCount: videoInfo.stats.collectCount ?? 0,
          commentCount: videoInfo.stats.commentCount ?? 0,
          publishAt: DateTime.now().toUTC(),
          title: videoInfo.title,
        },
      ],
    });
    await this.crawlerVideoTaskService.update({
      payload: { status: TASK_STATUS.COMPLETED, taskId },
    });
  }

  async failed(error: Error) {
    const { taskId } = this.payload;
    await this.crawlerVideoTaskService.update({
      payload: { status: TASK_STATUS.FAILED, taskId, reason: error.message },
    });
  }
}
