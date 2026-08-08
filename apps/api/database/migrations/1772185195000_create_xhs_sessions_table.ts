import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'xhs_sessions';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();
      table.uuid('user_id').notNullable();
      table.string('title').notNullable();
      table.string('last_message').nullable();

      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['user_id'], 'idx_xhs_sessions_user_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
