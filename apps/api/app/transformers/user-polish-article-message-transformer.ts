import { BaseTransformer } from '@adonisjs/core/transformers';
import type UserPolishArticleMessage from '#models/user-polish-article-message';

export default class UserPolishArticleMessageTransformer extends BaseTransformer<UserPolishArticleMessage> {
  toObject() {
    return this.pick(this.resource, ['id', 'role', 'message', 'createdAt']);
  }
}
