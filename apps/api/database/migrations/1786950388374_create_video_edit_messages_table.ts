import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'video_edit_messages';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.string('entity_id', 36).notNullable();
      table.string('role', 16).notNullable();
      table.text('message').notNullable();
      table.string('task_id', 36).nullable().unique();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['user_id', 'entity_id'], 'idx_video_edit_messages_user_entity');
      table.index(['created_at'], 'idx_video_edit_messages_created_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
