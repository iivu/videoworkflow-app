import type { Infer } from '@vinejs/vine/types';
import BusinessException from '#exceptions/business-exception';
import CrawlerVideoJob, { QUEUE_NAME } from '#jobs/crawler-video-job';
import CrawlerVideoTask, { TASK_STATUS } from '#models/crawler-video-task';
import { detectPlatformFromUrl, extractUrl, type VideoPlatform } from '#utils/parse';
import type { createCrawlerVideoTaskValidator, listCrawlerVideoTasksValidator, updateCrawlerVideoTaskValidator } from '#validators/crawler-video-task';

export class CrawlerVideoTaskService {
  async create(params: { payload: Infer<typeof createCrawlerVideoTaskValidator>; userId: string }) {
    const { payload, userId } = params;
    const entries: Array<{ userInput: string; url: string; platform: VideoPlatform }> = [];
    const unsupported: string[] = [];
    for (const userInput of payload.userInput) {
      const url = extractUrl(userInput);
      if (!url) continue;
      const platform = detectPlatformFromUrl(url);
      if (platform) {
        entries.push({ userInput, url, platform });
      } else {
        unsupported.push(userInput);
      }
    }
    if (unsupported.length > 0) {
      const samples = unsupported.slice(0, 3).join('、');
      const suffix = unsupported.length > 3 ? `等 ${unsupported.length} 条` : '';
      throw new BusinessException(`无法识别的视频链接：${samples}${suffix}`);
    }
    const rows = await CrawlerVideoTask.createMany(
      entries.map((entry) => ({
        userId,
        userInput: entry.userInput,
        url: entry.url,
        platform: entry.platform,
        status: TASK_STATUS.PROCESSING,
      })),
    );
    await CrawlerVideoJob.dispatchMany(
      rows.map((row, index) => ({ taskId: row.id, videoUrl: row.url, platform: entries[index].platform, userId })),
    )
      .group(`crawler-video-task-${userId}:${Date.now()}`)
      .toQueue(QUEUE_NAME);
    return rows.map((row) => row.id);
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
