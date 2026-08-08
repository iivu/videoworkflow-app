import { BaseTransformer } from '@adonisjs/core/transformers';
import type ParaformerTask from '#models/paraformer-task';

export default class ParaformerTaskTransformer extends BaseTransformer<ParaformerTask> {
  toObject() {
    return this.pick(this.resource, ['id', 'videoId', 'taskId', 'status', 'result', 'reason', 'createdAt', 'updatedAt']);
  }
}
