import { BaseTransformer } from '@adonisjs/core/transformers';
import type VideoEditMessage from '#models/video-edit-message';

export default class VideoEditMessageTransformer extends BaseTransformer<VideoEditMessage> {
  toObject() {
    return this.pick(this.resource, ['id', 'entityId', 'role', 'message', 'taskId', 'createdAt', 'updatedAt']);
  }
}
