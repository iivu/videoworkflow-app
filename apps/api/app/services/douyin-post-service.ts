import { randomUUID } from 'node:crypto';
import { inject } from '@adonisjs/core';
import db from '@adonisjs/lucid/services/db';
import type { Infer } from '@vinejs/vine/types';
import { DateTime } from 'luxon';
import BusinessException from '#exceptions/business-exception';
import DouyinCreator from '#models/douyin-creator';
import DouyinCreatorTask from '#models/douyin-creator-task';
import DouyinPostCache from '#models/douyin-post-cache';
import DouyinPostSearch from '#models/douyin-post-search';
import DouyinWork from '#models/douyin-work';
import User from '#models/user';
import { DouyinCreatorService } from '#services/douyin-creator-service';
import { GuaikaiApiService } from '#services/guaikai-api-service';
import { isDouyinCreatorPending, normalizeDouyinCreatorInput } from '#utils/douyin-creator';
import { CACHE_DAYS, filterPosts, normalizePostResult, type PostFilters, type PostItem, postCacheKey, postLimit, SEARCH_TIMEOUT_MS, validatePostFilters } from '#utils/douyin-post';
import type { createPostSearchValidator } from '#validators/douyin-post';

export type PostSearchSummary = {
  id: number;
  creatorId: number | null;
  creatorName: string | null;
  source: string;
  status: string;
  filters: PostFilters;
  fetchedCount: number;
  matchedCount: number;
  reason: string | null;
  cacheHit: boolean;
  cacheValid: boolean;
  canInvalidate: boolean;
  cacheExpiresAt: string | null;
  fetchedAt: string | null;
  createdAt: string | null;
};

@inject()
export class DouyinPostService {
  constructor(
    private readonly creators: DouyinCreatorService,
    private readonly guaikai: GuaikaiApiService,
  ) {}

  async create(userId: string, payload: Infer<typeof createPostSearchValidator>) {
    const { creatorId, source, ...inputFilters } = payload;
    if (Boolean(creatorId) === Boolean(source)) throw new BusinessException('请选择一位博主或输入一个博主链接');
    const filters = validatePostFilters(inputFilters);
    const normalized = source ? normalizeDouyinCreatorInput(source) : '';
    const search = await db.transaction(async (trx) => {
      await User.query({ client: trx }).where('id', userId).forUpdate().firstOrFail();
      await DouyinPostSearch.query({ client: trx })
        .where('userId', userId)
        .where('status', 'processing')
        .where('createdAt', '<', DateTime.local().minus({ milliseconds: SEARCH_TIMEOUT_MS }).toJSDate())
        .update({ status: 'failed', reason: '搜索等待超过 30 分钟，请重新搜索' });
      if (await DouyinPostSearch.query({ client: trx }).where('userId', userId).where('status', 'processing').first()) {
        throw new BusinessException('已有进行中的搜索任务，请等待完成后再搜索');
      }
      const creator = creatorId
        ? await DouyinCreator.query({ client: trx }).where('userId', userId).where('id', creatorId).first()
        : await DouyinCreator.query({ client: trx })
            .where('userId', userId)
            .where((query) => query.where('secUid', normalized).orWhere('sourceUrl', normalized))
            .first();
      if (creatorId && !creator) throw new BusinessException('博主不存在');
      return DouyinPostSearch.create(
        {
          userId,
          creatorId: creator?.secUid ? creator.id : null,
          creatorName: creator?.nickname ?? null,
          source: creator?.secUid || normalized || creator?.sourceUrl || '',
          status: 'processing',
          filters: JSON.stringify(filters),
        },
        { client: trx },
      );
    });
    try {
      if (!search.creatorId) {
        await this.creators.create(userId, search.source, search.id);
        await search.refresh();
      }
      const { default: Job } = await import('#jobs/douyin-post-job');
      await Job.dispatch({ searchId: search.id });
    } catch {
      await this.fail(search.id, '搜索提交失败，请重试；已提交的资料采集会继续执行');
      throw new BusinessException('搜索提交失败，请重试');
    }
    return this.summary(search);
  }

  async advance(searchId: number) {
    const search = await DouyinPostSearch.find(searchId);
    if (search?.status !== 'processing') return false;
    if (Date.now() - search.createdAt.toMillis() > SEARCH_TIMEOUT_MS) {
      await this.fail(search.id, '搜索等待超过 30 分钟，请重新搜索');
      return false;
    }
    if (search.creatorTaskId || !search.creatorId) {
      const task = search.creatorTaskId ? await DouyinCreatorTask.find(search.creatorTaskId) : null;
      if (!task || task.status === 'failed' || task.status === 'canceled') throw new BusinessException('博主入库失败，请到博主库检查资料采集任务');
      if (task.status !== 'completed') return true;
      search.creatorId = task.creatorId;
      await search.save();
    }
    if (!search.creatorId) throw new BusinessException('博主尚未完成入库');
    const creator = await DouyinCreator.query().where('id', search.creatorId).where('userId', search.userId).first();
    if (!creator?.secUid) throw new BusinessException('博主不存在或尚未完成入库');
    search.creatorName = creator.nickname;
    const limit = postLimit(creator.awemeCount);
    if (!limit) {
      search.merge({ status: 'completed', fetchedCount: 0, matchedCount: 0 });
      await search.save();
      return false;
    }
    if (!search.cacheId) {
      const cacheKey = postCacheKey(creator.secUid, limit);
      await db
        .table('douyin_post_caches')
        .insert({
          cache_key: cacheKey,
          version: randomUUID(),
          sec_uid: creator.secUid,
          post_limit: limit,
          status: 'processing',
          started_at: DateTime.local().toJSDate(),
          created_at: DateTime.local().toJSDate(),
        })
        .onConflict('cache_key')
        .ignore();
      await db.transaction(async (trx) => {
        const locked = await DouyinPostSearch.query({ client: trx }).where('id', search.id).forUpdate().firstOrFail();
        if (locked.status !== 'processing' || locked.cacheId) return;
        const cache = await DouyinPostCache.query({ client: trx }).where('cacheKey', cacheKey).forUpdate().firstOrFail();
        const valid = this.validCache(cache);
        if (!valid && (cache.status !== 'processing' || Date.now() - cache.startedAt.toMillis() > SEARCH_TIMEOUT_MS)) {
          const resume = ['failed', 'processing'].includes(cache.status) && cache.providerTimestamp && cache.submitted;
          cache.merge({
            version: randomUUID(),
            status: 'processing',
            result: null,
            reason: null,
            expiresAt: null,
            startedAt: DateTime.local(),
            providerTimestamp: resume ? cache.providerTimestamp : null,
            submitted: Boolean(resume),
          });
          await cache.save();
        }
        locked.merge({ cacheId: cache.id, cacheVersion: cache.version, cacheHit: valid });
        await locked.save();
      });
      await search.refresh();
    }
    if (!search.cacheId) throw new BusinessException('搜索缓存创建失败，请重试');
    const cache = await DouyinPostCache.findOrFail(search.cacheId);
    if (cache.version !== search.cacheVersion) throw new BusinessException('搜索数据已失效，请重新搜索');
    if (cache.status === 'processing') await this.advanceCache(cache);
    await cache.refresh();
    if (cache.version !== search.cacheVersion) throw new BusinessException('搜索数据已失效，请重新搜索');
    if (cache.status === 'failed') throw new BusinessException(cache.reason ?? '作品获取失败');
    if (!this.validCache(cache)) {
      if (cache.status !== 'processing') throw new BusinessException('搜索数据已失效，请重新搜索');
      return true;
    }
    const posts = JSON.parse(cache.result) as PostItem[];
    await DouyinPostSearch.query()
      .where('id', search.id)
      .where('status', 'processing')
      .update({
        status: 'completed',
        creatorName: creator.nickname,
        fetchedCount: posts.length,
        matchedCount: filterPosts(posts, JSON.parse(search.filters) as PostFilters).length,
      });
    return false;
  }

  private async advanceCache(cache: DouyinPostCache) {
    const version = cache.version;
    if (Date.now() - cache.startedAt.toMillis() > SEARCH_TIMEOUT_MS) {
      await DouyinPostCache.query()
        .where('id', cache.id)
        .where('version', cache.version)
        .where('status', 'processing')
        .update({ status: 'failed', reason: '作品获取等待超时，请重新搜索以继续查询原任务' });
      return;
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const claimed = await DouyinPostCache.query()
      .where('id', cache.id)
      .where('version', cache.version)
      .where('status', 'processing')
      .where('submitted', false)
      .update({ submitted: true, providerTimestamp: timestamp });
    await cache.refresh();
    if (cache.version !== version) return;
    const params = { url: cache.secUid, limit: cache.postLimit };
    try {
      if (claimed[0] > 0) {
        await this.guaikai.createDouyinPostTask(params, Number(cache.providerTimestamp));
        return;
      }
      if (Date.now() / 1000 - Number(cache.providerTimestamp) < 35) return;
      const posts = normalizePostResult(await this.guaikai.getDouyinPostResult(params, Number(cache.providerTimestamp)));
      await DouyinPostCache.query()
        .where('id', cache.id)
        .where('version', cache.version)
        .where('status', 'processing')
        .update({
          status: 'completed',
          result: JSON.stringify(posts),
          expiresAt: DateTime.local()
            .plus({ hours: CACHE_DAYS * 24 })
            .toFormat('yyyy-MM-dd HH:mm:ss.SSS'),
          reason: null,
        });
    } catch (error) {
      if (isDouyinCreatorPending(error)) return;
      if (claimed[0] > 0) return;
      await DouyinPostCache.query()
        .where('id', cache.id)
        .where('version', cache.version)
        .where('status', 'processing')
        .update({ status: 'failed', reason: error instanceof BusinessException ? '作品查询失败，请检查博主资料后重试' : '作品查询暂不可用，请重试' });
    }
  }

  async fail(id: number, reason: string) {
    await DouyinPostSearch.query()
      .where('id', id)
      .where('status', 'processing')
      .update({ status: 'failed', reason: reason.slice(0, 512) });
  }

  private validCache(cache: DouyinPostCache): cache is DouyinPostCache & { result: string; expiresAt: DateTime } {
    return cache.status === 'completed' && typeof cache.result === 'string' && Boolean(cache.expiresAt && cache.expiresAt.toMillis() > Date.now());
  }

  async owned(userId: string, id: number) {
    const search = await DouyinPostSearch.query().where('userId', userId).where('id', id).first();
    if (!search) throw new BusinessException('搜索记录不存在');
    return search;
  }

  async cached(search: DouyinPostSearch) {
    const cache = search.cacheId ? await DouyinPostCache.find(search.cacheId) : null;
    return cache?.version === search.cacheVersion && this.validCache(cache) ? cache : null;
  }

  async results(userId: string, id: number, page: number, size: number, filters?: PostFilters) {
    const search = await this.owned(userId, id);
    const cache = await this.cached(search);
    if (search.status !== 'completed') throw new BusinessException('搜索尚未成功完成');
    if (search.cacheId && !cache) throw new BusinessException('结果缓存已失效，请前往搜索页重新搜索');
    const selectedFilters = validatePostFilters(filters ?? (JSON.parse(search.filters) as PostFilters));
    const posts = filterPosts(cache ? (JSON.parse(cache.result) as PostItem[]) : [], selectedFilters);
    const slice = posts.slice((page - 1) * size, page * size);
    const works = slice.length
      ? await DouyinWork.query()
          .where('userId', userId)
          .whereIn(
            'awemeId',
            slice.map((post) => post.awemeId),
          )
      : [];
    const downloaded = new Set(works.map((work) => work.awemeId));
    const active = slice.length
      ? await db
          .from('douyin_download_tasks')
          .where('user_id', userId)
          .whereIn(
            'aweme_id',
            slice.map((post) => post.awemeId),
          )
          .whereIn('status', ['queued', 'processing'])
          .select('aweme_id')
      : [];
    const pending = new Set(active.map((task) => String(task.aweme_id)));
    return {
      list: slice.map(({ videoUrls, ...post }) => ({
        ...post,
        downloadable: Boolean(post.awemeId && videoUrls.length && cache),
        downloaded: downloaded.has(post.awemeId),
        downloading: pending.has(post.awemeId),
      })),
      meta: { total: posts.length, currentPage: page },
      downloadableCount: posts.filter((post) => post.awemeId && post.videoUrls.length).length,
    };
  }

  async summary(search: DouyinPostSearch): Promise<PostSearchSummary> {
    const raw = search.cacheId ? await DouyinPostCache.find(search.cacheId) : null;
    const sameVersion = raw?.version === search.cacheVersion;
    const cache = raw && sameVersion && this.validCache(raw) ? raw : null;
    return {
      id: search.id,
      creatorId: search.creatorId,
      creatorName: search.creatorName,
      source: search.source,
      status: search.status,
      filters: JSON.parse(search.filters) as PostFilters,
      fetchedCount: search.fetchedCount ?? 0,
      matchedCount: search.matchedCount ?? 0,
      reason: search.reason,
      cacheHit: Boolean(search.cacheHit),
      cacheValid: Boolean(cache),
      canInvalidate: Boolean(raw && sameVersion && !['processing', 'invalidated', 'expired'].includes(raw.status)),
      cacheExpiresAt: cache?.expiresAt?.toISO() ?? null,
      fetchedAt: cache?.expiresAt?.minus({ hours: CACHE_DAYS * 24 }).toISO() ?? null,
      createdAt: search.createdAt.toISO(),
    };
  }

  async list(userId: string, page: number, size: number): Promise<{ list: PostSearchSummary[]; meta: { total: number; currentPage: number }; activeId: number | null }> {
    await DouyinPostCache.query().where('status', 'completed').where('expiresAt', '<=', DateTime.local().toJSDate()).update({ status: 'expired', result: null });
    await DouyinPostSearch.query()
      .where('userId', userId)
      .where('status', 'processing')
      .where('createdAt', '<', DateTime.local().minus({ milliseconds: SEARCH_TIMEOUT_MS }).toJSDate())
      .update({ status: 'failed', reason: '搜索等待超过 30 分钟，请重新搜索' });
    const [records, active] = await Promise.all([
      DouyinPostSearch.query().where('userId', userId).orderBy('id', 'desc').paginate(page, size),
      DouyinPostSearch.query().where('userId', userId).where('status', 'processing').first(),
    ]);
    return { list: await Promise.all(records.all().map((search) => this.summary(search))), meta: { total: records.total, currentPage: page }, activeId: active?.id ?? null };
  }

  async invalidate(userId: string, id: number) {
    const search = await this.owned(userId, id);
    if (!search.cacheId) throw new BusinessException('此搜索没有可失效的缓存');
    const cacheId = search.cacheId;
    await db.transaction(async (trx) => {
      const cache = await DouyinPostCache.query({ client: trx }).where('id', cacheId).forUpdate().firstOrFail();
      if (cache.version !== search.cacheVersion) throw new BusinessException('该记录的缓存已失效，不会影响新版本');
      if (cache.status === 'processing') throw new BusinessException('对应搜索正在进行，暂不可使缓存失效');
      cache.merge({ status: 'invalidated', result: null, expiresAt: null });
      await cache.save();
    });
    return { id };
  }
}
