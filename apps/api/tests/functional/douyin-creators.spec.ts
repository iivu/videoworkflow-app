import testUtils from '@adonisjs/core/services/test_utils';
import queue from '@adonisjs/queue/services/main';
import { test } from '@japa/runner';
import { DateTime } from 'luxon';
import DouyinCreator from '#models/douyin-creator';
import DouyinCreatorTask from '#models/douyin-creator-task';
import User from '#models/user';
import { DouyinCreatorService } from '#services/douyin-creator-service';

test.group('Douyin creators persistence and ownership', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());
  group.each.setup(() => {
    queue.fake();
    return () => queue.restore();
  });

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/douyin-creators');
    response.assertStatus(401);
  });

  test('creates a placeholder with a null sec_uid and an internal task association', async ({ assert }) => {
    const user = await User.create({ username: 'creator-placeholder', password: 'test-password' });
    const service = new DouyinCreatorService();
    const task = await service.create(user.id, 'MS4wLjABAAAA_test');
    const creator = await DouyinCreator.findOrFail(task.creatorId);
    assert.isNull(creator.secUid);
    assert.equal(creator.currentTaskId, task.id);
    assert.equal(task.creatorId, creator.id);
    assert.equal(task.status, 'processing');
    assert.isNull(creator.nickname);
    assert.equal(creator.downloadedCount, 0);
  });

  test('reuses processing tasks for repeated input and manual retries', async ({ assert }) => {
    const user = await User.create({ username: 'creator-repeat', password: 'test-password' });
    const service = new DouyinCreatorService();
    const task = await service.create(user.id, 'https://www.douyin.com/user/MS4wLjABAAAA_test');
    const repeated = await service.create(user.id, 'MS4wLjABAAAA_test');
    const creator = await DouyinCreator.findOrFail(task.creatorId);
    const retried = await service.retry(user.id, creator.id);
    assert.equal(repeated.id, task.id);
    assert.equal(retried.id, task.id);
    assert.lengthOf(await DouyinCreator.query().where('userId', user.id), 1);
    assert.lengthOf(await DouyinCreatorTask.query().where('userId', user.id), 1);
  });

  test('merges a resolved short link into the existing creator without losing local data', async ({ assert }) => {
    const user = await User.create({ username: 'creator-merge', password: 'test-password' });
    const existing = await DouyinCreator.create({
      userId: user.id,
      sourceUrl: 'MS4wLjABAAAA_test',
      secUid: 'MS4wLjABAAAA_test',
      nickname: '旧名',
      avatarUrl: 'https://oss.example/avatar.jpg',
      downloadedCount: 7,
      lastSyncedAt: DateTime.utc(),
    });
    const service = new DouyinCreatorService();
    const task = await service.create(user.id, 'https://v.douyin.com/short/');
    const placeholderId = task.creatorId;
    await service.complete(task.id, { sec_uid: 'MS4wLjABAAAA_test', nickname: '新名', follower_count: 123 }, null);
    await existing.refresh();
    await task.refresh();
    assert.equal(existing.nickname, '新名');
    assert.equal(existing.followerCount, 123);
    assert.equal(existing.downloadedCount, 7);
    assert.equal(existing.avatarUrl, 'https://oss.example/avatar.jpg');
    assert.equal(task.creatorId, existing.id);
    assert.equal(task.status, 'completed');
    assert.isNull(await DouyinCreator.find(placeholderId));
    assert.lengthOf(await DouyinCreator.query().where('userId', user.id), 1);
  });

  test('does not let an older resolved task overwrite a newer snapshot', async ({ assert }) => {
    const user = await User.create({ username: 'creator-old-result', password: 'test-password' });
    const service = new DouyinCreatorService();
    const older = await service.create(user.id, 'https://v.douyin.com/older/');
    const newer = await service.create(user.id, 'MS4wLjABAAAA_test');
    await service.complete(newer.id, { sec_uid: 'MS4wLjABAAAA_test', nickname: '最新资料' }, null);
    await service.complete(older.id, { sec_uid: 'MS4wLjABAAAA_test', nickname: '过期资料' }, null);
    const creators = await DouyinCreator.query().where('userId', user.id);
    assert.lengthOf(creators, 1);
    assert.equal(creators[0].nickname, '最新资料');
    assert.equal(creators[0].currentTaskId, newer.id);
  });

  test('discards results after deletion and does not resurrect a creator', async ({ assert }) => {
    const user = await User.create({ username: 'creator-delete', password: 'test-password' });
    const service = new DouyinCreatorService();
    const task = await service.create(user.id, 'MS4wLjABAAAA_test');
    const creator = await DouyinCreator.findOrFail(task.creatorId);
    await service.remove(user.id, creator.id);
    await service.complete(task.id, { sec_uid: 'MS4wLjABAAAA_test', nickname: '已删除博主' }, null);
    await task.refresh();
    assert.equal(task.status, 'canceled');
    assert.isNull(task.creatorId);
    assert.lengthOf(await DouyinCreator.query().where('userId', user.id), 0);
  });

  test('keeps tasks and creators isolated by user', async ({ assert }) => {
    const owner = await User.create({ username: 'creator-owner', password: 'test-password' });
    const stranger = await User.create({ username: 'creator-stranger', password: 'test-password' });
    const service = new DouyinCreatorService();
    const task = await service.create(owner.id, 'MS4wLjABAAAA_test');
    const creator = await DouyinCreator.findOrFail(task.creatorId);
    const { paginated, hasProcessing } = await service.list(stranger.id, {});
    assert.lengthOf(paginated.all(), 0);
    assert.isFalse(hasProcessing);
    await assert.rejects(() => service.task(stranger.id, task.id), '任务不存在');
    await assert.rejects(() => service.retry(stranger.id, creator.id), '博主不存在');
    await assert.rejects(() => service.remove(stranger.id, creator.id), '博主不存在');
    assert.isNotNull(await DouyinCreator.find(task.creatorId));
  });

  test('searches nicknames and Douyin IDs and sorts raw counts', async ({ assert }) => {
    const user = await User.create({ username: 'creator-search', password: 'test-password' });
    await DouyinCreator.createMany([
      { userId: user.id, sourceUrl: 'MS4wLjFirst', secUid: 'MS4wLjFirst', nickname: '旅途', uniqueId: 'travel01', totalFavorited: 200, followerCount: 10 },
      { userId: user.id, sourceUrl: 'MS4wLjSecond', secUid: 'MS4wLjSecond', nickname: '日常', uniqueId: 'daily01', totalFavorited: 100, followerCount: 30 },
    ]);
    const service = new DouyinCreatorService();
    const byId = await service.list(user.id, { keyword: 'travel' });
    assert.equal(byId.paginated.all()[0].nickname, '旅途');
    const byName = await service.list(user.id, { keyword: '日常' });
    assert.lengthOf(byName.paginated.all(), 1);
    const sorted = await service.list(user.id, { sortBy: 'followerCount' });
    assert.equal(sorted.paginated.all()[0].nickname, '日常');
  });
});
