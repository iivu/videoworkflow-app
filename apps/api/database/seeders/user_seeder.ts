import { BaseSeeder } from '@adonisjs/lucid/seeders';
import { v7 as uuidv7 } from 'uuid';

import User from '#models/user';

export default class extends BaseSeeder {
  async run() {
    await User.updateOrCreateMany('username', [
      { username: 'admin', email: 'leozhang621@gmail.com', id: uuidv7(), password: 'naliankeji' },
      { username: 'user1', email: 'user1example@gmail.com', id: uuidv7(), password: 'naliankeji' },
      { username: 'user2', email: 'user2example@gmail.com', id: uuidv7(), password: 'naliankeji' },
      { username: 'user3', email: 'user3example@gmail.com', id: uuidv7(), password: 'naliankeji' },
      { username: 'user4', email: 'user4example@gmail.com', id: uuidv7(), password: 'naliankeji' },
    ]);
  }
}
