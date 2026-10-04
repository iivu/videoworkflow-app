import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import { Job } from '@adonisjs/queue';
import type { JobOptions } from '@adonisjs/queue/types';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import BusinessException from '#exceptions/business-exception';
import { TASK_STATUS } from '#models/crawler-video-task';
import type { OssClient } from '#providers/oss-provider';
import { ApizeroService, type ApizeroVideoData } from '#services/apizero-service';
import { CrawlerVideoTaskService } from '#services/crawler-video-task-service';
import { VideoService } from '#services/video-service';
import type { VideoPlatform } from '#utils/parse';

interface CrawlerVideoPayload {
  taskId: number;
  videoUrl: string;
  platform: VideoPlatform;
  userId: string;
}

export const QUEUE_NAME = 'crawler-video-queue';

function parsePublishTime(value?: string | null) {
  if (!value) return DateTime.now().toUTC();
  const dt = DateTime.fromSQL(value);
  if (!dt.isValid) return DateTime.now().toUTC();
  return dt.toUTC();
}

/**
 * 将 ApiZero 原始响应（flat=2）映射为 videos 创建所需的字段
 */
export function mapToVideoPayload(data: ApizeroVideoData, platform: VideoPlatform) {
  const fileUrl = data.video_url;
  if (!fileUrl) throw new BusinessException('视频链接为空');

  return {
    title: data.title,
    author: data.stats.author_name,
    platform,
    coverUrl: data.cover_url || undefined,
    fileUrl,
    publishAt: parsePublishTime(data.stats.publish_time),
    likeCount: data.stats.like_count,
    playCount: data.stats.play_count,
    shareCount: data.stats.share_count,
    favoriteCount: data.stats.collect_count,
    commentCount: data.stats.comment_count,
  };
}

@inject()
export default class CrawlerVideoJob extends Job<CrawlerVideoPayload> {
  static options: JobOptions = {
    queue: QUEUE_NAME,
  };

  constructor(
    private readonly apizeroService: ApizeroService,
    private readonly crawlerVideoTaskService: CrawlerVideoTaskService,
    private readonly videoService: VideoService,
  ) {
    super();
  }

  async execute() {
    const { taskId, videoUrl, platform, userId } = this.payload;
    logger.info(`Executing CrawlerVideoJob for taskId: ${taskId}, videoUrl: ${videoUrl}, platform: ${platform}, userId: ${userId}`);
    // 1. 调用 ApiZero 解析视频信息（平台由链接自动识别，flat=2）
    const data = await this.apizeroService.videoParse(videoUrl);

    // 2. 映射为视频创建字段并下载到 OSS
    const videoInput = mapToVideoPayload(data, platform);
    const oss = await this.makeOssClient();
    const ossKey = `cv/${uuidv4()}.mp4`;
    const ossResp = await oss.putURL(videoInput.fileUrl, ossKey);
    logger.info({ url: ossResp.url }, 'Video downloaded successfully');

    await this.videoService.createVideos({
      userId,
      payload: [{ ...videoInput, fileUrl: ossResp.url }],
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
}
