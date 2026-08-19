import { BaseSeeder } from '@adonisjs/lucid/seeders';

import Role from '#models/role';

export default class extends BaseSeeder {
  async run() {
    await Role.updateOrCreateMany('code', [
      { 
        code: 'admin_owner',
        name: '超级管理员',
        description: '系统最高权限管理账号',
      },
      {
        code: 'web_user',
        name: '普通用户',
        description: '普通用户',
      },
    ]);
  }
}
