import { BasePolicy } from '@adonisjs/bouncer';
import User from '#models/user';

export default class VideoPolicy extends BasePolicy {
  async delete(user: User) {
    await user.load((preloader) => preloader.load('role'));
    return user.isAdminOwner();
  }
}
