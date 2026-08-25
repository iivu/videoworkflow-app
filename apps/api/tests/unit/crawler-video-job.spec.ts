import type { JobContext } from '@adonisjs/queue/types';
import { test } from '@japa/runner';

import CrawlerVideoJob, { mapToVideoPayload, parseCount } from '#jobs/crawler-video-job';
import { TASK_STATUS } from '#models/crawler-video-task';
import type { OssClient, PutStreamResponse } from '#providers/oss-provider';
import { _52ApiService, type Api52DouyinVideoData, type Api52SphVideoData } from '#services/52api-service';
import { CrawlerVideoTaskService } from '#services/crawler-video-task-service';
import { VideoService } from '#services/video-service';

const JOB_CONTEXT: JobContext = {
  jobId: 'test-job',
  name: 'CrawlerVideoJob',
  attempt: 1,
  queue: 'crawler-video-queue',
  priority: 5,
  acquiredAt: new Date(),
  stalledCount: 0,
};

const douyinVideoData: Api52DouyinVideoData = {
  music: {
    author: 'Artist',
    avatar: 'https://cdn.example.com/music-avatar.jpg',
    cover: 'https://cdn.example.com/music-cover.jpg',
    name: 'Original sound',
    url: 'https://cdn.example.com/music.mp3',
  },
  work_author: 'Author',
  work_author_age: 23,
  work_author_signature: 'Signature',
  work_avatar: 'https://cdn.example.com/avatar.jpg',
  work_collect_count: 14320,
  work_comment_count: 10755,
  work_cover: 'https://cdn.example.com/cover.jpg',
  work_digg_count: 166744,
  work_download_count: 2516,
  work_duration: '18秒',
  work_share_count: 14143,
  work_time: '2022-11-12 18:01:34',
  work_title: 'Video title',
  work_type: 'video',
  work_uid: 'author-id',
  work_url: 'https://cdn.example.com/video.mp4',
};

const sphVideoData: Api52SphVideoData = {
  video_author: 'Author',
  video_avatar: 'https://cdn.example.com/avatar.jpg',
  video_commentNum: '199',
  video_cover: 'https://cdn.example.com/cover.jpg',
  video_createtime: '2026-04-10 16:30:00',
  video_favNum: '3.4万',
  video_forwardNum: '5842',
  video_likeNum: '4.3万',
  video_title: 'Video title',
  video_url: 'https://cdn.example.com/video.mp4',
};

class Stub52ApiService extends _52ApiService {
  readonly calls: Array<{ method: string; url: string }> = [];

  constructor(
    private readonly douyinData: Api52DouyinVideoData | null,
    private readonly sphData: Api52SphVideoData | null,
  ) {
    super();
  }

  override async douyin(url: string): Promise<Api52DouyinVideoData> {
    this.calls.push({ method: 'douyin', url });
    if (!this.douyinData) throw new Error('douyin fetch failed');
    return this.douyinData;
  }

  override async sph(url: string): Promise<Api52SphVideoData> {
    this.calls.push({ method: 'sph', url });
    if (!this.sphData) throw new Error('sph fetch failed');
    return this.sphData;
  }
}

class StubTaskService extends CrawlerVideoTaskService {
  readonly updates: Array<{ payload: { status: string; taskId: number; reason?: string } }> = [];

  override async update(params: Parameters<CrawlerVideoTaskService['update']>[0]) {
    this.updates.push(params);
    return undefined as never;
  }
}

class StubVideoService extends VideoService {
  readonly creations: unknown[] = [];

  override async createVideos(params: Parameters<VideoService['createVideos']>[0]) {
    this.creations.push(params);
    return undefined as never;
  }
}

class StubOssClient implements OssClient {
  readonly attemptedUrls: string[] = [];
  failUrls = new Set<string>();

  putURL(url: string, key: string): Promise<PutStreamResponse> {
    this.attemptedUrls.push(url);
    if (this.failUrls.has(url)) {
      return Promise.reject(new Error(`download failed: ${url}`));
    }
    return Promise.resolve({ name: key, url: `https://cdn.example.com/${key}` } as PutStreamResponse);
  }

  async putStream(): Promise<PutStreamResponse> {
    throw new Error('putStream not implemented');
  }

  async delete(): Promise<unknown> {
    throw new Error('delete not implemented');
  }
}

class StubCrawlerVideoJob extends CrawlerVideoJob {
  constructor(
    api52Service: _52ApiService,
    crawlerVideoTaskService: CrawlerVideoTaskService,
    videoService: VideoService,
    private readonly ossClient: OssClient,
  ) {
    super(api52Service, crawlerVideoTaskService, videoService);
  }

  protected override async makeOssClient(): Promise<OssClient> {
    return this.ossClient;
  }
}

function createJob(platform: 'douyin' | 'sph', ossClient: StubOssClient) {
  const api52Service = new Stub52ApiService(platform === 'douyin' ? douyinVideoData : null, platform === 'sph' ? sphVideoData : null);
  const taskService = new StubTaskService();
  const videoService = new StubVideoService();
  const job = new StubCrawlerVideoJob(api52Service, taskService, videoService, ossClient);
  job.$hydrate({ taskId: 1, videoUrl: 'https://example.com/share', platform, userId: 'user-1' }, JOB_CONTEXT);
  return { job, api52Service, taskService, videoService, ossClient };
}

test.group('Crawler video job', () => {
  test('calls the douyin endpoint and creates a video with the douyin platform', async ({ assert }) => {
    const ossClient = new StubOssClient();
    const { job, api52Service, taskService, videoService, ossClient: client } = createJob('douyin', ossClient);

    await job.execute();

    assert.deepEqual(api52Service.calls, [{ method: 'douyin', url: 'https://example.com/share' }]);
    assert.deepEqual(client.attemptedUrls, ['https://cdn.example.com/video.mp4']);
    const creation = videoService.creations[0] as { payload: Array<Record<string, unknown>>; userId: string };
    assert.equal(creation.userId, 'user-1');
    const payload = creation.payload[0];
    assert.equal(payload.platform, 'douyin');
    assert.equal(payload.title, 'Video title');
    assert.equal(payload.author, 'Author');
    assert.match(String(payload.fileUrl), /^https:\/\/cdn\.example\.com\/cv\//);
    assert.equal(payload.likeCount, 166744);
    assert.equal(payload.favoriteCount, 14320);
    assert.equal(payload.shareCount, 14143);
    assert.equal(payload.commentCount, 10755);
    assert.match(String(payload.publishAt), /2022-11-12/);
    assert.deepEqual(taskService.updates, [{ payload: { status: TASK_STATUS.COMPLETED, taskId: 1 } }]);
  });

  test('calls the sph endpoint, parses Chinese counts and creates a video with the sph platform', async ({ assert }) => {
    const ossClient = new StubOssClient();
    const { job, api52Service, taskService, videoService } = createJob('sph', ossClient);

    await job.execute();

    assert.deepEqual(api52Service.calls, [{ method: 'sph', url: 'https://example.com/share' }]);
    const creation = videoService.creations[0] as { payload: Array<Record<string, unknown>> };
    const payload = creation.payload[0];
    assert.equal(payload.platform, 'sph');
    assert.equal(payload.title, 'Video title');
    assert.equal(payload.author, 'Author');
    assert.match(String(payload.fileUrl), /^https:\/\/cdn\.example\.com\/cv\//);
    assert.equal(payload.likeCount, 43000);
    assert.equal(payload.favoriteCount, 34000);
    assert.equal(payload.shareCount, 5842);
    assert.equal(payload.commentCount, 199);
    assert.match(String(payload.publishAt), /2026-04-10/);
    assert.deepEqual(taskService.updates, [{ payload: { status: TASK_STATUS.COMPLETED, taskId: 1 } }]);
  });

  test('fails when the video download fails and propagates the error', async ({ assert }) => {
    const ossClient = new StubOssClient();
    ossClient.failUrls = new Set(['https://cdn.example.com/video.mp4']);
    const { job, taskService } = createJob('douyin', ossClient);

    const error = await job.execute().catch((caught) => caught);

    assert.instanceOf(error, Error);
    assert.equal((error as Error).message, 'download failed: https://cdn.example.com/video.mp4');
    assert.deepEqual(taskService.updates, []);
  });

  test('marks the task as failed with the download error', async ({ assert }) => {
    const ossClient = new StubOssClient();
    ossClient.failUrls = new Set(['https://cdn.example.com/video.mp4']);
    const { job, taskService } = createJob('douyin', ossClient);

    await job.execute().catch(() => undefined);
    await job.failed(new Error('download failed: https://cdn.example.com/video.mp4'));

    assert.deepEqual(taskService.updates, [{ payload: { status: TASK_STATUS.FAILED, taskId: 1, reason: 'download failed: https://cdn.example.com/video.mp4' } }]);
  });

  test('fails when the API response has no video URL', async ({ assert }) => {
    const ossClient = new StubOssClient();
    const api52Service = new Stub52ApiService({ ...douyinVideoData, work_url: '' }, null);
    const taskService = new StubTaskService();
    const videoService = new StubVideoService();
    const job = new StubCrawlerVideoJob(api52Service, taskService, videoService, ossClient);
    job.$hydrate({ taskId: 1, videoUrl: 'https://example.com/share', platform: 'douyin', userId: 'user-1' }, JOB_CONTEXT);

    const error = await job.execute().catch((caught) => caught);

    assert.equal((error as Error).message, '视频链接为空');
    assert.deepEqual(taskService.updates, []);
  });
});

test.group('mapToVideoPayload', () => {
  test('maps douyin data and falls back to the current time for invalid publish time', async ({ assert }) => {
    const payload = mapToVideoPayload({ ...douyinVideoData, work_time: 'invalid' }, 'douyin');

    assert.equal(payload.platform, 'douyin');
    assert.equal(payload.title, 'Video title');
    assert.equal(payload.author, 'Author');
    assert.equal(payload.fileUrl, 'https://cdn.example.com/video.mp4');
    assert.equal(payload.coverUrl, 'https://cdn.example.com/cover.jpg');
    assert.equal(payload.likeCount, 166744);
    assert.isTrue(payload.publishAt.isValid);
  });

  test('omits an empty cover URL', async ({ assert }) => {
    const payload = mapToVideoPayload({ ...douyinVideoData, work_cover: '' }, 'douyin');

    assert.isUndefined(payload.coverUrl);
  });

  test('maps sph data with parsed Chinese counts', async ({ assert }) => {
    const payload = mapToVideoPayload(sphVideoData, 'sph');

    assert.equal(payload.platform, 'sph');
    assert.equal(payload.likeCount, 43000);
    assert.equal(payload.favoriteCount, 34000);
    assert.equal(payload.shareCount, 5842);
    assert.equal(payload.commentCount, 199);
    assert.equal(payload.playCount, 0);
  });
});

test.group('parseCount', () => {
  for (const scenario of [
    { input: '1234', expected: 1234 },
    { input: '4.3万', expected: 43000 },
    { input: '1.2亿', expected: 120000000 },
    { input: '-', expected: 0 },
    { input: '', expected: 0 },
    { input: 'abc', expected: 0 },
    { input: 42, expected: 42 },
    { input: null, expected: 0 },
    { input: undefined, expected: 0 },
  ]) {
    test(`parses ${String(scenario.input)} to ${scenario.expected}`, ({ assert }) => {
      assert.equal(parseCount(scenario.input), scenario.expected);
    });
  }
});
