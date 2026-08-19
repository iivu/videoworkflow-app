import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'users';

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.uuid('role_id').nullable();
      table.index(['role_id'], 'idx_users_role_id');
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['role_id'], 'idx_users_role_id');
      table.dropColumn('role_id');
    });
  }
}
