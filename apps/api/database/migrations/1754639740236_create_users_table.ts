import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'users';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable();
      table.string('username').notNullable().unique();
      table.string('email').nullable().unique();
      table.string('password').notNullable();
      table.string('avatar').nullable();
      table.string('mobile', 24).nullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['mobile'], 'idx_users_mobile');
      table.index(['created_at'], 'idx_users_created_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
