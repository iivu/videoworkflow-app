import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { pipeline, Readable } from 'node:stream';
import { promisify } from 'node:util';
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
const pipelineAsync = promisify(pipeline);

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
    const tempDir = app.tmpPath(`crawler-video/${uuidv4()}`);
    const videoPath = `${tempDir}/source-video`;
    // 1. 调用 ApiZero 解析视频信息（平台由链接自动识别，flat=2）
    const data = await this.apizeroService.videoParse(videoUrl);
    // 2. 映射为视频创建字段并下载视频
    const videoInput = mapToVideoPayload(data, platform);
    const oss = await this.makeOssClient();
    const ossKey = `cv/${DateTime.now().toFormat('yyyyMM')}/${uuidv4()}.mp4`;
    logger.info({ taskId, downloadUrl: videoInput.fileUrl, ossKey }, 'Downloading crawler video');
    await mkdir(tempDir, { recursive: true });
    try {
      await this.downloadVideo(videoInput.fileUrl, videoPath);
      logger.info({ taskId, downloadUrl: videoInput.fileUrl, ossKey, videoPath }, 'Crawler video downloaded');

      const ossResp = await oss.putStream(createReadStream(videoPath), ossKey);
      logger.info({ taskId, downloadUrl: videoInput.fileUrl, ossKey, ossUrl: ossResp.url }, 'Crawler video uploaded to OSS');

      await this.videoService.createVideos({
        userId,
        payload: [{ ...videoInput, fileUrl: ossResp.url }],
      });
      await this.crawlerVideoTaskService.update({
        payload: { status: TASK_STATUS.COMPLETED, taskId },
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  protected async makeOssClient(): Promise<OssClient> {
    return app.container.make('oss');
  }

  protected async downloadVideo(videoUrl: string, videoPath: string) {
    const fetchClient = await app.container.make('fetch');
    const stream = await fetchClient.stream(videoUrl);
    await pipelineAsync(Readable.fromWeb(stream), createWriteStream(videoPath));
  }

  async failed(error: Error) {
    const { taskId } = this.payload;
    try {
      await this.crawlerVideoTaskService.update({
        payload: { status: TASK_STATUS.FAILED, taskId, reason: error.message },
      });
    } catch (updateError) {
      logger.error({ taskId, err: updateError instanceof Error ? updateError.message : String(updateError) }, 'Failed to persist CrawlerVideoJob failure');
    }
  }
}
