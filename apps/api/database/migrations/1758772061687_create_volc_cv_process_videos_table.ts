import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'volc_cv_process_videos';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.string('video_url', 128).notNullable();
      table.text('payload').notNullable();
      table.boolean('is_deleted').notNullable().defaultTo(false);

      table.timestamp('created_at');
      table.timestamp('updated_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
