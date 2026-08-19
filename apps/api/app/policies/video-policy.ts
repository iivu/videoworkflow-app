import { BasePolicy } from '@adonisjs/bouncer';
import type { AuthorizerResponse } from '@adonisjs/bouncer/types';
import User from '#models/user';
import Video from '#models/video';

export default class VideoPolicy extends BasePolicy {
  delete(user: User, video: Video): AuthorizerResponse {
    return user.isAdminOwner();
  }
}
