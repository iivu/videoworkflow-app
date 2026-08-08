import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'minimaxi_voices';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('user_id').notNullable();
      table.string('name', 64).notNullable();
      table.string('voice_id', 64).notNullable();
      table.string('voice_demo_url', 256).nullable();

      table.timestamp('created_at');
      table.timestamp('updated_at');

      table.index(['user_id'], 'idx_minimaxi_voices_user_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
