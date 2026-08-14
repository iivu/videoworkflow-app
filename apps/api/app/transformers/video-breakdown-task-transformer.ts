import { BaseTransformer } from '@adonisjs/core/transformers';
import type VideoBreakdownTask from '#models/video-breakdown-task';

export default class VideoBreakdownTaskTransformer extends BaseTransformer<VideoBreakdownTask> {
  toObject() {
    return this.pick(this.resource, ['taskId', 'videoUrl', 'status', 'result', 'reason', 'createdAt', 'updatedAt']);
  }
}
