import { execFile } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pipeline, Readable } from 'node:stream';
import { promisify } from 'node:util';
import { inject } from '@adonisjs/core';
import app from '@adonisjs/core/services/app';
import logger from '@adonisjs/core/services/logger';
import db from '@adonisjs/lucid/services/db';
import { Job } from '@adonisjs/queue';
import type { JobOptions } from '@adonisjs/queue/types';
import { v4 as uuidv4 } from 'uuid';

import VideoToVoiceTask from '#models/video-to-voice-task';
import Voice from '#models/voice';
import { type BailianCloneVoiceParams, BailianVoiceService } from '#services/bailian-voice-service';
import { type MinimaxiCloneVoiceParams, MinimaxiService } from '#services/minimaxi-service';

const execFileAsync = promisify(execFile);
const pipelineAsync = promisify(pipeline);

export const QUEUE_NAME = 'video-to-voice-queue';
export const VIDEO_TO_VOICE_TASK_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

type Provider = 'bailian' | 'minimaxi';
type JobPayload = {
  taskId: number;
  videoUrl: string;
  userId: string;
  provider: Provider;
  config: Record<string, unknown>;
};

@inject()
export default class VideoToVoiceJob extends Job<JobPayload> {
  static options: JobOptions = { queue: QUEUE_NAME };

  constructor(
    private readonly bailianVoiceService: BailianVoiceService,
    private readonly minimaxiService: MinimaxiService,
  ) {
    super();
  }

  async execute() {
    const { taskId, videoUrl, userId, provider, config } = this.payload;
    const tempDir = app.tmpPath(`video-to-voice/${uuidv4()}`);
    const videoPath = join(tempDir, 'source-video');
    const audioPath = join(tempDir, 'voice-sample.wav');

    await VideoToVoiceTask.query().where('id', taskId).update({ status: VIDEO_TO_VOICE_TASK_STATUS.PROCESSING, reason: null });
    logger.info({ taskId, userId, provider }, 'Executing VideoToVoiceJob');

    try {
      await mkdir(tempDir, { recursive: true });
      const fetchClient = await app.container.make('fetch');
      const stream = await fetchClient.stream(videoUrl);
      await pipelineAsync(Readable.fromWeb(stream), createWriteStream(videoPath));
      await execFileAsync('ffmpeg', ['-y', '-i', videoPath, '-t', '20', '-vn', '-acodec', 'pcm_s16le', audioPath]);

      const oss = await app.container.make('oss');
      const ossResponse = await oss.putStream(createReadStream(audioPath), `video-to-voice/${uuidv4()}.wav`);
      const cloned = await this.cloneVoice(provider, config, audioPath, ossResponse.url);
      await db.transaction(async (trx) => {
        await Voice.create(
          {
            userId,
            provider,
            model: cloned.model,
            voiceId: cloned.voiceId,
            name: cloned.voiceId,
            config: JSON.stringify(config),
            demoUrl: cloned.demoUrl,
          },
          { client: trx },
        );
        await VideoToVoiceTask.query({ client: trx }).where('id', taskId).update({
          status: VIDEO_TO_VOICE_TASK_STATUS.COMPLETED,
          audioUrl: ossResponse.url,
          voiceId: cloned.voiceId,
          reason: null,
        });
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  async failed(error: Error) {
    const { taskId } = this.payload;
    try {
      await VideoToVoiceTask.query()
        .where('id', taskId)
        .update({
          status: VIDEO_TO_VOICE_TASK_STATUS.FAILED,
          reason: error.message.slice(0, 512),
        });
    } catch (updateError) {
      logger.error({ taskId, err: updateError instanceof Error ? updateError.message : String(updateError) }, 'Failed to persist VideoToVoiceJob failure');
    }
  }

  private async cloneVoice(provider: Provider, config: Record<string, unknown>, audioPath: string, audioUrl: string) {
    if (provider === 'bailian') {
      const result = await this.bailianVoiceService.cloneVoice({ ...(config as Omit<BailianCloneVoiceParams, 'audioUrl'>), audioUrl });
      return { voiceId: result.voiceId, model: result.targetModel, demoUrl: null };
    }
    if (provider !== 'minimaxi') throw new Error(`Unsupported voice provider: ${provider}`);
    const file = new Blob([new Uint8Array(await readFile(audioPath))], { type: 'audio/wav' });
    const upload = await this.minimaxiService.uploadCloneAudio({ file, filename: basename(audioPath) });
    const result = await this.minimaxiService.cloneVoice({ ...(config as Omit<MinimaxiCloneVoiceParams, 'fileId'>), fileId: upload.fileId });
    return { voiceId: result.voiceId, model: config.model as string, demoUrl: result.demoAudio };
  }
}
