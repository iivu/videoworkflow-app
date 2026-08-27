import { test } from '@japa/runner';

import {
  buildAudioExtractionCommand,
  buildDurationProbeCommand,
  buildSceneScoreCommand,
  buildSegmentCommand,
  buildSegments,
  detectSceneChangeTimestamps,
  FfmpegService,
  findGradualSceneChanges,
  findHardSceneChanges,
  formatFfmpegTimestamp,
  mergeSceneChanges,
  parseSceneScoreMetadata,
} from '#services/ffmpeg-service';

function sceneMetadata(scores: number[], fps = 4) {
  return scores.map((score, frame) => `frame:${frame} pts:${frame} pts_time:${frame / fps}\nlavfi.scd.score=${score}`).join('\n');
}

class FakeFfmpegService extends FfmpegService {
  readonly commands: Array<{ command: string; args: string[] }> = [];

  protected override async executeCommand(command: string, args: string[]) {
    this.commands.push({ command, args });
    if (command === 'ffprobe') return { stdout: '12.5\n', stderr: '' };
    return {
      stdout: sceneMetadata(Array.from({ length: 50 }, (_, index) => (index === 10 || index === 28 ? 50 : 0))),
      stderr: '',
    };
  }
}

test.group('FFmpeg service', () => {
  test('builds commands for scene score extraction and duration probing', ({ assert }) => {
    assert.deepEqual(buildSceneScoreCommand('/tmp/source.mp4'), [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      '/tmp/source.mp4',
      '-vf',
      'fps=16,scdet=t=1,metadata=mode=print:file=-',
      '-an',
      '-f',
      'null',
      '-',
    ]);
    assert.deepEqual(buildDurationProbeCommand('/tmp/source.mp4'), [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      '/tmp/source.mp4',
    ]);
  });

  test('builds video segment and audio extraction commands', ({ assert }) => {
    assert.deepEqual(buildSegmentCommand({ videoPath: '/tmp/source.mp4', start: '00:00:02.500', end: '00:00:07.000', outputPath: '/tmp/segment.mp4' }), [
      '-y',
      '-ss',
      '00:00:02.500',
      '-i',
      '/tmp/source.mp4',
      '-t',
      '00:00:04.500',
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
      '/tmp/segment.mp4',
    ]);
    assert.deepEqual(buildAudioExtractionCommand({ videoPath: '/tmp/source.mp4', audioPath: '/tmp/sample.wav' }), [
      '-y',
      '-i',
      '/tmp/source.mp4',
      '-t',
      '20',
      '-vn',
      '-acodec',
      'pcm_s16le',
      '/tmp/sample.wav',
    ]);
  });

  test('parses frame timestamps and scdet scores', ({ assert }) => {
    assert.deepEqual(parseSceneScoreMetadata(sceneMetadata([0, 15.5, 0])), [
      { frame: 0, ptsTime: 0, score: 0 },
      { frame: 1, ptsTime: 0.25, score: 15.5 },
      { frame: 2, ptsTime: 0.5, score: 0 },
    ]);
  });

  test('detects adaptive hard cuts and gradual transitions', ({ assert }) => {
    const hardScores = Array.from({ length: 25 }, (_, index) => (index === 12 ? 50 : 0));
    assert.deepEqual(findHardSceneChanges(hardScores), [{ index: 12, score: 50 }]);

    const gradualScores = [0, 12, 14, 18, 15, 0, 0];
    assert.deepEqual(findGradualSceneChanges(gradualScores), [{ index: 3, score: 18 }]);
    assert.deepEqual(findGradualSceneChanges([0, 12, 14, 18, 15]), [{ index: 3, score: 18 }]);
  });

  test('merges nearby changes and maps them to timestamps', ({ assert }) => {
    assert.deepEqual(mergeSceneChanges([{ index: 4, score: 20 }], [{ index: 5, score: 30 }], 2), [{ index: 5, score: 30 }]);

    const scores = Array.from({ length: 25 }, (_, index) => (index === 12 ? 50 : 0));
    assert.deepEqual(detectSceneChangeTimestamps(parseSceneScoreMetadata(sceneMetadata(scores))), [3]);
  });

  test('turns scene changes into continuous segments covering the video', ({ assert }) => {
    assert.deepEqual(buildSegments([0, 2.5, 7, 7, 20], 12.5), [
      { start: '00:00:00.000', end: '00:00:02.500' },
      { start: '00:00:02.500', end: '00:00:07.000' },
      { start: '00:00:07.000', end: '00:00:12.500' },
    ]);
    assert.deepEqual(buildSegments([2.5, 12.3], 12.5, 0.3), [
      { start: '00:00:00.000', end: '00:00:02.500' },
      { start: '00:00:02.500', end: '00:00:12.500' },
    ]);
    assert.equal(formatFfmpegTimestamp(3723.4564), '01:02:03.456');
  });

  test('runs all media operations through the service', async ({ assert }) => {
    const service = new FakeFfmpegService();
    const segmentParams = { videoPath: '/tmp/source.mp4', start: '00:00:02.500', end: '00:00:07.000', outputPath: '/tmp/segment.mp4' };
    const audioParams = { videoPath: '/tmp/source.mp4', audioPath: '/tmp/sample.wav' };

    assert.deepEqual(await service.breakdown('/tmp/source.mp4'), [
      { start: '00:00:00.000', end: '00:00:02.500' },
      { start: '00:00:02.500', end: '00:00:07.000' },
      { start: '00:00:07.000', end: '00:00:12.500' },
    ]);
    await service.cutSegment(segmentParams);
    await service.extractAudio(audioParams);

    assert.deepEqual(service.commands, [
      { command: 'ffprobe', args: buildDurationProbeCommand('/tmp/source.mp4') },
      { command: 'ffmpeg', args: buildSceneScoreCommand('/tmp/source.mp4') },
      { command: 'ffmpeg', args: buildSegmentCommand(segmentParams) },
      { command: 'ffmpeg', args: buildAudioExtractionCommand(audioParams) },
    ]);
  });
});
