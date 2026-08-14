import { test } from '@japa/runner';

import {
  buildAudioExtractionCommand,
  buildDurationProbeCommand,
  buildSceneDetectionCommand,
  buildSegmentCommand,
  buildSegments,
  FfmpegService,
  formatFfmpegTimestamp,
  parseSceneChangeTimestamps,
} from '#services/ffmpeg-service';

class FakeFfmpegService extends FfmpegService {
  readonly commands: Array<{ command: string; args: string[] }> = [];

  protected override async executeCommand(command: string, args: string[]) {
    this.commands.push({ command, args });
    if (command === 'ffprobe') return { stdout: '12.5\n', stderr: '' };
    return {
      stdout: '',
      stderr: ['[Parsed_showinfo_1] n:0 pts:2560 pts_time:2.5 duration:0.04', '[Parsed_showinfo_1] n:1 pts:7168 pts_time:7 duration:0.04'].join('\n'),
    };
  }
}

test.group('FFmpeg service', () => {
  test('builds commands for scene detection and duration probing', ({ assert }) => {
    assert.deepEqual(buildSceneDetectionCommand('/tmp/source.mp4'), [
      '-hide_banner',
      '-nostats',
      '-i',
      '/tmp/source.mp4',
      '-vf',
      "select='gt(scene,0.3)',showinfo",
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

  test('parses, deduplicates, and sorts selected frame timestamps', ({ assert }) => {
    const stderr = [
      '[Parsed_showinfo_1] n:2 pts_time:10.25 duration:0.04',
      '[Parsed_showinfo_1] n:0 pts_time:2 duration:0.04',
      '[Parsed_showinfo_1] n:1 pts_time:2 duration:0.04',
      'frame=3 fps=0.0',
    ].join('\n');

    assert.deepEqual(parseSceneChangeTimestamps(stderr), [2, 10.25]);
  });

  test('turns scene changes into continuous segments covering the video', ({ assert }) => {
    assert.deepEqual(buildSegments([0, 2.5, 7, 7, 20], 12.5), [
      { start: '00:00:00.000', end: '00:00:02.500' },
      { start: '00:00:02.500', end: '00:00:07.000' },
      { start: '00:00:07.000', end: '00:00:12.500' },
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
      { command: 'ffmpeg', args: buildSceneDetectionCommand('/tmp/source.mp4') },
      { command: 'ffmpeg', args: buildSegmentCommand(segmentParams) },
      { command: 'ffmpeg', args: buildAudioExtractionCommand(audioParams) },
    ]);
  });
});
