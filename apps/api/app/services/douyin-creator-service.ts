import db from '@adonisjs/lucid/services/db';
import type { Infer } from '@vinejs/vine/types';
import { DateTime } from 'luxon';
import BusinessException from '#exceptions/business-exception';
import DouyinCreator from '#models/douyin-creator';
import DouyinCreatorTask from '#models/douyin-creator-task';
import User from '#models/user';
import type { DouyinUser } from '#services/guaikai-api-service';
import { douyinCreatorSnapshot, normalizeDouyinCreatorInput, DOUYIN_CREATOR_TASK_STATUS as STATUS } from '#utils/douyin-creator';
import type { listDouyinCreatorsValidator } from '#validators/douyin-creator';

export class DouyinCreatorService {
  async list(userId: string, payload: Infer<typeof listDouyinCreatorsValidator>) {
    const query = DouyinCreator.query().where('userId', userId).preload('currentTask');
    if (payload.keyword) {
      const keyword = `%${payload.keyword.replace(/[\\%_]/g, '\\$&')}%`;
      query.where((search) => search.where('nickname', 'like', keyword).orWhere('uniqueId', 'like', keyword));
    }
    const [paginated, processing] = await Promise.all([
      query
        .orderBy(payload.sortBy ?? 'totalFavorited', payload.sortOrder ?? 'desc')
        .orderBy('id', 'desc')
        .paginate(payload.page ?? 1, payload.size ?? 12),
      DouyinCreatorTask.query().where('userId', userId).where('status', STATUS.PROCESSING).first(),
    ]);
    return { paginated, hasProcessing: Boolean(processing) };
  }

  async create(userId: string, source: string) {
    const sourceUrl = normalizeDouyinCreatorInput(source);
    const result = await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail();
      let creator = await DouyinCreator.query({ client: trx })
        .where('userId', userId)
        .where((query) => query.where('sourceUrl', sourceUrl).orWhere('secUid', sourceUrl))
        .first();
      if (!creator) creator = await DouyinCreator.create({ userId, sourceUrl, secUid: null }, { client: trx });
      const current = creator.currentTaskId ? await DouyinCreatorTask.find(creator.currentTaskId, { client: trx }) : null;
      if (current?.status === STATUS.PROCESSING) return { task: current, enqueue: false };
      const task = await DouyinCreatorTask.create({ userId, creatorId: creator.id, sourceUrl, status: STATUS.PROCESSING }, { client: trx });
      creator.currentTaskId = task.id;
      await creator.save();
      return { task, enqueue: true };
    });
    if (result.enqueue) await this.enqueue(result.task);
    return result.task;
  }

  async retry(userId: string, creatorId: number) {
    const result = await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail();
      const creator = await DouyinCreator.query({ client: trx }).where('userId', userId).where('id', creatorId).first();
      if (!creator) throw new BusinessException('博主不存在');
      const current = creator.currentTaskId ? await DouyinCreatorTask.find(creator.currentTaskId, { client: trx }) : null;
      if (current?.status === STATUS.PROCESSING) return { task: current, enqueue: false };
      const task = await DouyinCreatorTask.create({ userId, creatorId, sourceUrl: creator.secUid ?? creator.sourceUrl, status: STATUS.PROCESSING }, { client: trx });
      creator.currentTaskId = task.id;
      await creator.save();
      return { task, enqueue: true };
    });
    if (result.enqueue) await this.enqueue(result.task);
    return result.task;
  }

  async remove(userId: string, creatorId: number) {
    await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail();
      const creator = await DouyinCreator.query({ client: trx }).where('userId', userId).where('id', creatorId).first();
      if (!creator) throw new BusinessException('博主不存在');
      await DouyinCreatorTask.query({ client: trx }).where('creatorId', creatorId).where('status', STATUS.PROCESSING).update({ status: STATUS.CANCELED });
      await creator.delete();
    });
  }

  async task(userId: string, taskId: number) {
    const task = await DouyinCreatorTask.query().where('userId', userId).where('id', taskId).first();
    if (!task) throw new BusinessException('任务不存在');
    return task;
  }

  async complete(taskId: number, user: DouyinUser, avatarUrl: string | null) {
    const snapshot = douyinCreatorSnapshot(user);
    const initial = await DouyinCreatorTask.findOrFail(taskId);
    await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', initial.userId).forUpdate().firstOrFail();
      const task = await DouyinCreatorTask.query({ client: trx }).where('id', taskId).forUpdate().firstOrFail();
      if (task.status !== STATUS.PROCESSING || !task.creatorId) return;
      const creator = await DouyinCreator.query({ client: trx }).where('userId', task.userId).where('id', task.creatorId).first();
      if (!creator || creator.currentTaskId !== task.id) return;
      const existing = await DouyinCreator.query({ client: trx }).where('userId', task.userId).where('secUid', snapshot.secUid).first();
      const target = existing ?? creator;
      if (!target.currentTaskId || target.currentTaskId <= task.id) {
        target.merge({ ...snapshot, avatarUrl: avatarUrl ?? target.avatarUrl, lastSyncedAt: DateTime.utc(), currentTaskId: task.id });
        await target.save();
      }
      if (target.id !== creator.id) {
        await DouyinCreatorTask.query({ client: trx }).where('creatorId', creator.id).update({ creatorId: target.id });
        await creator.delete();
      }
      task.merge({ creatorId: target.id, status: STATUS.COMPLETED, reason: null });
      await task.save();
    });
  }

  async fail(taskId: number, error: Error) {
    await DouyinCreatorTask.query()
      .where('id', taskId)
      .where('status', STATUS.PROCESSING)
      .update({ status: STATUS.FAILED, reason: error.message.slice(0, 512) });
  }

  private async enqueue(task: DouyinCreatorTask) {
    try {
      const { default: DouyinCreatorJob } = await import('#jobs/douyin-creator-job');
      await DouyinCreatorJob.dispatch({ taskId: task.id });
    } catch (error) {
      await this.fail(task.id, error instanceof Error ? error : new Error('抓取任务提交失败'));
      throw new BusinessException('抓取任务提交失败，可在卡片上手动重试');
    }
  }
}
