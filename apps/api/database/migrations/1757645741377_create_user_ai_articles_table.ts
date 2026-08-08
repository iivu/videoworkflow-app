import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'user_ai_articles';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.integer('video_id').notNullable();
      table.text('article').notNullable();
      table.string('hash', 48).notNullable();
      table.boolean('is_deleted').notNullable().defaultTo(false);

      table.timestamp('created_at');
      table.timestamp('updated_at');

      table.index(['user_id'], 'idx_user_ai_articles_user_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
