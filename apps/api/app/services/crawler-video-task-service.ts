import type { Infer } from '@vinejs/vine/types';
import BusinessException from '#exceptions/business-exception';
import CrawlerVideoJob, { QUEUE_NAME } from '#jobs/crawler-video-job';
import CrawlerVideoTask, { TASK_STATUS } from '#models/crawler-video-task';
import { extractUrl } from '#utils/parse';
import type { createCrawlerVideoTaskValidator, listCrawlerVideoTasksValidator, updateCrawlerVideoTaskValidator } from '#validators/crawler-video-task';

export class CrawlerVideoTaskService {
  async create(params: { payload: Infer<typeof createCrawlerVideoTaskValidator>; userId: string }) {
    const { payload, userId } = params;
    const normalizedInput = payload.userInput.map((i) => [i, extractUrl(i)]) as [string, string | null][];
    const rows = await CrawlerVideoTask.createMany(
      normalizedInput
        .filter(([_, url]) => url !== null)
        .map(([userInput, url]) => ({
          userId,
          userInput,
          url: url!,
          platform: payload.platform,
          status: TASK_STATUS.PROCESSING,
        })),
    );
    await CrawlerVideoJob.dispatchMany(rows.map((r) => ({ taskId: r.id, videoUrl: r.url, userId })))
      .group(`crawler-video-task-${userId}:${Date.now()}`)
      .toQueue(QUEUE_NAME);
    return rows.map((r) => r.id);
  }

  async list(params: { payload: Infer<typeof listCrawlerVideoTasksValidator>; userId: string }) {
    const { payload, userId } = params;
    const query = CrawlerVideoTask.query().where('userId', userId);
    if (payload.status) query.where('status', payload.status);
    query.orderBy('id', 'desc');
    return await query.paginate(payload.page ?? 1, payload.size ?? 10);
  }

  async update(params: { payload: Infer<typeof updateCrawlerVideoTaskValidator> }) {
    const { payload } = params;
    const task = await CrawlerVideoTask.find(payload.taskId);
    if (!task) throw new BusinessException('任务不存在');
    task.merge({
      status: payload.status,
      reason: payload.reason || null,
      result: payload.result || null,
    });
    await task.save();
    return task;
  }
}
