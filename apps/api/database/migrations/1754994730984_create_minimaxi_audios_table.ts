import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'minimaxi_audios';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable();
      table.integer('user_id').notNullable();
      table.text('payload').notNullable();
      table.text('text').notNullable();
      table.string('audio_url', 256).notNullable();
      table.string('name', 64).nullable();
      table.boolean('is_deleted').notNullable().defaultTo(false);

      table.timestamp('created_at');
      table.timestamp('updated_at');

      table.index(['user_id'], 'idx_minimaxi_audios_user_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
