import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'wanxiang_video_edit_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.string('entity_id', 36).notNullable();
      table.string('task_id', 36).notNullable().unique();
      table.string('status', 16).notNullable();
      table.text('config').notNullable();
      table.string('video_url', 512).nullable();
      table.text('result').nullable();
      table.string('reason', 512).nullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['user_id', 'entity_id'], 'idx_wanxiang_video_edit_tasks_user_entity');
      table.index(['status'], 'idx_wanxiang_video_edit_tasks_status');
      table.index(['created_at'], 'idx_wanxiang_video_edit_tasks_created_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
