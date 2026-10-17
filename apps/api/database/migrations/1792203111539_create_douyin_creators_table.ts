import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'douyin_creators';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.string('sec_uid', 128).collate('utf8mb4_bin').nullable();
      table.string('source_url', 255).collate('utf8mb4_bin').notNullable();
      table.integer('current_task_id').unsigned().nullable();
      table.string('uid', 128).nullable();
      table.string('unique_id', 128).nullable();
      table.string('nickname', 255).nullable();
      table.text('signature').nullable();
      table.text('avatar_url').nullable();
      table.string('ip_location', 128).nullable();
      table.double('aweme_count').notNullable().defaultTo(0);
      table.double('favoriting_count').notNullable().defaultTo(0);
      table.double('follower_count').notNullable().defaultTo(0);
      table.double('following_count').notNullable().defaultTo(0);
      table.double('max_follower_count').notNullable().defaultTo(0);
      table.double('total_favorited').notNullable().defaultTo(0);
      table.integer('downloaded_count').unsigned().notNullable().defaultTo(0);
      table.datetime('last_synced_at', { precision: 3 }).nullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();
      table.unique(['user_id', 'sec_uid']);
      table.unique(['user_id', 'source_url']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
