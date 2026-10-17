import app from '@adonisjs/core/services/app';
import db from '@adonisjs/lucid/services/db';
import type { Infer } from '@vinejs/vine/types';
import { DateTime } from 'luxon';
import BusinessException from '#exceptions/business-exception';
import DouyinCreator from '#models/douyin-creator';
import DouyinCreatorTask from '#models/douyin-creator-task';
import DouyinDownloadBatch from '#models/douyin-download-batch';
import DouyinDownloadTask from '#models/douyin-download-task';
import DouyinPostSearch from '#models/douyin-post-search';
import DouyinWork from '#models/douyin-work';
import User from '#models/user';
import type { DouyinUser } from '#services/guaikai-api-service';
import { douyinCreatorSnapshot, normalizeDouyinCreatorInput, DOUYIN_CREATOR_TASK_STATUS as STATUS } from '#utils/douyin-creator';
import type { listDouyinCreatorsValidator } from '#validators/douyin-creator';

export class DouyinCreatorService {
  async show(userId: string, creatorId: number) {
    const creator = await DouyinCreator.query().where('userId', userId).where('id', creatorId).preload('currentTask').first();
    if (!creator) throw new BusinessException('博主不存在');
    return creator;
  }

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

  async create(userId: string, source: string, searchId?: number) {
    const sourceUrl = normalizeDouyinCreatorInput(source);
    const result = await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail();
      const search = searchId ? await DouyinPostSearch.query({ client: trx }).where('userId', userId).where('id', searchId).where('status', 'processing').first() : null;
      if (searchId && !search) throw new BusinessException('搜索任务已删除或结束');
      let creator = await DouyinCreator.query({ client: trx })
        .where('userId', userId)
        .where((query) => query.where('sourceUrl', sourceUrl).orWhere('secUid', sourceUrl))
        .first();
      if (!creator) creator = await DouyinCreator.create({ userId, sourceUrl, secUid: null }, { client: trx });
      const current = creator.currentTaskId ? await DouyinCreatorTask.find(creator.currentTaskId, { client: trx }) : null;
      if (current?.status === STATUS.PROCESSING) {
        if (search) {
          search.merge({ creatorId: creator.id, creatorTaskId: current.id });
          await search.save();
        }
        return { task: current, enqueue: false };
      }
      const task = await DouyinCreatorTask.create({ userId, creatorId: creator.id, sourceUrl, status: STATUS.PROCESSING }, { client: trx });
      creator.currentTaskId = task.id;
      await creator.save();
      if (search) {
        search.merge({ creatorId: creator.id, creatorTaskId: task.id });
        await search.save();
      }
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
      const works = await DouyinWork.query({ client: trx }).where('userId', userId).where('creatorId', creatorId);
      if (works.length) {
        const oss = await app.container.make('oss');
        for (const work of works) {
          if (work.coverKey) await oss.delete(work.coverKey);
          await oss.delete(work.videoKey);
        }
      }
      await DouyinPostSearch.query({ client: trx })
        .where('userId', userId)
        .where((query) =>
          query
            .where('creatorId', creatorId)
            .orWhereIn('creatorTaskId', DouyinCreatorTask.query({ client: trx }).where('userId', userId).where('creatorId', creatorId).select('id'))
            .orWhere((pending) => pending.whereNull('creatorId').whereRaw('BINARY ?? IN (?, ?)', ['source', creator.sourceUrl, creator.secUid ?? creator.sourceUrl])),
        )
        .delete();
      await DouyinDownloadTask.query({ client: trx }).where('userId', userId).where('creatorId', creatorId).delete();
      await DouyinDownloadBatch.query({ client: trx }).where('userId', userId).where('creatorId', creatorId).delete();
      await DouyinWork.query({ client: trx }).where('userId', userId).where('creatorId', creatorId).delete();
      await DouyinCreatorTask.query({ client: trx }).where('userId', userId).where('creatorId', creatorId).delete();
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
    const initial = await DouyinCreatorTask.find(taskId);
    if (!initial) return;
    await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', initial.userId).forUpdate().firstOrFail();
      const task = await DouyinCreatorTask.query({ client: trx }).where('id', taskId).forUpdate().first();
      if (!task || task.status !== STATUS.PROCESSING || !task.creatorId) return;
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
