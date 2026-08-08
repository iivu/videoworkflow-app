import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'aigc_videos';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.integer('task_id').notNullable();
      table.string('video_url', 1024).notNullable();
      table.string('type', 36).notNullable();

      table.timestamp('created_at');
      table.timestamp('updated_at');

      table.index(['user_id'], 'idx_aigc_videos_user_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
