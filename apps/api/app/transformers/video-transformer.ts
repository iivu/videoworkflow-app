import { BaseTransformer } from '@adonisjs/core/transformers';
import type Video from '#models/video';

export default class VideoTransformer extends BaseTransformer<Video> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'title',
      'author',
      'platform',
      'fileUrl',
      'coverUrl',
      'likeCount',
      'shareCount',
      'favoriteCount',
      'commentCount',
      'publishAt',
      'createdAt',
      'updatedAt',
    ]);
  }
}
