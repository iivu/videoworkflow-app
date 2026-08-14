import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import BusinessException from '#exceptions/business-exception';

const execFileAsync = promisify(execFile);

export const SCENE_CHANGE_THRESHOLD = 0.4;

export type FfmpegVideoSegment = {
  start: string;
  end: string;
};

type CommandResult = {
  stdout: string;
  stderr: string;
};

export function buildSceneDetectionCommand(videoPath: string): string[] {
  return ['-hide_banner', '-nostats', '-i', videoPath, '-vf', `select='gt(scene,${SCENE_CHANGE_THRESHOLD})',showinfo`, '-an', '-f', 'null', '-'];
}

export function buildDurationProbeCommand(videoPath: string): string[] {
  return ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', videoPath];
}

function parseTimestampMilliseconds(value: string): number {
  const match = /^(\d{2}):([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(value);
  if (!match) throw new BusinessException('视频拆解失败: 分段时间格式无效');

  return Number(match[1]) * 3_600_000 + Number(match[2]) * 60_000 + Number(match[3]) * 1_000 + Number(match[4]);
}

export function buildSegmentCommand(params: { videoPath: string; start: string; end: string; outputPath: string }): string[] {
  const { videoPath, start, end, outputPath } = params;
  const durationMilliseconds = parseTimestampMilliseconds(end) - parseTimestampMilliseconds(start);
  if (durationMilliseconds <= 0) throw new BusinessException('视频拆解失败: 分段时长必须大于零');

  return [
    '-y',
    '-ss',
    start,
    '-i',
    videoPath,
    '-t',
    formatFfmpegTimestamp(durationMilliseconds / 1000),
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
    outputPath,
  ];
}

export function buildAudioExtractionCommand(params: { videoPath: string; audioPath: string }): string[] {
  return ['-y', '-i', params.videoPath, '-t', '20', '-vn', '-acodec', 'pcm_s16le', params.audioPath];
}

export function parseSceneChangeTimestamps(stderr: string): number[] {
  const timestamps = Array.from(stderr.matchAll(/\bpts_time:(\d+(?:\.\d+)?)/g), (match) => Number(match[1]));
  return [...new Set(timestamps.filter(Number.isFinite))].sort((left, right) => left - right);
}

export function formatFfmpegTimestamp(seconds: number): string {
  const totalMilliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export function buildSegments(sceneChanges: number[], duration: number): FfmpegVideoSegment[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new BusinessException('视频拆解失败: 无法获取有效的视频时长');
  }

  const boundaries = [0, ...new Set(sceneChanges.filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0 && timestamp < duration)), duration].sort(
    (left, right) => left - right,
  );

  return boundaries.slice(0, -1).map((start, index) => ({
    start: formatFfmpegTimestamp(start),
    end: formatFfmpegTimestamp(boundaries[index + 1]),
  }));
}

export class FfmpegService {
  async breakdown(videoPath: string): Promise<FfmpegVideoSegment[]> {
    const durationResult = await this.executeCommand('ffprobe', buildDurationProbeCommand(videoPath));
    const duration = Number(durationResult.stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new BusinessException('视频拆解失败: 无法获取有效的视频时长');
    }

    const sceneResult = await this.executeCommand('ffmpeg', buildSceneDetectionCommand(videoPath));
    return buildSegments(parseSceneChangeTimestamps(sceneResult.stderr), duration);
  }

  async cutSegment(params: { videoPath: string; start: string; end: string; outputPath: string }): Promise<void> {
    await this.executeCommand('ffmpeg', buildSegmentCommand(params));
  }

  async extractAudio(params: { videoPath: string; audioPath: string }): Promise<void> {
    await this.executeCommand('ffmpeg', buildAudioExtractionCommand(params));
  }

  protected async executeCommand(command: string, args: string[]): Promise<CommandResult> {
    return execFileAsync(command, args, { maxBuffer: 10 * 1024 * 1024 });
  }
}
