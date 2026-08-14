import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import BusinessException from '#exceptions/business-exception';

const execFileAsync = promisify(execFile);

export const SCENE_DETECTION_FPS = 16;
export const SCENE_DETECTION_SIGMA = 2.5;
export const SCENE_DETECTION_WINDOW_SIZE = 12;
export const GRADUAL_CHANGE_THRESHOLD = 10;
export const GRADUAL_CHANGE_MIN_FRAMES = 3;
export const MIN_SCENE_DURATION = 0.25;

export type FfmpegVideoSegment = {
  start: string;
  end: string;
};

export type SceneScoreFrame = {
  frame: number;
  ptsTime: number;
  score: number;
};

export type SceneChange = {
  index: number;
  score: number;
};

type CommandResult = {
  stdout: string;
  stderr: string;
};

export function buildSceneScoreCommand(videoPath: string): string[] {
  return ['-hide_banner', '-loglevel', 'error', '-i', videoPath, '-vf', `fps=${SCENE_DETECTION_FPS},scdet=t=1,metadata=mode=print:file=-`, '-an', '-f', 'null', '-'];
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

export function parseSceneScoreMetadata(metadata: string): SceneScoreFrame[] {
  const frames: SceneScoreFrame[] = [];
  let current: SceneScoreFrame | null = null;

  for (const line of metadata.split('\n')) {
    const frameMatch = /^frame:\s*(\d+).*\bpts_time:\s*(-?\d+(?:\.\d+)?)/.exec(line.trim());
    if (frameMatch) {
      if (current) frames.push(current);
      current = { frame: Number(frameMatch[1]), ptsTime: Number(frameMatch[2]), score: 0 };
      continue;
    }

    const scoreMatch = /^lavfi\.scd\.score=(-?\d+(?:\.\d+)?)/.exec(line.trim());
    if (scoreMatch && current) current.score = Number(scoreMatch[1]);
  }

  if (current) frames.push(current);
  return frames.filter((frame) => Number.isFinite(frame.ptsTime) && Number.isFinite(frame.score));
}

export function findHardSceneChanges(scores: number[], options: { sigma?: number; windowSize?: number } = {}): SceneChange[] {
  const sigma = options.sigma ?? SCENE_DETECTION_SIGMA;
  const windowSize = options.windowSize ?? SCENE_DETECTION_WINDOW_SIZE;
  const changes: SceneChange[] = [];

  for (let index = 0; index < scores.length; index++) {
    const local = scores.slice(Math.max(0, index - windowSize), Math.min(scores.length, index + windowSize + 1));
    const mean = local.reduce((sum, score) => sum + score, 0) / local.length;
    const variance = local.reduce((sum, score) => sum + (score - mean) ** 2, 0) / local.length;
    const standardDeviation = Math.sqrt(variance) || 0.001;
    const isLocalMaximum = (index === 0 || scores[index] >= scores[index - 1]) && (index === scores.length - 1 || scores[index] >= scores[index + 1]);

    if (isLocalMaximum && scores[index] > 5 && scores[index] > mean + sigma * standardDeviation) {
      changes.push({ index, score: scores[index] });
    }
  }

  return changes;
}

export function findGradualSceneChanges(scores: number[], options: { threshold?: number; minFrames?: number } = {}): SceneChange[] {
  const threshold = options.threshold ?? GRADUAL_CHANGE_THRESHOLD;
  const minFrames = options.minFrames ?? GRADUAL_CHANGE_MIN_FRAMES;
  const changes: SceneChange[] = [];
  let start: number | null = null;

  const addRegion = (end: number) => {
    if (start === null || end - start < minFrames) return;
    let peakIndex = start;
    for (let index = start + 1; index < end; index++) {
      if (scores[index] > scores[peakIndex]) peakIndex = index;
    }
    changes.push({ index: peakIndex, score: scores[peakIndex] });
  };

  for (let index = 0; index < scores.length; index++) {
    if (scores[index] >= threshold) {
      start ??= index;
    } else if (start !== null) {
      addRegion(index);
      start = null;
    }
  }
  addRegion(scores.length);

  return changes;
}

export function mergeSceneChanges(hardCuts: SceneChange[], graduals: SceneChange[], minGap: number): SceneChange[] {
  const merged: SceneChange[] = [];
  const changes = [...hardCuts, ...graduals].sort((left, right) => left.index - right.index);

  for (const change of changes) {
    const previous = merged.at(-1);
    if (!previous || change.index - previous.index >= minGap) {
      merged.push(change);
    } else if (change.score > previous.score) {
      merged[merged.length - 1] = change;
    }
  }

  return merged;
}

export function detectSceneChangeTimestamps(frames: SceneScoreFrame[]): number[] {
  if (frames.length < 2) throw new BusinessException('视频拆解失败: 有效帧数不足');

  const scores = frames.map((frame) => frame.score);
  const hardCuts = findHardSceneChanges(scores);
  const graduals = findGradualSceneChanges(scores);
  const changes = mergeSceneChanges(hardCuts, graduals, Math.ceil(MIN_SCENE_DURATION * SCENE_DETECTION_FPS));
  const timestamps: number[] = [];

  for (const change of changes) {
    const timestamp = frames[change.index]?.ptsTime;
    const previous = timestamps.at(-1) ?? 0;
    if (timestamp !== undefined && timestamp - previous >= MIN_SCENE_DURATION) timestamps.push(timestamp);
  }

  return timestamps;
}

export function formatFfmpegTimestamp(seconds: number): string {
  const totalMilliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export function buildSegments(sceneChanges: number[], duration: number, minSceneDuration = 0): FfmpegVideoSegment[] {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new BusinessException('视频拆解失败: 无法获取有效的视频时长');
  }

  const boundaries = [0];
  for (const timestamp of [...new Set(sceneChanges)].sort((left, right) => left - right)) {
    if (
      Number.isFinite(timestamp) &&
      timestamp > 0 &&
      timestamp < duration &&
      timestamp - boundaries[boundaries.length - 1] >= minSceneDuration &&
      duration - timestamp >= minSceneDuration
    ) {
      boundaries.push(timestamp);
    }
  }
  boundaries.push(duration);

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

    const sceneResult = await this.executeCommand('ffmpeg', buildSceneScoreCommand(videoPath));
    const frames = parseSceneScoreMetadata(sceneResult.stdout);
    return buildSegments(detectSceneChangeTimestamps(frames), duration, MIN_SCENE_DURATION);
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
