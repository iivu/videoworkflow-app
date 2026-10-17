import { BaseTransformer } from '@adonisjs/core/transformers';
import type DouyinCreator from '#models/douyin-creator';
import DouyinCreatorTaskTransformer from '#transformers/douyin-creator-task-transformer';

export default class DouyinCreatorTransformer extends BaseTransformer<DouyinCreator> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'secUid',
        'uid',
        'uniqueId',
        'nickname',
        'signature',
        'avatarUrl',
        'ipLocation',
        'awemeCount',
        'favoritingCount',
        'followerCount',
        'followingCount',
        'totalFavorited',
        'downloadedCount',
        'sourceUrl',
        'lastSyncedAt',
        'createdAt',
        'updatedAt',
      ]),
      currentTask: this.resource.currentTask ? DouyinCreatorTaskTransformer.transform(this.resource.currentTask) : null,
    };
  }
}
