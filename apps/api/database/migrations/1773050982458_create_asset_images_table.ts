import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'asset_images';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().index('idx_asset_images_user_id');
      table.string('url', 1000).notNullable();
      table.text('description').nullable();
      table.string('vector_id', 100).nullable().index('idx_asset_images_vector_id');
      table.timestamp('created_at').notNullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
