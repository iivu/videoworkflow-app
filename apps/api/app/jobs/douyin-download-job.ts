import { inject } from '@adonisjs/core';
import { Job } from '@adonisjs/queue';
import type { JobOptions } from '@adonisjs/queue/types';
import { DouyinDownloadService } from '#services/douyin-download-service';

@inject()
export default class DouyinDownloadJob extends Job<{ taskId: number }> {
  static options: JobOptions = { queue: 'douyin-download-queue', maxRetries: 0, timeout: '21m', failOnTimeout: true };

  constructor(private readonly downloads: DouyinDownloadService) {
    super();
  }

  async execute() {
    await this.downloads.execute(this.payload.taskId);
  }
}
