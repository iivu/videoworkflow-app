import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'aigc_bailian_video_retalk_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.string('task_id', 64).notNullable();
      table.string('status', 24).notNullable();
      table.text('payload').notNullable();
      table.string('result', 256).nullable();
      table.string('reason', 256).nullable();
      table.text('meta').nullable();

      table.timestamp('created_at');
      table.timestamp('updated_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
