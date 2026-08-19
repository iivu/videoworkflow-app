import { BasePolicy } from '@adonisjs/bouncer';
import type { AuthorizerResponse } from '@adonisjs/bouncer/types';
import User from '#models/user';

export default class VideoPolicy extends BasePolicy {
  delete(user: User): AuthorizerResponse {
    return user.isAdminOwner();
  }
}
