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
import { _52ApiService, type Api52DouyinVideoData, type Api52SphVideoData } from '#services/52api-service';
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

/**
 * 将中文计数文本（如 "4.3万"、"1.2亿"、"1234"、"-"、""）解析为非负整数
 */
export function parseCount(value: string | number | null | undefined) {
  const str = String(value ?? '').trim();
  if (!str || str === '-') return 0;

  const wan = str.match(/^([\d.]+)万$/);
  if (wan) return Math.round(Number.parseFloat(wan[1]) * 10000);

  const yi = str.match(/^([\d.]+)亿$/);
  if (yi) return Math.round(Number.parseFloat(yi[1]) * 100000000);

  const num = Number(str);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : 0;
}

function parsePublishTime(value?: string | null) {
  if (!value) return DateTime.now().toUTC();
  const dt = DateTime.fromSQL(value);
  if (!dt.isValid) return DateTime.now().toUTC();
  return dt.toUTC();
}

/**
 * 将 52API 原始响应映射为 videos 创建所需的字段
 */
export function mapToVideoPayload(data: Api52DouyinVideoData | Api52SphVideoData, platform: VideoPlatform) {
  const fileUrl = data && 'work_url' in data ? data.work_url : (data as Api52SphVideoData).video_url;
  if (!fileUrl) throw new BusinessException('视频链接为空');

  if (platform === 'douyin') {
    const douyin = data as Api52DouyinVideoData;
    return {
      title: douyin.work_title,
      author: douyin.work_author,
      platform,
      coverUrl: douyin.work_cover || undefined,
      fileUrl,
      publishAt: parsePublishTime(douyin.work_time),
      likeCount: douyin.work_digg_count,
      playCount: 0,
      shareCount: douyin.work_share_count,
      favoriteCount: douyin.work_collect_count,
      commentCount: douyin.work_comment_count,
    };
  }

  const sph = data as Api52SphVideoData;
  return {
    title: sph.video_title,
    author: sph.video_author,
    platform,
    coverUrl: sph.video_cover || undefined,
    fileUrl,
    publishAt: parsePublishTime(sph.video_createtime),
    likeCount: parseCount(sph.video_likeNum),
    playCount: 0,
    shareCount: parseCount(sph.video_forwardNum),
    favoriteCount: parseCount(sph.video_favNum),
    commentCount: parseCount(sph.video_commentNum),
  };
}

@inject()
export default class CrawlerVideoJob extends Job<CrawlerVideoPayload> {
  static options: JobOptions = {
    queue: QUEUE_NAME,
  };

  constructor(
    private readonly api52Service: _52ApiService,
    private readonly crawlerVideoTaskService: CrawlerVideoTaskService,
    private readonly videoService: VideoService,
  ) {
    super();
  }

  async execute() {
    const { taskId, videoUrl, platform, userId } = this.payload;
    logger.info(`Executing CrawlerVideoJob for taskId: ${taskId}, videoUrl: ${videoUrl}, platform: ${platform}, userId: ${userId}`);
    // 1. 调用 52API 获取对应平台（douyin / sph）的视频信息
    const data = platform === 'sph' ? await this.api52Service.sph(videoUrl) : await this.api52Service.douyin(videoUrl);

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
