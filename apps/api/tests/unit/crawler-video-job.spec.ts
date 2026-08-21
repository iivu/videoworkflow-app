import type { JobContext } from '@adonisjs/queue/types';
import { test } from '@japa/runner';

import CrawlerVideoJob from '#jobs/crawler-video-job';
import { TASK_STATUS } from '#models/crawler-video-task';
import type { OssClient, PutStreamResponse } from '#providers/oss-provider';
import { CrawlerVideoTaskService } from '#services/crawler-video-task-service';
import type { ShanhaiVideoInfo } from '#services/shanhai-api-service';
import { ShanhaiApiService } from '#services/shanhai-api-service';
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

class StubShanhaiApiService extends ShanhaiApiService {
  constructor(private readonly videoInfo: ShanhaiVideoInfo) {
    super();
  }

  override async fetchVideoInfo(_url: string): Promise<ShanhaiVideoInfo> {
    return this.videoInfo;
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
    shanhaiApiService: ShanhaiApiService,
    crawlerVideoTaskService: CrawlerVideoTaskService,
    videoService: VideoService,
    private readonly ossClient: OssClient,
  ) {
    super(shanhaiApiService, crawlerVideoTaskService, videoService);
  }

  protected override async makeOssClient(): Promise<OssClient> {
    return this.ossClient;
  }
}

function createVideoInfo(videoUrls: string[]): ShanhaiVideoInfo {
  return {
    title: 'Crawled video',
    videoUrls,
    author: 'Author',
    platform: 'douyin',
    stats: { likeCount: 1, playCount: 2, shareCount: 3, collectCount: 4, commentCount: 5 },
  };
}

function createJob(videoUrls: string[], ossClient: StubOssClient) {
  const shanhaiApiService = new StubShanhaiApiService(createVideoInfo(videoUrls));
  const taskService = new StubTaskService();
  const videoService = new StubVideoService();
  const job = new StubCrawlerVideoJob(shanhaiApiService, taskService, videoService, ossClient);
  job.$hydrate({ taskId: 1, videoUrl: 'https://example.com/watch', userId: 'user-1' }, JOB_CONTEXT);
  return { job, taskService, videoService, ossClient };
}

test.group('Crawler video job', () => {
  test('tries candidate URLs in order and stops at the first successful download', async ({ assert }) => {
    const ossClient = new StubOssClient();
    ossClient.failUrls = new Set(['https://cdn.example.com/small.mp4', 'https://cdn.example.com/medium.mp4']);
    const {
      job,
      taskService,
      videoService,
      ossClient: client,
    } = createJob(
      ['https://cdn.example.com/small.mp4', 'https://cdn.example.com/medium.mp4', 'https://cdn.example.com/large.mp4', 'https://cdn.example.com/fallback.mp4'],
      ossClient,
    );

    await job.execute();

    assert.deepEqual(client.attemptedUrls, ['https://cdn.example.com/small.mp4', 'https://cdn.example.com/medium.mp4', 'https://cdn.example.com/large.mp4']);
    const creation = videoService.creations[0] as { payload: Array<{ fileUrl: string }> };
    assert.match(creation.payload[0].fileUrl, /^https:\/\/cdn\.example\.com\/cv\//);
    assert.deepEqual(taskService.updates, [{ payload: { status: TASK_STATUS.COMPLETED, taskId: 1 } }]);
  });

  test('succeeds immediately when the first candidate downloads', async ({ assert }) => {
    const ossClient = new StubOssClient();
    const { job, taskService, ossClient: client } = createJob(['https://cdn.example.com/small.mp4'], ossClient);

    await job.execute();

    assert.deepEqual(client.attemptedUrls, ['https://cdn.example.com/small.mp4']);
    assert.deepEqual(taskService.updates, [{ payload: { status: TASK_STATUS.COMPLETED, taskId: 1 } }]);
  });

  test('fails when every candidate download fails and propagates the last error', async ({ assert }) => {
    const ossClient = new StubOssClient();
    ossClient.failUrls = new Set([
      'https://cdn.example.com/small.mp4',
      'https://cdn.example.com/medium.mp4',
      'https://cdn.example.com/large.mp4',
      'https://cdn.example.com/fallback.mp4',
    ]);
    const { job, taskService } = createJob(
      ['https://cdn.example.com/small.mp4', 'https://cdn.example.com/medium.mp4', 'https://cdn.example.com/large.mp4', 'https://cdn.example.com/fallback.mp4'],
      ossClient,
    );

    const error = await job.execute().catch((caught) => caught);

    assert.instanceOf(error, Error);
    assert.equal((error as Error).message, 'download failed: https://cdn.example.com/fallback.mp4');
    assert.deepEqual(taskService.updates, []);
  });

  test('marks the task as failed with the download error', async ({ assert }) => {
    const ossClient = new StubOssClient();
    ossClient.failUrls = new Set(['https://cdn.example.com/small.mp4']);
    const { job, taskService } = createJob(['https://cdn.example.com/small.mp4'], ossClient);

    await job.execute().catch(() => undefined);
    await job.failed(new Error('download failed: https://cdn.example.com/small.mp4'));

    assert.deepEqual(taskService.updates, [{ payload: { status: TASK_STATUS.FAILED, taskId: 1, reason: 'download failed: https://cdn.example.com/small.mp4' } }]);
  });
});
