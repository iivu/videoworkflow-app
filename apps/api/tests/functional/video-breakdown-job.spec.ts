import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import app from '@adonisjs/core/services/app';
import testUtils from '@adonisjs/core/services/test_utils';
import type { JobContext } from '@adonisjs/queue/types';
import { test } from '@japa/runner';

import VideoBreakdownJob from '#jobs/video-breakdown-job';
import User from '#models/user';
import VideoBreakdownTask, { VIDEO_BREAKDOWN_TASK_STATUS } from '#models/video-breakdown-task';
import { PromptService } from '#services/prompt-service';
import { type VideoBreakdownSegmentDraft, VideoBreakdownService } from '#services/video-breakdown-service';

const SEGMENTS: VideoBreakdownSegmentDraft[] = [
  { start: '00:00:00.000', end: '00:00:12.500', summary: '开场介绍' },
  { start: '00:00:12.500', end: '00:00:30.000', summary: '核心内容讲解' },
];

class StubBreakdownService extends VideoBreakdownService {
  constructor() {
    super(new PromptService());
  }

  breakdownError: Error | null = null;

  override async breakdown(): Promise<VideoBreakdownSegmentDraft[]> {
    if (this.breakdownError) throw this.breakdownError;
    return SEGMENTS;
  }
}

class StubVideoBreakdownJob extends VideoBreakdownJob {
  readonly downloads: Array<{ videoUrl: string; destPath: string }> = [];
  readonly cuts: string[][] = [];
  readonly moves: Array<{ sourcePath: string; destPath: string }> = [];

  protected override async download(videoUrl: string, destPath: string) {
    this.downloads.push({ videoUrl, destPath });
  }

  protected override async cutSegment(args: string[]) {
    this.cuts.push(args);
  }

  protected override async moveSegment(sourcePath: string, destPath: string) {
    this.moves.push({ sourcePath, destPath });
  }
}

const JOB_CONTEXT: JobContext = {
  jobId: 'test-job',
  name: 'VideoBreakdownJob',
  attempt: 1,
  queue: 'video-breakdown-queue',
  priority: 5,
  acquiredAt: new Date(),
  stalledCount: 0,
};

async function createUser(username: string) {
  return User.create({ username, password: 'test-password' });
}

test.group('Video breakdown job', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction());

  test('transitions the task to completed and writes segment results', async ({ assert }) => {
    const user = await createUser('vb-job-owner');
    const taskId = randomUUID();
    const task = await VideoBreakdownTask.create({
      taskId,
      userId: user.id,
      videoUrl: 'https://cdn.example.com/video.mp4',
      status: VIDEO_BREAKDOWN_TASK_STATUS.PENDING,
      result: null,
      reason: null,
    });

    const service = new StubBreakdownService();
    const job = new StubVideoBreakdownJob(service);
    job.$hydrate({ taskId, videoUrl: 'https://cdn.example.com/video.mp4', userId: user.id, model: 'qwen-vl-max' }, JOB_CONTEXT);

    await job.execute();

    await task.refresh();
    assert.equal(task.status, VIDEO_BREAKDOWN_TASK_STATUS.COMPLETED);
    assert.deepEqual(JSON.parse(task.result ?? '[]'), [
      { start: '00:00:00.000', end: '00:00:12.500', summary: '开场介绍', file: `video-breakdown/${taskId}/segment-001.mp4` },
      { start: '00:00:12.500', end: '00:00:30.000', summary: '核心内容讲解', file: `video-breakdown/${taskId}/segment-002.mp4` },
    ]);
    assert.deepEqual(job.downloads, [{ videoUrl: 'https://cdn.example.com/video.mp4', destPath: app.tmpPath(`video-breakdown/${taskId}/source-video`) }]);
    assert.deepEqual(job.cuts, [
      [
        '-y',
        '-i',
        app.tmpPath(`video-breakdown/${taskId}/source-video`),
        '-ss',
        '00:00:00.000',
        '-to',
        '00:00:12.500',
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c:v',
        'libx264',
        '-crf',
        '18',
        '-preset',
        'fast',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        app.tmpPath(`video-breakdown/${taskId}/segments/segment-001.mp4`),
      ],
      [
        '-y',
        '-i',
        app.tmpPath(`video-breakdown/${taskId}/source-video`),
        '-ss',
        '00:00:12.500',
        '-to',
        '00:00:30.000',
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c:v',
        'libx264',
        '-crf',
        '18',
        '-preset',
        'fast',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        app.tmpPath(`video-breakdown/${taskId}/segments/segment-002.mp4`),
      ],
    ]);
    assert.deepEqual(job.moves, [
      {
        sourcePath: app.tmpPath(`video-breakdown/${taskId}/segments/segment-001.mp4`),
        destPath: app.publicPath(`video-breakdown/${taskId}/segment-001.mp4`),
      },
      {
        sourcePath: app.tmpPath(`video-breakdown/${taskId}/segments/segment-002.mp4`),
        destPath: app.publicPath(`video-breakdown/${taskId}/segment-002.mp4`),
      },
    ]);
  });

  test('persists failures and cleans the incomplete task directory', async ({ assert }) => {
    const user = await createUser('vb-job-failed');
    const taskId = randomUUID();
    const task = await VideoBreakdownTask.create({
      taskId,
      userId: user.id,
      videoUrl: 'https://cdn.example.com/video.mp4',
      status: VIDEO_BREAKDOWN_TASK_STATUS.PENDING,
      result: null,
      reason: null,
    });

    const service = new StubBreakdownService();
    service.breakdownError = new Error('llm unavailable');
    const job = new StubVideoBreakdownJob(service);
    job.$hydrate({ taskId, videoUrl: 'https://cdn.example.com/video.mp4', userId: user.id, model: 'qwen-vl-max' }, JOB_CONTEXT);

    await assert.rejects(() => job.execute());

    const publicTaskDir = app.publicPath(`video-breakdown/${taskId}`);
    await mkdir(publicTaskDir, { recursive: true });
    await writeFile(join(publicTaskDir, 'segment-001.mp4'), 'partial');

    await job.failed(new Error('llm unavailable'));

    await task.refresh();
    assert.equal(task.status, VIDEO_BREAKDOWN_TASK_STATUS.FAILED);
    assert.equal(task.reason, 'llm unavailable');
    assert.isFalse(existsSync(app.tmpPath(`video-breakdown/${taskId}`)));
    assert.isFalse(existsSync(publicTaskDir));
  });
});
