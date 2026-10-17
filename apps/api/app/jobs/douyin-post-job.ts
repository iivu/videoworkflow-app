import { inject } from '@adonisjs/core';
import { Job } from '@adonisjs/queue';
import type { JobOptions } from '@adonisjs/queue/types';
import { DateTime } from 'luxon';
import BusinessException from '#exceptions/business-exception';
import DouyinPostCache from '#models/douyin-post-cache';
import { DouyinPostService } from '#services/douyin-post-service';

@inject()
export default class DouyinPostJob extends Job<{ searchId: number } | { cleanup: true }> {
  static options: JobOptions = { queue: 'douyin-post-queue', maxRetries: 0, timeout: '1m', failOnTimeout: true };

  constructor(private readonly posts: DouyinPostService) {
    super();
  }

  async execute() {
    if ('cleanup' in this.payload) {
      await DouyinPostCache.query().where('status', 'completed').where('expiresAt', '<=', DateTime.local().toJSDate()).update({ status: 'expired', result: null });
      return;
    }
    try {
      if (await this.posts.advance(this.payload.searchId)) await DouyinPostJob.dispatch(this.payload).in('3s');
    } catch (error) {
      await this.posts.fail(this.payload.searchId, error instanceof BusinessException ? error.message : '搜索执行失败，请重试');
    }
  }

  async failed() {
    if ('searchId' in this.payload) await this.posts.fail(this.payload.searchId, '搜索执行失败，请重试');
  }
}
