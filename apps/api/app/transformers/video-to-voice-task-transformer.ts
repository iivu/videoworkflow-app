import { BaseTransformer } from '@adonisjs/core/transformers';
import type VideoToVoiceTask from '#models/video-to-voice-task';

export default class VideoToVoiceTaskTransformer extends BaseTransformer<VideoToVoiceTask> {
  toObject() {
    return this.pick(this.resource, ['id', 'videoId', 'provider', 'status', 'config', 'audioUrl', 'voiceId', 'reason', 'createdAt', 'updatedAt']);
  }
}
