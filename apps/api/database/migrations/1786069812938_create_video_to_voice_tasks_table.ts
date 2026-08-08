import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'video_to_voice_tasks';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.integer('video_id').notNullable();
      table.string('provider', 32).notNullable();
      table.string('status', 32).notNullable();
      table.text('config').notNullable();
      table.string('audio_url', 512).nullable();
      table.string('voice_id', 256).nullable();
      table.string('reason', 512).nullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['user_id'], 'idx_video_to_voice_tasks_user_id');
      table.index(['video_id'], 'idx_video_to_voice_tasks_video_id');
      table.index(['status'], 'idx_video_to_voice_tasks_status');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
