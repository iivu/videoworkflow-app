import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'xhs_messages';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();
      table.integer('session_id').unsigned().notNullable();
      table.string('role', 20).notNullable();
      table.string('content_type', 20).notNullable();
      table.text('content').notNullable();
      table.json('metadata').nullable();

      table.datetime('created_at', { precision: 3 }).notNullable();

      table.index(['session_id'], 'idx_xhs_messages_session_id');
      table.index(['created_at'], 'idx_xhs_messages_created_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
