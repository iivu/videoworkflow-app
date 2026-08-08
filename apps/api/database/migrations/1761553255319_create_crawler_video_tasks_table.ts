import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'crawler_video_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.text('user_input').notNullable();
      table.string('url', 128).notNullable();
      table.string('platform', 12).notNullable();
      table.string('status', 24).notNullable();
      table.string('reason', 256).nullable();
      table.text('result').nullable();

      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
