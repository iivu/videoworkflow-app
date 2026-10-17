import { randomUUID } from 'node:crypto';
import app from '@adonisjs/core/services/app';
import testUtils from '@adonisjs/core/services/test_utils';
import queue from '@adonisjs/queue/services/main';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';
import DouyinCreator from '#models/douyin-creator';
import DouyinCreatorTask from '#models/douyin-creator-task';
import DouyinDownloadBatch from '#models/douyin-download-batch';
import DouyinDownloadTask from '#models/douyin-download-task';
import DouyinPostCache from '#models/douyin-post-cache';
import DouyinPostSearch from '#models/douyin-post-search';
import DouyinWork from '#models/douyin-work';
import User from '#models/user';
import { DouyinCreatorService } from '#services/douyin-creator-service';
import { DouyinDownloadService } from '#services/douyin-download-service';
import { DouyinPostService } from '#services/douyin-post-service';
import { postCacheKey } from '#utils/douyin-post';

test.group('Douyin works persistence and cache boundaries', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());
  group.each.setup(() => {
    queue.fake();
    return () => queue.restore();
  });

  test('requires authentication for works and searches', async ({ client }) => {
    (await client.get('/api/v1/douyin-works')).assertStatus(401);
    (await client.get('/api/v1/douyin-post-searches')).assertStatus(401);
  });

  test('allows only one active search per user without blocking other users', async ({ assert }) => {
    const owner = await User.create({ username: 'post-search-owner', password: 'test-password' });
    const other = await User.create({ username: 'post-search-other', password: 'test-password' });
    const creators = await DouyinCreator.createMany([owner, other].map((user) => ({ userId: user.id, sourceUrl: 'MS4wLjPostTest', secUid: 'MS4wLjPostTest', awemeCount: 10 })));
    const service = await app.container.make(DouyinPostService);
    await service.create(owner.id, { creatorId: creators[0].id });
    await assert.rejects(() => service.create(owner.id, { creatorId: creators[0].id }), /已有进行中的搜索/);
    const independent = await service.create(other.id, { creatorId: creators[1].id });
    assert.equal(independent.status, 'processing');
    await assert.rejects(() => service.owned(owner.id, independent.id), /搜索记录不存在/);
  });

  test('shares successful raw cache across users and stores only search summaries', async ({ assert }) => {
    const owner = await User.create({ username: 'post-cache-owner', password: 'test-password' });
    const other = await User.create({ username: 'post-cache-other', password: 'test-password' });
    const creators = await DouyinCreator.createMany([owner, other].map((user) => ({ userId: user.id, sourceUrl: 'MS4wLjShared', secUid: 'MS4wLjShared', awemeCount: 10 })));
    const cache = await DouyinPostCache.create({
      cacheKey: postCacheKey('MS4wLjShared', 10),
      version: randomUUID(),
      secUid: 'MS4wLjShared',
      postLimit: 10,
      status: 'completed',
      submitted: true,
      result: '[]',
      startedAt: DateTime.local(),
      expiresAt: DateTime.local().plus({ days: 7 }),
    });
    const service = await app.container.make(DouyinPostService);
    for (const creator of creators) {
      const created = await service.create(creator.userId, { creatorId: creator.id });
      assert.isFalse(await service.advance(created.id));
      const search = await DouyinPostSearch.findOrFail(created.id);
      assert.equal(search.cacheId, cache.id);
      const summary = await service.summary(search);
      assert.isTrue(summary.cacheHit);
      assert.isTrue(summary.cacheValid);
      assert.notProperty(summary, 'result');
      assert.notProperty(summary, 'post');
    }
    assert.lengthOf(await DouyinPostCache.query().where('cacheKey', postCacheKey('MS4wLjShared', 10)), 1);
  });

  test('invalidates only the referenced cache version and keeps historical summaries', async ({ assert }) => {
    const user = await User.create({ username: 'post-cache-version', password: 'test-password' });
    const cache = await DouyinPostCache.create({
      cacheKey: postCacheKey('MS4wLjVersion', 10),
      version: randomUUID(),
      secUid: 'MS4wLjVersion',
      postLimit: 10,
      status: 'completed',
      submitted: true,
      result: '[]',
      startedAt: DateTime.local(),
      expiresAt: DateTime.local().plus({ days: 7 }),
    });
    const search = await DouyinPostSearch.create({ userId: user.id, source: 'MS4wLjVersion', status: 'completed', filters: '{}', cacheId: cache.id, cacheVersion: cache.version });
    const service = await app.container.make(DouyinPostService);
    cache.version = randomUUID();
    await cache.save();
    await assert.rejects(() => service.invalidate(user.id, search.id), /不会影响新版本/);
    await cache.refresh();
    assert.equal(cache.status, 'completed');
    search.cacheVersion = cache.version;
    await search.save();
    await service.invalidate(user.id, search.id);
    await cache.refresh();
    assert.isNull(cache.result);
    assert.isFalse((await service.summary(search)).cacheValid);
    assert.isNotNull(await DouyinPostSearch.find(search.id));
    await assert.rejects(() => service.results(user.id, search.id, 1, 20), /结果缓存已失效/);
  });

  test('never turns expired results into new downloads or refreshes upstream automatically', async ({ assert }) => {
    const user = await User.create({ username: 'post-cache-expired', password: 'test-password' });
    const creator = await DouyinCreator.create({ userId: user.id, sourceUrl: 'MS4wLjExpired', secUid: 'MS4wLjExpired' });
    const cache = await DouyinPostCache.create({
      cacheKey: postCacheKey('MS4wLjExpired', 10),
      version: randomUUID(),
      secUid: 'MS4wLjExpired',
      postLimit: 10,
      status: 'completed',
      submitted: true,
      result: '[]',
      startedAt: DateTime.local().minus({ days: 8 }),
      expiresAt: DateTime.local().minus({ days: 1 }),
    });
    const search = await DouyinPostSearch.create({
      userId: user.id,
      creatorId: creator.id,
      source: 'MS4wLjExpired',
      status: 'completed',
      filters: '{}',
      cacheId: cache.id,
      cacheVersion: cache.version,
    });
    const downloads = await app.container.make(DouyinDownloadService);
    const searches = await app.container.make(DouyinPostService);
    await assert.rejects(() => downloads.create(user.id, search.id, ['123'], {}), /结果缓存已失效/);
    assert.isFalse((await searches.summary(search)).cacheValid);
  });

  test('deletes all creator records and work files without deleting shared cache or other users data', async ({ assert, cleanup }) => {
    const secUid = 'MS4wLjCascade';
    const owner = await User.create({ username: 'cascade-owner', password: 'test-password' });
    const other = await User.create({ username: 'cascade-other', password: 'test-password' });
    const creator = await DouyinCreator.create({ userId: owner.id, sourceUrl: secUid, secUid });
    const untouched = await DouyinCreator.create({ userId: other.id, sourceUrl: secUid, secUid });
    const otherProfileTask = await DouyinCreatorTask.create({ userId: other.id, creatorId: untouched.id, sourceUrl: secUid, status: 'processing' });
    const otherBatch = await DouyinDownloadBatch.create({ userId: other.id, creatorId: untouched.id });
    const otherDownload = await DouyinDownloadTask.create({
      userId: other.id,
      creatorId: untouched.id,
      batchId: otherBatch.id,
      awemeId: 'queued',
      status: 'queued',
      metadata: '{}',
    });
    const profileTask = await DouyinCreatorTask.create({ userId: owner.id, creatorId: creator.id, sourceUrl: creator.sourceUrl, status: 'processing' });
    const oldTask = await DouyinCreatorTask.create({ userId: owner.id, creatorId: creator.id, sourceUrl: creator.sourceUrl, status: 'completed' });
    creator.currentTaskId = profileTask.id;
    await creator.save();
    const cache = await DouyinPostCache.create({
      cacheKey: postCacheKey(secUid, 10),
      version: randomUUID(),
      secUid,
      postLimit: 10,
      status: 'completed',
      result: '[]',
      startedAt: DateTime.local(),
      expiresAt: DateTime.local().plus({ days: 7 }),
    });
    const search = await DouyinPostSearch.create({
      userId: owner.id,
      creatorId: creator.id,
      source: creator.sourceUrl,
      status: 'completed',
      filters: '{}',
      cacheId: cache.id,
      cacheVersion: cache.version,
    });
    await DouyinPostSearch.create({ userId: owner.id, creatorTaskId: oldTask.id, source: 'historical-source', status: 'failed', filters: '{}' });
    await DouyinPostSearch.create({ userId: owner.id, source: creator.sourceUrl, status: 'processing', filters: '{}' });
    const caseDistinctSearch = await DouyinPostSearch.create({ userId: owner.id, source: 'MS4wLjcascade', status: 'failed', filters: '{}' });
    const otherSearch = await DouyinPostSearch.create({
      userId: other.id,
      creatorId: untouched.id,
      source: untouched.sourceUrl,
      status: 'completed',
      filters: '{}',
      cacheId: cache.id,
      cacheVersion: cache.version,
    });
    const tasks: DouyinDownloadTask[] = [];
    for (const status of ['queued', 'processing', 'completed', 'failed']) {
      const batch = await DouyinDownloadBatch.create({ userId: owner.id, creatorId: creator.id });
      tasks.push(await DouyinDownloadTask.create({ userId: owner.id, creatorId: creator.id, batchId: batch.id, awemeId: status, status, metadata: '{}' }));
    }
    const work = await DouyinWork.create({
      userId: owner.id,
      creatorId: creator.id,
      awemeId: 'cascade-video',
      title: '待删除作品',
      metadata: '{}',
      videoUrl: 'https://oss.example/video',
      videoKey: 'prefix/owner/video.mp4',
      coverUrl: 'https://oss.example/cover',
      coverKey: 'prefix/owner/cover.jpg',
    });
    const otherWork = await DouyinWork.create({
      userId: other.id,
      creatorId: untouched.id,
      awemeId: work.awemeId,
      title: '保留作品',
      metadata: '{}',
      videoUrl: 'https://oss.example/other',
      videoKey: 'prefix/other/video.mp4',
    });
    const oss = await app.container.make('oss');
    const originalDelete = oss.delete;
    const deletedKeys: string[] = [];
    oss.delete = async (key) => {
      deletedKeys.push(key);
      return { res: { status: 204, headers: {}, size: 0, rt: 0 } };
    };
    cleanup(() => {
      oss.delete = originalDelete;
    });

    const service = await app.container.make(DouyinCreatorService);
    const searches = await app.container.make(DouyinPostService);
    const downloads = await app.container.make(DouyinDownloadService);
    await assert.rejects(() => service.remove(other.id, creator.id), /博主不存在/);
    assert.isEmpty(deletedKeys);
    await service.remove(owner.id, creator.id);
    assert.sameMembers(deletedKeys, ['prefix/owner/video.mp4', 'prefix/owner/cover.jpg']);
    assert.isNull(await DouyinCreator.find(creator.id));
    assert.isEmpty(await DouyinCreatorTask.query().where('userId', owner.id));
    assert.isEmpty(await DouyinDownloadTask.query().where('userId', owner.id));
    assert.isEmpty(await DouyinDownloadBatch.query().where('userId', owner.id));
    assert.deepEqual(
      (await DouyinPostSearch.query().where('userId', owner.id)).map((record) => record.id),
      [caseDistinctSearch.id],
    );
    assert.isEmpty(await DouyinWork.query().where('userId', owner.id));
    assert.isNotNull(await DouyinCreator.find(untouched.id));
    assert.isNotNull(await DouyinCreatorTask.find(otherProfileTask.id));
    assert.isNotNull(await DouyinDownloadBatch.find(otherBatch.id));
    assert.isNotNull(await DouyinDownloadTask.find(otherDownload.id));
    assert.isNotNull(await DouyinWork.find(otherWork.id));
    assert.isTrue((await searches.summary(otherSearch)).cacheValid);
    assert.equal((await DouyinPostCache.findOrFail(cache.id)).result, '[]');
    await service.complete(profileTask.id, { sec_uid: secUid }, null);
    assert.isFalse(await searches.advance(search.id));
    for (const task of tasks) await downloads.execute(task.id);
    await assert.rejects(() => service.create(owner.id, creator.sourceUrl, search.id), /搜索任务已删除或结束/);
    assert.isEmpty(await DouyinCreator.query().where('userId', owner.id));
  });

  test('keeps creator and associated records when OSS cleanup fails', async ({ assert, cleanup }) => {
    const user = await User.create({ username: 'cascade-oss-failure', password: 'test-password' });
    const creator = await DouyinCreator.create({ userId: user.id, sourceUrl: 'MS4wLjCleanup' });
    const work = await DouyinWork.create({
      userId: user.id,
      creatorId: creator.id,
      awemeId: 'cleanup-video',
      title: '作品',
      metadata: '{}',
      videoUrl: 'https://oss.example/video',
      videoKey: 'prefix/video.mp4',
    });
    const search = await DouyinPostSearch.create({ userId: user.id, creatorId: creator.id, source: creator.sourceUrl, status: 'processing', filters: '{}' });
    const oss = await app.container.make('oss');
    const originalDelete = oss.delete;
    oss.delete = async () => {
      throw new Error('OSS unavailable');
    };
    cleanup(() => {
      oss.delete = originalDelete;
    });
    const creators = await app.container.make(DouyinCreatorService);
    await assert.rejects(() => creators.remove(user.id, creator.id), /OSS unavailable/);
    assert.isNotNull(await DouyinCreator.find(creator.id));
    assert.isNotNull(await DouyinWork.find(work.id));
    assert.isNotNull(await DouyinPostSearch.find(search.id));
  });

  test('associates a waiting search before dispatch and deletes it with its placeholder creator', async ({ assert }) => {
    const user = await User.create({ username: 'cascade-waiting-search', password: 'test-password' });
    const searches = await app.container.make(DouyinPostService);
    const summary = await searches.create(user.id, { source: 'MS4wLjPendingCascade' });
    const search = await DouyinPostSearch.findOrFail(summary.id);
    assert.isNotNull(search.creatorId);
    assert.isNotNull(search.creatorTaskId);
    const task = await DouyinCreatorTask.findOrFail(search.creatorTaskId);
    assert.equal(search.creatorId, task.creatorId);
    assert.isTrue(await searches.advance(search.id));
    const creator = await DouyinCreator.findOrFail(search.creatorId);
    const creators = await app.container.make(DouyinCreatorService);
    await creators.remove(user.id, creator.id);
    assert.isNull(await DouyinPostSearch.find(search.id));
    assert.isNull(await DouyinCreatorTask.find(task.id));
    assert.isNull(await DouyinCreator.find(creator.id));
  });
});
