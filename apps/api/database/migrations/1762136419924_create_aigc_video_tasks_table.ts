import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'aigc_video_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.string('platform_task_id', 128).notNullable();
      table.string('type', 36).notNullable();
      table.string('status', 36).notNullable();
      table.text('payload').notNullable();
      table.text('reason').nullable();
      table.text('meta').nullable();

      table.timestamp('created_at');
      table.timestamp('updated_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
