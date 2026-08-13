import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'user_polish_article_messages';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.integer('video_id').notNullable();
      table.text('message').notNullable();
      table.text('role').notNullable();

      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 6 }).nullable();

      table.index(['user_id'], 'idx_user_polish_article_messages_user_id');
      table.index(['video_id'], 'idx_user_polish_article_messages_video_id');
      table.index(['created_at'], 'idx_user_polish_article_messages_created_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
