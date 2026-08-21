import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import { Job } from '@adonisjs/queue';
import type { JobOptions } from '@adonisjs/queue/types';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { TASK_STATUS } from '#models/crawler-video-task';
import type { OssClient } from '#providers/oss-provider';
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
    // 1. 从山海 API 获取候选视频地址（按大小从小到大排列，兜底视频在最后）
    const videoInfo = await this.shanhaiApiService.fetchVideoInfo(videoUrl);

    // 2. 逐个尝试下载，直到成功；全部失败才视为失败
    const oss = await this.makeOssClient();
    let ossResp: Awaited<ReturnType<typeof oss.putURL>> | undefined;
    let lastError: Error | undefined;
    for (const candidateUrl of videoInfo.videoUrls) {
      try {
        const ossKey = `cv/${uuidv4()}.mp4`;
        ossResp = await oss.putURL(candidateUrl, ossKey);
        logger.info({ url: candidateUrl }, 'Video candidate downloaded successfully');
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({ url: candidateUrl, error: lastError.message }, 'Video candidate download failed, trying next');
      }
    }
    if (!ossResp) throw lastError ?? new Error('All video download attempts failed');

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
          publishAt: this.safeCovertPublishTime(videoInfo.stats.publishTime),
          title: videoInfo.title,
        },
      ],
    });
    await this.crawlerVideoTaskService.update({
      payload: { status: TASK_STATUS.COMPLETED, taskId },
    });
  }

  protected async makeOssClient(): Promise<OssClient> {
    return app.container.make('oss');
  }

  async failed(error: Error) {
    const { taskId } = this.payload;
    await this.crawlerVideoTaskService.update({
      payload: { status: TASK_STATUS.FAILED, taskId, reason: error.message },
    });
  }

  private safeCovertPublishTime(publishTime?: string) {
    if (!publishTime) return DateTime.now().toUTC();
    const dt = DateTime.fromSQL(publishTime);
    if (!dt.isValid) return DateTime.now().toUTC();
    return dt.toUTC();
  }
}
