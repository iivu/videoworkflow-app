import { BaseTransformer } from '@adonisjs/core/transformers';
import type CrawlerVideoTask from '#models/crawler-video-task';

export default class CrawlerVideoTaskTransformer extends BaseTransformer<CrawlerVideoTask> {
  toObject() {
    return this.pick(this.resource, ['id', 'url', 'userInput', 'platform', 'status', 'reason', 'result', 'createdAt', 'updatedAt']);
  }
}
