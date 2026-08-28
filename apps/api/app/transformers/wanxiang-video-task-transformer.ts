import { BaseTransformer } from '@adonisjs/core/transformers';

import type WanxiangVideoTask from '#models/wanxiang-video-task';
import type { WanxiangVideoTaskStatus } from '#services/wanxiang-video-service';

export default class WanxiangVideoTaskTransformer extends BaseTransformer<WanxiangVideoTask> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'entityId', 'taskId', 'config', 'videoUrl', 'result', 'reason', 'createdAt', 'updatedAt']),
      status: this.resource.status as WanxiangVideoTaskStatus,
    };
  }
}
