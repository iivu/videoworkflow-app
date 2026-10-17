import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import db from '@adonisjs/lucid/services/db';
import { DateTime } from 'luxon';
import BusinessException from '#exceptions/business-exception';
import DouyinCreator from '#models/douyin-creator';
import DouyinDownloadBatch from '#models/douyin-download-batch';
import DouyinDownloadTask from '#models/douyin-download-task';
import DouyinWork from '#models/douyin-work';
import User from '#models/user';
import { DouyinPostService } from '#services/douyin-post-service';
import env from '#start/env';
import { DOWNLOAD_TIMEOUT_MS, filterPosts, firstWorkingVideo, type PostFilters, type PostItem, publicMediaUrl, validatePostFilters } from '#utils/douyin-post';

type PageResult<Item> = { list: Item[]; meta: { total: number; currentPage: number } };
type BatchSummary = { id: number; creatorName: string | null; createdAt: string | null; counts: Record<string, number> };
type TaskSummary = { id: number; batchId: number; awemeId: string; title: string; status: string; reason: string | null };
type WorkSummary = Omit<PostItem, 'videoUrls'> & { id: number; creatorId: number; creatorName: string | null; videoUrl: string; createdAt: string | null };

@inject()
export class DouyinDownloadService {
  constructor(private readonly searches: DouyinPostService) {}

  async create(userId: string, searchId: number, awemeIds: string[], filters: PostFilters): Promise<{ batchId: number | null; count: number }> {
    const search = await this.searches.owned(userId, searchId);
    const cache = await this.searches.cached(search);
    if (search.status !== 'completed' || !cache || !search.creatorId) throw new BusinessException('结果缓存已失效，请重新搜索');
    const ids = new Set(awemeIds);
    const posts = filterPosts(JSON.parse(cache.result) as PostItem[], validatePostFilters(filters)).filter((post) => ids.has(post.awemeId) && post.videoUrls.length);
    if (posts.length !== ids.size) throw new BusinessException('部分作品不存在或无法下载，请刷新结果');
    const creatorId = search.creatorId;
    const result = await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail();
      const creator = await DouyinCreator.query({ client: trx }).where('id', creatorId).where('userId', userId).first();
      if (!creator) throw new BusinessException('博主已删除');
      const currentCache = await this.searches.cached(search);
      if (!currentCache) throw new BusinessException('结果缓存已失效，请重新搜索');
      const [works, active] = await Promise.all([
        DouyinWork.query({ client: trx }).where('userId', userId).whereIn('awemeId', awemeIds),
        DouyinDownloadTask.query({ client: trx }).where('userId', userId).whereIn('awemeId', awemeIds).whereIn('status', ['queued', 'processing']),
      ]);
      const existing = new Set([...works, ...active].map((item) => item.awemeId));
      const pending = posts.filter((post) => !existing.has(post.awemeId));
      if (!pending.length) return { batchId: active[0]?.batchId ?? null, tasks: [] as DouyinDownloadTask[] };
      const batch = await DouyinDownloadBatch.create({ userId, creatorId: creator.id, creatorName: creator.nickname }, { client: trx });
      const tasks = await DouyinDownloadTask.createMany(
        pending.map((post) => ({
          userId,
          creatorId: creator.id,
          batchId: batch.id,
          awemeId: post.awemeId,
          status: 'queued',
          metadata: JSON.stringify(post),
        })),
        { client: trx },
      );
      return { batchId: batch.id, tasks };
    });
    await this.enqueue(result.tasks);
    return { batchId: result.batchId, count: result.tasks.length };
  }

  private async enqueue(tasks: DouyinDownloadTask[]) {
    const { default: Job } = await import('#jobs/douyin-download-job');
    for (const task of tasks) {
      try {
        await Job.dispatch({ taskId: task.id });
      } catch {
        await DouyinDownloadTask.query().where('id', task.id).where('status', 'queued').update({ status: 'failed', reason: '任务提交失败，可手动重试' });
      }
    }
  }

  async execute(taskId: number) {
    const token = randomUUID();
    const claimed = await DouyinDownloadTask.query()
      .where('id', taskId)
      .where('status', 'queued')
      .update({ status: 'processing', executionToken: token, startedAt: DateTime.local().toFormat('yyyy-MM-dd HH:mm:ss.SSS'), reason: null });
    if (!claimed[0]) return;
    const task = await DouyinDownloadTask.findOrFail(taskId);
    const post = JSON.parse(task.metadata) as PostItem;
    const oss = await app.container.make('oss');
    const prefix = `douyin-works/${task.userId}/${task.awemeId}/${token}`;
    const videoKey = `${prefix}.mp4`;
    const coverKey = `${prefix}.jpg`;
    let uploadedVideo = false;
    let uploadedCover = false;
    const deadline = Date.now() + DOWNLOAD_TIMEOUT_MS;
    try {
      const videoUrl = await firstWorkingVideo(post.videoUrls, async (url) => {
        const uploaded = await this.transfer(url, videoKey, deadline, 'video');
        uploadedVideo = true;
        return uploaded;
      });
      let coverUrl: string | null = null;
      if (post.coverUrl && Date.now() < deadline) {
        try {
          coverUrl = await this.transfer(post.coverUrl, coverKey, Math.min(deadline, Date.now() + 60000), 'image');
          uploadedCover = true;
        } catch {}
      }
      await db.transaction(async (trx) => {
        await User.query({ client: trx }).where('id', task.userId).forUpdate().firstOrFail();
        const locked = await DouyinDownloadTask.query({ client: trx }).where('id', taskId).forUpdate().firstOrFail();
        if (locked.status !== 'processing' || locked.executionToken !== token || Date.now() > deadline) throw new BusinessException('下载任务已超时，请重试');
        const { videoUrls: _urls, ...metadata } = post;
        await DouyinWork.create(
          {
            userId: task.userId,
            creatorId: task.creatorId,
            awemeId: task.awemeId,
            title: post.title,
            metadata: JSON.stringify(metadata),
            videoUrl,
            videoKey: `${env.get('OSS_DIR')}/${videoKey}`,
            coverUrl,
            coverKey: coverUrl ? `${env.get('OSS_DIR')}/${coverKey}` : null,
          },
          { client: trx },
        );
        await DouyinCreator.query({ client: trx }).where('id', task.creatorId).increment('downloadedCount', 1);
        locked.merge({ status: 'completed', reason: null });
        await locked.save();
      });
    } catch (error) {
      await DouyinDownloadTask.query()
        .where('id', taskId)
        .where('executionToken', token)
        .where('status', 'processing')
        .update({ status: 'failed', reason: error instanceof BusinessException ? error.message.slice(0, 512) : '视频转存失败，请重试' });
      if (uploadedVideo) await oss.delete(`${env.get('OSS_DIR')}/${videoKey}`).catch(() => {});
      if (uploadedCover) await oss.delete(`${env.get('OSS_DIR')}/${coverKey}`).catch(() => {});
    }
  }

  private async transfer(input: string, key: string, deadline: number, kind: 'video' | 'image') {
    if (Date.now() >= deadline) throw new BusinessException('下载执行超时');
    const directory = await mkdtemp(join(tmpdir(), 'douyin-work-'));
    const path = join(directory, 'media');
    const signal = AbortSignal.timeout(Math.max(1, Math.min(120000, deadline - Date.now())));
    try {
      let url = publicMediaUrl(input);
      let response: Response | undefined;
      for (let redirects = 0; redirects <= 5; redirects++) {
        if (!url) throw new BusinessException('不支持的视频资源地址');
        response = await fetch(url, { redirect: 'manual', signal });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get('location');
        await response.body?.cancel();
        url = location ? publicMediaUrl(new URL(location, url).toString()) : null;
      }
      if (!response?.ok || !response.body) throw new BusinessException('资源下载失败');
      const mediaType = response.headers.get('content-type')?.split(';')[0] ?? '';
      if (!mediaType.startsWith(`${kind}/`) && mediaType !== 'application/octet-stream') {
        await response.body.cancel();
        throw new BusinessException('资源不是可用的媒体文件');
      }
      const maximum = kind === 'video' ? 1024 * 1024 * 1024 : 20 * 1024 * 1024;
      let bytes = 0;
      const limiter = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          bytes += chunk.length;
          callback(bytes > maximum ? new Error('媒体文件超过允许大小') : null, chunk);
        },
      });
      const reader = response.body.getReader();
      async function* chunks() {
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            yield chunk.value;
          }
        } finally {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      }
      await pipeline(Readable.from(chunks()), limiter, createWriteStream(path), { signal });
      if (!bytes || Date.now() >= deadline) throw new BusinessException('媒体内容为空或下载超时');
      const stream = createReadStream(path);
      try {
        return (await (await app.container.make('oss')).putStream(stream, key, { timeout: Math.max(1, Math.min(600000, deadline - Date.now())) })).url;
      } finally {
        stream.destroy();
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  async recover(userId: string) {
    const threshold = DateTime.local().minus({ milliseconds: DOWNLOAD_TIMEOUT_MS }).toJSDate();
    await DouyinDownloadTask.query()
      .where('userId', userId)
      .where('status', 'processing')
      .where('startedAt', '<', threshold)
      .update({ status: 'failed', reason: '下载任务超时，可手动重试' });
    await DouyinDownloadTask.query()
      .where('userId', userId)
      .where('status', 'queued')
      .where('createdAt', '<', threshold)
      .update({ status: 'failed', reason: '任务长时间未执行，请检查后台服务后重试' });
  }

  async retry(userId: string, batchId: number, taskId?: number) {
    await this.recover(userId);
    const tasks = await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail();
      const batch = await DouyinDownloadBatch.query({ client: trx }).where('userId', userId).where('id', batchId).first();
      if (!batch) throw new BusinessException('下载批次不存在');
      const query = DouyinDownloadTask.query({ client: trx }).where('userId', userId).where('batchId', batchId).where('status', 'failed');
      if (taskId) query.where('id', taskId);
      const failed = await query;
      const pending: DouyinDownloadTask[] = [];
      for (const task of failed) {
        if (!(await DouyinCreator.query({ client: trx }).where('id', task.creatorId).where('userId', userId).first())) continue;
        if (await DouyinWork.query({ client: trx }).where('userId', userId).where('awemeId', task.awemeId).first()) continue;
        if (await DouyinDownloadTask.query({ client: trx }).where('userId', userId).where('awemeId', task.awemeId).whereIn('status', ['queued', 'processing']).first()) continue;
        task.merge({ status: 'queued', reason: null, executionToken: null, startedAt: null, createdAt: DateTime.local() });
        await task.save();
        pending.push(task);
      }
      return pending;
    });
    await this.enqueue(tasks);
    return { count: tasks.length };
  }

  async batches(userId: string, page: number, size: number): Promise<PageResult<BatchSummary> & { hasProcessing: boolean }> {
    await this.recover(userId);
    const batches = await DouyinDownloadBatch.query().where('userId', userId).orderBy('id', 'desc').paginate(page, size);
    const ids = batches.all().map((batch) => batch.id);
    const stats = ids.length
      ? await db.from('douyin_download_tasks').where('user_id', userId).whereIn('batch_id', ids).select('batch_id', 'status').count('* as total').groupBy('batch_id', 'status')
      : [];
    const active = await DouyinDownloadTask.query().where('userId', userId).whereIn('status', ['queued', 'processing']).first();
    return {
      list: batches.all().map((batch) => ({
        id: batch.id,
        creatorName: batch.creatorName,
        createdAt: batch.createdAt.toISO(),
        counts: Object.fromEntries(stats.filter((stat) => Number(stat.batch_id) === batch.id).map((stat) => [String(stat.status), Number(stat.total)])) as Record<string, number>,
      })),
      meta: { total: batches.total, currentPage: page },
      hasProcessing: Boolean(active),
    };
  }

  async tasks(userId: string, batchId: number, page: number, size: number): Promise<PageResult<TaskSummary>> {
    await this.recover(userId);
    const tasks = await DouyinDownloadTask.query().where('userId', userId).where('batchId', batchId).orderBy('id', 'desc').paginate(page, size);
    return {
      list: tasks.all().map((task) => ({
        id: task.id,
        batchId: task.batchId,
        awemeId: task.awemeId,
        title: (JSON.parse(task.metadata) as PostItem).title,
        status: task.status,
        reason: task.reason,
      })),
      meta: { total: tasks.total, currentPage: page },
    };
  }

  async works(userId: string, page: number, size: number, creatorId?: number, keyword?: string): Promise<PageResult<WorkSummary>> {
    const query = DouyinWork.query().where('userId', userId);
    if (creatorId) query.where('creatorId', creatorId);
    if (keyword) query.where('title', 'like', `%${keyword.replace(/[\\%_]/g, '\\$&')}%`);
    const works = await query.orderBy('id', 'desc').paginate(page, size);
    const creators = works.length
      ? await DouyinCreator.query()
          .where('userId', userId)
          .whereIn(
            'id',
            works.all().map((work) => work.creatorId),
          )
      : [];
    const names = new Map(creators.map((creator) => [creator.id, creator.nickname]));
    return {
      list: works.all().map((work) => ({
        id: work.id,
        creatorId: work.creatorId,
        creatorName: names.get(work.creatorId) ?? null,
        ...(JSON.parse(work.metadata) as Omit<PostItem, 'videoUrls'>),
        videoUrl: work.videoUrl,
        coverUrl: work.coverUrl,
        createdAt: work.createdAt.toISO(),
      })),
      meta: { total: works.total, currentPage: page },
    };
  }

  async remove(userId: string, id: number) {
    await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail();
      const work = await DouyinWork.query({ client: trx }).where('userId', userId).where('id', id).first();
      if (!work) throw new BusinessException('作品不存在');
      const oss = await app.container.make('oss');
      if (work.coverKey) await oss.delete(work.coverKey);
      await oss.delete(work.videoKey);
      await DouyinCreator.query({ client: trx }).where('id', work.creatorId).where('downloadedCount', '>', 0).decrement('downloadedCount', 1);
      await work.delete();
    });
    return { id };
  }
}
