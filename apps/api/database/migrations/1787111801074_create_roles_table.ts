import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'roles';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().notNullable();
      table.string('code', 64).notNullable().unique();
      table.string('name', 64).notNullable();
      table.string('description', 255).nullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
