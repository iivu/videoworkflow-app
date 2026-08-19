import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'videos';

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.index(['created_at'], 'idx_videos_created_at');
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['created_at'], 'idx_videos_created_at');
    });
  }
}
