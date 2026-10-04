import type { JobContext } from '@adonisjs/queue/types';
import { test } from '@japa/runner';

import CrawlerVideoJob, { mapToVideoPayload } from '#jobs/crawler-video-job';
import { TASK_STATUS } from '#models/crawler-video-task';
import type { OssClient, PutStreamResponse } from '#providers/oss-provider';
import { ApizeroService, type ApizeroVideoData } from '#services/apizero-service';
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

function makeVideoData(overrides: Partial<ApizeroVideoData> = {}): ApizeroVideoData {
  return {
    platform: 'douyin',
    type: '视频',
    title: 'Video title',
    desc: 'Video desc',
    work_id: 'work-id',
    video_url: 'https://cdn.example.com/video.mp4',
    cover_url: 'https://cdn.example.com/cover.jpg',
    audio_url: '',
    imagelist: [],
    stats: {
      author_name: 'Author',
      author_avatar: 'https://cdn.example.com/avatar.jpg',
      author_account: '',
      author_id: 'author-id',
      like_count: 166744,
      comment_count: 10755,
      share_count: 14143,
      play_count: 1234,
      collect_count: 14320,
      publish_time: '2022-11-12 18:01:34',
    },
    video_list: [],
    source: {
      platform: 'douyin',
      platform_label: '抖音',
      original_url: 'https://example.com/share',
      work_id: 'work-id',
      author_name: 'Author',
      author_account: '',
      author_id: 'author-id',
      copyright_notice: '',
      usage_restriction: '',
      disclaimer_url: '',
      dmca_contact: '',
    },
    duration_ms: 18000,
    duration: 18,
    ...overrides,
  };
}

class StubApizeroService extends ApizeroService {
  readonly calls: Array<{ url: string }> = [];

  constructor(private readonly data: ApizeroVideoData | null) {
    super();
  }

  override async videoParse(url: string): Promise<ApizeroVideoData> {
    this.calls.push({ url });
    if (!this.data) throw new Error('video parse failed');
    return this.data;
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
    apizeroService: ApizeroService,
    crawlerVideoTaskService: CrawlerVideoTaskService,
    videoService: VideoService,
    private readonly ossClient: OssClient,
  ) {
    super(apizeroService, crawlerVideoTaskService, videoService);
  }

  protected override async makeOssClient(): Promise<OssClient> {
    return this.ossClient;
  }
}

function createJob(platform: 'douyin' | 'sph', ossClient: StubOssClient) {
  const apizeroService = new StubApizeroService(makeVideoData());
  const taskService = new StubTaskService();
  const videoService = new StubVideoService();
  const job = new StubCrawlerVideoJob(apizeroService, taskService, videoService, ossClient);
  job.$hydrate({ taskId: 1, videoUrl: 'https://example.com/share', platform, userId: 'user-1' }, JOB_CONTEXT);
  return { job, apizeroService, taskService, videoService, ossClient };
}

test.group('Crawler video job', () => {
  test('parses the video and creates a video with the douyin platform', async ({ assert }) => {
    const ossClient = new StubOssClient();
    const { job, apizeroService, taskService, videoService, ossClient: client } = createJob('douyin', ossClient);

    await job.execute();

    assert.deepEqual(apizeroService.calls, [{ url: 'https://example.com/share' }]);
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
    assert.equal(payload.playCount, 1234);
    assert.match(String(payload.publishAt), /2022-11-12/);
    assert.deepEqual(taskService.updates, [{ payload: { status: TASK_STATUS.COMPLETED, taskId: 1 } }]);
  });

  test('creates a video with the sph platform', async ({ assert }) => {
    const ossClient = new StubOssClient();
    const { job, apizeroService, taskService, videoService } = createJob('sph', ossClient);

    await job.execute();

    assert.deepEqual(apizeroService.calls, [{ url: 'https://example.com/share' }]);
    const creation = videoService.creations[0] as { payload: Array<Record<string, unknown>> };
    const payload = creation.payload[0];
    assert.equal(payload.platform, 'sph');
    assert.equal(payload.title, 'Video title');
    assert.equal(payload.author, 'Author');
    assert.match(String(payload.fileUrl), /^https:\/\/cdn\.example\.com\/cv\//);
    assert.equal(payload.likeCount, 166744);
    assert.equal(payload.playCount, 1234);
    assert.match(String(payload.publishAt), /2022-11-12/);
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
    const apizeroService = new StubApizeroService(makeVideoData({ video_url: '' }));
    const taskService = new StubTaskService();
    const videoService = new StubVideoService();
    const job = new StubCrawlerVideoJob(apizeroService, taskService, videoService, ossClient);
    job.$hydrate({ taskId: 1, videoUrl: 'https://example.com/share', platform: 'douyin', userId: 'user-1' }, JOB_CONTEXT);

    const error = await job.execute().catch((caught) => caught);

    assert.equal((error as Error).message, '视频链接为空');
    assert.deepEqual(taskService.updates, []);
  });
});

test.group('mapToVideoPayload', () => {
  test('maps video data and falls back to the current time for invalid publish time', async ({ assert }) => {
    const data = makeVideoData({
      stats: { ...makeVideoData().stats, publish_time: 'invalid' },
    });
    const payload = mapToVideoPayload(data, 'douyin');

    assert.equal(payload.platform, 'douyin');
    assert.equal(payload.title, 'Video title');
    assert.equal(payload.author, 'Author');
    assert.equal(payload.fileUrl, 'https://cdn.example.com/video.mp4');
    assert.equal(payload.coverUrl, 'https://cdn.example.com/cover.jpg');
    assert.equal(payload.likeCount, 166744);
    assert.equal(payload.playCount, 1234);
    assert.isTrue(payload.publishAt.isValid);
  });

  test('omits an empty cover URL', async ({ assert }) => {
    const payload = mapToVideoPayload(makeVideoData({ cover_url: '' }), 'douyin');

    assert.isUndefined(payload.coverUrl);
  });

  test('maps all interaction counts from stats', async ({ assert }) => {
    const payload = mapToVideoPayload(
      makeVideoData({
        stats: { ...makeVideoData().stats, like_count: 43000, collect_count: 34000, share_count: 5842, comment_count: 199, play_count: 0 },
      }),
      'sph',
    );

    assert.equal(payload.platform, 'sph');
    assert.equal(payload.likeCount, 43000);
    assert.equal(payload.favoriteCount, 34000);
    assert.equal(payload.shareCount, 5842);
    assert.equal(payload.commentCount, 199);
    assert.equal(payload.playCount, 0);
  });
});
