import { BaseTransformer } from '@adonisjs/core/transformers';
import type DouyinCreatorTask from '#models/douyin-creator-task';

export default class DouyinCreatorTaskTransformer extends BaseTransformer<DouyinCreatorTask> {
  toObject() {
    return this.pick(this.resource, ['id', 'creatorId', 'status', 'reason', 'createdAt', 'updatedAt']);
  }
}
