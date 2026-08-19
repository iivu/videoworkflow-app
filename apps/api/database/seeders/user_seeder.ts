import { BaseSeeder } from '@adonisjs/lucid/seeders';
import { v7 as uuidv7 } from 'uuid';

import Role from '#models/role';
import User from '#models/user';

export default class extends BaseSeeder {
  async run() {
    const roles = await Role.all();
    const roleIdByCode = new Map(roles.map((role) => [role.code, role.id]));

    await User.updateOrCreateMany('username', [
      {
        username: 'admin',
        email: 'leozhang621@gmail.com',
        id: uuidv7(),
        password: 'naliankeji',
        roleId: roleIdByCode.get('admin_owner'),
      },
      { username: 'user1', email: 'user1example@gmail.com', id: uuidv7(), password: 'naliankeji', roleId: roleIdByCode.get('web_user') },
      { username: 'user2', email: 'user2example@gmail.com', id: uuidv7(), password: 'naliankeji', roleId: roleIdByCode.get('web_user') },
      { username: 'user3', email: 'user3example@gmail.com', id: uuidv7(), password: 'naliankeji', roleId: roleIdByCode.get('web_user') },
      { username: 'user4', email: 'user4example@gmail.com', id: uuidv7(), password: 'naliankeji', roleId: roleIdByCode.get('web_user') },
    ]);
  }
}
