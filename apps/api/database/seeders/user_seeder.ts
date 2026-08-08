import { BaseSeeder } from '@adonisjs/lucid/seeders';
import { v7 as uuidv7 } from 'uuid';

import User from '#models/user';

export default class extends BaseSeeder {
  async run() {
    await User.updateOrCreateMany('username', [
      {
        username: 'admin',
        email: 'leozhang621@gmail.com',
        id: uuidv7(),
        password: 'naliankeji',
      },
    ]);
  }
}
