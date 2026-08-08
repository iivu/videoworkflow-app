import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'videos';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.string('title', 512).notNullable();
      table.string('author', 24).notNullable();
      table.string('cover_url', 512).nullable();
      table.string('file_url', 512).notNullable();
      table.integer('like_count').notNullable().defaultTo(0);
      table.integer('play_count').notNullable().defaultTo(0);
      table.integer('share_count').notNullable().defaultTo(0);
      table.integer('favorite_count').notNullable().defaultTo(0);
      table.integer('comment_count').notNullable().defaultTo(0);

      table.datetime('publish_at', { precision: 3 }).notNullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['user_id'], 'idx_videos_user_id');
      table.index(['author'], 'idx_videos_author');
      table.index(['title'], 'idx_videos_title');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
