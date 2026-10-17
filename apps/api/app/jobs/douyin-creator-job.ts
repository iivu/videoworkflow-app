import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import { Job } from '@adonisjs/queue';
import type { JobOptions } from '@adonisjs/queue/types';
import DouyinCreatorTask from '#models/douyin-creator-task';
import { DouyinCreatorService } from '#services/douyin-creator-service';
import { GuaikaiApiService } from '#services/guaikai-api-service';
import { douyinCreatorSnapshot, isDouyinCreatorPending, DOUYIN_CREATOR_TASK_STATUS as STATUS } from '#utils/douyin-creator';

export const QUEUE_NAME = 'douyin-creator-queue';

@inject()
export default class DouyinCreatorJob extends Job<{ taskId: number }> {
  static options: JobOptions = { queue: QUEUE_NAME, maxRetries: 3 };

  constructor(
    private readonly guaikai: GuaikaiApiService,
    private readonly creators: DouyinCreatorService,
  ) {
    super();
  }

  async execute() {
    const task = await DouyinCreatorTask.find(this.payload.taskId);
    if (!task || task.status === STATUS.COMPLETED || task.status === STATUS.FAILED) return;
    const params = { url: task.sourceUrl, limit: 0 };
    try {
      if (!task.providerTimestamp) {
        if (task.status === STATUS.CANCELED) return;
        task.providerTimestamp = await this.guaikai.createDouyinPostTask(params);
        await task.save();
        await DouyinCreatorJob.dispatch(this.payload).in('3s');
        return;
      }
      const result = await this.guaikai.getDouyinPostResult(params, task.providerTimestamp);
      if (!result?.user) throw new Error('未获取到博主信息，请检查链接后重试');
      const snapshot = douyinCreatorSnapshot(result.user);
      await task.refresh();
      if (task.status !== STATUS.PROCESSING || !task.creatorId) return;
      let avatarUrl: string | null = null;
      if (result.user.avatar) {
        try {
          const oss = await app.container.make('oss');
          avatarUrl = (await oss.putURL(result.user.avatar, `douyin-creators/${task.userId}/${snapshot.secUid}.jpg`)).url;
        } catch {}
      }
      await this.creators.complete(task.id, result.user, avatarUrl);
    } catch (error) {
      if (isDouyinCreatorPending(error)) {
        await DouyinCreatorJob.dispatch(this.payload).in('3s');
        return;
      }
      throw error;
    }
  }

  async failed(error: Error) {
    await this.creators.fail(this.payload.taskId, error);
  }
}
