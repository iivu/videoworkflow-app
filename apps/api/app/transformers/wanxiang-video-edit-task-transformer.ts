import { BaseTransformer } from '@adonisjs/core/transformers';
import type WanxiangVideoEditTask from '#models/wanxiang-video-edit-task';

export default class WanxiangVideoEditTaskTransformer extends BaseTransformer<WanxiangVideoEditTask> {
  toObject() {
    return this.pick(this.resource, ['id', 'entityId', 'taskId', 'status', 'config', 'videoUrl', 'result', 'reason', 'createdAt', 'updatedAt']);
  }
}
