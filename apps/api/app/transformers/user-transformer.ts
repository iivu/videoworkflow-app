import { BaseTransformer } from '@adonisjs/core/transformers';
import type User from '#models/user';

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    const user = this.pick(this.resource, ['username', 'avatar', 'email', 'createdAt', 'updatedAt', 'mobile']);
    const role = this.resource.role;
    return {
      ...user,
      role: role ? { code: role.code, name: role.name } : null,
    };
  }
}
