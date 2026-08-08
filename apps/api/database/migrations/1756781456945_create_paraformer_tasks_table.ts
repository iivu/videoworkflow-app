import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'paraformer_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.integer('video_id').notNullable();
      table.string('task_id', 64).notNullable();
      table.string('status', 16).notNullable();
      table.string('reason').nullable();
      table.text('result').nullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['user_id'], 'idx_paraformer_tasks_user_id');
      table.index(['task_id'], 'idx_paraformer_tasks_task_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
