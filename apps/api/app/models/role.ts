import { beforeCreate } from '@adonisjs/lucid/orm';
import { v7 as uuidv7 } from 'uuid';

import { RoleSchema } from '#database/schema';

export default class Role extends RoleSchema {
  static selfAssignPrimaryKey = true;

  @beforeCreate()
  static assignUUID(role: Role) {
    role.id = uuidv7();
  }
}
