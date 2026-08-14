import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline, Readable } from 'node:stream';
import { promisify } from 'node:util';

import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import { Job } from '@adonisjs/queue';
import type { JobOptions } from '@adonisjs/queue/types';

import VideoBreakdownTask, { VIDEO_BREAKDOWN_TASK_STATUS } from '#models/video-breakdown-task';
import { buildSegmentCommand, segmentFileRelativePath, segmentOutputPath, VideoBreakdownService } from '#services/video-breakdown-service';

const execFileAsync = promisify(execFile);
const pipelineAsync = promisify(pipeline);

export const QUEUE_NAME = 'video-breakdown-queue';

type JobPayload = {
  taskId: string;
  videoUrl: string;
  userId: string;
  model: string;
};

@inject()
export default class VideoBreakdownJob extends Job<JobPayload> {
  static options: JobOptions = { queue: QUEUE_NAME };

  constructor(private readonly videoBreakdownService: VideoBreakdownService) {
    super();
  }

  async execute() {
    const { taskId, videoUrl, userId, model } = this.payload;
    const taskDir = app.tmpPath(`video-breakdown/${taskId}`);
    const segmentsDir = join(taskDir, 'segments');
    const videoPath = join(taskDir, 'source-video');
    const publicSegmentsDir = app.publicPath(`video-breakdown/${taskId}`);

    await VideoBreakdownTask.query().where('taskId', taskId).update({
      status: VIDEO_BREAKDOWN_TASK_STATUS.PROCESSING,
      reason: null,
    });
    logger.info({ taskId, userId, model }, 'Executing VideoBreakdownJob');

    await mkdir(segmentsDir, { recursive: true });
    await this.download(videoUrl, videoPath);
    const segments = await this.videoBreakdownService.breakdown({ videoUrl, model, stream: true });

    const result = [];
    for (let index = 0; index < segments.length; index++) {
      const outputPath = segmentOutputPath(segmentsDir, index);
      await this.cutSegment(buildSegmentCommand({ videoPath, start: segments[index].start, end: segments[index].end, outputPath }));

      const publicPath = segmentOutputPath(publicSegmentsDir, index);
      await this.moveSegment(outputPath, publicPath);

      result.push({
        start: segments[index].start,
        end: segments[index].end,
        summary: segments[index].summary,
        file: segmentFileRelativePath(publicPath),
      });
    }

    await rm(taskDir, { recursive: true, force: true });

    await VideoBreakdownTask.query()
      .where('taskId', taskId)
      .update({
        status: VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED,
        result: JSON.stringify(result),
        reason: null,
      });
  }

  async failed(error: Error) {
    const { taskId } = this.payload;
    try {
      await rm(app.tmpPath(`video-breakdown/${taskId}`), { recursive: true, force: true });
      await rm(app.publicPath(`video-breakdown/${taskId}`), { recursive: true, force: true });
      await VideoBreakdownTask.query()
        .where('taskId', taskId)
        .update({
          status: VIDEO_BREAKDOWN_TASK_STATUS.FAILED,
          reason: error.message.slice(0, 512),
        });
    } catch (updateError) {
      logger.error({ taskId, err: updateError instanceof Error ? updateError.message : String(updateError) }, 'Failed to persist VideoBreakdownJob failure');
    }
  }

  protected async download(videoUrl: string, destPath: string) {
    const fetchClient = await app.container.make('fetch');
    const stream = await fetchClient.stream(videoUrl);
    await pipelineAsync(Readable.fromWeb(stream), createWriteStream(destPath));
  }

  protected async cutSegment(args: string[]) {
    await execFileAsync('ffmpeg', args);
  }

  protected async moveSegment(sourcePath: string, destPath: string) {
    await mkdir(dirname(destPath), { recursive: true });
    await rename(sourcePath, destPath);
  }
}
