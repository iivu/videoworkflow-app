import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'creative_audios';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.uuid('user_id').notNullable();
      table.string('provider', 32).notNullable();
      table.string('model', 128).notNullable();
      table.string('voice_id', 256).notNullable();
      table.text('text').notNullable();
      table.text('configs').notNullable();
      table.string('audio_url', 512).notNullable();
      table.datetime('created_at', { precision: 3 }).notNullable();
      table.datetime('updated_at', { precision: 3 }).nullable();

      table.index(['user_id'], 'idx_creative_audios_user_id');
      table.index(['created_at'], 'idx_creative_audios_created_at');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
