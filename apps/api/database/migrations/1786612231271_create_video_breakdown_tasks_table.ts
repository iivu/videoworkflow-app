import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'video_breakdown_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.uuid('task_id').notNullable().unique();
      table.string('video_url', 512).notNullable();
      table.string('status', 16).notNullable();
      table.text('result').nullable();
      table.string('reason', 512).nullable();

      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['user_id'], 'idx_video_breakdown_tasks_user_id');
      table.index(['status'], 'idx_video_breakdown_tasks_status');
      table.index(['created_at'], 'idx_video_breakdown_tasks_created_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
